/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { azureStart } from "./start/azure_start.js";
import { localStart } from "./start/local_start.js";

async function start() {
	const client = process.env.FLUID_CLIENT;

	switch (client) {
		case "local":
			// Start the app in local mode (no authentication required)
			await localStart();
			break;
		default:
			// Start the app in Azure mode
			await azureStart();
			break;
	}
}

start();
