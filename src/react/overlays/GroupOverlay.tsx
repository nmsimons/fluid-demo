import React, { useContext, useState, useRef, useEffect } from "react";
import { Tree } from "@fluidframework/tree";
import { Item, Group } from "../../schema/appSchema.js";
import { PresenceContext } from "../contexts/PresenceContext.js";
import { usePresenceManager } from "../hooks/usePresenceManger.js";
import { getGroupChildOffset } from "../utils/presenceGeometry.js";
import { useTree } from "../hooks/useTree.js";
import { updateCursorFromEvent } from "../../utils/cursorUtils.js";

interface LayoutBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

type LayoutMap = Map<string, LayoutBounds>;

type PresenceContextType = React.ContextType<typeof PresenceContext>;

/**
 * GroupOverlay - Renders visual bounds for group containers on the SVG overlay layer
 *
 * Groups don't render as HTML items - they're metadata. This overlay shows the
 * visual boundary of the group on the main canvas with a drag handle.
 */
export function GroupOverlay(props: {
	items: Item[];
	layout: LayoutMap;
	zoom: number;
	pan: { x: number; y: number };
	showOnlyWhenChildSelected?: boolean;
}): JSX.Element {
	const { items, layout, zoom, pan, showOnlyWhenChildSelected = false } = props;
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
			const groupItem = items.find((item) => item.id === groupId);
			if (groupItem && Tree.is(groupItem.content, Group)) {
				setEditingGroupId(groupId);
				setEditingValue((groupItem.content as Group).name || "Group");
			}
		};
		window.addEventListener("editGroup", handleEditGroup);
		return () => window.removeEventListener("editGroup", handleEditGroup);
	}, [items]);

	// Track all group drag states (local + remote) for smooth overlay updates
	const [allDragStates, setAllDragStates] = useState<Map<string, { x: number; y: number }>>(
		new Map()
	);

	// Track child item drags/resizes to update group bounds dynamically
	const [childUpdateTrigger, setChildUpdateTrigger] = useState(0);

	// Subscribe to group drag updates from all users
	usePresenceManager(
		presence.drag,
		(dragState) => {
			// Remote drag update
			if (dragState) {
				setAllDragStates((prev) => {
					const next = new Map(prev);
					next.set(dragState.id, { x: dragState.x, y: dragState.y });
					return next;
				});
			}
			// Also trigger re-render for child item drags
			setChildUpdateTrigger((n) => n + 1);
		},
		(dragState) => {
			// Local drag update
			if (dragState) {
				setAllDragStates((prev) => {
					const next = new Map(prev);
					next.set(dragState.id, { x: dragState.x, y: dragState.y });
					return next;
				});
			} else {
				// Local drag cleared
				setAllDragStates((prev) => {
					const next = new Map(prev);
					// Clear all drag states when local drag ends
					next.clear();
					return next;
				});
			}
			// Also trigger re-render for child item drags
			setChildUpdateTrigger((n) => n + 1);
		}
	);

	// Also subscribe to resize updates to recalculate group bounds
	usePresenceManager(
		presence.resize,
		() => setChildUpdateTrigger((n) => n + 1),
		() => setChildUpdateTrigger((n) => n + 1)
	);

	// Handle group drag start
	const handleGroupDragStart = (e: React.PointerEvent<Element>, groupItem: Item) => {
		e.stopPropagation();
		e.preventDefault();

		const startX = e.clientX;
		const startY = e.clientY;
		const initialGroupX = groupItem.x;
		const initialGroupY = groupItem.y;
		let hasMoved = false;

		const DRAG_THRESHOLD = 4;

		document.documentElement.dataset.manipulating = "1";

		const handleMove = (ev: PointerEvent) => {
			const dx = (ev.clientX - startX) / zoom;
			const dy = (ev.clientY - startY) / zoom;

			// Check if we've moved enough to start dragging
			if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
				return;
			}

			if (!hasMoved) {
				hasMoved = true;
				ev.preventDefault();
			}

			// Update collaborative cursor position using DRY utility
			updateCursorFromEvent(ev, presence.cursor, pan, zoom);

			// Use presence API for smooth ephemeral updates during drag
			presence.drag.setDragging({
				id: groupItem.id,
				x: initialGroupX + dx,
				y: initialGroupY + dy,
				rotation: 0, // Groups don't rotate
				branch: presence.branch,
			});
		};

		const handleUp = () => {
			delete document.documentElement.dataset.manipulating;
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);

			if (hasMoved) {
				// Mark this group as recently dragged to prevent click handler
				draggedGroupsRef.current.add(groupItem.id);
				// Clear the flag after a short delay
				setTimeout(() => {
					draggedGroupsRef.current.delete(groupItem.id);
				}, 100);

				// Commit the final position from presence to the tree
				const dragState = presence.drag.state.local;
				if (dragState && dragState.id === groupItem.id) {
					Tree.runTransaction(groupItem, () => {
						groupItem.x = dragState.x;
						groupItem.y = dragState.y;
					});
				}
				presence.drag.clearDragging(); // Prevent canvas from clearing selection after drag
				const canvasEl = document.getElementById("canvas") as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
			}
		};

		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp);
	};

	// Filter to only group items
	const groupItems = items.filter((item) => Tree.is(item.content, Group));

	// Get selected items from presence
	const selectedItems = presence.itemSelection.state.local || [];
	const selectedIds = new Set(selectedItems.map((s) => s.id));

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
					allDragStates={allDragStates}
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
	allDragStates: Map<string, { x: number; y: number }>;
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
		allDragStates,
		editingGroupId,
		setEditingGroupId,
		editingValue,
		setEditingValue,
		editInputRef,
	} = props;

	useTree(groupItem);
	useTree(groupItem.content);

	const group = groupItem.content as Group;

	if (showOnlyWhenChildSelected) {
		const hasSelectedChild = group.items.some((childItem) => selectedIds.has(childItem.id));
		if (!hasSelectedChild) {
			return null;
		}
	}

	const isGroupSelected = selectedIds.has(groupItem.id);

	const dragState = allDragStates.get(groupItem.id);
	const groupX = dragState ? dragState.x : groupItem.x;
	const groupY = dragState ? dragState.y : groupItem.y;
	const isGroupBeingDragged = !!dragState;

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

	if (group.items.length === 0) {
		const padding = 12;
		const minSize = 100;
		const titleBarHeight = 32;
		const borderStrokeWidth = isGroupSelected ? 6 : 5;
		const titleBarGap = borderStrokeWidth * 0.75;
		const titleBarWidth = minSize + borderStrokeWidth;
		const titleBarX = groupX - padding - borderStrokeWidth / 2;
		const titleBarY = groupY - padding - titleBarHeight - titleBarGap;

		return (
			<g>
				<rect
					x={groupX - padding}
					y={groupY - padding}
					width={minSize}
					height={minSize}
					fill="none"
					stroke={isGroupSelected ? "#3b82f6" : "#94a3b8"}
					strokeWidth={isGroupSelected ? 6 : 5}
					strokeDasharray="24 12"
					rx={8}
					opacity={isGroupSelected ? 0.8 : 0.5}
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
						opacity={0.9}
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
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const childItem of group.items) {
		// Check if this child item is being dragged individually
		const childDragState = allDragStates.get(childItem.id);

		if (isGroupBeingDragged) {
			const offset = getGroupChildOffset(group, childItem);
			const childAbsX = groupX + offset.x;
			const childAbsY = groupY + offset.y;
			const childBounds = layout.get(childItem.id);
			if (childBounds) {
				const width = childBounds.right - childBounds.left;
				const height = childBounds.bottom - childBounds.top;
				minX = Math.min(minX, childAbsX);
				minY = Math.min(minY, childAbsY);
				maxX = Math.max(maxX, childAbsX + width);
				maxY = Math.max(maxY, childAbsY + height);
			} else {
				minX = Math.min(minX, childAbsX);
				minY = Math.min(minY, childAbsY);
				maxX = Math.max(maxX, childAbsX + 100);
				maxY = Math.max(maxY, childAbsY + 100);
			}
		} else if (childDragState) {
			// Child item is being dragged - use drag position instead of layout
			const childBounds = layout.get(childItem.id);
			if (childBounds) {
				const width = childBounds.right - childBounds.left;
				const height = childBounds.bottom - childBounds.top;
				minX = Math.min(minX, childDragState.x);
				minY = Math.min(minY, childDragState.y);
				maxX = Math.max(maxX, childDragState.x + width);
				maxY = Math.max(maxY, childDragState.y + height);
			} else {
				// No layout bounds, use default size
				minX = Math.min(minX, childDragState.x);
				minY = Math.min(minY, childDragState.y);
				maxX = Math.max(maxX, childDragState.x + 100);
				maxY = Math.max(maxY, childDragState.y + 100);
			}
		} else {
			const childBounds = layout.get(childItem.id);
			if (childBounds) {
				minX = Math.min(minX, childBounds.left);
				minY = Math.min(minY, childBounds.top);
				maxX = Math.max(maxX, childBounds.right);
				maxY = Math.max(maxY, childBounds.bottom);
			} else {
				const offset = getGroupChildOffset(group, childItem);
				const childAbsX = groupX + offset.x;
				const childAbsY = groupY + offset.y;
				minX = Math.min(minX, childAbsX);
				minY = Math.min(minY, childAbsY);
				maxX = Math.max(maxX, childAbsX + 100);
				maxY = Math.max(maxY, childAbsY + 100);
			}
		}
	}

	if (!isFinite(minX) || !isFinite(minY)) {
		return null;
	}

	const padding = 32;
	const x = minX - padding;
	const y = minY - padding;
	const width = maxX - minX + padding * 2;
	const height = maxY - minY + padding * 2;

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
				opacity={isGroupSelected ? 0.8 : 0.6}
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
					opacity={0.9}
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
