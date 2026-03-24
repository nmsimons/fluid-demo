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
import { useTextEditorContext } from "../../../contexts/TextEditorContext.js";

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
	const { activeTree, activeQuill, lastTree, lastQuill, lastSelection, selectionFormat } = useTextEditorContext();

	// Use active editor if focused, otherwise fall back to the last focused
	// editor (clicking toolbar may blur the editor before handler fires).
	const effectiveTree = activeTree ?? lastTree;
	const effectiveQuill = activeQuill ?? lastQuill;

	// When a Quill editor is active, override toolbar display values with
	// the character-level format at the cursor/selection.
	const displayBold = selectionFormat.bold ?? bold;
	const displayItalic = selectionFormat.italic ?? italic;
	const displayUnderline = selectionFormat.underline ?? underline;
	const displayFontSize = selectionFormat.size ?? fontSize;
	const displayColor = color;

	/**
	 * Get the codepoint-based selection range from the active Quill editor.
	 * Returns { start, end } in codepoint indices, or null if nothing is selected.
	 */
	const getQuillSelectionCp = (): { start: number; end: number } | null => {
		if (!effectiveQuill || !effectiveTree) return null;
		// Try live selection first, fall back to last known selection from context
		const sel = effectiveQuill.getSelection() ?? lastSelection;
		if (!sel || sel.length === 0) return null;
		// Quill uses UTF-16 offsets; convert to codepoints for the tree API.
		const fullText = effectiveTree.fullString();
		const cpOf = (utf16: number) => [...fullText.slice(0, utf16)].length;
		return { start: cpOf(sel.index), end: cpOf(sel.index + sel.length) };
	};

	// Re-focus Quill and restore the selection after a toolbar action so the
	// user's highlight isn't lost when the toolbar steals focus.
	const restoreQuillSelection = () => {
		if (!effectiveQuill) return;
		// Use live selection or fall back to last saved selection from context
		const sel = effectiveQuill.getSelection() ?? lastSelection;
		requestAnimationFrame(() => {
			effectiveQuill?.focus();
			if (sel) effectiveQuill?.setSelection(sel.index, sel.length, "silent");
		});
	};

	const applyToSelection = (updater: (text: TextBlock) => void) => {
		if (selectedTexts.length > 0) {
			Tree.runTransaction(selectedTexts[0], () => {
				selectedTexts.forEach((text) => updater(text));
			});
			return;
		}
		// Fallback: the item may not be canvas-selected (e.g. stopPropagation on
		// the Quill wrapper prevents ItemView from selecting it).  Walk up the
		// tree from the active editor to find the owning TextBlock.
		const tree = effectiveTree;
		if (tree) {
			const parent = Tree.parent(tree);
			if (parent instanceof TextBlock) {
				Tree.runTransaction(parent, () => updater(parent));
			}
		}
	};

	/**
	 * Apply a character-level format via the tree's formatRange API.
	 * If text is selected in the active Quill editor, format only that range.
	 * Otherwise fall back to applying to the entire text block contents.
	 */
	const applyCharFormat = (
		format: Record<string, unknown>,
		blockFallback: (text: TextBlock) => void,
	) => {
		const sel = getQuillSelectionCp();
		if (sel && effectiveTree) {
			// Apply to selection only
			effectiveTree.formatRange(sel.start, sel.end, format);
		} else if (effectiveTree && effectiveQuill) {
			// No selection but editor exists → format entire content
			const fullText = effectiveTree.fullString();
			const cpLen = [...fullText].length;
			if (cpLen > 0) {
				effectiveTree.formatRange(0, cpLen, format);
			}
		} else {
			// No editor → block-level fallback
			applyToSelection(blockFallback);
		}
		restoreQuillSelection();
	};

	const handleColorChange = (next: string) => {
		onColorChange(next);
		applyToSelection((text) => { text.color = next; });
		restoreQuillSelection();
	};

	const handleFontSizeChange = (next: number) => {
		const clamped = Math.min(maxFontSize, Math.max(minFontSize, Math.round(next)));
		onFontSizeChange(clamped);
		applyCharFormat(
			{ size: clamped },
			(text) => { text.fontSize = clamped; },
		);
	};

	const handleBooleanChange = (
		next: boolean,
		onChange: (value: boolean) => void,
		updater: (text: TextBlock, value: boolean) => void,
		charFormatKey?: string,
	) => {
		onChange(next);
		if (charFormatKey) {
			applyCharFormat(
				{ [charFormatKey]: next },
				(text) => updater(text, next),
			);
		} else {
			applyToSelection((text) => updater(text, next));
			restoreQuillSelection();
		}
	};

	const previewStyles: React.CSSProperties = {
		color: displayColor,
		fontSize: "14px",
		fontWeight: displayBold ? 700 : 500,
		fontStyle: displayItalic ? "italic" : "normal",
		textDecoration:
			[displayUnderline ? "underline" : "", strikethrough ? "line-through" : ""]
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
							value={displayFontSize}
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
								checked={displayBold}
								onClick={() => {
									handleBooleanChange(!displayBold, onBoldChange, (text, value) => {
										text.bold = value;
									}, "bold");
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Toggle italic"
								icon={<TextItalicRegular />}
								checked={displayItalic}
								onClick={() => {
									handleBooleanChange(!displayItalic, onItalicChange, (text, value) => {
										text.italic = value;
									}, "italic");
								}}
							/>
							<ToggleButton
								appearance="subtle"
								aria-label="Toggle underline"
								icon={<TextUnderlineRegular />}
								checked={displayUnderline}
								onClick={() => {
									handleBooleanChange(
										!displayUnderline,
										onUnderlineChange,
										(text, value) => {
											text.underline = value;
										},
										"underline",
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
