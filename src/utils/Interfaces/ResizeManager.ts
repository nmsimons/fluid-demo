// The ResizeManager interface

import { PresenceManager } from "./PresenceManager.js";

// This interface is used to manage the resize functionality for shapes in the app.
export interface ResizeManager<TResizePackage extends ResizePackage | null = ResizePackage | null>
	extends PresenceManager<TResizePackage> {
	setResizing(target: TResizePackage): void; // Set the resize target
	clearResizing(): void; // Clear the resize data for the local client
}

export type ResizePackage = {
	id: string;
	x: number;
	y: number;
	size: number;
};
