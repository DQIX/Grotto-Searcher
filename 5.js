importScripts('1.js','2.js');
let wkGen=-1;
let wkJob=null;
let wkCancelled=false;
let wkChain=Promise.resolve();
self.addEventListener('message',(e)=>{
const m=e.data;
if(!m)return;
if(m.type==='cancel'){wkCancelled=true;return;}
if(m.type==='job'){
wkGen=m.gen;
wkJob=m.job;
wkCancelled=false;
setDisplayLang(m.job.lang||'EN');
initItemI18n();
return;
}
if(m.type==='chunk'){
wkChain=wkChain.then(()=>runChunk(m)).catch((err)=>{
console.error('Worker chunk error:',err);
self.postMessage({type:'error',gen:m.gen,chunkId:m.chunkId,message:''+(err&&err.message||err)});
});
}
});
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
const extra={startSeed:c.startSeed,endSeed:c.endSeed};
if(job.kind==='scan'){
extra.allRanks=job.ranks;
extra.ranks=c.ranks||[c.rank];
if(c.ranks)extra.seedMajor=true;
}
const chunkJob=Object.assign({},job,extra);
const runner=getCoreSearchRunner(job.kind);
const hits=runner?await runner(chunkJob,io):0;
const aborted=io.cancelled();
self.postMessage({type:'chunkDone',gen:c.gen,chunkId:c.chunkId,
items:aborted?[]:items,hits:aborted?0:hits,aborted});
}
function setupSolverWorker(m){
setDisplayLang(m.lang||'EN');
self.window=self;
const els=new Map(Object.entries(m.dom||{}).map(([id,on])=>[id,{checked:!!on}]));
self.document={getElementById:id=>els.get(id)||null};
readCharStatsFromDom=()=>m.chars||[];
Object.assign(window,{_solverComboMap:{},_solverComboId:m.idBase||0,_solverBucketId:m.bucketBase||0,_solverBuckets:{},
_solverFallback:!!m.initialFallback,_solverSolvable:null,_solverNeedsKillAll:null});
_solverSearchIncomplete=false;_solverSearchLimited=false;_solverRenderDepth=0;_solverGoldState=null;_solverVerdictMode=!!m.verdict;_solverResume=null;
}
const _solverResumeStore=new Map();
self.addEventListener('message',(e)=>{
const m=e.data;
if(!m)return;
if(m.type==='solve'){
try{
setupSolverWorker(m);
const kept=m.resume?_solverResumeStore.get(m.resume):null;
let html;
if(kept){
_solverResumeStore.delete(m.resume);
_solverGoldState=kept.gold;_solverRenderDepth=kept.depth;[_solverSearchIncomplete,_solverSearchLimited]=kept.flags;_solverDmgCache=kept.cache;solverApplyBuildContext(kept.build);
Object.assign(window,{_solverFallback:kept.fallback,_solverSolvable:true,_solverNeedsKillAll:m.round2?null:kept.needsKillAll});
if(!m.round2)kept.stop.on=false;
else if(m.prebuiltKillAll){kept.options._prebuiltKillAll=m.prebuiltKillAll;_solverSearchIncomplete=_solverSearchIncomplete||!!m.prebuiltKillAll.incomplete;_solverSearchLimited=_solverSearchLimited||!!m.prebuiltKillAll.limited;}
else if(m.deferKillAll&&m.prebuiltKmc)kept.options._prebuiltKmc=m.prebuiltKmc;
else kept.options._deferKillAll=false;
try{html=kept.finish();}
catch(e){console.error('[Solver]',e);window._solverRenderError=e;window._solverSolvable=null;html='<div style="color:#f44;font-size:9px;">⚠ Solver error</div>';}
finally{_solverRenderDepth=0;_solverGoldState=null;}
}else html=renderSolverResult(m.render.bat,m.render.monGroups,m.render.monId,
m.render.mapDeft,m.render.canRound2,!!m.forceKillAll,
m.prebuiltKmc||null,m.prebuiltKillAll||null,!!m.deferKillAll,!!m.incomplete,!!m.limited);
const stopped=_solverResume,key=m.resumeKey||'r2#'+m.solveId;_solverResume=null;
if(stopped){_solverResumeStore.set(key,stopped);while(_solverResumeStore.size>32)_solverResumeStore.delete(_solverResumeStore.keys().next().value);}
self.postMessage({type:'solveDone',solveId:m.solveId,html,...(stopped?{resumeKey:key,...(window._solverNeedsKillAll==='r2'?{}:{verdictOnly:true})}:{}),
comboMap:window._solverComboMap,buckets:window._solverBuckets,
fallback:window._solverFallback||false,solvable:window._solverSolvable,
incomplete:_solverSearchIncomplete,limited:_solverSearchLimited,renderError:!!window._solverRenderError,
needsKillAll:window._solverNeedsKillAll||null});
}catch(err){
self.postMessage({type:'solveError',solveId:m.solveId,message:''+(err&&err.stack||err)});
}
return;
}
if(m.type==='solveKmcShard'||m.type==='solveKillAllShard'){
try{
setupSolverWorker(m);
resetSolverDamageCache(m.spec.useStats,m.chars||[],m.spec.fieldHexes[0]);
const payload=m.type==='solveKmcShard'
?buildKmcShardPayload(m.spec,m.roots)
:buildKillAllShardPayload(m.spec,m.roots);
self.postMessage({type:m.type+'Done',solveId:m.solveId,payload});
}catch(err){
self.postMessage({type:m.type+'Error',solveId:m.solveId,
message:''+(err&&err.stack||err)});
}
}
});
