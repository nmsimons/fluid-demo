/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useRef, useState, useEffect } from "react";
import { Items, Item } from "../schema/app_schema.js";
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
}): JSX.Element {
	const { items, setSize, zoom: externalZoom, onZoomChange } = props;
	const presence = useContext(PresenceContext);
	useTree(items);
	const layout = useContext(LayoutContext);

	const svgRef = useRef<SVGSVGElement>(null);
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

	return (
		<svg
			id="canvas"
			ref={svgRef}
			className="relative flex h-full w-full bg-transparent"
			onClick={handleBackgroundClick}
			onMouseDown={beginPanIfBackground}
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
						/>
					);
				})}
			</g>
		</svg>
	);
}
