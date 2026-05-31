import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";

const OUTPUT_PATH = resolve("public/data/economic_context.json");
const LABOUR_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/14100375-eng.zip";
const INCOME_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/11100240-eng.zip";

const GEOGRAPHY_CODES = {
  Canada: "CA",
  "Newfoundland and Labrador": "NL",
  "Prince Edward Island": "PE",
  "Nova Scotia": "NS",
  "New Brunswick": "NB",
  Quebec: "QC",
  Ontario: "ON",
  Manitoba: "MB",
  Saskatchewan: "SK",
  Alberta: "AB",
  "British Columbia": "BC",
  Yukon: "YT",
  "Northwest Territories": "NT",
  Nunavut: "NU",
} as const;

const ECONOMIC_INDICATORS = [
  "Median employment income",
  "Unemployment rate",
  "Employment rate",
] as const;

type GeographyCode = (typeof GEOGRAPHY_CODES)[keyof typeof GEOGRAPHY_CODES];
type EconomicIndicator = (typeof ECONOMIC_INDICATORS)[number];
type EconomicUnit = "2024 constant dollars" | "Percent";

interface EconomicContextRecord {
  year: number;
  geo: GeographyCode;
  indicator: EconomicIndicator;
  value: number;
  unit: EconomicUnit;
}

interface CsvRow {
  REF_DATE: string;
  GEO: keyof typeof GEOGRAPHY_CODES;
  Gender: string;
  "Labour force characteristics"?: string;
  "Population centre and rural areas"?: string;
  "Age group"?: string;
  "Work activity"?: string;
  Statistics?: string;
  UOM: string;
  VALUE: string;
}

function parseNumber(value: unknown): number | null {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!normalized || normalized === "--") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchCsvRows(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const zip = await JSZip.loadAsync(Buffer.from(await response.arrayBuffer()));
  const csvFile = zip.file(fileName);
  if (!csvFile) throw new Error(`${fileName} was not found inside ${url}.`);

  return {
    rows: parse(await csvFile.async("string"), {
      columns: true,
      bom: true,
      skip_empty_lines: true,
    }) as CsvRow[],
    lastModified: response.headers.get("last-modified"),
  };
}

function addRecord(
  map: Map<string, EconomicContextRecord>,
  year: number,
  geo: GeographyCode,
  indicator: EconomicIndicator,
  value: number | null,
  unit: EconomicUnit,
) {
  if (!Number.isInteger(year) || value === null || value < 0) return;
  map.set(`${year}\u0000${geo}\u0000${indicator}`, { year, geo, indicator, value, unit });
}

async function main() {
  const records = new Map<string, EconomicContextRecord>();
  const lastModifiedValues: string[] = [];

  const labour = await fetchCsvRows(LABOUR_URL, "14100375.csv");
  if (labour.lastModified) lastModifiedValues.push(labour.lastModified);
  for (const row of labour.rows) {
    const geo = GEOGRAPHY_CODES[row.GEO];
    if (!geo) continue;
    if (row.Gender !== "Total - Gender") continue;
    if (
      row["Population centre and rural areas"] !== "Total, all population centres and rural areas"
    ) {
      continue;
    }
    if (row["Age group"] !== "15 years and over") continue;
    if (row.UOM !== "Percent") continue;

    const characteristic = row["Labour force characteristics"];
    if (characteristic !== "Unemployment rate" && characteristic !== "Employment rate") continue;

    addRecord(
      records,
      Number(row.REF_DATE),
      geo,
      characteristic,
      parseNumber(row.VALUE),
      "Percent",
    );
  }

  const income = await fetchCsvRows(INCOME_URL, "11100240.csv");
  if (income.lastModified) lastModifiedValues.push(income.lastModified);
  for (const row of income.rows) {
    const geo = GEOGRAPHY_CODES[row.GEO];
    if (!geo) continue;
    if (row.Gender !== "Total - Gender") continue;
    if (row["Work activity"] !== "All persons with employment income") continue;
    if (row.Statistics !== "Median employment income") continue;
    if (row.UOM !== "2024 constant dollars") continue;

    addRecord(
      records,
      Number(row.REF_DATE),
      geo,
      "Median employment income",
      parseNumber(row.VALUE),
      "2024 constant dollars",
    );
  }

  const series = [...records.values()].sort(
    (a, b) =>
      a.year - b.year ||
      a.geo.localeCompare(b.geo) ||
      ECONOMIC_INDICATORS.indexOf(a.indicator) - ECONOMIC_INDICATORS.indexOf(b.indicator),
  );
  if (!series.length) throw new Error("No economic context records were generated.");

  const lastUpdated = lastModifiedValues
    .map((value) => new Date(value).toISOString().slice(0, 10))
    .sort()
    .at(-1);

  const payload = {
    metadata: {
      source:
        "Statistics Canada tables 14-10-0375-01 and 11-10-0240-01, labour force rates and employment income",
      source_url: `${LABOUR_URL}; ${INCOME_URL}`,
      licence: "Open Government Licence - Canada",
      last_updated: lastUpdated ?? "",
      extracted_at: new Date().toISOString(),
      notes:
        "Annual economic context indicators. Unemployment and employment rates use total gender, age 15 years and over, total population centres and rural areas; this labour table covers Canada and provinces. Median employment income uses total gender, all persons with employment income, in 2024 constant dollars; this income table covers Canada, provinces, and territories.",
    },
    indicators: ECONOMIC_INDICATORS,
    series,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload));
  console.log(`Wrote ${OUTPUT_PATH} (${series.length} records)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
