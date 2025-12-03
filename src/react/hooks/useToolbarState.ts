/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * useToolbarState Hook
 *
 * Consolidates all toolbar-related state management into a single hook.
 * This includes ink tools, shape properties, note colors, and text formatting.
 * The hook also handles syncing toolbar state with selection summaries.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ShapeType } from "../components/toolbar/buttons/CreationButtons.js";
import { TEXT_DEFAULT_COLOR, TEXT_DEFAULT_FONT_SIZE } from "../../constants/text.js";
import { DEFAULT_NOTE_COLOR, type NoteColor } from "../../constants/note.js";
import type {
	ShapeSelectionSummary,
	TextSelectionSummary,
	NoteSelectionSummary,
} from "./useSelectionSummaries.js";

/**
 * State for ink-related tools.
 */
export interface InkToolState {
	inkActive: boolean;
	eraserActive: boolean;
	inkColor: string;
	inkWidth: number;
}

/**
 * State for shape creation and editing.
 */
export interface ShapeToolState {
	shapeColor: string;
	shapeFilled: boolean;
	currentShapeType: ShapeType;
}

/**
 * State for note creation and editing.
 */
export interface NoteToolState {
	noteColor: NoteColor;
}

/**
 * State for text formatting.
 */
export interface TextToolState {
	textColor: string;
	textFontSize: number;
	textBold: boolean;
	textItalic: boolean;
	textUnderline: boolean;
	textStrikethrough: boolean;
	textCardStyle: boolean;
	textAlign: string;
}

/**
 * Combined toolbar state.
 */
export interface ToolbarState extends InkToolState, ShapeToolState, NoteToolState, TextToolState {}

/**
 * Actions for modifying ink tool state.
 */
export interface InkToolActions {
	setInkActive: (active: boolean) => void;
	toggleInk: () => void;
	setEraserActive: (active: boolean) => void;
	toggleEraser: () => void;
	setInkColor: (color: string) => void;
	setInkWidth: (width: number) => void;
}

/**
 * Actions for modifying shape tool state.
 */
export interface ShapeToolActions {
	setShapeColor: (color: string) => void;
	setShapeFilled: (filled: boolean) => void;
	setCurrentShapeType: (type: ShapeType) => void;
}

/**
 * Actions for modifying note tool state.
 */
export interface NoteToolActions {
	setNoteColor: (color: NoteColor) => void;
}

/**
 * Actions for modifying text tool state.
 */
export interface TextToolActions {
	setTextColor: (color: string) => void;
	setTextFontSize: (size: number) => void;
	setTextBold: (bold: boolean) => void;
	setTextItalic: (italic: boolean) => void;
	setTextUnderline: (underline: boolean) => void;
	setTextStrikethrough: (strikethrough: boolean) => void;
	setTextCardStyle: (cardStyle: boolean) => void;
	setTextAlign: (align: string) => void;
}

/**
 * Combined toolbar actions.
 */
export interface ToolbarActions
	extends InkToolActions,
		ShapeToolActions,
		NoteToolActions,
		TextToolActions {}

/**
 * Selection summaries used to sync toolbar state with current selection.
 */
export interface SelectionSummaries {
	shapeSummary: ShapeSelectionSummary;
	textSummary: TextSelectionSummary;
	noteSummary: NoteSelectionSummary;
}

/**
 * Return type for the useToolbarState hook.
 */
export interface UseToolbarStateReturn {
	state: ToolbarState;
	actions: ToolbarActions;
}

/**
 * Custom hook that manages all toolbar-related state.
 *
 * Features:
 * - Consolidates 18 individual useState calls into organized state groups
 * - Automatically syncs toolbar state with selection summaries
 * - Provides typed actions for all state modifications
 * - Memoizes actions to prevent unnecessary re-renders
 *
 * @param summaries - Selection summaries for syncing toolbar state
 * @returns Object containing state and actions
 */
export function useToolbarState(summaries: SelectionSummaries): UseToolbarStateReturn {
	const { shapeSummary, textSummary, noteSummary } = summaries;

	// Ink tool state
	const [inkActive, setInkActive] = useState(false);
	const [eraserActive, setEraserActive] = useState(false);
	const [inkColor, setInkColor] = useState<string>("#2563eb");
	const [inkWidth, setInkWidth] = useState<number>(4);

	// Shape tool state
	const [shapeColor, setShapeColor] = useState<string>("#FF0000");
	const [shapeFilled, setShapeFilled] = useState<boolean>(true);
	const [currentShapeType, setCurrentShapeType] = useState<ShapeType>("circle");

	// Note tool state
	const [noteColor, setNoteColor] = useState<NoteColor>(DEFAULT_NOTE_COLOR);

	// Text tool state
	const [textColor, setTextColor] = useState<string>(TEXT_DEFAULT_COLOR);
	const [textFontSize, setTextFontSize] = useState<number>(TEXT_DEFAULT_FONT_SIZE);
	const [textBold, setTextBold] = useState<boolean>(false);
	const [textItalic, setTextItalic] = useState<boolean>(false);
	const [textUnderline, setTextUnderline] = useState<boolean>(false);
	const [textStrikethrough, setTextStrikethrough] = useState<boolean>(false);
	const [textCardStyle, setTextCardStyle] = useState<boolean>(true);
	const [textAlign, setTextAlign] = useState<string>("center");

	// Sync shape state with selection summary
	useEffect(() => {
		if (shapeSummary.color !== null && shapeSummary.color !== shapeColor) {
			setShapeColor(shapeSummary.color);
		}
		if (shapeSummary.filled !== null && shapeSummary.filled !== shapeFilled) {
			setShapeFilled(shapeSummary.filled);
		}
	}, [shapeSummary, shapeColor, shapeFilled]);

	// Sync note state with selection summary
	useEffect(() => {
		if (noteSummary.color !== null && noteSummary.color !== noteColor) {
			setNoteColor(noteSummary.color);
		}
	}, [noteSummary, noteColor]);

	// Sync text state with selection summary
	useEffect(() => {
		if (textSummary.color !== null && textSummary.color !== textColor) {
			setTextColor(textSummary.color);
		}
		if (textSummary.fontSize !== null && textSummary.fontSize !== textFontSize) {
			setTextFontSize(textSummary.fontSize);
		}
		if (textSummary.bold !== null && textSummary.bold !== textBold) {
			setTextBold(textSummary.bold);
		}
		if (textSummary.italic !== null && textSummary.italic !== textItalic) {
			setTextItalic(textSummary.italic);
		}
		if (textSummary.underline !== null && textSummary.underline !== textUnderline) {
			setTextUnderline(textSummary.underline);
		}
		if (textSummary.strikethrough !== null && textSummary.strikethrough !== textStrikethrough) {
			setTextStrikethrough(textSummary.strikethrough);
		}
		if (textSummary.cardStyle !== null && textSummary.cardStyle !== textCardStyle) {
			setTextCardStyle(textSummary.cardStyle);
		}
		if (textSummary.textAlign !== null && textSummary.textAlign !== textAlign) {
			setTextAlign(textSummary.textAlign);
		}
	}, [
		textSummary,
		textColor,
		textFontSize,
		textBold,
		textItalic,
		textUnderline,
		textStrikethrough,
		textCardStyle,
		textAlign,
	]);

	// Memoized toggle functions
	const toggleInk = useCallback(() => setInkActive((a) => !a), []);
	const toggleEraser = useCallback(() => setEraserActive((a) => !a), []);

	// Combine state into a single object
	const state: ToolbarState = useMemo(
		() => ({
			inkActive,
			eraserActive,
			inkColor,
			inkWidth,
			shapeColor,
			shapeFilled,
			currentShapeType,
			noteColor,
			textColor,
			textFontSize,
			textBold,
			textItalic,
			textUnderline,
			textStrikethrough,
			textCardStyle,
			textAlign,
		}),
		[
			inkActive,
			eraserActive,
			inkColor,
			inkWidth,
			shapeColor,
			shapeFilled,
			currentShapeType,
			noteColor,
			textColor,
			textFontSize,
			textBold,
			textItalic,
			textUnderline,
			textStrikethrough,
			textCardStyle,
			textAlign,
		]
	);

	// Combine actions into a single object
	const actions: ToolbarActions = useMemo(
		() => ({
			setInkActive,
			toggleInk,
			setEraserActive,
			toggleEraser,
			setInkColor,
			setInkWidth,
			setShapeColor,
			setShapeFilled,
			setCurrentShapeType,
			setNoteColor,
			setTextColor,
			setTextFontSize,
			setTextBold,
			setTextItalic,
			setTextUnderline,
			setTextStrikethrough,
			setTextCardStyle,
			setTextAlign,
		}),
		[toggleInk, toggleEraser]
	);

	return { state, actions };
}
