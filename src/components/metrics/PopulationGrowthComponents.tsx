import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGeographyName } from "../../data/geography";
import {
  formatCompactNumber,
  formatPercent,
  formatPopulation,
  formatSignedNumber,
} from "../../lib/formatters";
import { getAvailableYearRangeLabel, getYearRangeLabel } from "../../lib/sourceYears";
import type {
  GeographyCode,
  PopulationComponentRecord,
  PopulationComponentsPayload,
  PopulationGrowthComponent,
  PopulationYearRecord,
} from "../../types/datasets";

type ContributionKey =
  | "naturalIncrease"
  | "permanentImmigration"
  | "netTemporaryResidents"
  | "netInterprovincialMigration"
  | "netEmigration"
  | "netTemporaryEmigration"
  | "residualDeviation";

interface Contribution {
  key: ContributionKey;
  label: string;
  value: number;
  color: string;
}

interface PopulationGrowthComponentsProps {
  payload: PopulationComponentsPayload;
  populationRecords: PopulationYearRecord[];
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}

function sumComponent(records: PopulationComponentRecord[], component: PopulationGrowthComponent) {
  return records
    .filter((record) => record.component === component)
    .reduce((sum, record) => sum + record.value, 0);
}

function getComponentStartYear(startYear: number, endYear: number) {
  return startYear === endYear ? startYear : startYear + 1;
}

function getActualPopulationChange(
  records: PopulationYearRecord[],
  geographyCode: GeographyCode,
  startYear: number,
  endYear: number,
) {
  const current = records.find((record) => record.year === endYear);
  if (!current) return null;

  if (startYear === endYear) {
    const previous = records.find((record) => record.year === endYear - 1);
    if (!previous) return null;
    return {
      value: current[geographyCode] - previous[geographyCode],
      label: `${previous.year} to ${current.year}`,
    };
  }

  const first = records.find((record) => record.year === startYear);
  if (!first) return null;
  return {
    value: current[geographyCode] - first[geographyCode],
    label: `${first.year} to ${current.year}`,
  };
}

function getShare(value: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator === 0) return "N/A";
  return formatPercent(value / denominator);
}

function cleanZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

export function PopulationGrowthComponents({
  payload,
  populationRecords,
  geographyCode,
  startYear,
  endYear,
}: PopulationGrowthComponentsProps) {
  const geographyName = getGeographyName(geographyCode);
  const componentStartYear = getComponentStartYear(startYear, endYear);
  const componentRecords = payload.series.filter(
    (record) =>
      record.geo === geographyCode && record.year >= componentStartYear && record.year <= endYear,
  );

  const births = sumComponent(componentRecords, "Births");
  const deaths = sumComponent(componentRecords, "Deaths");
  const naturalIncrease = births - deaths;
  const permanentImmigration = sumComponent(componentRecords, "Immigrants");
  const netTemporaryResidents = sumComponent(componentRecords, "Net non-permanent residents");
  const netInterprovincialMigration = sumComponent(
    componentRecords,
    "Net interprovincial migration",
  );
  const netEmigration = cleanZero(-sumComponent(componentRecords, "Net emigration"));
  const netTemporaryEmigration = cleanZero(
    -sumComponent(componentRecords, "Net temporary emigration"),
  );
  const residualDeviation = sumComponent(componentRecords, "Residual deviation");

  const contributions: Contribution[] = [
    {
      key: "naturalIncrease",
      label: "Natural increase",
      value: naturalIncrease,
      color: "#1f6f50",
    },
    {
      key: "permanentImmigration",
      label: "Permanent immigration",
      value: permanentImmigration,
      color: "#b4222a",
    },
    {
      key: "netTemporaryResidents",
      label: "Net temporary residents",
      value: netTemporaryResidents,
      color: "#0f6b80",
    },
    {
      key: "netInterprovincialMigration",
      label: "Interprovincial migration",
      value: netInterprovincialMigration,
      color: "#6d5bd0",
    },
    {
      key: "netEmigration",
      label: "Net emigration",
      value: netEmigration,
      color: "#9a6b16",
    },
    {
      key: "netTemporaryEmigration",
      label: "Temporary emigration",
      value: netTemporaryEmigration,
      color: "#62748e",
    },
    {
      key: "residualDeviation",
      label: "Residual deviation",
      value: residualDeviation,
      color: "#475569",
    },
  ];

  const chartRows = contributions.filter((record) => record.value !== 0);
  const componentTotal = contributions.reduce((sum, record) => sum + record.value, 0);
  const actualChange = getActualPopulationChange(
    populationRecords,
    geographyCode,
    startYear,
    endYear,
  );
  const denominator = actualChange?.value ?? componentTotal;
  const sourceYearsLabel = getYearRangeLabel(componentRecords);
  const fullSourceRange = getAvailableYearRangeLabel(payload.series);
  const intervalDescription =
    startYear === endYear
      ? `the July-to-July interval ending in ${endYear}`
      : `July-to-July intervals ending ${componentStartYear}-${endYear}`;

  const cards = [
    {
      label: `${geographyName} population change`,
      value: actualChange
        ? formatSignedNumber(actualChange.value)
        : formatSignedNumber(componentTotal),
      note: actualChange
        ? `Population estimates, ${actualChange.label}`
        : `Component total across ${sourceYearsLabel}`,
    },
    {
      label: "Natural increase",
      value: formatSignedNumber(naturalIncrease),
      note: `${formatPopulation(births)} births - ${formatPopulation(deaths)} deaths`,
    },
    {
      label: "Permanent immigration",
      value: formatSignedNumber(permanentImmigration),
      note: "Statistics Canada immigrants component",
    },
    {
      label: "Net temporary residents",
      value: formatSignedNumber(netTemporaryResidents),
      note: "Net non-permanent resident change",
    },
  ];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
          Population growth attribution
        </p>
        <h2 className="mt-2 text-lg font-semibold text-ink dark:text-white">
          What drove population change?
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {geographyName} official demographic components for {intervalDescription}. Permanent
          immigration uses the StatCan immigrants component; temporary residents use net
          non-permanent residents. Source years shown: {sourceYearsLabel}. Full source range:{" "}
          {fullSourceRange}.
        </p>
      </div>

      {componentRecords.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No population growth component records are available for this geography and selected
          range.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 break-words text-2xl font-semibold text-ink dark:text-white">
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {card.note}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div
              className="h-80 min-w-[640px]"
              role="img"
              aria-label="Population change contribution by demographic component"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 18, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" horizontal={false} />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={168}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [formatSignedNumber(Number(value)), "Population effect"]}
                    contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1" }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartRows.map((row) => (
                      <Cell key={row.key} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Component</th>
                  <th className="py-2 pr-4 font-semibold">Population effect</th>
                  <th className="py-2 pr-4 font-semibold">Share of change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {contributions.map((record) => (
                  <tr key={record.key}>
                    <td className="py-2 pr-4 text-ink dark:text-white">{record.label}</td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {formatSignedNumber(record.value)}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {getShare(record.value, denominator)}
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
