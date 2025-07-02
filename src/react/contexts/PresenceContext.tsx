import { createContext } from "react";
import type { SelectionManager } from "../../utils/Interfaces/SelectionManager.js";
import { UsersManager } from "../../utils/Interfaces/UsersManager.js";
import { DragManager } from "../../utils/Interfaces/DragManager.js";
import { ResizeManager } from "../../utils/Interfaces/ResizeManager.js";
import { DragAndRotatePackage } from "../../utils/drag.js";
import { ResizePackage } from "../../utils/Interfaces/ResizeManager.js";
import { TypedSelection } from "../../utils/selection.js";

export const PresenceContext = createContext<{
	users: UsersManager;
	itemSelection: SelectionManager<TypedSelection>;
	tableSelection: SelectionManager<TypedSelection>;
	drag: DragManager<DragAndRotatePackage | null>;
	resize: ResizeManager<ResizePackage | null>;
	branch: boolean;
}>({
	users: {} as UsersManager,
	itemSelection: {} as SelectionManager<TypedSelection>,
	tableSelection: {} as SelectionManager<TypedSelection>,
	drag: {} as DragManager<DragAndRotatePackage | null>,
	resize: {} as ResizeManager<ResizePackage | null>,
	branch: false,
});
