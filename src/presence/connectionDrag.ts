/* eslint-disable @typescript-eslint/no-empty-object-type */

/**
 * Connection Drag Manager Implementation
 *
 * Synchronizes in-progress connection drags (dotted preview lines) across clients
 * using the Fluid presence API. This mirrors the pattern used for item drags and
 * resizes so the UI can react to both local and remote connection gestures.
 */

import {
	StateFactory,
	StatesWorkspace,
	LatestRaw,
	LatestRawEvents,
} from "@fluidframework/presence/beta";
import { Listenable } from "fluid-framework";
import { ConnectionDragManager, ConnectionDragState } from "./Interfaces/ConnectionDragManager.js";

export function createConnectionDragManager(props: {
	workspace: StatesWorkspace<{}>;
	name: string;
}): ConnectionDragManager<ConnectionDragState | null> {
	const { workspace, name } = props;

	class ConnectionDragManagerImpl implements ConnectionDragManager<ConnectionDragState | null> {
		state: LatestRaw<ConnectionDragState | null>;

		constructor(id: string, ws: StatesWorkspace<{}>) {
			ws.add(id, StateFactory.latest<ConnectionDragState | null>({ local: null }));
			this.state = ws.states[id];
		}

		public get attendees() {
			return this.state.presence.attendees;
		}

		public get events(): Listenable<LatestRawEvents<ConnectionDragState | null>> {
			return this.state.events;
		}

		public setConnectionDrag(target: ConnectionDragState): void {
			this.state.local = target;
		}

		public clearConnectionDrag(): void {
			this.state.local = null;
		}
	}

	return new ConnectionDragManagerImpl(name, workspace);
}
