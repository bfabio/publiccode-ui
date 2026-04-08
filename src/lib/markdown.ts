import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Allow only safe URL schemes in href/src.
// `cid:`, `data:`, `javascript:`, `vbscript:`, etc. are blocked.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

DOMPurify.setConfig({
  ALLOWED_URI_REGEXP,
});

export function renderMarkdown(source: string): string {
  if (!source) return '';
  const rawHtml = marked.parse(source, { async: false });
  return DOMPurify.sanitize(rawHtml);
}
