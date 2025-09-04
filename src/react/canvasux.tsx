/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useRef, useState, useEffect } from "react";
import { Items, Item, InkStroke, InkPoint, InkStyle, InkBBox, App } from "../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { IFluidContainer } from "fluid-framework";
import { PresenceContext } from "./contexts/PresenceContext.js";
// ItemView moved into ItemsHtmlLayer
import { useTree } from "./hooks/useTree.js";
import { LayoutContext } from "./hooks/useLayoutManger.js";
import { SelectionOverlay } from "./overlays/SelectionOverlay.js";
import { PresenceOverlay } from "./overlays/PresenceOverlay.js";
import { CommentOverlay } from "./overlays/CommentOverlay.js";
import { useCanvasNavigation } from "./hooks/useCanvasNavigation.js";
import { useOverlayRerenders } from "./hooks/useOverlayRerenders.js";
import { ItemsHtmlLayer } from "./ItemsHtmlLayer.js";
import { PaneContext } from "./contexts/PaneContext.js";

export function Canvas(props: {
	items: Items;
	container: IFluidContainer;
	setSize: (width: number, height: number) => void;
	zoom?: number;
	onZoomChange?: (z: number) => void;
	onPanChange?: (p: { x: number; y: number }) => void;
	inkActive?: boolean;
}): JSX.Element {
	const { items, setSize, zoom: externalZoom, onZoomChange, onPanChange, inkActive } = props;
	const presence = useContext(PresenceContext);
	useTree(items);
	const layout = useContext(LayoutContext);

	const svgRef = useRef<SVGSVGElement>(null);
	// Freehand ink capture (with ephemeral presence broadcasting)
	const [inking, setInking] = useState(false);
	const tempPointsRef = useRef<InkPoint[]>([]);
	const pointerIdRef = useRef<number | null>(null);
	const lastPointRef = useRef<{ x: number; y: number } | null>(null);
	const strokeIdRef = useRef<string | null>(null);
	const {
		canvasPosition,
		pan,
		zoom,
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

	// Helpers for presence indicator visuals
	const getInitials = (name: string): string => {
		if (!name) return "?";
		const words = name.trim().split(/\s+/);
		return words.length === 1
			? words[0].charAt(0).toUpperCase()
			: (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
	};

	const getUserColor = (userId: string): string => {
		const colors = [
			"#3b82f6",
			"#ef4444",
			"#10b981",
			"#f59e0b",
			"#8b5cf6",
			"#06b6d4",
			"#f97316",
			"#84cc16",
			"#ec4899",
			"#6366f1",
			"#f43f5e",
			"#06b6d4",
			"#14b8a6",
			"#a855f7",
			"#0ea5e9",
		];
		let hash = 0;
		for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
		return colors[Math.abs(hash) % colors.length];
	};

	const paneContext = useContext(PaneContext);

	// Layout version to trigger overlay re-renders when intrinsic sizes change (e.g., table growth)
	const [layoutVersion, setLayoutVersion] = useState(0);
	useEffect(() => {
		const handler = () => setLayoutVersion((v) => v + 1);
		window.addEventListener("layout-changed", handler);
		return () => window.removeEventListener("layout-changed", handler);
	}, []);

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
	const inksNode = root?.inks;
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

	// Convert screen coords to logical (content) coords
	const toLogical = (clientX: number, clientY: number): { x: number; y: number } => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		const sx = clientX - rect.left;
		const sy = clientY - rect.top;
		return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
	};

	// Begin inking on left button background press (not on items)
	const handlePointerDown = (e: React.PointerEvent) => {
		if (!inkActive) return; // only when ink tool active
		if (e.button !== 0) return; // left only
		// Ignore if clicked on an item or existing selectable element
		const target = e.target as Element | null;
		if (target?.closest("[data-item-id]")) return;
		if (target?.closest("[data-svg-item-id]")) return;
		// Start inking
		const p = toLogical(e.clientX, e.clientY);
		pointerIdRef.current = e.pointerId;
		setInking(true);
		tempPointsRef.current = [new InkPoint({ x: p.x, y: p.y, t: Date.now() })];
		lastPointRef.current = p;
		strokeIdRef.current = crypto.randomUUID();
		// Broadcast initial presence stroke
		presence.ink?.setStroke({
			id: strokeIdRef.current,
			points: tempPointsRef.current.map((pt) => ({ x: pt.x, y: pt.y, t: pt.t })),
			color: "#2563eb",
			width: 4,
			opacity: 1,
			startTime: Date.now(),
		});
		e.preventDefault();
	};

	// Add move listener while inking
	useEffect(() => {
		if (!inking) return;
		const handleMove = (ev: PointerEvent) => {
			if (pointerIdRef.current !== null && ev.pointerId !== pointerIdRef.current) return;
			const p = toLogical(ev.clientX, ev.clientY);
			const last = lastPointRef.current;
			// Simple distance filter to reduce point count
			if (last) {
				const dx = p.x - last.x;
				const dy = p.y - last.y;
				if (dx * dx + dy * dy < 4) return; // min ~2px movement
			}
			lastPointRef.current = p;
			tempPointsRef.current.push(new InkPoint({ x: p.x, y: p.y, t: Date.now() }));
			// Throttle via requestAnimationFrame
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
			if (pointerIdRef.current !== null && ev.pointerId !== pointerIdRef.current) return;
			if (!inking) return;
			setInking(false);
			pointerIdRef.current = null;
			lastPointRef.current = null;
			const pts = tempPointsRef.current;
			if (pts.length < 2 || !root?.inks) {
				tempPointsRef.current = [];
				presence.ink?.clearStroke();
				return;
			}
			const minX = Math.min(...pts.map((p) => p.x));
			const maxX = Math.max(...pts.map((p) => p.x));
			const minY = Math.min(...pts.map((p) => p.y));
			const maxY = Math.max(...pts.map((p) => p.y));
			const stroke = new InkStroke({
				id: crypto.randomUUID(),
				points: pts.slice(),
				style: new InkStyle({
					strokeColor: "#2563eb",
					strokeWidth: 4,
					opacity: 1,
					lineCap: "round",
					lineJoin: "round",
				}),
				bbox: new InkBBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }),
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
		<svg
			id="canvas"
			ref={svgRef}
			className="relative flex h-full w-full bg-transparent"
			onClick={handleBackgroundClick}
			onMouseDown={beginPanIfBackground}
			onPointerDown={handlePointerDown}
			onContextMenu={(e) => {
				// Always suppress default context menu on canvas
				e.preventDefault();
			}}
		>
			{/* Light dot grid background that pans and zooms with content */}
			<defs>
				<pattern
					id="dot-grid-pattern"
					patternUnits="userSpaceOnUse"
					width={48}
					height={48}
					patternTransform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
				>
					{/* Keep dot screen size constant: radius scales inverse to zoom with a minimum for visibility */}
					<circle cx={24} cy={24} r={1 / zoom} fill="#9ca3af" />
				</pattern>
			</defs>
			<rect
				x={0}
				y={0}
				width="100%"
				height="100%"
				fill="url(#dot-grid-pattern)"
				pointerEvents="none"
			/>
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
					style={{ userSelect: "none" }}
				>
					<ItemsHtmlLayer
						items={items}
						canvasPosition={canvasPosition}
						pan={pan}
						zoom={zoom}
					/>
				</div>
			</foreignObject>
			{/* Per-item SVG wrappers (overlay), built from measured layout */}
			<g
				key={`sel-${selKey}-${motionKey}-${layoutVersion}`}
				transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
			>
				{items.map((item) => {
					if (!(item instanceof Item)) return null;
					const isSelected = presence.itemSelection?.testSelection({ id: item.id });
					if (!isSelected) return null; // only draw selection overlays for selected items
					return (
						<SelectionOverlay
							key={`wrap-${item.id}`}
							item={item}
							layout={layout}
							presence={presence}
							zoom={zoom}
						/>
					);
				})}
			</g>
			{/* Presence indicators overlay for all items with remote selections */}
			<g
				key={`presence-${selKey}-${motionKey}-${layoutVersion}`}
				transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
			>
				{items.map((item) => {
					if (!(item instanceof Item)) return null;
					const remoteIds =
						presence.itemSelection?.testRemoteSelection({ id: item.id }) ?? [];
					if (!remoteIds.length) return null;
					const isExpanded = expandedPresence.has(item.id);
					const toggleExpanded = (e: React.MouseEvent) => {
						e.stopPropagation();
						setExpandedPresence((prev) => {
							const next = new Set(prev);
							if (next.has(item.id)) next.delete(item.id);
							else next.add(item.id);
							return next;
						});
					};
					return (
						<PresenceOverlay
							key={`presence-${item.id}`}
							item={item}
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
			>
				{items.map((item) => {
					if (!(item instanceof Item)) return null;
					const isSelected =
						presence.itemSelection?.testSelection({ id: item.id }) ?? false;
					return (
						<CommentOverlay
							key={`comment-${item.id}`}
							item={item}
							layout={layout}
							zoom={zoom}
							commentPaneVisible={commentPaneVisible}
							selected={isSelected}
							presence={presence}
						/>
					);
				})}
			</g>
			{/* Ink rendering layer (placed last for top z-order) */}
			<g
				transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
				pointerEvents="none"
				data-layer="ink"
			>
				{Array.from(inksIterable).map((s: InkStroke) => {
					const pts = Array.from(s.simplified ?? s.points) as InkPoint[];
					if (!pts.length) return null;
					// Dynamic width: style width represents thickness at 100% (zoom=1). Scale with zoom; clamp to min 0.5px.
					const base = s.style?.strokeWidth ?? 4;
					const w = Math.max(0.5, base * zoom);
					return (
						<g key={s.id}>
							<polyline
								fill="none"
								stroke={s.style?.strokeColor ?? "#000"}
								strokeWidth={w}
								strokeOpacity={s.style?.opacity ?? 1}
								strokeLinecap={"round"}
								strokeLinejoin={"round"}
								vectorEffect="non-scaling-stroke"
								points={pts.map((p: InkPoint) => `${p.x},${p.y}`).join(" ")}
							/>
							{/* (debug visuals removed) */}
						</g>
					);
				})}
				{/* Remote ephemeral strokes */}
				{presence.ink?.getRemoteStrokes().map((r) => {
					const pts = r.stroke.points;
					if (!pts.length) return null;
					const w = Math.max(0.5, r.stroke.width * zoom);
					return (
						<polyline
							key={`ephemeral-${r.attendeeId}`}
							fill="none"
							stroke={r.stroke.color}
							strokeWidth={w}
							strokeOpacity={0.4}
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
							points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
						/>
					);
				})}
				{/* Local ephemeral (if drawing) so we see it before commit */}
				{inking && tempPointsRef.current.length > 0 && (
					<polyline
						key="local-ephemeral"
						fill="none"
						stroke="#2563eb"
						strokeWidth={Math.max(0.5, 4 * zoom)}
						strokeOpacity={0.7}
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
						points={tempPointsRef.current.map((p) => `${p.x},${p.y}`).join(" ")}
					/>
				)}
			</g>
		</svg>
	);
}
