import type { ITelemetryBaseLogger } from "@fluidframework/core-interfaces";
import { AzureClient } from "@fluidframework/azure-client";
import React from "react";
import { createRoot } from "react-dom/client";
import { ReactApp } from "./react/ux.js";
import { App, appTreeConfiguration } from "./schema/app_schema.js";
import { createUndoRedoStacks } from "./utils/undo.js";
import { containerSchema } from "./schema/container_schema.js";
import { loadFluidData } from "./infra/fluid.js";
import { IFluidContainer } from "fluid-framework";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";

import { getPresenceViaDataObject } from "@fluidframework/presence/alpha";
import { createTypedSelectionManager } from "./utils/selection.js";
import { createUsersManager } from "./utils/users.js";
import { UserInfo } from "./utils/Interfaces/UsersManager.js";
import { AccountInfo } from "@azure/msal-browser";
import { createDragManager } from "./utils/drag.js";
import { asTreeViewAlpha } from "@fluidframework/tree/alpha";

export async function loadApp(props: {
	client: AzureClient;
	containerId: string;
	account: AccountInfo;
	logger?: ITelemetryBaseLogger;
}): Promise<IFluidContainer> {
	const { client, containerId, logger, account } = props;

	// Initialize Fluid Container
	const { container } = await loadFluidData(containerId, containerSchema, client, logger);

	// Initialize the SharedTree DDSes
	const appTree = asTreeViewAlpha(
		container.initialObjects.appData.viewWith(appTreeConfiguration),
	);
	if (appTree.compatibility.canInitialize) {
		appTree.initialize(new App({ items: [], comments: [] }));
	}

	// Get the Presence data object from the container
	const presence = getPresenceViaDataObject(container.initialObjects.presence);

	// Create a workspace for the selection manager
	const workspace = presence.states.getWorkspace("workspace:main", {});

	// Create the current UserInfo object
	const userInfo: UserInfo = {
		name: account.name ?? account.username, // Use the name or username from the account
		id: account.homeAccountId, // Use the homeAccountId as the unique user ID
	};

	// Create a selection manager in the workspace
	// The selection manager will be used to manage the selection of cells in the table
	// and will be used to synchronize the selection across clients
	const itemSelection = createTypedSelectionManager({
		name: "selection:item", // The name of the workspace
		workspace, // The presence workspace
		presence, // The presence data object
	});

	const tableSelection = createTypedSelectionManager({
		name: "selection:table", // The name of the workspace
		workspace, // The presence workspace
		presence, // The presence data object
	});

	// Create a users manager to manage the users in the app
	const users = createUsersManager({
		name: "users:main", // The name of the users manager
		workspace, // The presence workspace
		presence, // The presence data object
		me: userInfo, // The current user
	});

	const drag = createDragManager({
		name: "drag:main",
		workspace,
		presence,
	});

	// create the root element for React
	const app = document.createElement("div");
	app.id = "app";
	document.body.appendChild(app);
	const root = createRoot(app);

	// Create undo/redo stacks for the app
	const undoRedo = createUndoRedoStacks(appTree.events);

	// Render the app - note we attach new containers after render so
	// the app renders instantly on create new flow. The app will be
	// interactive immediately.
	root.render(
		<FluentProvider theme={webLightTheme}>
			<ReactApp
				tree={appTree}
				itemSelection={itemSelection}
				tableSelection={tableSelection}
				drag={drag}
				users={users}
				container={container}
				undoRedo={undoRedo}
			/>
		</FluentProvider>,
	);

	return container;
}
