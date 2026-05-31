export function AppFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:px-6 lg:px-8">
        <p>
          This website uses information made available by the Government of Canada and Statistics
          Canada under the{" "}
          <a
            className="font-medium text-lake underline-offset-4 hover:underline dark:text-wheat"
            href="https://open.canada.ca/en/open-government-licence-canada"
            target="_blank"
            rel="noreferrer"
          >
            Open Government Licence - Canada
          </a>
          . The data has been transformed and visualized for public analysis. This website is not
          affiliated with or endorsed by the Government of Canada, Statistics Canada, or
          Immigration, Refugees and Citizenship Canada.
        </p>
        <p>
          Data is provided for informational and educational purposes only. Transformation,
          grouping, and visualization choices may introduce simplifications. Users should consult
          the original government sources before making legal, financial, immigration, academic, or
          policy decisions.
        </p>
      </div>
    </footer>
  );
}
