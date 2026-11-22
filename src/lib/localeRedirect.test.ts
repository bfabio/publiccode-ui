import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { LANG_KEY, localeRedirect, localeRedirectScript } from './localeRedirect.js';

const page = (pathname: string, current: string, navLang: string, stored: string | null = null, search = '') =>
  localeRedirect({ pathname, search, current, navLang, stored, base: '' });

describe('localeRedirect', () => {
  it('keeps an Italian browser on the English page it switched to', () => {
    expect(page('/software/x', 'en', 'it-IT', null, '?lang=en')).toEqual({ store: 'en', target: null });
  });

  it('keeps an English browser on the Italian page it switched to', () => {
    expect(page('/it/software/x', 'it', 'en-US', null, '?lang=it')).toEqual({ store: 'it', target: null });
  });

  it('keeps ?lang= on later pages through the stored choice', () => {
    expect(page('/software/', 'en', 'it-IT', null, '?lang=en')).toEqual({ store: 'en', target: null });
    expect(page('/software/y', 'en', 'it-IT', 'en')).toEqual({ store: null, target: null });
  });

  it('keeps a browser in a third language on the page it switched to', () => {
    expect(page('/it/software/x', 'it', 'de-DE', null, '?lang=it')).toEqual({ store: 'it', target: null });
  });

  it('follows the stored choice over the browser language', () => {
    expect(page('/it/software/y', 'it', 'it-IT', 'en').target).toBe('/software/y');
  });

  it('follows the browser language while no choice is stored', () => {
    expect(page('/software/x', 'en', 'it-IT').target).toBe('/it/software/x');
    expect(page('/it/software/x', 'it', 'en').target).toBe('/software/x');
  });

  it('lets ?lang= replace the stored choice', () => {
    expect(page('/it/', 'it', 'it-IT', 'en', '?lang=it')).toEqual({ store: 'it', target: null });
    expect(page('/it/', 'it', 'it-IT', 'it', '?lang=en')).toEqual({ store: 'en', target: '/' });
  });

  it('ignores unsupported ?lang= and stored values', () => {
    expect(page('/software/x', 'en', 'it-IT', 'fr', '?lang=xx')).toEqual({ store: null, target: '/it/software/x' });
  });

  it('keeps the base path', () => {
    expect(localeRedirect({
      pathname: '/ui/it/software/x', search: '', current: 'it', navLang: 'it', stored: 'en', base: '/ui',
    }).target).toBe('/ui/software/x');
  });
});

describe('localeRedirectScript', () => {
  function run(pathname: string, search: string, lang: string, navLang: string, stored: Record<string, string>, hash = '') {
    let replaced: string | null = null;
    const location = { pathname, search, hash, replace: (u: string) => { replaced = u; } };
    const localStorage = {
      getItem: (k: string) => stored[k] ?? null,
      setItem: (k: string, v: string) => { stored[k] = v; },
    };
    new Function('location', 'document', 'navigator', 'localStorage', localeRedirectScript('/ui'))(
      location, { documentElement: { lang } }, { language: navLang }, localStorage,
    );
    return replaced;
  }

  it('stores the switch choice and keeps it on the next page', () => {
    const stored: Record<string, string> = {};
    expect(run('/ui/software/x', '?lang=en', 'en', 'it-IT', stored)).toBeNull();
    expect(stored[LANG_KEY]).toBe('en');
    expect(run('/ui/software/y', '', 'en', 'it-IT', stored)).toBeNull();
    expect(run('/ui/it/software/y', '', 'it', 'it-IT', stored)).toBe('/ui/software/y');
  });

  it('preserves shared weights and fragments while removing the language parameter', () => {
    expect(run('/ui/software/x', '?lang=it&activity=shared', 'en', 'en-US', {}, '#metrics'))
      .toBe('/ui/it/software/x?activity=shared#metrics');
    expect(run('/ui/it/software/x', '?activity=shared', 'it', 'en-US', {}))
      .toBe('/ui/software/x?activity=shared');
  });

  it('still redirects when storage is unavailable', () => {
    let replaced: string | null = null;
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    new Function('location', 'document', 'navigator', 'localStorage', localeRedirectScript(''))(
      { pathname: '/software/x', search: '?lang=it', replace: (u: string) => { replaced = u; } },
      { documentElement: { lang: 'en' } }, { language: 'en-US' }, throwing,
    );
    expect(replaced).toBe('/it/software/x');
  });
});


describe('language switch click', () => {
  const layout = readFileSync(new URL('../layouts/Layout.astro', import.meta.url), 'utf8');
  const handler = layout.slice(layout.indexOf("  menu.querySelectorAll('a[hreflang]')"), layout.indexOf("  menu.addEventListener('click'"));

  it.each(['', '?lang=en&activity=shared'])('keeps the chosen language with current search %s', (search) => {
    let click = () => {};
    const anchor = {
      href: 'https://example.test/ui/it/software/x?lang=it',
      hreflang: 'it',
      addEventListener: (_event: string, listener: () => void) => { click = listener; },
    };
    const menu = { querySelectorAll: () => [anchor] };
    new Function('menu', 'location', handler)(menu, { search, hash: '#metrics' });
    click();
    const target = new URL(anchor.href);
    expect(target.pathname).toBe('/ui/it/software/x');
    expect(target.searchParams.get('lang')).toBe('it');
    expect(target.searchParams.get('activity')).toBe(search ? 'shared' : null);
    expect(target.hash).toBe('#metrics');
    expect(localeRedirect({ pathname: target.pathname, search: target.search, current: 'it', navLang: 'en-US', stored: null, base: '/ui' }))
      .toEqual({ store: 'it', target: null });
  });
});
