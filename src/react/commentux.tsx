// A pane that shows comments and allows users to interact with them
import { Button } from "@fluentui/react-button";
import { Textarea } from "@fluentui/react-textarea";
import React, {
	ReactNode,
	useContext,
	useEffect,
	useState,
	useRef,
	forwardRef,
	useImperativeHandle,
} from "react";
import { Pane } from "./paneux.js";
import { PresenceContext } from "./contexts/PresenceContext.js";
import {
	App,
	Comment,
	Comments,
	FluidTable,
	Group,
	Item,
	Note,
	Shape,
} from "../schema/app_schema.js";
import { useTree } from "./hooks/useTree.js";
import { VoteButton } from "./appbuttonux.js";
import { CommentRegular } from "@fluentui/react-icons";

export interface CommentPaneRef {
	focusInput: () => void;
}

export const CommentPane = forwardRef<
	CommentPaneRef,
	{
		hidden: boolean;
		setHidden: (hidden: boolean) => void;
		itemId: string;
		app: App;
	}
>((props, ref) => {
	const { hidden, setHidden, app } = props;
	const presence = useContext(PresenceContext);
	const [title, setTitle] = useState("Comments");
	const commentInputRef = useRef<CommentInputRef>(null);

	useImperativeHandle(ref, () => ({
		focusInput: () => {
			commentInputRef.current?.focus();
		},
	}));

	useTree(app);
	const item = app.items.find((item) => item.id === props.itemId) ?? app;
	useEffect(() => {
		if (item instanceof Group) {
			setTitle("Group Comments");
		} else if (item instanceof Item) {
			const content = item.content;
			if (content instanceof Shape) {
				setTitle(`Comments on ${content.type}`);
			} else if (content instanceof Note) {
				setTitle("Comments on Note");
			} else if (content instanceof FluidTable) {
				setTitle("Comments on Table");
			} else {
				setTitle("Comments on Item");
			}
		} else {
			setTitle("General Comments");
		}
	}, [item]);

	const handleAddComment = (comment: string) => {
		if (comment.trim() === "") return;
		item.comments.addComment(
			comment,
			presence.users.getMyself().value.id,
			presence.users.getMyself().value.name
		);
	};

	return (
		<Pane hidden={hidden} setHidden={setHidden} title={title}>
			<CommentList comments={item.comments} />
			<CommentInput ref={commentInputRef} callback={(comment) => handleAddComment(comment)} />
		</Pane>
	);
});

CommentPane.displayName = "CommentPane";

export function CommentList(props: { comments: Comments }): JSX.Element {
	const { comments } = props;
	useTree(comments);
	return (
		<div className="relative flex flex-col grow space-y-2 overflow-y-auto">
			<div
				className={`absolute top-0 left-0 h-full w-full ${comments.length > 0 ? "hidden" : ""}`}
			>
				<CommentRegular className="h-full w-full opacity-10" />
			</div>
			{comments.map((comment) => (
				<CommentView key={comment.id} comment={comment} />
			))}
		</div>
	);
}

export function CommentView(props: { comment: Comment }): JSX.Element {
	const { comment } = props;
	useTree(comment, true);
	const presence = useContext(PresenceContext);
	const isMyComment = comment.userId === presence.users.getMyself().value.id;
	return (
		<div className={`z-100 ${isMyComment ? "ml-6" : "mr-6"} `}>
			<div className={`flex items-center justify-between mb-2`}>
				<div className="text-xs">{comment.username}</div>
				<div className="text-xs text-gray-500">
					{comment.createdAt.value.toLocaleString("en-US", {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</div>
			</div>
			<SpeechBubble isUser={isMyComment}>
				<div className="">{comment.text}</div>
				<div className="flex items-center justify-between">
					<div className="text-xs text-gray-500">{comment.votes.votes.length} votes</div>
					<div className="flex items-center">
						<VoteButton vote={comment.votes} />
					</div>
				</div>
			</SpeechBubble>
		</div>
	);
}

export interface CommentInputRef {
	focus: () => void;
}

export const CommentInput = forwardRef<CommentInputRef, { callback: (comment: string) => void }>(
	(props, ref) => {
		const { callback } = props;
		const [comment, setComment] = useState("");
		const textareaRef = useRef<HTMLTextAreaElement>(null);

		useImperativeHandle(ref, () => ({
			focus: () => {
				textareaRef.current?.focus();
			},
		}));

		return (
			<div className="flex flex-col justify-self-end gap-y-2 ">
				<Textarea
					ref={textareaRef}
					className="flex"
					rows={4}
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					placeholder="Type your comment here..."
				/>
				<Button
					className="flex "
					appearance="primary"
					onClick={() => {
						callback(comment);
						setComment("");
					}}
				>
					Comment
				</Button>
			</div>
		);
	}
);

CommentInput.displayName = "CommentInput";

export function SpeechBubble(props: { children: ReactNode; isUser: boolean }): JSX.Element {
	const { children, isUser } = props;
	return (
		<div
			className={`w-full px-4 py-2 rounded-xl ${
				isUser
					? "bg-indigo-100 text-black rounded-br-none"
					: "bg-white text-black rounded-bl-none"
			}`}
		>
			{children}
		</div>
	);
}
