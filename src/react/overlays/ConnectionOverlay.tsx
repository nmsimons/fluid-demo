import React, { useContext, useMemo, useState } from "react";
import { Tree } from "@fluidframework/tree";
import { Item, Group } from "../../schema/appSchema.js";
import { FlattenedItem } from "../../utils/flattenItems.js";
import { useTree } from "../hooks/useTree.js";
import {
	getConnectionPoint,
	type ConnectionSide,
	type Point,
	type Rect,
} from "../../utils/connections.js";
import { generateWaypoints } from "../../utils/pathfinding.js";
import { PresenceContext } from "../contexts/PresenceContext.js";
import {
	getGroupContentBounds,
	getItemAbsolutePosition,
	getParentGroupInfo,
} from "../utils/presenceGeometry.js";
import { updateCursorFromEvent } from "../../utils/cursorUtils.js";
import type { ConnectionDragState } from "../../presence/Interfaces/ConnectionDragManager.js";
import { getUserColor } from "../../utils/userUtils.js";

interface LayoutBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

type LayoutMap = Map<string, LayoutBounds>;

type PresenceContextType = React.ContextType<typeof PresenceContext>;

interface ConnectionOverlayProps {
	flattenedItems: FlattenedItem[];
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

interface RemoteDragState extends DragState {
	clientId: string;
}

const connectionSides: readonly ConnectionSide[] = ["top", "right", "bottom", "left"];
const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;
const isConnectionSideValue = (value: unknown): value is ConnectionSide =>
	typeof value === "string" && (connectionSides as readonly string[]).includes(value);
const getPresenceRecord = (remote: unknown): Record<string, unknown> | undefined => {
	if (!isRecord(remote)) {
		return undefined;
	}
	const rawValue = remote["value"];
	try {
		if (typeof rawValue === "function") {
			const fn = rawValue as (...args: unknown[]) => unknown;
			const result = fn.call(remote);
			return isRecord(result) ? result : undefined;
		}
		return isRecord(rawValue) ? (rawValue as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
};
const getAttendeeId = (remote: unknown): string | undefined => {
	if (!isRecord(remote)) {
		return undefined;
	}
	const attendee = remote["attendee"];
	if (!isRecord(attendee)) {
		return undefined;
	}
	const id = attendee["attendeeId"];
	return typeof id === "string" ? id : undefined;
};

const inflateRect = (rect: Rect, padding: number): Rect => ({
	x: rect.x - padding,
	y: rect.y - padding,
	width: rect.width + padding * 2,
	height: rect.height + padding * 2,
});

/**
 * Calculate bounds for a group based on its children
 * Uses VISUAL bounds with zoom-dependent padding for connection points
 */
function calculateGroupVisualBounds(
	groupItem: Item,
	layout: LayoutMap,
	presence: PresenceContextType
): Rect | null {
	const borderStrokeWidth = 5; // Unselected border width (matches GroupOverlay)
	const titleBarHeight = 34;
	const titleBarGap = borderStrokeWidth * 0.85;
	const titleBarTotalHeight = titleBarHeight + titleBarGap;

	const contentBounds = getGroupContentBounds(groupItem, layout, presence);

	if (!contentBounds) {
		// Empty group has fixed size
		const padding = 12;
		const minSize = 100;
		const { x, y } = getItemAbsolutePosition(groupItem, presence);
		const titleBarWidth = minSize + borderStrokeWidth;
		return {
			x: x - padding - borderStrokeWidth / 2,
			y: y - padding - titleBarTotalHeight,
			width: titleBarWidth,
			height: minSize + titleBarTotalHeight,
		};
	}

	const padding = 32;
	const contentWidth = Math.max(1, contentBounds.right - contentBounds.left);
	const contentHeight = Math.max(1, contentBounds.bottom - contentBounds.top);
	const paddedWidth = contentWidth + padding * 2;
	const totalWidth = paddedWidth + borderStrokeWidth;
	return {
		x: contentBounds.left - padding - borderStrokeWidth / 2,
		y: contentBounds.top - padding - titleBarTotalHeight,
		width: totalWidth,
		height: contentHeight + padding * 2 + titleBarTotalHeight,
	};
}

/**
 * Calculate bounds for a group based on its children
 * Uses FIXED LOGICAL coordinates for consistent pathfinding at all zoom levels.
 * The obstacle bounds should be LARGER than visual bounds to provide breathing room
 * for connection line routing.
 */
function calculateGroupBounds(
	groupItem: Item,
	layout: LayoutMap,
	presence: PresenceContextType
): Rect | null {
	const titleBarHeight = 34; // Match visual bounds
	const titleBarGap = 5 * 0.85; // Match visual bounds (borderStrokeWidth * 0.85)
	const titleBarTotalHeight = titleBarHeight + titleBarGap;
	const routingMargin = 12; // Extra margin around groups for routing breathing room

	const contentBounds = getGroupContentBounds(groupItem, layout, presence);

	if (!contentBounds) {
		const padding = 12; // Match visual padding
		const minSize = 100;
		const { x, y } = getItemAbsolutePosition(groupItem, presence);
		return {
			x: x - padding - routingMargin,
			y: y - padding - titleBarTotalHeight - routingMargin,
			width: minSize + routingMargin * 2,
			height: minSize + titleBarTotalHeight + routingMargin * 2,
		};
	}

	const padding = 32; // Match visual padding
	const contentWidth = Math.max(1, contentBounds.right - contentBounds.left);
	const contentHeight = Math.max(1, contentBounds.bottom - contentBounds.top);
	return {
		x: contentBounds.left - padding - routingMargin,
		y: contentBounds.top - padding - titleBarTotalHeight - routingMargin,
		width: contentWidth + padding * 2 + routingMargin * 2,
		height: contentHeight + padding * 2 + titleBarTotalHeight + routingMargin * 2,
	};
}

export function ConnectionOverlay(props: ConnectionOverlayProps): JSX.Element {
	const { flattenedItems, layout, zoom, pan, svgRef } = props;
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
	const presence = useContext(PresenceContext);
	const connectionManager = presence.connectionDrag;
	const cursorManager = presence.cursor;
	const [remoteDrags, setRemoteDrags] = useState<RemoteDragState[]>([]);

	const items = useMemo(() => {
		const unique = new Map<string, Item>();
		for (const flat of flattenedItems) {
			if (!unique.has(flat.item.id)) {
				unique.set(flat.item.id, flat.item);
			}
		}
		return Array.from(unique.values());
	}, [flattenedItems]);

	const itemById = useMemo(() => {
		const map = new Map<string, Item>();
		for (const item of items) {
			map.set(item.id, item);
		}
		return map;
	}, [items]);

	const toLogical = React.useCallback(
		(clientX: number, clientY: number): { x: number; y: number } => {
			const rect = svgRef.current?.getBoundingClientRect();
			if (!rect) return { x: 0, y: 0 };
			const sx = clientX - rect.left;
			const sy = clientY - rect.top;
			return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
		},
		[svgRef, pan.x, pan.y, zoom]
	);

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
	}, [toLogical, svgRef]);

	React.useEffect(() => {
		if (!connectionManager?.state?.getRemotes) {
			setRemoteDrags([]);
			return;
		}

		const updateRemotes = () => {
			const nextRemotes: RemoteDragState[] = [];
			const iterator = connectionManager.state.getRemotes() as Iterable<unknown>;
			for (const remote of iterator) {
				const stateRecord = getPresenceRecord(remote);
				if (!stateRecord) {
					continue;
				}
				const fromItemId =
					typeof stateRecord["fromItemId"] === "string"
						? (stateRecord["fromItemId"] as string)
						: undefined;
				const fromSide = isConnectionSideValue(stateRecord["fromSide"])
					? (stateRecord["fromSide"] as ConnectionSide)
					: undefined;
				const cursorX =
					typeof stateRecord["cursorX"] === "number"
						? (stateRecord["cursorX"] as number)
						: undefined;
				const cursorY =
					typeof stateRecord["cursorY"] === "number"
						? (stateRecord["cursorY"] as number)
						: undefined;
				if (!fromItemId || !fromSide || cursorX === undefined || cursorY === undefined) {
					continue;
				}
				const attendeeId = getAttendeeId(remote);
				if (!attendeeId) {
					continue;
				}
				const dragState: ConnectionDragState = {
					fromItemId,
					fromSide,
					cursorX,
					cursorY,
				};
				nextRemotes.push({ ...dragState, clientId: attendeeId });
			}
			setRemoteDrags(nextRemotes);
		};

		updateRemotes();
		const offRemote = connectionManager.events.on("remoteUpdated", updateRemotes);
		const offDisconnect = connectionManager.attendees.events.on(
			"attendeeDisconnected",
			updateRemotes
		);

		return () => {
			offRemote();
			offDisconnect();
		};
	}, [connectionManager]);

	React.useEffect(() => {
		return () => {
			connectionManager?.clearConnectionDrag();
		};
	}, [connectionManager]);

	const itemsWithConnections = items;

	const getBaseRect = React.useCallback(
		(item: Item): Rect | null => {
			if (Tree.is(item.content, Group)) {
				return null;
			}
			const bounds = layout.get(item.id);
			const { x, y } = getItemAbsolutePosition(item, presence);
			const width = bounds ? Math.max(1, bounds.right - bounds.left) : 100;
			const height = bounds ? Math.max(1, bounds.bottom - bounds.top) : 100;
			return { x, y, width, height };
		},
		[layout, presence]
	);

	const getVisualRect = React.useCallback(
		(itemId: string): Rect | null => {
			const item = itemById.get(itemId);
			if (!item) return null;
			if (Tree.is(item.content, Group)) {
				return calculateGroupVisualBounds(item, layout, presence);
			}
			const base = getBaseRect(item);
			if (!base) return null;
			const selectionPadding = 10 / zoom;
			return inflateRect(base, selectionPadding);
		},
		[itemById, layout, presence, getBaseRect, zoom]
	);

	const getConnectionRect = React.useCallback(
		(itemId: string): Rect | null => {
			const item = itemById.get(itemId);
			if (!item) return null;
			if (Tree.is(item.content, Group)) {
				return calculateGroupBounds(item, layout, presence);
			}
			const base = getBaseRect(item);
			if (!base) return null;
			const fixedPadding = 10;
			return inflateRect(base, fixedPadding);
		},
		[itemById, layout, presence, getBaseRect]
	);

	const getObstacleRect = React.useCallback(
		(itemId: string): Rect | null => {
			const item = itemById.get(itemId);
			if (!item) return null;
			if (Tree.is(item.content, Group)) {
				return calculateGroupBounds(item, layout, presence);
			}
			return getBaseRect(item);
		},
		[itemById, layout, presence, getBaseRect]
	);

	const getObstacles = React.useCallback(
		(expandBy: number = 0): Rect[] => {
			const obstacles: Rect[] = [];
			for (const item of items) {
				const rect = getObstacleRect(item.id);
				if (rect) {
					obstacles.push({
						x: rect.x - expandBy,
						y: rect.y - expandBy,
						width: rect.width + expandBy * 2,
						height: rect.height + expandBy * 2,
					});
				}
			}
			return obstacles;
		},
		[items, getObstacleRect]
	);

	const isAncestor = React.useCallback((maybeAncestor: Item, target: Item): boolean => {
		const visited = new Set<string>();
		let info = getParentGroupInfo(target);
		while (info && !visited.has(info.groupItem.id)) {
			if (info.groupItem.id === maybeAncestor.id) {
				return true;
			}
			visited.add(info.groupItem.id);
			info = getParentGroupInfo(info.groupItem);
		}
		return false;
	}, []);

	const isInvalidConnection = React.useCallback(
		(a: Item, b: Item) => isAncestor(a, b) || isAncestor(b, a),
		[isAncestor]
	);

	const handleConnectionDragStart = (
		e: React.PointerEvent,
		itemId: string,
		side: ConnectionSide
	) => {
		e.stopPropagation();
		e.preventDefault();

		const fromItem = itemById.get(itemId);
		if (!fromItem) {
			return;
		}

		const startPos = toLogical(e.clientX, e.clientY);
		const initialState: DragState = {
			fromItemId: itemId,
			fromSide: side,
			cursorX: startPos.x,
			cursorY: startPos.y,
		};
		setDragState(initialState);
		connectionManager?.setConnectionDrag(initialState);
		updateCursorFromEvent(e, cursorManager, pan, zoom);

		const handleMove = (ev: PointerEvent) => {
			const pos = toLogical(ev.clientX, ev.clientY);
			setDragState((prev) => {
				if (!prev) return prev;
				const nextState: DragState = {
					...prev,
					cursorX: pos.x,
					cursorY: pos.y,
				};
				connectionManager?.setConnectionDrag(nextState);
				return nextState;
			});
			updateCursorFromEvent(ev, cursorManager, pan, zoom);
		};

		const handleUp = (ev: PointerEvent) => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);
			document.removeEventListener("pointercancel", handleUp);
			connectionManager?.clearConnectionDrag();
			updateCursorFromEvent(ev, cursorManager, pan, zoom);

			const target = document.elementFromPoint(ev.clientX, ev.clientY);
			const toItemId = target?.getAttribute("data-connection-item");
			const toSide = target?.getAttribute("data-connection-side") as ConnectionSide | null;

			if (toItemId && toSide && toItemId !== itemId) {
				const toItem = itemById.get(toItemId);
				const currentFromItem = itemById.get(itemId);
				if (toItem && currentFromItem && !isInvalidConnection(currentFromItem, toItem)) {
					Tree.runTransaction(toItem, () => {
						toItem.addConnection(itemId);
					});
				}
			}

			setDragState(null);
		};

		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp);
		document.addEventListener("pointercancel", handleUp);
	};

	return (
		<g className="connection-overlay">
			{(() => {
				const activeSides = new Map<string, Set<ConnectionSide>>();
				const allPaths = new Map<string, Point[]>();

				const connectionElements = itemsWithConnections.map((toItem) => {
					return toItem.getConnections().map((fromItemId) => {
						const fromItem = itemById.get(fromItemId);
						if (!fromItem || isInvalidConnection(fromItem, toItem)) {
							return null;
						}

						const connectionKey = `${fromItemId}-${toItem.id}`;

						return (
							<ConnectionLine
								key={connectionKey}
								fromItem={fromItem}
								toItem={toItem}
								getRect={getConnectionRect}
								getObstacles={getObstacles}
								zoom={zoom}
								allPaths={allPaths}
								connectionKey={connectionKey}
								onSidesCalculated={(fromId, fromSide, toId, toSide) => {
									if (!activeSides.has(fromId)) {
										activeSides.set(fromId, new Set());
									}
									if (!activeSides.has(toId)) {
										activeSides.set(toId, new Set());
									}
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
						{dragState && (
							<TempConnectionLine
								dragState={dragState}
								getRect={getConnectionRect}
								zoom={zoom}
							/>
						)}
						{remoteDrags.map((remote) => (
							<TempConnectionLine
								key={`remote-${remote.clientId}-${remote.fromItemId}-${remote.fromSide}`}
								dragState={remote}
								getRect={getConnectionRect}
								zoom={zoom}
								strokeColor={getUserColor(remote.clientId)}
								strokeOpacity={0.5}
							/>
						))}
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
	const { item, getRect, onDragStart, zoom, cursorPos, isDragging, activeSides } = props;
	useTree(item);

	const rect = getRect(item.id);
	if (!rect) return null;

	const sides: ConnectionSide[] = ["top", "right", "bottom", "left"];

	// Proximity threshold in logical units
	const proximityThreshold = 100;

	// Connection point visual size (constant regardless of zoom)
	const visualRadius = 6;
	const visualStrokeWidth = 2.5;

	// Scale inversely with zoom to maintain constant visual size
	const radius = visualRadius / zoom;
	const strokeWidth = visualStrokeWidth / zoom;

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
						r={radius}
						fill="#ffffff"
						stroke="#3b82f6"
						strokeWidth={strokeWidth}
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
	const arrowSize = 18; // Larger arrow head
	const arrowGap = 16; // Gap between arrow tip and connection point
	const startGap = 12; // Gap between line start and group border

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
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={isHovered ? 0.8 : 0.6}
				style={{ pointerEvents: "none" }}
			/>
			{/* Arrow head - outlined chevron */}
			<path
				d={`M ${arrowTip.x - arrowSize * Math.cos(angle - Math.PI / 6)} ${arrowTip.y - arrowSize * Math.sin(angle - Math.PI / 6)}
					L ${arrowTip.x} ${arrowTip.y}
					L ${arrowTip.x - arrowSize * Math.cos(angle + Math.PI / 6)} ${arrowTip.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
				fill="none"
				stroke={isHovered ? "#2563eb" : "#3b82f6"}
				strokeWidth={isHovered ? 6 : 5}
				strokeLinecap="round"
				strokeLinejoin="round"
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
	strokeColor?: string;
	strokeOpacity?: number;
	strokeDasharray?: string;
	strokeWidth?: number;
}

function TempConnectionLine(props: TempConnectionLineProps): JSX.Element | null {
	const { dragState, getRect, strokeColor, strokeOpacity, strokeDasharray, strokeWidth } = props;

	const fromRect = getRect(dragState.fromItemId);
	if (!fromRect) return null;

	const start = getConnectionPoint(fromRect, dragState.fromSide);
	const end = { x: dragState.cursorX, y: dragState.cursorY };
	const color = strokeColor ?? "#3b82f6";
	const opacity = strokeOpacity ?? 0.6;
	const dashPattern = strokeDasharray ?? "8 4";
	const width = strokeWidth ?? 5;

	return (
		<line
			x1={start.x}
			y1={start.y}
			x2={end.x}
			y2={end.y}
			stroke={color}
			strokeWidth={width}
			strokeDasharray={dashPattern}
			opacity={opacity}
			pointerEvents="none"
		/>
	);
}
