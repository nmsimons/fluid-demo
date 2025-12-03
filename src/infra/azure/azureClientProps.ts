/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import type {
	AzureRemoteConnectionConfig,
	AzureClientProps,
	AzureLocalConnectionConfig,
	ITelemetryBaseLogger,
} from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "./azureTokenProvider.js";
import { AzureFunctionTokenProvider, azureUser, user } from "./azureTokenProvider.js";

const client = import.meta.env.VITE_FLUID_CLIENT;
const local = client === undefined || client === "local";
if (local) {
	console.warn(`Configured to use local tinylicious.`);
}

const localConnectionConfig: AzureLocalConnectionConfig = {
	type: "local",
	tokenProvider: new InsecureTokenProvider("VALUE_NOT_USED", user),
	endpoint: "http://localhost:7070",
};

export function getClientProps(
	user?: typeof azureUser,
	logger?: ITelemetryBaseLogger
): AzureClientProps {
	const remoteConnectionConfig: AzureRemoteConnectionConfig = {
		type: "remote",
		tenantId: import.meta.env.VITE_AZURE_TENANT_ID!,
		tokenProvider: new AzureFunctionTokenProvider(
			import.meta.env.VITE_AZURE_FUNCTION_TOKEN_PROVIDER_URL!,
			user ?? azureUser
		),
		endpoint: import.meta.env.VITE_AZURE_ORDERER!,
	};

	const connectionConfig: AzureRemoteConnectionConfig | AzureLocalConnectionConfig = !local
		? remoteConnectionConfig
		: localConnectionConfig;

	return {
		connection: connectionConfig,
		logger,
	};
}
