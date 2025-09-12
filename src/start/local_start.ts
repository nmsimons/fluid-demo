/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { AzureClient } from "@fluidframework/azure-client";
import { loadApp } from "../app_load.js";
import { getClientProps } from "../infra/azure/azureClientProps.js";
import { AttachState } from "fluid-framework";
import type { PublicClientApplication } from "@azure/msal-browser";

// Mock user for local development - no authentication required
const localUser = {
	name: "Local Developer",
	id: "local-dev-user",
	image: "https://api.dicebear.com/7.x/avataaars/svg?seed=local-dev-user",
};

// Mock account info for local development
const mockAccount = {
	homeAccountId: "local-dev-user",
	environment: "local",
	tenantId: "local",
	username: "developer@local.dev",
	name: "Local Developer",
	localAccountId: "local-dev-user",
};

// Mock MSAL instance for local development
const mockMsalInstance = {
	loginRedirect: () => console.log("Local mode: No authentication required"),
	logout: () => console.log("Local mode: Logout not required"),
	getAllAccounts: () => [mockAccount],
	getActiveAccount: () => mockAccount,
};

export async function localStart() {
	console.log("🚀 Starting Fluid Framework Demo in LOCAL mode");
	console.log("📝 No authentication required for local development");

	try {
		// Create Azure client with local configuration
		const client = new AzureClient(getClientProps(localUser));

		// Get container ID from URL or create new
		const url = new URL(window.location.href);
		const containerId = url.searchParams.get("containerId") || "";

		console.log("🔧 Setting up Fluid container...");

		// Load the app with local configuration
		const container = await loadApp({
			client,
			containerId,
			account: mockAccount,
			user: localUser,
			msalInstance: mockMsalInstance as PublicClientApplication,
		});

		// Update URL with container ID for collaboration
		if (container.attachState === AttachState.Detached) {
			await container.attach();

			// For local development, we'll use a simple timestamp-based ID
			// In production, the Fluid service would provide the actual container ID
			const newUrl = new URL(window.location.href);
			const newContainerId = `local-${Date.now()}`;
			newUrl.searchParams.set("containerId", newContainerId);
			window.history.replaceState({}, "", newUrl.toString());
			console.log("📎 Container ID added to URL for collaboration:", newContainerId);
		}

		console.log("✅ Local Fluid Framework Demo is ready!");
		console.log("🌐 Share the URL to collaborate with others running in local mode");
	} catch (error) {
		console.error("❌ Error starting local Fluid demo:", error);

		// Show user-friendly error message
		const errorDiv = document.createElement("div");
		errorDiv.innerHTML = `
			<div style="
				position: fixed; 
				top: 50%; 
				left: 50%; 
				transform: translate(-50%, -50%);
				background: #fee; 
				border: 2px solid #fcc; 
				border-radius: 8px; 
				padding: 20px; 
				max-width: 500px;
				font-family: -apple-system, BlinkMacSystemFont, sans-serif;
				z-index: 10000;
			">
				<h3 style="margin: 0 0 10px 0; color: #c33;">⚠️ Local Setup Error</h3>
				<p><strong>The local Fluid service may not be running.</strong></p>
				<p>To fix this, run in a separate terminal:</p>
				<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">npm run start:server</pre>
				<p>Then refresh this page.</p>
				<p style="font-size: 12px; color: #666; margin-top: 15px;">
					Error: ${error instanceof Error ? error.message : "Unknown error"}
				</p>
			</div>
		`;
		document.body.appendChild(errorDiv);
	}
}
