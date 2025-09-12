/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Barrel export file for all button components.
 * 
 * This file serves as a centralized re-export hub that allows other parts of the codebase
 * to import multiple button components from a single location, instead of having separate
 * import statements for each individual button file.
 * 
 * Benefits:
 * - Clean import statements: Import multiple components from one path
 * - Maintainability: Easy to refactor internal file organization without breaking imports
 * - Discoverability: All available button components visible at a glance
 * - Consistent import paths: All button imports come from the same location
 * 
 * Usage example:
 * import { UndoButton, RedoButton, NewCircleButton } from "./buttons/index.js";
 */

// Action buttons
export { UndoButton, RedoButton, ClearAllButton } from "./ActionButtons.js";

// Creation buttons
export {
	NewCircleButton,
	NewSquareButton,
	NewTriangleButton,
	NewStarButton,
	NewNoteButton,
	NewTableButton,
	SHAPE_COLORS,
} from "./CreationButtons.js";

// Edit buttons
export { DeleteButton, DuplicateButton, VoteButton, CommentButton } from "./EditButtons.js";

// Ink buttons
export {
	InkToggleButton,
	EraserToggleButton,
	InkColorPicker,
	ColorPicker,
	InkThicknessPalette,
} from "./InkButtons.js";

// Pane buttons
export { CommentsPaneToggleButton, ShowPaneButton } from "./PaneButtons.js";

// Shape buttons
export { ShapeColorPicker } from "./ShapeButtons.js";

// Table buttons
export * from "./TableButtons.js";

// View buttons
export { SelectionCountBadge, ZoomMenu } from "./ViewButtons.js";

// Z-order buttons
export {
	MoveItemForwardButton,
	MoveItemBackwardButton,
	BringItemToFrontButton,
	SendItemToBackButton,
} from "./ZOrderButtons.js";
