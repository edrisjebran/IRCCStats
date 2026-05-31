import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { mockFetch } from "./test/fixtures";

function requestedPaths(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.map(([input]) => {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.pathname;
    return input.url;
  });
}

async function renderDashboard(url = "/?geo=CA&startYear=2024&endYear=2024&tab=overview") {
  window.history.replaceState(null, "", url);
  const fetchMock = mockFetch();
  vi.stubGlobal("fetch", fetchMock);

  render(<App />);

  await screen.findByRole("heading", {
    name: /Canadian Population & Immigration Dashboard/i,
  });

  return fetchMock;
}

describe("App dashboard smoke tests", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Overview tab with core and country modules while keeping heavy origins data lazy", async () => {
    const fetchMock = await renderDashboard("/?geo=BC&startYear=2024&endYear=2024&tab=overview");

    expect(screen.getByText("Category mix and selected-range totals")).toBeInTheDocument();
    expect(screen.getByText("Country of citizenship breakdown")).toBeInTheDocument();
    expect(await screen.findByText("Permit-row country breakdown")).toBeInTheDocument();

    const paths = requestedPaths(fetchMock);
    expect(paths).toContain("/data/population_history.json");
    expect(paths).toContain("/data/immigration_country_overview.json");
    expect(paths).toContain("/data/temporary_residents.json");
    expect(paths).not.toContain("/data/immigration_breakdowns.json");
    expect(paths).not.toContain("/data/population_age_groups.json");
    expect(paths).not.toContain("/data/economic_context.json");
  });

  it("falls back from an invalid tab to overview and repairs the URL", async () => {
    await renderDashboard("/?geo=CA&startYear=2024&endYear=2024&tab=not-real");

    expect(screen.getByText("Category mix and selected-range totals")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.search).toBe("?geo=CA&startYear=2024&endYear=2024&tab=overview");
    });
  });

  it("loads temporary, origins, demographics, and economic modules from their tabs", async () => {
    const user = userEvent.setup();
    const fetchMock = await renderDashboard();

    await user.click(screen.getByRole("button", { name: /Temporary Residents/i }));
    await screen.findByText("Study and work permit holder context");

    await user.click(screen.getByRole("button", { name: /Origins/i }));
    await screen.findByText("Country of citizenship table");

    await user.click(screen.getByRole("button", { name: /Demographics/i }));
    await screen.findByText("Population age structure");

    await user.click(screen.getByRole("button", { name: /Economic Context/i }));
    await screen.findByText("Employment income and labour force indicators");

    const paths = requestedPaths(fetchMock);
    expect(paths).toContain("/data/immigration_breakdowns.json");
    expect(paths).toContain("/data/population_age_groups.json");
    expect(paths).toContain("/data/economic_context.json");
  });

  it("persists the selected theme mode", async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(localStorage.getItem("dashboard-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
