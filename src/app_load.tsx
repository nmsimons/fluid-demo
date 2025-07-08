import { AzureClient } from "@fluidframework/azure-client";
import React from "react";
import { createRoot } from "react-dom/client";
import { ReactApp } from "./react/ux.js";
import { App, appTreeConfiguration } from "./schema/app_schema.js";
import { createUndoRedoStacks } from "./utils/undo.js";
import { containerSchema } from "./schema/container_schema.js";
import { loadFluidData } from "./infra/fluid.js";
import { IFluidContainer } from "fluid-framework";
import { FluentProvider } from "@fluentui/react-provider";
import { webLightTheme } from "@fluentui/react-theme";
import { AuthContext } from "./react/contexts/AuthContext.js";

import { getPresence } from "@fluidframework/presence/beta";
import { createTypedSelectionManager } from "./utils/presence/selection.js";
import { createUsersManager } from "./utils/presence/users.js";
import { UserInfo } from "./utils/presence/Interfaces/UsersManager.js";
import { AccountInfo, PublicClientApplication } from "@azure/msal-browser";
import { createDragManager } from "./utils/presence/drag.js";
import { createResizeManager } from "./utils/presence/resize.js";

export async function loadApp(props: {
	client: AzureClient;
	containerId: string;
	account: AccountInfo;
	user?: UserInfo;
	msalInstance: PublicClientApplication;
}): Promise<IFluidContainer> {
	const { client, containerId, account, user, msalInstance } = props;

	// Initialize Fluid Container
	const { container } = await loadFluidData(containerId, containerSchema, client);

	// Initialize the SharedTree DDSes
	const appTree = container.initialObjects.appData.viewWith(appTreeConfiguration);
	if (appTree.compatibility.canInitialize) {
		appTree.initialize(new App({ items: [], comments: [] }));
	}

	// Get the Presence data object from the container
	const presence = getPresence(container);

	// Create a workspace for the selection manager
	const workspace = presence.states.getWorkspace("workspace:main", {});

	// Create the current UserInfo object
	const userInfo: UserInfo = user || {
		name: account.name ?? account.username, // Use the name or username from the account
		id: account.homeAccountId, // Use the homeAccountId as the unique user ID
	};

	// Create a selection manager in the workspace
	// The selection manager will be used to manage the selection of cells in the table
	// and will be used to synchronize the selection across clients
	const itemSelection = createTypedSelectionManager({
		name: "selection:item", // The name of the workspace
		workspace, // The presence workspace
	});

	const tableSelection = createTypedSelectionManager({
		name: "selection:table", // The name of the workspace
		workspace, // The presence workspace
	});

	// Create a users manager to manage the users in the app
	const users = createUsersManager({
		name: "users:main", // The name of the users manager
		workspace, // The presence workspace
		me: userInfo, // The current user
	});

	const drag = createDragManager({
		name: "drag:main",
		workspace,
		presence,
	});

	const resize = createResizeManager({
		name: "resize:main",
		workspace,
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
			<AuthContext.Provider value={{ msalInstance }}>
				<ReactApp
					tree={appTree}
					itemSelection={itemSelection}
					tableSelection={tableSelection}
					drag={drag}
					resize={resize}
					users={users}
					container={container}
					undoRedo={undoRedo}
				/>
			</AuthContext.Provider>
		</FluentProvider>
	);

	return container;
}
