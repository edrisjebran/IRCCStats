import { validatePopulationComponentsPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { PopulationComponentsPayload } from "../types/datasets";

export function usePopulationComponents() {
  return useJsonDataset<PopulationComponentsPayload>({
    url: "/data/population_components.json",
    validate: validatePopulationComponentsPayload,
    errorMessage:
      "We could not load the population growth components dataset. Please refresh the page or try again later.",
  });
}
