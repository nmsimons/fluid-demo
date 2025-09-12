/*!
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext } from "react";
import { Item, Items, Shape, Vote, FluidTable } from "../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { useTree } from "./hooks/useTree.js";
import { TooltipButton } from "./components/forms/Button.js";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { CommentPaneContext } from "./components/app/App.js";
import { getContentHandler } from "../utils/contentHandlers.js";
import {
	DismissFilled,
	CircleRegular,
	SquareRegular,
	TriangleRegular,
	StarRegular,
	ThumbLikeFilled,
	ThumbLikeRegular,
	CommentRegular,
	CommentFilled,
	NoteRegular,
	TableRegular,
	TableInsertColumnRegular,
	TableInsertRowRegular,
	ChevronLeftRegular,
	ChevronRightRegular,
	ChevronUpRegular,
	ChevronDownRegular,
	PositionForwardRegular,
	PositionBackwardRegular,
	PositionToFrontRegular,
	PositionToBackRegular,
	CopyRegular,
	Circle24Filled,
	ArrowUndoFilled,
	ArrowRedoFilled,
	InkingToolFilled,
	InkingToolRegular,
	EraserToolFilled,
	EraserToolRegular,
	DeleteRegular,
} from "@fluentui/react-icons";
import {
	Menu,
	MenuTrigger,
	MenuPopover,
	MenuList,
	ToolbarButton,
	SwatchPicker,
	renderSwatchPickerGrid,
	Label,
	MenuDivider,
} from "@fluentui/react-components";
import { Badge } from "@fluentui/react-badge";

// ---------------------------------------------------------------------------
// NEW: Additional toolbar item components to keep AppToolbar lean & consistent
// ---------------------------------------------------------------------------

// Undo / Redo ---------------------------------------------------------------
export function UndoButton(props: { onUndo: () => void; disabled?: boolean }): JSX.Element {
	const { onUndo, disabled } = props;
	return (
		<TooltipButton
			tooltip="Undo"
			keyboardShortcut="Ctrl+Z"
			onClick={() => onUndo()}
			icon={<ArrowUndoFilled />}
			disabled={disabled}
		/>
	);
}
export function RedoButton(props: { onRedo: () => void; disabled?: boolean }): JSX.Element {
	const { onRedo, disabled } = props;
	return (
		<TooltipButton
			tooltip="Redo"
			keyboardShortcut="Ctrl+Y"
			onClick={() => onRedo()}
			icon={<ArrowRedoFilled />}
			disabled={disabled}
		/>
	);
}

// Ink / Eraser toggles -----------------------------------------------------
export function InkToggleButton(props: {
	inkActive: boolean;
	eraserActive: boolean;
	onToggleInk: () => void;
	onToggleEraser: () => void;
}): JSX.Element {
	const { inkActive, eraserActive, onToggleInk, onToggleEraser } = props;
	return (
		<TooltipButton
			tooltip={inkActive ? "Exit ink mode" : "Enter ink mode"}
			onClick={() => {
				if (eraserActive) onToggleEraser();
				onToggleInk();
			}}
			icon={
				<span style={{ fontSize: 14 }}>
					{inkActive ? <InkingToolFilled /> : <InkingToolRegular />}
				</span>
			}
			active={inkActive}
		/>
	);
}
export function EraserToggleButton(props: {
	inkActive: boolean;
	eraserActive: boolean;
	onToggleInk: () => void;
	onToggleEraser: () => void;
}): JSX.Element {
	const { inkActive, eraserActive, onToggleInk, onToggleEraser } = props;
	return (
		<TooltipButton
			tooltip={eraserActive ? "Exit eraser" : "Eraser"}
			onClick={() => {
				if (inkActive) onToggleInk();
				onToggleEraser();
			}}
			icon={
				<span style={{ fontSize: 14 }}>
					{eraserActive ? <EraserToolFilled /> : <EraserToolRegular />}
				</span>
			}
			active={eraserActive}
		/>
	);
}

// Clear All ----------------------------------------------------------------
export function ClearAllButton(props: { onClear: () => void; disabled?: boolean }): JSX.Element {
	const { onClear, disabled } = props;
	return (
		<TooltipButton
			tooltip="Remove all items and ink"
			keyboardShortcut="Ctrl+Shift+Delete"
			icon={<DeleteRegular />}
			onClick={() => onClear()}
			disabled={disabled}
		/>
	);
}

// Comments pane toggle (wraps ShowPaneButton semantics) --------------------
export function CommentsPaneToggleButton(props: {
	paneHidden: boolean;
	onToggle: (hidden: boolean) => void;
}): JSX.Element {
	const { paneHidden, onToggle } = props;
	return (
		<TooltipButton
			onClick={() => onToggle(!paneHidden)}
			icon={paneHidden ? <CommentRegular /> : <CommentFilled />}
			tooltip={paneHidden ? "Show Comments" : "Hide Comments"}
			keyboardShortcut="Ctrl+M"
		/>
	);
}

// Selection count badge ----------------------------------------------------
export function SelectionCountBadge(props: { count: number }): JSX.Element {
	const { count } = props;
	if (count <= 1) return <></>;
	return (
		<div className="flex items-center px-2">
			<Badge appearance="filled" color="brand" size="small">
				{count} selected
			</Badge>
		</div>
	);
}

// Zoom Menu ----------------------------------------------------------------
export function ZoomMenu(props: {
	zoom?: number;
	onZoomChange?: (z: number) => void;
}): JSX.Element {
	const { zoom, onZoomChange } = props;
	const formatZoom = (z: number | undefined) => `${Math.round((z ?? 1) * 100)}%`;
	const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = parseInt(e.target.value, 10);
		onZoomChange?.(val / 100);
	};
	return (
		<Menu>
			<MenuTrigger>
				<button
					className="px-2 py-1 rounded bg-black/70 text-white hover:bg-black transition-colors text-sm border border-white/20 inline-flex items-center justify-center"
					style={{ width: 72 }}
					aria-label="Zoom"
				>
					<span className="tabular-nums font-medium">{formatZoom(zoom)}</span>
					<span className="ml-1 text-[10px]">▼</span>
				</button>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<div
						className="px-3 py-2 w-56 select-none"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex justify-between text-xs mb-2">
							<span className="font-semibold">Zoom</span>
							<button
								onClick={() => onZoomChange?.(1)}
								className="text-blue-500 hover:underline"
							>
								Reset
							</button>
						</div>
						<input
							type="range"
							min={25}
							max={400}
							step={5}
							value={Math.round((zoom ?? 1) * 100)}
							onChange={handleSlider}
							className="w-full"
						/>
					</div>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
}

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

// Shape / item creation buttons -------------------------------------------------
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

// Basic actions -----------------------------------------------------------------
export function DeleteButton(props: { delete: () => void; count?: number }): JSX.Element {
	const { delete: del, count = 1 } = props;
	const tt = count > 1 ? `Delete ${count} items` : "Delete item";
	return (
		<TooltipButton
			onClick={() => del()}
			icon={<DismissFilled />}
			tooltip={tt}
			keyboardShortcut="Delete"
		/>
	);
}
export function DuplicateButton(props: { duplicate: () => void; count?: number }): JSX.Element {
	const { duplicate, count = 1 } = props;
	const tt = count > 1 ? `Duplicate ${count} items` : "Duplicate item";
	return (
		<TooltipButton
			onClick={() => duplicate()}
			icon={<CopyRegular />}
			tooltip={tt}
			keyboardShortcut="Ctrl+D"
		/>
	);
}
export function VoteButton(props: { vote: Vote }): JSX.Element {
	const { vote } = props;
	const presence = useContext(PresenceContext);
	const userId = presence.users.getMyself().value.id;
	useTree(vote);
	const has = vote.hasVoted(userId);
	const cnt = vote.numberOfVotes;
	return (
		<TooltipButton
			icon={has ? <ThumbLikeFilled /> : <ThumbLikeRegular />}
			onClick={(e) => {
				e.stopPropagation();
				vote.toggleVote(userId);
			}}
			tooltip={has ? `Remove your vote (${cnt})` : `Vote (${cnt})`}
			keyboardShortcut="V"
		/>
	);
}
export function CommentButton(props: { item: Item }): JSX.Element {
	const { item } = props;
	const ctx = useContext(CommentPaneContext);
	useTree(item);
	const count = item.comments.length;
	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				if (!ctx) return;
				ctx.openCommentPaneAndFocus(item.id);
			}}
			icon={count > 0 ? <CommentFilled /> : <CommentRegular />}
			tooltip={count > 0 ? `View comments (${count})` : "Add a comment"}
			keyboardShortcut="Ctrl+/"
		/>
	);
}
export function ShowPaneButton(props: {
	hidePane: (h: boolean) => void;
	paneHidden: boolean;
	hiddenIcon: JSX.Element;
	shownIcon: JSX.Element;
	tooltip?: string;
	keyboardShortcut?: string;
}): JSX.Element {
	const { hidePane, paneHidden, hiddenIcon, shownIcon, tooltip, keyboardShortcut } = props;
	return (
		<TooltipButton
			onClick={() => hidePane(!paneHidden)}
			icon={paneHidden ? hiddenIcon : shownIcon}
			tooltip={paneHidden ? `Show ${tooltip}` : `Hide ${tooltip}`}
			keyboardShortcut={keyboardShortcut}
		/>
	);
}

// Color picker for shapes (dropdown with SwatchPicker grid) --------------------------------
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

// Ink Color Picker
export function InkColorPicker(props: {
	setColor: (color: string) => void;
	selected: string | undefined;
	ariaLabel: string;
	inkWidth: number;
	onInkWidthChange: (arg: number) => void;
}): JSX.Element {
	const { setColor, selected, ariaLabel, inkWidth, onInkWidthChange } = props;

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
						label="Ink Color"
					/>
					<MenuDivider></MenuDivider>
					<InkThicknessPalette
						inkWidth={inkWidth}
						inkColor={selected}
						onInkWidthChange={onInkWidthChange}
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

export function InkThicknessPalette(props: {
	inkWidth: number;
	inkColor: string | undefined;
	onInkWidthChange: (arg: number) => void;
}): JSX.Element {
	const { inkWidth, inkColor, onInkWidthChange } = props;

	// Define the 5 thickness options
	const thicknessOptions = [4, 8, 16, 24, 32];
	const currentColor = inkColor || "#000000";

	return (
		<>
			<Label>Thickness</Label>
			<div
				style={{
					display: "flex",
					gap: "4px",
					alignItems: "center",
					padding: "8px 0",
					flexWrap: "wrap",
				}}
			>
				{thicknessOptions.map((thickness) => (
					<button
						key={thickness}
						onClick={() => onInkWidthChange(thickness)}
						style={{
							width: "36px",
							height: "36px",
							border:
								inkWidth === thickness ? "3px solid #0078d4" : "2px solid #e1e1e1",
							borderRadius: "50%",
							backgroundColor: "white",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							padding: "0",
							transition: "border-color 0.2s ease",
						}}
						aria-label={`Set ink thickness to ${thickness}px`}
						title={`${thickness}px thickness`}
					>
						<div
							style={{
								width: `${thickness}px`,
								height: `${thickness}px`,
								backgroundColor: currentColor,
								borderRadius: "50%",
								border: currentColor === "#FFFFFF" ? "1px solid #ccc" : "none",
							}}
						/>
					</button>
				))}
			</div>
		</>
	);
}

// Table buttons -----------------------------------------------------------------
export function AddColumnButton(props: { table: FluidTable }): JSX.Element {
	const { table } = props;
	useTree(table);
	return (
		<TooltipButton
			onClick={() => table.addColumn()}
			icon={<TableInsertColumnRegular />}
			tooltip="Add a new column"
			keyboardShortcut="Ctrl+Shift+C"
		/>
	);
}
export function AddRowButton(props: { table: FluidTable }): JSX.Element {
	const { table } = props;
	useTree(table);
	return (
		<TooltipButton
			onClick={() => table.addRow()}
			icon={<TableInsertRowRegular />}
			tooltip="Add a new row"
			keyboardShortcut="Ctrl+Shift+R"
		/>
	);
}
export function MoveColumnLeftButton(props: {
	table: FluidTable;
	selectedColumnId?: string;
}): JSX.Element {
	const { table, selectedColumnId } = props;
	useTree(table);
	const col = selectedColumnId ? table.columns.find((c) => c.id === selectedColumnId) : undefined;
	const can = col && table.columns.indexOf(col) > 0;
	return (
		<TooltipButton
			onClick={() => {
				if (col && can) table.moveColumnLeft(col);
			}}
			icon={<ChevronLeftRegular />}
			tooltip="Move column left"
			keyboardShortcut="Ctrl+Shift+Left"
			disabled={!can}
		/>
	);
}
export function MoveColumnRightButton(props: {
	table: FluidTable;
	selectedColumnId?: string;
}): JSX.Element {
	const { table, selectedColumnId } = props;
	useTree(table);
	const col = selectedColumnId ? table.columns.find((c) => c.id === selectedColumnId) : undefined;
	const can = col && table.columns.indexOf(col) < table.columns.length - 1;
	return (
		<TooltipButton
			onClick={() => {
				if (col && can) table.moveColumnRight(col);
			}}
			icon={<ChevronRightRegular />}
			tooltip="Move column right"
			keyboardShortcut="Ctrl+Shift+Right"
			disabled={!can}
		/>
	);
}
export function MoveRowUpButton(props: { table: FluidTable; selectedRowId?: string }): JSX.Element {
	const { table, selectedRowId } = props;
	useTree(table);
	const row = selectedRowId ? table.rows.find((r) => r.id === selectedRowId) : undefined;
	const can = row && table.rows.indexOf(row) > 0;
	return (
		<TooltipButton
			onClick={() => {
				if (row && can) table.moveRowUp(row);
			}}
			icon={<ChevronUpRegular />}
			tooltip="Move row up"
			keyboardShortcut="Ctrl+Shift+Up"
			disabled={!can}
		/>
	);
}
export function MoveRowDownButton(props: {
	table: FluidTable;
	selectedRowId?: string;
}): JSX.Element {
	const { table, selectedRowId } = props;
	useTree(table);
	const row = selectedRowId ? table.rows.find((r) => r.id === selectedRowId) : undefined;
	const can = row && table.rows.indexOf(row) < table.rows.length - 1;
	return (
		<TooltipButton
			onClick={() => {
				if (row && can) table.moveRowDown(row);
			}}
			icon={<ChevronDownRegular />}
			tooltip="Move row down"
			keyboardShortcut="Ctrl+Shift+Down"
			disabled={!can}
		/>
	);
}

// Z-order -----------------------------------------------------------------------
export function MoveItemForwardButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);
	const item = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined;
	const idx = item ? items.indexOf(item) : -1;
	const can = item && idx < items.length - 1;
	return (
		<TooltipButton
			onClick={() => {
				if (item && can) items.moveItemForward(item);
			}}
			icon={<PositionForwardRegular />}
			tooltip="Move item forward"
			keyboardShortcut="]"
			disabled={!can}
		/>
	);
}
export function MoveItemBackwardButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);
	const item = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined;
	const idx = item ? items.indexOf(item) : -1;
	const can = item && idx > 0;
	return (
		<TooltipButton
			onClick={() => {
				if (item && can) items.moveItemBackward(item);
			}}
			icon={<PositionBackwardRegular />}
			tooltip="Move item backward"
			keyboardShortcut="["
			disabled={!can}
		/>
	);
}
export function BringItemToFrontButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);
	const item = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined;
	const idx = item ? items.indexOf(item) : -1;
	const can = item && idx < items.length - 1;
	return (
		<TooltipButton
			onClick={() => {
				if (item && can) items.bringItemToFront(item);
			}}
			icon={<PositionToFrontRegular />}
			tooltip="Bring to front"
			keyboardShortcut="Ctrl+]"
			disabled={!can}
		/>
	);
}
export function SendItemToBackButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);
	const item = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined;
	const idx = item ? items.indexOf(item) : -1;
	const can = item && idx > 0;
	return (
		<TooltipButton
			onClick={() => {
				if (item && can) items.sendItemToBack(item);
			}}
			icon={<PositionToBackRegular />}
			tooltip="Send to back"
			keyboardShortcut="Ctrl+["
			disabled={!can}
		/>
	);
}
