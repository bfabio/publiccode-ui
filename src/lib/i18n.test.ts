import { describe, it, expect } from 'vitest';
import { routePathname } from './i18n.js';

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
