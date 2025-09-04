import React from "react";
import { FluidTable, Item, Shape } from "../../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { getActiveDragForItem } from "../utils/dragUtils.js";

export function SelectionOverlay(props: {
	item: Item;
	layout: Map<string, { left: number; top: number; right: number; bottom: number }>;
	presence: React.ContextType<typeof import("../contexts/PresenceContext.js").PresenceContext>;
	zoom: number;
}): JSX.Element | null {
	const { item, layout, presence, zoom } = props;
	const b = layout.get(item.id);
	// Base position from layout (falls back to model position if missing)
	let left = b?.left ?? item.x;
	let top = b?.top ?? item.y;
	let w = b ? Math.max(0, b.right - b.left) : 0;
	let h = b ? Math.max(0, b.bottom - b.top) : 0;
	if (w === 0 || h === 0) {
		const container = document.querySelector(
			`[data-item-id='${item.id}']`
		) as HTMLElement | null;
		if (container) {
			const rect = container.getBoundingClientRect();
			w = rect.width / (zoom || 1);
			h = rect.height / (zoom || 1);
		}
		if (w === 0 || h === 0) return null;
	}
	const padding = 8;
	const active = getActiveDragForItem(presence, item.id);
	// If this client (or a remote) is actively dragging, prefer live drag coordinates to avoid a frame of lag
	if (active) {
		left = active.x;
		top = active.y;
	}
	let angle = active ? active.rotation : item.rotation;
	const isTable = Tree.is(item.content, FluidTable);
	const isShape = Tree.is(item.content, Shape);
	if (isTable) angle = 0;

	// Screen-constant geometry helpers
	const rotationGapPx = 22; // (was 35) desired screen distance from top edge of selection rect to rotation handle center
	const outwardGapPx = 2; // desired screen outward offset for resize handles beyond selection rect edge (beyond padding)
	// Convert: (Y - padding)*zoom = gap  => Y = padding + gap/zoom
	const rotationOffsetLocal = padding + rotationGapPx / zoom;
	// For resize: (outwardLocal - padding)*zoom = outwardGapPx => outwardLocal = padding + outwardGapPx/zoom
	const outwardLocal = padding + outwardGapPx / zoom;
	return (
		<g
			data-svg-item-id={item.id}
			transform={`translate(${left}, ${top}) rotate(${angle}, ${w / 2}, ${h / 2})`}
		>
			<g pointerEvents="none">
				<rect
					x={-padding}
					y={-padding}
					width={w + padding * 2}
					height={h + padding * 2}
					fill="none"
					stroke="#000"
					strokeLinecap="round"
					strokeDasharray={`${(2 / zoom).toFixed(3)} ${(4 / zoom).toFixed(3)}`}
					strokeWidth={2 / zoom}
					opacity={0.9}
				/>
			</g>
			{!isTable && (
				<g transform={`translate(${w / 2}, ${-rotationOffsetLocal})`}>
					<circle
						r={6 / zoom}
						fill="#000"
						cursor="grab"
						onClick={(e) => {
							e.stopPropagation();
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
							const container = document.querySelector(
								`[data-item-id='${item.id}']`
							) as HTMLElement | null;
							const rotateHandle = container?.querySelector(
								".cursor-grab"
							) as HTMLElement | null;
							const target = rotateHandle ?? container;
							if (target) {
								const evt = new MouseEvent("mousedown", {
									bubbles: true,
									cancelable: true,
									clientX: e.clientX,
									clientY: e.clientY,
								});
								target.dispatchEvent(evt);
							}
						}}
					/>
				</g>
			)}
			{isShape && (
				<g>
					{(() => {
						const handleSize = 8 / zoom;
						const half = handleSize / 2;
						const positions = [
							{ x: -outwardLocal, y: -outwardLocal, cursor: "nwse-resize" as const },
							{
								x: w + outwardLocal,
								y: -outwardLocal,
								cursor: "nesw-resize" as const,
							},
							{
								x: -outwardLocal,
								y: h + outwardLocal,
								cursor: "nesw-resize" as const,
							},
							{
								x: w + outwardLocal,
								y: h + outwardLocal,
								cursor: "nwse-resize" as const,
							},
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
									const container = document.querySelector(
										`[data-item-id='${item.id}']`
									) as HTMLElement | null;
									const handles = Array.from(
										container?.querySelectorAll(".cursor-nw-resize") ?? []
									) as HTMLElement[];
									const handle = handles[i] ?? container;
									if (handle) {
										const evt = new MouseEvent("mousedown", {
											bubbles: true,
											cancelable: true,
											clientX: e.clientX,
											clientY: e.clientY,
										});
										handle.dispatchEvent(evt);
									}
								}}
							/>
						));
					})()}
				</g>
			)}
		</g>
	);
}
