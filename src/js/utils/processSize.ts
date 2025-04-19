import {
  SIZE_GROUP,
  HANGER_DATA,
  SizeCategoriesOrdering,
} from "../types/constants";

import {
  ExcelRow,
  HangerData,
  ProcessedColumn,
  ProcessedRow,
  Region,
  SizeCategories,
} from "../types/types";

import {
  createErrorColumn,
  determineSizeGroupRegion,
  formatHangerGroup,
  processBaseFields,
  processSizeData,
} from "./dateUtils";

export default function processSizeConfiguration(rows: ExcelRow[]): {
  generateColumns: ProcessedColumn[];
  generateRows: ProcessedRow[];
} {
  const generateColumns: ProcessedColumn[] = [];
  const generateRows: ProcessedRow[] = [];

  rows.forEach((row) => {
    // Process base fields common to all processing
    const baseFields = processBaseFields(row);

    // Process size data and check for errors
    const { sizeResult, packRatioSum, errors } = processSizeData(row);

    // Handle errors
    if (errors.length > 0) {
      generateColumns.push(
        createErrorColumn(row, baseFields, errors.join(" | "))
      );
      return; // Skip to next iteration
    }

    const poQty = Number(row["PO Qty"] || 0);

    // Calculate polybag quantities
    const polyIndividualQuantity = baseFields.polyBag.individual ? poQty : 0;
    const polyMasterQuantity = baseFields.polyBag.master
      ? Math.floor(poQty / packRatioSum)
      : 0;

    const region: Region | "" = determineSizeGroupRegion(
      String(row["Label Name"] || "")
    );
    const HangerOrFlat = String(row["Hang/Flat"]).trim() as "Hang" | "Flat";
    const gander = baseFields.gander.toLowerCase() as "boys" | "girls";

    const sizeGroupColumn = {} as Record<SizeCategories, string>;
    const HangerGroupColumn = {} as HangerData;

    Object.entries(sizeResult).forEach(([size, qty]) => {
      const sizeInfo = SIZE_GROUP[region][size] ||
        SIZE_GROUP.default[size] || { order: 0, boys: "", girls: "" };

      const sizeGroup =
        baseFields.gander !== "UN KNOW"
          ? (String(sizeInfo[gander]) as SizeCategories) || "unknown"
          : "unknown";

      if (sizeGroup !== "unknown") {
        sizeGroupColumn[sizeGroup] = sizeGroupColumn[sizeGroup]
          ? `${sizeGroupColumn[sizeGroup]} - ${size}`
          : size;
      }
      // Determine hanger code if applicable
      const hangerInfo =
        sizeGroup !== "unknown" &&
        HangerOrFlat === "Hang" &&
        HANGER_DATA[row["Account"]];

      if (hangerInfo && !HangerGroupColumn[sizeGroup])
        HangerGroupColumn[sizeGroup] = hangerInfo[sizeGroup];

      const refsz = `${baseFields.refCode}-${size}-${baseFields.zodeCode}`;

      // Create the processed row
      generateRows.push({
        ...row,
        "Ordering Number": sizeInfo.order,
        "By Size": size,
        "Final QTY": qty,
        "individual Polybag": baseFields.polyBag.individual,
        "master Polybag": baseFields.polyBag.master,
        Gander: baseFields.gander,
        "color Code": baseFields.colorCode,
        RefCode: baseFields.refCode,
        LP: baseFields.lp,
        "Hanger Code Top": hangerInfo ? hangerInfo[sizeGroup].top : "",
        "Hanger Code Button": hangerInfo ? hangerInfo[sizeGroup].bottom : "",
        "ACC ShipDate": baseFields.accShipDate,
        "Season Code": baseFields.seasonCode,
        "Size Group Ordering":
          sizeGroup !== "unknown"
            ? SizeCategoriesOrdering[sizeGroup]
            : "unknown",
        "Size Group": sizeGroup,
        "Sum Ratio": packRatioSum,
        "Des Country": baseFields.desCountry,
        "Zode Code": baseFields.zodeCode,
        "REF-C-S-D": refsz,
      });
    });

    // Add column summary
    generateColumns.push({
      ...row,
      ...sizeResult,
      Gander: baseFields.gander,
      "color Code": baseFields.colorCode,
      RefCode: baseFields.refCode,
      LP: baseFields.lp,
      "ACC ShipDate": baseFields.accShipDate,
      "Season Code": baseFields.seasonCode,
      "Des Country": baseFields.desCountry,
      "Zode Code": baseFields.zodeCode,
      "individual Polybag": baseFields.polyBag.individual,
      "master Polybag": baseFields.polyBag.master,
      "Individual Polybag Quantity": polyIndividualQuantity,
      "Master Polybag Quantity": polyMasterQuantity,
      "Sum Ratio": packRatioSum,
      "Size Group": Object.keys(sizeGroupColumn).join("  |  "),
      "Hanger Group": formatHangerGroup(HangerGroupColumn),
    });
  });

  return {
    generateColumns,
    generateRows,
  };
}
