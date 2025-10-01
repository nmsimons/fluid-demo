import React, { JSX, useContext } from "react";
import { Tree } from "fluid-framework";
import { GroupRegular, GroupReturnRegular } from "@fluentui/react-icons";
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

export function GroupItemsButton(props: { selectedItems: Item[] }): JSX.Element {
	const { selectedItems } = props;
	const presence = useContext(PresenceContext);

	const canGroup = canGroupItems(selectedItems);
	const canUngroup = canUngroupItems(selectedItems);
	const addToGroupResult = canAddToGroup(selectedItems);

	// Determine which mode we're in (priority order: ungroup > add to group > group)
	const isUngroupMode = canUngroup;
	const isAddToGroupMode = !isUngroupMode && addToGroupResult.canAdd;
	const isGroupMode = !isUngroupMode && !isAddToGroupMode && canGroup;
	const disabled = !isUngroupMode && !isAddToGroupMode && !isGroupMode;

	// Determine tooltip message
	let tooltip = "Group selected items";
	if (isUngroupMode) {
		tooltip = "Ungroup selected items";
	} else if (isAddToGroupMode) {
		tooltip = "Add selected items to group";
	} else if (disabled) {
		if (selectedItems.length <= 1) {
			tooltip = "Select at least two items to group";
		} else {
			const parent = Tree.parent(selectedItems[0]);
			const grandParent = parent !== undefined ? Tree.parent(parent) : undefined;
			if (grandParent !== undefined && Tree.is(grandParent, Group)) {
				tooltip = "Cannot group items that are already in a group";
			} else {
				tooltip = "Selected items must be at the same level to group";
			}
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

				if (isUngroupMode) {
					ungroupItems(selectedItems);
					// Restore selection to the ungrouped items
					presence.itemSelection.setSelection(selectedIds);
				} else if (isAddToGroupMode && addToGroupResult.targetGroup) {
					addToGroup(selectedItems, addToGroupResult.targetGroup);
					// Keep the selection on all items (now including items added to group)
					presence.itemSelection.setSelection(selectedIds);
				} else {
					const grouped = groupItems(selectedItems);
					if (grouped) {
						// Keep the selection on the child items (now inside the group)
						presence.itemSelection.setSelection(selectedIds);
					}
				}
			}}
			icon={isUngroupMode ? <GroupReturnRegular /> : <GroupRegular />}
			disabled={disabled}
			tooltip={tooltip}
		/>
	);
}
