/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import { Tree } from "@fluidframework/tree";
import {
	Menu,
	MenuTrigger,
	MenuPopover,
	MenuList,
	MenuButton,
	Tooltip,
} from "@fluentui/react-components";
import { ColorPicker } from "./ShapeButtons.js";
import { NOTE_COLORS, type NoteColor } from "../../../../constants/note.js";
import { Note } from "../../../../schema/appSchema.js";

export function NoteColorPicker(props: {
	color: NoteColor;
	onColorChange: (color: NoteColor) => void;
	selectedNotes?: Note[];
}): JSX.Element {
	const { color, onColorChange, selectedNotes = [] } = props;

	const handleColorChange = (newColor: string) => {
		if (!NOTE_COLORS.includes(newColor as NoteColor)) {
			return;
		}
		const typedColor = newColor as NoteColor;
		onColorChange(typedColor);

		if (selectedNotes.length === 0) {
			return;
		}

		// Apply the chosen color to all selected notes inside a single transaction.
		Tree.runTransaction(selectedNotes[0], () => {
			selectedNotes.forEach((note) => {
				note.color = typedColor;
			});
		});
	};

	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<Tooltip content="Note Color" relationship="label">
					<MenuButton appearance="subtle" style={{ minWidth: 0, paddingInline: 6 }}>
						<span
							aria-hidden
							style={{
								display: "inline-block",
								width: "18px",
								height: "18px",
								borderRadius: "6px",
								border: "1px solid rgba(15, 23, 42, 0.25)",
								backgroundColor: color,
							}}
						/>
					</MenuButton>
				</Tooltip>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<ColorPicker
						label="Note Color"
						ariaLabel="Note color picker"
						selected={color}
						setColor={handleColorChange}
						columnCount={NOTE_COLORS.length}
						layout="row"
						swatches={NOTE_COLORS.map((value) => ({
							value,
							color: value,
							borderColor: "#1f2937",
						}))}
					/>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
}
