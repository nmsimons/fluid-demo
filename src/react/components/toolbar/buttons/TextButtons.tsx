import React from "react";
import {
	TextBoldRegular,
	TextItalicRegular,
	TextUnderlineRegular,
	TextStrikethroughRegular,
	TextTRegular,
	TextAlignLeftRegular,
	TextAlignCenterRegular,
	TextAlignRightRegular,
} from "@fluentui/react-icons";
import {
	Menu,
	MenuTrigger,
	MenuPopover,
	MenuList,
	MenuDivider,
	ToggleButton,
	SpinButton,
	Label,
	Toolbar,
	ToolbarGroup,
	MenuButton,
	Tooltip,
	Checkbox,
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
import { ColorPicker } from "./ShapeButtons.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { createSchemaUser } from "../../../../utils/userUtils.js";

const TEXT_COLOR_SWATCH_ITEMS = TEXT_COLOR_SWATCHES.map((value) => ({
	value,
	color: value,
	borderColor: "#1f2937",
}));

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
	cardStyle: boolean;
	textAlign: string;
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
		cardStyle,
		textAlign,
	} = props;

	useTree(items);
	const presence = React.useContext(PresenceContext);

	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				const currentUser = presence.users.getMyself().value;
				items.createTextItem(
					createSchemaUser({ id: currentUser.id, name: currentUser.name }),
					canvasSize,
					{
						color: textColor,
						fontSize,
						bold,
						italic,
						underline,
						strikethrough,
						cardStyle,
						textAlign,
						width: TEXT_DEFAULT_WIDTH,
					}
				);
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
	cardStyle: boolean;
	onCardStyleChange: (value: boolean) => void;
	textAlign: string;
	onTextAlignChange: (value: string) => void;
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
		cardStyle,
		onCardStyleChange,
		textAlign,
		onTextAlignChange,
		selectedTexts = [],
	} = props;

	const minFontSize = React.useMemo(() => Math.min(...TEXT_FONT_SIZES), []);
	const maxFontSize = React.useMemo(() => Math.max(...TEXT_FONT_SIZES), []);

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
		const clamped = Math.min(maxFontSize, Math.max(minFontSize, Math.round(next)));
		onFontSizeChange(clamped);
		applyToSelection((text) => {
			text.fontSize = clamped;
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
		color,
		fontSize: "14px",
		fontWeight: bold ? 700 : 500,
		fontStyle: italic ? "italic" : "normal",
		textDecoration:
			[underline ? "underline" : "", strikethrough ? "line-through" : ""]
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
		paddingInline: 4,
		position: "relative",
	};

	const previewIcon = (
		<div style={previewTileStyles} aria-hidden>
			<span style={previewStyles}>Aa</span>
		</div>
	);

	const triggerLabel = "Text formatting";
	const fontSizeLabelId = React.useId();

	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<Tooltip content="Text Appearance" relationship="label">
					<MenuButton
						appearance="subtle"
						style={{ minWidth: 0, paddingInline: 6, gap: 4 }}
						aria-label={triggerLabel}
					>
						{previewIcon}
					</MenuButton>
				</Tooltip>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<ColorPicker
						label="Text color"
						ariaLabel="Text color picker"
						selected={color}
						setColor={handleColorChange}
						columnCount={6}
						shape="circular"
						swatches={TEXT_COLOR_SWATCH_ITEMS}
					/>
					<MenuDivider />
					<div style={{ display: "grid", gap: 4 }}>
						<Label id={fontSizeLabelId}>Font size</Label>
						<SpinButton
							value={fontSize}
							min={minFontSize}
							max={maxFontSize}
							step={1}
							appearance="filled-darker"
							aria-labelledby={fontSizeLabelId}
							style={{ width: "100%" }}
							onChange={(_event, data) => {
								const parsedValue =
									typeof data.value === "number"
										? data.value
										: Number.parseInt(data.displayValue ?? "", 10);
								if (!Number.isNaN(parsedValue)) {
									handleFontSizeChange(parsedValue);
								}
							}}
						/>
					</div>
					<MenuDivider />
					<Toolbar aria-label="Text style toggles">
						<ToolbarGroup>
							<ToggleButton
								appearance="subtle"
								aria-label="Toggle bold"
								icon={<TextBoldRegular />}
								checked={bold}
								onClick={() => {
									handleBooleanChange(!bold, onBoldChange, (text, value) => {
										text.bold = value;
									});
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Toggle italic"
								icon={<TextItalicRegular />}
								checked={italic}
								onClick={() => {
									handleBooleanChange(!italic, onItalicChange, (text, value) => {
										text.italic = value;
									});
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Toggle underline"
								icon={<TextUnderlineRegular />}
								checked={underline}
								onClick={() => {
									handleBooleanChange(
										!underline,
										onUnderlineChange,
										(text, value) => {
											text.underline = value;
										}
									);
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Toggle strikethrough"
								icon={<TextStrikethroughRegular />}
								checked={strikethrough}
								onClick={() => {
									handleBooleanChange(
										!strikethrough,
										onStrikethroughChange,
										(text, value) => {
											text.strikethrough = value;
										}
									);
								}}
							/>
						</ToolbarGroup>
					</Toolbar>
					<MenuDivider />
					<Toolbar aria-label="Text alignment">
						<ToolbarGroup>
							<ToggleButton
								appearance="subtle"
								aria-label="Align left"
								icon={<TextAlignLeftRegular />}
								checked={textAlign === "left"}
								onClick={() => {
									const newAlign = "left";
									onTextAlignChange(newAlign);
									applyToSelection((text) => {
										text.textAlign = newAlign;
									});
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Align center"
								icon={<TextAlignCenterRegular />}
								checked={textAlign === "center"}
								onClick={() => {
									const newAlign = "center";
									onTextAlignChange(newAlign);
									applyToSelection((text) => {
										text.textAlign = newAlign;
									});
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Align right"
								icon={<TextAlignRightRegular />}
								checked={textAlign === "right"}
								onClick={() => {
									const newAlign = "right";
									onTextAlignChange(newAlign);
									applyToSelection((text) => {
										text.textAlign = newAlign;
									});
								}}
							/>
						</ToolbarGroup>
					</Toolbar>
					<MenuDivider />
					<Checkbox
						aria-label="Toggle card style"
						checked={cardStyle}
						onClick={() => {
							handleBooleanChange(!cardStyle, onCardStyleChange, (text, value) => {
								text.cardStyle = value;
							});
						}}
						label={"Show as card"}
					/>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
}
