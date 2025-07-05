import {
	TreeNodeFromImplicitAllowedTypes,
	Tree,
	SchemaFactory,
	InsertableTreeNodeFromImplicitAllowedTypes,
	TreeNodeSchema,
	TreeArrayNode,
} from "fluid-framework";
import { hintValues } from "./app_schema.js";

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

export function Table<
	TCell extends readonly TreeNodeSchema[],
	Scope extends string | undefined,
>(props: { sf: SchemaFactory<Scope>; schemaTypes: TCell }) {
	// Create a new table based on the SharedTree schema in this file
	// The table will be empty and will have no columns
	// The types allowed in the table are defined in the schemaTypes array
	// The table will be initialized with the types allowed in the table

	const { sf, schemaTypes } = props;

	type CellInsertableType = InsertableTreeNodeFromImplicitAllowedTypes<TCell>;
	type CellValueType = TreeNodeFromImplicitAllowedTypes<TCell>;

	class Cell extends sf.object("Cell", {
		columnId: sf.required(sf.string, {
			metadata: { description: "The id of the column in which this cell resides." },
		}),
		value: sf.required(schemaTypes, {
			metadata: {
				description:
					"The content of the cell. Must match the type of the column in the hint property.",
			},
		}),
	}) {
		setValue(value: CellValueType): void {
			this.value = value;
		}

		getValue(): CellValueType {
			return this.value as CellValueType;
		}

		get column(): Column {
			const parent = Tree.parent(this);
			if (parent) {
				const grandparent = Tree.parent(parent);
				if (grandparent instanceof Table) {
					return grandparent.getColumn(this.columnId);
				}
			}
			throw new Error("Cell is not in a table");
		}

		get row(): Row {
			const parent = Tree.parent(this);
			if (parent) {
				const grandparent = Tree.parent(parent);
				if (grandparent instanceof Row) {
					return grandparent;
				}
			}
			throw new Error("Cell is not in a row");
		}
	}

	/**
	 * The Row schema - this is a map of Cells where the key is the column id
	 */
	class Row extends sf.object("Row", {
		id: sf.string,
		cells: sf.array(Cell),
	}) {
		/**
		 * Property getter to get the cells in the row
		 * @returns The cells in the row as an object where the keys are the column ids
		 * and the values are the cell values - includes the default value of the column if the cell is undefined
		 * This is used to get the cells in the row for the table view
		 */
		getCells(): Record<string, CellValueType | undefined> {
			const cells: Record<string, CellValueType | undefined> = {};
			// Iterate over the columns in the table and get the cell values
			for (const column of this.table.columns) {
				// Get the cell value from the row
				const cellValue = this.getCell(column);
				// If the cell value is undefined, set it to the default value of the column
				if (cellValue === undefined) {
					cells[column.id] = undefined;
				} else {
					cells[column.id] = cellValue;
				}
			}
			// Return the cells
			return cells;
		}

		/** Get a cell by the column
		 * @param column The column
		 * @returns The cell if it exists, otherwise undefined
		 */
		getCell(column: Column): CellValueType | undefined {
			return this.cells.find((cell) => cell.columnId === column.id)?.getValue();
		}

		/**
		 * Set the value of a cell in the row
		 * @param column The column
		 * @param value The value to set
		 */
		setCell(column: Column, value: CellInsertableType | undefined): void {
			const cell = this.cells.find((cell) => cell.columnId === column.id);
			if (cell) {
				cell.setValue(value as CellValueType);
			} else {
				if (value === undefined) {
					this.deleteCell(column);
					return;
				}
				const newCell = new Cell({
					columnId: column.id,
					value: value,
				});
				this.cells.insertAtEnd(newCell);
			}
		}

		/**
		 * Delete a cell from the row
		 * @param column The column
		 */
		deleteCell(column: Column): void {
			const cell = this.cells.find((cell) => cell.columnId === column.id);
			if (cell) {
				this.cells.removeAt(this.cells.indexOf(cell));
			}
		}

		/**
		 * Move a row to a new location
		 * @param index The index to move the row to
		 */
		moveTo(index: number): void {
			const rows = this.table.rows;
			if (index > this.index) {
				index += 1; // If the index is greater than the current index, move it to the right
			}

			// Make sure the index is within the bounds of the table
			if (index < 0 && this.index > 0) {
				rows.moveToStart(this.index);
				return;
			}
			if (index > rows.length - 1 && this.index < rows.length - 1) {
				rows.moveToEnd(this.index);
				return;
			}
			if (index < 0 || index >= rows.length) {
				return; // If the index is out of bounds, do nothing
			}
			rows.moveToIndex(index, this.index);
		}

		/**
		 * Get the parent Table
		 */
		get table(): Table {
			const parent = Tree.parent(this);
			if (parent) {
				const grandparent = Tree.parent(parent);
				if (grandparent instanceof Table) {
					return grandparent;
				}
			}
			throw new Error("Row is not in a table");
		}

		/**
		 * Get the index of the row in the table
		 * @returns The index of the row in the table
		 */
		get index(): number {
			const rows = this.table?.rows;
			if (rows) {
				return rows.indexOf(this);
			}
			throw new Error("Row is not in a table");
		}

		/**
		 * Get the synthetic id of a cell in the row by the column.
		 * This is the id of the column that the cell is in combined
		 * with the id of the row that the cell is in in the format of rowId_columnId
		 * This is used to identify the cell in the table
		 * @param column The column
		 */
		getCellId(column: Column): `${string}_${string}` {
			const columnId = column.id;
			const rowId = this.id;
			return `${rowId}_${columnId}`;
		}
	}
	/**
	 * The Column schema - this can include more properties as needed *
	 */

	class Column extends sf.object("Column", {
		id: sf.string,
		name: sf.string,
		hint: sf.optional(sf.string, {
			metadata: {
				description: `The type of the items in this column. Must be one of ${Object.values(hintValues).join(", ")}.`,
			},
		}),
	}) {
		/**
		 * Get the parent Table
		 */
		get table(): Table {
			const parent = Tree.parent(this);
			if (parent) {
				const grandparent = Tree.parent(parent);
				if (grandparent instanceof Table) {
					return grandparent;
				}
			}
			throw new Error("Column is not in a table");
		}

		/**
		 * Get all the hydrated cells in this column and return them as a map of rowId to cell value
		 * @returns The cells in the column as a map of rowId to cell value
		 */
		get cells(): Map<string, CellValueType> {
			const cells: Map<string, CellValueType> = new Map();
			// If the column is not in a table, return an empty map
			if (!this.table) {
				return cells;
			}
			// If the table has no rows, return an empty map
			if (this.table.rows.length === 0) {
				return cells;
			}
			// Get the rows that contain data for this column
			const rows = this.table.rows.filter((row) => row.getCell(this) !== undefined);
			// If there are rows with data for this column, put them in the map
			for (const row of rows) {
				// Get the cell value from the row
				const cellValue = row.getCell(this);
				if (cellValue !== undefined) {
					cells.set(row.id, cellValue);
				}
			}
			// Return the cells
			return cells;
		}

		/**
		 * Get the index of the column in the table
		 * @returns The index of the column in the table
		 */
		get index(): number {
			const columns = this.table?.columns;
			if (columns) {
				return columns.indexOf(this);
			}
			throw new Error("Column is not in a table");
		}

		/**
		 * Move a column to a new location
		 * @param index The index to move the column to
		 */
		moveTo(index: number): void {
			const columns = this.table.columns;
			if (index > this.index) {
				index += 1; // If the index is greater than the current index, move it to the right
			}

			// Make sure the index is within the bounds of the table
			if (index < 0 && this.index > 0) {
				columns.moveToStart(this.index);
				return;
			}
			if (index > columns.length - 1 && this.index < columns.length - 1) {
				columns.moveToEnd(this.index);
				return;
			}
			if (index < 0 || index >= columns.length) {
				return; // If the index is out of bounds, do nothing
			}
			columns.moveToIndex(index, this.index);
		}
	}

	/**
	 * The Table schema
	 */
	class Table extends sf.object("Table", {
		rows: sf.array(Row),
		columns: sf.array(Column),
	}) {
		public static readonly Row = Row;
		public static readonly Column = Column;

		/**
		 * Get a row by the id
		 * @param id The id of the row
		 */
		getRow(id: string): Row | undefined {
			const row = this.rows.find((row) => row.id === id);
			if (row) return row;
		}

		/**
		 * Get a cell by the synthetic id
		 * @param id The synthetic id of the cell
		 */
		getCellById(id: `${string}_${string}`): CellValueType | undefined {
			const [rowId, columnId] = id.split("_");
			const row = this.getRow(rowId);
			if (row) {
				const column = this.getColumn(columnId);
				if (column) {
					return row.getCell(column);
				}
			}
			// If the cell does not exist return undefined
			return undefined;
		}

		/**
		 * Insert a row at a specific location
		 * @param index The index to insert the row at
		 * @param rows The rows to insert
		 * If no rows are provided, a new row will be created.
		 */
		insertRows(props: {
			index?: number;
			rows: InsertableTreeNodeFromImplicitAllowedTypes<typeof Row>[];
		}): Row[] {
			const { index, rows } = props;
			if (index === undefined) {
				this.rows.insertAtEnd(TreeArrayNode.spread(rows));
			} else {
				this.rows.insertAt(index, TreeArrayNode.spread(rows));
			}
			return rows as Row[];
		}

		/**
		 * Delete a row from the table
		 * @param rows The rows to delete
		 */
		deleteRows(rows: Row[]): void {
			// If there are no rows to delete, do nothing
			if (rows.length === 0) return;
			// If there is only one row to delete, delete it
			if (rows.length === 1) {
				const index = this.rows.indexOf(rows[0]);
				this.rows.removeAt(index);
				return;
			}
			// If there are multiple rows to delete, delete them in a transaction
			// This is to avoid the performance issues of deleting multiple rows at once
			Tree.runTransaction(this, () => {
				// Iterate over the rows and delete them
				for (const row of rows) {
					const index = this.rows.indexOf(row);
					this.rows.removeAt(index);
				}
			});
		}

		/**
		 * Delete all rows from the table
		 */
		deleteAllRows(): void {
			this.rows.removeRange();
		}

		/**
		 * Insert a new column at a specific location
		 * @param index The index to insert the column at
		 * @param name The name of the column
		 */
		insertColumn(props: { index: number; name: string; hint?: string }): Column {
			const { index, name, hint } = props;
			const column = new Column({ id: crypto.randomUUID(), name, hint });
			this.columns.insertAt(index, column);
			return column;
		}

		/**
		 * Get a column by the id
		 * @param id The id of the column
		 */
		getColumn(id: string): Column {
			const column = this.columns.find((column) => column.id === id);
			if (column) return column;
			throw new Error("Column not found");
		}

		/**
		 * Delete a column header/object from the table
		 * DOES NOT DELETE THE CELLS IN THE ROWS
		 * @param column The column to delete
		 */
		removeColumn(column: Column): void {
			const index = this.columns.indexOf(column);
			// If the column is not in the table, do nothing
			if (index === -1) return;
			this.columns.removeAt(index);
		}
	}

	// Return the table schema
	return Table;
}
