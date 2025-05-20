// Custom hook to manage presence state in a Fluid Framework application
// It takes in a presence manager and a function to run when the presence state changes

import { useEffect } from "react";
import { PresenceManager } from "../utils/Interfaces/PresenceManager.js";
import { Attendee } from "@fluidframework/presence/alpha";

export function usePresenceManager<TState>(
	presenceManager: PresenceManager<TState>,
	runOnChange: (updated: TState) => void,
	runOnChangeLocal: (updated: TState) => void = runOnChange,
	runOnDisconnect?: (updated: Attendee) => void,
) {
	useEffect(() => {
		const unsubscribe = presenceManager.events.on("remoteUpdated", (updated) => {
			runOnChange(updated.value as TState);
		});
		return unsubscribe;
	}, [presenceManager, runOnChange]);

	useEffect(() => {
		const unsubscribe = presenceManager.events.on("localUpdated", (updated) => {
			runOnChangeLocal(updated.value as TState);
		});
		return unsubscribe;
	}, [presenceManager, runOnChange]);

	useEffect(() => {
		const unsubscribe = presenceManager.clients.events.on("attendeeDisconnected", (updated) => {
			if (!runOnDisconnect) return;
			runOnDisconnect(updated);
		});
		return unsubscribe;
	}, [presenceManager, runOnChange]);
}
