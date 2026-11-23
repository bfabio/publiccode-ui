import { describe, expect, it } from "vitest";
import { hasTextSelection, rowClickAction, type RowClick } from "./rowClick";

const plain: RowClick = {
  button: 0,
  detail: 1,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  insideLink: false,
  hasSelection: false,
};

describe("rowClickAction", () => {
  it("opens the page in the same tab on a plain click", () => {
    expect(rowClickAction(plain)).toBe("same-tab");
  });

  it("opens a new tab on Ctrl, Cmd and middle click", () => {
    expect(rowClickAction({ ...plain, ctrlKey: true })).toBe("new-tab");
    expect(rowClickAction({ ...plain, metaKey: true })).toBe("new-tab");
    expect(rowClickAction({ ...plain, button: 1 })).toBe("new-tab");
  });

  it("leaves Shift and Alt clicks to the browser", () => {
    expect(rowClickAction({ ...plain, shiftKey: true })).toBe("ignore");
    expect(rowClickAction({ ...plain, altKey: true })).toBe("ignore");
  });

  it("ignores the other mouse buttons", () => {
    expect(rowClickAction({ ...plain, button: 2 })).toBe("ignore");
    expect(rowClickAction({ ...plain, button: 3 })).toBe("ignore");
  });

  it("stays on the table when the click selects text", () => {
    expect(rowClickAction({ ...plain, detail: 2 })).toBe("ignore");
    expect(rowClickAction({ ...plain, detail: 3 })).toBe("ignore");
    expect(rowClickAction({ ...plain, hasSelection: true })).toBe("ignore");
  });

  it("leaves clicks on links to the link", () => {
    expect(rowClickAction({ ...plain, insideLink: true })).toBe("ignore");
    expect(rowClickAction({ ...plain, insideLink: true, ctrlKey: true })).toBe("ignore");
    expect(rowClickAction({ ...plain, insideLink: true, button: 1 })).toBe("ignore");
  });
});

describe("hasTextSelection", () => {
  const selection = (text: string, isCollapsed: boolean) =>
    ({ isCollapsed, toString: () => text }) as unknown as Selection;

  it("reports a non empty selection", () => {
    expect(hasTextSelection(selection("42", false))).toBe(true);
  });

  it("ignores a missing, collapsed or blank selection", () => {
    expect(hasTextSelection(null)).toBe(false);
    expect(hasTextSelection(selection("", true))).toBe(false);
    expect(hasTextSelection(selection(" \n", false))).toBe(false);
  });
});
