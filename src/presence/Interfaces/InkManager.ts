import { LatestRaw, LatestRawEvents } from "@fluidframework/presence/beta";
import { Listenable } from "fluid-framework";

/**
 * Ephemeral ink presence model
 * --------------------------------------------
 * This interface layer describes how active (in‑progress) ink strokes are
 * exchanged between collaborators without persisting them to SharedTree.
 *
 * Life cycle:
 * 1. Local user begins drawing -> call setStroke() with initial single point.
 * 2. Subsequent pointer moves -> call updateStroke() with the full cumulative point list
 *    (manager is free to diff/optimize under the hood before emitting a signal).
 * 3. Pointer up / cancel -> call clearStroke() which clears local ephemeral state and
 *    notifies others to remove the preview path for this attendee.
 * 4. The committed stroke is written separately to the persistent tree (see canvas component).
 *
 * Each remote attendee can have at most one active ephemeral stroke. Consumers typically
 * render it semi‑transparent beneath persisted ink to give immediate feedback before commit.
 */

/** A single point in an ephemeral stroke (logical coordinates: pan+zoom invariant). */
export interface EphemeralPoint {
	x: number;
	y: number;
	t?: number;
	p?: number;
}

/** Full ephemeral stroke payload broadcast through presence. */
export interface EphemeralInkStroke {
	id: string;
	points: readonly EphemeralPoint[];
	color: string;
	width: number;
	opacity: number;
	startTime: number;
}

/**
 * High-level manager contract exposed by PresenceContext for ink.
 * Mirrors other presence managers (selection, drag, etc.) for consistency.
 */
export interface InkPresenceManager {
	state: LatestRaw<EphemeralInkStroke | null>;
	events: Listenable<LatestRawEvents<EphemeralInkStroke | null>>;
	attendees: LatestRaw<EphemeralInkStroke | null>["presence"]["attendees"];
	/** Begin a new ephemeral stroke for the local user. */
	setStroke(stroke: EphemeralInkStroke): void;
	/** Replace the point list of the in‑progress local stroke (cumulative list). */
	updateStroke(points: EphemeralPoint[]): void;
	/** Clear the local stroke (on commit or cancel). */
	clearStroke(): void;
	/** Snapshot of all remote attendees currently broadcasting ink. */
	getRemoteStrokes(): { stroke: EphemeralInkStroke; attendeeId: string }[];
}
