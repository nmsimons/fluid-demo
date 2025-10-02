let pending = false;

const EVENT_NAME = "layout-changed";

/**
 * Schedules a global layout invalidation event. Multiple calls within the same
 * frame coalesce into a single `layout-changed` dispatch so listeners (such as
 * the canvas overlay) only rerender once per layout update burst.
 */
export function scheduleLayoutInvalidation(): void {
	if (pending) {
		return;
	}
	pending = true;
	const fire = () => {
		pending = false;
		if (typeof window !== "undefined") {
			window.dispatchEvent(new Event(EVENT_NAME));
		}
	};
	if (typeof requestAnimationFrame === "function") {
		requestAnimationFrame(fire);
	} else {
		setTimeout(fire, 0);
	}
}
