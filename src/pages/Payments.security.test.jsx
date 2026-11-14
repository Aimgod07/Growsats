import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {webcrypto} from 'node:crypto';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import Transactions from './Transactions';
import PaymentsStudio from 'C:/Users/choud/Desktop/playloot-pms/src/PaymentsStudio.jsx';
import PaymentProviders from 'C:/Users/choud/Desktop/playloot-pms/src/PaymentProviders.jsx';
import {backend} from '../utils/api';
vi.mock('../utils/api',()=>({getStoredUser:()=>({id:'player-test'}),backend:{payments:vi.fn(),createPayment:vi.fn(),retryPayment:vi.fn()}}));
const method={id:'currency',title:'Currency',category:'currency',enabled:1,deposit_enabled:1,withdraw_enabled:1,min_minor:100,max_minor:100000};
it('PMS method switch submits the selected provider and method independently',async()=>{
 const auth=vi.fn().mockResolvedValue({ok:true}),onSaved=vi.fn();
 render(<PaymentProviders auth={auth} onSaved={onSaved} data={{providers:[{id:'a',title:'Provider A',enabled:1}],methods:[method],providerMethods:[{provider_id:'a',method_id:'currency',enabled:1,deposit_enabled:1,withdraw_enabled:1}]}}/>);
 fireEvent.click(screen.getByRole('switch',{name:'Provider A currency Method enabled'}));
 await waitFor(()=>expect(onSaved).toHaveBeenCalled());
 expect(JSON.parse(auth.mock.calls[0][1].body)).toEqual({entity:'provider_method',providerId:'a',methodId:'currency',enabled:false,depositEnabled:true,withdrawEnabled:true});
});
beforeEach(()=>{sessionStorage.clear();vi.stubGlobal('crypto',webcrypto);backend.payments.mockResolvedValue({ready:true,wallet:{currency:'INR',availableMinor:10000,reservedMinor:0},methods:[method],transactions:[]});});
it('withdraw shortcut opens the withdrawal form directly',async()=>{
 render(<MemoryRouter initialEntries={['/transactions?direction=withdraw']}><Transactions/></MemoryRouter>);
 await screen.findByText('Request withdrawal');
 expect(screen.getByRole('button',{name:'Withdraw'}).getAttribute('aria-pressed')).toBe('true');
});
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});
it('payment retry after an ambiguous network failure retains its identity across screen remounts',async()=>{
 backend.createPayment.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({message:'Request saved'});
 const mount=()=>render(<MemoryRouter><Transactions/></MemoryRouter>);
 let view=mount();await screen.findByText('Choose a payment method');
 fireEvent.change(screen.getByPlaceholderText('0.00'),{target:{value:'5.00'}});fireEvent.click(screen.getByText('Continue to deposit'));
 await screen.findByText('Connection interrupted');const first=backend.createPayment.mock.calls.at(-1)[0];
 view.unmount();mount();await screen.findByText('Choose a payment method');
 fireEvent.change(screen.getByPlaceholderText('0.00'),{target:{value:'5.00'}});fireEvent.click(screen.getByText('Continue to deposit'));
 await screen.findByText('Request saved');expect(backend.createPayment.mock.calls.at(-1)[0].idempotencyKey).toBe(first.idempotencyKey);
 expect(first.amountMinor).toBe(500);
 expect(sessionStorage.getItem('playloot.payment.intent.player-test')).toBeNull();
});
it('PMS changes method limits and directions without exposing payment settlement controls',async()=>{
 const auth=vi.fn().mockResolvedValue({ready:false,methods:[method],rows:[],hasMore:false});
 render(<PaymentsStudio auth={auth}/>);await screen.findByText('Save method');
 fireEvent.change(screen.getByLabelText('Minimum amount (minor units)'),{target:{value:'250'}});
 fireEvent.click(screen.getByLabelText('deposit enabled'));fireEvent.click(screen.getByText('Save method'));
 await waitFor(()=>expect(auth.mock.calls.some(([,o])=>o?.method==='PUT')).toBe(true));
 const [,options]=auth.mock.calls.find(([,o])=>o?.method==='PUT');expect(JSON.parse(options.body)).toMatchObject({minMinor:250,depositEnabled:false,withdrawEnabled:true});
 expect(screen.queryByRole('button',{name:/mark.*success/i})).toBeNull();
});
