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
}

export interface ProcessedRow extends ExcelRow {
  Gander?: "BOYS" | "GIRLS" | "UN KNOW";
  colorCode?: string;
  RefCode?: string;
  LP?: string;
  ACCShipDate?: string;
  seasonCode?: string;
  desCountry?: string;
  Error?: string;
  orderingNumber?: number;
  bySize?: string;
  finalQTY?: number;
}

export interface TableData {
  data: ProcessedRow[];
  keys: (keyof ProcessedRow)[];
}
