import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";

const SOURCE_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/17100005-eng.zip";
const OUTPUT_PATH = resolve("public/data/population_age_groups.json");

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

const AGE_GROUPS = [
  "0 to 14 years old",
  "15 to 29 years old",
  "30 to 44 years old",
  "45 to 59 years old",
  "60 to 74 years old",
  "75 years old or more",
] as const;

type GeographyCode = (typeof GEOGRAPHY_CODES)[keyof typeof GEOGRAPHY_CODES];
type AgeGroup = (typeof AGE_GROUPS)[number];

interface SourceRow {
  REF_DATE: string;
  GEO: keyof typeof GEOGRAPHY_CODES;
  Gender: string;
  "Age group": string;
  VALUE: string;
}

interface PopulationAgeRecord {
  year: number;
  geo: GeographyCode;
  ageGroup: AgeGroup;
  value: number;
}

function toInteger(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function mapAgeGroup(label: string): AgeGroup | null {
  const single = label.match(/^(\d+) years?$/);
  if (single) {
    return ageToGroup(Number(single[1]));
  }

  if (label === "100 years and over") return "75 years old or more";
  return null;
}

function ageToGroup(age: number): AgeGroup {
  if (age <= 14) return "0 to 14 years old";
  if (age <= 29) return "15 to 29 years old";
  if (age <= 44) return "30 to 44 years old";
  if (age <= 59) return "45 to 59 years old";
  if (age <= 74) return "60 to 74 years old";
  return "75 years old or more";
}

function key(year: number, geo: GeographyCode, ageGroup: AgeGroup) {
  return `${year}\u0000${geo}\u0000${ageGroup}`;
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Statistics Canada ZIP: ${response.status}`);
  }

  const lastModified = response.headers.get("last-modified");
  const zip = await JSZip.loadAsync(Buffer.from(await response.arrayBuffer()));
  const csvFile = zip.file("17100005.csv");
  if (!csvFile) throw new Error("17100005.csv was not found inside the ZIP.");

  const rows = parse(await csvFile.async("string"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as SourceRow[];

  const totals = new Map<string, PopulationAgeRecord>();

  for (const row of rows) {
    if (row.Gender !== "Total - gender") continue;
    const geo = GEOGRAPHY_CODES[row.GEO];
    if (!geo) continue;
    const year = Number(row.REF_DATE);
    if (!Number.isInteger(year) || year < 2000) continue;
    const ageGroup = mapAgeGroup(row["Age group"]);
    if (!ageGroup) continue;
    const value = toInteger(row.VALUE);
    if (value === null) continue;

    const recordKey = key(year, geo, ageGroup);
    const existing = totals.get(recordKey);
    if (existing) {
      existing.value += value;
    } else {
      totals.set(recordKey, { year, geo, ageGroup, value });
    }
  }

  const series = [...totals.values()].sort(
    (a, b) =>
      a.year - b.year ||
      a.geo.localeCompare(b.geo) ||
      AGE_GROUPS.indexOf(a.ageGroup) - AGE_GROUPS.indexOf(b.ageGroup),
  );

  const payload = {
    metadata: {
      source:
        "Statistics Canada table 17-10-0005-01, Population estimates on July 1 by age and gender",
      source_url: SOURCE_URL,
      licence: "Open Government Licence - Canada",
      last_updated: lastModified ? new Date(lastModified).toISOString().slice(0, 10) : "",
      extracted_at: new Date().toISOString(),
      notes:
        "Annual July 1 population estimates grouped into broad age bands for Canada, provinces, and territories. Values are summed from Statistics Canada age rows using Total - gender.",
    },
    ageGroups: AGE_GROUPS,
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
