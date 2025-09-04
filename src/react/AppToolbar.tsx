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
import { Menu, MenuTrigger, MenuPopover, MenuList } from "@fluentui/react-menu";
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
	zoom?: number;
	onZoomChange?: (z: number) => void;
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
		zoom,
		onZoomChange,
	} = props;

	const formatZoom = (z: number | undefined) => `${Math.round((z ?? 1) * 100)}%`;
	const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = parseInt(e.target.value, 10);
		onZoomChange?.(val / 100);
	};
	// Removed quick preset buttons per request; only slider + reset remain.

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
						{/* Multi-selection indicator */}
						{selectedItems.length > 1 && (
							<ToolbarGroup>
								<div className="flex items-center px-2">
									<Badge appearance="filled" color="brand" size="small">
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
										items={view.root.items}
										canvasSize={canvasSize}
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
										item !== undefined && Tree.is(item.content, Shape)
								)
								.map((item) => item.content as Shape);

							return (
								selectedShapes.length > 0 && (
									<div className="flex items-center h-full toolbar-slide-in-delayed">
										<ToolbarDivider />
										<ToolbarGroup>
											<ColorPicker
												shapes={selectedShapes}
												count={selectedShapes.length}
											/>
										</ToolbarGroup>
									</div>
								)
							);
						})()}
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
			{/* Right side grouping (auto) */}
			<ToolbarGroup style={{ marginLeft: "auto" }}>
				{view !== tree && (
					<div className="mr-4">
						<MessageBarComponent message="While viewing an AI Task, others will not see your changes (and you will not see theirs) until you complete the task." />
					</div>
				)}
				{/* Zoom dropdown */}
				<Menu>
					<MenuTrigger>
						<button
							className="px-2 py-1 rounded bg-black/70 text-white hover:bg-black transition-colors text-sm border border-white/20 inline-flex items-center justify-center"
							style={{ width: 72 }}
							aria-label="Zoom"
						>
							<span className="tabular-nums font-medium">{formatZoom(zoom)}</span>
							<span className="ml-1 text-[10px]">▼</span>
						</button>
					</MenuTrigger>
					<MenuPopover>
						<MenuList>
							<div
								className="px-3 py-2 w-56 select-none"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex justify-between text-xs mb-2">
									<span className="font-semibold">Zoom</span>
									<button
										onClick={() => onZoomChange?.(1)}
										className="text-blue-500 hover:underline"
									>
										Reset
									</button>
								</div>
								<input
									type="range"
									min={25}
									max={400}
									step={5}
									value={Math.round((zoom ?? 1) * 100)}
									onChange={handleSlider}
									className="w-full"
								/>
							</div>
						</MenuList>
					</MenuPopover>
				</Menu>
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
