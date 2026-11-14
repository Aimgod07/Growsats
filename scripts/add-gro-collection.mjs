import fs from 'node:fs';
const rows = [
 ['aurora-dodge','Aurora Dodge','Action','dodge','Drag your ship through the meteor field. Collect crystals and avoid red meteors.'],
 ['nova-defender','Nova Defender','Action','shooter','Drag to steer. Your ship fires automatically. Clear incoming drones.'],
 ['lunar-lander','Lunar Lander','Adventure','lander','Hold to fire the thruster. Drift onto the glowing platform with a gentle landing.'],
 ['comet-catch','Comet Catch','Arcade','catch','Drag the basket to catch stars. Avoid the red debris.'],
 ['pulse-paddle','Pulse Paddle','Sports','pong','Drag the paddle to return the energy ball. Each return scores points.'],
 ['crystal-breaker','Crystal Breaker','Action','breakout','Drag the paddle. Break every crystal without losing your three lives.'],
 ['orbit-switch','Orbit Switch','Timing','orbit','Tap to switch orbit. Collect gold stars and dodge red satellites.'],
 ['neon-slalom','Neon Slalom','Racing','slalom','Drag left and right to pass through each glowing gate.'],
 ['sky-vault','Sky Vault','Platformer','hopper','Drag to steer your bouncing explorer. Climb the floating platforms.'],
 ['reef-glider','Reef Glider','Adventure','flap','Tap to swim upward. Glide through the gaps between coral towers.'],
 ['laser-leap','Laser Leap','Runner','jump','Tap to jump over laser fences. Survive as the skyline speeds up.'],
 ['gem-sweeper','Gem Sweeper','Puzzle','mines','Reveal safe tiles. Numbers count nearby mines. Find all safe tiles to win.'],
 ['prism-lights','Prism Lights','Puzzle','lights','Tap a tile to flip it and its neighbors. Switch every light off.'],
 ['number-trail','Number Trail','Puzzle','sequence','Tap every number in order, starting at 1. Finish before the clock runs out.'],
 ['echo-crystals','Echo Crystals','Memory','simon','Watch the crystal sequence, then repeat it. Each round adds one crystal.'],
 ['twin-constellations','Twin Constellations','Memory','memory','Turn over two cards at a time. Find all eight matching pairs.'],
 ['slide-spectrum','Slide Spectrum','Puzzle','slide','Tap a tile beside the empty space. Arrange the numbers from 1 to 8.'],
 ['color-circuit','Color Circuit','Puzzle','flood','Choose a color below to expand the top-left region. Fill the board in 24 moves.'],
 ['rune-sum','Rune Sum','Puzzle','sum','Select two runes that add up to the target. Build a streak before time runs out.'],
 ['shape-sorter','Shape Sorter','Puzzle','sort','Tap the matching symbol below for the falling crystal. Match 20 to win.'],
 ['pathfinder','Pathfinder','Puzzle','maze','Swipe or use arrow keys to guide the explorer through the maze to the exit.'],
 ['star-links','Star Links','Puzzle','connect','Connect matching stars with a single straight horizontal or vertical line. Crossings are allowed.'],
 ['zen-archer','Zen Archer','Sports','archery','Tap when the moving sight is closest to the target center. You have ten arrows.'],
 ['gravity-putt','Gravity Putt','Sports','putt','Drag backward from the ball and release to putt into the glowing hole.'],
 ['goal-rush','Goal Rush','Sports','goal','Tap inside the goal to shoot. Avoid the moving goalkeeper. Ten shots.'],
 ['ice-curl','Ice Curl','Sports','curl','Drag backward from the stone and release. Stop as close to the target as possible.'],
 ['rhythm-rain','Rhythm Rain','Rhythm','rhythm','Tap a lane when its falling note reaches the bright line. Keyboard: D F J K.'],
 ['tower-forge','Tower Forge','Timing','stack','Tap to place the moving block. Keep it aligned with the tower below.'],
 ['locksmith','Locksmith','Timing','lock','Tap when the rotating hand enters the glowing arc. Open ten locks.'],
 ['meteor-slice','Meteor Slice','Action','slice','Drag through floating crystals to slice them. Avoid red mines.'],
 ['spark-garden','Spark Garden','Arcade','whack','Tap glowing sprouts before they vanish. Avoid red thorns.'],
 ['balance-beacon','Balance Beacon','Skill','balance','Hold left or right to balance the orb on the beam. Collect light for 60 seconds.'],
 ['territory-dots','Territory Dots','Strategy','boxes','Tap a line to complete boxes. You are cyan; the computer is violet. Most boxes wins.'],
];
const root=new URL('../public/grogames/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
const collection=rows.map(([id,title,category,mode,help],i)=>({id,title,category,mode,help,hue:(185+i*31)%360,orientation:'portrait',path:`/grogames/${id}/index.html`,cover:`/grogames/covers/${id}.svg`}));
fs.mkdirSync(new URL('collection-2/',root),{recursive:true});
fs.writeFileSync(new URL('collection-2/catalog.js',root),`globalThis.GroCollection = ${JSON.stringify(collection,null,2)};\n`);
for(const game of collection){
 fs.mkdirSync(new URL(`${game.id}/`,root),{recursive:true});
 fs.writeFileSync(new URL(`${game.id}/index.html`,root),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080c18"><title>${game.title}</title><link rel="stylesheet" href="../collection-2/player.css"></head><body data-game="${game.id}"><main><header><img id="cover" alt=""><div><small>GRO GAMES / ORIGINALS</small><h1>${game.title}</h1></div><button id="pause" aria-label="Pause game">Ⅱ</button></header><div class="stats"><div><span>SCORE</span><b id="score">0</b></div><div><span id="meter-label">TIME</span><b id="meter">0:00</b></div><div><span>BEST</span><b id="best">0</b></div></div><section class="stage"><canvas id="game" width="400" height="600" tabindex="0" aria-label="${game.title} game area"></canvas><div class="toast" id="toast" role="status"></div></section><footer><span id="hint"></span><button id="sound" aria-label="Enable sound">♪ Off</button></footer></main><dialog id="dialog"><img id="art" alt=""><small id="eyebrow">YOUR NEXT HIGH SCORE</small><h2 id="heading"></h2><p id="description"></p><button id="play" class="primary">Play now →</button><button id="restart" class="secondary" hidden>Start again</button></dialog><script src="../collection-2/catalog.js"></script><script src="../collection-2/games.js"></script><script src="../collection-2/player.js"></script></body></html>`);
 if(!manifest.some(g=>g.id===game.id))manifest.push(({id:game.id,title:game.title,category:game.category,orientation:'portrait',path:game.path,cover:game.cover}));
}
fs.writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(`Installed ${collection.length} new games; catalog total ${manifest.length}.`);
