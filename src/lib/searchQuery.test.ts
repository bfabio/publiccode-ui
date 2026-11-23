import { describe, expect, it } from "vitest";
import { normalizeQuery } from "./searchQuery.js";

describe("normalizeQuery", () => {
  it("drops surrounding whitespace", () => {
    expect(normalizeQuery("gis ")).toBe("gis");
    expect(normalizeQuery("  PagoPA\t\n")).toBe("pagopa");
  });

  it("keeps inner spaces", () => {
    expect(normalizeQuery(" open data ")).toBe("open data");
  });

  it("matches a word that ends the search text once trimmed", () => {
    const searchText = "desktop gis";
    expect(searchText.includes("gis ")).toBe(false);
    expect(searchText.includes(normalizeQuery("gis "))).toBe(true);
  });

  it("returns an empty query for blank input", () => {
    expect(normalizeQuery("   ")).toBe("");
  });
});
