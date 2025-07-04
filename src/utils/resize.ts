/* eslint-disable @typescript-eslint/no-empty-object-type */
// A function that creates a new ResizeManager instance

import {
	type Presence,
	StateFactory,
	StatesWorkspace,
	AttendeeId,
	ClientConnectionId,
	LatestRaw,
	LatestRawEvents,
} from "@fluidframework/presence/alpha";
import { Listenable } from "fluid-framework";
import { ResizeManager, ResizePackage } from "./Interfaces/ResizeManager.js";

// with the given presence and workspace.
export function createResizeManager(props: {
	presence: Presence;
	workspace: StatesWorkspace<{}>;
	name: string;
}): ResizeManager<ResizePackage | null> {
	const { presence, workspace, name } = props;

	class ResizeManagerImpl implements ResizeManager<ResizePackage | null> {
		initialState: ResizePackage | null = null;
		state: LatestRaw<ResizePackage | null>;

		constructor(
			name: string,
			workspace: StatesWorkspace<{}>,
			private presence: Presence
		) {
			workspace.add(
				name,
				StateFactory.latest<ResizePackage | null>({ local: this.initialState })
			);
			this.state = workspace.states[name];
		}

		public clients = {
			getAttendee: (clientId: ClientConnectionId | AttendeeId) =>
				this.presence.attendees.getAttendee(clientId),
			getAttendees: () => this.presence.attendees.getAttendees(),
			getMyself: () => this.presence.attendees.getMyself(),
			events: this.presence.attendees.events,
		};

		public get events(): Listenable<LatestRawEvents<ResizePackage | null>> {
			return this.state.events;
		}

		/** Indicate that an item is being resized */
		public setResizing(target: ResizePackage) {
			this.state.local = target;
		}

		// Clear the resize data for the local client
		public clearResizing() {
			this.state.local = null;
		}
	}

	return new ResizeManagerImpl(name, workspace, presence);
}
