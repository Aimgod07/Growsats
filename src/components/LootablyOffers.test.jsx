import {afterEach,expect,test,vi} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import LootablyOffers,{fetchLootablyOffers,safeOfferUrl} from './LootablyOffers';
import {trackedFetch} from '../utils/loading';
vi.mock('../utils/loading',()=>({trackedFetch:vi.fn()}));
vi.mock('../utils/api',()=>({getStoredUser:()=>({id:'player-unique-42'})}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
test('posts the account id and India without sending app credentials',async()=>{
 trackedFetch.mockResolvedValue({ok:true,json:async()=>({status:'success',offers:[]})});
 await fetchLootablyOffers('player-unique-42');
 const options=trackedFetch.mock.calls[0][1];expect(JSON.parse(options.body)).toEqual({user_id:'player-unique-42',countries:['IN']});expect(options.headers).toEqual({'Content-Type':'application/json'});
});
test('does not request offers without a user',async()=>{await expect(fetchLootablyOffers(null)).rejects.toThrow('Sign in');expect(trackedFetch).not.toHaveBeenCalled()});
test('renders offers and filters them without claim buttons',async()=>{
 trackedFetch.mockResolvedValue({ok:true,json:async()=>({status:'success',offers:[{offerID:'a',name:'Puzzle offer',description:'Install and play',devices:['android'],link:'https://example.com/offer',goals:[{description:'Reach level 2',currencyReward:35}]},{offerID:'b',name:'Survey offer'}]})});
 render(<LootablyOffers/>);await screen.findByText('Puzzle offer');expect(screen.getByText('Survey offer')).toBeTruthy();expect(screen.queryByRole('button',{name:/claim/i})).toBeNull();fireEvent.change(screen.getByLabelText('Search partner offers'),{target:{value:'Puzzle'}});expect(screen.queryByText('Survey offer')).toBeNull();expect(screen.getByRole('link',{name:/View offer/}).href).toBe('https://example.com/offer');
});
test('rejects malformed responses and unsafe links',async()=>{trackedFetch.mockResolvedValue({ok:true,json:async()=>({status:'error'})});await expect(fetchLootablyOffers('id')).rejects.toThrow('invalid');expect(safeOfferUrl('javascript:alert(1)')).toBe('')});
