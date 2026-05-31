import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { formatPopulation } from "../../lib/formatters";
import { getYearRangeLabel } from "../../lib/sourceYears";
import type { ImmigrationBreakdownRecord } from "../../types/datasets";

const COUNTRY_ROW_LIMIT = 10;

interface PermanentResidentCountryOverviewProps {
  records: ImmigrationBreakdownRecord[];
  startYear: number;
  endYear: number;
}

function formatShare(value: number, total: number) {
  if (total <= 0) return "N/A";
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / total);
}

export function PermanentResidentCountryOverview({
  records,
  startYear,
  endYear,
}: PermanentResidentCountryOverviewProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const sourceRecords = useMemo(
    () => records.filter((record) => record.year >= startYear && record.year <= endYear),
    [endYear, records, startYear],
  );
  const sourceYearsLabel = getYearRangeLabel(sourceRecords);
  const countryRows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of sourceRecords) {
      totals.set(record.label, (totals.get(record.label) ?? 0) + record.value);
    }

    return [...totals.entries()]
      .map(([country, value]) => ({ country, value }))
      .filter((record) => record.value > 0)
      .sort((a, b) => b.value - a.value || a.country.localeCompare(b.country));
  }, [sourceRecords]);

  const total = countryRows.reduce((sum, record) => sum + record.value, 0);
  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
  const filteredRows = normalizedSearch
    ? countryRows.filter((record) => record.country.toLocaleLowerCase().includes(normalizedSearch))
    : countryRows;
  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, COUNTRY_ROW_LIMIT);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
            Permanent resident admissions by country
          </p>
          <h2 className="mt-2 text-lg font-semibold text-ink dark:text-white">
            Country of citizenship breakdown
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Canada-level permanent resident admissions by country of citizenship, summed across
            available source years inside the selected range. Source years shown: {sourceYearsLabel}
            . Country-source totals can differ slightly from category totals because they come from
            separate IRCC resources.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-slate-500 dark:text-slate-400">Country-source total</p>
          <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">
            {countryRows.length ? formatPopulation(total) : "N/A"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block max-w-md flex-1">
          <span className="sr-only">Search permanent resident country overview</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowAll(false);
            }}
            placeholder="Search country"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm text-ink outline-none transition focus:border-lake focus:ring-2 focus:ring-lake/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={() => setSearch("")}
              aria-label="Clear permanent resident country overview search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filteredRows.length} of {countryRows.length} countries
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
              <th className="w-16 border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                Rank
              </th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                Country
              </th>
              <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                Admissions
              </th>
              <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={4}
                >
                  {search.trim()
                    ? `No countries match "${search.trim()}".`
                    : "No country-of-citizenship records are available for the selected range."}
                </td>
              </tr>
            ) : (
              visibleRows.map((record, index) => {
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
                      {formatPopulation(record.value)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                      {formatShare(record.value, total)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > COUNTRY_ROW_LIMIT && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Showing {visibleRows.length} of {filteredRows.length} matching countries.
          </p>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? "Show top 10" : "Show all countries"}
          </button>
        </div>
      )}
    </article>
  );
}
