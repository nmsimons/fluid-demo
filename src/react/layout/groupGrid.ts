import { Group, Item } from "../../schema/appSchema.js";

export interface GroupGridLayoutConfig {
	columns: number;
	rows: number;
	padding: number;
	itemWidth: number;
	itemHeight: number;
	gapX: number;
	gapY: number;
}

export const DEFAULT_GROUP_GRID_LAYOUT: GroupGridLayoutConfig = {
	columns: 3,
	rows: 3,
	padding: 40,
	itemWidth: 200,
	itemHeight: 150,
	gapX: 20,
	gapY: 80,
};

export function getGroupGridConfig(group?: Group): GroupGridLayoutConfig {
	if (!group) {
		return { ...DEFAULT_GROUP_GRID_LAYOUT };
	}

	const itemCount = group.items.length;
	if (itemCount <= 0) {
		return { ...DEFAULT_GROUP_GRID_LAYOUT, rows: 1 };
	}

	const idealColumns = Math.ceil(Math.sqrt(itemCount));
	const columns = Math.max(1, idealColumns);
	const rows = Math.max(1, Math.ceil(itemCount / columns));

	return {
		...DEFAULT_GROUP_GRID_LAYOUT,
		columns,
		rows,
	};
}

export function getGridAlignmentAdjustment(
	group: Group,
	config?: GroupGridLayoutConfig
): { x: number; y: number } {
	if (group.items.length === 0) {
		return { x: 0, y: 0 };
	}

	const effectiveConfig = config ?? getGroupGridConfig(group);

	let storedMinX = Infinity;
	let storedMaxX = -Infinity;
	let storedMinY = Infinity;
	let gridMinX = Infinity;
	let gridMaxX = -Infinity;
	let gridMinY = Infinity;

	group.items.forEach((child, index) => {
		const storedX = child.x;
		const storedY = child.y;
		storedMinX = Math.min(storedMinX, storedX);
		storedMinY = Math.min(storedMinY, storedY);
		storedMaxX = Math.max(storedMaxX, storedX + effectiveConfig.itemWidth);

		const gridPos = getGridPositionByIndex(index, effectiveConfig);
		gridMinX = Math.min(gridMinX, gridPos.x);
		gridMinY = Math.min(gridMinY, gridPos.y);
		gridMaxX = Math.max(gridMaxX, gridPos.x + effectiveConfig.itemWidth);
	});

	if (!isFinite(storedMinX) || !isFinite(storedMaxX) || !isFinite(storedMinY)) {
		return { x: 0, y: 0 };
	}

	const storedCenterX = (storedMinX + storedMaxX) / 2;
	const gridCenterX = (gridMinX + gridMaxX) / 2;

	const deltaX = storedCenterX - gridCenterX;
	const deltaY = storedMinY - gridMinY;

	return { x: deltaX, y: deltaY };
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
	config?: GroupGridLayoutConfig
): { x: number; y: number } | null {
	const index = group.items.indexOf(child);
	if (index === -1) {
		return null;
	}
	const effectiveConfig = config ?? getGroupGridConfig(group);
	const base = getGridPositionByIndex(index, effectiveConfig);
	const adjustment = getGridAlignmentAdjustment(group, effectiveConfig);
	return { x: base.x + adjustment.x, y: base.y + adjustment.y };
}

export function isGroupGridEnabled(group: Group | null | undefined): boolean {
	return !!group && group.viewAsGrid === true;
}
