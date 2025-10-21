/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import {
	DismissFilled,
	CopyRegular,
	ThumbLikeFilled,
	ThumbLikeRegular,
	CommentFilled,
	CommentRegular,
} from "@fluentui/react-icons";
import { TooltipButton } from "../../forms/Button.js";
import { useTree } from "../../../hooks/useTree.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { CommentPaneContext } from "../../app/App.js";
import { Votes, Item } from "../../../../schema/appSchema.js";
import { createSchemaUser } from "../../../../utils/userUtils.js";

// Basic actions
export function DeleteButton(props: { delete: () => void; count?: number }): JSX.Element {
	const { delete: del, count = 1 } = props;
	const tt = count > 1 ? `Delete ${count} items` : "Delete item";
	return (
		<TooltipButton
			onClick={() => del()}
			icon={<DismissFilled />}
			tooltip={tt}
			keyboardShortcut="Delete"
		/>
	);
}

export function DuplicateButton(props: { duplicate: () => void; count?: number }): JSX.Element {
	const { duplicate, count = 1 } = props;
	const tt = count > 1 ? `Duplicate ${count} items` : "Duplicate item";
	return (
		<TooltipButton
			onClick={() => duplicate()}
			icon={<CopyRegular />}
			tooltip={tt}
			keyboardShortcut="Ctrl+D"
		/>
	);
}

export function VoteButton(props: { vote: Votes }): JSX.Element {
	const { vote } = props;
	const presence = useContext(PresenceContext);
	const currentUserInfo = presence.users.getMyself().value;
	const schemaUser = createSchemaUser({ id: currentUserInfo.id, name: currentUserInfo.name });
	useTree(vote);
	const has = vote.hasVoted(schemaUser);
	const cnt = vote.getNumberOfVotes();
	return (
		<TooltipButton
			icon={has ? <ThumbLikeFilled /> : <ThumbLikeRegular />}
			onClick={(e) => {
				e.stopPropagation();
				vote.toggleVote(schemaUser);
			}}
			tooltip={has ? `Remove your vote (${cnt})` : `Vote (${cnt})`}
			keyboardShortcut="V"
		/>
	);
}

export function CommentButton(props: { item: Item }): JSX.Element {
	const { item } = props;
	const ctx = useContext(CommentPaneContext);
	useTree(item);
	const count = item.comments.length;
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				if (!ctx) return;
				ctx.openCommentPaneAndFocus(item.id);
			}}
			icon={count > 0 ? <CommentFilled /> : <CommentRegular />}
			tooltip={count > 0 ? `View comments (${count})` : "Add a comment"}
			keyboardShortcut="Ctrl+/"
		/>
	);
}
