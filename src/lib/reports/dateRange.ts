export type DateRangeInput = {
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
};

export function toEventRangeIso(range: DateRangeInput) {
  // Interpret inputs as local-day boundaries.
  // Supabase will accept ISO strings and compare against timestamptz.
  const fromDate = new Date(`${range.from}T00:00:00`);
  const toDate = new Date(`${range.to}T23:59:59.999`);
  return {
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    fromDate,
    toDate,
  };
}
