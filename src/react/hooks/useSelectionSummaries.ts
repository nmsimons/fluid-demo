import { useMemo } from "react";
import { TreeView } from "fluid-framework";
import { App } from "../../schema/appSchema.js";
import { findItemById } from "../../utils/itemsHelpers.js";
import { isShape, isText, isNote } from "../../utils/contentHandlers.js";
import { TEXT_DEFAULT_COLOR, TEXT_DEFAULT_FONT_SIZE } from "../../constants/text.js";
import { DEFAULT_NOTE_COLOR, type NoteColor } from "../../constants/note.js";

interface ShapeSelectionSummary {
	color: string | null;
	filled: boolean | null;
	signature: string;
}

interface TextSelectionSummary {
	color: string | null;
	fontSize: number | null;
	bold: boolean | null;
	italic: boolean | null;
	underline: boolean | null;
	strikethrough: boolean | null;
	cardStyle: boolean | null;
	textAlign: string | null;
	signature: string;
}

interface NoteSelectionSummary {
	color: NoteColor | null;
	signature: string;
}

function buildSignature(parts: string[]): string {
	return parts.join("|") || "";
}

export function useShapeSelectionSummary(
	view: TreeView<typeof App>,
	selectedItemIds: string[],
	itemsVersion: number | symbol
): ShapeSelectionSummary {
	return useMemo(() => {
		let firstColor: string | null = null;
		let firstFilled: boolean | null = null;
		const signatureParts: string[] = [];

		for (const id of selectedItemIds) {
			const item = findItemById(view.root.items, id);
			if (!item) {
				signatureParts.push(id);
				continue;
			}
			if (isShape(item)) {
				const shape = item.content;
				const filled = shape.filled !== false;
				signatureParts.push(`${id}:${shape.color}:${filled ? "1" : "0"}`);
				if (firstColor === null) {
					firstColor = shape.color;
					firstFilled = filled;
				}
			} else {
				signatureParts.push(id);
			}
		}

		return {
			color: firstColor,
			filled: firstFilled,
			signature: buildSignature(signatureParts),
		};
	}, [view, itemsVersion, selectedItemIds]);
}

export function useTextSelectionSummary(
	view: TreeView<typeof App>,
	selectedItemIds: string[],
	itemsVersion: number | symbol
): TextSelectionSummary {
	return useMemo(() => {
		let firstColor: string | null = null;
		let firstFontSize: number | null = null;
		let firstBold: boolean | null = null;
		let firstItalic: boolean | null = null;
		let firstUnderline: boolean | null = null;
		let firstStrikethrough: boolean | null = null;
		let firstCardStyle: boolean | null = null;
		let firstTextAlign: string | null = null;
		const signatureParts: string[] = [];

		for (const id of selectedItemIds) {
			const item = findItemById(view.root.items, id);
			if (!item) {
				signatureParts.push(id);
				continue;
			}
			if (isText(item)) {
				const text = item.content;
				const color = text.color ?? TEXT_DEFAULT_COLOR;
				const fontSize = text.fontSize ?? TEXT_DEFAULT_FONT_SIZE;
				const bold = text.bold === true;
				const italic = text.italic === true;
				const underline = text.underline === true;
				const strikethrough = text.strikethrough === true;
				const cardStyle = text.cardStyle === true;
				const textAlignVal = text.textAlign ?? "left";
				signatureParts.push(
					`${id}:${color}:${fontSize}:${bold ? 1 : 0}:${italic ? 1 : 0}:${underline ? 1 : 0}:${strikethrough ? 1 : 0}:${cardStyle ? 1 : 0}:${textAlignVal}`
				);
				if (firstColor === null) {
					firstColor = color;
					firstFontSize = fontSize;
					firstBold = bold;
					firstItalic = italic;
					firstUnderline = underline;
					firstStrikethrough = strikethrough;
					firstCardStyle = cardStyle;
					firstTextAlign = textAlignVal;
				}
			} else {
				signatureParts.push(id);
			}
		}

		return {
			color: firstColor,
			fontSize: firstFontSize,
			bold: firstBold,
			italic: firstItalic,
			underline: firstUnderline,
			strikethrough: firstStrikethrough,
			cardStyle: firstCardStyle,
			textAlign: firstTextAlign,
			signature: buildSignature(signatureParts),
		};
	}, [view, itemsVersion, selectedItemIds]);
}

export function useNoteSelectionSummary(
	view: TreeView<typeof App>,
	selectedItemIds: string[],
	itemsVersion: number | symbol
): NoteSelectionSummary {
	return useMemo(() => {
		let firstColor: NoteColor | null = null;
		const signatureParts: string[] = [];

		for (const id of selectedItemIds) {
			const item = findItemById(view.root.items, id);
			if (!item) {
				signatureParts.push(id);
				continue;
			}
			if (isNote(item)) {
				const color = (item.content.color ?? DEFAULT_NOTE_COLOR) as NoteColor;
				signatureParts.push(`${id}:${color}`);
				if (firstColor === null) {
					firstColor = color;
				}
			} else {
				signatureParts.push(id);
			}
		}

		return {
			color: firstColor,
			signature: buildSignature(signatureParts),
		};
	}, [view, itemsVersion, selectedItemIds]);
}
