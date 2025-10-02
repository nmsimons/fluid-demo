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
		// Skip invalid items
		if (!item || !item.content) continue;
		flattenItem(item, 0, 0, undefined, result);
	}

	return result;
}

function flattenItem(
	item: Item,
	parentX: number,
	parentY: number,
	parentGroup: Group | undefined,
	result: FlattenedItem[]
): void {
	const content = item.content;
	// Check if this item is a Group
	if (Tree.is(content, Group)) {
		const group = content;

		// Add the group item itself (marked as container - for overlay rendering only)
		// Don't set absoluteX/Y - let ItemView use item.x/y directly for reactivity
		result.push({
			item,
			absoluteX: item.x + parentX,
			absoluteY: item.y + parentY,
			parentGroup: parentGroup,
			isGroupContainer: true,
		});

		// Check if grid view is enabled
		const useGridView = isGroupGridEnabled(group);

		if (useGridView) {
			const config = getGroupGridConfig();
			const adjustment = getGridAlignmentAdjustment(group, config);

			group.items.forEach((childItem, index) => {
				const offset = getGridPositionByIndex(index, config);

				// Use grid position (with alignment adjustment) instead of item's stored x/y
				result.push({
					item: childItem,
					absoluteX: item.x + offset.x + adjustment.x,
					absoluteY: item.y + offset.y + adjustment.y,
					parentGroup: group,
					isGroupContainer: false,
				});
			});
		} else {
			// Normal layout: use item's x/y coordinates
			for (const childItem of group.items) {
				flattenItem(childItem, item.x, item.y, group, result);
			}
		}
	} else {
		// Regular item (Shape, Note, FluidTable)
		result.push({
			item,
			absoluteX: item.x + parentX,
			absoluteY: item.y + parentY,
			parentGroup: parentGroup,
			isGroupContainer: false,
		});
	}
}
