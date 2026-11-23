// A catalog table row opens its software page on a plain click, as a
// shortcut for the name link. Every other click keeps its usual meaning:
// Ctrl/Cmd and middle click open a new tab and Shift and Alt are left to
// the browser. Clicks that select text (drag or double click) stay on the
// table.

export type RowClickAction = "ignore" | "same-tab" | "new-tab";

export interface RowClick {
  button: number;
  detail: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  insideLink: boolean;
  hasSelection: boolean;
}

// A plain click waits this long before leaving the table, so that the
// second click of a double click can cancel it. Browsers do not expose
// the system double click interval, so this uses a 500 ms window.
export const ROW_NAVIGATION_DELAY_MS = 500;

export function rowClickAction(click: RowClick): RowClickAction {
  // Links handle their own clicks, modifiers included.
  if (click.insideLink) return "ignore";
  if (click.button === 1) return "new-tab";
  if (click.button !== 0) return "ignore";
  if (click.ctrlKey || click.metaKey) return "new-tab";
  if (click.shiftKey || click.altKey) return "ignore";
  if (click.detail > 1 || click.hasSelection) return "ignore";
  return "same-tab";
}

export function hasTextSelection(selection: Selection | null): boolean {
  return !!selection && !selection.isCollapsed && selection.toString().trim() !== "";
}
