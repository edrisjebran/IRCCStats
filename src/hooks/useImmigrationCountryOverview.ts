import { validateImmigrationCountryOverviewPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { ImmigrationCountryOverviewPayload } from "../types/datasets";

export function useImmigrationCountryOverview() {
  return useJsonDataset<ImmigrationCountryOverviewPayload>({
    url: "/data/immigration_country_overview.json",
    validate: validateImmigrationCountryOverviewPayload,
    errorMessage:
      "We could not load the immigration country overview dataset. Please refresh the page or try again later.",
  });
}
