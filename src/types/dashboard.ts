import type { GeographyCode } from "./datasets";

export type DashboardTab = "overview" | "origins" | "temporary" | "demographics" | "economic";

export interface DashboardUrlState {
  geo: GeographyCode;
  startYear: number;
  endYear: number;
  tab: DashboardTab;
}

export interface YearBounds {
  minYear: number;
  maxYear: number;
}
