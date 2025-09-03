/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useEffect, useRef, useState } from "react";
import { Items, Item, FluidTable, Shape } from "../schema/app_schema.js";
import { IFluidContainer } from "fluid-framework";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { ItemView } from "./itemux.js";
import { useTree } from "./hooks/useTree.js";
import { LayoutContext } from "./hooks/useLayoutManger.js";
import { Tree } from "fluid-framework";

export function Canvas(props: {
	items: Items;
	container: IFluidContainer;
	setSize: (width: number, height: number) => void;
}): JSX.Element {
	const { items, setSize } = props;
	const presence = useContext(PresenceContext);
	useTree(items);
	const layout = useContext(LayoutContext);

	const svgRef = useRef<SVGSVGElement>(null);
	const [canvasPosition, setCanvasPosition] = React.useState({ left: 0, top: 0 });
	const [selKey, setSelKey] = React.useState(0);
	const [motionKey, setMotionKey] = React.useState(0);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const lastPos = useRef<{ x: number; y: number } | null>(null);
	const movedRef = useRef(false);
	const [zoom, setZoom] = useState(1);
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
			"#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#6366f1","#f43f5e","#06b6d4","#14b8a6","#a855f7","#0ea5e9",
		];
		let hash = 0;
		for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
		return colors[Math.abs(hash) % colors.length];
	};

	// Non-passive wheel listener for zoom
	useEffect(() => {
		const el = svgRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			// Always zoom on wheel over canvas
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
			const zoomFactor = Math.exp(-e.deltaY * 0.0015);
			const newZoom = Math.min(4, Math.max(0.25, (zoomRef.current ?? 1) * zoomFactor));
			if (newZoom === (zoomRef.current ?? 1)) return;
			const panNow = panRef.current ?? { x: 0, y: 0 };
			const p = { x: (mouse.x - panNow.x) / (zoomRef.current ?? 1), y: (mouse.y - panNow.y) / (zoomRef.current ?? 1) };
			const newPan = { x: mouse.x - newZoom * p.x, y: mouse.y - newZoom * p.y };
			setPan(newPan);
			setZoom(newZoom);
		};
		// Track latest values without re-binding listener each render
		const zoomRef = { current: zoom } as { current: number };
		const panRef = { current: pan } as { current: { x: number; y: number } };
		const updateRefs = () => {
			zoomRef.current = zoom;
			panRef.current = pan;
		};
		updateRefs();
		const raf = requestAnimationFrame(updateRefs);
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			cancelAnimationFrame(raf);
			el.removeEventListener('wheel', onWheel as EventListener);
		};
	}, [svgRef.current, pan, zoom]);

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
			props.setSize(width, height);
			setCanvasPosition({ left, top });
		}
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const handleBackgroundClick = () => {
		const svg = svgRef.current as (SVGSVGElement & { dataset: DOMStringMap }) | null;
		const until = svg?.dataset?.suppressClearUntil ? parseInt(svg.dataset.suppressClearUntil) : 0;
		if (until && Date.now() < until) {
			// Skip clearing once after interaction; then clear the flag
			if (svg) delete svg.dataset.suppressClearUntil;
			return;
		}
		presence.itemSelection?.clearSelection();
	};

	const beginPanIfBackground = (e: React.MouseEvent) => {
		// Don't pan if we are dragging/resizing/rotating an item
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as Element | null;
		// Ignore clicks on SVG overlays for items
		const onOverlay = !!target?.closest('[data-svg-item-id]');
		if (onOverlay) return;
		// Ignore clicks that started within an item in the HTML layer
		const insideItem = !!target?.closest('[data-item-id]');
		if (insideItem) return;
		// Start panning when clicking anywhere on the SVG backdrop
		setIsPanning(true);
		lastPos.current = { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
		movedRef.current = false;
	};

	// Also allow panning by dragging the empty HTML background inside foreignObject
	const handleHtmlBackgroundMouseDown = (e: React.MouseEvent) => {
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as HTMLElement;
		// If click is inside any item container or a control, don't pan
		if (target.closest('[data-item-id]')) return;
		setIsPanning(true);
		lastPos.current = { x: e.clientX, y: e.clientY };
		movedRef.current = false;
	};

	useEffect(() => {
		if (!isPanning) return;
		const onMove = (ev: MouseEvent) => {
			if (!lastPos.current) return;
			const dx = ev.clientX - lastPos.current.x;
			const dy = ev.clientY - lastPos.current.y;
			// Use a small threshold to distinguish click vs drag
			if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
				setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
				lastPos.current = { x: ev.clientX, y: ev.clientY };
				movedRef.current = true;
			}
		};
		const onUp = () => {
			setIsPanning(false);
			lastPos.current = null;
			// Clear global panning flag
			const rootEl = document.documentElement as HTMLElement & { dataset: DOMStringMap };
			if (rootEl.dataset) {
				delete rootEl.dataset.panning;
			}
			// Suppress a stray background click only if a real pan occurred
			if (movedRef.current) {
				const svg = svgRef.current as (SVGSVGElement & { dataset: DOMStringMap }) | null;
				if (svg) svg.dataset.suppressClearUntil = String(Date.now() + 150);
			}
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		return () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
	}, [isPanning]);

	useEffect(() => {
		// Reflect panning state globally so other components can react
		if (isPanning) {
			const rootEl = document.documentElement as HTMLElement & { dataset: DOMStringMap };
			rootEl.dataset.panning = '1';
			return () => {
				if (rootEl.dataset) delete rootEl.dataset.panning;
			};
		}
	}, [isPanning]);

	// Rerender when selection changes so overlays update
	useEffect(() => {
		const offLocal = presence.itemSelection.events.on("localUpdated", () => setSelKey((t) => (t+1)%1000));
		const offRemote = presence.itemSelection.events.on("remoteUpdated", () => setSelKey((t) => (t+1)%1000));
		return () => { offLocal(); offRemote(); };
	}, [presence.itemSelection]);

	// Rerender overlays while dragging/rotating/resizing so positions track live
	useEffect(() => {
		const offDragLocal = presence.drag.events.on("localUpdated", () => setMotionKey((t) => (t+1)%1000));
		const offDragRemote = presence.drag.events.on("remoteUpdated", () => setMotionKey((t) => (t+1)%1000));
		const offResizeLocal = presence.resize.events.on("localUpdated", () => setMotionKey((t) => (t+1)%1000));
		const offResizeRemote = presence.resize.events.on("remoteUpdated", () => setMotionKey((t) => (t+1)%1000));
		return () => { offDragLocal(); offDragRemote(); offResizeLocal(); offResizeRemote(); };
	}, [presence.drag, presence.resize]);

	// Single source of truth for live drag/rotate state (local or remote) for an item
	const getActiveDragForItem = (itemId: string): { id: string; x: number; y: number; rotation: number } | null => {
		const local = presence.drag?.state?.local as { id: string; x: number; y: number; rotation: number } | null;
		if (local && local.id === itemId) return local;
		const remotesIter = (presence.drag?.state as unknown as { getRemotes?: () => unknown })?.getRemotes?.();
		const isIterable = (obj: unknown): obj is Iterable<unknown> => {
			return !!obj && typeof (obj as { [k: symbol]: unknown })[Symbol.iterator] === "function";
		};
		const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
		if (isIterable(remotesIter)) {
			for (const cv of remotesIter) {
				let connected = true;
				if (isRecord(cv) && "attendee" in cv && isRecord((cv as Record<string, unknown>)["attendee"])) {
					const att = (cv as Record<string, unknown>)["attendee"] as Record<string, unknown>;
					let status: unknown = "Connected";
					if (typeof att["getConnectionStatus"] === "function") {
						// Call with correct "this" to avoid undefined context inside implementation
						status = (att["getConnectionStatus"] as (this: unknown) => unknown).call(att);
					}
					connected = status === "Connected";
				}
				if (!connected) continue;
				const val = isRecord(cv) ? (cv["value"] as unknown) : undefined;
				if (isRecord(val) && typeof val["id"] === "string") {
					const id = val["id"] as string;
					if (id === itemId) {
						const x = typeof val["x"] === "number" ? (val["x"] as number) : 0;
						const y = typeof val["y"] === "number" ? (val["y"] as number) : 0;
						const rotation = typeof val["rotation"] === "number" ? (val["rotation"] as number) : 0;
						return { id, x, y, rotation };
					}
				}
			}
		}
		return null;
	};

	return (
	<svg
			id="canvas"
			ref={svgRef}
			className="relative flex h-full w-full bg-transparent"
			onClick={handleBackgroundClick}
			onMouseDown={beginPanIfBackground}
		>
			{/* Full-size HTML layer hosting existing item views */}
			<foreignObject x={0} y={0} width="100%" height="100%">
				{/* Full-size wrapper to capture background drags anywhere inside the foreignObject */}
				<div className="relative h-full w-full" onMouseDown={handleHtmlBackgroundMouseDown}
					onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
					style={{ userSelect: "none" }}>
					{/* Pan/zoomed content container */}
					<div className="relative h-full w-full" style={{ left: `${pan.x}px`, top: `${pan.y}px`, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
						{items.map((item, index) =>
							item instanceof Item ? (
								<ItemView
									item={item}
									key={item.id}
									index={index}
									canvasPosition={{ left: canvasPosition.left, top: canvasPosition.top }}
									hideSelectionControls
									pan={pan}
									zoom={zoom}
								/>
							) : (
								<></>
							)
						)}
					</div>
				</div>
			</foreignObject>
			{/* Per-item SVG wrappers (overlay), built from measured layout */}
			<g key={`sel-${selKey}-${motionKey}`} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
				{items.map((item) => {
					if (!(item instanceof Item)) return null;
					const isSelected = presence.itemSelection?.testSelection({ id: item.id });
					if (!isSelected) return null; // only draw selection overlays for selected items
					const b = layout.get(item.id);
					// Fallback sizing if layout is missing or zero-sized
					const left = b?.left ?? item.x;
					const top = b?.top ?? item.y;
					let w = b ? Math.max(0, b.right - b.left) : 0;
					let h = b ? Math.max(0, b.bottom - b.top) : 0;
					if (w === 0 || h === 0) {
						const container = document.querySelector(`[data-item-id='${item.id}']`) as HTMLElement | null;
						if (container) {
							const rect = container.getBoundingClientRect();
							// Convert from screen-space to model by dividing by zoom
							w = rect.width / (zoom || 1);
							h = rect.height / (zoom || 1);
						}
						// If we still don't have valid size, skip rendering this overlay
						if (w === 0 || h === 0) return null;
					}
					const padding = 8;
					// Use live rotation during drag/rotate from unified active drag; tables shouldn't rotate
					const active = getActiveDragForItem(item.id);
					let angle = active ? active.rotation : item.rotation;
					const isTable = Tree.is(item.content, FluidTable);
					const isShape = Tree.is(item.content, Shape);
					if (isTable) angle = 0;
					return (
						<g key={`wrap-${item.id}`} data-svg-item-id={item.id} transform={`translate(${left}, ${top}) rotate(${angle}, ${w/2}, ${h/2})`}>
							{/* selection box (rotates with the item) */}
							<g pointerEvents="none">
								<rect x={-padding} y={-padding} width={w + padding * 2} height={h + padding * 2} fill="none" stroke="#000" strokeDasharray="6 4" strokeWidth={2} opacity={0.9} />
							</g>
								{/* rotation handle above center (not for tables) */}
								{!isTable && (
									<g transform={`translate(${w/2}, ${-35})`}>
										<circle r={6} fill="#000" cursor="grab"
											onClick={(e)=>{ e.stopPropagation(); }}
											onMouseDown={(e)=>{
												e.stopPropagation();
												// Forward to the underlying HTML rotate handle for logic
												const container = document.querySelector(`[data-item-id='${item.id}']`) as HTMLElement | null;
												const rotateHandle = container?.querySelector('.cursor-grab') as HTMLElement | null;
												const target = rotateHandle ?? container;
												if (target) {
													const evt = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY });
													target.dispatchEvent(evt);
												}
											}}
										/>
									</g>
								)}
								{/* corner resize handles for shapes only, mirror HTML locations but offset outward */}
								<g>
									{(() => {
										if (!isShape) return null; // only shapes get resize handles
										const handleSize = 8;
										const half = handleSize / 2;
										const outward = padding + 2; // move slightly inward toward center by 2px
										const positions = [
											{ x: -outward, y: -outward, cursor: 'nwse-resize' as const }, // top-left
											{ x: w + outward, y: -outward, cursor: 'nesw-resize' as const }, // top-right
											{ x: -outward, y: h + outward, cursor: 'nesw-resize' as const }, // bottom-left
											{ x: w + outward, y: h + outward, cursor: 'nwse-resize' as const }, // bottom-right
										];
										return positions.map((pos, i) => (
											<rect
												key={i}
												x={pos.x - half}
												y={pos.y - half}
												width={handleSize}
												height={handleSize}
												fill="#000"
												stroke="none"
												cursor={pos.cursor}
												onClick={(e) => {
													e.stopPropagation();
												}}
												onMouseDown={(e) => {
													e.stopPropagation();
													// Forward to the corresponding HTML resize handle (by index/order)
													const container = document.querySelector(`[data-item-id='${item.id}']`) as HTMLElement | null;
													const handles = Array.from(container?.querySelectorAll('.cursor-nw-resize') ?? []) as HTMLElement[];
													const handle = handles[i] ?? container;
													if (handle) {
														const evt = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY });
														handle.dispatchEvent(evt);
													}
												}}
											/>
										));
									})()}
								</g>
						</g>
					);
				})}
			</g>
			{/* Presence indicators overlay for all items with remote selections */}
			<g key={`presence-${selKey}-${motionKey}`} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
				{items.map((item) => {
					if (!(item instanceof Item)) return null;
					const remoteIds = presence.itemSelection?.testRemoteSelection({ id: item.id }) ?? [];
					if (!remoteIds.length) return null;
					const b = layout.get(item.id);
					if (!b) return null;
					const w = Math.max(0, b.right - b.left);
					const h = Math.max(0, b.bottom - b.top);
					// Use live rotation during drag/rotate from unified active drag; tables shouldn't rotate
					const active = getActiveDragForItem(item.id);
					let angle = active ? active.rotation : item.rotation;
					if (Tree.is(item.content, FluidTable)) angle = 0;
					const connected = (presence.users.getConnectedUsers?.() ?? []) as unknown as ReadonlyArray<{ value: { name: string; id: string; image?: string }; client: { attendeeId: string } }>;
					const users = connected.filter((u) => remoteIds.includes(u.client.attendeeId));
					const isExpanded = expandedPresence.has(item.id);
					const toggleExpanded = (e: React.MouseEvent) => {
						e.stopPropagation();
						setExpandedPresence((prev) => {
							const next = new Set(prev);
							if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
							return next;
						});
					};
					return (
						<g key={`presence-${item.id}`} transform={`translate(${b.left}, ${b.top}) rotate(${angle}, ${w/2}, ${h/2})`} data-svg-item-id={item.id}>
							{users.length === 1 ? (
								<g transform={`translate(${w - 12}, ${-12})`} onMouseDown={(e)=>e.stopPropagation()}>
									<circle r={12} fill={getUserColor(users[0].client.attendeeId)} stroke="#fff" strokeWidth={2} />
									<text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#fff">{getInitials(users[0].value.name)}</text>
								</g>
							) : (
								<g onMouseDown={(e)=>e.stopPropagation()}>
									{!isExpanded ? (
										<g transform={`translate(${w - 12}, ${-12})`} cursor="pointer" onClick={toggleExpanded}>
											<circle r={12} fill="#000" stroke="#fff" strokeWidth={2} />
											<text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#fff">{users.length}</text>
										</g>
									) : (
										<g>
											{users.map((user: { value: { name: string }; client: { attendeeId: string } }, idx: number) => (
												<g key={user.client.attendeeId} transform={`translate(${w - 12 - idx * 26}, ${-12})`}>
													<circle r={12} fill={getUserColor(user.client.attendeeId)} stroke="#fff" strokeWidth={2} />
													<text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#fff">{getInitials(user.value.name)}</text>
												</g>
											))}
											<g transform={`translate(${w - 12 - users.length * 26 - 14}, ${-12})`} cursor="pointer" onClick={toggleExpanded}>
												<circle r={12} fill="#4b5563" stroke="#fff" strokeWidth={2} />
												<text x={0} y={4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">×</text>
											</g>
										</g>
									)}
							</g>
						)}
					</g>
					);
				})}
			</g>
		</svg>
	);
}
