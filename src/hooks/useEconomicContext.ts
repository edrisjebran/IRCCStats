import { validateEconomicContextPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { EconomicContextPayload } from "../types/datasets";

export function useEconomicContext({ enabled = true } = {}) {
  return useJsonDataset<EconomicContextPayload>({
    url: "/data/economic_context.json",
    validate: validateEconomicContextPayload,
    enabled,
    errorMessage:
      "We could not load the economic context dataset. Please refresh the page or try again later.",
  });
}
