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
	// Calculate all possible side combinations and their direct distances
	const sides: ConnectionSide[] = ["top", "right", "bottom", "left"];
	let bestDistance = Infinity;
	let bestFromSide: ConnectionSide = "right";
	let bestToSide: ConnectionSide = "left";

	for (const fromSide of sides) {
		for (const toSide of sides) {
			const fromPoint = getConnectionPoint(from, fromSide);
			const toPoint = getConnectionPoint(to, toSide);

			// Calculate Manhattan distance (since we use orthogonal routing)
			const distance = Math.abs(toPoint.x - fromPoint.x) + Math.abs(toPoint.y - fromPoint.y);

			// Prefer connections where sides face each other (opposite sides)
			// Give a bonus to opposite-facing sides
			const areOpposite = toSide === getOppositeSide(fromSide);
			const adjustedDistance = areOpposite ? distance * 0.8 : distance;

			if (adjustedDistance < bestDistance) {
				bestDistance = adjustedDistance;
				bestFromSide = fromSide;
				bestToSide = toSide;
			}
		}
	}

	return [bestFromSide, bestToSide];
}

/**
 * Adjust connection side to avoid parallel routing
 * If the next waypoint would create a line parallel to the edge, move to nearest corner side
 */
export function adjustSideForOrthogonalRouting(
	rect: Rect,
	side: ConnectionSide,
	nextPoint: Point
): ConnectionSide {
	const connectionPoint = getConnectionPoint(rect, side);

	// Determine if the next segment would be parallel to the edge
	const dx = nextPoint.x - connectionPoint.x;
	const dy = nextPoint.y - connectionPoint.y;

	// For top/bottom edges, check if line goes horizontally (parallel)
	if ((side === "top" || side === "bottom") && Math.abs(dy) < Math.abs(dx)) {
		// Line is horizontal, should exit from left/right instead
		// Choose left or right based on which direction we're going
		if (dx > 0) {
			// Going right, use right side if it's closer to the target
			return "right";
		} else {
			// Going left, use left side
			return "left";
		}
	}

	// For left/right edges, check if line goes vertically (parallel)
	if ((side === "left" || side === "right") && Math.abs(dx) < Math.abs(dy)) {
		// Line is vertical, should exit from top/bottom instead
		// Choose top or bottom based on which direction we're going
		if (dy > 0) {
			// Going down, use bottom side
			return "bottom";
		} else {
			// Going up, use top side
			return "top";
		}
	}

	// No adjustment needed
	return side;
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
