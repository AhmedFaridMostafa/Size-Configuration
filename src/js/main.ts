// Import our custom CSS
import "../scss/styles.scss";
import { ProcessedRow } from "./types/types";
import { showError, toggleLoading } from "./utils/helpers";
import { readExcelFile } from "./utils/fileHandler";
import { renderTable } from "./components/table";
import { getOrderedKeys } from "./utils/dateUtils";
import { EXCEL_COLUMN_HEADERS, EXCEL_ROW_HEADERS } from "./types/constants";
import { exportToExcel } from "./utils/download";
import * as bootstrap from "bootstrap";
import processSizeConfiguration from "./utils/processSize";
// Initialize Bootstrap components
document.querySelectorAll(".dropdown-toggle").forEach((element) => {
  new bootstrap.Dropdown(element);
});
// DOM elements with proper type assertions
const form = document.getElementById("formFileSize")! as HTMLFormElement;
const fileInput = document.getElementById("fileSize") as HTMLInputElement;
const downloadSheet = document.getElementById(
  "downloadSheet"
)! as HTMLButtonElement;
const tableContainer = document.getElementById(
  "table-container"
)! as HTMLDivElement;

// Typed variables
let keyExcelColumns: (keyof ProcessedRow)[] | null = null;
let excelColumns: ProcessedRow[] | null = null;
let keyExcelRows: (keyof ProcessedRow)[] | null = null;
let excelRows: ProcessedRow[] | null = null;
let renderTableOrNot = false;
form.addEventListener("submit", handleFormSubmit);

downloadSheet.addEventListener("click", () =>
  exportToExcel({
    excelColumns,
    excelRows,
    keyExcelColumns,
    keyExcelRows,
    fileName: fileInput.files?.[0]?.name,
  })
);

async function handleFormSubmit(event: SubmitEvent) {
  event.preventDefault();
  if (!fileInput.files?.length) {
    showError("Please select a file");
    return;
  }
  toggleLoading(true);
  tableContainer.innerHTML = "";
  try {
    const rows = await readExcelFile(fileInput.files[0]!);
    if (rows.length === 0) {
      showError("No data found in the file");
      return;
    }
    const processed = processSizeConfiguration(rows);
    keyExcelColumns = getOrderedKeys(
      processed.generateColumns,
      EXCEL_COLUMN_HEADERS
    );
    keyExcelRows = getOrderedKeys(processed.generateRows, EXCEL_ROW_HEADERS);
    document.getElementById("showTable")!.classList.remove("visually-hidden");
    excelColumns = processed.generateColumns;
    excelRows = processed.generateRows;
    renderTableOrNot = true;
  } catch (error) {
    console.error("Error processing file:", error);
    showError(
      `Processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    toggleLoading(false);
  }
}

document.querySelectorAll("#showTable .dropdown-item").forEach((item) => {
  item.addEventListener("click", (event) => {
    if (!renderTableOrNot) {
      showError("Please process the file first.");
      return;
    }
    const target = event.target as HTMLElement;
    const selectedValue = target.dataset.value;
    console.log("Selected value:", selectedValue);
    if (selectedValue === "columns") {
      renderTable({
        keys: keyExcelColumns!,
        data: excelColumns!,
      });
    } else if (selectedValue === "rows") {
      renderTable({
        keys: keyExcelRows!,
        data: excelRows!,
      });
    }
  });
});
