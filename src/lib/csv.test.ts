import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins rows with CRLF and leaves plain fields unquoted", () => {
    expect(toCsv([["Name", "Score"], ["Tool", 42]])).toBe("Name,Score\r\nTool,42\r\n");
  });

  it("quotes fields with commas, quotes, or newlines", () => {
    expect(toCsv([['say "hi"', "a,b", "two\nlines"]])).toBe('"say ""hi""","a,b","two\nlines"\r\n');
  });

  it("renders null as an empty cell", () => {
    expect(toCsv([["Tool", null, 3]])).toBe("Tool,,3\r\n");
  });
});
