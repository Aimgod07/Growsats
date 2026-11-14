const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'engine.js'),'utf8'),sandbox);
const {Flight}=sandbox.module.exports;
function ticks(g,n){for(let i=0;i<n;i++)g.step(1/120);}
let g=new Flight({seed:42});g.start();ticks(g,24);assert(g.y<800*.43,'Tap must lift the plane');
g.pause();const snapshot=JSON.stringify(g);ticks(g,500);assert.equal(JSON.stringify(g),snapshot,'Paused time must not advance');g.resume();assert.equal(g.state,'playing');
g=new Flight({seed:3});g.start();ticks(g,900);assert.equal(g.state,'over','No taps must eventually crash');assert.equal(g.events.filter(e=>e==='crash').length,1);ticks(g,100);assert.equal(g.events.filter(e=>e==='crash').length,1);
g.start();assert.equal(g.score,0);assert.equal(g.pipes.length,0);assert.equal(g.state,'playing');
for(const y of [200,590]){g=new Flight();g.start();g.y=y;g.vy=0;g.pipes=[{x:100,width:72,center:400,gap:200,passed:false}];ticks(g,1);assert.equal(g.state,'over','Both sides of the gate must collide');}
g=new Flight();g.start();g.y=400;g.vy=0;g.pipes=[{x:100,width:72,center:400,gap:218,passed:false}];ticks(g,1);assert.equal(g.state,'playing','Gap must be clear');
g.pipes=[{x:19,width:72,center:400,gap:218,passed:false}];ticks(g,1);assert.equal(g.score,1);ticks(g,8);assert.equal(g.score,1,'Each cleared gate scores once');
// A repeatable pilot verifies that the generated lanes remain playable at each supported aspect ratio.
for(const height of [620,800,1100]){g=new Flight({height,seed:29});g.start();for(let i=0;i<120*120&&g.state==='playing';i++){const next=g.pipes.find(p=>p.x+p.width+6>=g.x-g.radius);const target=next?next.center:height*.43;if(g.y>target+15&&g.vy>0)g.flap();g.step(1/120);}assert(g.score>=30,`Playable flight at height ${height}, reached ${g.score}`);assert.equal(g.state,'playing');}
console.log('Cloud Skipper: lift, pause, crash, replay, both pipe collisions, safe gaps, single scoring and 3 long-flight simulations passed.');
