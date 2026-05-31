import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactNumber, formatDecimal, formatPopulation } from "../../lib/formatters";

interface ImmigrationRateRecord {
  year: number;
  rate: number;
  admissions: number;
  population: number;
}

interface ImmigrationRateLineChartProps {
  records: ImmigrationRateRecord[];
  sourceYearsLabel: string;
}

export function ImmigrationRateLineChart({
  records,
  sourceYearsLabel,
}: ImmigrationRateLineChartProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink dark:text-white">
          Canada permanent residents per 1,000 residents
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Canada-level admissions divided by Canada population. Source years shown:{" "}
          {sourceYearsLabel}.
        </p>
      </div>
      {records.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No matching immigration and population records are available for this rate.
        </div>
      ) : (
        <div
          className="h-72 w-full"
          role="img"
          aria-label="Permanent residents admitted per 1,000 Canada residents"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={records} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickFormatter={(value) => formatDecimal(Number(value))}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value, name, _item) => {
                  if (name === "rate") return [formatDecimal(Number(value)), "PRs per 1,000"];
                  return [formatCompactNumber(Number(value)), String(name)];
                }}
                labelFormatter={(label) => `Year ${label}`}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const record = payload[0].payload as ImmigrationRateRecord;
                  return (
                    <div className="rounded-lg border border-slate-300 bg-white p-3 text-sm shadow dark:border-slate-700 dark:bg-slate-900">
                      <p className="font-semibold text-ink dark:text-white">Year {label}</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        {formatDecimal(record.rate)} per 1,000 residents
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {formatPopulation(record.admissions)} admissions /{" "}
                        {formatPopulation(record.population)} population
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
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
