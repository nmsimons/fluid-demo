// A react component for displaying and interacting with notes using the Fluid Framework
// Note object

import React from "react";
import { ThumbLike16Filled, ThumbLike16Regular } from "@fluentui/react-icons";
import { Tooltip } from "@fluentui/react-tooltip";
import { Item, Note, Votes } from "../../../schema/appSchema.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { useTree } from "../../hooks/useTree.js";
import { createSchemaUser } from "../../../utils/userUtils.js";
import { Button } from "@fluentui/react-button";
import { DEFAULT_NOTE_COLOR } from "../../../constants/note.js";

const NOTE_DIMENSION_PX = 200;
const NOTE_DEFAULT_FOOTER_HEIGHT = 48;

export function NoteView(props: { note: Note; item: Item }): JSX.Element {
	const { note, item } = props;
	const [footerHeight, setFooterHeight] = React.useState<number | null>(null);
	const backgroundColor = note.color ?? DEFAULT_NOTE_COLOR;

	const handleFooterHeight = React.useCallback((height: number) => {
		setFooterHeight((prev) => {
			if (prev === null) {
				return height;
			}
			return Math.abs(prev - height) > 0.5 ? height : prev;
		});
	}, []);

	const minTextHeight = React.useMemo(() => {
		const footer = footerHeight ?? NOTE_DEFAULT_FOOTER_HEIGHT;
		const candidate = NOTE_DIMENSION_PX - footer;
		return Math.max(candidate, 24);
	}, [footerHeight]);

	return (
		<div
			className="shadow-md flex flex-col rounded"
			style={{
				width: `${NOTE_DIMENSION_PX}px`,
				minHeight: `${NOTE_DIMENSION_PX}px`,
				height: "auto",
				backgroundColor,
			}}
		>
			<NoteText note={note} minHeight={minTextHeight} backgroundColor={backgroundColor} />
			<NoteFooter item={item} onHeightChange={handleFooterHeight} />
		</div>
	);
}

export function NoteText(props: {
	note: Note;
	minHeight: number;
	backgroundColor: string;
}): JSX.Element {
	const { note, minHeight, backgroundColor } = props;

	useTree(note);

	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	const updateTextareaHeight = React.useCallback(
		(element?: HTMLTextAreaElement | null) => {
			const target = element ?? textareaRef.current;
			if (!target) {
				return;
			}
			target.style.maxHeight = "none";
			target.style.height = "auto";
			target.style.height = `${Math.max(target.scrollHeight, minHeight)}px`;
		},
		[minHeight]
	);

	React.useLayoutEffect(() => {
		updateTextareaHeight();
	}, [note.text, updateTextareaHeight, minHeight]);

	const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		note.text = event.target.value;
		updateTextareaHeight(event.target);
	};

	return (
		<textarea
			id="msg"
			name="msg"
			ref={textareaRef}
			className="note-item-textarea w-full px-3 py-3"
			rows={4}
			value={note.text}
			onChange={handleChange}
			placeholder="Type your note here..."
			style={{
				resize: "none",
				overflow: "hidden",
				backgroundColor,
				outline: "none",
				boxShadow: "none",
				border: "none",
				maxHeight: "none",
				minHeight: `${minHeight}px`,
			}}
			autoComplete="off"
			data-item-editable
		/>
	);
}

function NoteFooter(props: { item: Item; onHeightChange: (height: number) => void }): JSX.Element {
	const { item, onHeightChange } = props;

	useTree(item);
	useTree(item.createdBy);
	useTree(item.votes);

	const footerRef = React.useRef<HTMLDivElement>(null);

	React.useLayoutEffect(() => {
		const el = footerRef.current;
		if (!el) {
			return;
		}
		onHeightChange(el.offsetHeight);
		if (typeof ResizeObserver === "undefined") {
			return;
		}
		const observer = new ResizeObserver(() => {
			onHeightChange(el.offsetHeight);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [onHeightChange]);

	const creationDate = item.createdAt?.value;
	const creationTooltip = creationDate
		? creationDate.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "Creation time unavailable";
	const tooltipContent = creationDate ? `Created ${creationTooltip}` : creationTooltip;

	const creatorName = item.createdBy?.name?.trim() ? item.createdBy.name : "Unknown";
	return (
		<div
			ref={footerRef}
			className="flex items-center justify-between px-3 pb-3 text-xs text-slate-800"
		>
			<Tooltip content={tooltipContent} relationship="description">
				<span className="max-w-[120px] truncate font-semibold">{creatorName}</span>
			</Tooltip>
			<VoteButton vote={item.votes} />
		</div>
	);
}

function VoteButton(props: { vote: Votes }): JSX.Element {
	const { vote } = props;
	const presence = React.useContext(PresenceContext);
	const currentUserInfo = presence.users.getMyself().value;
	const userId = currentUserInfo.id;
	const hasVoted = vote.some((entry) => entry.id === userId);
	return (
		<Button
			appearance="outline"
			size="small"
			shape="circular"
			onClick={(e) => {
				e.stopPropagation();
				const schemaUser = createSchemaUser({
					id: currentUserInfo.id,
					name: currentUserInfo.name,
				});
				vote.toggleVote(schemaUser);
			}}
			onPointerDown={(e) => {
				e.stopPropagation();
			}}
			aria-pressed={hasVoted}
			aria-label={hasVoted ? "Remove your vote" : "Add your vote"}
			icon={hasVoted ? <ThumbLike16Filled /> : <ThumbLike16Regular />}
		>
			{vote.numberOfVotes > 999 ? "999+" : String(vote.numberOfVotes)}
		</Button>
	);
}
