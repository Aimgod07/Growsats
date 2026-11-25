import React from 'react';
import {render,screen} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {cleanup} from '@testing-library/react';
import RewardsBanner from './RewardsBanner';
afterEach(cleanup);
it('shows diamond discovery copy and links to partner offers',()=>{
 const {container}=render(<RewardsBanner variant="diamonds"/>);
 expect(screen.getByRole('heading',{level:1}).textContent).toBe('Discover yournext diamond.');
 expect(screen.getByRole('link',{name:'Browse offers'}).getAttribute('href')).toBe('#partner-offers');
 expect(container.querySelector('img').getAttribute('src')).toBe('/playloot-art/diamonds-banner.webp');
});
it('shows daily mission copy and links to the objectives',()=>{
 const {container}=render(<RewardsBanner variant="missions"/>);
 expect(screen.getByRole('heading',{level:1}).textContent).toBe('Play daily.Make it count.');
 expect(screen.getByText('Complete daily objectives, build your progress, and claim your coin rewards.')).toBeTruthy();
 expect(screen.getByRole('link',{name:'View missions'}).getAttribute('href')).toBe('#daily-missions');
 expect(container.querySelector('img').getAttribute('src')).toBe('/playloot-art/missions-banner.webp');
});
