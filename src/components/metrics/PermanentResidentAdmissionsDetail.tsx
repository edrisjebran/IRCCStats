import { useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_DESCRIPTIONS,
  IMMIGRATION_CATEGORIES,
} from "../../data/categories";
import { formatCompactNumber, formatPopulation, formatSignedNumber } from "../../lib/formatters";
import type { ImmigrationCategory, ImmigrationYearRecord } from "../../types/datasets";

interface PermanentResidentAdmissionsDetailProps {
  records: ImmigrationYearRecord[];
  sourceYearsLabel: string;
}

const YEAR_ROW_LIMIT = 5;

function sumCategory(records: ImmigrationYearRecord[], category: ImmigrationCategory) {
  return records.reduce((sum, record) => sum + record[category], 0);
}

function getShare(value: number, total: number) {
  if (total <= 0) return "N/A";
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / total);
}

function getPeakYear(records: ImmigrationYearRecord[]) {
  return records.reduce<ImmigrationYearRecord | undefined>(
    (peak, record) => (!peak || record.Total > peak.Total ? record : peak),
    undefined,
  );
}

function getPreviousRecord(records: ImmigrationYearRecord[], latest: ImmigrationYearRecord) {
  return records.find((record) => record.year === latest.year - 1);
}

export function PermanentResidentAdmissionsDetail({
  records,
  sourceYearsLabel,
}: PermanentResidentAdmissionsDetailProps) {
  const [showAllYears, setShowAllYears] = useState(false);
  const total = records.reduce((sum, record) => sum + record.Total, 0);
  const latest = records.at(-1);
  const previous = latest ? getPreviousRecord(records, latest) : undefined;
  const peak = getPeakYear(records);
  const categoryTotals = IMMIGRATION_CATEGORIES.map((category) => ({
    category,
    total: sumCategory(records, category),
    latest: latest?.[category],
  })).sort((a, b) => b.total - a.total);
  const largestCategory = categoryTotals[0];
  const latestChange = latest && previous ? latest.Total - previous.Total : null;
  const yearRows = [...records].reverse();
  const visibleYearRows = showAllYears ? yearRows : yearRows.slice(0, YEAR_ROW_LIMIT);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
            Permanent resident admissions detail
          </p>
          <h2 className="mt-2 text-lg font-semibold text-ink dark:text-white">
            Category mix and selected-range totals
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Canada-level permanent resident admissions by broad category. These figures are
            admissions flows, not population stock. Source years shown: {sourceYearsLabel}.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-slate-500 dark:text-slate-400">Selected-range total</p>
          <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">
            {records.length ? formatPopulation(total) : "N/A"}
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-4 flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No permanent resident admissions records are available for the selected range.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Latest year</p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                {latest ? formatPopulation(latest.Total) : "N/A"}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {latest
                  ? `${latest.year}${latestChange !== null ? `, ${formatSignedNumber(latestChange)} vs prior selected year` : ""}`
                  : "No latest record"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Peak selected year</p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                {peak ? String(peak.year) : "N/A"}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {peak ? `${formatPopulation(peak.Total)} admissions` : "No peak record"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Largest category</p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                {largestCategory?.category ?? "N/A"}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {largestCategory
                  ? `${getShare(largestCategory.total, total)} of selected-range admissions`
                  : "No category record"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Years included</p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                {records.length}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Source years: {sourceYearsLabel}
              </p>
            </div>
          </div>

          <div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              {categoryTotals.map((record) => (
                <div
                  key={record.category}
                  className="h-full"
                  style={{
                    width: `${total > 0 ? (record.total / total) * 100 : 0}%`,
                    backgroundColor: CATEGORY_COLORS[record.category],
                  }}
                  title={`${record.category}: ${getShare(record.total, total)}`}
                />
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {categoryTotals.map((record) => (
                <div
                  key={record.category}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[record.category] }}
                    />
                    <p className="font-semibold text-ink dark:text-white">{record.category}</p>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-ink dark:text-white">
                    {formatCompactNumber(record.total)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {getShare(record.total, total)} of selected range. Latest year:{" "}
                    {record.latest !== undefined ? formatPopulation(record.latest) : "N/A"}.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {CATEGORY_DESCRIPTIONS[record.category]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[620px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                  <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                    Category
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Selected-range total
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Share
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Latest year
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryTotals.map((record) => (
                  <tr key={record.category} className="text-slate-700 dark:text-slate-200">
                    <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[record.category] }}
                        />
                        {record.category}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                      {formatPopulation(record.total)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                      {getShare(record.total, total)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                      {record.latest !== undefined ? formatPopulation(record.latest) : "N/A"}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-ink dark:text-white">
                  <td className="px-3 py-3">Total</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPopulation(total)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">100%</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {latest ? formatPopulation(latest.Total) : "N/A"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-ink dark:text-white">Admissions by year</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {visibleYearRows.length} of {yearRows.length} source years.
                </p>
              </div>
              {yearRows.length > YEAR_ROW_LIMIT && (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
                  onClick={() => setShowAllYears((value) => !value)}
                >
                  {showAllYears ? "Show latest 5" : "Show all years"}
                </button>
              )}
            </div>
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                  <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                    Year
                  </th>
                  {IMMIGRATION_CATEGORIES.map((category) => (
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
                {visibleYearRows.map((record) => (
                  <tr key={record.year} className="text-slate-700 dark:text-slate-200">
                    <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                      {record.year}
                    </td>
                    {IMMIGRATION_CATEGORIES.map((category) => (
                      <td
                        key={category}
                        className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800"
                      >
                        {formatPopulation(record[category])}
                      </td>
                    ))}
                    <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold tabular-nums text-ink dark:border-slate-800 dark:text-white">
                      {formatPopulation(record.Total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}
