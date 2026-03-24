import React, { JSX, useEffect, useRef } from "react";
import { TextBlock } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";
import { HeadlessQuillEditor } from "./HeadlessQuillEditor.js";

export function TextView(props: { text: TextBlock; widthOverride?: number }): JSX.Element {
	const { text, widthOverride } = props;
	useTree(text);
	const width = widthOverride ?? text.width;
	const containerRef = useRef<HTMLDivElement>(null);

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
				data-item-editable
				style={{
					textDecoration: textDecoration || undefined,
				}}
				onPointerDown={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<HeadlessQuillEditor
					textContent={text.textContent}
					fontSize={text.fontSize}
					textAlign={(text.textAlign as "left" | "center" | "right" | undefined) ?? "left"}
					color={text.color || "#111827"}
				/>
			</div>
		</div>
	);
}
