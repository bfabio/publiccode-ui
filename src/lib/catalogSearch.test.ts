import { describe, expect, it } from "vitest";
import { catalogSearchText } from "./catalogSearch";

describe("catalogSearchText", () => {
  it("joins name, short description and categories in lowercase", () => {
    expect(catalogSearchText({
      name: "OpenCity Italia",
      shortDescription: "Sito per i Comuni",
      categories: ["content-management", "website-builder"],
    })).toBe("opencity italia sito per i comuni content-management website-builder");
  });

  it("keeps the separator when the description is empty", () => {
    expect(catalogSearchText({ name: "Tool", shortDescription: "", categories: [] })).toBe("tool ");
  });
});
