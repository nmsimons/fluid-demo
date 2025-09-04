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
	return (
		<g
			transform={`translate(${b.left}, ${b.top}) rotate(${angle}, ${w / 2}, ${h / 2})`}
			data-svg-item-id={item.id}
		>
			{users.length === 1 ? (
				<g
					transform={`translate(${w - 12}, ${-12})`}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<circle
						r={12}
						fill={getUserColor(users[0].client.attendeeId)}
						stroke="#fff"
						strokeWidth={2}
					/>
					<text
						x={0}
						y={4}
						textAnchor="middle"
						fontSize={10}
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
							transform={`translate(${w - 12}, ${-12})`}
							cursor="pointer"
							onClick={onToggleExpanded}
						>
							<circle r={12} fill="#000" stroke="#fff" strokeWidth={2} />
							<text
								x={0}
								y={4}
								textAnchor="middle"
								fontSize={10}
								fontWeight={600}
								fill="#fff"
							>
								{users.length}
							</text>
						</g>
					) : (
						<g>
							{users.map(
								(
									user: {
										value: { name: string };
										client: { attendeeId: string };
									},
									idx: number
								) => (
									<g
										key={user.client.attendeeId}
										transform={`translate(${w - 12 - idx * 26}, ${-12})`}
									>
										<circle
											r={12}
											fill={getUserColor(user.client.attendeeId)}
											stroke="#fff"
											strokeWidth={2}
										/>
										<text
											x={0}
											y={4}
											textAnchor="middle"
											fontSize={10}
											fontWeight={600}
											fill="#fff"
										>
											{getInitials(user.value.name)}
										</text>
									</g>
								)
							)}
							<g
								transform={`translate(${w - 12 - users.length * 26 - 14}, ${-12})`}
								cursor="pointer"
								onClick={onToggleExpanded}
							>
								<circle r={12} fill="#4b5563" stroke="#fff" strokeWidth={2} />
								<text
									x={0}
									y={4}
									textAnchor="middle"
									fontSize={12}
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
