import { AzureClient } from "@fluidframework/azure-client";
import { loadApp } from "../app_load.js";
import { getClientProps } from "../infra/azure/azureClientProps.js";
import { AttachState } from "fluid-framework";
import { AccountInfo, PublicClientApplication } from "@azure/msal-browser";
import { authHelper } from "../infra/auth.js";
import {
	getGraphAccessToken,
	getUserProfilePicture,
	generateFallbackAvatar,
} from "../utils/graphService.js";

export async function azureStart() {
	// Get the user info
	const msalInstance: PublicClientApplication = await authHelper();

	// Handle the login redirect flows
	const tokenResponse = await msalInstance.handleRedirectPromise().catch((error: Error) => {
		console.log("Error in handleRedirectPromise: " + error.message);
	});

	// If the tokenResponse is not null, then the user is signed in
	// and the tokenResponse is the result of the redirect.
	if (tokenResponse !== null && tokenResponse !== undefined) {
		const account = msalInstance.getAllAccounts()[0];
		signedInAzureStart(msalInstance, account);
	} else {
		const currentAccounts = msalInstance.getAllAccounts();
		// If there are no accounts, the user is not signed in.
		if (currentAccounts === null || currentAccounts.length === 0) {
			msalInstance.loginRedirect();
		} else if (currentAccounts.length === 1) {
			// Single account, use it directly
			const account = currentAccounts[0];
			signedInAzureStart(msalInstance, account);
		} else {
			// Multiple accounts, show account selector
			await showAccountSelector(msalInstance, currentAccounts);
		}
	}
}

async function showAccountSelector(
	msalInstance: PublicClientApplication,
	accounts: AccountInfo[]
): Promise<void> {
	// Create account selection UI
	return new Promise((resolve) => {
		// Create account list message
		let message = "Multiple accounts found. Please choose:\n\n";
		accounts.forEach((account, index) => {
			message += `${index + 1}. ${account.name || account.username} (${account.username})\n`;
		});
		message += `\n${accounts.length + 1}. Use a different account\n`;
		message += `${accounts.length + 2}. Cancel`;

		// Show prompt
		const choice = prompt(message + "\n\nEnter your choice (1-" + (accounts.length + 2) + "):");

		if (!choice) {
			// User cancelled
			resolve();
			return;
		}

		const choiceNum = parseInt(choice);

		if (choiceNum >= 1 && choiceNum <= accounts.length) {
			// User selected an existing account
			const selectedAccount = accounts[choiceNum - 1];
			signedInAzureStart(msalInstance, selectedAccount);
		} else if (choiceNum === accounts.length + 1) {
			// User wants to use a different account
			msalInstance.loginRedirect();
		}
		// For any other choice or cancel, do nothing

		resolve();
	});
}

async function signedInAzureStart(msalInstance: PublicClientApplication, account: AccountInfo) {
	// Set the active account
	msalInstance.setActiveAccount(account);

	// Fetch the user's profile picture with improved fallback handling
	console.log("🖼️ Fetching user profile picture...");
	let profilePicture = null;

	// Try to get access token and fetch profile picture from Microsoft Graph
	console.log("🔑 Requesting Microsoft Graph access...");
	const accessToken = await getGraphAccessToken(msalInstance);
	if (accessToken) {
		console.log("✅ Microsoft Graph access granted");
		profilePicture = await getUserProfilePicture(accessToken);
	} else {
		console.log(
			"ℹ️ Microsoft Graph access not available - this is normal for some account types"
		);
	}

	// If Microsoft Graph didn't work, try generating a fallback avatar
	if (!profilePicture) {
		console.log("🎨 Generating personalized avatar...");
		profilePicture = await generateFallbackAvatar(account);
	}

	// Create the azureUser from the account
	const user = {
		name: account.name ?? account.username,
		id: account.homeAccountId,
		image: profilePicture || undefined,
	};

	console.log("User object created:", {
		...user,
		image: user.image ? "Image data present" : "No image",
	});

	// Get the root container id from the URL
	// If there is no container id, then the app will make
	// a new container.
	let containerId = location.hash.substring(1);

	// Initialize Devtools logger if in development mode
	let logger = undefined;
	if (process.env.NODE_ENV === "development") {
		const { createDevtoolsLogger } = await import("@fluidframework/devtools/beta");
		logger = createDevtoolsLogger();
	}

	// Initialize the Azure client
	const clientProps = getClientProps(user, logger);
	const client = new AzureClient(clientProps);

	// Load the app
	const container = await loadApp({ client, containerId, account, user, msalInstance });

	// If the app is in a `createNew` state - no containerId, and the container is detached, we attach the container.
	// This uploads the container to the service and connects to the collaboration session.
	if (container.attachState === AttachState.Detached) {
		containerId = await container.attach();

		// The newly attached container is given a unique ID that can be used to access the container in another session
		history.replaceState(undefined, "", "#" + containerId);
	}
}
