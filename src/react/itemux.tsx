import React, { JSX, useState, useEffect, useContext, useRef } from "react";
import { Comments, FluidTable, Item, Note, Shape } from "../schema/app_schema.js";
import { PresenceContext } from "./contexts/PresenceContext.js";
import { ShapeView } from "./shapeux.js";
import { Tree } from "fluid-framework";
import { DragAndRotatePackage } from "../utils/presence/drag.js";
import { ResizePackage } from "../utils/presence/Interfaces/ResizeManager.js";
import { NoteView } from "./noteux.js";
import { objectIdNumber, useTree } from "./hooks/useTree.js";
import { usePresenceManager } from "./hooks/usePresenceManger.js";
import { PresenceManager } from "../utils/presence/Interfaces/PresenceManager.js";
import { TableView } from "./tableux.js";
import { Comment20Filled, ChevronLeft16Filled } from "@fluentui/react-icons";
import { PaneContext } from "./contexts/PaneContext.js";
import { LayoutContext } from "./hooks/useLayoutManger.js";

/**
 * Utility function to generate consistent user colors
 * Creates a unique color for each user based on their ID
 */
const getUserColor = (userId: string): string => {
	const colors = [
		"#3b82f6", // blue
		"#ef4444", // red
		"#10b981", // green
		"#f59e0b", // yellow
		"#8b5cf6", // purple
		"#06b6d4", // cyan
		"#f97316", // orange
		"#84cc16", // lime
		"#ec4899", // pink
		"#6366f1", // indigo
		"#f43f5e", // rose
		"#06b6d4", // cyan
		"#14b8a6", // teal
		"#a855f7", // violet
		"#0ea5e9", // sky
	];

	// Simple hash function to get consistent color
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = userId.charCodeAt(i) + ((hash << 5) - hash);
	}
	return colors[Math.abs(hash) % colors.length];
};

/**
 * Utility function to extract initials from a user name
 */
const getInitials = (name: string): string => {
	if (!name) return "?";
	const words = name.trim().split(/\s+/);
	if (words.length === 1) {
		return words[0].charAt(0).toUpperCase();
	}
	return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

const getContentType = (item: Item): string => {
	if (Tree.is(item.content, Shape)) {
		return "shape";
	} else if (Tree.is(item.content, Note)) {
		return "note";
	} else if (Tree.is(item.content, FluidTable)) {
		return "table";
	} else {
		return "unknown";
	}
};

export function ContentElement(props: {
	item: Item;
	shapeProps?: { sizeOverride?: number };
}): JSX.Element {
	const { item, shapeProps } = props;
	useTree(item.content);

	if (Tree.is(item.content, Shape)) {
		return (
			<ShapeView
				key={objectIdNumber(item.content)}
				shape={item.content}
				sizeOverride={shapeProps?.sizeOverride}
			/>
		);
	} else if (Tree.is(item.content, Note)) {
		return <NoteView key={objectIdNumber(item.content)} note={item.content} />;
	} else if (Tree.is(item.content, FluidTable)) {
		return <TableView key={objectIdNumber(item.content)} fluidTable={item.content} />;
	} else {
		return <></>;
	}
}

export function ItemView(props: {
	item: Item;
	index: number;
	canvasPosition: { left: number; top: number };
	hideSelectionControls?: boolean;
	pan?: { x: number; y: number };
	zoom?: number;
}): JSX.Element {
	const { item, index, hideSelectionControls } = props;
	const itemInval = useTree(item);
	const [offset, setOffset] = useState({ x: 0, y: 0 });

	const presence = useContext(PresenceContext); // Placeholder for context if needed
	const layout = useContext(LayoutContext);

	const [selected, setSelected] = useState(presence.itemSelection.testSelection({ id: item.id }));

	// Shape-specific props for temporary overrides during resize
	const [shapeProps, setShapeProps] = useState<{
		sizeOverride?: number;
	}>({});

	// Cache intrinsic (unscaled) size to update layout synchronously during drag/resize
	const intrinsicSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

	const [itemProps, setItemProps] = useState<{
		left: number;
		top: number;
		zIndex: number;
		transform: string;
	}>({
		left: item.x,
		top: item.y,
		zIndex: index,
		transform: `rotate(${item.rotation}deg)`,
	});

	useEffect(() => {
		setItemProps({
			left: item.x,
			top: item.y,
			zIndex: index,
			transform:
				getContentType(item) === "table" ? `rotate(0)` : `rotate(${item.rotation}deg)`,
		});
	}, [itemInval, item]);

	const setPropsOnDrag = (dragData: DragAndRotatePackage) => {
		if (dragData && dragData.id === item.id) {
			setItemProps({
				left: dragData.x,
				top: dragData.y,
				zIndex: index,
				transform:
					getContentType(item) === "table"
						? `rotate(0)`
						: `rotate(${dragData.rotation}deg)`,
			});
			// Update layout immediately to keep overlays in sync (local and remote drags)
			const w =
				intrinsicSizeRef.current.w ||
				(Tree.is(item.content, Shape) ? (shapeProps.sizeOverride ?? item.content.size) : 0);
			const h =
				intrinsicSizeRef.current.h ||
				(Tree.is(item.content, Shape) ? (shapeProps.sizeOverride ?? item.content.size) : 0);
			if (w && h) {
				layout.set(item.id, {
					left: dragData.x,
					top: dragData.y,
					right: dragData.x + w,
					bottom: dragData.y + h,
				});
			}
		}
	};

	const setPropsOnResize = (resizeData: ResizePackage | null) => {
		if (resizeData && resizeData.id === item.id && Tree.is(item.content, Shape)) {
			// Update position via itemProps
			setItemProps((prev) => ({
				...prev,
				left: resizeData.x,
				top: resizeData.y,
			}));

			// Update size via shapeProps override
			setShapeProps({
				sizeOverride: resizeData.size,
			});

			// Update intrinsic size cache and layout immediately
			intrinsicSizeRef.current = { w: resizeData.size, h: resizeData.size };
			layout.set(item.id, {
				left: resizeData.x,
				top: resizeData.y,
				right: resizeData.x + resizeData.size,
				bottom: resizeData.y + resizeData.size,
			});
		} else if (!resizeData || resizeData.id !== item.id) {
			// Clear overrides when no resize data for this item
			setShapeProps({});
		}
	};

	const clearShapeProps = () => {
		setShapeProps({});
	};

	usePresenceManager(
		presence.drag as PresenceManager<DragAndRotatePackage>,
		(update) => {
			if (update) {
				setPropsOnDrag(update);
			}
		},
		setPropsOnDrag
	);

	usePresenceManager(
		presence.resize as PresenceManager<ResizePackage | null>,
		(update) => {
			setPropsOnResize(update);
		},
		setPropsOnResize
	);

	usePresenceManager(
		presence.itemSelection,
		() => {},
		(update) => {
			setSelected(update.some((selection) => selection.id === item.id));
		}
	);

	const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
		e.stopPropagation();
		const { x, y } = getOffsetCoordinates(e);
		presence.drag.setDragging({
			id: item.id,
			x,
			y,
			rotation: item.rotation,
			branch: presence.branch,
		});
	};

	const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
		e.stopPropagation();
		presence.itemSelection.setSelection({ id: item.id });
		setOffset(calculateOffsetFromCanvasOrigin(e, item, props.pan, props.zoom));
		e.dataTransfer.setDragImage(new Image(), 0, 0);
	};

	const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
		e.stopPropagation();
		const { x, y } = getOffsetCoordinates(e);
		Tree.runTransaction(item, () => {
			item.x = x;
			item.y = y;
		});
		presence.drag.clearDragging();
	};

	const getOffsetCoordinates = (e: React.DragEvent<HTMLDivElement>): { x: number; y: number } => {
		const mouseCoordinates = calculateCanvasMouseCoordinates(e, props.pan, props.zoom);
		const coordinates = { x: mouseCoordinates.x - offset.x, y: mouseCoordinates.y - offset.y };
		return coordinates;
	};

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (presence.itemSelection) {
			if (e.ctrlKey || e.metaKey) {
				// Multi-select: toggle selection of this item
				presence.itemSelection.toggleSelection({ id: item.id });
			} else {
				// Single-select: clear other selections and select this item
				presence.itemSelection.setSelection({ id: item.id });
			}
		}
	};

	// Always use the natural z-order based on position in array
	itemProps.zIndex = index;

	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		// Determine intrinsic (unscaled) size once per change
		let w0 = 0;
		let h0 = 0;
		if (Tree.is(item.content, Shape)) {
			const size = shapeProps.sizeOverride ?? item.content.size;
			w0 = size;
			h0 = size;
		} else {
			const bb = el.getBoundingClientRect();
			w0 = el.offsetWidth || bb.width;
			h0 = el.offsetHeight || bb.height;
		}
		intrinsicSizeRef.current = { w: w0, h: h0 };
		// Use model-space position from itemProps to avoid DOM-measure lag
		const left = itemProps.left;
		const top = itemProps.top;
		layout.set(item.id, { left, top, right: left + w0, bottom: top + h0 });
		// Recompute when position or intrinsic size changes
	}, [layout, item.id, itemProps.left, itemProps.top, shapeProps.sizeOverride, item.content]);

	return (
		<div
			ref={ref}
			data-item-id={item.id}
			onClick={(e) => handleClick(e)}
			onDragStart={(e) => handleDragStart(e)}
			onDrag={(e) => handleDrag(e)}
			onDragEnd={(e) => handleDragEnd(e)}
			draggable="true"
			className={`absolute`}
			style={{ ...itemProps }}
		>
			<CommentIndicator comments={item.comments} selected={selected} />
			{
				<SelectionBox
					selected={selected}
					item={item}
					onResizeEnd={clearShapeProps}
					visualHidden={!!hideSelectionControls}
				/>
			}
			<ContentElement item={item} shapeProps={shapeProps} />
		</div>
	);
}

export function CommentIndicator(props: { comments: Comments; selected: boolean }): JSX.Element {
	const { comments, selected } = props;
	useTree(comments, true);

	const panes = useContext(PaneContext).panes;
	const visible =
		(panes.find((pane) => pane.name === "comments")?.visible ?? false) &&
		comments.length > 0 &&
		!selected; // Hide when item is selected

	return (
		<div
			className={`absolute pointer-events-none flex flex-row justify-center items-center ${visible ? "" : " hidden"}`}
			style={{
				top: -35, // Position above the item, same as rotation handle
				left: "50%", // Center horizontally
				transform: "translateX(-50%)", // Center the icon
				zIndex: 10000,
				width: "24px",
				height: "24px",
			}}
		>
			<Comment20Filled />
		</div>
	);
}

/**
 * RemoteSelectionIndicators Component
 *
 * Displays user-specific selection indicators for remote selections.
 * Shows a collapsible badge system: when multiple users select an item,
 * shows a count badge that expands to individual user badges when clicked.
 */
export function RemoteSelectionIndicators(props: { remoteSelectedUsers: string[] }): JSX.Element {
	const { remoteSelectedUsers } = props;
	const presence = useContext(PresenceContext);
	const [expanded, setExpanded] = useState(false);

	if (remoteSelectedUsers.length === 0) {
		return <></>;
	}

	// Get user information for each remote selection
	const remoteUsers = remoteSelectedUsers
		.map((userId) => {
			// Find the user in the connected users list
			const connectedUsers = presence.users.getConnectedUsers();
			const user = connectedUsers.find((u) => u.client.attendeeId === userId);
			return user;
		})
		.filter((user) => user !== undefined);

	// If no valid users found, don't show anything
	if (remoteUsers.length === 0) {
		return <></>;
	}

	// If only one user, show their badge directly
	if (remoteUsers.length === 1) {
		return (
			<div
				className="absolute pointer-events-none"
				style={{ top: 0, right: 0, zIndex: 1001 }}
			>
				<RemoteUserIndicator user={remoteUsers[0]} index={0} />
			</div>
		);
	}

	const handleExpand = () => {
		setExpanded(true);
	};

	const handleCollapse = () => {
		setExpanded(false);
	};

	// Multiple users: show collapsible system
	return (
		<div className="absolute" style={{ top: 0, right: 0, zIndex: 1001 }}>
			{expanded ? (
				// Expanded view: show individual user badges with staggered animation
				<div className="pointer-events-none relative">
					{remoteUsers.map((user, index) => (
						<div
							key={user.client.attendeeId}
							className="transition-all duration-300 ease-out"
							style={{
								transform: `translateX(${expanded ? 0 : 20}px)`,
								opacity: expanded ? 1 : 0,
								transitionDelay: `${index * 50}ms`,
							}}
						>
							<RemoteUserIndicator user={user} index={index} />
						</div>
					))}
					{/* Collapse button */}
					<div
						className="absolute pointer-events-auto cursor-pointer w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-700 transition-all duration-200 border-2 border-white shadow-lg flex items-center justify-center"
						style={{
							top: -12,
							right: -12 - remoteUsers.length * 26,
							zIndex: 1002,
							transform: `scale(${expanded ? 1 : 0})`,
							opacity: expanded ? 1 : 0,
							transitionDelay: `${remoteUsers.length * 50}ms`,
						}}
						onClick={(e) => {
							e.stopPropagation();
							handleCollapse();
						}}
						title="Collapse user list"
					>
						<ChevronLeft16Filled className="text-white" />
					</div>
				</div>
			) : (
				// Collapsed view: show count badge with smooth transition
				<div
					className="transition-all duration-300 ease-out"
					style={{
						transform: `scale(${expanded ? 0 : 1})`,
						opacity: expanded ? 0 : 1,
					}}
				>
					<MultiUserCountBadge
						userCount={remoteUsers.length}
						users={remoteUsers}
						onExpand={handleExpand}
					/>
				</div>
			)}
		</div>
	);
}

/**
 * MultiUserCountBadge Component
 *
 * Displays a count badge showing the number of users who have selected an item.
 * Includes a preview of the first few users and can be clicked to expand.
 */
function MultiUserCountBadge(props: {
	userCount: number;
	users: Array<{
		value: { name: string; id: string; image?: string };
		client: { attendeeId: string };
	}>;
	onExpand: () => void;
}): JSX.Element {
	const { userCount, users, onExpand } = props;

	// Get names of first few users for tooltip
	const previewUsers = users.slice(0, 3);
	const remainingCount = Math.max(0, userCount - 3);

	const tooltipText =
		previewUsers.map((u) => u.value.name).join(", ") +
		(remainingCount > 0 ? ` and ${remainingCount} more` : "") +
		` selected this item`;

	return (
		<div
			className="pointer-events-auto cursor-pointer flex items-center justify-center text-white text-xs font-semibold rounded-full bg-black hover:bg-gray-800 transition-colors duration-200 border-2 border-white shadow-lg hover:shadow-xl"
			style={{
				width: "24px",
				height: "24px",
				position: "absolute",
				top: -12,
				right: -12,
				zIndex: 1001,
			}}
			onClick={(e) => {
				e.stopPropagation();
				onExpand();
			}}
			title={tooltipText}
		>
			{userCount}
		</div>
	);
}

/**
 * RemoteUserIndicator Component
 *
 * Displays a single user's selection indicator with their initials and color.
 * Shows as a circle positioned in the top right corner of the selected item.
 */
function RemoteUserIndicator(props: {
	user: { value: { name: string; id: string; image?: string }; client: { attendeeId: string } };
	index: number;
}): JSX.Element {
	const { user, index } = props;

	const initials = getInitials(user.value.name);
	const backgroundColor = getUserColor(user.client.attendeeId);

	// Offset multiple indicators so they don't overlap
	const offset = index * 26; // 24px circle + 2px margin

	return (
		<div
			className="flex items-center justify-center text-white font-semibold rounded-full border-2 border-white shadow-lg"
			style={{
				width: "24px",
				height: "24px",
				backgroundColor,
				position: "absolute",
				top: -12,
				right: -12 - offset,
				zIndex: 1001,
				fontSize: "10px",
				lineHeight: "1",
			}}
			title={`Selected by ${user.value.name}`}
		>
			{initials}
		</div>
	);
}

// calculate the mouse coordinates relative to the canvas div
const calculateCanvasMouseCoordinates = (
	e: React.MouseEvent<HTMLDivElement>,
	pan?: { x: number; y: number },
	zoom: number = 1
): { x: number; y: number } => {
	const canvasElement = document.getElementById("canvas");
	const canvasRect = canvasElement?.getBoundingClientRect() || { left: 0, top: 0 };
	// Screen to model: subtract canvas origin and pan, then divide by zoom
	const sx = e.clientX - canvasRect.left;
	const sy = e.clientY - canvasRect.top;
	const x = (sx - (pan?.x ?? 0)) / zoom;
	const y = (sy - (pan?.y ?? 0)) / zoom;
	return { x, y };
};

// calculate the offset of the pointer from the item's origin
// this is used to ensure the item moves smoothly with the pointer
// when dragging
const calculateOffsetFromCanvasOrigin = (
	e: React.MouseEvent<HTMLDivElement>,
	item: Item,
	pan?: { x: number; y: number },
	zoom: number = 1
): { x: number; y: number } => {
	const coordinates = calculateCanvasMouseCoordinates(e, pan, zoom);
	const newX = coordinates.x - item.x;
	const newY = coordinates.y - item.y;
	return {
		x: newX,
		y: newY,
	};
};

export function SelectionBox(props: {
	selected: boolean;
	item: Item;
	onResizeEnd?: () => void;
	visualHidden?: boolean;
}): JSX.Element {
	const { selected, item, onResizeEnd, visualHidden } = props;
	useTree(item);
	const padding = 8;
	return (
		<>
			{/* Keep controls mounted for event forwarding; hide visuals when requested */}
			<div style={{ display: selected ? (visualHidden ? "none" : "block") : "none" }}>
				<SelectionControls item={item} padding={padding} onResizeEnd={onResizeEnd} />
			</div>
			{/* Legacy dashed rectangle visuals, hidden when visualHidden is true or not selected */}
			<div
				className={`absolute border-3 border-dashed border-black bg-transparent ${
					selected && !visualHidden ? "" : " hidden"
				}`}
				style={{
					left: -padding,
					top: -padding,
					width: `calc(100% + ${padding * 2}px)`,
					height: `calc(100% + ${padding * 2}px)`,
					zIndex: 1000,
					pointerEvents: "none",
				}}
			></div>
		</>
	);
}

export function SelectionControls(props: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
}): JSX.Element {
	const { item, padding, onResizeEnd } = props;
	useTree(item);

	// Don't show rotation handle for tables since they can't be rotated
	const showRotationHandle = getContentType(item) !== "table";

	return (
		<>
			{showRotationHandle && <RotateHandle item={item} />}
			<CornerResizeHandles item={item} padding={padding} onResizeEnd={onResizeEnd} />
		</>
	);
}

export function RotateHandle(props: { item: Item }): JSX.Element {
	const { item } = props;
	const presence = useContext(PresenceContext);

	useTree(item);

	const [active, setActive] = useState(false);

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		e.bubbles = false;
		e.stopPropagation();
		e.preventDefault();
		setActive(true);

		// Get the item element to calculate its actual dimensions
		const itemElement = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement;
		if (!itemElement) return;

		// Track if we're currently rotating to prevent canvas click
		let isRotating = false;

		const handleMouseMove = (event: MouseEvent) => {
			isRotating = true; // Mark that we've started rotating

			// Get current item bounds
			const itemRect = itemElement.getBoundingClientRect();
			const canvasElement = document.getElementById("canvas");
			const canvasRect = canvasElement?.getBoundingClientRect() || { left: 0, top: 0 };

			// Calculate center of the item in canvas coordinates
			const centerX = (itemRect.left + itemRect.right) / 2 - canvasRect.left;
			const centerY = (itemRect.top + itemRect.bottom) / 2 - canvasRect.top;

			// Calculate mouse position in canvas coordinates
			const mouseX = event.clientX - canvasRect.left;
			const mouseY = event.clientY - canvasRect.top;

			// Calculate angle from center to mouse
			const deltaX = mouseX - centerX;
			const deltaY = mouseY - centerY;
			const angleInRadians = Math.atan2(deltaY, deltaX);
			const angleInDegrees = (angleInRadians * 180) / Math.PI + 90;

			// Normalize the angle to be between 0 and 360
			let normalizedAngle = angleInDegrees % 360;
			if (normalizedAngle < 0) normalizedAngle += 360;

			// Use presence API for real-time feedback instead of persistent storage
			presence.drag.setDragging({
				id: item.id,
				x: item.x,
				y: item.y,
				rotation: normalizedAngle,
				branch: presence.branch,
			});
		};

		const handleMouseUp = () => {
			setActive(false);
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);

			// If we were rotating, commit the final rotation to persistent storage
			if (isRotating) {
				// Get the current rotation from the drag state
				const dragState = presence.drag.state.local;
				if (dragState) {
					Tree.runTransaction(item, () => {
						item.rotation = dragState.rotation;
					});
				}

				// Clear the drag state
				presence.drag.clearDragging();
				// Suppress only the immediate background canvas click, not clicks on other items
				const canvasEl = document.getElementById("canvas") as
					| (SVGSVGElement & { dataset: DOMStringMap })
					| null;
				if (canvasEl) {
					canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
				}
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		e.stopPropagation();
	};

	const handleSize = active ? 16 : 12;

	return (
		<div
			className="absolute flex flex-row w-full justify-center items-center"
			style={{
				top: -35, // Moved farther from the rectangle
			}}
		>
			<div
				onClick={(e) => handleClick(e)}
				onMouseDown={(e) => handleMouseDown(e)}
				className={`absolute bg-black shadow-lg z-50 cursor-grab`}
				style={{
					width: `${handleSize}px`,
					height: `${handleSize}px`,
					borderRadius: "50%", // Make it circular to distinguish from square resize handles
				}}
			></div>
		</div>
	);
}

export function CornerResizeHandles(props: {
	item: Item;
	padding: number;
	onResizeEnd?: () => void;
}): JSX.Element {
	const { item, padding, onResizeEnd } = props;

	// Only show resize handles for shapes
	if (!Tree.is(item.content, Shape)) {
		return <></>;
	}

	const shape = item.content;
	useTree(shape);

	const [resizing, setResizing] = useState(false);
	const initialSize = useRef(shape.size);
	const initialCenter = useRef({ x: 0, y: 0 });
	const centerPos = useRef({ x: 0, y: 0 });
	const initialDistance = useRef(0);
	const presence = useContext(PresenceContext);

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		e.bubbles = false;
		e.stopPropagation();
		e.preventDefault();

		setResizing(true);
		initialSize.current = shape.size;

		// Calculate the center of the shape in canvas coordinates
		initialCenter.current = {
			x: item.x + shape.size / 2,
			y: item.y + shape.size / 2,
		};

		// Calculate the center of the shape in screen coordinates
		// Need to find the actual item element, not just the handle
		let itemElement = e.currentTarget.parentElement;
		while (itemElement && !itemElement.getAttribute("data-item-id")) {
			itemElement = itemElement.parentElement;
		}

		if (itemElement) {
			const rect = itemElement.getBoundingClientRect();
			centerPos.current = {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			};
		}

		// Calculate initial distance from center to mouse
		const initialDeltaX = e.clientX - centerPos.current.x;
		const initialDeltaY = e.clientY - centerPos.current.y;
		initialDistance.current = Math.sqrt(
			initialDeltaX * initialDeltaX + initialDeltaY * initialDeltaY
		);
		// Add global mouse move and up listeners
		const handleMouseMove = (event: MouseEvent) => {
			// Calculate current distance from center to mouse
			const currentDeltaX = event.clientX - centerPos.current.x;
			const currentDeltaY = event.clientY - centerPos.current.y;

			// Calculate the dot product to determine if we're moving towards or away from center
			// relative to the initial drag direction
			const dotProduct = currentDeltaX * initialDeltaX + currentDeltaY * initialDeltaY;
			const initialMagnitudeSquared =
				initialDeltaX * initialDeltaX + initialDeltaY * initialDeltaY;

			// Project current position onto initial direction vector
			const projectionLength = dotProduct / Math.sqrt(initialMagnitudeSquared);

			// Use the projection length to determine size - this prevents growth when dragging past center
			const distanceRatio = Math.max(0.1, projectionLength / initialDistance.current);
			const newSize = Math.max(20, Math.min(300, initialSize.current * distanceRatio));

			// Calculate new position to keep center fixed
			const newX = initialCenter.current.x - newSize / 2;
			const newY = initialCenter.current.y - newSize / 2;

			// Update via presence API for real-time feedback
			presence.resize.setResizing({
				id: item.id,
				x: newX,
				y: newY,
				size: newSize,
			});
		};

		const handleMouseUp = () => {
			setResizing(false);
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);

			// Get the final values from the presence data and commit to persistent storage
			const currentResizeData = presence.resize.state?.local;
			if (currentResizeData && currentResizeData.id === item.id) {
				Tree.runTransaction(item, () => {
					shape.size = currentResizeData.size;
					item.x = currentResizeData.x;
					item.y = currentResizeData.y;
				});
			}

			// Clear the presence data
			presence.resize.clearResizing();

			// Clear the shape props override
			onResizeEnd?.();

			// Suppress only the immediate background canvas click, not clicks on other items
			const canvasEl = document.getElementById("canvas") as
				| (SVGSVGElement & { dataset: DOMStringMap })
				| null;
			if (canvasEl) {
				canvasEl.dataset.suppressClearUntil = String(Date.now() + 150);
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		e.stopPropagation();
	};

	// Create a handle component for reuse
	const ResizeHandle = ({ position }: { position: string }) => (
		<div
			className={`absolute bg-black cursor-nw-resize hover:bg-black shadow-lg z-50`}
			style={{
				width: resizing ? "12px" : "8px",
				height: resizing ? "12px" : "8px",
				...getHandlePosition(position, padding),
			}}
			onClick={(e) => handleClick(e)}
			onMouseDown={(e) => handleMouseDown(e)}
		/>
	);

	const getHandlePosition = (position: string, padding: number) => {
		const offset = resizing ? 6 : 4; // Half of handle size (12px/2 or 8px/2)
		switch (position) {
			case "top-left":
				return { left: -padding - offset, top: -padding - offset };
			case "top-right":
				return { right: -padding - offset, top: -padding - offset };
			case "bottom-left":
				return { left: -padding - offset, bottom: -padding - offset };
			case "bottom-right":
				return { right: -padding - offset, bottom: -padding - offset };
			default:
				return {};
		}
	};

	return (
		<>
			<ResizeHandle position="top-left" />
			<ResizeHandle position="top-right" />
			<ResizeHandle position="bottom-left" />
			<ResizeHandle position="bottom-right" />
		</>
	);
}
