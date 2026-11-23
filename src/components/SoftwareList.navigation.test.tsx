// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoftwareList } from "./SoftwareList";

const item = {
  id: "sample", name: "Sample", shortDescription: "", categories: [],
  releaseDate: "", license: null, logo: null, logoFallback: null,
  developmentStatus: "stable", softwareType: "standalone/other",
  intendedAudience: [], catalogSlug: null, catalogName: null,
  catalogId: "catalog", activity: null,
};

let container: HTMLDivElement;
let root: Root;
let cell: HTMLTableCellElement;

function mouse(type: string, detail: number, options: MouseEventInit = {}) {
  act(() => {
    cell.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, detail, ...options }));
  });
}

function advance(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe("catalog row navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    history.replaceState(null, "", "/software/?view=table");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => { root.render(<SoftwareList items={[item]} base="" />); });
    cell = container.querySelectorAll("tbody td")[1] as HTMLTableCellElement;
    // Observe navigation without asking jsdom to load another document.
    const location = { assign: vi.fn() };
    vi.stubGlobal("window", new Proxy(window, {
      get(target, key) {
        if (key === "location") return location;
        return Reflect.get(target, key);
      },
    }));
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("waits before navigating once for a plain click", () => {
    const assign = window.location.assign;
    mouse("click", 1);
    advance(350);
    expect(assign).not.toHaveBeenCalled();
    advance(150);
    expect(assign).toHaveBeenCalledExactlyOnceWith("/software/sample");
  });

  it("cancels navigation for clicks 350 ms apart", () => {
    const assign = window.location.assign;
    mouse("click", 1);
    advance(350);
    expect(assign).not.toHaveBeenCalled();
    mouse("mousedown", 2);
    mouse("mouseup", 2);
    mouse("click", 2);
    mouse("dblclick", 2);
    advance(1000);
    expect(assign).not.toHaveBeenCalled();
  });

  it("cancels on the second press even when release is delayed", () => {
    const assign = window.location.assign;
    mouse("click", 1);
    advance(350);
    mouse("mousedown", 2);
    advance(1000);
    expect(assign).not.toHaveBeenCalled();
    mouse("click", 2);
    advance(1000);
    expect(assign).not.toHaveBeenCalled();
  });

  it("cancels a pending navigation when the component unmounts", () => {
    const assign = window.location.assign;
    mouse("click", 1);
    act(() => { root.render(null); });
    advance(1000);
    expect(assign).not.toHaveBeenCalled();
  });
});
