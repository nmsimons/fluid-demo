/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TableSchema, SchemaFactoryAlpha } from "@fluidframework/tree/alpha";
import {
	SHAPE_MIN_SIZE,
	SHAPE_MAX_SIZE,
	SHAPE_SPAWN_MIN_SIZE,
	SHAPE_SPAWN_MAX_SIZE,
} from "../constants/shape.js";
import { DEFAULT_NOTE_COLOR, type NoteColor } from "../constants/note.js";
import {
	TEXT_DEFAULT_FONT_SIZE,
	TEXT_DEFAULT_COLOR,
	TEXT_DEFAULT_WIDTH,
} from "../constants/text.js";
import { clampTextWidth } from "../utils/text.js";
import {
	TreeViewConfiguration,
	Tree,
	TreeNodeFromImplicitAllowedTypes,
	TreeStatus,
} from "fluid-framework";
import { ExposedMethods, buildFunc, exposeMethodsSymbol } from "@fluidframework/tree-agent/alpha";
import { z } from "zod";

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

const NOTE_ROTATION_SPREAD_DEGREES = 8;

export class User extends sf.object("User", {
	id: sf.string,
	name: sf.string,
}) {}

export class Circle extends sf.object("Circle", {
	radius: sf.required(sf.number, {
		metadata: { description: "The radius of the circle" },
	}),
}) {}

export class Square extends sf.object("Square", {
	size: sf.required(sf.number, {
		metadata: { description: "The size of the square" },
	}),
}) {}

export class Triangle extends sf.object("Triangle", {
	base: sf.required(sf.number, {
		metadata: { description: "The base of the triangle" },
	}),
	height: sf.required(sf.number, {
		metadata: { description: "The height of the triangle" },
	}),
}) {}

export class Star extends sf.object("Star", {
	size: sf.required(sf.number, {
		metadata: { description: "The size of the star" },
	}),
}) {}

export class Rectangle extends sf.object("Rectangle", {
	width: sf.required(sf.number, {
		metadata: { description: "The width of the rectangle" },
	}),
	height: sf.required(sf.number, {
		metadata: { description: "The height of the rectangle" },
	}),
}) {}

export class Shape extends sf.object("Shape", {
	color: sf.required(sf.string, {
		metadata: {
			description: `The color of this shape, as a hexadecimal RGB string, e.g. "#00FF00" for bright green`,
		},
	}),
	type: sf.required([Circle, Square, Triangle, Star, Rectangle], {
		metadata: { description: `One of "circle", "square", "triangle", "star", or "rectangle"` },
	}),
	filled: sf.optional(sf.boolean, {
		metadata: {
			description: "Whether the shape is rendered filled (true) or outline-only (false)",
		},
	}),
}) {}

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
export class Votes extends sf.array("Votes", User) {
	/**
	 * Add a vote for the given user if they have not already voted.
	 * Updates the stored user name when the same user votes again.
	 * @param user - The user casting the vote
	 */
	addVote(user: User): void {
		const existingIndex = this.findIndex((entry) => entry.id === user.id);
		if (existingIndex !== -1) {
			this[existingIndex].name = user.name;
			return;
		}
		this.insertAtEnd(user);
	}

	/**
	 * Remove an existing vote by user id.
	 * @param user - The user whose vote should be removed
	 */
	removeVote(user: User): void {
		const index = this.findIndex((entry) => entry.id === user.id);
		if (index === -1) {
			return;
		}
		this.removeAt(index);
	}

	/**
	 * Toggle a vote for the given user.
	 */
	toggleVote(user: User): void {
		const hasVote = this.hasVoted(user);
		if (hasVote) {
			this.removeVote(user);
			return;
		}
		this.addVote(user);
	}

	/**
	 * Get the number of votes
	 * @returns The number of votes
	 */
	getNumberOfVotes(): number {
		return this.length;
	}

	/**
	 * Return whether the user has voted
	 * @param user - The user to check
	 * @return Whether the user has voted
	 */
	hasVoted(user: User): boolean {
		return this.some((entry) => entry.id === user.id);
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Votes,
			"addVote",
			buildFunc({ returns: z.void() }, ["user", methods.instanceOf(User)])
		);
		methods.expose(
			Votes,
			"removeVote",
			buildFunc({ returns: z.void() }, ["user", methods.instanceOf(User)])
		);
		methods.expose(
			Votes,
			"toggleVote",
			buildFunc({ returns: z.void() }, ["user", methods.instanceOf(User)])
		);
		methods.expose(
			Votes,
			"hasVoted",
			buildFunc({ returns: z.boolean() }, ["user", methods.instanceOf(User)])
		);
		methods.expose(Votes, "getNumberOfVotes", buildFunc({ returns: z.number() }));
	}
}
export class Comment extends sf.object("Comment", {
	id: sf.string,
	text: sf.string,
	user: User,
	votes: Votes,
	createdAt: DateTime,
}) {
	delete(): void {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Comments)) {
			parent.removeAt(parent.indexOf(this));
		}
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(Comment, "delete", buildFunc({ returns: z.void() }));
	}
}

export class Comments extends sf.array("Comments", [Comment]) {
	addComment(text: string, user: User): void {
		const comment = new Comment({
			id: crypto.randomUUID(),
			text,
			user,
			votes: [],
			createdAt: new DateTime({ ms: Date.now() }),
		});
		this.insertAtEnd(comment);
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Comments,
			"addComment",
			buildFunc(
				{ returns: z.void() },
				["text", z.string()],
				["user", methods.instanceOf(User)]
			)
		);
	}
}

export class Note extends sf.object(
	"Note",
	// Fields for Notes which SharedTree will store and synchronize across clients.
	// These fields are exposed as members of instances of the Note class.
	{
		text: sf.string,
		color: sf.required(sf.string, {
			metadata: { description: "Hex color used to render the sticky note background" },
		}),
	}
) {}

export class TextBlock extends sf.object("TextBlock", {
	text: sf.required(sf.string, {
		metadata: { description: "The textual content displayed within the text item" },
	}),
	color: sf.required(sf.string, {
		metadata: {
			description: `The color of the text as a hexadecimal RGB string, e.g. "#111827"`,
		},
	}),
	width: sf.required(sf.number, {
		metadata: {
			description: "The configured width of the text container in pixels",
		},
	}),
	fontSize: sf.required(sf.number, {
		metadata: {
			description: "The font size in pixels used to render the text",
		},
	}),
	bold: sf.optional(sf.boolean, {
		metadata: { description: "Whether the text is rendered bold" },
	}),
	italic: sf.optional(sf.boolean, {
		metadata: { description: "Whether the text is rendered italic" },
	}),
	underline: sf.optional(sf.boolean, {
		metadata: { description: "Whether the text is underlined" },
	}),
	strikethrough: sf.optional(sf.boolean, {
		metadata: { description: "Whether the text is rendered with a strikethrough" },
	}),
	cardStyle: sf.optional(sf.boolean, {
		metadata: {
			description:
				"Whether the text is displayed on a white card with rounded corners and drop shadow",
		},
	}),
	textAlign: sf.optional(sf.string, {
		metadata: {
			description:
				"The horizontal alignment of the text within the container: 'left', 'center', or 'right'",
		},
	}),
}) {}

export type typeDefinition = TreeNodeFromImplicitAllowedTypes<typeof schemaTypes>;
const schemaTypes = [sf.string, sf.number, sf.boolean, DateTime, Votes] as const;

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

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			FluidTable,
			"createDetachedRow",
			buildFunc({ returns: methods.instanceOf(FluidRowSchema) })
		);
		methods.expose(
			FluidTable,
			"deleteColumn",
			buildFunc({ returns: z.void() }, ["column", methods.instanceOf(FluidColumnSchema)])
		);
		methods.expose(
			FluidTable,
			"getColumnByCellId",
			buildFunc({ returns: methods.instanceOf(FluidColumnSchema).optional() }, [
				"cellId",
				z.string(),
			])
		);
		methods.expose(FluidTable, "addColumn", buildFunc({ returns: z.void() }));
		methods.expose(FluidTable, "addRow", buildFunc({ returns: z.void() }));
		methods.expose(
			FluidTable,
			"moveColumnLeft",
			buildFunc({ returns: z.boolean() }, ["column", methods.instanceOf(FluidColumnSchema)])
		);
		methods.expose(
			FluidTable,
			"moveColumnRight",
			buildFunc({ returns: z.boolean() }, ["column", methods.instanceOf(FluidColumnSchema)])
		);
		methods.expose(
			FluidTable,
			"moveRowUp",
			buildFunc({ returns: z.boolean() }, ["row", methods.instanceOf(FluidRowSchema)])
		);
		methods.expose(
			FluidTable,
			"moveRowDown",
			buildFunc({ returns: z.boolean() }, ["row", methods.instanceOf(FluidRowSchema)])
		);
		methods.expose(
			FluidTable,
			"createRowWithValues",
			buildFunc({ returns: methods.instanceOf(FluidRowSchema) })
		);
	}
}

export class Group extends sf.objectRecursive("Group", {
	name: sf.string,
	items: [() => Items],
	viewAsGrid: sf.optional(sf.boolean),
}) {}

export class Item extends sf.objectRecursive("Item", {
	id: sf.string,
	createdBy: User,
	createdAt: DateTime,
	updatedBy: sf.array(User),
	updatedAt: DateTime,
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
	votes: Votes,
	connections: sf.array(sf.string),
	content: [Shape, Note, TextBlock, FluidTable, Group],
}) {
	delete(): void {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Items)) {
			parent.removeAt(parent.indexOf(this));
		}
	}

	/**
	 * Add a directional connection TO this item from another item
	 * @param fromItemId The ID of the item connecting to this item
	 */
	addConnection(fromItemId: string): void {
		if (!this.connections.includes(fromItemId)) {
			this.connections.insertAtEnd(fromItemId);
		}
	}

	/**
	 * Remove a directional connection TO this item from another item
	 * @param fromItemId The ID of the item to remove connection from
	 */
	removeConnection(fromItemId: string): void {
		const index = this.connections.indexOf(fromItemId);
		if (index !== -1) {
			this.connections.removeAt(index);
		}
	}

	/**
	 * Check if this item has a connection from a specific item
	 * @param fromItemId The ID of the item to check
	 * @returns true if the connection exists
	 */
	hasConnection(fromItemId: string): boolean {
		return this.connections.includes(fromItemId);
	}

	/**
	 * Get all item IDs that connect TO this item
	 * @returns Array of item IDs
	 */
	getConnections(): string[] {
		return Array.from(this.connections);
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(Item, "delete", buildFunc({ returns: z.void() }));
		methods.expose(
			Item,
			"addConnection",
			buildFunc({ returns: z.void() }, ["fromItemId", z.string()])
		);
		methods.expose(
			Item,
			"removeConnection",
			buildFunc({ returns: z.void() }, ["fromItemId", z.string()])
		);
		methods.expose(
			Item,
			"hasConnection",
			buildFunc({ returns: z.boolean() }, ["fromItemId", z.string()])
		);
		methods.expose(Item, "getConnections", buildFunc({ returns: z.array(z.string()) }));
	}
}

// Simple Items array containing only Item objects
export class Items extends sf.arrayRecursive("Items", [Item]) {
	/**
	 * Create a new shape item and add it to the items collection
	 */
	createShapeItem(
		shapeType: "circle" | "square" | "triangle" | "star" | "rectangle",
		canvasSize: { width: number; height: number },
		shapeColors: string[],
		filled = true,
		user: User
	): Item {
		// Spawn within a moderate sub-range so new shapes aren't extreme
		const maxSize = Math.min(SHAPE_SPAWN_MAX_SIZE, SHAPE_MAX_SIZE);
		const minSize = Math.max(SHAPE_SPAWN_MIN_SIZE, SHAPE_MIN_SIZE);

		const baseSize = this.getRandomNumber(minSize, maxSize);
		let shapeTypeNode: Shape["type"]; // Narrowed per case
		switch (shapeType) {
			case "circle": {
				const radius = Math.max(4, Math.round(baseSize / 2));
				shapeTypeNode = new Circle({ radius });
				break;
			}
			case "square": {
				const edge = Math.max(minSize, baseSize);
				shapeTypeNode = new Square({ size: edge });
				break;
			}
			case "triangle": {
				const base = Math.max(minSize, baseSize);
				const height = Math.max(minSize, Math.round(baseSize * 0.866));
				shapeTypeNode = new Triangle({ base, height });
				break;
			}
			case "star": {
				const starSize = Math.max(minSize, baseSize);
				shapeTypeNode = new Star({ size: starSize });
				break;
			}
			case "rectangle": {
				const width = Math.max(minSize, this.getRandomNumber(minSize, maxSize));
				const height = Math.max(minSize, this.getRandomNumber(minSize, maxSize));
				shapeTypeNode = new Rectangle({ width, height });
				break;
			}
			default: {
				const edge = Math.max(minSize, baseSize);
				shapeTypeNode = new Square({ size: edge });
				break;
			}
		}

		const shape = new Shape({
			color: shapeColors[Math.floor(Math.random() * shapeColors.length)],
			type: shapeTypeNode,
			filled,
		});

		const { width: shapeWidth, height: shapeHeight } = this.getShapeDimensionsForType(
			shape.type
		);
		const maxX = Math.max(0, Math.floor(canvasSize.width - shapeWidth));
		const maxY = Math.max(0, Math.floor(canvasSize.height - shapeHeight));

		const item = new Item({
			id: crypto.randomUUID(),
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: this.getRandomNumber(0, maxX),
			y: this.getRandomNumber(0, maxY),
			comments: [],
			votes: [],
			connections: [],
			content: shape,
			rotation:
				this.getRandomNumber(0, 1) === 0
					? this.getRandomNumber(0, 15)
					: this.getRandomNumber(345, 360),
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a new note item and add it to the items collection
	 */
	createNoteItem(
		canvasSize: { width: number; height: number },
		user: User,
		color: NoteColor = DEFAULT_NOTE_COLOR
	): Item {
		const note = new Note({
			text: "",
			color,
		});

		const noteRotationOffset = this.getRandomNumber(0, NOTE_ROTATION_SPREAD_DEGREES);
		const item = new Item({
			id: crypto.randomUUID(),
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: this.getRandomNumber(0, canvasSize.width - 200),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: [],
			connections: [],
			content: note,
			rotation:
				this.getRandomNumber(0, 1) === 0
					? noteRotationOffset
					: (360 - noteRotationOffset) % 360,
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a new table item and add it to the items collection
	 */
	createTableItem(canvasSize: { width: number; height: number }, user: User): Item {
		const table = this.createDefaultTable();

		const item = new Item({
			id: crypto.randomUUID(),
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: this.getRandomNumber(0, canvasSize.width - 200),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: [],
			connections: [],
			content: table,
			rotation: 0,
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a new Group item and add it to the items collection
	 */
	createGroupItem(name: string, canvasSize: { width: number; height: number }, user: User): Item {
		const group = new Group({
			name,
			items: new Items(),
			viewAsGrid: false,
		});
		const item = new Item({
			id: crypto.randomUUID(),
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: this.getRandomNumber(0, canvasSize.width - 200),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: [],
			connections: [],
			content: group,
			rotation: 0,
		});

		this.insertAtEnd(item);
		return item;
	}

	/**
	 * Create a new text block item and add it to the items collection
	 */
	createTextBlockItem(canvasSize: { width: number; height: number }, user: User): Item {
		const textBlock = new TextBlock({
			text: "",
			color: TEXT_DEFAULT_COLOR,
			width: TEXT_DEFAULT_WIDTH,
			fontSize: TEXT_DEFAULT_FONT_SIZE,
		});
		const item = new Item({
			id: crypto.randomUUID(),
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: this.getRandomNumber(0, canvasSize.width - 200),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: [],
			connections: [],
			content: textBlock,
			rotation: 0,
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
	duplicateItem(item: Item, user: User, canvasSize: { width: number; height: number }): Item {
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
			const originalShape = item.content;
			let duplicatedType: Shape["type"];
			if (Tree.is(originalShape.type, Circle)) {
				duplicatedType = new Circle({ radius: originalShape.type.radius });
			} else if (Tree.is(originalShape.type, Square)) {
				duplicatedType = new Square({ size: originalShape.type.size });
			} else if (Tree.is(originalShape.type, Triangle)) {
				duplicatedType = new Triangle({
					base: originalShape.type.base,
					height: originalShape.type.height,
				});
			} else if (Tree.is(originalShape.type, Star)) {
				duplicatedType = new Star({ size: originalShape.type.size });
			} else if (Tree.is(originalShape.type, Rectangle)) {
				duplicatedType = new Rectangle({
					width: originalShape.type.width,
					height: originalShape.type.height,
				});
			} else {
				throw new Error("Unknown shape subtype, cannot duplicate");
			}

			duplicatedContent = new Shape({
				color: originalShape.color,
				type: duplicatedType,
				filled: originalShape.filled,
			});
		} else if (Tree.is(item.content, Note)) {
			duplicatedContent = new Note({
				text: item.content.text,
				color: item.content.color ?? DEFAULT_NOTE_COLOR,
			});
		} else if (Tree.is(item.content, TextBlock)) {
			duplicatedContent = new TextBlock({
				text: item.content.text,
				color: item.content.color,
				width: clampTextWidth(item.content.width),
				fontSize: item.content.fontSize,
				bold: item.content.bold ?? false,
				italic: item.content.italic ?? false,
				underline: item.content.underline ?? false,
				strikethrough: item.content.strikethrough ?? false,
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
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: newX,
			y: newY,
			comments: [],
			votes: [],
			connections: [],
			content: duplicatedContent,
			rotation: item.rotation,
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

	private getShapeDimensionsForType(typeNode: Shape["type"]): { width: number; height: number } {
		if (Tree.is(typeNode, Circle)) {
			const diameter = typeNode.radius * 2;
			return { width: diameter, height: diameter };
		}
		if (Tree.is(typeNode, Square)) {
			return { width: typeNode.size, height: typeNode.size };
		}
		if (Tree.is(typeNode, Triangle)) {
			return { width: typeNode.base, height: typeNode.height };
		}
		if (Tree.is(typeNode, Star)) {
			return { width: typeNode.size, height: typeNode.size };
		}
		if (Tree.is(typeNode, Rectangle)) {
			return { width: typeNode.width, height: typeNode.height };
		}
		return { width: SHAPE_MIN_SIZE, height: SHAPE_MIN_SIZE };
	}

	createTextItem(
		user: User,
		canvasSize: { width: number; height: number },
		props?: {
			text?: string;
			color?: string;
			width?: number;
			fontSize?: number;
			bold?: boolean;
			italic?: boolean;
			underline?: boolean;
			strikethrough?: boolean;
			cardStyle?: boolean;
			textAlign?: string;
		}
	): Item {
		const width = clampTextWidth(props?.width ?? TEXT_DEFAULT_WIDTH);
		const textBlock = new TextBlock({
			text: props?.text ?? "New text",
			color: props?.color ?? TEXT_DEFAULT_COLOR,
			width,
			fontSize: props?.fontSize ?? TEXT_DEFAULT_FONT_SIZE,
			bold: props?.bold ?? false,
			italic: props?.italic ?? false,
			underline: props?.underline ?? false,
			strikethrough: props?.strikethrough ?? false,
			cardStyle: props?.cardStyle ?? false,
			textAlign: props?.textAlign ?? "left",
		});

		const item = new Item({
			id: crypto.randomUUID(),
			createdBy: user,
			createdAt: new DateTime({ ms: Date.now() }),
			updatedBy: [],
			updatedAt: new DateTime({ ms: Date.now() }),
			x: this.getRandomNumber(0, canvasSize.width - width),
			y: this.getRandomNumber(0, canvasSize.height - 200),
			comments: [],
			votes: [],
			connections: [],
			content: textBlock,
			rotation: 0,
		});

		this.insertAtEnd(item);
		return item;
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

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Items,
			"createShapeItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["shapeType", z.enum(["circle", "square", "triangle", "star", "rectangle"])],
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["shapeColors", z.array(z.string())],
				["filled", z.boolean().optional()],
				["user", methods.instanceOf(User)]
			)
		);
		methods.expose(
			Items,
			"createNoteItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["user", methods.instanceOf(User)],
				[
					"color",
					z.enum(["#FEFF68", "#FFE4A7", "#C8F7C5", "#FAD4D8", "#D7E8FF"]).optional(),
				]
			)
		);
		methods.expose(
			Items,
			"createTableItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["user", methods.instanceOf(User)]
			)
		);
		methods.expose(
			Items,
			"createGroupItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["name", z.string()],
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["user", methods.instanceOf(User)]
			)
		);
		methods.expose(
			Items,
			"createTextBlockItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				["user", methods.instanceOf(User)]
			)
		);
		methods.expose(
			Items,
			"createTextItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["user", methods.instanceOf(User)],
				["canvasSize", z.object({ width: z.number(), height: z.number() })],
				[
					"props",
					z
						.object({
							text: z.string().optional(),
							color: z.string().optional(),
							width: z.number().optional(),
							fontSize: z.number().optional(),
							bold: z.boolean().optional(),
							italic: z.boolean().optional(),
							underline: z.boolean().optional(),
							strikethrough: z.boolean().optional(),
							cardStyle: z.boolean().optional(),
							textAlign: z.string().optional(),
						})
						.optional(),
				]
			)
		);
		methods.expose(
			Items,
			"duplicateItem",
			buildFunc(
				{ returns: methods.instanceOf(Item) },
				["item", methods.instanceOf(Item)],
				["user", methods.instanceOf(User)],
				["canvasSize", z.object({ width: z.number(), height: z.number() })]
			)
		);
		methods.expose(
			Items,
			"moveItemForward",
			buildFunc({ returns: z.boolean() }, ["item", methods.instanceOf(Item)])
		);
		methods.expose(
			Items,
			"moveItemBackward",
			buildFunc({ returns: z.boolean() }, ["item", methods.instanceOf(Item)])
		);
		methods.expose(
			Items,
			"bringItemToFront",
			buildFunc({ returns: z.boolean() }, ["item", methods.instanceOf(Item)])
		);
		methods.expose(
			Items,
			"sendItemToBack",
			buildFunc({ returns: z.boolean() }, ["item", methods.instanceOf(Item)])
		);
	}
}

// ---- Ink (extended vector) schema definitions ----
export class InkPoint extends sf.object("InkPoint", {
	x: sf.number,
	y: sf.number,
	t: sf.optional(sf.number), // timestamp (ms since epoch or stroke start)
	p: sf.optional(sf.number), // pressure 0..1
}) {}

export class InkStyle extends sf.object("InkStyle", {
	strokeColor: sf.string,
	strokeWidth: sf.number,
	opacity: sf.number,
	lineCap: sf.string, // e.g. round | butt | square
	lineJoin: sf.string, // e.g. round | miter | bevel
}) {}

export class InkBBox extends sf.object("InkBBox", {
	x: sf.number,
	y: sf.number,
	w: sf.number,
	h: sf.number,
}) {}

export class InkStroke extends sf.object("InkStroke", {
	id: sf.string,
	points: sf.array([InkPoint]),
	style: InkStyle,
	bbox: InkBBox,
	simplified: sf.optional(sf.array([InkPoint])),
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
export const appTreeConfiguration = new TreeViewConfiguration(
	// Schema for the root
	{ schema: App }
);
