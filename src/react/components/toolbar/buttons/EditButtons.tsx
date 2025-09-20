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
	BotRegular,
	BotFilled,
} from "@fluentui/react-icons";
import { TooltipButton } from "../../forms/Button.js";
import { useTree } from "../../../hooks/useTree.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { AuthContext } from "../../../contexts/AuthContext.js";
import { getZumoAuthToken } from "../../../../utils/zumoAuth.js";
import { CommentPaneContext } from "../../app/App.js";
import { Vote, Item, App, Comment, Job, DateTime } from "../../../../schema/appSchema.js";
import { skipNextUndoRedo } from "../../../../undo/undo.js";
import { PublicClientApplication } from "@azure/msal-browser";

/**
 * Create a new AI agent job via API call
 */
async function createAgentJob(
	msalInstance: PublicClientApplication,
	comment: Comment,
	containerId: string,
	branchId: string = "main"
): Promise<void> {
	try {
		const zumoToken = await getZumoAuthToken(msalInstance);
		const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL;

		const response = await fetch(`${baseUrl}/api/demoApp/agent/create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-ZUMO-AUTH": zumoToken,
			},
			body: JSON.stringify({
				model: "gpt-5",
				messages: [{ role: "user", content: comment.text }],
				containerId: containerId,
				branchId: branchId,
			}),
		});

		if (!response.ok) {
			throw new Error(`Agent API call failed: ${response.status} ${response.statusText}`);
		}

		console.log("Successfully created AI agent job");
	} catch (error) {
		console.error("Failed to create AI agent job:", error);
		throw error;
	}
}

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

export function VoteButton(props: { vote: Vote }): JSX.Element {
	const { vote } = props;
	const presence = useContext(PresenceContext);
	const userId = presence.users.getMyself().value.id;
	useTree(vote);
	const has = vote.hasVoted(userId);
	const cnt = vote.numberOfVotes;
	return (
		<TooltipButton
			icon={has ? <ThumbLikeFilled /> : <ThumbLikeRegular />}
			onClick={(e) => {
				e.stopPropagation();
				vote.toggleVote(userId);
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

export function JobButton(props: { comment: Comment; app: App; containerId: string }): JSX.Element {
	const { comment, app, containerId } = props;
	const authContext = useContext(AuthContext);
	useTree(app.jobs);

	const existingJob = app.jobs.get(comment.id);
	const hasJob = existingJob !== undefined;
	const isPending = existingJob?.status === "PENDING";

	const iconStyle = isPending ? { animation: "spin 2s linear infinite" } : {};

	return (
		<>
			<style>
				{`
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				`}
			</style>
			<TooltipButton
				onClick={async (e) => {
					e.stopPropagation();

					if (hasJob) {
						// If job already exists, remove it
						skipNextUndoRedo();
						app.jobs.delete(comment.id);
					} else {
						// Create new job
						const job = new Job({
							id: crypto.randomUUID(),
							branch: "main",
							target: comment.id,
							description: `Process comment: "${comment.text}"`,
							status: "PENDING",
							created: new DateTime({ ms: Date.now() }),
							completed: undefined,
						});

						skipNextUndoRedo(); // Stops the next change from going on the undo/redo stack.
						app.jobs.set(comment.id, job);

						// Call the agent service
						try {
							await createAgentJob(authContext.msalInstance!, comment, containerId);
						} catch (error) {
							console.error("Failed to create agent job:", error);
						}
					}
				}}
				icon={<div style={iconStyle}>{hasJob ? <BotFilled /> : <BotRegular />}</div>}
				tooltip={hasJob ? `Remove Job (${existingJob.status})` : "Create Job"}
			/>
		</>
	);
}
