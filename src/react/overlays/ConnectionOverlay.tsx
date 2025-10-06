import React, { useState } from "react";
import { Tree } from "@fluidframework/tree";
import { Item, Group, Note, TextBlock, FluidTable } from "../../schema/appSchema.js";
import { useTree } from "../hooks/useTree.js";
import {
	getConnectionPoint,
	type ConnectionSide,
	type Point,
	type Rect,
} from "../../utils/connections.js";
import { generateWaypoints } from "../../utils/pathfinding.js";

interface LayoutBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

type LayoutMap = Map<string, LayoutBounds>;

interface ConnectionOverlayProps {
	items: Item[];
	layout: LayoutMap;
	zoom: number;
	pan: { x: number; y: number };
	svgRef: React.RefObject<SVGSVGElement>;
}

interface DragState {
	fromItemId: string;
	fromSide: ConnectionSide;
	cursorX: number;
	cursorY: number;
}

/**
 * Calculate bounds for a group based on its children
 * Uses VISUAL bounds with zoom-dependent padding for connection points
 */
function calculateGroupVisualBounds(groupItem: Item, layout: LayoutMap): Rect | null {
	const group = groupItem.content as Group;

	const borderStrokeWidth = 5; // Unselected border width (matches GroupOverlay)
	const titleBarHeight = 34;
	const titleBarGap = borderStrokeWidth * 0.85;
	const titleBarTotalHeight = titleBarHeight + titleBarGap;

	if (group.items.length === 0) {
		// Empty group has fixed size
		const padding = 12;
		const minSize = 100;
		const titleBarWidth = minSize + borderStrokeWidth;
		return {
			x: groupItem.x - padding - borderStrokeWidth / 2,
			y: groupItem.y - padding - titleBarTotalHeight,
			width: titleBarWidth,
			height: minSize + titleBarTotalHeight,
		};
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const childItem of group.items) {
		const childBounds = layout.get(childItem.id);
		if (childBounds) {
			minX = Math.min(minX, childBounds.left);
			minY = Math.min(minY, childBounds.top);
			maxX = Math.max(maxX, childBounds.right);
			maxY = Math.max(maxY, childBounds.bottom);
		}
	}

	if (!isFinite(minX) || !isFinite(minY)) {
		return null;
	}

	const padding = 32;
	const width = maxX - minX + padding * 2;
	const titleBarWidth = width + borderStrokeWidth;
	return {
		x: minX - padding - borderStrokeWidth / 2,
		y: minY - padding - titleBarTotalHeight,
		width: titleBarWidth,
		height: maxY - minY + padding * 2 + titleBarTotalHeight,
	};
}

/**
 * Calculate bounds for a group based on its children
 * Uses FIXED LOGICAL coordinates for consistent pathfinding at all zoom levels.
 * The obstacle bounds should be LARGER than visual bounds to provide breathing room
 * for connection line routing.
 */
function calculateGroupBounds(groupItem: Item, layout: LayoutMap): Rect | null {
	const group = groupItem.content as Group;

	// Use fixed logical coordinates (not zoom-dependent)
	const titleBarHeight = 34; // Match visual bounds
	const titleBarGap = 5 * 0.85; // Match visual bounds (borderStrokeWidth * 0.85)
	const titleBarTotalHeight = titleBarHeight + titleBarGap;
	const routingMargin = 12; // Extra margin around groups for routing breathing room

	if (group.items.length === 0) {
		// Empty group has fixed size
		const padding = 12; // Match visual padding
		const minSize = 100;
		return {
			x: groupItem.x - padding - routingMargin,
			y: groupItem.y - padding - titleBarTotalHeight - routingMargin,
			width: minSize + routingMargin * 2,
			height: minSize + titleBarTotalHeight + routingMargin * 2,
		};
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const childItem of group.items) {
		const childBounds = layout.get(childItem.id);
		if (childBounds) {
			minX = Math.min(minX, childBounds.left);
			minY = Math.min(minY, childBounds.top);
			maxX = Math.max(maxX, childBounds.right);
			maxY = Math.max(maxY, childBounds.bottom);
		}
	}

	if (!isFinite(minX) || !isFinite(minY)) {
		return null;
	}

	// Match visual padding and add routing margin
	const padding = 32; // Match visual padding
	return {
		x: minX - padding - routingMargin,
		y: minY - padding - titleBarTotalHeight - routingMargin,
		width: maxX - minX + padding * 2 + routingMargin * 2,
		height: maxY - minY + padding * 2 + titleBarTotalHeight + routingMargin * 2,
	};
}

export function ConnectionOverlay(props: ConnectionOverlayProps): JSX.Element {
	const { items, layout, zoom, pan, svgRef } = props;
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

	// Convert screen coords to logical SVG coordinates
	const toLogical = (clientX: number, clientY: number): { x: number; y: number } => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		const sx = clientX - rect.left;
		const sy = clientY - rect.top;
		return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
	};

	// Track cursor position for proximity detection
	React.useEffect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			const pos = toLogical(e.clientX, e.clientY);
			setCursorPos(pos);
		};

		const handlePointerLeave = () => {
			setCursorPos(null);
		};

		const svg = svgRef.current;
		if (svg) {
			svg.addEventListener("pointermove", handlePointerMove);
			svg.addEventListener("pointerleave", handlePointerLeave);
			return () => {
				svg.removeEventListener("pointermove", handlePointerMove);
				svg.removeEventListener("pointerleave", handlePointerLeave);
			};
		}
	}, [zoom, pan]);

	/**
	 * Helper to check if an item should have connection points
	 * Connection points are shown on: Groups, Notes, and TextBlocks
	 */
	const hasConnectionPoints = (item: Item): boolean => {
		return (
			Tree.is(item.content, Group) ||
			Tree.is(item.content, Note) ||
			Tree.is(item.content, TextBlock) ||
			Tree.is(item.content, FluidTable)
		);
	};

	// Filter to items that should have connection points
	const itemsWithConnections = items.filter(hasConnectionPoints);

	// Helper to get VISUAL rect for connection points (zoom-dependent)
	const getVisualRect = (itemId: string): Rect | null => {
		const item = items.find((i) => i.id === itemId);
		if (!item) return null;

		// Groups have special visual bounds calculation
		if (Tree.is(item.content, Group)) {
			return calculateGroupVisualBounds(item, layout);
		}

		// Notes, TextBlocks, and FluidTables use layout bounds
		const bounds = layout.get(itemId);
		if (!bounds) return null;
		return {
			x: bounds.left,
			y: bounds.top,
			width: bounds.right - bounds.left,
			height: bounds.bottom - bounds.top,
		};
	};

	// Helper to get LOGICAL rect for obstacles (zoom-independent)
	const getObstacleRect = (itemId: string): Rect | null => {
		// Check if this is a group
		const item = items.find((i) => i.id === itemId);
		if (item && Tree.is(item.content, Group)) {
			return calculateGroupBounds(item, layout);
		}

		// Regular item - get from layout
		const bounds = layout.get(itemId);
		if (!bounds) return null;
		return {
			x: bounds.left,
			y: bounds.top,
			width: bounds.right - bounds.left,
			height: bounds.bottom - bounds.top,
		};
	};

	// Get all obstacles for pathfinding - include ALL items as obstacles
	const getObstacles = (expandBy: number = 0): Rect[] => {
		const obstacles: Rect[] = [];

		for (const item of items) {
			const rect = getObstacleRect(item.id);
			if (rect) {
				// Expand rectangle by the buffer
				obstacles.push({
					x: rect.x - expandBy,
					y: rect.y - expandBy,
					width: rect.width + expandBy * 2,
					height: rect.height + expandBy * 2,
				});
			}
		}

		return obstacles;
	};

	// Handle connection point drag start
	const handleConnectionDragStart = (
		e: React.PointerEvent,
		itemId: string,
		side: ConnectionSide
	) => {
		e.stopPropagation();
		e.preventDefault();

		const startPos = toLogical(e.clientX, e.clientY);
		setDragState({
			fromItemId: itemId,
			fromSide: side,
			cursorX: startPos.x,
			cursorY: startPos.y,
		});

		const handleMove = (ev: PointerEvent) => {
			const pos = toLogical(ev.clientX, ev.clientY);
			setDragState((prev) =>
				prev
					? {
							...prev,
							cursorX: pos.x,
							cursorY: pos.y,
						}
					: null
			);
		};

		const handleUp = (ev: PointerEvent) => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);

			// Check if we released over another connection point
			const target = document.elementFromPoint(ev.clientX, ev.clientY);
			const toItemId = target?.getAttribute("data-connection-item");
			const toSide = target?.getAttribute("data-connection-side") as ConnectionSide | null;

			if (toItemId && toSide && toItemId !== itemId) {
				// Create the connection
				const toItem = items.find((item) => item.id === toItemId);
				if (toItem) {
					Tree.runTransaction(toItem, () => {
						toItem.addConnection(itemId);
					});
				}
			}

			setDragState(null);
		};

		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp);
	};

	return (
		<g className="connection-overlay">
			{/* Render all existing connections and collect which sides are used */}
			{(() => {
				const activeSides = new Map<string, Set<ConnectionSide>>();
				const allPaths = new Map<string, Point[]>(); // Track all connection paths

				const connectionElements = itemsWithConnections.map((toItem) => {
					return toItem.getConnections().map((fromItemId) => {
						const fromItem = items.find((item) => item.id === fromItemId);
						if (!fromItem) return null;

						const connectionKey = `${fromItemId}-${toItem.id}`;

						return (
							<ConnectionLine
								key={connectionKey}
								fromItem={fromItem}
								toItem={toItem}
								getRect={getVisualRect}
								getObstacles={getObstacles}
								zoom={zoom}
								allPaths={allPaths}
								connectionKey={connectionKey}
								onSidesCalculated={(fromId, fromSide, toId, toSide) => {
									if (!activeSides.has(fromId))
										activeSides.set(fromId, new Set());
									if (!activeSides.has(toId)) activeSides.set(toId, new Set());
									activeSides.get(fromId)!.add(fromSide);
									activeSides.get(toId)!.add(toSide);
								}}
							/>
						);
					});
				});

				return (
					<>
						{connectionElements}

						{/* Render temporary drag line */}
						{dragState && (
							<TempConnectionLine
								dragState={dragState}
								getRect={getVisualRect}
								zoom={zoom}
							/>
						)}

						{/* Render connection points on groups, notes, and text */}
						{itemsWithConnections.map((item) => (
							<ConnectionPoints
								key={item.id}
								item={item}
								getRect={getVisualRect}
								onDragStart={handleConnectionDragStart}
								zoom={zoom}
								cursorPos={cursorPos}
								isDragging={dragState !== null}
								activeSides={activeSides.get(item.id) || new Set()}
							/>
						))}
					</>
				);
			})()}
		</g>
	);
}

interface ConnectionPointsProps {
	item: Item;
	getRect: (itemId: string) => Rect | null;
	onDragStart: (e: React.PointerEvent, itemId: string, side: ConnectionSide) => void;
	zoom: number;
	cursorPos: { x: number; y: number } | null;
	isDragging: boolean;
	activeSides: Set<ConnectionSide>;
}

function ConnectionPoints(props: ConnectionPointsProps): JSX.Element | null {
	const { item, getRect, onDragStart, cursorPos, isDragging, activeSides } = props;
	useTree(item);

	const rect = getRect(item.id);
	if (!rect) return null;

	const sides: ConnectionSide[] = ["top", "right", "bottom", "left"];

	// Proximity threshold in logical units
	const proximityThreshold = 100;

	return (
		<g className="connection-points" style={{ pointerEvents: "all" }}>
			{sides.map((side) => {
				const point = getConnectionPoint(rect, side);

				// Calculate opacity based on proximity or if dragging
				let opacity = 0;

				if (isDragging) {
					// Show all sides when dragging
					opacity = 1;
				} else if (activeSides.has(side)) {
					// Always show sides that have active connections
					opacity = 1;
				} else if (cursorPos) {
					// Fade in based on distance to cursor
					const distance = Math.sqrt(
						Math.pow(cursorPos.x - point.x, 2) + Math.pow(cursorPos.y - point.y, 2)
					);

					if (distance < proximityThreshold) {
						// Fade from 0 at threshold to 1 at 0 distance
						opacity = 1 - distance / proximityThreshold;
					}
				}

				// Don't render if completely transparent
				if (opacity < 0.01) return null;

				return (
					<circle
						key={side}
						cx={point.x}
						cy={point.y}
						r={12}
						fill="#ffffff"
						stroke="#3b82f6"
						strokeWidth={5}
						opacity={opacity}
						style={{
							cursor: "crosshair",
							pointerEvents: opacity > 0.3 ? "all" : "none",
						}}
						onPointerDown={(e) => onDragStart(e, item.id, side)}
						data-connection-item={item.id}
						data-connection-side={side}
					/>
				);
			})}
		</g>
	);
}

interface ConnectionLineProps {
	fromItem: Item;
	toItem: Item;
	getRect: (itemId: string) => Rect | null;
	getObstacles: (expandBy?: number) => Rect[];
	zoom: number;
	allPaths: Map<string, Point[]>;
	connectionKey: string;
	onSidesCalculated: (
		fromId: string,
		fromSide: ConnectionSide,
		toId: string,
		toSide: ConnectionSide
	) => void;
}

function ConnectionLine(props: ConnectionLineProps): JSX.Element | null {
	const { fromItem, toItem, getRect, getObstacles, onSidesCalculated } = props;
	useTree(fromItem);
	useTree(toItem);

	const [isHovered, setIsHovered] = React.useState(false);

	const fromRect = getRect(fromItem.id);
	const toRect = getRect(toItem.id);

	if (!fromRect || !toRect) return null;

	// Get all obstacles (including connected items)
	// Use fixed logical coordinates for pathfinding - don't divide by zoom
	// This ensures routing is consistent at all zoom levels
	const clearance = 10; // Logical coordinate clearance for pathfinding
	const obstaclesExpanded = getObstacles(4); // Fixed logical expansion, not zoom-dependent

	// Try all reasonable side combinations and pick the one with shortest path
	const sides: ConnectionSide[] = ["top", "right", "bottom", "left"];
	let bestPath: Point[] | null = null;
	let bestPathLength = Infinity;
	let bestFromSide: ConnectionSide = "right";
	let bestToSide: ConnectionSide = "left";

	for (const fromSide of sides) {
		for (const toSide of sides) {
			const start = getConnectionPoint(fromRect, fromSide);
			const end = getConnectionPoint(toRect, toSide);

			// Try to generate path for this combination
			const waypoints = generateWaypoints(
				start,
				end,
				obstaclesExpanded,
				clearance,
				fromSide,
				toSide
			);

			// Calculate path quality metrics
			let pathLength = 0;
			for (let i = 1; i < waypoints.length; i++) {
				const dx = waypoints[i].x - waypoints[i - 1].x;
				const dy = waypoints[i].y - waypoints[i - 1].y;
				pathLength += Math.abs(dx) + Math.abs(dy);
			}

			// Prefer simpler routes with fewer turns
			const numTurns = waypoints.length - 2; // Number of corners
			const complexityPenalty = numTurns * 50; // Penalize each turn

			// Prefer paths where sides face each other (opposite directions)
			const sidesOpposite =
				(fromSide === "right" && toSide === "left") ||
				(fromSide === "left" && toSide === "right") ||
				(fromSide === "top" && toSide === "bottom") ||
				(fromSide === "bottom" && toSide === "top");
			const directionBonus = sidesOpposite ? -100 : 0;

			// Calculate total score (lower is better)
			const score = pathLength + complexityPenalty + directionBonus;

			if (score < bestPathLength) {
				bestPathLength = score;
				bestPath = waypoints;
				bestFromSide = fromSide;
				bestToSide = toSide;
			}
		}
	}

	// Notify which sides were chosen
	onSidesCalculated(fromItem.id, bestFromSide, toItem.id, bestToSide);

	// Use the best path found
	const waypoints = bestPath || [];

	if (waypoints.length === 0) return null;

	// No offset - overlapping is allowed
	// allPaths.set(connectionKey, waypoints);
	// const lineSpacing = 18;
	// waypoints = offsetPathBySegment(waypoints, connectionKey, allPaths, lineSpacing);

	// Create SVG path - arrow connects to line, with gap from connection point
	const arrowSize = 12; // Smaller chevron size
	const arrowGap = 12; // Gap between arrow tip and connection point
	const startGap = 8; // Gap between line start and group border

	// Calculate arrow head at the end pointing toward the target
	const lastSegment = waypoints[waypoints.length - 1];
	const secondLast = waypoints[waypoints.length - 2] || lastSegment;
	const angle = Math.atan2(lastSegment.y - secondLast.y, lastSegment.x - secondLast.x);

	// Arrow tip positioned with gap from connection point
	const arrowTip = {
		x: lastSegment.x - arrowGap * Math.cos(angle),
		y: lastSegment.y - arrowGap * Math.sin(angle),
	};

	// Adjust waypoints: add gap at start and cut back at end
	let adjustedWaypoints = [...waypoints];

	// Add gap at the start of the line
	if (waypoints.length >= 2) {
		const first = waypoints[0];
		const second = waypoints[1];
		const startAngle = Math.atan2(second.y - first.y, second.x - first.x);
		const adjustedStart = {
			x: first.x + startGap * Math.cos(startAngle),
			y: first.y + startGap * Math.sin(startAngle),
		};
		adjustedWaypoints = [adjustedStart, ...waypoints.slice(1)];
	}

	// Cut back at the end for the arrow
	if (adjustedWaypoints.length >= 2) {
		const last = adjustedWaypoints[adjustedWaypoints.length - 1];
		const secondLast = adjustedWaypoints[adjustedWaypoints.length - 2];
		const endAngle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x);
		const cutbackDistance = arrowGap + arrowSize * 0.8; // Extra cutback to clear the arrow wings
		const adjustedEnd = {
			x: last.x - cutbackDistance * Math.cos(endAngle),
			y: last.y - cutbackDistance * Math.sin(endAngle),
		};
		adjustedWaypoints = [...adjustedWaypoints.slice(0, -1), adjustedEnd];
	}

	const pathData = adjustedWaypoints
		.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
		.join(" ");

	return (
		<g className="connection-line">
			{/* Main line */}
			<path
				d={pathData}
				stroke={isHovered ? "#2563eb" : "#3b82f6"}
				strokeWidth={isHovered ? 6 : 5}
				fill="none"
				opacity={isHovered ? 0.8 : 0.6}
				style={{ pointerEvents: "none" }}
			/>
			{/* Arrow head - solid triangle */}
			<path
				d={`M ${arrowTip.x - arrowSize * Math.cos(angle - Math.PI / 4)} ${arrowTip.y - arrowSize * Math.sin(angle - Math.PI / 4)}
					L ${arrowTip.x} ${arrowTip.y}
					L ${arrowTip.x - arrowSize * Math.cos(angle + Math.PI / 4)} ${arrowTip.y - arrowSize * Math.sin(angle + Math.PI / 4)}
					Z`}
				fill={isHovered ? "#2563eb" : "#3b82f6"}
				stroke="none"
				opacity={isHovered ? 0.8 : 0.6}
				style={{ pointerEvents: "none" }}
			/>
			{/* Invisible wider hit area for hover and right-click */}
			<path
				d={pathData}
				stroke="transparent"
				strokeWidth={12}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				pointerEvents="stroke"
				style={{ cursor: "default" }}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onPointerDown={(e) => {
					// Stop propagation for all clicks to prevent interference
					e.stopPropagation();
				}}
				onContextMenu={(e) => {
					e.stopPropagation();
					e.preventDefault();
					Tree.runTransaction(toItem, () => {
						toItem.removeConnection(fromItem.id);
					});
				}}
			/>
		</g>
	);
}

interface TempConnectionLineProps {
	dragState: DragState;
	getRect: (itemId: string) => Rect | null;
	zoom: number;
}

function TempConnectionLine(props: TempConnectionLineProps): JSX.Element | null {
	const { dragState, getRect } = props;

	const fromRect = getRect(dragState.fromItemId);
	if (!fromRect) return null;

	const start = getConnectionPoint(fromRect, dragState.fromSide);
	const end = { x: dragState.cursorX, y: dragState.cursorY };

	return (
		<line
			x1={start.x}
			y1={start.y}
			x2={end.x}
			y2={end.y}
			stroke="#3b82f6"
			strokeWidth={5}
			strokeDasharray="8 4"
			opacity={0.6}
		/>
	);
}
