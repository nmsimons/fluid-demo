import React, { JSX, useState, useEffect, useContext, useRef } from "react";
import { Comments, FluidTable, Item, Note, Shape } from "../schema/app_schema.js";
import { PresenceContext } from "./PresenceContext.js";
import { ShapeView } from "./shapeux.js";
import { Tree } from "fluid-framework";
import { DragAndRotatePackage } from "../utils/drag.js";
import { DeleteButton, VoteButton } from "./appbuttonux.js";
import { Toolbar, ToolbarGroup } from "@fluentui/react-components";
import { NoteView } from "./noteux.js";
import { objectIdNumber, useTree } from "./useTree.js";
import { usePresenceManager } from "./usePresenceManger.js";
import { PresenceManager } from "../utils/Interfaces/PresenceManager.js";
import { TableView } from "./tableux.js";
import { Comment20Regular } from "@fluentui/react-icons";
import { PaneContext } from "./PaneContext.js";
import { LayoutContext } from "./useLayoutManger.js";

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

export function ContentElement(props: { item: Item }): JSX.Element {
	const { item } = props;
	useTree(item.content);

	if (Tree.is(item.content, Shape)) {
		return <ShapeView key={objectIdNumber(item.content)} shape={item.content} />;
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
		presence.itemSelection.testRemoteSelection({ id: item.id }),
	);

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

	usePresenceManager(
		presence.drag as PresenceManager<DragAndRotatePackage>,
		(update) => {
			if (update && update.branch === presence.branch) {
				setPropsOnDrag(update);
			}
		},
		setPropsOnDrag,
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
		},
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
			if (selected) {
				// presence.itemSelection.clearSelection();
			} else {
				presence.itemSelection.setSelection({ id: item.id });
			}
		}
	};

	if (selected) {
		itemProps.zIndex = 1000;
	} else {
		itemProps.zIndex = index;
	}

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
			onClick={(e) => handleClick(e)}
			onDragStart={(e) => handleDragStart(e)}
			onDrag={(e) => handleDrag(e)}
			onDragEnd={(e) => handleDragEnd(e)}
			draggable="true"
			className={`absolute`}
			style={{ ...itemProps }}
		>
			<CommentIndicator comments={item.comments} />
			<SelectionBox selected={selected} item={item} />
			<PresenceBox remoteSelected={remoteSelected.length > 0} />
			<ContentElement item={item} />
		</div>
	);
}

export function CommentIndicator(props: { comments: Comments }): JSX.Element {
	const { comments } = props;
	useTree(comments, true);

	const panes = useContext(PaneContext).panes;
	const visible =
		(panes.find((pane) => pane.name === "comments")?.visible ?? false) && comments.length > 0;
	return (
		<div
			className={`absolute pointer-events-none flex flex-row w-full justify-center  ${visible ? "" : " hidden"}`}
			style={{
				top: -40,
				zIndex: 10000,
			}}
		>
			<Comment20Regular />
		</div>
	);
}

// calculate the mouse coordinates relative to the canvas div
const calculateCanvasMouseCoordinates = (
	e: React.MouseEvent<HTMLDivElement>,
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
	item: Item,
): { x: number; y: number } => {
	const coordinates = calculateCanvasMouseCoordinates(e);
	const newX = coordinates.x - item.x;
	const newY = coordinates.y - item.y;
	return {
		x: newX,
		y: newY,
	};
};

const calculateOffsetFromCenter = (
	e: React.MouseEvent<HTMLDivElement>,
	item: Item,
): { x: number; y: number } => {
	const coordinates = calculateCanvasMouseCoordinates(e);
	const rect =
		e.currentTarget.parentElement?.getBoundingClientRect() ??
		e.currentTarget.getBoundingClientRect();
	const width = rect.width;
	const height = rect.height;
	const center = { x: item.x + width / 2, y: item.y + height / 2 };
	const newX = coordinates.x - center.x;
	const newY = coordinates.y - center.y;
	return {
		x: newX,
		y: newY,
	};
};

export function PresenceBox(props: { remoteSelected: boolean }): JSX.Element {
	const { remoteSelected } = props;
	const padding = 8;
	return (
		<div
			className={`absolute border-3 border-dashed border-black bg-transparent opacity-40 ${remoteSelected ? "" : " hidden"}`}
			style={{
				left: -padding,
				top: -padding,
				width: `calc(100% + ${padding * 2}px)`,
				height: `calc(100% + ${padding * 2}px)`,
				zIndex: 1000,
				pointerEvents: "none",
			}}
		></div>
	);
}

export function SelectionBox(props: { selected: boolean; item: Item }): JSX.Element {
	const { selected, item } = props;
	useTree(item);
	const padding = 8;
	return (
		<div className={`bg-transparent ${selected ? "" : " hidden"}`}>
			<SelectionControls item={item} padding={padding} />
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

export function SelectionControls(props: { item: Item; padding: number }): JSX.Element {
	const { item, padding } = props;
	useTree(item);
	const height = 40;
	return (
		<div
			className={`absolute flex flex-row justify-items-center items-center w-full bg-gray-100 border-2 border-black shadow-md`}
			style={{
				left: -padding,
				top: -(height + 2) - padding,
				width: `calc(100% + ${padding * 2}px)`,
				height: height,
			}}
		>
			<RotateHandle item={item} />
			<ItemToolbar item={item} />
		</div>
	);
}

export function ItemToolbar(props: { item: Item }): JSX.Element {
	const { item } = props;
	useTree(item, true);
	return (
		<Toolbar
			size="small"
			className={"flex flex-row items-center justify-between w-full h-full"}
		>
			<ToolbarGroup role="presentation">
				<VoteButton vote={item.votes} />
			</ToolbarGroup>
			<ToolbarGroup role="presentation">
				<DeleteButton
					delete={() => {
						Tree.runTransaction(item, () => {
							item.delete();
						});
					}}
				/>
			</ToolbarGroup>
		</Toolbar>
	);
}

export function RotateHandle(props: { item: Item }): JSX.Element {
	const { item } = props;

	useTree(item);

	const [rotating, setRotating] = useState(false);
	const offset = useRef({ x: 0, y: 0 });
	const rotation = useRef(item.rotation);

	const presence = useContext(PresenceContext);

	const handleRotate = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		if (!rotating) return;

		e.bubbles = false;
		e.stopPropagation();
		e.preventDefault();

		const o = calculateOffsetFromCenter(e, item);
		const angleInRadians = Math.atan2(o.y, o.x);
		const angleInDegrees = (angleInRadians * 180) / Math.PI + 90;

		// Normalize the angle to be between 0 and 360
		let normalizedAngle = angleInDegrees % 360;
		if (normalizedAngle < 0) normalizedAngle += 360;

		rotation.current = normalizedAngle;

		if (rotation.current !== item.rotation) {
			presence.drag.setDragging({
				id: item.id,
				x: item.x,
				y: item.y,
				rotation: rotation.current,
				branch: presence.branch,
			});
		}
	};

	const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
		e.bubbles = false;
		e.stopPropagation();
		e.dataTransfer.setDragImage(new Image(), 0, 0);
		offset.current = calculateOffsetFromCanvasOrigin(e, item);
		setRotating(true);
	};

	const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
		e.bubbles = false;
		e.stopPropagation();
		setRotating(false);
		if (rotation.current !== item.rotation) {
			item.rotation = rotation.current;
		}
	};

	const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		e.stopPropagation();
	};

	return (
		<div
			className="absolute flex flex-row w-full justify-center items-center"
			style={{
				top: -15,
			}}
		>
			<div
				onClick={(e) => handleClick(e)}
				onDragStart={(e) => handleDragStart(e)}
				onDrag={(e) => handleRotate(e)}
				onDragEnd={(e) => handleDragEnd(e)}
				onMouseMove={(e) => handleRotate(e)}
				draggable="true"
				className={`bg-red-800 border-4 border-black`}
			></div>
		</div>
	);
}
