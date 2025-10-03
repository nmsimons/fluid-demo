/**
 * A* pathfinding algorithm for routing connection lines around obstacles
 */

import type { Point, Rect } from "./connections.js";

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
