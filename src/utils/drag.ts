/* eslint-disable @typescript-eslint/no-empty-object-type */
// A function that creates a new DragManager instance

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
import { DragManager } from "./Interfaces/DragManager.js";

// with the given presence and workspace.
export function createDragManager(props: {
	presence: Presence;
	workspace: StatesWorkspace<{}>;
	name: string;
}): DragManager<DragAndRotatePackage | null> {
	const { presence, workspace, name } = props;

	class DragManagerImpl implements DragManager<DragAndRotatePackage | null> {
		initialState: DragAndRotatePackage | null = null;
		state: LatestRaw<DragAndRotatePackage | null>;

		constructor(
			name: string,
			workspace: StatesWorkspace<{}>,
			private presence: Presence,
		) {
			workspace.add(
				name,
				StateFactory.latest<DragAndRotatePackage | null>({ local: this.initialState }),
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

		public get events(): Listenable<LatestRawEvents<DragAndRotatePackage | null>> {
			return this.state.events;
		}

		/** Indicate that an item is being dragged */
		public setDragging(target: DragAndRotatePackage) {
			this.state.local = target;
		}

		// Clear the drag data for the local client
		public clearDragging() {
			this.state.local = null;
		}
	}

	return new DragManagerImpl(name, workspace, presence);
}

export type DragAndRotatePackage = {
	id: string;
	x: number;
	y: number;
	rotation: number;
	branch: boolean;
};
