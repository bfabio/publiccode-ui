import { describe, expect, it } from "vitest";
import { documentationLinks } from "./documentationLinks";
import { pickDescription } from "./i18n.js";

describe("documentationLinks", () => {
  it("reads the links from the localized description", () => {
    const description = {
      en: {
        documentation: "https://docs.example.org/",
        apiDocumentation: "https://api.example.org/docs",
      },
    };
    expect(documentationLinks(pickDescription(description, "en").description)).toEqual({
      documentation: "https://docs.example.org/",
      apiDocumentation: "https://api.example.org/docs",
    });
  });

  it("takes the links of the language the page shows", () => {
    const description = {
      en: { documentation: "https://example.org/en/docs" },
      it: { documentation: "https://example.org/it/docs" },
    };
    expect(documentationLinks(pickDescription(description, "it").description).documentation).toBe(
      "https://example.org/it/docs",
    );
  });

  it("drops unsafe or missing links", () => {
    expect(documentationLinks({ documentation: "javascript:alert(1)", apiDocumentation: 42 })).toEqual({
      documentation: null,
      apiDocumentation: null,
    });
    expect(documentationLinks(undefined)).toEqual({ documentation: null, apiDocumentation: null });
  });
});
