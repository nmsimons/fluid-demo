import React, { useContext, useState, useRef } from "react";
import { Tree } from "@fluidframework/tree";
import { Item, Group } from "../../schema/appSchema.js";
import { PresenceContext } from "../contexts/PresenceContext.js";
import { usePresenceManager } from "../hooks/usePresenceManger.js";

/**
 * GroupOverlay - Renders visual bounds for group containers on the SVG overlay layer
 *
 * Groups don't render as HTML items - they're metadata. This overlay shows the
 * visual boundary of the group on the main canvas with a drag handle.
 */
export function GroupOverlay(props: {
	items: Item[];
	layout: Map<string, { left: number; top: number; right: number; bottom: number }>;
	zoom: number;
	showOnlyWhenChildSelected?: boolean;
}): JSX.Element {
	const { items, layout, zoom, showOnlyWhenChildSelected = false } = props;
	const presence = useContext(PresenceContext);

	// Track which groups have just been dragged to prevent click-on-release
	const draggedGroupsRef = useRef<Set<string>>(new Set());

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
	const handleGroupDragStart = (e: React.PointerEvent<SVGGElement>, groupItem: Item) => {
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
			{groupItems.map((groupItem) => {
				const group = groupItem.content as Group;

				// Optionally show group overlay only if at least one item in the group is selected
				if (showOnlyWhenChildSelected) {
					const hasSelectedChild = group.items.some((childItem) =>
						selectedIds.has(childItem.id)
					);
					if (!hasSelectedChild) {
						return null;
					}
				}

				// Check if this group itself is selected
				const isGroupSelected = selectedIds.has(groupItem.id);

				// Check if this group is being dragged (from local or remote presence)
				const dragState = allDragStates.get(groupItem.id);
				const groupX = dragState ? dragState.x : groupItem.x;
				const groupY = dragState ? dragState.y : groupItem.y;
				const isGroupBeingDragged = !!dragState; // Handler for selecting the group (shared between empty and non-empty groups)
				const handleGroupClick = (e: React.MouseEvent) => {
					e.stopPropagation();

					// Don't select if this group was just dragged
					if (draggedGroupsRef.current.has(groupItem.id)) {
						return;
					}

					// Respect Ctrl/Meta for multi-select
					if (e.ctrlKey || e.metaKey) {
						presence.itemSelection.toggleSelection({ id: groupItem.id });
					} else {
						presence.itemSelection.setSelection({ id: groupItem.id });
					}
				};

				// Calculate group bounds based on child items
				if (group.items.length === 0) {
					// Empty group - render a minimal placeholder
					const padding = 10 / zoom;
					const minSize = 100 / zoom;
					const titleBarHeight = 28 / zoom;
					const titleBarY = groupY - padding - titleBarHeight - 4 / zoom;

					return (
						<g key={groupItem.id}>
							<rect
								x={groupX - padding}
								y={groupY - padding}
								width={minSize}
								height={minSize}
								fill="none"
								stroke={isGroupSelected ? "#3b82f6" : "#94a3b8"}
								strokeWidth={isGroupSelected ? 3 / zoom : 2 / zoom}
								strokeDasharray={`${8 / zoom} ${4 / zoom}`}
								rx={8 / zoom}
								opacity={isGroupSelected ? 0.8 : 0.5}
								style={{ cursor: "pointer" }}
								onClick={handleGroupClick}
							/>

							{/* Title bar for empty group */}
							<g
								className="group-title-bar"
								style={{ cursor: "move" }}
								onPointerDown={(e) => handleGroupDragStart(e, groupItem)}
								onClick={handleGroupClick}
							>
								<rect
									x={groupX - padding}
									y={titleBarY}
									width={minSize}
									height={titleBarHeight}
									fill={isGroupSelected ? "#3b82f6" : "#94a3b8"}
									opacity={0.9}
									rx={6 / zoom}
									style={{ pointerEvents: "all" }}
								/>
								<text
									x={groupX - padding + 8 / zoom}
									y={titleBarY + titleBarHeight / 2}
									fontSize={12 / zoom}
									fill="#ffffff"
									dominantBaseline="middle"
									style={{
										pointerEvents: "none",
										userSelect: "none",
										fontWeight: 500,
									}}
								>
									Empty Group
								</text>
							</g>
						</g>
					);
				}

				// Calculate bounds from child items
				let minX = Infinity;
				let minY = Infinity;
				let maxX = -Infinity;
				let maxY = -Infinity;

				for (const childItem of group.items) {
					// During GROUP drag: calculate bounds from group position + child relative position
					// During CHILD drag/resize: use layout bounds (updated in real-time by ItemView)
					if (isGroupBeingDragged) {
						// Group is being dragged - calculate child position from group + relative offset
						const childAbsX = groupX + childItem.x;
						const childAbsY = groupY + childItem.y;
						const childBounds = layout.get(childItem.id);
						if (childBounds) {
							const width = childBounds.right - childBounds.left;
							const height = childBounds.bottom - childBounds.top;
							minX = Math.min(minX, childAbsX);
							minY = Math.min(minY, childAbsY);
							maxX = Math.max(maxX, childAbsX + width);
							maxY = Math.max(maxY, childAbsY + height);
						} else {
							// Fallback: use estimated size
							minX = Math.min(minX, childAbsX);
							minY = Math.min(minY, childAbsY);
							maxX = Math.max(maxX, childAbsX + 100);
							maxY = Math.max(maxY, childAbsY + 100);
						}
					} else {
						// Group not being dragged - use layout bounds directly
						// (they're updated during child item drag/resize)
						const childBounds = layout.get(childItem.id);
						if (childBounds) {
							minX = Math.min(minX, childBounds.left);
							minY = Math.min(minY, childBounds.top);
							maxX = Math.max(maxX, childBounds.right);
							maxY = Math.max(maxY, childBounds.bottom);
						} else {
							// Fallback: calculate from tree positions
							const childAbsX = groupX + childItem.x;
							const childAbsY = groupY + childItem.y;
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

				const padding = 32 / zoom; // Screen-constant padding around children
				const x = minX - padding;
				const y = minY - padding;
				const width = maxX - minX + padding * 2;
				const height = maxY - minY + padding * 2;

				const titleBarHeight = 28 / zoom;
				const titleBarY = y - titleBarHeight - 4 / zoom; // 4px gap above border

				return (
					<g key={groupItem.id}>
						{/* Border (no background fill) */}
						<rect
							x={x}
							y={y}
							width={width}
							height={height}
							fill="none"
							stroke={isGroupSelected ? "#3b82f6" : "#64748b"}
							strokeWidth={isGroupSelected ? 3 / zoom : 2 / zoom}
							strokeDasharray={`${8 / zoom} ${4 / zoom}`}
							rx={12 / zoom}
							opacity={isGroupSelected ? 0.8 : 0.6}
							style={{ cursor: "pointer" }}
							onClick={handleGroupClick}
						/>

						{/* Title bar - full width, serves as drag handle and selection target */}
						<g
							className="group-title-bar"
							style={{ cursor: "move" }}
							onPointerDown={(e) => handleGroupDragStart(e, groupItem)}
							onClick={handleGroupClick}
						>
							{/* Title bar background */}
							<rect
								x={x}
								y={titleBarY}
								width={width}
								height={titleBarHeight}
								fill={isGroupSelected ? "#3b82f6" : "#64748b"}
								opacity={0.9}
								rx={6 / zoom}
								style={{ pointerEvents: "all" }}
							/>
							<text
								x={x + 8 / zoom}
								y={titleBarY + titleBarHeight / 2}
								fontSize={12 / zoom}
								fill="#ffffff"
								dominantBaseline="middle"
								style={{
									pointerEvents: "none",
									userSelect: "none",
									fontWeight: 500,
								}}
							>
								Group
							</text>
							{/* Drag grip indicator on the right side */}
							<g style={{ pointerEvents: "none" }}>
								<line
									x1={x + width - 20 / zoom}
									y1={titleBarY + 10 / zoom}
									x2={x + width - 8 / zoom}
									y2={titleBarY + 10 / zoom}
									stroke="#ffffff"
									strokeWidth={1.5 / zoom}
									opacity={0.6}
								/>
								<line
									x1={x + width - 20 / zoom}
									y1={titleBarY + 14 / zoom}
									x2={x + width - 8 / zoom}
									y2={titleBarY + 14 / zoom}
									stroke="#ffffff"
									strokeWidth={1.5 / zoom}
									opacity={0.6}
								/>
								<line
									x1={x + width - 20 / zoom}
									y1={titleBarY + 18 / zoom}
									x2={x + width - 8 / zoom}
									y2={titleBarY + 18 / zoom}
									stroke="#ffffff"
									strokeWidth={1.5 / zoom}
									opacity={0.6}
								/>
							</g>
						</g>
					</g>
				);
			})}
		</>
	);
}
