// The DragManager interface

import { PresenceManager } from "./PresenceManager.js";

// This interface is used to manage the drag and drop functionality in the app.
export interface DragManager<TDragPackage extends DragPackage | null = DragPackage | null>
	extends PresenceManager<TDragPackage> {
	setDragging(target: TDragPackage): void; // Set the drag target
	clearDragging(): void; // Clear the drag data for the local client
}

export type DragPackage = {
	id: string;
	x: number;
	y: number;
};
