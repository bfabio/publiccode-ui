// The API has no country on a catalog, so the slug to ISO code mapping
// lives here. Unknown slugs (the Root catalog, future catalogs) get no flag.
const countryByCatalog: Record<string, string> = {
  'developers-italia': 'IT',
  'opencode-de': 'DE',
  'codegouvfr': 'FR',
  'avoinkoodi-fi': 'FI',
  'offentligkod-se': 'SE',
  'developer-overheid-nl': 'NL',
  'opencode-be': 'BE',
  'city-of-ghent': 'BE',
  'gov-cy': 'CY',
  'ogcio': 'IE',
  'amagovpt': 'PT',
  'eu-oss-catalogue': 'EU',
  'code-europa-eu': 'EU',
};

const REGIONAL_INDICATOR_A = 0x1f1e6;

export function countryFlag(iso: string): string {
  return Array.from(iso.toUpperCase())
    .map((ch) => String.fromCodePoint(REGIONAL_INDICATOR_A + ch.charCodeAt(0) - 65))
    .join('');
}

export function catalogFlag(slug: string | null | undefined): string | null {
  const iso = slug ? countryByCatalog[slug] : undefined;
  return iso ? countryFlag(iso) : null;
}
