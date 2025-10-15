/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import {
	CircleRegular,
	SquareRegular,
	TriangleRegular,
	StarRegular,
	RectangleLandscapeRegular,
	NoteRegular,
	TableRegular,
} from "@fluentui/react-icons";
import {
	Menu,
	MenuTrigger,
	MenuPopover,
	SplitButton,
	Toolbar,
	Tooltip,
} from "@fluentui/react-components";
import { TooltipButton } from "../../forms/Button.js";
import { useTree } from "../../../hooks/useTree.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { Items } from "../../../../schema/appSchema.js";
import { centerLastItem } from "../../../../utils/centerItem.js";
import { createSchemaUser } from "../../../../utils/userUtils.js";
import { DEFAULT_NOTE_COLOR, type NoteColor } from "../../../../constants/note.js";

export const SHAPE_COLORS = [
	"#000000",
	"#FFFFFF",
	"#FF0000",
	"#33FF57",
	"#3357FF",
	"#FF33A1",
	"#A133FF",
	"#33FFF5",
	"#F5FF33",
	"#FF8C33",
];

// Shape / item creation buttons
export function NewCircleButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	shapeColor?: string;
	shapeFilled?: boolean;
}): JSX.Element {
	const { items, canvasSize, pan, zoom, shapeColor, shapeFilled } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				const currentUser = presence.users.getMyself().value;
				items.createShapeItem(
					"circle",
					canvasSize,
					colors,
					shapeFilled ?? true,
					createSchemaUser({ id: currentUser.id, name: currentUser.name })
				);
				centerLastItem(items, pan, zoom, canvasSize);
			}}
			icon={<CircleRegular />}
			tooltip="Add a circle shape"
			keyboardShortcut="C"
		/>
	);
}

export function NewSquareButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	shapeColor?: string;
	shapeFilled?: boolean;
}): JSX.Element {
	const { items, canvasSize, pan, zoom, shapeColor, shapeFilled } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				const currentUser = presence.users.getMyself().value;
				items.createShapeItem(
					"square",
					canvasSize,
					colors,
					shapeFilled ?? true,
					createSchemaUser({ id: currentUser.id, name: currentUser.name })
				);
				centerLastItem(items, pan, zoom, canvasSize);
			}}
			icon={<SquareRegular />}
			tooltip="Add a square shape"
			keyboardShortcut="S"
		/>
	);
}

export function NewStarButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	shapeColor?: string;
	shapeFilled?: boolean;
}): JSX.Element {
	const { items, canvasSize, pan, zoom, shapeColor, shapeFilled } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				const currentUser = presence.users.getMyself().value;
				items.createShapeItem(
					"star",
					canvasSize,
					colors,
					shapeFilled ?? true,
					createSchemaUser({ id: currentUser.id, name: currentUser.name })
				);
				centerLastItem(items, pan, zoom, canvasSize);
			}}
			icon={<StarRegular />}
			tooltip="Add a star shape"
			keyboardShortcut="R"
		/>
	);
}

export function NewNoteButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	noteColor?: NoteColor;
}): JSX.Element {
	const { items, canvasSize, pan, zoom, noteColor } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				const currentUser = presence.users.getMyself().value;
				const colorToUse: NoteColor = noteColor ?? DEFAULT_NOTE_COLOR;
				items.createNoteItem(
					canvasSize,
					createSchemaUser({ id: currentUser.id, name: currentUser.name }),
					colorToUse
				);
				centerLastItem(items, pan, zoom, canvasSize, 200, 200);
			}}
			icon={<NoteRegular />}
			tooltip="Add a sticky note"
			keyboardShortcut="N"
		/>
	);
}

export function NewTableButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				const currentUser = presence.users.getMyself().value;
				items.createTableItem(
					canvasSize,
					createSchemaUser({ id: currentUser.id, name: currentUser.name })
				);
				centerLastItem(items, pan, zoom, canvasSize, 240, 160);
			}}
			icon={<TableRegular />}
			tooltip="Add a data table"
			keyboardShortcut="B"
		/>
	);
}

export type ShapeType = "circle" | "square" | "triangle" | "star" | "rectangle";

const SHAPE_TYPES: Array<{
	type: ShapeType;
	icon: JSX.Element;
	label: string;
	shortcut: string;
}> = [
	{ type: "circle", icon: <CircleRegular />, label: "Circle", shortcut: "C" },
	{ type: "square", icon: <SquareRegular />, label: "Square", shortcut: "S" },
	{ type: "triangle", icon: <TriangleRegular />, label: "Triangle", shortcut: "T" },
	{ type: "star", icon: <StarRegular />, label: "Star", shortcut: "R" },
	{ type: "rectangle", icon: <RectangleLandscapeRegular />, label: "Rectangle", shortcut: "E" },
];

export function ShapeMenu(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	shapeColor?: string;
	shapeFilled?: boolean;
	currentShape: ShapeType;
	onShapeChange: (shape: ShapeType) => void;
}): JSX.Element {
	const { items, canvasSize, pan, zoom, shapeColor, shapeFilled, currentShape, onShapeChange } =
		props;
	useTree(items);
	const presence = useContext(PresenceContext);

	const createShape = (shapeType: ShapeType) => {
		const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
		const currentUser = presence.users.getMyself().value;
		items.createShapeItem(
			shapeType,
			canvasSize,
			colors,
			shapeFilled ?? true,
			createSchemaUser({ id: currentUser.id, name: currentUser.name })
		);
		centerLastItem(items, pan, zoom, canvasSize);
	};

	const currentShapeInfo = SHAPE_TYPES.find((s) => s.type === currentShape) ?? SHAPE_TYPES[0];

	return (
		<Menu positioning="below-start">
			<MenuTrigger disableButtonEnhancement>
				{(triggerProps) => (
					<Tooltip
						content={`Add Shape (currently ${currentShapeInfo.label})`}
						relationship="label"
					>
						<SplitButton
							appearance="subtle"
							menuButton={
								{
									...triggerProps,
									"data-testid": "shape-menu-button",
								} as unknown as typeof triggerProps
							}
							primaryActionButton={
								{
									onClick: () => createShape(currentShape),
									"aria-label": `Add ${currentShapeInfo.label} (${currentShapeInfo.shortcut})`,
									"data-testid": "shape-primary-button",
								} as unknown as React.ComponentProps<
									typeof SplitButton
								>["primaryActionButton"]
							}
							icon={currentShapeInfo.icon}
						/>
					</Tooltip>
				)}
			</MenuTrigger>
			<MenuPopover>
				<Toolbar>
					{SHAPE_TYPES.map((shape) => (
						<TooltipButton
							key={shape.type}
							icon={shape.icon}
							onClick={() => {
								onShapeChange(shape.type);
								createShape(shape.type);
							}}
							aria-label={`Add ${shape.label} (${shape.shortcut})`}
							tooltip={`Add ${shape.label} (${shape.shortcut})`}
							data-testid={`shape-option-${shape.type}`}
						/>
					))}
				</Toolbar>
			</MenuPopover>
		</Menu>
	);
}
