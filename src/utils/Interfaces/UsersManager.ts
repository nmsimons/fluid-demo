import { Attendee } from "@fluidframework/presence/alpha";
import { PresenceManager } from "./PresenceManager.js";

export interface UsersManager<TUserInfo extends UserInfo = UserInfo>
	extends PresenceManager<TUserInfo> {
	/**
	 * Get the current list of users
	 * @returns The current list of user client ids
	 */
	getUsers(): readonly User<TUserInfo>[];

	/**
	 * Get the current list of connected users
	 * @returns The current list of connected users (excluding disconnected ones)
	 */
	getConnectedUsers(): readonly User<TUserInfo>[];

	/**
	 * Get the current list of disconnected users
	 * @returns The current list of disconnected users
	 */
	getDisconnectedUsers(): readonly User<TUserInfo>[];

	/**
	 * Add the current user to the list
	 * @param userInfo The user to add
	 */
	updateMyself(userInfo: TUserInfo): void;

	/**
	 * Get myself
	 * @returns the current user (myself)
	 */
	getMyself(): User<TUserInfo>;
}

export type User<TUserInfo extends UserInfo = UserInfo> = {
	value: TUserInfo; // The user information
	client: Attendee; // The session client associated with the user
};

export type UserInfo = {
	id: string; // The unique identifier for the user
	name: string; // Name of the user
};
