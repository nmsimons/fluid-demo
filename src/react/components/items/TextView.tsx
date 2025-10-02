import React, { useCallback, useEffect, useRef } from "react";
import { TextBlock } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";

export function TextView(props: { text: TextBlock; widthOverride?: number }): JSX.Element {
	const { text, widthOverride } = props;
	useTree(text);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const width = widthOverride ?? text.width;

	const updateHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		const minHeight = text.fontSize * 1.2 + 8;
		el.style.minHeight = `${minHeight}px`;
		el.style.height = "auto";
		el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
	}, [text.fontSize]);

	useEffect(() => {
		updateHeight();
	}, [
		updateHeight,
		text.text,
		text.width,
		widthOverride,
		text.fontSize,
		text.bold,
		text.italic,
		text.underline,
		text.strikethrough,
	]);

	useEffect(() => {
		updateHeight();
	}, []);

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
			style={{
				width: `${width}px`,
				minWidth: `${width}px`,
			}}
		>
			<textarea
				rows={1}
				ref={textareaRef}
				value={text.text}
				onChange={(e) => {
					if (text.text !== e.target.value) {
						text.text = e.target.value;
					}
				}}
				onInput={updateHeight}
				className="text-item-textarea"
				spellCheck
				style={{
					width: "100%",
					boxSizing: "border-box",
					color: text.color,
					backgroundColor: "yellow",
					borderRadius: 0,
					padding: 0,
					fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
					fontSize: `${text.fontSize}px`,
					fontWeight: text.bold ? 700 : 400,
					fontStyle: text.italic ? "italic" : "normal",
					textDecoration: textDecoration || "none",
					lineHeight: 1.4,
					resize: "none",
					overflow: "hidden",
					outline: "none",
					backgroundClip: "border-box",
					boxShadow: "none",
				}}
			/>
		</div>
	);
}
