import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { formatPercent, formatSignedNumber } from "../../lib/formatters";

interface GrowthBadgeProps {
  absolute: number;
  percent: number;
}

export function GrowthBadge({ absolute, percent }: GrowthBadgeProps) {
  const positive = absolute > 0;
  const negative = absolute < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : ArrowRight;
  const tone = positive
    ? "border-spruce/25 bg-spruce/10 text-spruce dark:text-emerald-300"
    : negative
      ? "border-maple/25 bg-maple/10 text-maple dark:text-red-300"
      : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {formatSignedNumber(absolute)} ({formatPercent(percent)})
    </span>
  );
}
