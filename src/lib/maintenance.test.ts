import { describe, expect, it } from "vitest";
import { contractMaintenance } from "./maintenance.ts";

const now = new Date("2026-11-23T10:00:00Z");

describe("contractMaintenance", () => {
  it("ignores other maintenance types", () => {
    expect(contractMaintenance({ type: "internal", contractors: [{ name: "A", until: "2030-01-01" }] }, "en", now)).toBeNull();
    expect(contractMaintenance(undefined, "en", now)).toBeNull();
    expect(contractMaintenance({ type: "contract" }, "en", now)).toBeNull();
    expect(contractMaintenance({ type: "contract", contractors: [{ until: "2030-01-01" }] }, "en", now)).toBeNull();
  });

  it("reads until dates parsed as dates or kept as strings", () => {
    // What js-yaml returns for an unquoted and a quoted date.
    const maintenance = {
      type: "contract",
      contractors: [
        { name: "Unquoted", until: new Date("2021-08-07T00:00:00Z") },
        { name: "Quoted", until: "2030-01-31" },
      ],
    };
    const result = contractMaintenance(maintenance, "en", now);
    expect(result?.contractors.map((c) => [c.name, c.until?.datetime, c.until?.formatted, c.ended])).toEqual([
      ["Unquoted", "2021-08-07", "Aug 7, 2021", true],
      ["Quoted", "2030-01-31", "Jan 31, 2030", false],
    ]);
    expect(result?.ended).toBe(false);
  });

  it("ends only when every contract has ended", () => {
    const result = contractMaintenance(
      { type: "contract", contractors: [{ name: "A", until: "2021-08-07" }, { name: "B", until: "2024-12-31" }] },
      "it",
      now,
    );
    expect(result?.ended).toBe(true);
    expect(result?.contractors[0].until?.formatted).toBe("7 ago 2021");
  });

  it("keeps a contract running through its until day", () => {
    const today = contractMaintenance({ type: "contract", contractors: [{ name: "A", until: "2026-11-23" }] }, "en", now);
    expect(today?.ended).toBe(false);
    const yesterday = contractMaintenance({ type: "contract", contractors: [{ name: "A", until: "2026-11-22" }] }, "en", now);
    expect(yesterday?.ended).toBe(true);
  });

  it("does not call a contract without a readable date ended", () => {
    const result = contractMaintenance({ type: "contract", contractors: [{ name: "A", until: "soon" }] }, "en", now);
    expect(result?.contractors[0].until).toBeNull();
    expect(result?.ended).toBe(false);
  });

  it("keeps only safe website and email links", () => {
    const result = contractMaintenance(
      {
        type: "contract",
        contractors: [
          { name: "Safe", until: "2030-01-01", website: "https://example.org/", email: "info@example.org" },
          { name: "Unsafe", until: "2030-01-01", website: "javascript:alert(1)", email: "" },
        ],
      },
      "en",
      now,
    );
    expect(result?.contractors.map((c) => [c.website, c.email])).toEqual([
      ["https://example.org/", "info@example.org"],
      [null, null],
    ]);
  });
});
