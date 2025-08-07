// Utilities for working with Note TextRun arrays
// MVP implementation: insert and delete plain text, coalescing adjacent runs without style.

import { Note, TextRun } from "../schema/app_schema.js";

export interface PositionRef {
	index: number; // run index
	offset: number; // char offset within run
}

export function getPlainText(note: Note): string {
	if (!note.runs) return note.text ?? "";
	return note.runs.map((r) => r.text).join("");
}

export function ensureRuns(note: Note): void {
	if (!note.runs || note.runs.length === 0) {
		// Initialize runs array with current text. Cast to any due to generated array node typing.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(note as any).runs = [new TextRun({ text: note.text ?? "" })];
	}
}

export function positionToRef(note: Note, pos: number): PositionRef {
	ensureRuns(note);
	let remaining = pos;
	for (let i = 0; i < note.runs!.length; i++) {
		const run = note.runs![i];
		if (remaining <= run.text.length) {
			return { index: i, offset: remaining };
		}
		remaining -= run.text.length;
	}
	// end
	const lastIdx = note.runs!.length - 1;
	return { index: lastIdx, offset: note.runs![lastIdx].text.length };
}

export function insertText(note: Note, pos: number, text: string): void {
	if (!text) return;
	ensureRuns(note);
	const ref = positionToRef(note, pos);
	const run = note.runs![ref.index];
	// Simple strategy: split run into two and insert new run in middle
	const before = run.text.slice(0, ref.offset);
	const after = run.text.slice(ref.offset);
	run.text = before; // mutate existing run to before
	const newRun = new TextRun({ text });
	const afterRun = new TextRun({ text: after });
	// Insert new + after
	// Insert newRun and afterRun using insertAt
	note.runs!.insertAt(ref.index + 1, newRun);
	note.runs!.insertAt(ref.index + 2, afterRun);
	coalesce(note);
}

export function deleteRange(note: Note, start: number, end: number): void {
	if (end <= start) return;
	ensureRuns(note);
	const startRef = positionToRef(note, start);
	const endRef = positionToRef(note, end);
	if (startRef.index === endRef.index) {
		// within one run
		const run = note.runs![startRef.index];
		run.text = run.text.slice(0, startRef.offset) + run.text.slice(endRef.offset);
	} else {
		// trim start run
		const first = note.runs![startRef.index];
		first.text = first.text.slice(0, startRef.offset);
		// trim end run
		const last = note.runs![endRef.index];
		last.text = last.text.slice(endRef.offset);
		// remove middle runs
		for (let i = endRef.index - 1; i > startRef.index; i--) {
			note.runs!.removeAt(i);
		}
	}
	coalesce(note);
}

export function coalesce(note: Note): void {
	ensureRuns(note);
	for (let i = 0; i < note.runs!.length - 1; ) {
		const a = note.runs![i];
		const b = note.runs![i + 1];
		// For MVP, style must match exactly (string JSON) to merge
		if ((a.style ?? "") === (b.style ?? "")) {
			a.text += b.text;
			note.runs!.removeAt(i + 1);
		} else {
			i++;
		}
	}
}
