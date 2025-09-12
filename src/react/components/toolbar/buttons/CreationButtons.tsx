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
import { TooltipButton } from "../../forms/Button.js";
import { useTree } from "../../../hooks/useTree.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { Items } from "../../../../schema/app_schema.js";
import { getContentHandler } from "../../../../utils/contentHandlers.js";
import { Tree } from "@fluidframework/tree";

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

function centerLastItem(
	items: Items,
	pan: { x: number; y: number } | undefined,
	zoom: number | undefined,
	canvas: { width: number; height: number },
	estW = 120,
	estH = 120
) {
	if (!pan || !zoom || items.length === 0) return;
	const last = items[items.length - 1];
	if (!last) return;
	let w = estW;
	let h = estH;
	const handler = getContentHandler(last);
	if (handler.type === "shape") {
		w = h = handler.getSize();
	}
	const vw = canvas.width / zoom;
	const vh = canvas.height / zoom;
	const vx = -pan.x / zoom;
	const vy = -pan.y / zoom;
	const cx = vx + vw / 2 - w / 2;
	const cy = vy + vh / 2 - h / 2;
	Tree.runTransaction(items, () => {
		last.x = cx;
		last.y = cy;
	});
}

// Shape / item creation buttons
export function NewCircleButton(props: {
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
				items.createShapeItem("circle", canvasSize, SHAPE_COLORS);
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
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				items.createShapeItem("square", canvasSize, SHAPE_COLORS);
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
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				items.createShapeItem("triangle", canvasSize, SHAPE_COLORS);
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
}): JSX.Element {
	const { items, canvasSize, pan, zoom } = props;
	useTree(items);
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				items.createShapeItem("star", canvasSize, SHAPE_COLORS);
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
