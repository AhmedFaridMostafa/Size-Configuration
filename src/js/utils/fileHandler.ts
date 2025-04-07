import * as XLSX from "xlsx";

export async function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      if (workbook.SheetNames.length === 0) {
        reject("No sheets found in the file");
      }
      const sheetName = workbook.SheetNames[0]!;
      const sheet = workbook.Sheets[sheetName]!;
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      resolve(jsonData);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
