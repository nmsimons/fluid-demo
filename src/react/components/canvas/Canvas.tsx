/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useRef, useState, useEffect } from "react";
/**
 * Canvas component
 * -------------------------------------------------------------
 * This file implements the collaborative drawing / layout surface.
 * Responsibilities:
 * 1. Coordinate system management (pan + zoom) via useCanvasNavigation hook.
 * 2. Two-layer rendering strategy:
 *    - SVG layer: scalable content (ink + selection + presence overlays).
 *    - HTML foreignObject layer: React DOM for complex items (tables, notes, shapes).				if (!inkActive) return; // only when ink tool active
				if (e.button !== 0) return; // left only

				// Clear selection when starting to ink (same as mouse click behavior)
				presence.itemSelection?.clearSelection();

				// Start inking
				const p = toLogical(e.clientX, e.clientY);meral inking (local + remote) using the Presence API (no persistence until stroke commit).
 * 4. Persistent ink commit into SharedTree schema (`App.inks`).
 * 5. Eraser hit-testing using a zoom-aware circular cursor.
 * 6. Selection / presence overlays (only re-rendering when underlying presence keys change).
 *
 * Coordinate Spaces:
 * - Screen space: raw pointer clientX/clientY (pixels in viewport).
 * - Canvas space: screen adjusted by <svg> boundingClientRect.
 * - Logical space: pan+zoom transformed coordinates used for ink persistence.
 *   logical = (screen - pan) / zoom
 *
 * Performance Considerations:
 * - Pointer inking uses coalesced events (when supported) to capture high‑resolution input without flooding React.
 * - Points are stored in a ref array (`tempPointsRef`) and broadcast at most once per animation frame to presence.
 * - Batching final stroke commit inside a SharedTree transaction.
 * - Presence driven overlays subscribe with keys (`selKey`, `motionKey`) to minimize diff churn.
 *
 * Presence vs Persistent Ink:
 * - While drawing: stroke exists only in presence (ephemeral) so other users see it immediately.
 * - On pointer up: stroke is converted into a persistent `InkStroke` (schema object) and appended to `App.inks`.
 * - Remote ephemerals are rendered translucently; committed strokes are opaque.
 *
 * Erasing (current implementation):
 * - Simple hit test deletes the first stroke that intersects the eraser circle.
 * - Future enhancement: partial segment splitting (prototype attempted earlier) and adjustable eraser size.
 *
 * Cursor Rendering:
 * - Logical ink width is scaled by zoom for visual accuracy, but polyline uses vectorEffect="non-scaling-stroke" to retain crispness.
 * - Custom circle overlay drawn in screen space for ink / eraser feedback.
 */
import { Items, InkStroke, InkPoint, InkStyle, InkBBox, App } from "../../../schema/appSchema.js";
import { Tree } from "fluid-framework";
import { IFluidContainer } from "fluid-framework";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { findInkStrokeHit } from "../../../utils/inkHitTest.js";
import { getInitials, getUserColor } from "../../../utils/userUtils.js";
import { clientToLogical } from "../../../utils/coordinates.js";
// ItemView moved into ItemsHtmlLayer
import { useTree } from "../../hooks/useTree.js";
import { LayoutContext } from "../../hooks/useLayoutManger.js";
import { SelectionOverlay } from "../../overlays/SelectionOverlay.js";
import { PresenceOverlay } from "../../overlays/PresenceOverlay.js";
import { CommentOverlay } from "../../overlays/CommentOverlay.js";
import { CursorOverlay } from "../../overlays/CursorOverlay.js";
import { GroupOverlay } from "../../overlays/GroupOverlay.js";
import { ConnectionOverlay } from "../../overlays/ConnectionOverlay.js";
import { useCanvasNavigation } from "../../hooks/useCanvasNavigation.js";
import { useOverlayRerenders } from "../../hooks/useOverlayRerenders.js";
import { updateCursorFromEvent } from "../../../utils/cursorUtils.js";
import { ItemsHtmlLayer } from "./ItemsHtmlLayer.js";
import { InkLayer } from "./InkLayer.js";
import { PaneContext } from "../../contexts/PaneContext.js";
import { flattenItems } from "../../../utils/flattenItems.js";
import { smoothAndSimplifyInkPoints } from "../../utils/inkSmoothing.js";

type MarqueeDragState = {
	pointerId: number;
	origin: { x: number; y: number };
	current: { x: number; y: number };
	additive: boolean;
	subtractive: boolean;
	baselineIds: string[];
	hasDragged: boolean;
};

export function Canvas(props: {
	items: Items;
	container: IFluidContainer;
	setSize: (width: number, height: number) => void;
	zoom?: number;
	onZoomChange?: (z: number) => void;
	onPanChange?: (p: { x: number; y: number }) => void;
	inkActive?: boolean;
	eraserActive?: boolean;
	inkColor?: string;
	inkWidth?: number;
}): JSX.Element {
	const {
		items,
		container, // eslint-disable-line @typescript-eslint/no-unused-vars
		setSize,
		zoom: externalZoom,
		onZoomChange,
		onPanChange,
		inkActive,
		eraserActive,
		inkColor = "#2563eb",
		inkWidth = 4,
	} = props;

	// Global presence context (ephemeral collaboration state: selections, drags, ink, etc.)
	const presence = useContext(PresenceContext);
	// Use deep tracking to detect changes to item positions, not just collection changes
	const itemsVersion = useTree(items, true);
	const layout = useContext(LayoutContext);

	// Flatten the items tree so all items (including those in groups) render on the main canvas
	const flattenedItems = React.useMemo(() => flattenItems(items), [items, itemsVersion]);

	const svgRef = useRef<SVGSVGElement>(null);
	const smoothingOptions = {
		smoothingWindow: 7,
		tolerance: 1.2,
		minimumPoints: 2,
		chaikinIterations: 2,
	};
	// Freehand ink capture lifecycle:
	// 1. pointerDown -> start stroke (local ephemeral + presence broadcast)
	// 2. pointerMove -> accumulate points (filtered) & throttle presence update via rAF
	// 3. pointerUp/Cancel -> commit to SharedTree + clear presence
	const [inking, setInking] = useState(false);
	const tempPointsRef = useRef<InkPoint[]>([]);
	const pointerIdRef = useRef<number | null>(null);
	const pointerTypeRef = useRef<string | null>(null);
	const lastPointRef = useRef<{ x: number; y: number } | null>(null);
	const strokeIdRef = useRef<string | null>(null);
	const {
		canvasPosition,
		pan,
		zoom,
		isPanning,
		beginPanIfBackground,
		handleHtmlBackgroundMouseDown,
		handleBackgroundClick,
	} = useCanvasNavigation({
		svgRef,
		presence,
		setSize,
		externalZoom,
		onZoomChange,
	});
	const { selKey, motionKey } = useOverlayRerenders(presence);
	// Track expanded state for presence indicators per item
	const [expandedPresence, setExpandedPresence] = useState<Set<string>>(new Set());
	// Screen-space cursor for ink / eraser
	const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({
		x: 0,
		y: 0,
		visible: false,
	});
	// Hovered stroke (eraser preview)
	const [eraserHoverId, setEraserHoverId] = useState<string | null>(null);
	const [marqueeState, setMarqueeState] = useState<MarqueeDragState | null>(null);
	const marqueeRect = React.useMemo(() => {
		if (!marqueeState) return null;
		const x = Math.min(marqueeState.origin.x, marqueeState.current.x);
		const y = Math.min(marqueeState.origin.y, marqueeState.current.y);
		const width = Math.abs(marqueeState.origin.x - marqueeState.current.x);
		const height = Math.abs(marqueeState.origin.y - marqueeState.current.y);
		return { x, y, width, height };
	}, [marqueeState]);

	// Collaborative cursor tracking
	useEffect(() => {
		const svgElement = svgRef.current;
		if (!svgElement) return;

		const handleMouseMove = (event: MouseEvent) => {
			// Update collaborative cursor position using DRY utility
			updateCursorFromEvent(event, presence.cursor, pan, zoom);
		};

		const handleMouseEnter = () => {
			// Show collaborative cursor when mouse enters canvas
			presence.cursor?.showCursor();
		};

		const handleMouseLeave = () => {
			// Hide collaborative cursor when mouse leaves canvas
			presence.cursor?.hideCursor();
		};

		// Add event listeners
		svgElement.addEventListener("mousemove", handleMouseMove);
		svgElement.addEventListener("mouseenter", handleMouseEnter);
		svgElement.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			// Cleanup event listeners
			svgElement.removeEventListener("mousemove", handleMouseMove);
			svgElement.removeEventListener("mouseenter", handleMouseEnter);
			svgElement.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [pan.x, pan.y, zoom, presence.cursor]);

	// Hovered stroke (eraser preview)

	const paneContext = useContext(PaneContext);

	const isCanvasInteractiveTarget = (element: Element | null): boolean => {
		if (!element) return false;
		return !!element.closest(
			"button, input, select, textarea, [role='button'], [data-canvas-interactive='true'], [contenteditable='true']"
		);
	};

	// Layout version to trigger overlay re-renders when intrinsic sizes change (e.g., table growth)
	const [layoutVersion, setLayoutVersion] = useState(0);
	useEffect(() => {
		const handler = () => setLayoutVersion((v) => v + 1);
		window.addEventListener("layout-changed", handler);
		return () => window.removeEventListener("layout-changed", handler);
	}, []);
	useEffect(() => {
		setLayoutVersion((v) => v + 1);
	}, [itemsVersion]);

	const commentPaneVisible =
		paneContext.panes.find((p) => p.name === "comments")?.visible ?? false;

	// Get root App via Tree API (more robust than accessing .parent directly)
	const root = ((): App | undefined => {
		// Tree.parent(items) returns the parent node, expected to be App
		try {
			const p = Tree.parent(items);
			return p instanceof App ? (p as App) : (p as unknown as App | undefined);
		} catch {
			return undefined;
		}
	})();
	const inksNode = root?.inks; // SharedTree field storing persistent InkStroke objects
	// Stable hook ordering: call a dummy state hook first, then conditionally subscribe
	const [dummy] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
	if (inksNode) {
		useTree(inksNode, true);
	}
	const inksIterable = inksNode ?? [];

	// Notify parent of pan changes (for ink coordinate calculations)
	useEffect(() => {
		if (onPanChange) onPanChange(pan);
	}, [pan, onPanChange]);

	// Convert screen coords (client) into logical content coordinates.
	const toLogical = (clientX: number, clientY: number): { x: number; y: number } =>
		clientToLogical(clientX, clientY, svgRef.current, pan, zoom);

	// Erase helper (simple deletion): removes the first stroke whose polyline (inflated by stroke width)
	// intersects the eraser logical circle. This is O(N * M) where N=strokes, M=points per stroke; fast enough
	// for typical collaborative canvases. Bounding box check performs coarse rejection before segment math.
	const performErase = (p: { x: number; y: number }) => {
		if (!root?.inks) return;
		const eraserScreenRadius = 12; // cursor visual radius
		const eraserLogicalRadius = eraserScreenRadius / zoom;

		const target = findInkStrokeHit(root.inks, p, eraserLogicalRadius);

		if (target) {
			Tree.runTransaction(root.inks, () => {
				const idx = root.inks.indexOf(target!);
				if (idx >= 0) root.inks.removeAt(idx);
			});
		}
	};

	const finalizeMarqueeSelection = (state: MarqueeDragState): boolean => {
		const dx = Math.abs(state.current.x - state.origin.x);
		const dy = Math.abs(state.current.y - state.origin.y);
		if (!state.hasDragged && Math.max(dx, dy) < 1) {
			return false;
		}
		const minX = Math.min(state.origin.x, state.current.x);
		const maxX = Math.max(state.origin.x, state.current.x);
		const minY = Math.min(state.origin.y, state.current.y);
		const maxY = Math.max(state.origin.y, state.current.y);
		const hits: string[] = [];
		for (const flatItem of flattenedItems) {
			if (flatItem.isGroupContainer) continue;
			const bounds = layout.get(flatItem.item.id);
			if (!bounds) continue;
			if (
				bounds.right < minX ||
				bounds.left > maxX ||
				bounds.bottom < minY ||
				bounds.top > maxY
			)
				continue;
			hits.push(flatItem.item.id);
		}
		const manager = presence.itemSelection;
		if (!manager) return false;
		let finalIds: string[];
		if (state.subtractive) {
			const base = new Set(state.baselineIds);
			for (const id of hits) base.delete(id);
			finalIds = Array.from(base);
		} else if (state.additive) {
			const base = new Set(state.baselineIds);
			for (const id of hits) base.add(id);
			finalIds = Array.from(base);
		} else {
			finalIds = hits;
		}
		if (finalIds.length > 0) {
			manager.setSelection(finalIds.map((id) => ({ id })));
		} else {
			manager.clearSelection();
		}
		const svg = svgRef.current as (SVGSVGElement & { dataset: DOMStringMap }) | null;
		if (svg) {
			svg.dataset.suppressClearUntil = String(Date.now() + 150);
		}
		return true;
	};

	// Begin inking on left button background press (not on items)
	const handlePointerMove = (e: React.PointerEvent) => {
		if (marqueeState && e.pointerId === marqueeState.pointerId) {
			const logical = toLogical(e.clientX, e.clientY);
			setMarqueeState((prev) => {
				if (!prev || prev.pointerId !== e.pointerId) return prev;
				const dragged =
					prev.hasDragged ||
					Math.abs(logical.x - prev.origin.x) > 1 ||
					Math.abs(logical.y - prev.origin.y) > 1;
				if (
					logical.x === prev.current.x &&
					logical.y === prev.current.y &&
					dragged === prev.hasDragged
				)
					return prev;
				return {
					...prev,
					current: logical,
					hasDragged: dragged,
				};
			});
			e.preventDefault();
		}
		// Update cursor visibility + optionally perform erase scrubbing.
		if (!(inkActive || eraserActive)) {
			if (cursor.visible) setCursor((c) => ({ ...c, visible: false }));
			if (eraserHoverId) setEraserHoverId(null);
			return;
		}

		// Update cursor position when in ink or eraser mode
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return;
		setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });

		// Update collaborative cursor position using DRY utility
		updateCursorFromEvent(e, presence.cursor, pan, zoom);

		// If erasing, update hover or scrub
		if (eraserActive && root?.inks) {
			const pLogical = toLogical(e.clientX, e.clientY);
			if (pointerIdRef.current !== null) {
				// Active drag: continuously erase
				performErase(pLogical);
				setEraserHoverId(null);
			} else {
				// Hover preview using circle radius
				const eraserScreenRadius = 12;
				const eraserLogicalRadius = eraserScreenRadius / zoom;
				const target = findInkStrokeHit(root.inks, pLogical, eraserLogicalRadius);
				setEraserHoverId(target ? target.id : null);
			}
		}
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (pointerIdRef.current !== null && e.pointerId === pointerIdRef.current) {
			pointerIdRef.current = null;
		}
	};

	const handlePointerLeave = () => setCursor((c) => ({ ...c, visible: false }));

	// During active inking we subscribe to raw pointermove on document (outside React) for performance
	// and to avoid losing events when pointer exits the SVG temporarily.
	useEffect(() => {
		if (!inking) return;
		const handleMove = (ev: PointerEvent) => {
			// Skip events from other concurrent pointers (multi-touch scenarios)
			if (pointerIdRef.current !== null && ev.pointerId !== pointerIdRef.current) return;

			// Update cursor position for collaborative cursors
			updateCursorFromEvent(ev, presence.cursor, pan, zoom);

			// Use coalesced events for smoother touch / pen input when available
			const hasCoalesced = (
				e: PointerEvent
			): e is PointerEvent & { getCoalescedEvents(): PointerEvent[] } =>
				typeof (e as PointerEvent & { getCoalescedEvents?: unknown }).getCoalescedEvents ===
				"function";
			const events = hasCoalesced(ev) ? ev.getCoalescedEvents() : [ev];
			for (const cev of events) {
				const p = toLogical(cev.clientX, cev.clientY);
				const last = lastPointRef.current;
				// Adaptive point thinning: allow denser sampling for touch (smoother curves) vs mouse/pen
				const isTouch = pointerTypeRef.current === "touch";
				const minDist2 = isTouch ? 0.5 : 4; // ~0.7px for touch vs 2px for mouse/pen
				if (last) {
					const dx = p.x - last.x;
					const dy = p.y - last.y;
					if (dx * dx + dy * dy < minDist2) continue;
				}
				lastPointRef.current = p;
				tempPointsRef.current.push(new InkPoint({ x: p.x, y: p.y, t: Date.now() }));
			}
			// Throttle presence broadcast to at most one per animation frame.
			if (!pendingRaf.current) {
				pendingRaf.current = requestAnimationFrame(() => {
					pendingRaf.current = 0;
					if (presence.ink?.state.local && strokeIdRef.current) {
						presence.ink.updateStroke(
							tempPointsRef.current.map((pt) => ({ x: pt.x, y: pt.y, t: pt.t }))
						);
					}
				});
			}
		};
		const handleUpOrCancel = (ev: PointerEvent) => {
			// Commit stroke to persistent model; clear ephemeral presence.
			if (pointerIdRef.current !== null && ev.pointerId !== pointerIdRef.current) return;
			if (!inking) return;
			setInking(false);
			pointerIdRef.current = null;
			pointerTypeRef.current = null;
			lastPointRef.current = null;
			const pts = tempPointsRef.current;
			if (pts.length < 2 || !root?.inks) {
				tempPointsRef.current = [];
				presence.ink?.clearStroke();
				return;
			}
			const smoothed = smoothAndSimplifyInkPoints(pts, smoothingOptions);
			const clonePoint = (p: InkPoint) => new InkPoint({ x: p.x, y: p.y, t: p.t, p: p.p });
			const rawPoints = pts.map(clonePoint);
			const simplifiedSource = smoothed.length >= 2 ? smoothed : pts;
			const simplifiedPoints = simplifiedSource.map(clonePoint);
			const bboxPoints = simplifiedPoints.length >= 2 ? simplifiedPoints : rawPoints;
			const simplifiedIsDifferent =
				simplifiedPoints.length !== rawPoints.length ||
				simplifiedPoints.some((p, idx) => {
					const original = rawPoints[idx];
					return (
						!original ||
						original.x !== p.x ||
						original.y !== p.y ||
						original.t !== p.t ||
						original.p !== p.p
					);
				});
			const minX = Math.min(...bboxPoints.map((p) => p.x));
			const maxX = Math.max(...bboxPoints.map((p) => p.x));
			const minY = Math.min(...bboxPoints.map((p) => p.y));
			const maxY = Math.max(...bboxPoints.map((p) => p.y));
			const stroke = new InkStroke({
				id: crypto.randomUUID(),
				points: rawPoints,
				style: new InkStyle({
					strokeColor: inkColor,
					strokeWidth: inkWidth,
					opacity: 1,
					lineCap: "round",
					lineJoin: "round",
				}),
				bbox: new InkBBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }),
				simplified:
					simplifiedIsDifferent && simplifiedPoints.length <= rawPoints.length
						? simplifiedPoints
						: undefined,
			});
			root.inks.insertAtEnd(stroke);
			tempPointsRef.current = [];
			presence.ink?.clearStroke();
			strokeIdRef.current = null;
		};
		const pendingRaf = { current: 0 as number | 0 } as { current: number | 0 };
		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUpOrCancel, { capture: true });
		document.addEventListener("pointercancel", handleUpOrCancel, { capture: true });
		return () => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUpOrCancel, { capture: true });
			document.removeEventListener("pointercancel", handleUpOrCancel, { capture: true });
		};
	}, [inking, root]);

	return (
		<div className="relative h-full w-full">
			{/* Background dots layer - HTML/CSS for consistent behavior across all platforms */}
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: `radial-gradient(circle, #6b7280 1px, transparent 1px)`,
					backgroundSize: `${48 * zoom}px ${48 * zoom}px`,
					backgroundPosition: `${pan.x}px ${pan.y}px`,
					pointerEvents: "none",
				}}
			/>

			<svg
				id="canvas"
				data-canvas-root="true"
				ref={svgRef}
				className="canvas-svg absolute inset-0 h-full w-full bg-transparent"
				style={{
					touchAction: "none",
					cursor: isPanning ? "grabbing" : undefined,
					pointerEvents: "auto",
				}}
				onClick={(e) => handleBackgroundClick(e)}
				onPointerUp={(e) => {
					if (marqueeState && e.pointerId === marqueeState.pointerId) {
						try {
							(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
						} catch {
							// Ignore release failures
						}
						finalizeMarqueeSelection(marqueeState);
						setMarqueeState(null);
						handlePointerUp(e);
						return;
					}
					// Handle tap-to-clear-selection for touch events (equivalent to onClick for mouse)
					if (e.pointerType === "touch") {
						const target = e.target as Element | null;

						// Check if this is on an item or a resize/rotate handle
						const isOnItem =
							target?.closest("[data-item-id]") ||
							target?.closest("[data-svg-item-id]");
						const isOnHandle =
							target?.closest("[data-resize-handle]") ||
							target?.closest("[data-rotate-handle]");

						// Check if we're currently or recently manipulating something
						// This prevents clearing selection when touch events bubble up from manipulation operations
						const isManipulating = !!document.documentElement.dataset.manipulating;
						const hasResizeState = !!presence.resize.state?.local;
						const hasDragState = !!presence.drag.state.local;

						// Only clear selection if tapping on background AND not during/after manipulation
						if (
							!isOnItem &&
							!isOnHandle &&
							!isManipulating &&
							!hasResizeState &&
							!hasDragState
						) {
							// For touch events, respect suppressClearUntil flag like mouse events do
							const svg = svgRef.current as
								| (SVGSVGElement & { dataset: DOMStringMap })
								| null;
							const until = svg?.dataset?.suppressClearUntil
								? parseInt(svg.dataset.suppressClearUntil)
								: 0;
							if (until && Date.now() < until) {
								if (svg) delete svg.dataset.suppressClearUntil;
								return;
							}
							presence.itemSelection?.clearSelection();
						}
					}
					handlePointerUp(e);
				}}
				onPointerDown={(e) => {
					// Check if something is already being manipulated
					if (document.documentElement.dataset.manipulating) {
						return;
					}

					// Check if this is a handle interaction - if so, don't interfere
					const target = e.target as Element | null;
					const isHandle = target?.closest("[data-resize-handle], [data-rotate-handle]");
					const isOnItem =
						target?.closest("[data-item-id]") || target?.closest("[data-svg-item-id]");
					const isInteractive = isCanvasInteractiveTarget(target);
					if (isHandle) {
						// Let the handle component deal with this event
						return;
					}

					// For touch events, check if we're touching an item first
					if (e.pointerType === "touch") {
						// Only allow panning if not on an item and not in ink/eraser mode
						if (!isOnItem && !isInteractive && !(inkActive || eraserActive)) {
							beginPanIfBackground(e);
						}
					} else {
						// For non-touch (mouse), use original logic
						if (!isInteractive && !(inkActive || eraserActive)) beginPanIfBackground(e);
					}

					if (
						!inkActive &&
						!eraserActive &&
						e.button === 0 &&
						e.pointerType !== "touch" &&
						!isOnItem &&
						!isInteractive &&
						!marqueeState &&
						!presence.drag.state.local &&
						!presence.resize.state?.local
					) {
						const origin = toLogical(e.clientX, e.clientY);
						const baselineIds =
							presence.itemSelection?.getLocalSelection()?.map((sel) => sel.id) ?? [];
						const additive = e.shiftKey || e.ctrlKey || e.metaKey;
						const subtractive = !additive && e.altKey;
						setMarqueeState({
							pointerId: e.pointerId,
							origin,
							current: origin,
							additive,
							subtractive,
							baselineIds,
							hasDragged: false,
						});
						try {
							(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
						} catch {
							// Ignore pointer capture failures (e.g., Safari without capture support)
						}
						return;
					}

					// Manage three mutually exclusive interactions: inking, erasing, panning(right mouse handled upstream).
					if (inkActive || eraserActive) {
						const rect = svgRef.current?.getBoundingClientRect();
						if (rect)
							setCursor({
								x: e.clientX - rect.left,
								y: e.clientY - rect.top,
								visible: true,
							});
					}
					pointerTypeRef.current = e.pointerType;

					// Eraser mode: on pointer down start erase interaction instead of drawing
					if (eraserActive) {
						if (e.button !== 0) return;
						// Clear selection when starting to erase (same as mouse click behavior)
						presence.itemSelection?.clearSelection();
						pointerIdRef.current = e.pointerId; // track drag for scrubbing
						performErase(toLogical(e.clientX, e.clientY));
						return; // don't start ink
					}

					if (!inkActive) return; // only when ink tool active
					if (e.button !== 0) return; // left only

					// Ignore if clicked on an item or existing selectable element
					if (target?.closest("[data-item-id]")) return;
					if (target?.closest("[data-svg-item-id]")) return;

					// Clear selection when starting to ink on background (same as mouse click behavior)
					presence.itemSelection?.clearSelection();

					// Start inking
					const p = toLogical(e.clientX, e.clientY);
					pointerIdRef.current = e.pointerId;
					setInking(true);
					tempPointsRef.current = [new InkPoint({ x: p.x, y: p.y, t: Date.now() })];
					lastPointRef.current = p;
					strokeIdRef.current = crypto.randomUUID();
					// Broadcast initial presence stroke (ephemeral only, not yet committed)
					presence.ink?.setStroke({
						id: strokeIdRef.current,
						points: tempPointsRef.current.map((pt) => ({ x: pt.x, y: pt.y, t: pt.t })),
						color: inkColor,
						width: inkWidth,
						opacity: 1,
						startTime: Date.now(),
					});
					e.preventDefault();
				}}
				onPointerMove={handlePointerMove}
				onPointerLeave={handlePointerLeave}
				onPointerCancel={(e) => {
					if (marqueeState && e.pointerId === marqueeState.pointerId) {
						try {
							(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
						} catch {
							// ignore
						}
						setMarqueeState(null);
					}
					handlePointerUp(e);
				}}
				onContextMenu={(e) => {
					// Always suppress default context menu on canvas
					e.preventDefault();
				}}
			>
				{/* SVG filter definitions */}
				<defs>
					<filter id="inkShadow" x="-40%" y="-40%" width="180%" height="180%">
						<feDropShadow dx="3" dy="3" stdDeviation="10" floodOpacity="0.25" />
					</filter>
				</defs>

				{/* Full-size HTML layer hosting existing item views */}
				<foreignObject x={0} y={0} width="100%" height="100%">
					{/* Full-size wrapper to capture background drags anywhere inside the foreignObject */}
					<div
						className="relative h-full w-full"
						onMouseDown={handleHtmlBackgroundMouseDown}
						onContextMenu={(e) => {
							e.preventDefault();
						}}
						onDragOver={(e) => {
							e.preventDefault();
							e.dataTransfer.dropEffect = "move";
						}}
						style={{
							userSelect: "none",
							position: "relative",
						}}
					>
						<ItemsHtmlLayer
							items={flattenedItems}
							canvasPosition={canvasPosition}
							pan={pan}
							zoom={zoom}
							inkActive={inkActive}
							eraserActive={eraserActive}
						/>
						{/* Overlay to block item interactions when in ink/eraser mode */}
						{(inkActive || eraserActive) && (
							<div
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: "100%",
									pointerEvents: "auto",
									cursor: "none", // Hide default cursor, we show custom cursor in SVG
									zIndex: 9999,
								}}
								// Don't add any event handlers - just block items below from receiving events
								// Events will fall through to the SVG layer for inking/erasing
							/>
						)}
					</div>
				</foreignObject>
				{/* Ink rendering layer - positioned after items for consistent layering */}
				<InkLayer
					strokes={inksIterable}
					zoom={zoom}
					pan={pan}
					eraserActive={eraserActive}
					eraserHoverId={eraserHoverId}
					isDrawing={inking}
					localPoints={tempPointsRef.current}
					inkColor={inkColor}
					inkWidth={inkWidth}
					remoteStrokes={presence.ink?.getRemoteStrokes() ?? []}
				/>
				{/* Group overlays - render group visual bounds */}
				<g
					transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
					style={{ pointerEvents: "none" }}
					data-layer="group-overlays"
				>
					<GroupOverlay items={Array.from(items)} layout={layout} zoom={zoom} pan={pan} />
				</g>
				{/* Per-item SVG wrappers (overlay), built from measured layout */}
				<g
					key={`sel-${selKey}-${motionKey}-${layoutVersion}`}
					transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
					style={{ pointerEvents: "auto", touchAction: "none" }}
					data-layer="selection-overlays"
				>
					{flattenedItems
						.filter((flatItem) => !flatItem.isGroupContainer)
						.map((flatItem) => {
							const isSelected = presence.itemSelection?.testSelection({
								id: flatItem.item.id,
							});
							if (!isSelected) return null; // only draw selection overlays for selected items
							return (
								<SelectionOverlay
									key={`wrap-${flatItem.item.id}`}
									item={flatItem.item}
									layout={layout}
									presence={presence}
									zoom={zoom}
								/>
							);
						})}
				</g>
				{/* Connection overlays - render connection points and lines (after selection so they're on top) */}
				<g
					transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
					style={{ pointerEvents: "auto" }}
					data-layer="connection-overlays"
				>
					<ConnectionOverlay
						items={Array.from(items)}
						layout={layout}
						zoom={zoom}
						pan={pan}
						svgRef={svgRef}
					/>
				</g>
				{marqueeRect && (
					<g
						transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
						pointerEvents="none"
						data-layer="marquee-overlay"
					>
						<rect
							x={marqueeRect.x}
							y={marqueeRect.y}
							width={Math.max(marqueeRect.width, 0.001)}
							height={Math.max(marqueeRect.height, 0.001)}
							fill="rgba(37, 99, 235, 0.12)"
							stroke="#2563eb"
							strokeWidth={1}
							strokeDasharray="8 4"
							vectorEffect="non-scaling-stroke"
						/>
					</g>
				)}
				{/* Presence indicators overlay for all items with remote selections */}
				<g
					key={`presence-${selKey}-${motionKey}-${layoutVersion}`}
					transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
					style={{ pointerEvents: "auto", touchAction: "none" }}
					data-layer="presence-overlays"
				>
					{flattenedItems
						.filter((flatItem) => !flatItem.isGroupContainer)
						.map((flatItem) => {
							const remoteIds =
								presence.itemSelection?.testRemoteSelection({
									id: flatItem.item.id,
								}) ?? [];
							if (!remoteIds.length) return null;
							const isExpanded = expandedPresence.has(flatItem.item.id);
							const toggleExpanded = (e: React.MouseEvent) => {
								e.stopPropagation();
								setExpandedPresence((prev) => {
									const next = new Set(prev);
									if (next.has(flatItem.item.id)) next.delete(flatItem.item.id);
									else next.add(flatItem.item.id);
									return next;
								});
							};
							return (
								<PresenceOverlay
									key={`presence-${flatItem.item.id}`}
									item={flatItem.item}
									layout={layout}
									presence={presence}
									remoteIds={remoteIds}
									zoom={zoom}
									getInitials={getInitials}
									getUserColor={getUserColor}
									expanded={isExpanded}
									onToggleExpanded={toggleExpanded}
								/>
							);
						})}
				</g>
				{/* Comment indicators (zoom-invariant) */}
				<g
					key={`comments-${selKey}-${motionKey}-${layoutVersion}`}
					transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
					style={{ pointerEvents: "auto", touchAction: "none" }}
					data-layer="comment-overlays"
				>
					{flattenedItems
						.filter((flatItem) => !flatItem.isGroupContainer)
						.map((flatItem) => {
							const isSelected =
								presence.itemSelection?.testSelection({ id: flatItem.item.id }) ??
								false;
							return (
								<CommentOverlay
									key={`comment-${flatItem.item.id}`}
									item={flatItem.item}
									layout={layout}
									zoom={zoom}
									commentPaneVisible={commentPaneVisible}
									selected={isSelected}
									presence={presence}
								/>
							);
						})}
				</g>
				{/* Screen-space cursor overlay */}
				{cursor.visible && (inkActive || eraserActive) && (
					<g pointerEvents="none">
						{(() => {
							// For ink: radius is half of actual stroke width in screen space.
							// stroke width rendered is zoom * inkWidth (but we clamp min visually earlier when drawing ephemeral lines)
							const screenStrokeWidth = inkWidth * zoom;
							const r = eraserActive ? 12 : Math.max(2, screenStrokeWidth / 2);
							const stroke = eraserActive ? "#dc2626" : inkColor;
							const fill = eraserActive ? "rgba(220,38,38,0.08)" : `${inkColor}22`; // light tint
							return (
								<circle
									cx={cursor.x}
									cy={cursor.y}
									r={r}
									fill={fill}
									stroke={stroke}
									strokeDasharray={eraserActive ? "4 3" : undefined}
									strokeWidth={1}
								/>
							);
						})()}
					</g>
				)}
			</svg>

			{/* Collaborative cursor overlay - rendered at screen coordinates */}
			{presence.cursor && (
				<CursorOverlay
					cursorManager={presence.cursor}
					canvasPosition={svgRef.current?.getBoundingClientRect() || { left: 0, top: 0 }}
					pan={pan}
					zoom={zoom}
					getInitials={getInitials}
					getUserColor={getUserColor}
					presence={presence}
				/>
			)}
		</div>
	);
}
