import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { Tree } from "@fluidframework/tree";
import { Item, Group, Items } from "../../schema/appSchema.js";
import { PresenceContext } from "../contexts/PresenceContext.js";
import { usePresenceManager } from "../hooks/usePresenceManger.js";
import {
	getGroupContentBounds,
	getItemAbsolutePosition,
	getParentGroupInfo,
} from "../utils/presenceGeometry.js";
import { useTree } from "../hooks/useTree.js";
import { updateCursorFromEvent } from "../../utils/cursorUtils.js";
import { FlattenedItem } from "../../utils/flattenItems.js";
import { findItemById } from "../../utils/itemsHelpers.js";

interface LayoutBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

type LayoutMap = Map<string, LayoutBounds>;

type PresenceContextType = React.ContextType<typeof PresenceContext>;

// Group overlay opacity constants - adjust these to change transparency globally
const GROUP_BORDER_OPACITY_SELECTED = 0.5;
const GROUP_BORDER_OPACITY_UNSELECTED = 0.3;
const GROUP_BORDER_OPACITY_UNSELECTED_WITH_ITEMS = 0.4;
const GROUP_TITLE_BAR_OPACITY = 0.7;

function groupHasSelectedDescendant(group: Group, selectedIds: Set<string>): boolean {
	for (const child of group.items) {
		if (selectedIds.has(child.id)) {
			return true;
		}
		if (
			Tree.is(child.content, Group) &&
			groupHasSelectedDescendant(child.content, selectedIds)
		) {
			return true;
		}
	}
	return false;
}

/**
 * GroupOverlay - Renders visual bounds for group containers on the SVG overlay layer
 *
 * Groups don't render as HTML items - they're metadata. This overlay shows the
 * visual boundary of the group on the main canvas with a drag handle.
 */
export function GroupOverlay(props: {
	rootItems: Items;
	flattenedItems: FlattenedItem[];
	layout: LayoutMap;
	zoom: number;
	pan: { x: number; y: number };
	showOnlyWhenChildSelected?: boolean;
}): JSX.Element {
	const {
		rootItems,
		flattenedItems,
		layout,
		zoom,
		pan,
		showOnlyWhenChildSelected = false,
	} = props;
	const presence = useContext(PresenceContext);

	// Track which groups have just been dragged to prevent click-on-release
	const draggedGroupsRef = useRef<Set<string>>(new Set());

	// Track which group is being edited
	const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState("");
	const editInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editingGroupId && editInputRef.current) {
			editInputRef.current.select();
		}
	}, [editingGroupId]);

	// Listen for edit group events from the toolbar
	useEffect(() => {
		const handleEditGroup = (event: Event) => {
			const customEvent = event as CustomEvent<{ groupId: string }>;
			const { groupId } = customEvent.detail;
			const groupItem = findItemById(rootItems, groupId);
			if (groupItem && Tree.is(groupItem.content, Group)) {
				setEditingGroupId(groupId);
				setEditingValue(groupItem.content.name || "Group");
			}
		};
		window.addEventListener("editGroup", handleEditGroup);
		return () => window.removeEventListener("editGroup", handleEditGroup);
	}, [rootItems]);

	// Track child item drags/resizes to update group bounds dynamically
	const [childUpdateTrigger, setChildUpdateTrigger] = useState(0);

	// Subscribe to drag presence updates to trigger group bound recalculation
	usePresenceManager(
		presence.drag,
		() => setChildUpdateTrigger((n) => n + 1),
		() => setChildUpdateTrigger((n) => n + 1)
	);

	// Also subscribe to resize updates to recalculate group bounds
	usePresenceManager(
		presence.resize,
		() => setChildUpdateTrigger((n) => n + 1),
		() => setChildUpdateTrigger((n) => n + 1)
	);

	const handleGroupDragStart = (e: React.PointerEvent<Element>, groupItem: Item) => {
		e.stopPropagation();
		e.preventDefault();

		const startX = e.clientX;
		const startY = e.clientY;
		const startPosition = getItemAbsolutePosition(groupItem, presence);
		let hasMoved = false;

		const DRAG_THRESHOLD = 4;

		document.documentElement.dataset.manipulating = "1";

		const handleMove = (ev: PointerEvent) => {
			const dx = (ev.clientX - startX) / zoom;
			const dy = (ev.clientY - startY) / zoom;

			if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
				return;
			}

			if (!hasMoved) {
				hasMoved = true;
				ev.preventDefault();
			}

			updateCursorFromEvent(ev, presence.cursor, pan, zoom);

			presence.drag.setDragging({
				id: groupItem.id,
				x: startPosition.x + dx,
				y: startPosition.y + dy,
				rotation: 0,
				branch: presence.branch,
			});
		};

		const handleUp = () => {
			delete document.documentElement.dataset.manipulating;
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);

			if (hasMoved) {
				draggedGroupsRef.current.add(groupItem.id);
				setTimeout(() => {
					draggedGroupsRef.current.delete(groupItem.id);
				}, 100);

				const dragState = presence.drag.state.local;
				if (dragState && dragState.id === groupItem.id) {
					Tree.runTransaction(groupItem, () => {
						const parentInfo = getParentGroupInfo(groupItem);
						if (!parentInfo) {
							groupItem.x = dragState.x;
							groupItem.y = dragState.y;
						} else {
							const parentAbsolute = getItemAbsolutePosition(
								parentInfo.groupItem,
								presence
							);
							groupItem.x = dragState.x - parentAbsolute.x;
							groupItem.y = dragState.y - parentAbsolute.y;
						}
					});
				}
				presence.drag.clearDragging();
				const canvasEl = document.getElementById("canvas") as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (canvasEl) {
					canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
				}
			}
		};

		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp);
	};

	const groupItems = useMemo(() => {
		const seen = new Set<Item>();
		const groups: Item[] = [];
		for (const flat of flattenedItems) {
			if (!flat.isGroupContainer) {
				continue;
			}
			if (!Tree.is(flat.item.content, Group)) {
				continue;
			}
			if (seen.has(flat.item)) {
				continue;
			}
			seen.add(flat.item);
			groups.push(flat.item);
		}
		return groups;
	}, [flattenedItems]);

	// Get selected items from presence
	const selectedItems = presence.itemSelection.state.local || [];
	const selectedIds = useMemo(() => new Set(selectedItems.map((s) => s.id)), [selectedItems]);

	// Note: childUpdateTrigger state changes force re-renders when any item drag/resize happens
	// This ensures we read fresh layout bounds even though the Map reference doesn't change
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _ = childUpdateTrigger;

	return (
		<>
			{groupItems.map((groupItem) => (
				<GroupOverlayItem
					key={groupItem.id}
					groupItem={groupItem}
					layout={layout}
					zoom={zoom}
					presence={presence}
					showOnlyWhenChildSelected={showOnlyWhenChildSelected}
					selectedIds={selectedIds}
					draggedGroupsRef={draggedGroupsRef}
					handleGroupDragStart={handleGroupDragStart}
					editingGroupId={editingGroupId}
					setEditingGroupId={setEditingGroupId}
					editingValue={editingValue}
					setEditingValue={setEditingValue}
					editInputRef={editInputRef}
				/>
			))}
		</>
	);
}

interface GroupOverlayItemProps {
	groupItem: Item;
	layout: LayoutMap;
	zoom: number;
	presence: PresenceContextType;
	showOnlyWhenChildSelected: boolean;
	selectedIds: Set<string>;
	draggedGroupsRef: React.MutableRefObject<Set<string>>;
	handleGroupDragStart: (e: React.PointerEvent<Element>, groupItem: Item) => void;
	editingGroupId: string | null;
	setEditingGroupId: React.Dispatch<React.SetStateAction<string | null>>;
	editingValue: string;
	setEditingValue: React.Dispatch<React.SetStateAction<string>>;
	editInputRef: React.RefObject<HTMLInputElement>;
}

function GroupOverlayItem(props: GroupOverlayItemProps): JSX.Element | null {
	const {
		groupItem,
		layout,
		zoom,
		presence,
		showOnlyWhenChildSelected,
		selectedIds,
		draggedGroupsRef,
		handleGroupDragStart,
		editingGroupId,
		setEditingGroupId,
		editingValue,
		setEditingValue,
		editInputRef,
	} = props;

	useTree(groupItem);
	useTree(groupItem.content);

	const group = groupItem.content as Group;

	if (
		showOnlyWhenChildSelected &&
		!groupHasSelectedDescendant(group, selectedIds) &&
		!selectedIds.has(groupItem.id)
	) {
		return null;
	}

	const isGroupSelected = selectedIds.has(groupItem.id);
	const groupPosition = getItemAbsolutePosition(groupItem, presence);
	const contentBounds = getGroupContentBounds(groupItem, layout, presence);

	const handleGroupClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		if (draggedGroupsRef.current.has(groupItem.id)) {
			return;
		}

		if (e.ctrlKey || e.metaKey) {
			presence.itemSelection.toggleSelection({ id: groupItem.id });
		} else {
			presence.itemSelection.setSelection({ id: groupItem.id });
		}
	};

	if (!contentBounds) {
		const padding = 12;
		const minSize = 100;
		const borderStrokeWidth = isGroupSelected ? 6 : 5;
		const titleBarHeight = 32;
		const titleBarGap = borderStrokeWidth * 0.75;
		const titleBarWidth = minSize + borderStrokeWidth;
		const rectX = groupPosition.x - padding;
		const rectY = groupPosition.y - padding;
		const titleBarX = rectX - borderStrokeWidth / 2;
		const titleBarY = rectY - titleBarHeight - titleBarGap;

		return (
			<g>
				<rect
					x={rectX}
					y={rectY}
					width={minSize}
					height={minSize}
					fill="none"
					stroke={isGroupSelected ? "#3b82f6" : "#94a3b8"}
					strokeWidth={isGroupSelected ? 6 : 5}
					strokeDasharray="24 12"
					rx={8}
					opacity={
						isGroupSelected
							? GROUP_BORDER_OPACITY_SELECTED
							: GROUP_BORDER_OPACITY_UNSELECTED
					}
					style={{ cursor: "pointer" }}
					onClick={handleGroupClick}
					onPointerDown={(e) => handleGroupDragStart(e, groupItem)}
				/>

				<g className="group-title-bar">
					<rect
						x={titleBarX}
						y={titleBarY}
						width={titleBarWidth}
						height={titleBarHeight}
						fill={isGroupSelected ? "#3b82f6" : "#94a3b8"}
						opacity={GROUP_TITLE_BAR_OPACITY}
						rx={6}
						style={{ cursor: "pointer", pointerEvents: "all" }}
						onClick={handleGroupClick}
						onPointerDown={(e) => handleGroupDragStart(e, groupItem)}
					/>

					{editingGroupId === groupItem.id ? (
						<foreignObject
							x={titleBarX}
							y={titleBarY}
							width={titleBarWidth}
							height={titleBarHeight}
							style={{ overflow: "visible", pointerEvents: "none" }}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									height: "100%",
									padding: "0 8px",
									pointerEvents: "none",
								}}
							>
								<input
									ref={editInputRef}
									type="text"
									value={editingValue}
									onChange={(e) => setEditingValue(e.target.value)}
									onBlur={() => {
										if (editingValue.trim()) {
											group.name = editingValue;
										}
										setEditingGroupId(null);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											if (editingValue.trim()) {
												group.name = editingValue;
											}
											setEditingGroupId(null);
										} else if (e.key === "Escape") {
											setEditingGroupId(null);
										}
									}}
									onClick={(e) => e.stopPropagation()}
									onPointerDown={(e) => e.stopPropagation()}
									style={{
										width: "100%",
										background: "rgba(255, 255, 255, 0.9)",
										border: "none",
										padding: "4px 6px",
										fontSize: `${12 / zoom}px`,
										color: "#1e293b",
										outline: "none",
										borderRadius: "4px",
										fontWeight: 500,
										pointerEvents: "all",
									}}
									autoFocus
								/>
							</div>
						</foreignObject>
					) : (
						<text
							x={titleBarX + titleBarWidth / 2}
							y={titleBarY + titleBarHeight / 2}
							fontSize={14}
							fontWeight={600}
							fill="#ffffff"
							textAnchor="middle"
							dominantBaseline="middle"
							style={{
								pointerEvents: "none",
								userSelect: "none",
							}}
						>
							{group.name || "Empty Group"}
						</text>
					)}
				</g>
			</g>
		);
	}

	const padding = 32;
	const width = Math.max(1, contentBounds.right - contentBounds.left + padding * 2);
	const height = Math.max(1, contentBounds.bottom - contentBounds.top + padding * 2);
	const x = contentBounds.left - padding;
	const y = contentBounds.top - padding;

	const borderStrokeWidth = isGroupSelected ? 6 : 5;
	const titleBarHeight = 34;
	const titleBarGap = borderStrokeWidth * 0.85;
	const titleBarWidth = width + borderStrokeWidth;
	const titleBarX = x - borderStrokeWidth / 2;
	const titleBarY = y - titleBarHeight - titleBarGap;

	return (
		<g>
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				fill="none"
				stroke={isGroupSelected ? "#3b82f6" : "#64748b"}
				strokeWidth={isGroupSelected ? 6 : 5}
				strokeDasharray="24 12"
				rx={12}
				opacity={
					isGroupSelected
						? GROUP_BORDER_OPACITY_SELECTED
						: GROUP_BORDER_OPACITY_UNSELECTED_WITH_ITEMS
				}
				style={{ cursor: "pointer" }}
				onClick={handleGroupClick}
				onPointerDown={(e) => handleGroupDragStart(e, groupItem)}
			/>

			<g className="group-title-bar">
				<rect
					x={titleBarX}
					y={titleBarY}
					width={titleBarWidth}
					height={titleBarHeight}
					fill={isGroupSelected ? "#3b82f6" : "#64748b"}
					opacity={GROUP_TITLE_BAR_OPACITY}
					rx={6}
					style={{ cursor: "pointer", pointerEvents: "all" }}
					onClick={handleGroupClick}
					onPointerDown={(e) => handleGroupDragStart(e, groupItem)}
				/>

				{editingGroupId === groupItem.id ? (
					<foreignObject
						x={titleBarX}
						y={titleBarY}
						width={titleBarWidth}
						height={titleBarHeight}
						style={{ overflow: "visible", pointerEvents: "none" }}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								height: "100%",
								padding: "0 8px",
								pointerEvents: "none",
							}}
						>
							<input
								ref={editInputRef}
								type="text"
								value={editingValue}
								onChange={(e) => setEditingValue(e.target.value)}
								onBlur={() => {
									if (editingValue.trim()) {
										group.name = editingValue;
									}
									setEditingGroupId(null);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										if (editingValue.trim()) {
											group.name = editingValue;
										}
										setEditingGroupId(null);
									} else if (e.key === "Escape") {
										setEditingGroupId(null);
									}
								}}
								onClick={(e) => e.stopPropagation()}
								onPointerDown={(e) => e.stopPropagation()}
								style={{
									width: "100%",
									background: "rgba(255, 255, 255, 0.9)",
									border: "none",
									padding: "4px 6px",
									fontSize: `${12 / zoom}px`,
									color: "#1e293b",
									outline: "none",
									borderRadius: "4px",
									fontWeight: 500,
									pointerEvents: "all",
								}}
								autoFocus
							/>
						</div>
					</foreignObject>
				) : (
					<text
						x={titleBarX + titleBarWidth / 2}
						y={titleBarY + titleBarHeight / 2}
						fontSize={14}
						fontWeight={600}
						fill="#ffffff"
						textAnchor="middle"
						dominantBaseline="middle"
						style={{
							pointerEvents: "none",
							userSelect: "none",
						}}
					>
						{group.name || "Group"}
					</text>
				)}
			</g>
		</g>
	);
}
