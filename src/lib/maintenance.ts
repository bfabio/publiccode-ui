import { safeUrl } from "./sanitize.js";

export interface Contractor {
  name: string;
  website: string | null;
  email: string | null;
  until: { datetime: string; formatted: string } | null;
  ended: boolean;
}

export interface ContractMaintenance {
  contractors: Contractor[];
  // True when every contractor has an end date in the past, so the
  // software has no contract covering it any more.
  ended: boolean;
}

// js-yaml turns an unquoted 2021-08-07 into a Date at UTC midnight,
// a quoted one stays a string.
function isoDay(value: unknown): string | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (!match || isNaN(Date.parse(match[1]))) return null;
  return match[1];
}

// A contract runs through its until day, so it has ended only from the
// following day. Days compare as UTC dates, the same day the build sees.
export function contractMaintenance(
  maintenance: { type?: unknown; contractors?: unknown } | null | undefined,
  locale: string,
  now: Date,
): ContractMaintenance | null {
  if (maintenance?.type !== "contract" || !Array.isArray(maintenance.contractors)) return null;
  const today = now.toISOString().slice(0, 10);
  const format = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const contractors = maintenance.contractors
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .filter((c) => typeof c.name === "string" && c.name.trim() !== "")
    .map((c) => {
      const day = isoDay(c.until);
      const email = typeof c.email === "string" && c.email.trim() !== "" ? c.email.trim() : null;
      return {
        name: (c.name as string).trim(),
        website: typeof c.website === "string" ? safeUrl(c.website.trim()) : null,
        email: email && safeUrl(`mailto:${email}`) ? email : null,
        until: day ? { datetime: day, formatted: format.format(new Date(`${day}T00:00:00Z`)) } : null,
        ended: day !== null && day < today,
      };
    });
  if (contractors.length === 0) return null;
  return { contractors, ended: contractors.every((c) => c.ended) };
}
