import { TableData } from "../types/types";
import {
  AllCommunityModule,
  ColDef,
  GridOptions,
  ModuleRegistry,
  createGrid,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);
export function renderTable({ data, keys }: TableData): void {
  const tableContainer = document.getElementById("table-container")!;
  tableContainer.innerHTML = "";
  const columnDefs: ColDef[] = keys.map((key) => ({
    field: key as string,
    sortable: true,
    filter: true,
    resizable: true,
  }));

  const gridOptions: GridOptions = {
    theme: "legacy",
    columnDefs,
    rowData: data,
    pagination: true,
    paginationPageSize: 20,
    domLayout: "autoHeight",
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
  };
  createGrid(tableContainer, gridOptions);
}
