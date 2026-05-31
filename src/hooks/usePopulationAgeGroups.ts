import { validatePopulationAgeGroupsPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { PopulationAgeGroupsPayload } from "../types/datasets";

export function usePopulationAgeGroups({ enabled = true } = {}) {
  return useJsonDataset<PopulationAgeGroupsPayload>({
    url: "/data/population_age_groups.json",
    validate: validatePopulationAgeGroupsPayload,
    enabled,
    errorMessage:
      "We could not load the population age-group dataset. Please refresh the page or try again later.",
  });
}
