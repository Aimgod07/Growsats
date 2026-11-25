import React from 'react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import EventEntry from './EventEntry';
import {backend} from '../utils/api';
vi.mock('../utils/api',()=>({backend:{joinEvent:vi.fn()}}));
const event={id:'paid',game_id:'courtside',entry_diamonds:20,color:'#5544cc',text_color:'#ffffff'};
describe('paid event entry',()=>{
 beforeEach(()=>vi.clearAllMocks());
 it('shows the fee before payment and prevents duplicate clicks while joining',async()=>{
  let resolve;backend.joinEvent.mockImplementation(()=>new Promise(r=>{resolve=r}));const onJoined=vi.fn();
  render(<MemoryRouter><EventEntry event={event} joined={false} onJoined={onJoined}/></MemoryRouter>);
  expect(screen.queryByRole('link')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Pay 20 diamonds & join'}));
  expect(screen.getByRole('button',{name:'Joining…'}).disabled).toBe(true);
  resolve({joined:true});await waitFor(()=>expect(onJoined).toHaveBeenCalledTimes(1));expect(backend.joinEvent).toHaveBeenCalledTimes(1);
 });
 it('keeps play locked when the wallet has insufficient diamonds',async()=>{
  backend.joinEvent.mockRejectedValue(new Error('Not enough diamonds'));const onJoined=vi.fn();
  render(<MemoryRouter><EventEntry event={event} joined={false} onJoined={onJoined}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button'));expect((await screen.findByRole('alert')).textContent).toBe('Not enough diamonds');expect(onJoined).not.toHaveBeenCalled();expect(screen.queryByRole('link')).toBeNull();
 });
 it('launches an enrolled game with event context without charging again',()=>{
  render(<MemoryRouter><EventEntry event={event} joined onJoined={vi.fn()}/></MemoryRouter>);
  expect(screen.getByRole('link').getAttribute('href')).toBe('/all-games?game=courtside&event=paid');expect(backend.joinEvent).not.toHaveBeenCalled();
 });
});
