/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	ColumnDef,
	createColumnHelper,
	useReactTable,
	getCoreRowModel,
	Table,
	Header,
	Row,
	Cell,
	getSortedRowModel,
	SortingFnOption,
	SortDirection,
	Column,
	SortingFn,
} from "@tanstack/react-table";
import React, { JSX, useState, useEffect, useContext } from "react";
import {
	DateTime,
	Vote,
	FluidTable,
	FluidRow,
	FluidColumn,
	typeDefinition,
	hintValues,
} from "../schema/app_schema.js";
import { Tree, TreeStatus } from "fluid-framework";
import { useVirtualizer, VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import { ColumnTypeDropdown, DeleteButton, IconButton } from "./tablebuttonux.js";
import {
	ArrowSortDownFilled,
	ArrowSortFilled,
	ArrowSortUpFilled,
	ReOrderDotsVertical16Filled,
} from "@fluentui/react-icons";
import { selectionType } from "../utils/selection.js";
import {
	CellInputBoolean,
	CellInputNumber,
	CellInputString,
	CellInputDate,
	CellInputVote,
	ColumnInput,
} from "./inputux.js";
import { PresenceContext } from "./PresenceContext.js";
import { objectIdNumber, useTree } from "./useTree.js";
import { usePresenceManager } from "./usePresenceManger.js";
import { TableContext, useTable } from "./TableContext.js";

const leftColumnWidth = "20px"; // Width of the index column
const columnWidth = "200px"; // Width of the data columns

export function TableView(props: { fluidTable: FluidTable }): JSX.Element {
	const { fluidTable } = props;
	const invalTable = useTree(fluidTable); // Register for tree deltas when the component mounts
	const invalColumns = useTree(fluidTable.columns, true); // Register for tree deltas when the component mounts
	const invalRows = useTree(fluidTable.rows, true); // Register for tree deltas when the component mounts

	const [data, setData] = useState<FluidRow[]>(fluidTable.rows.map((row) => row));
	const [columns, setColumns] = useState<ColumnDef<FluidRow, cellValue>[]>(
		updateColumnData(fluidTable.columns.map((column) => column)), // Create a column helper based on the columns in the table
	);

	// Register for tree deltas when the component mounts. Any time the rows change, the app will update.
	useEffect(() => {
		if (Tree.status(fluidTable) === TreeStatus.InDocument) {
			setData(fluidTable.rows.map((row) => row));
		} else {
			console.error("Fluid table not in document");
			// Do not return a JSX element here; just return undefined
			return;
		}
	}, [invalRows, invalTable]);

	useEffect(() => {
		if (Tree.status(fluidTable) === TreeStatus.InDocument) {
			console.log("Columns changed");
			setColumns(updateColumnData(fluidTable.columns.map((column) => column)));
		} else {
			console.error("Fluid table not in document");
			// Do not return a JSX element here; just return undefined
			return;
		}
	}, [invalColumns, invalTable]);

	// The virtualizer will need a reference to the scrollable container element
	const tableContainerRef = React.useRef<HTMLDivElement>(null);

	const table = useReactTable({
		data,
		columns,
		getRowId: (originalRow) => originalRow.id,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(), //provide a sorting row model
	});

	return (
		<TableContext.Provider value={{ table: fluidTable }}>
			<div ref={tableContainerRef} className="overflow-auto mx-auto h-full w-full relative">
				<table
					style={{ display: "grid" }}
					className="table-auto w-full border-collapse border-b-2 border-gray-200"
				>
					<TableHeadersView table={table} />
					<TableBodyView table={table} tableContainerRef={tableContainerRef} />
				</table>
			</div>
		</TableContext.Provider>
	);
}

export function TableHeadersView(props: { table: Table<FluidRow> }): JSX.Element {
	const { table } = props;

	return (
		<thead
			style={{
				display: "grid",
				zIndex: 4,
			}}
			className="bg-gray-200 sticky top-0 min-h-[36px] w-full inline-flex items-center shadow-sm z-2"
		>
			{table.getHeaderGroups().map((headerGroup) => (
				<tr style={{ display: "flex", width: "100%" }} key={headerGroup.id}>
					{headerGroup.headers.map((header) =>
						header.id === "index" ? (
							<IndexHeaderView key="index" />
						) : (
							<TableHeaderView key={header.id} header={header} />
						),
					)}
				</tr>
			))}
		</thead>
	);
}

export function IndexHeaderView(): JSX.Element {
	return (
		<th
			style={{
				display: "flex",
				minWidth: leftColumnWidth,
				width: leftColumnWidth,
			}}
			className="p-1"
		></th>
	);
}

export function TableHeaderView(props: { header: Header<FluidRow, unknown> }): JSX.Element {
	const { header } = props;
	const fluidTable = useTable(); // Get the fluid table from context
	const fluidColumn: FluidColumn | undefined = (() => {
		try {
			return fluidTable.getColumn(header.id); // Get the column from the table
		} catch (e) {
			console.error("Fluid column not found", header.id);
			return undefined;
		}
	})();

	if (fluidColumn === undefined) {
		return <></>;
	}

	useTree(fluidColumn);
	const selection = useContext(PresenceContext).tableSelection; // Get the selection manager from context

	// handle a focus event in the header
	const handleFocus = () => {
		// set the selection to the column
		selection.setSelection({ id: fluidColumn.id, type: "column" });
	};

	return (
		<th
			style={{
				display: "flex",
				minWidth: columnWidth,
				width: columnWidth,
				maxWidth: columnWidth,
			}}
			className="relative p-1 border-r-1 border-gray-100"
			onFocus={handleFocus}
			onClick={(e) => {}}
		>
			<PresenceIndicator item={header} type="column" /> {/* Local selection box */}
			<PresenceIndicator item={header} type="column" /> {/* Remote selection box */}
			<div className="flex flex-row justify-between w-full gap-x-1">
				<ColumnInput column={fluidColumn} /> {/* Input field for the column name */}
				<ColumnTypeDropdown column={fluidColumn} />
				<SortButton column={header.column} />
				<DeleteButton
					delete={() => {
						header.column.clearSorting();
						fluidTable.deleteColumn(fluidColumn);
					}}
				/>
			</div>
		</th>
	);
}

export function SortButton(props: { column: Column<FluidRow> }): JSX.Element {
	const { column } = props;
	const [sorted, setSorted] = useState(column.getIsSorted());

	useEffect(() => {
		setSorted(column.getIsSorted());
	}, [column.getIsSorted()]);

	const handleClick = (e: React.MouseEvent) => {
		const sortingFn = column.getToggleSortingHandler();
		if (sortingFn) {
			sortingFn(e);
		}
	};

	return (
		<IconButton
			onClick={handleClick}
			icon={<SortIndicator sorted={sorted} />}
			toggled={sorted !== false}
		/>
	);
}

export function SortIndicator(props: { sorted: false | SortDirection }): JSX.Element {
	const { sorted } = props;
	if (sorted === "asc") {
		return <ArrowSortUpFilled />;
	} else if (sorted === "desc") {
		return <ArrowSortDownFilled />;
	} else {
		return <ArrowSortFilled />;
	}
}

export function TableBodyView(props: {
	table: Table<FluidRow>;
	tableContainerRef: React.RefObject<HTMLDivElement | null>;
}): JSX.Element {
	const { table, tableContainerRef } = props;
	const { rows } = table.getRowModel();

	const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
		count: rows.length,
		estimateSize: () => 36, //estimate row height for accurate scrollbar dragging
		getScrollElement: () => tableContainerRef.current,
		//measure dynamic row height, except in firefox because it measures table border height incorrectly
		measureElement:
			typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});

	return (
		<tbody
			id="tableBody"
			style={{
				display: "grid",
				height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
				position: "relative", //needed for absolute positioning of rows
			}}
		>
			{rowVirtualizer.getVirtualItems().map((virtualRow) => {
				const row = rows[virtualRow.index] as Row<FluidRow>;
				return (
					<TableRowView
						key={row.id}
						row={row}
						virtualRow={virtualRow}
						rowVirtualizer={rowVirtualizer}
					/>
				);
			})}
		</tbody>
	);
}

export function TableRowView(props: {
	row: Row<FluidRow>;
	virtualRow: VirtualItem;
	rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
}): JSX.Element {
	const { row, virtualRow, rowVirtualizer } = props;
	const fluidTable = useTable(); // Get the fluid table from context

	const style = { transform: `translateY(${virtualRow.start}px)` };

	// Get the fluid row from the row
	const fluidRow = fluidTable.getRow(row.id);
	if (fluidRow === undefined) {
		console.error("Fluid row not found", row.id);
		return <></>;
	}
	useTree(fluidRow);

	return (
		<tr
			key={objectIdNumber(fluidRow)}
			data-index={virtualRow.index} //needed for dynamic row height measurement
			ref={(node) => {
				rowVirtualizer.measureElement(node);
			}} //measure dynamic row height
			style={{
				...style,
				display: "flex",
				position: "absolute",
				width: "100%",
				height: `${virtualRow.size}px`,
			}}
			className={`w-full even:bg-white odd:bg-gray-100`}
		>
			<PresenceIndicator item={row} type="row" />
			{/* Local selection box */}
			{row.getVisibleCells().map((cell) =>
				cell.column.id === "index" ? (
					<IndexCellView key="index" rowId={row.id} />
				) : (
					<TableCellView
						key={cell.id}
						cell={cell as Cell<FluidRow, cellValue>}
						{...props} // Pass the user prop to the TableCellView
					/>
				),
			)}
		</tr>
	);
}

export function IndexCellView(props: { rowId: string }): JSX.Element {
	const { rowId } = props;

	const selection = useContext(PresenceContext).tableSelection; // Get the selection manager from context

	// handle a click event in the cell
	const handleClick = (e: React.MouseEvent) => {
		if (e.ctrlKey) {
			selection.toggleSelection({ id: rowId, type: "row" });
		} else {
			if (selection.testSelection({ id: rowId, type: "row" })) {
				// If the row is already selected, clear the selection
				selection.clearSelection();
			} else {
				// If the row is not selected, add the selection
				selection.setSelection({ id: rowId, type: "row" });
			}
		}
	};

	return (
		// Center the div in the cell and center the icon in the div
		<td
			onClick={(e) => handleClick(e)}
			style={{
				display: "flex",
				minWidth: leftColumnWidth,
				width: leftColumnWidth,
			}}
			className="bg-gray-200 hover:bg-gray-400 border-collapse z-0"
		>
			<div
				className={`flex w-full h-full justify-center items-center text-gray-400 hover:text-gray-800`}
			>
				<ReOrderDotsVertical16Filled />
			</div>
		</td>
	);
}

export function TableCellView(props: { cell: Cell<FluidRow, cellValue> }): JSX.Element {
	const { cell } = props;

	const selection = useContext(PresenceContext).tableSelection; // Get the selection manager from context

	// handle a click event in the cell
	const handleFocus = (e: React.FocusEvent) => {
		selection.setSelection({ id: cell.id, type: "cell" });
	};

	return (
		<td
			onClick={(e) => {}}
			onFocus={(e) => handleFocus(e)}
			style={{
				display: "flex",
				position: "relative",
				minWidth: columnWidth,
				width: columnWidth,
				maxWidth: columnWidth,
			}}
			className={`flex p-1 border-collapse border-r-2`}
		>
			<PresenceIndicator item={cell} type="cell" />
			<TableCellViewContent key={cell.id} cell={cell} />
		</td>
	);
}

export function TableCellViewContent(props: { cell: Cell<FluidRow, cellValue> }): JSX.Element {
	const { cell } = props;

	const fluidTable = useTable(); // Get the fluid table from context

	const fluidRow = fluidTable.getRow(cell.row.id);
	if (fluidRow === undefined) {
		console.error("Fluid row not found", cell.row.id);
		return <></>;
	}
	const fluidColumn = (() => {
		try {
			return fluidTable.getColumn(cell.column.id); // Get the column from the table
		} catch (e) {
			console.error("Fluid column not found", cell.column.id);
			return undefined;
		}
	})();

	if (!fluidColumn) {
		console.error("Fluid column not found", cell.column.id);
		return <></>;
	}

	const value = fluidRow.getCell(fluidColumn);
	useTree(fluidRow, true);
	useTree(fluidColumn);
	const users = useContext(PresenceContext).users;

	// Switch on the hint of the column to determine the type of input to display
	switch (fluidColumn.hint) {
		case "boolean":
			return (
				<CellInputBoolean
					value={value as boolean}
					row={fluidRow}
					column={fluidColumn}
					cellId={cell.id}
				/>
			);
		case "number":
			return (
				<CellInputNumber
					value={value as number}
					row={fluidRow}
					column={fluidColumn}
					cellId={cell.id}
				/>
			);
		case "string":
			return (
				<CellInputString
					value={value as string}
					row={fluidRow}
					column={fluidColumn}
					cellId={cell.id}
				/>
			);
		case "DateTime":
			return (
				<CellInputDate
					key={objectIdNumber(fluidRow)}
					value={value as DateTime}
					row={fluidRow}
					column={fluidColumn}
					cellId={cell.id}
				/>
			);
		case "Vote":
			return (
				<CellInputVote
					key={objectIdNumber(fluidRow)}
					value={value as Vote}
					row={fluidRow}
					column={fluidColumn}
					userId={users.getMyself().value.id} // Replace with actual user ID from context or props
				/>
			);
		default:
			// If the value is undefined, make it a string
			return (
				<CellInputString
					key={objectIdNumber(fluidRow)}
					value={value as string}
					row={fluidRow}
					column={fluidColumn}
					cellId={cell.id}
				/>
			);
	}
}

export function PresenceIndicator(props: {
	item: Cell<FluidRow, cellValue> | Header<FluidRow, unknown> | Row<FluidRow>;
	type: selectionType;
}): JSX.Element {
	const { item, type } = props;
	const selectedItem = { id: item.id, type } as const; // Default to cell for Cell and Row types, Header will override it

	const selection = useContext(PresenceContext).tableSelection;

	const [selected, setSelected] = useState(selection.testSelection(selectedItem));
	const [remoteSelected, setRemoteSelected] = useState(
		selection.testRemoteSelection(selectedItem),
	);

	usePresenceManager(
		selection,
		() => {
			setRemoteSelected(selection.testRemoteSelection(selectedItem));
		},
		() => {
			setSelected(selection.testSelection(selectedItem));
		},
		() => {
			setRemoteSelected(selection.testRemoteSelection(selectedItem));
		},
	);

	const isRow = type === "row";

	return (
		<>
			<PresenceBox color="outline-blue-600" hidden={!selected} isRow={isRow} />
			<PresenceBox
				color="outline-red-800"
				hidden={remoteSelected.length === 0}
				isRow={isRow}
			/>
		</>
	);
}

function PresenceBox(props: { color: string; hidden: boolean; isRow: boolean }): JSX.Element {
	const { color, hidden, isRow } = props;
	const className = `pointer-events-none absolute z-1 h-full w-full inset-0 pointer-events-none outline-2 -outline-offset-2
	${hidden ? "hidden" : ""} ${color} opacity-50`;
	if (isRow) {
		return <td className={className}></td>;
	} else {
		return <span className={className}></span>;
	}
}

export type cellValue = typeDefinition; // Define the allowed cell value types

const updateColumnData = (columnsArray: FluidColumn[]) => {
	// Create a column helper based on the columns in the table
	const columnHelper = createColumnHelper<FluidRow>();

	// Create an array of ColumnDefs based on the columns in the table using
	// the column helper
	const headerArray: ColumnDef<FluidRow, cellValue>[] = [];
	// Add the index column
	const d = columnHelper.display({
		id: "index",
	});
	headerArray.push(d);

	// Add the data columns
	columnsArray.forEach((column) => {
		const sortingConfig = getSortingConfig(column);
		headerArray.push(
			columnHelper.accessor((row) => row.getCells()[column.id], {
				id: column.id,
				header: column.name,
				sortingFn: sortingConfig.fn,
				sortDescFirst: sortingConfig.desc,
				sortUndefined: "last",
			}),
		);
	});

	return headerArray;
};

// Custom sorting function for DateTime objects because
// the default alphanumeric sorting function does not work
// because the data is accessed via a second layer of the object
const dateSortingFn: SortingFn<FluidRow> = (
	rowA: Row<FluidRow>,
	rowB: Row<FluidRow>,
	columnId: string,
) => {
	const valueA = rowA.getValue(columnId) as { value: DateTime | undefined };
	const valueB = rowB.getValue(columnId) as { value: DateTime | undefined };
	if (valueA === undefined && valueB === undefined) {
		return 0;
	} else if (valueA === undefined || valueA.value === undefined) {
		return 1;
	} else if (valueB === undefined || valueB.value === undefined) {
		return -1;
	} else if (Tree.is(valueA, DateTime) && Tree.is(valueB, DateTime)) {
		const dateA = valueA.value;
		const dateB = valueB.value;
		if (dateA < dateB) {
			return -1;
		} else if (dateA > dateB) {
			return 1;
		} else {
			return 0;
		}
	}
	return 0;
};

// Custom sorting function for DateTime objects because
// the default alphanumeric sorting function does not work
// because the data is accessed via a second layer of the object
const voteSortingFn: SortingFn<FluidRow> = (
	rowA: Row<FluidRow>,
	rowB: Row<FluidRow>,
	columnId: string,
) => {
	const valueA = rowA.getValue(columnId) as { value: Vote | undefined };
	const valueB = rowB.getValue(columnId) as { value: Vote | undefined };
	if (valueA === undefined && valueB === undefined) {
		return 0;
	} else if (valueA === undefined) {
		return 1;
	} else if (valueB === undefined) {
		return -1;
	} else if (Tree.is(valueA, Vote) && Tree.is(valueB, Vote)) {
		const dateA = valueA.numberOfVotes;
		const dateB = valueB.numberOfVotes;
		if (dateA < dateB) {
			return -1;
		} else if (dateA > dateB) {
			return 1;
		} else {
			return 0;
		}
	}
	return 0;
};

// Get the sorting function and sort direction for a column
const getSortingConfig = (
	column: FluidColumn, // Column object with id, name, and hint properties
): { fn: SortingFnOption<FluidRow> | undefined; desc: boolean } => {
	if (column.hint === hintValues.boolean) {
		return { fn: "basic", desc: false };
	} else if (column.hint === hintValues.number) {
		return { fn: "alphanumeric", desc: true };
	} else if (column.hint === hintValues.string) {
		return { fn: "alphanumeric", desc: false };
	} else if (column.hint === hintValues.date) {
		return { fn: dateSortingFn, desc: false };
	} else if (column.hint === hintValues.vote) {
		return { fn: voteSortingFn, desc: true };
	} else {
		console.error("Unknown column type", "Hint:", column.hint);
		return { fn: "basic", desc: false };
	}
};
