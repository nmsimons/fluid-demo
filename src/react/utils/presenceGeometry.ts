import type React from "react";
import { Tree } from "fluid-framework";
import { FluidTable, Group, Item } from "../../schema/appSchema.js";
import { getGridOffsetForChild, isGroupGridEnabled } from "../layout/groupGrid.js";
import { getActiveDragForItem } from "./dragUtils.js";
import { PresenceContext } from "../contexts/PresenceContext.js";

export type PresenceValue = React.ContextType<typeof PresenceContext>;

export interface LayoutRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface GroupHierarchyInfo {
	group: Group;
	groupItem: Item;
}

export interface ItemTransformResult {
	left: number;
	top: number;
	width: number;
	height: number;
	angle: number;
	layoutBounds: LayoutRect | null;
	parentGroupInfo: GroupHierarchyInfo | null;
	activeDrag: ReturnType<typeof getActiveDragForItem>;
}

export interface ResolveItemTransformOptions {
	item: Item;
	layout: Map<string, LayoutRect>;
	presence?: PresenceValue;
	includeParentGroupDrag?: boolean;
	parentGroupInfo?: GroupHierarchyInfo | null;
	lockRotationForTables?: boolean;
	lockRotationForGridChildren?: boolean;
}

export interface GroupChildPositionOptions {
	child: Item;
	groupInfo: GroupHierarchyInfo;
	presence?: PresenceValue;
}

export function getItemAbsolutePosition(
	item: Item,
	presence?: PresenceValue,
	visited: Set<string> = new Set()
): { x: number; y: number } {
	if (visited.has(item.id)) {
		return { x: item.x, y: item.y };
	}
	visited.add(item.id);
	const drag = presence ? getActiveDragForItem(presence, item.id) : null;
	if (drag) {
		visited.delete(item.id);
		return { x: drag.x, y: drag.y };
	}
	const parentGroupInfo = getParentGroupInfo(item);
	if (!parentGroupInfo) {
		visited.delete(item.id);
		return { x: item.x, y: item.y };
	}
	const parentPosition = getItemAbsolutePosition(parentGroupInfo.groupItem, presence, visited);
	const offset = getGroupChildOffset(parentGroupInfo.group, item);
	visited.delete(item.id);
	return {
		x: parentPosition.x + offset.x,
		y: parentPosition.y + offset.y,
	};
}

export function getNestedGroupDragOffset(
	item: Item,
	presence: PresenceValue,
	groupDrag: { id: string; x: number; y: number; rotation: number }
): { x: number; y: number } {
	const visited = new Set<string>();
	let current: Item | null = item;
	let accumulatedX = 0;
	let accumulatedY = 0;

	while (current) {
		const parentInfo = getParentGroupInfo(current);
		if (!parentInfo) {
			break;
		}
		if (visited.has(parentInfo.groupItem.id)) {
			break;
		}
		visited.add(parentInfo.groupItem.id);

		const { group, groupItem } = parentInfo;
		const offset = isGroupGridEnabled(group)
			? getGroupChildOffset(group, current)
			: { x: current.x, y: current.y };
		accumulatedX += offset.x;
		accumulatedY += offset.y;

		if (groupItem.id === groupDrag.id) {
			return { x: groupDrag.x + accumulatedX, y: groupDrag.y + accumulatedY };
		}

		const parentDrag = getActiveDragForItem(presence, groupItem.id);
		if (parentDrag) {
			return { x: parentDrag.x + accumulatedX, y: parentDrag.y + accumulatedY };
		}

		current = groupItem;
	}

	const absolute = getItemAbsolutePosition(item, presence);
	return { x: absolute.x, y: absolute.y };
}

export function getParentGroupInfo(item: Item): GroupHierarchyInfo | null {
	const parent = Tree.parent(item);
	if (!parent) {
		return null;
	}
	const grandparent = Tree.parent(parent);
	if (grandparent && Tree.is(grandparent, Group)) {
		const group = grandparent;
		const groupContainer = Tree.parent(group);
		if (groupContainer && Tree.is(groupContainer, Item)) {
			return { group, groupItem: groupContainer };
		}
	}
	return null;
}

export function getGroupActivePosition(
	groupItem: Item,
	presence?: PresenceValue
): { x: number; y: number; drag: ReturnType<typeof getActiveDragForItem> } {
	const drag = presence ? getActiveDragForItem(presence, groupItem.id) : null;
	if (drag) {
		return { x: drag.x, y: drag.y, drag };
	}
	const absolute = getItemAbsolutePosition(groupItem, presence);
	return { x: absolute.x, y: absolute.y, drag };
}

export function getGroupChildOffset(group: Group, child: Item): { x: number; y: number } {
	if (isGroupGridEnabled(group)) {
		const offset = getGridOffsetForChild(group, child);
		if (offset) {
			return offset;
		}
	}
	return { x: child.x, y: child.y };
}

export function getGroupChildAbsolutePosition(options: GroupChildPositionOptions): {
	x: number;
	y: number;
} {
	const drag = options.presence ? getActiveDragForItem(options.presence, options.child.id) : null;
	if (drag) {
		return { x: drag.x, y: drag.y };
	}
	const { groupItem, group } = options.groupInfo;
	const groupPosition = getItemAbsolutePosition(groupItem, options.presence);
	const offset = getGroupChildOffset(group, options.child);
	return { x: groupPosition.x + offset.x, y: groupPosition.y + offset.y };
}

export function getGroupContentBounds(
	groupItem: Item,
	layout: Map<string, LayoutRect>,
	presence?: PresenceValue,
	visited: Set<string> = new Set()
): LayoutRect | null {
	if (!Tree.is(groupItem.content, Group)) {
		return null;
	}

	if (visited.has(groupItem.id)) {
		return null;
	}

	visited.add(groupItem.id);

	const group = groupItem.content as Group;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasAny = false;

	for (const child of group.items) {
		if (Tree.is(child.content, Group)) {
			const nested = getGroupContentBounds(child, layout, presence, visited);
			if (nested) {
				minX = Math.min(minX, nested.left);
				minY = Math.min(minY, nested.top);
				maxX = Math.max(maxX, nested.right);
				maxY = Math.max(maxY, nested.bottom);
				hasAny = true;
			}
			continue;
		}

		const { x, y } = getItemAbsolutePosition(child, presence);
		const bounds = layout.get(child.id);
		const width = bounds ? Math.max(1, bounds.right - bounds.left) : 100;
		const height = bounds ? Math.max(1, bounds.bottom - bounds.top) : 100;
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + width);
		maxY = Math.max(maxY, y + height);
		hasAny = true;
	}

	visited.delete(groupItem.id);

	if (!hasAny) {
		return null;
	}

	return {
		left: minX,
		top: minY,
		right: maxX,
		bottom: maxY,
	};
}

export function resolveItemTransform(options: ResolveItemTransformOptions): ItemTransformResult {
	const {
		item,
		layout,
		presence,
		includeParentGroupDrag = true,
		parentGroupInfo: explicitGroupInfo,
		lockRotationForTables = true,
		lockRotationForGridChildren = true,
	} = options;

	const layoutBounds = layout.get(item.id) ?? null;
	let left = layoutBounds?.left ?? item.x;
	let top = layoutBounds?.top ?? item.y;
	const width = layoutBounds ? Math.max(0, layoutBounds.right - layoutBounds.left) : 0;
	const height = layoutBounds ? Math.max(0, layoutBounds.bottom - layoutBounds.top) : 0;

	const activeDrag = presence ? getActiveDragForItem(presence, item.id) : null;
	let angle = activeDrag ? activeDrag.rotation : item.rotation;

	const parentGroupInfo =
		explicitGroupInfo !== undefined ? explicitGroupInfo : getParentGroupInfo(item);

	if (activeDrag) {
		left = activeDrag.x;
		top = activeDrag.y;
	} else if (includeParentGroupDrag && parentGroupInfo) {
		const parentGridEnabled = isGroupGridEnabled(parentGroupInfo.group);
		const { drag: groupDrag } = getGroupActivePosition(parentGroupInfo.groupItem, presence);
		if (groupDrag || parentGridEnabled || !layoutBounds) {
			const pos = getGroupChildAbsolutePosition({
				child: item,
				groupInfo: parentGroupInfo,
				presence,
			});
			left = pos.x;
			top = pos.y;
		}
	}

	if (lockRotationForTables && Tree.is(item.content, FluidTable)) {
		angle = 0;
	}

	if (
		lockRotationForGridChildren &&
		parentGroupInfo &&
		isGroupGridEnabled(parentGroupInfo.group)
	) {
		angle = 0;
	}

	return {
		left,
		top,
		width,
		height,
		angle,
		layoutBounds,
		parentGroupInfo,
		activeDrag,
	};
}
