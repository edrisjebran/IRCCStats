import { describe, expect, it } from "vitest";
import {
  formatCompactNumber,
  formatCurrency,
  formatDecimal,
  formatPercent,
  formatPopulation,
  formatSignedNumber,
  formatSourceDate,
  formatYear,
} from "./formatters";

describe("formatters", () => {
  it("formats population and compact values for Canadian English", () => {
    expect(formatPopulation(1_234_567)).toBe("1,234,567");
    expect(formatCompactNumber(1_500_000)).toBe("1.5M");
    expect(formatCompactNumber(42_000)).toBe("42K");
  });

  it("formats Canadian-dollar economic values", () => {
    expect(formatCurrency(43_000)).toBe("$43,000");
  });

  it("formats percentages, decimals, signed numbers, and years", () => {
    expect(formatPercent(0.1234)).toBe("+12.3%");
    expect(formatPercent(-0.012)).toBe("-1.2%");
    expect(formatDecimal(6.44)).toBe("6.4");
    expect(formatSignedNumber(12_345)).toBe("+12,345");
    expect(formatSignedNumber(-25)).toBe("-25");
    expect(formatYear(2025)).toBe("2025");
  });

  it("formats source dates defensively", () => {
    expect(formatSourceDate("2026-05-31T12:00:00Z")).toBe("May 31, 2026");
    expect(formatSourceDate("")).toBe("Unknown");
    expect(formatSourceDate("not-a-date")).toBe("not-a-date");
  });
});
