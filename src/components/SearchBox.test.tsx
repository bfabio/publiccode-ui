// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "./SearchBox";

vi.mock("../lib/searchIndex", () => ({
  loadSearchIndex: vi.fn().mockResolvedValue([]),
}));

let container: HTMLDivElement;
let root: Root;
let input: HTMLInputElement;
let destination: { href: string };

describe("search history restoration", () => {
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    // Keep the document mounted when Enter starts navigation.
    destination = { href: "" };
    vi.stubGlobal("window", new Proxy(window, {
      get(target, key) {
        if (key === "location") return destination;
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<SearchBox indexUrl="/search-index.json" base="/catalog" />);
    });
    input = container.querySelector("input")!;
    act(() => {
      // Use the native setter so React sees the edit as user input.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Sample query");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(destination.href).toBe("/catalog/software/?q=Sample%20query");
    expect(input.disabled).toBe(true);
    expect(container.querySelector('[aria-label="Loading"]')).not.toBeNull();
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("restores an editable query and removes the spinner for a cached page", () => {
    act(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    expect(input.disabled).toBe(false);
    expect(container.querySelector('[aria-label="Loading"]')).toBeNull();
    expect(input.value).toBe("Sample query");
    const clear = container.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')!;
    expect(clear).not.toBeNull();
    act(() => { clear.click(); });
    expect(input.value).toBe("");
  });

  it("keeps navigation pending for a pageshow without a cached page", () => {
    act(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));
    });
    expect(input.disabled).toBe(true);
    expect(container.querySelector('[aria-label="Loading"]')).not.toBeNull();
    expect(input.value).toBe("Sample query");
  });
});
