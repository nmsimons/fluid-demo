import React, { useState } from "react";
import { Tree } from "@fluidframework/tree";
import { Item, Group } from "../../schema/appSchema.js";
import { useTree } from "../hooks/useTree.js";
import {
	getConnectionPoint,
	calculateConnectionSides,
	type ConnectionSide,
	type Rect,
} from "../../utils/connections.js";
import { generateOrthogonalWaypoints } from "../../utils/pathfinding.js";

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
 * Includes the title bar height above the group content area
 */
function calculateGroupBounds(groupItem: Item, layout: LayoutMap, zoom: number): Rect | null {
	const group = groupItem.content as Group;

	const titleBarHeight = 28 / zoom;
	const titleBarGap = 4 / zoom;
	const titleBarTotalHeight = titleBarHeight + titleBarGap;

	if (group.items.length === 0) {
		// Empty group has fixed size
		const padding = 10 / zoom;
		const minSize = 100 / zoom;
		return {
			x: groupItem.x - padding,
			y: groupItem.y - padding - titleBarTotalHeight,
			width: minSize,
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

	const padding = 32 / zoom;
	return {
		x: minX - padding,
		y: minY - padding - titleBarTotalHeight,
		width: maxX - minX + padding * 2,
		height: maxY - minY + padding * 2 + titleBarTotalHeight,
	};
}

export function ConnectionOverlay(props: ConnectionOverlayProps): JSX.Element {
	const { items, layout, zoom, pan, svgRef } = props;
	const [dragState, setDragState] = useState<DragState | null>(null);

	// Convert screen coords to logical SVG coordinates
	const toLogical = (clientX: number, clientY: number): { x: number; y: number } => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		const sx = clientX - rect.left;
		const sy = clientY - rect.top;
		return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
	};

	// Filter to only group items
	const groupItems = items.filter((item) => Tree.is(item.content, Group));

	// Helper to get rect from layout bounds
	const getRect = (itemId: string): Rect | null => {
		// Check if this is a group
		const item = items.find((i) => i.id === itemId);
		if (item && Tree.is(item.content, Group)) {
			return calculateGroupBounds(item, layout, zoom);
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

	// Get all obstacles for pathfinding (all items except those involved in connection)
	// Expand obstacles by half the hit area stroke width to account for stroke extending from path
	const getObstacles = (excludeIds: string[], expandBy: number = 0): Rect[] => {
		const obstacles: Rect[] = [];
		const excludeSet = new Set(excludeIds);

		for (const item of items) {
			if (excludeSet.has(item.id)) continue;

			const rect = getRect(item.id);
			if (rect) {
				// Expand rectangle by the stroke width buffer
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
			{/* Render all existing connections */}
			{groupItems.map((toItem) => {
				return toItem.getConnections().map((fromItemId) => {
					const fromItem = items.find((item) => item.id === fromItemId);
					if (!fromItem) return null;

					return (
						<ConnectionLine
							key={`${fromItemId}-${toItem.id}`}
							fromItem={fromItem}
							toItem={toItem}
							getRect={getRect}
							getObstacles={getObstacles}
							zoom={zoom}
						/>
					);
				});
			})}

			{/* Render temporary drag line */}
			{dragState && (
				<TempConnectionLine dragState={dragState} getRect={getRect} zoom={zoom} />
			)}

			{/* Render connection points on groups */}
			{groupItems.map((item) => (
				<ConnectionPoints
					key={item.id}
					item={item}
					getRect={getRect}
					onDragStart={handleConnectionDragStart}
					zoom={zoom}
				/>
			))}
		</g>
	);
}

interface ConnectionPointsProps {
	item: Item;
	getRect: (itemId: string) => Rect | null;
	onDragStart: (e: React.PointerEvent, itemId: string, side: ConnectionSide) => void;
	zoom: number;
}

function ConnectionPoints(props: ConnectionPointsProps): JSX.Element | null {
	const { item, getRect, onDragStart, zoom } = props;
	useTree(item);

	const rect = getRect(item.id);
	if (!rect) return null;

	const sides: ConnectionSide[] = ["top", "right", "bottom", "left"];

	return (
		<g className="connection-points" style={{ pointerEvents: "all" }}>
			{sides.map((side) => {
				const point = getConnectionPoint(rect, side);
				return (
					<circle
						key={side}
						cx={point.x}
						cy={point.y}
						r={8 / zoom}
						fill="#ffffff"
						stroke="#3b82f6"
						strokeWidth={3 / zoom}
						style={{ cursor: "crosshair", pointerEvents: "all" }}
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
	getObstacles: (excludeIds: string[], expandBy?: number) => Rect[];
	zoom: number;
}

function ConnectionLine(props: ConnectionLineProps): JSX.Element | null {
	const { fromItem, toItem, getRect, getObstacles, zoom } = props;
	useTree(fromItem);
	useTree(toItem);

	const [isHovered, setIsHovered] = React.useState(false);

	const fromRect = getRect(fromItem.id);
	const toRect = getRect(toItem.id);

	if (!fromRect || !toRect) return null;

	// Calculate which sides to connect
	const [fromSide, toSide] = calculateConnectionSides(fromRect, toRect);
	const start = getConnectionPoint(fromRect, fromSide);
	const end = getConnectionPoint(toRect, toSide);

	// Get obstacles and generate path
	// Expand obstacles by half the hit area stroke width so the stroke doesn't overlap obstacles
	const hitAreaStrokeWidth = 8 / zoom;
	const obstacles = getObstacles([fromItem.id, toItem.id], hitAreaStrokeWidth / 2);
	// Use reasonable base clearance
	const clearance = 10 / zoom;
	const waypoints = generateOrthogonalWaypoints(
		start,
		end,
		obstacles,
		clearance,
		fromSide,
		toSide
	);

	// Create SVG path - arrow connects to line, with gap from connection point
	const arrowSize = 24 / zoom;
	const arrowGap = 12 / zoom; // Gap between arrow tip and connection point

	// Calculate arrow head at the end pointing toward the target
	const lastSegment = waypoints[waypoints.length - 1];
	const secondLast = waypoints[waypoints.length - 2] || lastSegment;
	const angle = Math.atan2(lastSegment.y - secondLast.y, lastSegment.x - secondLast.x);

	// Arrow tip positioned with gap from connection point
	const arrowTip = {
		x: lastSegment.x - arrowGap * Math.cos(angle),
		y: lastSegment.y - arrowGap * Math.sin(angle),
	};

	// Line ends at the base of the arrow (no gap between line and arrow)
	let adjustedWaypoints = [...waypoints];
	if (waypoints.length >= 2) {
		const last = waypoints[waypoints.length - 1];
		const secondLast = waypoints[waypoints.length - 2];
		const angle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x);
		const adjustedEnd = {
			x: last.x - arrowGap * Math.cos(angle),
			y: last.y - arrowGap * Math.sin(angle),
		};
		adjustedWaypoints = [...waypoints.slice(0, -1), adjustedEnd];
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
				strokeWidth={isHovered ? 4 / zoom : 3 / zoom}
				fill="none"
				style={{ pointerEvents: "none" }}
			/>
			{/* Arrow head - filled triangle */}
			<path
				d={`M ${arrowTip.x} ${arrowTip.y} 
					L ${arrowTip.x - arrowSize * Math.cos(angle - Math.PI / 6)} ${arrowTip.y - arrowSize * Math.sin(angle - Math.PI / 6)}
					L ${arrowTip.x - arrowSize * Math.cos(angle + Math.PI / 6)} ${arrowTip.y - arrowSize * Math.sin(angle + Math.PI / 6)}
					Z`}
				fill={isHovered ? "#2563eb" : "#3b82f6"}
				stroke={isHovered ? "#2563eb" : "#3b82f6"}
				strokeWidth={1 / zoom}
				style={{ pointerEvents: "none" }}
			/>
			{/* Invisible wider hit area for hover and right-click */}
			<path
				d={pathData}
				stroke="transparent"
				strokeWidth={8 / zoom}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				pointerEvents="stroke"
				style={{ cursor: "default" }}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onPointerDown={(e) => {
					// Only stop propagation for right-clicks
					if (e.button === 2) {
						e.stopPropagation();
					}
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
	const { dragState, getRect, zoom } = props;

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
			strokeWidth={3 / zoom}
			strokeDasharray={`${8 / zoom} ${4 / zoom}`}
			opacity={0.6}
		/>
	);
}
