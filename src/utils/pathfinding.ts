/**
 * A* pathfinding algorithm for routing connection lines around obstacles
 */

import type { Point, Rect, ConnectionSide } from "./connections.js";

interface Node {
	x: number;
	y: number;
	g: number; // Cost from start
	h: number; // Heuristic cost to goal
	f: number; // Total cost (g + h)
	parent: Node | null;
}

/**
 * Manhattan distance heuristic
 */
function heuristic(a: Point, b: Point): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Check if a line segment intersects with a rectangle
 */
function lineIntersectsRect(p1: Point, p2: Point, rect: Rect): boolean {
	// Check if either endpoint is inside the rectangle
	if (
		(p1.x >= rect.x &&
			p1.x <= rect.x + rect.width &&
			p1.y >= rect.y &&
			p1.y <= rect.y + rect.height) ||
		(p2.x >= rect.x &&
			p2.x <= rect.x + rect.width &&
			p2.y >= rect.y &&
			p2.y <= rect.y + rect.height)
	) {
		return true;
	}

	// Check if line intersects any of the four edges
	return (
		lineIntersectsLine(
			p1,
			p2,
			{ x: rect.x, y: rect.y },
			{ x: rect.x + rect.width, y: rect.y }
		) ||
		lineIntersectsLine(
			p1,
			p2,
			{ x: rect.x + rect.width, y: rect.y },
			{ x: rect.x + rect.width, y: rect.y + rect.height }
		) ||
		lineIntersectsLine(
			p1,
			p2,
			{ x: rect.x + rect.width, y: rect.y + rect.height },
			{ x: rect.x, y: rect.y + rect.height }
		) ||
		lineIntersectsLine(p1, p2, { x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y })
	);
}

/**
 * Check if two line segments intersect
 */
function lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
	const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
	if (d === 0) return false;

	const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
	const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

	return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Generate waypoints around obstacles for smooth routing
 */
export function generateWaypoints(
	start: Point,
	end: Point,
	obstacles: Rect[],
	padding: number = 20
): Point[] {
	// If direct path is clear, return it
	const directPathClear = obstacles.every(
		(obstacle) => !lineIntersectsRect(start, end, obstacle)
	);

	if (directPathClear) {
		return [start, end];
	}

	// Generate potential waypoints around each obstacle
	const waypoints: Point[] = [start];

	for (const obstacle of obstacles) {
		// Add corner points with padding
		const corners = [
			{ x: obstacle.x - padding, y: obstacle.y - padding }, // Top-left
			{ x: obstacle.x + obstacle.width + padding, y: obstacle.y - padding }, // Top-right
			{ x: obstacle.x + obstacle.width + padding, y: obstacle.y + obstacle.height + padding }, // Bottom-right
			{ x: obstacle.x - padding, y: obstacle.y + obstacle.height + padding }, // Bottom-left
		];
		waypoints.push(...corners);
	}

	waypoints.push(end);

	// Use A* to find shortest path through waypoints
	return findPath(start, end, waypoints, obstacles);
}

/**
 * A* pathfinding through waypoints
 */
function findPath(start: Point, end: Point, waypoints: Point[], obstacles: Rect[]): Point[] {
	const openSet: Node[] = [];
	const closedSet: Set<string> = new Set();

	const startNode: Node = {
		x: start.x,
		y: start.y,
		g: 0,
		h: heuristic(start, end),
		f: heuristic(start, end),
		parent: null,
	};

	openSet.push(startNode);

	while (openSet.length > 0) {
		// Find node with lowest f score
		openSet.sort((a, b) => a.f - b.f);
		const current = openSet.shift()!;

		const key = `${current.x},${current.y}`;
		if (closedSet.has(key)) continue;
		closedSet.add(key);

		// Check if we reached the goal
		if (Math.abs(current.x - end.x) < 1 && Math.abs(current.y - end.y) < 1) {
			// Reconstruct path
			const path: Point[] = [];
			let node: Node | null = current;
			while (node) {
				path.unshift({ x: node.x, y: node.y });
				node = node.parent;
			}
			return simplifyPath(path);
		}

		// Check all waypoints as neighbors
		for (const waypoint of waypoints) {
			const waypointKey = `${waypoint.x},${waypoint.y}`;
			if (closedSet.has(waypointKey)) continue;

			// Check if path to this waypoint is clear
			const pathClear = obstacles.every(
				(obstacle) =>
					!lineIntersectsRect({ x: current.x, y: current.y }, waypoint, obstacle)
			);

			if (!pathClear) continue;

			const g = current.g + heuristic({ x: current.x, y: current.y }, waypoint);
			const h = heuristic(waypoint, end);
			const f = g + h;

			// Check if this waypoint is already in openSet with a better score
			const existing = openSet.find((n) => n.x === waypoint.x && n.y === waypoint.y);
			if (existing && existing.f <= f) continue;

			const neighborNode: Node = {
				x: waypoint.x,
				y: waypoint.y,
				g,
				h,
				f,
				parent: current,
			};

			openSet.push(neighborNode);
		}
	}

	// No path found, return direct line
	return [start, end];
}

/**
 * Simplify path by removing unnecessary intermediate points
 */
function simplifyPath(path: Point[]): Point[] {
	if (path.length <= 2) return path;

	const simplified: Point[] = [path[0]];

	for (let i = 1; i < path.length - 1; i++) {
		const prev = simplified[simplified.length - 1];
		const current = path[i];
		const next = path[i + 1];

		// Check if current point is necessary (not collinear)
		const dx1 = current.x - prev.x;
		const dy1 = current.y - prev.y;
		const dx2 = next.x - current.x;
		const dy2 = next.y - current.y;

		// If not collinear, keep the point
		if (Math.abs(dx1 * dy2 - dy1 * dx2) > 0.1) {
			simplified.push(current);
		}
	}

	simplified.push(path[path.length - 1]);
	return simplified;
}

/**
 * Generate orthogonal (90-degree only) waypoints around obstacles
 * Routes using only horizontal and vertical line segments
 * Exits perpendicular from connection points
 */
export function generateOrthogonalWaypoints(
	start: Point,
	end: Point,
	obstacles: Rect[],
	padding: number = 20,
	startSide?: ConnectionSide,
	endSide?: ConnectionSide
): Point[] {
	// Calculate perpendicular exit/entry points
	const exitDistance = padding * 2; // Distance to extend perpendicular from connection point

	// Start point with perpendicular exit
	let actualStart = start;
	if (startSide) {
		switch (startSide) {
			case "top":
				actualStart = { x: start.x, y: start.y - exitDistance };
				break;
			case "bottom":
				actualStart = { x: start.x, y: start.y + exitDistance };
				break;
			case "left":
				actualStart = { x: start.x - exitDistance, y: start.y };
				break;
			case "right":
				actualStart = { x: start.x + exitDistance, y: start.y };
				break;
		}
	}

	// End point with perpendicular entry
	let actualEnd = end;
	if (endSide) {
		switch (endSide) {
			case "top":
				actualEnd = { x: end.x, y: end.y - exitDistance };
				break;
			case "bottom":
				actualEnd = { x: end.x, y: end.y + exitDistance };
				break;
			case "left":
				actualEnd = { x: end.x - exitDistance, y: end.y };
				break;
			case "right":
				actualEnd = { x: end.x + exitDistance, y: end.y };
				break;
		}
	}

	// Check if direct orthogonal path (H then V or V then H) is clear
	const hThenV = [actualStart, { x: actualEnd.x, y: actualStart.y }, actualEnd];
	const vThenH = [actualStart, { x: actualStart.x, y: actualEnd.y }, actualEnd];

	const hThenVClear = checkOrthogonalPath(hThenV, obstacles);
	const vThenHClear = checkOrthogonalPath(vThenH, obstacles);

	if (hThenVClear && vThenHClear) {
		// Both work, choose shorter
		const hDist = Math.abs(actualEnd.x - actualStart.x) + Math.abs(actualEnd.y - actualStart.y);
		const path = hDist < vThenH.length ? hThenV : vThenH;
		// Add back the original start/end points
		return [start, ...path.slice(1, -1), end];
	} else if (hThenVClear) {
		return [start, ...hThenV.slice(1, -1), end];
	} else if (vThenHClear) {
		return [start, ...vThenH.slice(1, -1), end];
	}

	// Need to route around obstacles - generate orthogonal waypoints
	const waypoints: Point[] = [];

	for (const obstacle of obstacles) {
		// Add orthogonal corner points with padding
		const left = obstacle.x - padding;
		const right = obstacle.x + obstacle.width + padding;
		const top = obstacle.y - padding;
		const bottom = obstacle.y + obstacle.height + padding;

		// Add edge points for orthogonal routing
		waypoints.push(
			{ x: left, y: top },
			{ x: right, y: top },
			{ x: right, y: bottom },
			{ x: left, y: bottom },
			// Add midpoints for better routing
			{ x: left, y: actualStart.y },
			{ x: right, y: actualStart.y },
			{ x: actualStart.x, y: top },
			{ x: actualStart.x, y: bottom },
			{ x: left, y: actualEnd.y },
			{ x: right, y: actualEnd.y },
			{ x: actualEnd.x, y: top },
			{ x: actualEnd.x, y: bottom }
		);
	}

	// Find orthogonal path using A* with orthogonal constraint
	const path = findOrthogonalPath(actualStart, actualEnd, waypoints, obstacles);

	// Add back the original start/end points
	return [start, ...path.slice(1, -1), end];
}

/**
 * Check if an orthogonal path is clear of obstacles
 */
function checkOrthogonalPath(path: Point[], obstacles: Rect[]): boolean {
	for (let i = 0; i < path.length - 1; i++) {
		if (!obstacles.every((obs) => !lineIntersectsRect(path[i], path[i + 1], obs))) {
			return false;
		}
	}
	return true;
}

/**
 * A* pathfinding with orthogonal constraint (only horizontal/vertical moves)
 */
function findOrthogonalPath(
	start: Point,
	end: Point,
	waypoints: Point[],
	obstacles: Rect[]
): Point[] {
	const allPoints = [start, ...waypoints, end];
	const openSet: Node[] = [];
	const closedSet: Set<string> = new Set();

	const startNode: Node = {
		x: start.x,
		y: start.y,
		g: 0,
		h: heuristic(start, end),
		f: heuristic(start, end),
		parent: null,
	};

	openSet.push(startNode);

	while (openSet.length > 0) {
		openSet.sort((a, b) => a.f - b.f);
		const current = openSet.shift()!;

		const key = `${current.x},${current.y}`;
		if (closedSet.has(key)) continue;
		closedSet.add(key);

		if (Math.abs(current.x - end.x) < 1 && Math.abs(current.y - end.y) < 1) {
			// Reconstruct path
			const path: Point[] = [];
			let node: Node | null = current;
			while (node) {
				path.unshift({ x: node.x, y: node.y });
				node = node.parent;
			}
			return simplifyOrthogonalPath(path);
		}

		// Only consider neighbors that create orthogonal paths
		for (const neighbor of allPoints) {
			const neighborKey = `${neighbor.x},${neighbor.y}`;
			if (closedSet.has(neighborKey)) continue;

			// Only allow horizontal or vertical moves
			const isOrthogonal =
				(Math.abs(neighbor.x - current.x) > 0.1 &&
					Math.abs(neighbor.y - current.y) < 0.1) ||
				(Math.abs(neighbor.y - current.y) > 0.1 && Math.abs(neighbor.x - current.x) < 0.1);

			if (!isOrthogonal) continue;

			// Check if path to neighbor is clear
			if (!obstacles.every((obs) => !lineIntersectsRect(current, neighbor, obs))) {
				continue;
			}

			const g =
				current.g + Math.abs(neighbor.x - current.x) + Math.abs(neighbor.y - current.y);
			const h = heuristic(neighbor, end);
			const f = g + h;

			const existing = openSet.find(
				(n) => Math.abs(n.x - neighbor.x) < 1 && Math.abs(n.y - neighbor.y) < 1
			);
			if (existing && existing.g <= g) continue;

			openSet.push({
				x: neighbor.x,
				y: neighbor.y,
				g,
				h,
				f,
				parent: current,
			});
		}
	}

	// Fallback to direct orthogonal path
	return [start, { x: end.x, y: start.y }, end];
}

/**
 * Simplify orthogonal path by removing redundant points
 */
function simplifyOrthogonalPath(path: Point[]): Point[] {
	if (path.length <= 2) return path;

	const simplified: Point[] = [path[0]];

	for (let i = 1; i < path.length - 1; i++) {
		const prev = simplified[simplified.length - 1];
		const current = path[i];
		const next = path[i + 1];

		// Keep point if it changes direction
		const horizontalBefore = Math.abs(current.y - prev.y) < 0.1;
		const horizontalAfter = Math.abs(next.y - current.y) < 0.1;

		if (horizontalBefore !== horizontalAfter) {
			simplified.push(current);
		}
	}

	simplified.push(path[path.length - 1]);
	return simplified;
}
