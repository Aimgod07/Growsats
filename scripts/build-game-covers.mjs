import fs from 'node:fs';
import {gameCoverSvg} from '../src/utils/gameCover.js';
const manifestPath = new URL('../public/grogames/manifest.json', import.meta.url);
const games = JSON.parse(fs.readFileSync(manifestPath));
for (const game of games) {
  game.cover = `/grogames/covers/${game.id}.svg`;
  fs.writeFileSync(new URL(`../public${game.cover}`, import.meta.url), gameCoverSvg(game.title, game.category, game.id));
}
fs.writeFileSync(manifestPath, JSON.stringify(games,null,2)+'\n');
const arcadePath = new URL('../src/components/stitch/arcade.js', import.meta.url);
fs.writeFileSync(arcadePath, fs.readFileSync(arcadePath,'utf8').replace(/const catalog = \[.*?\];/,`const catalog = ${JSON.stringify(games)};`));
console.log(`Created ${games.length} illustrated game covers.`);
