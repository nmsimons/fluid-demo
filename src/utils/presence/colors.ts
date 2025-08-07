// Shared deterministic user color assignment across presence features
const palette = [
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
	"#14b8a6",
	"#a855f7",
	"#0ea5e9",
	"#7c3aed",
];

export function userColorFromId(userId: string): string {
	let hash = 0;
	for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
	return palette[Math.abs(hash) % palette.length];
}

export function userColorSelectionBg(userId: string): string {
	const solid = userColorFromId(userId);
	if (/^#([0-9a-fA-F]{6})$/.test(solid)) {
		const r = parseInt(solid.slice(1, 3), 16);
		const g = parseInt(solid.slice(3, 5), 16);
		const b = parseInt(solid.slice(5, 7), 16);
		return `rgba(${r},${g},${b},0.35)`;
	}
	return solid;
}
