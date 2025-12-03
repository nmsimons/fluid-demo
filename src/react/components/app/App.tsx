/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useState, useEffect } from "react";
import { App } from "../../../schema/appSchema.js";
import "../../../styles/ios-minimal.css";
import { IFluidContainer, TreeView } from "fluid-framework";
import { asAlpha } from "@fluidframework/tree/alpha";
import { Canvas } from "../canvas/Canvas.js";
import type { SelectionManager } from "../../../presence/Interfaces/SelectionManager.js";
import { undoRedo } from "../../../undo/undo.js";
import { DragAndRotatePackage } from "../../../presence/drag.js";
import { TypedSelection } from "../../../presence/selection.js";
import {
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	MessageBarActions,
} from "@fluentui/react-message-bar";
import { Button } from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import { UsersManager } from "../../../presence/Interfaces/UsersManager.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { DragManager } from "../../../presence/Interfaces/DragManager.js";
import { ResizeManager } from "../../../presence/Interfaces/ResizeManager.js";
import { ResizePackage } from "../../../presence/Interfaces/ResizeManager.js";
import { CursorManager } from "../../../presence/Interfaces/CursorManager.js";
import {
	ConnectionDragManager,
	ConnectionDragState,
} from "../../../presence/Interfaces/ConnectionDragManager.js";
import { CommentPane } from "../panels/CommentPane.js";
import { AIPane } from "../panels/AIPane.js";
import { useTree } from "../../hooks/useTree.js";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts.js";
import { useAppKeyboardShortcuts } from "../../hooks/useAppKeyboardShortcuts.js";
import { PaneContext } from "../../contexts/PaneContext.js";
import { AppToolbar } from "../toolbar/AppToolbar.js";
import { InkPresenceManager } from "../../../presence/Interfaces/InkManager.js";
import { useContainerConnectionState } from "../../hooks/useContainerConnectionState.js";
import {
	useShapeSelectionSummary,
	useTextSelectionSummary,
	useNoteSelectionSummary,
} from "../../hooks/useSelectionSummaries.js";
import { Header } from "./Header.js";
import { useToolbarState } from "../../hooks/useToolbarState.js";
import { useSelectionState } from "../../hooks/useSelectionState.js";
import { useAiBranchState } from "../../hooks/useAiBranchState.js";
import { useCommentPane } from "../../hooks/useCommentPane.js";

// Context for comment pane actions
export const CommentPaneContext = React.createContext<{
	openCommentPaneAndFocus: (itemId: string) => void;
} | null>(null);

/**
 * Props for the ReactApp component.
 */
export interface ReactAppProps {
	tree: TreeView<typeof App>;
	itemSelection: SelectionManager<TypedSelection>;
	tableSelection: SelectionManager<TypedSelection>;
	users: UsersManager;
	container: IFluidContainer;
	undoRedo: undoRedo;
	drag: DragManager<DragAndRotatePackage | null>;
	resize: ResizeManager<ResizePackage | null>;
	cursor: CursorManager;
	ink?: InkPresenceManager;
	connectionDrag: ConnectionDragManager<ConnectionDragState | null>;
}

/**
 * Main React application component.
 *
 * This component orchestrates the entire application by:
 * - Managing presence context for collaborative features
 * - Coordinating tree subscriptions for reactive updates
 * - Delegating state management to specialized hooks
 * - Rendering the main layout (header, toolbar, canvas, side panes)
 */
export function ReactApp(props: ReactAppProps): JSX.Element {
	const {
		tree,
		itemSelection,
		tableSelection,
		users,
		container,
		undoRedo,
		drag,
		resize,
		cursor,
		ink,
		connectionDrag,
	} = props;

	// Connection state
	const { connectionState, saved } = useContainerConnectionState(container);

	// AI branch state (view, AI pane visibility, branch message)
	const { state: aiBranchState, actions: aiBranchActions } = useAiBranchState(tree);
	const { view, aiPaneHidden, showAiBranchMessage, isBranch } = aiBranchState;
	const { setView, setAiPaneHidden, setShowAiBranchMessage } = aiBranchActions;

	// Selection state (items and table elements)
	const selection = useSelectionState(itemSelection, tableSelection, view);
	const { selectedItemId, selectedItemIds, selectedColumnId, selectedRowId, setSelectedItemId } =
		selection;

	// Comment pane state
	const {
		state: commentPaneState,
		actions: commentPaneActions,
		commentPaneRef,
	} = useCommentPane(setSelectedItemId);
	const { commentPaneHidden } = commentPaneState;
	const { setCommentPaneHidden, openCommentPaneAndFocus } = commentPaneActions;

	// Tree subscriptions
	useTree(tree.root);
	const itemsVersion = useTree(view.root.items, true);
	useTree(view.root.comments);
	useTree(view.root.inks);

	// Selection summaries (derived from current selection)
	const shapeSummary = useShapeSelectionSummary(view, selectedItemIds, itemsVersion);
	const textSummary = useTextSelectionSummary(view, selectedItemIds, itemsVersion);
	const noteSummary = useNoteSelectionSummary(view, selectedItemIds, itemsVersion);

	// Toolbar state (ink, shape, note, text tools)
	const { state: toolbarState, actions: toolbarActions } = useToolbarState({
		shapeSummary,
		textSummary,
		noteSummary,
	});

	// Canvas state
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });

	// Undo/redo state
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	// Keep linter satisfied until pan is surfaced elsewhere
	useEffect(() => {
		void pan;
	}, [pan]);

	// Undo/redo event subscription
	useEffect(() => {
		const updateUndoRedoState = () => {
			setCanUndo(undoRedo.canUndo());
			setCanRedo(undoRedo.canRedo());
		};

		updateUndoRedoState();
		const unsubscribe = tree.events.on("commitApplied", updateUndoRedoState);

		return () => {
			unsubscribe();
			undoRedo.dispose();
		};
	}, [tree.events, undoRedo]);

	// Keyboard shortcuts
	const shortcuts = useAppKeyboardShortcuts({
		view,
		canvasSize,
		pan,
		zoom,
		shapeColor: toolbarState.shapeColor,
		shapeFilled: toolbarState.shapeFilled,
		noteColor: toolbarState.noteColor,
		textColor: toolbarState.textColor,
		textFontSize: toolbarState.textFontSize,
		textBold: toolbarState.textBold,
		textItalic: toolbarState.textItalic,
		textUnderline: toolbarState.textUnderline,
		textStrikethrough: toolbarState.textStrikethrough,
		selectedItemId,
		selectedItemIds,
		selectedColumnId,
		selectedRowId,
		commentPaneHidden,
		undoRedo,
		users,
		canUndo,
		canRedo,
		setCommentPaneHidden,
		openCommentPaneAndFocus,
		selectionManager: itemSelection,
	});

	useKeyboardShortcuts({ shortcuts });

	return (
		<PresenceContext.Provider
			value={{
				users,
				itemSelection,
				tableSelection,
				drag,
				resize,
				cursor,
				branch: isBranch,
				ink,
				connectionDrag,
			}}
		>
			<CommentPaneContext.Provider value={{ openCommentPaneAndFocus }}>
				<div
					id="main"
					className="flex flex-col bg-transparent h-screen w-full overflow-hidden overscroll-none"
				>
					<Header saved={saved} connectionState={connectionState} />
					<AppToolbar
						view={view}
						tree={tree}
						canvasSize={canvasSize}
						selectedItemId={selectedItemId}
						selectedItemIds={selectedItemIds}
						selectedColumnId={selectedColumnId}
						selectedRowId={selectedRowId}
						commentPaneHidden={commentPaneHidden}
						setCommentPaneHidden={setCommentPaneHidden}
						aiPaneHidden={aiPaneHidden}
						setAiPaneHidden={setAiPaneHidden}
						undoRedo={undoRedo}
						canUndo={canUndo}
						canRedo={canRedo}
						tableSelection={tableSelection}
						zoom={zoom}
						onZoomChange={setZoom}
						pan={pan}
						inkActive={toolbarState.inkActive}
						onToggleInk={toolbarActions.toggleInk}
						eraserActive={toolbarState.eraserActive}
						onToggleEraser={toolbarActions.toggleEraser}
						inkColor={toolbarState.inkColor}
						onInkColorChange={toolbarActions.setInkColor}
						inkWidth={toolbarState.inkWidth}
						onInkWidthChange={toolbarActions.setInkWidth}
						shapeColor={toolbarState.shapeColor}
						onShapeColorChange={toolbarActions.setShapeColor}
						shapeFilled={toolbarState.shapeFilled}
						onShapeFilledChange={toolbarActions.setShapeFilled}
						noteColor={toolbarState.noteColor}
						onNoteColorChange={toolbarActions.setNoteColor}
						currentShapeType={toolbarState.currentShapeType}
						onShapeTypeChange={toolbarActions.setCurrentShapeType}
						textColor={toolbarState.textColor}
						onTextColorChange={toolbarActions.setTextColor}
						textFontSize={toolbarState.textFontSize}
						onTextFontSizeChange={toolbarActions.setTextFontSize}
						textBold={toolbarState.textBold}
						onTextBoldChange={toolbarActions.setTextBold}
						textItalic={toolbarState.textItalic}
						onTextItalicChange={toolbarActions.setTextItalic}
						textUnderline={toolbarState.textUnderline}
						onTextUnderlineChange={toolbarActions.setTextUnderline}
						textStrikethrough={toolbarState.textStrikethrough}
						onTextStrikethroughChange={toolbarActions.setTextStrikethrough}
						textCardStyle={toolbarState.textCardStyle}
						onTextCardStyleChange={toolbarActions.setTextCardStyle}
						textAlign={toolbarState.textAlign}
						onTextAlignChange={toolbarActions.setTextAlign}
					/>
					<div className="flex flex-row h-[calc(100vh-96px)] w-full">
						<div className="flex flex-col flex-1 relative">
							{showAiBranchMessage && (
								<MessageBar
									intent="info"
									className="absolute top-2 left-2 right-2 z-10 shadow-lg"
								>
									<MessageBarBody>
										<MessageBarTitle>
											You&apos;re working with an AI branch. Changes are not
											saved until you commit them.
										</MessageBarTitle>
									</MessageBarBody>
									<MessageBarActions>
										<Button
											onClick={() => setShowAiBranchMessage(false)}
											appearance="subtle"
											icon={<DismissRegular />}
										/>
									</MessageBarActions>
								</MessageBar>
							)}
							<PaneContext.Provider
								value={{
									panes: [{ name: "comments", visible: !commentPaneHidden }],
								}}
							>
								<Canvas
									items={view.root.items}
									container={container}
									setSize={(width, height) => setCanvasSize({ width, height })}
									zoom={zoom}
									onZoomChange={setZoom}
									onPanChange={setPan}
									inkActive={toolbarState.inkActive}
									eraserActive={toolbarState.eraserActive}
									inkColor={toolbarState.inkColor}
									inkWidth={toolbarState.inkWidth}
								/>
							</PaneContext.Provider>
						</div>
						<CommentPane
							ref={commentPaneRef}
							hidden={commentPaneHidden}
							setHidden={setCommentPaneHidden}
							itemId={selectedItemId}
							app={view.root}
						/>
						<AIPane
							hidden={aiPaneHidden}
							setHidden={setAiPaneHidden}
							main={asAlpha(tree)}
							branch={isBranch ? asAlpha(view) : undefined}
							setRenderView={(newView) => setView(newView as TreeView<typeof App>)}
						/>
					</div>
				</div>
			</CommentPaneContext.Provider>
		</PresenceContext.Provider>
	);
}
