/* Cursor Manager Implementation - manages real-time text cursor / selection inside notes */
import { StateFactory, LatestRaw, LatestRawEvents } from "@fluidframework/presence/alpha";
import { Listenable } from "fluid-framework";
import { CursorManager, NoteCursorState } from "./Interfaces/CursorManager.js";

export function createCursorManager(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props: { workspace: any; name: string }
): CursorManager {
	const { workspace, name } = props;

	class CursorManagerImpl implements CursorManager {
		state: LatestRaw<NoteCursorState | null>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		constructor(name: string, workspace: any) {
			workspace.add(name, StateFactory.latest<NoteCursorState | null>({ local: null }));
			this.state = workspace.states[name];
		}
		public get attendees() {
			return this.state.presence.attendees;
		}
		public get events(): Listenable<LatestRawEvents<NoteCursorState | null>> {
			return this.state.events;
		}
		setCursor(state: NoteCursorState): void {
			this.state.local = state;
		}
		clearCursor(): void {
			this.state.local = null;
		}
	}

	return new CursorManagerImpl(name, workspace);
}
