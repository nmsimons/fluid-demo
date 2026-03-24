/**
 * Headless Quill editor that syncs with FormattedTextAsTree.
 *
 * Renders Quill without any toolbar or theme chrome so it looks
 * like a plain contenteditable area.  The bi-directional sync
 * between Quill and the SharedTree is ported from the
 * FluidFramework `FormattedTextEditorView` implementation.
 */

import React, { useEffect, useRef, JSX, useContext } from "react";
import Quill from "quill";
import DeltaPackage from "quill-delta";
// eslint-disable-next-line import/no-unassigned-import, import/no-internal-modules
import "quill/dist/quill.core.css";
// eslint-disable-next-line import/no-internal-modules
import { Tree, TreeAlpha, FormattedTextAsTree } from "@fluidframework/tree/internal";
import { useTextEditorContext } from "../../contexts/TextEditorContext.js";

// quill-delta ships a default export wrapper
const Delta = (DeltaPackage as unknown as { default: typeof DeltaPackage }).default ?? DeltaPackage;

/* ------------------------------------------------------------------ */
/*  Register a custom Quill Size attributor that uses inline styles   */
/*  with arbitrary pixel values (the default only handles named       */
/*  sizes: small/large/huge).                                         */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Parchment = Quill.import("parchment") as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SizeStyle = new Parchment.StyleAttributor("size", "font-size", {
	scope: Parchment.Scope.INLINE,
});
Quill.register(SizeStyle, true);

/* ------------------------------------------------------------------ */
/*  Size helpers — always use numeric px values                       */
/* ------------------------------------------------------------------ */
const defaultSize = 12;
const defaultFont = "Arial";

function parseSize(size: unknown): number {
	if (typeof size === "number") return size;
	if (typeof size === "string") {
		const parsed = Number.parseFloat(size);
		if (!Number.isNaN(parsed)) return Math.round(parsed);
	}
	return defaultSize;
}

/* ------------------------------------------------------------------ */
/*  Quill ↔ Tree attribute conversions                                */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function quillAttributesToFormat(attributes?: Record<string, any>) {
	return {
		bold: attributes?.bold === true,
		italic: attributes?.italic === true,
		underline: attributes?.underline === true,
		size: parseSize(attributes?.size),
		font: typeof attributes?.font === "string" ? attributes.font : defaultFont,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function quillAttributesToPartial(attributes?: Record<string, any>): Partial<FormattedTextAsTree.CharacterFormat> {
	if (!attributes) return {};
	const format: Record<string, unknown> = {};
	if ("bold" in attributes) format.bold = attributes.bold === true;
	if ("italic" in attributes) format.italic = attributes.italic === true;
	if ("underline" in attributes) format.underline = attributes.underline === true;
	if ("size" in attributes) format.size = parseSize(attributes.size);
	if ("font" in attributes) format.font = typeof attributes.font === "string" ? attributes.font : defaultFont;
	return format as Partial<FormattedTextAsTree.CharacterFormat>;
}

function formatToQuillAttributes(format: FormattedTextAsTree.CharacterFormat): Record<string, unknown> {
	const attributes: Record<string, unknown> = {};
	if (format.bold) attributes.bold = true;
	if (format.italic) attributes.italic = true;
	if (format.underline) attributes.underline = true;
	if (format.size !== defaultSize) {
		attributes.size = `${format.size}px`;
	}
	if (format.font !== defaultFont) attributes.font = format.font;
	return attributes;
}

/* ------------------------------------------------------------------ */
/*  Line tag helpers                                                  */
/* ------------------------------------------------------------------ */
const headerToLineTag: Record<number, string> = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5" };
const lineTagToQuillAttributes: Record<string, Record<string, unknown>> = {
	h1: { header: 1 }, h2: { header: 2 }, h3: { header: 3 },
	h4: { header: 4 }, h5: { header: 5 }, li: { list: "bullet" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLineTag(attributes?: Record<string, any>) {
	if (!attributes) return undefined;
	if (typeof attributes.header === "number") {
		const tag = headerToLineTag[attributes.header] ?? "h5" as const;
		return FormattedTextAsTree.LineTag(tag as "h1" | "h2" | "h3" | "h4" | "h5");
	}
	if (attributes.list === "bullet") return FormattedTextAsTree.LineTag("li");
	return undefined;
}

function createLineAtom(lineTag: ReturnType<typeof FormattedTextAsTree.LineTag>) {
	return new FormattedTextAsTree.StringAtom({
		content: new FormattedTextAsTree.StringLineAtom({ tag: lineTag }),
		format: new FormattedTextAsTree.CharacterFormat(quillAttributesToFormat()),
	});
}

/* ------------------------------------------------------------------ */
/*  Build a Quill delta from the tree (tree → Quill)                  */
/* ------------------------------------------------------------------ */
function buildDeltaFromTree(root: FormattedTextAsTree.Tree) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ops: any[] = [];
	let text = "";
	let previousAttributes: Record<string, unknown> = {};
	let key = "";

	const pushRun = () => {
		if (!text) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const op: any = { insert: text };
		if (Object.keys(previousAttributes).length > 0) op.attributes = previousAttributes;
		ops.push(op);
	};

	for (const atom of root.charactersWithFormatting()) {
		const currentAttributes = formatToQuillAttributes(atom.format);
		if (atom.content instanceof FormattedTextAsTree.StringLineAtom) {
			const lineTag = atom.content.tag.value;
			Object.assign(currentAttributes, lineTagToQuillAttributes[lineTag]);
			pushRun();
			text = "";
			key = "";
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const op: any = { insert: "\n" };
			if (Object.keys(currentAttributes).length > 0) op.attributes = currentAttributes;
			ops.push(op);
		} else {
			const stringifiedAttributes = JSON.stringify(currentAttributes);
			if (stringifiedAttributes === key) {
				text += atom.content.content;
			} else {
				pushRun();
				text = atom.content.content;
				previousAttributes = currentAttributes;
				key = stringifiedAttributes;
			}
		}
	}
	pushRun();

	const last = ops[ops.length - 1];
	if (typeof last?.insert !== "string" || !last.insert.endsWith("\n")) {
		ops.push({ insert: "\n" });
	}
	return ops;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export interface HeadlessQuillEditorProps {
	textContent: FormattedTextAsTree.Tree;
	/** Default font size in px — used to style the Quill editor area. */
	fontSize?: number;
	/** Text alignment — applied to the Quill editor root. */
	textAlign?: "left" | "center" | "right";
	/** Text color — applied to the Quill editor root. */
	color?: string;
}

export function HeadlessQuillEditor({ textContent, fontSize, textAlign, color }: HeadlessQuillEditorProps): JSX.Element {
	const editorRef = useRef<HTMLDivElement>(null);
	const quillRef = useRef<Quill | null>(null);
	const isUpdating = useRef(false);
	const { setActive, clearActive } = useTextEditorContext();

	// Store textContent in a ref so the Quill callbacks always see
	// the latest tree node even if it changes between renders.
	const treeRef = useRef(textContent);
	treeRef.current = textContent;

	/* ---- Initialise Quill (once) ---- */
	useEffect(() => {
		if (!editorRef.current || quillRef.current) return;

		const quill = new Quill(editorRef.current, {
			// No theme → no toolbar, no chrome.  Just a contenteditable div.
			theme: false as unknown as string,
			placeholder: "",
			modules: {
				history: false,
				toolbar: false,
			},
		});

		// Set initial content from tree.
		quill.setContents(buildDeltaFromTree(treeRef.current));

		/* ---- Quill → Tree (local edits) ---- */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		quill.on("text-change", (delta: any, _oldDelta: any, source: string) => {
			if (source !== "user" || isUpdating.current) return;
			isUpdating.current = true;

			const root = treeRef.current;
			const branch = TreeAlpha.branch(root);
			const codepointCount = (s: string) => [...s].length;

			const applyDelta = () => {
				let content = root.fullString();
				let utf16Pos = 0;
				let cpPos = 0;

				for (const op of delta.ops) {
					if (op.retain !== undefined) {
						const retain = op.retain as number;
						const retainedStr = content.slice(utf16Pos, utf16Pos + retain);
						const cpCount = codepointCount(retainedStr);
						if (op.attributes) {
							const lineTag = parseLineTag(op.attributes);
							if (lineTag !== undefined && content[utf16Pos] === "\n") {
								root.removeRange(cpPos, cpPos + 1);
								root.insertWithFormattingAt(cpPos, [createLineAtom(lineTag)]);
							} else if (lineTag !== undefined && utf16Pos >= content.length) {
								root.insertWithFormattingAt(cpPos, [createLineAtom(lineTag)]);
								content += "\n";
							} else if (
								lineTag === undefined &&
								content[utf16Pos] === "\n" &&
								root.charactersWithFormatting()[cpPos]?.content instanceof
									FormattedTextAsTree.StringLineAtom
							) {
								root.removeRange(cpPos, cpPos + 1);
								root.insertAt(cpPos, "\n");
							} else {
								root.formatRange(cpPos, cpPos + cpCount, quillAttributesToPartial(op.attributes));
							}
						}
						utf16Pos += retain;
						cpPos += cpCount;
					} else if (op.delete !== undefined) {
						const deleted = op.delete as number;
						const deletedStr = content.slice(utf16Pos, utf16Pos + deleted);
						const cpCount = codepointCount(deletedStr);
						root.removeRange(cpPos, cpPos + cpCount);
						content = content.slice(0, utf16Pos) + content.slice(utf16Pos + deleted);
					} else if (typeof op.insert === "string") {
						const lineTag = parseLineTag(op.attributes);
						if (lineTag !== undefined && op.insert === "\n") {
							root.insertWithFormattingAt(cpPos, [createLineAtom(lineTag)]);
						} else {
							root.defaultFormat = new FormattedTextAsTree.CharacterFormat(
								quillAttributesToFormat(op.attributes),
							);
							root.insertAt(cpPos, op.insert);
						}
						content = content.slice(0, utf16Pos) + op.insert + content.slice(utf16Pos);
						utf16Pos += op.insert.length;
						cpPos += codepointCount(op.insert);
					}
				}
			};

			if (branch === undefined) {
				applyDelta();
			} else {
				branch.runTransaction(applyDelta);
			}
			isUpdating.current = false;
		});

		/* ---- Selection tracking → context ---- */
		quill.on("selection-change", (range: { index: number; length: number } | null) => {
			if (range) {
				const fmt = quill.getFormat(range.index, range.length);
				setActive(treeRef.current, quill, {
					bold: fmt.bold === true,
					italic: fmt.italic === true,
					underline: fmt.underline === true,
					size: fmt.size ? parseSize(fmt.size) : undefined,
				}, range);
			} else {
				clearActive();
			}
		});

		// Also update format state on text-change (cursor may not move but
		// format at cursor changes after typing).
		quill.on("text-change", () => {
			const range = quill.getSelection();
			if (range) {
				const fmt = quill.getFormat(range.index, range.length);
				setActive(treeRef.current, quill, {
					bold: fmt.bold === true,
					italic: fmt.italic === true,
					underline: fmt.underline === true,
					size: fmt.size ? parseSize(fmt.size) : undefined,
				}, range);
			}
		});

		quillRef.current = quill;

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* ---- Tree → Quill (remote / external changes) ---- */
	useEffect(() => {
		return Tree.on(treeRef.current, "treeChanged", () => {
			if (!quillRef.current || isUpdating.current) return;
			const treeDelta = buildDeltaFromTree(treeRef.current);
			const quillDelta = quillRef.current.getContents();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const diff = new (Delta as any)(quillDelta).diff(new (Delta as any)(treeDelta));
			if (diff.ops.length > 0) {
				isUpdating.current = true;
				quillRef.current.updateContents(diff.ops);
				isUpdating.current = false;
			}
		});
	}, [textContent]);

	/* ---- Sync dynamic styles to .ql-editor (fontSize, textAlign, color) ---- */
	useEffect(() => {
		const editor = quillRef.current?.root;
		if (editor) {
			editor.style.fontSize = `${fontSize ?? 16}px`;
			editor.style.textAlign = textAlign ?? "left";
			editor.style.color = color || "#111827";
		}
	}, [fontSize, textAlign, color]);

	return (
		<>
			<style>{`
				/* Strip all Quill visual chrome for headless mode */
				.headless-quill .ql-container {
					border: none !important;
					font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
					line-height: 1.4;
				}
				.headless-quill .ql-editor {
					padding: 0;
					outline: none;
					overflow: visible;
					min-height: 1.4em;
				}
				.headless-quill .ql-editor.ql-blank::before {
					font-style: normal;
					left: 0;
					right: 0;
				}
			`}</style>
			<div
				className="headless-quill"
				style={{
					color: color || "#111827",
					fontSize: `${fontSize ?? 16}px`,
					textAlign: textAlign ?? "left",
				}}
			>
				<div ref={editorRef} />
			</div>
		</>
	);
}
