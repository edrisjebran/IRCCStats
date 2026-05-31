import { GEOGRAPHIES } from "../../data/geography";
import type { GeographyCode } from "../../types/datasets";

interface GeographySelectProps {
  value: GeographyCode;
  onChange: (value: GeographyCode) => void;
}

export function GeographySelect({ value, onChange }: GeographySelectProps) {
  return (
    <label className="flex min-w-56 flex-1 flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      Geography
      <select
        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm outline-none transition focus:border-lake focus:ring-2 focus:ring-lake/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value as GeographyCode)}
      >
        {GEOGRAPHIES.map((geo) => (
          <option key={geo.code} value={geo.code}>
            {geo.name}
          </option>
        ))}
      </select>
    </label>
  );
}
