/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import { TreeView, Tree } from "fluid-framework";
import { App, Shape, TextBlock } from "../../../schema/appSchema.js";
import { undoRedo } from "../../../undo/undo.js";
import { isShape, isTable, isText, isGroup, isNote } from "../../../utils/contentHandlers.js";
import { findItemsByIds } from "../../../utils/itemsHelpers.js";
import { TypedSelection } from "../../../presence/selection.js";
import { getParentGroupInfo } from "../../utils/presenceGeometry.js";
import { ShapeMenu, NewNoteButton, NewTableButton } from "./buttons/CreationButtons.js";
import type { ShapeType } from "./buttons/CreationButtons.js";
import { NewTextButton, TextFormattingMenu } from "./buttons/TextButtons.js";
import { VoteButton, DeleteButton, DuplicateButton, CommentButton } from "./buttons/EditButtons.js";
import { ShapeColorPicker } from "./buttons/ShapeButtons.js";
import {
	AddColumnButton,
	AddRowButton,
	MoveColumnLeftButton,
	MoveColumnRightButton,
	MoveRowUpButton,
	MoveRowDownButton,
} from "./buttons/SimpleTableButtons.js";
import {
	MoveItemForwardButton,
	MoveItemBackwardButton,
	BringItemToFrontButton,
	SendItemToBackButton,
} from "./buttons/ZOrderButtons.js";
import { InkColorPicker, InkToggleButton, EraserToggleButton } from "./buttons/InkButtons.js";
import { UndoButton, RedoButton, ClearAllButton } from "./buttons/ActionButtons.js";
import { CommentsPaneToggleButton, AiPaneToggleButton } from "./buttons/PaneButtons.js";
import { ZoomMenu } from "./buttons/ViewButtons.js";
import { DeleteSelectedRowsButton } from "./buttons/TableButtons.js";
import {
	GroupButton,
	UngroupButton,
	RenameGroupButton,
	ToggleGridLayoutButton,
} from "./buttons/GroupButtons.js";
// All toolbar button UIs now componentized; direct TooltipButton usage removed.
import { Toolbar, ToolbarDivider, ToolbarGroup } from "@fluentui/react-toolbar";
import type { SelectionManager } from "../../../presence/Interfaces/SelectionManager.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { createSchemaUser } from "../../../utils/userUtils.js";
import { NoteColorPicker } from "./buttons/NoteButtons.js";
import type { NoteColor } from "../../../constants/note.js";

export interface AppToolbarProps {
	view: TreeView<typeof App>;
	tree: TreeView<typeof App>;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	selectedItemId: string;
	selectedItemIds: string[];
	selectedColumnId: string;
	selectedRowId: string;
	commentPaneHidden: boolean;
	setCommentPaneHidden: (hidden: boolean) => void;
	aiPaneHidden: boolean;
	setAiPaneHidden: (hidden: boolean) => void;
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
	shapeColor: string;
	onShapeColorChange: (c: string) => void;
	shapeFilled: boolean;
	onShapeFilledChange: (filled: boolean) => void;
	noteColor: NoteColor;
	onNoteColorChange: (color: NoteColor) => void;
	currentShapeType: ShapeType;
	onShapeTypeChange: (type: ShapeType) => void;
	textColor: string;
	onTextColorChange: (color: string) => void;
	textFontSize: number;
	onTextFontSizeChange: (size: number) => void;
	textBold: boolean;
	onTextBoldChange: (value: boolean) => void;
	textItalic: boolean;
	onTextItalicChange: (value: boolean) => void;
	textUnderline: boolean;
	onTextUnderlineChange: (value: boolean) => void;
	textStrikethrough: boolean;
	onTextStrikethroughChange: (value: boolean) => void;
	textCardStyle: boolean;
	onTextCardStyleChange: (value: boolean) => void;
	textAlign: string;
	onTextAlignChange: (value: string) => void;
}

export function AppToolbar(props: AppToolbarProps): JSX.Element {
	const {
		view,
		canvasSize,
		pan,
		selectedItemId,
		selectedItemIds,
		selectedColumnId,
		selectedRowId,
		commentPaneHidden,
		setCommentPaneHidden,
		aiPaneHidden,
		setAiPaneHidden,
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
		shapeColor,
		onShapeColorChange,
		shapeFilled,
		onShapeFilledChange,
		noteColor,
		onNoteColorChange,
		currentShapeType,
		onShapeTypeChange,
		textColor,
		onTextColorChange,
		textFontSize,
		onTextFontSizeChange,
		textBold,
		onTextBoldChange,
		textItalic,
		onTextItalicChange,
		textUnderline,
		onTextUnderlineChange,
		textStrikethrough,
		onTextStrikethroughChange,
		textCardStyle,
		onTextCardStyleChange,
		textAlign,
		onTextAlignChange,
	} = props;
	const presence = useContext(PresenceContext);

	const selectedItems = findItemsByIds(view.root.items, selectedItemIds);
	const selectedShapeItems = selectedItems.filter(isShape);
	const selectedShapes = selectedShapeItems.map((item) => item.content as Shape);
	const selectedTexts = selectedItems.filter(isText).map((item) => item.content as TextBlock);
	const selectedNoteItems = selectedItems.filter(isNote);
	const selectedNotes = selectedNoteItems.map((item) => item.content);

	// Determine if all selected items belong to a single group
	const commonParentGroup = (() => {
		if (selectedItems.length === 0) return null;

		// Get parent group info for all selected items
		const parentGroups = selectedItems.map((item) => getParentGroupInfo(item));

		// If any item is not in a group, no common parent
		if (parentGroups.some((pg) => pg === null)) return null;

		// Check if all items have the same parent group (compare group IDs)
		const firstGroupId = parentGroups[0]?.groupItem.id;
		const allSameGroup = parentGroups.every((pg) => pg?.groupItem.id === firstGroupId);

		return allSameGroup ? parentGroups[0] : null;
	})();

	// Zoom slider logic moved into ZoomMenu component.

	return (
		<Toolbar className="app-toolbar h-[48px] shadow-lg flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap min-h-[48px] max-h-[48px]">
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
			{/* Shape creation buttons */}
			<ToolbarGroup>
				<ShapeMenu
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
					shapeColor={shapeColor}
					shapeFilled={shapeFilled}
					currentShape={currentShapeType}
					onShapeChange={onShapeTypeChange}
				/>
				<ShapeColorPicker
					color={shapeColor}
					onColorChange={onShapeColorChange}
					filled={shapeFilled}
					onFilledChange={onShapeFilledChange}
					selectedShapes={selectedShapes}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			<ToolbarGroup>
				<NewTextButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
					textColor={textColor}
					fontSize={textFontSize}
					bold={textBold}
					italic={textItalic}
					underline={textUnderline}
					strikethrough={textStrikethrough}
					cardStyle={textCardStyle}
					textAlign={textAlign}
				/>
				<TextFormattingMenu
					color={textColor}
					onColorChange={onTextColorChange}
					fontSize={textFontSize}
					onFontSizeChange={onTextFontSizeChange}
					bold={textBold}
					onBoldChange={onTextBoldChange}
					italic={textItalic}
					onItalicChange={onTextItalicChange}
					underline={textUnderline}
					onUnderlineChange={onTextUnderlineChange}
					strikethrough={textStrikethrough}
					onStrikethroughChange={onTextStrikethroughChange}
					cardStyle={textCardStyle}
					onCardStyleChange={onTextCardStyleChange}
					textAlign={textAlign}
					onTextAlignChange={onTextAlignChange}
					selectedTexts={selectedTexts}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			{/* Note creation controls */}
			<ToolbarGroup>
				<NewNoteButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
					noteColor={noteColor}
				/>
				<NoteColorPicker
					color={noteColor}
					onColorChange={onNoteColorChange}
					selectedNotes={selectedNotes}
				/>
			</ToolbarGroup>
			<ToolbarDivider />
			<ToolbarGroup>
				<NewTableButton
					items={view.root.items}
					canvasSize={canvasSize}
					pan={pan}
					zoom={zoom}
				/>
			</ToolbarGroup>
			{(() => {
				const hasSelectedItems = selectedItems.length > 0;
				const singleSelectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

				// Only show divider and buttons when items are selected
				if (!hasSelectedItems) {
					return null;
				}

				return (
					<>
						<div className="flex items-center h-full toolbar-slide-in bg-blue-100 border-l-2 border-blue-500 pl-4 pr-4 ml-4">
							{/* Selection context using Fluent design principles */}
							<div className="px-1 py-1 text-xs font-semibold text-blue-700 rounded mr-1">
								{selectedItems.length === 1
									? "Selected"
									: `${selectedItems.length} Selected`}
							</div>
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
										<GroupButton selectedItems={selectedItems} />
										<UngroupButton selectedItems={selectedItems} />
										<DuplicateButton
											count={selectedItems.length}
											duplicate={() => {
												Tree.runTransaction(view.root.items, () => {
													selectedItems.forEach((item) => {
														if (item) {
															const currentUser =
																presence.users.getMyself().value;
															view.root.items.duplicateItem(
																item,
																createSchemaUser({
																	id: currentUser.id,
																	name: currentUser.name,
																}),
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
						</div>
						{singleSelectedItem && isTable(singleSelectedItem) && (
							<div className="flex items-center h-full toolbar-slide-in-delayed bg-green-100 border-l-2 border-green-500 pl-4 pr-4 ml-4">
								{/* Table-specific controls with distinct visual styling */}
								<div className="px-1 py-1 text-xs font-semibold text-green-700 rounded mr-1">
									Table
								</div>
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
						{((singleSelectedItem && isGroup(singleSelectedItem)) ||
							commonParentGroup) && (
							<div className="flex items-center h-full toolbar-slide-in-delayed bg-purple-100 border-l-2 border-purple-500 pl-4 pr-4 ml-4">
								{/* Group-specific controls with distinct visual styling */}
								<div className="px-1 py-1 text-xs font-semibold text-purple-700 rounded mr-1">
									Group
								</div>
								<ToolbarGroup>
									<RenameGroupButton
										group={
											singleSelectedItem && isGroup(singleSelectedItem)
												? singleSelectedItem.content
												: commonParentGroup!.group
										}
										onEdit={() => {
											// Trigger editing on the group overlay
											// We'll need to communicate this to the overlay via a state mechanism
											const groupId =
												singleSelectedItem && isGroup(singleSelectedItem)
													? singleSelectedItem.id
													: commonParentGroup!.groupItem.id;
											const event = new CustomEvent("editGroup", {
												detail: { groupId },
											});
											window.dispatchEvent(event);
										}}
									/>
									<ToggleGridLayoutButton
										group={
											singleSelectedItem && isGroup(singleSelectedItem)
												? singleSelectedItem.content
												: commonParentGroup!.group
										}
									/>
								</ToolbarGroup>
							</div>
						)}
					</>
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
				<AiPaneToggleButton
					paneHidden={aiPaneHidden}
					onToggle={(h) => setAiPaneHidden(h)}
				/>
			</ToolbarGroup>
			{/* Right side grouping (auto) */}
			<ToolbarGroup style={{ marginLeft: "auto" }}>
				<ZoomMenu zoom={zoom} onZoomChange={onZoomChange} />
			</ToolbarGroup>
		</Toolbar>
	);
}
