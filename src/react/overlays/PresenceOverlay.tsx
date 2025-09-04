import React from "react";
import { FluidTable, Item } from "../../schema/app_schema.js";
import { Tree } from "fluid-framework";
import { getActiveDragForItem } from "../utils/dragUtils.js";

export function PresenceOverlay(props: {
	item: Item;
	layout: Map<string, { left: number; top: number; right: number; bottom: number }>;
	presence: React.ContextType<typeof import("../contexts/PresenceContext.js").PresenceContext>;
	remoteIds: string[];
	zoom: number;
	getInitials: (name: string) => string;
	getUserColor: (id: string) => string;
	expanded: boolean;
	onToggleExpanded: (e: React.MouseEvent) => void;
}): JSX.Element | null {
	const {
		item,
		layout,
		presence,
		remoteIds,
		getInitials,
		getUserColor,
		expanded,
		onToggleExpanded,
		zoom,
	} = props;
	const b = layout.get(item.id);
	if (!b) return null;
	const w = Math.max(0, b.right - b.left);
	const h = Math.max(0, b.bottom - b.top);
	const active = getActiveDragForItem(presence, item.id);
	let angle = active ? active.rotation : item.rotation;
	if (Tree.is(item.content, FluidTable)) angle = 0;
	const connected = (presence.users.getConnectedUsers?.() ?? []) as unknown as ReadonlyArray<{
		value: { name: string; id: string; image?: string };
		client: { attendeeId: string };
	}>;
	const users = connected.filter((u) => remoteIds.includes(u.client.attendeeId));
	if (!users.length) return null;

	// Screen-space sizing constants
	const badgeRadius = 12; // px
	const badgeStroke = 2; // px
	const badgeFont = 10; // px
	const closeFont = 12; // px
	const stackSpacing = 26; // px between badges when expanded
	const closeExtraGap = 8; // px gap before close button

	// Selection overlay geometry (must mirror SelectionOverlay constants)
	const selectionPadding = 8; // matches SelectionOverlay padding
	const outwardGapPx = 2; // matches outward gap used for resize handles
	// Top-left resize handle center (in local coords) is at (-outwardLocal, -outwardLocal)
	const outwardLocal = selectionPadding + outwardGapPx / zoom;

	// Desired screen-space shift from the handle center: move right a bit & just below
	// Adjusted per feedback: move left (remove prior +8) and further down a bit
	const shiftRightPx = -12; // px (moved 4px further left)
	const shiftDownPx = 18; // px (increase from 12)

	// Convert to local units (pre-scale)
	const r = badgeRadius / zoom;
	const strokeW = badgeStroke / zoom;
	const fontSize = badgeFont / zoom;
	const fontSizeClose = closeFont / zoom;
	const spacing = stackSpacing / zoom;
	const closeOffset = closeExtraGap / zoom;

	// Anchor position for first badge (single or collapsed group)
	const anchorX = -outwardLocal + shiftRightPx / zoom;
	const anchorY = -outwardLocal + shiftDownPx / zoom;

	return (
		<g
			transform={`translate(${b.left}, ${b.top}) rotate(${angle}, ${w / 2}, ${h / 2})`}
			data-svg-item-id={item.id}
		>
			{users.length === 1 ? (
				<g
					transform={`translate(${anchorX}, ${anchorY})`}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<circle
						r={r}
						fill={getUserColor(users[0].client.attendeeId)}
						stroke="#fff"
						strokeWidth={strokeW}
					/>
					<text
						x={0}
						y={4 / zoom}
						textAnchor="middle"
						fontSize={fontSize}
						fontWeight={600}
						fill="#fff"
					>
						{getInitials(users[0].value.name)}
					</text>
				</g>
			) : (
				<g onMouseDown={(e) => e.stopPropagation()}>
					{!expanded ? (
						<g
							transform={`translate(${anchorX}, ${anchorY})`}
							cursor="pointer"
							onClick={onToggleExpanded}
						>
							<circle r={r} fill="#000" stroke="#fff" strokeWidth={strokeW} />
							<text
								x={0}
								y={4 / zoom}
								textAnchor="middle"
								fontSize={fontSize}
								fontWeight={600}
								fill="#fff"
							>
								{users.length}
							</text>
						</g>
					) : (
						<g>
							{users.map((user, idx) => (
								<g
									key={user.client.attendeeId}
									transform={`translate(${anchorX}, ${anchorY + idx * spacing})`}
								>
									<circle
										r={r}
										fill={getUserColor(user.client.attendeeId)}
										stroke="#fff"
										strokeWidth={strokeW}
									/>
									<text
										x={0}
										y={4 / zoom}
										textAnchor="middle"
										fontSize={fontSize}
										fontWeight={600}
										fill="#fff"
									>
										{getInitials(user.value.name)}
									</text>
								</g>
							))}
							<g
								transform={`translate(${anchorX}, ${anchorY + users.length * spacing + closeOffset})`}
								cursor="pointer"
								onClick={onToggleExpanded}
							>
								<circle r={r} fill="#4b5563" stroke="#fff" strokeWidth={strokeW} />
								<text
									x={0}
									y={4 / zoom}
									textAnchor="middle"
									fontSize={fontSizeClose}
									fontWeight={700}
									fill="#fff"
								>
									×
								</text>
							</g>
						</g>
					)}
				</g>
			)}
		</g>
	);
}
