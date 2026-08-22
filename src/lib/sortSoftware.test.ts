import { describe, expect, it } from "vitest";
import { sortByScores, sortItems } from "./sortSoftware";

const item = (id: string, name = id, releaseDate = "") => ({ id, name, releaseDate });

describe("sortItems activity_desc", () => {
  it("orders by score descending", () => {
    const scores = new Map<string, number | null>([
      ["low", 10],
      ["high", 90],
      ["mid", 50],
    ]);
    const out = sortItems([item("low"), item("high"), item("mid")], "activity_desc", scores);
    expect(out.map((i) => i.id)).toEqual(["high", "mid", "low"]);
  });

  it("orders by score ascending, unscored still last", () => {
    const scores = new Map<string, number | null>([
      ["low", 10],
      ["high", 90],
      ["mid", 50],
      ["na", null],
    ]);
    const out = sortItems(
      [item("high"), item("na"), item("low"), item("nodata"), item("mid")],
      "activity_asc",
      scores,
    );
    expect(out.map((i) => i.id)).toEqual(["low", "mid", "high", "na", "nodata"]);
  });

  it("puts unscored and n/a items last, alphabetically", () => {
    const scores = new Map<string, number | null>([
      ["scored", 42],
      ["na", null],
    ]);
    const out = sortItems(
      [item("nodata", "Zeta"), item("na", "Alpha"), item("scored", "Mid")],
      "activity_desc",
      scores,
    );
    expect(out.map((i) => i.id)).toEqual(["scored", "na", "nodata"]);
  });

  it("breaks score ties by name", () => {
    const scores = new Map<string, number | null>([
      ["b", 50],
      ["a", 50],
    ]);
    const out = sortItems([item("b", "Beta"), item("a", "Alpha")], "activity_desc", scores);
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("sortByScores", () => {
  it("orders by the given map, missing and null last", () => {
    const scores = new Map<string, number | null>([
      ["low", 2],
      ["high", 20],
      ["na", null],
    ]);
    const out = sortByScores([item("na"), item("low"), item("missing"), item("high")], scores, "desc");
    expect(out.map((i) => i.id)).toEqual(["high", "low", "missing", "na"]);
  });

  it("ascending keeps unscored last and breaks ties by name", () => {
    const scores = new Map<string, number | null>([
      ["b", 5],
      ["a", 5],
      ["top", 9],
    ]);
    const out = sortByScores([item("top"), item("b", "Beta"), item("none"), item("a", "Alpha")], scores, "asc");
    expect(out.map((i) => i.id)).toEqual(["a", "b", "top", "none"]);
  });
});

describe("query tiebreak", () => {
  it("orders same-date items by match rank, then name", () => {
    const items = [
      item("c", "Zeta open", "2026-01-01"),
      item("a", "Open", "2026-01-01"),
      item("b", "Openbao", "2026-01-01"),
      item("d", "Alpha open", "2026-01-01"),
    ];
    const out = sortItems(items, "release_date_desc", undefined, "open");
    expect(out.map((i) => i.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("never overrides the picked order", () => {
    const items = [
      item("old", "Open", "2020-01-01"),
      item("new", "Zeta open", "2026-01-01"),
    ];
    const out = sortItems(items, "release_date_desc", undefined, "open");
    expect(out.map((i) => i.id)).toEqual(["new", "old"]);
  });

  it("orders equal and missing scores by match rank", () => {
    const scores = new Map<string, number | null>([
      ["b", 50],
      ["a", 50],
    ]);
    const out = sortByScores(
      [item("b", "Open"), item("a", "Zeta open"), item("y", "Alpha open"), item("x", "Openbao")],
      scores,
      "desc",
      "open",
    );
    expect(out.map((i) => i.id)).toEqual(["b", "a", "x", "y"]);
  });

  it("without a query ties fall back to name", () => {
    const items = [item("b", "Beta", "2026-01-01"), item("a", "Alpha", "2026-01-01")];
    const out = sortItems(items, "release_date_desc");
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });
});
