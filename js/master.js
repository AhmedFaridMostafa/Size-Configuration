document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formFileSize");
  const downloadSheet = document.getElementById("downloadSheet");
  const loading = document.getElementById("loadingFile");
  const tableContainer = document.getElementById("table-container");
  const buttonContainer = document.getElementById("buttonsCollapse");
  let excelColumns;
  let excelRows;

  form.addEventListener("submit", handleFormSubmit);
  downloadSheet.addEventListener("click", exportToExcel);

  async function handleFormSubmit(event) {
    event.preventDefault();
    const fileSize = document.getElementById("fileSize");
    const file = fileSize.files[0];

    if (!file) {
      alert("Please select a file");
      return;
    }

    try {
      loading.classList.replace("d-none", "d-flex");
      tableContainer.innerHTML = "";
      buttonContainer.innerHTML = "";
      window.localStorage.clear();

      const data = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonWithHeaders = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });
      const headers = jsonWithHeaders[0];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length <= 0) {
        alert("No data found in the file");
        return;
      }

      const { generateColumns, generateRows } = processSizeConfiguration(
        json,
        headers
      );
      renderTable(generateColumns);
      renderTable(generateRows);

      excelColumns = generateColumns;
      excelRows = generateRows;
    } catch (error) {
      console.error("Error processing file:", error);
      alert("An error occurred while processing the file");
    } finally {
      loading.classList.replace("d-flex", "d-none");
    }
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function processSizeConfiguration(json, headers) {
    const generateRows = [];
    const generateColumns = [];

    json.forEach((row) => {
      if (
        !row["Size Configuration"] ||
        !row["Pack Ratio"] ||
        !row["Master Box Quantity"]
      ) {
        generateColumns.push({ ...row, Error: "Missing required fields" });
        return;
      }

      const sizeConfiguration = row["Size Configuration"]
        .toString()
        .split("-")
        .map((size) => size.trim());
      const packRatio = row["Pack Ratio"].toString().split("-").map(Number);
      const masterBoxQuantity = Number(row["Master Box Quantity"]);
      const hasErrorInRatio =
        packRatio.reduce((prev, curr) => prev + curr, 0) !== masterBoxQuantity;
      const hasErrorInConfiguration =
        sizeConfiguration.length !== packRatio.length;

      if (hasErrorInRatio || hasErrorInConfiguration) {
        const errors = [];
        if (hasErrorInRatio)
          errors.push("Pack ratio does not equal master box quantity.");
        if (hasErrorInConfiguration)
          errors.push(
            "Size configuration length does not equal pack ratio length."
          );
        generateColumns.push({ ...row, Error: errors.join("----") });
        return;
      }

      const result = sizeConfiguration.reduce((acc, size, index) => {
        acc[size] =
          (packRatio[index] * Number(row["PO Qty"])) / masterBoxQuantity;
        return acc;
      }, {});

      Object.entries(result).forEach(([size, qty]) => {
        const separateSize = {
          orderingNumber: getSizeOrder(size),
          bySize: size,
          finalQTY: qty,
        };
        generateRows.push({ ...row, ...separateSize });
      });

      generateColumns.push({ ...row, ...result });
    });

    const allKeysSet = new Set();
    let hasError = false;
    generateColumns.forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        if (key === "Error") return (hasError = true);
        allKeysSet.add(key);
      });
    });

    const allKeysOfColumns = headers.concat(
      Array.from(allKeysSet).filter((key) => !headers.includes(key))
    );
    if (hasError) allKeysOfColumns.push("Error");

    const allKeysOfRows = [...headers, "orderingNumber", "bySize", "finalQTY"];
    return {
      generateColumns: { data: generateColumns, keys: allKeysOfColumns },
      generateRows: { data: generateRows, keys: allKeysOfRows },
    };
  }

  function getSizeOrder(size) {
    const sizeData = {
      "3M": 1,
      "6M": 2,
      "9M": 3,
      "12M": 4,
      "18M": 5,
      "24M": 6,
      "36M": 7,
      "2T": 9,
      "3T": 10,
      "4T": 11,
      4: 12,
      5: 13,
      6: 14,
      "6X": 15,
      7: 16,
      "7X": 17,
      "4/5": 18,
      "5/6": 19,
      "6/6X": 20,
      "6/7": 21,
      "7/8": 22,
      8: 23,
      "10/12": 24,
      "14/16": 25,
      18: 26,
      "18/20": 27,
      S: 28,
      M: 29,
      L: 30,
      XL: 31,
      "2A": 32,
      "3A": 33,
      "4A": 34,
      "5A": 35,
      "6A": 36,
      "8A": 37,
      "10A": 38,
      "12A": 39,
      "14A": 40,
      "16A": 41,
    };
    return sizeData[size];
  }

  function renderTable({ data, keys }) {
    const uniqueId = Date.now().toString();
    const button = `
      <button
        class="btn btn-dark fs-5 collapsed"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#${uniqueId}"
        aria-expanded="false"
        aria-controls="${uniqueId}"
      >
        Sheet ${buttonContainer.children.length + 1}
      </button>`;
    buttonContainer.innerHTML += button;

    const table = document.createElement("table");
    const tableHead = document.createElement("thead");
    const tableBody = document.createElement("tbody");
    table.id = uniqueId;
    table.classList.add(
      "table",
      "table-bordered",
      "table-dark",
      "table-hover",
      "table-striped",
      "text-center",
      "text-nowrap",
      "collapse"
    );
    tableHead.classList.add("position-sticky", "top-0");

    const headRow = document.createElement("tr");
    keys.forEach((key) => {
      const th = document.createElement("th");
      th.textContent = key;
      headRow.appendChild(th);
    });
    tableHead.appendChild(headRow);

    const fragment = document.createDocumentFragment();
    data.forEach((row) => {
      const bodyRow = document.createElement("tr");
      keys.forEach((key) => {
        const td = document.createElement("td");
        td.textContent = row[key];
        bodyRow.appendChild(td);
      });
      fragment.appendChild(bodyRow);
    });
    tableBody.appendChild(fragment);
    table.appendChild(tableHead);
    table.appendChild(tableBody);
    tableContainer.appendChild(table);
  }

  function exportToExcel() {
    if (!excelColumns || !excelRows) {
      alert("There is no data to process");
      return;
    }
    const columnsData = [excelColumns.keys].concat(
      excelColumns.data.map((row) => excelColumns.keys.map((key) => row[key]))
    );
    const rowsData = [excelRows.keys].concat(
      excelRows.data.map((row) => excelRows.keys.map((key) => row[key]))
    );

    const wsColumns = XLSX.utils.aoa_to_sheet(columnsData);
    const wsRows = XLSX.utils.aoa_to_sheet(rowsData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsColumns, "ColumnsData");
    XLSX.utils.book_append_sheet(wb, wsRows, "RowsData");

    XLSX.writeFile(wb, "SizeConfiguration.xlsx");
  }
});
