import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEconomicContext } from "./useEconomicContext";
import { useImmigrationBreakdowns } from "./useImmigrationBreakdowns";
import { useImmigrationCountryOverview } from "./useImmigrationCountryOverview";
import { useImmigrationData } from "./useImmigrationData";
import { usePopulationAgeGroups } from "./usePopulationAgeGroups";
import { usePopulationComponents } from "./usePopulationComponents";
import { usePopulationData } from "./usePopulationData";
import { useTemporaryResidents } from "./useTemporaryResidents";
import { mockFetch } from "../test/fixtures";

describe("data loading hooks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and validates always-on static datasets", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    const population = renderHook(() => usePopulationData());
    const populationComponents = renderHook(() => usePopulationComponents());
    const immigration = renderHook(() => useImmigrationData());
    const countryOverview = renderHook(() => useImmigrationCountryOverview());
    const temporaryResidents = renderHook(() => useTemporaryResidents());

    await waitFor(() => {
      expect(population.result.current.data?.series).toHaveLength(3);
      expect(populationComponents.result.current.data?.series.length).toBeGreaterThan(0);
      expect(immigration.result.current.data?.series).toHaveLength(3);
      expect(countryOverview.result.current.data?.records).toHaveLength(3);
      expect(temporaryResidents.result.current.data?.countryOfCitizenship).toHaveLength(6);
    });

    expect(fetchMock).toHaveBeenCalledWith("/data/population_history.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/population_components.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/immigration_trends.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/immigration_country_overview.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/temporary_residents.json");
  });

  it("does not fetch lazy module datasets until enabled", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    const breakdowns = renderHook(({ enabled }) => useImmigrationBreakdowns({ enabled }), {
      initialProps: { enabled: false },
    });
    const ageGroups = renderHook(({ enabled }) => usePopulationAgeGroups({ enabled }), {
      initialProps: { enabled: false },
    });
    const economic = renderHook(({ enabled }) => useEconomicContext({ enabled }), {
      initialProps: { enabled: false },
    });
    const temporary = renderHook(({ enabled }) => useTemporaryResidents({ enabled }), {
      initialProps: { enabled: false },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(breakdowns.result.current.loading).toBe(false);
    expect(ageGroups.result.current.loading).toBe(false);
    expect(economic.result.current.loading).toBe(false);
    expect(temporary.result.current.loading).toBe(false);

    breakdowns.rerender({ enabled: true });
    ageGroups.rerender({ enabled: true });
    economic.rerender({ enabled: true });
    temporary.rerender({ enabled: true });

    await waitFor(() => {
      expect(breakdowns.result.current.data?.dimensions.countryOfCitizenship).toHaveLength(3);
      expect(ageGroups.result.current.data?.series).toHaveLength(6);
      expect(economic.result.current.data?.series).toHaveLength(4);
      expect(temporary.result.current.data?.countryOfCitizenship).toHaveLength(6);
    });

    expect(fetchMock).toHaveBeenCalledWith("/data/immigration_breakdowns.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/population_age_groups.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/economic_context.json");
    expect(fetchMock).toHaveBeenCalledWith("/data/temporary_residents.json");
  });

  it("returns user-facing errors for failed dataset requests", async () => {
    vi.stubGlobal("fetch", mockFetch({}));

    const { result } = renderHook(() => usePopulationData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toMatch(/could not load the population dataset/i);
  });
});
