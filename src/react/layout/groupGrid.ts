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

interface GridLayoutCacheEntry {
	signature: string;
	adjustment: { x: number; y: number };
	offsetsById: Map<string, { x: number; y: number }>;
}

const gridLayoutCache = new WeakMap<Group, GridLayoutCacheEntry>();

let lastGroupCache: {
	group: Group;
	configKey: string;
	entry: GridLayoutCacheEntry;
} | null = null;

const CONFIG_KEY_SEPARATOR = "|";

const serializeConfig = (config: GroupGridLayoutConfig): string =>
	[
		config.columns,
		config.rows,
		config.padding,
		config.itemWidth,
		config.itemHeight,
		config.gapX,
		config.gapY,
	].join(CONFIG_KEY_SEPARATOR);

const buildSignature = (group: Group, config: GroupGridLayoutConfig): string => {
	let signature = serializeConfig(config);
	for (const child of group.items) {
		signature += `${CONFIG_KEY_SEPARATOR}${child.id}:${child.x}:${child.y}`;
	}
	return signature;
};

const computeGridLayoutEntry = (
	group: Group,
	config: GroupGridLayoutConfig,
	signature: string
): GridLayoutCacheEntry => {
	let storedMinX = Infinity;
	let storedMaxX = -Infinity;
	let storedMinY = Infinity;
	let gridMinX = Infinity;
	let gridMaxX = -Infinity;
	let gridMinY = Infinity;

	const basePositions: { id: string; x: number; y: number }[] = [];

	group.items.forEach((child, index) => {
		const storedX = child.x;
		const storedY = child.y;
		storedMinX = Math.min(storedMinX, storedX);
		storedMinY = Math.min(storedMinY, storedY);
		storedMaxX = Math.max(storedMaxX, storedX + config.itemWidth);

		const gridPos = getGridPositionByIndex(index, config);
		basePositions.push({ id: child.id, x: gridPos.x, y: gridPos.y });
		gridMinX = Math.min(gridMinX, gridPos.x);
		gridMinY = Math.min(gridMinY, gridPos.y);
		gridMaxX = Math.max(gridMaxX, gridPos.x + config.itemWidth);
	});

	if (!isFinite(storedMinX) || !isFinite(storedMaxX) || !isFinite(storedMinY)) {
		return {
			signature,
			adjustment: { x: 0, y: 0 },
			offsetsById: new Map(basePositions.map((base) => [base.id, { x: base.x, y: base.y }])),
		};
	}

	const storedCenterX = (storedMinX + storedMaxX) / 2;
	const gridCenterX = (gridMinX + gridMaxX) / 2;

	const deltaX = storedCenterX - gridCenterX;
	const deltaY = storedMinY - gridMinY;

	const offsetsById = new Map<string, { x: number; y: number }>();
	basePositions.forEach((base) => {
		offsetsById.set(base.id, { x: base.x + deltaX, y: base.y + deltaY });
	});

	return {
		signature,
		adjustment: { x: deltaX, y: deltaY },
		offsetsById,
	};
};

const ensureGridLayoutCache = (
	group: Group,
	config: GroupGridLayoutConfig,
	skipVerification = false
): GridLayoutCacheEntry => {
	const existing = gridLayoutCache.get(group);
	if (existing && skipVerification) {
		return existing;
	}

	const signature = buildSignature(group, config);
	if (existing && existing.signature === signature) {
		return existing;
	}

	const entry = computeGridLayoutEntry(group, config, signature);
	gridLayoutCache.set(group, entry);
	return entry;
};

export function getGridAlignmentAdjustment(
	group: Group,
	config?: GroupGridLayoutConfig
): { x: number; y: number } {
	if (group.items.length === 0) {
		return { x: 0, y: 0 };
	}

	const effectiveConfig = config ?? getGroupGridConfig(group);
	const entry = ensureGridLayoutCache(group, effectiveConfig);
	return entry.adjustment;
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
	const configKey = serializeConfig(effectiveConfig);
	let entry: GridLayoutCacheEntry;

	if (
		lastGroupCache &&
		lastGroupCache.group === group &&
		lastGroupCache.configKey === configKey
	) {
		entry = ensureGridLayoutCache(group, effectiveConfig, true);
	} else {
		entry = ensureGridLayoutCache(group, effectiveConfig);
		lastGroupCache = { group, configKey, entry };
	}

	const cachedOffset = entry.offsetsById.get(child.id);
	if (cachedOffset) {
		return cachedOffset;
	}

	// Fallback: recompute with verification in case the child set changed mid-loop
	entry = ensureGridLayoutCache(group, effectiveConfig);
	lastGroupCache = { group, configKey, entry };
	return entry.offsetsById.get(child.id) ?? { x: child.x, y: child.y };
}

export function isGroupGridEnabled(group: Group | null | undefined): boolean {
	return !!group && group.viewAsGrid === true;
}
