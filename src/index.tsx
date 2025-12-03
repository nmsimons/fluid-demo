/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

// Import polyfills for iOS compatibility
import "./polyfills/crypto.js";
import "./polyfills/ios.js";
import "./index.css";

// Enable mobile debugging in development
if (import.meta.env.DEV) {
	import("eruda").then((eruda) => eruda.default.init());
}

async function start() {
	const client = import.meta.env.VITE_FLUID_CLIENT;

	switch (client) {
		case "local": {
			// Dynamically load local start to reduce initial bundle
			const { localStart } = await import("./start/localStart.js");
			await localStart();
			break;
		}
		default: {
			// Dynamically load Azure start to reduce initial bundle
			const { azureStart } = await import("./start/azureStart.js");
			await azureStart();
			break;
		}
	}
}

start();
