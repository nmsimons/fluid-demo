/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import { Circle24Filled, ChevronDownRegular } from "@fluentui/react-icons";
import {
	Menu,
	MenuTrigger,
	MenuPopover,
	MenuList,
	ToolbarButton,
	Label,
	SwatchPicker,
	renderSwatchPickerGrid,
} from "@fluentui/react-components";
import { useTree } from "../../../hooks/useTree.js";
import { Shape } from "../../../../schema/appSchema.js";
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

// Color picker for shapes (dropdown with SwatchPicker grid)
export function ShapeColorPicker(props: { shapes: Shape[] }): JSX.Element {
	const { shapes } = props;
	if (shapes.length === 0) return <></>;
	useTree(shapes[0]);
	const count = shapes.length;
	const allSame = shapes.every((s) => s.color === shapes[0].color);
	const selected = allSame ? shapes[0].color : undefined;
	const ariaLabel = count === 1 ? "Shape color picker" : `Color picker for ${count} shapes`;
	const setColor = (c: string) => {
		Tree.runTransaction(shapes[0], () => {
			shapes.forEach((s) => {
				s.color = c;
			});
		});
	};

	return (
		<Menu>
			<MenuTrigger>
				<ToolbarButton style={{ minWidth: 0 }}>
					<Circle24Filled color={selected ?? "linear-gradient(45deg,#888,#444)"} />
					<ChevronDownRegular />
				</ToolbarButton>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<ColorPicker
						setColor={setColor}
						selected={selected}
						ariaLabel={ariaLabel}
						label="Shape Color"
					/>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
}

// Color Picker
export function ColorPicker(props: {
	setColor: (color: string) => void;
	selected: string | undefined;
	ariaLabel: string;
	columnCount?: number;
	label: string;
}): JSX.Element {
	const { setColor, selected, ariaLabel, columnCount = 5, label } = props;
	return (
		<>
			<Label>{label}</Label>
			<SwatchPicker
				layout="grid"
				shape="circular"
				size="small"
				aria-label={ariaLabel}
				selectedValue={selected}
				onSelectionChange={(_, d) => {
					if (d.selectedValue) setColor(d.selectedValue);
				}}
			>
				{renderSwatchPickerGrid({
					items: SHAPE_COLORS.map((color) => ({
						value: color,
						color,
						borderColor: "black",
					})),
					columnCount: columnCount,
				})}
			</SwatchPicker>
		</>
	);
}
