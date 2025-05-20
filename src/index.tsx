/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { azureStart } from "./start/azure_start.js";

async function start() {
	const client = process.env.FLUID_CLIENT;

	switch (client) {
		default:
			// Start the app in Azure mode
			await azureStart();
			break;
	}
}

start();
