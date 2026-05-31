import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGeographyName } from "../../data/geography";
import { formatCompactNumber, formatPopulation } from "../../lib/formatters";
import type { GeographyCode, PopulationYearRecord } from "../../types/datasets";

interface PopulationAreaChartProps {
  records: PopulationYearRecord[];
  geographyCode: GeographyCode;
  sourceYearsLabel?: string;
}

export function PopulationAreaChart({
  records,
  geographyCode,
  sourceYearsLabel,
}: PopulationAreaChartProps) {
  const geographyName = getGeographyName(geographyCode);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink dark:text-white">Population trend</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {geographyName} annual July 1 population estimates.
          {sourceYearsLabel ? ` Source years shown: ${sourceYearsLabel}.` : ""}
        </p>
      </div>
      {records.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No population records are available for the selected range.
        </div>
      ) : (
        <div className="h-80 w-full" role="img" aria-label={`${geographyName} population trend`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={records} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="populationFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f6b80" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#0f6b80" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickFormatter={formatCompactNumber}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                formatter={(value) => [formatPopulation(Number(value)), geographyName]}
                labelFormatter={(label) => `Year ${label}`}
                contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1" }}
              />
              <Area
                type="monotone"
                dataKey={geographyCode}
                stroke="#0f6b80"
                strokeWidth={3}
                fill="url(#populationFill)"
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
