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
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				items.createShapeItem("circle", canvasSize, colors, shapeFilled ?? true);
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
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				items.createShapeItem("square", canvasSize, colors, shapeFilled ?? true);
				centerLastItem(items, pan, zoom, canvasSize);
			}}
			icon={<SquareRegular />}
			tooltip="Add a square shape"
			keyboardShortcut="S"
		/>
	);
}

export function NewTriangleButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	shapeColor?: string;
	shapeFilled?: boolean;
}): JSX.Element {
	const { items, canvasSize, pan, zoom, shapeColor, shapeFilled } = props;
	useTree(items);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				items.createShapeItem("triangle", canvasSize, colors, shapeFilled ?? true);
				centerLastItem(items, pan, zoom, canvasSize);
			}}
			icon={<TriangleRegular />}
			tooltip="Add a triangle shape"
			keyboardShortcut="T"
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
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				// Use the specific color or fallback to random selection
				const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
				items.createShapeItem("star", canvasSize, colors, shapeFilled ?? true);
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
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);
	const presence = useContext(PresenceContext);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				items.createNoteItem(canvasSize, presence.users.getMyself().value.id);
				centerLastItem(items, pan, zoom, canvasSize, 180, 120);
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
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				items.createTableItem(canvasSize);
				centerLastItem(items, pan, zoom, canvasSize, 240, 160);
			}}
			icon={<TableRegular />}
			tooltip="Add a data table"
			keyboardShortcut="B"
		/>
	);
}

type ShapeType = "circle" | "square" | "triangle" | "star";

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

	const createShape = (shapeType: ShapeType) => {
		const colors = shapeColor ? [shapeColor] : SHAPE_COLORS;
		items.createShapeItem(shapeType, canvasSize, colors, shapeFilled ?? true);
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
							menuButton={triggerProps}
							primaryActionButton={{
								onClick: () => createShape(currentShape),
								"aria-label": `Add ${currentShapeInfo.label} (${currentShapeInfo.shortcut})`,
							}}
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
						/>
					))}
				</Toolbar>
			</MenuPopover>
		</Menu>
	);
}
