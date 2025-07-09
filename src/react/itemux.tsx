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
import { Comment20Filled } from "@fluentui/react-icons";
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
}): JSX.Element {
	const { item, index } = props;
	const itemInval = useTree(item);
	const [offset, setOffset] = useState({ x: 0, y: 0 });

	const presence = useContext(PresenceContext); // Placeholder for context if needed
	const layout = useContext(LayoutContext);

	const [selected, setSelected] = useState(presence.itemSelection.testSelection({ id: item.id }));
	const [remoteSelected, setRemoteSelected] = useState<string[]>(
		presence.itemSelection.testRemoteSelection({ id: item.id })
	);

	// Shape-specific props for temporary overrides during resize
	const [shapeProps, setShapeProps] = useState<{
		sizeOverride?: number;
	}>({});

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
			if (update && update.branch === presence.branch) {
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
		() => {
			setRemoteSelected(presence.itemSelection.testRemoteSelection({ id: item.id }));
		},
		(update) => {
			setSelected(update.some((selection) => selection.id === item.id));
		},
		() => {
			setRemoteSelected(presence.itemSelection.testRemoteSelection({ id: item.id }));
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
		setOffset(calculateOffsetFromCanvasOrigin(e, item));
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
		const mouseCoordinates = calculateCanvasMouseCoordinates(e);
		const coordinates = { x: mouseCoordinates.x - offset.x, y: mouseCoordinates.y - offset.y };
		coordinates.x = coordinates.x < 0 ? itemProps.left : coordinates.x;
		coordinates.y = coordinates.y < 0 ? itemProps.top : coordinates.y;
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
		if (ref.current !== null) {
			const bb = ref.current.getBoundingClientRect();
			const relativeBb = {
				left: bb.left - props.canvasPosition.left,
				top: bb.top - props.canvasPosition.top,
				right: bb.right - props.canvasPosition.left,
				bottom: bb.bottom - props.canvasPosition.top,
			};
			layout.set(item.id, relativeBb);
		}
	}, [item.id, layout]);

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
			<SelectionBox selected={selected} item={item} onResizeEnd={clearShapeProps} />
			<RemoteSelectionIndicators remoteSelectedUsers={remoteSelected} />
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
				top: -12, // Position near the top-right corner
				right: -12, // Position to the right of the item
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
 * Shows a circle with the remote user's initials in the top right corner
 * of items selected by remote users, replacing the generic grey box.
 */
export function RemoteSelectionIndicators(props: { remoteSelectedUsers: string[] }): JSX.Element {
	const { remoteSelectedUsers } = props;
	const presence = useContext(PresenceContext);

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

	return (
		<div className="absolute pointer-events-none" style={{ top: 0, right: 0, zIndex: 1001 }}>
			{remoteUsers.map((user, index) => (
				<RemoteUserIndicator key={user.client.attendeeId} user={user} index={index} />
			))}
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
			className="flex items-center justify-center text-white text-xs font-semibold rounded-full border-2 border-white shadow-lg"
			style={{
				width: "24px",
				height: "24px",
				backgroundColor,
				position: "absolute",
				top: -12,
				right: -12 - offset,
				zIndex: 1001,
			}}
			title={`Selected by ${user.value.name}`}
		>
			{initials}
		</div>
	);
}

// calculate the mouse coordinates relative to the canvas div
const calculateCanvasMouseCoordinates = (
	e: React.MouseEvent<HTMLDivElement>
): { x: number; y: number } => {
	const canvasElement = document.getElementById("canvas");
	const canvasRect = canvasElement?.getBoundingClientRect() || { left: 0, top: 0 };
	const newX = e.pageX - canvasRect.left;
	const newY = e.pageY - canvasRect.top;
	return { x: newX, y: newY };
};

// calculate the offset of the pointer from the item's origin
// this is used to ensure the item moves smoothly with the pointer
// when dragging
const calculateOffsetFromCanvasOrigin = (
	e: React.MouseEvent<HTMLDivElement>,
	item: Item
): { x: number; y: number } => {
	const coordinates = calculateCanvasMouseCoordinates(e);
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
}): JSX.Element {
	const { selected, item, onResizeEnd } = props;
	useTree(item);
	const padding = 8;
	return (
		<div className={`bg-transparent ${selected ? "" : " hidden"}`}>
			<SelectionControls item={item} padding={padding} onResizeEnd={onResizeEnd} />
			<div
				className={`absolute border-3 border-dashed border-black bg-transparent`}
				style={{
					left: -padding,
					top: -padding,
					width: `calc(100% + ${padding * 2}px)`,
					height: `calc(100% + ${padding * 2}px)`,
					zIndex: 1000,
					pointerEvents: "none",
				}}
			></div>
		</div>
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

				// Add a temporary click handler to the canvas to prevent selection clearing
				const preventCanvasClick = (e: Event) => {
					e.stopPropagation();
					e.preventDefault();
					// Remove this handler immediately after preventing the click
					document.removeEventListener("click", preventCanvasClick, true);
				};
				// Use capture phase to intercept the click before it reaches the canvas
				document.addEventListener("click", preventCanvasClick, true);
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
