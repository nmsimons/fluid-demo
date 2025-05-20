import { createContext } from "react";

export const layoutCache = new Map<
	string,
	{ left: number; top: number; right: number; bottom: number }
>();

export const LayoutContext = createContext(layoutCache);
