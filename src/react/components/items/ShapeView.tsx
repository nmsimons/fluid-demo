import React, { JSX } from "react";
import { Shape } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";

interface ShapeRenderProps {
	size: number;
	fillColor: string;
	strokeColor: string;
	strokeWidth: number;
}

export function ShapeView(props: {
	shape: Shape;
	sizeOverride?: number;
	colorOverride?: string;
}): JSX.Element {
	const { shape, sizeOverride, colorOverride } = props;
	useTree(shape);

	const size = sizeOverride ?? shape.size;
	const color = colorOverride ?? shape.color;
	const filled = shape.filled !== false;
	const strokeWidth = filled ? 0 : Math.max(2, Math.min(8, size * 0.08));
	const shapeProps: ShapeRenderProps = {
		size,
		fillColor: filled ? color : "transparent",
		strokeColor: color,
		strokeWidth,
	};

	switch (shape.type) {
		case "circle":
			return <Circle {...shapeProps} />;
		case "square":
			return <Square {...shapeProps} />;
		case "triangle":
			return <Triangle {...shapeProps} />;
		case "star":
			return <Star {...shapeProps} />;
		default:
			return <></>;
	}
}

function Circle({ size, fillColor, strokeColor, strokeWidth }: ShapeRenderProps): JSX.Element {
	const radius = size / 2 - strokeWidth / 2;
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			preserveAspectRatio="xMidYMid meet"
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={Math.max(radius, 0)}
				fill={fillColor}
				stroke={strokeWidth > 0 ? strokeColor : "none"}
				strokeWidth={strokeWidth}
			/>
		</svg>
	);
}

function Square({ size, fillColor, strokeColor, strokeWidth }: ShapeRenderProps): JSX.Element {
	const inset = strokeWidth / 2;
	const edge = Math.max(size - strokeWidth, 0);
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			preserveAspectRatio="xMidYMid meet"
		>
			<rect
				x={inset}
				y={inset}
				width={edge}
				height={edge}
				fill={fillColor}
				stroke={strokeWidth > 0 ? strokeColor : "none"}
				strokeWidth={strokeWidth}
			/>
		</svg>
	);
}

function Triangle({ size, fillColor, strokeColor, strokeWidth }: ShapeRenderProps): JSX.Element {
	const inset = strokeWidth / 2;
	const points = [
		`${size / 2},${inset}`,
		`${size - inset},${size - inset}`,
		`${inset},${size - inset}`,
	].join(" ");
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			preserveAspectRatio="xMidYMid meet"
		>
			<polygon
				points={points}
				fill={fillColor}
				stroke={strokeWidth > 0 ? strokeColor : "none"}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function Star({ size, fillColor, strokeColor, strokeWidth }: ShapeRenderProps): JSX.Element {
	const viewBoxSize = 24;
	const normalizedStroke = strokeWidth > 0 ? (strokeWidth / size) * viewBoxSize : 0;
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
			<polygon
				points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
				fill={fillColor}
				stroke={normalizedStroke > 0 ? strokeColor : "none"}
				strokeWidth={normalizedStroke}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}
