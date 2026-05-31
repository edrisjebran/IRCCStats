import { useMemo, useState } from "react";
import { BriefcaseBusiness, CircleDollarSign, Info, TrendingUp, UsersRound } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGeographyName } from "../../data/geography";
import {
  formatCurrency,
  formatDecimal,
  formatPopulation,
  formatSourceDate,
  formatPercent,
} from "../../lib/formatters";
import { getAvailableYearRangeLabel, getYearRangeLabel } from "../../lib/sourceYears";
import type {
  EconomicContextPayload,
  EconomicContextRecord,
  EconomicIndicator,
  GeographyCode,
  PopulationYearRecord,
} from "../../types/datasets";

const TABLE_ROW_LIMIT = 8;
const INCOME_INDICATOR: EconomicIndicator = "Median employment income";
const UNEMPLOYMENT_INDICATOR: EconomicIndicator = "Unemployment rate";
const EMPLOYMENT_INDICATOR: EconomicIndicator = "Employment rate";

interface EconomicContextExplorerProps {
  payload: EconomicContextPayload;
  populationRecords: PopulationYearRecord[];
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}

interface AnnualEconomicRow {
  year: number;
  income?: number;
  unemploymentRate?: number;
  employmentRate?: number;
  population?: number;
}

function formatRate(value: number | undefined) {
  return value === undefined ? "N/A" : `${formatDecimal(value)}%`;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

function getIndicatorRecords(
  records: EconomicContextRecord[],
  geographyCode: GeographyCode,
  indicator: EconomicIndicator,
  startYear: number,
  endYear: number,
) {
  return records
    .filter(
      (record) =>
        record.geo === geographyCode &&
        record.indicator === indicator &&
        record.year >= startYear &&
        record.year <= endYear,
    )
    .sort((a, b) => a.year - b.year);
}

function getLatestRecord<T extends { year: number }>(records: T[]) {
  return records.at(-1);
}

function getIndicatorSourceRange(
  records: EconomicContextRecord[],
  geographyCode: GeographyCode,
  indicator: EconomicIndicator,
) {
  return getAvailableYearRangeLabel(
    records.filter((record) => record.geo === geographyCode && record.indicator === indicator),
  );
}

function getSelectedRangeNotice(
  records: EconomicContextRecord[],
  geographyCode: GeographyCode,
  startYear: number,
  endYear: number,
) {
  const geoRecords = records.filter((record) => record.geo === geographyCode);
  if (!geoRecords.length) return null;
  const years = geoRecords.map((record) => record.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  if (endYear < minYear || startYear > maxYear) {
    return `The selected range ${startYear}-${endYear} does not overlap this module's source range for ${getGeographyName(
      geographyCode,
    )}: ${minYear}-${maxYear}.`;
  }
  if (startYear < minYear || endYear > maxYear) {
    return `The selected range extends outside this module's source range. Using available source years: ${getYearRangeLabel(
      geoRecords.filter((record) => record.year >= startYear && record.year <= endYear),
    )}.`;
  }
  return null;
}

function buildAnnualRows(
  records: EconomicContextRecord[],
  populationRecords: PopulationYearRecord[],
  geographyCode: GeographyCode,
  startYear: number,
  endYear: number,
) {
  const rows = new Map<number, AnnualEconomicRow>();
  const ensureRow = (year: number) => {
    const row = rows.get(year) ?? { year };
    rows.set(year, row);
    return row;
  };

  for (const record of records) {
    if (record.geo !== geographyCode || record.year < startYear || record.year > endYear) {
      continue;
    }
    const row = ensureRow(record.year);
    if (record.indicator === INCOME_INDICATOR) row.income = record.value;
    if (record.indicator === UNEMPLOYMENT_INDICATOR) row.unemploymentRate = record.value;
    if (record.indicator === EMPLOYMENT_INDICATOR) row.employmentRate = record.value;
  }

  for (const record of populationRecords) {
    if (record.year < startYear || record.year > endYear) continue;
    const row = ensureRow(record.year);
    row.population = record[geographyCode];
  }

  return [...rows.values()].sort((a, b) => a.year - b.year);
}

function getIncomePopulationGrowth(rows: AnnualEconomicRow[]) {
  const overlap = rows.filter(
    (record) => record.income !== undefined && record.population !== undefined,
  );
  if (overlap.length < 2) return null;

  const first = overlap[0];
  const latest = overlap.at(-1);
  if (!latest || !first.income || !latest.income || !first.population || !latest.population) {
    return null;
  }

  return {
    startYear: first.year,
    endYear: latest.year,
    incomeChange: (latest.income - first.income) / first.income,
    populationChange: (latest.population - first.population) / first.population,
  };
}

function rankLatestIncome(records: EconomicContextRecord[], startYear: number, endYear: number) {
  const incomeRecords = records.filter(
    (record) =>
      record.indicator === INCOME_INDICATOR && record.year >= startYear && record.year <= endYear,
  );
  if (!incomeRecords.length) return { year: null, rows: [] as EconomicContextRecord[] };

  const latestYear = Math.max(...incomeRecords.map((record) => record.year));
  return {
    year: latestYear,
    rows: incomeRecords
      .filter((record) => record.year === latestYear)
      .sort((a, b) => b.value - a.value),
  };
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
      {message}
    </div>
  );
}

function IncomeLineChart({ rows }: { rows: AnnualEconomicRow[] }) {
  const chartRows = rows.filter((record) => record.income !== undefined);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink dark:text-white">Median employment income</h3>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          Selected-geography median employment income for persons with employment income, in 2024
          constant dollars.
        </p>
      </div>
      {chartRows.length === 0 ? (
        <EmptyChart message="No median employment income records are available for the selected range." />
      ) : (
        <div className="h-72 w-full" role="img" aria-label="Median employment income trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
                tickLine={false}
                axisLine={false}
                width={68}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as AnnualEconomicRow;
                  return (
                    <div className="rounded-lg border border-slate-300 bg-white p-3 text-sm shadow dark:border-slate-700 dark:bg-slate-900">
                      <p className="font-semibold text-ink dark:text-white">Year {label}</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        {row.income !== undefined ? formatCurrency(row.income) : "N/A"}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#0f6b80"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

function LabourRatesLineChart({ rows }: { rows: AnnualEconomicRow[] }) {
  const chartRows = rows.filter(
    (record) => record.unemploymentRate !== undefined || record.employmentRate !== undefined,
  );

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink dark:text-white">Labour force rates</h3>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          Selected-geography unemployment and employment rates for people aged 15 years and over.
        </p>
      </div>
      {chartRows.length === 0 ? (
        <EmptyChart message="No labour force rate records are available for this geography and selected range." />
      ) : (
        <div className="h-72 w-full" role="img" aria-label="Employment and unemployment rate trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickFormatter={(value) => `${formatDecimal(Number(value))}%`}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as AnnualEconomicRow;
                  return (
                    <div className="rounded-lg border border-slate-300 bg-white p-3 text-sm shadow dark:border-slate-700 dark:bg-slate-900">
                      <p className="font-semibold text-ink dark:text-white">Year {label}</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Employment: {formatRate(row.employmentRate)}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Unemployment: {formatRate(row.unemploymentRate)}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="employmentRate"
                name="Employment rate"
                stroke="#1f6f50"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="unemploymentRate"
                name="Unemployment rate"
                stroke="#b4222a"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

export function EconomicContextExplorer({
  payload,
  populationRecords,
  geographyCode,
  startYear,
  endYear,
}: EconomicContextExplorerProps) {
  const [showAllRows, setShowAllRows] = useState(false);
  const geographyName = getGeographyName(geographyCode);
  const annualRows = useMemo(
    () => buildAnnualRows(payload.series, populationRecords, geographyCode, startYear, endYear),
    [endYear, geographyCode, payload.series, populationRecords, startYear],
  );
  const selectedEconomicRows = annualRows.filter(
    (record) =>
      record.income !== undefined ||
      record.unemploymentRate !== undefined ||
      record.employmentRate !== undefined,
  );
  const sourceYearsLabel = getYearRangeLabel(selectedEconomicRows);
  const rangeNotice = getSelectedRangeNotice(payload.series, geographyCode, startYear, endYear);
  const incomeRecords = getIndicatorRecords(
    payload.series,
    geographyCode,
    INCOME_INDICATOR,
    startYear,
    endYear,
  );
  const unemploymentRecords = getIndicatorRecords(
    payload.series,
    geographyCode,
    UNEMPLOYMENT_INDICATOR,
    startYear,
    endYear,
  );
  const employmentRecords = getIndicatorRecords(
    payload.series,
    geographyCode,
    EMPLOYMENT_INDICATOR,
    startYear,
    endYear,
  );
  const latestIncome = getLatestRecord(incomeRecords);
  const latestUnemployment = getLatestRecord(unemploymentRecords);
  const latestEmployment = getLatestRecord(employmentRecords);
  const growth = getIncomePopulationGrowth(annualRows);
  const latestIncomeRanking = rankLatestIncome(payload.series, startYear, endYear);
  const yearRows = [...annualRows].reverse();
  const visibleYearRows = showAllRows ? yearRows : yearRows.slice(0, TABLE_ROW_LIMIT);
  const hasLabourRates = unemploymentRecords.length > 0 || employmentRecords.length > 0;

  const cards = [
    {
      label: "Median employment income",
      value: latestIncome ? formatCurrency(latestIncome.value) : "N/A",
      note: latestIncome
        ? `${geographyName}, ${latestIncome.year}, 2024 constant dollars`
        : "No source years in selected range",
      icon: CircleDollarSign,
    },
    {
      label: "Unemployment rate",
      value: latestUnemployment ? formatRate(latestUnemployment.value) : "N/A",
      note: latestUnemployment
        ? `${geographyName}, ${latestUnemployment.year}, age 15+`
        : "No labour-source record for this selection",
      icon: BriefcaseBusiness,
    },
    {
      label: "Employment rate",
      value: latestEmployment ? formatRate(latestEmployment.value) : "N/A",
      note: latestEmployment
        ? `${geographyName}, ${latestEmployment.year}, age 15+`
        : "No labour-source record for this selection",
      icon: UsersRound,
    },
    {
      label: "Income vs population",
      value: growth ? formatPercent(growth.incomeChange) : "N/A",
      note: growth
        ? `Income change vs population ${formatPercent(growth.populationChange)}, ${growth.startYear}-${growth.endYear}`
        : "Needs at least two overlapping income and population years",
      icon: TrendingUp,
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
              Economic context
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">
              Employment income and labour force indicators
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Official Statistics Canada indicators for the selected geography. Median employment
              income is in 2024 constant dollars for persons with employment income. Labour force
              rates use total gender, age 15 years and over, and total population centres and rural
              areas.
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Updated {formatSourceDate(payload.metadata.last_updated)}
          </p>
        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-slate-500 dark:text-slate-400">Selected source years</p>
            <p className="mt-1 font-semibold text-ink dark:text-white">{sourceYearsLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-slate-500 dark:text-slate-400">Income source range</p>
            <p className="mt-1 font-semibold text-ink dark:text-white">
              {getIndicatorSourceRange(payload.series, geographyCode, INCOME_INDICATOR)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-slate-500 dark:text-slate-400">Unemployment source range</p>
            <p className="mt-1 font-semibold text-ink dark:text-white">
              {getIndicatorSourceRange(payload.series, geographyCode, UNEMPLOYMENT_INDICATOR)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-slate-500 dark:text-slate-400">Employment source range</p>
            <p className="mt-1 font-semibold text-ink dark:text-white">
              {getIndicatorSourceRange(payload.series, geographyCode, EMPLOYMENT_INDICATOR)}
            </p>
          </div>
        </div>

        {(rangeNotice || !hasLabourRates) && (
          <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              {rangeNotice}
              {!hasLabourRates
                ? `${rangeNotice ? " " : ""}The labour force table used here covers Canada and provinces; it does not provide matching annual territory records in this module.`
                : ""}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lake dark:bg-slate-800 dark:text-wheat">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
              </div>
              <p className="mt-4 break-words text-2xl font-semibold text-ink dark:text-white">
                {card.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {card.note}
              </p>
            </article>
          );
        })}
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <IncomeLineChart rows={annualRows} />
        <LabourRatesLineChart rows={annualRows} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink dark:text-white">
                Annual economic table
              </h3>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Selected geography rows aligned with available population estimates.
              </p>
            </div>
            {yearRows.length > TABLE_ROW_LIMIT && (
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
                onClick={() => setShowAllRows((value) => !value)}
              >
                {showAllRows ? "Show latest 8" : "Show all years"}
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                  <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                    Year
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Median employment income
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Unemployment
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Employment
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Population
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleYearRows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={5}
                    >
                      No economic records are available for the selected range.
                    </td>
                  </tr>
                ) : (
                  visibleYearRows.map((record) => (
                    <tr key={record.year} className="text-slate-700 dark:text-slate-200">
                      <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                        {record.year}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {record.income !== undefined ? formatCurrency(record.income) : "N/A"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatRate(record.unemploymentRate)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatRate(record.employmentRate)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {record.population !== undefined
                          ? formatPopulation(record.population)
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {yearRows.length > TABLE_ROW_LIMIT && (
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Showing {visibleYearRows.length} of {yearRows.length} selected years.
            </p>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-ink dark:text-white">
              Latest income ranking
            </h3>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Geographies ranked by median employment income in{" "}
              {latestIncomeRanking.year ?? "the selected range"}.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                  <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                    Rank
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800">
                    Geography
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold dark:border-slate-800">
                    Income
                  </th>
                </tr>
              </thead>
              <tbody>
                {latestIncomeRanking.rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={3}
                    >
                      No income ranking is available for the selected range.
                    </td>
                  </tr>
                ) : (
                  latestIncomeRanking.rows.map((record, index) => (
                    <tr key={record.geo} className="text-slate-700 dark:text-slate-200">
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500 tabular-nums dark:border-slate-800 dark:text-slate-400">
                        #{index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 font-medium text-ink dark:border-slate-800 dark:text-white">
                        {getGeographyName(record.geo)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums dark:border-slate-800">
                        {formatCurrency(record.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-panel dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h3 className="font-semibold text-ink dark:text-white">Economic source notes</h3>
        <p className="mt-2">
          {payload.metadata.notes} Full module source range:{" "}
          {getAvailableYearRangeLabel(payload.series)}. The dashboard still avoids income, salary,
          wealth, or net-worth breakdowns by immigration country of origin until a matching official
          source and validation contract are added.
        </p>
      </section>
    </section>
  );
}
