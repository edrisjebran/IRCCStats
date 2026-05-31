import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreakdownBarChart } from "./BreakdownBarChart";
import { ImmigrationRateLineChart } from "./ImmigrationRateLineChart";
import { ImmigrationStackedBarChart } from "./ImmigrationStackedBarChart";
import { PopulationAgeGroupChart } from "./PopulationAgeGroupChart";
import { PopulationAreaChart } from "./PopulationAreaChart";
import { TemporaryResidentsStackedBarChart } from "./TemporaryResidentsStackedBarChart";
import {
  immigrationPayload,
  populationAgeGroupsPayload,
  populationPayload,
} from "../../test/fixtures";
import { temporaryResidentsPayload } from "../../test/fixtures";

describe("chart components", () => {
  it("renders populated chart containers with accessible image roles", () => {
    render(
      <>
        <BreakdownBarChart
          title="Breakdown"
          description="A breakdown chart"
          records={[{ label: "India", value: 100 }]}
        />
        <ImmigrationRateLineChart
          records={[{ year: 2024, rate: 11.4, admissions: 470_000, population: 41_200_000 }]}
          sourceYearsLabel="2024"
        />
        <ImmigrationStackedBarChart records={immigrationPayload.series} sourceYearsLabel="2024" />
        <PopulationAreaChart
          records={populationPayload.series}
          geographyCode="CA"
          sourceYearsLabel="2024"
        />
        <TemporaryResidentsStackedBarChart
          records={[
            {
              year: 2024,
              "Study permit holders": 10,
              "IMP work permit holders": 5,
              "TFWP work permit holders": 2,
            },
          ]}
          streams={temporaryResidentsPayload.streams}
          geographyName="Canada"
          sourceYearsLabel="2024"
        />
      </>,
    );

    expect(screen.getByRole("img", { name: "Breakdown" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Permanent residents admitted per 1,000 Canada residents",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Permanent resident admissions by category" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Canada population trend" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Temporary resident permit-effective rows by stream" }),
    ).toBeInTheDocument();
  });

  it("renders chart empty states for missing selected-range records", () => {
    render(
      <>
        <BreakdownBarChart
          title="Empty breakdown"
          description="No rows"
          records={[]}
          emptyMessage="No breakdown rows"
        />
        <ImmigrationRateLineChart records={[]} sourceYearsLabel="No source years in range" />
        <ImmigrationStackedBarChart records={[]} />
        <PopulationAreaChart records={[]} geographyCode="CA" />
        <TemporaryResidentsStackedBarChart
          records={[]}
          streams={temporaryResidentsPayload.streams}
          geographyName="Canada"
          sourceYearsLabel="No source years in range"
        />
        <PopulationAgeGroupChart
          records={populationAgeGroupsPayload.series}
          geographyCode="BC"
          startYear={2024}
          endYear={2024}
        />
      </>,
    );

    expect(screen.getByText("No breakdown rows")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No matching immigration and population records are available for this rate.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No immigration records are available for the selected range."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No population records are available for the selected range."),
    ).toBeInTheDocument();
    expect(screen.getByText(/No temporary resident permit-holder records/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        "No source records are available for this breakdown in the selected year range.",
      ),
    ).toBeInTheDocument();
  });
});
