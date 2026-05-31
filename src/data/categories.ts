import type { ImmigrationCategory } from "../types/datasets";

export const IMMIGRATION_CATEGORIES: ImmigrationCategory[] = [
  "Economic",
  "Family",
  "Refugee",
  "Other",
];

export const CATEGORY_COLORS: Record<ImmigrationCategory, string> = {
  Economic: "#0f6b80",
  Family: "#b4222a",
  Refugee: "#1f6f50",
  Other: "#9a6b16",
};

export const CATEGORY_DESCRIPTIONS: Record<ImmigrationCategory, string> = {
  Economic: "Economic and worker/business pathways",
  Family: "Sponsored family class",
  Refugee: "Refugees and protected persons",
  Other: "Humanitarian, public policy, and other streams",
};
