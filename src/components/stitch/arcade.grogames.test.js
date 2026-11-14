import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {enhanceArcade} from './arcade';
afterEach(()=>{document.body.innerHTML='';document.head.innerHTML='';});
beforeEach(()=>{window.matchMedia=vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));});
function render(groGames){document.body.innerHTML='<main><div></div></main>';enhanceArcade([],{screens:{arcade:{groGames}}});document.dispatchEvent(new Event('DOMContentLoaded'));}
describe('Gro Games controls',()=>{
 it('limits only original game cards',()=>{render({enabled:true,limit:3});expect(document.querySelectorAll('.grogames-card')).toHaveLength(3);expect(document.querySelector('.gro-heading').textContent).toContain('3 games');});
 it('shows every original game when the limit is zero',()=>{render({enabled:true,limit:0});expect(document.querySelectorAll('.grogames-card')).toHaveLength(17);});
 it('opens the shared catalog filtered to GroGames',()=>{const post=vi.spyOn(window.parent,'postMessage');render({enabled:true,limit:3});document.querySelector('.gro-view-all').click();expect(post).toHaveBeenCalledWith({type:'playloot:navigate',path:'/all-games?source=grogames'},'*');post.mockRestore();});
 it('hides the section when disabled',()=>{render({enabled:false,limit:4});expect(document.querySelector('.grogames-section')).toBeNull();});
});

it('selects Gro Games for the hero independently of the Gro Games section',()=>{
  global.ResizeObserver=class{observe(){}};
  document.body.innerHTML='<main><div><section><div id="promo-track"></div></section></div></main>';
  enhanceArcade([],{screens:{arcade:{groGames:{enabled:false},carousel:{sources:['grogames'],count:2,selectedGameIds:['gro:courtside']}}}});
  document.dispatchEvent(new Event('DOMContentLoaded'));
  expect(document.querySelectorAll('.pl-feature')).toHaveLength(1);
  expect(document.querySelector('.pl-feature h3').textContent).toBe('Courtside');
});
