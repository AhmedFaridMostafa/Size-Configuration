export interface ExcelRow {
  [key: string]: unknown;
  "Ref#": string;
  Color: string;
  "Label Name": string;
  "Fashion Color": string;
  Style: string;
  Label: string;
  "Original ETD"?: string | Date;
  Season: string;
  Year: string | number;
  "Size Configuration": string;
  "Pack Ratio": string;
  "Master Box Quantity": string | number;
  "PO Qty": string | number;
  Account: string;
  "Hang/Flat": "Hang" | "Flat";
}

export interface ProcessedRow extends ExcelRow {
  Gander: "BOYS" | "GIRLS" | "UN KNOW";
  RefCode: string;
  LP: string;
  "individual Polybag": boolean;
  "master Polybag": boolean;
  "color Code": string;
  "ACC ShipDate": string;
  "Season Code": string;
  "Size Group": string | "unknown";
  "Sum Ratio": number;
  "Des Country": string | "unknown";
  "Zode Code": string;
  "REF-C-S-D": string;
  "Ordering Number": number;
  "By Size": string;
  "Final QTY": number;
  Error?: string;
}
export interface ProcessedColumn extends ExcelRow {
  Gander: "BOYS" | "GIRLS" | "UN KNOW";
  "color Code": string;
  RefCode: string;
  LP: string;
  "ACC ShipDate": string;
  "Season Code": string;
  "Des Country": string | "unknown";
  "individual Polybag": boolean;
  "master Polybag": boolean;
  "Individual Polybag Quantity": number;
  "Master Polybag Quantity": number;
  Error?: string;
}

export interface TableData {
  data: ProcessedRow[] | ProcessedColumn[];
  keys: (keyof ProcessedRow)[] | (keyof ProcessedColumn)[];
}

export type SizeCategories =
  | "Newborn"
  | "Infant"
  | "Toddler-(2T-4T)"
  | "Kids-(4-6X)"
  | "Kids-(4-7X)"
  | "Big-(7-16)"
  | "Big-(8-20)";

export type HangerData = {
  [key in SizeCategories]: { top: string; bottom: string };
};

export type Region = "US" | "target" | "walmart" | "EU" | "default";
export interface SizeInfo {
  order: number;
  boys: SizeCategories | "Kids-(2A-8A)" | "Big-(10A-12A)" | "";
  girls: SizeCategories | "Kids-(2A-8A)" | "Big-(10A-12A)" | "";
}
export type SizeMappings = {
  [region in Region]: {
    [sizeLabel: string]: SizeInfo;
  };
};
