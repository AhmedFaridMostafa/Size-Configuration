import * as XLSX from "xlsx";

export async function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: true, // Parse dates correctly
        cellNF: false, // Don't parse number formats
        cellStyles: false, // Skip cell styles for faster parsing
      });
      if (workbook.SheetNames.length === 0) {
        reject(new Error("No sheets found in the file"));
        return;
      }
      const sheet = workbook.Sheets["lpo"] || workbook.Sheets["LPO"];
      if (!sheet) {
        reject(new Error("Sheet 'lpo' not found in the file"));
        return;
      }
      const range = XLSX.utils.decode_range(sheet["!ref"]!);
      range.e.r = range.s.r;
      const rawHeader = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range,
      })[0] as string[];
      const cleanedHeader = rawHeader.map((h: string) => h.trim());
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: cleanedHeader,
        range: 1,
      });
      resolve(jsonData);
    };
    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsArrayBuffer(file);
  });
}
