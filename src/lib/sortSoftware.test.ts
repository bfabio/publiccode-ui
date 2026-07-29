import { describe, expect, it } from "vitest";
import { sortItems } from "./sortSoftware";

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
