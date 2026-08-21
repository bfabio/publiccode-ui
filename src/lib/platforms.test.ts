import { describe, expect, it } from 'vitest';
import { describePlatform } from './platforms';

describe('describePlatform', () => {
  it('maps the six publiccode.yml platform values to a label and an icon', () => {
    expect(describePlatform('web')).toEqual({ label: 'Web', icon: { name: 'globe', prefix: 'fas' } });
    expect(describePlatform('windows')).toEqual({ label: 'Windows', icon: { name: 'windows', prefix: 'fab' } });
    expect(describePlatform('mac')).toEqual({ label: 'macOS', icon: { name: 'apple', prefix: 'fab' } });
    expect(describePlatform('linux')).toEqual({ label: 'Linux', icon: { name: 'linux', prefix: 'fab' } });
    expect(describePlatform('ios')).toEqual({ label: 'iOS', icon: { name: 'apple', prefix: 'fab' } });
    expect(describePlatform('android')).toEqual({ label: 'Android', icon: { name: 'android', prefix: 'fab' } });
  });

  it('ignores case and surrounding spaces', () => {
    expect(describePlatform(' iOS ').label).toBe('iOS');
  });

  it('keeps free text values as they are, without an icon', () => {
    expect(describePlatform('kubernetes')).toEqual({ label: 'kubernetes', icon: null });
    expect(describePlatform('macos')).toEqual({ label: 'macos', icon: null });
  });
});
