import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const licenses = [
  { licenseId: "MIT", name: "MIT License" },
  { licenseId: "Apache-2.0", name: "Apache License 2.0" },
  { licenseId: "EUPL-1.2", name: "European Union Public License 1.2" },
  { licenseId: "AGPL-3.0-only", name: "GNU Affero General Public License v3.0 only" },
  { licenseId: "LGPL-3.0-or-later", name: "GNU Lesser General Public License v3.0 or later" },
  { licenseId: "MPL-2.0", name: "Mozilla Public License 2.0" },
  { licenseId: "GPL-2.0+", name: "GNU General Public License v2.0 or later" },
];
const exceptions = [{ licenseExceptionId: "Classpath-exception-2.0", name: "Classpath exception 2.0" }];

const page = (id: string) => `https://spdx.org/licenses/${id}.html`;

async function load(fetchImpl: (url: string) => Promise<unknown>) {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(fetchImpl));
  return (await import("./license.js")).resolveLicense;
}

function spdxFetch(url: string) {
  const body = url.endsWith("/exceptions.json") ? { exceptions } : { licenses };
  return Promise.resolve({ json: () => Promise.resolve(body) });
}

describe("resolveLicense", () => {
  let resolveLicense: (value: unknown) => Promise<unknown>;

  beforeEach(async () => {
    resolveLicense = await load(spdxFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null without a license", async () => {
    expect(await resolveLicense(undefined)).toBeNull();
  });

  it("names and links a single id", async () => {
    expect(await resolveLicense("MIT")).toEqual({
      id: "MIT", name: "MIT License", url: page("MIT"), parts: [{ text: "MIT", url: page("MIT") }],
    });
  });

  it("matches ids case insensitively and shows the canonical id", async () => {
    expect(await resolveLicense("apache-2.0")).toMatchObject({
      id: "Apache-2.0", name: "Apache License 2.0", url: page("Apache-2.0"),
    });
  });

  it("links each id of an expression", async () => {
    expect(await resolveLicense("LGPL-3.0-or-later AND MPL-2.0+")).toEqual({
      id: "LGPL-3.0-or-later AND MPL-2.0+",
      name: "LGPL-3.0-or-later AND MPL-2.0+",
      url: null,
      parts: [
        { text: "LGPL-3.0-or-later", url: page("LGPL-3.0-or-later") },
        { text: " AND ", url: null },
        { text: "MPL-2.0+", url: page("MPL-2.0") },
      ],
    });
  });

  it("links a single id with a trailing plus without calling it by the base name", async () => {
    expect(await resolveLicense("eupl-1.2+")).toEqual({
      id: "EUPL-1.2+", name: "EUPL-1.2+", url: null, parts: [{ text: "EUPL-1.2+", url: page("EUPL-1.2") }],
    });
  });

  it("prefers an id that includes the plus", async () => {
    expect(await resolveLicense("GPL-2.0+")).toMatchObject({ name: "GNU General Public License v2.0 or later", url: page("GPL-2.0+") });
  });

  it("keeps parentheses, lowercase operators and exceptions", async () => {
    expect(await resolveLicense("(mit or Apache-2.0) and GPL-2.0+ with classpath-exception-2.0")).toEqual({
      id: "(MIT OR Apache-2.0) AND GPL-2.0+ WITH Classpath-exception-2.0",
      name: "(MIT OR Apache-2.0) AND GPL-2.0+ WITH Classpath-exception-2.0",
      url: null,
      parts: [
        { text: "(", url: null },
        { text: "MIT", url: page("MIT") },
        { text: " OR ", url: null },
        { text: "Apache-2.0", url: page("Apache-2.0") },
        { text: ") AND ", url: null },
        { text: "GPL-2.0+", url: page("GPL-2.0+") },
        { text: " WITH ", url: null },
        { text: "Classpath-exception-2.0", url: page("Classpath-exception-2.0") },
      ],
    });
  });

  it("leaves unknown ids of an expression as text", async () => {
    expect(await resolveLicense("EUPL OR MIT")).toMatchObject({
      url: null, parts: [{ text: "EUPL OR ", url: null }, { text: "MIT", url: page("MIT") }],
    });
  });

  it.each(["MIT License", "AGPLv3", "EUPL", "MIT AND", "(MIT", "MIT And Apache-2.0", "MIT WITH MIT+"])(
    "shows %j as written",
    async (value) => {
      expect(await resolveLicense(value)).toEqual({ id: value, name: value, url: null, parts: [{ text: value, url: null }] });
    },
  );

  it("shows the value as written when the SPDX list cannot be fetched", async () => {
    resolveLicense = await load(() => Promise.reject(new Error("offline")));
    expect(await resolveLicense("mit")).toEqual({ id: "mit", name: "mit", url: null, parts: [{ text: "mit", url: null }] });
  });
});
