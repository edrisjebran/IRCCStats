import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS, IMMIGRATION_CATEGORIES } from "../../data/categories";
import { formatCompactNumber, formatPopulation } from "../../lib/formatters";
import type { ImmigrationYearRecord } from "../../types/datasets";

interface ImmigrationStackedBarChartProps {
  records: ImmigrationYearRecord[];
  sourceYearsLabel?: string;
}

export function ImmigrationStackedBarChart({
  records,
  sourceYearsLabel,
}: ImmigrationStackedBarChartProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink dark:text-white">
          Permanent resident admissions
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Canada-level annual admissions grouped by broad immigration stream.
          {sourceYearsLabel ? ` Source years shown: ${sourceYearsLabel}.` : ""}
        </p>
      </div>
      {records.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No immigration records are available for the selected range.
        </div>
      ) : (
        <div
          className="h-80 w-full"
          role="img"
          aria-label="Permanent resident admissions by category"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={records} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickFormatter={formatCompactNumber}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                formatter={(value, name) => [formatPopulation(Number(value)), name]}
                labelFormatter={(label) => `Year ${label}`}
                contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1" }}
              />
              <Legend verticalAlign="bottom" height={34} />
              {IMMIGRATION_CATEGORIES.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="admissions"
                  fill={CATEGORY_COLORS[category]}
                  radius={category === "Other" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
