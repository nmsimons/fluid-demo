/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { Tree } from "fluid-framework";
import { Group, Item, Items } from "../schema/appSchema.js";

/**
 * Utility functions for working with nested Items arrays
 */

/**
 * Check if an element from an Items array is an Item (not a nested Items array)
 */
export function isItem(element: Item | Group): element is Item {
	return Tree.is(element, Item);
}

/**
 * Check if an element from an Items array is a nested Items array (not an Item)
 */
export function isGroup(element: Item | Group): element is Group {
	return Tree.is(element, Group);
}

/**
 * Flatten a nested Items structure into a flat array of Items
 * @param items The Items array (potentially containing nested Items)
 * @returns A flat array of all Item objects
 */
export function flattenItems(items: Items): Item[] {
	const result: Item[] = [];

	for (const element of items) {
		if (isItem(element)) {
			result.push(element);
		} else if (isGroup(element)) {
			// Recursively flatten nested Items arrays
			result.push(...flattenItems(element.items));
		}
	}

	return result;
}

/**
 * Find an item by ID in a nested Items structure
 * @param items The Items array to search in
 * @param id The ID to search for
 * @returns The Item with the given ID, or undefined if not found
 */
export function findItemById(items: Items, id: string): Item | undefined {
	for (const element of items) {
		if (isItem(element)) {
			if (element.id === id) {
				return element;
			}
		} else if (isGroup(element)) {
			// Recursively search in nested Items arrays
			const found = findItemById(element.items, id);
			if (found) {
				return found;
			}
		}
	}
	return undefined;
}

/**
 * Get all Items (flattened) from a nested Items structure
 * This is a convenience function that's the same as flattenItems but with a clearer name
 */
export function getAllItems(items: Items): Item[] {
	return flattenItems(items);
}

/**
 * Find multiple items by their IDs
 * @param items The Items array to search in
 * @param ids Array of IDs to search for
 * @returns Array of Items that were found (undefined items are filtered out)
 */
export function findItemsByIds(items: Items, ids: string[]): Item[] {
	return ids
		.map((id) => findItemById(items, id))
		.filter((item): item is Item => item !== undefined);
}
