import { Listenable } from "fluid-framework";

/** Represents a user's cursor / selection inside a Note */
export interface NoteCursorState {
	noteId: string; // the note id the user is active in
	start: number; // selection start (caret when start===end)
	end: number; // selection end (exclusive)
}

export interface CursorManager {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly attendees: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly events: Listenable<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly state?: any; // expose underlying LatestRaw to callers who need raw access
	setCursor(state: NoteCursorState): void;
	clearCursor(): void;
}
