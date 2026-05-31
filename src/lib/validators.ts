import { GEOGRAPHY_CODES } from "../data/geography";
import type {
  EconomicContextPayload,
  ImmigrationBreakdownsPayload,
  ImmigrationCountryOverviewPayload,
  ImmigrationTrendsPayload,
  PopulationAgeGroupsPayload,
  PopulationComponentsPayload,
  PopulationHistoryPayload,
  PopulationYearRecord,
  TemporaryResidentsPayload,
} from "../types/datasets";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasMetadata(value: Record<string, unknown>) {
  const metadata = value.metadata;
  return (
    isObject(metadata) &&
    typeof metadata.source === "string" &&
    metadata.licence === "Open Government Licence - Canada" &&
    typeof metadata.last_updated === "string" &&
    typeof metadata.extracted_at === "string"
  );
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFiniteValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

const POPULATION_COMPONENTS = [
  "Births",
  "Deaths",
  "Immigrants",
  "Net emigration",
  "Net non-permanent residents",
  "Net interprovincial migration",
  "Net temporary emigration",
  "Residual deviation",
] as const;

const ECONOMIC_INDICATORS = [
  "Median employment income",
  "Unemployment rate",
  "Employment rate",
] as const;

const ECONOMIC_UNITS = ["2024 constant dollars", "Percent"] as const;

export function validatePopulationPayload(value: unknown): PopulationHistoryPayload {
  if (!isObject(value) || !hasMetadata(value) || !Array.isArray(value.series)) {
    throw new Error("Invalid population dataset structure.");
  }

  for (const record of value.series) {
    if (!isObject(record) || !Number.isInteger(record.year)) {
      throw new Error("Invalid population year record.");
    }
    for (const code of GEOGRAPHY_CODES) {
      if (!isFiniteNumber(record[code])) {
        throw new Error(`Population record ${record.year} is missing ${code}.`);
      }
    }
  }

  return value as unknown as PopulationHistoryPayload;
}

export function validatePopulationAgeGroupsPayload(value: unknown): PopulationAgeGroupsPayload {
  if (
    !isObject(value) ||
    !hasMetadata(value) ||
    !Array.isArray(value.ageGroups) ||
    !Array.isArray(value.series)
  ) {
    throw new Error("Invalid population age-group dataset structure.");
  }

  for (const ageGroup of value.ageGroups) {
    if (typeof ageGroup !== "string") {
      throw new Error("Invalid population age-group label.");
    }
  }

  for (const record of value.series) {
    if (
      !isObject(record) ||
      !Number.isInteger(record.year) ||
      !isOneOf(GEOGRAPHY_CODES, record.geo) ||
      typeof record.ageGroup !== "string" ||
      !value.ageGroups.includes(record.ageGroup) ||
      !isFiniteNumber(record.value)
    ) {
      throw new Error("Invalid population age-group year record.");
    }
  }

  return value as unknown as PopulationAgeGroupsPayload;
}

export function validatePopulationComponentsPayload(value: unknown): PopulationComponentsPayload {
  if (
    !isObject(value) ||
    !hasMetadata(value) ||
    !Array.isArray(value.components) ||
    !Array.isArray(value.series)
  ) {
    throw new Error("Invalid population components dataset structure.");
  }

  for (const component of value.components) {
    if (!isOneOf(POPULATION_COMPONENTS, component)) {
      throw new Error("Invalid population growth component.");
    }
  }

  for (const record of value.series) {
    if (
      !isObject(record) ||
      !Number.isInteger(record.year) ||
      !isOneOf(GEOGRAPHY_CODES, record.geo) ||
      typeof record.component !== "string" ||
      !isOneOf(POPULATION_COMPONENTS, record.component) ||
      !value.components.includes(record.component) ||
      !isFiniteValue(record.value)
    ) {
      throw new Error("Invalid population component record.");
    }
  }

  return value as unknown as PopulationComponentsPayload;
}

export function validateImmigrationPayload(value: unknown): ImmigrationTrendsPayload {
  if (!isObject(value) || !hasMetadata(value) || !Array.isArray(value.series)) {
    throw new Error("Invalid immigration dataset structure.");
  }

  for (const record of value.series) {
    if (!isObject(record) || !Number.isInteger(record.year)) {
      throw new Error("Invalid immigration year record.");
    }
    for (const key of ["Economic", "Family", "Refugee", "Other", "Total"]) {
      if (!isFiniteNumber(record[key])) {
        throw new Error(`Immigration record ${record.year} is missing ${key}.`);
      }
    }
    const categoryTotal =
      (record.Economic as number) +
      (record.Family as number) +
      (record.Refugee as number) +
      (record.Other as number);
    if (Math.abs((record.Total as number) - categoryTotal) > 0.001) {
      throw new Error(`Immigration record ${record.year} has an invalid total.`);
    }
  }

  return value as unknown as ImmigrationTrendsPayload;
}

export function validateEconomicContextPayload(value: unknown): EconomicContextPayload {
  if (
    !isObject(value) ||
    !hasMetadata(value) ||
    !Array.isArray(value.indicators) ||
    !Array.isArray(value.series)
  ) {
    throw new Error("Invalid economic context dataset structure.");
  }

  for (const indicator of ECONOMIC_INDICATORS) {
    if (!value.indicators.includes(indicator)) {
      throw new Error(`Economic context dataset is missing ${indicator}.`);
    }
  }

  for (const record of value.series) {
    if (
      !isObject(record) ||
      !Number.isInteger(record.year) ||
      !isOneOf(GEOGRAPHY_CODES, record.geo) ||
      !isOneOf(ECONOMIC_INDICATORS, record.indicator) ||
      !isOneOf(ECONOMIC_UNITS, record.unit) ||
      !isFiniteNumber(record.value)
    ) {
      throw new Error("Invalid economic context record.");
    }
  }

  return value as unknown as EconomicContextPayload;
}

export function validateImmigrationBreakdownsPayload(value: unknown): ImmigrationBreakdownsPayload {
  if (!isObject(value) || !hasMetadata(value) || !isObject(value.dimensions)) {
    throw new Error("Invalid immigration breakdown dataset structure.");
  }

  for (const key of [
    "countryOfCitizenship",
    "countryOfCitizenshipByGeo",
    "ageGroup",
    "gender",
    "intendedOccupation",
  ]) {
    const records = value.dimensions[key];
    if (!Array.isArray(records)) {
      throw new Error(`Immigration breakdown dimension ${key} must be an array.`);
    }
    for (const record of records) {
      if (
        !isObject(record) ||
        !Number.isInteger(record.year) ||
        typeof record.label !== "string" ||
        !isFiniteNumber(record.value)
      ) {
        throw new Error(`Invalid immigration breakdown record in ${key}.`);
      }
      if (record.geo !== undefined && !isOneOf(GEOGRAPHY_CODES, record.geo)) {
        throw new Error(`Invalid geography code in ${key}.`);
      }
    }
  }

  if (value.countryCategory !== undefined) {
    if (!Array.isArray(value.countryCategory)) {
      throw new Error("Immigration country/category records must be an array.");
    }
    for (const record of value.countryCategory) {
      if (
        !isObject(record) ||
        !Number.isInteger(record.year) ||
        typeof record.country !== "string" ||
        !["Economic", "Family", "Refugee", "Other"].includes(record.category as string) ||
        !isFiniteNumber(record.value)
      ) {
        throw new Error("Invalid immigration country/category record.");
      }
    }
  }

  return value as unknown as ImmigrationBreakdownsPayload;
}

export function validateImmigrationCountryOverviewPayload(
  value: unknown,
): ImmigrationCountryOverviewPayload {
  if (!isObject(value) || !hasMetadata(value) || !Array.isArray(value.records)) {
    throw new Error("Invalid immigration country overview dataset structure.");
  }

  for (const record of value.records) {
    if (
      !isObject(record) ||
      !Number.isInteger(record.year) ||
      typeof record.label !== "string" ||
      record.label.length === 0 ||
      !isFiniteNumber(record.value)
    ) {
      throw new Error("Invalid immigration country overview record.");
    }
    if (record.geo !== undefined) {
      throw new Error("Immigration country overview records must be Canada-level.");
    }
  }

  return value as unknown as ImmigrationCountryOverviewPayload;
}

export function validateTemporaryResidentsPayload(value: unknown): TemporaryResidentsPayload {
  if (
    !isObject(value) ||
    !hasMetadata(value) ||
    !Array.isArray(value.streams) ||
    !Array.isArray(value.series) ||
    !Array.isArray(value.countryOfCitizenship)
  ) {
    throw new Error("Invalid temporary residents dataset structure.");
  }

  for (const stream of value.streams) {
    if (typeof stream !== "string") {
      throw new Error("Invalid temporary resident stream.");
    }
  }

  for (const record of value.series) {
    if (
      !isObject(record) ||
      !Number.isInteger(record.year) ||
      !isOneOf(GEOGRAPHY_CODES, record.geo) ||
      typeof record.stream !== "string" ||
      !value.streams.includes(record.stream) ||
      !isFiniteNumber(record.value)
    ) {
      throw new Error("Invalid temporary resident record.");
    }
  }

  for (const record of value.countryOfCitizenship) {
    if (
      !isObject(record) ||
      !Number.isInteger(record.year) ||
      typeof record.country !== "string" ||
      typeof record.stream !== "string" ||
      !value.streams.includes(record.stream) ||
      !isFiniteNumber(record.value)
    ) {
      throw new Error("Invalid temporary resident country-of-citizenship record.");
    }
  }

  return value as unknown as TemporaryResidentsPayload;
}

export function getPopulationBounds(series: PopulationYearRecord[]) {
  const years = series.map((record) => record.year);
  return {
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
  };
}
