import {render,waitFor,cleanup} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import {AdPlacement,LiveFeaturesProvider,normaliseAdSource} from './LiveFeatures';
import {backend} from '../utils/api';
vi.mock('../utils/api',()=>({backend:{live:vi.fn()}}));
afterEach(cleanup);
test('upgrades the retired ad host and blocks unsafe sources',()=>{
 expect(normaliseAdSource('https://api.groadz.com/api/ads/render?domain=grosats.com',300,250)).toBe('https://groadz.com/advertisement-api/api/ads/render?domain=grosats.com&width=300&height=250');
 expect(normaliseAdSource('javascript:alert(1)',300,250)).toBe('');
});
for(const position of ['top','middle','bottom'])test(`renders one ad at ${position}`,async()=>{
 backend.live.mockResolvedValue({events:[],ads:[{id:'loot',enabled:1,position,src:'https://example.com/ad',width:300,height:250}]});
 const {container}=render(<LiveFeaturesProvider><main><div className="hub__body"><AdPlacement slot="loot"/><section>A</section><section>B</section><section>C</section><section>D</section></div></main></LiveFeaturesProvider>);
 await waitFor(()=>expect(container.querySelectorAll('iframe')).toHaveLength(1));
 const body=container.querySelector('.hub__body');
 if(position==='middle')expect(body.querySelector('[data-ad-position]').nextElementSibling.textContent).toBe('C');
 if(position==='bottom')expect(body.lastElementChild.dataset.adPosition).toBe('bottom');
 if(position==='top')expect(body.querySelector('aside').nextElementSibling.textContent).toBe('A');
});

for(const position of ['middle','bottom'])test(`nested screen keeps ${position} distinct`,async()=>{
 backend.live.mockResolvedValue({events:[],ads:[{id:'ranks',enabled:1,position,src:'https://example.com/ad',width:300,height:250}]});
 const {container}=render(<LiveFeaturesProvider><main><div className="hub__body"><AdPlacement slot="ranks"/><section data-testid="wrapper"><div>Intro</div><div>Podium</div><div>Rankings</div><div>Your rank</div></section></div></main></LiveFeaturesProvider>);
 await waitFor(()=>expect(container.querySelectorAll('iframe')).toHaveLength(1));
 const host=container.querySelector('[data-ad-position]');
 if(position==='middle'){
   expect(host.parentElement.dataset.testid).toBe('wrapper');
   expect(host.nextElementSibling.textContent).toBe('Rankings');
 }else{
   expect(host.parentElement.className).toBe('hub__body');
   expect(host.previousElementSibling.dataset.testid).toBe('wrapper');
 }
});

test('replaces retired ads with both isolated script banners',async()=>{
 backend.live.mockResolvedValue({events:[],ads:['arcade','ranks'].map(id=>({id,enabled:1,src:'https://groadz.com/advertisement-api/api/ads/render',width:300,height:250}))});
 const {container}=render(<LiveFeaturesProvider><main><AdPlacement slot="arcade"/><AdPlacement slot="ranks"/></main></LiveFeaturesProvider>);
 await waitFor(()=>expect(container.querySelectorAll('iframe')).toHaveLength(2));
 const frames=[...container.querySelectorAll('iframe')];
 expect(frames[0].src).toContain('/ads/banner-one.html');expect(frames[1].src).toContain('/ads/banner-two.html');
 for(const frame of frames){expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');expect(frame.height).toBe('250');}
});
