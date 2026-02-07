import {
  COUNTRY_MAPPING,
  HANGER_DATA,
  LABEL_ZODE_MAP,
  POLY_BAG,
  SEASON_CODE,
  SEASON_NAME,
  SIZE_GROUP,
  SizeCategoriesOrdering,
} from "../constants";
import {
  Gander,
  LPOData,
  ProcessedColumn,
  ProcessedRow,
  Region,
  SizeCategories,
  SizeKey,
  HangerData,
  SizeEntry,
} from "../types";

/**
 * Result of base field processing
 */
interface BaseFieldsResult {
  refValue: string;
  labelName: string;
  gander: Gander;
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
  seasonName: string;
  SCCDFY: string;
  account: string;
}

/**
 * Result of size data processing
 */
interface SizeProcessResult {
  sizeResult: Record<SizeKey, number>;
  packRatioSum: number;
  masterBoxQuantity: number;
  poQty: number;
  errors: string[];
}

/**
 * Result of carton calculations
 */
interface CartonResult {
  fullCartons: number;
  shortage: number;
  totalCartonsNeeded: number;
}

/**
 * Size group processing result
 */
interface SizeGroupResult {
  sizeGroupColumn: Record<SizeCategories, string>;
  hangerGroupColumn: HangerData;
  sizeInfoMap: Map<
    SizeKey,
    { sizeInfo: SizeEntry; sizeGroup: SizeCategories | "unknown" }
  >;
}

/**
 * Main class for processing LPO (Local Purchase Order) data
 * Handles the transformation of raw Excel data into processed columns and rows
 */
export class LPOProcess {
  private readonly data: LPOData[];
  private readonly processedColumns: ProcessedColumn[] = [];
  private readonly processedRows: ProcessedRow[] = [];

  constructor(data: LPOData[]) {
    this.data = data;
  }

  /**
   * Main processing method that orchestrates the entire transformation
   */
  public processSizeConfiguration(): {
    generateColumns: ProcessedColumn[];
    generateRows: ProcessedRow[];
  } {
    this.validateData();
    this.processAllRows();

    return {
      generateColumns: [...this.processedColumns],
      generateRows: [...this.processedRows],
    };
  }

  /**
   * Validates the input data to ensure required fields are present
   */
  private validateData(): void {
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
      "PO Qty",
    ];

    const sampleIndices = this.getRandomSampleIndices();
    const missingFieldsSet = new Set<string>();

    sampleIndices.forEach((index) => {
      const row = this.data[index];
      if (!row) return;

      requiredFields.forEach((field) => {
        const value = row[field];
        if (this.isEmpty(value)) {
          missingFieldsSet.add(field);
        }
      });
    });

    if (missingFieldsSet.size > 0) {
      throw new Error(
        `Missing required fields: ${Array.from(missingFieldsSet).join(", ")}`
      );
    }
  }

  /**
   * Processes all rows in the dataset
   */
  private processAllRows(): void {
    this.data.forEach((row) => this.processRow(row));
  }

  /**
   * Processes a single row of data
   */
  private processRow(row: LPOData): void {
    const baseFields = this.processBaseFields(row);
    const sizeResult = this.processSizeData(row);

    if (sizeResult.errors.length > 0) {
      this.processedColumns.push(
        this.createErrorColumn(row, baseFields, sizeResult.errors.join(" | "))
      );
      return;
    }

    const cartonResult = this.calculateCartons(
      sizeResult.poQty,
      sizeResult.masterBoxQuantity
    );
    this.processValidRow(row, baseFields, sizeResult, cartonResult);
  }

  /**
   * Processes a valid row (without errors) and creates both column and row entries
   */
  private processValidRow(
    row: LPOData,
    baseFields: BaseFieldsResult,
    sizeResult: SizeProcessResult,
    cartonResult: CartonResult
  ): void {
    const region = this.determineRegion(
      baseFields.refValue,
      baseFields.labelName
    );
    const hangerOrFlat = this.getString(row["Hang/Flat"]) as "Hang" | "Flat";

    const polybagQuantities = this.calculatePolybagQuantities(
      baseFields.polyBag,
      sizeResult.poQty,
      sizeResult.packRatioSum
    );

    const sizeGroupData = this.processSizeGroups(
      sizeResult.sizeResult,
      region,
      baseFields.gander,
      baseFields.account,
      hangerOrFlat
    );

    this.createProcessedRows(row, baseFields, sizeResult, sizeGroupData);
    this.createProcessedColumn(
      row,
      baseFields,
      sizeResult,
      cartonResult,
      polybagQuantities,
      sizeGroupData
    );
  }

  /**
   * Processes base fields common to all rows
   */
  private processBaseFields(row: LPOData): BaseFieldsResult {
    const account = this.getString(row["Account"]);
    const labelName = this.getString(row["Label Name"]);
    const refValue = this.getString(row["Ref#"]);
    const color = this.getString(row["Color"]);
    const fashionColor = this.getString(row["Fashion Color"]);
    const style = this.getString(row["Style"]);
    const label = this.getString(row["Label"]);
    const originalETD = this.getString(row["Original ETD"]);
    const season = this.getString(row["Season"]).toUpperCase();
    const year = this.getString(row["Year"]);
    const gander = this.determineGender(refValue);
    const colorCode = `${color}-${fashionColor}`;
    const refCode = `${refValue}-${color}`;
    const lp = `${style}-${color}-${label}`;
    const fullYear = `${season}${year}`;
    const accShipDate = this.generateACCShipDate(originalETD);
    const seasonCode = this.generateSeasonCode(season, year);
    const seasonName = SEASON_NAME[season] || "unknown";
    const lpDes = `${account}-${label}`;
    const polyBag = POLY_BAG[labelName] || POLY_BAG.DEFAULT!;
    const desCountry = COUNTRY_MAPPING[lpDes] || "unknown";
    const zodeCode = labelName.length
      ? LABEL_ZODE_MAP[labelName] || "unknown"
      : "US";
    const styleColor = `${style}-${color}`;
    const SCCDFY = `${styleColor}-Carton-${zodeCode}-${fullYear}`;

    return {
      refValue,
      labelName,
      gander,
      colorCode,
      refCode,
      fullYear,
      lp,
      accShipDate,
      seasonCode,
      seasonName,
      desCountry,
      zodeCode,
      polyBag,
      styleColor,
      SCCDFY,
      account,
    };
  }

  /**
   * Processes size configuration and pack ratio data
   */
  private processSizeData(row: LPOData): SizeProcessResult {
    const sizeConfiguration = this.getString(row["Size Configuration"])
      .split("-")
      .map((size) => size.toUpperCase().trim()) as SizeKey[];

    let packRatio = this.getString(row["Pack Ratio"])
      .split("-")
      .map((ratio) => Number(ratio));

    const poQty = Number(row["Original PO Qty"]) || Number(row["PO Qty"]) || 0;
    const masterBoxQuantity = Number(row["Master Box Quantity"]) || 0;
    const packRatioSum = packRatio.reduce((sum, ratio) => sum + ratio, 0);

    const errors: string[] = [];

    // Always apply scaling when ratios don't match master box quantity
    if (packRatioSum !== masterBoxQuantity && packRatioSum > 0) {
      const scaleFactor = Math.floor(masterBoxQuantity / packRatioSum);
      packRatio = packRatio.map((ratio) => scaleFactor * ratio);
    }

    if (sizeConfiguration.length !== packRatio.length) {
      errors.push(
        "Size configuration length does not equal pack ratio length."
      );
    }

    if (errors.length > 0) {
      return {
        sizeResult: {} as Record<SizeKey, number>,
        packRatioSum,
        masterBoxQuantity,
        poQty,
        errors,
      };
    }

    // Calculate quantities for each size
    const sizeResult = sizeConfiguration.reduce<Record<SizeKey, number>>(
      (result, size, index) => {
        result[size] = Math.round(
          (packRatio[index]! * poQty) / masterBoxQuantity
        );
        return result;
      },
      {} as Record<SizeKey, number>
    );

    return { sizeResult, packRatioSum, masterBoxQuantity, poQty, errors: [] };
  }

  /**
   * Processes size groups and hanger information
   */
  private processSizeGroups(
    sizeResult: Record<SizeKey, number>,
    region: Region,
    gander: Gander,
    account: string,
    hangerOrFlat: "Hang" | "Flat"
  ): SizeGroupResult {
    const sizeGroupColumn = {} as Record<SizeCategories, string>;
    const hangerGroupColumn = {} as HangerData;
    const sizeInfoMap = new Map<
      SizeKey,
      { sizeInfo: SizeEntry; sizeGroup: SizeCategories | "unknown" }
    >();

    Object.keys(sizeResult).forEach((sizeKey) => {
      const size = sizeKey as SizeKey;
      const { sizeInfo, sizeGroup } = this.determineSizeGroup(
        region,
        size,
        gander
      );

      sizeInfoMap.set(size, { sizeInfo, sizeGroup });

      if (sizeGroup !== "unknown") {
        sizeGroupColumn[sizeGroup] = sizeGroupColumn[sizeGroup]
          ? `${sizeGroupColumn[sizeGroup]} - ${size}`
          : size;
      }

      const hangerInfo = this.determineHangerInfo(
        account,
        sizeGroup,
        hangerOrFlat,
        region
      );
      if (
        hangerInfo &&
        sizeGroup !== "unknown" &&
        !hangerGroupColumn[sizeGroup]
      ) {
        hangerGroupColumn[sizeGroup] = hangerInfo[sizeGroup];
      }
    });

    return { sizeGroupColumn, hangerGroupColumn, sizeInfoMap };
  }

  /**
   * Creates processed rows for each size
   */
  private createProcessedRows(
    row: LPOData,
    baseFields: BaseFieldsResult,
    sizeResult: SizeProcessResult,
    sizeGroupData: SizeGroupResult
  ): void {
    Object.entries(sizeResult.sizeResult).forEach(([sizeKey, qty]) => {
      const size = sizeKey as SizeKey;
      const sizeData = sizeGroupData.sizeInfoMap.get(size);
      if (!sizeData) return;

      const { sizeInfo, sizeGroup } = sizeData;
      const hangerCode =
        sizeGroup !== "unknown"
          ? sizeGroupData.hangerGroupColumn[sizeGroup]
          : undefined;

      const REFCSDFY = this.generateREFCSDFY({
        refCode: baseFields.refCode,
        size,
        zodeCode: baseFields.zodeCode,
        fullYear: baseFields.fullYear,
      });

      this.processedRows.push({
        ...row,
        "Full Year": baseFields.fullYear,
        "Ordering Number": sizeInfo.order,
        "By Size": size,
        "Final QTY": qty,
        "individual Polybag": baseFields.polyBag.individual,
        "master Polybag": baseFields.polyBag.master,
        Gander: baseFields.gander.toUpperCase() as "BOYS" | "GIRLS" | "unknown",
        "color Code": baseFields.colorCode,
        RefCode: baseFields.refCode,
        LP: baseFields.lp,
        "Hanger Code Top": hangerCode?.top || "",
        "Hanger Code Button": hangerCode?.bottom || "",
        "ACC ShipDate": baseFields.accShipDate,
        "Season Code": baseFields.seasonCode,
        "Size Group Ordering":
          sizeGroup !== "unknown"
            ? SizeCategoriesOrdering[sizeGroup]
            : "unknown",
        "Size Group": sizeGroup,
        "Sum Ratio": sizeResult.packRatioSum,
        "Des Country": baseFields.desCountry,
        "Zode Code": baseFields.zodeCode,
        "REF-C-S-D-FY": REFCSDFY,
        "Season Name": baseFields.seasonName,
      });
    });
  }

  /**
   * Creates a processed column entry
   */
  private createProcessedColumn(
    row: LPOData,
    baseFields: BaseFieldsResult,
    sizeResult: SizeProcessResult,
    cartonResult: CartonResult,
    polybagQuantities: { individual: number; master: number },
    sizeGroupData: SizeGroupResult
  ): void {
    this.processedColumns.push({
      ...row,
      ...sizeResult.sizeResult,
      Gander: baseFields.gander.toUpperCase() as "BOYS" | "GIRLS" | "unknown",
      "color Code": baseFields.colorCode,
      RefCode: baseFields.refCode,
      "S-C-S-D-FY": baseFields.SCCDFY,
      LP: baseFields.lp,
      "ACC ShipDate": baseFields.accShipDate,
      "Season Code": baseFields.seasonCode,
      "Des Country": baseFields.desCountry,
      "Zode Code": baseFields.zodeCode,
      "Full Year": baseFields.fullYear,
      "individual Polybag": baseFields.polyBag.individual,
      "master Polybag": baseFields.polyBag.master,
      "Individual Polybag Quantity": polybagQuantities.individual,
      "Master Polybag Quantity": polybagQuantities.master,
      "Sum Ratio": sizeResult.packRatioSum,
      "Size Group": Object.keys(sizeGroupData.sizeGroupColumn).join("  |  "),
      "Hanger Group": this.formatHangerGroup(sizeGroupData.hangerGroupColumn),
      "Full Cartons": cartonResult.fullCartons,
      Shortage: cartonResult.shortage,
      "Total Cartons Needed": cartonResult.totalCartonsNeeded,
      "Season Name": baseFields.seasonName,
    });
  }

  /**
   * Creates an error column for rows with processing errors
   */
  private createErrorColumn(
    row: LPOData,
    baseFields: BaseFieldsResult,
    error: string
  ): ProcessedColumn {
    return {
      ...row,
      Gander: baseFields.gander.toUpperCase() as "BOYS" | "GIRLS" | "unknown",
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
  }

  /**
   * Calculates polybag quantities based on configuration
   */
  private calculatePolybagQuantities(
    polyBag: { individual: boolean; master: boolean },
    poQty: number,
    packRatioSum: number
  ): { individual: number; master: number } {
    return {
      individual: polyBag.individual ? poQty : 0,
      master: polyBag.master ? Math.round(poQty / packRatioSum) : 0,
    };
  }

  /**
   * Determines the region based on ref value and label name
   */
  private determineRegion(refValue: string, labelName: string): Region {
    const walmartRegex = /LSR[GB]-[A-Z]{2,}\dA\d{2,}/i;
    if (walmartRegex.test(refValue)) return "walmart";
    if (/walmart/i.test(labelName)) return "walmart";
    if (/target/i.test(labelName)) return "target";
    if (/europe/i.test(labelName)) return "EU";
    return "US";
  }

  // Instance utility methods (converted from static for consistency)
  private determineGender(refValue: string): Gander {
    const firstChart = refValue?.split("-")[0]?.slice(-1).toUpperCase();
    return firstChart === "B"
      ? "boys"
      : firstChart === "G"
      ? "girls"
      : "unknown";
  }

  private generateACCShipDate(originalDate: string): string {
    const date = new Date(originalDate);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const yearCode = (date.getFullYear() % 100) * 2;
    return `${month}${yearCode.toString().padStart(2, "0")}`;
  }

  private generateSeasonCode(season: string, year: string): string {
    const date = new Date(year);
    const yearCode = date.getFullYear() % 100;
    return `${SEASON_CODE[season]}${yearCode}`;
  }

  private calculateCartons(
    quantity: number,
    cartonCapacity: number
  ): CartonResult {
    const fullCartons = Math.floor(quantity / cartonCapacity);
    const remainder = quantity % cartonCapacity;
    const totalCartonsNeeded = Math.ceil(quantity / cartonCapacity);

    return {
      fullCartons,
      shortage: remainder > 0 ? remainder : 0,
      totalCartonsNeeded,
    };
  }

  private determineSizeGroup(
    region: Region,
    size: SizeKey,
    gander: Gander
  ): { sizeInfo: SizeEntry; sizeGroup: SizeCategories | "unknown" } {
    const sizeInfo = SIZE_GROUP[region][size] ||
      SIZE_GROUP.default[size] || { order: 0, boys: "", girls: "" };

    const sizeGroup =
      gander !== "unknown"
        ? (String(sizeInfo[gander]) as SizeCategories) || "unknown"
        : "unknown";

    return { sizeInfo, sizeGroup };
  }

  private determineHangerInfo(
    account: string,
    sizeGroup: SizeCategories | "unknown",
    hangerOrFlat: "Hang" | "Flat",
    region: Region
  ): HangerData | false {
    if (sizeGroup === "unknown" || hangerOrFlat !== "Hang") return false;

    const accountKey = region === "walmart" ? "W113M" : account.trim();
    return HANGER_DATA[accountKey] || false;
  }

  private generateREFCSDFY({
    refCode,
    size,
    zodeCode,
    fullYear,
  }: {
    refCode: string;
    size: SizeKey;
    zodeCode: string;
    fullYear: string;
  }): string {
    return `${refCode}-${size}-${zodeCode}-${fullYear}`;
  }

  private formatHangerGroup(hangerGroupColumn: HangerData): string {
    return Object.entries(hangerGroupColumn)
      .map(
        ([group, { top, bottom }]) =>
          `(${group}:- ( Top:(${top}) - Bottom:(${bottom}) )`
      )
      .join(" - ");
  }

  // Helper methods
  private getString(value: unknown): string {
    return String(value || "").trim();
  }

  private isEmpty(value: unknown): boolean {
    return value === undefined || value === null || String(value).trim() === "";
  }

  private getRandomSampleIndices(): number[] {
    const sampleSize = Math.min(5, this.data.length);
    return Array.from({ length: sampleSize }, () =>
      Math.floor(Math.random() * this.data.length)
    );
  }

  /**
   * Gets ordered keys for export functionality
   */
  public static getOrderedKeys<T extends ProcessedRow | ProcessedColumn>(
    data: T[],
    predefined: string[]
  ): (keyof T)[] {
    const seen = new Set(predefined);
    const extraKeys: string[] = [];

    data.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!seen.has(key)) {
          seen.add(key);
          extraKeys.push(key);
        }
      });
    });

    return [
      ...predefined.filter((k) => seen.has(k)),
      ...extraKeys,
    ] as (keyof T)[];
  }
}
