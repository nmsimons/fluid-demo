import React, { JSX, useContext } from "react";
import { Tree } from "fluid-framework";
import {
	GroupRegular,
	GroupReturnRegular,
	EditRegular,
	GridRegular,
	GridFilled,
} from "@fluentui/react-icons";
import { TooltipButton } from "../../forms/Button.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { Group, Item } from "../../../../schema/appSchema.js";
import {
	addToGroup,
	canAddToGroup,
	canGroupItems,
	canUngroupItems,
	groupItems,
	ungroupItems,
} from "../../../../utils/itemsHelpers.js";
import { isGroupGridEnabled } from "../../../layout/groupGrid.js";
import { useTree } from "../../../hooks/useTree.js";
import { createSchemaUser } from "../../../../utils/userUtils.js";

export function GroupButton(props: { selectedItems: Item[] }): JSX.Element {
	const { selectedItems } = props;
	const presence = useContext(PresenceContext);

	const canGroup = canGroupItems(selectedItems);
	const addToGroupResult = canAddToGroup(selectedItems);
	const isAddToGroupMode = addToGroupResult.canAdd;
	const disabled = !canGroup && !isAddToGroupMode;

	// Determine tooltip message
	let tooltip = "Group selected items";
	if (isAddToGroupMode) {
		tooltip = "Add selected items to group";
	} else if (disabled) {
		if (selectedItems.length <= 1) {
			tooltip = "Select at least two items";
		} else {
			tooltip = "Items must share the same container";
		}
	}

	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				if (disabled) {
					return;
				}

				// Save the current selection IDs
				const selectedIds = selectedItems.map((item) => ({ id: item.id }));

				if (isAddToGroupMode && addToGroupResult.targetGroup) {
					addToGroup(selectedItems, addToGroupResult.targetGroup);
					// Keep the selection on all items (now including items added to group)
					presence.itemSelection.setSelection(selectedIds);
				} else {
					const currentUser = presence.users.getMyself().value;
					const grouped = groupItems(
						selectedItems,
						createSchemaUser({ id: currentUser.id, name: currentUser.name })
					);
					if (grouped) {
						// Keep the selection on the child items (now inside the group)
						presence.itemSelection.setSelection(selectedIds);
					}
				}
			}}
			icon={<GroupRegular />}
			disabled={disabled}
			tooltip={tooltip}
		/>
	);
}

export function UngroupButton(props: { selectedItems: Item[] }): JSX.Element {
	const { selectedItems } = props;
	const presence = useContext(PresenceContext);

	const canUngroup = canUngroupItems(selectedItems);
	const disabled = !canUngroup;

	// Determine tooltip message
	let tooltip = "Ungroup selected items";
	if (disabled) {
		if (selectedItems.length === 0) {
			tooltip = "Select a group or items in a group to ungroup";
		} else if (selectedItems.length === 1 && Tree.is(selectedItems[0].content, Group)) {
			tooltip = "Ungroup this group";
		} else {
			tooltip = "Select items in the same group to ungroup them";
		}
	}

	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				if (disabled) {
					return;
				}

				// Save the current selection IDs
				const selectedIds = selectedItems.map((item) => ({ id: item.id }));

				ungroupItems(selectedItems);
				// Restore selection to the ungrouped items
				presence.itemSelection.setSelection(selectedIds);
			}}
			icon={<GroupReturnRegular />}
			disabled={disabled}
			tooltip={tooltip}
		/>
	);
}

export function RenameGroupButton(props: { group: Group; onEdit: () => void }): JSX.Element {
	const { group, onEdit } = props;
	useTree(group);
	return (
		<TooltipButton
			onClick={onEdit}
			icon={<EditRegular />}
			tooltip="Rename group"
			keyboardShortcut="F2"
		/>
	);
}

export function ToggleGridLayoutButton(props: { group: Group }): JSX.Element {
	const { group } = props;
	useTree(group);
	const gridEnabled = isGroupGridEnabled(group);
	return (
		<TooltipButton
			onClick={() => {
				group.viewAsGrid = !group.viewAsGrid;
			}}
			icon={gridEnabled ? <GridFilled /> : <GridRegular />}
			tooltip={gridEnabled ? "Disable grid layout" : "Enable grid layout"}
			active={gridEnabled}
		/>
	);
}
