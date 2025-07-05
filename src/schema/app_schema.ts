/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TableSchema, SchemaFactoryAlpha } from "@fluidframework/tree/alpha";
import {
	TreeViewConfiguration,
	Tree,
	TreeNodeFromImplicitAllowedTypes,
	TreeStatus,
} from "fluid-framework";

export type HintValues = (typeof hintValues)[keyof typeof hintValues];
export const hintValues = {
	string: "string",
	number: "number",
	boolean: "boolean",
	date: "DateTime",
	vote: "Vote",
} as const;

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

// Include a UUID to guarantee that this schema will be uniquely identifiable.
// As this schema uses a recursive type, the beta SchemaFactoryRecursive is used instead of just SchemaFactory.
const sf = new SchemaFactoryAlpha("fc1db2e8-0a00-11ee-be56-0242ac120002");

export class Shape extends sf.object("Shape", {
	size: sf.required(sf.number, {
		metadata: { description: "The width and height of the shape" },
	}),
	color: sf.required(sf.string, {
		metadata: {
			description: `The color of this shape, as a hexadecimal RGB string, e.g. "#00FF00" for bright green`,
		},
	}),
	type: sf.required(sf.string, {
		metadata: { description: `One of "circle", "square", "triangle", or "star"` },
	}),
}) {} // The size is a number that represents the size of the shape

/**
 * A SharedTree object date-time
 */
export class DateTime extends sf.object(hintValues.date, {
	ms: sf.required(sf.number, {
		metadata: { description: "The number of milliseconds since the epoch" },
	}),
}) {
	/**
	 * Get the date-time
	 */
	get value(): Date {
		return new Date(this.ms);
	}

	/**
	 * Set the raw date-time string
	 */
	set value(value: Date) {
		// Test if the value is a valid date
		if (isNaN(value.getTime())) {
			return;
		}
		this.ms = value.getTime();
	}
}

/**
 * A SharedTree object that allows users to vote
 */
export class Vote extends sf.object(hintValues.vote, {
	votes: sf.array(sf.string), // Map of votes
}) {
	/**
	 * Add a vote to the map of votes
	 * The key is the user id and the value is irrelevant
	 * @param vote The vote to add
	 */
	addVote(vote: string): void {
		if (this.votes.includes(vote)) {
			return;
		}
		this.votes.insertAtEnd(vote);
	}

	/**
	 * Remove a vote from the map of votes
	 * @param vote The vote to remove
	 */
	removeVote(vote: string): void {
		if (!this.votes.includes(vote)) {
			return;
		}
		const index = this.votes.indexOf(vote);
		this.votes.removeAt(index);
	}

	/**
	 * Toggle a vote in the map of votes
	 */
	toggleVote(vote: string): void {
		if (this.votes.includes(vote)) {
			this.removeVote(vote);
		} else {
			this.addVote(vote);
		}
	}

	/**
	 * Get the number of votes
	 * @returns The number of votes
	 */
	get numberOfVotes(): number {
		return this.votes.length;
	}

	/**
	 * Return whether the user has voted
	 * @param userId The user id
	 * @return Whether the user has voted
	 */
	hasVoted(userId: string): boolean {
		return this.votes.includes(userId);
	}
}
export class Comment extends sf.object("Comment", {
	id: sf.string,
	text: sf.string,
	userId: sf.required(sf.string, {
		metadata: {
			description: `A unique user id for the author of the node, or "AI Agent" if created by an agent`,
		},
	}),
	username: sf.required(sf.string, {
		metadata: {
			description: `A user-friendly name for the author of the node (e.g. "Alex Pardes"), or "AI Agent" if created by an agent`,
		},
	}),
	votes: Vote,
	createdAt: DateTime,
}) {
	delete(): void {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Comments)) {
			parent.removeAt(parent.indexOf(this));
		}
	}
}

export class Comments extends sf.array("Comments", [Comment]) {
	addComment(text: string, userId: string, username: string): void {
		const comment = new Comment({
			id: crypto.randomUUID(),
			text,
			userId,
			username,
			votes: new Vote({ votes: [] }),
			createdAt: new DateTime({ ms: Date.now() }),
		});
		this.insertAtEnd(comment);
	}
}

export class Note extends sf.object(
	"Note",
	// Fields for Notes which SharedTree will store and synchronize across clients.
	// These fields are exposed as members of instances of the Note class.
	{
		id: sf.string,
		text: sf.string,
		author: sf.required(sf.string, {
			metadata: {
				description: `A unique user id for author of the node, or "AI Agent" if created by an agent`,
			},
		}),
	}
) {}

export type typeDefinition = TreeNodeFromImplicitAllowedTypes<typeof schemaTypes>;
const schemaTypes = [sf.string, sf.number, sf.boolean, DateTime, Vote] as const;

// Create column schema with properties for hint and name
export const FluidColumnSchema = TableSchema.column({
	schemaFactory: sf,
	cell: schemaTypes,
	props: sf.object("ColumnProps", {
		name: sf.string,
		hint: sf.optional(sf.string),
	}),
});

// Create row schema
export const FluidRowSchema = TableSchema.row({
	schemaFactory: sf,
	cell: schemaTypes,
});

// Create the built-in table schema
export class FluidTable extends TableSchema.table({
	schemaFactory: sf,
	cell: schemaTypes,
	column: FluidColumnSchema,
	row: FluidRowSchema,
}) {
	/**
	 * Create a Row before inserting it into the table
	 * */
	createDetachedRow(): FluidRow {
		return new FluidRowSchema({ id: crypto.randomUUID(), cells: {} });
	}

	/**
	 * Delete a column and all of its cells
	 * @param column The column to delete
	 */
	deleteColumn(column: FluidColumn): void {
		if (Tree.status(column) !== TreeStatus.InDocument) return;
		Tree.runTransaction(this, () => {
			// Remove all cells for this column from all rows
			for (const row of this.rows) {
				row.removeCell(column);
			}
			// Remove the column from the table
			this.removeColumn(column);
		});
	}

	/**
	 * Get a column by cell ID (for backward compatibility)
	 * Cell IDs are typically in the format "columnId_rowId"
	 */
	getColumnByCellId(cellId: string): FluidColumn | undefined {
		// Extract column ID from cell ID (assuming format "columnId_rowId")
		const columnId = cellId.split("_")[0];
		return this.getColumn(columnId);
	}

	/**
	 * Add a new column to the table
	 */
	addColumn(): void {
		Tree.runTransaction(this, () => {
			const columnCount = this.columns.length;
			this.insertColumn({
				column: new FluidColumnSchema({
					id: crypto.randomUUID(),
					props: {
						name: `Column ${columnCount + 1}`,
						hint: hintValues.string,
					},
				}),
				index: columnCount,
			});
		});
	}

	/**
	 * Add a new row to the table
	 */
	addRow(): void {
		Tree.runTransaction(this, () => {
			const newRow = { id: crypto.randomUUID(), cells: [] };
			this.insertRows({ rows: [newRow] });
		});
	}

	/**
	 * Move a column to the left (swap with the column to its left)
	 */
	moveColumnLeft(column: FluidColumn): boolean {
		const currentIndex = this.columns.indexOf(column);
		if (currentIndex <= 0) return false;
		this.columns.moveToIndex(currentIndex - 1, currentIndex);
		return true;
	}

	/**
	 * Move a column to the right (swap with the column to its right)
	 */
	moveColumnRight(column: FluidColumn): boolean {
		const currentIndex = this.columns.indexOf(column);
		if (currentIndex < 0 || currentIndex >= this.columns.length - 1) return false;
		this.columns.moveToIndex(currentIndex + 2, currentIndex);
		return true;
	}

	/**
	 * Move a row up (swap with the row above it)
	 */
	moveRowUp(row: FluidRow): boolean {
		const currentIndex = this.rows.indexOf(row);
		if (currentIndex <= 0) return false;
		this.rows.moveToIndex(currentIndex - 1, currentIndex);
		return true;
	}

	/**
	 * Move a row down (swap with the row below it)
	 */
	moveRowDown(row: FluidRow): boolean {
		const currentIndex = this.rows.indexOf(row);
		if (currentIndex < 0 || currentIndex >= this.rows.length - 1) return false;
		this.rows.moveToIndex(currentIndex + 2, currentIndex);
		return true;
	}
}
export class Item extends sf.object("Item", {
	id: sf.string,
	x: sf.required(sf.number, {
		metadata: {
			description:
				"The x-coordinate of the shape on the canvas. The visible portion of the canvas width on a user's screen typically spans a few thousand pixels",
		},
	}),
	y: sf.required(sf.number, {
		metadata: {
			description:
				"The y-coordinate of the shape on the canvas. The visible portion of the canvas height on a user's screen typically spans a couple thousand pixels",
		},
	}),
	rotation: sf.required(sf.number, {
		metadata: {
			description: "The rotation of the shape in clockwise degrees",
		},
	}),
	comments: Comments,
	votes: Vote,
	content: [Shape, Note, FluidTable],
}) {
	delete(): void {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Items)) {
			parent.removeAt(parent.indexOf(this));
		} else if (Tree.is(parent, Group)) {
			parent.content.removeAt(parent.content.indexOf(this));
		}
	}
}
export class Group extends sf.object("Group", {
	id: sf.string,
	x: sf.number,
	y: sf.number,
	comments: Comments,
	content: sf.array([Item]),
}) {}

// TODO: Support groups
export class Items extends sf.array("Items", [Item]) {
	/**
	 * Move an item forward one position (higher z-order)
	 */
	moveItemForward(item: Item): boolean {
		const itemIndex = this.indexOf(item);
		if (itemIndex < 0 || itemIndex >= this.length - 1) return false;

		Tree.runTransaction(this, () => {
			this.moveToIndex(itemIndex, itemIndex + 1);
		});
		return true;
	}

	/**
	 * Move an item backward one position (lower z-order)
	 */
	moveItemBackward(item: Item): boolean {
		const itemIndex = this.indexOf(item);
		if (itemIndex <= 0) return false;

		Tree.runTransaction(this, () => {
			this.moveToIndex(itemIndex - 1, itemIndex);
		});
		return true;
	}

	/**
	 * Bring an item to the front (highest z-order)
	 */
	bringItemToFront(item: Item): boolean {
		const itemIndex = this.indexOf(item);
		if (itemIndex < 0 || itemIndex >= this.length - 1) return false;

		Tree.runTransaction(this, () => {
			this.moveToEnd(itemIndex);
		});
		return true;
	}

	/**
	 * Send an item to the back (lowest z-order)
	 */
	sendItemToBack(item: Item): boolean {
		const itemIndex = this.indexOf(item);
		if (itemIndex <= 0) return false;

		Tree.runTransaction(this, () => {
			this.moveToStart(itemIndex);
		});
		return true;
	}
}

export class App extends sf.object("App", {
	items: Items,
	comments: Comments,
}) {}

export type FluidRow = InstanceType<typeof FluidRowSchema>;
export type FluidColumn = InstanceType<typeof FluidColumnSchema>;

/**
 * Export the tree config appropriate for this schema.
 * This is passed into the SharedTree when it is initialized.
 * */
export const appTreeConfiguration = new TreeViewConfiguration(
	// Schema for the root
	{ schema: App }
);
