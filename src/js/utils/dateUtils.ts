import {
  COUNTRY_MAPPING,
  LABEL_ZODE_MAP,
  POLY_BAG,
  SEASON_CODE,
} from "../types/constants";
import {
  ExcelRow,
  HangerData,
  ProcessedColumn,
  ProcessedRow,
  Region,
} from "../types/types";

export function generateACCShipDate(originalDate: string): string {
  const date = new Date(originalDate);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const yearCode = (date.getFullYear() % 100) * 2;
  return `${month}${yearCode.toString().padStart(2, "0")}`;
}

export function generateSeasonCode(season: string, year: string): string {
  const date = new Date(year);
  const yearCode = date.getFullYear() % 100;
  return `${SEASON_CODE[season]}${yearCode}`;
}

export const getOrderedKeys = (
  data: ProcessedRow[] | ProcessedColumn[],
  predefined: string[]
): (keyof ProcessedRow)[] | (keyof ProcessedColumn)[] => {
  const seen = new Set(predefined);
  const extraKeys: string[] = [];

  // Collect extra keys preserving first occurrence order
  data.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        extraKeys.push(key);
      }
    });
  });

  return [...predefined.filter((k) => seen.has(k)), ...extraKeys];
};

function determineGender(refValue: string): "BOYS" | "GIRLS" | "UN KNOW" {
  const firstChart = refValue
    ? refValue.split("-")[0]?.slice(-1).toUpperCase()
    : undefined;

  return firstChart === "B" ? "BOYS" : firstChart === "G" ? "GIRLS" : "UN KNOW";
}

export const processBaseFields = (
  row: ExcelRow
): {
  gander: "BOYS" | "GIRLS" | "UN KNOW";
  colorCode: string;
  refCode: string;
  lp: string;
  accShipDate: string;
  seasonCode: string;
  desCountry: string;
  zodeCode: string;
  polyBag: { individual: boolean; master: boolean };
  fullYear: string;
  styleColor: string;
} => {
  // Ensure all required fields exist and have values
  const account = String(row.Account || "").trim();
  const labelName = String(row["Label Name"] || "").trim();
  const refValue = String(row["Ref#"] || "").trim();
  const color = String(row.Color || "").trim();
  const fashionColor = String(row["Fashion Color"] || "").trim();
  const style = String(row.Style || "").trim();
  const label = String(row.Label || "").trim();
  const originalETD = String(row["Original ETD"] || "").trim();
  const season = String(row.Season || "")
    .trim()
    .toUpperCase();
  const year = String(row.Year || "").trim();
  const gander = determineGender(refValue);
  const colorCode = `${color}-${fashionColor}`;
  const refCode = `${refValue}-${color}`;
  const lp = `${style}-${color}-${label}`;
  const fullYear = `${season}${year}`;
  const accShipDate = generateACCShipDate(originalETD);
  const seasonCode = generateSeasonCode(season, year);
  const lpDes = `${account}-${label}`;
  const polyBag = POLY_BAG[labelName] || POLY_BAG.DEFAULT!;
  const desCountry = COUNTRY_MAPPING[lpDes] || "unknown";
  const zodeCode = labelName.length
    ? LABEL_ZODE_MAP[labelName] || "unknown"
    : "US";

  return {
    gander,
    colorCode,
    refCode,
    fullYear,
    lp,
    accShipDate,
    seasonCode,
    desCountry,
    zodeCode,
    polyBag,
    styleColor: `${style}-${color}`,
  };
};

export const processSizeData = (
  row: ExcelRow
): {
  sizeResult: Record<string, number>;
  packRatioSum: number;
  errors: string[];
} => {
  const requiredFields = [
    "Account",
    "Ref#",
    "Color",
    "Fashion Color",
    "Original ETD",
    "Season",
    "Year",
    "Size Configuration",
    "Pack Ratio",
    "Master Box Quantity",
  ];

  // Check for all required fields
  const missingFields = requiredFields.filter((field) => {
    const value = row[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missingFields.length > 0) {
    return {
      sizeResult: {},
      packRatioSum: 0,
      errors: [`Missing required fields: ${missingFields.join(", ")}`],
    };
  }

  const sizeConfiguration = String(row["Size Configuration"])
    .trim()
    .split("-")
    .map((size) => size.toUpperCase().trim());

  let packRatio = String(row["Pack Ratio"])
    .trim()
    .split("-")
    .map((ratio) => Number(ratio));

  const poQty = Number(row["PO Qty"] || 0);
  const masterBoxQuantity = Number(row["Master Box Quantity"]);
  const packRatioSum = packRatio.reduce((sum, ratio) => sum + ratio, 0);

  const errors: string[] = [];
  const fixedRatio =
    (document.getElementById("fixedRatio") as HTMLInputElement)?.checked ||
    false;

  // Validate and adjust if needed
  if (packRatioSum !== masterBoxQuantity) {
    if (fixedRatio) {
      // Adjust ratios if fixedRatio is true
      const scaleFactor = Math.floor(masterBoxQuantity / packRatioSum);
      packRatio = packRatio.map((ratio) => scaleFactor * ratio);
    } else {
      errors.push("Sum Ratio does not equal master box quantity.");
    }
  }

  if (sizeConfiguration.length !== packRatio.length) {
    errors.push("Size configuration length does not equal pack ratio length.");
  }

  if (errors.length > 0) {
    return { sizeResult: {}, packRatioSum, errors };
  }

  // Calculate quantities for each size
  const sizeResult = sizeConfiguration.reduce<Record<string, number>>(
    (result, size, index) => {
      result[size] = (packRatio[index]! * poQty) / masterBoxQuantity;
      return result;
    },
    {}
  );

  return { sizeResult, packRatioSum, errors: [] };
};

export const createErrorColumn = (
  row: ExcelRow,
  baseFields: ReturnType<typeof processBaseFields>,
  error: string
): ProcessedColumn => {
  return {
    ...row,
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
    "Individual Polybag Quantity": 0,
    "Master Polybag Quantity": 0,
    Error: error,
  };
};

export const determineSizeGroupRegion = (labelName: string): Region => {
  if (/walmart/i.test(labelName)) return "walmart";
  if (/target/i.test(labelName)) return "target";
  if (/europe/i.test(labelName)) return "EU";
  return "US";
};

export const formatHangerGroup = (hangerGroupColumn: HangerData): string => {
  return Object.entries(hangerGroupColumn)
    .map(([group, { top, bottom }]) => {
      return `(${group}:- ( Top:(${top}) - Bottom:(${bottom}) )`;
    })
    .join(" - ");
};
