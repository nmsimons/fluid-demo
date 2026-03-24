import React, { createContext, useContext, useCallback, useRef, useState } from "react";
// eslint-disable-next-line import/no-internal-modules
import { FormattedTextAsTree } from "@fluidframework/tree/internal";
import type Quill from "quill";

/**
 * Character-level format at the current Quill cursor / selection.
 * Only properties that have a single value across the selection are set;
 * mixed values are left undefined.
 */
export interface SelectionFormat {
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	size?: number;
}

/**
 * Tracks the currently focused headless Quill editor so the
 * external toolbar can apply formatting to the user's selection.
 *
 * Because clicking a toolbar button may blur the editor (clearing
 * the active Quill reference) before the handler runs, we keep a
 * "last known" tree + quill + selection that persists briefly after blur.
 */
export interface TextEditorContextValue {
	/** The FormattedTextAsTree node backing the focused editor, or null. */
	activeTree: FormattedTextAsTree.Tree | null;
	/** The Quill instance of the focused editor, or null. */
	activeQuill: Quill | null;
	/**
	 * The last known tree + quill. Survives blur long enough
	 * for toolbar handlers to consume it.
	 */
	lastTree: FormattedTextAsTree.Tree | null;
	lastQuill: Quill | null;
	/** Last known Quill selection range — survives blur for toolbar restore. */
	lastSelection: { index: number; length: number } | null;
	/** Character-level format at the current cursor / selection. */
	selectionFormat: SelectionFormat;
	/** Register focus: called by HeadlessQuillEditor on Quill selection-change. */
	setActive: (tree: FormattedTextAsTree.Tree, quill: Quill, format: SelectionFormat, range?: { index: number; length: number }) => void;
	/** Clear focus: called on blur. */
	clearActive: () => void;
}

const emptyFormat: SelectionFormat = {};

const TextEditorContext = createContext<TextEditorContextValue>({
	activeTree: null,
	activeQuill: null,
	lastTree: null,
	lastQuill: null,
	lastSelection: null,
	selectionFormat: emptyFormat,
	setActive: () => {},
	clearActive: () => {},
});

export function useTextEditorContext(): TextEditorContextValue {
	return useContext(TextEditorContext);
}

export function TextEditorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
	const [activeTree, setActiveTree] = useState<FormattedTextAsTree.Tree | null>(null);
	const [selectionFormat, setSelectionFormat] = useState<SelectionFormat>(emptyFormat);
	const quillRef = useRef<Quill | null>(null);
	const lastTreeRef = useRef<FormattedTextAsTree.Tree | null>(null);
	const lastQuillRef = useRef<Quill | null>(null);

	const lastSelectionRef = useRef<{ index: number; length: number } | null>(null);

	const setActive = useCallback((tree: FormattedTextAsTree.Tree, quill: Quill, format: SelectionFormat, range?: { index: number; length: number }) => {
		setActiveTree(tree);
		setSelectionFormat(format);
		quillRef.current = quill;
		lastTreeRef.current = tree;
		lastQuillRef.current = quill;
		if (range) lastSelectionRef.current = range;
	}, []);

	const clearActive = useCallback(() => {
		setActiveTree(null);
		quillRef.current = null;
		// Don't clear lastTreeRef/lastQuillRef or selectionFormat — they survive blur
	}, []);

	const value: TextEditorContextValue = {
		activeTree,
		activeQuill: quillRef.current,
		lastTree: lastTreeRef.current,
		lastQuill: lastQuillRef.current,
		lastSelection: lastSelectionRef.current,
		selectionFormat,
		setActive,
		clearActive,
	};

	return (
		<TextEditorContext.Provider value={value}>
			{children}
		</TextEditorContext.Provider>
	);
}
