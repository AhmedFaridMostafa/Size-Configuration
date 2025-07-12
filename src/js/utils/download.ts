import * as XLSX from "xlsx";
import { ProcessedColumn, ProcessedRow } from "../types/types";
import { showError } from "./helpers";

interface DownloadSheetProps {
  excelColumns: ProcessedColumn[] | null;
  excelRows: ProcessedRow[] | null;
  keyExcelColumns: (keyof ProcessedColumn)[] | null;
  keyExcelRows: (keyof ProcessedRow)[] | null;
  fileName: string | undefined;
}

export function exportToExcel({
  excelColumns,
  excelRows,
  keyExcelColumns,
  keyExcelRows,
  fileName,
}: DownloadSheetProps) {
  if (!excelColumns || !excelRows || !keyExcelColumns || !keyExcelRows) {
    showError("There is no data to process");
    return;
  }

  const columnsData = [
    keyExcelColumns,
    ...excelColumns.map((row) =>
      keyExcelColumns!.map((key) => row[key as keyof ProcessedRow] ?? "")
    ),
  ];

  const rowsData = [
    keyExcelRows,
    ...excelRows.map((row) =>
      keyExcelRows!.map((key) => row[key as keyof ProcessedRow] ?? "")
    ),
  ];

  // Create worksheets
  const wsColumns = XLSX.utils.aoa_to_sheet(columnsData);
  const wsRows = XLSX.utils.aoa_to_sheet(rowsData);

  // Create workbook and save
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsColumns, "LPO_Columns_Data");
  XLSX.utils.book_append_sheet(wb, wsRows, "LPO_Rows_Data");
  XLSX.writeFile(wb, `${fileName?.split(".")[0] ?? "Default"}_Size.xlsx`);
}
