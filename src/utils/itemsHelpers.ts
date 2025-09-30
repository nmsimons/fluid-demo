import { Tree } from "fluid-framework";

import { Group, Item, Items, Vote } from "../schema/appSchema.js";

function findItemRecursive(items: Items, predicate: (item: Item) => boolean): Item | undefined {
	for (const node of items) {
		if (predicate(node)) {
			return node;
		}

		if (Tree.is(node.content, Group)) {
			const match = findItemRecursive(node.content.items, predicate);
			if (match !== undefined) {
				return match;
			}
		}
	}

	return undefined;
}

function collectAllItems(items: Items, results: Item[]): void {
	for (const node of items) {
		results.push(node);

		if (Tree.is(node.content, Group)) {
			collectAllItems(node.content.items, results);
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

function getParentItems(item: Item): Items | undefined {
	const parent = Tree.parent(item);
	if (Tree.is(parent, Items)) {
		return parent;
	}
	return undefined;
}

export function canGroupItems(items: Item[]): boolean {
	if (items.length <= 1) {
		return false;
	}
	const parent = getParentItems(items[0]);
	if (parent === undefined) {
		return false;
	}
	for (const item of items) {
		if (getParentItems(item) !== parent) {
			return false;
		}
	}
	return true;
}

export function groupItems(items: Item[]): Item | undefined {
	if (!canGroupItems(items)) {
		return undefined;
	}
	const parent = getParentItems(items[0]);
	if (parent === undefined) {
		return undefined;
	}
	const indices = items.map((item) => parent.indexOf(item));
	if (indices.some((index) => index < 0)) {
		return undefined;
	}
	const sorted = [...items].sort((a, b) => parent.indexOf(a) - parent.indexOf(b));
	const minX = Math.min(...sorted.map((item) => item.x));
	const minY = Math.min(...sorted.map((item) => item.y));
	const targetIndex = Math.min(...indices);
	let createdGroup: Item | undefined;
	Tree.runTransaction(parent, () => {
		const groupContent = new Group({ id: crypto.randomUUID(), items: new Items([]) });
		const groupItem = new Item({
			id: crypto.randomUUID(),
			x: minX,
			y: minY,
			rotation: 0,
			comments: [],
			votes: new Vote({ votes: [] }),
			content: groupContent,
		});
		parent.insertAtEnd(groupItem);
		if (targetIndex >= 0 && targetIndex < parent.length - 1) {
			parent.moveToIndex(parent.length - 1, targetIndex);
		}
		for (const item of sorted) {
			const currentIndex = parent.indexOf(item);
			if (currentIndex === -1) {
				continue;
			}
			item.x = item.x - minX;
			item.y = item.y - minY;
			groupContent.moveIn(currentIndex, parent);
		}
		createdGroup = groupItem;
	});
	return createdGroup;
}
