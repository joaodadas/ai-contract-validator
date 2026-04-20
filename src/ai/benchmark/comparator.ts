export type FieldComparison = {
  field: string;
  status: "match" | "mismatch" | "missing";
  expected: unknown;
  actual: unknown;
};

const NUMERIC_TOLERANCE = 1.0; // R$ 1.00

function normalizeString(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (isNullish(a) && isNullish(b)) return true;

  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < NUMERIC_TOLERANCE;
  }

  if (typeof a === "string" && typeof b === "string") {
    return normalizeString(a) === normalizeString(b);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (
    typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null
  ) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }

  return false;
}

export function compareFields(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): FieldComparison[] {
  const results: FieldComparison[] = [];

  for (const field of Object.keys(expected)) {
    const expectedVal = expected[field];
    const actualVal = actual[field];

    if (!(field in actual) && !isNullish(expectedVal)) {
      results.push({ field, status: "missing", expected: expectedVal, actual: undefined });
      continue;
    }

    const isMatch = deepEqual(expectedVal, actualVal);
    results.push({
      field,
      status: isMatch ? "match" : "mismatch",
      expected: expectedVal,
      actual: actualVal,
    });
  }

  return results;
}
