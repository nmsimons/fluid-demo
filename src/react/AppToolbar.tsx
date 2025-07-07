/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import { TreeView, Tree } from "fluid-framework";
import { App, Shape, FluidTable } from "../schema/app_schema.js";
import { undoRedo } from "../utils/undo.js";
import {
	NewCircleButton,
	NewSquareButton,
	NewTriangleButton,
	NewStarButton,
	ShowPaneButton,
	NewNoteButton,
	NewTableButton,
	VoteButton,
	DeleteButton,
	DuplicateButton,
	CommentButton,
	ColorPicker,
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
} from "./appbuttonux.js";
import { DeleteSelectedRowsButton } from "./tablebuttonux.js";
import { TooltipButton } from "./buttonux.js";
import { MessageBar, MessageBarBody, MessageBarTitle } from "@fluentui/react-message-bar";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "@fluentui/react-toolbar";
import { Badge } from "@fluentui/react-badge";
import {
	ArrowRedoFilled,
	ArrowUndoFilled,
	CommentFilled,
	CommentRegular,
	DeleteRegular,
} from "@fluentui/react-icons";
import type { SelectionManager } from "../utils/presence/Interfaces/SelectionManager.js";
import { TypedSelection } from "../utils/presence/selection.js";

export interface AppToolbarProps {
	view: TreeView<typeof App>;
	tree: TreeView<typeof App>;
	canvasSize: { width: number; height: number };
	selectedItemId: string;
	selectedItemIds: string[];
	selectedColumnId: string;
	selectedRowId: string;
	commentPaneHidden: boolean;
	setCommentPaneHidden: (hidden: boolean) => void;
	undoRedo: undoRedo;
	canUndo: boolean;
	canRedo: boolean;
	tableSelection: SelectionManager<TypedSelection>;
}

export function AppToolbar(props: AppToolbarProps): JSX.Element {
	const {
		view,
		tree,
		canvasSize,
		selectedItemId,
		selectedItemIds,
		selectedColumnId,
		selectedRowId,
		commentPaneHidden,
		setCommentPaneHidden,
		undoRedo,
		canUndo,
		canRedo,
		tableSelection,
	} = props;

	return (
		<Toolbar className="h-[48px] shadow-lg flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap min-h-[48px] max-h-[48px]">
			<ToolbarGroup>
				<TooltipButton
					tooltip="Undo"
					keyboardShortcut="Ctrl+Z"
					onClick={() => undoRedo.undo()}
					icon={<ArrowUndoFilled />}
					disabled={!canUndo}
				/>
				<TooltipButton
					tooltip="Redo"
					keyboardShortcut="Ctrl+Y"
					onClick={() => undoRedo.redo()}
					icon={<ArrowRedoFilled />}
					disabled={!canRedo}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			<ToolbarGroup>
				<NewCircleButton items={view.root.items} canvasSize={canvasSize} />
				<NewSquareButton items={view.root.items} canvasSize={canvasSize} />
				<NewTriangleButton items={view.root.items} canvasSize={canvasSize} />
				<NewStarButton items={view.root.items} canvasSize={canvasSize} />
				<NewNoteButton items={view.root.items} canvasSize={canvasSize} />
				<NewTableButton items={view.root.items} canvasSize={canvasSize} />
			</ToolbarGroup>
			{(() => {
				const selectedItems = selectedItemIds.map(id => view.root.items.find(item => item.id === id)).filter(Boolean);
				const hasSelectedItems = selectedItems.length > 0;
				const singleSelectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

				// Only show divider and buttons when items are selected
				if (!hasSelectedItems) {
					return null;
				}

				return (
					<div className="flex items-center h-full toolbar-slide-in">
						<ToolbarDivider />
						{/* Multi-selection indicator */}
						{selectedItems.length > 1 && (
							<ToolbarGroup>
								<div className="flex items-center px-2">
									<Badge 
										appearance="filled" 
										color="brand" 
										size="small"
									>
										{selectedItems.length} selected
									</Badge>
								</div>
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
										item={selectedItems[0]!}
										items={view.root.items}
										canvasSize={canvasSize}
										count={selectedItems.length}
									/>
									<DeleteButton
										delete={() => {
											selectedItems.forEach(item => item?.delete());
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
						{/* Single-item specific UI: only show when exactly one item is selected */}
						{singleSelectedItem && Tree.is(singleSelectedItem.content, Shape) && (
							<div className="flex items-center h-full toolbar-slide-in-delayed">
								<ToolbarDivider />
								<ToolbarGroup>
									<ColorPicker shape={singleSelectedItem.content} />
								</ToolbarGroup>
							</div>
						)}
						{singleSelectedItem && Tree.is(singleSelectedItem.content, FluidTable) && (
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
				<TooltipButton
					tooltip="Remove all items from the canvas"
					keyboardShortcut="Ctrl+Shift+Delete"
					icon={<DeleteRegular />}
					onClick={() => view.root.items.removeRange()}
					disabled={view.root.items.length === 0}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			<ToolbarGroup>
				<ShowPaneButton
					hiddenIcon={<CommentRegular />}
					shownIcon={<CommentFilled />}
					hidePane={setCommentPaneHidden}
					paneHidden={commentPaneHidden}
					tooltip="Comments"
					keyboardShortcut="Ctrl+M"
				/>
			</ToolbarGroup>
			{view !== tree ? (
				<ToolbarGroup style={{ marginLeft: "auto" }}>
					<MessageBarComponent message="While viewing an AI Task, others will not see your changes (and you will not see theirs) until you complete the task." />
				</ToolbarGroup>
			) : (
				<></>
			)}
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
