// A react component for displaying and interacting with notes using the Fluid Framework
// Note object

import React from "react";
import { ThumbLikeFilled, ThumbLikeRegular } from "@fluentui/react-icons";
import { Tooltip } from "@fluentui/react-tooltip";
import { Item, Note } from "../../../schema/appSchema.js";
import { PresenceContext } from "../../contexts/PresenceContext.js";
import { useTree } from "../../hooks/useTree.js";
import { createSchemaUser } from "../../../utils/userUtils.js";

const NOTE_DIMENSION_PX = 200;
const NOTE_BACKGROUND_COLOR = "#feff68";
const NOTE_DEFAULT_FOOTER_HEIGHT = 48;

export function NoteView(props: { note: Note; item: Item }): JSX.Element {
	const { note, item } = props;
	const [footerHeight, setFooterHeight] = React.useState<number | null>(null);

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
				backgroundColor: NOTE_BACKGROUND_COLOR,
			}}
		>
			<NoteText note={note} minHeight={minTextHeight} />
			<NoteFooter item={item} onHeightChange={handleFooterHeight} />
		</div>
	);
}

export function NoteText(props: { note: Note; minHeight: number }): JSX.Element {
	const { note, minHeight } = props;

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
				backgroundColor: NOTE_BACKGROUND_COLOR,
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
	const presence = React.useContext(PresenceContext);
	const currentUserInfo = presence.users.getMyself().value;

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

	const voteCount = item.votes.numberOfVotes;
	const hasVoted = item.votes.some((entry) => entry.id === currentUserInfo.id);

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

	const handleVoteClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			const schemaUser = createSchemaUser({
				id: currentUserInfo.id,
				name: currentUserInfo.name,
			});
			item.votes.toggleVote(schemaUser);
		},
		[item.votes, currentUserInfo.id, currentUserInfo.name]
	);

	const handleVotePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) => {
			event.stopPropagation();
		},
		[]
	);

	const creatorName = item.createdBy?.name?.trim() ? item.createdBy.name : "Unknown";
	const voteCountDisplay = voteCount > 999 ? "999+" : String(voteCount);
	return (
		<div
			ref={footerRef}
			className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-800"
		>
			<Tooltip content={tooltipContent} relationship="description">
				<span className="max-w-[120px] truncate font-semibold" title={creatorName}>
					{creatorName}
				</span>
			</Tooltip>
			<div className="flex items-center">
				<button
					type="button"
					className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold transition-colors ${
						hasVoted
							? "border-blue-500 bg-blue-600 text-white"
							: "border-yellow-500/60 bg-white/80 text-slate-700 hover:bg-white"
					}`}
					onClick={handleVoteClick}
					onPointerDown={handleVotePointerDown}
					aria-pressed={hasVoted}
					aria-label={hasVoted ? "Remove your vote" : "Add your vote"}
				>
					{hasVoted ? (
						<ThumbLikeFilled className="h-4 w-4" />
					) : (
						<ThumbLikeRegular className="h-4 w-4" />
					)}
					<span
						className="text-xs font-semibold tabular-nums"
						title={`${voteCount} vote${voteCount === 1 ? "" : "s"}`}
					>
						{voteCountDisplay}
					</span>
				</button>
			</div>
		</div>
	);
}
