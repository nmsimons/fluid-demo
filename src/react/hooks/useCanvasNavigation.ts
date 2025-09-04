import { useEffect, useRef, useState } from "react";
import type { PresenceContext } from "../contexts/PresenceContext.js";

export function useCanvasNavigation(
	params: {
		svgRef: React.RefObject<SVGSVGElement>;
		presence: React.ContextType<typeof PresenceContext>;
		setSize: (w: number, h: number) => void;
	}
) {
	const { svgRef, presence, setSize } = params;
	const [canvasPosition, setCanvasPosition] = useState({ left: 0, top: 0 });
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [isPanning, setIsPanning] = useState(false);
	const lastPos = useRef<{ x: number; y: number } | null>(null);
	const movedRef = useRef(false);

	// Wheel zoom (non-passive) with cursor anchoring
	useEffect(() => {
		const el = svgRef.current;
		if (!el) return;
		const zoomRef = { current: zoom } as { current: number };
		const panRef = { current: pan } as { current: { x: number; y: number } };
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
			const zoomFactor = Math.exp(-e.deltaY * 0.0015);
			const currentZoom = zoomRef.current ?? 1;
			const newZoom = Math.min(4, Math.max(0.25, currentZoom * zoomFactor));
			if (newZoom === currentZoom) return;
			const panNow = panRef.current ?? { x: 0, y: 0 };
			const p = { x: (mouse.x - panNow.x) / currentZoom, y: (mouse.y - panNow.y) / currentZoom };
			const newPan = { x: mouse.x - newZoom * p.x, y: mouse.y - newZoom * p.y };
			setPan(newPan);
			setZoom(newZoom);
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
	}, [svgRef.current, pan, zoom]);

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
		const until = svg?.dataset?.suppressClearUntil ? parseInt(svg.dataset.suppressClearUntil) : 0;
		if (until && Date.now() < until) {
			if (svg) delete svg.dataset.suppressClearUntil;
			return;
		}
		presence.itemSelection?.clearSelection();
	};

	// Begin panning on empty background
	const beginPanIfBackground = (e: React.MouseEvent) => {
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as Element | null;
		if (target?.closest('[data-svg-item-id]')) return;
		if (target?.closest('[data-item-id]')) return;
		setIsPanning(true);
		lastPos.current = { x: e.clientX, y: e.clientY };
		movedRef.current = false;
	};

	// Allow panning via empty HTML background inside foreignObject
	const handleHtmlBackgroundMouseDown = (e: React.MouseEvent) => {
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as HTMLElement;
		if (target.closest('[data-item-id]')) return;
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
