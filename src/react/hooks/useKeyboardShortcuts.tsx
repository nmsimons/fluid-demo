/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect } from "react";

export interface KeyboardShortcut {
	key: string;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	action: () => void;
	disabled?: boolean;
}

export interface UseKeyboardShortcutsProps {
	shortcuts: KeyboardShortcut[];
	enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts in the application
 * @param shortcuts Array of keyboard shortcuts to register
 * @param enabled Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts({
	shortcuts,
	enabled = true,
}: UseKeyboardShortcutsProps): void {
	useEffect(() => {
		if (!enabled) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent): void => {
			// Don't trigger shortcuts when user is typing in an input field
			const target = event.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true"
			) {
				return;
			}

			// Find matching shortcut
			const matchingShortcut = shortcuts.find((shortcut) => {
				if (shortcut.disabled) {
					return false;
				}

				return (
					event.key.toLowerCase() === shortcut.key.toLowerCase() &&
					!!event.ctrlKey === !!shortcut.ctrlKey &&
					!!event.shiftKey === !!shortcut.shiftKey &&
					!!event.altKey === !!shortcut.altKey &&
					!!event.metaKey === !!shortcut.metaKey
				);
			});

			if (matchingShortcut) {
				event.preventDefault();
				event.stopPropagation();
				matchingShortcut.action();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [shortcuts, enabled]);
}

/**
 * Format a keyboard shortcut for display in tooltips
 * @param shortcut The keyboard shortcut to format
 * @returns Formatted string like "Ctrl+Z" or "Shift+Delete"
 */
export function formatKeyboardShortcut(
	shortcut: Omit<KeyboardShortcut, "action" | "disabled">
): string {
	const parts: string[] = [];

	if (shortcut.ctrlKey) parts.push("Ctrl");
	if (shortcut.metaKey) parts.push("Cmd");
	if (shortcut.altKey) parts.push("Alt");
	if (shortcut.shiftKey) parts.push("Shift");

	// Capitalize single letters, keep special keys as-is
	const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
	parts.push(key);

	return parts.join("+");
}
