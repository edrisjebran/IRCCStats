import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";

const HISTORICAL_URL =
  "https://www.ircc.canada.ca/opendata-donneesouvertes/data/IRCC_PRadmiss_0007_E.csv";
const CURRENT_URL = "https://www.ircc.canada.ca/opendata-donneesouvertes/data/ODP-PR-PT_IMMCAT.csv";
const PACKAGE_URL = "https://open.canada.ca/data/en/dataset/f7e5498e-0ad8-4417-85c9-9b8aff9b9eda";
const OUTPUT_PATH = resolve("public/data/immigration_trends.json");

type ImmigrationBucket = "Economic" | "Family" | "Refugee" | "Other";
type ImmigrationRecord = Record<ImmigrationBucket | "Total", number> & { year: number };

const EMPTY_BUCKETS: Record<ImmigrationBucket, number> = {
  Economic: 0,
  Family: 0,
  Refugee: 0,
  Other: 0,
};

const HISTORICAL_LABELS: Record<string, ImmigrationBucket> = {
  "Economic immigrants Total": "Economic",
  "Family class Total": "Family",
  "Refugees Total": "Refugee",
  "Other immigrants": "Other",
};

const CURRENT_LABELS: Record<string, ImmigrationBucket> = {
  Economic: "Economic",
  "Sponsored Family": "Family",
  "Resettled Refugee & Protected Person in Canada": "Refugee",
  "All Other Immigration": "Other",
};

interface CurrentRow {
  EN_YEAR: string;
  EN_PROVINCE_TERRITORY: string;
  "EN_IMMIGRATION_CATEGORY-MAIN_CATEGORY": string;
  TOTAL: string;
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

function getRecord(map: Map<number, Record<ImmigrationBucket, number>>, year: number) {
  const existing = map.get(year);
  if (existing) return existing;
  const created = { ...EMPTY_BUCKETS };
  map.set(year, created);
  return created;
}

async function fetchText(url: string): Promise<{ text: string; lastModified: string | null }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return {
    text: await response.text(),
    lastModified: response.headers.get("last-modified"),
  };
}

async function buildHistorical(records: Map<number, Record<ImmigrationBucket, number>>) {
  const { text, lastModified } = await fetchText(HISTORICAL_URL);
  const rows = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];

  const header = rows.find((row) => row[0] === "Province/Territory and Immigration Category");
  if (!header) {
    throw new Error("Could not find historical IRCC header row.");
  }

  const yearColumns = header
    .map((value, index) => ({ year: Number(value), index }))
    .filter(({ year }) => Number.isInteger(year) && year >= 2000 && year <= 2015);

  for (const row of rows) {
    const bucket = HISTORICAL_LABELS[String(row[0] ?? "").trim()];
    if (!bucket) continue;

    for (const { year, index } of yearColumns) {
      getRecord(records, year)[bucket] += parseNumber(row[index]);
    }
  }

  return lastModified;
}

async function buildCurrent(records: Map<number, Record<ImmigrationBucket, number>>) {
  const { text, lastModified } = await fetchText(CURRENT_URL);
  const rows = parse(text, {
    columns: true,
    delimiter: "\t",
    bom: true,
    skip_empty_lines: true,
  }) as CurrentRow[];

  for (const row of rows) {
    if (row.EN_PROVINCE_TERRITORY === "Province/Territory not stated") {
      continue;
    }

    const year = Number(row.EN_YEAR);
    const bucket = CURRENT_LABELS[row["EN_IMMIGRATION_CATEGORY-MAIN_CATEGORY"]];
    if (!Number.isInteger(year) || year < 2016 || year > 2025 || !bucket) {
      continue;
    }

    getRecord(records, year)[bucket] += parseNumber(row.TOTAL);
  }

  return lastModified;
}

async function main() {
  const records = new Map<number, Record<ImmigrationBucket, number>>();
  const historicalLastModified = await buildHistorical(records);
  const currentLastModified = await buildCurrent(records);

  const series: ImmigrationRecord[] = [...records.entries()]
    .map(([year, values]) => ({
      year,
      Economic: values.Economic,
      Family: values.Family,
      Refugee: values.Refugee,
      Other: values.Other,
      Total: values.Economic + values.Family + values.Refugee + values.Other,
    }))
    .filter((record) => record.year >= 2000 && record.Total > 0)
    .sort((a, b) => a.year - b.year);

  if (!series.length) {
    throw new Error("No valid immigration rows were generated.");
  }

  const lastUpdated = currentLastModified || historicalLastModified;
  const payload = {
    metadata: {
      source:
        "IRCC permanent resident admissions, historical ad hoc dataset and Permanent Residents - Monthly IRCC Updates",
      source_url: PACKAGE_URL,
      licence: "Open Government Licence - Canada",
      last_updated: lastUpdated ? new Date(lastUpdated).toISOString().slice(0, 10) : "",
      extracted_at: new Date().toISOString(),
      notes:
        "Canada-level annual admissions grouped into Economic, Family, Refugee, and Other. Historical 2000-2015 values come from IRCC_PRadmiss_0007_E.csv. Current 2016-2025 values aggregate province/territory rows from ODP-PR-PT_IMMCAT.csv. Suppressed cells marked -- are treated as zero; province/territory not stated rows are excluded for category consistency.",
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
