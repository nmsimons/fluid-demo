import {
	StateFactory,
	StatesWorkspace,
	LatestRaw,
	LatestRawEvents,
} from "@fluidframework/presence/alpha";
import { Listenable } from "fluid-framework";

export interface EphemeralPoint {
	x: number;
	y: number;
	t?: number;
	p?: number;
}

export interface EphemeralInkStroke {
	id: string;
	points: readonly EphemeralPoint[];
	color: string;
	width: number;
	opacity: number;
	startTime: number;
}

export interface InkPresenceManager {
	state: LatestRaw<EphemeralInkStroke | null>;
	events: Listenable<LatestRawEvents<EphemeralInkStroke | null>>;
	attendees: LatestRaw<EphemeralInkStroke | null>["presence"]["attendees"];
	setStroke(stroke: EphemeralInkStroke): void;
	updateStroke(points: EphemeralPoint[]): void;
	clearStroke(): void;
	getRemoteStrokes(): { stroke: EphemeralInkStroke; attendeeId: string }[];
}

/* eslint-disable @typescript-eslint/no-empty-object-type */
export function createInkPresenceManager(props: {
	workspace: StatesWorkspace<{}>;
	name: string;
}): InkPresenceManager {
	const { workspace, name } = props;

	class InkPresenceManagerImpl implements InkPresenceManager {
		state: LatestRaw<EphemeralInkStroke | null>;
		constructor(name: string, workspace: StatesWorkspace<{}>) {
			workspace.add(name, StateFactory.latest<EphemeralInkStroke | null>({ local: null }));
			this.state = workspace.states[name];
		}
		get events(): Listenable<LatestRawEvents<EphemeralInkStroke | null>> {
			return this.state.events;
		}
		get attendees() {
			return this.state.presence.attendees;
		}
		setStroke(stroke: EphemeralInkStroke) {
			this.state.local = stroke;
		}
		updateStroke(points: EphemeralPoint[]) {
			if (this.state.local) {
				this.state.local = { ...this.state.local, points };
			}
		}
		clearStroke() {
			this.state.local = null;
		}
		getRemoteStrokes() {
			const out: { stroke: EphemeralInkStroke; attendeeId: string }[] = [];
			for (const cv of this.state.getRemotes()) {
				if (cv.value) {
					out.push({ stroke: cv.value, attendeeId: cv.attendee.attendeeId });
				}
			}
			return out;
		}
	}

	return new InkPresenceManagerImpl(name, workspace);
}
