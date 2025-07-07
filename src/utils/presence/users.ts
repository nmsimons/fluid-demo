/* eslint-disable @typescript-eslint/no-empty-object-type */
// A function that creates a new UsersManager instance
// with the given presence and workspace.

import {
	StateFactory,
	LatestRawEvents,
	StatesWorkspace,
	LatestRaw,
	AttendeeId,
	ClientConnectionId,
	AttendeeStatus,
} from "@fluidframework/presence/alpha";
import { UsersManager, User, UserInfo } from "./Interfaces/UsersManager.js";
import { Listenable } from "fluid-framework";

export function createUsersManager(props: {
	workspace: StatesWorkspace<{}>;
	name: string;
	me: UserInfo;
}): UsersManager {
	const { workspace, name, me } = props;

	class UsersManagerImpl implements UsersManager {
		initialState: UserInfo = me; // Default initial state for the user manager
		state: LatestRaw<UserInfo>;

		constructor(name: string, workspace: StatesWorkspace<{}>) {
			workspace.add(name, StateFactory.latest({ local: this.initialState }));
			this.state = workspace.states[name];
		}

		public get events(): Listenable<LatestRawEvents<UserInfo>> {
			return this.state.events;
		}

		public clients = {
			getAttendee: (clientId: ClientConnectionId | AttendeeId) => {
				return this.state.presence.attendees.getAttendee(clientId);
			},
			getAttendees: () => {
				return this.state.presence.attendees.getAttendees();
			},
			getMyself: () => {
				return this.state.presence.attendees.getMyself();
			},
			getEvents: () => this.state.presence.attendees.events,
		};

		getUsers(): readonly User[] {
			return [...this.state.getRemotes()].map((c) => ({ ...c, client: c.attendee }));
		}

		getConnectedUsers(): readonly User[] {
			return this.getUsers().filter(
				(user) => user.client.getConnectionStatus() === AttendeeStatus.Connected
			);
		}

		getDisconnectedUsers(): readonly User[] {
			return this.getUsers().filter(
				(user) => user.client.getConnectionStatus() === AttendeeStatus.Disconnected
			);
		}

		updateMyself(userInfo: UserInfo): void {
			this.state.local = userInfo; // Update the local state with the new user info
		}

		getMyself(): User {
			return { value: this.state.local, client: this.state.presence.attendees.getMyself() };
		}
	}

	return new UsersManagerImpl(name, workspace);
}
