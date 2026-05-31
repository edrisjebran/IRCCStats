import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BreakdownExplorer } from "./BreakdownExplorer";
import { breakdownsPayload } from "../../test/fixtures";
import type { ImmigrationBreakdownsPayload } from "../../types/datasets";

function createCountryTablePayload(): ImmigrationBreakdownsPayload {
  const payload = structuredClone(breakdownsPayload);
  payload.dimensions.countryOfCitizenship = Array.from({ length: 25 }, (_, index) => ({
    year: 2024,
    label: `Country ${index + 1}`,
    value: 25_000 - index,
  }));
  payload.countryCategory = payload.dimensions.countryOfCitizenship.flatMap((record) => [
    {
      year: 2024,
      country: record.label,
      category: "Economic" as const,
      value: Math.round(record.value * 0.6),
    },
    {
      year: 2024,
      country: record.label,
      category: "Family" as const,
      value: Math.round(record.value * 0.3),
    },
    {
      year: 2024,
      country: record.label,
      category: "Refugee" as const,
      value: Math.round(record.value * 0.08),
    },
    {
      year: 2024,
      country: record.label,
      category: "Other" as const,
      value: Math.round(record.value * 0.02),
    },
  ]);
  return payload;
}

describe("BreakdownExplorer", () => {
  it("aggregates permanent resident country rows across the selected range with ranking and pagination", async () => {
    const user = userEvent.setup();
    render(
      <BreakdownExplorer
        payload={createCountryTablePayload()}
        geographyCode="CA"
        startYear={2024}
        endYear={2024}
      />,
    );

    const table = screen.getByRole("table");
    expect(within(table).getByText("#1")).toBeInTheDocument();
    expect(within(table).getByText("Country 1")).toBeInTheDocument();
    expect(within(table).getByText("#20")).toBeInTheDocument();
    expect(within(table).queryByText("Country 21")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next permanent resident country page" }));

    expect(within(table).getByText("#21")).toBeInTheDocument();
    expect(within(table).getByText("Country 21")).toBeInTheDocument();
  });

  it("searches permanent resident country rows and resets pagination to matching results", async () => {
    const user = userEvent.setup();
    render(
      <BreakdownExplorer
        payload={createCountryTablePayload()}
        geographyCode="CA"
        startYear={2024}
        endYear={2024}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: /Search permanent resident country table/i }),
      "Country 25",
    );

    expect(screen.getByText("1 of 25 countries")).toBeInTheDocument();
    expect(screen.getByText("Country 25")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });
});
