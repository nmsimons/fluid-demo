export const NOTE_COLORS = [
	"#FEFF68", // warm yellow
	"#FFE4A7", // soft orange
	"#C8F7C5", // light green
	"#FAD4D8", // blush pink
	"#D7E8FF", // pale blue
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export const DEFAULT_NOTE_COLOR: NoteColor = NOTE_COLORS[0];
