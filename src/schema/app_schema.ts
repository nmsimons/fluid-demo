/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { buildFunc, ExposedMethods, exposeMethodsSymbol } from "@fluidframework/tree-agent/alpha";
import { layoutCache } from "../react/useLayoutManger.js";
import { Table } from "./table_schema.js";
import {
	TreeViewConfiguration,
	SchemaFactory,
	Tree,
	NodeFromSchema,
	TreeNodeFromImplicitAllowedTypes,
	TreeStatus,
} from "fluid-framework";
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
const sf = new SchemaFactory("fc1db2e8-0a00-11ee-be56-0242ac120002");

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
	},
) {}

export type typeDefinition = TreeNodeFromImplicitAllowedTypes<typeof schemaTypes>;
const schemaTypes = [sf.string, sf.number, sf.boolean, DateTime, Vote] as const;

const tableFactory = new SchemaFactory(sf.scope + "/table1");
export class FluidTable extends Table({
	sf: tableFactory,
	schemaTypes,
}) {
	/**
	 * Get a cell by the synthetic id
	 * @param id The synthetic id of the cell
	 */
	getColumnByCellId(id: `${string}_${string}`) {
		const [, columnId] = id.split("_");
		const column = this.getColumn(columnId);
		if (column === undefined) {
			return undefined;
		}
		return column;
	}

	/**
	 * Create a Row before inserting it into the table
	 * */
	createDetachedRow(): FluidRow {
		return new FluidTable.Row({ id: crypto.randomUUID(), cells: [] });
	}

	/**
	 * Delete a column and all of its cells
	 * @param column The column to delete
	 */
	deleteColumn(column: FluidColumn): void {
		if (Tree.status(column) !== TreeStatus.InDocument) return;
		Tree.runTransaction(this, () => {
			for (const row of this.rows) {
				row.deleteCell(column);
			}
			this.removeColumn(column);
		});
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

	getBoundingBox(): { left: number; top: number; right: number; bottom: number } | undefined {
		return layoutCache.get(this.id);
	}

	public static [exposeMethodsSymbol](methods: ExposedMethods): void {
		methods.expose(
			Item,
			"getBoundingBox",
			buildFunc({
				returns: z
					.object({
						left: z.number(),
						top: z.number(),
						right: z.number(),
						bottom: z.number(),
					})
					.optional(),
			}),
		);
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
export class Items extends sf.array("Items", [Item]) {}

export class App extends sf.object("App", {
	items: Items,
	comments: Comments,
}) {}

export type FluidRow = NodeFromSchema<typeof FluidTable.Row>;
export type FluidColumn = NodeFromSchema<typeof FluidTable.Column>;

/**
 * Export the tree config appropriate for this schema.
 * This is passed into the SharedTree when it is initialized.
 * */
export const appTreeConfiguration = new TreeViewConfiguration(
	// Schema for the root
	{ schema: App },
);
