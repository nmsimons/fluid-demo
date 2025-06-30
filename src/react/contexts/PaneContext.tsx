import { createContext } from "react";

export const PaneContext = createContext<{
	panes: { name: string; visible: boolean }[];
}>({
	panes: [],
});
