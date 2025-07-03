/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { Client } from "@microsoft/microsoft-graph-client";
import { PublicClientApplication, SilentRequest } from "@azure/msal-browser";

/**
 * Creates a Microsoft Graph client using the provided access token
 */
function createGraphClient(accessToken: string): Client {
	return Client.init({
		authProvider: (done) => {
			done(null, accessToken);
		},
	});
}

/**
 * Fetches the user's profile picture from Microsoft Graph and returns it as a base64 data URL
 */
export async function getUserProfilePicture(accessToken: string): Promise<string | null> {
	try {
		console.log("Attempting to fetch user profile picture...");
		const graphClient = createGraphClient(accessToken);

		// Get the user's profile photo
		const photoBlob = await graphClient.api("/me/photo/$value").get();

		if (photoBlob) {
			console.log("Profile picture fetched successfully");
			// Convert blob to base64
			const arrayBuffer = await photoBlob.arrayBuffer();
			const bytes = new Uint8Array(arrayBuffer);
			let binary = "";
			bytes.forEach((b) => (binary += String.fromCharCode(b)));
			const base64 = window.btoa(binary);

			// Return as data URL - assume JPEG format (most common for profile photos)
			return `data:image/jpeg;base64,${base64}`;
		}

		console.log("No profile picture found");
		return null;
	} catch (error) {
		console.warn("Failed to fetch user profile picture:", error);
		return null;
	}
}

/**
 * Gets the Microsoft Graph access token from MSAL
 */
export async function getGraphAccessToken(
	msalInstance: PublicClientApplication
): Promise<string | null> {
	try {
		console.log("Attempting to get Graph access token...");
		const account = msalInstance.getActiveAccount();
		if (!account) {
			console.warn("No active account found");
			return null;
		}

		const silentRequest: SilentRequest = {
			scopes: ["User.Read"],
			account: account,
		};

		const response = await msalInstance.acquireTokenSilent(silentRequest);
		console.log("Successfully acquired access token");
		return response.accessToken;
	} catch (error) {
		console.error("Failed to get Graph access token:", error);
		return null;
	}
}
