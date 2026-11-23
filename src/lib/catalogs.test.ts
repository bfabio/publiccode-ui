import { describe, expect, it } from "vitest";
import { parseCatalogs } from "./catalogs.ts";

describe("parseCatalogs", () => {
  it("leaves out the aggregate catalog", () => {
    expect(parseCatalogs([
      { id: "c1", name: "Developers Italia", alternativeId: "developers-italia" },
      { id: "c0", name: "Root", alternativeId: "∅" },
      { id: "c2", name: "ARTE" },
    ])).toEqual([
      { id: "c1", name: "Developers Italia", slug: "developers-italia" },
      { id: "c2", name: "ARTE", slug: "c2" },
    ]);
  });

  it("returns no catalogs for a payload without a list", () => {
    expect(parseCatalogs(undefined)).toEqual([]);
    expect(parseCatalogs({})).toEqual([]);
  });
});
