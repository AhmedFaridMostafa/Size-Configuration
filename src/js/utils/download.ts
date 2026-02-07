import { ProcessedColumn, ProcessedRow } from "../types";
import { showError } from "./helpers";
import {
  ExcelFileProcessor,
  ExcelFileConfig,
  ExcelSheetData,
} from "../class/Excel";

export interface ExportData {
  keys: (keyof ProcessedColumn)[] | (keyof ProcessedRow)[] | null;
  data: ProcessedColumn[] | ProcessedRow[] | null;
  name: string;
}

export class ExcelExporter {
  private data: ExportData[];
  private fileName: string;

  constructor(data: ExportData[], name: string | undefined) {
    this.data = data;
    this.fileName = this.generateFileName(name);
  }

  /**
   * Exports the processed data to an Excel file with multiple sheets
   */
  export(): void {
    if (!this.validateData()) return;
    try {
      const config = this.createExcelConfig();
      ExcelFileProcessor.createExcelFile(config);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showError(`Failed to export Excel file: ${errorMessage}`);
    }
  }

  /**
   * Validates that all required data is present
   * @returns boolean indicating if data is valid
   */
  private validateData(): boolean {
    for (const { data, keys } of this.data) {
      if (!data || !keys) {
        showError("There is no data to process");
        return false;
      }
      if (data.length === 0) {
        showError("No data available for export");
        return false;
      }
    }
    return true;
  }

  /**
   * Creates the Excel configuration object
   * @returns ExcelFileConfig object
   */
  private createExcelConfig(): ExcelFileConfig {
    const sheets: ExcelSheetData[] = [];

    // Add sheets for each data set
    this.data.forEach(({ data, keys, name }) => {
      if (data && keys && data.length > 0) {
        sheets.push({
          sheetData: this.createSheetData(data, keys),
          name: name,
        });
      }
    });

    return {
      sheets,
      fileName: this.fileName,
    };
  }

  /**
   * Creates sheet data from processed data and keys
   * @param data - Array of processed data objects
   * @param keys - Array of keys to extract from each object
   * @returns 2D array representing the sheet data
   */
  private createSheetData(
    data: ProcessedColumn[] | ProcessedRow[],
    keys: (keyof ProcessedColumn)[] | (keyof ProcessedRow)[]
  ): unknown[][] {
    return [
      keys,
      ...data.map((row) =>
        keys.map((key) => row[key as keyof typeof row] ?? "")
      ),
    ];
  }

  /**
   * Generates the filename for the Excel file
   * @returns string filename
   */
  private generateFileName(name: string | undefined): string {
    const baseName = name?.split(".")[0] ?? "Default";
    return `${baseName}_Size`;
  }
}

/**
 * Legacy function for backward compatibility
 * @param data - Array of ExportData objects containing all necessary data
 * @param fileName - Name of the file to export
 */
export function exportToExcel(
  data: ExportData[],
  fileName: string | undefined
): void {
  const exporter = new ExcelExporter(data, fileName);
  exporter.export();
}
