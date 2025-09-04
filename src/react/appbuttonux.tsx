/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import { Item, Items, Shape, Vote, FluidTable } from "../schema/app_schema.js";
import {
	DismissFilled,
	CircleRegular,
	SquareRegular,
	TriangleRegular,
	StarRegular,
	ThumbLikeFilled,
	ThumbLikeRegular,
	CommentRegular,
	CommentFilled,
	NoteRegular,
	TableRegular,
	TableInsertColumnRegular,
	TableInsertRowRegular,
	ChevronLeftRegular,
	ChevronRightRegular,
	ChevronUpRegular,
	ChevronDownRegular,
	PositionForwardRegular,
	PositionBackwardRegular,
	PositionToFrontRegular,
	PositionToBackRegular,
	CopyRegular,
} from "@fluentui/react-icons";
import { SwatchPicker, ColorSwatch } from "@fluentui/react-swatch-picker";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { CommentPaneContext } from "./ux.js";
import { useTree } from "./hooks/useTree.js";
import { TooltipButton } from "./buttonux.js";
import { Tree } from "fluid-framework";

// Color palette used for shapes
export const SHAPE_COLORS = [
	"#000000", // Black
	"#FFFFFF", // White
	"#FF0000", // Pure red
	"#33FF57", // Green
	"#3357FF", // Blue
	"#FF33A1", // Pink/Magenta
	"#A133FF", // Purple
	"#33FFF5", // Cyan
	"#F5FF33", // Yellow
	"#FF8C33", // Orange
];

// (Removed - moved to Items class as createShapeItem method)

export function NewCircleButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		items.createShapeItem("circle", canvasSize, SHAPE_COLORS);
		centerLastItem(items, pan, zoom, canvasSize);
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<CircleRegular />}
			tooltip="Add a circle shape to the canvas"
			keyboardShortcut="C"
		/>
	);
}

export function NewSquareButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		items.createShapeItem("square", canvasSize, SHAPE_COLORS);
		centerLastItem(items, pan, zoom, canvasSize);
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<SquareRegular />}
			tooltip="Add a square shape to the canvas"
			keyboardShortcut="S"
		/>
	);
}

export function NewTriangleButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		items.createShapeItem("triangle", canvasSize, SHAPE_COLORS);
		centerLastItem(items, pan, zoom, canvasSize);
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<TriangleRegular />}
			tooltip="Add a triangle shape to the canvas"
			keyboardShortcut="T"
		/>
	);
}

export function NewStarButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		items.createShapeItem("star", canvasSize, SHAPE_COLORS);
		centerLastItem(items, pan, zoom, canvasSize);
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<StarRegular />}
			tooltip="Add a star shape to the canvas"
			keyboardShortcut="R"
		/>
	);
}

export function NewNoteButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);
	const presence = useContext(PresenceContext);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		items.createNoteItem(canvasSize, presence.users.getMyself().value.id);
		centerLastItem(items, pan, zoom, canvasSize, 180, 120);
	};
	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<NoteRegular />}
			tooltip="Add a sticky note to the canvas"
			keyboardShortcut="N"
		/>
	);
}

export function NewTableButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		items.createTableItem(canvasSize);
		centerLastItem(items, pan, zoom, canvasSize, 240, 160);
	};
	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<TableRegular />}
			tooltip="Add a data table to the canvas"
			keyboardShortcut="B"
		/>
	);
}

// (Removed - moved to Items class as createDefaultTable method)

// (Removed - moved to Items class as getRandomNumber method)

export function DeleteButton(props: { delete: () => void; count?: number }): JSX.Element {
	const { delete: deleteFunc, count = 1 } = props;
	const tooltip = count > 1 ? `Delete ${count} items` : "Delete item";
	return (
		<TooltipButton
			onClick={() => deleteFunc()}
			icon={<DismissFilled />}
			tooltip={tooltip}
			keyboardShortcut="Delete"
		/>
	);
}

export function DuplicateButton(props: {
	item?: Item;
	items: Items;
	canvasSize: { width: number; height: number };
	count?: number;
	duplicate?: () => void;
}): JSX.Element {
	const { item, items, canvasSize, count = 1, duplicate } = props;
	useTree(items);

	const handleDuplicate = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (duplicate) {
			duplicate();
		} else if (item) {
			items.duplicateItem(item, canvasSize);
		}
	};

	const tooltip = count > 1 ? `Duplicate ${count} items` : "Create a copy of this item";

	return (
		<TooltipButton
			onClick={(e) => handleDuplicate(e)}
			icon={<CopyRegular />}
			tooltip={tooltip}
			keyboardShortcut="Ctrl+D"
		/>
	);
}

// Helper: reposition the last inserted item to viewport center
function centerLastItem(
	items: Items,
	pan: { x: number; y: number } | undefined,
	zoom: number | undefined,
	canvasSize: { width: number; height: number },
	estimatedW = 120,
	estimatedH = 120
): void {
	if (!pan || !zoom) return; // fallback: leave random placement
	if (items.length === 0) return;
	const last = items[items.length - 1];
	if (!last) return;
	// Visible logical viewport
	const vw = canvasSize.width / zoom;
	const vh = canvasSize.height / zoom;
	const vx = -pan.x / zoom;
	const vy = -pan.y / zoom;
	let w = estimatedW;
	let h = estimatedH;
	// If shape, size is square
	if (last.content instanceof Shape) {
		w = h = last.content.size;
	}
	// Center position
	const cx = vx + vw / 2 - w / 2;
	const cy = vy + vh / 2 - h / 2;
	Tree.runTransaction(items, () => {
		last.x = cx;
		last.y = cy;
	});
}

export function VoteButton(props: { vote: Vote }): JSX.Element {
	const { vote } = props;
	const presence = useContext(PresenceContext);
	const userId = presence.users.getMyself().value.id;

	useTree(vote);

	const handleClick = (e: React.MouseEvent<Element, MouseEvent>) => {
		e.stopPropagation();
		vote.toggleVote(userId);
	};

	const hasVoted = vote.hasVoted(userId);
	const voteCount = vote.numberOfVotes;

	const tooltipText = hasVoted
		? `Remove your vote (${voteCount} vote${voteCount !== 1 ? "s" : ""})`
		: `Vote for this item (${voteCount} vote${voteCount !== 1 ? "s" : ""})`;

	return (
		<TooltipButton
			icon={hasVoted ? <ThumbLikeFilled /> : <ThumbLikeRegular />}
			onClick={(e) => handleClick(e)}
			tooltip={tooltipText}
			keyboardShortcut="V"
		></TooltipButton>
	);
}

export function CommentButton(props: { item: Item }): JSX.Element {
	const { item } = props;
	const commentPaneContext = useContext(CommentPaneContext);

	useTree(item);

	const handleClick = (e: React.MouseEvent<Element, MouseEvent>) => {
		e.stopPropagation();
		if (!commentPaneContext) return;

		// Open the comment pane and focus the input
		commentPaneContext.openCommentPaneAndFocus(item.id);
	};

	const commentCount = item.comments.length;

	return (
		<TooltipButton
			onClick={(e) => handleClick(e)}
			icon={commentCount > 0 ? <CommentFilled /> : <CommentRegular />}
			tooltip={commentCount > 0 ? `View comments (${commentCount})` : "Add a comment"}
			keyboardShortcut="Ctrl+/"
		/>
	);
}

export function ShowPaneButton(props: {
	hidePane: (hidden: boolean) => void;
	paneHidden: boolean;
	hiddenIcon: JSX.Element;
	shownIcon: JSX.Element;
	tooltip?: string;
	keyboardShortcut?: string;
}): JSX.Element {
	const { hidePane, paneHidden, hiddenIcon, shownIcon, tooltip, keyboardShortcut } = props;
	return (
		<TooltipButton
			onClick={() => hidePane(!paneHidden)}
			icon={paneHidden ? hiddenIcon : shownIcon}
			tooltip={paneHidden ? `Show ${tooltip}` : `Hide ${tooltip}`}
			keyboardShortcut={keyboardShortcut}
		/>
	);
}

export function ColorPicker(props: { shapes: Shape[]; count?: number }): JSX.Element {
	const { shapes, count = shapes.length } = props;

	// Use the first shape for tree updates (they should all update together)
	useTree(shapes[0]);

	const handleColorChange = (color: string) => {
		// Update all shapes in a single transaction
		Tree.runTransaction(shapes[0], () => {
			shapes.forEach((shape) => {
				shape.color = color;
			});
		});
	};

	// Determine the selected color - if all shapes have the same color, show it as selected
	const allSameColor = shapes.every((shape) => shape.color === shapes[0].color);
	const selectedColor = allSameColor ? shapes[0].color : undefined;

	const ariaLabel = count === 1 ? "Shape color picker" : `Color picker for ${count} shapes`;

	return (
		<SwatchPicker
			aria-label={ariaLabel}
			selectedValue={selectedColor}
			onSelectionChange={(event, data) => {
				if (data.selectedValue) {
					handleColorChange(data.selectedValue);
				}
			}}
		>
			{SHAPE_COLORS.map((color) => (
				<ColorSwatch
					key={color}
					color={color}
					value={color}
					aria-label={`Color ${color}`}
					size="small"
					shape="circular"
				/>
			))}
		</SwatchPicker>
	);
}

export function AddColumnButton(props: { table: FluidTable }): JSX.Element {
	const { table } = props;
	useTree(table);

	const handleAddColumn = () => {
		table.addColumn();
	};

	return (
		<TooltipButton
			onClick={handleAddColumn}
			icon={<TableInsertColumnRegular />}
			tooltip="Add a new column to the table"
			keyboardShortcut="Ctrl+Shift+C"
		/>
	);
}

export function AddRowButton(props: { table: FluidTable }): JSX.Element {
	const { table } = props;
	useTree(table);

	const handleAddRow = () => {
		table.addRow();
	};

	return (
		<TooltipButton
			onClick={handleAddRow}
			icon={<TableInsertRowRegular />}
			tooltip="Add a new row to the table"
			keyboardShortcut="Ctrl+Shift+R"
		/>
	);
}

export function MoveColumnLeftButton(props: {
	table: FluidTable;
	selectedColumnId?: string;
}): JSX.Element {
	const { table, selectedColumnId } = props;
	useTree(table);

	const selectedColumn = selectedColumnId
		? table.columns.find((col) => col.id === selectedColumnId)
		: undefined;

	const canMoveLeft = selectedColumn && table.columns.indexOf(selectedColumn) > 0;

	const handleMoveLeft = () => {
		if (selectedColumn && canMoveLeft) {
			table.moveColumnLeft(selectedColumn);
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveLeft}
			icon={<ChevronLeftRegular />}
			tooltip="Move selected column to the left"
			keyboardShortcut="Ctrl+Shift+Left"
			disabled={!canMoveLeft}
		/>
	);
}

export function MoveColumnRightButton(props: {
	table: FluidTable;
	selectedColumnId?: string;
}): JSX.Element {
	const { table, selectedColumnId } = props;
	useTree(table);

	const selectedColumn = selectedColumnId
		? table.columns.find((col) => col.id === selectedColumnId)
		: undefined;

	const canMoveRight =
		selectedColumn && table.columns.indexOf(selectedColumn) < table.columns.length - 1;

	const handleMoveRight = () => {
		if (selectedColumn && canMoveRight) {
			table.moveColumnRight(selectedColumn);
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveRight}
			icon={<ChevronRightRegular />}
			tooltip="Move selected column to the right"
			keyboardShortcut="Ctrl+Shift+Right"
			disabled={!canMoveRight}
		/>
	);
}

export function MoveRowUpButton(props: { table: FluidTable; selectedRowId?: string }): JSX.Element {
	const { table, selectedRowId } = props;
	useTree(table);

	const selectedRow = selectedRowId
		? table.rows.find((row) => row.id === selectedRowId)
		: undefined;

	const canMoveUp = selectedRow && table.rows.indexOf(selectedRow) > 0;

	const handleMoveUp = () => {
		if (selectedRow && canMoveUp) {
			table.moveRowUp(selectedRow);
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveUp}
			icon={<ChevronUpRegular />}
			tooltip="Move selected row up"
			keyboardShortcut="Ctrl+Shift+Up"
			disabled={!canMoveUp}
		/>
	);
}

export function MoveRowDownButton(props: {
	table: FluidTable;
	selectedRowId?: string;
}): JSX.Element {
	const { table, selectedRowId } = props;
	useTree(table);

	const selectedRow = selectedRowId
		? table.rows.find((row) => row.id === selectedRowId)
		: undefined;

	const canMoveDown = selectedRow && table.rows.indexOf(selectedRow) < table.rows.length - 1;

	const handleMoveDown = () => {
		if (selectedRow && canMoveDown) {
			table.moveRowDown(selectedRow);
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveDown}
			icon={<ChevronDownRegular />}
			tooltip="Move selected row down"
			keyboardShortcut="Ctrl+Shift+Down"
			disabled={!canMoveDown}
		/>
	);
}

// Z-order control buttons
export function MoveItemForwardButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);

	const selectedItem = selectedItemId
		? items.find((item) => item.id === selectedItemId)
		: undefined;

	const itemIndex = selectedItem ? items.indexOf(selectedItem) : -1;
	const canMoveForward = selectedItem && itemIndex < items.length - 1;

	const handleMoveForward = () => {
		if (selectedItem && canMoveForward) {
			items.moveItemForward(selectedItem);
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveForward}
			icon={<PositionForwardRegular />}
			tooltip="Move item forward one layer"
			keyboardShortcut="]"
			disabled={!canMoveForward}
		/>
	);
}

export function MoveItemBackwardButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);

	const selectedItem = selectedItemId
		? items.find((item) => item.id === selectedItemId)
		: undefined;

	const itemIndex = selectedItem ? items.indexOf(selectedItem) : -1;
	const canMoveBackward = selectedItem && itemIndex > 0;

	const handleMoveBackward = () => {
		if (selectedItem && canMoveBackward) {
			items.moveItemBackward(selectedItem);
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveBackward}
			icon={<PositionBackwardRegular />}
			tooltip="Move item backward one layer"
			keyboardShortcut="["
			disabled={!canMoveBackward}
		/>
	);
}

export function BringItemToFrontButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);

	const selectedItem = selectedItemId
		? items.find((item) => item.id === selectedItemId)
		: undefined;

	const itemIndex = selectedItem ? items.indexOf(selectedItem) : -1;
	const canBringToFront = selectedItem && itemIndex < items.length - 1;

	const handleBringToFront = () => {
		if (selectedItem && canBringToFront) {
			items.bringItemToFront(selectedItem);
		}
	};

	return (
		<TooltipButton
			onClick={handleBringToFront}
			icon={<PositionToFrontRegular />}
			tooltip="Bring item to the front layer"
			keyboardShortcut="Ctrl+]"
			disabled={!canBringToFront}
		/>
	);
}

export function SendItemToBackButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);

	const selectedItem = selectedItemId
		? items.find((item) => item.id === selectedItemId)
		: undefined;

	const itemIndex = selectedItem ? items.indexOf(selectedItem) : -1;
	const canSendToBack = selectedItem && itemIndex > 0;

	const handleSendToBack = () => {
		if (selectedItem && canSendToBack) {
			items.sendItemToBack(selectedItem);
		}
	};

	return (
		<TooltipButton
			onClick={handleSendToBack}
			icon={<PositionToBackRegular />}
			tooltip="Send item to the back layer"
			keyboardShortcut="Ctrl+["
			disabled={!canSendToBack}
		/>
	);
}
