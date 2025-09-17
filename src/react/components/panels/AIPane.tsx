// A pane for displaying and interacting with an LLM on the right side of the screen
import { Button, Textarea } from "@fluentui/react-components";
import { ArrowLeftFilled, BotRegular } from "@fluentui/react-icons";
import React, { ReactNode, useEffect, useState, useRef, useContext } from "react";
import { Pane } from "./Pane.js";
import { TreeViewAlpha } from "@fluidframework/tree/alpha";
// import the function, not the type
import { SharedTreeSemanticAgent, createSemanticAgent } from "@fluidframework/tree-agent/alpha";
import { App } from "../../../schema/appSchema.js";
import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { AuthContext } from "../../contexts/AuthContext.js";
import { PublicClientApplication } from "@azure/msal-browser";

/**
 * Helper function to get ZUMO auth token for Azure service calls
 */
async function getZumoAuthToken(msalInstance: PublicClientApplication): Promise<string> {
	const accounts = msalInstance.getAllAccounts();
	if (accounts.length === 0) {
		throw new Error("No authenticated accounts found");
	}

	// Get token with the specific scope for the service
	const tokenRequest = {
		scopes: ["api://56bbaaea-f34d-4aee-9565-b37be2d84fa8/user_impersonation"],
		account: accounts[0],
	};

	let msalToken: string;
	let idToken: string;
	try {
		// Try silent token acquisition first
		const silentResult = await msalInstance.acquireTokenSilent(tokenRequest);
		msalToken = silentResult.accessToken;
		idToken = silentResult.idToken;
	} catch (silentError) {
		console.log("Silent token acquisition failed, trying interactive:", silentError);
		// Fall back to interactive token acquisition
		const interactiveResult = await msalInstance.acquireTokenPopup(tokenRequest);
		msalToken = interactiveResult.accessToken;
		idToken = interactiveResult.idToken;
	}

	// Exchange the MSAL token for a ZUMO auth token
	const authResponse = await fetch(
		"https://mts-d6b6edexdtaqapg4.westus2-01.azurewebsites.net/.auth/login/aad",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				access_token: msalToken,
				id_token: idToken,
			}),
			credentials: "include",
		}
	);

	if (!authResponse.ok) {
		throw new Error(
			`Failed to get ZUMO auth token: ${authResponse.status} ${authResponse.statusText}`
		);
	}

	const authResult = await authResponse.json();
	return authResult.authenticationToken;
}

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
	const { msalInstance } = useContext(AuthContext);

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
			const setupAgent = async () => {
				console.log("Setting up AI agent...");

				// Check for OpenAI API key first
				const openaiApiKey = process.env.OPENAI_API_KEY;
				if (openaiApiKey) {
					console.log("Using OpenAI with API key");
					try {
						const chatOpenAI = new ChatOpenAI({
							apiKey: openaiApiKey,
							model: process.env.OPENAI_MODEL || "gpt-4",
						});

						setAgent(
							createSemanticAgent(chatOpenAI, branch, {
								log: (msg) => console.log(msg),
								domainHints,
							})
						);

						console.log("AI agent successfully created with OpenAI");
						return;
					} catch (error) {
						console.error("Failed to set up OpenAI agent:", error);
						// Continue to Azure fallback
					}
				}

				const endpoint = import.meta.env.VITE_OPENAI_BASE_URL;
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

						const customFetch = async (input: any, init?: any): Promise<Response> => {
							let url: string;
							if (typeof input === "string") {
								url = input;
							} else if (input instanceof Request) {
								url = input.url;
							} else {
								url = String(input);
							}

							if (url.startsWith(endpoint)) {
								// Ensure a ZUMO token is available
								await ensureZumoToken();
								let headers = new Headers(init?.headers || {});
								headers.set("X-ZUMO-AUTH", cachedZumoToken!);
								let response = await (globalThis as any).fetch(input, {
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

							return (globalThis as any).fetch(input, init);
						};

						const chatOpenAI = new ChatOpenAI({
							configuration: {
								baseURL: endpoint,
								fetch: customFetch,
							},
							apiKey: "not-used-due-to-custom-fetch-providing-auth",
							model: process.env.OPENAI_MODEL || "gpt-5",
						});

						setAgent(
							createSemanticAgent(chatOpenAI, branch, {
								log: (msg) => console.log(msg),
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

						setAgent(
							createSemanticAgent(chatOpenAI, branch, {
								log: (msg) => console.log(msg),
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

					setAgent(
						createSemanticAgent(chatOpenAI, branch, {
							log: (msg) => console.log(msg),
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
	}, [branch, msalInstance]);

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
