import { Tree } from "fluid-framework";

import { Group, Item, Items } from "../schema/appSchema.js";

function findItemRecursive(items: Items, predicate: (item: Item) => boolean): Item | undefined {
	for (const node of items) {
		if (Tree.is(node.content, Group)) {
			const match = findItemRecursive(node.content.items, predicate);
			if (match !== undefined) {
				return match;
			}
		} else {
			return node;
		}
	}

	return undefined;
}

function collectAllItems(items: Items, results: Item[]): void {
	for (const node of items) {
		if (Tree.is(node.content, Group)) {
			collectAllItems(node.content.items, results);
		} else {
			results.push(node);
		}
	}
}

export function findItemById(items: Items, id: string): Item | undefined {
	return findItemRecursive(items, (item) => item.id === id);
}

export function findItemsByIds(items: Items, ids: string[]): Item[] {
	return ids
		.map((id) => findItemById(items, id))
		.filter((item): item is Item => item !== undefined);
}

export function getAllItems(items: Items): Item[] {
	const allItems: Item[] = [];
	collectAllItems(items, allItems);
	return allItems;
}
