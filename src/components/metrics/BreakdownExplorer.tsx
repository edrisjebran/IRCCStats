import { useDeferredValue, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Info,
  Languages,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { getGeographyName } from "../../data/geography";
import { formatCompactNumber, formatPopulation, formatSourceDate } from "../../lib/formatters";
import type {
  GeographyCode,
  ImmigrationCategory,
  ImmigrationBreakdownKind,
  ImmigrationBreakdownsPayload,
  ImmigrationBreakdownRecord,
} from "../../types/datasets";
import { BreakdownBarChart } from "../charts/BreakdownBarChart";

const COUNTRY_PAGE_SIZE = 20;
const IMMIGRATION_CATEGORY_COLUMNS: ImmigrationCategory[] = [
  "Economic",
  "Family",
  "Refugee",
  "Other",
];

interface BreakdownExplorerProps {
  payload: ImmigrationBreakdownsPayload;
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}

const DIMENSIONS: Array<{
  key: Exclude<ImmigrationBreakdownKind, "countryOfCitizenship" | "countryOfCitizenshipByGeo">;
  title: string;
  description: string;
  color: string;
  limit: number;
}> = [
  {
    key: "ageGroup",
    title: "Admissions by age group",
    description: "Selected geography, aggregated across the selected year range.",
    color: "#b4222a",
    limit: 8,
  },
  {
    key: "gender",
    title: "Admissions by gender",
    description: "Selected geography, aggregated across the selected year range.",
    color: "#1f6f50",
    limit: 6,
  },
  {
    key: "intendedOccupation",
    title: "Top intended occupations",
    description: "Selected geography, top NOC occupations among admitted permanent residents.",
    color: "#9a6b16",
    limit: 10,
  },
];

function aggregateRecords(
  records: ImmigrationBreakdownRecord[],
  startYear: number,
  endYear: number,
  geographyCode: GeographyCode,
  limit: number,
) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (record.year < startYear || record.year > endYear) continue;
    if (record.geo && record.geo !== geographyCode) continue;
    totals.set(record.label, (totals.get(record.label) ?? 0) + record.value);
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((record) => record.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function getTotal(records: Array<{ value: number }>) {
  return records.reduce((sum, record) => sum + record.value, 0);
}

function getSourceYearInfo(
  records: ImmigrationBreakdownRecord[],
  startYear: number,
  endYear: number,
  geographyCode: GeographyCode,
) {
  const years = [
    ...new Set(
      records
        .filter((record) => record.year >= startYear && record.year <= endYear)
        .filter((record) => !record.geo || record.geo === geographyCode)
        .map((record) => record.year),
    ),
  ];
  if (!years.length) {
    return {
      count: 0,
      label: "No source years in range",
      sentence: "no source years in the selected range",
    };
  }
  const first = Math.min(...years);
  const last = Math.max(...years);
  const label = first === last ? String(first) : `${first}-${last}`;
  return {
    count: years.length,
    label,
    sentence: `${label} (${years.length} ${years.length === 1 ? "year" : "years"})`,
  };
}

function formatSelectedRange(startYear: number, endYear: number) {
  return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
}

function getSourceBounds(records: Array<{ year: number }>) {
  if (!records.length) {
    return { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
  }
  const years = records.map((record) => record.year);
  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

function formatSourceLine(value: number | undefined, years: ReturnType<typeof getSourceYearInfo>) {
  if (value === undefined) return years.label;
  return `${formatPopulation(value)} admissions summed across ${years.sentence}.`;
}

type CountryTableRow = Record<ImmigrationCategory, number> & {
  country: string;
  total: number;
};

function aggregateCountryTableRows(
  countryRecords: ImmigrationBreakdownRecord[],
  categoryRecords: ImmigrationBreakdownsPayload["countryCategory"],
  startYear: number,
  endYear: number,
  geographyCode: GeographyCode,
  includeCategories: boolean,
) {
  const rows = new Map<string, CountryTableRow>();
  for (const record of countryRecords) {
    if (record.year < startYear || record.year > endYear) continue;
    if (record.geo && record.geo !== geographyCode) continue;
    const row =
      rows.get(record.label) ??
      ({
        country: record.label,
        Economic: 0,
        Family: 0,
        Refugee: 0,
        Other: 0,
        total: 0,
      } satisfies CountryTableRow);
    row.total += record.value;
    rows.set(record.label, row);
  }

  if (includeCategories && categoryRecords) {
    for (const record of categoryRecords) {
      if (record.year < startYear || record.year > endYear) continue;
      const row =
        rows.get(record.country) ??
        ({
          country: record.country,
          Economic: 0,
          Family: 0,
          Refugee: 0,
          Other: 0,
          total: 0,
        } satisfies CountryTableRow);
      row[record.category] += record.value;
      rows.set(record.country, row);
    }
  }

  return [...rows.values()]
    .filter((record) => record.total > 0)
    .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
}

function getCategoryYearInfo(
  records: ImmigrationBreakdownsPayload["countryCategory"],
  startYear: number,
  endYear: number,
) {
  const years = [
    ...new Set(
      (records ?? [])
        .filter((record) => record.year >= startYear && record.year <= endYear)
        .map((record) => record.year),
    ),
  ];
  if (!years.length) return "No category source years in range";
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first}-${last}`;
}

export function BreakdownExplorer({
  payload,
  geographyCode,
  startYear,
  endYear,
}: BreakdownExplorerProps) {
  const [countryPage, setCountryPage] = useState(1);
  const [countrySearch, setCountrySearch] = useState("");
  const deferredCountrySearch = useDeferredValue(countrySearch);
  const geographyName = getGeographyName(geographyCode);
  const countryRecords =
    geographyCode === "CA"
      ? payload.dimensions.countryOfCitizenship
      : payload.dimensions.countryOfCitizenshipByGeo;
  const countryScope = geographyCode === "CA" ? "CA" : geographyCode;
  const provinceCountryBounds = getSourceBounds(payload.dimensions.countryOfCitizenshipByGeo);
  const country = aggregateRecords(countryRecords, startYear, endYear, countryScope, 10);
  const age = aggregateRecords(payload.dimensions.ageGroup, startYear, endYear, geographyCode, 8);
  const gender = aggregateRecords(payload.dimensions.gender, startYear, endYear, geographyCode, 6);
  const occupations = aggregateRecords(
    payload.dimensions.intendedOccupation,
    startYear,
    endYear,
    geographyCode,
    10,
  );

  const topCountry = country[0];
  const topAge = age[0];
  const topOccupation = occupations[0];
  const selectedRange = formatSelectedRange(startYear, endYear);
  const countryYearsShown = getSourceYearInfo(countryRecords, startYear, endYear, countryScope);
  const canadaCountryYearsShown = getSourceYearInfo(
    payload.dimensions.countryOfCitizenship,
    startYear,
    endYear,
    "CA",
  );
  const ageYearsShown = getSourceYearInfo(
    payload.dimensions.ageGroup,
    startYear,
    endYear,
    geographyCode,
  );
  const genderYearsShown = getSourceYearInfo(
    payload.dimensions.gender,
    startYear,
    endYear,
    geographyCode,
  );
  const occupationYearsShown = getSourceYearInfo(
    payload.dimensions.intendedOccupation,
    startYear,
    endYear,
    geographyCode,
  );
  const countryTitle =
    geographyCode === "CA"
      ? "Top citizenship countries"
      : `Top citizenship countries in ${geographyName}`;
  const countryDescription =
    geographyCode === "CA"
      ? "Canada-level permanent resident admissions by country of citizenship."
      : "Province/territory-level country of citizenship from the historical intended-destination source. Available source coverage is 2000-2015 only, so summed provinces should only be reconciled with Canada-level totals for the same years.";
  const countryEmptyMessage =
    geographyCode === "CA"
      ? "No country-of-citizenship records are available for the selected year range."
      : "Province-level country of citizenship is available only for 2000-2015 in the current official static source. This dashboard does not substitute Canada-level country data for a provincial selection.";
  const categoryYearsLabel = getCategoryYearInfo(payload.countryCategory, startYear, endYear);
  const categoryBounds = getSourceBounds(payload.countryCategory ?? []);
  const selectedRangeWithinCategoryBounds =
    startYear >= categoryBounds.min && endYear <= categoryBounds.max;
  const showCategoryColumns =
    geographyCode === "CA" &&
    selectedRangeWithinCategoryBounds &&
    categoryYearsLabel !== "No category source years in range";
  const provinceCountryCoverageLimited =
    geographyCode !== "CA" &&
    (startYear < provinceCountryBounds.min || endYear > provinceCountryBounds.max);
  const countryTableRows = useMemo(
    () =>
      aggregateCountryTableRows(
        countryRecords,
        payload.countryCategory,
        startYear,
        endYear,
        countryScope,
        showCategoryColumns,
      ),
    [
      countryRecords,
      countryScope,
      endYear,
      payload.countryCategory,
      showCategoryColumns,
      startYear,
    ],
  );
  const normalizedCountrySearch = deferredCountrySearch.trim().toLocaleLowerCase();
  const filteredCountryTableRows = useMemo(() => {
    if (!normalizedCountrySearch) return countryTableRows;
    return countryTableRows.filter((row) =>
      row.country.toLocaleLowerCase().includes(normalizedCountrySearch),
    );
  }, [countryTableRows, normalizedCountrySearch]);
  const countryPageCount = Math.max(
    1,
    Math.ceil(filteredCountryTableRows.length / COUNTRY_PAGE_SIZE),
  );
  const safeCountryPage = Math.min(countryPage, countryPageCount);
  const pagedCountryRows = filteredCountryTableRows.slice(
    (safeCountryPage - 1) * COUNTRY_PAGE_SIZE,
    safeCountryPage * COUNTRY_PAGE_SIZE,
  );
  const chartCards = [
    {
      id: "countryOfCitizenship",
      title: countryTitle,
      description: `${countryDescription} Values are summed across available source years inside the selected range. Source years used: ${countryYearsShown.sentence}. Visible rows summed total: ${formatCompactNumber(
        getTotal(country),
      )}.`,
      records: country,
      color: "#0f6b80",
      emptyMessage: countryEmptyMessage,
      labelWidth: undefined,
      labelMaxChars: undefined,
      minChartWidth: undefined,
      rowHeight: undefined,
    },
    ...DIMENSIONS.map((dimension) => {
      const records =
        dimension.key === "ageGroup" ? age : dimension.key === "gender" ? gender : occupations;

      return {
        id: dimension.key,
        title: dimension.title,
        description: `${dimension.description} Values are summed across available source years inside the selected range. Source years used: ${
          dimension.key === "ageGroup"
            ? ageYearsShown.sentence
            : dimension.key === "gender"
              ? genderYearsShown.sentence
              : occupationYearsShown.sentence
        }. Visible rows summed total: ${formatCompactNumber(getTotal(records))}.`,
        records,
        color: dimension.color,
        emptyMessage:
          "No source records are available for this breakdown in the selected year range.",
        labelWidth: dimension.key === "intendedOccupation" ? 252 : undefined,
        labelMaxChars: dimension.key === "intendedOccupation" ? 38 : undefined,
        minChartWidth: dimension.key === "intendedOccupation" ? 820 : undefined,
        rowHeight: dimension.key === "intendedOccupation" ? 42 : undefined,
      };
    }),
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
              Expanded immigration breakdowns
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">
              More ways to inspect permanent resident admissions
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              These breakdowns use official IRCC resources. Country of citizenship follows the
              selected geography only where the source supports it: Canada covers 2000 onward, while
              province/territory country data covers 2000-2015. Province totals will not add up to
              Canada-level all-years country totals when 2016-2025 is included. Age, gender, and
              intended occupation start in 2015 and follow the selected geography. Cards and charts
              sum all available source years within the selected range, not just the end year.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-950">
                Selected range: {selectedRange}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-950">
                Country years used: {countryYearsShown.label}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-950">
                Age/gender years used: {ageYearsShown.label}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-950">
                Occupation years used: {occupationYearsShown.label}
              </span>
            </div>
            {provinceCountryCoverageLimited && (
              <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>
                  Province/territory country-of-citizenship data is available only for{" "}
                  {provinceCountryBounds.min}-{provinceCountryBounds.max}. For the selected range{" "}
                  {selectedRange}, {geographyName} country rows use {countryYearsShown.label}, while
                  Canada-level country rows use {canadaCountryYearsShown.label}. Province totals
                  should only be reconciled with Canada totals over the overlapping source years.
                </p>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Updated {formatSourceDate(payload.metadata.last_updated)}
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <UsersRound className="h-5 w-5 text-lake dark:text-wheat" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Top citizenship country in {geographyName}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
              {topCountry?.label ?? "N/A"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatSourceLine(topCountry?.value, countryYearsShown)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <Languages className="h-5 w-5 text-maple dark:text-wheat" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Largest age group in {getGeographyName(geographyCode)}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
              {topAge?.label ?? "N/A"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatSourceLine(topAge?.value, ageYearsShown)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <BriefcaseBusiness className="h-5 w-5 text-spruce dark:text-wheat" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Top intended occupation
            </p>
            <p className="mt-1 line-clamp-2 text-lg font-semibold text-ink dark:text-white">
              {topOccupation?.label ?? "N/A"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatSourceLine(topOccupation?.value, occupationYearsShown)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {chartCards.map((chart) => (
          <BreakdownBarChart
            key={chart.id}
            title={chart.title}
            description={chart.description}
            records={chart.records}
            color={chart.color}
            emptyMessage={chart.emptyMessage}
            labelWidth={chart.labelWidth}
            labelMaxChars={chart.labelMaxChars}
            minChartWidth={chart.minChartWidth}
            rowHeight={chart.rowHeight}
          />
        ))}
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-white">
              Country of citizenship table
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Permanent resident admissions by country for the selected geography and available
              source years. Total uses country source years: {countryYearsShown.label}.
              {showCategoryColumns
                ? ` Category columns are Canada-level and use category source years: ${categoryYearsLabel}.`
                : geographyCode === "CA"
                  ? ` Immigration-category columns are hidden unless the selected range is fully inside the category source range ${categoryBounds.min}-${categoryBounds.max}.`
                  : " Immigration-category columns are only available for Canada-level country rows from 2015 onward."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onClick={() => setCountryPage((page) => Math.max(1, page - 1))}
              disabled={safeCountryPage <= 1}
              aria-label="Previous permanent resident country page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-24 text-center">
              Page {safeCountryPage} of {countryPageCount}
            </span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onClick={() => setCountryPage((page) => Math.min(countryPageCount, page + 1))}
              disabled={safeCountryPage >= countryPageCount}
              aria-label="Next permanent resident country page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block max-w-md flex-1">
            <span className="sr-only">Search permanent resident country table</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={countrySearch}
              onChange={(event) => {
                setCountrySearch(event.target.value);
                setCountryPage(1);
              }}
              placeholder="Search country"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm text-ink outline-none transition focus:border-lake focus:ring-2 focus:ring-lake/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {countrySearch && (
              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => setCountrySearch("")}
                aria-label="Clear permanent resident country search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredCountryTableRows.length} of {countryTableRows.length} countries
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[740px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                <th className="w-16 border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                  Rank
                </th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                  Country
                </th>
                {showCategoryColumns &&
                  IMMIGRATION_CATEGORY_COLUMNS.map((category) => (
                    <th
                      key={category}
                      className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800"
                    >
                      {category}
                    </th>
                  ))}
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedCountryRows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                    colSpan={showCategoryColumns ? IMMIGRATION_CATEGORY_COLUMNS.length + 3 : 3}
                  >
                    {countrySearch.trim()
                      ? `No countries match "${countrySearch.trim()}".`
                      : "No country-of-citizenship records are available for the selected range."}
                  </td>
                </tr>
              ) : (
                pagedCountryRows.map((row, index) => (
                  <tr key={row.country} className="text-slate-700 dark:text-slate-200">
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-500 tabular-nums dark:border-slate-800 dark:text-slate-400">
                      #{(safeCountryPage - 1) * COUNTRY_PAGE_SIZE + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                      {row.country}
                    </td>
                    {showCategoryColumns &&
                      IMMIGRATION_CATEGORY_COLUMNS.map((category) => (
                        <td
                          key={category}
                          className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800"
                        >
                          {row[category] ? formatPopulation(row[category]) : "-"}
                        </td>
                      ))}
                    <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold tabular-nums text-ink dark:border-slate-800 dark:text-white">
                      {formatPopulation(row.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Showing {pagedCountryRows.length ? (safeCountryPage - 1) * COUNTRY_PAGE_SIZE + 1 : 0}-
          {Math.min(safeCountryPage * COUNTRY_PAGE_SIZE, filteredCountryTableRows.length)} of{" "}
          {filteredCountryTableRows.length} matching countries.
        </p>
      </article>

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-panel dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h2 className="font-semibold text-ink dark:text-white">Next data modules</h2>
        <p className="mt-2">
          Salary, net worth, full mother-tongue, education, and citizenship-grant views should be
          added as separate Statistics Canada and IRCC modules. They use different source systems
          and definitions, so they need their own validation instead of being folded into the
          permanent-resident admissions dataset.
        </p>
      </div>
    </section>
  );
}
