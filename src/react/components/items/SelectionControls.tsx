import React, { useContext, useEffect, useRef, useState } from "react";
import { Tree } from "fluid-framework";
import { Group, Item, TextBlock } from "../../../schema/appSchema.js";
import { clampShapeSize } from "../../../constants/shape.js";
import { clampTextWidth } from "../../../utils/text.js";
import {
	getShapeDimensions as getShapeDimensionsFromShape,
	getShapeSize,
	isRectangleShape,
	setShapeDimensions,
	setShapeSize,
} from "../../../utils/shapeUtils.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { useTree } from "../../hooks/useTree.js";
import { getContentHandler, isShape } from "../../../utils/contentHandlers.js";
import { isGroupGridEnabled } from "../../layout/groupGrid.js";

export function TextResizeHandles({
	item,
	padding,
	onResizeEnd,
	zoom,
	groupOffsetX = 0,
	groupOffsetY = 0,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
	zoom?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
}): JSX.Element | null {
	if (!Tree.is(item.content, TextBlock)) return null;
	const text = item.content;
	useTree(text);
	const presence = useContext(PresenceContext);
	const [activeHandle, setActiveHandle] = useState<"left" | "right" | null>(null);
	const scale = zoom ?? 1;
	const startRef = useRef({
		width: text.width,
		pointerX: 0,
		absX: item.x + groupOffsetX,
		absY: item.y + groupOffsetY,
	});

	const beginResize = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setActiveHandle("right");
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* unsupported */
		}
		const absX = item.x + groupOffsetX;
		const absY = item.y + groupOffsetY;
		startRef.current = {
			width: text.width,
			pointerX: e.clientX,
			absX,
			absY,
		};
		presence.resize.setResizing({ id: item.id, x: absX, y: absY, size: text.width });
		document.documentElement.dataset.manipulating = "1";
		const move = (ev: PointerEvent) => {
			const deltaPx = ev.clientX - startRef.current.pointerX;
			const delta = deltaPx / scale;
			const width = clampTextWidth(startRef.current.width + delta);
			presence.resize.setResizing({
				id: item.id,
				x: startRef.current.absX,
				y: startRef.current.absY,
				size: width,
			});
		};
		const up = () => {
			setActiveHandle(null);
			document.removeEventListener("pointermove", move);
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			delete document.documentElement.dataset.manipulating;
			const r = presence.resize.state.local;
			if (r && r.id === item.id) {
				Tree.runTransaction(item, () => {
					text.width = clampTextWidth(r.size);
					item.x = r.x - groupOffsetX;
					item.y = r.y - groupOffsetY;
				});
			}
			presence.resize.clearResizing();
			onResizeEnd?.();
			const canvasEl = document.getElementById("canvas") as
				| (SVGSVGElement & { dataset: DOMStringMap })
				| null;
			if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up, { once: true });
	};

	const offset = (activeHandle === "right" ? 10 : 8) * scale;
	const wrapperSize = 120 * scale;
	const handleSize = (activeHandle === "right" ? 30 : 26) * scale;

	return (
		<div
			style={{
				position: "absolute",
				top: -padding - offset,
				marginTop: -wrapperSize / 2,
				right: -padding - offset,
				marginRight: -wrapperSize / 2,
				width: wrapperSize,
				height: wrapperSize,
				pointerEvents: "auto",
				touchAction: "none",
				cursor: "nesw-resize",
				zIndex: 1000,
			}}
			onPointerDown={beginResize}
			data-resize-handle
			data-text-resize-handle="right"
			className="text-resize-handle text-resize-handle-right"
		>
			<div
				style={{
					position: "absolute",
					width: handleSize,
					height: handleSize,
					borderRadius: 9999,
					background: "#0f172a",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					boxShadow: "0 4px 12px rgba(15, 23, 42, 0.35)",
					border: "2px solid #f8fafc",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
}

export function SelectionBox({
	selected,
	item,
	onResizeEnd,
	visualHidden,
	zoom,
	absoluteX,
	absoluteY,
	groupOffsetX = 0,
	groupOffsetY = 0,
	parentGroup,
}: {
	selected: boolean;
	item: Item;
	onResizeEnd?: () => void;
	visualHidden?: boolean;
	zoom?: number;
	absoluteX?: number;
	absoluteY?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
	parentGroup?: Group;
}): JSX.Element {
	useTree(item);
	const pad = 8;
	return (
		<>
			<div style={{ display: selected ? (visualHidden ? "none" : "block") : "none" }}>
				<SelectionControls
					item={item}
					padding={pad}
					onResizeEnd={onResizeEnd}
					zoom={zoom}
					absoluteX={absoluteX}
					absoluteY={absoluteY}
					groupOffsetX={groupOffsetX}
					groupOffsetY={groupOffsetY}
					parentGroup={parentGroup}
				/>
			</div>
			<div
				className={`absolute border-3 border-dashed border-black bg-transparent ${selected && !visualHidden ? "" : " hidden"}`}
				style={{
					left: -pad,
					top: -pad,
					width: `calc(100% + ${pad * 2}px)`,
					height: `calc(100% + ${pad * 2}px)`,
					zIndex: 1000,
					pointerEvents: "none",
				}}
			/>
		</>
	);
}

export function SelectionControls({
	item,
	padding,
	onResizeEnd,
	zoom,
	absoluteX,
	absoluteY,
	groupOffsetX = 0,
	groupOffsetY = 0,
	parentGroup,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
	zoom?: number;
	absoluteX?: number;
	absoluteY?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
	parentGroup?: Group;
}): JSX.Element | null {
	useTree(item);
	const handler = getContentHandler(item);
	const allowRotate = handler.canRotate();
	const isInGridView = isGroupGridEnabled(parentGroup);

	if (isInGridView) {
		return null;
	}

	return (
		<>
			{allowRotate && (
				<RotateHandle item={item} zoom={zoom} absoluteX={absoluteX} absoluteY={absoluteY} />
			)}
			{handler.type === "shape" && (
				<CornerResizeHandles
					item={item}
					padding={padding}
					onResizeEnd={onResizeEnd}
					zoom={zoom}
					groupOffsetX={groupOffsetX}
					groupOffsetY={groupOffsetY}
				/>
			)}
			{handler.type === "text" && (
				<TextResizeHandles
					item={item}
					padding={padding}
					onResizeEnd={onResizeEnd}
					zoom={zoom}
					groupOffsetX={groupOffsetX}
					groupOffsetY={groupOffsetY}
				/>
			)}
		</>
	);
}

export function RotateHandle({
	item,
	zoom,
	absoluteX,
	absoluteY,
}: {
	item: Item;
	zoom?: number;
	absoluteX?: number;
	absoluteY?: number;
}): JSX.Element {
	const presence = useContext(PresenceContext);
	useTree(item);
	const [active, setActive] = useState(false);
	const itemRef = useRef(item);
	useEffect(() => {
		itemRef.current = item;
	}, [item]);
	const scale = zoom ?? 1;
	const displayX = absoluteX ?? item.x;
	const displayY = absoluteY ?? item.y;
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setActive(true);
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* unsupported */
		}
		const currentItem = itemRef.current;
		presence.drag.setDragging({
			id: currentItem.id,
			x: displayX,
			y: displayY,
			rotation: currentItem.rotation,
			branch: presence.branch,
		});
		document.documentElement.dataset.manipulating = "1";
		const el = document.querySelector(
			`[data-item-id="${currentItem.id}"]`
		) as HTMLElement | null;
		if (!el) return;
		const move = (ev: PointerEvent) => {
			const r = el.getBoundingClientRect();
			const c =
				document.getElementById("canvas")?.getBoundingClientRect() ||
				({ left: 0, top: 0 } as DOMRect);
			const cx = (r.left + r.right) / 2 - c.left;
			const cy = (r.top + r.bottom) / 2 - c.top;
			const mx = ev.clientX - c.left;
			const my = ev.clientY - c.top;
			let deg = (Math.atan2(my - cy, mx - cx) * 180) / Math.PI + 90;
			deg %= 360;
			if (deg < 0) deg += 360;
			presence.drag.setDragging({
				id: currentItem.id,
				x: displayX,
				y: displayY,
				rotation: deg,
				branch: presence.branch,
			});
		};
		const up = () => {
			setActive(false);
			document.removeEventListener("pointermove", move);
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			delete document.documentElement.dataset.manipulating;
			const st = presence.drag.state.local;
			if (st) {
				Tree.runTransaction(currentItem, () => {
					currentItem.rotation = st.rotation;
				});
				presence.drag.clearDragging();
				const canvasEl = document.getElementById("canvas") as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
			}
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up, { once: true });
	};
	const baseSize = active ? 22 : 18;
	const baseTouchSize = 44;
	const size = baseSize * scale;
	const touchSize = baseTouchSize * scale;
	const handleOffset = 80 * scale;
	const handleHeight = 160 * scale;
	return (
		<div
			className="absolute flex flex-row w-full justify-center items-center"
			style={{ top: -handleOffset, height: handleHeight, pointerEvents: "auto" }}
			onPointerDown={onPointerDown}
			data-rotate-handle
		>
			<div
				style={{
					width: touchSize,
					height: touchSize,
					position: "absolute",
					top: handleOffset - touchSize / 2,
					left: "50%",
					transform: "translateX(-50%)",
					backgroundColor: "transparent",
				}}
			/>
			<div
				className="bg-black shadow-lg z-[9998] cursor-grab"
				style={{
					width: size,
					height: size,
					borderRadius: "50%",
					position: "absolute",
					top: handleOffset - size / 2,
					left: "50%",
					transform: "translateX(-50%)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
}

export function CornerResizeHandles({
	item,
	padding,
	onResizeEnd,
	zoom,
	groupOffsetX = 0,
	groupOffsetY = 0,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
	zoom?: number;
	groupOffsetX?: number;
	groupOffsetY?: number;
}): JSX.Element {
	const handler = getContentHandler(item);
	if (!handler.canResize() || !isShape(item)) return <></>;
	const shape = item.content;
	useTree(shape);
	const presence = useContext(PresenceContext);
	const [resizing, setResizing] = useState(false);
	const scale = zoom ?? 1;
	const initSize = useRef(getShapeSize(shape));
	const initDimensions = useRef<{ width: number; height: number }>(
		getShapeDimensionsFromShape(shape)
	);
	const centerModel = useRef({ x: 0, y: 0 });
	const centerScreen = useRef({ x: 0, y: 0 });
	const initDist = useRef(0);
	const initVec = useRef({ dx: 0, dy: 0 });

	const getAbsolutePosition = () => {
		const absX = item.x + groupOffsetX;
		const absY = item.y + groupOffsetY;
		return { absX, absY };
	};
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setResizing(true);
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* unsupported */
		}
		const { absX, absY } = getAbsolutePosition();
		const currentDimensions = getShapeDimensionsFromShape(shape);
		initDimensions.current = currentDimensions;
		initSize.current = getShapeSize(shape);
		presence.resize.setResizing({
			id: item.id,
			x: absX,
			y: absY,
			size: initSize.current,
			width: isRectangleShape(shape) ? currentDimensions.width : undefined,
			height: isRectangleShape(shape) ? currentDimensions.height : undefined,
		});
		document.documentElement.dataset.manipulating = "1";
		centerModel.current = {
			x: absX + currentDimensions.width / 2,
			y: absY + currentDimensions.height / 2,
		};
		let el: HTMLElement | null = e.currentTarget.parentElement;
		while (el && !el.getAttribute("data-item-id")) el = el.parentElement;
		if (el) {
			const r = el.getBoundingClientRect();
			centerScreen.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}
		initVec.current = {
			dx: e.clientX - centerScreen.current.x,
			dy: e.clientY - centerScreen.current.y,
		};
		initDist.current = Math.sqrt(initVec.current.dx ** 2 + initVec.current.dy ** 2);
		const move = (ev: PointerEvent) => {
			const dx = ev.clientX - centerScreen.current.x;
			const dy = ev.clientY - centerScreen.current.y;
			if (isRectangleShape(shape)) {
				const rotationDeg = item.rotation ?? 0;
				const theta = (rotationDeg * Math.PI) / 180;
				const cos = Math.cos(theta);
				const sin = Math.sin(theta);
				const initLocalX = initVec.current.dx * cos + initVec.current.dy * sin;
				const initLocalY = -initVec.current.dx * sin + initVec.current.dy * cos;
				const currentLocalX = dx * cos + dy * sin;
				const currentLocalY = -dx * sin + dy * cos;
				const safeInitWidth = Math.abs(initLocalX) > 0 ? Math.abs(initLocalX) : 1;
				const safeInitHeight = Math.abs(initLocalY) > 0 ? Math.abs(initLocalY) : 1;
				const widthRatio = Math.max(0.1, Math.abs(currentLocalX) / safeInitWidth);
				const heightRatio = Math.max(0.1, Math.abs(currentLocalY) / safeInitHeight);
				const newWidth = clampShapeSize(initDimensions.current.width * widthRatio);
				const newHeight = clampShapeSize(initDimensions.current.height * heightRatio);
				const newX = centerModel.current.x - newWidth / 2;
				const newY = centerModel.current.y - newHeight / 2;
				const newSize = Math.max(newWidth, newHeight);
				presence.resize.setResizing({
					id: item.id,
					x: newX,
					y: newY,
					size: newSize,
					width: newWidth,
					height: newHeight,
				});
				return;
			}
			const dot = dx * initVec.current.dx + dy * initVec.current.dy;
			const initMagSq = initVec.current.dx ** 2 + initVec.current.dy ** 2;
			const proj = dot / Math.sqrt(initMagSq || 1);
			const ratio = Math.max(0.1, proj / initDist.current);
			const desired = initSize.current * ratio;
			const newSize = clampShapeSize(desired);
			const scaleFactor = initSize.current > 0 ? newSize / initSize.current : 1;
			const scaledWidth = initDimensions.current.width * scaleFactor;
			const scaledHeight = initDimensions.current.height * scaleFactor;
			const newX = centerModel.current.x - scaledWidth / 2;
			const newY = centerModel.current.y - scaledHeight / 2;
			presence.resize.setResizing({ id: item.id, x: newX, y: newY, size: newSize });
		};
		const up = () => {
			setResizing(false);
			document.removeEventListener("pointermove", move);
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			delete document.documentElement.dataset.manipulating;
			const r = presence.resize.state.local;
			if (r && r.id === item.id) {
				Tree.runTransaction(item, () => {
					if (
						isRectangleShape(shape) &&
						r.width !== undefined &&
						r.height !== undefined
					) {
						setShapeDimensions(shape, { width: r.width, height: r.height });
					} else {
						setShapeSize(shape, r.size);
					}
					item.x = r.x - groupOffsetX;
					item.y = r.y - groupOffsetY;
				});
			}
			presence.resize.clearResizing();
			onResizeEnd?.();
			const canvasEl = document.getElementById("canvas") as
				| (SVGSVGElement & { dataset: DOMStringMap })
				| null;
			if (canvasEl) canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up, { once: true });
	};
	const pos = (p: string) => {
		const baseOffset = resizing ? 10 : 8;
		const o = baseOffset * scale;
		switch (p) {
			case "top-left":
				return { left: -padding - o, top: -padding - o };
			case "top-right":
				return { right: -padding - o, top: -padding - o };
			case "bottom-left":
				return { left: -padding - o, bottom: -padding - o };
			case "bottom-right":
				return { right: -padding - o, bottom: -padding - o };
			default:
				return {};
		}
	};
	const Handle = ({ position }: { position: string }) => {
		const zone = pos(position);
		const baseWrap = 120;
		const WRAP = baseWrap * scale;
		const wrapStyle: React.CSSProperties = {
			position: "absolute",
			width: WRAP,
			height: WRAP,
			pointerEvents: "auto",
			touchAction: "none",
			...zone,
		};
		const baseHandleSize = resizing ? 30 : 26;
		const handleSize = baseHandleSize * scale;
		const adjust = (v: number) => v - (WRAP - handleSize) / 2;
		if (Object.prototype.hasOwnProperty.call(zone, "left"))
			wrapStyle.left = adjust((zone as Record<string, number>).left);
		if (Object.prototype.hasOwnProperty.call(zone, "right"))
			wrapStyle.right = adjust((zone as Record<string, number>).right);
		if (Object.prototype.hasOwnProperty.call(zone, "top"))
			wrapStyle.top = adjust((zone as Record<string, number>).top);
		if (Object.prototype.hasOwnProperty.call(zone, "bottom"))
			wrapStyle.bottom = adjust((zone as Record<string, number>).bottom);
		return (
			<div data-resize-handle style={wrapStyle} onPointerDown={onPointerDown}>
				<div
					className="absolute bg-black cursor-nw-resize hover:bg-black shadow-lg z-[9998]"
					style={{
						width: handleSize,
						height: handleSize,
						borderRadius: 6,
						pointerEvents: "none",
						[position.includes("right") ? "right" : "left"]: 0,
						[position.includes("bottom") ? "bottom" : "top"]: 0,
					}}
				/>
			</div>
		);
	};
	return (
		<>
			<Handle position="top-left" />
			<Handle position="top-right" />
			<Handle position="bottom-left" />
			<Handle position="bottom-right" />
		</>
	);
}
