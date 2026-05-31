import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactNumber, formatPopulation } from "../../lib/formatters";

interface BreakdownBarChartProps {
  title: string;
  description: string;
  records: Array<{ label: string; value: number }>;
  color?: string;
  emptyMessage?: string;
  labelWidth?: number;
  labelMaxChars?: number;
  minChartWidth?: number;
  rowHeight?: number;
}

interface YAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value?: string;
  };
}

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{
    payload?: {
      label: string;
      value: number;
    };
  }>;
}

function truncateLabel(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function YAxisTick({ x = 0, y = 0, payload, maxChars }: YAxisTickProps & { maxChars: number }) {
  const fullLabel = String(payload?.value ?? "");
  const label = truncateLabel(fullLabel, maxChars);

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{fullLabel}</title>
      <text
        x={-8}
        y={0}
        dy={4}
        textAnchor="end"
        className="fill-slate-500 text-[12px] dark:fill-slate-400"
      >
        {label}
      </text>
    </g>
  );
}

function BreakdownTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const record = payload[0].payload;
  if (!record) return null;

  return (
    <div className="max-w-xs rounded-lg border border-slate-300 bg-white p-3 text-sm shadow dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold leading-5 text-ink dark:text-white">{record.label}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {formatPopulation(record.value)} admissions
      </p>
    </div>
  );
}

export function BreakdownBarChart({
  title,
  description,
  records,
  color = "#0f6b80",
  emptyMessage = "No source records are available for this breakdown in the selected year range.",
  labelWidth = 184,
  labelMaxChars = 28,
  minChartWidth = 620,
  rowHeight = 36,
}: BreakdownBarChartProps) {
  const chartHeight = Math.max(320, records.length * rowHeight + 88);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink dark:text-white">{title}</h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {records.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            role="img"
            aria-label={title}
            style={{ height: chartHeight, minWidth: minChartWidth }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={records}
                layout="vertical"
                margin={{ top: 5, right: 24, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCompactNumber} axisLine={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={labelWidth}
                  tick={<YAxisTick maxChars={labelMaxChars} />}
                  interval={0}
                />
                <Tooltip content={<BreakdownTooltip />} />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </article>
  );
}
