/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Coordinate transformation utilities for canvas space conversions.
 *
 * Coordinate Spaces:
 * - Client: Raw pointer coordinates (e.g., clientX, clientY from events)
 * - Screen: Coordinates relative to SVG element bounds
 * - Logical: Pan/zoom transformed coordinates used for content persistence
 *
 * Formula: logical = (screen - pan) / zoom
 */

/**
 * Converts client coordinates to logical content coordinates.
 *
 * @param clientX - X coordinate in client space (from event.clientX)
 * @param clientY - Y coordinate in client space (from event.clientY)
 * @param svgElement - The SVG element to get bounds from
 * @param pan - Current pan offset {x, y}
 * @param zoom - Current zoom level
 * @returns Logical coordinates {x, y}
 */
export function clientToLogical(
	clientX: number,
	clientY: number,
	svgElement: SVGSVGElement | null,
	pan: { x: number; y: number },
	zoom: number
): { x: number; y: number } {
	const rect = svgElement?.getBoundingClientRect();
	if (!rect) return { x: 0, y: 0 };
	const sx = clientX - rect.left;
	const sy = clientY - rect.top;
	return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
}

/**
 * Converts logical content coordinates to screen coordinates.
 *
 * @param logicalX - X coordinate in logical space
 * @param logicalY - Y coordinate in logical space
 * @param pan - Current pan offset {x, y}
 * @param zoom - Current zoom level
 * @returns Screen coordinates {x, y} relative to SVG element
 */
export function logicalToScreen(
	logicalX: number,
	logicalY: number,
	pan: { x: number; y: number },
	zoom: number
): { x: number; y: number } {
	return {
		x: logicalX * zoom + pan.x,
		y: logicalY * zoom + pan.y,
	};
}

/**
 * Converts screen coordinates to client coordinates.
 *
 * @param screenX - X coordinate in screen space (relative to SVG)
 * @param screenY - Y coordinate in screen space (relative to SVG)
 * @param svgElement - The SVG element to get bounds from
 * @returns Client coordinates {x, y}
 */
export function screenToClient(
	screenX: number,
	screenY: number,
	svgElement: SVGSVGElement | null
): { x: number; y: number } {
	const rect = svgElement?.getBoundingClientRect();
	if (!rect) return { x: screenX, y: screenY };
	return {
		x: screenX + rect.left,
		y: screenY + rect.top,
	};
}
