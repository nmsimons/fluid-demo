/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { ContainerSchema } from "fluid-framework";
import { configuredSharedTree, FluidClientVersion } from "fluid-framework/alpha";

const SharedTree = configuredSharedTree({
	oldestCompatibleClient: FluidClientVersion.EnableUnstableFeatures,
});

// Define the schema of our Container. This includes the DDSes/DataObjects
// that we want to create dynamically and any
// initial DataObjects we want created when the container is first created.
export const containerSchema = {
	initialObjects: {
		appData: SharedTree,
	},
} satisfies ContainerSchema;
