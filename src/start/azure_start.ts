import { AzureClient } from "@fluidframework/azure-client";
import { loadApp } from "../app_load.js";
import { getClientProps } from "../infra/azure/azureClientProps.js";
import { AttachState } from "fluid-framework";
import { AccountInfo, PublicClientApplication } from "@azure/msal-browser";
import { authHelper } from "../infra/auth.js";
import { getGraphAccessToken, getUserProfilePicture } from "../utils/graphService.js";

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
		} else {
			// There are accounts, but the user is not signed in via redirect flow.
			// You may choose to operate on these accounts or ignore them.
			// For this sample, we will ignore them.
			const account = msalInstance.getAllAccounts()[0];
			signedInAzureStart(msalInstance, account);
		}
	}
}

async function signedInAzureStart(msalInstance: PublicClientApplication, account: AccountInfo) {
	// Set the active account
	msalInstance.setActiveAccount(account);

	// Fetch the user's profile picture
	console.log("Fetching user profile picture...");
	const accessToken = await getGraphAccessToken(msalInstance);
	const profilePicture = accessToken ? await getUserProfilePicture(accessToken) : null;

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
