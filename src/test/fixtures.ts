import { vi } from "vitest";
import type {
  EconomicContextPayload,
  GeographyCode,
  ImmigrationBreakdownsPayload,
  ImmigrationCountryOverviewPayload,
  ImmigrationTrendsPayload,
  PopulationAgeGroupsPayload,
  PopulationComponentsPayload,
  PopulationHistoryPayload,
  PopulationYearRecord,
  TemporaryResidentsPayload,
} from "../types/datasets";

const metadata = {
  source: "Test source",
  licence: "Open Government Licence - Canada" as const,
  last_updated: "2026-05-31T12:00:00Z",
  extracted_at: "2026-05-31T12:00:00Z",
  notes: "Fixture data for regression tests.",
};

const geographies: GeographyCode[] = [
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
];

function populationRecord(year: number, ca: number, on: number): PopulationYearRecord {
  const record = { year } as PopulationYearRecord;
  for (const code of geographies) record[code] = Math.round(ca / 20);
  record.CA = ca;
  record.ON = on;
  record.BC = Math.round(ca / 8);
  record.QC = Math.round(ca / 5);
  return record;
}

export const populationPayload: PopulationHistoryPayload = {
  metadata,
  series: [
    populationRecord(2023, 40_000_000, 15_000_000),
    populationRecord(2024, 41_200_000, 15_500_000),
    populationRecord(2025, 42_000_000, 16_000_000),
  ],
};

export const immigrationPayload: ImmigrationTrendsPayload = {
  metadata,
  series: [
    {
      year: 2023,
      Economic: 250_000,
      Family: 110_000,
      Refugee: 70_000,
      Other: 20_000,
      Total: 450_000,
    },
    {
      year: 2024,
      Economic: 280_000,
      Family: 120_000,
      Refugee: 55_000,
      Other: 15_000,
      Total: 470_000,
    },
    {
      year: 2025,
      Economic: 260_000,
      Family: 130_000,
      Refugee: 60_000,
      Other: 10_000,
      Total: 460_000,
    },
  ],
};

export const populationComponentsPayload: PopulationComponentsPayload = {
  metadata,
  components: [
    "Births",
    "Deaths",
    "Immigrants",
    "Net emigration",
    "Net non-permanent residents",
    "Net interprovincial migration",
    "Net temporary emigration",
    "Residual deviation",
  ],
  series: [
    { year: 2024, geo: "CA", component: "Births", value: 360_000 },
    { year: 2024, geo: "CA", component: "Deaths", value: 330_000 },
    { year: 2024, geo: "CA", component: "Immigrants", value: 470_000 },
    { year: 2024, geo: "CA", component: "Net emigration", value: 20_000 },
    { year: 2024, geo: "CA", component: "Net non-permanent residents", value: 700_000 },
    { year: 2024, geo: "CA", component: "Net interprovincial migration", value: 0 },
    { year: 2024, geo: "CA", component: "Net temporary emigration", value: 5_000 },
    { year: 2024, geo: "CA", component: "Residual deviation", value: 1_000 },
    { year: 2024, geo: "ON", component: "Births", value: 130_000 },
    { year: 2024, geo: "ON", component: "Deaths", value: 105_000 },
    { year: 2024, geo: "ON", component: "Immigrants", value: 200_000 },
    { year: 2024, geo: "ON", component: "Net emigration", value: 8_000 },
    { year: 2024, geo: "ON", component: "Net non-permanent residents", value: 260_000 },
    { year: 2024, geo: "ON", component: "Net interprovincial migration", value: -15_000 },
    { year: 2024, geo: "ON", component: "Net temporary emigration", value: 2_000 },
    { year: 2024, geo: "ON", component: "Residual deviation", value: 500 },
  ],
};

export const countryOverviewPayload: ImmigrationCountryOverviewPayload = {
  metadata,
  records: [
    { year: 2024, label: "India", value: 127_380 },
    { year: 2024, label: "Philippines", value: 32_320 },
    { year: 2024, label: "China, People's Republic of", value: 29_965 },
  ],
};

export const temporaryResidentsPayload: TemporaryResidentsPayload = {
  metadata,
  streams: ["Study permit holders", "IMP work permit holders", "TFWP work permit holders"],
  series: [
    { year: 2024, geo: "CA", stream: "Study permit holders", value: 900_000 },
    { year: 2024, geo: "CA", stream: "IMP work permit holders", value: 500_000 },
    { year: 2024, geo: "CA", stream: "TFWP work permit holders", value: 100_000 },
    { year: 2024, geo: "ON", stream: "Study permit holders", value: 300_000 },
    { year: 2024, geo: "ON", stream: "IMP work permit holders", value: 160_000 },
    { year: 2024, geo: "ON", stream: "TFWP work permit holders", value: 40_000 },
  ],
  countryOfCitizenship: [
    { year: 2024, country: "India", stream: "Study permit holders", value: 280_000 },
    { year: 2024, country: "India", stream: "IMP work permit holders", value: 130_000 },
    { year: 2024, country: "India", stream: "TFWP work permit holders", value: 35_000 },
    { year: 2024, country: "Philippines", stream: "Study permit holders", value: 40_000 },
    { year: 2024, country: "Philippines", stream: "IMP work permit holders", value: 35_000 },
    { year: 2024, country: "Philippines", stream: "TFWP work permit holders", value: 10_000 },
  ],
};

export const breakdownsPayload: ImmigrationBreakdownsPayload = {
  metadata,
  dimensions: {
    countryOfCitizenship: countryOverviewPayload.records,
    countryOfCitizenshipByGeo: [
      { year: 2015, geo: "ON", label: "India", value: 20_000 },
      { year: 2015, geo: "ON", label: "Philippines", value: 8_000 },
    ],
    ageGroup: [
      { year: 2024, geo: "CA", label: "30 to 44 years old", value: 168_000 },
      { year: 2024, geo: "CA", label: "15 to 29 years old", value: 140_000 },
      { year: 2024, geo: "ON", label: "30 to 44 years old", value: 70_000 },
    ],
    gender: [
      { year: 2024, geo: "CA", label: "Female", value: 235_000 },
      { year: 2024, geo: "CA", label: "Male", value: 230_000 },
      { year: 2024, geo: "ON", label: "Female", value: 100_000 },
    ],
    intendedOccupation: [
      { year: 2024, geo: "CA", label: "Other occupations", value: 264_000 },
      { year: 2024, geo: "CA", label: "2173 - Software engineers and designers", value: 10_000 },
      { year: 2024, geo: "ON", label: "Other occupations", value: 105_000 },
    ],
  },
  countryCategory: [
    { year: 2024, country: "India", category: "Economic", value: 94_000 },
    { year: 2024, country: "India", category: "Family", value: 31_000 },
    { year: 2024, country: "India", category: "Refugee", value: 1_500 },
    { year: 2024, country: "India", category: "Other", value: 880 },
  ],
};

export const populationAgeGroupsPayload: PopulationAgeGroupsPayload = {
  metadata,
  ageGroups: [
    "0 to 14 years old",
    "15 to 29 years old",
    "30 to 44 years old",
    "45 to 59 years old",
    "60 to 74 years old",
    "75 years old or more",
  ],
  series: [
    { year: 2024, geo: "CA", ageGroup: "0 to 14 years old", value: 6_000_000 },
    { year: 2024, geo: "CA", ageGroup: "15 to 29 years old", value: 8_000_000 },
    { year: 2024, geo: "CA", ageGroup: "30 to 44 years old", value: 9_000_000 },
    { year: 2024, geo: "CA", ageGroup: "45 to 59 years old", value: 8_000_000 },
    { year: 2024, geo: "CA", ageGroup: "60 to 74 years old", value: 6_000_000 },
    { year: 2024, geo: "CA", ageGroup: "75 years old or more", value: 4_000_000 },
  ],
};

export const economicContextPayload: EconomicContextPayload = {
  metadata,
  indicators: ["Median employment income", "Unemployment rate", "Employment rate"],
  series: [
    {
      year: 2023,
      geo: "CA",
      indicator: "Median employment income",
      value: 43_000,
      unit: "2024 constant dollars",
    },
    {
      year: 2024,
      geo: "CA",
      indicator: "Median employment income",
      value: 45_000,
      unit: "2024 constant dollars",
    },
    { year: 2024, geo: "CA", indicator: "Unemployment rate", value: 6.4, unit: "Percent" },
    { year: 2024, geo: "CA", indicator: "Employment rate", value: 61.2, unit: "Percent" },
  ],
};

export const fetchPayloads: Record<string, unknown> = {
  "/data/population_history.json": populationPayload,
  "/data/population_components.json": populationComponentsPayload,
  "/data/immigration_trends.json": immigrationPayload,
  "/data/immigration_country_overview.json": countryOverviewPayload,
  "/data/temporary_residents.json": temporaryResidentsPayload,
  "/data/immigration_breakdowns.json": breakdownsPayload,
  "/data/population_age_groups.json": populationAgeGroupsPayload,
  "/data/economic_context.json": economicContextPayload,
};

export function mockFetch(payloads: Record<string, unknown> = fetchPayloads) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    if (!(path in payloads)) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(JSON.stringify(payloads[path]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
