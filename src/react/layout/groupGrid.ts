import { Group, Item } from "../../schema/appSchema.js";

export interface GroupGridLayoutConfig {
	columns: number;
	padding: number;
	itemWidth: number;
	itemHeight: number;
	gapX: number;
	gapY: number;
}

export const DEFAULT_GROUP_GRID_LAYOUT: GroupGridLayoutConfig = {
	columns: 3,
	padding: 40,
	itemWidth: 200,
	itemHeight: 150,
	gapX: 20,
	gapY: 40,
};

export function getGroupGridConfig(): GroupGridLayoutConfig {
	return DEFAULT_GROUP_GRID_LAYOUT;
}

export function getGridPositionByIndex(
	index: number,
	config: GroupGridLayoutConfig = DEFAULT_GROUP_GRID_LAYOUT
): { x: number; y: number } {
	const col = index % config.columns;
	const row = Math.floor(index / config.columns);
	return {
		x: config.padding + col * (config.itemWidth + config.gapX),
		y: config.padding + row * (config.itemHeight + config.gapY),
	};
}

export function getGridOffsetForChild(
	group: Group,
	child: Item,
	config: GroupGridLayoutConfig = DEFAULT_GROUP_GRID_LAYOUT
): { x: number; y: number } | null {
	const index = group.items.indexOf(child);
	if (index === -1) {
		return null;
	}
	return getGridPositionByIndex(index, config);
}

export function isGroupGridEnabled(group: Group | null | undefined): boolean {
	return !!group && group.viewAsGrid === true;
}
