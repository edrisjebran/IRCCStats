import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { PopulationAreaChart } from "./components/charts/PopulationAreaChart";
import { ImmigrationStackedBarChart } from "./components/charts/ImmigrationStackedBarChart";
import { ImmigrationRateLineChart } from "./components/charts/ImmigrationRateLineChart";
import { ControlBar } from "./components/controls/ControlBar";
import { DashboardTabs } from "./components/controls/DashboardTabs";
import { AppFooter } from "./components/layout/AppFooter";
import { AppHeader } from "./components/layout/AppHeader";
import { DashboardShell } from "./components/layout/DashboardShell";
import { CountryMobilityOverview } from "./components/metrics/CountryMobilityOverview";
import { PopulationGrowthComponents } from "./components/metrics/PopulationGrowthComponents";
import { PermanentResidentAdmissionsDetail } from "./components/metrics/PermanentResidentAdmissionsDetail";
import { PermanentResidentCountryOverview } from "./components/metrics/PermanentResidentCountryOverview";
import { SummaryCards } from "./components/metrics/SummaryCards";
import { calculateImmigrationRatePer1000, filterByYearRange } from "./lib/calculations";
import { formatSourceDate } from "./lib/formatters";
import { getAvailableYearRangeLabel, getYearRangeLabel } from "./lib/sourceYears";
import { useEconomicContext } from "./hooks/useEconomicContext";
import { useImmigrationBreakdowns } from "./hooks/useImmigrationBreakdowns";
import { useImmigrationCountryOverview } from "./hooks/useImmigrationCountryOverview";
import { useImmigrationData } from "./hooks/useImmigrationData";
import { usePopulationAgeGroups } from "./hooks/usePopulationAgeGroups";
import { usePopulationComponents } from "./hooks/usePopulationComponents";
import { usePopulationData } from "./hooks/usePopulationData";
import { useTemporaryResidents } from "./hooks/useTemporaryResidents";
import { useTheme } from "./hooks/useTheme";
import { useUrlSyncedState } from "./hooks/useUrlSyncedState";
import type { GeographyCode } from "./types/datasets";

const BreakdownExplorer = lazy(() =>
  import("./components/metrics/BreakdownExplorer").then((module) => ({
    default: module.BreakdownExplorer,
  })),
);

const TemporaryResidentsExplorer = lazy(() =>
  import("./components/metrics/TemporaryResidentsExplorer").then((module) => ({
    default: module.TemporaryResidentsExplorer,
  })),
);

const PopulationAgeGroupChart = lazy(() =>
  import("./components/charts/PopulationAgeGroupChart").then((module) => ({
    default: module.PopulationAgeGroupChart,
  })),
);

const EconomicContextExplorer = lazy(() =>
  import("./components/metrics/EconomicContextExplorer").then((module) => ({
    default: module.EconomicContextExplorer,
  })),
);

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-ink dark:bg-slate-950 dark:text-white">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading datasets</p>
        <p className="mt-2 text-2xl font-semibold">Preparing dashboard</p>
      </div>
    </div>
  );
}

function ErrorState({ errors }: { errors: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-ink dark:bg-slate-950 dark:text-white">
      <div className="max-w-xl rounded-lg border border-maple/30 bg-white p-6 shadow-panel dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-red-300">
          Data unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold">The dashboard could not load.</h1>
        <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const population = usePopulationData();
  const populationComponents = usePopulationComponents();
  const immigration = useImmigrationData();
  const countryOverview = useImmigrationCountryOverview();
  const { theme, setTheme } = useTheme();

  if (
    population.loading ||
    populationComponents.loading ||
    immigration.loading ||
    countryOverview.loading
  ) {
    return <LoadingState />;
  }

  if (
    population.error ||
    populationComponents.error ||
    immigration.error ||
    countryOverview.error ||
    !population.data ||
    !populationComponents.data ||
    !immigration.data ||
    !countryOverview.data
  ) {
    return (
      <ErrorState
        errors={
          [
            population.error,
            populationComponents.error,
            immigration.error,
            countryOverview.error,
          ].filter(Boolean) as string[]
        }
      />
    );
  }

  const populationYears = population.data.series.map((record) => record.year);
  const immigrationYears = immigration.data.series.map((record) => record.year);
  const minYear = Math.max(Math.min(...populationYears), Math.min(...immigrationYears));
  const maxYear = Math.min(Math.max(...populationYears), Math.max(...immigrationYears));

  return (
    <>
      <Dashboard
        minYear={minYear}
        maxYear={maxYear}
        theme={theme}
        onThemeChange={setTheme}
        population={population.data}
        populationComponents={populationComponents.data}
        immigration={immigration.data}
        countryOverview={countryOverview.data}
      />
      <Analytics />
    </>
  );
}

interface DashboardProps {
  minYear: number;
  maxYear: number;
  theme: "light" | "dark" | "system";
  onThemeChange: (value: "light" | "dark" | "system") => void;
  population: NonNullable<ReturnType<typeof usePopulationData>["data"]>;
  populationComponents: NonNullable<ReturnType<typeof usePopulationComponents>["data"]>;
  immigration: NonNullable<ReturnType<typeof useImmigrationData>["data"]>;
  countryOverview: NonNullable<ReturnType<typeof useImmigrationCountryOverview>["data"]>;
}

function Dashboard({
  minYear,
  maxYear,
  theme,
  onThemeChange,
  population,
  populationComponents,
  immigration,
  countryOverview,
}: DashboardProps) {
  const { state, setGeo, setStartYear, setEndYear, setTab } = useUrlSyncedState({
    minYear,
    maxYear,
  });
  const populationRecords = filterByYearRange(population.series, state.startYear, state.endYear);
  const immigrationRecords = filterByYearRange(immigration.series, state.startYear, state.endYear);
  const immigrationRateRecords = filterByYearRange(
    calculateImmigrationRatePer1000(population.series, immigration.series),
    state.startYear,
    state.endYear,
  );
  const populationYearsLabel = getYearRangeLabel(populationRecords);
  const immigrationYearsLabel = getYearRangeLabel(immigrationRecords);
  const rateYearsLabel = getYearRangeLabel(immigrationRateRecords);
  const breakdowns = useImmigrationBreakdowns({ enabled: state.tab === "origins" });
  const populationAgeGroups = usePopulationAgeGroups({ enabled: state.tab === "demographics" });
  const economicContext = useEconomicContext({ enabled: state.tab === "economic" });
  const temporaryResidents = useTemporaryResidents({
    enabled: state.tab === "overview" || state.tab === "temporary",
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader
        latestYear={maxYear}
        populationMetadata={population.metadata}
        immigrationMetadata={immigration.metadata}
      />
      <DashboardShell>
        <ControlBar
          geo={state.geo}
          startYear={state.startYear}
          endYear={state.endYear}
          minYear={minYear}
          maxYear={maxYear}
          theme={theme}
          onGeoChange={setGeo}
          onStartYearChange={setStartYear}
          onEndYearChange={setEndYear}
          onThemeChange={onThemeChange}
        />

        <DashboardTabs activeTab={state.tab} onChange={setTab} />

        {state.tab === "overview" && (
          <OverviewTab
            population={population}
            immigration={immigration}
            countryOverview={countryOverview}
            temporaryResidents={temporaryResidents}
            populationComponents={populationComponents}
            populationRecords={populationRecords}
            allPopulationRecords={population.series}
            immigrationRecords={immigrationRecords}
            immigrationRateRecords={immigrationRateRecords}
            geographyCode={state.geo}
            startYear={state.startYear}
            endYear={state.endYear}
            populationYearsLabel={populationYearsLabel}
            immigrationYearsLabel={immigrationYearsLabel}
            rateYearsLabel={rateYearsLabel}
          />
        )}

        {state.tab === "origins" && (
          <>
            {breakdowns.loading && <InlineDatasetState title="Loading origins" />}
            {(breakdowns.error || !breakdowns.data) && !breakdowns.loading && (
              <InlineDatasetState
                title="Origins unavailable"
                message={breakdowns.error ?? "Immigration breakdown data did not load."}
              />
            )}
            {breakdowns.data && (
              <Suspense fallback={<InlineDatasetState title="Loading origins module" />}>
                <BreakdownExplorer
                  payload={breakdowns.data}
                  geographyCode={state.geo}
                  startYear={state.startYear}
                  endYear={state.endYear}
                />
              </Suspense>
            )}
          </>
        )}

        {state.tab === "temporary" && (
          <>
            {temporaryResidents.loading && (
              <InlineDatasetState title="Loading temporary residents" />
            )}
            {(temporaryResidents.error || !temporaryResidents.data) &&
              !temporaryResidents.loading && (
                <InlineDatasetState
                  title="Temporary residents unavailable"
                  message={temporaryResidents.error ?? "Temporary residents data did not load."}
                />
              )}
            {temporaryResidents.data && (
              <Suspense
                fallback={<InlineDatasetState title="Loading temporary residents module" />}
              >
                <TemporaryResidentsExplorer
                  payload={temporaryResidents.data}
                  populationRecords={population.series}
                  geographyCode={state.geo}
                  startYear={state.startYear}
                  endYear={state.endYear}
                />
              </Suspense>
            )}
          </>
        )}

        {state.tab === "demographics" && (
          <>
            {populationAgeGroups.loading && <InlineDatasetState title="Loading demographics" />}
            {(populationAgeGroups.error || !populationAgeGroups.data) &&
              !populationAgeGroups.loading && (
                <InlineDatasetState
                  title="Demographics unavailable"
                  message={populationAgeGroups.error ?? "Population age-group data did not load."}
                />
              )}
            {populationAgeGroups.data && (
              <Suspense fallback={<InlineDatasetState title="Loading demographics module" />}>
                <DemographicsTab
                  populationAgeGroups={populationAgeGroups.data}
                  geographyCode={state.geo}
                  startYear={state.startYear}
                  endYear={state.endYear}
                />
              </Suspense>
            )}
          </>
        )}

        {state.tab === "economic" && (
          <>
            {economicContext.loading && <InlineDatasetState title="Loading economic context" />}
            {(economicContext.error || !economicContext.data) && !economicContext.loading && (
              <InlineDatasetState
                title="Economic context unavailable"
                message={economicContext.error ?? "Economic context data did not load."}
              />
            )}
            {economicContext.data && (
              <Suspense fallback={<InlineDatasetState title="Loading economic context module" />}>
                <EconomicContextExplorer
                  payload={economicContext.data}
                  populationRecords={population.series}
                  geographyCode={state.geo}
                  startYear={state.startYear}
                  endYear={state.endYear}
                />
              </Suspense>
            )}
          </>
        )}
      </DashboardShell>
      <AppFooter />
    </div>
  );
}

type PopulationPayload = NonNullable<ReturnType<typeof usePopulationData>["data"]>;
type PopulationAgePayload = NonNullable<ReturnType<typeof usePopulationAgeGroups>["data"]>;
type PopulationComponentsPayload = NonNullable<ReturnType<typeof usePopulationComponents>["data"]>;
type ImmigrationPayload = NonNullable<ReturnType<typeof useImmigrationData>["data"]>;
type ImmigrationCountryOverviewPayload = NonNullable<
  ReturnType<typeof useImmigrationCountryOverview>["data"]
>;

function InlineDatasetState({
  title,
  message = "Preparing this module.",
}: {
  title: string;
  message?: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
        Dataset status
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
    </section>
  );
}

interface OverviewTabProps {
  population: PopulationPayload;
  immigration: ImmigrationPayload;
  countryOverview: ImmigrationCountryOverviewPayload;
  temporaryResidents: ReturnType<typeof useTemporaryResidents>;
  populationComponents: PopulationComponentsPayload;
  populationRecords: PopulationPayload["series"];
  allPopulationRecords: PopulationPayload["series"];
  immigrationRecords: ImmigrationPayload["series"];
  immigrationRateRecords: Array<{
    year: number;
    rate: number;
    admissions: number;
    population: number;
  }>;
  geographyCode: Parameters<typeof SummaryCards>[0]["geographyCode"];
  startYear: number;
  endYear: number;
  populationYearsLabel: string;
  immigrationYearsLabel: string;
  rateYearsLabel: string;
}

function OverviewTab({
  population,
  immigration,
  countryOverview,
  temporaryResidents,
  populationComponents,
  populationRecords,
  allPopulationRecords,
  immigrationRecords,
  immigrationRateRecords,
  geographyCode,
  startYear,
  endYear,
  populationYearsLabel,
  immigrationYearsLabel,
  rateYearsLabel,
}: OverviewTabProps) {
  return (
    <>
      <SummaryCards
        geographyCode={geographyCode}
        populationRecords={populationRecords}
        immigrationRecords={immigrationRecords}
        immigrationRateRecords={immigrationRateRecords}
      />

      <PopulationGrowthComponents
        payload={populationComponents}
        populationRecords={allPopulationRecords}
        geographyCode={geographyCode}
        startYear={startYear}
        endYear={endYear}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <PopulationAreaChart
          records={populationRecords}
          geographyCode={geographyCode}
          sourceYearsLabel={populationYearsLabel}
        />
        <ImmigrationStackedBarChart
          records={immigrationRecords}
          sourceYearsLabel={immigrationYearsLabel}
        />
      </section>

      <PermanentResidentAdmissionsDetail
        records={immigrationRecords}
        sourceYearsLabel={immigrationYearsLabel}
      />

      <PermanentResidentCountryOverview
        records={countryOverview.records}
        startYear={startYear}
        endYear={endYear}
      />

      {temporaryResidents.loading && (
        <InlineDatasetState title="Loading temporary resident country context" />
      )}
      {(temporaryResidents.error || !temporaryResidents.data) && !temporaryResidents.loading && (
        <InlineDatasetState
          title="Temporary resident country context unavailable"
          message={temporaryResidents.error ?? "Temporary residents data did not load."}
        />
      )}
      {temporaryResidents.data && (
        <CountryMobilityOverview
          permanentResidentRecords={countryOverview.records}
          temporaryResidents={temporaryResidents.data}
          populationComponents={populationComponents}
          geographyCode={geographyCode}
          startYear={startYear}
          endYear={endYear}
        />
      )}

      <ImmigrationRateLineChart
        records={immigrationRateRecords}
        sourceYearsLabel={rateYearsLabel}
      />

      <MethodologySummary
        population={population}
        populationComponents={populationComponents}
        immigration={immigration}
      />
    </>
  );
}

function MethodologySummary({
  population,
  populationComponents,
  immigration,
}: {
  population: PopulationPayload;
  populationComponents: PopulationComponentsPayload;
  immigration: ImmigrationPayload;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-panel dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 lg:grid-cols-4">
      <div>
        <h2 className="font-semibold text-ink dark:text-white">Population methodology</h2>
        <p className="mt-2">
          {population.metadata.notes} Full source range:{" "}
          {getAvailableYearRangeLabel(population.series)}. Source updated{" "}
          {formatSourceDate(population.metadata.last_updated)}.
        </p>
      </div>
      <div>
        <h2 className="font-semibold text-ink dark:text-white">Growth components</h2>
        <p className="mt-2">
          {populationComponents.metadata.notes} Full source range:{" "}
          {getAvailableYearRangeLabel(populationComponents.series)}. Source updated{" "}
          {formatSourceDate(populationComponents.metadata.last_updated)}.
        </p>
      </div>
      <div>
        <h2 className="font-semibold text-ink dark:text-white">Immigration methodology</h2>
        <p className="mt-2">
          {immigration.metadata.notes} Full source range:{" "}
          {getAvailableYearRangeLabel(immigration.series)}. Source updated{" "}
          {formatSourceDate(immigration.metadata.last_updated)}.
        </p>
      </div>
      <div>
        <h2 className="font-semibold text-ink dark:text-white">Shareable state</h2>
        <p className="mt-2">
          Geography, year range, and active tab are written to the URL as query parameters, so
          copied links reopen the same dashboard view.
        </p>
      </div>
    </section>
  );
}

function DemographicsTab({
  populationAgeGroups,
  geographyCode,
  startYear,
  endYear,
}: {
  populationAgeGroups: PopulationAgePayload;
  geographyCode: GeographyCode;
  startYear: number;
  endYear: number;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-normal text-maple dark:text-wheat">
          Demographics
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">
          Population age structure
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Uses Statistics Canada annual July 1 population estimates grouped into broad age bands.
          Full source range: {getAvailableYearRangeLabel(populationAgeGroups.series)}. Source
          updated {formatSourceDate(populationAgeGroups.metadata.last_updated)}.
        </p>
      </div>
      <PopulationAgeGroupChart
        records={populationAgeGroups.series}
        geographyCode={geographyCode}
        startYear={startYear}
        endYear={endYear}
      />
    </section>
  );
}
