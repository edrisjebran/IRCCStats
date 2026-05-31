# Canadian Population & Immigration Dashboard

A static-first analytics dashboard for Canadian population growth and permanent resident admissions.

The dashboard is organized into:

- Overview
- Origins
- Temporary Residents
- Demographics
- Economic Context

Overview renders the core population, permanent resident, country, and rate modules first. Larger
tab-specific modules and datasets are loaded on demand so the app remains a static Vercel deployment
without browser-side government API calls.

Current user-facing features include URL-synced geography/year/tab filters, light/dark/system
theme, source metadata, loading and error states, population and immigration charts, growth
attribution, permanent resident country tables, temporary resident stream/country tables,
demographic age-group views, economic income and labour indicators, Open Government Licence
attribution, and a legal disclaimer.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Recharts
- Static JSON files under `public/data`
- Vercel static deployment from `dist`

## Data Sources

- Statistics Canada table 17-10-0005-01, population estimates on July 1 by age and gender.
- Statistics Canada table 17-10-0008-01, annual demographic growth components for births, deaths, immigration, emigration, non-permanent residents, and interprovincial migration.
- Immigration, Refugees and Citizenship Canada, Permanent Residents - Monthly IRCC Updates.
- IRCC permanent resident breakdown resources for country of citizenship, age group, gender, and intended occupation. Canada-level country of citizenship covers 2000 onward; province/territory country-of-citizenship coverage is limited to the historical 2000-2015 intended-destination source.
- IRCC temporary resident monthly update resources for study permit holders, International Mobility Program work permit holders, and Temporary Foreign Worker Program work permit holders.
- Generated population age-group data from the same Statistics Canada population estimates table.
- Statistics Canada table 14-10-0375-01, annual unemployment and employment rates by geography.
- Statistics Canada table 11-10-0240-01, annual median employment income in 2024 constant dollars by geography.

The production app does not call government APIs in the browser. Data is fetched and transformed before deployment.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:run
npm run test:coverage
npm run format
npm run format:check
npm run validate:data
npm run data:population
npm run data:population-age
npm run data:population-components
npm run data:immigration
npm run data:breakdowns
npm run data:temporary
npm run data:economic
npm run data:all
npm run build
npm run check
npm run preview
```

`npm run test:coverage` enforces project coverage thresholds using Vitest, jsdom, React Testing
Library, and V8 coverage. The regression suite covers dataset validators, URL state, lazy JSON
loading, chart empty states, dashboard tab behavior, permanent resident country pagination/search,
temporary resident country pagination/search, and theme persistence.

`npm run check` is the pre-deployment gate. It runs data validation, typechecking, linting,
format-checking, coverage tests, and the production Vite build. Vercel is configured to run this
command, so failed validation, tests, coverage, typecheck, lint, formatting, or build failures block
deployment.

## Static Data Files

The browser fetches these generated files from `public/data` in production:

```text
population_history.json
immigration_trends.json
immigration_breakdowns.json
immigration_country_overview.json
temporary_residents.json
population_age_groups.json
population_components.json
economic_context.json
```

Tests, mocks, fixtures, coverage output, scripts, and source files are not served by production.
Vercel serves only the Vite `dist` output.

## Performance Notes

- The full production app is static: Vite builds files into `dist`, and Vercel serves them from the CDN.
- `vercel.json` applies immutable caching for hashed assets and short revalidation for static JSON data.
- Origins, Temporary Residents, Demographics, and Economic Context UI modules are split with
  `React.lazy`.
- Large tab datasets are loaded only when their module is needed. Overview progressively loads the
  temporary-resident country context instead of blocking the whole app shell.
- Dataset fetch hooks share one validation-aware loader so future datasets get consistent loading,
  cancellation, and error behavior.

## mcp-canada

The local Codex MCP config can be created with:

```bash
uvx mcp-canada install codex
```

This project also includes direct official-source build scripts so the data pipeline can run even when the current Codex session has not been restarted to load MCP tools.

## Deployment

Use Vercel with:

- Framework preset: Vite
- Build command: `npm run check`
- Output directory: `dist`
- Production environment variables: none for Version 1

`vercel.json` also pins the deployment command and output directory for safety.

Cache behavior:

- `/assets/(.*)`: `public, max-age=31536000, immutable`
- `/data/(.*).json`: `public, max-age=86400, stale-while-revalidate=3600`
- `/` and HTML files: `public, max-age=0, must-revalidate`

## Licence And Attribution

This website uses information made available by the Government of Canada and Statistics Canada under the Open Government Licence - Canada. The data has been transformed and visualized for public analysis. This website is not affiliated with or endorsed by the Government of Canada, Statistics Canada, or Immigration, Refugees and Citizenship Canada.
