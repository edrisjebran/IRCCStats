import { CATEGORY_DESCRIPTIONS } from "../../data/categories";
import { getGeographyName } from "../../data/geography";
import {
  calculateCategoryShare,
  calculateRangeGrowth,
  calculateYoYGrowth,
  getLargestImmigrationCategory,
} from "../../lib/calculations";
import {
  formatCompactNumber,
  formatDecimal,
  formatPercent,
  formatPopulation,
  formatSignedNumber,
} from "../../lib/formatters";
import type {
  GeographyCode,
  ImmigrationYearRecord,
  PopulationYearRecord,
} from "../../types/datasets";
import { GrowthBadge } from "./GrowthBadge";

interface SummaryCardsProps {
  geographyCode: GeographyCode;
  populationRecords: PopulationYearRecord[];
  immigrationRecords: ImmigrationYearRecord[];
  immigrationRateRecords?: Array<{ year: number; rate: number }>;
}

export function SummaryCards({
  geographyCode,
  populationRecords,
  immigrationRecords,
  immigrationRateRecords = [],
}: SummaryCardsProps) {
  const latestPopulation = populationRecords.at(-1);
  const latestImmigration = immigrationRecords.at(-1);
  const yoy = calculateYoYGrowth(populationRecords, geographyCode);
  const range = calculateRangeGrowth(populationRecords, geographyCode);
  const largestCategory = latestImmigration
    ? getLargestImmigrationCategory(latestImmigration)
    : undefined;
  const latestRate = immigrationRateRecords.at(-1);

  const cards = [
    {
      label: `${getGeographyName(geographyCode)} population`,
      value: latestPopulation ? formatPopulation(latestPopulation[geographyCode]) : "N/A",
      note: latestPopulation ? `Estimate for ${latestPopulation.year}` : "No population record",
    },
    {
      label: "YoY growth",
      value: yoy ? formatSignedNumber(yoy.absolute) : "N/A",
      note: yoy ? `${yoy.previousYear} to ${yoy.currentYear}` : "Previous year unavailable",
      badge: yoy ? <GrowthBadge absolute={yoy.absolute} percent={yoy.percent} /> : null,
    },
    {
      label: "Range growth",
      value: range ? formatSignedNumber(range.absolute) : "N/A",
      note: range ? `${formatPercent(range.percent)} from ${range.startYear}` : "Select 2+ years",
    },
    {
      label: "Canada permanent residents",
      value: latestImmigration ? formatCompactNumber(latestImmigration.Total) : "N/A",
      note: latestImmigration
        ? `Canada-level admissions in ${latestImmigration.year}`
        : "No immigration record",
    },
    {
      label: "Canada PRs per 1,000",
      value: latestRate ? formatDecimal(latestRate.rate) : "N/A",
      note: latestRate
        ? `Canada-level rate for ${latestRate.year}`
        : "Requires matching Canada population and admissions",
    },
    {
      label: "Canada largest stream",
      value: largestCategory ?? "N/A",
      note:
        latestImmigration && largestCategory
          ? `${formatPercent(calculateCategoryShare(latestImmigration, largestCategory))} - ${
              CATEGORY_DESCRIPTIONS[largestCategory]
            }`
          : "No stream record",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
          <div className="mt-2 flex min-h-14 flex-col justify-center gap-2">
            <p className="break-words text-2xl font-semibold tracking-normal text-ink dark:text-white">
              {card.value}
            </p>
            {card.badge}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{card.note}</p>
        </article>
      ))}
    </section>
  );
}
