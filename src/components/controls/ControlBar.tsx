import { GeographySelect } from "./GeographySelect";
import { ThemeToggle } from "./ThemeToggle";
import { YearRangeSlider } from "./YearRangeSlider";
import type { YearBounds } from "../../types/dashboard";
import type { GeographyCode } from "../../types/datasets";

type ThemeMode = "light" | "dark" | "system";

interface ControlBarProps extends YearBounds {
  geo: GeographyCode;
  startYear: number;
  endYear: number;
  theme: ThemeMode;
  onGeoChange: (value: GeographyCode) => void;
  onStartYearChange: (value: number) => void;
  onEndYearChange: (value: number) => void;
  onThemeChange: (value: ThemeMode) => void;
}

export function ControlBar({
  geo,
  startYear,
  endYear,
  minYear,
  maxYear,
  theme,
  onGeoChange,
  onStartYearChange,
  onEndYearChange,
  onThemeChange,
}: ControlBarProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <GeographySelect value={geo} onChange={onGeoChange} />
        <YearRangeSlider
          minYear={minYear}
          maxYear={maxYear}
          startYear={startYear}
          endYear={endYear}
          onStartYearChange={onStartYearChange}
          onEndYearChange={onEndYearChange}
        />
        <div className="lg:w-48">
          <ThemeToggle value={theme} onChange={onThemeChange} />
        </div>
      </div>
    </section>
  );
}
