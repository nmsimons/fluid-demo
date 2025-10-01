import React from "react";
import { Items, Item } from "../../../schema/appSchema.js";
import { ItemView } from "../items/ItemView.js";
import { FlattenedItem } from "../../../utils/flattenItems.js";

export function ItemsHtmlLayer(props: {
	items: Items | FlattenedItem[];
	canvasPosition: { left: number; top: number };
	pan: { x: number; y: number };
	zoom: number;
	effectiveZoom?: number;
	canvasElement?: HTMLElement | null;
	hideSelectionControls?: boolean;
	onItemMeasured?: (item: Item, size: { width: number; height: number }) => void;
}): JSX.Element {
	const {
		items,
		canvasPosition,
		pan,
		zoom,
		effectiveZoom,
		canvasElement,
		hideSelectionControls = true,
		onItemMeasured,
	} = props;
	const logicalZoom = effectiveZoom ?? zoom;

	// Determine if we have flattened items or raw Items collection
	const isFlattenedArray = Array.isArray(items) && items.length > 0 && "absoluteX" in items[0];
	const itemsToRender = isFlattenedArray
		? (items as FlattenedItem[])
		: Array.from(items as Items).map((item) => ({
				item,
				absoluteX: item.x,
				absoluteY: item.y,
				parentGroup: undefined,
				isGroupContainer: false,
			}));

	return (
		<div
			className="items-html-layer relative h-full w-full"
			style={{
				left: `${pan.x}px`,
				top: `${pan.y}px`,
				transform: `scale(${zoom})`,
				transformOrigin: "0 0",
			}}
		>
			{itemsToRender
				.filter((flatItem) => !flatItem.isGroupContainer) // Don't render group containers as items
				.map((flatItem, index) => {
					const itemKey = flatItem.item.id;

					return (
						<ItemView
							item={flatItem.item}
							key={itemKey}
							index={index}
							canvasPosition={{ left: canvasPosition.left, top: canvasPosition.top }}
							hideSelectionControls={hideSelectionControls}
							pan={pan}
							zoom={zoom}
							logicalZoom={logicalZoom}
							canvasElement={canvasElement}
							onMeasured={onItemMeasured}
							absoluteX={flatItem.absoluteX}
							absoluteY={flatItem.absoluteY}
							parentGroup={flatItem.parentGroup}
						/>
					);
				})}
		</div>
	);
}
