import React from "react";
import {
	ChevronDownRegular,
	TextBoldRegular,
	TextItalicRegular,
	TextUnderlineRegular,
	TextStrikethroughRegular,
	TextTRegular,
} from "@fluentui/react-icons";
import {
	Menu,
	MenuTrigger,
	MenuPopover,
	MenuList,
	MenuDivider,
	ToolbarButton,
	Label,
	SwatchPicker,
	renderSwatchPickerGrid,
	MenuGroup,
	MenuItem,
} from "@fluentui/react-components";
import { TooltipButton } from "../../forms/Button.js";
import { Items, TextBlock } from "../../../../schema/appSchema.js";
import { useTree } from "../../../hooks/useTree.js";
import { centerLastItem } from "../../../../utils/centerItem.js";
import {
	TEXT_COLOR_SWATCHES,
	TEXT_DEFAULT_WIDTH,
	TEXT_FONT_SIZES,
} from "../../../../constants/text.js";
import { Tree } from "@fluidframework/tree";

export function NewTextButton(props: {
	items: Items;
	canvasSize: { width: number; height: number };
	pan?: { x: number; y: number };
	zoom?: number;
	textColor: string;
	fontSize: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strikethrough: boolean;
}): JSX.Element {
	const {
		items,
		canvasSize,
		pan,
		zoom,
		textColor,
		fontSize,
		bold,
		italic,
		underline,
		strikethrough,
	} = props;

	useTree(items);

	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				items.createTextItem(canvasSize, {
					color: textColor,
					fontSize,
					bold,
					italic,
					underline,
					strikethrough,
					width: TEXT_DEFAULT_WIDTH,
				});
				const estimatedHeight = fontSize * 2.8 + 32;
				centerLastItem(items, pan, zoom, canvasSize, TEXT_DEFAULT_WIDTH, estimatedHeight);
			}}
			icon={<TextTRegular />}
			tooltip="Add a text block"
			keyboardShortcut="X"
		/>
	);
}

export function TextFormattingMenu(props: {
	color: string;
	onColorChange: (color: string) => void;
	fontSize: number;
	onFontSizeChange: (size: number) => void;
	bold: boolean;
	onBoldChange: (value: boolean) => void;
	italic: boolean;
	onItalicChange: (value: boolean) => void;
	underline: boolean;
	onUnderlineChange: (value: boolean) => void;
	strikethrough: boolean;
	onStrikethroughChange: (value: boolean) => void;
	selectedTexts?: TextBlock[];
}): JSX.Element {
	const {
		color,
		onColorChange,
		fontSize,
		onFontSizeChange,
		bold,
		onBoldChange,
		italic,
		onItalicChange,
		underline,
		onUnderlineChange,
		strikethrough,
		onStrikethroughChange,
		selectedTexts = [],
	} = props;

	const aggregateColor = (): { value: string; mixed: boolean } => {
		if (selectedTexts.length === 0) {
			return { value: color, mixed: false };
		}
		const uniqueColors = new Set(selectedTexts.map((t) => t.color));
		if (uniqueColors.size === 1) {
			return { value: selectedTexts[0].color, mixed: false };
		}
		return { value: color, mixed: true };
	};

	const aggregateFontSize = (): { value: number; mixed: boolean } => {
		if (selectedTexts.length === 0) {
			return { value: fontSize, mixed: false };
		}
		const uniqueSizes = new Set(selectedTexts.map((t) => t.fontSize));
		if (uniqueSizes.size === 1) {
			return { value: selectedTexts[0].fontSize, mixed: false };
		}
		return { value: fontSize, mixed: true };
	};

	const aggregateBoolean = (
		getter: (text: TextBlock) => boolean | undefined,
		fallback: boolean
	) => {
		if (selectedTexts.length === 0) {
			return { value: fallback, mixed: false };
		}
		const unique = new Set(selectedTexts.map((t) => ((getter(t) ?? false) ? "true" : "false")));
		if (unique.size === 1) {
			return { value: getter(selectedTexts[0]) ?? false, mixed: false };
		}
		return { value: fallback, mixed: true };
	};

	const colorState = aggregateColor();
	const sizeState = aggregateFontSize();
	const boldState = aggregateBoolean((t) => t.bold, bold);
	const italicState = aggregateBoolean((t) => t.italic, italic);
	const underlineState = aggregateBoolean((t) => t.underline, underline);
	const strikeState = aggregateBoolean((t) => t.strikethrough, strikethrough);
	const hasMixedState =
		colorState.mixed ||
		sizeState.mixed ||
		boldState.mixed ||
		italicState.mixed ||
		underlineState.mixed ||
		strikeState.mixed;

	const applyToSelection = (updater: (text: TextBlock) => void) => {
		if (selectedTexts.length === 0) return;
		Tree.runTransaction(selectedTexts[0], () => {
			selectedTexts.forEach((text) => updater(text));
		});
	};

	const handleColorChange = (next: string) => {
		onColorChange(next);
		applyToSelection((text) => {
			text.color = next;
		});
	};

	const handleFontSizeChange = (next: number) => {
		onFontSizeChange(next);
		applyToSelection((text) => {
			text.fontSize = next;
		});
	};

	const handleBooleanChange = (
		next: boolean,
		onChange: (value: boolean) => void,
		updater: (text: TextBlock, value: boolean) => void
	) => {
		onChange(next);
		applyToSelection((text) => updater(text, next));
	};

	const previewStyles: React.CSSProperties = {
		color: colorState.value,
		fontSize: "14px",
		fontWeight: boldState.value ? 700 : 500,
		fontStyle: italicState.value ? "italic" : "normal",
		textDecoration:
			[underlineState.value ? "underline" : "", strikeState.value ? "line-through" : ""]
				.filter(Boolean)
				.join(" ")
				.trim() || undefined,
		lineHeight: 1,
		fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
	};

	const previewTileStyles: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 28,
		height: 24,
		borderRadius: 6,
		border: "1px solid var(--colorNeutralStroke2)",
		backgroundColor: "var(--colorNeutralBackground1)",
		backgroundImage: hasMixedState
			? "linear-gradient(135deg, var(--colorNeutralBackground1), var(--colorNeutralBackground3))"
			: undefined,
		paddingInline: 4,
		position: "relative",
	};

	const previewIcon = (
		<div style={previewTileStyles} aria-hidden>
			<span style={previewStyles}>Aa</span>
			{hasMixedState && (
				<span
					style={{
						position: "absolute",
						inset: 0,
						borderRadius: 6,
						border: "1px dashed var(--colorNeutralStroke1)",
						pointerEvents: "none",
					}}
				/>
			)}
		</div>
	);

	const triggerLabel = hasMixedState ? "Text formatting (mixed selection)" : "Text formatting";

	const mixedBadge = hasMixedState ? (
		<span
			style={{
				fontSize: 10,
				fontWeight: 600,
				color: "var(--colorNeutralForeground3)",
				textTransform: "uppercase",
			}}
		>
			Mixed
		</span>
	) : null;

	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<ToolbarButton
					appearance="subtle"
					style={{ minWidth: 0, paddingInline: 6, gap: 4 }}
					title={triggerLabel}
					aria-label={triggerLabel}
					icon={previewIcon}
				>
					{mixedBadge}
					<ChevronDownRegular />
				</ToolbarButton>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<Label>Text color</Label>
					<SwatchPicker
						layout="grid"
						shape="rounded"
						size="small"
						aria-label="Text color picker"
						selectedValue={colorState.value}
						onSelectionChange={(_, d) => {
							if (d.selectedValue) {
								handleColorChange(d.selectedValue);
							}
						}}
					>
						{renderSwatchPickerGrid({
							items: TEXT_COLOR_SWATCHES.map((value) => ({
								value,
								color: value,
								borderColor: "#1f2937",
							})),
							columnCount: 6,
						})}
					</SwatchPicker>
					{colorState.mixed && (
						<span className="text-xs text-gray-500 block mt-1">
							Mixed selection — applying will update all selected text items
						</span>
					)}
					<MenuDivider />
					<MenuGroup>
						{TEXT_FONT_SIZES.map((size) => {
							const active = sizeState.value === size;
							return (
								<MenuItem
									key={size}
									role="menuitemradio"
									aria-checked={active}
									onClick={() => handleFontSizeChange(size)}
									style={{ fontWeight: active ? 600 : 400 }}
								>
									{size}px {active ? "•" : ""}
								</MenuItem>
							);
						})}
					</MenuGroup>
					{sizeState.mixed && (
						<span className="text-xs text-gray-500 block mt-1">
							Mixed selection — applying will update all selected text items
						</span>
					)}
					<MenuDivider />
					<MenuItem
						icon={<TextBoldRegular />}
						role="menuitemcheckbox"
						aria-checked={boldState.value}
						onClick={() =>
							handleBooleanChange(!boldState.value, onBoldChange, (text, value) => {
								text.bold = value;
							})
						}
						style={{ fontWeight: boldState.value ? 700 : 500 }}
					>
						Bold {boldState.value ? "✓" : ""}
					</MenuItem>
					<MenuItem
						icon={<TextItalicRegular />}
						role="menuitemcheckbox"
						aria-checked={italicState.value}
						onClick={() =>
							handleBooleanChange(
								!italicState.value,
								onItalicChange,
								(text, value) => {
									text.italic = value;
								}
							)
						}
						style={{ fontStyle: italicState.value ? "italic" : "normal" }}
					>
						Italic {italicState.value ? "✓" : ""}
					</MenuItem>
					<MenuItem
						icon={<TextUnderlineRegular />}
						role="menuitemcheckbox"
						aria-checked={underlineState.value}
						onClick={() =>
							handleBooleanChange(
								!underlineState.value,
								onUnderlineChange,
								(text, value) => {
									text.underline = value;
								}
							)
						}
						style={{ textDecoration: underlineState.value ? "underline" : "none" }}
					>
						Underline {underlineState.value ? "✓" : ""}
					</MenuItem>
					<MenuItem
						icon={<TextStrikethroughRegular />}
						role="menuitemcheckbox"
						aria-checked={strikeState.value}
						onClick={() =>
							handleBooleanChange(
								!strikeState.value,
								onStrikethroughChange,
								(text, value) => {
									text.strikethrough = value;
								}
							)
						}
					>
						Strikethrough {strikeState.value ? "✓" : ""}
					</MenuItem>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
}
