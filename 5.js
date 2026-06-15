importScripts('1.js','2.js');
let wkGen=-1;
let wkJob=null;
let wkCancelled=false;
let wkChain=Promise.resolve();
self.onmessage=(e)=>{
const m=e.data;
if(!m)return;
if(m.type==='cancel'){wkCancelled=true;return;}
if(m.type==='job'){
wkGen=m.gen;
wkJob=m.job;
wkCancelled=false;
DISPLAY_LANG=m.job.lang||'EN';
_L=(DISPLAY_LANG==='EN')?0:(DISPLAY_LANG==='JP')?2:1;
initItemI18n();
return;
}
if(m.type==='chunk'){
wkChain=wkChain.then(()=>runChunk(m)).catch((err)=>{
console.error('Worker chunk error:',err);
self.postMessage({type:'error',gen:m.gen,chunkId:m.chunkId,message:''+(err&&err.message||err)});
});
}
};
async function runChunk(c){
if(c.gen!==wkGen||!wkJob){
self.postMessage({type:'chunkDone',gen:c.gen,chunkId:c.chunkId,items:[],hits:0,aborted:true});
return;
}
const job=wkJob;
const items=[];
const io={
cancelled:()=>wkCancelled||c.gen!==wkGen,
progress:(p)=>self.postMessage({type:'tick',gen:c.gen,chunkId:c.chunkId,
frac:p.total>0?p.processed/p.total:1,rStr:p.rStr,seedHex:p.seedHex}),
batch:(b)=>{for(const x of b)items.push(x);},
yield:()=>new Promise(r=>setTimeout(r,0)),
};
let chunkJob;
if(job.kind==='scan'){
chunkJob=Object.assign({},job,{ranks:[c.rank],startSeed:c.startSeed,endSeed:c.endSeed});
}else{
chunkJob=Object.assign({},job,{startSeed:c.startSeed,endSeed:c.endSeed});
}
let hits=0;
if(job.kind==='scan')hits=await coreRunScanJob(chunkJob,io);
else if(job.kind==='atMonster')hits=await coreRunATMonsterJob(chunkJob,io);
else if(job.kind==='atPattern')hits=await coreRunATPatternJob(chunkJob,io);
const aborted=io.cancelled();
self.postMessage({type:'chunkDone',gen:c.gen,chunkId:c.chunkId,
items:aborted?[]:items,hits:aborted?0:hits,aborted});
}
