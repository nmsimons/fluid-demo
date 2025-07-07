/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useContext, useEffect, useState, useRef } from "react";
import { App, Shape, FluidTable } from "../schema/app_schema.js";
import "../output.css";
import { ConnectionState, IFluidContainer, TreeView, Tree } from "fluid-framework";
import { Canvas } from "./canvasux.js";
import type { SelectionManager } from "../utils/Interfaces/SelectionManager.js";
import { undoRedo } from "../utils/undo.js";
import {
	NewCircleButton,
	NewSquareButton,
	NewTriangleButton,
	NewStarButton,
	ShowPaneButton,
	NewNoteButton,
	NewTableButton,
	VoteButton,
	DeleteButton,
	DuplicateButton,
	CommentButton,
	ColorPicker,
	AddColumnButton,
	AddRowButton,
	MoveColumnLeftButton,
	MoveColumnRightButton,
	MoveRowUpButton,
	MoveRowDownButton,
	MoveItemForwardButton,
	MoveItemBackwardButton,
	BringItemToFrontButton,
	SendItemToBackButton,
} from "./appbuttonux.js";
import { DeleteSelectedRowsButton } from "./tablebuttonux.js";
import { TooltipButton } from "./buttonux.js";
import {
	Avatar,
	AvatarGroup,
	AvatarGroupItem,
	AvatarGroupPopover,
	AvatarGroupProps,
	partitionAvatarGroupItems,
} from "@fluentui/react-avatar";
import { MessageBar, MessageBarBody, MessageBarTitle } from "@fluentui/react-message-bar";
import { Text } from "@fluentui/react-text";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "@fluentui/react-toolbar";
import { Tooltip } from "@fluentui/react-tooltip";
import { User, UsersManager } from "../utils/Interfaces/UsersManager.js";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { DragManager } from "../utils/Interfaces/DragManager.js";
import { ResizeManager } from "../utils/Interfaces/ResizeManager.js";
import { DragAndRotatePackage } from "../utils/drag.js";
import { ResizePackage } from "../utils/Interfaces/ResizeManager.js";
import { TypedSelection } from "../utils/selection.js";
import { CommentPane, CommentPaneRef } from "./commentux.js";
import {
	ArrowRedoFilled,
	ArrowUndoFilled,
	CommentFilled,
	CommentRegular,
	DeleteRegular,
} from "@fluentui/react-icons";
import { useTree } from "./hooks/useTree.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts.js";
import { PaneContext } from "./contexts/PaneContext.js";

// Context for comment pane actions
export const CommentPaneContext = React.createContext<{
	openCommentPaneAndFocus: (itemId: string) => void;
} | null>(null);

export function ReactApp(props: {
	tree: TreeView<typeof App>;
	itemSelection: SelectionManager<TypedSelection>;
	tableSelection: SelectionManager<TypedSelection>;
	users: UsersManager;
	container: IFluidContainer;
	undoRedo: undoRedo;
	drag: DragManager<DragAndRotatePackage | null>;
	resize: ResizeManager<ResizePackage | null>;
}): JSX.Element {
	const { tree, itemSelection, tableSelection, users, container, undoRedo, drag, resize } = props;
	const [connectionState, setConnectionState] = useState("");
	const [saved, setSaved] = useState(false);
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
	const [commentPaneHidden, setCommentPaneHidden] = useState(true);
	const [selectedItemId, setSelectedItemId] = useState<string>("");
	const [selectedColumnId, setSelectedColumnId] = useState<string>("");
	const [selectedRowId, setSelectedRowId] = useState<string>("");
	const [view] = useState<TreeView<typeof App>>(tree);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);
	const commentPaneRef = useRef<CommentPaneRef>(null);

	// Function to open comment pane and focus input
	const openCommentPaneAndFocus = (itemId: string) => {
		setSelectedItemId(itemId);
		setCommentPaneHidden(false);
		// Use setTimeout to ensure the pane is rendered before focusing
		setTimeout(() => {
			commentPaneRef.current?.focusInput();
		}, 0);
	};

	useTree(tree.root);
	useTree(view.root.items);
	useTree(view.root.comments);

	useEffect(() => {
		const updateConnectionState = () => {
			if (container.connectionState === ConnectionState.Connected) {
				setConnectionState("connected");
			} else if (container.connectionState === ConnectionState.Disconnected) {
				setConnectionState("disconnected");
			} else if (container.connectionState === ConnectionState.EstablishingConnection) {
				setConnectionState("connecting");
			} else if (container.connectionState === ConnectionState.CatchingUp) {
				setConnectionState("catching up");
			}
		};
		updateConnectionState();
		setSaved(!container.isDirty);
		container.on("connected", updateConnectionState);
		container.on("disconnected", updateConnectionState);
		container.on("dirty", () => setSaved(false));
		container.on("saved", () => setSaved(true));
		container.on("disposed", updateConnectionState);
	}, [container]);

	/** Unsubscribe to undo-redo events when the component unmounts */
	useEffect(() => {
		// Update undo/redo state whenever commits occur
		const updateUndoRedoState = () => {
			setCanUndo(undoRedo.canUndo());
			setCanRedo(undoRedo.canRedo());
		};

		// Initial update
		updateUndoRedoState();

		// Listen for commits to update undo/redo state
		const unsubscribe = tree.events.on("commitApplied", updateUndoRedoState);

		// Cleanup function
		return () => {
			unsubscribe();
			undoRedo.dispose();
		};
	}, [tree.events, undoRedo]);

	useEffect(() => {
		console.log("View Changed");
	}, [view]);

	useEffect(() => {
		const unsubscribe = itemSelection.events.on("localUpdated", () => {
			const itemId =
				itemSelection.getLocalSelection().length !== 0
					? itemSelection.getLocalSelection()[0].id
					: undefined;

			const selectedItem = view.root.items.find((item) => item.id === itemId);

			setSelectedItemId(selectedItem?.id ?? "");
		});
		return unsubscribe;
	}, [view, itemSelection]);

	useEffect(() => {
		const unsubscribe = tableSelection.events.on("localUpdated", () => {
			const selection = tableSelection.getLocalSelection();
			const columnSelection = selection.find((sel) => sel.type === "column");
			const rowSelection = selection.find((sel) => sel.type === "row");
			setSelectedColumnId(columnSelection?.id ?? "");
			setSelectedRowId(rowSelection?.id ?? "");
		});
		return unsubscribe;
	}, [tableSelection]);

	// Keyboard shortcuts
	const shortcuts = useAppKeyboardShortcuts({
		view,
		canvasSize,
		selectedItemId,
		selectedColumnId,
		selectedRowId,
		commentPaneHidden,
		undoRedo,
		users,
		canUndo,
		canRedo,
		setCommentPaneHidden,
		openCommentPaneAndFocus,
	});

	useKeyboardShortcuts({
		shortcuts,
	});

	return (
		<PresenceContext.Provider
			value={{
				users: users,
				itemSelection: itemSelection,
				tableSelection: tableSelection,
				drag: drag,
				resize: resize,
				branch: view !== tree,
			}}
		>
			<CommentPaneContext.Provider value={{ openCommentPaneAndFocus }}>
				<div
					id="main"
					className="flex flex-col bg-transparent h-screen w-full overflow-hidden overscroll-none"
				>
					<Header saved={saved} connectionState={connectionState} />{" "}
					<Toolbar className="h-[48px] shadow-lg flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap min-h-[48px] max-h-[48px]">
						<ToolbarGroup>
							<TooltipButton
								tooltip="Undo"
								keyboardShortcut="Ctrl+Z"
								onClick={() => undoRedo.undo()}
								icon={<ArrowUndoFilled />}
								disabled={!canUndo}
							/>
							<TooltipButton
								tooltip="Redo"
								keyboardShortcut="Ctrl+Y"
								onClick={() => undoRedo.redo()}
								icon={<ArrowRedoFilled />}
								disabled={!canRedo}
							/>
						</ToolbarGroup>
						<ToolbarDivider />
						<ToolbarGroup>
							<NewCircleButton items={view.root.items} canvasSize={canvasSize} />
							<NewSquareButton items={view.root.items} canvasSize={canvasSize} />
							<NewTriangleButton items={view.root.items} canvasSize={canvasSize} />
							<NewStarButton items={view.root.items} canvasSize={canvasSize} />
							<NewNoteButton items={view.root.items} canvasSize={canvasSize} />
							<NewTableButton items={view.root.items} canvasSize={canvasSize} />
						</ToolbarGroup>
						{(() => {
							const selectedItem = view.root.items.find(
								(item) => item.id === selectedItemId
							);

							// Only show divider and buttons when an item is selected
							if (!selectedItem) {
								return null;
							}

							return (
								<div className="flex items-center h-full toolbar-slide-in">
									<ToolbarDivider />
									<ToolbarGroup>
										<VoteButton vote={selectedItem.votes} />
										<CommentButton item={selectedItem} />
										<DuplicateButton
											item={selectedItem}
											items={view.root.items}
											canvasSize={canvasSize}
										/>
										<DeleteButton
											delete={() => {
												selectedItem.delete();
											}}
										/>
									</ToolbarGroup>
									<ToolbarDivider />
									<ToolbarGroup>
										<SendItemToBackButton
											items={view.root.items}
											selectedItemId={selectedItemId}
										/>
										<MoveItemBackwardButton
											items={view.root.items}
											selectedItemId={selectedItemId}
										/>
										<MoveItemForwardButton
											items={view.root.items}
											selectedItemId={selectedItemId}
										/>
										<BringItemToFrontButton
											items={view.root.items}
											selectedItemId={selectedItemId}
										/>
									</ToolbarGroup>
									{Tree.is(selectedItem.content, Shape) && (
										<div className="flex items-center h-full toolbar-slide-in-delayed">
											<ToolbarDivider />
											<ToolbarGroup>
												<ColorPicker shape={selectedItem.content} />
											</ToolbarGroup>
										</div>
									)}
									{Tree.is(selectedItem.content, FluidTable) && (
										<div className="flex items-center h-full toolbar-slide-in-delayed">
											<ToolbarDivider />
											<ToolbarGroup>
												<AddColumnButton table={selectedItem.content} />
												<AddRowButton table={selectedItem.content} />
												<DeleteSelectedRowsButton
													table={selectedItem.content}
													selection={tableSelection}
												/>
												<MoveColumnLeftButton
													table={selectedItem.content}
													selectedColumnId={selectedColumnId}
												/>
												<MoveColumnRightButton
													table={selectedItem.content}
													selectedColumnId={selectedColumnId}
												/>
												<MoveRowUpButton
													table={selectedItem.content}
													selectedRowId={selectedRowId}
												/>
												<MoveRowDownButton
													table={selectedItem.content}
													selectedRowId={selectedRowId}
												/>
											</ToolbarGroup>
										</div>
									)}
								</div>
							);
						})()}
						<ToolbarDivider />
						<ToolbarGroup>
							<TooltipButton
								tooltip="Remove all items from the canvas"
								keyboardShortcut="Ctrl+Shift+Delete"
								icon={<DeleteRegular />}
								onClick={() => view.root.items.removeRange()}
								disabled={view.root.items.length === 0}
							/>
						</ToolbarGroup>
						<ToolbarDivider />
						<ToolbarGroup>
							<ShowPaneButton
								hiddenIcon={<CommentRegular />}
								shownIcon={<CommentFilled />}
								hidePane={setCommentPaneHidden}
								paneHidden={commentPaneHidden}
								tooltip="Comments"
								keyboardShortcut="Ctrl+M"
							/>
						</ToolbarGroup>
						{view !== tree ? (
							<ToolbarGroup style={{ marginLeft: "auto" }}>
								<MessageBarComponent message="While viewing an AI Task, others will not see your changes (and you will not see theirs) until you complete the task." />
							</ToolbarGroup>
						) : (
							<></>
						)}
					</Toolbar>
					<div className="flex h-[calc(100vh-96px)] w-full flex-row ">
						<PaneContext.Provider
							value={{
								panes: [{ name: "comments", visible: !commentPaneHidden }],
							}}
						>
							<Canvas
								items={view.root.items}
								container={container}
								setSize={(width, height) => setCanvasSize({ width, height })}
							/>
						</PaneContext.Provider>
						<CommentPane
							ref={commentPaneRef}
							hidden={commentPaneHidden}
							setHidden={setCommentPaneHidden}
							itemId={selectedItemId}
							app={view.root}
						/>
					</div>
				</div>
			</CommentPaneContext.Provider>
		</PresenceContext.Provider>
	);
}

export function Header(props: { saved: boolean; connectionState: string }): JSX.Element {
	const { saved, connectionState } = props;

	return (
		<div className="h-[48px] flex shrink-0 flex-row items-center justify-between bg-black text-base text-white z-40 w-full text-nowrap">
			<div className="flex items-center">
				<div className="flex ml-2 mr-8">
					<Text weight="bold">Fluid Framework Demo</Text>
				</div>
			</div>
			<div className="flex flex-row items-center m-2">
				<SaveStatus saved={saved} />
				<HeaderDivider />
				<ConnectionStatus connectionState={connectionState} />
				<HeaderDivider />
				<UserCorner />
			</div>
		</div>
	);
}

export function SaveStatus(props: { saved: boolean }): JSX.Element {
	const { saved } = props;
	return (
		<div className="flex items-center">
			<Text>{saved ? "" : "not"}&nbsp;saved</Text>
		</div>
	);
}

export function ConnectionStatus(props: { connectionState: string }): JSX.Element {
	const { connectionState } = props;
	return (
		<div className="flex items-center">
			<Text>{connectionState}</Text>
		</div>
	);
}

export function UserCorner(): JSX.Element {
	return (
		<div className="flex flex-row items-center gap-4 mr-2">
			<Facepile />
			<CurrentUser />
		</div>
	);
}

export const HeaderDivider = (): JSX.Element => {
	return <ToolbarDivider />;
};

export const CurrentUser = (): JSX.Element => {
	const users = useContext(PresenceContext).users;
	const currentUser = users.getMyself().value;

	// Debug logging
	console.log("CurrentUser component - user data:", {
		name: currentUser.name,
		id: currentUser.id,
		hasImage: !!currentUser.image,
		imageLength: currentUser.image?.length,
	});

	return (
		<Avatar
			name={currentUser.name}
			image={currentUser.image ? { src: currentUser.image } : undefined}
			size={24}
		/>
	);
};

export const Facepile = (props: Partial<AvatarGroupProps>) => {
	const users = useContext(PresenceContext).users;
	const [userRoster, setUserRoster] = useState(users.getConnectedUsers());

	useEffect(() => {
		// Check for changes to the user roster and update the avatar group if necessary
		const unsubscribe = users.events.on("remoteUpdated", () => {
			setUserRoster(users.getConnectedUsers());
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		// Update the user roster when users disconnect
		const unsubscribe = users.clients.events.on("attendeeDisconnected", () => {
			setUserRoster(users.getConnectedUsers());
		});
		return unsubscribe;
	}, []);

	const { inlineItems, overflowItems } = partitionAvatarGroupItems<User>({
		items: userRoster,
		maxInlineItems: 3, // Maximum number of inline avatars before showing overflow
	});

	if (inlineItems.length === 0) {
		return null; // No users to display
	}

	return (
		<AvatarGroup size={24} {...props}>
			{inlineItems.map((user) => (
				<Tooltip
					key={String(user.client.attendeeId ?? user.value.name)}
					content={user.value.name}
					relationship={"label"}
				>
					<AvatarGroupItem
						name={user.value.name}
						image={user.value.image ? { src: user.value.image } : undefined}
						key={String(user.client.attendeeId ?? user.value.name)}
					/>
				</Tooltip>
			))}
			{overflowItems && (
				<AvatarGroupPopover>
					{overflowItems.map((user) => (
						<AvatarGroupItem
							name={user.value.name}
							image={user.value.image ? { src: user.value.image } : undefined}
							key={String(user.client.attendeeId ?? user.value.name)}
						/>
					))}
				</AvatarGroupPopover>
			)}
		</AvatarGroup>
	);
};

export function MessageBarComponent(props: { message: string }): JSX.Element {
	const { message } = props;
	return (
		<MessageBar>
			<MessageBarBody>
				<MessageBarTitle>{message}</MessageBarTitle>
			</MessageBarBody>
		</MessageBar>
	);
}
