import { TEXT_DEFAULT_WIDTH, TEXT_MAX_WIDTH, TEXT_MIN_WIDTH } from "../constants/text.js";

export function clampTextWidth(width: number | undefined | null): number {
	if (width === null || width === undefined || !Number.isFinite(width)) {
		return TEXT_DEFAULT_WIDTH;
	}
	const normalized = Number(width);
	return Math.min(Math.max(normalized, TEXT_MIN_WIDTH), TEXT_MAX_WIDTH);
}
