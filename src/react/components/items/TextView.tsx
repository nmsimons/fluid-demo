import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { TextBlock } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";
import { HeadlessQuillEditor } from "./HeadlessQuillEditor.js";

export function TextView(props: { text: TextBlock; widthOverride?: number }): JSX.Element {
	const { text, widthOverride } = props;
	useTree(text);
	const width = widthOverride ?? text.width;
	const containerRef = useRef<HTMLDivElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [isEditing, setIsEditing] = useState(false);

	// Auto-resize: observe the Quill editor content height so the
	// container grows/shrinks like the old textarea did.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const editor = el.querySelector(".ql-editor") as HTMLElement | null;
		if (!editor) return;
		const ro = new ResizeObserver(() => {
			// The container should fit the editor content naturally
		});
		ro.observe(editor);
		return () => ro.disconnect();
	}, []);

	// When entering editing mode, focus the Quill contenteditable.
	const focusEditor = useCallback(() => {
		const editor = wrapperRef.current?.querySelector(".ql-editor");
		if (editor instanceof HTMLElement) editor.focus();
	}, []);

	const handleWrapperFocus = useCallback(
		(e: React.FocusEvent<HTMLDivElement>) => {
			// Only transition when focus lands on the wrapper itself
			// (i.e. from ItemView's focusEditableElement), not from a Quill child.
			if (e.target === e.currentTarget && !isEditing) {
				setIsEditing(true);
				requestAnimationFrame(focusEditor);
			}
		},
		[isEditing, focusEditor]
	);

	const exitEditing = useCallback(() => {
		setIsEditing(false);
		// Clear any text selection inside the Quill editor
		const editor = wrapperRef.current?.querySelector(".ql-editor");
		if (editor instanceof HTMLElement) {
			editor.blur();
		}
		window.getSelection()?.removeAllRanges();
	}, []);

	const handleWrapperBlur = useCallback(
		(e: React.FocusEvent<HTMLDivElement>) => {
			if (!e.relatedTarget) {
				exitEditing();
			}
		},
		[exitEditing]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				exitEditing();
			}
		},
		[exitEditing]
	);

	const textDecoration = [
		text.underline ? "underline" : "",
		text.strikethrough ? "line-through" : "",
	]
		.filter(Boolean)
		.join(" ")
		.trim();

	return (
		<div
			className="text-item-container"
			ref={containerRef}
			style={{
				width: `${width}px`,
				minWidth: `${width}px`,
				...(text.cardStyle
					? {
							backgroundColor: "white",
							borderRadius: "8px",
							boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
							padding: "12px",
							border: "3px solid #4b5563",
						}
					: {}),
			}}
		>
			<div
				className="text-item-quill-wrapper"
				ref={wrapperRef}
				data-item-editable
				tabIndex={-1}
				style={{
					textDecoration: textDecoration || undefined,
					position: "relative",
				}}
				onFocus={handleWrapperFocus}
				onBlur={handleWrapperBlur}
				onKeyDown={handleKeyDown}
				onPointerDown={isEditing ? (e) => e.stopPropagation() : undefined}
				onMouseDown={isEditing ? (e) => e.stopPropagation() : undefined}
			>
				<HeadlessQuillEditor
					textContent={text.textContent}
					fontSize={text.fontSize}
					textAlign={
						(text.textAlign as "left" | "center" | "right" | undefined) ?? "left"
					}
					color={text.color || "#111827"}
				/>
				{/* Transparent overlay blocks Quill from capturing focus until
				    ItemView grants it — enables click-to-drag before editing. */}
				{!isEditing && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							zIndex: 10,
							cursor: "grab",
						}}
					/>
				)}
			</div>
		</div>
	);
}
