export function toNumericRouteId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const exactNumber = Number(value);
  if (Number.isInteger(exactNumber) && exactNumber > 0) {
    return exactNumber;
  }

  const numericPart = value.match(/\d+/)?.[0];
  const parsed = numericPart ? Number(numericPart) : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
