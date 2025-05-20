// A react component for displaying and interacting with notes using the Fluid Framework
// Note object

import React from "react";
import { Note } from "../schema/app_schema.js";
import { Textarea } from "@fluentui/react-components";
import { useTree } from "./useTree.js";

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

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		note.text = e.target.value;
	};

	return (
		<Textarea
			className="w-full h-full"
			rows={4}
			value={note.text}
			onChange={handleChange}
			placeholder="Type your note here..."
			appearance="filled-lighter"
			size="large"
			style={{ resize: "none", backgroundColor: "#feff68" }}
		/>
	);
}
