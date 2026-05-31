import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const GEOGRAPHY_CODES = [
  "CA",
  "NL",
  "PE",
  "NS",
  "NB",
  "QC",
  "ON",
  "MB",
  "SK",
  "AB",
  "BC",
  "YT",
  "NT",
  "NU",
] as const;

const IMMIGRATION_CATEGORIES = ["Economic", "Family", "Refugee", "Other"] as const;
const IMMIGRATION_KEYS = [...IMMIGRATION_CATEGORIES, "Total"] as const;
const BREAKDOWN_KEYS = [
  "countryOfCitizenship",
  "countryOfCitizenshipByGeo",
  "ageGroup",
  "gender",
  "intendedOccupation",
] as const;
const POPULATION_AGE_GROUPS = [
  "0 to 14 years old",
  "15 to 29 years old",
  "30 to 44 years old",
  "45 to 59 years old",
  "60 to 74 years old",
  "75 years old or more",
] as const;
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
const TEMPORARY_RESIDENT_STREAMS = [
  "Study permit holders",
  "IMP work permit holders",
  "TFWP work permit holders",
] as const;
const ECONOMIC_INDICATORS = [
  "Median employment income",
  "Unemployment rate",
  "Employment rate",
] as const;
const ECONOMIC_UNITS = ["2024 constant dollars", "Percent"] as const;

type EconomicValidationRecord = {
  year: number;
  geo: (typeof GEOGRAPHY_CODES)[number];
  indicator: (typeof ECONOMIC_INDICATORS)[number];
  unit: (typeof ECONOMIC_UNITS)[number];
  value: number;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertMetadata(payload: any, name: string) {
  assert(payload.metadata, `${name} is missing metadata.`);
  for (const key of ["source", "licence", "last_updated", "extracted_at"]) {
    assert(typeof payload.metadata[key] === "string", `${name} metadata.${key} must be a string.`);
    assert(payload.metadata[key].length > 0, `${name} metadata.${key} must not be empty.`);
  }
  assert(
    payload.metadata.licence === "Open Government Licence - Canada",
    `${name} must use Open Government Licence - Canada.`,
  );
}

function assertSortedUniqueYears(series: any[], name: string) {
  const seen = new Set<number>();
  let previous = -Infinity;
  for (const record of series) {
    assert(Number.isInteger(record.year), `${name} record has invalid year.`);
    assert(record.year > previous, `${name} years must be sorted ascending.`);
    assert(!seen.has(record.year), `${name} has duplicate year ${record.year}.`);
    seen.add(record.year);
    previous = record.year;
  }
}

function assertFiniteNonNegative(value: unknown, label: string) {
  assert(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number.`);
  assert(value >= 0, `${label} must be non-negative.`);
}

function assertFiniteNumber(value: unknown, label: string) {
  assert(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number.`);
}

function getYearBounds(records: Array<{ year: number }>, label: string) {
  assert(records.length > 0, `${label} must not be empty.`);
  const years = records.map((record) => record.year);
  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

async function readJson(path: string) {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

async function validatePopulation() {
  const payload = await readJson("public/data/population_history.json");
  assertMetadata(payload, "population_history.json");
  assert(Array.isArray(payload.series), "population_history.json series must be an array.");
  assert(payload.series.length > 0, "population_history.json series must not be empty.");
  assertSortedUniqueYears(payload.series, "population_history.json");

  for (const record of payload.series) {
    for (const code of GEOGRAPHY_CODES) {
      assertFiniteNonNegative(record[code], `population_history.json ${record.year}.${code}`);
    }
    assert(record.CA > 0, `population_history.json ${record.year}.CA must be present.`);
  }
}

async function validatePopulationAgeGroups() {
  const payload = await readJson("public/data/population_age_groups.json");
  assertMetadata(payload, "population_age_groups.json");
  assert(
    Array.isArray(payload.ageGroups),
    "population_age_groups.json ageGroups must be an array.",
  );
  for (const ageGroup of POPULATION_AGE_GROUPS) {
    assert(payload.ageGroups.includes(ageGroup), `population_age_groups.json missing ${ageGroup}.`);
  }
  assert(Array.isArray(payload.series), "population_age_groups.json series must be an array.");
  assert(payload.series.length > 0, "population_age_groups.json series must not be empty.");
  for (const record of payload.series) {
    assert(Number.isInteger(record.year), "population_age_groups.json record has invalid year.");
    assert(
      GEOGRAPHY_CODES.includes(record.geo),
      `population_age_groups.json ${record.geo} is unsupported.`,
    );
    assert(
      POPULATION_AGE_GROUPS.includes(record.ageGroup),
      `population_age_groups.json ${record.ageGroup} is unsupported.`,
    );
    assertFiniteNonNegative(
      record.value,
      `population_age_groups.json ${record.year}.${record.geo}.${record.ageGroup}`,
    );
  }
}

async function validatePopulationComponents() {
  const payload = await readJson("public/data/population_components.json");
  assertMetadata(payload, "population_components.json");
  assert(
    Array.isArray(payload.components),
    "population_components.json components must be an array.",
  );
  for (const component of POPULATION_COMPONENTS) {
    assert(
      payload.components.includes(component),
      `population_components.json missing ${component}.`,
    );
  }
  assert(Array.isArray(payload.series), "population_components.json series must be an array.");
  assert(payload.series.length > 0, "population_components.json series must not be empty.");

  const seen = new Set<string>();
  for (const record of payload.series) {
    assert(Number.isInteger(record.year), "population_components.json record has invalid year.");
    assert(
      GEOGRAPHY_CODES.includes(record.geo),
      `population_components.json ${record.geo} is unsupported.`,
    );
    assert(
      POPULATION_COMPONENTS.includes(record.component),
      `population_components.json ${record.component} is unsupported.`,
    );
    assertFiniteNumber(
      record.value,
      `population_components.json ${record.year}.${record.geo}.${record.component}`,
    );
    const key = `${record.year}.${record.geo}.${record.component}`;
    assert(!seen.has(key), `population_components.json has duplicate ${key}.`);
    seen.add(key);
  }
}

async function validateImmigration() {
  const payload = await readJson("public/data/immigration_trends.json");
  assertMetadata(payload, "immigration_trends.json");
  assert(Array.isArray(payload.series), "immigration_trends.json series must be an array.");
  assert(payload.series.length > 0, "immigration_trends.json series must not be empty.");
  assertSortedUniqueYears(payload.series, "immigration_trends.json");

  for (const record of payload.series) {
    for (const key of IMMIGRATION_KEYS) {
      assertFiniteNonNegative(record[key], `immigration_trends.json ${record.year}.${key}`);
    }
    const calculated = record.Economic + record.Family + record.Refugee + record.Other;
    assert(
      calculated === record.Total,
      `immigration_trends.json ${record.year}.Total must equal grouped categories.`,
    );
  }
}

async function validateBreakdowns() {
  const payload = await readJson("public/data/immigration_breakdowns.json");
  assertMetadata(payload, "immigration_breakdowns.json");
  assert(payload.dimensions, "immigration_breakdowns.json dimensions must exist.");

  for (const key of BREAKDOWN_KEYS) {
    const records = payload.dimensions[key];
    assert(Array.isArray(records), `immigration_breakdowns.json ${key} must be an array.`);
    assert(records.length > 0, `immigration_breakdowns.json ${key} must not be empty.`);
    for (const record of records) {
      assert(Number.isInteger(record.year), `${key} record has invalid year.`);
      assert(
        typeof record.label === "string" && record.label.length > 0,
        `${key} label is invalid.`,
      );
      assertFiniteNonNegative(record.value, `${key} ${record.year}.${record.label}`);
      if (record.geo !== undefined) {
        assert(GEOGRAPHY_CODES.includes(record.geo), `${key} ${record.geo} is not supported.`);
      }
    }
  }

  const countryBounds = getYearBounds(
    payload.dimensions.countryOfCitizenship,
    "immigration_breakdowns.json countryOfCitizenship",
  );
  assert(countryBounds.min === 2000, "countryOfCitizenship must start in 2000.");
  assert(
    countryBounds.max >= 2025,
    "countryOfCitizenship must include current records through 2025.",
  );

  const provinceCountryBounds = getYearBounds(
    payload.dimensions.countryOfCitizenshipByGeo,
    "immigration_breakdowns.json countryOfCitizenshipByGeo",
  );
  assert(provinceCountryBounds.min === 2000, "countryOfCitizenshipByGeo must start in 2000.");
  assert(
    provinceCountryBounds.max === 2015,
    "countryOfCitizenshipByGeo must remain explicitly limited to the historical 2000-2015 source.",
  );

  for (const key of ["ageGroup", "gender", "intendedOccupation"] as const) {
    const bounds = getYearBounds(payload.dimensions[key], `immigration_breakdowns.json ${key}`);
    assert(
      bounds.min >= 2015,
      `${key} must not mix pre-2015 rows into the current monthly source.`,
    );
  }

  if (payload.countryCategory !== undefined) {
    assert(
      Array.isArray(payload.countryCategory),
      "immigration_breakdowns.json countryCategory must be an array.",
    );
    assert(
      payload.countryCategory.length > 0,
      "immigration_breakdowns.json countryCategory must not be empty.",
    );
    for (const record of payload.countryCategory) {
      assert(Number.isInteger(record.year), "countryCategory record has invalid year.");
      assert(
        typeof record.country === "string" && record.country.length > 0,
        "countryCategory country is invalid.",
      );
      assert(
        IMMIGRATION_CATEGORIES.includes(record.category),
        `countryCategory ${record.category} is unsupported.`,
      );
      assertFiniteNonNegative(
        record.value,
        `countryCategory ${record.year}.${record.country}.${record.category}`,
      );
    }
  }
}

async function validateImmigrationCountryOverview() {
  const payload = await readJson("public/data/immigration_country_overview.json");
  assertMetadata(payload, "immigration_country_overview.json");
  assert(
    Array.isArray(payload.records),
    "immigration_country_overview.json records must be an array.",
  );
  assert(
    payload.records.length > 0,
    "immigration_country_overview.json records must not be empty.",
  );
  const seen = new Set<string>();
  for (const record of payload.records) {
    assert(
      Number.isInteger(record.year),
      "immigration_country_overview.json record has invalid year.",
    );
    assert(
      typeof record.label === "string" && record.label.length > 0,
      "immigration_country_overview.json label is invalid.",
    );
    assertFiniteNonNegative(
      record.value,
      `immigration_country_overview.json ${record.year}.${record.label}`,
    );
    assert(
      record.geo === undefined,
      "immigration_country_overview.json records must be Canada-level and omit geo.",
    );
    const key = `${record.year}.${record.label}`;
    assert(!seen.has(key), `immigration_country_overview.json has duplicate ${key}.`);
    seen.add(key);
  }
  const bounds = getYearBounds(payload.records, "immigration_country_overview.json records");
  assert(bounds.min === 2000, "immigration_country_overview.json records must start in 2000.");
  assert(
    bounds.max >= 2025,
    "immigration_country_overview.json records must include current records through 2025.",
  );
}

async function validateTemporaryResidents() {
  const payload = await readJson("public/data/temporary_residents.json");
  assertMetadata(payload, "temporary_residents.json");
  assert(Array.isArray(payload.streams), "temporary_residents.json streams must be an array.");
  for (const stream of TEMPORARY_RESIDENT_STREAMS) {
    assert(payload.streams.includes(stream), `temporary_residents.json missing ${stream}.`);
  }
  assert(Array.isArray(payload.series), "temporary_residents.json series must be an array.");
  assert(payload.series.length > 0, "temporary_residents.json series must not be empty.");
  for (const record of payload.series) {
    assert(Number.isInteger(record.year), "temporary_residents.json record has invalid year.");
    assert(
      GEOGRAPHY_CODES.includes(record.geo),
      `temporary_residents.json ${record.geo} is unsupported.`,
    );
    assert(
      TEMPORARY_RESIDENT_STREAMS.includes(record.stream),
      `temporary_residents.json ${record.stream} is unsupported.`,
    );
    assertFiniteNonNegative(
      record.value,
      `temporary_residents.json ${record.year}.${record.geo}.${record.stream}`,
    );
  }
  assert(
    Array.isArray(payload.countryOfCitizenship),
    "temporary_residents.json countryOfCitizenship must be an array.",
  );
  assert(
    payload.countryOfCitizenship.length > 0,
    "temporary_residents.json countryOfCitizenship must not be empty.",
  );
  for (const record of payload.countryOfCitizenship) {
    assert(
      Number.isInteger(record.year),
      "temporary_residents.json country record has invalid year.",
    );
    assert(
      typeof record.country === "string" && record.country.length > 0,
      "temporary_residents.json country record has invalid country.",
    );
    assert(
      TEMPORARY_RESIDENT_STREAMS.includes(record.stream),
      `temporary_residents.json ${record.stream} is unsupported.`,
    );
    assertFiniteNonNegative(
      record.value,
      `temporary_residents.json ${record.year}.${record.country}.${record.stream}`,
    );
  }
}

async function validateEconomicContext() {
  const payload = await readJson("public/data/economic_context.json");
  assertMetadata(payload, "economic_context.json");
  assert(Array.isArray(payload.indicators), "economic_context.json indicators must be an array.");
  for (const indicator of ECONOMIC_INDICATORS) {
    assert(payload.indicators.includes(indicator), `economic_context.json missing ${indicator}.`);
  }
  assert(Array.isArray(payload.series), "economic_context.json series must be an array.");
  assert(payload.series.length > 0, "economic_context.json series must not be empty.");

  const economicSeries = payload.series as EconomicValidationRecord[];
  const seen = new Set<string>();
  for (const record of economicSeries) {
    assert(Number.isInteger(record.year), "economic_context.json record has invalid year.");
    assert(
      GEOGRAPHY_CODES.includes(record.geo),
      `economic_context.json ${record.geo} is unsupported.`,
    );
    assert(
      ECONOMIC_INDICATORS.includes(record.indicator),
      `economic_context.json ${record.indicator} is unsupported.`,
    );
    assert(
      ECONOMIC_UNITS.includes(record.unit),
      `economic_context.json ${record.unit} is unsupported.`,
    );
    assertFiniteNonNegative(
      record.value,
      `economic_context.json ${record.year}.${record.geo}.${record.indicator}`,
    );
    const key = `${record.year}.${record.geo}.${record.indicator}`;
    assert(!seen.has(key), `economic_context.json has duplicate ${key}.`);
    seen.add(key);
  }

  const income = economicSeries.filter((record) => record.indicator === "Median employment income");
  const unemployment = economicSeries.filter((record) => record.indicator === "Unemployment rate");
  const employment = economicSeries.filter((record) => record.indicator === "Employment rate");
  assert(
    getYearBounds(income, "economic median employment income").min === 2012,
    "income data must start in 2012.",
  );
  assert(
    getYearBounds(income, "economic median employment income").max >= 2024,
    "income data must include 2024.",
  );
  assert(
    getYearBounds(unemployment, "economic unemployment rate").max >= 2025,
    "unemployment data must include 2025.",
  );
  assert(
    getYearBounds(employment, "economic employment rate").max >= 2025,
    "employment data must include 2025.",
  );
}

async function main() {
  await validatePopulation();
  await validatePopulationAgeGroups();
  await validatePopulationComponents();
  await validateImmigration();
  await validateBreakdowns();
  await validateImmigrationCountryOverview();
  await validateTemporaryResidents();
  await validateEconomicContext();
  console.log("Data validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
