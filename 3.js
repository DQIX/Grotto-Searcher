function refreshI18n(){
document.querySelectorAll('[data-i18n]').forEach(el=>{
const key=el.getAttribute('data-i18n');
let text=i18nDict[key];
if(text){
if(el.tagName==='OPTION'&&typeof b3fThreeItems!=='undefined'&&b3fThreeItems.includes(el.value)){text=String(text)+String(' (3)');}
el.textContent=text;
}
});
for(const[id,label]of Object.entries(_OG)){const el=document.getElementById(id);if(el)el.label=label;}
const sl=document.getElementById('lblSteps');if(sl)sl.textContent=_STEPS_LBL;
if(typeof updateFSItems==='function'){for(let i=1;i<=3;i++)updateFSItems(i);}
['atConsecutiveCount','at_pattern','si_pattern'].forEach(sid=>{
const sel=document.getElementById(sid);
if(sel&&typeof AT_O!=='undefined'){
const cv=sel.value;
sel.querySelectorAll('option').forEach((o,idx)=>{if(idx>0&&AT_O[idx-1])o.textContent=AT_O[idx-1][1];});
sel.value=cv;
}
});
['at_env','si_env'].forEach(sid=>{
const sel=document.getElementById(sid);
if(sel)sel.querySelectorAll('option').forEach((o,i)=>{if(ENV_OPTS[i])o.textContent=ENV_OPTS[i];});
});
for(let b=1;b<=4;b++){const sel=document.getElementById('si_job'+b);if(sel)sel.querySelectorAll('option').forEach(o=>{const v=parseInt(o.value);if(!isNaN(v)&&VOC_STATS[v])o.textContent=DISPLAY_LANG==='EN'?VOC_STATS[v].en:VOC_STATS[v].jp;});}
}
function switchUILang(lang){
if(!['TW','EN','JP'].includes(lang))return;
DISPLAY_LANG=lang;
_L=lang==='EN'?0:lang==='JP'?2:1;
refreshI18n();
document.querySelectorAll('.lang-sw').forEach(b=>{
if(b.dataset.lang===lang){b.style.background='#00A2E8';b.style.color='#fff';b.style.borderColor='#00A2E8';}
else{b.style.background='#224';b.style.color='#888';b.style.borderColor='#444';}
});
const mm=document.getElementById('marathonModal');
if(mm){mrtLang=lang==='EN'?'en':'jp';const bl=document.getElementById('mrt_btnLang');if(bl)bl.textContent=mrtLang.toUpperCase();if(mm.classList.contains('open')){mrtBuildTable();mrtRenderRows();}}
if(typeof mapData!=='undefined'&&mapData&&mapData.floorCount>0){
const cc=document.getElementById('controls_container');
const sc=document.getElementById('single_map_controls');
if(cc&&sc)cc.appendChild(sc);
renderResult();
}
}
function seedCapForConds(conds,applyBqCount){
return 0x7FFF;
}
function getValidatedSeedRange(){
let minStr=document.getElementById('cond_seed_min')?document.getElementById('cond_seed_min').value.trim():"";
let maxStr=document.getElementById('cond_seed_max')?document.getElementById('cond_seed_max').value.trim():"";
let customMin=minStr?parseInt(minStr,16):0;
let customMax=maxStr?parseInt(maxStr,16):0x7FFF;
if(isNaN(customMin)||customMin<0)customMin=0;
if(isNaN(customMax)||customMax>0x7FFF)customMax=0x7FFF;
if(customMin>customMax){const t=customMin;customMin=customMax;customMax=t;document.getElementById('cond_seed_min').value=hex4(customMin);document.getElementById('cond_seed_max').value=hex4(customMax);}
const searchFilterLoc=true;
const startSeed=customMin;
const endSeed=searchFilterLoc?Math.min(customMax,0x7FFF):customMax;
if(startSeed>endSeed){return{error:A08};}
return{startSeed,endSeed,searchFilterLoc};
}
function validateHex(id,minVal,maxVal,padLen,errMsg){
const el=document.getElementById(id);
if(!el||!el.value)return;
const v=el.value.trim().toUpperCase();
if(!v.length||/[^0-9A-F]/.test(v)){alert(errMsg);el.value='';return;}
const n=parseInt(v,16);
if(isNaN(n)||n<minVal||n>maxVal){alert(errMsg);el.value='';return;}
if(padLen)el.value=v.padStart(padLen,'0');
}
const COND_FIELDS={
prefix:'cond_prefix',suffix:'cond_suffix',locale:'cond_locale',
lv:'cond_lv',location:'cond_location',bq:'cond_bq',bqCount:'cond_bq_count',
env:'cond_env',monster:'cond_monster',depth:'cond_depth',boss:'cond_boss',
seedMin:'cond_seed_min',seedMax:'cond_seed_max',elist:'cond_elist',
onlyMon:'cond_only_mon',anomaly:'cond_anomaly'
};
const BOX_RANK_CHARS=['I','H','G','F','E','D','C','B','A','S'];
const USP_FAST_MODES={
'usp_map':{mode:'map',slowest:false,showFloors:false},
'usp_map_d':{mode:'map',slowest:false,showFloors:true},
'usp_floor':{mode:'floor',slowest:false,showFloors:false},
'usp_floor_d':{mode:'floor',slowest:false,showFloors:true},
'usp_slow':{mode:'map',slowest:true,showFloors:false},
'usp_slow_d':{mode:'map',slowest:true,showFloors:true},
'usp_maxtile':{mode:'maxtile',metric:'maxtile',slowest:false,showFloors:false},
'usp_mintile':{mode:'maxtile',metric:'mintile',slowest:false,showFloors:false},
'usp_maxwalk':{mode:'maxtile',metric:'maxwalk',slowest:false,showFloors:false},
'usp_maxiso':{mode:'maxtile',metric:'maxiso',slowest:false,showFloors:false},
'usp_maxghost':{mode:'maxtile',metric:'maxghost',slowest:false,showFloors:false},
};
function getUltimateConds(){
const getV=(id)=>{const el=document.getElementById(id);return el?el.value.trim():"";};
const reqBox={};
BOX_RANK_CHARS.forEach((ch,i)=>{
reqBox[i+1]=parseInt(getV('cond_box_'+ch))||0;
});
const conds={};
for(const[key,id]of Object.entries(COND_FIELDS))conds[key]=getV(id);
conds.reqBox=reqBox;
conds.hasBoxCond=Object.values(reqBox).some(v=>v>0);
return conds;
}
let isSearching=false;
let searchCancel=false;
function showConditionConflictResult(){
const resultDiv=document.getElementById('searchResults');
if(!resultDiv)return;
resultDiv.innerHTML='<div style="color:#aaa;font-size:13px;margin-bottom:8px">'
+B01+' <span id="searchProgress" style="color:#fff;font-weight:bold">100% ('
+B07+')</span></div><div id="searchGrid" class="search-grid"></div>';
}
function makeResultClickHandler(seed,rStr,jumpFloor){
return()=>{
const seedHex=hex4(seed);
document.getElementById('seed').value=seedHex;
if(rStr)document.getElementById('rank').value="0x"+rStr;
calculate();
const siSeed=document.getElementById('si_seed');
if(siSeed)siSeed.value=seedHex;
const mR=document.getElementById('mrt_inRank');
const mS=document.getElementById('mrt_inSeed');
if(mR&&rStr)mR.value=rStr;
if(mS)mS.value=seedHex;
document.getElementById('result').scrollIntoView({behavior:'smooth'});
if(jumpFloor!==undefined&&jumpFloor!==null&&jumpFloor!==-1){
setTimeout(()=>{
const tab=document.querySelectorAll('.floor-tab')[jumpFloor];
if(tab)tab.click();
},50);
}
};
}
function searchDoneMsg(hitCount){
return searchCancel?`${B05} (${B04}${hitCount} ${B03})`:`100% (${(''+B06)?B06+' ':''}${hitCount} ${B03})`;
}
function restoreSearchUI(restoreBtn){
isSearching=false;
restoreBtn();
}
function handleSearchError(errorLabel,msg,restoreBtn,progressSpan,hitCount){
console.error(errorLabel,msg);
alert(A02);
searchCancel=true;
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
}
let _dq9Pool=null;
let _dq9PoolFailed=false;
let _dq9PreflightDone=false;
let _dq9Gen=0;
let _dq9Active=null;
(function runWorkerPreflight(){
if(typeof Worker==='undefined'||typeof Blob==='undefined'||typeof URL.createObjectURL!=='function'){
_dq9PoolFailed=true;_dq9PreflightDone=true;return;
}
try{
const blob=new Blob(['self.postMessage("ok")'],{type:'text/javascript'});
const url=URL.createObjectURL(blob);
const w=new Worker(url);
const t=setTimeout(()=>{
w.terminate();URL.revokeObjectURL(url);
console.warn('[DQ9] Worker preflight timeout — disabling Workers');
_dq9PoolFailed=true;_dq9PreflightDone=true;
},2000);
w.onmessage=()=>{clearTimeout(t);w.terminate();URL.revokeObjectURL(url);
console.info('[DQ9] Worker preflight OK');
_dq9PreflightDone=true;};
w.onerror=()=>{clearTimeout(t);w.terminate();URL.revokeObjectURL(url);
console.warn('[DQ9] Worker preflight error — disabling Workers');
_dq9PoolFailed=true;_dq9PreflightDone=true;};
}catch(e){
console.debug('[DQ9] Worker preflight exception — disabling Workers',e);
_dq9PoolFailed=true;_dq9PreflightDone=true;
}
})();
const DQ9_CHUNK_SIZES={scan:1024,atMonster:2048,atPattern:2048};
const DQ9_CHUNK_MIN={scan:64,atMonster:128,atPattern:128};
const DQ9_CHUNKS_PER_WORKER=12;
function pickChunkSize(kind,totalUnits,workerCount){
const hi=DQ9_CHUNK_SIZES[kind]||1024;
const lo=Math.min(DQ9_CHUNK_MIN[kind]||64,hi);
const want=Math.ceil(totalUnits/Math.max(1,workerCount*DQ9_CHUNKS_PER_WORKER));
return Math.max(lo,Math.min(hi,want));
}
function getWorkerCount(){
try{
const q=new URLSearchParams(window.location.search).get('workers');
if(q){const n=parseInt(q);if(n>=1)return Math.min(n,256);}
}catch(e){}
if(typeof window.DQ9_WORKER_COUNT==='number'&&window.DQ9_WORKER_COUNT>=1)return Math.min(Math.floor(window.DQ9_WORKER_COUNT),256);
return Math.max(1,Math.min(navigator.hardwareConcurrency||4,256));
}
function getWorkerBlobURL(){return '5.js';}
function getSearchWorkerPool(){
if(_dq9Pool)return _dq9Pool;
if(!_dq9PreflightDone||_dq9PoolFailed||typeof Worker==='undefined')return null;
try{
const blobURL=getWorkerBlobURL();
const count=getWorkerCount();
const workers=[];
for(let i=0;i<count;i++){
const w=new Worker(blobURL);
w.onmessage=(e)=>handlePoolMessage(i,e.data);
w.onerror=(e)=>handlePoolFatalError(i,e);
workers.push(w);
}
_dq9Pool={workers,idle:workers.map((_,i)=>i)};
console.info('[DQ9] Search worker pool ready: '+count+' workers (override with ?workers=N)');
}catch(err){
console.warn('Web Worker 無法建立，搜尋將退回主執行緒執行。',err);
_dq9PoolFailed=true;
_dq9Pool=null;
}
return _dq9Pool;
}
function broadcastToPool(msg){
if(_dq9Pool)for(const w of _dq9Pool.workers)w.postMessage(msg);
}
function dispatchPoolJobs(){
const a=_dq9Active,p=_dq9Pool;
if(a&&p&&!a.finished){
while(a.queue.length>0&&p.idle.length>0){
const chunkId=a.queue.shift();
const wi=p.idle.pop();
a.inFlight.set(chunkId,0);
p.workers[wi].postMessage(Object.assign({type:'chunk',gen:a.gen},a.chunks[chunkId]));
}
}
if(typeof dispatchSolveQueue==='function')dispatchSolveQueue();
}
function flushReadyResults(a){
while(a.nextFlush<a.chunks.length&&a.slots[a.nextFlush]!==undefined){
const items=a.slots[a.nextFlush];
a.slots[a.nextFlush]=undefined;
a.nextFlush++;
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}
}
function flushRemainingResults(a){
for(let i=a.nextFlush;i<a.chunks.length;i++){
const items=a.slots[i];
if(items!==undefined){
a.slots[i]=undefined;
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}
}
a.nextFlush=a.chunks.length;
}
function updatePoolProgress(a){
if(a.finished||!a.callbacks.onProgress)return;
let processed=a.unitsDone;
for(const entry of a.inFlight)processed+=a.chunks[entry[0]].units*entry[1];
a.callbacks.onProgress({processed,total:a.totalUnits,hits:a.hits,rStr:a.lastRStr,seedHex:a.lastSeedHex});
}
function finishPoolRun(a,result,errMsg){
if(a.finished)return;
a.finished=true;
if(a._watchdog){clearTimeout(a._watchdog);a._watchdog=null;}
flushRemainingResults(a);
if(_dq9Active===a)_dq9Active=null;
if(errMsg==='_RETRY_MAIN_THREAD_'&&a._retryJob&&a._retryCallbacks){
console.info('[DQ9] Retrying search on main thread...');
runSearchJob(a._retryJob,a._retryCallbacks);
return;
}
if(errMsg!==undefined){if(a.callbacks.onError)a.callbacks.onError(errMsg);}
else{if(a.callbacks.onDone)a.callbacks.onDone(result);}
if(typeof dispatchSolveQueue==='function')setTimeout(dispatchSolveQueue,0);
}
function handlePoolMessage(workerIdx,m){
const p=_dq9Pool;
if(!m)return;
if(m.type==='solveDone'||m.type==='solveError'){
if(typeof handleSolveMessage==='function')handleSolveMessage(workerIdx,m);
return;
}
if((m.type==='chunkDone'||m.type==='error')&&p&&p.idle.indexOf(workerIdx)===-1)p.idle.push(workerIdx);
const a=_dq9Active;
if(!a||m.gen!==a.gen||a.finished){dispatchPoolJobs();return;}
if(a._watchdog){clearTimeout(a._watchdog);a._watchdog=null;}
if(m.type==='tick'){
if(a.inFlight.has(m.chunkId))a.inFlight.set(m.chunkId,m.frac||0);
if(m.rStr!==undefined&&m.rStr!==null)a.lastRStr=m.rStr;
if(m.seedHex!==undefined&&m.seedHex!==null)a.lastSeedHex=m.seedHex;
updatePoolProgress(a);
return;
}
if(m.type==='chunkDone'){
a.inFlight.delete(m.chunkId);
if(m.aborted){a.queue.unshift(m.chunkId);dispatchPoolJobs();return;}
a.hits+=m.hits||0;
a.unitsDone+=a.chunks[m.chunkId].units;
a.doneCount++;
if(a.unordered){
const items=m.items||[];
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}else{
a.slots[m.chunkId]=m.items||[];
flushReadyResults(a);
}
updatePoolProgress(a);
if(a.doneCount===a.chunks.length){finishPoolRun(a,{hits:a.hits,cancelled:false});}
else{dispatchPoolJobs();}
return;
}
if(m.type==='error'){
console.error('Worker chunk error:',m.message);
broadcastToPool({type:'cancel'});
finishPoolRun(a,null,m.message);
return;
}
}
function startPoolWatchdog(a){
a._watchdog=setTimeout(()=>{
if(a.doneCount===0&&!a.finished){
console.warn('[DQ9] Workers unresponsive — falling back to main thread');
if(typeof abortAllSolveTasks==='function')abortAllSolveTasks('Workers unresponsive');
for(const w of _dq9Pool.workers)w.terminate();
_dq9Pool=null;
_dq9PoolFailed=true;
finishPoolRun(a,null,'_RETRY_MAIN_THREAD_');
}
},3000);
}
function handlePoolFatalError(workerIdx,e){
console.error('Search worker fatal error:',e&&(e.message||e));
if(typeof _siSolveBusy!=='undefined'&&_siSolveBusy.has(workerIdx)){
const t=_siSolveBusy.get(workerIdx);
_siSolveBusy.delete(workerIdx);
t.reject(new Error((e&&e.message)||'Worker error'));
replaceSolveWorker(workerIdx);
}
const a=_dq9Active;
if(a&&!a.finished){
broadcastToPool({type:'cancel'});
finishPoolRun(a,null,(e&&e.message)||'Worker error');
}
}
function requestSearchCancel(){
searchCancel=true;
const a=_dq9Active;
if(a&&!a.finished){
broadcastToPool({type:'cancel'});
finishPoolRun(a,{hits:a.hits,cancelled:true});
}
}
function runSearchJob(job,callbacks){
const pool=getSearchWorkerPool();
if(pool){
if(typeof requeueBusySolveTasks==='function')requeueBusySolveTasks();
const gen=++_dq9Gen;
const seedSpan=job.endSeed-job.startSeed+1;
const rankCount=(job.kind==='scan'&&job.ranks)?job.ranks.length:1;
const chunkSize=pickChunkSize(job.kind,seedSpan*rankCount,pool.workers.length);
const chunks=[];
if(job.kind==='scan'){
for(const rank of job.ranks){
for(let s=job.startSeed;s<=job.endSeed;s+=chunkSize){
const e=Math.min(s+chunkSize-1,job.endSeed);
chunks.push({chunkId:chunks.length,rank,startSeed:s,endSeed:e,units:e-s+1});
}
}
}else{
for(let s=job.startSeed;s<=job.endSeed;s+=chunkSize){
const e=Math.min(s+chunkSize-1,job.endSeed);
chunks.push({chunkId:chunks.length,startSeed:s,endSeed:e,units:e-s+1});
}
}
if(chunks.length===0){
if(callbacks.onDone)callbacks.onDone({hits:0,cancelled:false});
return;
}
let totalUnits=0;
for(const c of chunks)totalUnits+=c.units;
_dq9Active={
gen,callbacks,chunks,totalUnits,
unitsDone:0,hits:0,doneCount:0,
unordered:!!callbacks.unordered,
queue:chunks.map(c=>c.chunkId),
slots:new Array(chunks.length),
nextFlush:0,inFlight:new Map(),
lastRStr:(job.kind==='scan'&&chunks[0].rank!==undefined)?hex2(chunks[0].rank):'',
lastSeedHex:hex4(job.startSeed),
finished:false,
_retryJob:job,_retryCallbacks:callbacks,
};
broadcastToPool({type:'job',gen,job});
dispatchPoolJobs();
startPoolWatchdog(_dq9Active);
return;
}
(async()=>{
const io={
cancelled:()=>searchCancel,
progress:(data)=>{if(callbacks.onProgress)callbacks.onProgress(data);},
batch:(items)=>{if(callbacks.onBatch)callbacks.onBatch(items);},
yield:()=>new Promise(r=>setTimeout(r,0)),
};
try{
let hits=0;
if(job.kind==='scan')hits=await coreRunScanJob(job,io);
else if(job.kind==='atMonster')hits=await coreRunATMonsterJob(job,io);
else if(job.kind==='atPattern')hits=await coreRunATPatternJob(job,io);
if(callbacks.onDone)callbacks.onDone({hits,cancelled:searchCancel});
}catch(err){
console.error(err);
if(callbacks.onError)callbacks.onError(''+(err&&err.message||err));
}
})();
}
function materializeResultItem(item){
const node=document.createElement('div');
node.className='search-result-item';
if(item.hasD)node.dataset.hasD="true";
if(item.specialStyle)node.style.border=item.specialStyle;
if(item.title)node.title=item.title;
node.innerHTML=item.html;
node.onclick=makeResultClickHandler(item.seed,item.rStr,item.jumpFloor);
return node;
}
function isBetterMetricResult(cand,cur){
if(cand.fc!==cur.fc)return cand.fc>cur.fc;
const cD=(cand.rStr==='DD'),uD=(cur.rStr==='DD');
if(cD!==uD)return cD;
return cand.sortCost<cur.sortCost;
}
function executeSharedSearch(config){
if(isSearching){requestSearchCancel();return;}
const conds=getUltimateConds();
if(config.condsTransform)config.condsTransform(conds);
const searchFilterLoc=config.searchFilterLoc!==undefined?config.searchFilterLoc
:true;
if(!getLocationBQFilters(conds).valid){
showConditionConflictResult();
return;
}
if(config.validateConds&&!config.validateConds(conds,searchFilterLoc)){return;}
const rangeData=getValidatedSeedRange();
if(rangeData.error){alert(rangeData.error);return;}
let{startSeed,endSeed}=rangeData;
endSeed=Math.min(endSeed,seedCapForConds(conds,true));
isSearching=true;searchCancel=false;
const btn=document.getElementById(config.btnId);
if(btn){
btn.textContent=config.stopText||'🛑 STOP';
btn.style.background='#f44';
btn.style.color='#fff';
}
const searchAllRanks=document.getElementById('searchAllRanks').checked;
const baseRankStr=document.getElementById('rank').value;
let ranksToSearch=searchAllRanks?MAP_RANK:[parseInt(baseRankStr)];
if(config.filterRanks){ranksToSearch=config.filterRanks(ranksToSearch,conds);}
const resultDiv=document.getElementById('searchResults');
resultDiv.innerHTML='<div style="color:#aaa;font-size:13px;margin-bottom:8px">'+B01+' <span id="searchProgress" style="color:#fff;font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>';
const grid=document.getElementById('searchGrid');
const progressSpan=document.getElementById('searchProgress');
if(ranksToSearch.length===0){
progressSpan.textContent="100% ("+(config.emptyRankMsg||B08)+")";
isSearching=false;
if(btn){btn.textContent=config.btnText;btn.style.background=config.btnBg;btn.style.color=config.btnColor||'#fff';}
return;
}
let hitCount=0;
let renderedCount=0;
const sortTopN=config.sortTopN;
const sortDesc=!!config.sortDesc;
const dedupBySeed=!!config.dedupBySeed;
const dedupMap=dedupBySeed?new Map():null;
const dedupBetter=config.dedupBetter||isBetterMetricResult;
const dedupKeyFn=config.dedupKeyFn||(it=>it.seed);
const sortBucket=(sortTopN!==undefined&&!dedupBySeed)?[]:null;
const sortCmp=(a,b)=>sortDesc?(b.sortCost-a.sortCost):(a.sortCost-b.sortCost);
const pruneCap=(sortTopN!==undefined&&sortTopN!==Infinity)?Math.max(sortTopN*4,200):Infinity;
const restoreBtn=()=>{if(btn){btn.textContent=config.btnText;btn.style.background=config.btnBg;btn.style.color=config.btnColor||'#000';}};
const jobParams=Object.assign({},config.params||{});
if(config.metricEdgeFromEndSeed)jobParams.metricEdgeSeed=endSeed;
const job={
kind:'scan',
processor:config.processor,
params:jobParams,
conds,searchFilterLoc,
ranks:ranksToSearch,
startSeed,endSeed,
lang:DISPLAY_LANG,
};
runSearchJob(job,{
unordered:(sortBucket!==null)||dedupBySeed,
onProgress:(p)=>{
hitCount=p.hits;
progressSpan.textContent=Math.floor((p.processed/p.total)*100)+'% ('+B02+' '+p.rStr+', Seed '+p.seedHex+') ['+B04+''+p.hits+' '+B03+']';
},
onBatch:(items)=>{
if(dedupMap){
for(const it of items){
const cur=dedupMap.get(dedupKeyFn(it));
if(!cur||dedupBetter(it,cur))dedupMap.set(dedupKeyFn(it),it);
}
return;
}
if(sortBucket){
for(const it of items)sortBucket.push(it);
if(sortBucket.length>pruneCap){sortBucket.sort(sortCmp);sortBucket.length=sortTopN;}
return;
}
if(config.renderCap!==undefined&&renderedCount>=config.renderCap)return;
const fragment=document.createDocumentFragment();
for(const it of items){
if(config.renderCap!==undefined&&renderedCount>=config.renderCap)break;
fragment.appendChild(materializeResultItem(it));
renderedCount++;
}
if(fragment.childNodes.length>0)grid.appendChild(fragment);
},
onDone:(d)=>{
hitCount=d.hits;
restoreSearchUI(restoreBtn);
if(dedupMap){
const arr=[...dedupMap.values()];
if(config.renderFinal){
config.renderFinal(arr,sortCmp,grid);
}else{
arr.sort(sortCmp);
const shown=(sortTopN!==undefined&&sortTopN!==Infinity)?arr.slice(0,sortTopN):arr;
const fragment=document.createDocumentFragment();
for(const it of shown)fragment.appendChild(materializeResultItem(it));
if(fragment.childNodes.length>0)grid.appendChild(fragment);
}
let doneTxt=searchDoneMsg(hitCount);
if(arr.length!==hitCount)doneTxt+=' · '+arr.length;
progressSpan.textContent=doneTxt;
}else if(sortBucket){
const arrS=config.preSort?config.preSort(sortBucket):sortBucket;
arrS.sort(sortCmp);
let shown=arrS.slice(0,sortTopN);
let tail=null;
if(config.groupTail){
tail=shown.filter(config.groupTail.match);
if(tail.length>0)shown=shown.filter(it=>!config.groupTail.match(it));
else tail=null;
}
const fragment=document.createDocumentFragment();
for(const it of shown)fragment.appendChild(materializeResultItem(it));
if(tail){
const hdr=document.createElement('div');
hdr.style.cssText='width:100%;color:#fc6;font-weight:bold;font-size:13px;margin:12px 0 4px;border-bottom:1px solid #555;padding-bottom:2px;';
hdr.textContent=config.groupTail.label;
fragment.appendChild(hdr);
for(const it of tail)fragment.appendChild(materializeResultItem(it));
}
if(fragment.childNodes.length>0)grid.appendChild(fragment);
const shownCount=shown.length+(tail?tail.length:0);
let doneTxt=searchDoneMsg(hitCount);
if(shownCount!==hitCount)doneTxt+=' · '+shownCount;
progressSpan.textContent=doneTxt;
}else{
progressSpan.textContent=searchDoneMsg(hitCount);
}
if(config.onDoneExtra)config.onDoneExtra(d);
},
onError:(msg)=>{
handleSearchError("搜尋過程發生錯誤：",msg,restoreBtn,progressSpan,hitCount);
}
});
}
function validateElistOnlyMonCombo(conds){
if(conds.onlyMon&&['ONLY','NONE','SIZE_15','MULTI_SPECIAL'].includes(conds.elist)){alert(A11);return false;}
return true;
}
function startUltimateSearch(){
const conds=getUltimateConds();
if(!validateElistOnlyMonCombo(conds))return;
if(USP_FAST_MODES[conds.anomaly]){startFastestSearch();return;}
const searchOnlyWithD=document.getElementById('searchOnlyWithD').checked;
executeSharedSearch({
btnId:'searchBtnSpecific',
btnText:'🎯 Search',
btnBg:'linear-gradient(135deg,#0ff,#08a)',
btnColor:'#000',
stopText:'🛑 STOP',
emptyRankMsg:B07,
validateConds:(conds,searchFilterLoc)=>{
const hasBasicCond=Object.keys(conds).some(k=>k!=='reqBox'&&k!=='hasBoxCond'&&conds[k]!=="");
if(!hasBasicCond&&!conds.hasBoxCond){alert(A01);return false;}
return true;
},
filterRanks:(ranksToSearch,conds)=>sharedRankFilter(ranksToSearch,conds,false),
processor:'ultimate',
params:{searchOnlyWithD},
});
}
function MultibugSearch(){
const conds=getUltimateConds();
if(!validateElistOnlyMonCombo(conds))return;
if(USP_FAST_MODES[conds.anomaly]){alert(A15);return;}
if(conds.anomaly){alert(A12);return;}
const cond_elist=conds.elist;
const cond_only_mon=conds.onlyMon;
const isCombinedSearch=(['2','3','4','PARTIAL_NONE'].includes(cond_elist))&&!!cond_only_mon;
let effectiveElistCond=cond_elist;
const searchOnlyWithDNode=document.getElementById('searchOnlyWithD');
const searchOnlyWithD=searchOnlyWithDNode?searchOnlyWithDNode.checked:false;
const requireFloorIncrease=document.getElementById('requireFloorIncrease').checked;
const requireBugFloorHitNode=document.getElementById('requireBugFloorHit');
const requireBugFloorHit=requireBugFloorHitNode?requireBugFloorHitNode.checked:false;
if(!cond_elist&&!cond_only_mon&&!searchOnlyWithD&&!conds.hasBoxCond){effectiveElistCond='ONLY';}
executeSharedSearch({
btnId:'searchBtnBug',
btnText:H05,
btnBg:'linear-gradient(135deg,#c0c,#606)',
btnColor:'#fff',
stopText:'STOP',
emptyRankMsg:B07,
filterRanks:(ranksToSearch,conds)=>{
return sharedRankFilter(ranksToSearch,conds,true);
},
processor:'multibug',
params:{searchOnlyWithD,requireFloorIncrease,requireBugFloorHit,effectiveElistCond,isCombinedSearch},
});
}
function clearUltimateSearch(){
const inputIds=Object.values(COND_FIELDS).concat(BOX_RANK_CHARS.map(ch=>'cond_box_'+ch));
inputIds.forEach(id=>{
let el=document.getElementById(id);
if(el){el.value='';}
});
let bqEl=document.getElementById('cond_bq');
if(bqEl){bqEl.disabled=false;bqEl.style.opacity='1';}
const checkboxIds=['searchAllRanks','searchOnlyWithD','requireFloorIncrease','requireBugFloorHit'];
checkboxIds.forEach(id=>{
let el=document.getElementById(id);
if(el){el.checked=false;}
});
}
function startFastestSearch(){
const conds=getUltimateConds();
if(!validateElistOnlyMonCombo(conds))return;
if(conds.elist==='MULTI_SPECIAL'){alert(A13);return;}
const fm=USP_FAST_MODES[conds.anomaly];
if(conds.anomaly&&!fm){alert(A13);return;}
const mode=fm?fm.mode:((conds.elist||conds.onlyMon)?'floor':'map');
const slowest=fm?fm.slowest:false;
const showFloors=fm?fm.showFloors:false;
if(mode==='floor'){
if(!(conds.elist||conds.onlyMon||conds.depth)){alert(A16);return;}
}else if(mode!=='maxtile'){
if(!(conds.depth||conds.lv||conds.elist||conds.onlyMon||conds.location||conds.boss)){alert(A14);return;}
}
const useDepth2=(mode==='floor'&&!(conds.elist||conds.onlyMon)&&!!conds.depth);
const allRanksOn=document.getElementById('searchAllRanks').checked;
const isMaxTile=(mode==='maxtile');
const metricType=fm?fm.metric:null;
const dedupBySeed=isMaxTile||(useDepth2&&parseInt(conds.depth)>=15&&allRanksOn);
const searchOnlyWithD=document.getElementById('searchOnlyWithD').checked;
executeSharedSearch({
btnId:'searchBtnSpecific',
btnText:'🎯 Search',
btnBg:'linear-gradient(135deg,#0ff,#08a)',
btnColor:'#000',
stopText:'🛑 STOP',
emptyRankMsg:B07,
sortTopN:isMaxTile?undefined:((mode==='floor'&&!useDepth2)?Infinity:50),
sortDesc:slowest||(isMaxTile&&metricType!=='mintile'),
dedupBySeed,
dedupBetter:isMaxTile?(metricType==='mintile'
?((cand,cur)=>cand.sortCost<cur.sortCost||(cand.sortCost===cur.sortCost&&cand.jumpFloor<cur.jumpFloor))
:((cand,cur)=>cand.sortCost>cur.sortCost||(cand.sortCost===cur.sortCost&&cand.jumpFloor<cur.jumpFloor))
):undefined,
dedupKeyFn:isMaxTile?(it=>(it._dimLabel||'')+':'+(it.seed+it.jumpFloor+1)):undefined,
renderFinal:isMaxTile?renderMetricSearchResults(metricType):undefined,
validateConds:()=>true,
metricEdgeFromEndSeed:isMaxTile,
condsTransform:(c)=>{
if(USP_FAST_MODES[c.anomaly])c.anomaly='';
if(useDepth2){c.depth2=c.depth;c.depth='';}
},
filterRanks:(ranksToSearch,conds)=>{
if(isMaxTile)return[0xDD];
const allRanks=document.getElementById('searchAllRanks').checked;
let ranks=(allRanks&&conds.depth2&&parseInt(conds.depth2)<=14)?[0xDD]:ranksToSearch;
return sharedRankFilter(ranks,conds,false);
},
processor:'fastest',
params:{searchOnlyWithD,fastestMode:mode,showFloors,slowest,metricType:fm?fm.metric:null},
});
}
function renderMetricSearchResults(metric){
const mkHdr=(txt)=>{const h=document.createElement('div');
h.style.cssText='width:100%;color:#fc6;font-weight:bold;font-size:13px;margin:12px 0 4px;border-bottom:1px solid #555;padding-bottom:2px;';
h.textContent=txt;return h;};
const cutTies=(g,n)=>{let c=Math.min(n,g.length);
if(c>0&&c<g.length){const thr=g[c-1].sortCost;while(c<g.length&&g[c].sortCost===thr)c++;}
return g.slice(0,c);};
if(metric==='maxghost')return(arr,sortCmp,grid)=>{
arr.sort(sortCmp);
const top=cutTies(arr,50);
const fr=document.createDocumentFragment();
fr.appendChild(mkHdr('Top '+top.length));
for(const it of top)fr.appendChild(materializeResultItem(it));
grid.appendChild(fr);
};
if(metric==='maxiso')return(arr,sortCmp,grid)=>{
const groups={};
for(const it of arr)(groups[it.sortCost]=groups[it.sortCost]||[]).push(it);
const fr=document.createDocumentFragment();
for(const k of Object.keys(groups).map(Number).sort((a,b)=>b-a)){
const g=groups[k];g.sort(sortCmp);
fr.appendChild(mkHdr(k+' '+T('tiles','格','マス')+' — '+g.length));
for(const it of g)fr.appendChild(materializeResultItem(it));
}
grid.appendChild(fr);
};
return(arr,sortCmp,grid)=>{
const groups={};
for(const it of arr){const d=it._dimLabel||'?';if(!groups[d])groups[d]=[];groups[d].push(it);}
const fr=document.createDocumentFragment();
for(const dim of _MAXTILE_DIMS){
const dl=dim+'x'+dim;const g=groups[dl];if(!g||g.length===0)continue;
g.sort(sortCmp);
const top=cutTies(g,10);
fr.appendChild(mkHdr(dl+' — Top '+top.length));
for(const it of top)fr.appendChild(materializeResultItem(it));
}
grid.appendChild(fr);
};
}
function executeItemSearch(config){
executeSharedSearch({
btnId:config.btnId,
btnText:config.btnText,
btnBg:config.btnBg,
btnColor:config.btnColor||'#fff',
stopText:'STOP',
emptyRankMsg:B08,
filterRanks:config.filterRanks,
processor:'item',
sortTopN:config.sortTopN,
preSort:config.preSort,
groupTail:config.groupTail,
params:Object.assign({checker:config.checker},config.checkerParams||{}),
});
}
function FreeSearch(){
let groups=[];
let reqFloorCount=0;
for(let i=1;i<=3;i++){
let f=parseInt(document.getElementById(`fs_f_${i}`).value);
let b=parseInt(document.getElementById(`fs_b_${i}`).value);
let r=parseInt(document.getElementById(`fs_r_${i}`).value);
let itm=document.getElementById(`fs_i_${i}`).value;
let t_str=document.getElementById(`fs_t_${i}`).value.trim();
if(b===-1&&r===0&&itm==="ANY")continue;
if(f===0){
alert(typeof T==='function'?T('Please specify a floor.','請指定目標樓層！','階層を指定してください！'):'請指定目標樓層');
return;
}
let t_val=t_str===""?-1:parseInt(t_str);
if(t_val!==-1&&t_val<5)t_val=5;
let targetItems=[];
if(itm==="Rich"){
targetItems=ITEMS_MILLIONAIRE;
}else if(itm==="Metasla"){
targetItems=["Metal slime sword","Metal slime spear","Metal slime shield","Metal slime armour","Metal slime helm","Metal slime gauntlets","Metal slime sollerets"];
}else if(itm==="S_wpn"){
targetItems=ITEMS_S_WEAPONS;
}else if(itm!=="ANY"){
targetItems=[itm];
}
let allowedRanks=new Set();
if(r>0)allowedRanks.add(r);
if(targetItems.length>0){
let itemRanks=getChestRanksForItems(targetItems);
if(r>0){
let intersection=itemRanks.filter(rank=>rank===r);
intersection.forEach(rank=>allowedRanks.add(rank));
}else{
itemRanks.forEach(rank=>allowedRanks.add(rank));
}
}
reqFloorCount=Math.max(reqFloorCount,f);
groups.push({
id:i,floor:f,boxIdx:b,rank:r,
items:targetItems.length>0?targetItems:null,
timeStr:t_str,timerVal:t_val,
allowedRanks:allowedRanks
});
}
if(groups.length===0){alert(typeof A01!=='undefined'?A01:'A01');return;}
executeItemSearch({
btnId:'btnFreeSearch',btnText:'Free',btnBg:'linear-gradient(135deg,#08c,#048)',
filterRanks:(ranks,conds)=>{
let validRanks=ranks;
for(let g of groups){
if(g.allowedRanks.size>0){
const offset=g.floor>=13?3:g.floor>=9?2:g.floor>=5?1:0;
validRanks=filterMapRanksBySMRAndChest(validRanks,conds,[Array.from(g.allowedRanks)],offset);
}
}
return validRanks;
},
checker:'free',
checkerParams:{
reqFloorCount,
groups:groups.map(g=>({floor:g.floor,boxIdx:g.boxIdx,rank:g.rank,items:g.items,timerVal:g.timerVal})),
}
});
}
function getQuickloadSearchTarget(){
const targetItem=document.getElementById('searchItem').value;
const b9fItems=["Sainted soma","Yggdrasil leaf","Reset stone","S weapon"];
const isB9F=b9fItems.includes(targetItem);
if(["Cannibox","Mimic","Pandora's box"].includes(targetItem)){alert(A03);return null;}
const millionaireItems=ITEMS_MILLIONAIRE;
const sWeapons=ITEMS_S_WEAPONS;
const checkItems=targetItem==='S weapon'?sWeapons:targetItem==='Millionaire'?millionaireItems:[targetItem];
return{targetItem,isB9F,checkItems};
}
function QuickloadSearch(){
const target=getQuickloadSearchTarget();
if(!target)return;
const{targetItem,isB9F,checkItems}=target;
const reqCount=isB9F?2:b3fThreeItems.includes(targetItem)?3:2;
const targetFloors=isB9F?[8]:b3fThreeItems.includes(targetItem)?[2]:[2,3];
const chestRanks=getChestRanksForItems(checkItems);
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'searchBtn',btnText:H01,btnBg:'linear-gradient(135deg,#4c4,#080)',
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checker:'quickload',
...astarPresetConfig(wantAstar,{b9Rows:isB9F,x3Count:reqCount+1}),
checkerParams:{targetFloors,checkItems,reqCount,isB9F,chestRanks,wantAstar,checkB10:wantAstar&&isB9F}
});
}
function qlMode(){const el=document.getElementById('ql_mode');return el?el.value:'';}
function qlModeSec(){const m=qlMode();return(m==='5'||m==='5A'||m==='5D')?0:(m==='9'||m==='9A'||m==='9D')?4:null;}
function qlModeAstar(){const m=qlMode();return m==='D'||m==='5D'||m==='9D';}
function preSortQuickloadB10Rows(arr){
const b10=arr.filter(it=>it.isB10).sort((a,b)=>a.sortCost-b.sortCost).slice(0,5);
return arr.filter(it=>!it.isB10).concat(b10);
}
function preSortJfireB10Rows(arr){
const b10wp=arr.filter(it=>it.isJfireB10).sort((a,b)=>a.sortCost-b.sortCost).slice(0,5);
return arr.filter(it=>!it.isJfireB10).concat(b10wp);
}
function astarPresetConfig(wantAstar,opts){
if(!wantAstar)return{};
const o=opts||{};
const cfg={sortTopN:Infinity};
if(o.b9Rows)cfg.preSort=preSortQuickloadB10Rows;
else if(o.jfire)cfg.preSort=preSortJfireB10Rows;
if(o.x3Count!==undefined)cfg.groupTail={match:it=>it.isX3,label:'x'+o.x3Count};
return cfg;
}
function startSearch(){
const m=qlMode();
if(m===''||m==='D'){QuickloadSearch();return;}
NineSearch(m==='9A'||m==='5A',qlModeSec());
}
function NineSearch(multiFloor,qlSec){
const target=getQuickloadSearchTarget();
if(!target)return;
const{targetItem,isB9F,checkItems}=target;
const btnBg=qlSec===0?'linear-gradient(135deg,#7fd4ff,#068)':'linear-gradient(135deg,#b19cd9,#6a5acd)';
let reqCount,targetFloors;
if(multiFloor){
let anchorFloors,anchorThreshold,otherThreshold,filterOffset;
if(targetItem==='Millionaire'||targetItem==='Ethereal stone'){
anchorFloors=[2,3];anchorThreshold=2;otherThreshold=1;filterOffset=0;
}else if(isB9F){
anchorFloors=[];anchorThreshold=2;otherThreshold=1;filterOffset=null;
}else if(targetItem==='Mini medal'){
anchorFloors=[2];anchorThreshold=3;otherThreshold=2;filterOffset=0;
}else{
anchorFloors=[];anchorThreshold=2;otherThreshold=2;filterOffset=null;
}
const needOneWith=(anchorFloors.length===0&&otherThreshold<2)?2:0;
const chestRanks=getChestRanksForItems(checkItems);
executeItemSearch({
btnId:'searchBtn',btnText:H01,btnBg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],filterOffset),
checker:'quickload9all',
checkerParams:{checkItems,chestRanks,anchorFloors,anchorThreshold,otherThreshold,needOneWith,qlSec}
});
return;
}else if(isB9F){
reqCount=2;targetFloors=[8];
}else{
reqCount=b3fThreeItems.includes(targetItem)?3:2;
targetFloors=b3fThreeItems.includes(targetItem)?[2]:[2,3];
}
const chestRanks=getChestRanksForItems(checkItems);
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'searchBtn',btnText:H01,btnBg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],multiFloor?null:(isB9F?2:0)),
checker:multiFloor?'quickload9all':'quickload9',
...astarPresetConfig(wantAstar,{b9Rows:isB9F,x3Count:reqCount+1}),
checkerParams:{targetFloors,checkItems,reqCount,isB9F,chestRanks,qlSec,wantAstar,checkB10:wantAstar&&isB9F}
});
}
function ThirdChestSearch(isS3){
let checkItems,btnConfig,targetFloors,colorStyle;
if(isS3){
checkItems=["Sage's elixir","Sainted soma"];
targetFloors=[12,13];
btnConfig={id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#fa0,#c60)'};
colorStyle='#F0F0aa';
}else{
const targetItem=document.getElementById('searchItem').value;
const millionaire2Items=ITEMS_MILLIONAIRE_BOX3;
checkItems=(targetItem==='Millionaire')?millionaire2Items:[targetItem];
targetFloors=[2,3];
btnConfig={id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#fa0,#c60)'};
colorStyle='#11F514';
}
const chestRanks=isS3?[10]:getChestRanksForItems(checkItems);
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:btnConfig.id,btnText:btnConfig.text,btnBg:btnConfig.bg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isS3?3:0),
checker:'third',
...astarPresetConfig(wantAstar),
checkerParams:{targetFloors,checkItems,isS3:!!isS3,colorStyle,chestRanks,wantAstar}
});
}
function Box3Search(){
const m=qlMode();
if(m==='9A'||m==='5A'){alert(A05);return;}
const targetValue=document.getElementById('searchItem').value;
const supportedForBox3=['Ethereal stone','Lucida shard','Sainted soma','Hephaestus\' flame','Millionaire'];
if(!supportedForBox3.includes(targetValue)){
alert(typeof A05!=='undefined'?A05:'A05');
return;
}
ThirdChestSearch(targetValue==='Sainted soma');
}
function JFireSearch(qlSec){
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'BtnTK',btnText:H02,btnBg:'linear-gradient(135deg,#f80,#c40)',
filterRanks:(ranks)=>ranks.filter(rank=>row4(TableC,8,rank,NO_ROW)[1]>=9),
checker:'jfire',
...astarPresetConfig(wantAstar,{jfire:true}),
checkerParams:{qlSec:qlSec==null?null:qlSec,wantAstar}
});
}
function TKSearch(){
const m=qlMode();
if(m==='9A'||m==='5A'){alert(A05);return;}
const qlSec=qlModeSec();
const targetItem=document.getElementById('searchItem').value;
if(targetItem==='Sainted soma'){JFireSearch(qlSec);return;}
let wpTargets=[];
let strictMatTargets=[];
let broadMatTargets=[];
let isMillionaire=false;
let isMonsterBox=false;
let minSec=0,maxSec=0;
if(targetItem==='Millionaire'){
isMillionaire=true;
wpTargets=ITEMS_MILLIONAIRE;
strictMatTargets=["Gold bar","Orichalcum"];
broadMatTargets=ITEMS_MILLIONAIRE_BOX3.concat(["Gold bar","Orichalcum"]);
}else if(["Cannibox","Mimic","Pandora's box"].includes(targetItem)){
isMonsterBox=true;
wpTargets=[targetItem];
strictMatTargets=[targetItem];
if(targetItem==="Pandora's box"){
minSec=25;
maxSec=35;
}else{
minSec=20;
maxSec=30;
}
}else if(targetItem==='Dangerous bustier'){
wpTargets=["Dangerous bustier"];
strictMatTargets=["Aggressence"];
}else if(targetItem==='Fuddle bow'){
wpTargets=["Fuddle bow"];
strictMatTargets=["Mirrorstone"];
}else if(targetItem==='Slime shield'){
wpTargets=["Slime shield"];
strictMatTargets=["Iron ore"];
}else if(targetItem==="Sorcerer's stone"){
wpTargets=["Sorcerer's stone"];
strictMatTargets=["670G"];
}else{alert(A05);return;}
let allMatTargets=isMillionaire?broadMatTargets:strictMatTargets;
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'BtnTK',btnText:H02,btnBg:'linear-gradient(135deg, #f80, #c40)',
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[getChestRanksForItems(wpTargets),getChestRanksForItems(allMatTargets)],0),
checker:'tk',
...astarPresetConfig(wantAstar),
checkerParams:{targetItem,wpTargets,strictMatTargets,broadMatTargets,isMillionaire,isMonsterBox,minSec,maxSec,qlSec,wantAstar}
});
}
function appendSpawnMonsterOptions(select,spawnList,formatName){
for(const entry of spawnList){
if(entry.length<3)continue;
const md=MONSTER_DB[entry[0]];
if(!md)continue;
const opt=document.createElement('option');
opt.value=entry[0];
opt.textContent=formatName(md);
select.appendChild(opt);
}
}
function atUpd(){
const envType=parseInt(document.getElementById('at_env').value);
const floorMR=parseInt(document.getElementById('at_mr').value);
const sel=document.getElementById('at_mon');
sel.innerHTML='';
const spawnList=getSpawnList(envType,floorMR);
if(!spawnList.length)return;
appendSpawnMonsterOptions(sel,spawnList,md=>`${md.jp} (${md.en})`);
if(typeof updateATOnlyMonsters==='function')updateATOnlyMonsters();
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',atinit);
}else{
setTimeout(atinit,0);
}
function atinit(){
atUpd();
const patSel=document.getElementById('at_pattern');
if(patSel&&typeof AT_O!=='undefined'){
AT_O.forEach(pair=>{
const opt=document.createElement('option');
opt.value=pair[0];
opt.textContent=pair[1];
patSel.appendChild(opt);
});
}
const lbl=document.getElementById('at_lblSteps');
if(lbl)lbl.textContent=T('Steps','步數','ｽﾃｯﾌﾟ');
if(typeof dwInit==='function')dwInit();
}
function getMonsterNameByAT(atVal,envType,floorMR){
const spawnList=getSpawnList(envType,floorMR);
for(const entry of spawnList){
if(entry.length>=3&&atVal>=entry[1]&&atVal<=entry[2]){
const md=MONSTER_DB[entry[0]];
return md?(DISPLAY_LANG!=='EN'?md.jp:md.en):"?";
}
}
return"?";
}
function getMonsterIdByAT(atVal,envType,floorMR){
const spawnList=getSpawnList(envType,floorMR);
for(const entry of spawnList)if(entry.length>=3&&atVal>=entry[1]&&atVal<=entry[2])return entry[0];
return null;
}
function updateATOnlyMonsters(){
const envType=parseInt(document.getElementById('at_env').value);
const floorMR=parseInt(document.getElementById('at_mr').value);
document.querySelectorAll('.at-dynamic-mon').forEach(el=>{
const atVal=parseInt(el.getAttribute('data-at'));
if(!isNaN(atVal))el.textContent=getMonsterNameByAT(atVal,envType,floorMR);
});
}
function updateBattleAT(){
const deftInput=document.getElementById('at_deft');
const userDeft=(deftInput&&deftInput.value!=='')?parseInt(deftInput.value):999;
const nInput=document.getElementById('at_n_input');
const n=(nInput&&nInput.value!=='')?parseInt(nInput.value):0;
const cN=35+(29*n);
const envType=parseInt(document.getElementById('at_env').value);
const floorMR=parseInt(document.getElementById('at_mr').value);
document.querySelectorAll('.at-m-card').forEach(card=>{
const seed=parseInt(card.getAttribute('data-seed'));
let s=seed>>>0;
for(let i=0;i<cN;i++)s=lcg(s);
const atN=(s>>>16)&0x7FFF;
s=lcg(s);
const atN1=(s>>>16)&0x7FFF;
const{deft,color:deftColor,label:deftLabel}=formatDeftness(atN1);
const atnLabel=card.querySelector('.at-m-atn-label');
if(atnLabel){
atnLabel.textContent=atnLabel.textContent.includes('AT[')?`AT[${cN}]: `:`AT +${cN}: `;
}
const atnVal=card.querySelector('.at-m-atval');
if(atnVal)atnVal.textContent=atN;
const monStrong=card.querySelector('.at-dynamic-mon');
if(monStrong){
monStrong.setAttribute('data-at',atN);
monStrong.textContent=getMonsterNameByAT(atN,envType,floorMR);
}
const deftSpan=card.querySelector('.at-m-deft');
if(deftSpan){
deftSpan.style.color=deftColor;
deftSpan.textContent=`${G18} ${deftLabel}`;
}
card.querySelectorAll('.at-dynamic-battle').forEach(el=>{
const target=parseInt(el.getAttribute('data-target'));
const pop=cN;
const base=userDeft<deft?4:3;
const d1=target-(pop+base),d2=target-(pop+base+1),d4=target-(pop+base+2);
el.textContent=`${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}`;
});
});
}
const debouncedUpdateBattleAT=debounce(updateBattleAT,100);
const debouncedUpdateSeedInspector=debounce(updateSeedInspector,100);
document.addEventListener('input',e=>{if(e.target.classList.contains('sv-stat'))debouncedUpdateSeedInspector();});
function atSearch(){
if(isSearching){requestSearchCancel();return;}
isSearching=true;searchCancel=false;
const btn=document.getElementById('atSearchBtn');
btn.textContent='STOP';btn.style.background='#f44';btn.style.color='#fff';
const restoreBtn=()=>{btn.textContent='M';btn.style.background='linear-gradient(135deg,#0ca,#065)';btn.style.color='#fff';};
const monEnvType=parseInt(document.getElementById('at_env').value);
const monFloorMR=parseInt(document.getElementById('at_mr').value);
const monId=document.getElementById('at_mon').value;
const nVal=parseInt(document.getElementById('at_n_input').value);
if(isNaN(nVal)||nVal<0){isSearching=false;restoreBtn();return;}
const N=35+29*nVal;
const spawnList=SPAWN_DB[monEnvType]&&SPAWN_DB[monEnvType][monFloorMR];
const atEntry=spawnList.find(e=>e[0]===monId&&e.length>=3);
const atmin=atEntry?atEntry[1]:-1,atmax=atEntry?atEntry[2]:-1;
if(atmin<0){isSearching=false;restoreBtn();return;}
const md=MONSTER_DB[monId];
const conds=getUltimateConds();
if(!getLocationBQFilters(conds).valid){
showConditionConflictResult();
isSearching=false;
restoreBtn();
return;
}
if(!validateElistOnlyMonCombo(conds)){isSearching=false;restoreBtn();return;}
const searchFilterLoc=true;
const searchOnlyWithD=document.getElementById('searchOnlyWithD').checked;
const baseRankStr=document.getElementById('rank').value;
const maxSeed=0x7FFF;
const rangeData=getValidatedSeedRange();
if(rangeData.error){alert(rangeData.error);isSearching=false;restoreBtn();return;}
const{startSeed,endSeed}=rangeData;
const rank=parseInt(baseRankStr);
const rStr=hex2(rank);
const targetRankKey=resolveRankKey(rStr);
const deftInput=document.getElementById('at_deft').value.trim();
const deftMax=deftInput!==''?parseInt(deftInput):-1;
const atThreshold=parseInt(document.getElementById('at_threshold').value);
let pType=AT_PAT[document.getElementById('at_pattern').value]||0;
let atMaxSteps=parseInt(document.getElementById('at_maxSteps').value);
if(isNaN(atMaxSteps)||atMaxSteps<1)atMaxSteps=400;
if(atMaxSteps<N)atMaxSteps=N;
const patSel=document.getElementById('at_pattern');
const probSel=document.getElementById('at_threshold');
const patternName=patSel?patSel.options[patSel.selectedIndex].text:'';
const probText=probSel?probSel.options[probSel.selectedIndex].text:'';
let headerExtra='';
if(deftMax>=0)headerExtra+=` ｜ ${G18} ${deftMax}`;
if(pType>0){
headerExtra+=` ｜ ${patternName} (${probText})`;
}
const resultDiv=document.getElementById('searchResults');
resultDiv.innerHTML=`<div style="color:#aaa;font-size:13px;margin-bottom:8px;">
  <div style="color:#0ca;font-size:12px;margin-bottom:6px;">${ENV_NAMES[monEnvType][1]} Rank ${monFloorMR} ｜ ${md.jp} (${md.en}) ｜ POP=${N} (Zoom=${nVal}) ｜ AT: ${atmin}～${atmax} ${headerExtra}</div>
  ${B01} <span id="searchProgress" style="color:#fff;font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>`;
const grid=document.getElementById('searchGrid');
const progressSpan=document.getElementById('searchProgress');
let hitCount=0;
let allResults=[];
const job={
kind:'atMonster',
lang:DISPLAY_LANG,
conds,searchFilterLoc,searchOnlyWithD,
rank,rStr,targetRankKey,
startSeed,endSeed:Math.min(endSeed,maxSeed),
N,atmin,atmax,deftMax,
pType,atThreshold,atMaxSteps,
patternName,probText,
};
runSearchJob(job,{
onProgress:(p)=>{
hitCount=p.hits;
progressSpan.textContent=Math.floor((p.processed/p.total)*100)+'% ['+B04+''+p.hits+' '+B03+']';
},
onBatch:(items)=>{
for(const it of items)allResults.push({node:materializeResultItem(it),pop:it.pop});
},
onDone:(d)=>{
hitCount=d.hits;
finalizeAtSearchResults(allResults,grid,document.getElementById('at_sortPOP').checked);
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
handleSearchError("AT Monster Search error:",msg,restoreBtn,progressSpan,hitCount);
}
});
}
function finalizeAtSearchResults(results,grid,sortByPOP){
if(sortByPOP)results.sort((a,b)=>a.pop-b.pop);
const fragment=document.createDocumentFragment();
for(const res of results)fragment.appendChild(res.node);
if(fragment.children.length>0)grid.appendChild(fragment);
if(typeof updateBattleAT==='function')updateBattleAT();
}
function atPtnSearch(){
if(isSearching){requestSearchCancel();return;}
isSearching=true;searchCancel=false;
const btn=document.getElementById('atPtnSchBtn');
btn.textContent='STOP';btn.style.background='#f44';
const restoreBtn=()=>{btn.textContent='AT';btn.style.background='linear-gradient(135deg,#f80,#a30)';};
const threshold=parseInt(document.getElementById('at_threshold').value);
let pType=AT_PAT[document.getElementById('at_pattern').value]||0;
if(pType===0){alert(A01);isSearching=false;restoreBtn();return;}
let maxSteps=parseInt(document.getElementById('at_maxSteps').value);
if(isNaN(maxSteps)||maxSteps<1)maxSteps=400;
const nVal=parseInt(document.getElementById('at_n_input').value);
const POPIndex=(isNaN(nVal)||nVal<0)?35:35+29*nVal;
if(maxSteps<POPIndex)maxSteps=POPIndex+1;
const searchFilterLoc=true;
const baseRankStr=document.getElementById('rank').value;
const rStr=hex2(parseInt(baseRankStr));
const targetRankKey=resolveRankKey(rStr);
const rangeData=getValidatedSeedRange();
if(rangeData.error){alert(rangeData.error);isSearching=false;restoreBtn();return;}
const{startSeed}=rangeData;
const endSeed=searchFilterLoc?Math.min(rangeData.endSeed,0x7FFF):rangeData.endSeed;
if(startSeed>endSeed){alert(A08);isSearching=false;restoreBtn();return;}
const patSel=document.getElementById('at_pattern');
const patternName=patSel.options[patSel.selectedIndex].text;
const probSel=document.getElementById('at_threshold');
const probText=probSel.options[probSel.selectedIndex].text;
const resultDiv=document.getElementById('searchResults');
resultDiv.innerHTML=`<div style="color:#aaa;font-size:13px;margin-bottom:8px;">
    <div style="color:#f80;font-size:12px;margin-bottom:6px;">${patternName} ｜ ${probText} ｜ N=${POPIndex} (n=${nVal||0}) ｜ Rank ${rStr}</div>
    ${B01} <span id="searchProgress" style="color:#fff;font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>`;
const grid=document.getElementById('searchGrid');
const progressSpan=document.getElementById('searchProgress');
let hitCount=0;
let allATResults=[];
const job={
kind:'atPattern',
lang:DISPLAY_LANG,
threshold,pType,maxSteps,POPIndex,
searchFilterLoc,targetRankKey,
startSeed,endSeed,
patternName,probText,
};
runSearchJob(job,{
onProgress:(p)=>{
hitCount=p.hits;
progressSpan.textContent=Math.floor((p.processed/p.total)*100)+'% (Seed '+p.seedHex+') ['+B04+''+p.hits+' '+B03+']';
},
onBatch:(items)=>{
for(const it of items)allATResults.push({node:materializeResultItem(it),pop:it.pop});
},
onDone:(d)=>{
hitCount=d.hits;
finalizeAtSearchResults(allATResults,grid,document.getElementById('at_sortPOP').checked);
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
handleSearchError("AT Pattern Search error:",msg,restoreBtn,progressSpan,hitCount);
}
});
}
function buildSolverLegendHtml(){
const L=DISPLAY_LANG;
const legends=[
['⚔',L==='EN'?'Falcon Blade':L==='JP'?'はやぶさの剣':'隼劍'],
['🪡',L==='EN'?'Poison Needle':L==='JP'?'どくばり':'毒針'],
['🎯',L==='EN'?'×1.1':L==='JP'?'×1.1':'×1.1'],
['🗡',L==='EN'?'Metal Slime Sword/Spear':L==='JP'?'メタスラの剣／やり':'金屬史萊姆劍／槍'],
['🌀',L==='EN'?'Attribeauty':'風林火山'],
['💨',L==='EN'?'Miss (AT consumed)':L==='JP'?'ミス (AT消費あり)':'Miss (AT 照常消耗)'],
['👉',L==='EN'?'Aim at the support, not the metal':L==='JP'?'メタルではなく仲間を指名':'瞄跟班、不瞄金屬'],
['🔱',L==='EN'?'Poker':L==='JP'?'きしんのまそう':'鬼神槍'],
];
return'<div style="font-size:9px;color:#666;margin:4px 0 2px 0;line-height:1.6;">'
+legends.map(([e,n])=>e+'<span style="color:#888;">'+n+'</span>').join('  ')
+'</div>';
}
function applyJobStats(charNum){
const sel=document.getElementById('si_job'+charNum);
if(!sel||sel.value==='')return;
const job=VOC_STATS[parseInt(sel.value)];
if(!job)return;
const ids=['atk','might','str','agi','mend','deft'];
for(let i=0;i<6;i++){
const el=document.getElementById('si_'+ids[i]+charNum);
if(el)el.value=job.s[i];
}
updateSeedInspector();
}
window._solverComboMap={};
window._solverComboId=0;
window._solverBucketId=0;
function showMoreCombos(bucketId){
const st=window._solverBuckets&&window._solverBuckets[bucketId];
if(!st)return;
const SHOW_STEP=10;
const rows=document.getElementsByClassName(bucketId+'_row');
const next=Math.min(st.shown+SHOW_STEP,st.total);
for(let i=st.shown;i<next;i++){if(rows[i])rows[i].style.display='';}
st.shown=next;
const moreEl=document.getElementById(bucketId+'_more');
if(moreEl){
if(st.shown>=st.total)moreEl.style.display='none';
else moreEl.textContent='+'+(st.total-st.shown)+L16;
}
}
function expandCombo(id){
const el=document.getElementById('combo_detail_'+id);
if(!el)return;
if(el.innerHTML){el.style.display=el.style.display==='none'?'block':'none';return;}
const data=window._solverComboMap[id];
if(!data)return;
el.innerHTML=renderSolverSimTrace(data);
el.style.display='block';
}
function renderSolverSimTrace(data){
const{combo,killTargets,eggAssign,assign,defend}=data;
if(!killTargets||killTargets.length===0)return'<div style="color:#666;font-size:9px;margin-left:24px;">—</div>';
const _sn=(v)=>DISPLAY_LANG==='EN'?(v.en||v.jp):v.jp;
const instances=buildSimInstances(killTargets);
const _gc={};
for(const inst of instances){
inst.mon=getMonDB(inst.hex);
const t=killTargets[inst.groupIdx];
const baseName=getMonsterDisplayName(inst.hex);
const ci=_gc[inst.groupIdx]=(_gc[inst.groupIdx]||0)+1;
inst.name=(t.count||1)>1?baseName+ci:baseName;
}
if(!document.getElementById('si_useStats')?.checked)return'<div style="color:#888;font-size:9px;margin-left:24px;">'+L19+'</div>';
const chars=readCharStatsFromDom();
const inlineFource=findInlineFource(combo);
const _charLabel=(c)=>{
if(!c)return'?';
if(c.job!==null&&c.job!==undefined&&typeof VOC_STATS!=='undefined'&&VOC_STATS[c.job]){
return DISPLAY_LANG==='EN'?VOC_STATS[c.job].en:VOC_STATS[c.job].jp;
}
return L20+(c.slot||'?');
};
const fEls=inlineFource?(getFourceEls(inlineFource.jp)||[]):null;
let fourceOn=false;
let _traceMainKilled=false;
let html='<div style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:4px;margin-top:1px;">';
const _hpRange=(i)=>'HP'+Math.max(0,i.hpLow)+'~'+i.hp;
html+='<div style="color:#888;">'+L21+instances.map(i=>'<b>'+i.name+'</b> '+_hpRange(i)).join(' / ')+'</div>';
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci];
const char=chars[assign?assign[ci]:(chars.length?ci%chars.length:ci)]||chars[0]||{stats:{}};
const whoTag='<span style="color:#6cf;font-size:8px;">'+_charLabel(char)+'</span> ';
const sk=lookupSkill(action.jp);
const alive=instances.filter(i=>i.alive);
if(action.id===SK_MERCY){
const removed=alive.filter(i=>i.death>0&&(i.groupIdx>0||_traceMainKilled));
for(const i of removed)i.alive=false;
const mainStuck=alive.some(i=>i.death>0&&i.groupIdx===0&&!_traceMainKilled);
const left=instances.filter(i=>i.alive);
html+='<div>'+L22+(ci+1)+L23+whoTag+'<span style="color:#0ff;">'+_sn(action)+'</span> → ';
html+=removed.length>0?removed.map(i=>i.name).join(',')+L24:L25;
if(mainStuck)html+=' <span style="color:#f80;">'+L26+'</span>';
html+=L27+(left.length>0?left.map(i=>'<b>'+i.name+'</b> '+_hpRange(i)).join(' / '):L28)+'</div>';
continue;
}
if(action.id===SK_EGG){
const tgtCI=eggAssign?Object.keys(eggAssign).find(k=>+k>ci):null;
const tgtAction=tgtCI?combo[+tgtCI]:null;
const tgtName=tgtAction?_sn(tgtAction):'?';
html+='<div>'+L22+(ci+1)+L23+whoTag+'<span style="color:#ff0;">'+_sn(action)+'</span> → '+L29+tgtName+'</div>';
continue;
}
if(inlineFource&&action.jp===inlineFource.jp&&!fourceOn){
fourceOn=true;
html+='<div>'+L22+(ci+1)+L23+whoTag+'<span style="color:#f80;">'+_sn(action)+'</span> '+L30+'</div>';
continue;
}
if(!sk||alive.length===0){
html+='<div>'+L22+(ci+1)+L23+whoTag+_sn(action)+'</div>';
continue;
}
const mul=(eggAssign&&eggAssign[ci])?eggAssign[ci]:1;
const tLv=mul>1?actorLv(chars,assign,ci):99;
const tFlat=tensionFlat(mul,tLv);
const curFEls=fourceOn?fEls:null;
const hits=SolverActionGate.hits(action);
const tgt=(sk.target==='A'||sk.target==='RA')?'A':(sk.target==='G'||sk.target==='RG')?'G':'S';
let details='';
const picked=SolverActionGate.targets(alive,action,sk,'groupIdx');
const hitTargets=picked.targets;
const mulStr=mul>1?'<span style="color:#ff0;">×'+mul
+((hitTargets.length&&hitTargets.every(t=>isMetalHex(t.hex)))?'':'＋'+tFlat)+'</span>':'';
const repInst=hitTargets.reduce((a,b)=>(b&&(!a||b.hp>a.hp))?b:a,null);
const repHpHigh=repInst?repInst.hp:0;
const repHpLow=repInst?repInst.hpLow:0;
for(const inst of hitTargets){
const isMetalTgt=isMetalHex(inst.hex);
const exec=canExecuteMetal(action.id,inst.hex);
if(exec){
if(exec.isValid){
details+=inst.name+': HP'+inst.hp+'→<span style="color:#f44;">'+L31+'</span> ';
metalExecuteInst(inst);
}
continue;
}
let dMin,dMax,dPerHitMax;
if(isMetalTgt){
const mc=metalChipPerHit(sk,action.equip);
dMin=applyTension(mc.min*hits,mul,tLv,true);dMax=applyTension(mc.max*hits,mul,tLv,true);dPerHitMax=Math.floor(mc.max*mul);
}else{
const r=calcSkillDamage(sk,char.stats,inst.hex,curFEls,getWeaponTypeMultiplier(action.equip,inst.hex),actionMetalEff(sk,action.equip));
dMin=r?applyTension(r.min*hits,mul,tLv):0;
dMax=r?applyTension(r.max*hits,mul,tLv):0;
dPerHitMax=r?Math.floor(r.max*mul):0;
}
const step=SolverActionGate.step(inst,hits,dPerHitMax,dMin,dMax,isMetalTgt?0:tFlat);
const dead=step.dead?L32:step.hpLow<=0?L33:'';
details+=inst.name+': '+_hpRange(inst)+'→<span style="color:'+(step.dead?'#f44':step.hpLow<=0?'#f80':'#8f8')+';">'+step.hpLow+'~'+step.hp+'</span>'+dead+' ';
SolverActionGate.commit(inst,step);
if(step.dead&&inst.groupIdx===0)_traceMainKilled=true;
}
const left=instances.filter(i=>i.alive);
html+='<div>'+L22+(ci+1)+L23+whoTag+'<span style="color:#ccc;">'+_sn(action)+'</span>'+mulStr+' ['+tgt+'] '+details;
html+=L27+(left.length>0?left.map(i=>'<b>'+i.name+'</b> '+_hpRange(i)).join(' / '):L28)+'</div>';
if(repInst){
const repIsMetal=isMetalHex(repInst.hex);
if(!repIsMetal)html+='<div style="margin-left:10px;font-size:8px;">↳ '+buildSolverHintText(sk,repInst.hex,hits,repHpHigh,repHpLow,curFEls,mul,getWeaponTypeMultiplier(action.equip,repInst.hex),actionMetalEff(sk,action.equip),tLv)+'</div>';
}
}
if(defend&&defend.length){
html+='<div style="color:#789;margin-top:1px;">'+L34+defend.map(i=>_charLabel(chars[i])).join(', ')+'</div>';
}
html+='</div>';
return html;
}
function siBuildSeqHtml(seqArray){
const _GC=[
[['#f44','#ccc'],['#c018a0','#ccc']],
[['#4c4','#ccc'],['#fa0','#ccc']],
[['#00A2E8','#ccc'],['#88f','#ccc']]
];
const _BK=['','rgba(255,136,255,0.25)','rgba(34,177,76,0.25)','rgba(0,162,232,0.25)','rgba(255,170,0,0.25)'];
let items=seqArray.map(item=>{
let gi=item.gIdx!==undefined?item.gIdx:0;
let ri=item.isR!==undefined?(item.isR?0:1):0;
let cp=_GC[gi]?(_GC[gi][ri]||_GC[0][0]):_GC[0][0];
let color=item.red?cp[0]:cp[1];
let fw=item.red?'bold':'normal';
let bg=_BK[item.bk]||'';
let bgStyle=bg?`background:${bg};padding:0 2px;border-radius:2px;`:'';
return`<span style="color:${color};font-weight:${fw};${bgStyle}" title="${item.type}">${item.val}</span>`;
});
return`<div style="margin-top:6px;font-size:11px;color:#aaa;line-height:1.6;">`+C24+`: [ ${items.join(', ')} ]</div>`;
}
function initSeedInspectorUI(){
const mrSel=document.getElementById('si_mr');
if(mrSel){
mrSel.options.length=0;
for(let i=1;i<=12;i++)mrSel.options.add(new Option(i,i));
mrSel.value=2;
}
for(let b=1;b<=4;b++){
const tSel=document.getElementById(`si_t${b}`);
if(tSel){
tSel.options.length=0;
tSel.options.add(new Option('--',0));
for(let i=1;i<=99;i++)tSel.options.add(new Option(i,i));
tSel.value=(b===1)?99:99;
}
}
const patSel=document.getElementById('si_pattern');
if(patSel){
patSel.options.length=0;
patSel.options.add(new Option('----','none'));
if(typeof AT_O!=='undefined'&&Array.isArray(AT_O)){
AT_O.forEach(pair=>{
patSel.options.add(new Option(pair[1],pair[0]));
});
}
}
}
function updateSeedInspector(){
const seedHex=document.getElementById('si_seed').value.trim()||'0000';
const seed=parseInt(seedHex,16);
const envType=parseInt(document.getElementById('si_env').value);
const floorMR=parseInt(document.getElementById('si_mr').value);
const userDeft=parseInt(document.getElementById('si_deft').value)||0;
const n=parseInt(document.getElementById('si_n').value)||0;
let groupSize=parseInt(document.getElementById('si_group_size').value)||1;
const supSel1=document.getElementById('si_sup1');
const supSel2=document.getElementById('si_sup2');
const supPool=dwSupPool(envType,floorMR);
[supSel1,supSel2].forEach(sel=>{
const cur=sel.value;
if(sel.options.length!==supPool.length||(supPool.length>0&&sel.options[0].value!==supPool[0])){
sel.innerHTML='';
for(const hx of supPool){sel.options.add(new Option(getMonsterDisplayName(hx),hx));}
sel.value=cur;
}
});
const tLvs=[
parseInt(document.getElementById('si_t1').value)||0,
parseInt(document.getElementById('si_t2').value)||0,
parseInt(document.getElementById('si_t3').value)||0,
parseInt(document.getElementById('si_t4').value)||0
];
const scanMax=parseInt(document.getElementById('si_scan_max').value)||0;
const targetTotalStep=parseInt(document.getElementById('si_target_step').value)||35;
const pSelect=document.getElementById('si_pattern');
const pTypeStr=pSelect.value;
const pType=(typeof AT_PAT!=='undefined')?(AT_PAT[pTypeStr]||0):0;
const pText=pSelect.options[pSelect.selectedIndex].text;
if(isNaN(seed))return;
const N=35+(29*n);
const{atN:atN_val,atN1:atN1_val}=getATPair(seed,N);
const monName=(typeof getMonsterNameByAT==='function')?getMonsterNameByAT(atN_val,envType,floorMR):'?';
const monId=(typeof getMonsterIdByAT==='function')?getMonsterIdByAT(atN_val,envType,floorMR):null;
const _md=monId?MONSTER_DB[monId]:null;
const _gbInfo=(typeof GROTTO_BATTLE!=='undefined'&&GROTTO_BATTLE[envType])?GROTTO_BATTLE[envType][floorMR]:null;
const _gbEntry=(_gbInfo&&monId)?_gbInfo.m.find(e=>e[0]===monId):null;
const _isAlone=_gbEntry&&_gbEntry[3]===1;
if(_isAlone)groupSize=1;
const grpSel=document.getElementById('si_group_size');
grpSel.disabled=_isAlone;
if(_isAlone)grpSel.value='1';
if(_isAlone){
[supSel1,supSel2].forEach(s=>{s.innerHTML='<option disabled selected>Alone</option>';s.disabled=true;});
}else{
if((supSel1.disabled=groupSize<=1))supSel1.value='';
else if(!supSel1.value&&supPool.length)supSel1.value=supPool[0];
if((supSel2.disabled=groupSize<=2))supSel2.value='';
else if(!supSel2.value&&supPool.length)supSel2.value=supPool[0];
}
const _supId1=supSel1.value||null;
const _supId2=supSel2.value||null;
const _mdR=(md)=>md?md.d[3]:256;
const _mdN=(md)=>md?md.d[1]:128;
const rareRarity=groupSize>=2?[_mdR(_md),_mdR(_supId1?MONSTER_DB[_supId1]:_md),_mdR(_supId2?MONSTER_DB[_supId2]:_md)]:_mdR(_md);
const normRarity=groupSize>=2?[_mdN(_md),_mdN(_supId1?MONSTER_DB[_supId1]:_md),_mdN(_supId2?MONSTER_DB[_supId2]:_md)]:_mdN(_md);
const mapDeft=(typeof calcDeftness==='function')?calcDeftness(atN1_val):0;
let actualCost=(userDeft>=mapDeft)?3:4;
const canRound2=userDeft>=mapDeft;
let totalStartCost=actualCost;
const abs_1=N+totalStartCost,abs_2=abs_1+1,abs_4=abs_1+2;
let patternMsg="";
let foundOffset=-1;
let foundSequence=null;
const isNormPat=pTypeStr.startsWith('N')||pTypeStr==='4_in_10'||pTypeStr==='3_in_10';
const targetPatterns=SI_PATTERN_INDICES[pTypeStr];
if(pType>0&&scanMax>0&&targetPatterns){
let baseRng=seed>>>0;
for(let i=0;i<37;i++)baseRng=lcg(baseRng);
for(let step=38;step<=N+scanMax;step++){
const rngSnapshot=baseRng;
let sim=siRunBattleSim(baseRng,groupSize,rareRarity,normRarity,tLvs,false);
baseRng=lcg(baseRng);
let currentHits=isNormPat?sim.normHits:sim.rareHits;
if(siMatchesPattern(currentHits,targetPatterns)){
if(step>=abs_1){
foundOffset=step-abs_1;
foundSequence=siRunBattleSim(rngSnapshot,groupSize,rareRarity,normRarity,tLvs,true).seq;
break;
}
}
}
patternMsg=foundOffset!==-1?
C20+` <span class="si-highlight" style="color:#0f0;">AT +${abs_1+foundOffset}</span>`:`<span style="color:#888;">${scanMax}`+C21+`</span>`;
}
let battleStr="";
let seqHtml="";
if(pType>0&&foundOffset!==-1){
const d1=foundOffset,d2=d1-1,d4=d1-2;
seqHtml=siBuildSeqHtml(foundSequence);
const showCombos=d1>0&&d1<=970;
const hexId=toMonsterHexId(monId);
const mainMon=getMonDB(hexId);
const mainDeath=mainMon?mainMon.s[12]:100;
const mainDeath0=mainDeath===0;
const gbInfo=(typeof GROTTO_BATTLE!=='undefined'&&GROTTO_BATTLE[envType])?GROTTO_BATTLE[envType][floorMR]:null;
const battleMax=gbInfo?gbInfo.x:5;
const mainEntry=(gbInfo&&hexId)?gbInfo.m.find(e=>e[0]===hexId):null;
const isAlone=mainEntry&&mainEntry[3]===1;
const mainMax=mainEntry?mainEntry[2]:1;
const canSup1=!isAlone&&mainEntry&&mainEntry[4]>0;
const canSup2=!isAlone&&mainEntry&&mainEntry[6]>0;
const _rawPool=(!isAlone&&typeof GROTTO_SUPPORT!=='undefined'&&GROTTO_SUPPORT[envType])?(GROTTO_SUPPORT[envType][floorMR]||[]):[];
const supportPool=(()=>{
const out=[],seenHex=new Set();
forEachPoolEntry(_rawPool,(a)=>{if(!seenHex.has(a[0])){seenHex.add(a[0]);out.push([a[0],a[1],a[2]]);}});
return out;
})();
const monNameFn=getMonsterDisplayName;
battleStr='';
if(showCombos){
const useJP=(DISPLAY_LANG!=='EN');
const mainMin=mainEntry?mainEntry[1]:1;
const resultsByT=new Map();
const probMap=new Map();
const _pAdd=(k,p)=>probMap.set(k,(probMap.get(k)||0)+p);
const _kA=(M)=>'A_'+M;
const _kB=(hx,M,S)=>'B_'+hx+'_'+M+'_'+S;
const _kC=(hA,SA,hB,SB,M)=>'C_'+hA+'_'+SA+'_'+hB+'_'+SB+'_'+M;
{
const pMain=1/(mainMax-mainMin+1);
const wByHex=new Map();let wDen=0;
forEachPoolEntry(_rawPool,(a)=>{if(!wByHex.has(a[0])){wByHex.set(a[0],{num:a[3]||0,min:a[1],max:a[2]});wDen=wDen||a[4]||0;}});
const P1=(!isAlone&&mainEntry&&mainEntry[5]>0)?mainEntry[4]/mainEntry[5]:0;
const P2=(!isAlone&&mainEntry&&mainEntry[7]>0)?mainEntry[6]/mainEntry[7]:0;
const P0=Math.max(0,1-P1-P2);
for(let mR=mainMin;mR<=mainMax;mR++){
{const[M]=trimGroups([mR],battleMax);_pAdd(_kA(M),P0*pMain);}
if(wDen>0&&(P1>0||P2>0)){
if(P1>0)for(const[hx,w]of wByHex){
if(!w.num)continue;
const pS=w.num/wDen,nC=w.max-w.min+1;
for(let sR=w.min;sR<=w.max;sR++){
const[M,S]=trimGroups([mR,sR],battleMax);
const p=P1*pMain*pS/nC;
if(S===0)_pAdd(_kA(M),p);else _pAdd(_kB(hx,M,S),p);
}
}
if(P2>0)for(let i=0;i<supportPool.length;i++){
for(let j=0;j<supportPool.length;j++){
const hAx=supportPool[i][0],hBx=supportPool[j][0];
const wA=wByHex.get(hAx),wB=wByHex.get(hBx);
if(!wA||!wB||!wA.num||!wB.num)continue;
const pSS=(wA.num/wDen)*(wB.num/wDen);
const nAB=(wA.max-wA.min+1)*(wB.max-wB.min+1);
for(let aR=wA.min;aR<=wA.max;aR++)for(let bR=wB.min;bR<=wB.max;bR++){
const[M,SA,SB]=trimGroups([mR,aR,bR],battleMax);
const p=P2*pMain*pSS/nAB;
if(SA===0&&SB===0){_pAdd(_kA(M),p);continue;}
if(SB===0){_pAdd(_kB(hAx,M,SA),p);continue;}
if(SA===0){_pAdd(_kB(hBx,M,SB),p);continue;}
if(i<=j)_pAdd(_kC(hAx,SA,hBx,SB,M),p);
else _pAdd(_kC(hBx,SB,hAx,SA,M),p);
}
}
}
}
}
}
const _pFmt=(k)=>{
const p=probMap.get(k);
if(p===undefined||!(p>0))return'';
const pc=p*100;
const txt=pc>=10?pc.toFixed(0):pc>=1?pc.toFixed(1):pc>=0.01?pc.toFixed(2):'<0.01';
return` <span style="color:#6a6;font-size:9px;">p≈${txt}%</span>`;
};
function _derivePlan(monGroups){
const T=monGroups.reduce((s,g)=>s+g.count,0);
const main=monGroups[0];
const sups=monGroups.filter(g=>!g.isMain);
const d0SC=sups.filter(g=>_effDeath(g)===0).reduce((s,g)=>s+g.count,0);
const dG0SC=sups.filter(g=>_effDeath(g)>0).reduce((s,g)=>s+g.count,0);
if(_effDeath(main)>0){
if(main.count>=2||dG0SC>0)
return{type:'kill_mercy_clear',effMon:1+d0SC,postAlive:d0SC};
return{type:'kill_all',effMon:T,postAlive:0};
}
if(dG0SC>0)return{type:'mercy_first',effMon:main.count+d0SC,postAlive:main.count+d0SC};
return{type:'kill_all',effMon:T,postAlive:0};
}
const _solverOpt=snapshotSolverOptions();
const _solverMercyLv=(_solverOpt.chars&&_solverOpt.chars.length)
?Math.max(..._solverOpt.chars.map(c=>c.lv||99)):99;
const _effDeath=(g)=>{
if(!(g.death>0))return 0;
const m=getMonDB(g.hex);
return(m&&m.s&&(m.s[13]+7)>_solverMercyLv)?0:g.death;
};
const _fleeProbes=[];
const _atForT=(t)=>(t===1)?d1:(t<=3?d2:d4);
const _fleeTask=(mg,t)=>({bat:_atForT(t),monGroups:mg,monId,mapDeft,canRound2});
const _fleeState=(mg,t)=>{
const task=_fleeTask(mg,t);
const v=peekFleeVerdict(task,_solverOpt);
if(v===false)return'flee';
if(v==='fallback')return'fallback';
if(v===true)return'ok';
_fleeProbes.push(task);
return'pending';
};
const _pendTag=(st)=>st==='pending'
?' <span style="color:#888;font-size:9px;" title="solver judging">…</span>':'';
const _fbTag=' <span style="color:#fa0;font-size:9px;" title="mercy/KMC → kill all">⚡</span>';
function _addResult(T,effMon,desc,monGroups,killAllDesc){
if(!resultsByT.has(T))resultsByT.set(T,{mixes:[],flee:[]});
const bucket=resultsByT.get(T);
if(effMon<0){bucket.flee.push(desc);return;}
bucket.mixes.push({effMon,desc,monGroups,killAllDesc});
}
const seenMainOnly=new Set();
for(let raw=mainMin;raw<=mainMax;raw++){
const[M]=trimGroups([raw],battleMax);
if(M<2||seenMainOnly.has(M))continue;
seenMainOnly.add(M);
const mgA=[{hex:hexId,count:M,death:mainDeath,isMain:true}];
const planA=_derivePlan(mgA);
const _fsA=_fleeState(mgA,M);
const _kaDescA=`<span style="color:#f9c">${monNameFn(hexId)}×${M}</span>${_pendTag(_fsA)}${_pFmt(_kA(M))}`;
if(_fsA==='flee'){
_addResult(M,-1,`<span style="color:#f9c">${monNameFn(hexId)}×${M}</span>${_pFmt(_kA(M))}`);
}else if(_fsA==='fallback'){
_addResult(M,M,`<span style="color:#f9c">${monNameFn(hexId)}×${M}</span>${_fbTag}${_pFmt(_kA(M))}`,mgA);
}else if(planA.type==='kill_mercy_clear'){
_addResult(M,planA.effMon,`<span style="color:#f9c">${monNameFn(hexId)}×${M}</span><span style="color:#0f0"> ${L36}→×${planA.effMon}</span>${_pendTag(_fsA)}${_pFmt(_kA(M))}`,mgA,_kaDescA);
}else{
_addResult(M,M,_kaDescA,mgA);
}
}
if(canSup1){
for(const sup of supportPool){
const supHex=sup[0],supMin=sup[1],supMax=sup[2];
const supName=monNameFn(supHex);
const supMon=getMonDB(supHex);
const supHP=supMon?supMon.s[0]:0;
const supDeath=supMon?supMon.s[12]:100;
const sameAsMain=supHex===hexId;
const seen=new Set();
for(let mR=mainMin;mR<=mainMax;mR++){
for(let sR=supMin;sR<=supMax;sR++){
const[M,S]=trimGroups([mR,sR],battleMax);
if(S===0)continue;
const key=M+'_'+S;
if(seen.has(key))continue;
seen.add(key);
const T=M+S;
const sLbl=S>1?supName+'×'+S:supName;
const _mainTag=`<span style="color:#f9c">${monNameFn(hexId)}${M > 1 ? '×' + M : ''}</span> `;
const mg=[{hex:hexId,count:M,death:mainDeath,isMain:true},
{hex:supHex,count:S,death:supDeath,isMain:false}];
const plan=_derivePlan(mg);
const _fs=_fleeState(mg,T);
const _kaDescB=`${_mainTag}<span style="color:#a8f">+${sLbl} HP${supHP}</span>${_pendTag(_fs)}${_pFmt(_kB(supHex, M, S))}`;
if(_fs==='flee'){
_addResult(T,-1,`${_mainTag}<span style="color:#a8f">+${sLbl}</span> <span style="color:#f44">HP${supHP}</span>${_pFmt(_kB(supHex, M, S))}`);
}else if(_fs==='fallback'){
_addResult(T,T,`${_mainTag}<span style="color:#a8f">+${sLbl} HP${supHP}</span>${_fbTag}${_pFmt(_kB(supHex, M, S))}`,mg);
}else if(plan.type==='kill_all'){
_addResult(T,T,_kaDescB,mg);
}else if(plan.type==='mercy_first'){
_addResult(T,plan.effMon,
`${_mainTag}<span style="color:#a8f">+${sLbl}</span><span style="color:#0f0"> ${L39}→×${plan.effMon}</span>${_pendTag(_fs)}${_pFmt(_kB(supHex, M, S))}`,mg,_kaDescB);
}else{
const lbl=plan.postAlive>0?L38:L37;
_addResult(T,plan.effMon,
`${_mainTag}<span style="color:#a8f">+${sLbl}</span><span style="color:#0f0"> ${lbl}→×${plan.effMon}</span>${_pendTag(_fs)}${_pFmt(_kB(supHex, M, S))}`,mg,_kaDescB);
}
}
}
}
}
if(canSup2&&supportPool.length>=2){
for(let i=0;i<supportPool.length;i++){
for(let j=i;j<supportPool.length;j++){
const sA=supportPool[i],sB=supportPool[j];
const nA=monNameFn(sA[0]),nB=monNameFn(sB[0]);
const mA=getMonDB(sA[0]);
const mB=getMonDB(sB[0]);
const sameA=sA[0]===hexId,sameB=sB[0]===hexId;
const twoSameSup=sA[0]===sB[0];
const hA=mA?mA.s[0]:0,hB=mB?mB.s[0]:0;
const dA=mA?mA.s[12]:100,dB=mB?mB.s[12]:100;
const seen=new Set();
for(let mR=mainMin;mR<=mainMax;mR++){
for(let aR=sA[1];aR<=sA[2];aR++){
for(let bR=sB[1];bR<=sB[2];bR++){
const[M,SA,SB]=trimGroups([mR,aR,bR],battleMax);
if(SA===0||SB===0)continue;
const key=M+'_'+SA+'_'+SB;
if(seen.has(key))continue;
seen.add(key);
const T=M+SA+SB;
const lA=SA>1?nA+'×'+SA:nA;
const lB=SB>1?nB+'×'+SB:nB;
const mg=[{hex:hexId,count:M,death:mainDeath,isMain:true},
{hex:sA[0],count:SA,death:dA,isMain:false},
{hex:sB[0],count:SB,death:dB,isMain:false}];
const plan=_derivePlan(mg);
const _mainTag=`<span style="color:#f9c">${monNameFn(hexId)}${M > 1 ? '×' + M : ''}</span> `;
const _fsC=_fleeState(mg,T);
const fleeHP=_fsC==='flee';
const _kaDescC=`${_mainTag}<span style="color:#a8f">+${lA}+${lB}</span>${_pendTag(_fsC)}${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`;
if(fleeHP){
_addResult(T,-1,`${_mainTag}<span style="color:#a8f">+${lA}+${lB}</span>${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`);
}else if(_fsC==='fallback'){
_addResult(T,T,`${_mainTag}<span style="color:#a8f">+${lA}+${lB}</span>${_fbTag}${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg);
}else if(plan.type==='kill_all'){
_addResult(T,plan.effMon,_kaDescC,mg);
}else if(plan.type==='mercy_first'){
_addResult(T,plan.effMon,
`${_mainTag}<span style="color:#a8f">+${lA}+${lB}</span><span style="color:#0f0"> ${L39}→×${plan.effMon}</span>${_pendTag(_fsC)}${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg,_kaDescC);
}else{
const lbl=plan.postAlive>0?L38:L37;
_addResult(T,plan.effMon,
`${_mainTag}<span style="color:#a8f">+${lA}+${lB}</span><span style="color:#0f0"> ${lbl}→×${plan.effMon}</span>${_pendTag(_fsC)}${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg,_kaDescC);
}
}
}
}
}
}
}
window._siBuckets={d1,d2,d4,monId,mapDeft,canRound2,hexId,mainDeath,resultsByT,useJP};
if(_fleeProbes.length){
Promise.all(_fleeProbes.map(t=>requestFleeVerdict(t,_solverOpt)))
.then(()=>updateSeedInspector());
}
const _batBtn=(val,bk,lbl)=>`<span onclick="showSolverBucket('${bk}')" title="${L40}${lbl}${L41}" style="color:#fa0;font-weight:bold;font-size:15px;cursor:pointer;text-decoration:underline dotted;padding:0 3px;">${siFormatAT(val)}</span>`;
battleStr=`<div style="margin:2px 0;">${BATTLE_LABEL} ${_batBtn(d1, 'd1', '×1')} / ${_batBtn(d2, 'd2', '×2-3')} / ${_batBtn(d4, 'd4', '×4-5')}</div>`
+`<div style="color:#0aa;font-size:9px;margin:1px 0 0 0;">${L42}</div>`;
}else if(d1===0){
battleStr+=`<div style="margin:2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">0</span> <span style="color:#888;font-size:10px;">×1</span></div>`
+renderSolverResult(0,[{hex:hexId,count:1,death:mainDeath,isMain:true}],monId,mapDeft);
}
battleStr+=`<div style="color:#888;font-size:11px;margin-top:3px;">`+C22+`</div>`
+`<div style="margin-top:3px;">${seqHtml}</div>`;
}else{
let currentRng=seed>>>0;
for(let i=0;i<abs_1-1;i++)currentRng=lcg(currentRng);
let defaultSim=siRunBattleSim(currentRng,groupSize,rareRarity,normRarity,tLvs,true);
seqHtml=siBuildSeqHtml(defaultSim.seq);
battleStr=`<div id="batLine1" style="margin:2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">${abs_1}</span> <span style="color:#888;font-size:10px;">×1</span></div>`
+`<div id="batLine2" style="margin:2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">${abs_2}</span> <span style="color:#888;font-size:10px;">×2-3</span></div>`
+`<div id="batLine3" style="margin:2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">${abs_4}</span> <span style="color:#888;font-size:10px;">×4-5</span></div>`
+`<div style="color:#888;font-size:11px;margin-top:3px;">`+C23+`</div>`
+`<div style="margin-top:3px;">${seqHtml}</div>`;
}
let s_target=seed>>>0;
for(let i=0;i<targetTotalStep;i++)s_target=lcg(s_target);
const atTarget_val=(s_target>>>16)&0x7FFF;
const _mainRR=Array.isArray(rareRarity)?rareRarity[0]:rareRarity;
let DropThreshold=Math.floor(32768/_mainRR);
let firstThiefLv=tLvs[0]>0?tLvs[0]:99;
const effectiveRate=Math.floor((_mainRR*100)/firstThiefLv);
const ThiefThreshold=Math.floor(32767/effectiveRate)+1;
const resBox=document.getElementById('si_at_results');
resBox.innerHTML=`
  <div style="display:flex;justify-content:space-between;">
  <span>AT ${N}: <span class="si-highlight">${atN_val}</span> → ${monName}</span>
  <span style="font-size:11px;">${patternMsg}</span>
  </div>
  <div>AT ${N+1}: <span style="color:#39C5BB;">${atN1_val}</span> ➔ `+G26+`: <span class="si-highlight">${mapDeft}</span></div>
  <div style="margin-top:5px;padding-top:5px;border-top:1px dashed #335;">
  ${battleStr}
  </div>`;
const targetBox=document.getElementById('si_target_results');
targetBox.innerHTML=`
  <div>AT <span style="color:#fff;">${targetTotalStep}</span>: <span class="si-highlight" style="color:#f44;font-size:15px;">${atTarget_val}</span></div>
  <div style="font-size:11px;margin-top:5px;color:#ccc;">
  `+C25+` (≤${DropThreshold}): ${atTarget_val <= DropThreshold ? '✅ ' + L46 : '❌ ' + L47}<br>
  `+C26+` (Lv${firstThiefLv} ≤${ThiefThreshold}): ${atTarget_val <= ThiefThreshold ? '✅ ' + L46 : '❌ ' + L47}
  </div>`;
}
function openSeedInspector(){
document.getElementById('seedInspectorModal').style.display='flex';
updateSeedInspector();
}
function closeSeedInspector(e){
if(!e||e.target.className==='modal-close')document.getElementById('seedInspectorModal').style.display='none';
}
let _siSolveGen=0;
let _siSolveSeq=0;
const _siSolveQueue=[];
const _siSolveBusy=new Map();
function takeIdlePoolWorker(){
const p=_dq9Pool;
if(!p||p.idle.length===0)return-1;
const a=_dq9Active;
if(a&&!a.finished&&a.queue.length>0)return-1;
return p.idle.pop();
}
function dispatchSolveQueue(){
while(_siSolveQueue.length>0){
const wi=takeIdlePoolWorker();
if(wi<0)return;
const t=_siSolveQueue.shift();
_siSolveBusy.set(wi,t);
_dq9Pool.workers[wi].postMessage(t.msg);
}
}
function handleSolveMessage(workerIdx,m){
const t=_siSolveBusy.get(workerIdx);
if(!t||m.solveId!==t.solveId)return;
_siSolveBusy.delete(workerIdx);
const p=_dq9Pool;
if(p&&p.idle.indexOf(workerIdx)===-1)p.idle.push(workerIdx);
dispatchPoolJobs();
if(m.type==='solveDone')t.resolve(m);
else t.reject(new Error(m.message||'Solver Worker error'));
}
function queueSolveTask(render,options,idBase,bucketBase){
const pool=getSearchWorkerPool();
if(!pool)return Promise.reject(new Error('Worker pool unavailable'));
const solveId=++_siSolveSeq;
return new Promise((resolve,reject)=>{
_siSolveQueue.push({solveId,resolve,reject,msg:{
type:'solve',solveId,lang:DISPLAY_LANG,
dom:{si_useStats:!!options.useStats,si_multiPlayer:!!options.multiPlayer},
chars:options.chars,render,idBase,bucketBase
}});
dispatchSolveQueue();
});
}
function replaceSolveWorker(wi){
const p=_dq9Pool;
if(!p)return;
try{p.workers[wi].onmessage=null;p.workers[wi].onerror=null;p.workers[wi].terminate();}catch(e){}
const w=new Worker(getWorkerBlobURL());
w.onmessage=(e)=>handlePoolMessage(wi,e.data);
w.onerror=(e)=>handlePoolFatalError(wi,e);
p.workers[wi]=w;
const a=_dq9Active;
if(a&&!a.finished&&a._retryJob)w.postMessage({type:'job',gen:a.gen,job:a._retryJob});
if(p.idle.indexOf(wi)===-1)p.idle.push(wi);
}
function cancelAllSolveTasks(reason){
_siSolveGen++;
const err=new Error(reason||'Solver cancelled');
for(const t of _siSolveQueue)t.reject(err);
_siSolveQueue.length=0;
if(_siSolveBusy.size>0){
for(const[wi,t]of _siSolveBusy){t.reject(err);replaceSolveWorker(wi);}
_siSolveBusy.clear();
dispatchPoolJobs();
}
}
function abortAllSolveTasks(reason){
const err=new Error(reason||'Worker pool lost');
for(const t of _siSolveQueue)t.reject(err);
_siSolveQueue.length=0;
for(const t of _siSolveBusy.values())t.reject(err);
_siSolveBusy.clear();
}
function requeueBusySolveTasks(){
if(_siSolveBusy.size===0)return;
for(const[wi,t]of _siSolveBusy){_siSolveQueue.unshift(t);replaceSolveWorker(wi);}
_siSolveBusy.clear();
}
function runSolveTaskOnMain(render,idBase,bucketBase){
window._solverComboId=idBase;
window._solverBucketId=bucketBase;window._solverFallback=false;window._solverSolvable=null;
const html=renderSolverResult(render.bat,render.monGroups,render.monId,render.mapDeft,render.canRound2);
return{html,comboMap:window._solverComboMap,buckets:window._solverBuckets,fallback:window._solverFallback||false,solvable:window._solverSolvable};
}
const snapshotSolverOptions=()=>({
chars:readCharStatsFromDom(),
useStats:!!document.getElementById('si_useStats')?.checked,
multiPlayer:!!document.getElementById('si_multiPlayer')?.checked
});
const _fleeVerdict=new Map();
const _fleePending=new Map();
const FLEE_ID_BASE=900000,FLEE_BK_BASE=9000;
let _fleeProbeSeq=0;
const _fleeCharsSig=(chars)=>(chars||[]).map(c=>{
const s=c.stats||{};
return[c.lv,c.job,c.agi,s.atk,s.might,s.str,s.mending,s.deft].join(',');
}).join(';');
const fleeVerdictKey=(task,opt)=>
task.monId+'@'+task.bat+'|'+(task.canRound2?1:0)+'|'+
task.monGroups.map(g=>g.hex+':'+g.count+':'+g.death+(g.isMain?'*':'')).join(',')+
'|'+(opt.useStats?1:0)+'|'+(opt.multiPlayer?1:0)+
'|'+_fleeCharsSig(opt.chars);
function peekFleeVerdict(task,opt){
const k=fleeVerdictKey(task,opt);
return _fleeVerdict.has(k)?_fleeVerdict.get(k):null;
}
function requestFleeVerdict(task,opt){
const k=fleeVerdictKey(task,opt);
if(_fleeVerdict.has(k))return Promise.resolve(_fleeVerdict.get(k));
if(_fleePending.has(k))return _fleePending.get(k);
const n=++_fleeProbeSeq;
const p=queueSolveTask(task,opt,FLEE_ID_BASE+n*100,FLEE_BK_BASE+n).then((m)=>{
const solvable=m&&m.solvable===false?false:(m&&m.fallback?'fallback':true);
_fleeVerdict.set(k,solvable);_fleePending.delete(k);
return solvable;
}).catch(()=>{
_fleeVerdict.set(k,true);_fleePending.delete(k);
return true;
});
_fleePending.set(k,p);
return p;
}
const makeD1SolveTask=(b)=>({
bat:b.d1,
monGroups:[{hex:b.hexId,count:1,death:b.mainDeath,isMain:true}],
monId:b.monId,
mapDeft:b.mapDeft,
canRound2:b.canRound2
});
function ensureSolverSubmodal(){
if(document.getElementById('si_submodal'))return;
const ov=document.createElement('div');
ov.id='si_submodal';
ov.style.cssText='display:none;position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.78);align-items:flex-start;justify-content:center;padding:18px;overflow:auto;';
ov.onclick=(e)=>{if(e.target===ov)closeSolverBucket();};
ov.innerHTML='<div onclick="event.stopPropagation()" style="background:#0a0a1a;border:1px solid #0ff;border-radius:12px;max-width:920px;width:100%;max-height:90vh;overflow:auto;padding:14px;box-shadow:0 0 24px rgba(0,255,255,0.25);">'
+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;position:sticky;top:0;background:#0a0a1a;padding-bottom:6px;border-bottom:1px solid #224;">'
+'<span id="si_submodal_title" style="color:#0ff;font-size:14px;font-weight:bold;"></span>'
+'<span onclick="closeSolverBucket()" style="cursor:pointer;color:#999;font-size:22px;line-height:1;padding:0 4px;">&times;</span>'
+'</div><div id="si_submodal_body"></div></div>';
document.body.appendChild(ov);
}
function closeSolverBucket(){
cancelAllSolveTasks('Solver view closed');
const ov=document.getElementById('si_submodal');
if(ov){ov.style.display='none';const b=document.getElementById('si_submodal_body');if(b)b.innerHTML='';}
}
function solverTaskOutputSignature(htmlStr,useStats){
const rawHtml=htmlStr||'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const comboIds=[...rawHtml.matchAll(/expandCombo\((\d+)\)/g)].map(m=>m[1]);
const htmlSig=rawHtml
.replace(/expandCombo\(\d+\)/g,'expandCombo(#)')
.replace(/combo_detail_\d+/g,'combo_detail_#')
.replace(/sb\d+/g,'sb#');
const stable=(v)=>{
if(Array.isArray(v))return v.map(stable);
if(v&&typeof v==='object'){
const out={};
for(const k of Object.keys(v).sort())out[k]=stable(v[k]);
return out;
}
return v;
};
const detailSig=comboIds.map(id=>{
const e=window._solverComboMap&&window._solverComboMap[id];
if(!e)return'missing:'+id;
const actionSig=(e.combo||[]).map(v=>[
v.jp,v.at||0,v.equip||'',v.note||'',SolverActionGate.hits(v),v.earlyKill?1:0,
v.aoeK!==undefined?v.aoeK:'',v.soloGroup?1:0,v.needle?1:0,v.needDeath0?1:0
].join('\x1f')).join('\x1e');
const traceSig=useStats?(e.outcomeSig||''):'';
return[actionSig,JSON.stringify(stable(e.eggAssign||null)),JSON.stringify(stable(e.assign||null)),
JSON.stringify(stable(e.defend||null)),traceSig].join('\x1d');
}).join('\x1c');
return htmlSig+'\x1b'+detailSig;
}
function showSolverBucket(bucket){
const b=window._siBuckets;
if(!b)return;
cancelAllSolveTasks('Superseded by a new Solver view');
const viewGen=_siSolveGen;
ensureSolverSubmodal();
window._solverComboMap={};window._solverComboId=0;window._solverBucketId=0;window._solverBuckets={};
let html=(typeof buildSolverLegendHtml==='function'?buildSolverLegendHtml():''),title='';
const tasks=[],taskElementIds=[],taskMeta=[];
const _hdr=(bat,tLbl)=>`<div style="margin:6px 0 2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">${siFormatAT(bat)}</span> <span style="color:#888;font-size:10px;">${tLbl}</span></div>`;
const _queueTask=(task,meta)=>{
const id='si_solver_task_'+viewGen+'_'+tasks.length;
tasks.push(task);taskElementIds.push(id);taskMeta.push(meta||null);
html+=`<div id="${id}"><div style="color:#39C5BB;font-size:10px;margin-left:16px;">${L43}</div></div>`;
};
if(bucket==='d1'){
title=`${BATTLE_LABEL} ${siFormatAT(b.d1)}｜${L40}×1`;
html+=_hdr(b.d1,'×1');
_queueTask(makeD1SolveTask(b));
}else{
const Ts=bucket==='d2'?[2,3]:[4,5];
const headBat=bucket==='d2'?b.d2:b.d4;
const headLbl=bucket==='d2'?'×2-3':'×4-5';
title=`${BATTLE_LABEL} ${siFormatAT(headBat)}｜${L40}${headLbl}`;
let any=false;
for(const T of Ts){
const entry=b.resultsByT&&b.resultsByT.get(T);
if(!entry||(entry.mixes.length===0&&entry.flee.length===0))continue;
any=true;
const tBat=T<=3?b.d2:b.d4;
html+=_hdr(tBat,'×'+T);
for(const m of entry.mixes){
const taskNo=tasks.length;
const rowId='si_solver_pattern_'+viewGen+'_'+taskNo;
const descId=rowId+'_desc';
html+=`<div id="${rowId}"><div id="${descId}" style="font-size:9px;margin-left:16px;color:#888;line-height:1.4;margin-bottom:1px;">${m.desc}</div>`;
_queueTask({bat:tBat,monGroups:m.monGroups||[{hex:b.hexId,count:m.effMon,death:b.mainDeath,isMain:true}],monId:b.monId,mapDeft:b.mapDeft,canRound2:b.canRound2},
{pattern:true,section:'T'+T,rowId,descId,desc:m.desc,killAllDesc:m.killAllDesc});
html+='</div>';
}
if(entry.flee.length>0)html+=`<div style="font-size:9px;margin-left:16px;"><span style="color:#f44;">${L44}</span> ${entry.flee.join(' · ')}</div>`;
}
if(!any)html+='<div style="color:#666;font-size:11px;margin-left:16px;">'+L45+'</div>';
}
document.getElementById('si_submodal_title').innerHTML=title;
document.getElementById('si_submodal_body').innerHTML=html;
document.getElementById('si_submodal').style.display='flex';
if(tasks.length===0)return;
const options=snapshotSolverOptions();
const ID_SPAN=100000,BK_SPAN=1000;
const _fill=(i,htmlStr)=>{
const el=document.getElementById(taskElementIds[i]);
if(el)el.innerHTML=htmlStr||'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
};
const _mergeState=(m)=>{
if(m.comboMap)Object.assign(window._solverComboMap,m.comboMap);
if(m.buckets)Object.assign(window._solverBuckets,m.buckets);
};
const taskResults=new Array(tasks.length);
let completedTasks=0;
const _mergeEquivalentPatterns=()=>{
const seen=new Map();
for(let i=0;i<tasks.length;i++){
const meta=taskMeta[i],result=taskResults[i];
if(!meta||!meta.pattern||!result)continue;
const sig=meta.section+'\x1a'+solverTaskOutputSignature(result.html,options.useStats);
if(!seen.has(sig)){seen.set(sig,i);continue;}
const keepMeta=taskMeta[seen.get(sig)];
if(!keepMeta.mergedDescs)keepMeta.mergedDescs=[keepMeta.desc];
keepMeta.mergedDescs.push(meta.desc);
const descEl=document.getElementById(keepMeta.descId);
if(descEl)descEl.innerHTML=keepMeta.mergedDescs.join('<br>');
const duplicateRow=document.getElementById(meta.rowId);
if(duplicateRow)duplicateRow.remove();
}
};
const _completeTask=(i,result,stateAlreadyMerged)=>{
if(viewGen!==_siSolveGen)return;
if(!stateAlreadyMerged)_mergeState(result);
taskResults[i]={html:result&&result.html!==undefined?result.html:''};
if(result.fallback&&taskMeta[i]?.killAllDesc){
const descEl=document.getElementById(taskMeta[i].descId);
const fbDesc=taskMeta[i].killAllDesc+' <span style="color:#fa0;font-size:9px;" title="mercy/KMC → kill all">⚡</span>';
if(descEl)descEl.innerHTML=fbDesc;
taskMeta[i].desc=fbDesc;
}
_fill(i,taskResults[i].html);
completedTasks++;
if(completedTasks===tasks.length)_mergeEquivalentPatterns();
};
const pool=getSearchWorkerPool();
if(!pool){
let i=0;
const step=()=>{
if(viewGen!==_siSolveGen||i>=tasks.length)return;
const result=runSolveTaskOnMain(tasks[i],i*ID_SPAN,i*BK_SPAN);
_completeTask(i,result,true);
i++;setTimeout(step,0);
};
setTimeout(step,0);
return;
}
tasks.forEach((task,i)=>{
queueSolveTask(task,options,i*ID_SPAN,i*BK_SPAN).then((m)=>{
if(viewGen!==_siSolveGen)return;
_completeTask(i,m,false);
}).catch((e)=>{
if(viewGen!==_siSolveGen)return;
console.warn('[Solver] Worker solve 失敗,該任務退回主執行緒:',e&&e.message);
setTimeout(()=>{
if(viewGen!==_siSolveGen)return;
_completeTask(i,runSolveTaskOnMain(task,i*ID_SPAN,i*BK_SPAN),true);
},0);
});
});
}
