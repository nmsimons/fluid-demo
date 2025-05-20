import { PublicClientApplication } from "@azure/msal-browser";

// Helper function to authenticate the user
export async function authHelper(): Promise<PublicClientApplication> {
	// Get the client id (app id) from the environment variables
	const clientId = process.env.AZURE_CLIENT_ID;
	const redirectUri = process.env.AZURE_REDIRECT_URI;
	const fluidClient = process.env.FLUID_CLIENT;

	if (!clientId) {
		throw new Error("AZURE_CLIENT_ID is not defined");
	}

	if (!redirectUri) {
		throw new Error("AZURE_REDIRECT_URI is not defined");
	}

	if (!fluidClient) {
		throw new Error("FLUID_CLIENT is not defined");
	}

	// Create the MSAL instance
	const msalConfig = {
		auth: {
			clientId,
			redirectUri,
			authority:
				fluidClient === "azure"
					? "https://login.microsoftonline.com/consumers/"
					: "https://login.microsoftonline.com/common/",
			tenantId: fluidClient === "azure" ? "consumers" : "common",
			scopes: ["User.Read", "openid", "profile"],
		},
		cache: {
			cacheLocation: "localStorage",
		},
	};

	// Initialize the MSAL instance
	const msalInstance = new PublicClientApplication(msalConfig);
	await msalInstance.initialize();

	return msalInstance;
}
