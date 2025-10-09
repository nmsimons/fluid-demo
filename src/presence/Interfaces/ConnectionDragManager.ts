/**
 * ConnectionDragManager Interface
 *
 * Defines the contract for synchronizing connection drag operations across clients.
 * Connection drags occur when a user drags from a connection point toward another item
 * to create a new link. This manager extends the generic PresenceManager to broadcast
 * the in-flight connection line so collaborators can see it in real time.
 */

import { PresenceManager } from "./PresenceManager.js";

/**
 * The set of sides that expose connection points.
 */
export type ConnectionSide = "top" | "right" | "bottom" | "left";

/**
 * Shared state describing an in-progress connection drag.
 */
export interface ConnectionDragState {
	fromItemId: string;
	fromSide: ConnectionSide;
	cursorX: number;
	cursorY: number;
}

/**
 * Presence manager contract for broadcasting connection drags.
 */
export interface ConnectionDragManager<
	TState extends ConnectionDragState | null = ConnectionDragState | null,
> extends PresenceManager<TState> {
	/**
	 * Publish the current connection drag state for the local client.
	 * Call each time the pointer moves so remote collaborators receive smooth updates.
	 */
	setConnectionDrag(target: ConnectionDragState): void;

	/**
	 * Clear the local connection drag state once the drag completes or is cancelled.
	 */
	clearConnectionDrag(): void;
}
