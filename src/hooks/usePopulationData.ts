import { validatePopulationPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { PopulationHistoryPayload } from "../types/datasets";

export function usePopulationData() {
  return useJsonDataset<PopulationHistoryPayload>({
    url: "/data/population_history.json",
    validate: validatePopulationPayload,
    errorMessage:
      "We could not load the population dataset. Please refresh the page or try again later.",
  });
}
