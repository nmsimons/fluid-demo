import React, { useState, useEffect } from "react";
import {
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	MessageBarActions,
} from "@fluentui/react-message-bar";
import { Button } from "@fluentui/react-components";
import { Dismiss20Regular } from "@fluentui/react-icons";

export interface FloatingMessage {
	id: string;
	message: string;
	type?: "info" | "warning" | "error" | "success";
	dismissible?: boolean;
	autoHide?: boolean;
	autoHideDelay?: number;
}

interface FloatingMessagesProps {
	messages: FloatingMessage[];
	onDismiss: (messageId: string) => void;
}

export function FloatingMessages({ messages, onDismiss }: FloatingMessagesProps): JSX.Element {
	const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set());

	// Auto-hide messages with autoHide enabled
	useEffect(() => {
		const timers: NodeJS.Timeout[] = [];

		messages.forEach((message) => {
			if (message.autoHide && !dismissedMessages.has(message.id)) {
				const timer = setTimeout(() => {
					handleDismiss(message.id);
				}, message.autoHideDelay || 5000);
				timers.push(timer);
			}
		});

		return () => {
			timers.forEach(clearTimeout);
		};
	}, [messages, dismissedMessages]);

	const handleDismiss = (messageId: string) => {
		setDismissedMessages((prev) => new Set(prev).add(messageId));
		onDismiss(messageId);
	};

	const visibleMessages = messages.filter((message) => !dismissedMessages.has(message.id));

	if (visibleMessages.length === 0) {
		return <></>;
	}

	return (
		<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 space-y-2 w-fit max-w-full px-4">
			{visibleMessages.map((message) => (
				<div
					key={message.id}
					className="animate-in slide-in-from-top-4 duration-300 shadow-lg"
				>
					<MessageBar intent={message.type || "info"}>
						<MessageBarBody>
							<MessageBarTitle>{message.message}</MessageBarTitle>
						</MessageBarBody>
						{message.dismissible !== false && (
							<MessageBarActions>
								<Button
									appearance="transparent"
									icon={<Dismiss20Regular />}
									onClick={() => handleDismiss(message.id)}
									aria-label="Dismiss message"
								/>
							</MessageBarActions>
						)}
					</MessageBar>
				</div>
			))}
		</div>
	);
}
