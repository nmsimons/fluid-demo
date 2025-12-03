/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * useSelectionState Hook
 *
 * Consolidates all selection-related state management into a single hook.
 * This includes item selection, table selection (columns/rows), and
 * synchronization with the presence-based selection managers.
 */

import { useState } from "react";
import { TreeView } from "fluid-framework";
import { App } from "../../schema/appSchema.js";
import type { SelectionManager } from "../../presence/Interfaces/SelectionManager.js";
import { TypedSelection } from "../../presence/selection.js";
import { useSelectionSync, useMultiTypeSelectionSync } from "../../utils/eventSubscriptions.js";

/**
 * Selection state for canvas items.
 */
export interface ItemSelectionState {
	/** The ID of the first selected item (for backwards compatibility) */
	selectedItemId: string;
	/** All currently selected item IDs */
	selectedItemIds: string[];
}

/**
 * Selection state for table elements.
 */
export interface TableSelectionState {
	/** The ID of the currently selected column */
	selectedColumnId: string;
	/** The ID of the currently selected row */
	selectedRowId: string;
}

/**
 * Combined selection state.
 */
export interface SelectionState extends ItemSelectionState, TableSelectionState {}

/**
 * Return type for the useSelectionState hook.
 */
export interface UseSelectionStateReturn extends SelectionState {
	/** Set the selected item ID (also updates selectedItemIds) */
	setSelectedItemId: (id: string) => void;
	/** Set the selected item IDs (also updates selectedItemId) */
	setSelectedItemIds: (ids: string[]) => void;
}

/**
 * Custom hook that manages all selection-related state.
 *
 * Features:
 * - Consolidates item and table selection state
 * - Automatically syncs with presence-based selection managers
 * - Maintains backwards compatibility with single-item selection
 * - Handles multi-type table selections (rows, columns)
 *
 * @param itemSelection - The presence selection manager for canvas items
 * @param tableSelection - The presence selection manager for table elements
 * @param view - The current tree view (used as dependency for re-subscription)
 * @returns Object containing selection state and setters
 */
export function useSelectionState(
	itemSelection: SelectionManager<TypedSelection>,
	tableSelection: SelectionManager<TypedSelection>,
	view: TreeView<typeof App>
): UseSelectionStateReturn {
	// Item selection state
	const [selectedItemId, setSelectedItemId] = useState<string>("");
	const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

	// Table selection state
	const [selectedColumnId, setSelectedColumnId] = useState<string>("");
	const [selectedRowId, setSelectedRowId] = useState<string>("");

	// Use unified selection sync for item selection state management
	useSelectionSync(
		itemSelection,
		(selections) => {
			const selectedIds = selections.map((sel) => sel.id);
			// Update both states for backwards compatibility
			setSelectedItemIds(selectedIds);
			setSelectedItemId(selectedIds.length > 0 ? selectedIds[0] : "");
		},
		[view]
	);

	// Use multi-type selection sync for table selection state management
	useMultiTypeSelectionSync(tableSelection, {
		column: (selections) => setSelectedColumnId(selections[0]?.id ?? ""),
		row: (selections) => setSelectedRowId(selections[0]?.id ?? ""),
	});

	return {
		selectedItemId,
		selectedItemIds,
		selectedColumnId,
		selectedRowId,
		setSelectedItemId,
		setSelectedItemIds,
	};
}
