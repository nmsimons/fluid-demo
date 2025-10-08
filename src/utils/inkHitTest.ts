/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { InkStroke, InkPoint } from "../schema/appSchema.js";

/**
 * Tests if a point intersects with an ink stroke using line-segment distance calculation.
 *
 * @param stroke - The ink stroke to test
 * @param point - The point in logical coordinates
 * @param radius - The test radius in logical coordinates (e.g., eraser radius / zoom)
 * @returns true if the point intersects the stroke within the given radius
 */
export function testInkStrokeHit(
	stroke: InkStroke,
	point: { x: number; y: number },
	radius: number
): boolean {
	const bb = stroke.bbox;
	if (!bb) return false;

	// Quick bbox check first
	if (
		point.x < bb.x - radius ||
		point.x > bb.x + bb.w + radius ||
		point.y < bb.y - radius ||
		point.y > bb.y + bb.h + radius
	) {
		return false;
	}

	const pts = Array.from(stroke.simplified ?? stroke.points) as InkPoint[];
	const strokeHalf = (stroke.style?.strokeWidth ?? 4) / 2;
	const maxDist = strokeHalf + radius;
	const maxDist2 = maxDist * maxDist;

	// Test each line segment
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len2 = dx * dx + dy * dy;

		// Find closest point on line segment to test point
		let t = 0;
		if (len2 > 0) {
			const proj = (point.x - a.x) * dx + (point.y - a.y) * dy;
			t = Math.max(0, Math.min(1, proj / len2));
		}

		const cx = a.x + dx * t;
		const cy = a.y + dy * t;
		const ddx = point.x - cx;
		const ddy = point.y - cy;

		if (ddx * ddx + ddy * ddy <= maxDist2) {
			return true;
		}
	}

	return false;
}

/**
 * Finds the first ink stroke that intersects with a point.
 *
 * @param strokes - Iterable of ink strokes to test
 * @param point - The point in logical coordinates
 * @param radius - The test radius in logical coordinates
 * @returns The first intersecting stroke, or undefined if none found
 */
export function findInkStrokeHit(
	strokes: Iterable<InkStroke>,
	point: { x: number; y: number },
	radius: number
): InkStroke | undefined {
	for (const stroke of strokes) {
		if (testInkStrokeHit(stroke, point, radius)) {
			return stroke;
		}
	}
	return undefined;
}
