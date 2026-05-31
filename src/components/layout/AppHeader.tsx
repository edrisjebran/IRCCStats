import { Database } from "lucide-react";
import logoSrc from "../../assets/ircc-stats-logo.jpg";
import { formatSourceDate } from "../../lib/formatters";
import type { DatasetMetadata } from "../../types/datasets";

interface AppHeaderProps {
  latestYear: number;
  populationMetadata: DatasetMetadata;
  immigrationMetadata: DatasetMetadata;
}

export function AppHeader({ latestYear, populationMetadata, immigrationMetadata }: AppHeaderProps) {
  const extractedAt = [populationMetadata.extracted_at, immigrationMetadata.extracted_at]
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <img
              src={logoSrc}
              alt="IRCC Stats - Canadian Population & Immigration Insights"
              width="800"
              height="266"
              className="mb-4 h-auto w-full max-w-md rounded-md bg-white object-contain p-1 shadow-sm"
            />
            <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
              Public data dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-ink dark:text-white sm:text-4xl">
              Canadian Population & Immigration Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Explore how Canada&apos;s population and permanent resident admissions have changed
              since 2000 using public data from Statistics Canada and IRCC.
            </p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Latest year</p>
              <p className="text-xl font-semibold text-ink dark:text-white">{latestYear}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Extracted</p>
              <p className="text-sm font-semibold text-ink dark:text-white">
                {formatSourceDate(extractedAt ?? "")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-lake dark:text-wheat" aria-hidden="true" />
            Sources: Statistics Canada population estimates and IRCC permanent resident admissions.
          </span>
          <span>Licence: {populationMetadata.licence}</span>
        </div>
      </div>
    </header>
  );
}
