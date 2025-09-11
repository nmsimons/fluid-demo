/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import { Tree } from "fluid-framework";
import { TreeViewAlpha } from "@fluidframework/tree/alpha";
import { App, Shape } from "../schema/app_schema.js";
import { undoRedo } from "../utils/undo.js";
import { isShape, isTable } from "../utils/contentHandlers.js";
import {
	NewCircleButton,
	NewSquareButton,
	NewTriangleButton,
	NewStarButton,
	NewNoteButton,
	NewTableButton,
	VoteButton,
	DeleteButton,
	DuplicateButton,
	CommentButton,
	ShapeColorPicker,
	AddColumnButton,
	AddRowButton,
	MoveColumnLeftButton,
	MoveColumnRightButton,
	MoveRowUpButton,
	MoveRowDownButton,
	MoveItemForwardButton,
	MoveItemBackwardButton,
	BringItemToFrontButton,
	SendItemToBackButton,
	InkColorPicker,
	UndoButton,
	RedoButton,
	InkToggleButton,
	EraserToggleButton,
	ClearAllButton,
	CommentsPaneToggleButton,
	AITaskPaneToggleButton,
	SelectionCountBadge,
	ZoomMenu,
} from "./appbuttonux.js";
import { DeleteSelectedRowsButton } from "./tablebuttonux.js";
// All toolbar button UIs now componentized; direct TooltipButton usage removed.
import { MessageBar, MessageBarBody, MessageBarTitle } from "@fluentui/react-message-bar";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "@fluentui/react-toolbar";
import type { SelectionManager } from "../utils/presence/Interfaces/SelectionManager.js";
import { TypedSelection } from "../utils/presence/selection.js";

export interface AppToolbarProps {
	view: TreeViewAlpha<typeof App>;
	tree: TreeViewAlpha<typeof App>;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	selectedItemId: string;
	selectedItemIds: string[];
	selectedColumnId: string;
	selectedRowId: string;
	commentPaneHidden: boolean;
	setCommentPaneHidden: (hidden: boolean) => void;
	aiTaskPaneHidden: boolean;
	setAiTaskPaneHidden: (hidden: boolean) => void;
	undoRedo: undoRedo;
	canUndo: boolean;
	canRedo: boolean;
	tableSelection: SelectionManager<TypedSelection>;
	zoom?: number;
	onZoomChange?: (z: number) => void;
	inkActive: boolean;
	onToggleInk: () => void;
	eraserActive: boolean;
	onToggleEraser: () => void;
	inkColor: string;
	onInkColorChange: (c: string) => void;
	inkWidth: number;
	onInkWidthChange: (w: number) => void;
}

export function AppToolbar(props: AppToolbarProps): JSX.Element {
	const {
		view,
		tree,
		canvasSize,
		pan,
		selectedItemId,
		selectedItemIds,
		selectedColumnId,
		selectedRowId,
		commentPaneHidden,
		setCommentPaneHidden,
		aiTaskPaneHidden,
		setAiTaskPaneHidden,
		undoRedo,
		canUndo,
		canRedo,
		tableSelection,
		zoom,
		onZoomChange,
		inkActive,
		onToggleInk,
		eraserActive,
		onToggleEraser,
		inkColor,
		onInkColorChange,
		inkWidth,
		onInkWidthChange,
	} = props;

	// Zoom slider logic moved into ZoomMenu component.

	return (
		<Toolbar className="h-[48px] shadow-lg flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap min-h-[48px] max-h-[48px]">
			{/* Undo / Redo group (leftmost) */}
			<ToolbarGroup>
				<UndoButton onUndo={() => undoRedo.undo()} disabled={!canUndo} />
				<RedoButton onRedo={() => undoRedo.redo()} disabled={!canRedo} />
			</ToolbarGroup>
			<ToolbarDivider />
			{/* Inking / Eraser group */}
			<ToolbarGroup>
				<InkToggleButton
					inkActive={inkActive}
					eraserActive={eraserActive}
					onToggleInk={onToggleInk}
					onToggleEraser={onToggleEraser}
				/>
				<EraserToggleButton
					inkActive={inkActive}
					eraserActive={eraserActive}
					onToggleInk={onToggleInk}
					onToggleEraser={onToggleEraser}
				/>
				<InkColorPicker
					setColor={(c: string) => onInkColorChange(c)}
					selected={inkColor}
					ariaLabel="Ink color picker"
					inkWidth={inkWidth}
					onInkWidthChange={onInkWidthChange}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			<ToolbarGroup>
				<NewCircleButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
				<NewSquareButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
				<NewTriangleButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
				<NewStarButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
				<NewNoteButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
				<NewTableButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
			</ToolbarGroup>
			{(() => {
				const selectedItems = selectedItemIds
					.map((id) => view.root.items.find((item) => item.id === id))
					.filter(Boolean);
				const hasSelectedItems = selectedItems.length > 0;
				const singleSelectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

				// Only show divider and buttons when items are selected
				if (!hasSelectedItems) {
					return null;
				}

				return (
					<div className="flex items-center h-full toolbar-slide-in">
						<ToolbarDivider />
						{/* Multi-selection indicator (componentized) */}
						{selectedItems.length > 1 && (
							<ToolbarGroup>
								<SelectionCountBadge count={selectedItems.length} />
							</ToolbarGroup>
						)}
						<ToolbarGroup>
							{/* Single-item actions: only show when exactly one item is selected */}
							{singleSelectedItem && (
								<>
									<VoteButton vote={singleSelectedItem.votes} />
									<CommentButton item={singleSelectedItem} />
								</>
							)}
							{/* Multi-item actions: show when any items are selected */}
							{hasSelectedItems && (
								<>
									<DuplicateButton
										count={selectedItems.length}
										duplicate={() => {
											Tree.runTransaction(view.root.items, () => {
												selectedItems.forEach((item) => {
													if (item) {
														view.root.items.duplicateItem(
															item,
															canvasSize
														);
													}
												});
											});
										}}
									/>
									<DeleteButton
										delete={() => {
											Tree.runTransaction(view.root.items, () => {
												selectedItems.forEach((item) => item?.delete());
											});
										}}
										count={selectedItems.length}
									/>
								</>
							)}
						</ToolbarGroup>
						<ToolbarDivider />
						<ToolbarGroup>
							<SendItemToBackButton
								items={view.root.items}
								selectedItemId={selectedItemId}
							/>
							<MoveItemBackwardButton
								items={view.root.items}
								selectedItemId={selectedItemId}
							/>
							<MoveItemForwardButton
								items={view.root.items}
								selectedItemId={selectedItemId}
							/>
							<BringItemToFrontButton
								items={view.root.items}
								selectedItemId={selectedItemId}
							/>
						</ToolbarGroup>
						{/* Shape color picker: show when any shapes are selected */}
						{(() => {
							const selectedShapes = selectedItems
								.filter(
									(item): item is NonNullable<typeof item> =>
										item !== undefined && isShape(item)
								)
								.map((item) => item.content as Shape);

							return (
								selectedShapes.length > 0 && (
									<div className="flex items-center h-full toolbar-slide-in-delayed">
										<ToolbarDivider />
										<ToolbarGroup>
											<ShapeColorPicker shapes={selectedShapes} />
										</ToolbarGroup>
									</div>
								)
							);
						})()}
						{singleSelectedItem && isTable(singleSelectedItem) && (
							<div className="flex items-center h-full toolbar-slide-in-delayed">
								<ToolbarDivider />
								<ToolbarGroup>
									<AddColumnButton table={singleSelectedItem.content} />
									<AddRowButton table={singleSelectedItem.content} />
									<DeleteSelectedRowsButton
										table={singleSelectedItem.content}
										selection={tableSelection}
									/>
									<MoveColumnLeftButton
										table={singleSelectedItem.content}
										selectedColumnId={selectedColumnId}
									/>
									<MoveColumnRightButton
										table={singleSelectedItem.content}
										selectedColumnId={selectedColumnId}
									/>
									<MoveRowUpButton
										table={singleSelectedItem.content}
										selectedRowId={selectedRowId}
									/>
									<MoveRowDownButton
										table={singleSelectedItem.content}
										selectedRowId={selectedRowId}
									/>
								</ToolbarGroup>
							</div>
						)}
					</div>
				);
			})()}
			<ToolbarDivider />
			<ToolbarGroup>
				<ClearAllButton
					onClear={() => {
						Tree.runTransaction(view.root, () => {
							if (view.root.items.length > 0) view.root.items.removeRange();
							if (view.root.inks.length > 0) view.root.inks.removeRange();
						});
					}}
					disabled={view.root.items.length === 0 && view.root.inks.length === 0}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			<ToolbarGroup>
				<CommentsPaneToggleButton
					paneHidden={commentPaneHidden}
					onToggle={(h) => setCommentPaneHidden(h)}
				/>
				<AITaskPaneToggleButton
					paneHidden={aiTaskPaneHidden}
					onToggle={(h) => setAiTaskPaneHidden(h)}
				/>
			</ToolbarGroup>
			{/* Right side grouping (auto) */}
			<ToolbarGroup style={{ marginLeft: "auto" }}>
				{view !== tree && (
					<div className="mr-4">
						<MessageBarComponent message="While viewing an AI Task, others will not see your changes (and you will not see theirs) until you complete the task." />
					</div>
				)}
				<ZoomMenu zoom={zoom} onZoomChange={onZoomChange} />
			</ToolbarGroup>
		</Toolbar>
	);
}

function MessageBarComponent(props: { message: string }): JSX.Element {
	const { message } = props;
	return (
		<MessageBar>
			<MessageBarBody>
				<MessageBarTitle>{message}</MessageBarTitle>
			</MessageBarBody>
		</MessageBar>
	);
}
