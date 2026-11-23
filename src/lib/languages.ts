// The languages a software supports, from localisation.availableLanguages.
// The description block only says which languages the manifest text is
// written in, so it is not a substitute when the key is missing.
export function supportedLanguages(publiccode: unknown, locale: string): string[] {
  const values = (publiccode as { localisation?: { availableLanguages?: unknown } } | null)
    ?.localisation?.availableLanguages;
  if (!Array.isArray(values)) return [];
  const names = new Intl.DisplayNames([locale], { type: 'language' });
  const labels = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || value.trim() === '') continue;
    labels.add(languageName(names, value.trim()));
  }
  const collator = new Intl.Collator(locale);
  return [...labels].sort(collator.compare);
}

// Manifests in the wild carry POSIX locales such as it_IT, which are not
// BCP 47 tags and make DisplayNames.of throw. Show anything it still
// rejects as written.
function languageName(names: Intl.DisplayNames, value: string): string {
  for (const tag of [value, value.replaceAll('_', '-')]) {
    try {
      return names.of(tag) ?? value;
    } catch {
      // try the next form
    }
  }
  return value;
}
