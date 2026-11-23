import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSearchIndex, toSearchItems } from "./searchIndex";

const entry = { id: "a", name: "Foo App", shortDescription: "Does BAR", logo: null, logoFallback: null };

describe("toSearchItems", () => {
  it.each([undefined, "it", "en-US", ""])("preserves language %j while deriving search fields", (lang) => {
    const localized = { ...entry, ...(lang !== undefined ? { lang } : {}) };
    expect(toSearchItems([localized])).toEqual([
      { ...localized, nameLower: "foo app", searchText: "foo app does bar" },
    ]);
  });
});

describe("loadSearchIndex", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches each URL once and shares the result", async () => {
    const fetchMock = vi.fn(async () => Response.json([entry]));
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([loadSearchIndex("/once.json"), loadSearchIndex("/once.json")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a?.[0].searchText).toBe("foo app does bar");
  });

  it("retries after a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })));
    expect(await loadSearchIndex("/retry.json")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([entry])));
    expect(await loadSearchIndex("/retry.json")).toHaveLength(1);
  });

  it("retries after a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await loadSearchIndex("/offline.json")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([])));
    expect(await loadSearchIndex("/offline.json")).toEqual([]);
  });
});
