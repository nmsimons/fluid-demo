import React from "react";
import { Item, FluidTable } from "../../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { Comment20Filled } from "@fluentui/react-icons";

export function CommentOverlay(props: {
	item: Item;
	layout: Map<string, { left: number; top: number; right: number; bottom: number }>;
	zoom: number;
	commentPaneVisible: boolean;
	selected: boolean;
}): JSX.Element | null {
	const { item, layout, zoom, commentPaneVisible, selected } = props;
	// Hide if no comments, pane not visible, or item selected
	if (!commentPaneVisible || selected || item.comments.length === 0) return null;
	const b = layout.get(item.id);
	if (!b) return null;
	const w = Math.max(0, b.right - b.left);
	const h = Math.max(0, b.bottom - b.top);

	// Angle: follow item rotation except tables which stay unrotated
	let angle = item.rotation;
	if (Tree.is(item.content, FluidTable)) angle = 0;

	// Geometry relative to selection rectangle: reuse selection padding & rotation gap
	const selectionPadding = 8; // matches SelectionOverlay padding
	const rotationGapPx = 22; // distance from top edge to rotation handle center (screen px)
	const iconSizePx = 20; // Fluent Comment20 icon intrinsic size

	// Position icon so its center sits where the old bubble center was (same vertical anchor as rotation handle)
	const centerYOffset = -(selectionPadding + rotationGapPx / zoom);

	// We'll render the Fluent icon and counter-scale it to remain constant size.
	return (
		<g
			data-svg-item-id={item.id}
			transform={`translate(${b.left}, ${b.top}) rotate(${angle}, ${w / 2}, ${h / 2})`}
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
