import { validateTemporaryResidentsPayload } from "../lib/validators";
import { useJsonDataset } from "./useJsonDataset";
import type { TemporaryResidentsPayload } from "../types/datasets";

export function useTemporaryResidents({ enabled = true } = {}) {
  return useJsonDataset<TemporaryResidentsPayload>({
    url: "/data/temporary_residents.json",
    validate: validateTemporaryResidentsPayload,
    enabled,
    errorMessage:
      "We could not load the temporary residents dataset. Please refresh the page or try again later.",
  });
}
