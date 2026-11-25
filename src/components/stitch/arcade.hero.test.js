import {afterEach, expect, it, vi} from 'vitest';
import {enhanceArcade} from './arcade';

afterEach(() => { document.body.innerHTML = ''; delete HTMLImageElement.prototype.decode; vi.restoreAllMocks(); });

it('reserves the character image dimensions and reveals it only after decoding', async () => {
  let finishDecode;
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {configurable: true, value: () => new Promise(resolve => { finishDecode = resolve; })});
  window.matchMedia = vi.fn(() => ({matches: true, addEventListener: vi.fn()}));
  document.body.innerHTML = '<main><div class="relative overflow-hidden rounded-xl"><h3>Mystery loot</h3></div></main>';
  enhanceArcade([], {screens: {arcade: {carousel: {sources: []}}}});
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await Promise.resolve();
  const image = document.querySelector('.pl-catalog-duo');
  expect(image.getAttribute('src')).toMatch(/\.webp$/);
  expect(image.width).toBe(1254);
  expect(image.height).toBe(1254);
  expect(image.getAttribute('fetchpriority')).toBe('high');
  expect(image.classList.contains('is-ready')).toBe(false);
  finishDecode();
  await Promise.resolve();
  expect(image.classList.contains('is-ready')).toBe(true);
});
