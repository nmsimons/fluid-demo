import { useEffect, useRef, useState } from "react";
import type { PresenceContext } from "../contexts/PresenceContext.js";

// Discrete zoom levels (always includes 1 for 100%)
const ZOOM_STEPS = [
	0.25, 0.33, 0.5, 0.67, 0.75, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.25, 1.35, 1.5, 1.75, 2,
	2.25, 2.5, 3, 3.5, 4,
];

function nearestZoomIndex(z: number) {
	let idx = 0;
	let best = Infinity;
	for (let i = 0; i < ZOOM_STEPS.length; i++) {
		const d = Math.abs(ZOOM_STEPS[i] - z);
		if (d < best) {
			best = d;
			idx = i;
		}
	}
	return idx;
}

export function useCanvasNavigation(params: {
	svgRef: React.RefObject<SVGSVGElement>;
	presence: React.ContextType<typeof PresenceContext>;
	setSize: (w: number, h: number) => void;
	externalZoom?: number;
	onZoomChange?: (z: number) => void;
}) {
	const { svgRef, presence, setSize, externalZoom, onZoomChange } = params;
	const [canvasPosition, setCanvasPosition] = useState({ left: 0, top: 0 });
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [internalZoom, setInternalZoom] = useState(externalZoom ?? 1);
	const zoom = externalZoom ?? internalZoom;
	const [isPanning, setIsPanning] = useState(false);
	const lastPos = useRef<{ x: number; y: number } | null>(null);
	const movedRef = useRef(false);

	// Wheel zoom (non-passive) with cursor anchoring and discrete steps
	useEffect(() => {
		const el = svgRef.current;
		if (!el) return;
		const zoomRef = { current: zoom } as { current: number };
		const panRef = { current: pan } as { current: { x: number; y: number } };
		const accumRef = { current: 0 } as { current: number };
		const STEP_TRIGGER = 40; // wheel delta accumulation threshold
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			accumRef.current += e.deltaY;
			if (Math.abs(accumRef.current) < STEP_TRIGGER) return; // wait until threshold reached
			const direction = accumRef.current > 0 ? 1 : -1; // 1 = zoom out, -1 = zoom in
			// retain remainder so fast scroll can step multiple times
			accumRef.current -= STEP_TRIGGER * direction;
			const rect = el.getBoundingClientRect();
			const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
			const currentZoom = zoomRef.current ?? 1;
			let idx = nearestZoomIndex(currentZoom);
			// If current zoom is above the nearest step and scrolling in, move upward appropriately
			if (direction < 0 && currentZoom > ZOOM_STEPS[idx] && idx < ZOOM_STEPS.length - 1) {
				idx++;
			}
			// If current zoom is below the nearest step and scrolling out, move downward
			if (direction > 0 && currentZoom < ZOOM_STEPS[idx] && idx > 0) {
				idx--;
			}
			const newIdx = Math.min(
				ZOOM_STEPS.length - 1,
				Math.max(0, idx - direction) // subtract direction because direction>0 means zoom out
			);
			const newZoom = ZOOM_STEPS[newIdx];
			if (newZoom === currentZoom) return;
			const panNow = panRef.current ?? { x: 0, y: 0 };
			const p = {
				x: (mouse.x - panNow.x) / currentZoom,
				y: (mouse.y - panNow.y) / currentZoom,
			};
			const newPan = { x: mouse.x - newZoom * p.x, y: mouse.y - newZoom * p.y };
			setPan(newPan);
			if (onZoomChange) onZoomChange(newZoom);
			else setInternalZoom(newZoom);
		};
		const updateRefs = () => {
			zoomRef.current = zoom;
			panRef.current = pan;
		};
		updateRefs();
		const raf = requestAnimationFrame(updateRefs);
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => {
			cancelAnimationFrame(raf);
			el.removeEventListener("wheel", onWheel as EventListener);
		};
	}, [svgRef.current, pan, zoom, onZoomChange]);

	// Sync internal zoom with external changes
	useEffect(() => {
		if (externalZoom !== undefined) setInternalZoom(externalZoom);
	}, [externalZoom]);

	// Track canvas size
	const handleResize = () => {
		if (svgRef.current) {
			const { width, height, left, top } = svgRef.current.getBoundingClientRect();
			setSize(width, height);
			setCanvasPosition({ left, top });
		}
	};
	useEffect(() => {
		if (svgRef.current) {
			const { width, height, left, top } = svgRef.current.getBoundingClientRect();
			setSize(width, height);
			setCanvasPosition({ left, top });
		}
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Background click clears selection (unless suppressed)
	const handleBackgroundClick = () => {
		const svg = svgRef.current as (SVGSVGElement & { dataset: DOMStringMap }) | null;
		const until = svg?.dataset?.suppressClearUntil
			? parseInt(svg.dataset.suppressClearUntil)
			: 0;
		if (until && Date.now() < until) {
			if (svg) delete svg.dataset.suppressClearUntil;
			return;
		}
		presence.itemSelection?.clearSelection();
	};

	// Begin panning on empty background
	const beginPanIfBackground = (e: React.MouseEvent) => {
		// Only start pan on right mouse button (button === 2)
		if (e.button !== 2) return;
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as Element | null;
		if (target?.closest("[data-svg-item-id]")) return;
		if (target?.closest("[data-item-id]")) return;
		// Prevent default context menu pathway
		e.preventDefault();
		setIsPanning(true);
		lastPos.current = { x: e.clientX, y: e.clientY };
		movedRef.current = false;
	};

	// Allow panning via empty HTML background inside foreignObject
	const handleHtmlBackgroundMouseDown = (e: React.MouseEvent) => {
		// Right button only
		if (e.button !== 2) return;
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as HTMLElement;
		if (target.closest("[data-item-id]")) return;
		e.preventDefault();
		setIsPanning(true);
		lastPos.current = { x: e.clientX, y: e.clientY };
		movedRef.current = false;
	};

	// Global mouse move/up for panning
	useEffect(() => {
		if (!isPanning) return;
		const onMove = (ev: MouseEvent) => {
			if (!lastPos.current) return;
			const dx = ev.clientX - lastPos.current.x;
			const dy = ev.clientY - lastPos.current.y;
			if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
				setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
				lastPos.current = { x: ev.clientX, y: ev.clientY };
				movedRef.current = true;
			}
		};
		const onUp = () => {
			setIsPanning(false);
			lastPos.current = null;
			const rootEl = document.documentElement as HTMLElement & { dataset: DOMStringMap };
			if (rootEl.dataset) {
				delete rootEl.dataset.panning;
			}
			if (movedRef.current) {
				const svg = svgRef.current as (SVGSVGElement & { dataset: DOMStringMap }) | null;
				if (svg) svg.dataset.suppressClearUntil = String(Date.now() + 150);
			}
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isPanning]);

	// Reflect panning state globally so other components can react
	useEffect(() => {
		if (isPanning) {
			const rootEl = document.documentElement as HTMLElement & { dataset: DOMStringMap };
			rootEl.dataset.panning = "1";
			return () => {
				if (rootEl.dataset) delete rootEl.dataset.panning;
			};
		}
	}, [isPanning]);

	return {
		canvasPosition,
		pan,
		zoom,
		isPanning,
		beginPanIfBackground,
		handleHtmlBackgroundMouseDown,
		handleBackgroundClick,
	};
}
