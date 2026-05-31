import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TemporaryResidentsExplorer } from "./TemporaryResidentsExplorer";
import { populationPayload, temporaryResidentsPayload } from "../../test/fixtures";
import type { TemporaryResidentsPayload } from "../../types/datasets";

function createTemporaryCountryPayload(): TemporaryResidentsPayload {
  const payload = structuredClone(temporaryResidentsPayload);
  payload.countryOfCitizenship = Array.from({ length: 24 }, (_, index) => {
    const country = `Country ${index + 1}`;
    const rankValue = 24 - index;
    return payload.streams.map((stream, streamIndex) => ({
      year: 2024,
      country,
      stream,
      value: rankValue * 1_000 + streamIndex * 100,
    }));
  }).flat();
  return payload;
}

describe("TemporaryResidentsExplorer", () => {
  it("renders temporary stream cards and country table pagination", async () => {
    const user = userEvent.setup();
    render(
      <TemporaryResidentsExplorer
        payload={createTemporaryCountryPayload()}
        populationRecords={populationPayload.series}
        geographyCode="CA"
        startYear={2024}
        endYear={2024}
      />,
    );

    expect(screen.getByText("Study and work permit holder context")).toBeInTheDocument();
    expect(screen.getByText("Country of citizenship by temporary stream")).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Country 1")).toBeInTheDocument();
    expect(within(table).queryByText("Country 21")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next country page" }));

    expect(within(table).getByText("Country 21")).toBeInTheDocument();
    expect(within(table).getByText("#21")).toBeInTheDocument();
  });

  it("filters temporary country rows with search", async () => {
    const user = userEvent.setup();
    render(
      <TemporaryResidentsExplorer
        payload={createTemporaryCountryPayload()}
        populationRecords={populationPayload.series}
        geographyCode="CA"
        startYear={2024}
        endYear={2024}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: /Search temporary resident country table/i }),
      "Country 24",
    );

    expect(screen.getByText("1 of 24 countries")).toBeInTheDocument();
    expect(screen.getByText("Country 24")).toBeInTheDocument();
  });

  it("shows source-range messaging when selected years are outside temporary data", () => {
    render(
      <TemporaryResidentsExplorer
        payload={temporaryResidentsPayload}
        populationRecords={populationPayload.series}
        geographyCode="CA"
        startYear={2000}
        endYear={2005}
      />,
    );

    expect(
      screen.getByText(/does not overlap the temporary-resident source range/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No country-of-citizenship records are available/i),
    ).toBeInTheDocument();
  });
});
