import React, { JSX } from "react";
import { Shape } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";
import { getShapeDimensions, getShapeKind, getShapeSize } from "../../../utils/shapeUtils.js";

export function ShapeView(props: {
	shape: Shape;
	sizeOverride?: number;
	colorOverride?: string;
}): JSX.Element {
	const { shape, sizeOverride, colorOverride } = props;
	useTree(shape);

	const baseDimensions = getShapeDimensions(shape);
	const baseSize = Math.max(baseDimensions.width, baseDimensions.height) || 1;
	const desiredSize = sizeOverride ?? baseSize;
	const scale = desiredSize / baseSize;
	const width = baseDimensions.width * scale;
	const height = baseDimensions.height * scale;
	const color = colorOverride ?? shape.color;
	const filled = shape.filled !== false;
	const sizeForStroke = Math.max(width, height) || getShapeSize(shape);
	const strokeWidth = filled ? 0 : Math.max(2, Math.min(8, sizeForStroke * 0.08));
	const kind = getShapeKind(shape);
	switch (kind) {
		case "circle": {
			const diameter = width;
			const radius = diameter / 2;
			const inset = strokeWidth / 2;
			return (
				<svg
					width={diameter}
					height={diameter}
					viewBox={`0 0 ${diameter} ${diameter}`}
					preserveAspectRatio="xMidYMid meet"
				>
					<circle
						cx={radius}
						cy={radius}
						r={Math.max(radius - inset, 0)}
						fill={filled ? color : "transparent"}
						stroke={strokeWidth > 0 ? color : "none"}
						strokeWidth={strokeWidth}
					/>
				</svg>
			);
		}
		case "square": {
			const edge = width;
			const inset = strokeWidth / 2;
			return (
				<svg
					width={edge}
					height={edge}
					viewBox={`0 0 ${edge} ${edge}`}
					preserveAspectRatio="xMidYMid meet"
				>
					<rect
						x={inset}
						y={inset}
						width={Math.max(edge - strokeWidth, 0)}
						height={Math.max(edge - strokeWidth, 0)}
						fill={filled ? color : "transparent"}
						stroke={strokeWidth > 0 ? color : "none"}
						strokeWidth={strokeWidth}
					/>
				</svg>
			);
		}
		case "triangle": {
			const inset = strokeWidth / 2;
			const base = width;
			const triHeight = height;
			const points = [
				`${base / 2},${inset}`,
				`${base - inset},${triHeight - inset}`,
				`${inset},${triHeight - inset}`,
			].join(" ");
			return (
				<svg
					width={base}
					height={triHeight}
					viewBox={`0 0 ${base} ${triHeight}`}
					preserveAspectRatio="xMidYMid meet"
				>
					<polygon
						points={points}
						fill={filled ? color : "transparent"}
						stroke={strokeWidth > 0 ? color : "none"}
						strokeWidth={strokeWidth}
						strokeLinejoin="round"
					/>
				</svg>
			);
		}
		case "star": {
			const starSize = Math.max(width, height);
			const normalizedStroke = strokeWidth > 0 ? (strokeWidth / starSize) * 24 : 0;
			return (
				<svg
					width={starSize}
					height={starSize}
					viewBox="0 0 24 24"
					preserveAspectRatio="xMidYMid meet"
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
						fill={filled ? color : "transparent"}
						stroke={normalizedStroke > 0 ? color : "none"}
						strokeWidth={normalizedStroke}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</svg>
			);
		}
		case "rectangle": {
			const rectWidth = width;
			const rectHeight = height;
			const inset = strokeWidth / 2;
			return (
				<svg
					width={rectWidth}
					height={rectHeight}
					viewBox={`0 0 ${rectWidth} ${rectHeight}`}
					preserveAspectRatio="xMidYMid meet"
				>
					<rect
						x={inset}
						y={inset}
						width={Math.max(rectWidth - strokeWidth, 0)}
						height={Math.max(rectHeight - strokeWidth, 0)}
						fill={filled ? color : "transparent"}
						stroke={strokeWidth > 0 ? color : "none"}
						strokeWidth={strokeWidth}
					/>
				</svg>
			);
		}
		default:
			return <></>;
	}
}
