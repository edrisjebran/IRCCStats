import type {
  GeographyCode,
  ImmigrationCategory,
  ImmigrationYearRecord,
  PopulationYearRecord,
} from "../types/datasets";

export function filterByYearRange<T extends { year: number }>(
  records: T[],
  startYear: number,
  endYear: number,
) {
  return records.filter((record) => record.year >= startYear && record.year <= endYear);
}

export function getLatestRecord<T extends { year: number }>(records: T[]): T | undefined {
  return records.reduce<T | undefined>(
    (latest, record) => (!latest || record.year > latest.year ? record : latest),
    undefined,
  );
}

export function getPreviousYearRecord<T extends { year: number }>(
  records: T[],
  year: number,
): T | undefined {
  return records.find((record) => record.year === year - 1);
}

export function calculateYoYGrowth(records: PopulationYearRecord[], geographyCode: GeographyCode) {
  const latest = getLatestRecord(records);
  if (!latest) return null;
  const previous = getPreviousYearRecord(records, latest.year);
  if (!previous || previous[geographyCode] <= 0) return null;

  const absolute = latest[geographyCode] - previous[geographyCode];
  return {
    absolute,
    percent: absolute / previous[geographyCode],
    currentYear: latest.year,
    previousYear: previous.year,
  };
}

export function calculateRangeGrowth(
  records: PopulationYearRecord[],
  geographyCode: GeographyCode,
) {
  if (records.length < 2) return null;
  const first = records[0];
  const latest = records[records.length - 1];
  if (first[geographyCode] <= 0) return null;

  const absolute = latest[geographyCode] - first[geographyCode];
  return {
    absolute,
    percent: absolute / first[geographyCode],
    startYear: first.year,
    endYear: latest.year,
  };
}

export function calculateCategoryShare(
  record: ImmigrationYearRecord,
  category: ImmigrationCategory,
) {
  if (record.Total <= 0) return 0;
  return record[category] / record.Total;
}

export function getLargestImmigrationCategory(record: ImmigrationYearRecord) {
  const categories: ImmigrationCategory[] = ["Economic", "Family", "Refugee", "Other"];
  return categories.reduce((largest, category) =>
    record[category] > record[largest] ? category : largest,
  );
}

export function calculateImmigrationRatePer1000(
  populationRecords: PopulationYearRecord[],
  immigrationRecords: ImmigrationYearRecord[],
) {
  const populationByYear = new Map(populationRecords.map((record) => [record.year, record.CA]));

  return immigrationRecords
    .map((record) => {
      const population = populationByYear.get(record.year);
      if (!population || population <= 0) return null;
      return {
        year: record.year,
        rate: (record.Total / population) * 1000,
        admissions: record.Total,
        population,
      };
    })
    .filter((record): record is NonNullable<typeof record> => record !== null);
}
