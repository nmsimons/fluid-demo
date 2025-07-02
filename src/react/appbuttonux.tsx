/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import { Item, Items, Shape, Vote, Note, hintValues, FluidTable } from "../schema/app_schema.js";
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
import { SwatchPicker, ColorSwatch } from "@fluentui/react-components";
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

// Helper function to create a shape with random position and color
function createShape(
	items: Items,
	canvasSize: { width: number; height: number },
	shapeType: "circle" | "square" | "triangle" | "star",
) {
	const maxSize = 120;
	const minSize = 100;

	const shape = new Shape({
		size: getRandomNumber(minSize, maxSize),
		color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
		type: shapeType,
	});
	const item = new Item({
		id: crypto.randomUUID(),
		x: getRandomNumber(0, canvasSize.width - maxSize - minSize),
		y: getRandomNumber(0, canvasSize.height - maxSize - minSize),
		comments: [],
		votes: new Vote({ votes: [] }),
		content: shape,
		// a random number between 0 and 15
		rotation: getRandomNumber(0, 1) === 0 ? getRandomNumber(0, 15) : getRandomNumber(345, 360),
	});
	items.insertAtEnd(item);
}

export function NewCircleButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		createShape(items, canvasSize, "circle");
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<CircleRegular />}
			tooltip="Add a circle shape to the canvas"
		/>
	);
}

export function NewSquareButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		createShape(items, canvasSize, "square");
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<SquareRegular />}
			tooltip="Add a square shape to the canvas"
		/>
	);
}

export function NewTriangleButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		createShape(items, canvasSize, "triangle");
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<TriangleRegular />}
			tooltip="Add a triangle shape to the canvas"
		/>
	);
}

export function NewStarButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		createShape(items, canvasSize, "star");
	};

	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<StarRegular />}
			tooltip="Add a star shape to the canvas"
		/>
	);
}

export function NewNoteButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;
	useTree(items);
	const presence = useContext(PresenceContext);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		const note = new Note({
			id: crypto.randomUUID(),
			text: "",
			author: presence.users.getMyself().value.id,
		});

		const item = new Item({
			id: crypto.randomUUID(),
			x: getRandomNumber(0, canvasSize.width - 200),
			y: getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: new Vote({ votes: [] }),
			content: note,
			// a random number between 0 and 15
			rotation:
				getRandomNumber(0, 1) === 0 ? getRandomNumber(0, 15) : getRandomNumber(345, 360),
		});

		items.insertAtEnd(item);
	};
	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<NoteRegular />}
			tooltip="Add a sticky note to the canvas"
		/>
	);
}

export function NewTableButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;
	useTree(items);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		const table = createTable();

		const item = new Item({
			id: crypto.randomUUID(),
			x: getRandomNumber(0, canvasSize.width - 200),
			y: getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: new Vote({ votes: [] }),
			content: table,
			// a random number between 0 and 15 or 345 and 360, matching other items
			rotation: 0,
		});
		items.insertAtEnd(item);
	};
	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<TableRegular />}
			tooltip="Add a data table to the canvas"
		/>
	);
}

export const createTable = () => {
	const rows = new Array(10).fill(null).map(() => {
		return { id: crypto.randomUUID(), cells: [] };
	});

	// Initialize the SharedTree DDSes
	const table = new FluidTable({
		rows: rows,
		columns: [
			{
				id: crypto.randomUUID(),
				name: "String",
				hint: hintValues.string,
			},
			{
				id: crypto.randomUUID(),
				name: "Number",
				hint: hintValues.number,
			},
			{
				id: crypto.randomUUID(),
				name: "Date",
				hint: hintValues.date,
			},
		],
	});
	return table;
};

// Generate a random number between min and max
const getRandomNumber = (min: number, max: number): number => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

export function DeleteButton(props: { delete: () => void }): JSX.Element {
	const { delete: deleteFunc } = props;
	return (
		<TooltipButton
			onClick={() => deleteFunc()}
			icon={<DismissFilled />}
			tooltip="Delete item"
		/>
	);
}

export function DuplicateButton(props: {
	item: Item;
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { item, items, canvasSize } = props;
	useTree(items);

	const handleDuplicate = (e: React.MouseEvent) => {
		e.stopPropagation();
		console.log("Duplicate button clicked for item:", item.id);

		// Create a copy of the item with new ID and slightly offset position
		const offsetX = 20;
		const offsetY = 20;

		// Calculate new position, wrapping around canvas if needed
		let newX = item.x + offsetX;
		let newY = item.y + offsetY;

		if (newX > canvasSize.width - 200) {
			// Assume item width ~200px
			newX = item.x - offsetX;
		}
		if (newY > canvasSize.height - 200) {
			// Assume item height ~200px
			newY = item.y - offsetY;
		}

		// Ensure we don't go negative
		newX = Math.max(0, newX);
		newY = Math.max(0, newY);

		console.log("Creating duplicate at position:", newX, newY);

		// First, create the appropriate content based on the original item's content type
		let duplicatedContent;

		if (Tree.is(item.content, Shape)) {
			console.log("Duplicating shape:", item.content.type);
			duplicatedContent = new Shape({
				size: item.content.size,
				color: item.content.color,
				type: item.content.type,
			});
		} else if (Tree.is(item.content, Note)) {
			console.log("Duplicating note");
			duplicatedContent = new Note({
				id: crypto.randomUUID(),
				text: item.content.text,
				author: item.content.author,
			});
		} else if (Tree.is(item.content, FluidTable)) {
			console.log("Duplicating table");
			console.log("Original table rows:", item.content.rows.length);
			console.log("Original table columns:", item.content.columns.length);

			// Create new columns with new IDs but same structure
			// Also create a mapping from old column IDs to new ones
			const columnIdMapping: Record<string, string> = {};
			const newColumns = item.content.columns.map((col) => {
				console.log("Copying column:", col.id, col.name, col.hint);
				const newColumnId = crypto.randomUUID();
				columnIdMapping[col.id] = newColumnId;
				return {
					id: newColumnId,
					name: col.name,
					hint: col.hint,
				};
			});

			// Create new rows with new IDs and updated cell column references
			const newRows = item.content.rows.map((row) => {
				console.log("Copying row:", row.id, "with cells:", row.cells.length);

				// Copy cells but update their columnId to reference the new columns
				const newCells = row.cells.map((cell) => {
					const newColumnId = columnIdMapping[cell.columnId];
					if (!newColumnId) {
						console.warn("Could not find new column ID for", cell.columnId);
						return cell; // Return original cell if mapping fails
					}
					return {
						columnId: newColumnId,
						value: cell.value, // Copy the actual cell value
					};
				});

				return {
					id: crypto.randomUUID(),
					cells: newCells,
				};
			});

			console.log(
				"Creating new FluidTable with",
				newRows.length,
				"rows and",
				newColumns.length,
				"columns",
			);
			console.log("Column ID mapping:", columnIdMapping);

			try {
				duplicatedContent = new FluidTable({
					rows: newRows,
					columns: newColumns,
				});
				console.log("Successfully created FluidTable");
			} catch (error) {
				console.error("Error creating FluidTable:", error);
				return;
			}
		} else {
			console.error("Unknown content type, cannot duplicate");
			return;
		}

		// Now create the item with the properly created content
		const duplicatedItem = new Item({
			id: crypto.randomUUID(),
			x: newX,
			y: newY,
			comments: [], // Start with empty comments
			votes: new Vote({ votes: [] }), // Start with empty votes
			content: duplicatedContent,
			rotation: item.rotation,
		});

		console.log("Adding duplicated item to items collection");
		items.insertAtEnd(duplicatedItem);
	};

	return (
		<TooltipButton
			onClick={(e) => handleDuplicate(e)}
			icon={<CopyRegular />}
			tooltip="Create a copy of this item"
		/>
	);
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
		/>
	);
}

export function ShowPaneButton(props: {
	hidePane: (hidden: boolean) => void;
	paneHidden: boolean;
	hiddenIcon: JSX.Element;
	shownIcon: JSX.Element;
	tooltip?: string;
}): JSX.Element {
	const { hidePane, paneHidden, hiddenIcon, shownIcon, tooltip } = props;
	return (
		<TooltipButton
			onClick={() => hidePane(!paneHidden)}
			icon={paneHidden ? hiddenIcon : shownIcon}
			tooltip={paneHidden ? `Show ${tooltip}` : `Hide ${tooltip}`}
		/>
	);
}

export function ColorPicker(props: { shape: Shape }): JSX.Element {
	const { shape } = props;
	useTree(shape);

	const handleColorChange = (color: string) => {
		Tree.runTransaction(shape, () => {
			shape.color = color;
		});
	};

	return (
		<SwatchPicker
			aria-label="Shape color picker"
			selectedValue={shape.color}
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
		Tree.runTransaction(table, () => {
			// Add a new column at the end with a default name
			const columnCount = table.columns.length;
			table.insertColumn({
				index: columnCount,
				name: `Column ${columnCount + 1}`,
				hint: undefined,
			});
		});
	};

	return (
		<TooltipButton
			onClick={handleAddColumn}
			icon={<TableInsertColumnRegular />}
			tooltip="Add a new column to the table"
		/>
	);
}

export function AddRowButton(props: { table: FluidTable }): JSX.Element {
	const { table } = props;
	useTree(table);

	const handleAddRow = () => {
		Tree.runTransaction(table, () => {
			// Add a new row at the end
			const newRow = { id: crypto.randomUUID(), cells: [] };
			table.insertRows({ rows: [newRow] });
		});
	};

	return (
		<TooltipButton
			onClick={handleAddRow}
			icon={<TableInsertRowRegular />}
			tooltip="Add a new row to the table"
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

	const canMoveLeft = selectedColumn && selectedColumn.index > 0;

	const handleMoveLeft = () => {
		if (selectedColumn && canMoveLeft) {
			Tree.runTransaction(table, () => {
				selectedColumn.moveTo(selectedColumn.index - 1);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveLeft}
			icon={<ChevronLeftRegular />}
			tooltip="Move selected column to the left"
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

	const canMoveRight = selectedColumn && selectedColumn.index < table.columns.length - 1;

	const handleMoveRight = () => {
		if (selectedColumn && canMoveRight) {
			Tree.runTransaction(table, () => {
				selectedColumn.moveTo(selectedColumn.index + 1);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveRight}
			icon={<ChevronRightRegular />}
			tooltip="Move selected column to the right"
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

	const canMoveUp = selectedRow && selectedRow.index > 0;

	const handleMoveUp = () => {
		if (selectedRow && canMoveUp) {
			Tree.runTransaction(table, () => {
				selectedRow.moveTo(selectedRow.index - 1);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveUp}
			icon={<ChevronUpRegular />}
			tooltip="Move selected row up"
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

	const canMoveDown = selectedRow && selectedRow.index < table.rows.length - 1;

	const handleMoveDown = () => {
		if (selectedRow && canMoveDown) {
			Tree.runTransaction(table, () => {
				selectedRow.moveTo(selectedRow.index + 1);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveDown}
			icon={<ChevronDownRegular />}
			tooltip="Move selected row down"
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
		if (selectedItem && canMoveForward && itemIndex !== -1) {
			Tree.runTransaction(items, () => {
				// Move item forward one position (higher z-order)
				items.moveToIndex(itemIndex, itemIndex + 1);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveForward}
			icon={<PositionForwardRegular />}
			tooltip="Move item forward one layer"
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
		if (selectedItem && canMoveBackward && itemIndex !== -1) {
			Tree.runTransaction(items, () => {
				// Move item backward one position (lower z-order)
				items.moveToIndex(itemIndex - 1, itemIndex);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleMoveBackward}
			icon={<PositionBackwardRegular />}
			tooltip="Move item backward one layer"
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
		if (selectedItem && canBringToFront && itemIndex !== -1) {
			Tree.runTransaction(items, () => {
				// Move item to the end (highest z-order)
				items.moveToEnd(itemIndex);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleBringToFront}
			icon={<PositionToFrontRegular />}
			tooltip="Bring item to the front layer"
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
		if (selectedItem && canSendToBack && itemIndex !== -1) {
			Tree.runTransaction(items, () => {
				// Move item to the beginning (lowest z-order)
				items.moveToStart(itemIndex);
			});
		}
	};

	return (
		<TooltipButton
			onClick={handleSendToBack}
			icon={<PositionToBackRegular />}
			tooltip="Send item to the back layer"
			disabled={!canSendToBack}
		/>
	);
}
