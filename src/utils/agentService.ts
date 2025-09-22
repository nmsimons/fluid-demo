/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { PublicClientApplication } from "@azure/msal-browser";
import { getZumoAuthToken } from "./zumoAuth.js";
import { DateTime, Job } from "../schema/appSchema.js";

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

export function createJob(id: string): Job {
	return new Job({
		id: crypto.randomUUID(),
		branch: "main",
		target: id,
		request:
			`Process the comment at the target id of this Job. Pay attention to the other comments around the comment for additional context.` +
			`When you are done, include a summary of what you did in the response field of the Job.` +
			`If the Job is completed successfully, change the status to SUCCEEDED. If the job is not completed successfully, change the status to FAILED`,
		status: "PENDING",
		created: new DateTime({ ms: Date.now() }),
		completed: undefined,
	});
}
