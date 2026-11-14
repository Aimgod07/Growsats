import {describe,it,expect} from 'vitest';
import {gameCoverSvg,gameCoverUrl} from './gameCover';
describe('game covers',()=>{
 it('escapes untrusted titles and produces deterministic artwork',()=>{
  const art=gameCoverSvg('<script>alert("x")</script>','Racing','123');
  expect(art).not.toContain('<script>');
  expect(art).toContain('&lt;script&gt;');
  expect(art).toBe(gameCoverSvg('<script>alert("x")</script>','Racing','123'));
 });
 it('creates different artwork across games without remote image calls',()=>{
  expect(gameCoverUrl('Hoop Harbor','Sports','a')).not.toBe(gameCoverUrl('Neon Racer','Racing','b'));
  expect(gameCoverSvg('Neon Racer','Racing')).not.toMatch(/<image|<script|<foreignObject/);
 });
});
