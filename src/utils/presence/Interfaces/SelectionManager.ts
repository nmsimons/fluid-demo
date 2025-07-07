import { PresenceManager } from "./PresenceManager.js";

// The SelectionManager interface
// This interface is used to manage the selection of items in the app.
// It extends the PresenceManager interface to provide additional methods
// The generic type TSelection extends { id: string } ensures that the selection items have an 'id' property
export interface SelectionManager<TSelection extends Selection = Selection> // Default type is Selection if not specified
	extends PresenceManager<TSelection[]> {
	/**
	 * Test if the given item is selected by the local client
	 * @param sel The selection to test
	 * @returns True if the selection is selected by the local client, false otherwise
	 */
	testSelection(sel: TSelection): boolean;
	/**
	 * Test if the given item is selected by remote clients
	 * @param sel The selection to test
	 * @returns An array of client ids that have the item selected
	 */
	testRemoteSelection(sel: TSelection): string[];
	/**
	 * Clear the current selection
	 */
	clearSelection(): void;
	/**
	 * Set the selection to the given id or array of ids
	 * Note that this will overwrite the current selection, so use with caution.
	 * If you want to maintain previous selections, use `addToSelection` or `toggleSelection` instead.
	 * @param sel The selection to set
	 */
	setSelection(sel: TSelection | TSelection[]): void;
	/**
	 * Toggle the selection of the given id
	 * This does not overwrite the current selection, but rather adds or removes the item from the selection.
	 * @param sel The selection to toggle
	 */
	toggleSelection(sel: TSelection): void;
	/**
	 * Add the given item to the selection
	 * @param sel The selection to add
	 */
	addToSelection(sel: TSelection): void;
	/**
	 * Remove the given item from the selection
	 * @param sel The selection to remove
	 */
	removeFromSelection(sel: TSelection): void;
	/**
	 * Get the current local selection array
	 * @returns The current local selection array
	 */
	getLocalSelection(): readonly TSelection[];
	/**
	 * Get the current remote selection map where the key is the selected item id and the value is an array of client ids
	 * @returns The current remote selection map for a given item
	 */
	getRemoteSelected(): Map<TSelection, string[]>;
}

export type Selection = {
	id: string;
};
