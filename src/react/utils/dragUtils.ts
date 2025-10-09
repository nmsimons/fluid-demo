import { PresenceContext } from "../contexts/PresenceContext.js";

/**
 * Get the active drag/rotate state for an item from presence (local preferred, then any connected remote).
 * Returns null if no active drag for the item.
 */
export function getActiveDragForItem(
	presence: React.ContextType<typeof PresenceContext>,
	itemId: string
): { id: string; x: number; y: number; rotation: number } | null {
	const local = presence.drag?.state?.local as {
		id: string;
		x: number;
		y: number;
		rotation: number;
		selection?: Array<{ id: string; x: number; y: number; rotation?: number }>;
	} | null;
	if (local) {
		if (local.id === itemId) {
			return local;
		}
		const companion = local.selection?.find((entry) => entry.id === itemId);
		if (companion) {
			return {
				id: companion.id,
				x: companion.x,
				y: companion.y,
				rotation: companion.rotation ?? local.rotation,
			};
		}
	}
	const remotesIter = (
		presence.drag?.state as unknown as { getRemotes?: () => unknown }
	)?.getRemotes?.();
	const isIterable = (obj: unknown): obj is Iterable<unknown> => {
		return !!obj && typeof (obj as { [k: symbol]: unknown })[Symbol.iterator] === "function";
	};
	const isRecord = (v: unknown): v is Record<string, unknown> =>
		typeof v === "object" && v !== null;
	if (isIterable(remotesIter)) {
		for (const cv of remotesIter) {
			let connected = true;
			if (
				isRecord(cv) &&
				"attendee" in cv &&
				isRecord((cv as Record<string, unknown>)["attendee"])
			) {
				const att = (cv as Record<string, unknown>)["attendee"] as Record<string, unknown>;
				let status: unknown = "Connected";
				if (typeof att["getConnectionStatus"] === "function") {
					status = (att["getConnectionStatus"] as (this: unknown) => unknown).call(att);
				}
				connected = status === "Connected";
			}
			if (!connected) continue;
			const val = isRecord(cv)
				? (cv["value"] as Record<string, unknown> | undefined)
				: undefined;
			if (!val) continue;
			const baseId = typeof val["id"] === "string" ? (val["id"] as string) : undefined;
			const x = typeof val["x"] === "number" ? (val["x"] as number) : undefined;
			const y = typeof val["y"] === "number" ? (val["y"] as number) : undefined;
			const rotation = typeof val["rotation"] === "number" ? (val["rotation"] as number) : 0;
			if (baseId === itemId && x !== undefined && y !== undefined) {
				return { id: baseId, x, y, rotation };
			}
			const selection = Array.isArray(val["selection"])
				? (val["selection"] as unknown[])
				: [];
			for (const entry of selection) {
				if (!isRecord(entry)) continue;
				const sid = typeof entry["id"] === "string" ? (entry["id"] as string) : undefined;
				if (sid !== itemId) continue;
				const sx = typeof entry["x"] === "number" ? (entry["x"] as number) : 0;
				const sy = typeof entry["y"] === "number" ? (entry["y"] as number) : 0;
				const srot =
					typeof entry["rotation"] === "number"
						? (entry["rotation"] as number)
						: rotation;
				return { id: sid, x: sx, y: sy, rotation: srot };
			}
		}
	}
	return null;
}
