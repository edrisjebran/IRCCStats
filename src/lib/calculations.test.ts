import { describe, expect, it } from "vitest";
import {
  calculateCategoryShare,
  calculateImmigrationRatePer1000,
  calculateRangeGrowth,
  calculateYoYGrowth,
  filterByYearRange,
  getLargestImmigrationCategory,
  getLatestRecord,
  getPreviousYearRecord,
} from "./calculations";
import { immigrationPayload, populationPayload } from "../test/fixtures";

describe("calculation helpers", () => {
  it("filters records inclusively by selected year range", () => {
    const records = filterByYearRange(populationPayload.series, 2024, 2025);

    expect(records.map((record) => record.year)).toEqual([2024, 2025]);
  });

  it("finds latest and previous-year records by year", () => {
    expect(getLatestRecord(populationPayload.series)?.year).toBe(2025);
    expect(getPreviousYearRecord(populationPayload.series, 2025)?.year).toBe(2024);
    expect(getPreviousYearRecord(populationPayload.series, 2023)).toBeUndefined();
  });

  it("calculates year-over-year population growth for a selected geography", () => {
    const growth = calculateYoYGrowth(populationPayload.series, "ON");

    expect(growth).toEqual({
      absolute: 500_000,
      percent: 500_000 / 15_500_000,
      currentYear: 2025,
      previousYear: 2024,
    });
  });

  it("calculates range population growth from first to last selected record", () => {
    const growth = calculateRangeGrowth(
      filterByYearRange(populationPayload.series, 2023, 2025),
      "CA",
    );

    expect(growth).toEqual({
      absolute: 2_000_000,
      percent: 0.05,
      startYear: 2023,
      endYear: 2025,
    });
  });

  it("calculates immigration category shares and largest category", () => {
    const record = immigrationPayload.series[1];

    expect(calculateCategoryShare(record, "Economic")).toBeCloseTo(280_000 / 470_000);
    expect(getLargestImmigrationCategory(record)).toBe("Economic");
  });

  it("calculates Canada-level permanent resident admissions per 1,000 population", () => {
    const rates = calculateImmigrationRatePer1000(
      populationPayload.series,
      immigrationPayload.series,
    );

    expect(rates).toHaveLength(3);
    expect(rates[1]).toMatchObject({
      year: 2024,
      admissions: 470_000,
      population: 41_200_000,
    });
    expect(rates[1].rate).toBeCloseTo((470_000 / 41_200_000) * 1000);
  });
});
