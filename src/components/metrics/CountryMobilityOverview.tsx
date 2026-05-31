import { useDeferredValue, useMemo, useState } from "react";
import { Info, Search, X } from "lucide-react";
import { TEMPORARY_RESIDENT_COLORS } from "../../data/temporaryResidents";
import { getGeographyName } from "../../data/geography";
import { formatCompactNumber, formatPopulation, formatSignedNumber } from "../../lib/formatters";
import { getYearRangeLabel } from "../../lib/sourceYears";
import type {
  GeographyCode,
  ImmigrationBreakdownRecord,
  PopulationComponentsPayload,
  PopulationGrowthComponent,
  TemporaryResidentStream,
  TemporaryResidentsPayload,
} from "../../types/datasets";

const ROW_LIMIT = 12;

interface CountryMobilityOverviewProps {
  permanentResidentRecords: ImmigrationBreakdownRecord[];
  temporaryResidents: TemporaryResidentsPayload;
  populationComponents: PopulationComponentsPayload;
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}

type TemporaryCountryRow = Partial<Record<TemporaryResidentStream, number>> & {
  country: string;
  temporaryTotal: number;
};

interface CombinedCountryRow {
  country: string;
  permanentTotal: number;
  temporaryTotal: number;
  combinedTotal: number;
}

function formatShare(value: number, total: number) {
  if (total <= 0) return "N/A";
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / total);
}

function getComponentStartYear(startYear: number, endYear: number) {
  return startYear === endYear ? startYear : startYear + 1;
}

function sumPopulationComponent(
  payload: PopulationComponentsPayload,
  geographyCode: GeographyCode,
  startYear: number,
  endYear: number,
  component: PopulationGrowthComponent,
) {
  const componentStartYear = getComponentStartYear(startYear, endYear);
  return payload.series
    .filter(
      (record) =>
        record.geo === geographyCode &&
        record.component === component &&
        record.year >= componentStartYear &&
        record.year <= endYear,
    )
    .reduce((sum, record) => sum + record.value, 0);
}

function aggregatePermanentResidents(
  records: ImmigrationBreakdownRecord[],
  startYear: number,
  endYear: number,
) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (record.year < startYear || record.year > endYear) continue;
    totals.set(record.label, (totals.get(record.label) ?? 0) + record.value);
  }
  return totals;
}

function aggregateTemporaryResidents(
  records: TemporaryResidentsPayload["countryOfCitizenship"],
  streams: TemporaryResidentStream[],
  startYear: number,
  endYear: number,
) {
  const totals = new Map<string, TemporaryCountryRow>();

  for (const record of records) {
    if (record.year < startYear || record.year > endYear) continue;
    const row = totals.get(record.country) ?? {
      country: record.country,
      temporaryTotal: 0,
    };
    row[record.stream] = (row[record.stream] ?? 0) + record.value;
    row.temporaryTotal += record.value;
    totals.set(record.country, row);
  }

  return [...totals.values()]
    .map((record) => {
      for (const stream of streams) record[stream] = record[stream] ?? 0;
      return record;
    })
    .filter((record) => record.temporaryTotal > 0)
    .sort((a, b) => b.temporaryTotal - a.temporaryTotal || a.country.localeCompare(b.country));
}

function combineCountryRows(
  permanentTotals: Map<string, number>,
  temporaryRows: TemporaryCountryRow[],
) {
  const rows = new Map<string, CombinedCountryRow>();

  for (const [country, permanentTotal] of permanentTotals.entries()) {
    rows.set(country, {
      country,
      permanentTotal,
      temporaryTotal: 0,
      combinedTotal: permanentTotal,
    });
  }

  for (const temporaryRow of temporaryRows) {
    const existing = rows.get(temporaryRow.country) ?? {
      country: temporaryRow.country,
      permanentTotal: 0,
      temporaryTotal: 0,
      combinedTotal: 0,
    };
    existing.temporaryTotal = temporaryRow.temporaryTotal;
    existing.combinedTotal = existing.permanentTotal + existing.temporaryTotal;
    rows.set(temporaryRow.country, existing);
  }

  return [...rows.values()]
    .filter((record) => record.combinedTotal > 0)
    .sort((a, b) => b.combinedTotal - a.combinedTotal || a.country.localeCompare(b.country));
}

function getCountrySourceYears(
  records: Array<{ year: number }>,
  startYear: number,
  endYear: number,
) {
  return getYearRangeLabel(
    records.filter((record) => record.year >= startYear && record.year <= endYear),
  );
}

export function CountryMobilityOverview({
  permanentResidentRecords,
  temporaryResidents,
  populationComponents,
  geographyCode,
  startYear,
  endYear,
}: CountryMobilityOverviewProps) {
  const [search, setSearch] = useState("");
  const [showAllTemporary, setShowAllTemporary] = useState(false);
  const [showAllCombined, setShowAllCombined] = useState(false);
  const geographyName = getGeographyName(geographyCode);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
  const netTemporaryResidents = sumPopulationComponent(
    populationComponents,
    geographyCode,
    startYear,
    endYear,
    "Net non-permanent residents",
  );
  const temporaryRows = useMemo(
    () =>
      aggregateTemporaryResidents(
        temporaryResidents.countryOfCitizenship,
        temporaryResidents.streams,
        startYear,
        endYear,
      ),
    [endYear, startYear, temporaryResidents.countryOfCitizenship, temporaryResidents.streams],
  );
  const permanentTotals = useMemo(
    () => aggregatePermanentResidents(permanentResidentRecords, startYear, endYear),
    [endYear, permanentResidentRecords, startYear],
  );
  const combinedRows = useMemo(
    () => combineCountryRows(permanentTotals, temporaryRows),
    [permanentTotals, temporaryRows],
  );

  const filteredTemporaryRows = normalizedSearch
    ? temporaryRows.filter((record) =>
        record.country.toLocaleLowerCase().includes(normalizedSearch),
      )
    : temporaryRows;
  const filteredCombinedRows = normalizedSearch
    ? combinedRows.filter((record) => record.country.toLocaleLowerCase().includes(normalizedSearch))
    : combinedRows;
  const visibleTemporaryRows = showAllTemporary
    ? filteredTemporaryRows
    : filteredTemporaryRows.slice(0, ROW_LIMIT);
  const visibleCombinedRows = showAllCombined
    ? filteredCombinedRows
    : filteredCombinedRows.slice(0, ROW_LIMIT);

  const temporarySourceYears = getCountrySourceYears(
    temporaryResidents.countryOfCitizenship,
    startYear,
    endYear,
  );
  const permanentSourceYears = getCountrySourceYears(permanentResidentRecords, startYear, endYear);
  const temporaryTotal = temporaryRows.reduce((sum, record) => sum + record.temporaryTotal, 0);
  const permanentTotal = [...permanentTotals.values()].reduce((sum, value) => sum + value, 0);
  const combinedTotal = combinedRows.reduce((sum, record) => sum + record.combinedTotal, 0);
  const topTemporaryCountry = temporaryRows[0];
  const topCombinedCountry = combinedRows[0];

  return (
    <section className="flex flex-col gap-5">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
              Temporary residents by country
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink dark:text-white">
              Permit-row country breakdown
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {geographyName} net non-permanent-resident change is shown beside Canada-level IRCC
              temporary resident country rows. The current StatCan net component is not split by
              country, so the table uses permit-holder rows by country of citizenship. Temporary
              source years shown: {temporarySourceYears}.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[660px] lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500 dark:text-slate-400">
                {geographyName} net temporary residents
              </p>
              <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
                {formatSignedNumber(netTemporaryResidents)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500 dark:text-slate-400">Permit-row total</p>
              <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
                {temporaryRows.length ? formatCompactNumber(temporaryTotal) : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500 dark:text-slate-400">Top permit country</p>
              <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
                {topTemporaryCountry?.country ?? "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/30">
              <p className="text-amber-900 dark:text-amber-100">Country-level net</p>
              <p className="mt-1 text-xl font-semibold text-amber-950 dark:text-amber-50">
                Unavailable
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Net temporary-resident change is available here only as a StatCan geography-level
            component. A country-level net would require official stock snapshots by country at two
            points in time, or an official country-level net-change table; this permit file does not
            provide that.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block max-w-md flex-1">
            <span className="sr-only">Search country mobility tables</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setShowAllTemporary(false);
                setShowAllCombined(false);
              }}
              placeholder="Search country"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm text-ink outline-none transition focus:border-lake focus:ring-2 focus:ring-lake/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => setSearch("")}
                aria-label="Clear country search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredTemporaryRows.length} of {temporaryRows.length} temporary-resident countries
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
                {temporaryResidents.streams.map((stream) => (
                  <th
                    key={stream}
                    className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: TEMPORARY_RESIDENT_COLORS[stream] }}
                      />
                      {stream.replace(" permit holders", "")}
                    </span>
                  </th>
                ))}
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Permit-row total
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleTemporaryRows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                    colSpan={temporaryResidents.streams.length + 4}
                  >
                    {search.trim()
                      ? `No countries match "${search.trim()}".`
                      : "No temporary-resident country records are available for the selected range."}
                  </td>
                </tr>
              ) : (
                visibleTemporaryRows.map((record, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={record.country} className="text-slate-700 dark:text-slate-200">
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500 tabular-nums dark:border-slate-800 dark:text-slate-400">
                        #{rank}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                        {record.country}
                      </td>
                      {temporaryResidents.streams.map((stream) => (
                        <td
                          key={stream}
                          className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800"
                        >
                          {formatPopulation(record[stream] ?? 0)}
                        </td>
                      ))}
                      <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold tabular-nums text-ink dark:border-slate-800 dark:text-white">
                        {formatPopulation(record.temporaryTotal)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatShare(record.temporaryTotal, temporaryTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredTemporaryRows.length > ROW_LIMIT && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Showing {visibleTemporaryRows.length} of {filteredTemporaryRows.length} matching
              countries.
            </p>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              onClick={() => setShowAllTemporary((value) => !value)}
            >
              {showAllTemporary ? "Show top 12" : "Show all temporary countries"}
            </button>
          </div>
        )}
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
              Permanent + temporary country view
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink dark:text-white">
              Combined country-of-citizenship activity
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Canada-level permanent resident admissions plus temporary permit-holder rows by
              country of citizenship. Permanent source years: {permanentSourceYears}; temporary
              source years: {temporarySourceYears}. This is a combined activity view, not a unique
              person stock.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500 dark:text-slate-400">Combined total</p>
              <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
                {combinedRows.length ? formatCompactNumber(combinedTotal) : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500 dark:text-slate-400">Permanent / temporary</p>
              <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
                {formatCompactNumber(permanentTotal)} / {formatCompactNumber(temporaryTotal)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500 dark:text-slate-400">Top country</p>
              <p className="mt-1 text-xl font-semibold text-ink dark:text-white">
                {topCombinedCountry?.country ?? "N/A"}
              </p>
            </div>
          </div>
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
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Permanent admissions
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Temporary permit rows
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Combined
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleCombinedRows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                    colSpan={6}
                  >
                    {search.trim()
                      ? `No countries match "${search.trim()}".`
                      : "No permanent or temporary country records are available for the selected range."}
                  </td>
                </tr>
              ) : (
                visibleCombinedRows.map((record, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={record.country} className="text-slate-700 dark:text-slate-200">
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500 tabular-nums dark:border-slate-800 dark:text-slate-400">
                        #{rank}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                        {record.country}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatPopulation(record.permanentTotal)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatPopulation(record.temporaryTotal)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold tabular-nums text-ink dark:border-slate-800 dark:text-white">
                        {formatPopulation(record.combinedTotal)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatShare(record.combinedTotal, combinedTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredCombinedRows.length > ROW_LIMIT && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Showing {visibleCombinedRows.length} of {filteredCombinedRows.length} matching
              countries.
            </p>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              onClick={() => setShowAllCombined((value) => !value)}
            >
              {showAllCombined ? "Show top 12" : "Show all combined countries"}
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
