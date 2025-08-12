import * as XLSX from "xlsx";

// Interfaces for better type safety
export interface ExcelSheetData {
  sheetData: unknown[][];
  name: string;
}

export interface ExcelFileConfig {
  sheets: ExcelSheetData[];
  fileName: string;
}

export interface ExcelReadResult {
  data: Record<string, unknown>[];
  headers: string[];
}

export class ExcelFileProcessor {
  /**
   * Reads an Excel file and extracts data from the 'lpo' sheet
   * @param excelFile - The Excel file to read
   * @returns Promise containing the parsed data and headers
   */
  static async readExcelFile(excelFile: File): Promise<ExcelReadResult> {
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = this.createWorkbook(data);
      const sheet = this.getLpoSheet(workbook);
      const headers = this.extractHeaders(sheet);
      const jsonData = this.convertSheetToJson(sheet, headers);
      return {
        data: jsonData,
        headers: headers,
      };
    } catch (error) {
      throw new Error(
        `Failed to read Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Creates an Excel file with multiple sheets
   * @param config - Configuration object containing sheets and filename
   */
  static createExcelFile(config: ExcelFileConfig): void {
    try {
      const workbook = XLSX.utils.book_new();

      config.sheets.forEach(({ sheetData, name }) => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      });

      XLSX.writeFile(workbook, `${config.fileName}.xlsx`);
    } catch (error) {
      throw new Error(
        `Failed to create Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Creates a workbook from array buffer data
   * @param data - Array buffer containing Excel file data
   * @returns XLSX workbook object
   */
  private static createWorkbook(data: ArrayBuffer): XLSX.WorkBook {
    return XLSX.read(data, {
      type: "array",
      cellDates: true,
      cellNF: false,
      cellStyles: false,
    });
  }

  /**
   * Extracts the 'lpo' sheet from the workbook
   * @param workbook - XLSX workbook object
   * @returns XLSX worksheet object
   */
  private static getLpoSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    if (workbook.SheetNames.length === 0) {
      throw new Error("No sheets found in the file");
    }

    const sheet = workbook.Sheets["lpo"] || workbook.Sheets["LPO"];
    if (!sheet) {
      throw new Error("Sheet 'lpo' not found in the file");
    }

    return sheet;
  }

  /**
   * Extracts and cleans headers from the worksheet
   * @param sheet - XLSX worksheet object
   * @returns Array of cleaned header strings
   */
  private static extractHeaders(sheet: XLSX.WorkSheet): string[] {
    const range = XLSX.utils.decode_range(sheet["!ref"]!);
    range.e.r = range.s.r;

    const rawHeader = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range,
    })[0] as string[];

    return rawHeader.map((header: string) => header.trim());
  }

  /**
   * Converts worksheet data to JSON format
   * @param sheet - XLSX worksheet object
   * @param headers - Array of header strings
   * @returns Array of objects representing the sheet data
   */
  private static convertSheetToJson(
    sheet: XLSX.WorkSheet,
    headers: string[]
  ): Record<string, unknown>[] {
    return XLSX.utils.sheet_to_json(sheet, {
      header: headers,
      range: 1,
    });
  }
}
