/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { PublicClientApplication } from "@azure/msal-browser";

/**
 * Helper function to get ZUMO auth token for Azure service calls
 * This function exchanges an MSAL token for a ZUMO authentication token
 * used to authenticate with Azure services.
 */
export async function getZumoAuthToken(msalInstance: PublicClientApplication): Promise<string> {
	const accounts = msalInstance.getAllAccounts();
	if (accounts.length === 0) {
		throw new Error("No authenticated accounts found");
	}

	// Get token with the specific scope for the service
	const tokenRequest = {
		scopes: ["api://56bbaaea-f34d-4aee-9565-b37be2d84fa8/user_impersonation"],
		account: accounts[0],
	};

	let msalToken: string;
	let idToken: string;
	try {
		// Try silent token acquisition first
		const silentResult = await msalInstance.acquireTokenSilent(tokenRequest);
		msalToken = silentResult.accessToken;
		idToken = silentResult.idToken;
	} catch (silentError) {
		console.log("Silent token acquisition failed, trying interactive:", silentError);
		// Fall back to interactive token acquisition
		const interactiveResult = await msalInstance.acquireTokenPopup(tokenRequest);
		msalToken = interactiveResult.accessToken;
		idToken = interactiveResult.idToken;
	}

	// Get the base URL from environment variable
	const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL;
	if (baseUrl.startsWith("http://localhost")) {
		// Azure functions run locally don't have their full auth stack and some of the endpoints fail.
		return "mock token";
	}

	// Exchange the MSAL token for a ZUMO auth token
	const authResponse = await fetch(`${baseUrl}/.auth/login/aad`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			access_token: msalToken,
			id_token: idToken,
		}),
		credentials: "include",
	});

	if (!authResponse.ok) {
		throw new Error(
			`Failed to get ZUMO auth token: ${authResponse.status} ${authResponse.statusText}`
		);
	}

	const authResult = await authResponse.json();
	return authResult.authenticationToken;
}
