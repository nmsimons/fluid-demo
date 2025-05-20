/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import {
	Item,
	Items,
	Shape,
	Vote,
	Comment,
	DateTime,
	Note,
	hintValues,
	FluidTable,
} from "../schema/app_schema.js";
import {
	DismissFilled,
	ShapesRegular,
	ThumbLikeFilled,
	ThumbLikeRegular,
	CommentRegular,
	CommentFilled,
	NoteRegular,
	TableRegular,
} from "@fluentui/react-icons";
import { PresenceContext } from "./PresenceContext.js";
import { useTree } from "./useTree.js";
import { TooltipButton, IconButton } from "./buttonux.js";

export function NewShapeButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
}): JSX.Element {
	const { items, canvasSize } = props;

	useTree(items);

	const maxSize = 120;
	const minSize = 100;

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		const shape = new Shape({
			size: getRandomNumber(minSize, maxSize),
			// List of 16 colors to randomly select from
			color: [
				"#FF5733",
				"#33FF57",
				"#3357FF",
				"#FF33A1",
				"#A133FF",
				"#33FFF5",
				"#F5FF33",
				"#FF8C33",
				"#8C33FF",
				"#33FF8C",
				"#F5A133",
				"#A1F533",
				"#5733FF",
				"#FF3357",
				"#3357A1",
				"#A1FF33",
			][Math.floor(Math.random() * 16)],
			// Type is randomly selected from "circle", "square", "triangle", or "star"
			type: ["circle", "square", "triangle", "star"][Math.floor(Math.random() * 4)],
		});
		const item = new Item({
			id: crypto.randomUUID(),
			x: getRandomNumber(0, canvasSize.width - maxSize - minSize),
			y: getRandomNumber(0, canvasSize.height - maxSize - minSize),
			comments: [],
			votes: new Vote({ votes: [] }),
			content: shape,
			// a random number between 0 and 15
			rotation:
				getRandomNumber(0, 1) === 0 ? getRandomNumber(0, 15) : getRandomNumber(345, 360),
		});
		items.insertAtEnd(item);
	};
	return (
		<TooltipButton
			onClick={(e: React.MouseEvent) => handleClick(e)}
			icon={<ShapesRegular />}
			tooltip="Insert a new shape"
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
			tooltip="Insert a new note"
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
			tooltip="Insert a new table"
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
	return <IconButton onClick={() => deleteFunc()} icon={<DismissFilled />} />;
}

export function VoteButton(props: { vote: Vote }): JSX.Element {
	const { vote } = props;
	useTree(vote);
	const presence = useContext(PresenceContext);
	const userId = presence.users.getMyself().value.id;

	const handleClick = (e: React.MouseEvent<Element, MouseEvent>) => {
		e.stopPropagation();
		vote.toggleVote(userId);
	};

	return (
		<TooltipButton
			icon={vote.hasVoted(userId) ? <ThumbLikeFilled /> : <ThumbLikeRegular />}
			onClick={(e) => handleClick(e)}
			tooltip={vote.numberOfVotes.toString()}
		></TooltipButton>
	);
}

export function CommentButton(props: { item: Item }): JSX.Element {
	const { item } = props;
	useTree(item);
	const presence = useContext(PresenceContext);
	const handleClick = (e: React.MouseEvent<Element, MouseEvent>) => {
		e.stopPropagation();
		const text = prompt("Enter your comment: ");
		if (text) {
			const comment = new Comment({
				id: crypto.randomUUID(),
				text,
				userId: presence.users.getMyself().value.id,
				username: presence.users.getMyself().value.name,
				votes: new Vote({ votes: [] }),
				createdAt: new DateTime({ ms: Date.now() }),
			});
			item.comments.insertAtEnd(comment);
		}
	};

	return (
		<TooltipButton
			onClick={(e) => handleClick(e)}
			icon={item.comments.length > 0 ? <CommentFilled /> : <CommentRegular />}
			tooltip="Add Comment"
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
