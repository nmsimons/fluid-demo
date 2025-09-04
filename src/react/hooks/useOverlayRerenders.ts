import { useEffect, useState } from "react";
import type { PresenceContext } from "../contexts/PresenceContext.js";

export function useOverlayRerenders(presence: React.ContextType<typeof PresenceContext>) {
	const [selKey, setSelKey] = useState(0);
	const [motionKey, setMotionKey] = useState(0);

	useEffect(() => {
		const offLocal = presence.itemSelection.events.on("localUpdated", () => setSelKey((t) => (t + 1) % 1000));
		const offRemote = presence.itemSelection.events.on("remoteUpdated", () => setSelKey((t) => (t + 1) % 1000));
		return () => {
			offLocal();
			offRemote();
		};
	}, [presence.itemSelection]);

	useEffect(() => {
		const offDragLocal = presence.drag.events.on("localUpdated", () => setMotionKey((t) => (t + 1) % 1000));
		const offDragRemote = presence.drag.events.on("remoteUpdated", () => setMotionKey((t) => (t + 1) % 1000));
		const offResizeLocal = presence.resize.events.on("localUpdated", () => setMotionKey((t) => (t + 1) % 1000));
		const offResizeRemote = presence.resize.events.on("remoteUpdated", () => setMotionKey((t) => (t + 1) % 1000));
		return () => {
			offDragLocal();
			offDragRemote();
			offResizeLocal();
			offResizeRemote();
		};
	}, [presence.drag, presence.resize]);

	return { selKey, motionKey };
}
