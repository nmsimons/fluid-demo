import React, { JSX, useContext } from "react";
import { Tree } from "fluid-framework";
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

function GroupIcon(): JSX.Element {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
			<circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
			<path
				d="M5 19c0-3.2 3.2-5.75 7-5.75s7 2.55 7 5.75"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx="6"
				cy="9.5"
				r="2.25"
				stroke="currentColor"
				strokeWidth="1.25"
				opacity={0.7}
			/>
			<circle
				cx="18"
				cy="9.5"
				r="2.25"
				stroke="currentColor"
				strokeWidth="1.25"
				opacity={0.7}
			/>
		</svg>
	);
}

function UngroupIcon(): JSX.Element {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
			<circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
			<path
				d="M5 19c0-3.2 3.2-5.75 7-5.75s7 2.55 7 5.75"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx="6"
				cy="9.5"
				r="2.25"
				stroke="currentColor"
				strokeWidth="1.25"
				opacity={0.7}
			/>
			<circle
				cx="18"
				cy="9.5"
				r="2.25"
				stroke="currentColor"
				strokeWidth="1.25"
				opacity={0.7}
			/>
			{/* Add an "ungroup" indicator - arrow pointing outward */}
			<path
				d="M12 15 L14 13 M12 15 L10 13"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

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

				if (isUngroupMode) {
					ungroupItems(selectedItems);
				} else if (isAddToGroupMode && addToGroupResult.targetGroup) {
					addToGroup(selectedItems, addToGroupResult.targetGroup);
					// Keep the selection on the group
					presence.itemSelection.setSelection({ id: addToGroupResult.targetGroup.id });
				} else {
					const grouped = groupItems(selectedItems);
					if (grouped) {
						presence.itemSelection.setSelection({ id: grouped.id });
					}
				}
			}}
			icon={isUngroupMode ? <UngroupIcon /> : <GroupIcon />}
			disabled={disabled}
			tooltip={tooltip}
		/>
	);
}
