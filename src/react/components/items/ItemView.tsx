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

/**
 * GroupView - Simple visual representation for a group item
 * The actual child items are rendered directly on the main canvas with adjusted positions.
 * This component just shows a visual placeholder/border for the group container itself.
 */
function GroupView({ item }: { item: Item & { content: Group } }) {
	const group = item.content;
	useTree(group);

	// Groups don't render content here anymore - child items are on main canvas
	// This is just a visual placeholder
	return (
		<div className="group-placeholder flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/30 p-4">
			<div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
				Group ({group.items.length} items)
			</div>
		</div>
	);
}
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
import { FluidTable, Group, Item, Note, TextBlock } from "../../../schema/appSchema.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { useTree, objectIdNumber } from "../../hooks/useTree.js";
import { ShapeView } from "./ShapeView.js";
import { NoteView } from "./NoteView.js";
import { TableView } from "./TableView.js";
import { TextView } from "./TextView.js";
import { usePresenceManager } from "../../hooks/usePresenceManger.js";
import { PresenceManager } from "../../../presence/Interfaces/PresenceManager.js";
import { DragAndRotatePackage } from "../../../presence/drag.js";
import { ResizePackage } from "../../../presence/Interfaces/ResizeManager.js";
import { LayoutContext } from "../../hooks/useLayoutManger.js";
import { ChevronLeft16Filled } from "@fluentui/react-icons";
import { isGroupGridEnabled } from "../../layout/groupGrid.js";
import { getGroupChildOffset } from "../../utils/presenceGeometry.js";
import {
	getContentHandler,
	getContentType,
	isGroup,
	isShape,
} from "../../../utils/contentHandlers.js";
import { scheduleLayoutInvalidation } from "../../utils/layoutInvalidation.js";

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
export {
	calculateCanvasMouseCoordinates as canvasCoords,
	calculateOffsetFromCanvasOrigin as dragOffset,
};

// ============================================================================
// Content dispatcher
// ============================================================================
export function ContentElement({
	item,
	contentProps,
}: {
	item: Item;
	contentProps?: { sizeOverride?: number; textWidthOverride?: number };
}) {
	useTree(item.content);
	const overrideSize = contentProps?.sizeOverride ?? contentProps?.textWidthOverride;
	const handler = getContentHandler(item, overrideSize);

	if (handler.type === "shape" && isShape(item)) {
		return (
			<ShapeView
				key={objectIdNumber(item.content)}
				shape={item.content}
				sizeOverride={contentProps?.sizeOverride}
			/>
		);
	}
	if (handler.type === "note" && Tree.is(item.content, Note)) {
		return <NoteView key={objectIdNumber(item.content)} note={item.content} />;
	}
	if (handler.type === "text" && Tree.is(item.content, TextBlock)) {
		return (
			<TextView
				key={objectIdNumber(item.content)}
				text={item.content}
				widthOverride={contentProps?.textWidthOverride}
			/>
		);
	}
	if (handler.type === "table" && Tree.is(item.content, FluidTable)) {
		return <TableView key={objectIdNumber(item.content)} fluidTable={item.content} />;
	}
	if (handler.type === "group" && isGroup(item)) {
		return <GroupView key={objectIdNumber(item.content)} item={item} />;
	}
	return <></>;
}

export function TextResizeHandles({
	item,
	padding,
	onResizeEnd,
	zoom,
	groupOffsetX = 0,
	groupOffsetY = 0,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
	zoom?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
}) {
	if (!Tree.is(item.content, TextBlock)) return null;
	const text = item.content;
	useTree(text);
	const presence = useContext(PresenceContext);
	const [activeHandle, setActiveHandle] = useState<"left" | "right" | null>(null);
	const scale = zoom ?? 1;
	const startRef = useRef({
		width: text.width,
		pointerX: 0,
		absX: item.x + groupOffsetX,
		absY: item.y + groupOffsetY,
	});

	const beginResize = (side: "left" | "right", e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setActiveHandle(side);
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* unsupported */
		}
		const absX = item.x + groupOffsetX;
		const absY = item.y + groupOffsetY;
		startRef.current = {
			width: text.width,
			pointerX: e.clientX,
			absX,
			absY,
		};
		presence.resize.setResizing({ id: item.id, x: absX, y: absY, size: text.width });
		document.documentElement.dataset.manipulating = "1";
		const move = (ev: PointerEvent) => {
			const deltaPx = ev.clientX - startRef.current.pointerX;
			const delta = deltaPx / scale;
			let width = startRef.current.width;
			let left = startRef.current.absX;
			if (side === "right") {
				width = clampTextWidth(startRef.current.width + delta);
			} else {
				width = clampTextWidth(startRef.current.width - delta);
				left = startRef.current.absX + (startRef.current.width - width);
			}
			presence.resize.setResizing({
				id: item.id,
				x: left,
				y: startRef.current.absY,
				size: width,
			});
		};
		const up = () => {
			setActiveHandle(null);
			document.removeEventListener("pointermove", move);
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			delete document.documentElement.dataset.manipulating;
			const r = presence.resize.state.local;
			if (r && r.id === item.id) {
				Tree.runTransaction(item, () => {
					text.width = clampTextWidth(r.size);
					item.x = r.x - groupOffsetX;
					item.y = r.y - groupOffsetY;
				});
			}
			presence.resize.clearResizing();
			onResizeEnd?.();
			const canvasEl = document.getElementById("canvas") as
				| (SVGSVGElement & { dataset: DOMStringMap })
				| null;
			if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up, { once: true });
	};

	const handleBase = (side: "left" | "right") => {
		const offset = (activeHandle === side ? 10 : 8) * scale;
		const wrapperSize = 120 * scale;
		const handleSize = (activeHandle === side ? 30 : 26) * scale;
		const position: React.CSSProperties = {
			position: "absolute",
			top: "50%",
			transform: "translateY(-50%)",
			width: wrapperSize,
			height: wrapperSize,
			pointerEvents: "auto",
			touchAction: "none",
			cursor: "ew-resize",
			zIndex: 1000,
		};
		if (side === "left") {
			position.left = -padding - offset;
			position.marginLeft = -wrapperSize / 2;
		} else {
			position.right = -padding - offset;
			position.marginRight = -wrapperSize / 2;
		}
		return {
			wrapper: position,
			handle: {
				position: "absolute" as const,
				width: handleSize,
				height: handleSize,
				borderRadius: 9999,
				background: "#0f172a",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				boxShadow: "0 4px 12px rgba(15, 23, 42, 0.35)",
				border: "2px solid #f8fafc",
				pointerEvents: "none" as const,
			},
		};
	};

	const Handle = ({ side }: { side: "left" | "right" }) => {
		const styles = handleBase(side);
		return (
			<div
				style={styles.wrapper}
				onPointerDown={(e) => beginResize(side, e)}
				data-resize-handle
				data-text-resize-handle={side}
				className={`text-resize-handle text-resize-handle-${side}`}
			>
				<div style={styles.handle} />
			</div>
		);
	};

	return (
		<>
			<Handle side="left" />
			<Handle side="right" />
		</>
	);
}

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
		if (!d) return;

		const currentItem = itemRef.current;
		const currentItemId = currentItem.id;
		
		const overrideSize = contentProps.sizeOverride ?? contentProps.textWidthOverride;
		const handler = getContentHandler(currentItem, overrideSize);			const ensureDimensions = () => {
				if (handler.type === "shape") {
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
			
			// Check if this item itself is being dragged
			if (d.id === currentItemId) {
				setView((v) => ({
					...v,
					left: d.x,
					top: d.y,
					transform: handler.getRotationTransform(d.rotation),
				}));
				
				const { width, height } = ensureDimensions();
				if (width && height) {
					layout.set(currentItemId, {
						left: d.x,
						top: d.y,
						right: d.x + width,
						bottom: d.y + height,
					});
					scheduleLayoutInvalidation();
				}
				return;
			}

			// Check if this item's parent group is being dragged
			if (parentGroup) {
				const groupContainer = Tree.parent(parentGroup);
				if (groupContainer && Tree.is(groupContainer, Item) && d.id === groupContainer.id) {
					const newGroupX = d.x;
					const newGroupY = d.y;

					let itemOffsetX: number;
					let itemOffsetY: number;

					if (isGroupGridEnabled(parentGroup)) {
						const offset = getGroupChildOffset(parentGroup, currentItem);
						itemOffsetX = offset.x;
						itemOffsetY = offset.y;
					} else {
						itemOffsetX = relativeOffsetRef.current.x;
						itemOffsetY = relativeOffsetRef.current.y;
					}

					const newAbsoluteX = newGroupX + itemOffsetX;
					const newAbsoluteY = newGroupY + itemOffsetY;

					const displayRotation = isGroupGridEnabled(parentGroup) ? 0 : currentItem.rotation;
					const transform =
						itemType(currentItem) === "table" ? "rotate(0)" : `rotate(${displayRotation}deg)`;

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
		[parentGroup, contentProps.sizeOverride, contentProps.textWidthOverride, layout]
	);
	const applyResize = (r: ResizePackage | null) => {
		const currentItem = itemRef.current;
		const handler = getContentHandler(currentItem);
		if (r && r.id === currentItem.id && handler.canResize()) {
			setView((v) => ({ ...v, left: r.x, top: r.y }));
			if (isShape(currentItem)) {
				const size = r.size;
				setContentProps({ sizeOverride: size });
				intrinsic.current = { w: size, h: size };
				layout.set(currentItem.id, { left: r.x, top: r.y, right: r.x + size, bottom: r.y + size });
				scheduleLayoutInvalidation();
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
	}

	const DRAG_THRESHOLD_PX = 6;

	// Shared logic for both mouse and touch
	const handleItemInteraction = (
		e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
		isTouch: boolean
	) => {
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
			// Respect Ctrl/Meta for multi-select
			if (e.ctrlKey || e.metaKey) {
				presence.itemSelection.toggleSelection({ id: item.id });
			} else {
				presence.itemSelection.setSelection({ id: item.id });
			}
		}

		return { targetEl, interactive, isAnyHandle };
	};

	const focusEditableElement = (
		preferred: HTMLTextAreaElement | null,
		container: HTMLElement
	) => {
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

		// Cancel any active drag from another item
		if (activeMouseDragCleanup) {
			activeMouseDragCleanup();
			activeMouseDragCleanup = null;
		}

		// Clear any existing drag state from presence
		presence.drag.clearDragging();

		const { interactive, targetEl } = handleItemInteraction(e, false);
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

		// For drag, use absolute display coordinates
		dragRef.current = {
			pointerId: -1, // Use -1 for mouse to distinguish from touch
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
		};

		const docMove = (ev: MouseEvent) => {
			const st = dragRef.current;
			if (!st) return;
			if (ev.buttons !== undefined && (ev.buttons & 1) === 0) {
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
				presence.drag.setDragging({
					id: currentItem.id,
					x: nextX,
					y: nextY,
					rotation: currentItem.rotation,
					branch: presence.branch,
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

				// Commit the final position to the tree
				const finalX = st.latestItemX - groupOffsetX;
				const finalY = st.latestItemY - groupOffsetY;
				const transactionTarget = Tree.parent(currentItem) ?? currentItem;
				Tree.runTransaction(transactionTarget, () => {
					currentItem.x = finalX;
					currentItem.y = finalY;
				});
				
				// Clear presence state
				presence.drag.clearDragging();
				delete document.documentElement.dataset.manipulating;
			} else {
				// Handle focus for text elements when clicking (not dragging)
				const { focusTarget } = st;
				if (focusTarget && focusTarget.isConnected) {
					focusEditableElement(focusTarget, e.currentTarget as HTMLElement);
				} else if (!st.interactiveStart) {
					focusEditableElement(null, e.currentTarget as HTMLElement);
				}
			}
			
			dragRef.current = null;
			document.removeEventListener("mousemove", docMove);
			document.removeEventListener("mouseup", finish);
			
			// Clear the global cleanup reference
			if (activeMouseDragCleanup === cleanup) {
				activeMouseDragCleanup = null;
			}
		};

		const cleanup = () => {
			document.removeEventListener("mousemove", docMove);
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

		document.addEventListener("mousemove", docMove);
		document.addEventListener("mouseup", finish);
	};

	const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		// Only handle single touch for now
		if (e.touches.length !== 1) return;

		// Cancel any active touch drag from another item
		if (activeTouchDragCleanup) {
			activeTouchDragCleanup();
			activeTouchDragCleanup = null;
		}

		// Clear any existing drag state from presence
		presence.drag.clearDragging();

		const touch = e.touches[0];
		const { interactive, targetEl } = handleItemInteraction(e, true);
		const textAreaTarget = targetEl.closest(
			"[data-item-editable]"
		) as HTMLTextAreaElement | null;
		const textAreaFocused = !!(textAreaTarget && document.activeElement === textAreaTarget);
		const needsFocusAfterTap = !!(textAreaTarget && !textAreaFocused);
		if (needsFocusAfterTap) {
			e.preventDefault();
		}
		const start = coordsCanvas(touch);

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
				presence.drag.setDragging({
					id: currentItem.id,
					x: nextX,
					y: nextY,
					rotation: currentItem.rotation,
					branch: presence.branch,
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

				// Commit the final position to the tree
				const finalX = st.latestItemX - groupOffsetX;
				const finalY = st.latestItemY - groupOffsetY;
				const transactionTarget = Tree.parent(currentItem) ?? currentItem;
				Tree.runTransaction(transactionTarget, () => {
					currentItem.x = finalX;
					currentItem.y = finalY;
				});
				
				// Clear presence state
				presence.drag.clearDragging();
				delete document.documentElement.dataset.manipulating;
			} else {
				const { focusTarget } = st;
				if (focusTarget && focusTarget.isConnected) {
					focusEditableElement(focusTarget, e.currentTarget as HTMLElement);
				} else if (!st.interactiveStart) {
					focusEditableElement(null, e.currentTarget as HTMLElement);
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
			if (handler.type === "shape") {
				const size = handler.getSize();
				w = size;
				h = size;
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
// Selection visuals
// ============================================================================
export function SelectionBox({
	selected,
	item,
	onResizeEnd,
	visualHidden,
	zoom,
	absoluteX,
	absoluteY,
	groupOffsetX = 0,
	groupOffsetY = 0,
	parentGroup,
}: {
	selected: boolean;
	item: Item;
	onResizeEnd?: () => void;
	visualHidden?: boolean;
	zoom?: number;
	absoluteX?: number;
	absoluteY?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
	parentGroup?: Group;
}) {
	useTree(item);
	const pad = 8;
	return (
		<>
			<div style={{ display: selected ? (visualHidden ? "none" : "block") : "none" }}>
				<SelectionControls
					item={item}
					padding={pad}
					onResizeEnd={onResizeEnd}
					zoom={zoom}
					absoluteX={absoluteX}
					absoluteY={absoluteY}
					groupOffsetX={groupOffsetX}
					groupOffsetY={groupOffsetY}
					parentGroup={parentGroup}
				/>
			</div>
			<div
				className={`absolute border-3 border-dashed border-black bg-transparent ${selected && !visualHidden ? "" : " hidden"}`}
				style={{
					left: -pad,
					top: -pad,
					width: `calc(100% + ${pad * 2}px)`,
					height: `calc(100% + ${pad * 2}px)`,
					zIndex: 1000,
					pointerEvents: "none",
				}}
			/>
		</>
	);
}

export function SelectionControls({
	item,
	padding,
	onResizeEnd,
	zoom,
	absoluteX,
	absoluteY,
	groupOffsetX = 0,
	groupOffsetY = 0,
	parentGroup,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
	zoom?: number;
	absoluteX?: number;
	absoluteY?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
	parentGroup?: Group;
}) {
	useTree(item);
	const handler = getContentHandler(item);
	const allowRotate = handler.canRotate();
	const isInGridView = isGroupGridEnabled(parentGroup);

	if (isInGridView) {
		return null;
	}

	return (
		<>
			{allowRotate && (
				<RotateHandle item={item} zoom={zoom} absoluteX={absoluteX} absoluteY={absoluteY} />
			)}
			{handler.type === "shape" && (
				<CornerResizeHandles
					item={item}
					padding={padding}
					onResizeEnd={onResizeEnd}
					zoom={zoom}
					groupOffsetX={groupOffsetX}
					groupOffsetY={groupOffsetY}
				/>
			)}
			{handler.type === "text" && (
				<TextResizeHandles
					item={item}
					padding={padding}
					onResizeEnd={onResizeEnd}
					zoom={zoom}
					groupOffsetX={groupOffsetX}
					groupOffsetY={groupOffsetY}
				/>
			)}
		</>
	);
}

// ============================================================================
// Rotate
// ============================================================================
export function RotateHandle({
	item,
	zoom,
	absoluteX,
	absoluteY,
}: {
	item: Item;
	zoom?: number;
	absoluteX?: number;
	absoluteY?: number;
}) {
	const presence = useContext(PresenceContext);
	useTree(item);
	const [active, setActive] = useState(false);
	const itemRef = useRef(item);
	useEffect(() => {
		itemRef.current = item;
	}, [item]);
	const scale = zoom ?? 1;
	// Use absolute position for rotation
	const displayX = absoluteX ?? item.x;
	const displayY = absoluteY ?? item.y;
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setActive(true);
		// Improve touch reliability
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* unsupported */
		}
		// Set initial drag presence with absolute coordinates
		const currentItem = itemRef.current;
		presence.drag.setDragging({
			id: currentItem.id,
			x: displayX,
			y: displayY,
			rotation: currentItem.rotation,
			branch: presence.branch,
		});
		// Global manipulating flag as additional safeguard against background pan
		document.documentElement.dataset.manipulating = "1";
		const el = document.querySelector(`[data-item-id="${currentItem.id}"]`) as HTMLElement | null;
		if (!el) return;
		const move = (ev: PointerEvent) => {
			// Rotation math:
			//   * r = element bounds in screen space.
			//   * c = canvas bounds (origin for local normalization).
			//   * (cx, cy) = center of the element in canvas-local coordinates.
			//   * (mx, my) = current pointer in canvas-local coordinates.
			//   * Angle computed via atan2(dy, dx) returns radians from +X axis.
			//   * Convert to degrees, then +90 so 0deg visually corresponds to "up".
			//   * Normalize to [0, 360) for consistency & easier modulo reasoning.
			const r = el.getBoundingClientRect();
			const c =
				document.getElementById("canvas")?.getBoundingClientRect() ||
				({ left: 0, top: 0 } as DOMRect);
			const cx = (r.left + r.right) / 2 - c.left;
			const cy = (r.top + r.bottom) / 2 - c.top;
			const mx = ev.clientX - c.left;
			const my = ev.clientY - c.top;
			let deg = (Math.atan2(my - cy, mx - cx) * 180) / Math.PI + 90;
			deg %= 360;
			if (deg < 0) deg += 360;
			presence.drag.setDragging({
				id: currentItem.id,
				x: displayX,
				y: displayY,
				rotation: deg,
				branch: presence.branch,
			});
		};
		const up = () => {
			setActive(false);
			document.removeEventListener("pointermove", move);
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			delete document.documentElement.dataset.manipulating;
			const st = presence.drag.state.local;
			if (st) {
				Tree.runTransaction(currentItem, () => {
					currentItem.rotation = st.rotation;
				});
				presence.drag.clearDragging();
				const canvasEl = document.getElementById("canvas") as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
			}
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up, { once: true });
	};
	const baseSize = active ? 22 : 18;
	const baseTouchSize = 44; // Apple's recommended minimum touch target
	const size = baseSize * scale;
	const touchSize = baseTouchSize * scale;
	const handleOffset = 80 * scale;
	const handleHeight = 160 * scale;
	return (
		<div
			className="absolute flex flex-row w-full justify-center items-center"
			style={{ top: -handleOffset, height: handleHeight, pointerEvents: "auto" }}
			onPointerDown={onPointerDown}
			data-rotate-handle
		>
			{/* Larger invisible touch area */}
			<div
				style={{
					width: touchSize,
					height: touchSize,
					position: "absolute",
					top: handleOffset - touchSize / 2,
					left: "50%",
					transform: "translateX(-50%)",
					backgroundColor: "transparent",
				}}
			/>
			{/* Visible knob */}
			<div
				className="bg-black shadow-lg z-[9998] cursor-grab"
				style={{
					width: size,
					height: size,
					borderRadius: "50%",
					position: "absolute",
					top: handleOffset - size / 2,
					left: "50%",
					transform: "translateX(-50%)",
					pointerEvents: "none", // Let the larger touch area handle events
				}}
			/>
		</div>
	);
}

// ============================================================================
// Resize (shapes only)
// ============================================================================
export function CornerResizeHandles({
	item,
	padding,
	onResizeEnd,
	zoom,
	groupOffsetX = 0,
	groupOffsetY = 0,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
	zoom?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
}) {
	const handler = getContentHandler(item);
	if (!handler.canResize() || !isShape(item)) return <></>;
	const shape = item.content;
	useTree(shape);
	const presence = useContext(PresenceContext);
	const [resizing, setResizing] = useState(false);
	const scale = zoom ?? 1;
	const initSize = useRef(shape.size);
	const centerModel = useRef({ x: 0, y: 0 });
	const centerScreen = useRef({ x: 0, y: 0 });
	const initDist = useRef(0);
	const initVec = useRef({ dx: 0, dy: 0 });

	// Calculate absolute position (accounting for groups)
	const getAbsolutePosition = () => {
		const absX = item.x + groupOffsetX;
		const absY = item.y + groupOffsetY;
		return { absX, absY };
	};
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setResizing(true);
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* unsupported */
		}
		// Get absolute position for resize
		const { absX, absY } = getAbsolutePosition();
		// Seed resize presence so pan guard sees active manipulation instantly
		presence.resize.setResizing({ id: item.id, x: absX, y: absY, size: shape.size });
		document.documentElement.dataset.manipulating = "1";
		initSize.current = shape.size;
		// Calculate center in absolute canvas space
		centerModel.current = { x: absX + shape.size / 2, y: absY + shape.size / 2 };
		let el: HTMLElement | null = e.currentTarget.parentElement;
		while (el && !el.getAttribute("data-item-id")) el = el.parentElement;
		if (el) {
			const r = el.getBoundingClientRect();
			centerScreen.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}
		initVec.current = {
			dx: e.clientX - centerScreen.current.x,
			dy: e.clientY - centerScreen.current.y,
		};
		initDist.current = Math.sqrt(initVec.current.dx ** 2 + initVec.current.dy ** 2);
		const move = (ev: PointerEvent) => {
			const dx = ev.clientX - centerScreen.current.x;
			const dy = ev.clientY - centerScreen.current.y;
			const dot = dx * initVec.current.dx + dy * initVec.current.dy;
			const initMagSq = initVec.current.dx ** 2 + initVec.current.dy ** 2;
			const proj = dot / Math.sqrt(initMagSq || 1);
			const ratio = Math.max(0.1, proj / initDist.current);
			// Increased max size from 300 to 1200 (4x) to match expanded shape size limits
			const desired = initSize.current * ratio;
			const newSize = clampShapeSize(desired);
			const newX = centerModel.current.x - newSize / 2;
			const newY = centerModel.current.y - newSize / 2;
			presence.resize.setResizing({ id: item.id, x: newX, y: newY, size: newSize });
		};
		const up = () => {
			setResizing(false);
			document.removeEventListener("pointermove", move);
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			delete document.documentElement.dataset.manipulating;
			const r = presence.resize.state.local;
			if (r && r.id === item.id) {
				// Use the passed group offsets to convert absolute coordinates back to relative
				Tree.runTransaction(item, () => {
					shape.size = r.size;
					item.x = r.x - groupOffsetX;
					item.y = r.y - groupOffsetY;
				});
			}
			presence.resize.clearResizing();
			onResizeEnd?.();
			const canvasEl = document.getElementById("canvas") as
				| (SVGSVGElement & { dataset: DOMStringMap })
				| null;
			if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up, { once: true });
	};
	const pos = (p: string) => {
		const baseOffset = resizing ? 10 : 8; // enlarged for touch
		const o = baseOffset * scale;
		switch (p) {
			case "top-left":
				return { left: -padding - o, top: -padding - o };
			case "top-right":
				return { right: -padding - o, top: -padding - o };
			case "bottom-left":
				return { left: -padding - o, bottom: -padding - o };
			case "bottom-right":
				return { right: -padding - o, bottom: -padding - o };
			default:
				return {};
		}
	};
	const Handle = ({ position }: { position: string }) => {
		// Wrapper large zone
		const zone = pos(position);
		const baseWrap = 120; // large square zone for touch
		const WRAP = baseWrap * scale;
		const wrapStyle: React.CSSProperties = {
			position: "absolute",
			width: WRAP,
			height: WRAP,
			pointerEvents: "auto",
			touchAction: "none",
			...zone,
			// shift so small handle remains at corner while wrapper extends inward
		};
		const baseHandleSize = resizing ? 30 : 26;
		const handleSize = baseHandleSize * scale;
		const adjust = (v: number) => v - (WRAP - handleSize) / 2;
		if (Object.prototype.hasOwnProperty.call(zone, "left"))
			wrapStyle.left = adjust((zone as Record<string, number>).left);
		if (Object.prototype.hasOwnProperty.call(zone, "right"))
			wrapStyle.right = adjust((zone as Record<string, number>).right);
		if (Object.prototype.hasOwnProperty.call(zone, "top"))
			wrapStyle.top = adjust((zone as Record<string, number>).top);
		if (Object.prototype.hasOwnProperty.call(zone, "bottom"))
			wrapStyle.bottom = adjust((zone as Record<string, number>).bottom);
		return (
			<div data-resize-handle style={wrapStyle} onPointerDown={onPointerDown}>
				<div
					className="absolute bg-black cursor-nw-resize hover:bg-black shadow-lg z-[9998]"
					style={{
						width: handleSize,
						height: handleSize,
						borderRadius: 6,
						pointerEvents: "none",
						// Place at corner inside wrapper
						[position.includes("right") ? "right" : "left"]: 0,
						[position.includes("bottom") ? "bottom" : "top"]: 0,
					}}
				/>
			</div>
		);
	};
	return (
		<>
			<Handle position="top-left" />
			<Handle position="top-right" />
			<Handle position="bottom-left" />
			<Handle position="bottom-right" />
		</>
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
