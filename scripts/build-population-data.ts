import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";

const SOURCE_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/17100005-eng.zip";
const OUTPUT_PATH = resolve("public/data/population_history.json");

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

type GeographyCode = (typeof GEOGRAPHY_CODES)[keyof typeof GEOGRAPHY_CODES];

type PopulationRecord = { year: number } & Record<GeographyCode, number>;

interface SourceRow {
  REF_DATE: string;
  GEO: keyof typeof GEOGRAPHY_CODES;
  Gender: string;
  "Age group": string;
  VALUE: string;
}

const REQUIRED_CODES = Object.values(GEOGRAPHY_CODES);

function toInteger(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Statistics Canada ZIP: ${response.status}`);
  }

  const lastModified = response.headers.get("last-modified");
  const zip = await JSZip.loadAsync(Buffer.from(await response.arrayBuffer()));
  const csvFile = zip.file("17100005.csv");
  if (!csvFile) {
    throw new Error("17100005.csv was not found inside the Statistics Canada ZIP.");
  }

  const csv = await csvFile.async("string");
  const rows = parse(csv, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as SourceRow[];

  const byYear = new Map<number, Partial<PopulationRecord> & { year: number }>();

  for (const row of rows) {
    if (row.Gender !== "Total - gender" || row["Age group"] !== "All ages") {
      continue;
    }

    const code = GEOGRAPHY_CODES[row.GEO];
    if (!code) continue;

    const year = Number(row.REF_DATE);
    const value = toInteger(row.VALUE);
    if (!Number.isInteger(year) || year < 2000 || value === null) {
      continue;
    }

    const existing = byYear.get(year) ?? { year };
    existing[code] = value;
    byYear.set(year, existing);
  }

  const series = [...byYear.values()]
    .filter((record): record is PopulationRecord =>
      REQUIRED_CODES.every((code) => Number.isFinite(record[code])),
    )
    .sort((a, b) => a.year - b.year);

  if (!series.length) {
    throw new Error("No valid population rows were generated.");
  }

  const payload = {
    metadata: {
      source:
        "Statistics Canada table 17-10-0005-01, Population estimates on July 1 by age and gender",
      source_url: SOURCE_URL,
      licence: "Open Government Licence - Canada",
      last_updated: lastModified ? new Date(lastModified).toISOString().slice(0, 10) : "",
      extracted_at: new Date().toISOString(),
      notes:
        "Annual July 1 population estimates for Canada, provinces, and territories. Filtered to Total - gender and All ages.",
    },
    series,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload));
  console.log(`Wrote ${OUTPUT_PATH} (${series[0].year}-${series.at(-1)?.year})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
