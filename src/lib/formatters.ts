export function formatPopulation(value: number): string {
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: value > 0 ? "always" : "auto",
  }).format(value);
}

export function formatDecimal(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSignedNumber(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
    signDisplay: "always",
  }).format(value);
}

export function formatYear(value: number): string {
  return String(value);
}

export function formatSourceDate(value: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
