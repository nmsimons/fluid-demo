// ============================================================================
// ItemView.tsx
//
// Centralized view & interaction layer for all "items" rendered on the canvas.
// Items include Shapes, Notes, and Tables. This file coordinates:
//   * Rendering the correct content component (ShapeView / NoteView / TableView)
//   * Local optimistic interaction (drag / rotate / resize) using ephemeral
//     presence channels before committing final values to the Fluid tree.
//   * Selection visualization and remote collaborator indicators.
//
// Key architectural choices:
//   1. Pointer events are unified (mouse / pen / touch) via onPointerDown and
//      document-level listeners for move + up to avoid losing events when the
//      pointer leaves the element or during fast touch interactions.
//   2. Dragging uses an absolute delta model (currentCanvas - startCanvas) plus
//      the item's initial position. Earlier incremental / clamped logic was
//      intentionally removed to reduce complexity and eliminate jump / stutter
//      issues with foreignObject (SVG / HTML overlay) elements like tables.

// Global cleanup function for active drag operations
// This ensures only one item can be dragged at a time
let activeMouseDragCleanup: (() => void) | null = null;
let activeTouchDragCleanup: (() => void) | null = null;

//   3. Resizing (shapes only) maintains the geometric center of the shape and
//      scales uniformly by projecting the live pointer vector onto the initial
//      pointer vector (dot product + magnitude ratio). This avoids distortion
//      and gives intuitive "corner pull" semantics even when rotated (rotation
//      currently only affects visual transform; resize math is center-based).
//   4. Rotation computes the angle from the center of the item to the pointer,
//      adding +90° so that 0° aligns with a visually upright orientation.
//   5. A small movement threshold (increased when starting inside an interactive
//      child like <input>) differentiates click vs drag while preserving the
//      ability to focus and use embedded controls.
//   6. A global document.documentElement.dataset.manipulating flag gates pan /
//      navigation logic elsewhere so canvas panning does not interfere with
//      precision drag / rotate / resize operations, especially on touch.
//
// Math hotspots (see inline comments for detail):
//   * calculateCanvasMouseCoordinates: screen -> canvas space (pan & zoom)
//   * Drag deltas: dx, dy relative to start pointer in canvas space.
//   * Rotation: atan2 to derive degrees; normalized to [0, 360).
//   * Resize: dot product projection to get scale ratio while preserving center.
//
// No functional logic is altered by the commentary added in this pass.
// ============================================================================
import React, { useContext, useEffect, useRef, useState } from "react";
import { clampShapeSize } from "../../../constants/shape.js";
import { clampTextWidth } from "../../../utils/text.js";
import { Tree } from "fluid-framework";
import { App, Group, Item, Items, TextBlock } from "../../../schema/appSchema.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { useTree } from "../../hooks/useTree.js";
import { ContentElement } from "./ContentElement.js";
import { SelectionBox } from "./SelectionControls.js";
import { usePresenceManager } from "../../hooks/usePresenceManger.js";
import { PresenceManager } from "../../../presence/Interfaces/PresenceManager.js";
import { DragAndRotatePackage, DragSelectionEntry } from "../../../presence/drag.js";
import { ResizePackage } from "../../../presence/Interfaces/ResizeManager.js";
import { LayoutContext } from "../../hooks/useLayoutManger.js";
import { ChevronLeft16Filled } from "@fluentui/react-icons";
import { isGroupGridEnabled } from "../../layout/groupGrid.js";
import { getContentHandler, getContentType, isShape } from "../../../utils/contentHandlers.js";
import { scheduleLayoutInvalidation } from "../../utils/layoutInvalidation.js";
import { findItemsByIds } from "../../../utils/itemsHelpers.js";
import {
	getGroupChildOffset,
	getParentGroupInfo,
	GroupHierarchyInfo,
	getGroupActivePosition,
	getNestedGroupDragOffset,
} from "../../utils/presenceGeometry.js";
import {
	getScaledShapeDimensions,
	getShapeDimensions as getShapeDimensionsFromShape,
	isRectangleShape,
} from "../../../utils/shapeUtils.js";

// ============================================================================
// Helpers
// ============================================================================
const USER_COLORS = [
	"#3b82f6",
	"#ef4444",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#06b6d4",
	"#f97316",
	"#84cc16",
	"#ec4899",
	"#6366f1",
	"#f43f5e",
	"#14b8a6",
	"#a855f7",
	"#0ea5e9",
];
const userColor = (id: string) => {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
	return USER_COLORS[Math.abs(h) % USER_COLORS.length];
};
const initials = (n: string) => {
	if (!n) return "?";
	const p = n.trim().split(/\s+/);
	return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};
const itemType = (item: Item) => getContentType(item);

export const calculateCanvasMouseCoordinates = (
	e: { clientX: number; clientY: number },
	pan?: { x: number; y: number },
	zoom = 1,
	canvasElement?: HTMLElement | null
) => {
	// Translate a raw (clientX, clientY) into logical canvas coordinates by:
	//   1. Subtracting the canvas element's top-left (DOMRect) to obtain a local
	//      position relative to the canvas in CSS pixels.
	//   2. Removing the current pan offset so (0,0) corresponds to the logical
	//      unpanned origin the model expects.
	//   3. Dividing by zoom to map CSS pixels back into model (logical) units.
	// This keeps the model fully resolution / zoom independent and ensures
	// consistent math for drag / resize / rotate no matter the viewport scale.
	const c = canvasElement ?? document.getElementById("canvas");
	const r = c?.getBoundingClientRect() || ({ left: 0, top: 0 } as DOMRect);
	const sx = e.clientX - r.left; // screen -> canvas local X (CSS px)
	const sy = e.clientY - r.top; // screen -> canvas local Y (CSS px)
	return { x: (sx - (pan?.x ?? 0)) / zoom, y: (sy - (pan?.y ?? 0)) / zoom };
};
export const calculateOffsetFromCanvasOrigin = (
	e: { clientX: number; clientY: number },
	item: Item,
	pan?: { x: number; y: number },
	zoom = 1,
	canvasElement?: HTMLElement | null
) => {
	// Computes the pointer offset relative to the item's top-left corner in
	// model coordinates. Useful for anchor-preserving drag strategies (not used
	// by the current absolute delta approach but retained for potential reuse).
	const c = calculateCanvasMouseCoordinates(e, pan, zoom, canvasElement);
	return { x: c.x - item.x, y: c.y - item.y };
};
// ============================================================================
// ============================================================================
// ItemView – unified pointer drag / rotate / resize via presence
// ============================================================================
export function ItemView(props: {
	item: Item;
	index: number;
	canvasPosition: { left: number; top: number };
	hideSelectionControls?: boolean;
	pan?: { x: number; y: number };
	zoom?: number;
	logicalZoom?: number;
	canvasElement?: HTMLElement | null;
	onMeasured?: (item: Item, size: { width: number; height: number }) => void;
	absoluteX?: number;
	absoluteY?: number;
	parentGroup?: Group;
}) {
	const { item, index, hideSelectionControls, absoluteX, absoluteY, parentGroup } = props;

	useTree(item);
	const presence = useContext(PresenceContext);
	const layout = useContext(LayoutContext);
	const [selected, setSelected] = useState(presence.itemSelection.testSelection({ id: item.id }));
	const [contentProps, setContentProps] = useState<{
		sizeOverride?: number;
		shapeWidthOverride?: number;
		shapeHeightOverride?: number;
		textWidthOverride?: number;
	}>({});
	const dragRef = useRef<DragState | null>(null);
	// (offset ref removed in delta-based drag implementation)
	const intrinsic = useRef({ w: 0, h: 0 });
	const itemRef = useRef(item);
	useEffect(() => {
		itemRef.current = item;
	}, [item]);

	// Calculate group offset if this item is in a group
	// parentGroup is the Group object; its parent is the Item that contains it
	let groupOffsetX = 0;
	let groupOffsetY = 0;
	if (parentGroup) {
		const groupContainer = Tree.parent(parentGroup);
		if (groupContainer && Tree.is(groupContainer, Item)) {
			groupOffsetX = groupContainer.x;
			groupOffsetY = groupContainer.y;
		}
	}

	// Use absoluteX/Y if provided (for items in groups), otherwise use item's own coordinates
	const displayX = absoluteX ?? item.x;
	const displayY = absoluteY ?? item.y;

	// In grid view, force rotation to 0 (visual only, doesn't change stored rotation)
	const displayRotation = isGroupGridEnabled(parentGroup) ? 0 : item.rotation;

	const [view, setView] = useState({
		left: displayX,
		top: displayY,
		zIndex: index,
		transform: `rotate(${displayRotation}deg)`,
	});
	const [layoutAnimating, setLayoutAnimating] = useState(false);
	const layoutAnimationTimeoutRef = useRef<number | null>(null);
	const previousGridStateRef = useRef<boolean | null>(
		parentGroup ? isGroupGridEnabled(parentGroup) : null
	);

	useEffect(() => {
		// In grid view, force rotation to 0 (visual only)
		const displayRotation = isGroupGridEnabled(parentGroup) ? 0 : item.rotation;
		setView((v) => ({
			...v,
			left: displayX,
			top: displayY,
			zIndex: index,
			transform: itemType(item) === "table" ? "rotate(0)" : `rotate(${displayRotation}deg)`,
		}));
	}, [displayX, displayY, item.rotation, index, parentGroup]);

	useEffect(() => {
		const currentGrid = parentGroup ? isGroupGridEnabled(parentGroup) : null;
		const previousGrid = previousGridStateRef.current;

		if (!parentGroup) {
			previousGridStateRef.current = null;
			if (layoutAnimationTimeoutRef.current !== null) {
				window.clearTimeout(layoutAnimationTimeoutRef.current);
				layoutAnimationTimeoutRef.current = null;
			}
			setLayoutAnimating(false);
			return;
		}

		if (previousGrid !== null && previousGrid !== currentGrid) {
			if (layoutAnimationTimeoutRef.current !== null) {
				window.clearTimeout(layoutAnimationTimeoutRef.current);
			}
			setLayoutAnimating(true);
			layoutAnimationTimeoutRef.current = window.setTimeout(() => {
				setLayoutAnimating(false);
				layoutAnimationTimeoutRef.current = null;
			}, 280);
		}

		previousGridStateRef.current = currentGrid;
	}, [parentGroup, parentGroup?.viewAsGrid]);

	useEffect(() => {
		return () => {
			if (layoutAnimationTimeoutRef.current !== null) {
				window.clearTimeout(layoutAnimationTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (selected) return;
		const textArea = ref.current?.querySelector(
			"[data-item-editable]"
		) as HTMLTextAreaElement | null;
		if (textArea && document.activeElement === textArea) {
			textArea.blur();
		}
	}, [selected]);

	// Store the relative offset (item.x, item.y) in a ref so it's stable during drag
	const relativeOffsetRef = React.useRef({ x: item.x, y: item.y });
	React.useEffect(() => {
		relativeOffsetRef.current = { x: item.x, y: item.y };
	}, [item.x, item.y]);

	// Presence listeners
	const applyDrag = React.useCallback(
		(d: DragAndRotatePackage) => {
			// Drive the optimistic drag visuals from presence updates so local and remote
			// drags share the same rendering path. Persistence happens when the drag ends.
			if (!d) return;

			const currentItem = itemRef.current;
			const currentItemId = currentItem.id;

			const overrideSize = contentProps.sizeOverride ?? contentProps.textWidthOverride;
			const handler = getContentHandler(currentItem, overrideSize);
			const ensureDimensions = () => {
				if (handler.type === "shape") {
					if (
						contentProps.shapeWidthOverride !== undefined &&
						contentProps.shapeHeightOverride !== undefined
					) {
						return {
							width: contentProps.shapeWidthOverride,
							height: contentProps.shapeHeightOverride,
						};
					}
					const size = handler.getSize();
					return {
						width: intrinsic.current.w || size,
						height: intrinsic.current.h || size,
					};
				}
				return {
					width: intrinsic.current.w,
					height: intrinsic.current.h,
				};
			};

			const selectionEntry = d.selection?.find((entry) => entry.id === currentItemId);

			// Check if this item itself is being dragged
			if (d.id === currentItemId || selectionEntry) {
				const nextX = selectionEntry ? selectionEntry.x : d.x;
				const nextY = selectionEntry ? selectionEntry.y : d.y;
				const rotation = selectionEntry
					? (selectionEntry.rotation ?? currentItem.rotation)
					: d.rotation;
				setView((v) => ({
					...v,
					left: nextX,
					top: nextY,
					transform: handler.getRotationTransform(rotation),
				}));

				const { width, height } = ensureDimensions();
				if (width && height) {
					layout.set(currentItemId, {
						left: nextX,
						top: nextY,
						right: nextX + width,
						bottom: nextY + height,
					});
					scheduleLayoutInvalidation();
				}
				return;
			}

			const findAncestorDrag = (): boolean => {
				let info: GroupHierarchyInfo | null = getParentGroupInfo(currentItem);
				while (info) {
					if (info.groupItem.id === d.id) {
						return true;
					}
					info = getParentGroupInfo(info.groupItem);
				}
				return false;
			};

			if (parentGroup || getParentGroupInfo(currentItem)) {
				if (findAncestorDrag()) {
					const offset = getNestedGroupDragOffset(currentItem, presence, d);
					const newAbsoluteX = offset.x;
					const newAbsoluteY = offset.y;

					const displayRotation = isGroupGridEnabled(parentGroup)
						? 0
						: currentItem.rotation;
					const transform =
						itemType(currentItem) === "table"
							? "rotate(0)"
							: `rotate(${displayRotation}deg)`;

					setView((v) => ({
						...v,
						left: newAbsoluteX,
						top: newAbsoluteY,
						transform,
					}));
					const { width, height } = ensureDimensions();
					if (width && height) {
						layout.set(currentItemId, {
							left: newAbsoluteX,
							top: newAbsoluteY,
							right: newAbsoluteX + width,
							bottom: newAbsoluteY + height,
						});
						scheduleLayoutInvalidation();
					}
				}
			}
		},
		[
			parentGroup,
			contentProps.sizeOverride,
			contentProps.textWidthOverride,
			contentProps.shapeWidthOverride,
			contentProps.shapeHeightOverride,
			layout,
		]
	);
	const applyResize = (r: ResizePackage | null) => {
		const currentItem = itemRef.current;
		const handler = getContentHandler(currentItem);
		if (r && r.id === currentItem.id && handler.canResize()) {
			setView((v) => ({ ...v, left: r.x, top: r.y }));
			if (isShape(currentItem)) {
				const shape = currentItem.content;
				if (isRectangleShape(shape) && r.width !== undefined && r.height !== undefined) {
					const width = clampShapeSize(r.width);
					const height = clampShapeSize(r.height);
					const maxSize = Math.max(width, height);
					setContentProps({
						sizeOverride: maxSize,
						shapeWidthOverride: width,
						shapeHeightOverride: height,
					});
					intrinsic.current = { w: width, h: height };
					layout.set(currentItem.id, {
						left: r.x,
						top: r.y,
						right: r.x + width,
						bottom: r.y + height,
					});
					scheduleLayoutInvalidation();
				} else {
					const size = r.size;
					setContentProps({ sizeOverride: size });
					const dims = getScaledShapeDimensions(shape, size);
					intrinsic.current = { w: dims.width, h: dims.height };
					layout.set(currentItem.id, {
						left: r.x,
						top: r.y,
						right: r.x + dims.width,
						bottom: r.y + dims.height,
					});
					scheduleLayoutInvalidation();
				}
			} else if (Tree.is(currentItem.content, TextBlock)) {
				const width = clampTextWidth(r.size);
				setContentProps({ textWidthOverride: width });
				intrinsic.current = {
					w: width,
					h: intrinsic.current.h || currentItem.content.fontSize * 2.4 + 32,
				};
				const height = intrinsic.current.h || currentItem.content.fontSize * 2.4 + 32;
				layout.set(currentItem.id, {
					left: r.x,
					top: r.y,
					right: r.x + width,
					bottom: r.y + height,
				});
				scheduleLayoutInvalidation();
			}
		} else if (!r || r.id !== currentItem.id) {
			setContentProps({});
		}
	};
	usePresenceManager(
		presence.drag as PresenceManager<DragAndRotatePackage>,
		(u) => u && applyDrag(u),
		(u) => u && applyDrag(u) // Same handler for both local and remote
	);
	usePresenceManager(
		presence.resize as PresenceManager<ResizePackage | null>,
		(u) => applyResize(u),
		applyResize
	);
	usePresenceManager(
		presence.itemSelection,
		() => {},
		(sel) => setSelected(sel.some((s) => s.id === item.id))
	);

	// Pointer lifecycle (delta-based to avoid foreignObject measurement jumps)
	const coordsCanvas = (e: { clientX: number; clientY: number }) =>
		calculateCanvasMouseCoordinates(e, props.pan, props.zoom, props.canvasElement ?? undefined);

	interface SelectionSnapshot {
		id: string;
		item: Item;
		startAbsoluteX: number;
		startAbsoluteY: number;
		startRelativeX: number;
		startRelativeY: number;
		parentGroupInfo: GroupHierarchyInfo | null;
		parentGroupStartAbsoluteX: number | null;
		parentGroupStartAbsoluteY: number | null;
	}

	const getRootItemsForItem = (start: Item): Items | null => {
		let current: Item | Group | Items | App | null = start;
		while (current) {
			const parent = Tree.parent(current);
			if (!parent) {
				return null;
			}
			if (Tree.is(parent, Items)) {
				const grand = Tree.parent(parent);
				if (grand && Tree.is(grand, App)) {
					return parent;
				}
			}
			current = parent as Item | Group | Items | App | null;
		}
		return null;
	};

	const getAbsolutePositionForItem = (
		target: Item,
		presenceValue: React.ContextType<typeof PresenceContext>
	): { x: number; y: number } => {
		// Determine the item's absolute canvas position, respecting group offsets.
		const parentInfo = getParentGroupInfo(target);
		if (parentInfo) {
			const { groupItem, group } = parentInfo;
			const { x: groupX, y: groupY } = getGroupActivePosition(groupItem, presenceValue);
			const offset = getGroupChildOffset(group, target);
			return { x: groupX + offset.x, y: groupY + offset.y };
		}
		return { x: target.x, y: target.y };
	};

	const getParentGroupStartAbsolute = (
		info: GroupHierarchyInfo | null,
		presenceValue: React.ContextType<typeof PresenceContext>
	): { x: number; y: number } | null => {
		if (!info) {
			return null;
		}
		const absolute = getAbsolutePositionForItem(info.groupItem, presenceValue);
		return absolute;
	};

	const buildSelectionDragState = (
		anchorItem: Item,
		anchorDisplay: { x: number; y: number },
		presenceValue: React.ContextType<typeof PresenceContext>
	): {
		snapshots: SelectionSnapshot[];
		selectedIds: string[];
		rootItems: Items | null;
	} => {
		// Snapshot the active selection so multi-select drags keep relative offsets intact.
		const rootItems = getRootItemsForItem(anchorItem);
		const selectionIds = presenceValue.itemSelection.getLocalSelection().map((sel) => sel.id);
		if (!selectionIds.includes(anchorItem.id)) {
			selectionIds.push(anchorItem.id);
		}
		const uniqueSelectedIds = Array.from(new Set(selectionIds));
		let snapshots: SelectionSnapshot[] = [];
		if (rootItems) {
			const selectedItems = findItemsByIds(rootItems, uniqueSelectedIds);
			const itemById = new Map(
				selectedItems.map((selectedItem) => [selectedItem.id, selectedItem])
			);
			snapshots = uniqueSelectedIds
				.map((id) => {
					const targetItem = itemById.get(id);
					if (!targetItem) return null;
					const absolute = getAbsolutePositionForItem(targetItem, presenceValue);
					const parentInfo = getParentGroupInfo(targetItem);
					const parentAbsolute = getParentGroupStartAbsolute(parentInfo, presenceValue);
					return {
						id,
						item: targetItem,
						startAbsoluteX: absolute.x,
						startAbsoluteY: absolute.y,
						startRelativeX: targetItem.x,
						startRelativeY: targetItem.y,
						parentGroupInfo: parentInfo,
						parentGroupStartAbsoluteX: parentAbsolute ? parentAbsolute.x : null,
						parentGroupStartAbsoluteY: parentAbsolute ? parentAbsolute.y : null,
					} satisfies SelectionSnapshot;
				})
				.filter((snap): snap is SelectionSnapshot => snap !== null);
		}
		if (snapshots.length === 0) {
			const parentInfo = getParentGroupInfo(anchorItem);
			const parentAbsolute = getParentGroupStartAbsolute(parentInfo, presenceValue);
			snapshots = [
				{
					id: anchorItem.id,
					item: anchorItem,
					startAbsoluteX: anchorDisplay.x,
					startAbsoluteY: anchorDisplay.y,
					startRelativeX: anchorItem.x,
					startRelativeY: anchorItem.y,
					parentGroupInfo: parentInfo,
					parentGroupStartAbsoluteX: parentAbsolute ? parentAbsolute.x : null,
					parentGroupStartAbsoluteY: parentAbsolute ? parentAbsolute.y : null,
				},
			];
			if (!uniqueSelectedIds.includes(anchorItem.id)) {
				uniqueSelectedIds.push(anchorItem.id);
			}
		}
		return { snapshots, selectedIds: uniqueSelectedIds, rootItems };
	};

	const buildSelectionPresencePayload = (
		dragState: DragState,
		primaryId: string,
		nextX: number,
		nextY: number,
		dx: number,
		dy: number
	): DragSelectionEntry[] | undefined => {
		// Broadcast the in-progress positions for every selected item so collaborators see the batch drag.
		if (!dragState.selectionSnapshots.length) {
			return undefined;
		}
		const payload = dragState.selectionSnapshots.map((snap) => {
			if (snap.id === primaryId) {
				return {
					id: snap.id,
					x: nextX,
					y: nextY,
					rotation: snap.item.rotation,
				};
			}
			return {
				id: snap.id,
				x: snap.startAbsoluteX + dx,
				y: snap.startAbsoluteY + dy,
				rotation: snap.item.rotation,
			};
		});
		return payload.length > 1 ? payload : undefined;
	};

	const applySelectionCommit = (
		dragState: DragState,
		presenceValue: React.ContextType<typeof PresenceContext>,
		deltaX: number,
		deltaY: number,
		anchorItem: Item
	) => {
		// Persist the drag deltas into the tree once the user releases the pointer.
		let snapshots = dragState.selectionSnapshots;
		if (!snapshots.length) {
			const fallback = buildSelectionDragState(
				anchorItem,
				{ x: dragState.startItemX, y: dragState.startItemY },
				presenceValue
			);
			snapshots = fallback.snapshots;
			dragState.rootItems = fallback.rootItems;
		}
		const rootItems = dragState.rootItems ?? getRootItemsForItem(anchorItem);
		const performUpdates = () => {
			for (const snap of snapshots) {
				const newAbsoluteX = snap.startAbsoluteX + deltaX;
				const newAbsoluteY = snap.startAbsoluteY + deltaY;
				if (!snap.parentGroupInfo) {
					snap.item.x = newAbsoluteX;
					snap.item.y = newAbsoluteY;
					continue;
				}
				const { groupItem } = snap.parentGroupInfo;
				const groupSnapshot = snapshots.find((s) => s.id === groupItem.id);
				const parentAbsolute =
					snap.parentGroupStartAbsoluteX !== null
						? {
								x: snap.parentGroupStartAbsoluteX,
								y: snap.parentGroupStartAbsoluteY ?? 0,
							}
						: getParentGroupStartAbsolute(snap.parentGroupInfo, presenceValue);
				const baseGroupAbsX = parentAbsolute ? parentAbsolute.x : groupItem.x;
				const baseGroupAbsY = parentAbsolute ? parentAbsolute.y : groupItem.y;
				const groupNewAbsX = baseGroupAbsX + (groupSnapshot ? deltaX : 0);
				const groupNewAbsY = baseGroupAbsY + (groupSnapshot ? deltaY : 0);
				snap.item.x = newAbsoluteX - groupNewAbsX;
				snap.item.y = newAbsoluteY - groupNewAbsY;
			}
		};
		if (rootItems) {
			Tree.runTransaction(rootItems, performUpdates);
		} else {
			performUpdates();
		}
	};

	interface DragState {
		pointerId: number;
		started: boolean;
		startItemX: number;
		startItemY: number;
		startCanvasX: number;
		startCanvasY: number;
		startClientX: number;
		startClientY: number;
		latestItemX: number;
		latestItemY: number;
		interactiveStart: boolean;
		initialTarget: HTMLElement | null;
		focusTarget: HTMLTextAreaElement | null;
		containerElement: HTMLElement;
		selectedIds: string[];
		selectionSnapshots: SelectionSnapshot[];
		rootItems: Items | null;
	}

	const DRAG_THRESHOLD_PX = 6;

	// Shared logic for both mouse and touch
	const handleItemInteraction = (
		e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
		isTouch: boolean
	) => {
		// Normalize pointer interaction bookkeeping so both mouse and touch paths share the same rules.
		const targetEl = e.target as HTMLElement;
		const interactive = !!targetEl.closest(
			'textarea, input, select, button, [contenteditable="true"], .dropdown, .menu'
		);

		// Check if this is interaction with UI handles (resize/rotate)
		const isUIHandle = !!targetEl.closest("[data-resize-handle], [data-rotate-handle]");
		const isDirectHandle =
			targetEl.hasAttribute("data-resize-handle") ||
			targetEl.hasAttribute("data-rotate-handle") ||
			targetEl.parentElement?.hasAttribute("data-resize-handle") ||
			targetEl.parentElement?.hasAttribute("data-rotate-handle");
		const isAnyHandle = isUIHandle || isDirectHandle;

		// For touch on handles, prevent default and stop propagation
		if (isTouch && isAnyHandle) {
			e.preventDefault();
			e.stopPropagation();
		}

		// Always stop propagation for item interactions to prevent Canvas interference
		const isDropdownMenu = targetEl.closest(".dropdown, .menu");
		if (!isDropdownMenu) {
			e.stopPropagation();
		}

		// Set selection unless interacting with UI controls
		const shouldSkipSelection = targetEl.closest("button, select, .dropdown, .menu");
		if (!shouldSkipSelection) {
			const localSelection = presence.itemSelection.getLocalSelection();
			const isAlreadySelected = localSelection.some((sel) => sel.id === item.id);
			// Respect Ctrl/Meta for multi-select
			if (e.ctrlKey || e.metaKey) {
				presence.itemSelection.toggleSelection({ id: item.id });
			} else if (!isAlreadySelected) {
				presence.itemSelection.setSelection({ id: item.id });
			}
		}

		return { targetEl, interactive, isAnyHandle };
	};

	const focusEditableElement = (
		preferred: HTMLTextAreaElement | null,
		container: HTMLElement | null
	) => {
		// Refocus embedded inputs after pointer interactions so typing resumes without extra clicks.
		if (!container) return;
		const target =
			preferred && preferred.isConnected
				? preferred
				: (container.querySelector("[data-item-editable]") as HTMLTextAreaElement | null);
		if (!target) return;
		target.focus();
		try {
			const len = target.value.length;
			target.setSelectionRange(len, len);
		} catch {
			// Some editable controls may not support selection APIs
		}
	};

	const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;

		const { interactive, targetEl, isAnyHandle } = handleItemInteraction(e, false);

		// Bail if the gesture originated from resize/rotate handles—they manage their own lifecycle.
		// Don't set up drag if clicking on a resize/rotate handle
		if (isAnyHandle) {
			// Clean up any pending drag state from THIS item
			if (activeMouseDragCleanup) {
				activeMouseDragCleanup();
				activeMouseDragCleanup = null;
			}
			dragRef.current = null;
			return;
		}

		// Cancel any active drag from another item (but not handles!)
		if (activeMouseDragCleanup) {
			activeMouseDragCleanup();
			activeMouseDragCleanup = null;
		}

		const textAreaTarget = targetEl.closest(
			"[data-item-editable]"
		) as HTMLTextAreaElement | null;
		const textAreaFocused = !!(textAreaTarget && document.activeElement === textAreaTarget);
		const needsFocusAfterClick = !!(textAreaTarget && !textAreaFocused);
		if (needsFocusAfterClick) {
			// Prevent the browser from giving focus immediately; we'll manage focus on click release.
			e.preventDefault();
		}
		const start = coordsCanvas(e);

		const {
			snapshots: selectionSnapshots,
			selectedIds: uniqueSelectedIds,
			rootItems,
		} = buildSelectionDragState(item, { x: displayX, y: displayY }, presence);

		// Store drag potential, but don't set up listeners yet
		// Listeners will be added on first mousemove to avoid interfering with handles
		dragRef.current = {
			pointerId: -1,
			started: false,
			startItemX: displayX,
			startItemY: displayY,
			startCanvasX: start.x,
			startCanvasY: start.y,
			startClientX: e.clientX,
			startClientY: e.clientY,
			latestItemX: displayX,
			latestItemY: displayY,
			interactiveStart: interactive,
			initialTarget: textAreaTarget ?? null,
			focusTarget: needsFocusAfterClick ? textAreaTarget : null,
			containerElement: e.currentTarget as HTMLElement,
			selectedIds: uniqueSelectedIds,
			selectionSnapshots,
			rootItems,
		};

		let listenersAdded = false;

		const docMove = (ev: MouseEvent) => {
			const st = dragRef.current;
			if (!st) return;
			if (ev.buttons !== undefined && (ev.buttons & 1) === 0) {
				cleanup();
				return;
			}
			if (
				!st.started &&
				st.interactiveStart &&
				st.initialTarget &&
				document.activeElement === st.initialTarget
			) {
				return;
			}
			if (!st.started) {
				// Don't allow dragging items in grid-view groups
				if (isGroupGridEnabled(parentGroup)) return;
				const screenDx = ev.clientX - st.startClientX;
				const screenDy = ev.clientY - st.startClientY;
				const threshold = st.interactiveStart ? DRAG_THRESHOLD_PX * 2 : DRAG_THRESHOLD_PX;
				if (Math.hypot(screenDx, screenDy) < threshold) return;
				st.started = true;
				document.documentElement.dataset.manipulating = "1";
				ev.preventDefault();
			}
			if (st.started) {
				const cur = coordsCanvas(ev);
				const dx = cur.x - st.startCanvasX;
				const dy = cur.y - st.startCanvasY;
				const nextX = st.startItemX + dx;
				const nextY = st.startItemY + dy;
				st.latestItemX = nextX;
				st.latestItemY = nextY;

				// Simply update presence - applyDrag will handle the visual update
				const currentItem = itemRef.current;
				const selectionEntries = buildSelectionPresencePayload(
					st,
					currentItem.id,
					nextX,
					nextY,
					dx,
					dy
				);
				presence.drag.setDragging({
					id: currentItem.id,
					x: nextX,
					y: nextY,
					rotation: currentItem.rotation,
					branch: presence.branch,
					selection: selectionEntries,
				});
			}
		};

		const initialMove = (ev: MouseEvent) => {
			// On first mousemove, check if we should start tracking drag
			// This prevents interfering with handle clicks
			const screenDx = ev.clientX - e.clientX;
			const screenDy = ev.clientY - e.clientY;
			// If mouse moved at all, set up full drag tracking
			if (Math.hypot(screenDx, screenDy) > 0) {
				// Lazily attach listeners so simple clicks do not pay the cost of document observers.
				document.removeEventListener("mousemove", initialMove);
				document.addEventListener("mousemove", docMove);
				listenersAdded = true;
				docMove(ev); // Process this move event
			}
		};

		const finish = () => {
			const st = dragRef.current;
			if (!st) return;

			if (st.started) {
				const currentItem = itemRef.current;

				// Don't allow dragging items in grid-view groups
				if (isGroupGridEnabled(parentGroup)) {
					presence.drag.clearDragging();
					delete document.documentElement.dataset.manipulating;
					dragRef.current = null;
					return;
				}

				const deltaX = st.latestItemX - st.startItemX;
				const deltaY = st.latestItemY - st.startItemY;
				applySelectionCommit(st, presence, deltaX, deltaY, currentItem);

				// Clear presence state
				presence.drag.clearDragging();
				delete document.documentElement.dataset.manipulating;
			} else {
				// Handle focus for text elements when clicking (not dragging)
				const { focusTarget, containerElement } = st;
				if (focusTarget && focusTarget.isConnected) {
					focusEditableElement(focusTarget, containerElement);
				} else if (!st.interactiveStart) {
					focusEditableElement(null, containerElement);
				}
			}
			dragRef.current = null;
			document.removeEventListener("mousemove", initialMove);
			if (listenersAdded) {
				document.removeEventListener("mousemove", docMove);
			}
			document.removeEventListener("mouseup", finish);

			// Clear the global cleanup reference
			if (activeMouseDragCleanup === cleanup) {
				activeMouseDragCleanup = null;
			}
		};

		const cleanup = () => {
			document.removeEventListener("mousemove", initialMove);
			if (listenersAdded) {
				document.removeEventListener("mousemove", docMove);
			}
			document.removeEventListener("mouseup", finish);
			if (dragRef.current) {
				presence.drag.clearDragging();
				if (dragRef.current.started) {
					delete document.documentElement.dataset.manipulating;
				}
				dragRef.current = null;
			}
		};

		// Store cleanup function globally so other items can cancel this drag
		activeMouseDragCleanup = cleanup;

		document.addEventListener("mousemove", initialMove);
		document.addEventListener("mouseup", finish);
	};

	const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		// Only handle single touch for now
		if (e.touches.length !== 1) return;

		const touch = e.touches[0];
		const { interactive, targetEl, isAnyHandle } = handleItemInteraction(e, true);

		// Don't set up drag if touching a resize/rotate handle
		if (isAnyHandle) {
			// Clean up any pending drag state from THIS item
			if (activeTouchDragCleanup) {
				activeTouchDragCleanup();
				activeTouchDragCleanup = null;
			}
			dragRef.current = null;
			return;
		}

		// Cancel any active touch drag from another item (but not handles!)
		if (activeTouchDragCleanup) {
			activeTouchDragCleanup();
			activeTouchDragCleanup = null;
		}

		const textAreaTarget = targetEl.closest(
			"[data-item-editable]"
		) as HTMLTextAreaElement | null;
		const textAreaFocused = !!(textAreaTarget && document.activeElement === textAreaTarget);
		const needsFocusAfterTap = !!(textAreaTarget && !textAreaFocused);
		if (needsFocusAfterTap) {
			e.preventDefault();
		}
		const start = coordsCanvas(touch);
		const {
			snapshots: selectionSnapshots,
			selectedIds: uniqueSelectedIds,
			rootItems,
		} = buildSelectionDragState(item, { x: displayX, y: displayY }, presence);

		// For drag, use absolute display coordinates
		dragRef.current = {
			pointerId: touch.identifier,
			started: false,
			startItemX: displayX,
			startItemY: displayY,
			startCanvasX: start.x,
			startCanvasY: start.y,
			startClientX: touch.clientX,
			startClientY: touch.clientY,
			latestItemX: displayX,
			latestItemY: displayY,
			interactiveStart: interactive,
			initialTarget: textAreaTarget ?? null,
			focusTarget: needsFocusAfterTap ? textAreaTarget : null,
			containerElement: e.currentTarget as HTMLElement,
			selectedIds: uniqueSelectedIds,
			selectionSnapshots,
			rootItems,
		};

		const docMove = (ev: TouchEvent) => {
			const st = dragRef.current;
			if (!st) return;

			// Find our touch
			const touch = Array.from(ev.touches).find((t) => t.identifier === st.pointerId);
			if (!touch) return;
			if (!st.started) {
				if (
					st.interactiveStart &&
					st.initialTarget &&
					document.activeElement === st.initialTarget
				) {
					return;
				}
				// Don't allow dragging items in grid-view groups
				if (isGroupGridEnabled(parentGroup)) return;
				// Use same threshold for touch to keep behavior consistent
				const screenDx = touch.clientX - st.startClientX;
				const screenDy = touch.clientY - st.startClientY;
				const threshold = st.interactiveStart ? DRAG_THRESHOLD_PX * 2 : DRAG_THRESHOLD_PX;
				if (Math.hypot(screenDx, screenDy) < threshold) return;
				st.started = true;
				document.documentElement.dataset.manipulating = "1";
				ev.preventDefault();
			}
			if (st.started) {
				const cur = coordsCanvas(touch);
				const dx = cur.x - st.startCanvasX;
				const dy = cur.y - st.startCanvasY;
				const nextX = st.startItemX + dx;
				const nextY = st.startItemY + dy;
				st.latestItemX = nextX;
				st.latestItemY = nextY;

				// Simply update presence - applyDrag will handle the visual update
				const currentItem = itemRef.current;
				const selectionEntries = buildSelectionPresencePayload(
					st,
					currentItem.id,
					nextX,
					nextY,
					dx,
					dy
				);
				presence.drag.setDragging({
					id: currentItem.id,
					x: nextX,
					y: nextY,
					rotation: currentItem.rotation,
					branch: presence.branch,
					selection: selectionEntries,
				});
			}
		};

		const finish = () => {
			const st = dragRef.current;
			if (!st) return;

			if (st.started) {
				const currentItem = itemRef.current;

				// Don't allow dragging items in grid-view groups
				if (isGroupGridEnabled(parentGroup)) {
					presence.drag.clearDragging();
					delete document.documentElement.dataset.manipulating;
					dragRef.current = null;
					return;
				}

				const deltaX = st.latestItemX - st.startItemX;
				const deltaY = st.latestItemY - st.startItemY;
				applySelectionCommit(st, presence, deltaX, deltaY, currentItem);

				// Clear presence state
				presence.drag.clearDragging();
				delete document.documentElement.dataset.manipulating;
			} else {
				const { focusTarget, containerElement } = st;
				if (focusTarget && focusTarget.isConnected) {
					focusEditableElement(focusTarget, containerElement);
				} else if (!st.interactiveStart) {
					focusEditableElement(null, containerElement);
				}
			}
			dragRef.current = null;
			document.removeEventListener("touchmove", docMove);
			document.removeEventListener("touchend", finish);
			document.removeEventListener("touchcancel", finish);

			// Clear the global cleanup reference
			if (activeTouchDragCleanup === cleanup) {
				activeTouchDragCleanup = null;
			}
		};

		const cleanup = () => {
			document.removeEventListener("touchmove", docMove);
			document.removeEventListener("touchend", finish);
			document.removeEventListener("touchcancel", finish);
			if (dragRef.current) {
				presence.drag.clearDragging();
				if (dragRef.current.started) {
					delete document.documentElement.dataset.manipulating;
				}
				dragRef.current = null;
			}
		};

		// Store cleanup function globally so other items can cancel this drag
		activeTouchDragCleanup = cleanup;

		document.addEventListener("touchmove", docMove, { passive: false });
		document.addEventListener("touchend", finish);
		document.addEventListener("touchcancel", finish);
	};

	// No-op handlers required because we attach to document
	const onPointerMove = () => {};
	const onPointerUp = () => {};

	// Layout measurement
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => {
			let w = 0,
				h = 0;
			const overrideSize = contentProps.sizeOverride ?? contentProps.textWidthOverride;
			const handler = getContentHandler(item, overrideSize);
			if (handler.type === "shape" && isShape(item)) {
				if (
					contentProps.shapeWidthOverride !== undefined &&
					contentProps.shapeHeightOverride !== undefined
				) {
					w = contentProps.shapeWidthOverride;
					h = contentProps.shapeHeightOverride;
				} else if (contentProps.sizeOverride !== undefined) {
					const dims = getScaledShapeDimensions(item.content, contentProps.sizeOverride);
					w = dims.width;
					h = dims.height;
				} else {
					const dims = getShapeDimensionsFromShape(item.content);
					w = dims.width;
					h = dims.height;
				}
			} else {
				// For HTML-backed items (notes / tables) we rely on DOM measurement.
				// offsetWidth/Height are in CSS pixels; if zoomed, divide by zoom to
				// convert back to model units so layout comparisons remain consistent.
				w = el.offsetWidth;
				h = el.offsetHeight;
				if ((!w || !h) && el.getBoundingClientRect) {
					const bb = el.getBoundingClientRect();
					const z = props.zoom || 1;
					w = (w || bb.width) / z;
					h = (h || bb.height) / z;
				}
			}
			if (!w || !h) return;
			intrinsic.current = { w, h };
			// Update layout bounds so other systems (e.g. selection region tests)
			// have accurate spatial data even when presence (drag) modifies the
			// visual position before commit.
			layout.set(item.id, {
				left: view.left,
				top: view.top,
				right: view.left + w,
				bottom: view.top + h,
			});
			scheduleLayoutInvalidation();
			props.onMeasured?.(item, { width: w, height: h });
		};
		measure();
		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(measure);
			ro.observe(el);
		}
		return () => ro?.disconnect();
	}, [
		item.id,
		item.content,
		view.left,
		view.top,
		contentProps.sizeOverride,
		contentProps.shapeWidthOverride,
		contentProps.shapeHeightOverride,
		contentProps.textWidthOverride,
		props.zoom,
		layout,
		props.onMeasured,
	]);

	// Never mutate view directly (React may freeze state objects in strict/dev modes)
	const isBeingDragged = presence.drag.state.local?.id === item.id;
	const isBeingResized = presence.resize.state.local?.id === item.id;
	const shouldAnimateLayout = layoutAnimating && !isBeingDragged && !isBeingResized;

	const style = {
		...view,
		zIndex: index,
		touchAction: "none",
		WebkitUserSelect: "none",
		userSelect: "none",
		willChange: shouldAnimateLayout ? "transform, left, top" : undefined,
	} as const;
	const logicalZoom = props.logicalZoom ?? props.zoom;
	return (
		<div
			ref={ref}
			data-item-id={item.id}
			onMouseDown={(e) => {
				// Suppress an immediate background clear after interacting with an item.
				const svg = document.querySelector('svg[data-canvas-root="true"]') as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (svg) {
					// 75ms is enough to cover click bubbling & selection updates without affecting real background clicks.
					svg.dataset.suppressClearUntil = String(Date.now() + 75);
				}
				onMouseDown(e);
			}}
			onTouchStart={(e) => {
				// Suppress an immediate background clear after interacting with an item.
				const svg = document.querySelector('svg[data-canvas-root="true"]') as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (svg) {
					// 75ms is enough to cover click bubbling & selection updates without affecting real background clicks.
					svg.dataset.suppressClearUntil = String(Date.now() + 75);
				}
				onTouchStart(e);
			}}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			className={`absolute${shouldAnimateLayout ? " layout-swap-animate" : ""}`}
			style={style}
			onClick={(e) => {
				e.stopPropagation();
				// Selection is now handled in onMouseDown/onTouchStart to avoid conflicts with drag system
			}}
		>
			<SelectionBox
				selected={!!selected}
				item={item}
				onResizeEnd={() => setContentProps({})}
				visualHidden={!!hideSelectionControls}
				zoom={logicalZoom}
				absoluteX={displayX}
				absoluteY={displayY}
				groupOffsetX={groupOffsetX}
				groupOffsetY={groupOffsetY}
				parentGroup={parentGroup}
			/>
			<ContentElement item={item} contentProps={contentProps} />
		</div>
	);
}

// ============================================================================
// Remote selection indicators
// ============================================================================
interface ConnectedUser {
	value: { name: string; id: string; image?: string };
	client: { attendeeId: string };
}
export function RemoteSelectionIndicators({
	remoteSelectedUsers,
}: {
	remoteSelectedUsers: string[];
}) {
	const presence = useContext(PresenceContext);
	const [expanded, setExpanded] = useState(false);
	if (!remoteSelectedUsers.length) return <></>;
	const connected = presence.users.getConnectedUsers().map((u) => ({
		value: {
			name: u.value.name,
			id: u.value.id,
			image: "image" in u.value ? (u.value as { image?: string }).image : undefined,
		},
		client: { attendeeId: u.client.attendeeId },
	})) as ConnectedUser[];
	const users: ConnectedUser[] = remoteSelectedUsers
		.map((id) => connected.find((u) => u.client.attendeeId === id)!)
		.filter((u): u is ConnectedUser => !!u);
	if (!users.length) return <></>;
	if (users.length === 1)
		return (
			<div
				className="absolute pointer-events-none"
				style={{ top: 0, right: 0, zIndex: 1005 }}
			>
				<RemoteUserIndicator user={users[0]} index={0} />
			</div>
		);
	return (
		<div className="absolute" style={{ top: 0, right: 0, zIndex: 1005 }}>
			{expanded ? (
				<div className="pointer-events-none relative">
					{users.map((u, i) => (
						<div
							key={u.client.attendeeId}
							className="transition-all duration-300 ease-out"
							style={{
								transform: `translateX(${expanded ? 0 : 20}px)`,
								opacity: expanded ? 1 : 0,
								transitionDelay: `${i * 50}ms`,
							}}
						>
							<RemoteUserIndicator user={u} index={i} />
						</div>
					))}
					<div
						className="absolute pointer-events-auto cursor-pointer w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-700 transition-all duration-200 border-2 border-white shadow-lg flex items-center justify-center"
						style={{
							top: -12,
							right: -12 - users.length * 26,
							zIndex: 1006,
							transform: `scale(${expanded ? 1 : 0})`,
							opacity: expanded ? 1 : 0,
							transitionDelay: `${users.length * 50}ms`,
						}}
						onClick={(e) => {
							e.stopPropagation();
							setExpanded(false);
						}}
						title="Collapse user list"
					>
						<ChevronLeft16Filled className="text-white" />
					</div>
				</div>
			) : (
				<div
					className="transition-all duration-300 ease-out"
					style={{ transform: `scale(${expanded ? 0 : 1})`, opacity: expanded ? 0 : 1 }}
				>
					<UserCountBadge
						userCount={users.length}
						users={users}
						onExpand={() => setExpanded(true)}
					/>
				</div>
			)}
		</div>
	);
}
function UserCountBadge({
	userCount,
	users,
	onExpand,
}: {
	userCount: number;
	users: Array<{
		value: { name: string; id: string; image?: string };
		client: { attendeeId: string };
	}>;
	onExpand: () => void;
}) {
	const tip =
		users
			.slice(0, 3)
			.map((u) => u.value.name)
			.join(", ") +
		(userCount > 3 ? ` and ${userCount - 3} more` : "") +
		" selected this item";
	return (
		<div
			className="pointer-events-auto cursor-pointer flex items-center justify-center text-white text-xs font-semibold rounded-full bg-black hover:bg-gray-800 transition-colors duration-200 border-2 border-white shadow-lg hover:shadow-xl"
			style={{
				width: 24,
				height: 24,
				position: "absolute",
				top: -12,
				right: -12,
				zIndex: 1005,
			}}
			title={tip}
			onClick={(e) => {
				e.stopPropagation();
				onExpand();
			}}
		>
			{userCount}
		</div>
	);
}
function RemoteUserIndicator({
	user,
	index,
}: {
	user: { value: { name: string; id: string; image?: string }; client: { attendeeId: string } };
	index: number;
}) {
	const i = initials(user.value.name);
	const c = userColor(user.client.attendeeId);
	const off = index * 26;
	return (
		<div
			className="flex items-center justify-center text-white font-semibold rounded-full border-2 border-white shadow-lg"
			style={{
				width: 24,
				height: 24,
				backgroundColor: c,
				position: "absolute",
				top: -12,
				right: -12 - off,
				zIndex: 1005,
				fontSize: 10,
				lineHeight: "1",
			}}
			title={`Selected by ${user.value.name}`}
		>
			{i}
		</div>
	);
}
