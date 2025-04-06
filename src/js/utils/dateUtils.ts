import { SEASON_CODE } from "../types/constants";
import { ProcessedRow } from "../types/types";

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
  data: ProcessedRow[],
  predefined: string[]
): (keyof ProcessedRow)[] => {
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
