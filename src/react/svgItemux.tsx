import React, { useContext, useEffect, useState } from "react";
import { FluidTable, Item, Note, Shape } from "../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { useTree } from "./hooks/useTree.js";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { SvgViewportContext } from "./svgCanvas.js";
import { ResizePackage } from "../utils/presence/Interfaces/ResizeManager.js";
import { DragAndRotatePackage } from "../utils/presence/drag.js";
import { NoteView } from "./noteux.js";
import { TableView } from "./tableux.js";

export function SvgItemView(props: { item: Item }): JSX.Element {
	const { item } = props;
	useTree(item);
	const presence = useContext(PresenceContext);
	const { scale } = useContext(SvgViewportContext);
	const [selected, setSelected] = useState(presence.itemSelection.testSelection({ id: item.id }));
	const [remoteSelected, setRemoteSelected] = useState<string[]>(
		presence.itemSelection.testRemoteSelection({ id: item.id })
	);

	useEffect(() => {
		const offLocal = presence.itemSelection.events.on("localUpdated", () => {
			setSelected(presence.itemSelection.testSelection({ id: item.id }));
			setRemoteSelected(presence.itemSelection.testRemoteSelection({ id: item.id }));
		});
		const offRemote = presence.itemSelection.events.on("remoteUpdated", () => {
			setRemoteSelected(presence.itemSelection.testRemoteSelection({ id: item.id }));
		});
		return () => {
			offLocal();
			offRemote();
		};
	}, [presence.itemSelection, item.id]);

	const rotation = Tree.is(item.content, FluidTable) ? 0 : item.rotation;
	// Displayed state (mirrors original behavior: presence drives visuals; commit on end)
	const [dispX, setDispX] = useState(item.x);
	const [dispY, setDispY] = useState(item.y);
	const [dispSize, setDispSize] = useState(
		Tree.is(item.content, Shape) ? item.content.size : undefined
	);
	const [dispRotation, setDispRotation] = useState(rotation);

	// Sync displayed with model when not actively dragged/resized
	useEffect(() => {
		setDispX(item.x);
		setDispY(item.y);
		if (Tree.is(item.content, Shape)) setDispSize(item.content.size);
		setDispRotation(Tree.is(item.content, FluidTable) ? 0 : item.rotation);
	}, [item.x, item.y, item.content]);

	const getBounds = (): { w: number; h: number } => {
		if (Tree.is(item.content, Shape)) {
			const s = dispSize ?? item.content.size;
			return { w: s, h: s };
		} else if (Tree.is(item.content, Note) || Tree.is(item.content, FluidTable)) {
			return { w: 200, h: 200 };
		}
		return { w: 0, h: 0 };
	};

	const { w, h } = getBounds();

	const handleMouseDown: React.MouseEventHandler<SVGGElement> = (e) => {
		// Prevent panning on canvas and background clearing
		e.stopPropagation();
		if (e.ctrlKey || e.metaKey) {
			// match previous: ctrl/cmd toggles selection
			presence.itemSelection.toggleSelection({ id: item.id });
		} else {
			presence.itemSelection.setSelection({ id: item.id });
		}
	};

	// Dragging (move) — click+drag anywhere on item body (except handles)
	const dragRef = React.useRef<{
		startX: number;
		startY: number;
		origX: number;
		origY: number;
	} | null>(null);
	const onBodyMouseDown: React.MouseEventHandler<SVGGElement> = (e) => {
		e.stopPropagation();
		// selection behavior on drag start
		if (e.ctrlKey || e.metaKey) {
			presence.itemSelection.toggleSelection({ id: item.id });
		} else {
			presence.itemSelection.setSelection({ id: item.id });
		}
		dragRef.current = { startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
		// Set local dragging presence
		const pkg: DragAndRotatePackage = {
			id: item.id,
			x: item.x,
			y: item.y,
			rotation: rotation,
			branch: presence.branch,
		};
		presence.drag.setDragging(pkg);
		window.addEventListener("mousemove", onBodyMouseMove);
		window.addEventListener("mouseup", onBodyMouseUp);
	};
	const onBodyMouseMove = (e: MouseEvent) => {
		if (!dragRef.current) return;
		const dx = e.clientX - dragRef.current.startX;
		const dy = e.clientY - dragRef.current.startY;
		const newX = dragRef.current.origX + dx / scale;
		const newY = dragRef.current.origY + dy / scale;
		presence.drag.setDragging({
			id: item.id,
			x: newX,
			y: newY,
			rotation,
			branch: presence.branch,
		});
		// Visual only; commit on mouse up
		setDispX(newX);
		setDispY(newY);
	};
	const onBodyMouseUp = () => {
		dragRef.current = null;
		presence.drag.clearDragging();
		// Commit model
		Tree.runTransaction(item, () => {
			item.x = dispX;
			item.y = dispY;
		});
		window.removeEventListener("mousemove", onBodyMouseMove);
		window.removeEventListener("mouseup", onBodyMouseUp);
	};

	// Resize handle (bottom-right) for Shape only
	const resizeRef = React.useRef<{
		startX: number;
		startY: number;
		origSize: number;
		origX: number;
		origY: number;
	} | null>(null);
	const handleSize = 10 / scale;
	const onResizeMouseDown: React.MouseEventHandler<SVGRectElement> = (e) => {
		if (!Tree.is(item.content, Shape)) return; // only shapes for now
		e.stopPropagation();
		resizeRef.current = {
			startX: e.clientX,
			startY: e.clientY,
			origSize: item.content.size,
			origX: item.x,
			origY: item.y,
		};
		const pkg: ResizePackage = { id: item.id, x: item.x, y: item.y, size: item.content.size };
		presence.resize.setResizing(pkg);
		window.addEventListener("mousemove", onResizeMouseMove);
		window.addEventListener("mouseup", onResizeMouseUp);
	};
	const onResizeMouseMove = (e: MouseEvent) => {
		if (!resizeRef.current || !Tree.is(item.content, Shape)) return;
		const dx = (e.clientX - resizeRef.current.startX) / scale;
		const newSize = Math.max(10, resizeRef.current.origSize + dx);
		// Update presence and model
		presence.resize.setResizing({ id: item.id, x: item.x, y: item.y, size: newSize });
		setDispSize(newSize);
	};
	const onResizeMouseUp = () => {
		resizeRef.current = null;
		presence.resize.clearResizing();
		// Commit size
		if (Tree.is(item.content, Shape) && dispSize !== undefined) {
			const shape = item.content as Shape;
			Tree.runTransaction(shape, () => {
				shape.size = dispSize!;
			});
		}
		window.removeEventListener("mousemove", onResizeMouseMove);
		window.removeEventListener("mouseup", onResizeMouseUp);
	};

	return (
		<g
			transform={`translate(${dispX},${dispY}) rotate(${dispRotation}, ${w / 2}, ${h / 2})`}
			onMouseDown={handleMouseDown}
		>
			{/* Selection highlight */}
			{selected ? (
				<rect
					x={-2}
					y={-2}
					width={w + 4}
					height={h + 4}
					fill="none"
					stroke="#111"
					strokeDasharray="4 2"
					strokeWidth={1.5}
				/>
			) : null}
			{/* Content */}
			<g onMouseDown={onBodyMouseDown}>
				<SvgContent item={item} onStartPointer={onBodyMouseDown} />
			</g>
			{/* Remote selection glow */}
			{remoteSelected.length > 0 && !selected ? (
				<rect
					x={0}
					y={0}
					width={w}
					height={h}
					fill="none"
					stroke="#60a5fa"
					strokeOpacity={0.6}
					strokeWidth={2}
				/>
			) : null}
			{/* Resize handle */}
			{Tree.is(item.content, Shape) ? (
				<rect
					x={w - handleSize}
					y={h - handleSize}
					width={handleSize}
					height={handleSize}
					fill="#fff"
					stroke="#111"
					onMouseDown={onResizeMouseDown}
				/>
			) : null}
			{/* Rotation handle for non-table items */}
			{!Tree.is(item.content, FluidTable) ? (
				<circle
					cx={w / 2}
					cy={-20 / scale}
					r={8 / scale}
					fill="#111"
					onMouseDown={(e) => {
						e.stopPropagation();
						const onMove = (ev: MouseEvent) => {
							const bbox = (
								e.currentTarget as SVGCircleElement
							).ownerSVGElement?.getBoundingClientRect();
							// Fallback center based on dispX/dispY with transform scale
							const centerX = dispX * scale + (bbox ? 0 : 0) + (w / 2) * scale;
							const centerY = dispY * scale + (bbox ? 0 : 0) + (h / 2) * scale;
							// Compute angle using screen coords
							const dx = ev.clientX - centerX;
							const dy = ev.clientY - centerY;
							let ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // align with top anchor
							ang = ((ang % 360) + 360) % 360;
							setDispRotation(ang);
							presence.drag.setDragging({
								id: item.id,
								x: dispX,
								y: dispY,
								rotation: ang,
								branch: presence.branch,
							});
						};
						const onUp = () => {
							window.removeEventListener("mousemove", onMove);
							window.removeEventListener("mouseup", onUp);
							// Commit rotation
							Tree.runTransaction(item, () => {
								if (!Tree.is(item.content, FluidTable)) {
									item.rotation = dispRotation;
								}
							});
							presence.drag.clearDragging();
						};
						window.addEventListener("mousemove", onMove);
						window.addEventListener("mouseup", onUp);
					}}
				/>
			) : null}
		</g>
	);
}

function SvgContent(props: { item: Item; onStartPointer?: React.MouseEventHandler }): JSX.Element {
	const { item, onStartPointer } = props;
	useTree(item.content);
	if (Tree.is(item.content, Shape)) {
		return <SvgShape shape={item.content} />;
	} else if (Tree.is(item.content, Note)) {
		return <SvgNote note={item.content} onStartPointer={onStartPointer} />;
	} else if (Tree.is(item.content, FluidTable)) {
		return <SvgTable table={item.content} onStartPointer={onStartPointer} />;
	}
	return <g />;
}

function SvgShape(props: { shape: Shape }): JSX.Element {
	const { shape } = props;
	useTree(shape);
	const size = shape.size;
	const color = shape.color;
	switch (shape.type) {
		case "circle":
			return (
				<circle
					r={size / 2}
					cx={size / 2}
					cy={size / 2}
					fill={color}
					filter="url(#shadow)"
				/>
			);
		case "square":
			return <rect width={size} height={size} fill={color} filter="url(#shadow)" />;
		case "triangle":
			return (
				<polygon
					points={`${size / 2},0 0,${size} ${size},${size}`}
					fill={color}
					filter="url(#shadow)"
				/>
			);
		case "star":
			return (
				<g filter="url(#shadow)">
					<polygon
						points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
						fill={color}
						transform={`scale(${shape.size / 24})`}
					/>
				</g>
			);
		default:
			return <g />;
	}
}

function SvgNote(props: { note: Note; onStartPointer?: React.MouseEventHandler }): JSX.Element {
	const { note, onStartPointer } = props;
	useTree(note);
	const width = 200;
	const height = 200;
	return (
		<foreignObject
			width={width}
			height={height}
			requiredExtensions="http://www.w3.org/1999/xhtml"
			onMouseDown={(e) => {
				// prevent canvas panning; start drag if not interacting with inputs
				e.stopPropagation();
				const t = e.target as HTMLElement;
				if (t && t.closest('textarea, input, [contenteditable="true"]')) return;
				onStartPointer?.(e);
			}}
		>
			<div style={{ width: "100%", height: "100%" }}>
				<NoteView note={note} />
			</div>
		</foreignObject>
	);
}

function SvgTable(props: {
	table: FluidTable;
	onStartPointer?: React.MouseEventHandler;
}): JSX.Element {
	const { table, onStartPointer } = props;
	useTree(table);
	const w = 200,
		h = 200;
	return (
		<foreignObject
			width={w}
			height={h}
			requiredExtensions="http://www.w3.org/1999/xhtml"
			onMouseDown={(e) => {
				e.stopPropagation();
				const t = e.target as HTMLElement;
				if (t && t.closest('textarea, input, [contenteditable="true"]')) return;
				onStartPointer?.(e);
			}}
		>
			<div style={{ width: "100%", height: "100%" }}>
				<TableView fluidTable={table} />
			</div>
		</foreignObject>
	);
}
