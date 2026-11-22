// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, it, expect, vi } from 'vitest';

// The handlers are an is:inline script so they catch image events before
// hydration. Run the exact text from the layout so the test cannot drift.
// Under jsdom import.meta.url is not a file URL, so resolve from the root.
const layout = readFileSync(resolve('src/layouts/Layout.astro'), 'utf8');
const script = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .find((body) => body.includes('image-fallback'));

beforeAll(() => {
  expect(script).toBeDefined();
  new Function(script!)();
});

function screenshotThumb(): HTMLImageElement {
  document.body.innerHTML = `
    <button type="button" class="screenshot-thumb">
      <span class="image-skeleton"></span>
      <img src="a.png" data-fallback="b.png" class="image-fallback" alt="">
    </button>`;
  return document.querySelector('img')!;
}

// jsdom reports an exception thrown inside a listener as a window error
// event, the same way a browser logs it to the console.
function dispatchCountingErrors(target: EventTarget, type: string): number {
  const onError = vi.fn();
  window.addEventListener('error', onError);
  target.dispatchEvent(new Event(type));
  window.removeEventListener('error', onError);
  return onError.mock.calls.length;
}

describe('inline image handlers', () => {
  it('marks a screenshot thumbnail loaded without an image shell', () => {
    const img = screenshotThumb();
    expect(dispatchCountingErrors(img, 'load')).toBe(0);
    expect(img.classList.contains('image-loaded')).toBe(true);
    expect((img.previousElementSibling as HTMLElement).style.display).toBe('none');
  });

  it('hides a screenshot thumbnail whose fallback also fails', () => {
    const img = screenshotThumb();
    expect(dispatchCountingErrors(img, 'error')).toBe(0);
    expect(img.getAttribute('src')).toBe('b.png');
    expect(dispatchCountingErrors(img, 'error')).toBe(0);
    expect(img.style.display).toBe('none');
  });

  it('clears the loading state on an image shell', () => {
    document.body.innerHTML = `
      <figure class="image-shell image-loading">
        <img src="a.png" class="image-fallback" alt="">
      </figure>`;
    const img = document.querySelector('img')!;
    img.dispatchEvent(new Event('load'));
    const shell = img.parentElement!;
    expect(shell.classList.contains('image-loading')).toBe(false);
    expect(shell.classList.contains('image-loaded')).toBe(true);
  });
});
