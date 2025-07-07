/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeView, Tree } from "fluid-framework";
import { App, FluidTable } from "../../schema/app_schema.js";
import { KeyboardShortcut } from "./useKeyboardShortcuts.js";
import { undoRedo } from "../../utils/undo.js";
import { UsersManager } from "../../utils/Interfaces/UsersManager.js";
import { SHAPE_COLORS } from "../appbuttonux.js";

export interface UseAppKeyboardShortcutsProps {
	view: TreeView<typeof App>;
	canvasSize: { width: number; height: number };
	selectedItemId: string;
	selectedColumnId: string;
	selectedRowId: string;
	commentPaneHidden: boolean;
	undoRedo: undoRedo;
	users: UsersManager;
	canUndo: boolean;
	canRedo: boolean;
	setCommentPaneHidden: (hidden: boolean) => void;
	openCommentPaneAndFocus: (itemId: string) => void;
}

/**
 * Hook that returns all keyboard shortcuts for the ReactApp component
 */
export function useAppKeyboardShortcuts(props: UseAppKeyboardShortcutsProps): KeyboardShortcut[] {
	const {
		view,
		canvasSize,
		selectedItemId,
		selectedColumnId,
		selectedRowId,
		commentPaneHidden,
		undoRedo,
		users,
		canUndo,
		canRedo,
		setCommentPaneHidden,
		openCommentPaneAndFocus,
	} = props;

	return [
		// Undo/Redo shortcuts
		{
			key: "z",
			ctrlKey: true,
			action: () => undoRedo.undo(),
			disabled: !canUndo,
		},
		{
			key: "y",
			ctrlKey: true,
			action: () => undoRedo.redo(),
			disabled: !canRedo,
		},
		{
			key: "z",
			ctrlKey: true,
			shiftKey: true,
			action: () => undoRedo.redo(),
			disabled: !canRedo,
		},
		// Shape creation shortcuts
		{
			key: "c",
			action: () => {
				view.root.items.createShapeItem("circle", canvasSize, SHAPE_COLORS);
			},
		},
		{
			key: "s",
			action: () => {
				view.root.items.createShapeItem("square", canvasSize, SHAPE_COLORS);
			},
		},
		{
			key: "t",
			action: () => {
				view.root.items.createShapeItem("triangle", canvasSize, SHAPE_COLORS);
			},
		},
		{
			key: "r",
			action: () => {
				view.root.items.createShapeItem("star", canvasSize, SHAPE_COLORS);
			},
		},
		{
			key: "n",
			action: () => {
				view.root.items.createNoteItem(canvasSize, users.getMyself().value.id);
			},
		},
		{
			key: "b",
			action: () => {
				view.root.items.createTableItem(canvasSize);
			},
		},
		// Selected item shortcuts
		{
			key: "Delete",
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					selectedItem.delete();
				}
			},
			disabled: !selectedItemId,
		},
		{
			key: "d",
			ctrlKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					view.root.items.duplicateItem(selectedItem, canvasSize);
				}
			},
			disabled: !selectedItemId,
		},
		// Z-order shortcuts
		{
			key: "[", // [
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					view.root.items.moveItemBackward(selectedItem);
				}
			},
			disabled: !selectedItemId,
		},
		{
			key: "]", // ]
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					view.root.items.moveItemForward(selectedItem);
				}
			},
			disabled: !selectedItemId,
		},
		{
			key: "[", // Ctrl+[
			ctrlKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					view.root.items.sendItemToBack(selectedItem);
				}
			},
			disabled: !selectedItemId,
		},
		{
			key: "]", // Ctrl+]
			ctrlKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					view.root.items.bringItemToFront(selectedItem);
				}
			},
			disabled: !selectedItemId,
		},
		// Clear all shortcut
		{
			key: "Delete",
			ctrlKey: true,
			shiftKey: true,
			action: () => view.root.items.removeRange(),
			disabled: view.root.items.length === 0,
		},
		// Toggle comment pane
		{
			key: "m",
			ctrlKey: true,
			action: () => setCommentPaneHidden(!commentPaneHidden),
		},
		// Vote shortcut
		{
			key: "v",
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					const userId = users.getMyself().value.id;
					selectedItem.votes.toggleVote(userId);
				}
			},
			disabled: !selectedItemId,
		},
		// Comment shortcut
		{
			key: "/",
			ctrlKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem) {
					openCommentPaneAndFocus(selectedItem.id);
				}
			},
			disabled: !selectedItemId,
		},
		// Table operation shortcuts (only work when a table is selected)
		{
			key: "c",
			ctrlKey: true,
			shiftKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem && Tree.is(selectedItem.content, FluidTable)) {
					const table = selectedItem.content as FluidTable;
					table.addColumn();
				}
			},
			disabled: (() => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				return !selectedItem || !Tree.is(selectedItem.content, FluidTable);
			})(),
		},
		{
			key: "r",
			ctrlKey: true,
			shiftKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (selectedItem && Tree.is(selectedItem.content, FluidTable)) {
					const table = selectedItem.content as FluidTable;
					table.addRow();
				}
			},
			disabled: (() => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				return !selectedItem || !Tree.is(selectedItem.content, FluidTable);
			})(),
		},
		{
			key: "ArrowLeft",
			ctrlKey: true,
			shiftKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					selectedItem &&
					Tree.is(selectedItem.content, FluidTable) &&
					selectedColumnId
				) {
					const table = selectedItem.content as FluidTable;
					const selectedColumn = table.columns.find(
						(col) => col.id === selectedColumnId
					);
					if (selectedColumn) {
						table.moveColumnLeft(selectedColumn);
					}
				}
			},
			disabled: (() => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					!(
						selectedItem &&
						Tree.is(selectedItem.content, FluidTable) &&
						selectedColumnId
					)
				) {
					return true;
				}
				const table = selectedItem.content as FluidTable;
				const selectedColumn = table.columns.find((col) => col.id === selectedColumnId);
				if (!selectedColumn) return true;
				const currentIndex = table.columns.indexOf(selectedColumn);
				return currentIndex === 0;
			})(),
		},
		{
			key: "ArrowRight",
			ctrlKey: true,
			shiftKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					selectedItem &&
					Tree.is(selectedItem.content, FluidTable) &&
					selectedColumnId
				) {
					const table = selectedItem.content as FluidTable;
					const selectedColumn = table.columns.find(
						(col) => col.id === selectedColumnId
					);
					if (selectedColumn) {
						table.moveColumnRight(selectedColumn);
					}
				}
			},
			disabled: (() => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					!(
						selectedItem &&
						Tree.is(selectedItem.content, FluidTable) &&
						selectedColumnId
					)
				) {
					return true;
				}
				const table = selectedItem.content as FluidTable;
				const selectedColumn = table.columns.find((col) => col.id === selectedColumnId);
				if (!selectedColumn) return true;
				const currentIndex = table.columns.indexOf(selectedColumn);
				return currentIndex >= table.columns.length - 1;
			})(),
		},
		{
			key: "ArrowUp",
			ctrlKey: true,
			shiftKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					selectedItem &&
					Tree.is(selectedItem.content, FluidTable) &&
					selectedRowId
				) {
					const table = selectedItem.content as FluidTable;
					const selectedRow = table.rows.find((row) => row.id === selectedRowId);
					if (selectedRow) {
						table.moveRowUp(selectedRow);
					}
				}
			},
			disabled: (() => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					!(
						selectedItem &&
						Tree.is(selectedItem.content, FluidTable) &&
						selectedRowId
					)
				) {
					return true;
				}
				const table = selectedItem.content as FluidTable;
				const selectedRow = table.rows.find((row) => row.id === selectedRowId);
				if (!selectedRow) return true;
				const currentIndex = table.rows.indexOf(selectedRow);
				return currentIndex === 0;
			})(),
		},
		{
			key: "ArrowDown",
			ctrlKey: true,
			shiftKey: true,
			action: () => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					selectedItem &&
					Tree.is(selectedItem.content, FluidTable) &&
					selectedRowId
				) {
					const table = selectedItem.content as FluidTable;
					const selectedRow = table.rows.find((row) => row.id === selectedRowId);
					if (selectedRow) {
						table.moveRowDown(selectedRow);
					}
				}
			},
			disabled: (() => {
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);
				if (
					!(
						selectedItem &&
						Tree.is(selectedItem.content, FluidTable) &&
						selectedRowId
					)
				) {
					return true;
				}
				const table = selectedItem.content as FluidTable;
				const selectedRow = table.rows.find((row) => row.id === selectedRowId);
				if (!selectedRow) return true;
				const currentIndex = table.rows.indexOf(selectedRow);
				return currentIndex >= table.rows.length - 1;
			})(),
		},
	];
}
