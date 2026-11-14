import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppLoader from './AppLoader';
import { beginLoading, clearLoadingErrors, getLoadingSnapshot, trackedFetch } from '../utils/loading';

beforeEach(() => { vi.useFakeTimers(); clearLoadingErrors(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const mount = () => render(<MemoryRouter><AppLoader /></MemoryRouter>);
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(400); });

describe('initial loading screen', () => {
  it('waits for all parallel and dependent requests, not just the first response', async () => {
    const first = beginLoading('games'), second = beginLoading('wallet'); mount();
    await settle(); expect(screen.getByText('Getting your arcade ready')).toBeTruthy();
    act(() => first()); await settle(); expect(screen.getByRole('status')).toBeTruthy();
    let dependent; act(() => { dependent = beginLoading('screen'); second(); });
    await settle(); expect(screen.getByRole('status')).toBeTruthy();
    act(() => dependent()); await settle(); expect(screen.queryByRole('status')).toBeNull();
  });
  it('does not cover the page during background refresh after it is ready', async () => {
    mount(); await settle(); let finish; act(() => { finish=beginLoading('background'); });
    expect(screen.queryByRole('status')).toBeNull(); act(() => finish());
  });
  it('offers retry and continue after a failed initial request', async () => {
    const finish = beginLoading('games'); mount(); act(() => finish(new Error('Offline')));
    expect(screen.getByRole('button', {name:'Try again'})).toBeTruthy();
    act(() => screen.getByRole('button', {name:'Continue'}).click());
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('allows escape from a stalled screen instead of an infinite spinner', async () => {
    const finish = beginLoading('frame'); mount();
    await act(async()=>vi.advanceTimersByTimeAsync(25000));
    expect(screen.getByText('Taking a little longer')).toBeTruthy();
    expect(screen.getByRole('button',{name:'Continue'})).toBeTruthy();act(()=>finish());
  });
});

describe('tracked requests',()=>{
 it('holds the loader until response body is received and releases once',async()=>{
   let release; const body=new Promise(resolve=>release=resolve);
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,clone:()=>({arrayBuffer:()=>body})}));
   const pending=trackedFetch('/games');await Promise.resolve();expect(getLoadingSnapshot().pending).toBe(1);
   release(new ArrayBuffer(0));await pending;expect(getLoadingSnapshot().pending).toBe(0);
 });
 it('releases failed requests and ignores expired-session errors for the loader',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401}));
   await trackedFetch('/me');expect(getLoadingSnapshot().pending).toBe(0);expect(getLoadingSnapshot().errors).toHaveLength(0);
 });
});
