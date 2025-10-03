/**
 * Utilities for calculating connection points and routing between items
 */

export type ConnectionSide = "top" | "right" | "bottom" | "left";

export interface Point {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Get the position of a connection point on a specific side of a rectangle
 */
export function getConnectionPoint(rect: Rect, side: ConnectionSide): Point {
	switch (side) {
		case "top":
			return { x: rect.x + rect.width / 2, y: rect.y };
		case "right":
			return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
		case "bottom":
			return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
		case "left":
			return { x: rect.x, y: rect.y + rect.height / 2 };
	}
}

/**
 * Calculate which side of the source rectangle is closest to the target rectangle
 */
export function getClosestSide(source: Rect, target: Rect): ConnectionSide {
	const sourceCenterX = source.x + source.width / 2;
	const sourceCenterY = source.y + source.height / 2;
	const targetCenterX = target.x + target.width / 2;
	const targetCenterY = target.y + target.height / 2;

	const dx = targetCenterX - sourceCenterX;
	const dy = targetCenterY - sourceCenterY;

	// Determine which direction is strongest
	if (Math.abs(dx) > Math.abs(dy)) {
		// Horizontal is dominant
		return dx > 0 ? "right" : "left";
	} else {
		// Vertical is dominant
		return dy > 0 ? "bottom" : "top";
	}
}

/**
 * Get the opposite side
 */
export function getOppositeSide(side: ConnectionSide): ConnectionSide {
	switch (side) {
		case "top":
			return "bottom";
		case "right":
			return "left";
		case "bottom":
			return "top";
		case "left":
			return "right";
	}
}

/**
 * Calculate the best connection points between two rectangles
 * Returns [fromSide, toSide]
 */
export function calculateConnectionSides(from: Rect, to: Rect): [ConnectionSide, ConnectionSide] {
	const fromSide = getClosestSide(from, to);
	const toSide = getOppositeSide(fromSide);
	return [fromSide, toSide];
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.width &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.height
	);
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
	return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Expand a rectangle by a padding amount
 */
export function expandRect(rect: Rect, padding: number): Rect {
	return {
		x: rect.x - padding,
		y: rect.y - padding,
		width: rect.width + padding * 2,
		height: rect.height + padding * 2,
	};
}
