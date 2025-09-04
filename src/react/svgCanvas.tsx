import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { IFluidContainer } from "fluid-framework";
import { Items } from "../schema/app_schema.js";
import { useTree } from "./hooks/useTree.js";
import { SvgItemView } from "./svgItemux.js";
import { PresenceContext } from "./contexts/PresenceContext.js";

export const SvgViewportContext = createContext<{ scale: number }>({ scale: 1 });

export function SvgCanvas(props: {
	items: Items;
	container: IFluidContainer;
	setSize: (w: number, h: number) => void;
}): JSX.Element {
	const { items, setSize } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	const ref = useRef<SVGSVGElement | null>(null);
	const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
	const [isPanning, setPanning] = useState(false);
	const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
	const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

	useEffect(() => {
		if (!ref.current) return;
		const r = ref.current.getBoundingClientRect();
		const w = Math.round(r.width);
		const h = Math.round(r.height);
		if (lastSizeRef.current.w !== w || lastSizeRef.current.h !== h) {
			lastSizeRef.current = { w, h };
			setSize(w, h);
		}
	}, []);

	useEffect(() => {
		const onResize = () => {
			if (!ref.current) return;
			const r = ref.current.getBoundingClientRect();
			const w = Math.round(r.width);
			const h = Math.round(r.height);
			if (lastSizeRef.current.w !== w || lastSizeRef.current.h !== h) {
				lastSizeRef.current = { w, h };
				setSize(w, h);
			}
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
		e.preventDefault();
		const delta = -e.deltaY;
		setTransform((t) => {
			const factor = Math.exp(delta * 0.001);
			const nextScale = Math.min(8, Math.max(0.1, t.scale * factor));
			if (Object.is(nextScale, t.scale)) return t; // no-op, avoid extra renders
			return { ...t, scale: nextScale };
		});
	};

	const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
		setPanning(true);
		panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
	};
	const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
		if (!isPanning || !panStart.current) return;
		const dx = e.clientX - panStart.current.x;
		const dy = e.clientY - panStart.current.y;
		setTransform((t) => ({ ...t, x: panStart.current!.tx + dx, y: panStart.current!.ty + dy }));
	};
	const onMouseUp: React.MouseEventHandler<SVGSVGElement> = () => {
		setPanning(false);
		panStart.current = null;
	};
	const onLeave: React.MouseEventHandler<SVGSVGElement> = () => {
		setPanning(false);
		panStart.current = null;
	};

	return (
		<svg
			ref={ref}
			id="canvas"
			className="relative flex h-full w-full bg-transparent overflow-hidden"
			onWheel={onWheel}
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
			onMouseLeave={onLeave}
			onClick={() => presence.itemSelection?.clearSelection()}
		>
			<defs>
				<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
					<feDropShadow dx="3" dy="3" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" />
				</filter>
			</defs>
			<g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
				<SvgViewportContext.Provider value={{ scale: transform.scale }}>
					{items.map((it) => (
						<SvgItemView key={it.id} item={it} />
					))}
				</SvgViewportContext.Provider>
			</g>
		</svg>
	);
}
