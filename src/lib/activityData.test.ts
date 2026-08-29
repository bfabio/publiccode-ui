import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSoftwareActivity, fetchStatsIndex, resolveStats } from "./activityData";
import type { CatalogStats } from "../types/analysis";

const stats = { stars: { max: 10, min: 0, p95: 5, mean: 2, count: 4, median: 1 } } as CatalogStats;

describe("resolveStats", () => {
  it("prefers the root stats over the catalog's", () => {
    expect(resolveStats({ root: stats, byCatalog: { c1: {} as CatalogStats } }, "c1")).toBe(stats);
  });

  it("falls back to the software's catalog", () => {
    expect(resolveStats({ root: null, byCatalog: { c1: stats } }, "c1")).toBe(stats);
  });

  it("returns null without root, matching catalog or catalogId", () => {
    expect(resolveStats({ root: null, byCatalog: { c1: stats } }, "c2")).toBeNull();
    expect(resolveStats({ root: null, byCatalog: {} }, null)).toBeNull();
  });
});

describe("fetch helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches each URL once and shares the promise", async () => {
    const fetchMock = vi.fn(async () => Response.json({ activity: { v: 1 } }));
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([
      fetchSoftwareActivity("dedupe-id"),
      fetchSoftwareActivity("dedupe-id"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ v: 1 });
    expect(b).toEqual({ v: 1 });
  });

  it("resolves null on a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await fetchSoftwareActivity("missing-id")).toBeNull();
    expect(await fetchStatsIndex()).toBeNull();
  });
});
