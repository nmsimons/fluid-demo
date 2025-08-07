// A react component for displaying and interacting with notes using the Fluid Framework
// Note object

import React from "react";
import { Note } from "../schema/app_schema.js";
import { ensureRuns, getPlainText, deleteRange, insertText } from "../utils/textRuns.js";
import { useContext, useEffect, useRef, useState } from "react";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { NoteCursorState } from "../utils/presence/Interfaces/CursorManager.js";
import { userColorFromId, userColorSelectionBg } from "../utils/presence/colors.js";
import { Textarea } from "@fluentui/react-textarea";
import { useTree } from "./hooks/useTree.js";

export function NoteView(props: { note: Note }): JSX.Element {
	const { note } = props;

	useTree(note);

	return (
		<div
			className="flex items-center justify-center shadow-md"
			style={{
				width: "200px",
				height: "200px",
			}}
		>
			<NoteText {...props} />
		</div>
	);
}

export function NoteText(props: { note: Note }): JSX.Element {
	const { note } = props;

	useTree(note);
	const presence = useContext(PresenceContext);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const [remotes, setRemotes] = useState<NoteCursorState[]>([]);

	// Subscribe to remote cursor updates
	useEffect(() => {
		if (!presence?.cursor) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cursorAny: any = presence.cursor;
		const handler = () => {
			const list: (NoteCursorState & { _userId?: string })[] = [];
			try {
				for (const r of cursorAny.state.getRemotes()) {
					if (r.value && r.value.noteId === note.id) {
						const val = r.value as NoteCursorState & { _userId?: string };
						val._userId = r.attendee?.attendeeId;
						list.push(val);
					}
				}
			} catch {
				/* noop */
			}
			setRemotes(list);
		};
		cursorAny.events.on("remoteUpdated", handler);
		cursorAny.events.on("remoteJoined", handler);
		cursorAny.events.on("remoteLeft", handler);
		// initial population
		handler();
		return () => {
			cursorAny.events.off("remoteUpdated", handler);
			cursorAny.events.off("remoteJoined", handler);
			cursorAny.events.off("remoteLeft", handler);
		};
	}, [presence?.cursor, note.id]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		// Naive diff for MVP: replace entire content
		const newValue = e.target.value;
		ensureRuns(note);
		// Delete everything then insert
		const current = getPlainText(note);
		if (current !== newValue) {
			deleteRange(note, 0, current.length);
			if (newValue.length) insertText(note, 0, newValue);
			// Keep legacy text field in sync
			note.text = newValue;
		}
	};

	const reportSelection = () => {
		if (!presence?.cursor || !textareaRef.current) return;
		const el = textareaRef.current;
		presence.cursor.setCursor({
			noteId: note.id,
			start: el.selectionStart ?? 0,
			end: el.selectionEnd ?? 0,
		});
	};

	return (
		<div className="relative w-full h-full">
			<Textarea
				ref={textareaRef}
				className="w-full h-full"
				rows={4}
				value={getPlainText(note)}
				onChange={handleChange}
				onSelect={reportSelection}
				onKeyUp={reportSelection}
				onClick={reportSelection}
				placeholder="Type your note here..."
				appearance="filled-lighter"
				size="large"
				style={{ resize: "none", backgroundColor: "#feff68" }}
			/>
			{/* Remote cursors basic overlay */}
			{remotes.map((c, i) => {
				if (!textareaRef.current) return null;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const uid = (c as any)._userId || c.noteId;
				const color = userColorFromId(uid);
				const selBg = userColorSelectionBg(uid);
				const caret = computeCaretCoordinates(textareaRef.current, c.start);
				const caretEnd =
					c.end > c.start ? computeCaretCoordinates(textareaRef.current, c.end) : caret;
				const isSameLine = caret.top === caretEnd.top;
				const lineHeight = caret.height;
				const highlightRects: {
					left: number;
					top: number;
					width: number;
					height: number;
				}[] = [];
				if (c.end > c.start) {
					if (isSameLine) {
						highlightRects.push({
							left: caret.left,
							top: caret.top,
							width: Math.max(2, caretEnd.left - caret.left),
							height: lineHeight,
						});
					} else {
						// Start line partial
						highlightRects.push({
							left: caret.left,
							top: caret.top,
							width:
								textareaRef.current.clientWidth -
								caret.left -
								innerPadding(textareaRef.current).right,
							height: lineHeight,
						});
						// Middle full lines approximation (skip for perf if too large)
						const linesBetween = Math.max(
							0,
							Math.round((caretEnd.top - caret.top) / lineHeight) - 1
						);
						const pad = innerPadding(textareaRef.current);
						for (let l = 0; l < Math.min(linesBetween, 20); l++) {
							highlightRects.push({
								left: pad.left,
								top: caret.top + lineHeight * (l + 1),
								width: textareaRef.current.clientWidth - pad.left - pad.right,
								height: lineHeight,
							});
						}
						// End line partial
						highlightRects.push({
							left: innerPadding(textareaRef.current).left,
							top: caretEnd.top,
							width: Math.max(
								2,
								caretEnd.left - innerPadding(textareaRef.current).left
							),
							height: lineHeight,
						});
					}
				}
				return (
					<React.Fragment key={i}>
						{highlightRects.map((r, idx) => (
							<div
								key={idx}
								className="absolute pointer-events-none opacity-30"
								style={{
									background: selBg,
									left: r.left,
									top: r.top,
									width: r.width,
									height: r.height,
									borderRadius: 2,
								}}
							/>
						))}
						{/* Caret */}
						<div
							className="absolute pointer-events-none"
							style={{
								background: color,
								left: caret.left,
								top: caret.top,
								width: 2,
								height: caret.height,
								borderRadius: 1,
							}}
						/>
					</React.Fragment>
				);
			})}
		</div>
	);
}

// shared color utilities imported from presence/colors

// Get inner padding of textarea for accurate width adjustments
function innerPadding(el: HTMLTextAreaElement) {
	const style = getComputedStyle(el);
	return {
		left: parseFloat(style.paddingLeft) || 0,
		right: parseFloat(style.paddingRight) || 0,
	};
}

// Compute caret pixel coordinates using a hidden mirror div replicating wrapping.
function computeCaretCoordinates(textarea: HTMLTextAreaElement, pos: number) {
	const text = textarea.value;
	pos = Math.min(Math.max(0, pos), text.length);
	const mirrorId = "textarea-mirror-measure";
	let mirror = document.getElementById(mirrorId) as HTMLDivElement | null;
	if (!mirror) {
		mirror = document.createElement("div");
		mirror.id = mirrorId;
		mirror.style.position = "absolute";
		mirror.style.visibility = "hidden";
		mirror.style.whiteSpace = "pre-wrap";
		mirror.style.wordWrap = "break-word";
		mirror.style.overflow = "hidden";
		document.body.appendChild(mirror);
	}
	const taRect = textarea.getBoundingClientRect();
	const style = getComputedStyle(textarea);
	const props = [
		"fontFamily",
		"fontSize",
		"fontWeight",
		"fontStyle",
		"letterSpacing",
		"textTransform",
		"textAlign",
		"lineHeight",
		"paddingTop",
		"paddingRight",
		"paddingBottom",
		"paddingLeft",
		"borderTopWidth",
		"borderRightWidth",
		"borderBottomWidth",
		"borderLeftWidth",
	];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	for (const p of props) (mirror.style as any)[p] = (style as any)[p];
	mirror.style.boxSizing = style.boxSizing;
	mirror.style.width = textarea.clientWidth + "px";
	mirror.style.left = taRect.left + window.scrollX + "px";
	mirror.style.top = taRect.top + window.scrollY + "px";
	const before = text.slice(0, pos).replace(/\n$/g, "\n ");
	const target = text.slice(pos, pos + 1) || " ";
	const esc = (s: string) =>
		s
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\n/g, "<br/>")
			.replace(/ {2}/g, "&nbsp; ");
	mirror.innerHTML = esc(before) + '<span id="caret-measure">' + esc(target) + "</span>";
	const span = document.getElementById("caret-measure") as HTMLSpanElement;
	const rect = span.getBoundingClientRect();
	// rect relative to viewport; convert to textarea client coordinates (content box)
	const left = rect.left - taRect.left - textarea.clientLeft - textarea.scrollLeft;
	const top = rect.top - taRect.top - textarea.clientTop - textarea.scrollTop;
	const lineHeight = span.offsetHeight || parseFloat(style.lineHeight) || 16;
	return { left, top, height: lineHeight };
}
