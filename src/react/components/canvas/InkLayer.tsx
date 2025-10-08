/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import { InkStroke, InkPoint } from "../../../schema/appSchema.js";

/**
 * InkLayer component
 *
 * Renders all ink strokes on the canvas including:
 * - Permanent strokes (committed to SharedTree)
 * - Remote ephemeral strokes (being drawn by other users)
 * - Local ephemeral stroke (currently being drawn)
 * - Eraser hover highlight
 */
export function InkLayer(props: {
	/** Permanent ink strokes from SharedTree */
	strokes: Iterable<InkStroke>;
	/** Current zoom level */
	zoom: number;
	/** Current pan offset */
	pan: { x: number; y: number };
	/** Whether eraser mode is active */
	eraserActive?: boolean;
	/** ID of stroke being hovered in eraser mode */
	eraserHoverId?: string | null;
	/** Whether currently drawing */
	isDrawing?: boolean;
	/** Local ephemeral stroke points (while drawing) */
	localPoints?: readonly InkPoint[];
	/** Color for local stroke */
	inkColor?: string;
	/** Width for local stroke */
	inkWidth?: number;
	/** Remote ephemeral strokes from presence */
	remoteStrokes?: Array<{
		attendeeId: string;
		stroke: {
			points: readonly { x: number; y: number; t?: number }[];
			color: string;
			width: number;
		};
	}>;
	/** Whether ink mode is active */
	inkActive?: boolean;
}): JSX.Element {
	const {
		strokes,
		zoom,
		pan,
		eraserActive,
		eraserHoverId,
		isDrawing,
		localPoints,
		inkColor = "#2563eb",
		inkWidth = 4,
		remoteStrokes = [],
		inkActive,
	} = props;

	return (
		<g
			transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
			pointerEvents={inkActive || eraserActive ? "auto" : "none"}
			filter="url(#inkShadow)"
			data-layer="ink"
		>
			{/* Invisible blocking rectangle to capture all pointer events when ink/eraser is active */}
			{(inkActive || eraserActive) && (
				<rect
					x={-pan.x / zoom}
					y={-pan.y / zoom}
					width={10000 / zoom}
					height={10000 / zoom}
					fill="transparent"
					pointerEvents="auto"
					style={{ cursor: "none" }}
				/>
			)}
			{/* Permanent strokes */}
			{Array.from(strokes).map((s: InkStroke) => {
				const pts = Array.from(s.simplified ?? s.points) as InkPoint[];
				if (!pts.length) return null;
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
							filter="url(#inkShadow)"
							points={pts.map((p: InkPoint) => `${p.x},${p.y}`).join(" ")}
						/>
					</g>
				);
			})}

			{/* Eraser hover highlight (draw after base strokes) */}
			{eraserActive &&
				eraserHoverId &&
				(() => {
					const stroke = Array.from(strokes).find(
						(s: InkStroke) => s.id === eraserHoverId
					);
					if (!stroke) return null;
					const pts = Array.from(stroke.simplified ?? stroke.points) as InkPoint[];
					if (!pts.length) return null;
					return (
						<polyline
							key={`hover-${stroke.id}`}
							fill="none"
							stroke="#dc2626"
							strokeWidth={Math.max(0.5, (stroke.style?.strokeWidth ?? 4) * zoom + 2)}
							strokeOpacity={0.9}
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
							strokeDasharray="4 3"
							points={pts.map((p: InkPoint) => `${p.x},${p.y}`).join(" ")}
						/>
					);
				})()}

			{/* Remote ephemeral strokes */}
			{remoteStrokes.map((r) => {
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
						filter="url(#inkShadow)"
						points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
					/>
				);
			})}

			{/* Local ephemeral (if drawing) */}
			{isDrawing && localPoints && localPoints.length > 0 && (
				<polyline
					key="local-ephemeral"
					fill="none"
					stroke={inkColor}
					strokeWidth={Math.max(0.5, inkWidth * zoom)}
					strokeOpacity={0.7}
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
					filter="url(#inkShadow)"
					points={localPoints.map((p) => `${p.x},${p.y}`).join(" ")}
				/>
			)}
		</g>
	);
}
