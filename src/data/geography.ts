import type { GeographyCode } from "../types/datasets";

export const GEOGRAPHIES: Array<{ code: GeographyCode; name: string; shortName: string }> = [
  { code: "CA", name: "Canada", shortName: "Canada" },
  { code: "NL", name: "Newfoundland and Labrador", shortName: "N.L." },
  { code: "PE", name: "Prince Edward Island", shortName: "P.E.I." },
  { code: "NS", name: "Nova Scotia", shortName: "N.S." },
  { code: "NB", name: "New Brunswick", shortName: "N.B." },
  { code: "QC", name: "Quebec", shortName: "Que." },
  { code: "ON", name: "Ontario", shortName: "Ont." },
  { code: "MB", name: "Manitoba", shortName: "Man." },
  { code: "SK", name: "Saskatchewan", shortName: "Sask." },
  { code: "AB", name: "Alberta", shortName: "Alta." },
  { code: "BC", name: "British Columbia", shortName: "B.C." },
  { code: "YT", name: "Yukon", shortName: "Yukon" },
  { code: "NT", name: "Northwest Territories", shortName: "N.W.T." },
  { code: "NU", name: "Nunavut", shortName: "Nunavut" },
];

export const GEOGRAPHY_CODES = GEOGRAPHIES.map((geo) => geo.code);

export function isGeographyCode(value: string | null): value is GeographyCode {
  return GEOGRAPHY_CODES.includes(value as GeographyCode);
}

export function getGeographyName(code: GeographyCode) {
  return GEOGRAPHIES.find((geo) => geo.code === code)?.name ?? code;
}
