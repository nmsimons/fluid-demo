import React from "react";
import { Item, FluidTable } from "../../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { getActiveDragForItem } from "../utils/dragUtils.js";
import { Comment20Filled } from "@fluentui/react-icons";
import type { PresenceContext } from "../contexts/PresenceContext.js";

export function CommentOverlay(props: {
	item: Item;
	layout: Map<string, { left: number; top: number; right: number; bottom: number }>;
	zoom: number;
	commentPaneVisible: boolean;
	selected: boolean;
	presence: React.ContextType<typeof PresenceContext>;
}): JSX.Element | null {
	const { item, layout, zoom, commentPaneVisible, selected, presence } = props;
	// Hide if no comments, pane not visible, or item selected
	if (!commentPaneVisible || selected || item.comments.length === 0) return null;
	const b = layout.get(item.id);
	if (!b) return null;
	let left = b.left;
	let top = b.top;
	const w = Math.max(0, b.right - b.left);
	const h = Math.max(0, b.bottom - b.top);

	// Prefer live drag data while an item is being moved to avoid a frame of lag.
	const active = getActiveDragForItem(presence, item.id);
	if (active) {
		left = active.x;
		top = active.y;
	}

	// Angle: follow item rotation except tables which stay unrotated
	let angle = active ? active.rotation : item.rotation;
	if (Tree.is(item.content, FluidTable)) angle = 0;

	// Geometry relative to selection rectangle: reuse selection padding & rotation gap
	const selectionPadding = 8; // matches SelectionOverlay padding
	const rotationGapPx = 22; // distance from top edge to rotation handle center (screen px)
	const iconSizePx = 20; // Fluent Comment20 icon intrinsic size

	// Position icon so its center sits where the old bubble center was (same vertical anchor as rotation handle)
	const centerYOffset = -(selectionPadding + rotationGapPx / zoom);

	// Render icon and counter-scale to remain constant size
	return (
		<g
			data-svg-item-id={item.id}
			transform={`translate(${left}, ${top}) rotate(${angle}, ${w / 2}, ${h / 2})`}
			pointerEvents="none"
		>
			<g
				transform={`translate(${w / 2}, ${centerYOffset}) scale(${1 / zoom}) translate(${-iconSizePx / 2}, ${-iconSizePx / 2})`}
				opacity={0.95}
			>
				<Comment20Filled />
			</g>
		</g>
	);
}
