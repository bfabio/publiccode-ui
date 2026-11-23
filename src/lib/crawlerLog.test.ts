import { describe, expect, it } from "vitest";
import { parseLogMessage } from "./crawlerLog";

const header = "[https://github.com/example/tool.git] publiccode.yml found at https://raw.githubusercontent.com/example/tool/main/publiccode.yml\n\n";

describe("parseLogMessage", () => {
  it("reads the level and location of the diagnostic on the BAD line", () => {
    const parsed = parseLogMessage(
      header +
        "[example/tool] BAD publiccode.yml: publiccode.yml:1:1: warning: publiccodeYmlVersion: v0.5.0 is not the latest version\n" +
        "publiccode.yml:15:1: error: softwareType: softwareType must be one of the following",
    );
    expect(parsed.repoUrl).toBe("https://github.com/example/tool");
    expect(parsed.repoName).toBe("example/tool");
    expect(parsed.diagnostics).toEqual([
      { line: 1, column: 1, level: "warning", message: "publiccodeYmlVersion: v0.5.0 is not the latest version" },
      { line: 15, column: 1, level: "error", message: "softwareType: softwareType must be one of the following" },
    ]);
  });

  it("keeps a BAD reason without a location as an error", () => {
    const parsed = parseLogMessage(header + "[example/tool] BAD publiccode.yml: organisation is 'urn:x-italian-pa:c_f646', but 'c_f646' was expected");
    expect(parsed.diagnostics).toEqual([
      { line: null, column: null, level: "error", message: "organisation is 'urn:x-italian-pa:c_f646', but 'c_f646' was expected" },
    ]);
  });

  it("returns no diagnostics for a log without a BAD line", () => {
    expect(parseLogMessage(header.trim()).diagnostics).toEqual([]);
  });
});
