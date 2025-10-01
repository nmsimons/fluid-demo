import { Tree } from "@fluidframework/tree";
import { Item, Items, Group } from "../schema/appSchema.js";

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

		// Add all child items with adjusted positions
		for (const childItem of group.items) {
			flattenItem(childItem, item.x, item.y, group, result);
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
