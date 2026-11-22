import { describe, expect, it } from "vitest";
import { formatDate, relativeDate } from "./date.js";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe("relativeDate", () => {
  it("renders day granularity", () => {
    expect(relativeDate(daysAgo(0), "en")).toBe("today");
    expect(relativeDate(daysAgo(1), "en")).toBe("yesterday");
    expect(relativeDate(daysAgo(5), "en")).toBe("5 days ago");
  });

  it("renders months and years", () => {
    expect(relativeDate(daysAgo(60), "en")).toBe("2 months ago");
    expect(relativeDate(daysAgo(800), "en")).toBe("2 years ago");
  });

  it("localizes", () => {
    expect(relativeDate(daysAgo(0), "it")).toBe("oggi");
  });

  it("rejects invalid input", () => {
    expect(relativeDate("", "en")).toBeNull();
    expect(relativeDate("not-a-date", "en")).toBeNull();
  });
});

describe("formatDate", () => {
  it("returns datetime and absolute text, no baked relative", () => {
    const d = formatDate("2026-01-15", "en");
    expect(d).toMatchObject({ datetime: "2026-01-15", formatted: "Jan 15, 2026" });
    expect(d).not.toHaveProperty("relative");
  });

  it("keeps the calendar day of a date-only value in every time zone", () => {
    const tz = process.env.TZ;
    try {
      for (const zone of ["America/Los_Angeles", "America/New_York", "UTC", "Europe/Rome", "Pacific/Kiritimati"]) {
        process.env.TZ = zone;
        expect(formatDate("2024-03-15", "en")).toEqual({ datetime: "2024-03-15", formatted: "Mar 15, 2024" });
      }
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
  });
});
