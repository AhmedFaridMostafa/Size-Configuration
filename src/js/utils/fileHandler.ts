import { ExcelFileProcessor } from "../class/Excel";

export async function readExcelFile(file: File): Promise<any[]> {
  try {
    const result = await ExcelFileProcessor.readExcelFile(file);
    return result.data;
  } catch (error) {
    throw new Error(
      `Failed to read Excel file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
