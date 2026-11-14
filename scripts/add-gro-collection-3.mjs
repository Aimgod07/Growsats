import fs from 'node:fs';
const rows=[
['hex-burst','Hex Burst','Puzzle','clusters','Tap groups of two or more matching gems. Clear as many as possible in 20 moves.'],
['binary-bloom','Binary Bloom','Puzzle','binary','Toggle the five bits to match the target number, then tap CHECK. Solve ten targets.'],
['code-vault','Code Vault','Puzzle','code','Cycle the four digits, then check your code. Green means the correct position. Crack it in ten attempts.'],
['pixel-weaver','Pixel Weaver','Puzzle','pattern','Study the pattern for four seconds, then recreate it on the board and check.'],
['laser-mirrors','Laser Mirrors','Puzzle','mirrors','Rotate the mirrors so the laser reaches the receiver on the right.'],
['river-crossing','River Crossing','Strategy','river','Tap a passenger, then CROSS. Carry the wolf, goat and cabbage safely. Never leave wolf with goat or goat with cabbage.'],
['hanoi-halo','Hanoi Halo','Puzzle','hanoi','Tap a tower to lift its top ring, then tap another to place it. Move all rings to the right tower. Larger rings cannot sit on smaller ones.'],
['queen-garden','Queen Garden','Puzzle','queens','Place five queens so no two share a row, column or diagonal. Tap a queen to remove it.'],
['knight-quest','Knight Quest','Puzzle','knight','Visit every square once with chess knight moves. Tap a highlighted destination.'],
['balance-scales','Balance Scales','Puzzle','weights','Select weights whose total matches the target, then check. Solve ten scales.'],
['word-orbit','Word Orbit','Word','word','Tap letters to spell the clue. Tap your answer to clear it. Complete eight words.'],
['anagram-alley','Anagram Alley','Word','anagram','Rearrange the letters into the word described by the clue. Tap your answer to reset.'],
['odd-one-out','Odd One Out','Observation','odd','Find the one different symbol. Complete 15 rounds before the timer ends.'],
['color-conflict','Color Conflict','Brain','stroop','Choose the INK color, ignoring the word. Get 20 correct before making three mistakes.'],
['quick-equation','Quick Equation','Brain','math','Choose the correct answer to each equation. Solve 20 in one minute.'],
['fraction-feast','Fraction Feast','Brain','fraction','Tap the fraction with the larger value. Complete 20 comparisons.'],
['reaction-relay','Reaction Relay','Skill','reaction','Wait for green, then tap. Five rounds. Tapping early costs a round.'],
['radar-hunt','Radar Hunt','Puzzle','radar','Find the hidden beacon in eight taps. Hotter means closer to the beacon.'],
['treasure-compass','Treasure Compass','Adventure','compass','Use the direction clues to find the buried treasure in seven digs.'],
['star-route','Star Route','Puzzle','route','Visit all stars without crossing your own path. Tap any star to begin.'],
['magnet-maze','Magnet Maze','Skill','dragmaze','Drag the orb along the corridor to the green exit. Stay inside the track.'],
['precision-pilot','Precision Pilot','Skill','trace','Drag from the glowing start along the zigzag trail. Reach every checkpoint in order.'],
['color-gates','Color Gates','Arcade','gates','Tap to cycle your orb color. Match each gate before it reaches you.'],
['orbit-collector','Orbit Collector','Arcade','spiral','Hold to spiral outward; release to return inward. Collect stars and avoid the rim.'],
['twin-dash','Twin Dash','Runner','twins','Tap to switch both runners between lanes. Avoid the incoming blocks.'],
['shield-spin','Shield Spin','Action','shield','Drag around the core to rotate the shield. Block red projectiles before they hit.'],
['bubble-rise','Bubble Rise','Arcade','bubble','Hold to rise; release to sink. Dodge moving mines and collect pearls.'],
['asteroid-miner','Asteroid Miner','Action','miner','Tap rocks to break them before they fall. Larger rocks need more hits.'],
['traffic-conductor','Traffic Conductor','Strategy','traffic','Tap to switch the green light between vertical and horizontal traffic. Let 40 cars through without a crash.'],
['firefly-focus','Firefly Focus','Memory','fireflies','Watch which fireflies light up, then tap those same fireflies. Complete eight rounds.'],
];
const root=new URL('../public/grogames/',import.meta.url),dir=new URL('collection-3/',root);
fs.mkdirSync(dir,{recursive:true});
const games=rows.map(([id,title,category,mode,help],i)=>({id,title,category,mode,help,hue:(165+i*37)%360,orientation:'portrait',path:`/grogames/${id}/index.html`,cover:`/grogames/covers/${id}.svg`}));
fs.writeFileSync(new URL('catalog.js',dir),`globalThis.GroCollection = ${JSON.stringify(games,null,2)};\n`);
const shell=fs.readFileSync(new URL('zen-archer/index.html',root),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
for(const g of games){
 fs.mkdirSync(new URL(`${g.id}/`,root),{recursive:true});
 const html=shell.replaceAll('Zen Archer',g.title).replace('data-game="zen-archer"',`data-game="${g.id}"`).replace('../collection-2/catalog.js','../collection-3/catalog.js').replace('../collection-2/games.js','../collection-3/games.js');
 fs.writeFileSync(new URL(`${g.id}/index.html`,root),html);
 if(!manifest.some(m=>m.id===g.id)){const {mode,help,hue,...entry}=g;manifest.push(entry);}
}
fs.writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(`Added ${games.length} games. Total: ${manifest.length}`);
