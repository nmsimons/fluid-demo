// A pane for displaying and interacting with an LLM on the right side of the screen
import { Button, Textarea } from "@fluentui/react-components";
import { ArrowLeftFilled, BotRegular } from "@fluentui/react-icons";
import React, { ReactNode, useEffect, useState, useRef, useContext } from "react";
import { Pane } from "./Pane.js";
import { TreeViewAlpha } from "@fluidframework/tree/alpha";
// import the function, not the type
import { SharedTreeSemanticAgent } from "@fluidframework/tree-agent/alpha";
import { createLangchainChatModel } from "@fluidframework/tree-agent-langchain/alpha";
import { App } from "../../../schema/appSchema.js";
import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { AuthContext } from "../../contexts/AuthContext.js";
import { getZumoAuthToken } from "../../../utils/zumoAuth.js";
import { domainHints } from "../../../constants/domainHints.js";

export function AIPane(props: {
	hidden: boolean;
	setHidden: (hidden: boolean) => void;
	main: TreeViewAlpha<typeof App>;
	branch?: TreeViewAlpha<typeof App>;
	setRenderView: (view: TreeViewAlpha<typeof App>) => void;
}): JSX.Element {
	const { hidden, setHidden, main, branch, setRenderView } = props;
	const [localBranch, setLocalBranch] = useState<typeof main | undefined>(undefined);
	const [chats, setChats] = useState<string[]>([]);
	const [agent, setAgent] = useState<SharedTreeSemanticAgent<typeof App> | undefined>();
	const { msalInstance } = useContext(AuthContext);

	// Dirty tracking state - tracks nodes that have been modified by AI operations
	// Create operation tracker for dirty node tracking

	useEffect(() => {
		if (hidden) {
			setRenderView(main);
		} else {
			if (branch) {
				setRenderView(branch);
			} else {
				if (localBranch === undefined) {
					const b = main.fork();
					setLocalBranch((prev) => {
						prev?.dispose();
						return b;
					});
					setRenderView(b);
				} else {
					setRenderView(localBranch);
				}
			}
		}
	}, [main, hidden, localBranch, setRenderView, branch]);

	useEffect(() => {
		if (localBranch !== undefined) {
			const setupAgent = async () => {
				console.log("Setting up AI agent...");
				const endpoint = `${import.meta.env.VITE_OPENAI_BASE_URL}/api/v1`;
				if (endpoint) {
					console.log(`Using OpenAI at ${endpoint}`);
					try {
						if (!msalInstance) {
							throw new Error("MSAL instance not available from context");
						}

						// Acquire a ZUMO auth token and ensure requests to the middle-tier include it
						const zumoToken = await getZumoAuthToken(msalInstance);
						console.log("ZUMO auth token acquired for middle-tier requests");

						// Cache and refresh logic for the ZUMO token so the agent can run long-lived
						// and recover from token expiration.
						let cachedZumoToken: string | undefined = zumoToken;
						let refreshInProgress: Promise<void> | null = null;

						const ensureZumoToken = async (): Promise<string> => {
							if (cachedZumoToken) {
								return cachedZumoToken;
							}
							if (!refreshInProgress) {
								refreshInProgress = (async () => {
									cachedZumoToken = await getZumoAuthToken(msalInstance);
								})();
								try {
									await refreshInProgress;
									return cachedZumoToken!;
								} finally {
									refreshInProgress = null;
								}
							} else {
								await refreshInProgress;
								return cachedZumoToken!;
							}
						};

						const refreshZumoToken = async (): Promise<string> => {
							if (refreshInProgress) {
								await refreshInProgress;
								return cachedZumoToken!;
							}
							refreshInProgress = (async () => {
								cachedZumoToken = await getZumoAuthToken(msalInstance);
							})();
							try {
								await refreshInProgress;
								return cachedZumoToken!;
							} finally {
								refreshInProgress = null;
							}
						};

						const customFetch = async (
							input: RequestInfo | URL,
							init?: RequestInit
						): Promise<Response> => {
							let url: string;
							if (typeof input === "string") {
								url = input;
							} else if (input instanceof Request) {
								url = input.url;
							} else if (input instanceof URL) {
								url = input.toString();
							} else {
								url = String(input);
							}

							if (url.startsWith(endpoint)) {
								// Ensure a ZUMO token is available
								await ensureZumoToken();
								let headers = new Headers(init?.headers || {});
								headers.set("X-ZUMO-AUTH", cachedZumoToken!);
								let response = await fetch(input, {
									...init,
									headers,
								});

								// If unauthorized, try refreshing the token and retry once
								if (response.status === 401 || response.status === 403) {
									try {
										await refreshZumoToken();
										headers = new Headers(init?.headers || {});
										headers.set("X-ZUMO-AUTH", cachedZumoToken!);
										response = await fetch(input, {
											...init,
											headers,
										});
									} catch (e) {
										console.error("Failed to refresh ZUMO token:", e);
									}
								}

								return response;
							}

							return fetch(input, init);
						};

						const chatOpenAI = new ChatOpenAI({
							configuration: {
								baseURL: endpoint,
								fetch: customFetch,
							},
							apiKey: "not-used-due-to-custom-fetch-providing-auth",
							model: process.env.OPENAI_MODEL || "gpt-5",
						});

						// Create the semantic agent
						const model = createLangchainChatModel(chatOpenAI);

						// Log the model's edit tool name
						console.log(model.editToolName);

						setAgent(
							new SharedTreeSemanticAgent(model, localBranch, {
								logger: { log: (msg: unknown) => console.log(msg) },
								domainHints,
							})
						);

						console.log(
							"AI agent successfully created with middle-tier OpenAI endpoint"
						);
						return;
					} catch (error) {
						console.error(
							"Failed to set up OpenAI agent with middle-tier endpoint:",
							error
						);
						// Continue to Azure fallback
					}
				}

				// Fallback to Azure OpenAI
				console.log("Using Azure OpenAI...");

				// Validate Azure configuration
				const azureInstanceName = process.env.AZURE_OPENAI_API_INSTANCE_NAME;
				const azureDeploymentName = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
				const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;

				if (!azureInstanceName || !azureDeploymentName || !azureApiVersion) {
					console.error(
						"Missing Azure OpenAI configuration. Required environment variables:"
					);
					console.error("- AZURE_OPENAI_API_INSTANCE_NAME");
					console.error("- AZURE_OPENAI_API_DEPLOYMENT_NAME");
					console.error("- AZURE_OPENAI_API_VERSION");
					return;
				}

				// Try manual token first
				const manualToken = process.env.AZURE_OPENAI_MANUAL_TOKEN;
				if (manualToken) {
					console.log("Using manual token for Azure OpenAI authentication");
					try {
						const azureADTokenProvider = async () => {
							console.log("Token provider called - returning manual token");
							return manualToken;
						};

						const chatOpenAI = new AzureChatOpenAI({
							azureADTokenProvider: azureADTokenProvider,
							model: "gpt-5",
							azureOpenAIApiInstanceName: azureInstanceName,
							azureOpenAIApiDeploymentName: azureDeploymentName,
							azureOpenAIApiVersion: azureApiVersion,
						});

						const model = createLangchainChatModel(chatOpenAI);

						setAgent(
							new SharedTreeSemanticAgent(model, localBranch, {
								logger: { log: (msg: unknown) => console.log(msg) },
								domainHints,
							})
						);

						console.log("AI agent successfully created with manual token");
						return;
					} catch (error) {
						console.error("Failed to set up AI agent with manual token:", error);
						// Continue to standard auth
					}
				}

				// Standard Azure auth flow using MSAL from context
				console.log("Attempting standard Azure authentication...");
				try {
					if (!msalInstance) {
						throw new Error("MSAL instance not available from context");
					}

					// Get ZUMO auth token for the service
					const zumoToken = await getZumoAuthToken(msalInstance);
					console.log("ZUMO auth token acquired successfully");

					// Create Azure token provider that returns the ZUMO token
					const azureADTokenProvider = async () => {
						console.log("Token provider called - returning ZUMO token");
						return zumoToken;
					};

					const chatOpenAI = new AzureChatOpenAI({
						azureADTokenProvider: azureADTokenProvider,
						model: "gpt-5",
						azureOpenAIApiInstanceName: azureInstanceName,
						azureOpenAIApiDeploymentName: azureDeploymentName,
						azureOpenAIApiVersion: azureApiVersion,
						azureOpenAIBasePath: endpoint,
					});

					// Create the semantic agent
					const model = createLangchainChatModel(chatOpenAI);

					console.log(model.editToolName);

					setAgent(
						new SharedTreeSemanticAgent(model, localBranch, {
							logger: { log: (msg: unknown) => console.log(msg) },
							domainHints,
						})
					);

					console.log("AI agent successfully created with ZUMO authentication");
				} catch (error) {
					console.error("Failed to set up AI agent with ZUMO authentication:", error);
					console.error("Authentication options:");
					console.error("1. Set OPENAI_API_KEY for OpenAI");
					console.error("2. Set AZURE_OPENAI_MANUAL_TOKEN for manual Azure auth");
					console.error("3. Ensure user is signed in for ZUMO authentication");
				}
			};

			setupAgent().catch(console.error);
		}
	}, [localBranch, msalInstance]);

	const handlePromptSubmit = async (prompt: string) => {
		if (agent !== undefined) {
			setChats([...chats, `${prompt}`, `.`]);

			// Execute the AI query
			const response = await agent.query(prompt);

			setChats((prev) => [...prev.slice(0, -1), `${response ?? "LLM query failed!"}`]);
		}
	};

	useEffect(() => {
		let cancelDots: ReturnType<typeof setTimeout> | undefined = undefined;
		function updateDots() {
			const dots = chats[chats.length - 1];
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
					if (localBranch !== undefined) {
						setLocalBranch(undefined);
					}
					setChats([]);
					setHidden(true);
					setRenderView(main);
				}}
				commitCallback={() => {
					if (localBranch !== undefined) {
						main.merge(localBranch, false);
						localBranch.dispose();
						setLocalBranch(undefined);
					}
					setChats([]);
					setHidden(true);
					setRenderView(main);
				}}
				disabled={chats.length === 0}
			/>
			<PromptInput
				callback={handlePromptSubmit}
				disabled={
					chats[chats.length - 1] === "." ||
					chats[chats.length - 1] === ".." ||
					chats[chats.length - 1] === "..."
				}
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
