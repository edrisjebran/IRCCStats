export function getYearRangeLabel(records: Array<{ year: number }>) {
  if (!records.length) return "No source years in range";
  const years = records.map((record) => record.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first}-${last}`;
}

export function getAvailableYearRangeLabel(records: Array<{ year: number }>) {
  return getYearRangeLabel(records);
}
