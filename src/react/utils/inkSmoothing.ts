import { InkPoint } from "../../schema/appSchema.js";

export interface InkSmoothingOptions {
	smoothingWindow?: number;
	tolerance?: number;
	minimumPoints?: number;
	chaikinIterations?: number;
}

interface PlainInkPoint {
	x: number;
	y: number;
	t?: number;
	p?: number;
}

const toPlain = (point: InkPoint): PlainInkPoint => ({
	x: point.x,
	y: point.y,
	t: point.t,
	p: point.p,
});

const toInkPoint = (point: PlainInkPoint): InkPoint =>
	new InkPoint({
		x: point.x,
		y: point.y,
		t: point.t,
		p: point.p,
	});

const clonePlainPoint = (point: PlainInkPoint): PlainInkPoint => ({
	x: point.x,
	y: point.y,
	t: point.t,
	p: point.p,
});

const blendOptional = (
	a: number | undefined,
	b: number | undefined,
	weightB: number
): number | undefined => {
	if (typeof a !== "number" && typeof b !== "number") {
		return undefined;
	}
	if (typeof a === "number" && typeof b === "number") {
		return a * (1 - weightB) + b * weightB;
	}
	return typeof a === "number" ? a : b;
};

function movingAverage(points: PlainInkPoint[], windowSize: number): PlainInkPoint[] {
	if (windowSize < 3 || points.length <= 2) {
		return points.map(clonePlainPoint);
	}

	const halfWindow = Math.floor(windowSize / 2);
	const lastIndex = points.length - 1;

	return points.map((point, index) => {
		if (index === 0 || index === lastIndex) {
			return { ...point };
		}

		let sumX = 0;
		let sumY = 0;
		let sumT = 0;
		let sumP = 0;
		let tCount = 0;
		let pCount = 0;
		let count = 0;

		for (
			let j = Math.max(0, index - halfWindow);
			j <= Math.min(lastIndex, index + halfWindow);
			j++
		) {
			const current = points[j];
			sumX += current.x;
			sumY += current.y;
			count++;
			if (typeof current.t === "number") {
				sumT += current.t;
				tCount++;
			}
			if (typeof current.p === "number") {
				sumP += current.p;
				pCount++;
			}
		}

		return {
			x: sumX / count,
			y: sumY / count,
			t: tCount > 0 ? sumT / tCount : point.t,
			p: pCount > 0 ? sumP / pCount : point.p,
		};
	});
}

function perpendicularDistance(
	point: PlainInkPoint,
	start: PlainInkPoint,
	end: PlainInkPoint
): number {
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	if (dx === 0 && dy === 0) {
		const diffX = point.x - start.x;
		const diffY = point.y - start.y;
		return Math.sqrt(diffX * diffX + diffY * diffY);
	}

	const numerator = Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x);
	const denominator = Math.sqrt(dx * dx + dy * dy);
	return numerator / denominator;
}

function chaikinSmooth(points: PlainInkPoint[], iterations: number): PlainInkPoint[] {
	if (iterations <= 0 || points.length <= 2) {
		return points.map(clonePlainPoint);
	}

	let current = points.map(clonePlainPoint);
	for (let iter = 0; iter < iterations; iter++) {
		if (current.length <= 2) break;
		const next: PlainInkPoint[] = [clonePlainPoint(current[0])];
		for (let i = 0; i < current.length - 1; i++) {
			const p0 = current[i];
			const p1 = current[i + 1];
			const q: PlainInkPoint = {
				x: 0.75 * p0.x + 0.25 * p1.x,
				y: 0.75 * p0.y + 0.25 * p1.y,
				t: blendOptional(p0.t, p1.t, 0.25),
				p: blendOptional(p0.p, p1.p, 0.25),
			};
			const r: PlainInkPoint = {
				x: 0.25 * p0.x + 0.75 * p1.x,
				y: 0.25 * p0.y + 0.75 * p1.y,
				t: blendOptional(p0.t, p1.t, 0.75),
				p: blendOptional(p0.p, p1.p, 0.75),
			};
			next.push(q, r);
		}
		next.push(clonePlainPoint(current[current.length - 1]));
		current = next;
	}
	return current.map(clonePlainPoint);
}

function ramerDouglasPeucker(points: PlainInkPoint[], epsilon: number): PlainInkPoint[] {
	if (points.length <= 2) {
		return points.map(clonePlainPoint);
	}

	let maxDistance = 0;
	let index = -1;
	const firstPoint = points[0];
	const lastPoint = points[points.length - 1];

	for (let i = 1; i < points.length - 1; i++) {
		const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
		if (distance > maxDistance) {
			maxDistance = distance;
			index = i;
		}
	}

	if (maxDistance > epsilon && index !== -1) {
		const left = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
		const right = ramerDouglasPeucker(points.slice(index), epsilon);
		return left.slice(0, -1).concat(right);
	}

	return [firstPoint, lastPoint];
}

export function smoothAndSimplifyInkPoints(
	points: InkPoint[],
	options: InkSmoothingOptions = {}
): InkPoint[] {
	const {
		smoothingWindow = 5,
		tolerance = 1.35,
		minimumPoints = 2,
		chaikinIterations = 1,
	} = options;
	if (points.length <= minimumPoints) {
		return points.map((p) => new InkPoint({ x: p.x, y: p.y, t: p.t, p: p.p }));
	}

	const plainPoints = points.map(toPlain);
	const averaged = movingAverage(plainPoints, smoothingWindow);
	const softened = chaikinIterations > 0 ? chaikinSmooth(averaged, chaikinIterations) : averaged;
	const simplified = tolerance > 0 ? ramerDouglasPeucker(softened, tolerance) : softened;

	if (simplified.length < minimumPoints) {
		return points.map((p) => new InkPoint({ x: p.x, y: p.y, t: p.t, p: p.p }));
	}

	return simplified.map(toInkPoint);
}
