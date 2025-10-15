/*!
 * Helper utilities for working with Shape schema objects.
 * Provides type guarding, dimension helpers, cloning, and scaling logic
 * now that individual shape types are modeled as distinct tree nodes.
 */

import { Tree } from "fluid-framework";
import { Circle, Rectangle, Shape, Square, Star, Triangle } from "../schema/appSchema.js";

export type ShapeKind = "circle" | "square" | "triangle" | "star" | "rectangle";

export function getShapeKind(shape: Shape): ShapeKind {
	return getShapeKindFromType(shape.type);
}

function getShapeKindFromType(typeNode: Shape["type"]): ShapeKind {
	if (Tree.is(typeNode, Circle)) return "circle";
	if (Tree.is(typeNode, Square)) return "square";
	if (Tree.is(typeNode, Triangle)) return "triangle";
	if (Tree.is(typeNode, Star)) return "star";
	if (Tree.is(typeNode, Rectangle)) return "rectangle";
	throw new Error("Unsupported shape type");
}

export function getShapeDimensions(shape: Shape): { width: number; height: number } {
	const typeNode = shape.type;
	if (Tree.is(typeNode, Circle)) {
		const diameter = typeNode.radius * 2;
		return { width: diameter, height: diameter };
	}
	if (Tree.is(typeNode, Square)) {
		return { width: typeNode.size, height: typeNode.size };
	}
	if (Tree.is(typeNode, Triangle)) {
		return { width: typeNode.base, height: typeNode.height };
	}
	if (Tree.is(typeNode, Star)) {
		return { width: typeNode.size, height: typeNode.size };
	}
	if (Tree.is(typeNode, Rectangle)) {
		return { width: typeNode.width, height: typeNode.height };
	}
	throw new Error("Unsupported shape type");
}

export function getShapeSize(shape: Shape): number {
	const { width, height } = getShapeDimensions(shape);
	return Math.max(width, height);
}

export function getScaledShapeDimensions(
	shape: Shape,
	targetSize: number
): {
	width: number;
	height: number;
} {
	const base = getShapeDimensions(shape);
	const baseSize = Math.max(base.width, base.height);
	if (baseSize <= 0) {
		return { width: targetSize, height: targetSize };
	}
	const scale = targetSize / baseSize;
	return {
		width: base.width * scale,
		height: base.height * scale,
	};
}

export function setShapeSize(shape: Shape, newSize: number): void {
	if (newSize <= 0) return;
	const typeNode = shape.type;
	const baseSize = getShapeSize(shape);
	const scale = baseSize > 0 ? newSize / baseSize : 1;
	const clampedScale = scale > 0 ? scale : 1;

	if (Tree.is(typeNode, Circle)) {
		typeNode.radius = Math.max(1, newSize / 2);
		return;
	}
	if (Tree.is(typeNode, Square)) {
		typeNode.size = Math.max(1, newSize);
		return;
	}
	if (Tree.is(typeNode, Triangle)) {
		typeNode.base = Math.max(1, Math.round(typeNode.base * clampedScale));
		typeNode.height = Math.max(1, Math.round(typeNode.height * clampedScale));
		return;
	}
	if (Tree.is(typeNode, Star)) {
		typeNode.size = Math.max(1, newSize);
		return;
	}
	if (Tree.is(typeNode, Rectangle)) {
		typeNode.width = Math.max(1, Math.round(typeNode.width * clampedScale));
		typeNode.height = Math.max(1, Math.round(typeNode.height * clampedScale));
		return;
	}
}

export function setShapeDimensions(
	shape: Shape,
	dimensions: { width: number; height: number }
): void {
	const { width, height } = dimensions;
	const safeWidth = Math.max(1, Math.round(width));
	const safeHeight = Math.max(1, Math.round(height));
	const typeNode = shape.type;
	if (Tree.is(typeNode, Rectangle)) {
		typeNode.width = safeWidth;
		typeNode.height = safeHeight;
		return;
	}
	setShapeSize(shape, Math.max(safeWidth, safeHeight));
}

export function isRectangleShape(shape: Shape): boolean {
	return Tree.is(shape.type, Rectangle);
}

export function cloneShapeType(typeNode: Shape["type"]): Shape["type"] {
	if (Tree.is(typeNode, Circle)) {
		return new Circle({ radius: typeNode.radius });
	}
	if (Tree.is(typeNode, Square)) {
		return new Square({ size: typeNode.size });
	}
	if (Tree.is(typeNode, Triangle)) {
		return new Triangle({ base: typeNode.base, height: typeNode.height });
	}
	if (Tree.is(typeNode, Star)) {
		return new Star({ size: typeNode.size });
	}
	if (Tree.is(typeNode, Rectangle)) {
		return new Rectangle({ width: typeNode.width, height: typeNode.height });
	}
	throw new Error("Unsupported shape type");
}
