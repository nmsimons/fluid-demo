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
	MenuDivider,
} from "@fluentui/react-components";
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

// Global shape color picker (always visible, doesn't require selected shapes)
export function ShapeColorPicker(props: {
	color: string;
	onColorChange: (color: string) => void;
	filled: boolean;
	onFilledChange: (filled: boolean) => void;
	selectedShapes?: Shape[];
}): JSX.Element {
	const { color, onColorChange, filled, onFilledChange, selectedShapes = [] } = props;

	const handleColorChange = (newColor: string) => {
		// First, update the global shape color for future shapes
		onColorChange(newColor);

		// Then, if shapes are selected, update their colors too
		if (selectedShapes.length > 0) {
			Tree.runTransaction(selectedShapes[0], () => {
				selectedShapes.forEach((shape) => {
					shape.color = newColor;
				});
			});
		}
	};

	const handleFilledChange = (nextFilled: boolean) => {
		if (selectedShapes.length > 0) {
			Tree.runTransaction(selectedShapes[0], () => {
				selectedShapes.forEach((shape) => {
					shape.filled = nextFilled;
				});
			});
		}
		onFilledChange(nextFilled);
	};

	const selectedFillStates = selectedShapes.map((shape) => shape.filled !== false);
	const allFilled = selectedFillStates.length > 0 && selectedFillStates.every((state) => state);
	const allOutline = selectedFillStates.length > 0 && selectedFillStates.every((state) => !state);
	const hasMixedSelection = selectedFillStates.length > 0 && !(allFilled || allOutline);
	const effectiveFilled =
		selectedFillStates.length > 0
			? allFilled
				? true
				: allOutline
					? false
					: undefined
			: filled;

	return (
		<Menu>
			<MenuTrigger>
				<ToolbarButton style={{ minWidth: 0 }}>
					<Circle24Filled color={color} />
					<ChevronDownRegular />
				</ToolbarButton>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<ColorPicker
						setColor={handleColorChange}
						selected={color}
						ariaLabel="Shape color picker"
						label="Shape Color"
					/>
					<MenuDivider></MenuDivider>
					<ShapeFillToggle
						color={color}
						onChange={handleFilledChange}
						state={effectiveFilled === undefined ? "mixed" : effectiveFilled}
					/>
					{hasMixedSelection && (
						<span
							style={{
								display: "block",
								fontSize: "12px",
								color: "#616161",
								marginTop: "4px",
							}}
						>
							Mixed selection — applying a choice updates all selected shapes
						</span>
					)}
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

function ShapeFillToggle(props: {
	color: string;
	state: boolean | "mixed";
	onChange: (filled: boolean) => void;
}): JSX.Element {
	const { color, state, onChange } = props;

	const buttonStyle: React.CSSProperties = {
		width: "36px",
		height: "36px",
		border: "2px solid #e1e1e1",
		borderRadius: "8px",
		backgroundColor: "white",
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "0",
		transition: "border-color 0.2s ease, box-shadow 0.2s ease",
	};

	const isWhite = color.trim().toLowerCase() === "#ffffff";

	const filledSelected = state === true;
	const outlineSelected = state === false;

	return (
		<>
			<Label>Fill</Label>
			<div
				style={{
					display: "flex",
					gap: "8px",
					alignItems: "center",
					padding: "8px 0",
				}}
			>
				<button
					type="button"
					onClick={() => onChange(true)}
					style={{
						...buttonStyle,
						border: filledSelected ? "3px solid #0078d4" : buttonStyle.border,
						boxShadow: filledSelected ? "0 0 0 2px rgba(0, 120, 212, 0.2)" : "none",
					}}
					aria-pressed={filledSelected}
					aria-label="Render shapes filled"
				>
					<div
						style={{
							width: "22px",
							height: "22px",
							borderRadius: "50%",
							backgroundColor: color,
							border: isWhite ? "1px solid #ccc" : "none",
						}}
					/>
				</button>
				<button
					type="button"
					onClick={() => onChange(false)}
					style={{
						...buttonStyle,
						border: outlineSelected ? "3px solid #0078d4" : buttonStyle.border,
						boxShadow: outlineSelected ? "0 0 0 2px rgba(0, 120, 212, 0.2)" : "none",
					}}
					aria-pressed={outlineSelected}
					aria-label="Render shapes as outlines"
				>
					<div
						style={{
							width: "22px",
							height: "22px",
							borderRadius: "50%",
							backgroundColor: "transparent",
							border: `3px solid ${color}`,
							boxShadow: isWhite ? "0 0 0 1px #ccc" : "none",
						}}
					/>
				</button>
			</div>
		</>
	);
}
