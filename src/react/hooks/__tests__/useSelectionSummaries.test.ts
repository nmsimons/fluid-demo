import { describe, expect, it, vi } from "vitest";
import {
	buildShapeSelectionSummary,
	buildTextSelectionSummary,
	buildNoteSelectionSummary,
	type ShapeSelectionSummary,
	type TextSelectionSummary,
	type NoteSelectionSummary,
} from "../useSelectionSummaries.js";
import type { Item } from "../../../schema/appSchema.js";

vi.mock("../../../utils/contentHandlers.js", () => ({
	isShape: (item: { content?: { kind?: string } }) => item.content?.kind === "shape",
	isText: (item: { content?: { kind?: string } }) => item.content?.kind === "text",
	isNote: (item: { content?: { kind?: string } }) => item.content?.kind === "note",
}));

type FakeItem = Item & { content: Record<string, unknown> & { kind: string } };

type ItemDictionary = Record<string, FakeItem>;

function toItem(content: Record<string, unknown> & { kind: string }, id: string): FakeItem {
	return {
		id,
		content,
	} as FakeItem;
}

function createLookup(items: ItemDictionary) {
	return (id: string) => items[id];
}

describe("buildShapeSelectionSummary", () => {
	it("captures first shape properties and stable signature", () => {
		const lookup = createLookup({
			"shape-1": toItem({ kind: "shape", color: "#ff0000", filled: true }, "shape-1"),
			"shape-2": toItem({ kind: "shape", color: "#00ff00", filled: false }, "shape-2"),
		});

		const summary: ShapeSelectionSummary = buildShapeSelectionSummary(lookup, [
			"shape-1",
			"missing",
			"shape-2",
		]);

		expect(summary).toEqual({
			color: "#ff0000",
			filled: true,
			signature: "shape-1:#ff0000:1|missing|shape-2:#00ff00:0",
		});
	});
});

describe("buildTextSelectionSummary", () => {
	it("normalizes default formatting values", () => {
		const lookup = createLookup({
			"text-1": toItem(
				{
					kind: "text",
					color: "#123456",
					fontSize: 28,
					bold: true,
					italic: false,
					underline: true,
					strikethrough: false,
					cardStyle: true,
					textAlign: "center",
				},
				"text-1"
			),
			"text-2": toItem(
				{
					kind: "text",
					// rely on defaults for unset properties
				},
				"text-2"
			),
		});

		const summary: TextSelectionSummary = buildTextSelectionSummary(lookup, [
			"text-1",
			"text-2",
		]);

		expect(summary).toEqual({
			color: "#123456",
			fontSize: 28,
			bold: true,
			italic: false,
			underline: true,
			strikethrough: false,
			cardStyle: true,
			textAlign: "center",
			signature: "text-1:#123456:28:1:0:1:0:1:center|text-2:#111827:20:0:0:0:0:0:left",
		});
	});
});

describe("buildNoteSelectionSummary", () => {
	it("falls back to default color for legacy notes", () => {
		const lookup = createLookup({
			"note-1": toItem({ kind: "note", color: "#ffe4a7" }, "note-1"),
			"note-2": toItem({ kind: "note" }, "note-2"),
		});

		const summary: NoteSelectionSummary = buildNoteSelectionSummary(lookup, [
			"note-2",
			"note-1",
		]);

		expect(summary.color).toBe("#FEFF68");
		expect(summary.signature).toBe("note-2:#FEFF68|note-1:#ffe4a7");
	});
});
