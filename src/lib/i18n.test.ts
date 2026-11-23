import { describe, it, expect } from 'vitest';
import { pickDescription, routePathname } from './i18n.js';

describe('routePathname', () => {
  it('keeps the path as is with no base and no locale prefix', () => {
    expect(routePathname('/software/', '')).toBe('/software/');
  });

  it('strips the locale prefix', () => {
    expect(routePathname('/it/software/', '')).toBe('/software/');
  });

  it('strips a non-root base', () => {
    expect(routePathname('/publiccode-ui/software/', '/publiccode-ui')).toBe('/software/');
  });

  it('strips base and locale prefix together', () => {
    expect(routePathname('/publiccode-ui/it/software/', '/publiccode-ui')).toBe('/software/');
  });

  it('returns / for the base root', () => {
    expect(routePathname('/publiccode-ui/', '/publiccode-ui')).toBe('/');
  });

  it('returns / for a bare locale prefix', () => {
    expect(routePathname('/publiccode-ui/it', '/publiccode-ui')).toBe('/');
  });

  it('does not strip a segment that merely starts with a locale code', () => {
    expect(routePathname('/italia/', '')).toBe('/italia/');
  });
});

describe('pickDescription', () => {
  const it_ = { shortDescription: 'Gestione dei protocolli' };
  const en = { shortDescription: 'Records management' };

  it('leaves the lang out when the description is in the page language', () => {
    expect(pickDescription({ it: it_, en }, 'en')).toEqual({ description: en, lang: undefined });
    expect(pickDescription({ it: it_, en }, 'it')).toEqual({ description: it_, lang: undefined });
  });

  it('marks the language of a fallback description', () => {
    expect(pickDescription({ it: it_ }, 'en')).toEqual({ description: it_, lang: 'it' });
    expect(pickDescription({ de: it_, en }, 'it')).toEqual({ description: en, lang: 'en' });
  });

  it('compares the primary subtag and canonicalizes the tag', () => {
    expect(pickDescription({ 'en-US': en }, 'en').lang).toBeUndefined();
    expect(pickDescription({ IT: it_ }, 'en').lang).toBe('it');
    expect(pickDescription({ 'it-it': it_ }, 'en').lang).toBe('it-IT');
  });

  it('marks a key that is not a language tag as unknown', () => {
    expect(pickDescription({ italiano_: it_ }, 'en')).toEqual({ description: it_, lang: '' });
  });

  it('returns an empty description when there is none', () => {
    expect(pickDescription(undefined, 'en')).toEqual({ description: {}, lang: undefined });
    expect(pickDescription({}, 'en')).toEqual({ description: {}, lang: undefined });
  });
});
