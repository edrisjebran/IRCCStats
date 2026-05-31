import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useUrlSyncedState } from "./useUrlSyncedState";

function StateHarness() {
  const { state, setEndYear, setGeo, setStartYear, setTab } = useUrlSyncedState({
    minYear: 2023,
    maxYear: 2025,
  });

  return (
    <div>
      <output data-testid="state">
        {state.geo}|{state.startYear}|{state.endYear}|{state.tab}
      </output>
      <button type="button" onClick={() => setGeo("BC")}>
        Set BC
      </button>
      <button type="button" onClick={() => setStartYear(2025)}>
        Start 2025
      </button>
      <button type="button" onClick={() => setEndYear(2023)}>
        End 2023
      </button>
      <button type="button" onClick={() => setTab("economic")}>
        Economic tab
      </button>
    </div>
  );
}

describe("useUrlSyncedState", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("defaults a blank URL to Canada, the full year range, and overview", async () => {
    render(<StateHarness />);

    expect(screen.getByTestId("state")).toHaveTextContent("CA|2023|2025|overview");
    await waitFor(() => {
      expect(window.location.search).toBe("?geo=CA&startYear=2023&endYear=2025&tab=overview");
    });
  });

  it("parses valid URL state and keeps query params synchronized", async () => {
    window.history.replaceState(null, "", "/?geo=ON&startYear=2024&endYear=2025&tab=origins");

    render(<StateHarness />);

    expect(screen.getByTestId("state")).toHaveTextContent("ON|2024|2025|origins");
    await waitFor(() => {
      expect(window.location.search).toBe("?geo=ON&startYear=2024&endYear=2025&tab=origins");
    });
  });

  it("falls back from invalid URL state and clamps year bounds", async () => {
    window.history.replaceState(null, "", "/?geo=ZZ&startYear=2030&endYear=2000&tab=missing");

    render(<StateHarness />);

    expect(screen.getByTestId("state")).toHaveTextContent("CA|2023|2025|overview");
    await waitFor(() => {
      expect(window.location.search).toBe("?geo=CA&startYear=2023&endYear=2025&tab=overview");
    });
  });

  it("updates URL params when dashboard controls change", async () => {
    const user = userEvent.setup();
    render(<StateHarness />);

    await user.click(screen.getByRole("button", { name: "Set BC" }));
    await waitFor(() => {
      expect(window.location.search).toContain("geo=BC");
    });

    await user.click(screen.getByRole("button", { name: "Start 2025" }));
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("BC|2025|2025|overview");
    });

    await user.click(screen.getByRole("button", { name: "End 2023" }));
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("BC|2023|2023|overview");
    });

    await user.click(screen.getByRole("button", { name: "Economic tab" }));
    await waitFor(() => {
      expect(window.location.search).toBe("?geo=BC&startYear=2023&endYear=2023&tab=economic");
    });
  });
});
