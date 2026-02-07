export interface LPOData {
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

export interface ProcessedRow extends LPOData {
  Gander: "BOYS" | "GIRLS" | "unknown";
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
  "REF-C-S-D-FY": string;
  "Ordering Number": number;
  "By Size": string;
  "Final QTY": number;
  Error?: string;
}
export interface ProcessedColumn extends LPOData {
  Gander: "BOYS" | "GIRLS" | "unknown";
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
export interface SizeEntry {
  order: number;
  boys: SizeCategories | "Kids-(2A-8A)" | "Big-(10A-16A)" | "";
  girls: SizeCategories | "Kids-(2A-8A)" | "Big-(10A-16A)" | "";
}

export type SizeMap = Partial<Record<SizeKey, SizeEntry>>;

export type SizeMappings = Record<Region, SizeMap>;

export type SizeKey =
  | "3M"
  | "6M"
  | "9M"
  | "12M"
  | "18M"
  | "24M"
  | "36M"
  | "2T"
  | "3T"
  | "4T"
  | "4"
  | "5"
  | "6"
  | "6X"
  | "7"
  | "7X"
  | "4/5"
  | "5/6"
  | "6/6X"
  | "6/7"
  | "7/8"
  | "8"
  | "10/12"
  | "14/16"
  | "18"
  | "18/20"
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "2A"
  | "3A"
  | "4A"
  | "5A"
  | "6A"
  | "8A"
  | "10A"
  | "12A"
  | "14A"
  | "16A";

export type Gander = "boys" | "girls" | "unknown";
