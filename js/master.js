document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formFileSize");
  const downloadSheet = document.getElementById("downloadSheet");
  const table = document.getElementById("dataTable");
  const loading = document.getElementById("loadingFile");
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
      const data = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      if (json.length <= 0) return alert("No data found in the file");
      const [generateData, keys] = addPackRatioAppendOnSizeConfiguration(json);
      renderTable(generateData, keys);
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

  function addPackRatioAppendOnSizeConfiguration(json = []) {
    const generate = json.map((el) => {
      if (!el["Size Configuration"])
        return { ...el, Error: "Size Configuration is not defined" };
      if (!el["Pack Ratio"]) return { ...el, Error: "Pack Ratio" };
      if (!el["Master Box Quantity"]) return { ...el, Error: "Pack Ratio" };
      const sizeConfiguration = el["Size Configuration"]
        .toString()
        .split("-")
        .map((size) => size.trim());
      const packRatio = el["Pack Ratio"]
        .toString()
        .split("-")
        .map((size) => Number(size));
      const masterBoxQuantity = Number(el["Master Box Quantity"]);
      const isErrorRatio =
        packRatio.reduce((prev, curr) => prev + curr, 0) !== masterBoxQuantity;
      const isErrorConfiguration =
        sizeConfiguration.length !== packRatio.length;
      if (isErrorRatio)
        return { ...el, Error: "Pack Ratio not equal Master Box Quantity" };
      if (isErrorConfiguration)
        return { ...el, Error: "Size Configuration not equal Pack Ratio" };
      const result = sizeConfiguration.reduce((acc, size, index) => {
        acc[size] =
          (packRatio[index] * Number(el["PO Qty"])) / masterBoxQuantity;
        return acc;
      }, {});
      return { ...el, ...result };
    });

    const allKeysSet = new Set();
    let hasError = false;
    generate.forEach((obj) => {
      Object.keys(obj).forEach((key) =>
        key === "Error" ? (hasError = true) : allKeysSet.add(key)
      );
    });
    const allKeysArray = Array.from(allKeysSet);
    if (hasError) allKeysArray.push("Error");
    return [generate, allKeysArray];
  }

  function renderTable(data, keys) {
    const tableHead = document.getElementById("tableHead");
    const tableBody = document.getElementById("tableBody");
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

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
  }

  function exportToExcel() {
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "SizeConfiguration.xlsx");
  }
});
