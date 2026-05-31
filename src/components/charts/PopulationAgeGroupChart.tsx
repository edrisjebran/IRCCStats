import { BreakdownBarChart } from "./BreakdownBarChart";
import { getGeographyName } from "../../data/geography";
import { formatCompactNumber } from "../../lib/formatters";
import type { GeographyCode, PopulationAgeGroupRecord } from "../../types/datasets";

interface PopulationAgeGroupChartProps {
  records: PopulationAgeGroupRecord[];
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}

export function PopulationAgeGroupChart({
  records,
  geographyCode,
  startYear,
  endYear,
}: PopulationAgeGroupChartProps) {
  const available = records.filter(
    (record) => record.geo === geographyCode && record.year >= startYear && record.year <= endYear,
  );
  const latestYear = available.length ? Math.max(...available.map((record) => record.year)) : null;
  const chartRecords = latestYear
    ? available
        .filter((record) => record.year === latestYear)
        .map((record) => ({ label: record.ageGroup, value: record.value }))
    : [];
  const total = chartRecords.reduce((sum, record) => sum + record.value, 0);

  return (
    <BreakdownBarChart
      title="Population by age group"
      description={`${getGeographyName(
        geographyCode,
      )} July 1 population age profile. Source year shown: ${
        latestYear ?? "No source years in range"
      }. Displayed total: ${formatCompactNumber(total)}.`}
      records={chartRecords}
      color="#0f6b80"
    />
  );
}
