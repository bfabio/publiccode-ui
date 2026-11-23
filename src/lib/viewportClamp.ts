// The catalog weights panel hangs from the score of a card, so where it
// opens depends on the theme layout. This returns the horizontal shift
// that keeps a box of the given left edge and width inside the viewport,
// with up to maxMargin pixels of room on each side. A box wider than the
// viewport is aligned to its left edge.
export function viewportShift(left: number, width: number, viewportWidth: number, maxMargin = 16): number {
  const margin = Math.max(0, Math.min(maxMargin, (viewportWidth - width) / 2));
  if (left < margin) return margin - left;
  const overflow = left + width - (viewportWidth - margin);
  if (overflow > 0) return -Math.min(overflow, left - margin);
  return 0;
}
