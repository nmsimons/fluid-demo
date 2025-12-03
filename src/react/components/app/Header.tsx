/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import { Text } from "@fluentui/react-text";
import { ToolbarDivider } from "@fluentui/react-toolbar";
import { UserCorner } from "./UserCorner.js";

/**
 * Header component displaying the app title, save status, connection status, and user info.
 */
export function Header(props: { saved: boolean; connectionState: string }): JSX.Element {
	const { saved, connectionState } = props;

	return (
		<div className="h-[48px] flex shrink-0 flex-row items-center justify-between bg-black text-base text-white z-[9999] w-full text-nowrap">
			<div className="flex items-center">
				<div className="flex ml-2 mr-8">
					<Text weight="bold">Fluid Framework Demo</Text>
				</div>
			</div>
			<div className="flex flex-row items-center m-2">
				<SaveStatus saved={saved} />
				<HeaderDivider />
				<ConnectionStatus connectionState={connectionState} />
				<HeaderDivider />
				<UserCorner />
			</div>
		</div>
	);
}

/**
 * Displays whether the document is saved or not.
 */
export function SaveStatus(props: { saved: boolean }): JSX.Element {
	const { saved } = props;
	return (
		<div className="flex items-center">
			<Text>{saved ? "" : "not"}&nbsp;saved</Text>
		</div>
	);
}

/**
 * Displays the current connection state.
 */
export function ConnectionStatus(props: { connectionState: string }): JSX.Element {
	const { connectionState } = props;
	return (
		<div className="flex items-center">
			<Text>{connectionState}</Text>
		</div>
	);
}

/**
 * A visual divider for the header toolbar.
 */
export const HeaderDivider = (): JSX.Element => {
	return <ToolbarDivider />;
};
