import { describe, expect, it } from 'vitest';
import { catalogFlag, countryFlag } from './catalogFlags';

describe('countryFlag', () => {
  it('builds the regional indicator pair for an ISO code', () => {
    expect(countryFlag('IT')).toBe('🇮🇹');
    expect(countryFlag('eu')).toBe('🇪🇺');
  });
});

describe('catalogFlag', () => {
  it('maps every known catalog slug to its flag', () => {
    expect(catalogFlag('developers-italia')).toBe('🇮🇹');
    expect(catalogFlag('opencode-de')).toBe('🇩🇪');
    expect(catalogFlag('codegouvfr')).toBe('🇫🇷');
    expect(catalogFlag('avoinkoodi-fi')).toBe('🇫🇮');
    expect(catalogFlag('offentligkod-se')).toBe('🇸🇪');
    expect(catalogFlag('developer-overheid-nl')).toBe('🇳🇱');
    expect(catalogFlag('opencode-be')).toBe('🇧🇪');
    expect(catalogFlag('city-of-ghent')).toBe('🇧🇪');
    expect(catalogFlag('gov-cy')).toBe('🇨🇾');
    expect(catalogFlag('ogcio')).toBe('🇮🇪');
    expect(catalogFlag('amagovpt')).toBe('🇵🇹');
    expect(catalogFlag('eu-oss-catalogue')).toBe('🇪🇺');
    expect(catalogFlag('code-europa-eu')).toBe('🇪🇺');
  });

  it('returns null for unknown or missing slugs', () => {
    expect(catalogFlag('∅')).toBeNull();
    expect(catalogFlag(null)).toBeNull();
    expect(catalogFlag(undefined)).toBeNull();
  });
});
