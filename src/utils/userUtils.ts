/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Gets initials from a user's name.
 *
 * @param name - The user's full name
 * @returns The initials (first letter of first word + first letter of last word, or just first letter if single word)
 */
export function getInitials(name: string): string {
	if (!name) return "?";
	const words = name.trim().split(/\s+/);
	return words.length === 1
		? words[0].charAt(0).toUpperCase()
		: (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Gets a consistent color for a user ID using a hash function.
 *
 * @param userId - The user's unique identifier
 * @returns A color hex code
 */
export function getUserColor(userId: string): string {
	const colors = [
		"#3b82f6",
		"#ef4444",
		"#10b981",
		"#f59e0b",
		"#8b5cf6",
		"#06b6d4",
		"#f97316",
		"#84cc16",
		"#ec4899",
		"#6366f1",
		"#f43f5e",
		"#06b6d4",
		"#14b8a6",
		"#a855f7",
		"#0ea5e9",
	];
	let hash = 0;
	for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
	return colors[Math.abs(hash) % colors.length];
}
