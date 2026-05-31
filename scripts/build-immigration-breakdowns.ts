import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as XLSX from "@e965/xlsx";
import { parse } from "csv-parse/sync";

const OUTPUT_PATH = resolve("public/data/immigration_breakdowns.json");
const COUNTRY_OVERVIEW_OUTPUT_PATH = resolve("public/data/immigration_country_overview.json");
const PACKAGE_URL = "https://open.canada.ca/data/en/dataset/f7e5498e-0ad8-4417-85c9-9b8aff9b9eda";

const SOURCES = {
  historicalCountry:
    "https://www.ircc.canada.ca/opendata-donneesouvertes/data/IRCC_PRadmiss_0004_E.xls",
  historicalCountryByProvince:
    "https://www.ircc.canada.ca/opendata-donneesouvertes/data/IRCC_PRadmiss_0008_E.csv",
  country: "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-PR-Citz.csv",
  countryCategory:
    "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-PR-Citz_immcat.csv",
  age: "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-PR-AgeGroup.csv",
  gender: "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-PR-Gender.csv",
  occupation: "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-PR-PT_NOC4.csv",
};

const PROVINCE_TO_CODE: Record<string, string> = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT",
  "Nova Scotia": "NS",
  Nunavut: "NU",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",
  Yukon: "YT",
};

type BreakdownKind =
  | "countryOfCitizenship"
  | "countryOfCitizenshipByGeo"
  | "ageGroup"
  | "gender"
  | "intendedOccupation";

interface BreakdownRecord {
  year: number;
  label: string;
  value: number;
  geo?: string;
}

interface CountryCategoryRecord {
  year: number;
  country: string;
  category: "Economic" | "Family" | "Refugee" | "Other";
  value: number;
}

interface CsvRow {
  EN_YEAR: string;
  TOTAL: string;
  [key: string]: string;
}

const MAIN_CATEGORY_TO_BUCKET: Record<string, CountryCategoryRecord["category"]> = {
  Economic: "Economic",
  "Sponsored Family": "Family",
  "Resettled Refugee & Protected Person in Canada": "Refugee",
  "All Other Immigration": "Other",
};

function parseNumber(value: unknown): number {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!normalized || normalized === "--") return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
}

function parseDelimited(text: string) {
  return parse(text, {
    columns: true,
    delimiter: text.includes("\t") ? "\t" : ",",
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CsvRow[];
}

async function fetchRows(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return {
    rows: parseDelimited(await response.text()),
    lastModified: response.headers.get("last-modified"),
  };
}

async function fetchRawCsvRows(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const text = await response.text();
  return {
    rows: parse(text, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as string[][],
    lastModified: response.headers.get("last-modified"),
  };
}

async function fetchWorkbookRows(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return {
    rows: XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }),
    lastModified: response.headers.get("last-modified"),
  };
}

function makeKey(year: number, label: string, geo?: string) {
  return `${year}\u0000${geo ?? "CA"}\u0000${label}`;
}

function makeCategoryKey(year: number, country: string, category: string) {
  return `${year}\u0000${country}\u0000${category}`;
}

function addRecord(
  map: Map<string, BreakdownRecord>,
  year: number,
  label: string,
  value: number,
  geo?: string,
  minYear = 2015,
) {
  if (!label || !Number.isInteger(year) || year < minYear || year > 2025 || value <= 0) return;
  const key = makeKey(year, label, geo);
  const existing = map.get(key);
  if (existing) {
    existing.value += value;
  } else {
    map.set(key, { year, label, value, ...(geo ? { geo } : {}) });
  }
}

function addCategoryRecord(
  map: Map<string, CountryCategoryRecord>,
  year: number,
  country: string,
  category: CountryCategoryRecord["category"],
  value: number,
) {
  if (!country || !Number.isInteger(year) || year < 2015 || year > 2025 || value <= 0) return;
  const key = makeCategoryKey(year, country, category);
  const existing = map.get(key);
  if (existing) {
    existing.value += value;
  } else {
    map.set(key, { year, country, category, value });
  }
}

function topByYear(records: BreakdownRecord[], limit: number) {
  const byScope = new Map<string, BreakdownRecord[]>();
  for (const record of records) {
    const key = `${record.geo ?? "CA"}\u0000${record.year}`;
    byScope.set(key, [...(byScope.get(key) ?? []), record]);
  }

  return [...byScope.values()]
    .flatMap((items) => items.sort((a, b) => b.value - a.value).slice(0, limit))
    .sort(
      (a, b) =>
        a.year - b.year || (a.geo ?? "CA").localeCompare(b.geo ?? "CA") || b.value - a.value,
    );
}

function sortRecords(records: BreakdownRecord[]) {
  return records.sort(
    (a, b) =>
      a.year - b.year ||
      (a.geo ?? "CA").localeCompare(b.geo ?? "CA") ||
      a.label.localeCompare(b.label),
  );
}

async function buildCountry() {
  const historical = await fetchWorkbookRows(SOURCES.historicalCountry);
  const { rows, lastModified } = await fetchRows(SOURCES.country);
  const map = new Map<string, BreakdownRecord>();

  const header = historical.rows.find((row) => row[0] === "Country of Citizenship");
  if (!header) throw new Error("Could not find historical country-of-citizenship header row.");
  const yearColumns = header
    .map((value, index) => ({ year: Number(value), index }))
    .filter(({ year }) => Number.isInteger(year) && year >= 2000 && year <= 2014);

  for (const row of historical.rows) {
    const label = String(row[0] ?? "").trim();
    if (
      !label ||
      label === "Country of Citizenship" ||
      label === "Total" ||
      label.startsWith("Note:")
    )
      continue;
    for (const { year, index } of yearColumns) {
      addRecord(map, year, label, parseNumber(row[index]), undefined, 2000);
    }
  }

  for (const row of rows) {
    addRecord(
      map,
      Number(row.EN_YEAR),
      row.EN_COUNTRY_OF_CITIZENSHIP,
      parseNumber(row.TOTAL),
      undefined,
      2000,
    );
  }
  return {
    records: sortRecords([...map.values()]),
    lastModified: lastModified ?? historical.lastModified,
  };
}

function isProvinceTotal(label: string) {
  if (!label.endsWith(" Total")) return false;
  return PROVINCE_TO_CODE[label.replace(/ Total$/, "")] !== undefined;
}

function addProvinceCountryBlock(
  map: Map<string, BreakdownRecord>,
  rows: string[][],
  geo: string,
  yearColumns: Array<{ year: number; index: number }>,
) {
  for (const row of rows) {
    const label = String(row[1] ?? "").trim();
    if (!label || label === "Total") continue;
    for (const { year, index } of yearColumns) {
      addRecord(map, year, label, parseNumber(row[index]), geo, 2000);
    }
  }
}

async function buildProvinceCountry() {
  const { rows, lastModified } = await fetchRawCsvRows(SOURCES.historicalCountryByProvince);
  const map = new Map<string, BreakdownRecord>();

  const headerIndex = rows.findIndex(
    (row) => row[0] === "Intended Province/Territory and Country of Citizenship",
  );
  if (headerIndex < 0) throw new Error("Could not find province-country header row.");

  const header = rows[headerIndex];
  const yearColumns = header
    .map((value, index) => ({ year: Number(value), index }))
    .filter(({ year }) => Number.isInteger(year) && year >= 2000 && year <= 2015);

  let blockRows: string[][] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const sectionLabel = String(row[0] ?? "").trim();
    const countryLabel = String(row[1] ?? "").trim();

    if (sectionLabel === "Province/Territory not stated" || sectionLabel === "Total") break;
    if (sectionLabel.startsWith("Source:") || sectionLabel.startsWith("Note:")) break;

    if (isProvinceTotal(sectionLabel)) {
      const province = sectionLabel.replace(/ Total$/, "");
      const geo = PROVINCE_TO_CODE[province];
      addProvinceCountryBlock(map, blockRows, geo, yearColumns);
      blockRows = [];
      continue;
    }

    if (countryLabel) blockRows.push(row);
  }

  return { records: sortRecords([...map.values()]), lastModified };
}

async function buildCountryCategory() {
  const { rows, lastModified } = await fetchRows(SOURCES.countryCategory);
  const map = new Map<string, CountryCategoryRecord>();

  for (const row of rows) {
    const category = MAIN_CATEGORY_TO_BUCKET[row["EN_IMMIGRATION_CATEGORY-MAIN_CATEGORY"]];
    if (!category) continue;
    addCategoryRecord(
      map,
      Number(row.EN_YEAR),
      row.EN_COUNTRY_OF_CITIZENSHIP,
      category,
      parseNumber(row.TOTAL),
    );
  }

  return {
    records: [...map.values()].sort(
      (a, b) =>
        a.year - b.year ||
        a.country.localeCompare(b.country) ||
        a.category.localeCompare(b.category),
    ),
    lastModified,
  };
}

async function buildGeoDimension(
  url: string,
  labelField: string,
  provinceField: string,
  limit?: number,
) {
  const { rows, lastModified } = await fetchRows(url);
  const map = new Map<string, BreakdownRecord>();
  for (const row of rows) {
    const year = Number(row.EN_YEAR);
    const label = row[labelField];
    const value = parseNumber(row.TOTAL);
    const geo = PROVINCE_TO_CODE[row[provinceField]];
    if (!geo) continue;
    addRecord(map, year, label, value, geo);
    addRecord(map, year, label, value, "CA");
  }

  const records = [...map.values()];
  return {
    records: limit ? topByYear(records, limit) : records.sort((a, b) => a.year - b.year),
    lastModified,
  };
}

async function main() {
  const country = await buildCountry();
  const provinceCountry = await buildProvinceCountry();
  const countryCategory = await buildCountryCategory();
  const age = await buildGeoDimension(SOURCES.age, "EN_AGE", "EN_PROVINCE_TERRITORY");
  const gender = await buildGeoDimension(SOURCES.gender, "EN_GENDER", "EN_PROVINCE_TERRITORY");
  const occupation = await buildGeoDimension(
    SOURCES.occupation,
    "EN_OCCUPATION",
    "EN_PROVINCE/TERRITORY",
    25,
  );

  const dimensions: Record<BreakdownKind, BreakdownRecord[]> = {
    countryOfCitizenship: country.records,
    countryOfCitizenshipByGeo: provinceCountry.records,
    ageGroup: age.records,
    gender: gender.records,
    intendedOccupation: occupation.records,
  };

  const lastUpdated = [
    country.lastModified,
    provinceCountry.lastModified,
    countryCategory.lastModified,
    age.lastModified,
    gender.lastModified,
    occupation.lastModified,
  ]
    .filter(Boolean)
    .map((value) => new Date(value as string).toISOString().slice(0, 10))
    .sort()
    .at(-1);

  const metadata = {
    source:
      "IRCC Permanent Residents - Monthly IRCC Updates and historical intended destination by country of citizenship resources",
    source_url: PACKAGE_URL,
    licence: "Open Government Licence - Canada",
    last_updated: lastUpdated ?? "",
    extracted_at: new Date().toISOString(),
    notes:
      "Annual permanent resident admissions breakdowns. Canada-level country of citizenship covers 2000-2025 using historical IRCC ad hoc data for 2000-2014 and monthly IRCC updates for 2015-2025. Canada-level country by immigration category covers 2015-2025 from the current monthly IRCC country/category source. Province/territory country-of-citizenship data covers 2000-2015 from the historical intended destination by country source; no current monthly province-country source is mixed in. Age, gender, and intended occupation cover 2015-2025 and include Canada aggregate plus province/territory views. Suppressed cells marked -- are treated as zero; top-occupation payloads are trimmed per year to keep the static app small.",
  };

  const payload = {
    metadata,
    dimensions,
    countryCategory: countryCategory.records,
  };
  const countryOverviewPayload = {
    metadata: {
      ...metadata,
      notes:
        "Canada-level permanent resident admissions by country of citizenship. This small payload is used by the Overview tab to avoid loading the full Origins breakdown dataset on first render.",
    },
    records: country.records,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload));
  await writeFile(COUNTRY_OVERVIEW_OUTPUT_PATH, JSON.stringify(countryOverviewPayload));
  console.log(
    `Wrote ${OUTPUT_PATH} (${Object.entries(dimensions)
      .map(([key, records]) => `${key}:${records.length}`)
      .join(", ")})`,
  );
  console.log(`Wrote ${COUNTRY_OVERVIEW_OUTPUT_PATH} (${country.records.length} records)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
