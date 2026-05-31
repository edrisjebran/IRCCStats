import { describe, expect, it } from "vitest";
import {
  validateEconomicContextPayload,
  validateImmigrationBreakdownsPayload,
  validateImmigrationCountryOverviewPayload,
  validateImmigrationPayload,
  validatePopulationAgeGroupsPayload,
  validatePopulationComponentsPayload,
  validatePopulationPayload,
  validateTemporaryResidentsPayload,
} from "./validators";
import {
  breakdownsPayload,
  countryOverviewPayload,
  economicContextPayload,
  immigrationPayload,
  populationAgeGroupsPayload,
  populationComponentsPayload,
  populationPayload,
  temporaryResidentsPayload,
} from "../test/fixtures";

describe("dataset validators", () => {
  it("accepts well-formed static payloads", () => {
    expect(validatePopulationPayload(populationPayload)).toBe(populationPayload);
    expect(validatePopulationComponentsPayload(populationComponentsPayload)).toBe(
      populationComponentsPayload,
    );
    expect(validatePopulationAgeGroupsPayload(populationAgeGroupsPayload)).toBe(
      populationAgeGroupsPayload,
    );
    expect(validateImmigrationPayload(immigrationPayload)).toBe(immigrationPayload);
    expect(validateImmigrationBreakdownsPayload(breakdownsPayload)).toBe(breakdownsPayload);
    expect(validateImmigrationCountryOverviewPayload(countryOverviewPayload)).toBe(
      countryOverviewPayload,
    );
    expect(validateTemporaryResidentsPayload(temporaryResidentsPayload)).toBe(
      temporaryResidentsPayload,
    );
    expect(validateEconomicContextPayload(economicContextPayload)).toBe(economicContextPayload);
  });

  it("rejects missing metadata and malformed population records", () => {
    expect(() => validatePopulationPayload({ series: [] })).toThrow(
      "Invalid population dataset structure.",
    );

    const missingGeography = structuredClone(populationPayload);
    delete (missingGeography.series[0] as Partial<Record<"ON", number>>).ON;

    expect(() => validatePopulationPayload(missingGeography)).toThrow(
      "Population record 2023 is missing ON.",
    );

    const negativePopulation = structuredClone(populationPayload);
    negativePopulation.series[0].CA = -1;

    expect(() => validatePopulationPayload(negativePopulation)).toThrow(
      "Population record 2023 is missing CA.",
    );
  });

  it("rejects inconsistent immigration totals", () => {
    const inconsistentTotal = structuredClone(immigrationPayload);
    inconsistentTotal.series[0].Total += 1;

    expect(() => validateImmigrationPayload(inconsistentTotal)).toThrow(
      "Immigration record 2023 has an invalid total.",
    );
  });

  it("rejects invalid geography and category dimensions", () => {
    const invalidAgeGroup = structuredClone(populationAgeGroupsPayload);
    invalidAgeGroup.series[0].ageGroup = "Unknown age group" as never;

    expect(() => validatePopulationAgeGroupsPayload(invalidAgeGroup)).toThrow(
      "Invalid population age-group year record.",
    );

    const invalidBreakdown = structuredClone(breakdownsPayload);
    invalidBreakdown.dimensions.ageGroup[0].geo = "ZZ" as never;

    expect(() => validateImmigrationBreakdownsPayload(invalidBreakdown)).toThrow(
      "Invalid geography code in ageGroup.",
    );

    const invalidCountryOverview = structuredClone(countryOverviewPayload);
    invalidCountryOverview.records[0].geo = "ON";

    expect(() => validateImmigrationCountryOverviewPayload(invalidCountryOverview)).toThrow(
      "Immigration country overview records must be Canada-level.",
    );
  });

  it("rejects malformed temporary resident and economic records", () => {
    const invalidTemporary = structuredClone(temporaryResidentsPayload);
    invalidTemporary.countryOfCitizenship[0].stream = "Unknown stream" as never;

    expect(() => validateTemporaryResidentsPayload(invalidTemporary)).toThrow(
      "Invalid temporary resident country-of-citizenship record.",
    );

    const invalidEconomic = structuredClone(economicContextPayload);
    invalidEconomic.series[0].unit = "USD" as never;

    expect(() => validateEconomicContextPayload(invalidEconomic)).toThrow(
      "Invalid economic context record.",
    );
  });
});
