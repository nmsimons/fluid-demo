/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import {
	PositionForwardRegular,
	PositionBackwardRegular,
	PositionToFrontRegular,
	PositionToBackRegular,
} from "@fluentui/react-icons";
import { TooltipButton } from "../../forms/Button.js";
import { useTree } from "../../../hooks/useTree.js";
import { Items } from "../../../../schema/appSchema.js";
import { findItemById, getParentItems } from "../../../../utils/itemsHelpers.js";

// Z-order buttons
export function MoveItemForwardButton(props: {
	items: Items;
	selectedItemId?: string;
}): JSX.Element {
	const { items, selectedItemId } = props;
	useTree(items);
	const item = selectedItemId ? findItemById(items, selectedItemId) : undefined;
	const parentItems = item ? getParentItems(item) : undefined;
	const idx = item && parentItems ? parentItems.indexOf(item) : -1;
	const can = item && parentItems && idx >= 0 && idx < parentItems.length - 1;
	return (
		<TooltipButton
			onClick={() => {
				if (item && parentItems && can) parentItems.moveItemForward(item);
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
	const item = selectedItemId ? findItemById(items, selectedItemId) : undefined;
	const parentItems = item ? getParentItems(item) : undefined;
	const idx = item && parentItems ? parentItems.indexOf(item) : -1;
	const can = item && parentItems && idx > 0;
	return (
		<TooltipButton
			onClick={() => {
				if (item && parentItems && can) parentItems.moveItemBackward(item);
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
	const item = selectedItemId ? findItemById(items, selectedItemId) : undefined;
	const parentItems = item ? getParentItems(item) : undefined;
	const idx = item && parentItems ? parentItems.indexOf(item) : -1;
	const can = item && parentItems && idx >= 0 && idx < parentItems.length - 1;
	return (
		<TooltipButton
			onClick={() => {
				if (item && parentItems && can) parentItems.bringItemToFront(item);
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
	const item = selectedItemId ? findItemById(items, selectedItemId) : undefined;
	const parentItems = item ? getParentItems(item) : undefined;
	const idx = item && parentItems ? parentItems.indexOf(item) : -1;
	const can = item && parentItems && idx > 0;
	return (
		<TooltipButton
			onClick={() => {
				if (item && parentItems && can) parentItems.sendItemToBack(item);
			}}
			icon={<PositionToBackRegular />}
			tooltip="Send to back"
			keyboardShortcut="Ctrl+["
			disabled={!can}
		/>
	);
}
