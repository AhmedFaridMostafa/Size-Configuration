import {
  COUNTRY_MAPPING,
  LABEL_ZODE_MAP,
  POLY_BAG,
  SIZE_GROUP,
  SIZE_ORDER,
} from "../types/constants";
import { ProcessedRow } from "../types/types";
import { generateACCShipDate, generateSeasonCode } from "./dateUtils";

export default function processSizeConfiguration(rows: ProcessedRow[]): {
  generateColumns: ProcessedRow[];
  generateRows: ProcessedRow[];
} {
  const fixedRatio = document.getElementById("fixedRatio") as HTMLInputElement;
  const generateRows: ProcessedRow[] = [];
  const generateColumns: ProcessedRow[] = [];
  rows.forEach((row) => {
    const refValue = String(row["Ref#"]).trim();
    const firstChart = refValue
      ? refValue.split("-")[0].slice(-1).toUpperCase()
      : undefined;
    const Gander =
      firstChart === "B" ? "BOYS" : firstChart === "G" ? "GIRLS" : "UN KNOW";
    const colorCode = `${row["Color"]}-${row["Fashion Color"]}`;
    const RefCode = `${refValue}-${row["Color"]}`;
    const LP = `${row["Style"]}-${row["Color"]}-${row["Label"]}`;
    const ACCShipDate = generateACCShipDate(String(row["Original ETD"]).trim());
    const seasonCode = generateSeasonCode(
      String(row["Season"]).trim().toLowerCase(),
      String(row["Year"]).trim()
    );
    const LPDes = `${String(row["Account"]).trim()}-${String(
      row["Label"]
    ).trim()}`;
    const polyBag =
      POLY_BAG[String(row["Label Name"]).trim()] || POLY_BAG["DEFAULT"];
    const desCountry = COUNTRY_MAPPING[LPDes];
    const zodeCode = row["Label Name"].trim().length
      ? LABEL_ZODE_MAP[row["Label Name"]] || "Unknown"
      : "US";

    if (
      !row["Size Configuration"] ||
      !row["Pack Ratio"] ||
      !row["Master Box Quantity"]
    ) {
      generateColumns.push({
        ...row,
        ...polyBag,
        Gander,
        "color Code": colorCode,
        RefCode,
        LP,
        "ACC ShipDate": ACCShipDate,
        "Season Code": seasonCode,
        "Des Country": desCountry,
        "Zode Code": zodeCode,
        Error: "Missing required fields",
      });
      return;
    }

    // Process size configuration and pack ratio values
    const sizeConfiguration = row["Size Configuration"]
      .toString()
      .trim()
      .split("-")
      .map((size: string) => size.trim());

    let packRatio = row["Pack Ratio"].toString().trim().split("-").map(Number);
    const POQty = Number(row["PO Qty"]);
    const masterBoxQuantity = Number(row["Master Box Quantity"]);

    const packRatioSum = packRatio.reduce(
      (prev: number, curr: number) => prev + curr,
      0
    );
    const hasErrorInRatio = packRatioSum !== masterBoxQuantity;
    const hasErrorInConfiguration =
      sizeConfiguration.length !== packRatio.length;

    // Adjust ratios if fixedRatio is true
    if (hasErrorInRatio && fixedRatio.checked) {
      packRatio = packRatio.map(
        (ratio: number) => Math.floor(masterBoxQuantity / packRatioSum) * ratio
      );
    }

    // If error still exists, record errors in generateColumns
    if ((hasErrorInRatio && !fixedRatio.checked) || hasErrorInConfiguration) {
      const errors: string[] = [];
      if (hasErrorInRatio)
        errors.push("Sum Ratio does not equal master box quantity.");
      if (hasErrorInConfiguration)
        errors.push(
          "Size configuration length does not equal pack ratio length."
        );
      generateColumns.push({ ...row, Error: errors.join("----") });
      return;
    }

    // Calculate the result for each size
    const result = sizeConfiguration.reduce(
      (acc: Record<string, number>, size: string, index: number) => {
        acc[size] = (packRatio[index] * POQty) / masterBoxQuantity;
        return acc;
      },
      {}
    );
    const polyIndividualQuantity = polyBag.individual ? POQty : 0;
    const polyMasterQuantity = polyBag.master
      ? Math.floor(POQty / packRatioSum)
      : 0;
    // Create rows for each size with ordering details
    Object.entries(result).forEach(([size, qty]) => {
      const separateSize = {
        orderingNumber: SIZE_ORDER[String(size).toUpperCase()],
        bySize: size,
        finalQTY: qty,
      };
      const REFSZ = `${RefCode}-${size}-${zodeCode}`;
      const sizeGroup = SIZE_GROUP[`${row["Account"]}-${size}`] || "unknown";
      generateRows.push({
        ...row,
        ...separateSize,
        "individual Polybag": polyBag.individual,
        "master Polybag": polyBag.master,
        Gander,
        "color Code": colorCode,
        RefCode,
        LP,
        "ACC ShipDate": ACCShipDate,
        "Season Code": seasonCode,
        "Size Group": sizeGroup,
        "Sum Ratio": packRatioSum,
        "Des Country": desCountry,
        "Zode Code": zodeCode,
        "REF-C-S-D": REFSZ,
      });
    });

    // Append result object to generateColumns
    generateColumns.push({
      ...row,
      ...result,
      "individual Polybag": polyBag.individual,
      "master Polybag": polyBag.master,
      Gander,
      "color Code": colorCode,
      RefCode,
      LP,
      "ACC ShipDate": ACCShipDate,
      "Season Code": seasonCode,
      "Individual Polybag Quantity ": polyIndividualQuantity,
      "Master Polybag Quantity ": polyMasterQuantity,
      "Sum Ratio": packRatioSum,
      "Des Country": desCountry,
    });
  });
  return {
    generateColumns,
    generateRows,
  };
}
