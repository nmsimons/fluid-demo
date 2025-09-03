/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useEffect, useRef, useState } from "react";
import { Items, Item, FluidTable } from "../schema/app_schema.js";
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
		// Start only when the user clicks directly on the SVG background
		if (e.target === svgRef.current) {
			setIsPanning(true);
			lastPos.current = { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
			(e as React.MouseEvent).preventDefault();
		}
	};

	// Also allow panning by dragging the empty HTML background inside foreignObject
	const handleHtmlBackgroundMouseDown = (e: React.MouseEvent) => {
		if (presence.drag.state.local || presence.resize.state?.local) return;
		const target = e.target as HTMLElement;
		// If click is inside any item container, don't pan
		if (target.closest('[data-item-id]')) return;
		setIsPanning(true);
		lastPos.current = { x: e.clientX, y: e.clientY };
		e.preventDefault();
	};

	useEffect(() => {
		if (!isPanning) return;
		const onMove = (ev: MouseEvent) => {
			if (!lastPos.current) return;
			const dx = ev.clientX - lastPos.current.x;
			const dy = ev.clientY - lastPos.current.y;
			if (dx !== 0 || dy !== 0) {
				setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
				lastPos.current = { x: ev.clientX, y: ev.clientY };
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
			// Suppress a stray background click immediately after pan
			const svg = svgRef.current as (SVGSVGElement & { dataset: DOMStringMap }) | null;
			if (svg) svg.dataset.suppressClearUntil = String(Date.now() + 150);
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

	return (
	<svg
			id="canvas"
			ref={svgRef}
			className="relative flex h-full w-full bg-transparent overflow-auto"
			onClick={handleBackgroundClick}
			onMouseDown={beginPanIfBackground}
		>
			{/* Full-size HTML layer hosting existing item views */}
			<foreignObject x={0} y={0} width="100%" height="100%">
				<div
					className="relative h-full w-full"
					onDragOver={(e) => {
						e.preventDefault();
						e.dataTransfer.dropEffect = "move";
					}}
					// Avoid accidental text selection during drags
					style={{ userSelect: "none", left: `${pan.x}px`, top: `${pan.y}px` }}
					onMouseDown={handleHtmlBackgroundMouseDown}
				>
					{items.map((item, index) =>
						item instanceof Item ? (
							<ItemView
								item={item}
								key={item.id}
								index={index}
								canvasPosition={{ left: canvasPosition.left, top: canvasPosition.top }}
								hideSelectionControls
								pan={pan}
							/>
						) : (
							<></>
						)
					)}
				</div>
			</foreignObject>
			{/* Per-item SVG wrappers (overlay), built from measured layout */}
			<g key={`sel-${selKey}-${motionKey}`} transform={`translate(${pan.x}, ${pan.y})`}>
				{items.map((item) => {
					if (!(item instanceof Item)) return null;
					const isSelected = presence.itemSelection?.testSelection({ id: item.id });
					if (!isSelected) return null; // only draw overlays for selected items
					const b = layout.get(item.id);
					if (!b) return null;
					const w = Math.max(0, b.right - b.left);
					const h = Math.max(0, b.bottom - b.top);
					const padding = 8;
					// Use live rotation during drag/rotate; tables shouldn't rotate
					const localDrag = presence.drag?.state?.local;
					let angle = localDrag && localDrag.id === item.id ? localDrag.rotation : item.rotation;
					if (Tree.is(item.content, FluidTable)) angle = 0;
					return (
						<g key={`wrap-${item.id}`} transform={`translate(${b.left}, ${b.top}) rotate(${angle}, ${w/2}, ${h/2})`}>
							{/* selection box */}
							<g pointerEvents="none">
								<rect x={-padding} y={-padding} width={w + padding * 2} height={h + padding * 2} fill="none" stroke="#000" strokeDasharray="6 4" strokeWidth={2} opacity={0.9} />
							</g>
							{/* rotation handle above center */}
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
							{/* corner resize handles for shapes only, mirror HTML locations but offset outward */}
							<g>
								{(() => {
									const isTable = Tree.is(item.content, FluidTable);
									if (isTable) return null; // no resize handles for tables
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
		</svg>
	);
}
