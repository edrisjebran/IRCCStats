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
import { TEMPORARY_RESIDENT_COLORS } from "../../data/temporaryResidents";
import { formatCompactNumber, formatPopulation } from "../../lib/formatters";
import type { TemporaryResidentStream } from "../../types/datasets";

interface TemporaryResidentChartRow extends Record<TemporaryResidentStream | "year", number> {
  year: number;
}

interface TemporaryResidentsStackedBarChartProps {
  records: TemporaryResidentChartRow[];
  streams: TemporaryResidentStream[];
  geographyName: string;
  sourceYearsLabel: string;
}

export function TemporaryResidentsStackedBarChart({
  records,
  streams,
  geographyName,
  sourceYearsLabel,
}: TemporaryResidentsStackedBarChartProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink dark:text-white">
          Temporary resident permits effective by year
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {geographyName} annual rows by permit effective year, summed from IRCC monthly update
          resources by stream. Source years shown: {sourceYearsLabel}.
        </p>
      </div>
      {records.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No temporary resident permit-holder records are available for the selected range. This
          source currently starts in 2015.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="h-80 min-w-[640px]"
            role="img"
            aria-label="Temporary resident permit-effective rows by stream"
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
                <Legend verticalAlign="bottom" height={64} />
                {streams.map((stream) => (
                  <Bar
                    key={stream}
                    dataKey={stream}
                    stackId="temporary-residents"
                    fill={TEMPORARY_RESIDENT_COLORS[stream]}
                    radius={stream === streams.at(-1) ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </article>
  );
}
