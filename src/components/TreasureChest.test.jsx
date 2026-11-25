import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import TreasureChest from './TreasureChest';

vi.mock('@google/model-viewer', () => ({}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('lets the viewer handle touch moves only while the gesture can be canceled', () => {
  const {container} = render(<TreasureChest/>);
  const model = container.querySelector('model-viewer');
  const surface = document.createElement('div');
  model.attachShadow({mode: 'open'}).append(surface);
  const onTouchMove = vi.fn();
  surface.addEventListener('touchmove', onTouchMove);

  const scrollMove = new Event('touchmove', {bubbles: true, composed: true});
  fireEvent(surface, scrollMove);
  expect(onTouchMove).not.toHaveBeenCalled();
  expect(scrollMove.defaultPrevented).toBe(false);

  fireEvent(surface, new Event('touchmove', {bubbles: true, composed: true, cancelable: true}));
  expect(onTouchMove).toHaveBeenCalledOnce();
});

it('keeps the fitted fallback until the loaded model camera is settled', () => {
  let nextFrame;
  vi.stubGlobal('requestAnimationFrame', callback => { nextFrame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const {container} = render(<TreasureChest/>);
  const wrapper = container.firstElementChild;
  const model = container.querySelector('model-viewer');
  model.jumpCameraToGoal = vi.fn();
  expect(wrapper.dataset.ready).toBe('false');
  // Keep the viewer measurable and avoid its independently sized built-in poster.
  expect(model.hasAttribute('hidden')).toBe(false);
  expect(model.hasAttribute('poster')).toBe(false);
  expect(screen.getByRole('progressbar').hasAttribute('value')).toBe(false);
  fireEvent(model, new CustomEvent('progress', {detail: {totalProgress: 0.42}}));
  expect(screen.getByRole('progressbar').value).toBe(42);
  fireEvent(model, new Event('load'));
  expect(wrapper.dataset.ready).toBe('false');
  act(() => nextFrame());
  expect(model.jumpCameraToGoal).toHaveBeenCalledOnce();
  expect(wrapper.dataset.ready).toBe('true');
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(model.hasAttribute('camera-controls')).toBe(true);
  expect(screen.queryByRole('button', {name: /rotate/i})).toBeNull();
  fireEvent(model, new Event('error'));
  expect(wrapper.dataset.ready).toBe('false');
  expect(screen.getByRole('status').textContent).toContain('showing preview');
});
