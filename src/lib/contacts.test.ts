import { describe, expect, it } from "vitest";
import { contactMailto } from "./contacts";

describe("contactMailto", () => {
  it("links a contact with an email", () => {
    expect(contactMailto("jane@example.org")).toBe("mailto:jane@example.org");
  });

  it("returns no link when the email is missing", () => {
    expect(contactMailto(undefined)).toBeNull();
    expect(contactMailto(null)).toBeNull();
  });

  it("returns no link when the email is blank", () => {
    expect(contactMailto("")).toBeNull();
    expect(contactMailto("   ")).toBeNull();
  });
});
