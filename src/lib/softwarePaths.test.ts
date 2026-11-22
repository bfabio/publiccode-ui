import { readFileSync } from "node:fs";
import ts from "typescript";
import { afterEach, expect, it, vi } from "vitest";
import { dataCacheKey } from "./cacheKey";
import { catalogFlag } from "./catalogFlags";
import { contractMaintenance } from "./maintenance";

// Execute the page's exported function without rendering its template.
// This keeps the test on the actual props and cache key used by Astro.
const page = readFileSync(new URL("../pages/[...locale]/software/[id].astro", import.meta.url), "utf8");
const frontmatter = page.split("---")[1];
const source = ts.createSourceFile("page.ts", frontmatter, ts.ScriptTarget.Latest, true);
const pathsFunction = source.statements.find(
  (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "getStaticPaths",
)!;
const functionCode = ts.transpile(pathsFunction.getText(source).replace(/^export\s+/, ""));

interface SoftwarePath {
  params: { locale: string | undefined; id: string };
  props: { software: unknown; license: { name: string; url: string | null } };
  cacheKey: string;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("refreshes both locale paths when SPDX recovers with unchanged software", async () => {
  vi.resetModules();
  const { resolveLicense } = await import("./license.js");
  const software = [{ id: "example", catalogId: "catalog", publiccode: { legal: { license: "MIT" } } }];
  const fetchSoftware = vi.fn(async () => software);
  const getStaticPaths = new Function(
    "fetchAllSoftware", "fetchCatalogs", "fetchAllSoftwareAnalysis", "fetchAllOpenCodeBadges",
    "resolveLicense", "dataCacheKey", "catalogFlag", "contractMaintenance",
    `${functionCode}\nreturn getStaticPaths;`,
  )(
    fetchSoftware, async () => [], async () => new Map(), async () => new Map(),
    resolveLicense, dataCacheKey, catalogFlag, contractMaintenance,
  ) as () => Promise<SoftwarePath[]>;

  const fetch = vi.fn().mockRejectedValue(new Error("SPDX unavailable"));
  vi.stubGlobal("fetch", fetch);
  const failed = await getStaticPaths();
  expect(failed.map((path) => path.params)).toEqual([
    { locale: undefined, id: "example" }, { locale: "it", id: "example" },
  ]);
  for (const path of failed) {
    expect(path.props.license).toMatchObject({ name: "MIT", url: null });
  }

  fetch.mockImplementation(async (url: string) => ({
    json: async () => url.endsWith("/exceptions.json")
      ? { exceptions: [] }
      : { licenses: [{ licenseId: "MIT", name: "MIT License" }] },
  }));
  const recovered = await getStaticPaths();
  expect(recovered.map((path) => path.params)).toEqual(failed.map((path) => path.params));
  for (const [index, path] of recovered.entries()) {
    expect(path.props.software).toBe(failed[index].props.software);
    expect(path.props.license).toMatchObject({ name: "MIT License", url: "https://spdx.org/licenses/MIT.html" });
    expect(path.cacheKey).not.toBe(failed[index].cacheKey);
  }
  expect(fetchSoftware).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledTimes(4);
  const unchanged = await getStaticPaths();
  expect(unchanged.map((path) => path.cacheKey)).toEqual(recovered.map((path) => path.cacheKey));
});
