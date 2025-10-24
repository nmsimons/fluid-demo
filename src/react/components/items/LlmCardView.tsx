import React from "react";
import ReactMarkdown from "react-markdown";
import { LlmCard } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";

interface LlmCardViewProps {
	card: LlmCard;
}

const CARD_WIDTH_PX = 320;
const MIN_SECTION_HEIGHT = 72;

function useAutosizeTextarea(): (element: HTMLTextAreaElement | null) => void {
	return React.useCallback((element: HTMLTextAreaElement | null) => {
		if (!element) {
			return;
		}
		element.style.height = "auto";
		element.style.height = `${Math.max(element.scrollHeight, MIN_SECTION_HEIGHT)}px`;
	}, []);
}

export function LlmCardView(props: LlmCardViewProps): JSX.Element {
	const { card } = props;
	useTree(card);

	const resizePrompt = useAutosizeTextarea();
	const resizeResponse = useAutosizeTextarea();
	const promptElementRef = React.useRef<HTMLTextAreaElement | null>(null);
	const responseElementRef = React.useRef<HTMLTextAreaElement | null>(null);

	const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		card.prompt = event.target.value;
		resizePrompt(event.target);
	};

	const promptRef = React.useCallback(
		(node: HTMLTextAreaElement | null) => {
			promptElementRef.current = node;
			resizePrompt(node);
		},
		[resizePrompt]
	);

	React.useLayoutEffect(() => {
		if (promptElementRef.current) {
			resizePrompt(promptElementRef.current);
		}
	}, [card.prompt, resizePrompt]);

	React.useLayoutEffect(() => {
		if (responseElementRef.current) {
			resizeResponse(responseElementRef.current);
		}
	}, [card.response, resizeResponse]);

	return (
		<div
			className="flex w-[320px] max-w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
			style={{ width: `${CARD_WIDTH_PX}px` }}
		>
			<section className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Prompt
				</span>
				<textarea
					ref={promptRef}
					className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
					placeholder="What question was asked?"
					value={card.prompt}
					onChange={handlePromptChange}
					rows={4}
					autoComplete="off"
					data-item-editable
				/>
			</section>
			<section className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Response
				</span>
				<div className="flex flex-col gap-3">
					<div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
						<ReactMarkdown
							className="space-y-2 text-sm leading-relaxed text-slate-800 break-words"
							components={{
								a: ({ ...props }) => (
									<a
										{...props}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 underline hover:text-blue-700"
									/>
								),
							}}
						>
							{card.response || "_LLM output will appear here in markdown form._"}
						</ReactMarkdown>
					</div>
				</div>
			</section>
		</div>
	);
}
