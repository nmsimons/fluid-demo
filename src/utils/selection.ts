/* eslint-disable @typescript-eslint/no-empty-object-type */
/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	type Presence,
	StateFactory,
	LatestRawEvents,
	StatesWorkspace,
	LatestRaw,
	AttendeeId,
	ClientConnectionId,
} from "@fluidframework/presence/alpha";
import { Listenable } from "fluid-framework";
import { SelectionManager, Selection } from "./Interfaces/SelectionManager.js";

// A function that creates a new SelectionManager instance
// with the given presence and workspace.
export function createTypedSelectionManager(props: {
	presence: Presence;
	workspace: StatesWorkspace<{}>;
	name: string;
}): SelectionManager<TypedSelection> {
	const { presence, workspace, name } = props;

	class SelectionManagerImpl implements SelectionManager<TypedSelection> {
		initialState: TypedSelection[] = []; // Default initial state for the selection manager

		state: LatestRaw<TypedSelection[]>;

		constructor(
			name: string,
			workspace: StatesWorkspace<{}>,
			private presence: Presence,
		) {
			workspace.add(name, StateFactory.latest({ local: this.initialState }));
			this.state = workspace.states[name];
		}

		public get events(): Listenable<LatestRawEvents<TypedSelection[]>> {
			return this.state.events;
		}

		public clients = {
			getAttendee: (clientId: ClientConnectionId | AttendeeId) => {
				return this.presence.attendees.getAttendee(clientId);
			},
			getAttendees: () => {
				return this.presence.attendees.getAttendees();
			},
			getMyself: () => {
				return this.presence.attendees.getMyself();
			},
			events: this.presence.attendees.events,
		};

		/** Test if the given id is selected by the local client */
		public testSelection(sel: TypedSelection) {
			return this._testForInclusion(sel, this.state.local);
		}

		/** Test if the given id is selected by any remote client */
		public testRemoteSelection(sel: TypedSelection): string[] {
			const remoteSelectedClients: string[] = [];
			for (const cv of this.state.getRemotes()) {
				if (cv.attendee.getConnectionStatus() === "Connected") {
					if (this._testForInclusion(sel, cv.value)) {
						remoteSelectedClients.push(cv.attendee.attendeeId);
					}
				}
			}
			return remoteSelectedClients;
		}

		/** Clear the current selection */
		public clearSelection() {
			this.state.local = this.initialState;
		}

		/** Change the selection to the given id or array of ids */
		public setSelection(sel: TypedSelection | TypedSelection[]) {
			if (Array.isArray(sel)) {
				// If an array of selections is provided, set it directly
				this.state.local = sel;
			} else {
				// Otherwise, set the single selection
				this.state.local = [sel];
			}
			/**
			 * Note: This will overwrite the current local selection with the new one.
			 * This means that if you want to maintain previous selections, you should use `addToSelection` or `toggleSelection` instead.
			 */
			return;
		}

		/** Toggle the selection of the given id */
		public toggleSelection(sel: TypedSelection) {
			if (this.testSelection(sel)) {
				this.removeFromSelection(sel);
			} else {
				this.addToSelection(sel);
			}
			return;
		}

		/** Add the given id to the selection */
		public addToSelection(sel: TypedSelection) {
			const arr: TypedSelection[] = this.state.local.slice();
			if (!this._testForInclusion(sel, arr)) {
				arr.push(sel);
			}
			this.state.local = arr;
		}

		/** Remove the given id from the selection */
		public removeFromSelection(sel: TypedSelection) {
			const arr: TypedSelection[] = this.state.local.filter((s) => s.id !== sel.id);
			this.state.local = arr;
		}

		/** Get the current local selection array */
		public getLocalSelection(): readonly TypedSelection[] {
			return this.state.local;
		}

		/** Get the current remote selection map where the key is the selected item id and the value is an array of client ids */
		public getRemoteSelected(): Map<TypedSelection, string[]> {
			const remoteSelected = new Map<TypedSelection, string[]>();
			for (const cv of this.state.getRemotes()) {
				if (cv.attendee.getConnectionStatus() === "Connected") {
					for (const sel of cv.value) {
						if (!remoteSelected.has(sel)) {
							remoteSelected.set(sel, []);
						}
						remoteSelected.get(sel)?.push(cv.attendee.attendeeId);
					}
				}
			}

			return remoteSelected;
		}

		private _testForInclusion(
			sel: TypedSelection,
			collection: readonly TypedSelection[],
		): boolean {
			return !!collection.find((s) => s.id === sel.id);
		}
	}

	return new SelectionManagerImpl(name, workspace, presence);
}

export function createSelectionManager(props: {
	presence: Presence;
	workspace: StatesWorkspace<{}>;
	name: string;
}): SelectionManager {
	const { presence, workspace, name } = props;

	class SelectionManagerImpl implements SelectionManager {
		initialState: Selection[] = []; // Default initial state for the selection manager

		state: LatestRaw<Selection[]>;

		constructor(
			name: string,
			workspace: StatesWorkspace<{}>,
			private presence: Presence,
		) {
			workspace.add(name, StateFactory.latest({ local: this.initialState }));
			this.state = workspace.states[name];
		}

		public get events(): Listenable<LatestRawEvents<Selection[]>> {
			return this.state.events;
		}

		public clients = {
			getAttendee: (clientId: ClientConnectionId | AttendeeId) => {
				return this.presence.attendees.getAttendee(clientId);
			},
			getAttendees: () => {
				return this.presence.attendees.getAttendees();
			},
			getMyself: () => {
				return this.presence.attendees.getMyself();
			},
			events: this.presence.attendees.events,
		};

		/** Test if the given id is selected by the local client */
		public testSelection(sel: Selection) {
			return this._testForInclusion(sel, this.state.local);
		}

		/** Test if the given id is selected by any remote client */
		public testRemoteSelection(sel: Selection): string[] {
			const remoteSelectedClients: string[] = [];
			for (const cv of this.state.getRemotes()) {
				if (cv.attendee.getConnectionStatus() === "Connected") {
					if (this._testForInclusion(sel, cv.value)) {
						remoteSelectedClients.push(cv.attendee.attendeeId);
					}
				}
			}
			return remoteSelectedClients;
		}

		/** Clear the current selection */
		public clearSelection() {
			this.state.local = this.initialState;
		}

		/** Change the selection to the given id or array of ids */
		public setSelection(sel: Selection | Selection[]) {
			if (Array.isArray(sel)) {
				this.state.local = sel;
			} else {
				this.state.local = [sel];
			}
			return;
		}

		/** Toggle the selection of the given id */
		public toggleSelection(sel: Selection) {
			if (this.testSelection(sel)) {
				this.removeFromSelection(sel);
			} else {
				this.addToSelection(sel);
			}
			return;
		}

		/** Add the given id to the selection */
		public addToSelection(sel: Selection) {
			const arr: Selection[] = this.state.local.slice();
			if (!this._testForInclusion(sel, arr)) {
				arr.push(sel);
			}
			this.state.local = arr;
		}

		/** Remove the given id from the selection */
		public removeFromSelection(sel: Selection) {
			const arr: Selection[] = this.state.local.filter((s) => s.id !== sel.id);
			this.state.local = arr;
		}

		private _testForInclusion(sel: Selection, collection: readonly Selection[]): boolean {
			return !!collection.find((s) => s.id === sel.id);
		}

		/** Get the current local selection array */
		public getLocalSelection(): readonly Selection[] {
			return this.state.local;
		}

		/** Get the current remote selection map where the key is the selected item id and the value is an array of client ids */
		public getRemoteSelected(): Map<Selection, string[]> {
			const remoteSelected = new Map<Selection, string[]>();
			for (const cv of this.state.getRemotes()) {
				if (cv.attendee.getConnectionStatus() === "Connected") {
					for (const sel of cv.value) {
						if (!remoteSelected.has(sel)) {
							remoteSelected.set(sel, []);
						}
						remoteSelected.get(sel)?.push(cv.attendee.attendeeId);
					}
				}
			}
			return remoteSelected;
		}
	}

	return new SelectionManagerImpl(name, workspace, presence);
}

export type TypedSelection = {
	id: string; // The unique identifier for the selected item
	type?: selectionType; // The type of the selection (row, column, cell, etc.)
};

export type selectionType = "row" | "column" | "cell";
