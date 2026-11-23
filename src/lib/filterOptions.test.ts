import { describe, it, expect } from 'vitest';
import { codeLabels, filterOptions } from './filterOptions';
import { t } from './i18n.js';

describe('filterOptions', () => {
  it('shows the label and keeps the code as the value', () => {
    expect(filterOptions(['development'], { development: 'In fase di sviluppo attivo' }, 'it'))
      .toEqual([{ value: 'development', label: 'In fase di sviluppo attivo' }]);
  });

  it('falls back to the code when there is no label', () => {
    expect(filterOptions(['unknown'], {}, 'en')).toEqual([{ value: 'unknown', label: 'unknown' }]);
    expect(filterOptions(['unknown'], undefined, 'en')).toEqual([{ value: 'unknown', label: 'unknown' }]);
  });

  it('sorts by the visible label', () => {
    const labels = { configurationFiles: 'File di configurazione', library: 'Libreria', addon: 'Add-on / Plugin' };
    expect(filterOptions(['library', 'configurationFiles', 'addon'], labels, 'it').map((o) => o.value))
      .toEqual(['addon', 'configurationFiles', 'library']);
  });

  it('tells apart codes that share a label', () => {
    const labels = { 'standalone/web': 'Web application', 'web-application': 'Web application' };
    expect(filterOptions(['web-application', 'standalone/web'], labels, 'en')).toEqual([
      { value: 'standalone/web', label: 'Web application (standalone/web)' },
      { value: 'web-application', label: 'Web application (web-application)' },
    ]);
  });

  it('keeps a single code with a shared label plain', () => {
    const labels = { 'standalone/web': 'Web application', 'web-application': 'Web application' };
    expect(filterOptions(['standalone/web'], labels, 'en')).toEqual([{ value: 'standalone/web', label: 'Web application' }]);
  });
});

describe('codeLabels', () => {
  it('maps the codes that have a translation', () => {
    expect(codeLabels(['standalone/web', 'configurationFiles', 'nope', ''], 'type_', (k) => t('it', k))).toEqual({
      'standalone/web': 'Applicazione web',
      configurationFiles: 'File di configurazione',
    });
  });

  it('covers every status in both locales', () => {
    const statuses = ['concept', 'development', 'beta', 'stable', 'obsolete'];
    for (const locale of ['en', 'it']) {
      expect(Object.keys(codeLabels(statuses, 'status_', (k) => t(locale, k)))).toEqual(statuses);
    }
  });
});
