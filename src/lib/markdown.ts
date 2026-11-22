import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Allow only safe URL schemes in href/src.
// `cid:`, `data:`, `javascript:`, `vbscript:`, etc. are blocked.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

// Descriptions come from any indexed publiccode.yml and are inserted into the
// software page, so they must not be able to restyle the page, cover it or
// collect input. class and id would let them pick up the page's own rules, such
// as the fixed full-height weights drawer, and an open dialog is positioned over
// the page by the browser stylesheet. SVG and MathML can draw outside their own
// box, so only HTML elements are kept. Inputs stay only as the disabled
// checkboxes marked emits for task lists, see the hook below.
DOMPurify.setConfig({
  ALLOWED_URI_REGEXP,
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    'style',
    'dialog',
    'form',
    'button',
    'select',
    'option',
    'optgroup',
    'textarea',
    'datalist',
    'fieldset',
    'legend',
    'label',
    'output',
  ],
  FORBID_ATTR: ['style', 'class', 'id'],
});

// Whatever an <input> said, it leaves as a disabled checkbox, checked or not,
// so task lists keep their state and nothing can take input.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName !== 'INPUT') return;
  const checked = node.hasAttribute('checked');
  for (const { name } of Array.from(node.attributes)) node.removeAttribute(name);
  node.setAttribute('type', 'checkbox');
  node.setAttribute('disabled', '');
  if (checked) node.setAttribute('checked', '');
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
