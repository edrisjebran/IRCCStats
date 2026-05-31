import { useDeferredValue, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  IdCard,
  Info,
  Landmark,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { BreakdownBarChart } from "../charts/BreakdownBarChart";
import { TemporaryResidentsStackedBarChart } from "../charts/TemporaryResidentsStackedBarChart";
import { TEMPORARY_RESIDENT_COLORS } from "../../data/temporaryResidents";
import { getGeographyName } from "../../data/geography";
import {
  formatCompactNumber,
  formatDecimal,
  formatPopulation,
  formatSourceDate,
} from "../../lib/formatters";
import { getAvailableYearRangeLabel, getYearRangeLabel } from "../../lib/sourceYears";
import type {
  GeographyCode,
  PopulationYearRecord,
  TemporaryResidentRecord,
  TemporaryResidentStream,
  TemporaryResidentsPayload,
} from "../../types/datasets";

const COUNTRY_PAGE_SIZE = 20;

interface TemporaryResidentsExplorerProps {
  payload: TemporaryResidentsPayload;
  populationRecords: PopulationYearRecord[];
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}

function filterRecords(
  records: TemporaryResidentRecord[],
  geographyCode: GeographyCode,
  startYear: number,
  endYear: number,
) {
  return records.filter(
    (record) => record.geo === geographyCode && record.year >= startYear && record.year <= endYear,
  );
}

function toChartRows(
  records: TemporaryResidentRecord[],
  streams: TemporaryResidentsPayload["streams"],
) {
  const byYear = new Map<number, Record<string, number>>();
  for (const record of records) {
    const row = byYear.get(record.year) ?? { year: record.year };
    row[record.stream] = (row[record.stream] ?? 0) + record.value;
    byYear.set(record.year, row);
  }

  return [...byYear.values()]
    .map((row) => {
      for (const stream of streams) row[stream] = row[stream] ?? 0;
      return row as Record<(typeof streams)[number] | "year", number>;
    })
    .sort((a, b) => a.year - b.year);
}

function sumRecords(records: TemporaryResidentRecord[]) {
  return records.reduce((sum, record) => sum + record.value, 0);
}

function getLargestStream(records: TemporaryResidentRecord[]) {
  const totals = new Map<string, number>();
  for (const record of records) {
    totals.set(record.stream, (totals.get(record.stream) ?? 0) + record.value);
  }
  return [...totals.entries()]
    .map(([stream, value]) => ({ stream, value }))
    .sort((a, b) => b.value - a.value)
    .at(0);
}

function getLatestYearTotal(records: TemporaryResidentRecord[]) {
  const latestYear = Math.max(...records.map((record) => record.year));
  if (!Number.isFinite(latestYear)) return undefined;
  return {
    year: latestYear,
    value: sumRecords(records.filter((record) => record.year === latestYear)),
  };
}

function aggregateCountryRecords(
  records: TemporaryResidentsPayload["countryOfCitizenship"],
  startYear: number,
  endYear: number,
  limit: number,
) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (record.year < startYear || record.year > endYear) continue;
    totals.set(record.country, (totals.get(record.country) ?? 0) + record.value);
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((record) => record.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

type CountryBreakdownRow = Record<TemporaryResidentStream, number> & {
  country: string;
  total: number;
};

function aggregateCountryBreakdownRows(
  records: TemporaryResidentsPayload["countryOfCitizenship"],
  streams: TemporaryResidentsPayload["streams"],
  startYear: number,
  endYear: number,
) {
  const totals = new Map<string, CountryBreakdownRow>();
  for (const record of records) {
    if (record.year < startYear || record.year > endYear) continue;
    const row =
      totals.get(record.country) ??
      ({
        country: record.country,
        total: 0,
        "Study permit holders": 0,
        "IMP work permit holders": 0,
        "TFWP work permit holders": 0,
      } satisfies CountryBreakdownRow);

    row[record.stream] += record.value;
    row.total += record.value;
    totals.set(record.country, row);
  }

  return [...totals.values()]
    .filter((record) => record.total > 0)
    .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country))
    .map((record) => {
      for (const stream of streams) record[stream] = record[stream] ?? 0;
      return record;
    });
}

function getCountrySourceYears(
  records: TemporaryResidentsPayload["countryOfCitizenship"],
  startYear: number,
  endYear: number,
) {
  const years = [
    ...new Set(
      records
        .filter((record) => record.year >= startYear && record.year <= endYear)
        .map((record) => record.year),
    ),
  ];
  if (!years.length) return "No source years in range";
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first}-${last}`;
}

function getSourceBounds(records: Array<{ year: number }>) {
  const years = records.map((record) => record.year);
  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

export function TemporaryResidentsExplorer({
  payload,
  populationRecords,
  geographyCode,
  startYear,
  endYear,
}: TemporaryResidentsExplorerProps) {
  const [countryPage, setCountryPage] = useState(1);
  const [countrySearch, setCountrySearch] = useState("");
  const deferredCountrySearch = useDeferredValue(countrySearch);
  const geographyName = getGeographyName(geographyCode);
  const filteredRecords = filterRecords(payload.series, geographyCode, startYear, endYear);
  const chartRows = toChartRows(filteredRecords, payload.streams);
  const sourceYearsLabel = getYearRangeLabel(filteredRecords);
  const fullSourceRange = getAvailableYearRangeLabel(payload.series);
  const sourceBounds = getSourceBounds(payload.series);
  const selectedOutsideSourceRange = endYear < sourceBounds.min || startYear > sourceBounds.max;
  const selectedPartlyOutsideSourceRange =
    !selectedOutsideSourceRange && (startYear < sourceBounds.min || endYear > sourceBounds.max);
  const total = sumRecords(filteredRecords);
  const latest = getLatestYearTotal(filteredRecords);
  const largest = getLargestStream(filteredRecords);
  const populationForLatest = latest
    ? populationRecords.find((record) => record.year === latest.year)
    : undefined;
  const latestRate =
    latest && populationForLatest
      ? (latest.value / populationForLatest[geographyCode]) * 1000
      : undefined;

  const streamTotals = payload.streams
    .map((stream) => ({
      stream,
      value: sumRecords(filteredRecords.filter((record) => record.stream === stream)),
    }))
    .sort((a, b) => b.value - a.value);
  const topCountries = aggregateCountryRecords(
    payload.countryOfCitizenship,
    startYear,
    endYear,
    10,
  );
  const countryYearsLabel = getCountrySourceYears(payload.countryOfCitizenship, startYear, endYear);
  const countryBreakdownRows = useMemo(
    () =>
      aggregateCountryBreakdownRows(
        payload.countryOfCitizenship,
        payload.streams,
        startYear,
        endYear,
      ),
    [endYear, payload.countryOfCitizenship, payload.streams, startYear],
  );
  const normalizedCountrySearch = deferredCountrySearch.trim().toLocaleLowerCase();
  const filteredCountryBreakdownRows = useMemo(() => {
    if (!normalizedCountrySearch) return countryBreakdownRows;
    return countryBreakdownRows.filter((row) =>
      row.country.toLocaleLowerCase().includes(normalizedCountrySearch),
    );
  }, [countryBreakdownRows, normalizedCountrySearch]);
  const countryPageCount = Math.max(
    1,
    Math.ceil(filteredCountryBreakdownRows.length / COUNTRY_PAGE_SIZE),
  );
  const safeCountryPage = Math.min(countryPage, countryPageCount);
  const pagedCountryRows = filteredCountryBreakdownRows.slice(
    (safeCountryPage - 1) * COUNTRY_PAGE_SIZE,
    safeCountryPage * COUNTRY_PAGE_SIZE,
  );

  const cards = [
    {
      label: `${geographyName} selected-range total`,
      value: filteredRecords.length ? formatCompactNumber(total) : "N/A",
      note: filteredRecords.length
        ? `Permit-holder rows summed across ${sourceYearsLabel}`
        : "No source years in range",
      icon: UsersRound,
    },
    {
      label: "Latest temporary resident year",
      value: latest ? formatCompactNumber(latest.value) : "N/A",
      note: latest ? `Total in ${latest.year}` : "No source year in selected range",
      icon: IdCard,
    },
    {
      label: "Largest temporary stream",
      value: largest?.stream ?? "N/A",
      note: largest
        ? `${formatPopulation(largest.value)} across selected source years`
        : "No stream record",
      icon: GraduationCap,
    },
    {
      label: "Permit-effective rows per 1,000",
      value: latestRate !== undefined ? formatDecimal(latestRate) : "N/A",
      note: latest
        ? `${geographyName} annual permit-effective rows for ${latest.year}`
        : "Requires temporary and population records",
      icon: Landmark,
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
              Temporary residents
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">
              Study and work permit holder context
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Uses official IRCC temporary resident monthly update resources for study permit
              holders, International Mobility Program work permit holders, and Temporary Foreign
              Worker Program work permit holders. Monthly rows are summed into annual values by the
              selected geography and Canada-level country of citizenship. These are counts by the
              year in which permits became effective, not a running cumulative stock. Full source
              range: {fullSourceRange}; the current static source has no records before{" "}
              {sourceBounds.min}.
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Updated {formatSourceDate(payload.metadata.last_updated)}
          </p>
        </div>

        {(selectedOutsideSourceRange || selectedPartlyOutsideSourceRange) && (
          <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              {selectedOutsideSourceRange
                ? `The selected range ${startYear}-${endYear} does not overlap the temporary-resident source range ${fullSourceRange}.`
                : `The selected range extends outside the temporary-resident source range. Using available source years: ${sourceYearsLabel}.`}{" "}
              Older temporary-resident history may exist in separate IRCC archival publications, but
              it is not in this structured monthly update dataset.
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <Icon className="h-5 w-5 text-lake dark:text-wheat" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-1 break-words text-xl font-semibold text-ink dark:text-white">
                  {card.value}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {card.note}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <TemporaryResidentsStackedBarChart
        records={chartRows}
        streams={payload.streams}
        geographyName={geographyName}
        sourceYearsLabel={sourceYearsLabel}
      />

      <BreakdownBarChart
        title="Top countries of citizenship"
        description={`Canada-level temporary resident permit-holder rows across study, IMP work, and TFWP work streams. Source years used: ${countryYearsLabel}. Values are summed across available source years inside the selected range.`}
        records={topCountries}
        color="#0f6b80"
        emptyMessage={`No Canada-level temporary resident country-of-citizenship records are available for the selected range. The current structured source starts in ${sourceBounds.min}.`}
      />

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-white">
              Country of citizenship by temporary stream
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Canada-level country rows split by study permit, IMP work permit, and TFWP work permit
              streams. Source years used: {countryYearsLabel}. Rows are sorted by selected range
              total.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onClick={() => setCountryPage((page) => Math.max(1, page - 1))}
              disabled={safeCountryPage <= 1}
              aria-label="Previous country page"
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
              aria-label="Next country page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block max-w-md flex-1">
            <span className="sr-only">Search temporary resident country table</span>
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
                aria-label="Clear temporary resident country search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredCountryBreakdownRows.length} of {countryBreakdownRows.length} countries
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                <th className="w-16 border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                  Rank
                </th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                  Country
                </th>
                {payload.streams.map((stream) => (
                  <th
                    key={stream}
                    className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800"
                  >
                    {stream}
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
                    colSpan={payload.streams.length + 3}
                  >
                    {countrySearch.trim()
                      ? `No countries match "${countrySearch.trim()}".`
                      : `No country-of-citizenship records are available for the selected range. The current structured source starts in ${sourceBounds.min}.`}
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
                    {payload.streams.map((stream) => (
                      <td
                        key={stream}
                        className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800"
                      >
                        {row[stream] ? formatPopulation(row[stream]) : "-"}
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
          {Math.min(safeCountryPage * COUNTRY_PAGE_SIZE, filteredCountryBreakdownRows.length)} of{" "}
          {filteredCountryBreakdownRows.length} matching countries.
        </p>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        {streamTotals.map((record) => (
          <article
            key={record.stream}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              className="h-1.5 rounded-full"
              style={{ backgroundColor: TEMPORARY_RESIDENT_COLORS[record.stream] }}
            />
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              {record.stream}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">
              {record.value ? formatPopulation(record.value) : "N/A"}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Selected geography and available source years only.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
