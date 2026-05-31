import { DASHBOARD_TABS } from "../../data/tabs";
import type { DashboardTab } from "../../types/dashboard";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

export function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
  return (
    <nav
      className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-panel dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5"
      aria-label="Dashboard sections"
    >
      {DASHBOARD_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={`flex min-h-20 items-start gap-3 rounded-md px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-lake/30 ${
              active
                ? "bg-ink text-white dark:bg-wheat dark:text-ink"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
            onClick={() => onChange(tab.id)}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span
                className={`mt-1 block text-xs leading-5 ${
                  active ? "text-white/80 dark:text-ink/75" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {tab.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
