/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useEffect, useState } from "react";
import {
	Avatar,
	AvatarGroup,
	AvatarGroupItem,
	AvatarGroupPopover,
	AvatarGroupProps,
	partitionAvatarGroupItems,
} from "@fluentui/react-avatar";
import { Tooltip } from "@fluentui/react-tooltip";
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from "@fluentui/react-menu";
import { SignOut20Regular, PersonSwap20Regular } from "@fluentui/react-icons";
import { User } from "../../../presence/Interfaces/UsersManager.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { AuthContext } from "../../contexts/AuthContext.js";
import { signOutHelper, switchAccountHelper } from "../../../infra/auth.js";

/**
 * Container for user presence display including the facepile and current user avatar.
 */
export function UserCorner(): JSX.Element {
	return (
		<div className="flex flex-row items-center gap-4 mr-2">
			<Facepile />
			<CurrentUser />
		</div>
	);
}

/**
 * CurrentUser component displays the current user's avatar with a context menu.
 * The context menu includes a sign-out option that uses MSAL to properly
 * log out the user and redirect them to the login page.
 */
export const CurrentUser = (): JSX.Element => {
	const users = useContext(PresenceContext).users;
	const currentUser = users.getMyself().value;
	const { msalInstance } = useContext(AuthContext);

	// Get the user's email from MSAL account
	const userEmail = msalInstance?.getActiveAccount()?.username || currentUser.name;

	const handleSignOut = async () => {
		if (msalInstance) {
			await signOutHelper(msalInstance);
		}
	};

	const handleSwitchAccount = async () => {
		if (msalInstance) {
			await switchAccountHelper(msalInstance);
		}
	};

	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<Tooltip
					content={`${currentUser.name} (${userEmail}) - Click for options`}
					relationship="label"
				>
					<Avatar
						name={currentUser.name}
						image={currentUser.image ? { src: currentUser.image } : undefined}
						size={24}
						style={{ cursor: "pointer" }}
					/>
				</Tooltip>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<MenuItem icon={<PersonSwap20Regular />} onClick={handleSwitchAccount}>
						Switch account
					</MenuItem>
					<MenuItem icon={<SignOut20Regular />} onClick={handleSignOut}>
						Sign out
					</MenuItem>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
};

/**
 * Facepile component showing avatars of all connected users.
 * Displays up to 3 inline avatars with overflow in a popover.
 */
export const Facepile = (props: Partial<AvatarGroupProps>): JSX.Element | null => {
	const users = useContext(PresenceContext).users;
	const [userRoster, setUserRoster] = useState(users.getConnectedUsers());

	useEffect(() => {
		// Check for changes to the user roster and update the avatar group if necessary
		const unsubscribe = users.events.on("remoteUpdated", () => {
			setUserRoster(users.getConnectedUsers());
		});
		return unsubscribe;
	}, [users]);

	useEffect(() => {
		// Update the user roster when users disconnect
		const unsubscribe = users.attendees.events.on("attendeeDisconnected", () => {
			setUserRoster(users.getConnectedUsers());
		});
		return unsubscribe;
	}, [users]);

	const { inlineItems, overflowItems } = partitionAvatarGroupItems<User>({
		items: userRoster,
		maxInlineItems: 3, // Maximum number of inline avatars before showing overflow
	});

	if (inlineItems.length === 0) {
		return null; // No users to display
	}

	return (
		<AvatarGroup size={24} {...props}>
			{inlineItems.map((user) => (
				<Tooltip
					key={String(user.client.attendeeId ?? user.value.name)}
					content={user.value.name}
					relationship={"label"}
				>
					<AvatarGroupItem
						name={user.value.name}
						image={user.value.image ? { src: user.value.image } : undefined}
						key={String(user.client.attendeeId ?? user.value.name)}
					/>
				</Tooltip>
			))}
			{overflowItems && (
				<AvatarGroupPopover>
					{overflowItems.map((user) => (
						<AvatarGroupItem
							name={user.value.name}
							image={user.value.image ? { src: user.value.image } : undefined}
							key={String(user.client.attendeeId ?? user.value.name)}
						/>
					))}
				</AvatarGroupPopover>
			)}
		</AvatarGroup>
	);
};
