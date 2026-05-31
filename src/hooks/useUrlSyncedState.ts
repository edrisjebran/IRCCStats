import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDashboardTab } from "../data/tabs";
import { isGeographyCode } from "../data/geography";
import type { DashboardUrlState, YearBounds } from "../types/dashboard";
import type { DashboardTab } from "../types/dashboard";
import type { GeographyCode } from "../types/datasets";

function clampYear(value: number, bounds: YearBounds) {
  return Math.min(bounds.maxYear, Math.max(bounds.minYear, value));
}

function normalizeState(state: DashboardUrlState, bounds: YearBounds): DashboardUrlState {
  const startYear = clampYear(state.startYear, bounds);
  const endYear = clampYear(state.endYear, bounds);
  return {
    geo: state.geo,
    startYear: Math.min(startYear, endYear),
    endYear: Math.max(startYear, endYear),
    tab: state.tab,
  };
}

function parseYearParam(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function parseUrlState(bounds: YearBounds): DashboardUrlState {
  const params = new URLSearchParams(window.location.search);
  const geoParam = params.get("geo");
  const tabParam = params.get("tab");

  return normalizeState(
    {
      geo: isGeographyCode(geoParam) ? geoParam : "CA",
      startYear: parseYearParam(params.get("startYear"), bounds.minYear),
      endYear: parseYearParam(params.get("endYear"), bounds.maxYear),
      tab: isDashboardTab(tabParam) ? tabParam : "overview",
    },
    bounds,
  );
}

function toUrl(state: DashboardUrlState) {
  const params = new URLSearchParams();
  params.set("geo", state.geo);
  params.set("startYear", String(state.startYear));
  params.set("endYear", String(state.endYear));
  params.set("tab", state.tab);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}

export function useUrlSyncedState(bounds: YearBounds) {
  const [state, setState] = useState<DashboardUrlState>(() => parseUrlState(bounds));
  const historyModeRef = useRef<"push" | "replace">("replace");

  const stableBounds = useMemo(
    () => ({ minYear: bounds.minYear, maxYear: bounds.maxYear }),
    [bounds.minYear, bounds.maxYear],
  );

  useEffect(() => {
    function handlePopState() {
      historyModeRef.current = "replace";
      setState(parseUrlState(stableBounds));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [stableBounds]);

  useEffect(() => {
    const nextUrl = toUrl(state);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    if (historyModeRef.current === "push") {
      window.history.pushState(null, "", nextUrl);
    } else {
      window.history.replaceState(null, "", nextUrl);
    }
    historyModeRef.current = "replace";
  }, [state]);

  const setGeo = useCallback((geo: GeographyCode) => {
    historyModeRef.current = "push";
    setState((current) => ({ ...current, geo }));
  }, []);

  const setStartYear = useCallback(
    (startYear: number) => {
      historyModeRef.current = "replace";
      setState((current) =>
        normalizeState(
          { ...current, startYear, endYear: Math.max(startYear, current.endYear) },
          stableBounds,
        ),
      );
    },
    [stableBounds],
  );

  const setEndYear = useCallback(
    (endYear: number) => {
      historyModeRef.current = "replace";
      setState((current) =>
        normalizeState(
          { ...current, startYear: Math.min(current.startYear, endYear), endYear },
          stableBounds,
        ),
      );
    },
    [stableBounds],
  );

  const setTab = useCallback((tab: DashboardTab) => {
    historyModeRef.current = "push";
    setState((current) => ({ ...current, tab }));
  }, []);

  return useMemo(
    () => ({
      state,
      setGeo,
      setStartYear,
      setEndYear,
      setTab,
    }),
    [setEndYear, setGeo, setStartYear, setTab, state],
  );
}
