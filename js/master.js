document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formFileSize");
  const downloadSheet = document.getElementById("downloadSheet");
  const loading = document.getElementById("loadingFile");
  const tableContainer = document.getElementById("table-container");
  const buttonContainer = document.getElementById("buttonsCollapse");

  let fixedRatio;
  let excelColumns;
  let excelRows;

  form.addEventListener("submit", handleFormSubmit);
  downloadSheet.addEventListener("click", exportToExcel);

  async function handleFormSubmit(event) {
    event.preventDefault();
    fixedRatio = document.getElementById("fixedRatio")?.checked ?? false;
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
      const firstChart = row["Ref#"]
        ?.toString()
        .split("-")[0]
        .at(-1)
        .toUpperCase();
      const Gander =
        firstChart === "B" ? "BOYS" : firstChart === "G" ? "GIRLS" : "UN KNOW";
      const colorCode = `${row["Color"]}-${row["Fashion Color"]}`;
      const RefCode = `${row["Ref#"]}-${row["Color"]}`;
      const LP = `${row["Style"]}-${row["Color"]}-${row["Label"]}`;
      const ACCShipDate = generateACCShipDate(
        row["Original ETD"].toString().trim()
      );
      const seasonCode = generateSeasonCode(row["Season"], row["Year"]);
      const LPDes = `${String(row["Account"]).trim()}-${String(
        row["Label"]
      ).trim()}`;
      const desCountry = generateDesCountry(LPDes);
      if (
        !row["Size Configuration"] ||
        !row["Pack Ratio"] ||
        !row["Master Box Quantity"]
      ) {
        generateColumns.push({
          ...row,
          Gander,
          colorCode,
          RefCode,
          LP,
          ACCShipDate,
          seasonCode,
          desCountry,
          Error: "Missing required fields",
        });
        return;
      }
      const sizeConfiguration = row["Size Configuration"]
        .toString()
        .split("-")
        .map((size) => size.trim());
      let packRatio = row["Pack Ratio"].toString().split("-").map(Number);
      const masterBoxQuantity = Number(row["Master Box Quantity"]);
      const packRatioSum = packRatio.reduce((prev, curr) => prev + curr, 0);
      const hasErrorInRatio = packRatioSum !== masterBoxQuantity;
      const hasErrorInConfiguration =
        sizeConfiguration.length !== packRatio.length;
      if (hasErrorInRatio && fixedRatio) {
        packRatio = packRatio.map((ratio) => {
          const newRatio = Math.floor(masterBoxQuantity / packRatioSum);
          return newRatio * ratio;
        });
      }
      if ((hasErrorInRatio && !fixedRatio) || hasErrorInConfiguration) {
        const errors = [];
        if (hasErrorInRatio) {
          errors.push("Pack ratio sum does not equal master box quantity.");
        }
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
          orderingNumber: getSizeOrder(String(size).toUpperCase()),
          bySize: size,
          finalQTY: qty,
        };
        generateRows.push({
          ...row,
          ...separateSize,
          Gander,
          colorCode,
          RefCode,
          LP,
          ACCShipDate,
          seasonCode,
          desCountry,
        });
      });

      generateColumns.push({
        ...row,
        ...result,
        Gander,
        colorCode,
        RefCode,
        LP,
        ACCShipDate,
        seasonCode,
        desCountry,
      });
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

    const allKeysOfRows = [
      ...headers,
      "Gander",
      "colorCode",
      "RefCode",
      "LP",
      "ACCShipDate",
      "seasonCode",
      "desCountry",
      "orderingNumber",
      "bySize",
      "finalQTY",
    ];

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
      XS: 28,
      S: 29,
      M: 30,
      L: 31,
      XL: 32,
      "2A": 33,
      "3A": 34,
      "4A": 35,
      "5A": 36,
      "6A": 37,
      "8A": 38,
      "10A": 39,
      "12A": 40,
      "14A": 41,
      "16A": 42,
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

  function generateACCShipDate(OriginalDate) {
    const date = new Date(OriginalDate);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const yearCode = (parseInt(date.getFullYear()) % 100) * 2;
    return `${month}${yearCode.toString().padStart(2, "0")}`;
  }

  function generateSeasonCode(season, year) {
    const date = new Date(year);
    const yearCode = parseInt(date.getFullYear()) % 100;
    const seasonCode = {
      s: 1,
      m: 2,
      f: 3,
      h: 4,
    };
    return `${seasonCode[season.toLowerCase()]}${yearCode}`;
  }

  function generateDesCountry(LPDes) {
    const data = {
      "A109M-AC": "USA-Stock",
      "A109M-AD": "USA-Stock",
      "A109M-AH": "USA-Stock",
      "A109M-AM": "USA-Stock",
      "A109M-AN": "USA-Stock",
      "A311M-X0": "Global-India",
      "A313M-QO": "Global-Dubai",
      "A746M-AL": "Global-Israel",
      "C104M-G0": "Global-Thailand",
      "C104M-G8": "Global-Thailand",
      "C104M-G9": "Global-Thailand",
      "C104M-H0": "Global-Thailand",
      "D528M-DS": "USA-Stock",
      "D552M-DL": "USA-Stock",
      "H040M-": "USA-Stock",
      "H040M-EC": "USA-Stock",
      "H040M-ED": "USA-Stock",
      "H040M-EE": "USA-Stock",
      "H040M-EJ": "USA-Stock",
      "H040M-EM": "USA-Stock",
      "H040M-EN": "USA-Stock",
      "H040M-IP": "USA-Stock",
      "H040M-NH": "USA-Stock",
      "H040M-P2": "USA-Stock",
      "H040M-WH": "USA-Stock",
      "H494M-L5": "Global-EUROPE",
      "H494M-LQ": "Global-EUROPE",
      "H494M-LR": "Global-EUROPE",
      "H494M-LV": "Global-EUROPE",
      "H494M-LW": "Global-EUROPE",
      "H494M-LY": "Global-EUROPE",
      "H494M-LZ": "Global-EUROPE",
      "H718M-KL": "Global-Korea",
      "H718M-KM": "Global-Korea",
      "H718M-KS": "Global-Korea",
      "H718M-KX": "Global-Korea",
      "I201M-KO": "Global-Mexico",
      "I201M-MH": "Global-Mexico",
      "I201M-MK": "Global-Mexico",
      "I201M-MO": "Global-Mexico",
      "I201M-MV": "Global-Mexico",
      "I644M-IA": "Global-Panama",
      "I644M-NL": "Global-Panama",
      "I867M-XL": "Global-Chile",
      "I952M-O9": "Global-Peru",
      "J121M-JC": "USA-Stock",
      "K812M-KO": "USA-Stock",
      "K816M-1Z": "USA-Stock",
      "K816M-2Z": "USA-Stock",
      "K816M-3Z": "USA-Stock",
      "K816M-4Z": "USA-Stock",
      "K816M-EK": "USA-Stock",
      "K816M-H6": "USA-Stock",
      "K816M-Z5": "USA-Stock",
      "K816M-Z7": "USA-Stock",
      "L004M-2X": "Costco Australia",
      "S068M-EY": "USA-SAM'S",
      "S068M-EZ": "USA-SAM'S",
      "S068M-SM": "USA-SAM'S",
      "S068M-SQ": "USA-SAM'S",
      "S068M-SU": "USA-SAM'S",
      "S960M-F5": "Global-Malaysia",
      "S974M-SY": "Global-South Africa",
      "T059M-TZ": "USA-Target",
      "T082M-DE": "USA-Target",
      "T082M-DF": "USA-Target",
      "T082M-DH": "USA-Target",
      "T082M-DM": "USA-Target",
      "T082M-EI": "USA-Target",
      "T082M-EL": "USA-Target",
      "T082M-EO": "USA-Target",
      "T082M-FO": "USA-Target",
      "T082M-GA": "USA-Target",
      "T082M-GC": "USA-Target",
      "T082M-GD": "USA-Target",
      "T082M-GE": "USA-Target",
      "T082M-GF": "USA-Target",
      "W098M-0W": "USA-WALMART",
      "W098M-W1": "USA-WALMART",
      "W098M-W2": "USA-WALMART",
      "W098M-W3": "USA-WALMART",
      "W098M-WM": "USA-WALMART",
      "W098M-WQ": "USA-WALMART",
      "W098M-WR": "USA-WALMART",
      "W113M-HA": "USA-WALMART",
      "W113M-HC": "USA-WALMART",
      "W113M-HD": "USA-WALMART",
      "W113M-HE": "USA-WALMART",
      "W113M-HF": "USA-WALMART",
      "W113M-HH": "USA-WALMART",
      "W113M-HI": "USA-WALMART",
      "W113M-HJ": "USA-WALMART",
      "W113M-HK": "USA-WALMART",
      "W113M-HL": "USA-WALMART",
      "W113M-HN": "USA-WALMART",
      "W113M-HO": "USA-WALMART",
      "W113M-HP": "USA-WALMART",
      "W113M-HR": "USA-WALMART",
      "W846M-CN": "Global-Canada STOCK",
      "W846M-FZ": "Global-CANADA FGL SPORTS",
      "W846M-WN": "Global-CANADA WINNERS",
      "W847M-WO": "USA-WALMART",
      "Z090M-SV": "Global-Panama ZafariI",
    };
    return data[LPDes];
  }
});
