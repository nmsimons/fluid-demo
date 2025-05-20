import { createContext, useContext } from "react";
import { FluidTable } from "../schema/app_schema.js";
import { Tree, TreeStatus } from "fluid-framework";

export const TableContext = createContext<{
	table: FluidTable | null;
}>({
	table: null,
});

export const useTable = (): FluidTable => {
	const currentTableContext = useContext(TableContext);
	if (
		Tree.is(currentTableContext.table, FluidTable) &&
		Tree.status(currentTableContext.table) === TreeStatus.InDocument
	) {
		return currentTableContext.table;
	} else {
		throw new Error("TableContext is not a Fluid Table or is not in the document.");
	}
};
