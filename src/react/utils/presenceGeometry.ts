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
	return {
		x: drag ? drag.x : groupItem.x,
		y: drag ? drag.y : groupItem.y,
		drag,
	};
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
	const { groupItem, group } = options.groupInfo;
	const { x: groupX, y: groupY } = getGroupActivePosition(groupItem, options.presence);
	const offset = getGroupChildOffset(group, options.child);
	return { x: groupX + offset.x, y: groupY + offset.y };
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
		const { drag: groupDrag } = getGroupActivePosition(parentGroupInfo.groupItem, presence);
		if (groupDrag || !layoutBounds) {
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
