import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";

const OUTPUT_PATH = resolve("public/data/temporary_residents.json");
const STUDY_PACKAGE_URL =
  "https://open.canada.ca/data/en/dataset/90115b00-f9b8-49e8-afa3-b4cff8facaee";
const WORK_PACKAGE_URL =
  "https://open.canada.ca/data/en/dataset/360024f2-17e9-4558-bfc1-3616485d65b9";

const SOURCES = [
  {
    stream: "Study permit holders",
    geographyUrl:
      "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-TR-Study-IS_PT_study.csv",
    countryUrl: "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-TR-Study-IS_CITZ.csv",
  },
  {
    stream: "IMP work permit holders",
    geographyUrl:
      "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-TR-Work-IMP-PT_program.csv",
    countryUrl: "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-TR-Work-IMP-CITZ.csv",
  },
  {
    stream: "TFWP work permit holders",
    geographyUrl:
      "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-TR-Work-TFWP-PT_program.csv",
    countryUrl:
      "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-TR-Work-TFWP-CITZ.csv",
  },
] as const;

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

interface CsvRow {
  EN_YEAR: string;
  EN_PROVINCE_TERRITORY: string;
  EN_COUNTRY_OF_CITIZENSHIP: string;
  TOTAL: string;
}

interface TemporaryResidentRecord {
  year: number;
  geo: string;
  stream: (typeof SOURCES)[number]["stream"];
  value: number;
}

interface TemporaryResidentCountryRecord {
  year: number;
  country: string;
  stream: (typeof SOURCES)[number]["stream"];
  value: number;
}

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

function makeKey(year: number, geo: string, stream: string) {
  return `${year}\u0000${geo}\u0000${stream}`;
}

function makeCountryKey(year: number, country: string, stream: string) {
  return `${year}\u0000${country}\u0000${stream}`;
}

function addRecord(
  map: Map<string, TemporaryResidentRecord>,
  year: number,
  geo: string,
  stream: TemporaryResidentRecord["stream"],
  value: number,
) {
  if (!Number.isInteger(year) || year < 2015 || year > 2025 || value <= 0) return;
  const key = makeKey(year, geo, stream);
  const existing = map.get(key);
  if (existing) {
    existing.value += value;
  } else {
    map.set(key, { year, geo, stream, value });
  }
}

function addCountryRecord(
  map: Map<string, TemporaryResidentCountryRecord>,
  year: number,
  country: string,
  stream: TemporaryResidentCountryRecord["stream"],
  value: number,
) {
  if (!country || !Number.isInteger(year) || year < 2015 || year > 2025 || value <= 0) return;
  const key = makeCountryKey(year, country, stream);
  const existing = map.get(key);
  if (existing) {
    existing.value += value;
  } else {
    map.set(key, { year, country, stream, value });
  }
}

async function main() {
  const map = new Map<string, TemporaryResidentRecord>();
  const countryMap = new Map<string, TemporaryResidentCountryRecord>();
  const lastModifiedValues: string[] = [];

  for (const source of SOURCES) {
    const { rows, lastModified } = await fetchRows(source.geographyUrl);
    if (lastModified) lastModifiedValues.push(lastModified);

    for (const row of rows) {
      const year = Number(row.EN_YEAR);
      const geo = PROVINCE_TO_CODE[row.EN_PROVINCE_TERRITORY];
      if (!geo) continue;

      const value = parseNumber(row.TOTAL);
      addRecord(map, year, geo, source.stream, value);
      addRecord(map, year, "CA", source.stream, value);
    }

    const countryRows = await fetchRows(source.countryUrl);
    if (countryRows.lastModified) lastModifiedValues.push(countryRows.lastModified);
    for (const row of countryRows.rows) {
      addCountryRecord(
        countryMap,
        Number(row.EN_YEAR),
        row.EN_COUNTRY_OF_CITIZENSHIP,
        source.stream,
        parseNumber(row.TOTAL),
      );
    }
  }

  const series = [...map.values()].sort(
    (a, b) => a.year - b.year || a.geo.localeCompare(b.geo) || a.stream.localeCompare(b.stream),
  );
  const countryOfCitizenship = [...countryMap.values()].sort(
    (a, b) => a.year - b.year || a.stream.localeCompare(b.stream) || b.value - a.value,
  );
  const lastUpdated = lastModifiedValues
    .map((value) => new Date(value).toISOString().slice(0, 10))
    .sort()
    .at(-1);

  const payload = {
    metadata: {
      source:
        "IRCC Temporary Residents - Study Permit Holders and Work Permit Holders monthly update resources",
      source_url: `${STUDY_PACKAGE_URL}; ${WORK_PACKAGE_URL}`,
      licence: "Open Government Licence - Canada",
      last_updated: lastUpdated ?? "",
      extracted_at: new Date().toISOString(),
      notes:
        "Temporary resident permit-holder monthly update resources. Study permit holders, International Mobility Program work permit holders, and Temporary Foreign Worker Program work permit holders are summed from monthly rows to annual values by selected province/territory and Canada-level country of citizenship. These are annual counts by year in which permit(s) became effective, not a running cumulative stock. Province/territory not stated records are excluded from geography views. The current static release includes complete years 2015-2025 and excludes partial 2026 records.",
    },
    streams: SOURCES.map((source) => source.stream),
    series,
    countryOfCitizenship,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload));
  console.log(`Wrote ${OUTPUT_PATH} (${series.length} records)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
