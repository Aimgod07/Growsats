import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameWebViewOverlay from './GameWebViewOverlay';
import { GameWebView } from './gameWebView';
import { backend } from '../../utils/api';

const { listeners } = vi.hoisted(() => ({ listeners: new Map() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('../../utils/api', () => ({
  getStoredUser: () => ({ id: 'player-1' }),
  backend: { startPlay: vi.fn(), eventHeartbeat: vi.fn(), claimPlay: vi.fn(), closePlay: vi.fn() },
}));
vi.mock('./gameWebView', () => ({ GameWebView: {
  addListener: vi.fn(), mount: vi.fn(), unmount: vi.fn(), resize: vi.fn(),
  lockOrientation: vi.fn(), showTimer: vi.fn(), removeAllListeners: vi.fn(), updateControls: vi.fn(),
} }));

const game = { id: 'g1', title: 'Game', playUrl: 'https://example.test/game', orientation: 'portrait' };
const view = (onClose, selected = game) => <MemoryRouter><GameWebViewOverlay game={selected} onClose={onClose}/></MemoryRouter>;
beforeEach(() => {
  vi.resetAllMocks();
  listeners.clear();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  for (const method of ['mount','unmount','resize','lockOrientation','showTimer','removeAllListeners','updateControls'])
    GameWebView[method].mockResolvedValue();
  GameWebView.addListener.mockImplementation(async (event, callback) => {
    const callbacks = listeners.get(event) || new Set();
    callbacks.add(callback);
    listeners.set(event, callbacks);
    return { remove: vi.fn(async () => callbacks.delete(callback)) };
  });
  backend.startPlay.mockResolvedValue({ sessionId: 's1' });
  backend.eventHeartbeat.mockResolvedValue({ ok: true });
  backend.closePlay.mockResolvedValue({ ok: true });
});
afterEach(cleanup);
function emit(event, value) { for (const callback of listeners.get(event) || []) callback(value); }

it('does not launch untracked gameplay when the session limit rejects start', async () => {
  backend.startPlay.mockRejectedValueOnce(new Error('Close or claim an active game first'));
  render(view(vi.fn()));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Close or claim'));
  expect(GameWebView.mount).not.toHaveBeenCalled();
});

it('routes the native claim button through the existing reward flow and keeps failed claims playable', async () => {
  backend.claimPlay.mockRejectedValue(new Error('Please retry'));
  render(view(vi.fn()));
  await waitFor(() => expect(GameWebView.mount).toHaveBeenCalledTimes(1));
  act(() => emit('timer:tick', { elapsedSeconds: 180 }));
  await waitFor(() => expect(GameWebView.updateControls).toHaveBeenCalledWith(expect.objectContaining({canClaim:true,claimLabel:'Claim 10 coins'})));
  act(() => emit('game:claim'));
  await waitFor(() => expect(backend.claimPlay).toHaveBeenCalledWith('s1'));
  await waitFor(() => expect(GameWebView.updateControls).toHaveBeenCalledWith({message:'Please retry'}));
  expect(GameWebView.unmount).not.toHaveBeenCalled();
});

it('keeps one WebView and timer through wallet refreshes and fresh parent callbacks', async () => {
  const firstClose = vi.fn(), latestClose = vi.fn();
  const result = render(view(firstClose));
  await waitFor(() => expect(GameWebView.mount).toHaveBeenCalledTimes(1));
  act(() => { emit('game:ready'); emit('timer:tick', { elapsedSeconds: 42 }); });
  for (let i = 0; i < 5; i++) result.rerender(view(latestClose, { ...game }));
  act(() => emit('game:ready'));
  expect(GameWebView.mount).toHaveBeenCalledTimes(1);
  expect(GameWebView.unmount).not.toHaveBeenCalled();
  expect(GameWebView.showTimer).toHaveBeenCalledTimes(1);
  expect(backend.startPlay).toHaveBeenCalledTimes(1);
  expect(screen.getByText('00:42')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  act(() => emit('game:close'));
  await waitFor(() => expect(latestClose).toHaveBeenCalledTimes(1));
  expect(firstClose).not.toHaveBeenCalled();
});

it('does not reopen a game closed while Android is rotating', async () => {
  let finishRotation;
  GameWebView.lockOrientation.mockImplementationOnce(() => new Promise(resolve => { finishRotation = resolve; }));
  const onClose = vi.fn();
  render(view(onClose));
  await waitFor(() => expect(GameWebView.lockOrientation).toHaveBeenCalledTimes(1));
  act(() => emit('game:close'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  await act(async () => finishRotation());
  expect(GameWebView.mount).not.toHaveBeenCalled();
});

it('cancels the abandoned StrictMode launch and removes listeners on unmount', async () => {
  const result = render(<React.StrictMode>{view(vi.fn())}</React.StrictMode>);
  await waitFor(() => expect(GameWebView.mount).toHaveBeenCalledTimes(1));
  expect(listeners.get('game:ready').size).toBe(1);
  result.unmount();
  expect(GameWebView.unmount).toHaveBeenCalledTimes(1);
  expect([...listeners.values()].every(callbacks => callbacks.size === 0)).toBe(true);
});
