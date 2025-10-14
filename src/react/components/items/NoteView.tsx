// A react component for displaying and interacting with notes using the Fluid Framework
// Note object

import React from "react";
import { Note } from "../../../schema/appSchema.js";
import { Textarea } from "@fluentui/react-textarea";
import { useTree } from "../../hooks/useTree.js";

const NOTE_DIMENSION_PX = 200;

export function NoteView(props: { note: Note }): JSX.Element {
	const { note } = props;

	useTree(note);

	return (
		<div
			className="shadow-md"
			style={{
				width: `${NOTE_DIMENSION_PX}px`,
				minHeight: `${NOTE_DIMENSION_PX}px`,
				height: "auto",
			}}
		>
			<NoteText {...props} />
		</div>
	);
}

export function NoteText(props: { note: Note }): JSX.Element {
	const { note } = props;

	useTree(note);

	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	const updateTextareaHeight = React.useCallback((element?: HTMLTextAreaElement | null) => {
		const target = element ?? textareaRef.current;
		if (!target) {
			return;
		}
		target.style.maxHeight = "none";
		target.style.height = "auto";
		target.style.height = `${Math.max(target.scrollHeight, NOTE_DIMENSION_PX)}px`;
	}, []);

	React.useLayoutEffect(() => {
		updateTextareaHeight();
	}, [note.text, updateTextareaHeight]);

	const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		note.text = event.target.value;
		updateTextareaHeight(event.target);
	};

	return (
		<Textarea
			id="msg"
			name="msg"
			className="w-full note-item-textarea"
			rows={4}
			value={note.text}
			onChange={handleChange}
			placeholder="Type your note here..."
			appearance="filled-lighter"
			size="large"
			style={{ width: "100%" }}
			textarea={{
				ref: textareaRef,
				style: {
					resize: "none",
					overflow: "hidden",
					backgroundColor: "#feff68",
					maxHeight: "none",
					minHeight: `${NOTE_DIMENSION_PX}px`,
				},
			}}
			autoComplete="off"
			data-item-editable
		/>
	);
}
