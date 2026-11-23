// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, it, expect } from 'vitest';

// The image handlers are an is:inline script so they catch image events
// before hydration. Run the exact text from the layout so the test
// cannot drift from it.
const layout = readFileSync(resolve('src/layouts/Layout.astro'), 'utf8');
const script = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .find((body) => body.includes('image-fallback'));

beforeAll(() => {
  expect(script).toBeDefined();
  new Function(script!)();
});

const thumb = (n: number) => `
  <button type="button" class="screenshot-thumb">
    <span class="image-skeleton"></span>
    <img src="${n}.png" data-fallback="${n}-mirror.png" class="image-fallback" alt="">
  </button>`;

beforeEach(() => {
  document.body.innerHTML = `
    <section class="software-screenshots">
      <div class="screenshot-grid">${thumb(1)}${thumb(2)}</div>
    </section>`;
});

const thumbs = () => [...document.querySelectorAll<HTMLButtonElement>('.screenshot-thumb')];
const section = () => document.querySelector<HTMLElement>('.software-screenshots')!;
const fail = (button: HTMLButtonElement) =>
  button.querySelector('img')!.dispatchEvent(new Event('error'));

describe('screenshot error handler', () => {
  it('tries the fallback URL before dropping a thumbnail', () => {
    const [first] = thumbs();
    fail(first);
    expect(first.querySelector('img')!.getAttribute('src')).toBe('1-mirror.png');
    expect(first.style.display).toBe('');
  });

  it('drops a thumbnail once both URLs fail', () => {
    const [first, second] = thumbs();
    fail(first);
    fail(first);
    expect(first.style.display).toBe('none');
    expect(second.style.display).toBe('');
    expect(section().style.display).toBe('');
  });

  it('hides the section when no screenshot is left', () => {
    for (const button of thumbs()) {
      fail(button);
      fail(button);
    }
    expect(section().style.display).toBe('none');
  });
});
