import {
	StateFactory,
	StatesWorkspace,
	Latest,
	LatestEvents,
	StateSchemaValidator,
} from "@fluidframework/presence/beta";
import { Listenable } from "fluid-framework";
import { InkPresenceManager, EphemeralInkStroke, EphemeralPoint } from "./Interfaces/InkManager.js";
import { z } from "zod";

const EphemeralPointSchema: z.ZodType<EphemeralPoint> = z
	.object({
		x: z.number().finite(),
		y: z.number().finite(),
		t: z.number().finite().optional(),
		p: z.number().finite().optional(),
	})
	.strict();

const InkStrokeSchema: z.ZodType<EphemeralInkStroke | null> = z.union([
	z.null(),
	z
		.object({
			id: z.string(),
			points: EphemeralPointSchema.array(),
			color: z.string(),
			width: z.number().finite(),
			opacity: z.number().finite(),
			startTime: z.number().finite(),
		})
		.strict(),
]);

const validateInkState: StateSchemaValidator<EphemeralInkStroke | null> = (value) => {
	const result = InkStrokeSchema.safeParse(value);
	return result.success ? result.data : undefined;
};

/* eslint-disable @typescript-eslint/no-empty-object-type */
export function createInkPresenceManager(props: {
	workspace: StatesWorkspace<{}>;
	name: string;
}): InkPresenceManager {
	const { workspace, name } = props;

	class InkPresenceManagerImpl implements InkPresenceManager {
		state: Latest<EphemeralInkStroke | null>;
		constructor(name: string, workspace: StatesWorkspace<{}>) {
			workspace.add(
				name,
				StateFactory.latest<EphemeralInkStroke | null>({
					local: null,
					validator: validateInkState,
				})
			);
			this.state = workspace.states[name];
		}
		get events(): Listenable<LatestEvents<EphemeralInkStroke | null>> {
			return this.state.events;
		}
		get attendees() {
			return this.state.presence.attendees;
		}
		setStroke(stroke: EphemeralInkStroke) {
			this.state.local = stroke;
		}
		updateStroke(points: EphemeralPoint[]) {
			if (this.state.local) {
				this.state.local = { ...this.state.local, points };
			}
		}
		clearStroke() {
			this.state.local = null;
		}
		getRemoteStrokes() {
			const out: { stroke: EphemeralInkStroke; attendeeId: string }[] = [];
			for (const cv of this.state.getRemotes()) {
				const stroke = cv.value();
				if (stroke) {
					out.push({ stroke, attendeeId: cv.attendee.attendeeId });
				}
			}
			return out;
		}
	}

	return new InkPresenceManagerImpl(name, workspace);
}
