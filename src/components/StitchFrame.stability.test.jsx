import React from 'react';
import {render,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {it,expect,vi} from 'vitest';
const fixture=vi.hoisted(()=>({config:{branding:{appName:'Playloot'},screens:{arcade:{groGames:{limit:10}}},components:{}},wallet:{data:{coins:10,diamonds:2}}}));
vi.mock('../config/appConfig',()=>({useAppConfig:()=>fixture.config}));
vi.mock('./WalletState',()=>({useWallet:()=>fixture.wallet}));
import StitchFrame from './StitchFrame';
it('preserves the Arcade document when unrelated page settings or balances refresh',async()=>{
 const {container,rerender}=render(<MemoryRouter><StitchFrame screen="arcade"/></MemoryRouter>);
 await waitFor(()=>expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toContain('pl-catalog-stage'));
 const frame=container.querySelector('iframe'),documentSource=frame.getAttribute('srcdoc');
 fixture.config={...fixture.config,screens:{...fixture.config.screens,profile:{title:'Updated profile'}}};
 fixture.wallet={data:{coins:20,diamonds:2}};
 rerender(<MemoryRouter><StitchFrame screen="arcade"/></MemoryRouter>);
 expect(container.querySelector('iframe')).toBe(frame);
 expect(frame.getAttribute('srcdoc')).toBe(documentSource);
});
