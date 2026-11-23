import { safeUrl } from "./sanitize.js";

// publiccode.yml makes only the name of a contact mandatory, so a contact
// without an email must not turn into a mailto:undefined link.
export function contactMailto(email: unknown): string | null {
  if (typeof email !== "string" || email.trim() === "") return null;
  return safeUrl(`mailto:${email.trim()}`);
}
