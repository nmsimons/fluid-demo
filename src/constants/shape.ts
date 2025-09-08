// Single source of truth for shape sizing
// Original max was 120; previously expanded to 480; now increased to 1200 for larger canvases.
// Adjust here if product requirements change.
export const SHAPE_MIN_SIZE = 20;
export const SHAPE_MAX_SIZE = 1200; // 10x original 120

export function clampShapeSize(size: number): number {
	return Math.max(SHAPE_MIN_SIZE, Math.min(SHAPE_MAX_SIZE, size));
}
