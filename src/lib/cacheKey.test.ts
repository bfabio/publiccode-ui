import { describe, expect, it } from "vitest";
import { dataCacheKey } from "./cacheKey";

describe("dataCacheKey", () => {
  it("is stable for equal data", () => {
    const value = { name: "tool", stats: { stars: { max: 10 } } };
    expect(dataCacheKey(value)).toBe(dataCacheKey({ name: "tool", stats: { stars: { max: 10 } } }));
  });

  it("ignores object key order at any depth", () => {
    expect(dataCacheKey({ a: 1, b: { c: 2, d: 3 } })).toBe(dataCacheKey({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it("changes when a nested value changes", () => {
    expect(dataCacheKey({ a: { b: 1 } })).not.toBe(dataCacheKey({ a: { b: 2 } }));
  });

  it("keeps array order significant", () => {
    expect(dataCacheKey([1, 2])).not.toBe(dataCacheKey([2, 1]));
  });

  it("treats an undefined property as absent", () => {
    expect(dataCacheKey({ a: 1, t: undefined })).toBe(dataCacheKey({ a: 1 }));
  });

  it("distinguishes null from absent", () => {
    expect(dataCacheKey({ a: null })).not.toBe(dataCacheKey({}));
  });
});
