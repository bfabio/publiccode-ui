import { describe, expect, it } from "vitest";
import { viewportShift } from "./viewportClamp";

describe("viewportShift", () => {
  it("leaves a box that fits alone", () => {
    expect(viewportShift(353, 760, 1280)).toBe(0);
  });

  it("moves a box that starts off the left edge back in", () => {
    expect(viewportShift(-657, 760, 1280)).toBe(673);
  });

  it("moves a box that ends past the right edge back in", () => {
    expect(viewportShift(40, 760, 800)).toBe(-16);
  });

  it("shrinks the margin when the box is almost as wide as the viewport", () => {
    expect(viewportShift(-15, 374, 390)).toBe(23);
    expect(viewportShift(16, 374, 390)).toBe(-8);
  });

  it("aligns a box wider than the viewport to the left edge", () => {
    expect(viewportShift(-100, 500, 390)).toBe(100);
    expect(viewportShift(30, 500, 390)).toBe(-30);
  });
});
