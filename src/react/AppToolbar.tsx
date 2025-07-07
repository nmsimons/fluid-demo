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
import {
	ArrowRedoFilled,
	ArrowUndoFilled,
	CommentFilled,
	CommentRegular,
	DeleteRegular,
} from "@fluentui/react-icons";
import type { SelectionManager } from "../utils/Interfaces/SelectionManager.js";
import { TypedSelection } from "../utils/selection.js";

export interface AppToolbarProps {
	view: TreeView<typeof App>;
	tree: TreeView<typeof App>;
	canvasSize: { width: number; height: number };
	selectedItemId: string;
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
				const selectedItem = view.root.items.find((item) => item.id === selectedItemId);

				// Only show divider and buttons when an item is selected
				if (!selectedItem) {
					return null;
				}

				return (
					<div className="flex items-center h-full toolbar-slide-in">
						<ToolbarDivider />
						<ToolbarGroup>
							<VoteButton vote={selectedItem.votes} />
							<CommentButton item={selectedItem} />
							<DuplicateButton
								item={selectedItem}
								items={view.root.items}
								canvasSize={canvasSize}
							/>
							<DeleteButton
								delete={() => {
									selectedItem.delete();
								}}
							/>
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
						{Tree.is(selectedItem.content, Shape) && (
							<div className="flex items-center h-full toolbar-slide-in-delayed">
								<ToolbarDivider />
								<ToolbarGroup>
									<ColorPicker shape={selectedItem.content} />
								</ToolbarGroup>
							</div>
						)}
						{Tree.is(selectedItem.content, FluidTable) && (
							<div className="flex items-center h-full toolbar-slide-in-delayed">
								<ToolbarDivider />
								<ToolbarGroup>
									<AddColumnButton table={selectedItem.content} />
									<AddRowButton table={selectedItem.content} />
									<DeleteSelectedRowsButton
										table={selectedItem.content}
										selection={tableSelection}
									/>
									<MoveColumnLeftButton
										table={selectedItem.content}
										selectedColumnId={selectedColumnId}
									/>
									<MoveColumnRightButton
										table={selectedItem.content}
										selectedColumnId={selectedColumnId}
									/>
									<MoveRowUpButton
										table={selectedItem.content}
										selectedRowId={selectedRowId}
									/>
									<MoveRowDownButton
										table={selectedItem.content}
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
