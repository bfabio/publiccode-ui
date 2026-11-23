// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const layout = readFileSync(resolve('src/layouts/Layout.astro'), 'utf8');
const script = [...layout.matchAll(/<script is:inline define:vars=\{\{ base, defaultTheme, themes \}\}>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((body) => body.includes("getElementById('settings-btn')"));
const listeners = vi.spyOn(document, 'addEventListener');
let button: HTMLButtonElement;
let menu: HTMLUListElement;
let items: HTMLElement[];
let outside: HTMLButtonElement;

function key(target: HTMLElement, value: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function expectOpen(focused: HTMLElement) {
  expect(menu.hidden).toBe(false);
  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(document.activeElement).toBe(focused);
}

function expectClosed(focused: HTMLElement) {
  expect(menu.hidden).toBe(true);
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(focused);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = `
    <link id="theme-css" href="/catalog/themes/default/index.css">
    <button id="before">Before</button>
    <div class="settings-menu">
      <button id="settings-btn" aria-haspopup="menu" aria-expanded="false">Settings</button>
      <ul id="settings-menu" role="menu" hidden>
        <li role="none"><a href="/settings" role="menuitem" tabindex="-1">Settings</a></li>
        <li role="presentation">Theme</li>
        <li role="none"><button role="menuitemradio" aria-checked="false" data-theme="default" tabindex="-1">Default</button></li>
        <li role="none"><button role="menuitemradio" aria-checked="false" data-theme="dark" tabindex="-1">Dark</button></li>
        <li role="presentation">Language</li>
        <li role="none"><a href="/it" role="menuitemradio" hreflang="it" tabindex="-1">Italiano</a></li>
      </ul>
    </div>
    <button id="after">After</button>`;
  button = document.querySelector('#settings-btn')!;
  menu = document.querySelector('#settings-menu')!;
  items = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  outside = document.querySelector('#after')!;
  expect(script).toBeDefined();
  new Function('base', 'defaultTheme', 'themes', script!)('/catalog', 'default', ['default', 'dark']);
  button.focus();
});

afterEach(() => {
  for (const [type, listener, options] of listeners.mock.calls) {
    document.removeEventListener(type, listener, options);
  }
  listeners.mockClear();
});

describe('settings menu keyboard controls', () => {
  it('opens on the keyboard generated click used by Enter and Space', () => {
    // jsdom does not synthesize native button clicks from keyboard events.
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expectOpen(items[0]);
    expect(items[1].getAttribute('aria-checked')).toBe('true');
  });

  it.each(['ArrowDown', 'ArrowUp'])('opens with %s at the corresponding end', (value) => {
    expect(key(button, value).defaultPrevented).toBe(true);
    expectOpen(value === 'ArrowDown' ? items[0] : items.at(-1)!);
  });

  it('wraps in both directions and moves to Home and End', () => {
    key(button, 'ArrowDown');
    key(items[0], 'ArrowUp');
    expectOpen(items.at(-1)!);
    key(items.at(-1)!, 'ArrowDown');
    expectOpen(items[0]);
    key(items[0], 'ArrowDown');
    expectOpen(items[1]);
    key(items[1], 'End');
    expectOpen(items.at(-1)!);
    key(items.at(-1)!, 'Home');
    expectOpen(items[0]);
  });

  it('closes with Escape and restores focus to the trigger', () => {
    key(button, 'ArrowDown');
    expect(key(items[0], 'Escape').defaultPrevented).toBe(true);
    expectClosed(button);
    expect(key(button, 'Escape').defaultPrevented).toBe(false);
  });

  it.each([false, true])('lets Tab leave the menu (shift=%s)', (shift) => {
    key(button, 'ArrowDown');
    expect(key(items[0], 'Tab', shift).defaultPrevented).toBe(false);
    // Simulate the native focus movement, which jsdom does not perform.
    const destination = shift ? button : outside;
    destination.focus();
    if (shift) {
      expectOpen(button);
      document.querySelector<HTMLButtonElement>('#before')!.focus();
      expectClosed(document.querySelector('#before')!);
    } else {
      expectClosed(outside);
    }
  });

  it.each([0, 3])('activates menu link %s with Space without scrolling', (index) => {
    const item = items[index];
    const click = vi.fn((event: MouseEvent) => event.preventDefault());
    item.addEventListener('click', click);
    key(button, 'ArrowDown');
    key(items[0], index === 0 ? 'Home' : 'End');
    expect(key(item, ' ').defaultPrevented).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    expectOpen(item);
    if (index === 3) {
      expect(new URL((item as HTMLAnchorElement).href).searchParams.get('lang')).toBe('it');
    }
  });

  it('selects a theme and returns focus to the trigger', () => {
    localStorage.setItem('theme', 'dark');
    key(button, 'ArrowDown');
    expect(items[2].getAttribute('aria-checked')).toBe('true');
    key(items[0], 'ArrowDown');
    items[1].click();
    expect(document.querySelector('link')!.getAttribute('href')).toBe('/catalog/themes/default/index.css');
    expect(localStorage.getItem('theme')).toBe('default');
    expect(items[1].getAttribute('aria-checked')).toBe('true');
    expect(items[2].getAttribute('aria-checked')).toBe('false');
    expectClosed(button);
  });

  it('keeps mouse opening on the trigger and closes on an outside click', () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expectOpen(button);
    outside.focus();
    outside.click();
    expectClosed(outside);
  });
});
