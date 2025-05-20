import {
	ClientConnectionId,
	AttendeeId,
	Attendee,
	LatestRaw,
	LatestRawEvents,
	LatestMapRaw,
	LatestMapRawEvents,
	AttendeesEvents,
} from "@fluidframework/presence/alpha";
import { Listenable } from "fluid-framework";

export interface PresenceClients {
	getAttendee: (clientId: ClientConnectionId | AttendeeId) => Attendee;
	getAttendees: () => ReadonlySet<Attendee>;
	getMyself: () => Attendee;
	events: Listenable<AttendeesEvents>;
}

export interface PresenceManager<TState> {
	initialState: TState;
	state: LatestRaw<TState>;
	clients: PresenceClients;
	events: Listenable<LatestRawEvents<TState>>;
}

export interface PresenceMapManager<TState> {
	state: LatestMapRaw<TState>;
	clients: PresenceClients;
	events: Listenable<LatestMapRawEvents<TState, string>>;
}
