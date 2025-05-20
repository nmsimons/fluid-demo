// A pane for displaying and interacting with an LLM on the right side of the screen
import { Button, Textarea } from "@fluentui/react-components";
import { ArrowLeftFilled, BotRegular } from "@fluentui/react-icons";
import React, { ReactNode, useEffect, useState, useRef } from "react";
import { Pane } from "./paneux.js";
import { TreeViewAlpha } from "@fluidframework/tree/alpha";
import { createFunctioningAgent, SharedTreeSemanticAgent } from "@fluidframework/tree-agent/alpha";
import { App } from "../schema/app_schema.js";
import { ChatOpenAI } from "@langchain/openai";

export function TaskPane(props: {
	hidden: boolean;
	setHidden: (hidden: boolean) => void;
	main: TreeViewAlpha<typeof App>;
	setRenderView: (view: TreeViewAlpha<typeof App>) => void;
}): JSX.Element {
	const { hidden, setHidden, main, setRenderView } = props;
	const [branch, setBranch] = useState<typeof main | undefined>(undefined);
	const [chats, setChats] = useState<string[]>([]);
	const [agent, setAgent] = useState<SharedTreeSemanticAgent | undefined>();

	useEffect(() => {
		if (hidden) {
			setRenderView(main);
		} else {
			if (branch === undefined) {
				const b = main.fork();
				setBranch((prev) => {
					prev?.dispose();
					return b;
				});
				setRenderView(b);
			} else {
				setRenderView(branch);
			}
		}
	}, [main, hidden, branch, setRenderView]);

	useEffect(() => {
		if (branch !== undefined) {
			setAgent(
				createFunctioningAgent(new ChatOpenAI({ model: "o4-mini" }), branch, {
					log: (msg) => console.log(msg),
					domainHints,
				}),
			);
		}
	}, [branch]);

	const handlePromptSubmit = async (prompt: string) => {
		if (agent !== undefined) {
			setChats([...chats, `${prompt}`, `.`]);
			const response = await agent.query(prompt);
			setChats((prev) => [...prev.slice(0, -1), `${response ?? "LLM query failed!"}`]);
		}
	};

	useEffect(() => {
		let cancelDots: ReturnType<typeof setTimeout> | undefined = undefined;
		function updateDots() {
			const dots = chats.at(-1);
			switch (dots) {
				case "...":
					cancelDots = setTimeout(() => {
						setChats((prev) => [...prev.slice(0, -1), "."]);
					}, 1000 / 3);
					break;
				case ".":
					cancelDots = setTimeout(() => {
						setChats((prev) => [...prev.slice(0, -1), ".."]);
					}, 1000 / 3);
					break;
				case "..":
					cancelDots = setTimeout(() => {
						setChats((prev) => [...prev.slice(0, -1), "..."]);
					}, 1000 / 3);
					break;
				default:
					clearTimeout(cancelDots);
			}
		}
		updateDots();
		return () => {
			clearTimeout(cancelDots);
		};
	}, [chats]);

	return (
		<Pane hidden={hidden} setHidden={setHidden} title="AI Task">
			<ChatLog chats={chats} />
			<PromptCommitDiscardButtons
				cancelCallback={() => {
					if (branch !== undefined) {
						setBranch(undefined);
					}
					setChats([]);
					setHidden(true);
					setRenderView(main);
				}}
				commitCallback={() => {
					if (branch !== undefined) {
						main.merge(branch, false);
						branch.dispose();
						setBranch(undefined);
					}
					setChats([]);
					setHidden(true);
					setRenderView(main);
				}}
				disabled={chats.length === 0}
			/>
			<PromptInput
				callback={handlePromptSubmit}
				disabled={chats.at(-1) === "." || chats.at(-1) === ".." || chats.at(-1) === "..."}
			/>
		</Pane>
	);
}

export function PromptCommitDiscardButtons(props: {
	cancelCallback: () => void;
	commitCallback: () => void;
	disabled?: boolean;
}): JSX.Element {
	const { cancelCallback, commitCallback } = props;
	return (
		<div className="flex flex-row gap-x-2 w-full shrink-0">
			<Button
				appearance="primary"
				className="flex-grow shrink-0 "
				onClick={() => {
					commitCallback();
				}}
				disabled={props.disabled}
			>
				Complete
			</Button>
			<Button
				className="flex-grow shrink-0 "
				onClick={() => {
					cancelCallback();
				}}
				disabled={props.disabled}
			>
				Discard
			</Button>
		</div>
	);
}

export function PromptInput(props: {
	callback: (prompt: string) => void;
	disabled: boolean;
}): JSX.Element {
	const { callback } = props;
	const [prompt, setPrompt] = useState("");
	return (
		<div className="flex flex-col justify-self-end gap-y-2 ">
			<Textarea
				className="flex"
				rows={4}
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						callback(prompt);
						setPrompt("");
					}
				}}
				placeholder="Type your prompt here..."
			/>
			<Button
				appearance="primary"
				onClick={() => {
					callback(prompt);
					setPrompt("");
				}}
				disabled={props.disabled}
			>
				Submit
			</Button>
		</div>
	);
}

export function ChatLog(props: { chats: string[] }): JSX.Element {
	const { chats } = props;
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (el) {
			// scroll to bottom whenever chats changes
			el.scrollTop = el.scrollHeight;
		}
	}, [chats]);

	return (
		<div ref={containerRef} className="relative flex flex-col grow space-y-2 overflow-y-auto">
			<div
				className={`absolute top-0 left-0 h-full w-full ${chats.length > 0 ? "hidden" : ""}`}
			>
				<BotRegular className="h-full w-full opacity-10" />
			</div>
			{chats.map((message, idx) => {
				const isUser = idx % 2 === 0;
				return (
					<div key={idx} className={`z-100 flex ${isUser ? "ml-6" : "mr-6"}`}>
						<SpeechBubble isUser={isUser}>{message}</SpeechBubble>
					</div>
				);
			})}
		</div>
	);
}

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

export function ResponseButtons(props: { cancelCallback: () => void }): JSX.Element {
	const { cancelCallback } = props;

	return (
		<div className="flex flex-row gap-x-2">
			<CancelResponseButton callback={cancelCallback} />
		</div>
	);
}

export function ApplyResponseButton(props: {
	response: string;
	callback: (response: string) => void;
}): JSX.Element {
	const { response, callback } = props;

	return (
		<Button
			appearance="primary"
			className="flex shrink-0 grow"
			onClick={() => {
				callback(response);
			}}
			icon={<ArrowLeftFilled />}
			disabled={response.trim() === ""}
		>
			Accept Response
		</Button>
	);
}

export function CancelResponseButton(props: { callback: () => void }): JSX.Element {
	const { callback } = props;

	return (
		<Button
			className="flex shrink-0 grow"
			onClick={() => {
				callback();
			}}
		>
			Clear
		</Button>
	);
}

const domainHints = `This is a 2D application that allows the user to position shapes on a canvas.
The shapes can be moved, rotated, resized and have style properties changed.
Each shape can have comments associated with it as well.

Here's an example of a canvas with five shapes on it:

\`\`\`JSON
{
  "items": [
    {
      // Index: 0,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df5917",
      "x": 1123,
      "y": 575,
      "rotation": 352,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 118,
        "color": "#A133FF",
        "type": "star"
      }
    },
    {
      // Index: 1,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df5919",
      "x": 692,
      "y": 231,
      "rotation": 357,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 111,
        "color": "#FF3357",
        "type": "triangle"
      }
    },
    {
      // Index: 2,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df591b",
      "x": 1228,
      "y": 85,
      "rotation": 12,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 110,
        "color": "#FF5733",
        "type": "square"
      }
    },
    {
      // Index: 3,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df591d",
      "x": 228,
      "y": 199,
      "rotation": 353,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 111,
        "color": "#3357FF",
        "type": "star"
      }
    },
    {
      // Index: 4,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df591f",
      "x": 588,
      "y": 699,
      "rotation": 355,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 105,
        "color": "#FF5733",
        "type": "star"
      }
    }
  ],
  "comments": []
}
\`\`\`;

Here's an example of a function that can be run by the tree editing tool which adds three now shapes to the canvas, groups items on the canvas by shape type and organizes them spatially, and then colors all shapes red:

function editTree({ root, create }) {
  // Add three new shapes: a star, a triangle, and a circle
  const newStar = create.Item({
    id: crypto.randomUUID(),
    x: 100,
    y: 400,
    rotation: 0,
    comments: [],
    votes: create.Vote({ votes: [] }),
    content: create.Shape({ size: 110, color: "#FF0000", type: "star" })
  });
  const newTriangle = create.Item({
    id: crypto.randomUUID(),
    x: 400,
    y: 100,
    rotation: 0,
    comments: [],
    votes: create.Vote({ votes: [] }),
    content: create.Shape({ size: 110, color: "#FF0000", type: "triangle" })
  });
  const newCircle = create.Item({
    id: crypto.randomUUID(),
    x: 400,
    y: 400,
    rotation: 0,
    comments: [],
    votes: create.Vote({ votes: [] }),
    content: create.Shape({ size: 110, color: "#FF0000", type: "circle" })
  });
  // Insert the new shapes at the end of the canvas
  root.items.insertAt(root.items.length, newStar, newTriangle, newCircle);

  // Group all shapes spatially by type and make them red
  root.items.forEach(item => {
    // Color everything red
    if (item.content && item.content.color !== undefined) {
      item.content.color = "#FF0000";
    }
    // Position by shape type
    switch (item.content.type) {
	  case "square":
		item.x = 100;
		item.y = 100;
		break;
      case "star":
        item.x = 100;
		item.y = 400;
        break;
      case "triangle":
        item.x = 400;
		item.y = 100;
        break;
      case "circle":
        item.x = 400;
		item.y = 400;
        break;
    }
  });

  // Spread the shapes in each group out a bit so they are more visible
  root.items.forEach(item => {
      item.x += Math.random() * 50 - 25;
	  item.y += Math.random() * 50 - 25;
  });
}

A common mistake in the generated function: data cannot be removed from the tree and then directly re-inserted. Instead, it must be cloned - i.e. create an equivalent new instance of that data - and then the new instance can be inserted.

When responding to the user, YOU MUST NEVER reference technical details like "schema" or "data", "tree" or "pixels" - explain what has happened with high-level user-friendly language.
`;
