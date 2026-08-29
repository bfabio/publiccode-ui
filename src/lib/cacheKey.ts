import { createHash } from "node:crypto";

// Key order is sorted so a reordered API response does not read as
// a data change.
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function dataCacheKey(value: unknown): string {
  return createHash("md5").update(JSON.stringify(stable(value))).digest("hex");
}
