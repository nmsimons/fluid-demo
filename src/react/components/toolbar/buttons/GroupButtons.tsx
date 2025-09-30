import React, { JSX, useContext } from "react";
import { TooltipButton } from "../../forms/Button.js";
import { PresenceContext } from "../../../contexts/PresenceContext.js";
import { Item } from "../../../../schema/appSchema.js";
import { canGroupItems, groupItems } from "../../../../utils/itemsHelpers.js";

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

export function GroupItemsButton(props: { selectedItems: Item[] }): JSX.Element {
	const { selectedItems } = props;
	const presence = useContext(PresenceContext);
	const disabled = !canGroupItems(selectedItems);

	return (
		<TooltipButton
			onClick={(e) => {
				e.stopPropagation();
				if (disabled) {
					return;
				}
				const grouped = groupItems(selectedItems);
				if (grouped) {
					presence.itemSelection.setSelection({ id: grouped.id });
				}
			}}
			icon={<GroupIcon />}
			disabled={disabled}
			tooltip={disabled ? "Select at least two items to group" : "Group selected items"}
		/>
	);
}
