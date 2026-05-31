import { validateImmigrationPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { ImmigrationTrendsPayload } from "../types/datasets";

export function useImmigrationData() {
  return useJsonDataset<ImmigrationTrendsPayload>({
    url: "/data/immigration_trends.json",
    validate: validateImmigrationPayload,
    errorMessage:
      "We could not load the immigration dataset. Please refresh the page or try again later.",
  });
}
