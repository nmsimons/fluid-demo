/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { PublicClientApplication } from "@azure/msal-browser";
import { getZumoAuthToken } from "./zumoAuth.js";
import { DateTime, Job, Jobs } from "../schema/appSchema.js";
import { ITreeAlpha } from "fluid-framework/alpha";
import { skipNextUndoRedo } from "../undo/undo.js";

/**
 * Create a new AI agent job via API call
 */
export async function invokeAgent(
	msalInstance: PublicClientApplication,
	job: Job,
	containerId: string
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
				containerId: containerId,
				jobId: job.target,
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

export function createJob(targetId: string, tree: ITreeAlpha, jobs: Jobs): Job {
	const branchId = tree.createSharedBranch();
	const job = new Job({
		id: crypto.randomUUID(),
		branch: branchId,
		target: targetId,
		request:
			`Process the comment with id ${targetId}. Pay attention to the other comments around the comment for additional context.` +
			`When you are done, include a summary of what you did in a comment after the comment with id ${targetId}.`,
		status: "PENDING",
		created: new DateTime({ ms: Date.now() }),
		completed: undefined,
	});
	skipNextUndoRedo(); // Stops the next change from going on the undo/redo stack.
	// Create a job for the agent service
	jobs.set(targetId, job);
	return job;
}
