/* Shared geometry contract: rendering, collision, radar and navigation use these maps. */
(function(root){'use strict';
const maps=[
 {id:'suncourt',name:'COASTAL CITADEL',tag:'Terraced town · seaside sunset',theme:'coast',sky:'#b3cddd',ground:'#b4aa8e',wall:'#d5c7ad',accent:'#edc48b',fog:230,bounds:32,start:[0,26],spawns:[[-27,-26],[27,-26],[-27,25],[27,25],[0,-27]],
 platforms:[{x:0,z:-3,w:25,d:23,h:2.4}],
 ramps:[{x:0,z:13,w:9,d:9,h:2.4,axis:'z',dir:-1},{x:0,z:-19,w:7,d:9,h:2.4,axis:'z',dir:1},{x:-17,z:-3,w:9,d:7,h:2.4,axis:'x',dir:1},{x:17,z:-3,w:9,d:7,h:2.4,axis:'x',dir:-1}],
 obstacles:[[-8,-7,4,4,14,'tower',2.4],[4,-8,7,6,8,'house',2.4],[-7,3,3,2,1.2,'crate',2.4],[6,3,3,2,1.2,'crate',2.4],[-23,-18,7,7,7,'house'],[23,-18,7,7,7,'house'],[-23,9,7,7,6,'house'],[23,10,7,7,7,'house'],[-14,24,7,6,6,'house'],[15,24,6,6,6,'house'],[-18,-27,5,2,1.4,'stone'],[16,-27,5,2,1.4,'stone'],[-8,19,3,2,1,'stone'],[8,19,3,2,1,'stone']],
 brief:'Push up the broad stairways, flank through the village lanes, and take the elevated church square.'},
 {id:'foundry',name:'HARBOR WORKS',tag:'Loading yard · ocean overlook',theme:'harbor',sky:'#becbce',ground:'#aaa79b',wall:'#9c9b8f',accent:'#d5a268',fog:220,bounds:32,start:[0,27],spawns:[[-27,-27],[27,-27],[-27,22],[27,24],[0,-27]],
 platforms:[{x:-12,z:-9,w:22,d:22,h:3}],
 ramps:[{x:-9,z:7,w:10,d:10,h:3,axis:'z',dir:-1},{x:3,z:-9,w:8,d:7,h:3,axis:'x',dir:-1}],
 obstacles:[[-13,-12,15,10,7,'warehouse',3],[22,-18,12,11,7,'warehouse'],[22,16,12,8,6,'warehouse'],[-22,23,7,8,4,'shed'],[-21,5,3,8,3,'container'],[11,2,3,10,2.8,'container'],[21,-3,3,8,2.8,'container'],[5,-23,8,3,2.8,'container'],[5,19,7,3,2.8,'container'],[-9,21,3,6,2.6,'truck'],[18,-29,3,2,1.3,'crate'],[6,-12,2,2,1.6,'crate'],[-27,-9,3,2,1.4,'crate'],[-14,0,2,2,1.4,'crate',3],[16,8,2,2,1.3,'crate'],[-2,-2,2,2,1.2,'crate'],[-3,15,2,2,1.2,'crate']],
 brief:'Cross the loading yard, use shipping containers for cover, and climb to the warehouse apron.'},
 {id:'neon',name:'PINE RIDGE',tag:'Rural outpost · warm dusk',theme:'rural',sky:'#c7b4a1',ground:'#a59474',wall:'#827461',accent:'#b9cb8d',fog:190,bounds:32,start:[0,27],spawns:[[-27,-27],[27,-26],[-27,24],[27,24],[0,-27]],
 platforms:[{x:0,z:0,w:16,d:13,h:.6}],
 ramps:[{x:0,z:8.5,w:5,d:4,h:.6,axis:'z',dir:-1},{x:0,z:-8.5,w:5,d:4,h:.6,axis:'z',dir:1},{x:10,z:0,w:4,d:5,h:.6,axis:'x',dir:-1},{x:-10,z:0,w:4,d:5,h:.6,axis:'x',dir:1}],
 obstacles:[[-2,-1,9,7,8,'cabin',.6],[-22,-18,8,7,7,'cabin'],[21,-20,9,8,7,'barn'],[23,5,7,7,6,'cabin'],[-23,12,8,8,7,'barn'],[15,23,6,5,4,'shed'],[-14,25,7,1,1.4,'fence'],[-14,17,7,1,1.4,'fence'],[14,-7,8,1,1.4,'fence'],[-15,-6,1,8,1.4,'fence'],[6,14,2,2,1.2,'crate'],[-7,-16,3,2,1.2,'logs'],[19,14,3,5,2.5,'truck'],[7,-26,4,2,1,'logs']],
 brief:'Move between timber cabins, low fences, and wooded flanks. The central homestead controls the crossroads.'}
];
// Trunks are solid cover; foliage remains visual and does not trap the player.
const groves=[ [[-16,-16],[16,-16],[-15,12],[15,13],[-28,0],[28,0],[-6,28],[7,28]], [[-28,5],[28,-10],[-28,-18],[28,29]], [[-13,9],[13,11],[-12,-22],[13,-17],[-28,0],[28,-5],[-6,20],[27,29],[-28,29]] ];
groves.forEach((points,i)=>points.forEach(([x,z])=>maps[i].obstacles.push([x,z,.65,.65,4,'tree',0])));
for(const map of maps){map.obstacles=map.obstacles.map(o=>o.concat(o.length===6?[0]:[]));}
if(typeof module!=='undefined'&&module.exports)module.exports=maps;else root.StrikeMaps=maps;
})(typeof window!=='undefined'?window:globalThis);
