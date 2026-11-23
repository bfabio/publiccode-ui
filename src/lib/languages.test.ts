import { describe, expect, it } from 'vitest';
import { supportedLanguages } from './languages';

describe('supportedLanguages', () => {
  it('reads localisation.availableLanguages, not the description languages', () => {
    const publiccode = {
      description: { it: {} },
      localisation: { availableLanguages: ['it', 'de', 'en'] },
    };
    expect(supportedLanguages(publiccode, 'en')).toEqual(['English', 'German', 'Italian']);
    expect(supportedLanguages(publiccode, 'it')).toEqual(['inglese', 'italiano', 'tedesco']);
  });

  it('is empty when the manifest does not declare the languages', () => {
    expect(supportedLanguages({ description: { en: {} } }, 'en')).toEqual([]);
    expect(supportedLanguages({ localisation: { availableLanguages: 'en' } }, 'en')).toEqual([]);
    expect(supportedLanguages(null, 'en')).toEqual([]);
  });

  it('reads POSIX locales and keeps values that are not language tags as written', () => {
    expect(supportedLanguages({ localisation: { availableLanguages: ['it_IT', 'not a tag'] } }, 'en'))
      .toEqual(['Italian (Italy)', 'not a tag']);
  });

  it('drops duplicates and values that are not strings', () => {
    expect(supportedLanguages({ localisation: { availableLanguages: ['en', 'EN', ' ', 3, null] } }, 'en'))
      .toEqual(['English']);
  });
});
