// Phone keyboards add a space after a picked word suggestion, and the
// search text joins its fields with spaces, so a query matched as typed
// misses every item where the word ends a field.
export function normalizeQuery(input: string): string {
  return input.trim().toLowerCase();
}
