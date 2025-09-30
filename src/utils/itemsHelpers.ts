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

export function canAddToGroup(items: Item[]): { canAdd: boolean; targetGroup?: Item } {
	if (items.length <= 1) {
		return { canAdd: false };
	}

	// Separate items into those in groups and those not in groups
	const itemsInGroups: Item[] = [];
	const itemsNotInGroups: Item[] = [];
	let commonGroupItem: Item | undefined;

	for (const item of items) {
		const parent = getParentItems(item);
		if (parent === undefined) {
			return { canAdd: false };
		}

		const grandParent = Tree.parent(parent);
		if (grandParent !== undefined && Tree.is(grandParent, Group)) {
			// Item is in a group
			const groupItem = Tree.parent(grandParent);
			if (groupItem !== undefined && Tree.is(groupItem, Item)) {
				if (commonGroupItem === undefined) {
					commonGroupItem = groupItem;
				} else if (commonGroupItem !== groupItem) {
					// Items are in different groups
					return { canAdd: false };
				}
				itemsInGroups.push(item);
			}
		} else {
			// Item is not in a group
			itemsNotInGroups.push(item);
		}
	}

	// We can add to group if:
	// 1. We have at least one item in a group
	// 2. We have at least one item not in a group
	// 3. All items in groups are in the same group
	// 4. All items not in groups share the same parent as the group
	if (itemsInGroups.length > 0 && itemsNotInGroups.length > 0 && commonGroupItem !== undefined) {
		// Check that ungrouped items share the same parent as the group
		const groupParent = getParentItems(commonGroupItem);
		if (groupParent === undefined) {
			return { canAdd: false };
		}

		for (const item of itemsNotInGroups) {
			if (getParentItems(item) !== groupParent) {
				return { canAdd: false };
			}
		}

		return { canAdd: true, targetGroup: commonGroupItem };
	}

	return { canAdd: false };
}

export function addToGroup(items: Item[], targetGroup: Item): void {
	if (!Tree.is(targetGroup.content, Group)) {
		return;
	}

	const groupContent = targetGroup.content;
	const groupItems = groupContent.items;

	// Get the root Items array (parent of the group)
	const rootItems = getParentItems(targetGroup);
	if (rootItems === undefined) {
		return;
	}

	// Filter to only items not already in the group
	const itemsToAdd = items.filter((item) => {
		const parent = getParentItems(item);
		return parent === rootItems; // Only add items from root level
	});

	if (itemsToAdd.length === 0) {
		return;
	}

	// Get the group's position for coordinate conversion
	const groupX = targetGroup.x;
	const groupY = targetGroup.y;

	Tree.runTransaction(rootItems, () => {
		for (const item of itemsToAdd) {
			const currentIndex = rootItems.indexOf(item);
			if (currentIndex === -1) {
				continue;
			}
			// Convert from absolute (canvas) to relative (group-local) coordinates
			item.x = item.x - groupX;
			item.y = item.y - groupY;
			// Move item from root to group
			groupItems.moveToEnd(currentIndex, rootItems);
		}
	});
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

	// Check if any item is already in a group (parent's parent is a Group)
	const grandParent = Tree.parent(parent);
	if (grandParent !== undefined && Tree.is(grandParent, Group)) {
		return false;
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

export function canUngroupItems(items: Item[]): boolean {
	if (items.length === 0) {
		return false;
	}

	// All items must be in the same group
	const parent = getParentItems(items[0]);
	if (parent === undefined) {
		return false;
	}

	// Check that the parent is a Group
	const grandParent = Tree.parent(parent);
	if (grandParent === undefined || !Tree.is(grandParent, Group)) {
		return false;
	}

	// All items must have the same parent
	for (const item of items) {
		if (getParentItems(item) !== parent) {
			return false;
		}
	}

	return true;
}

export function ungroupItems(items: Item[]): void {
	if (!canUngroupItems(items)) {
		return;
	}

	const parent = getParentItems(items[0]);
	if (parent === undefined) {
		return;
	}

	// Get the group container item
	const grandParent = Tree.parent(parent);
	if (grandParent === undefined || !Tree.is(grandParent, Group)) {
		return;
	}

	const groupItem = Tree.parent(grandParent);
	if (groupItem === undefined || !Tree.is(groupItem, Item)) {
		return;
	}

	// Get the root Items array (grandparent of the group item)
	const rootItems = getParentItems(groupItem);
	if (rootItems === undefined) {
		return;
	}

	// Sort items by their current index to maintain order
	const sorted = [...items].sort((a, b) => parent.indexOf(a) - parent.indexOf(b));

	// Get the group's position
	const groupX = groupItem.x;
	const groupY = groupItem.y;

	// Find where to insert items (at the group's position)
	const groupIndex = rootItems.indexOf(groupItem);
	if (groupIndex === -1) {
		return;
	}

	Tree.runTransaction(rootItems, () => {
		// Move items from group to root, converting coordinates to absolute
		for (const item of sorted) {
			const currentIndex = parent.indexOf(item);
			if (currentIndex === -1) {
				continue;
			}
			// Convert from relative (group-local) to absolute (canvas) coordinates
			item.x = item.x + groupX;
			item.y = item.y + groupY;
			// Move item from group to root Items array at the end
			rootItems.moveToEnd(currentIndex, parent);
		}

		// If the group is now empty, remove it
		if (parent.length === 0) {
			const currentGroupIndex = rootItems.indexOf(groupItem);
			if (currentGroupIndex !== -1) {
				rootItems.removeAt(currentGroupIndex);
			}
		}
	});
}
