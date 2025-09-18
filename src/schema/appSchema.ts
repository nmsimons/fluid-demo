/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	TableSchema,
	SchemaFactoryAlpha,
	TreeViewConfigurationAlpha,
} from "@fluidframework/tree/alpha";
import {
	buildFunc,
	exposeMethodsSymbol,
	type ExposedMethods,
} from "@fluidframework/tree-agent/alpha";
import {
	SHAPE_MIN_SIZE,
	SHAPE_MAX_SIZE,
	SHAPE_SPAWN_MIN_SIZE,
	SHAPE_SPAWN_MAX_SIZE,
} from "../constants/shape.js";
import { Tree, TreeNodeFromImplicitAllowedTypes, TreeStatus } from "fluid-framework";
import z from "zod";

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
		metadata: {
			description:
				"Uniform size of the shape in canvas pixels. Must be within [{SHAPE_MIN_SIZE}, {SHAPE_MAX_SIZE}] inclusive.",
		},
	}),
	color: sf.required(sf.string, {
		metadata: {
			description:
				"Color fill of the shape as 7-character hex string (#RRGGBB) including leading '#'. Validated against /^#([0-9A-Fa-f]{6})$/.",
		},
	}),
	type: sf.required(sf.string, {
		metadata: {
			description:
				"Shape variant discriminator. Must be exactly one of: 'circle' | 'square' | 'triangle' | 'star'.",
		},
	}),
}) {} // The size is a number that represents the size of the shape

/**
 * A SharedTree object date-time
 */
export class DateTime extends sf.object("DateTime", {
	ms: sf.required(sf.number, {
		metadata: {
			description:
				"UTC timestamp in milliseconds since Unix epoch (1970-01-01T00:00:00Z). Must represent a valid Date (Number.isFinite and >= 0).",
		},
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
 * A SharedTree object representing a change or action by a user
 */
export class Change extends sf.object("Change", {
	userId: sf.required(sf.string, {
		metadata: {
			description: `A unique user id for the user who made the change, or "AI Agent" if created by an agent`,
		},
	}),
	username: sf.required(sf.string, {
		metadata: {
			description: `A user-friendly name for the user who made the change (e.g. "Alex Pardes"), or "AI Agent" if created by an agent`,
		},
	}),
	datetime: sf.required(DateTime, {
		metadata: { description: "The date and time when this change was made" },
	}),
}) {}

/**
 * A SharedTree object that allows users to vote
 */
export class Vote extends sf.object(hintValues.vote, {
	votes: sf.array(sf.string), // Set of unique userId strings representing affirmative votes.
}) {
	/**
	 * Add a vote to the map of votes
	 * The key is the user id and the value is irrelevant
	 * @param vote The vote to add
	 */
	private addVote(vote: string): void {
		if (this.votes.includes(vote)) {
			return;
		}
		this.votes.insertAtEnd(vote);
	}

	/**
	 * Remove a vote from the map of votes
	 * @param vote The vote to remove
	 */
	private removeVote(vote: string): void {
		if (!this.votes.includes(vote)) {
			return;
		}
		const index = this.votes.indexOf(vote);
		this.votes.removeAt(index);
	}

	/**
	 * Toggle a vote in the map of votes
	 */
	public toggleVote(vote: string): void {
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
	public hasVoted(userId: string): boolean {
		return this.votes.includes(userId);
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Vote,
			"toggleVote",
			buildFunc(
				{
					description:
						"Toggles the user's vote. If the user has voted, it removes the vote; otherwise, it adds the vote.",
					returns: z.void(),
				},
				["userId", z.string()]
			)
		);
		methods.expose(
			Vote,
			"hasVoted",
			buildFunc(
				{
					description: "Checks if the user has voted.",
					returns: z.boolean(),
				},
				["userId", z.string()]
			)
		);
	}
}

export class Comment extends sf.object("Comment", {
	id: sf.required(sf.string, {
		metadata: {
			description:
				"Stable UUID for this comment; never reused for a different logical comment.",
		},
	}),
	text: sf.required(sf.string, {
		metadata: {
			description:
				"User-authored plain text body. May start empty then be updated. No markup expected.",
		},
	}),
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
	votes: sf.required(Vote, {
		metadata: { description: "Set of userIds that endorsed this comment." },
	}),
	createdAt: sf.required(DateTime, {
		metadata: { description: "UTC creation timestamp. Immutable after initial assignment." },
	}),
}) {
	delete(): void {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Comments)) {
			parent.removeAt(parent.indexOf(this));
		}
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Comment,
			"delete",
			buildFunc(
				{
					description: "Deletes the comment in the parent array.",
					returns: z.void(),
				},
				["userId", z.string()]
			)
		);
	}
}

export class Changes extends sf.array("Changes", [Change]) {
	addChange(userId: string, username: string): void {
		const change = new Change({
			userId,
			username,
			datetime: new DateTime({ ms: Date.now() }),
		});
		this.insertAtEnd(change);
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Changes,
			"addChange",
			buildFunc(
				{
					description: "Appends a new change record with current timestamp.",
					returns: z.void(),
				},
				["userId", z.string()],
				["username", z.string()]
			)
		);
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

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Comments,
			"addComment",
			buildFunc(
				{
					description: "Appends a new comment with provided text and author identifiers.",
					returns: z.void(),
				},
				["text", z.string()],
				["userId", z.string()],
				["username", z.string()]
			)
		);
	}
}

export class Note extends sf.object("Note", {
	id: sf.required(sf.string, {
		metadata: { description: "Stable UUID for this note; unique within the document." },
	}),
	text: sf.required(sf.string, {
		metadata: { description: "Plain text body of the note; may be empty when created." },
	}),
	author: sf.required(sf.string, {
		metadata: {
			description: `A unique user id for author of the node, or "AI Agent" if created by an agent`,
		},
	}),
}) {}

export type typeDefinition = TreeNodeFromImplicitAllowedTypes<typeof schemaTypes>;
const schemaTypes = [sf.string, sf.number, sf.boolean, DateTime, Vote] as const;

// Create column schema with properties for hint and name
export const FluidColumnSchema = TableSchema.column({
	schemaFactory: sf,
	cell: schemaTypes,
	props: sf.object("ColumnProps", {
		name: sf.required(sf.string, {
			metadata: {
				description:
					"Human-readable column header label (<=40 chars). Renaming does not alter existing cell values.",
			},
		}),
		hint: sf.optional(sf.string, {
			metadata: {
				description: `Semantic data kind for cells in this column. Must remain one of ${Object.values(
					hintValues
				).join(", ")}.`,
			},
		}),
	}),
});

export const FluidRowSchema = TableSchema.row({
	schemaFactory: sf,
	cell: schemaTypes,
});

export class FluidTable extends TableSchema.table({
	schemaFactory: sf,
	cell: schemaTypes,
	column: FluidColumnSchema,
	row: FluidRowSchema,
}) {
	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			FluidTable,
			"createDetachedRow",
			buildFunc(
				{
					description: "Creates a new row without inserting it into the table.",
					returns: z.instanceof(FluidRowSchema),
				},
				["userId", z.string()]
			)
		);
		methods.expose(
			FluidTable,
			"deleteColumn",
			buildFunc(
				{
					description: "Deletes a column and all of its cells from the table.",
					returns: z.void(),
				},
				["column", z.instanceof(FluidColumnSchema)]
			)
		);
		methods.expose(
			FluidTable,
			"getColumnByCellId",
			buildFunc(
				{
					description:
						"Finds a column by a cell id formatted as 'columnId_rowId'. Returns undefined if not found.",
					returns: z.instanceof(FluidColumnSchema).optional(),
				},
				["cellId", z.string()]
			)
		);
		methods.expose(
			FluidTable,
			"addColumn",
			buildFunc(
				{
					description: "Appends a new column to the end of the table.",
					returns: z.void(),
				},
				["userId", z.string()]
			)
		);
		methods.expose(
			FluidTable,
			"addRow",
			buildFunc(
				{
					description: "Appends a new empty row to the table.",
					returns: z.void(),
				},
				["userId", z.string()]
			)
		);
		methods.expose(
			FluidTable,
			"moveColumnLeft",
			buildFunc(
				{
					description: "Moves the specified column one position to the left if possible.",
					returns: z.boolean(),
				},
				["column", z.instanceof(FluidColumnSchema)]
			)
		);
		methods.expose(
			FluidTable,
			"moveColumnRight",
			buildFunc(
				{
					description:
						"Moves the specified column one position to the right if possible.",
					returns: z.boolean(),
				},
				["column", z.instanceof(FluidColumnSchema)]
			)
		);
		methods.expose(
			FluidTable,
			"moveRowUp",
			buildFunc(
				{
					description: "Moves the specified row one position up if possible.",
					returns: z.boolean(),
				},
				["row", z.instanceof(FluidRowSchema)]
			)
		);
		methods.expose(
			FluidTable,
			"moveRowDown",
			buildFunc(
				{
					description: "Moves the specified row one position down if possible.",
					returns: z.boolean(),
				},
				["row", z.instanceof(FluidRowSchema)]
			)
		);
		methods.expose(
			FluidTable,
			"createRowWithValues",
			buildFunc(
				{
					description:
						"Creates a new row populated with random values based on each column's hint.",
					returns: z.instanceof(FluidRowSchema),
				},
				["userId", z.string()]
			)
		);
	}

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
			const columnIndex = this.columns.indexOf(column);
			if (columnIndex !== -1) {
				this.removeColumns(columnIndex);
			}
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
			this.insertColumns({
				columns: [
					new FluidColumnSchema({
						id: crypto.randomUUID(),
						props: {
							name: `Column ${columnCount + 1}`,
							hint: hintValues.string,
						},
					}),
				],
				index: columnCount,
			});
		});
	}

	/**
	 * Add a new row to the table
	 */
	addRow(): void {
		Tree.runTransaction(this, () => {
			const newRow = { id: crypto.randomUUID(), cells: {} };
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

	/**
	 * Create a row with random values based on column types
	 */
	createRowWithValues(): FluidRow {
		const row = this.createDetachedRow();
		// Iterate through all the columns and add a random value for the new row
		for (const column of this.columns) {
			const fluidColumn = this.getColumn(column.id);
			if (!fluidColumn) continue;

			const hint = fluidColumn.props.hint;

			switch (hint) {
				case hintValues.string:
					row.setCell(fluidColumn, Math.random().toString(36).substring(7));
					break;
				case hintValues.number:
					row.setCell(fluidColumn, Math.floor(Math.random() * 1000));
					break;
				case hintValues.boolean:
					row.setCell(fluidColumn, Math.random() > 0.5);
					break;
				case hintValues.date: {
					// Add a random date
					const startDate = new Date(2020, 0, 1);
					const endDate = new Date();
					const date = this.getRandomDate(startDate, endDate);
					const dateTime = new DateTime({ ms: date.getTime() });
					row.setCell(fluidColumn, dateTime);
					break;
				}
				case hintValues.vote:
					break;
				default: // Add a random string
					row.setCell(fluidColumn, Math.random().toString(36).substring(7));
					break;
			}
		}
		return row;
	}

	/**
	 * Generate a random date between two dates
	 */
	private getRandomDate(start: Date, end: Date): Date {
		return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
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
			description:
				"Clockwise rotation in degrees (0–359). Values outside this range should be normalized mod 360 by clients when mutating.",
		},
	}),
	comments: Comments,
	votes: Vote,
	content: [Shape, Note, FluidTable],
	created: sf.required(Change, {
		metadata: { description: "Information about when and by whom this item was created" },
	}),
	changes: sf.required(Changes, {
		metadata: { description: "History of changes made to this item" },
	}),
}) {
	delete(): void {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Items)) {
			parent.removeAt(parent.indexOf(this));
		}
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Item,
			"delete",
			buildFunc(
				{
					description: "Deletes this item from its parent Items array.",
					returns: z.void(),
				},
				["userId", z.string()]
			)
		);
	}
}

// Simple Items array containing only Item objects
export class Items extends sf.array("Items", [Item]) {
	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Items,
			"createShapeItem",
			buildFunc(
				{
					description:
						"Creates and inserts a new Shape item with randomized size, position, rotation and specified type & palette.",
					returns: z.instanceof(Item),
				},
				["shapeType", z.enum(["circle", "square", "triangle", "star"])],
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["shapeColors", z.array(z.string())],
				["userId", z.string().optional()],
				["username", z.string().optional()]
			)
		);
		methods.expose(
			Items,
			"createNoteItem",
			buildFunc(
				{
					description: "Creates and inserts a new empty Note item.",
					returns: z.instanceof(Item),
				},
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["authorId", z.string()],
				["userId", z.string()],
				["username", z.string()]
			)
		);
		methods.expose(
			Items,
			"createTableItem",
			buildFunc(
				{
					description:
						"Creates and inserts a new Table item with default columns and rows.",
					returns: z.instanceof(Item),
				},
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["userId", z.string()],
				["username", z.string()]
			)
		);
		methods.expose(
			Items,
			"createDefaultTable",
			buildFunc({
				description:
					"Creates a new detached FluidTable with standard starter columns and empty rows.",
				returns: z.instanceof(FluidTable),
			})
		);
		methods.expose(
			Items,
			"duplicateItem",
			buildFunc(
				{
					description:
						"Creates a shallow duplicate of an existing item with offset position and new identifiers.",
					returns: z.instanceof(Item),
				},
				["item", z.instanceof(Item)],
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["userId", z.string()],
				["username", z.string()]
			)
		);
		methods.expose(
			Items,
			"moveItemForward",
			buildFunc(
				{
					description:
						"Moves an item one index forward (higher z-order). Returns true if moved.",
					returns: z.boolean(),
				},
				["item", z.instanceof(Item)]
			)
		);
		methods.expose(
			Items,
			"moveItemBackward",
			buildFunc(
				{
					description:
						"Moves an item one index backward (lower z-order). Returns true if moved.",
					returns: z.boolean(),
				},
				["item", z.instanceof(Item)]
			)
		);
		methods.expose(
			Items,
			"bringItemToFront",
			buildFunc(
				{
					description:
						"Moves an item to the final index (front / top-most). Returns true if moved.",
					returns: z.boolean(),
				},
				["item", z.instanceof(Item)]
			)
		);
		methods.expose(
			Items,
			"sendItemToBack",
			buildFunc(
				{
					description:
						"Moves an item to index 0 (back / bottom-most). Returns true if moved.",
					returns: z.boolean(),
				},
				["item", z.instanceof(Item)]
			)
		);
	}
	/**
	 * Create a new shape item and add it to the items collection
	 */
	createShapeItem(
		shapeType: "circle" | "square" | "triangle" | "star",
		canvasSize: { width: number; height: number },
		shapeColors: string[],
		userId: string = "system",
		username: string = "System"
	): Item {
		// Spawn within a moderate sub-range so new shapes aren't extreme
		const maxSize = Math.min(SHAPE_SPAWN_MAX_SIZE, SHAPE_MAX_SIZE);
		const minSize = Math.max(SHAPE_SPAWN_MIN_SIZE, SHAPE_MIN_SIZE);

		const shape = new Shape({
			size: this.getRandomNumber(minSize, maxSize),
			color: shapeColors[Math.floor(Math.random() * shapeColors.length)],
			type: shapeType,
		});

		const item = new Item({
			id: crypto.randomUUID(),
			x: this.getRandomNumber(0, canvasSize.width - maxSize - minSize),
			y: this.getRandomNumber(0, canvasSize.height - maxSize - minSize),
			comments: [],
			votes: new Vote({ votes: [] }),
			content: shape,
			rotation:
				this.getRandomNumber(0, 1) === 0
					? this.getRandomNumber(0, 15)
					: this.getRandomNumber(345, 360),
			created: new Change({
				userId,
				username,
				datetime: new DateTime({ ms: Date.now() }),
			}),
			changes: [],
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a new note item and add it to the items collection
	 */
	createNoteItem(
		canvasSize: { width: number; height: number },
		authorId: string,
		userId: string,
		username: string
	): Item {
		const note = new Note({
			id: crypto.randomUUID(),
			text: "",
			author: authorId,
		});

		const item = new Item({
			id: crypto.randomUUID(),
			x: this.getRandomNumber(0, canvasSize.width - 200),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: new Vote({ votes: [] }),
			content: note,
			rotation:
				this.getRandomNumber(0, 1) === 0
					? this.getRandomNumber(0, 15)
					: this.getRandomNumber(345, 360),
			created: new Change({
				userId,
				username,
				datetime: new DateTime({ ms: Date.now() }),
			}),
			changes: [],
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a new table item and add it to the items collection
	 */
	createTableItem(
		canvasSize: { width: number; height: number },
		userId: string,
		username: string
	): Item {
		const table = this.createDefaultTable();

		const item = new Item({
			id: crypto.randomUUID(),
			x: this.getRandomNumber(0, canvasSize.width - 200),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: new Vote({ votes: [] }),
			content: table,
			rotation: 0,
			created: new Change({
				userId,
				username,
				datetime: new DateTime({ ms: Date.now() }),
			}),
			changes: [],
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a default table with basic columns
	 */
	createDefaultTable(): FluidTable {
		const rows = new Array(10).fill(null).map(() => {
			return new FluidRowSchema({ id: crypto.randomUUID(), cells: {} });
		});

		const columns = [
			new FluidColumnSchema({
				id: crypto.randomUUID(),
				props: {
					name: "String",
					hint: hintValues.string,
				},
			}),
			new FluidColumnSchema({
				id: crypto.randomUUID(),
				props: {
					name: "Number",
					hint: hintValues.number,
				},
			}),
			new FluidColumnSchema({
				id: crypto.randomUUID(),
				props: {
					name: "Date",
					hint: hintValues.date,
				},
			}),
		];

		return new FluidTable({
			rows: rows,
			columns: columns,
		});
	}

	/**
	 * Duplicate an existing item
	 */
	duplicateItem(
		item: Item,
		canvasSize: { width: number; height: number },
		userId: string,
		username: string
	): Item {
		// Calculate new position with offset
		const offsetX = 20;
		const offsetY = 20;

		let newX = item.x + offsetX;
		let newY = item.y + offsetY;

		if (newX > canvasSize.width - 200) {
			newX = item.x - offsetX;
		}
		if (newY > canvasSize.height - 200) {
			newY = item.y - offsetY;
		}

		// Allow negative coordinates; no clamping to 0

		// Create the appropriate content based on the original item's content type
		let duplicatedContent;

		if (Tree.is(item.content, Shape)) {
			duplicatedContent = new Shape({
				size: item.content.size,
				color: item.content.color,
				type: item.content.type,
			});
		} else if (Tree.is(item.content, Note)) {
			duplicatedContent = new Note({
				id: crypto.randomUUID(),
				text: item.content.text,
				author: item.content.author,
			});
		} else if (Tree.is(item.content, FluidTable)) {
			// Create new columns with new IDs and mapping
			const columnIdMapping: Record<string, string> = {};
			const newColumns = item.content.columns.map((col) => {
				const newColumnId = crypto.randomUUID();
				columnIdMapping[col.id] = newColumnId;
				return new FluidColumnSchema({
					id: newColumnId,
					props: {
						name: col.props.name,
						hint: col.props.hint,
					},
				});
			});

			// Create new rows with copied cell data
			const newRows = item.content.rows.map((row) => {
				const newRow = new FluidRowSchema({
					id: crypto.randomUUID(),
					cells: {},
				});

				// Copy cells to the new row
				const table = item.content as FluidTable;
				for (const column of table.columns) {
					const cell = row.getCell(column);
					if (cell !== undefined) {
						const newColumnId = columnIdMapping[column.id];
						const newColumn = newColumns.find((c) => c.id === newColumnId);
						if (newColumn) {
							newRow.setCell(newColumn, cell);
						}
					}
				}

				return newRow;
			});

			duplicatedContent = new FluidTable({
				rows: newRows,
				columns: newColumns,
			});
		} else {
			throw new Error("Unknown content type, cannot duplicate");
		}

		const duplicatedItem = new Item({
			id: crypto.randomUUID(),
			x: newX,
			y: newY,
			comments: [],
			votes: new Vote({ votes: [] }),
			content: duplicatedContent,
			rotation: item.rotation,
			created: new Change({
				userId,
				username,
				datetime: new DateTime({ ms: Date.now() }),
			}),
			changes: [],
		});

		this.insertAtEnd(duplicatedItem);
		return duplicatedItem;
	}

	/**
	 * Generate a random number between min and max (inclusive)
	 */
	private getRandomNumber(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

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

// ---- Ink (extended vector) schema definitions ----
export class InkPoint extends sf.object("InkPoint", {
	x: sf.required(sf.number, {
		metadata: {
			description:
				"X coordinate in canvas pixels relative to the stroke's local coordinate system.",
		},
	}),
	y: sf.required(sf.number, {
		metadata: {
			description:
				"Y coordinate in canvas pixels relative to the stroke's local coordinate system.",
		},
	}),
	t: sf.optional(sf.number, {
		metadata: {
			description:
				"Timestamp (ms). May be absolute epoch or relative; used only for ordering.",
		},
	}),
	p: sf.optional(sf.number, {
		metadata: { description: "Pointer pressure normalized to [0,1]; omitted if unsupported." },
	}),
}) {}

export class InkStyle extends sf.object("InkStyle", {
	strokeColor: sf.required(sf.string, {
		metadata: { description: "Stroke color token (#RRGGBB or CSS named color)." },
	}),
	strokeWidth: sf.required(sf.number, {
		metadata: { description: "Base stroke width in canvas pixels." },
	}),
	opacity: sf.required(sf.number, { metadata: { description: "Stroke alpha in range [0,1]." } }),
	lineCap: sf.required(sf.string, {
		metadata: { description: "Line cap style: 'round' | 'butt' | 'square'." },
	}),
	lineJoin: sf.required(sf.string, {
		metadata: { description: "Line join style: 'round' | 'miter' | 'bevel'." },
	}),
}) {}

export class InkBBox extends sf.object("InkBBox", {
	x: sf.required(sf.number, {
		metadata: { description: "Minimum x of stroke's axis-aligned bounding box." },
	}),
	y: sf.required(sf.number, {
		metadata: { description: "Minimum y of stroke's axis-aligned bounding box." },
	}),
	w: sf.required(sf.number, { metadata: { description: "Bounding box width in pixels (>=0)." } }),
	h: sf.required(sf.number, {
		metadata: { description: "Bounding box height in pixels (>=0)." },
	}),
}) {}

export class InkStroke extends sf.object("InkStroke", {
	id: sf.required(sf.string, {
		metadata: {
			description: "Stable stroke UUID for diffing, synchronization, and selection.",
		},
	}),
	points: sf.required(sf.array([InkPoint]), {
		metadata: {
			description: "Ordered list of captured input points defining the stroke path.",
		},
	}),
	style: sf.required(InkStyle, {
		metadata: {
			description:
				"Rendering style (color, width, caps, joins, opacity) applied to this stroke.",
		},
	}),
	bbox: sf.required(InkBBox, {
		metadata: {
			description: "Axis-aligned bounding box precomputed for hit testing and culling.",
		},
	}),
	simplified: sf.optional(sf.array([InkPoint]), {
		metadata: {
			description:
				"Optional reduced point set for faster rendering; falls back to 'points' when absent.",
		},
	}),
	created: sf.required(Change, {
		metadata: { description: "Information about when and by whom this ink stroke was created" },
	}),
	changes: sf.required(Changes, {
		metadata: { description: "History of changes made to this ink stroke" },
	}),
}) {}

export class App extends sf.object("App", {
	items: Items,
	comments: Comments,
	inks: sf.array([InkStroke]),
}) {}

export type FluidRow = InstanceType<typeof FluidRowSchema>;
export type FluidColumn = InstanceType<typeof FluidColumnSchema>;

/**
 * Export the tree config appropriate for this schema.
 * This is passed into the SharedTree when it is initialized.
 * */
export const appTreeConfiguration = new TreeViewConfigurationAlpha(
	// Schema for the root
	{ schema: App }
);
