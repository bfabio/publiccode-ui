export interface FilterOption {
  value: string;
  label: string;
}

// Filter values stay the publiccode.yml codes so links keep working;
// only the visible text is translated. Codes without a label show as
// they are, and codes whose labels collide (standalone/web and the
// legacy web-application) carry the code so the options differ.
export function filterOptions(
  codes: string[],
  labels: Record<string, string> | undefined,
  locale: string,
): FilterOption[] {
  const named = codes.map((value) => ({ value, label: labels?.[value] || value }));
  const counts = new Map<string, number>();
  for (const { label } of named) counts.set(label, (counts.get(label) ?? 0) + 1);
  return named
    .map(({ value, label }) => ({
      value,
      label: (counts.get(label) ?? 0) > 1 && label !== value ? `${label} (${value})` : label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale) || a.value.localeCompare(b.value));
}

// Label map for the codes that have a translation under prefix + code
export function codeLabels(
  codes: Iterable<string>,
  prefix: string,
  translate: (key: string) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const code of codes) {
    if (!code) continue;
    const key = prefix + code;
    const label = translate(key);
    if (label !== key) out[code] = label;
  }
  return out;
}
