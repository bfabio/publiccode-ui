import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Allow only safe URL schemes in href/src.
// `cid:`, `data:`, `javascript:`, `vbscript:`, etc. are blocked.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

DOMPurify.setConfig({
  ALLOWED_URI_REGEXP,
});

const HEADING = /^H([1-6])$/;

// Set by renderMarkdown for the duration of one synchronous sanitize call.
// highestHeading records the smallest heading level that survives
// sanitizing, headingShift moves every heading down by that many levels.
let highestHeading = 7;
let headingShift = 0;
const shifted = new WeakSet<Element>();

// A heading is replaced by an element of the shifted level that takes over
// its sanitized attributes and its children. The children have not been
// walked yet and are sanitized inside the new element, which the walk
// visits next and must not shift a second time.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const match = HEADING.exec(node.nodeName);
  if (!match || shifted.has(node)) return;
  const level = Number(match[1]);
  if (headingShift === 0) {
    highestHeading = Math.min(highestHeading, level);
    return;
  }
  const heading = node.ownerDocument.createElement(`h${Math.min(level + headingShift, 6)}`);
  shifted.add(heading);
  for (const { name, value } of Array.from(node.attributes)) heading.setAttribute(name, value);
  heading.append(...Array.from(node.childNodes));
  node.replaceWith(heading);
});

export interface RenderOptions {
  // Level the highest heading of the text is rendered at, so that headings
  // in embedded text sit below the headings of the page around it. The
  // other headings keep their distance from it, up to h6.
  topHeadingLevel?: number;
}

export function renderMarkdown(source: string, options: RenderOptions = {}): string {
  if (!source) return '';
  const rawHtml = marked.parse(source, { async: false });
  highestHeading = 7;
  headingShift = 0;
  const html = DOMPurify.sanitize(rawHtml);
  const top = options.topHeadingLevel ?? 1;
  if (highestHeading > 6 || highestHeading >= top) return html;
  headingShift = top - highestHeading;
  try {
    return DOMPurify.sanitize(html);
  } finally {
    headingShift = 0;
  }
}
