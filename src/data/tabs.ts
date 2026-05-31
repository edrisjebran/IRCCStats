import { BarChart3, BriefcaseBusiness, Globe2, IdCard, UsersRound } from "lucide-react";
import type { DashboardTab } from "../types/dashboard";

export const DASHBOARD_TABS: Array<{
  id: DashboardTab;
  label: string;
  description: string;
  icon: typeof BarChart3;
}> = [
  {
    id: "overview",
    label: "Overview",
    description: "Core population and permanent resident admission trends.",
    icon: BarChart3,
  },
  {
    id: "origins",
    label: "Origins",
    description: "Citizenship, age, gender, and intended occupation breakdowns.",
    icon: Globe2,
  },
  {
    id: "temporary",
    label: "Temporary Residents",
    description: "Study and work permit holder trends by selected geography.",
    icon: IdCard,
  },
  {
    id: "demographics",
    label: "Demographics",
    description: "Population age structure and source coverage.",
    icon: UsersRound,
  },
  {
    id: "economic",
    label: "Economic Context",
    description: "Employment income and labour force indicators.",
    icon: BriefcaseBusiness,
  },
];

export function isDashboardTab(value: string | null): value is DashboardTab {
  return DASHBOARD_TABS.some((tab) => tab.id === value);
}
