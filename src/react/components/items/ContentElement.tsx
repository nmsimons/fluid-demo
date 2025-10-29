import React from "react";
import { Tree } from "fluid-framework";
import { FluidTable, Group, Item, Note, TextBlock } from "../../../schema/appSchema.js";
import { useTree, objectIdNumber } from "../../hooks/useTree.js";
import {
	getContentHandler,
	isFileReferenceCard,
	isGroup,
	isLlmCard,
	isShape,
} from "../../../utils/contentHandlers.js";
import { ShapeView } from "./ShapeView.js";
import { NoteView } from "./NoteView.js";
import { TextView } from "./TextView.js";
import { TableView } from "./TableView.js";
import { FileReferenceCardView } from "./FileReferenceCardView.js";
import { LlmCardView } from "./LlmCardView.js";

function GroupView({ item }: { item: Item & { content: Group } }) {
	const group = item.content;
	useTree(group);

	return (
		<div className="group-placeholder flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/30 p-4">
			<div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
				Group ({group.items.length} items)
			</div>
		</div>
	);
}

export function ContentElement({
	item,
	contentProps,
}: {
	item: Item;
	contentProps?: {
		sizeOverride?: number;
		shapeWidthOverride?: number;
		shapeHeightOverride?: number;
		textWidthOverride?: number;
	};
}): JSX.Element {
	useTree(item.content);
	const overrideSize = contentProps?.sizeOverride ?? contentProps?.textWidthOverride;
	const handler = getContentHandler(item, overrideSize);

	if (handler.type === "shape" && isShape(item)) {
		return (
			<ShapeView
				key={objectIdNumber(item.content)}
				shape={item.content}
				sizeOverride={contentProps?.sizeOverride}
				widthOverride={contentProps?.shapeWidthOverride}
				heightOverride={contentProps?.shapeHeightOverride}
			/>
		);
	}
	if (handler.type === "note" && Tree.is(item.content, Note)) {
		return <NoteView key={objectIdNumber(item.content)} note={item.content} item={item} />;
	}
	if (handler.type === "text" && Tree.is(item.content, TextBlock)) {
		return (
			<TextView
				key={objectIdNumber(item.content)}
				text={item.content}
				widthOverride={contentProps?.textWidthOverride}
			/>
		);
	}
	if (handler.type === "table" && Tree.is(item.content, FluidTable)) {
		return <TableView key={objectIdNumber(item.content)} fluidTable={item.content} />;
	}
	if (handler.type === "group" && isGroup(item)) {
		return <GroupView key={objectIdNumber(item.content)} item={item} />;
	}
	if (handler.type === "fileReference" && isFileReferenceCard(item)) {
		return <FileReferenceCardView key={objectIdNumber(item.content)} card={item.content} />;
	}
	if (handler.type === "llmCard" && isLlmCard(item)) {
		return <LlmCardView key={objectIdNumber(item.content)} card={item.content} />;
	}
	return <></>;
}
