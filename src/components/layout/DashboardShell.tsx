import type { PropsWithChildren } from "react";

export function DashboardShell({ children }: PropsWithChildren) {
  return (
    <main className="bg-slate-50 text-ink dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
