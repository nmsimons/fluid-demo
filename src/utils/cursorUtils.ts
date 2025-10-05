/**
 * Utility functions for collaborative cursor position management
 */

import type { CursorManager } from "../presence/Interfaces/CursorManager.js";

/**
 * Updates the collaborative cursor position based on a pointer event
 * @param event - The pointer or mouse event containing clientX/clientY
 * @param cursorManager - The cursor manager to update
 * @param pan - The current pan offset {x, y}
 * @param zoom - The current zoom level
 * @param canvasElementId - Optional canvas element ID, defaults to "canvas"
 */
export function updateCursorFromEvent(
	event: PointerEvent | MouseEvent | React.PointerEvent | React.MouseEvent,
	cursorManager: CursorManager | undefined,
	pan: { x: number; y: number },
	zoom: number,
	canvasElementId: string = "canvas"
): void {
	if (!cursorManager) return;

	const svgElement = document.getElementById(canvasElementId);
	if (!svgElement) return;

	const rect = svgElement.getBoundingClientRect();
	const canvasX = event.clientX - rect.left;
	const canvasY = event.clientY - rect.top;

	// Convert to logical coordinates (accounting for pan and zoom)
	const logicalX = (canvasX - pan.x) / zoom;
	const logicalY = (canvasY - pan.y) / zoom;

	cursorManager.setCursorPosition(logicalX, logicalY);
}
