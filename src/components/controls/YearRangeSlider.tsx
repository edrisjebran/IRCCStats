interface YearRangeSliderProps {
  minYear: number;
  maxYear: number;
  startYear: number;
  endYear: number;
  onStartYearChange: (value: number) => void;
  onEndYearChange: (value: number) => void;
}

export function YearRangeSlider({
  minYear,
  maxYear,
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
}: YearRangeSliderProps) {
  return (
    <div className="grid flex-[2] gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        Start year
        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-lg font-semibold text-ink dark:text-white">{startYear}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{minYear}</span>
          </div>
          <input
            className="w-full accent-lake"
            type="range"
            min={minYear}
            max={maxYear}
            value={startYear}
            onChange={(event) => onStartYearChange(Number(event.target.value))}
          />
        </div>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        End year
        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-lg font-semibold text-ink dark:text-white">{endYear}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{maxYear}</span>
          </div>
          <input
            className="w-full accent-maple"
            type="range"
            min={minYear}
            max={maxYear}
            value={endYear}
            onChange={(event) => onEndYearChange(Number(event.target.value))}
          />
        </div>
      </label>
    </div>
  );
}
