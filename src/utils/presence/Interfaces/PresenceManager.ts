/**
 * PresenceManager Interfaces
 *
 * Core interfaces for managing real-time presence data in the Fluid Framework demo app.
 * These interfaces provide the foundation for all collaborative features including:
 * - User presence and status
 * - Real-time state synchronization
 * - Multi-client coordination
 * - Event-driven updates
 */

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

/**
 * PresenceClients interface for managing client connections and attendees.
 * Provides access to information about all connected users in the collaboration session.
 */
export interface PresenceClients {
	/**
	 * Retrieves an attendee by their client or attendee ID.
	 * @param clientId - The client connection ID or attendee ID
	 * @returns The attendee object containing user information
	 */
	getAttendee: (clientId: ClientConnectionId | AttendeeId) => Attendee;

	/**
	 * Gets all currently connected attendees.
	 * @returns A read-only set of all attendees in the session
	 */
	getAttendees: () => ReadonlySet<Attendee>;

	/**
	 * Gets the current user's attendee object.
	 * @returns The current user's attendee information
	 */
	getMyself: () => Attendee;

	/**
	 * Gets the event emitter for attendee-related events.
	 * @returns Listenable for attendee join/leave events
	 */
	getEvents: () => Listenable<AttendeesEvents>;
}

/**
 * PresenceManager interface for managing real-time state synchronization.
 * Provides a unified way to manage presence data across all connected clients.
 *
 * @template TState - The type of state being managed (e.g., selection, drag, resize)
 */
export interface PresenceManager<TState> {
	/** The initial/default state value */
	initialState: TState;

	/** The current state wrapped in Fluid's LatestRaw for real-time sync */
	state: LatestRaw<TState>;

	/** Interface for managing client connections and attendees */
	clients: PresenceClients;

	/** Event emitter for state change notifications */
	events: Listenable<LatestRawEvents<TState>>;
}

/**
 * PresenceMapManager interface for managing map-based presence data.
 * Used when state needs to be organized by keys (e.g., user-specific states).
 *
 * @template TState - The type of state being managed
 */
export interface PresenceMapManager<TState> {
	/** The current map state wrapped in Fluid's LatestMapRaw for real-time sync */
	state: LatestMapRaw<TState>;

	/** Interface for managing client connections and attendees */
	clients: PresenceClients;

	/** Event emitter for map state change notifications */
	events: Listenable<LatestMapRawEvents<TState, string>>;
}
