/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { AzureClient, AzureContainerServices } from "@fluidframework/azure-client";
import { ContainerSchema, IFluidContainer } from "fluid-framework";
import { OdspClient, OdspContainerServices } from "@fluidframework/odsp-client/beta";

/**
 * This function will create a container if no container ID is passed.
 * If a container ID is provided, it will load the container.
 *
 * @returns The loaded container and container services.
 */
export async function loadFluidData<T extends ContainerSchema>(
	containerId: string,
	containerSchema: T,
	client: AzureClient | OdspClient
): Promise<{
	services: AzureContainerServices | OdspContainerServices;
	container: IFluidContainer<T>;
}> {
	let container: IFluidContainer<T>;
	let services: AzureContainerServices | OdspContainerServices;

	// Get or create the document depending if we are running through the create new flow
	if (client instanceof AzureClient) {
		if (containerId.length === 0) {
			// A detached container lets the app initialize data before attaching it.
			({ container, services } = await client.createContainer(containerSchema, "2.0.0"));
		} else {
			({ container, services } = await client.getContainer(
				containerId,
				containerSchema,
				"2.0.0"
			));
		}
	} else if (containerId.length === 0) {
		({ container, services } = await client.createContainer(containerSchema, "2.0.0"));
	} else {
		({ container, services } = await client.getContainer(
			containerId,
			containerSchema,
			"2.0.0"
		));
	}

	return { services, container };
}
