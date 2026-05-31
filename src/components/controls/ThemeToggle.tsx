import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeToggleProps {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
}

const MODES: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <fieldset className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <legend>Theme</legend>
      <div className="grid h-11 grid-cols-3 rounded-lg border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const active = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              aria-label={`${mode.label} theme`}
              title={`${mode.label} theme`}
              className={`flex min-w-10 items-center justify-center rounded-md transition focus:outline-none focus:ring-2 focus:ring-lake/30 ${
                active
                  ? "bg-ink text-white dark:bg-wheat dark:text-ink"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
              onClick={() => onChange(mode.value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
