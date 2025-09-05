import { LatestRaw, LatestRawEvents } from "@fluidframework/presence/beta";
import { Listenable } from "fluid-framework";

export interface EphemeralPoint {
	x: number;
	y: number;
	t?: number;
	p?: number;
}

export interface EphemeralInkStroke {
	id: string;
	points: readonly EphemeralPoint[];
	color: string;
	width: number;
	opacity: number;
	startTime: number;
}

export interface InkPresenceManager {
	state: LatestRaw<EphemeralInkStroke | null>;
	events: Listenable<LatestRawEvents<EphemeralInkStroke | null>>;
	attendees: LatestRaw<EphemeralInkStroke | null>["presence"]["attendees"];
	setStroke(stroke: EphemeralInkStroke): void;
	updateStroke(points: EphemeralPoint[]): void;
	clearStroke(): void;
	getRemoteStrokes(): { stroke: EphemeralInkStroke; attendeeId: string }[];
}
