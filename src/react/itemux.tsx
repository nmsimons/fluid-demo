import React, { useContext, useEffect, useRef, useState } from "react";
import { clampShapeSize } from "../constants/shape.js";
import { Tree } from "fluid-framework";
import { FluidTable, Item, Note, Shape } from "../schema/app_schema.js";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { useTree, objectIdNumber } from "./hooks/useTree.js";
import { ShapeView } from "./shapeux.js";
import { NoteView } from "./noteux.js";
import { TableView } from "./tableux.js";
import { usePresenceManager } from "./hooks/usePresenceManger.js";
import { PresenceManager } from "../utils/presence/Interfaces/PresenceManager.js";
import { DragAndRotatePackage } from "../utils/presence/drag.js";
import { ResizePackage } from "../utils/presence/Interfaces/ResizeManager.js";
import { LayoutContext } from "./hooks/useLayoutManger.js";
import { ChevronLeft16Filled } from "@fluentui/react-icons";

// ============================================================================
// Helpers
// ============================================================================
const USER_COLORS = [
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
	"#14b8a6",
	"#a855f7",
	"#0ea5e9",
];
const userColor = (id: string) => {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
	return USER_COLORS[Math.abs(h) % USER_COLORS.length];
};
const initials = (n: string) => {
	if (!n) return "?";
	const p = n.trim().split(/\s+/);
	return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};
const itemType = (item: Item) =>
	Tree.is(item.content, Shape)
		? "shape"
		: Tree.is(item.content, Note)
			? "note"
			: Tree.is(item.content, FluidTable)
				? "table"
				: "unknown";

export const calculateCanvasMouseCoordinates = (
	e: { clientX: number; clientY: number },
	pan?: { x: number; y: number },
	zoom = 1
) => {
	const c = document.getElementById("canvas");
	const r = c?.getBoundingClientRect() || ({ left: 0, top: 0 } as DOMRect);
	const sx = e.clientX - r.left;
	const sy = e.clientY - r.top;
	return { x: (sx - (pan?.x ?? 0)) / zoom, y: (sy - (pan?.y ?? 0)) / zoom };
};
export const calculateOffsetFromCanvasOrigin = (
	e: { clientX: number; clientY: number },
	item: Item,
	pan?: { x: number; y: number },
	zoom = 1
) => {
	const c = calculateCanvasMouseCoordinates(e, pan, zoom);
	return { x: c.x - item.x, y: c.y - item.y };
};
export {
	calculateCanvasMouseCoordinates as canvasCoords,
	calculateOffsetFromCanvasOrigin as dragOffset,
};

// ============================================================================
// Content dispatcher
// ============================================================================
export function ContentElement({
	item,
	shapeProps,
}: {
	item: Item;
	shapeProps?: { sizeOverride?: number };
}) {
	useTree(item.content);
	if (Tree.is(item.content, Shape))
		return (
			<ShapeView
				key={objectIdNumber(item.content)}
				shape={item.content}
				sizeOverride={shapeProps?.sizeOverride}
			/>
		);
	if (Tree.is(item.content, Note))
		return <NoteView key={objectIdNumber(item.content)} note={item.content} />;
	if (Tree.is(item.content, FluidTable))
		return <TableView key={objectIdNumber(item.content)} fluidTable={item.content} />;
	return <></>;
}

// ============================================================================
// ItemView – unified pointer drag / rotate / resize via presence
// ============================================================================
export function ItemView(props: {
	item: Item;
	index: number;
	canvasPosition: { left: number; top: number };
	hideSelectionControls?: boolean;
	pan?: { x: number; y: number };
	zoom?: number;
}) {
	const { item, index, hideSelectionControls } = props;
	useTree(item);
	const presence = useContext(PresenceContext);
	const layout = useContext(LayoutContext);
	const [selected, setSelected] = useState(presence.itemSelection.testSelection({ id: item.id }));
	const [shapeProps, setShapeProps] = useState<{ sizeOverride?: number }>({});
	const dragRef = useRef<{ pointerId: number; moved: boolean } | null>(null);
	const offset = useRef({ x: 0, y: 0 });
	const intrinsic = useRef({ w: 0, h: 0 });
	const [view, setView] = useState({
		left: item.x,
		top: item.y,
		zIndex: index,
		transform: `rotate(${item.rotation}deg)`,
	});

	useEffect(() => {
		setView((v) => ({
			...v,
			left: item.x,
			top: item.y,
			zIndex: index,
			transform: itemType(item) === "table" ? "rotate(0)" : `rotate(${item.rotation}deg)`,
		}));
	}, [item.x, item.y, item.rotation, index]);

	// Presence listeners
	const applyDrag = (d: DragAndRotatePackage) => {
		if (!d || d.id !== item.id) return;
		setView((v) => ({
			...v,
			left: d.x,
			top: d.y,
			transform: itemType(item) === "table" ? "rotate(0)" : `rotate(${d.rotation}deg)`,
		}));
		const w =
			intrinsic.current.w ||
			(Tree.is(item.content, Shape) ? (shapeProps.sizeOverride ?? item.content.size) : 0);
		const h =
			intrinsic.current.h ||
			(Tree.is(item.content, Shape) ? (shapeProps.sizeOverride ?? item.content.size) : 0);
		if (w && h) layout.set(item.id, { left: d.x, top: d.y, right: d.x + w, bottom: d.y + h });
	};
	const applyResize = (r: ResizePackage | null) => {
		if (r && r.id === item.id && Tree.is(item.content, Shape)) {
			setView((v) => ({ ...v, left: r.x, top: r.y }));
			setShapeProps({ sizeOverride: r.size });
			intrinsic.current = { w: r.size, h: r.size };
			layout.set(item.id, { left: r.x, top: r.y, right: r.x + r.size, bottom: r.y + r.size });
		} else if (!r || r.id !== item.id) setShapeProps({});
	};
	usePresenceManager(
		presence.drag as PresenceManager<DragAndRotatePackage>,
		(u) => u && applyDrag(u),
		applyDrag
	);
	usePresenceManager(
		presence.resize as PresenceManager<ResizePackage | null>,
		(u) => applyResize(u),
		applyResize
	);
	usePresenceManager(
		presence.itemSelection,
		() => {},
		(sel) => setSelected(sel.some((s) => s.id === item.id))
	);

	// Pointer lifecycle
	const coords = (e: { clientX: number; clientY: number }) => {
		const m = calculateCanvasMouseCoordinates(e, props.pan, props.zoom);
		return { x: m.x - offset.current.x, y: m.y - offset.current.y };
	};
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		e.stopPropagation();
		presence.itemSelection.setSelection({ id: item.id });
		offset.current = calculateOffsetFromCanvasOrigin(e, item, props.pan, props.zoom);
		dragRef.current = { pointerId: e.pointerId, moved: false };
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
		const { x, y } = coords(e);
		if (!dragRef.current.moved) {
			if (Math.abs(x - item.x) < 2 && Math.abs(y - item.y) < 2) return;
			dragRef.current.moved = true;
		}
		presence.drag.setDragging({
			id: item.id,
			x,
			y,
			rotation: item.rotation,
			branch: presence.branch,
		});
	};
	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
		const { x, y } = coords(e);
		if (dragRef.current.moved) {
			Tree.runTransaction(item, () => {
				item.x = x;
				item.y = y;
			});
			presence.drag.clearDragging();
		}
		e.currentTarget.releasePointerCapture(e.pointerId);
		dragRef.current = null;
	};

	// Layout measurement
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => {
			let w = 0,
				h = 0;
			if (Tree.is(item.content, Shape)) {
				const size = shapeProps.sizeOverride ?? item.content.size;
				w = size;
				h = size;
			} else {
				w = el.offsetWidth;
				h = el.offsetHeight;
				if ((!w || !h) && el.getBoundingClientRect) {
					const bb = el.getBoundingClientRect();
					const z = props.zoom || 1;
					w = (w || bb.width) / z;
					h = (h || bb.height) / z;
				}
			}
			if (!w || !h) return;
			intrinsic.current = { w, h };
			layout.set(item.id, {
				left: view.left,
				top: view.top,
				right: view.left + w,
				bottom: view.top + h,
			});
		};
		measure();
		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(measure);
			ro.observe(el);
		}
		return () => ro?.disconnect();
	}, [item.id, item.content, view.left, view.top, shapeProps.sizeOverride, props.zoom, layout]);

	// Never mutate view directly (React may freeze state objects in strict/dev modes)
	const style = { ...view, zIndex: index };
	return (
		<div
			ref={ref}
			data-item-id={item.id}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			className="absolute"
			style={style}
			onClick={(e) => {
				e.stopPropagation();
				if (presence.itemSelection) {
					if (e.ctrlKey || e.metaKey)
						presence.itemSelection.toggleSelection({ id: item.id });
					else presence.itemSelection.setSelection({ id: item.id });
				}
			}}
		>
			<SelectionBox
				selected={!!selected}
				item={item}
				onResizeEnd={() => setShapeProps({})}
				visualHidden={!!hideSelectionControls}
			/>
			<ContentElement item={item} shapeProps={shapeProps} />
		</div>
	);
}

// ============================================================================
// Selection visuals
// ============================================================================
export function SelectionBox({
	selected,
	item,
	onResizeEnd,
	visualHidden,
}: {
	selected: boolean;
	item: Item;
	onResizeEnd?: () => void;
	visualHidden?: boolean;
}) {
	useTree(item);
	const pad = 8;
	return (
		<>
			<div style={{ display: selected ? (visualHidden ? "none" : "block") : "none" }}>
				<SelectionControls item={item} padding={pad} onResizeEnd={onResizeEnd} />
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
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
}) {
	useTree(item);
	const showRotate = itemType(item) !== "table";
	return (
		<>
			{showRotate && <RotateHandle item={item} />}
			<CornerResizeHandles item={item} padding={padding} onResizeEnd={onResizeEnd} />
		</>
	);
}

// ============================================================================
// Rotate
// ============================================================================
export function RotateHandle({ item }: { item: Item }) {
	const presence = useContext(PresenceContext);
	useTree(item);
	const [active, setActive] = useState(false);
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setActive(true);
		// Improve touch reliability
		try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* unsupported */ }
		const el = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement | null;
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
				id: item.id,
				x: item.x,
				y: item.y,
				rotation: deg,
				branch: presence.branch,
			});
		};
		const up = () => {
			setActive(false);
			document.removeEventListener("pointermove", move);
			try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
			const st = presence.drag.state.local;
			if (st) {
				Tree.runTransaction(item, () => {
					item.rotation = st.rotation;
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
	const size = active ? 18 : 14;
	return (
		<div
			className="absolute flex flex-row w-full justify-center items-center"
			style={{ top: -40 }}
		>
			<div
				onPointerDown={onPointerDown}
				className="absolute bg-black shadow-lg z-50 cursor-grab"
				style={{
					width: size,
					height: size,
					borderRadius: "50%",
					padding: 14,
					margin: -14, // expand hit area without visual size change
					touchAction: "none",
				}}
			/>
		</div>
	);
}

// ============================================================================
// Resize (shapes only)
// ============================================================================
export function CornerResizeHandles({
	item,
	padding,
	onResizeEnd,
}: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
}) {
	if (!Tree.is(item.content, Shape)) return <></>;
	const shape = item.content;
	useTree(shape);
	const presence = useContext(PresenceContext);
	const [resizing, setResizing] = useState(false);
	const initSize = useRef(shape.size);
	const centerModel = useRef({ x: 0, y: 0 });
	const centerScreen = useRef({ x: 0, y: 0 });
	const initDist = useRef(0);
	const initVec = useRef({ dx: 0, dy: 0 });
	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setResizing(true);
		try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* unsupported */ }
		initSize.current = shape.size;
		centerModel.current = { x: item.x + shape.size / 2, y: item.y + shape.size / 2 };
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
			const dot = dx * initVec.current.dx + dy * initVec.current.dy;
			const initMagSq = initVec.current.dx ** 2 + initVec.current.dy ** 2;
			const proj = dot / Math.sqrt(initMagSq || 1);
			const ratio = Math.max(0.1, proj / initDist.current);
			// Increased max size from 300 to 1200 (4x) to match expanded shape size limits
			const desired = initSize.current * ratio;
			const newSize = clampShapeSize(desired);
			const newX = centerModel.current.x - newSize / 2;
			const newY = centerModel.current.y - newSize / 2;
			presence.resize.setResizing({ id: item.id, x: newX, y: newY, size: newSize });
		};
		const up = () => {
			setResizing(false);
			document.removeEventListener("pointermove", move);
			try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
			const r = presence.resize.state.local;
			if (r && r.id === item.id) {
				Tree.runTransaction(item, () => {
					shape.size = r.size;
					item.x = r.x;
					item.y = r.y;
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
		const o = resizing ? 10 : 8; // enlarged for touch
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
	const Handle = ({ position }: { position: string }) => (
		<div
			className="absolute bg-black cursor-nw-resize hover:bg-black shadow-lg z-50"
			style={{
				width: resizing ? 22 : 18,
				height: resizing ? 22 : 18,
				borderRadius: 4,
				padding: 10,
				margin: -10, // increase hit area
				touchAction: "none",
				...pos(position),
			}}
			onPointerDown={onPointerDown}
		/>
	);
	return (
		<>
			<Handle position="top-left" />
			<Handle position="top-right" />
			<Handle position="bottom-left" />
			<Handle position="bottom-right" />
		</>
	);
}

// ============================================================================
// Remote selection indicators
// ============================================================================
interface ConnectedUser {
	value: { name: string; id: string; image?: string };
	client: { attendeeId: string };
}
export function RemoteSelectionIndicators({
	remoteSelectedUsers,
}: {
	remoteSelectedUsers: string[];
}) {
	const presence = useContext(PresenceContext);
	const [expanded, setExpanded] = useState(false);
	if (!remoteSelectedUsers.length) return <></>;
	const connected = presence.users.getConnectedUsers().map((u) => ({
		value: {
			name: u.value.name,
			id: u.value.id,
			image: "image" in u.value ? (u.value as { image?: string }).image : undefined,
		},
		client: { attendeeId: u.client.attendeeId },
	})) as ConnectedUser[];
	const users: ConnectedUser[] = remoteSelectedUsers
		.map((id) => connected.find((u) => u.client.attendeeId === id)!)
		.filter((u): u is ConnectedUser => !!u);
	if (!users.length) return <></>;
	if (users.length === 1)
		return (
			<div
				className="absolute pointer-events-none"
				style={{ top: 0, right: 0, zIndex: 1001 }}
			>
				<RemoteUserIndicator user={users[0]} index={0} />
			</div>
		);
	return (
		<div className="absolute" style={{ top: 0, right: 0, zIndex: 1001 }}>
			{expanded ? (
				<div className="pointer-events-none relative">
					{users.map((u, i) => (
						<div
							key={u.client.attendeeId}
							className="transition-all duration-300 ease-out"
							style={{
								transform: `translateX(${expanded ? 0 : 20}px)`,
								opacity: expanded ? 1 : 0,
								transitionDelay: `${i * 50}ms`,
							}}
						>
							<RemoteUserIndicator user={u} index={i} />
						</div>
					))}
					<div
						className="absolute pointer-events-auto cursor-pointer w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-700 transition-all duration-200 border-2 border-white shadow-lg flex items-center justify-center"
						style={{
							top: -12,
							right: -12 - users.length * 26,
							zIndex: 1002,
							transform: `scale(${expanded ? 1 : 0})`,
							opacity: expanded ? 1 : 0,
							transitionDelay: `${users.length * 50}ms`,
						}}
						onClick={(e) => {
							e.stopPropagation();
							setExpanded(false);
						}}
						title="Collapse user list"
					>
						<ChevronLeft16Filled className="text-white" />
					</div>
				</div>
			) : (
				<div
					className="transition-all duration-300 ease-out"
					style={{ transform: `scale(${expanded ? 0 : 1})`, opacity: expanded ? 0 : 1 }}
				>
					<UserCountBadge
						userCount={users.length}
						users={users}
						onExpand={() => setExpanded(true)}
					/>
				</div>
			)}
		</div>
	);
}
function UserCountBadge({
	userCount,
	users,
	onExpand,
}: {
	userCount: number;
	users: Array<{
		value: { name: string; id: string; image?: string };
		client: { attendeeId: string };
	}>;
	onExpand: () => void;
}) {
	const tip =
		users
			.slice(0, 3)
			.map((u) => u.value.name)
			.join(", ") +
		(userCount > 3 ? ` and ${userCount - 3} more` : "") +
		" selected this item";
	return (
		<div
			className="pointer-events-auto cursor-pointer flex items-center justify-center text-white text-xs font-semibold rounded-full bg-black hover:bg-gray-800 transition-colors duration-200 border-2 border-white shadow-lg hover:shadow-xl"
			style={{
				width: 24,
				height: 24,
				position: "absolute",
				top: -12,
				right: -12,
				zIndex: 1001,
			}}
			title={tip}
			onClick={(e) => {
				e.stopPropagation();
				onExpand();
			}}
		>
			{userCount}
		</div>
	);
}
function RemoteUserIndicator({
	user,
	index,
}: {
	user: { value: { name: string; id: string; image?: string }; client: { attendeeId: string } };
	index: number;
}) {
	const i = initials(user.value.name);
	const c = userColor(user.client.attendeeId);
	const off = index * 26;
	return (
		<div
			className="flex items-center justify-center text-white font-semibold rounded-full border-2 border-white shadow-lg"
			style={{
				width: 24,
				height: 24,
				backgroundColor: c,
				position: "absolute",
				top: -12,
				right: -12 - off,
				zIndex: 1001,
				fontSize: 10,
				lineHeight: "1",
			}}
			title={`Selected by ${user.value.name}`}
		>
			{i}
		</div>
	);
}
