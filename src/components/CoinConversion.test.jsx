import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import CoinConversion from './CoinConversion';
import {backend} from '../utils/api';
vi.mock('./WalletState', () => ({useWallet: () => ({data: {coins: 667}})}));
vi.mock('../utils/api', () => ({backend: {convertCoins: vi.fn().mockResolvedValue({})}}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('rounds max to the exchange increment and submits that amount', async () => {
 render(<CoinConversion/>);
 expect(screen.getByRole('button', {name: 'Confirm exchange'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button', {name: /Use max/}));
 expect(screen.getByRole('spinbutton').value).toBe('660');
 expect(screen.getByText('66 diamonds')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', {name: 'Confirm exchange'}));
 await waitFor(() => expect(backend.convertCoins).toHaveBeenCalledWith(expect.objectContaining({target: 'diamonds', coins: 660})));
});
it('explains an insufficient balance and blocks the exchange', () => {
 render(<CoinConversion/>);
 fireEvent.change(screen.getByRole('spinbutton'), {target: {value: '1000'}});
 expect(screen.getByText('You need 333 more coins for this exchange.')).toBeTruthy();
 expect(screen.getByRole('button', {name: 'Confirm exchange'}).disabled).toBe(true);
});
