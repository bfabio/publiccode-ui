import { safeUrl } from "./sanitize.js";

interface LocalizedDescription {
  documentation?: unknown;
  apiDocumentation?: unknown;
}

// publiccode.yml declares documentation and apiDocumentation under
// description/[lang], not at the top level of the manifest.
export function documentationLinks(desc: LocalizedDescription | null | undefined) {
  const link = (url: unknown) => (typeof url === "string" ? safeUrl(url) : null);
  return {
    documentation: link(desc?.documentation),
    apiDocumentation: link(desc?.apiDocumentation),
  };
}
