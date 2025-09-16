import { useState, useCallback } from "react";
import { FloatingMessage } from "../components/canvas/FloatingMessages.js";

export function useFloatingMessages() {
	const [messages, setMessages] = useState<FloatingMessage[]>([]);

	const addMessage = useCallback((message: Omit<FloatingMessage, "id">) => {
		const id = `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newMessage: FloatingMessage = {
			id,
			dismissible: true,
			...message,
		};

		setMessages((prev) => [...prev, newMessage]);
		return id;
	}, []);

	const removeMessage = useCallback((messageId: string) => {
		setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
	}, []);

	const clearAllMessages = useCallback(() => {
		setMessages([]);
	}, []);

	const updateMessage = useCallback((messageId: string, updates: Partial<FloatingMessage>) => {
		setMessages((prev) =>
			prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
		);
	}, []);

	return {
		messages,
		addMessage,
		removeMessage,
		clearAllMessages,
		updateMessage,
	};
}
