// Digit-only masks for free-typed time fields (no picker widget) - format as the user types
// rather than validating after the fact.
const formatHhMm = (digits: string) => (digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`);

export const formatTimeMask = (raw: string) => formatHhMm(raw.replace(/\D/g, '').slice(0, 4));

export const formatTimeRangeMask = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const from = digits.slice(0, 4);
  const to = digits.slice(4, 8);
  return to ? `${formatHhMm(from)} - ${formatHhMm(to)}` : formatHhMm(from);
};
