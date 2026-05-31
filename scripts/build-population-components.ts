import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";

const SOURCE_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/17100008-eng.zip";
const OUTPUT_PATH = resolve("public/data/population_components.json");

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

const COMPONENTS = [
  "Births",
  "Deaths",
  "Immigrants",
  "Net emigration",
  "Net non-permanent residents",
  "Net interprovincial migration",
  "Net temporary emigration",
  "Residual deviation",
] as const;

type GeographyCode = (typeof GEOGRAPHY_CODES)[keyof typeof GEOGRAPHY_CODES];
type PopulationGrowthComponent = (typeof COMPONENTS)[number];

interface SourceRow {
  REF_DATE: string;
  GEO: keyof typeof GEOGRAPHY_CODES;
  "Components of population growth": string;
  VALUE: string;
}

interface PopulationComponentRecord {
  year: number;
  geo: GeographyCode;
  component: PopulationGrowthComponent;
  value: number;
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseEndingYear(value: string): number | null {
  const match = value.match(/^\d{4}\/(\d{4})$/);
  if (!match) return null;
  return Number(match[1]);
}

function isPopulationGrowthComponent(value: string): value is PopulationGrowthComponent {
  return (COMPONENTS as readonly string[]).includes(value);
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Statistics Canada ZIP: ${response.status}`);
  }

  const lastModified = response.headers.get("last-modified");
  const zip = await JSZip.loadAsync(Buffer.from(await response.arrayBuffer()));
  const csvFile = zip.file("17100008.csv");
  if (!csvFile) {
    throw new Error("17100008.csv was not found inside the Statistics Canada ZIP.");
  }

  const rows = parse(await csvFile.async("string"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as SourceRow[];

  const series: PopulationComponentRecord[] = [];

  for (const row of rows) {
    const geo = GEOGRAPHY_CODES[row.GEO];
    if (!geo) continue;

    const component = row["Components of population growth"];
    if (!isPopulationGrowthComponent(component)) continue;

    const year = parseEndingYear(row.REF_DATE);
    const value = toNumber(row.VALUE);
    if (year === null || year < 2000 || value === null) continue;

    series.push({ year, geo, component, value });
  }

  series.sort(
    (a, b) =>
      a.year - b.year ||
      a.geo.localeCompare(b.geo) ||
      COMPONENTS.indexOf(a.component) - COMPONENTS.indexOf(b.component),
  );

  if (!series.length) {
    throw new Error("No valid population component rows were generated.");
  }

  const payload = {
    metadata: {
      source:
        "Statistics Canada table 17-10-0008-01, Estimates of the components of demographic growth, annual",
      source_url: SOURCE_URL,
      licence: "Open Government Licence - Canada",
      last_updated: lastModified ? new Date(lastModified).toISOString().slice(0, 10) : "",
      extracted_at: new Date().toISOString(),
      notes:
        "Annual July-to-July demographic growth components for Canada, provinces, and territories. The stored year is the ending year of the source interval.",
    },
    components: COMPONENTS,
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
