import { validateImmigrationBreakdownsPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { ImmigrationBreakdownsPayload } from "../types/datasets";

export function useImmigrationBreakdowns({ enabled = true } = {}) {
  return useJsonDataset<ImmigrationBreakdownsPayload>({
    url: "/data/immigration_breakdowns.json",
    validate: validateImmigrationBreakdownsPayload,
    enabled,
    errorMessage:
      "We could not load the immigration breakdown dataset. Please refresh the page or try again later.",
  });
}
