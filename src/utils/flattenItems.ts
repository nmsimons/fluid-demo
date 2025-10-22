import { Tree } from "@fluidframework/tree";
import { Item, Items, Group } from "../schema/appSchema.js";
import {
	getGroupGridConfig,
	getGridPositionByIndex,
	getGridAlignmentAdjustment,
	isGroupGridEnabled,
} from "../react/layout/groupGrid.js";

export interface FlattenedItem {
	item: Item;
	absoluteX?: number; // Only set for items inside groups
	absoluteY?: number; // Only set for items inside groups
	parentGroup?: Group;
	isGroupContainer?: boolean; // Flag for the group item itself (not to be rendered as content)
}

/**
 * Flattens a hierarchical Items collection into a flat array where:
 * - Top-level items use their own x, y coordinates
 * - Items inside groups have their positions calculated as: group.x + item.x, group.y + item.y
 * - Group container items are marked with isGroupContainer=true (for overlay rendering only)
 *
 * This allows all items to be rendered on the main canvas with absolute positioning.
 */
export function flattenItems(items: Items): FlattenedItem[] {
	const result: FlattenedItem[] = [];

	for (const item of items) {
		if (!item || !item.content) continue;
		flattenItem(item, 0, 0, undefined, result);
	}

	return result;
}

function flattenItem(
	item: Item,
	parentOriginX: number,
	parentOriginY: number,
	parentGroup: Group | undefined,
	result: FlattenedItem[],
	absoluteOverride?: { x: number; y: number }
): void {
	const content = item.content;
	const absoluteX = absoluteOverride ? absoluteOverride.x : parentOriginX + item.x;
	const absoluteY = absoluteOverride ? absoluteOverride.y : parentOriginY + item.y;

	if (Tree.is(content, Group)) {
		const group = content;

		// Add the group container entry (not rendered directly, used for overlays/selection)
		result.push({
			item,
			absoluteX,
			absoluteY,
			parentGroup,
			isGroupContainer: true,
		});

		const groupOriginX = absoluteX;
		const groupOriginY = absoluteY;

		if (isGroupGridEnabled(group)) {
			const config = getGroupGridConfig(group);
			const adjustment = getGridAlignmentAdjustment(group, config);

			group.items.forEach((childItem, index) => {
				const offset = getGridPositionByIndex(index, config);
				const childAbsoluteX = groupOriginX + offset.x + adjustment.x;
				const childAbsoluteY = groupOriginY + offset.y + adjustment.y;
				flattenItem(childItem, groupOriginX, groupOriginY, group, result, {
					x: childAbsoluteX,
					y: childAbsoluteY,
				});
			});
		} else {
			for (const childItem of group.items) {
				flattenItem(childItem, groupOriginX, groupOriginY, group, result);
			}
		}
		return;
	}

	result.push({
		item,
		absoluteX,
		absoluteY,
		parentGroup,
		isGroupContainer: false,
	});
}
