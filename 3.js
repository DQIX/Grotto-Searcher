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
(function _workerPreflight(){
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
function getWorkerCount(){
try{
const q=new URLSearchParams(window.location.search).get('workers');
if(q){const n=parseInt(q);if(n>=1)return Math.min(n,256);}
}catch(e){}
if(typeof window.DQ9_WORKER_COUNT==='number'&&window.DQ9_WORKER_COUNT>=1){
return Math.min(Math.floor(window.DQ9_WORKER_COUNT),256);
}
return Math.max(1,Math.min(navigator.hardwareConcurrency||4,256));
}
let _dq9BlobURL=null;
function _dq9GetBlobURL(){return '5.js';}
function getSearchWorkerPool(){
if(_dq9Pool)return _dq9Pool;
if(!_dq9PreflightDone||_dq9PoolFailed||typeof Worker==='undefined')return null;
try{
const blobURL=_dq9GetBlobURL();
const count=getWorkerCount();
const workers=[];
for(let i=0;i<count;i++){
const w=new Worker(blobURL);
w.onmessage=(e)=>_poolHandleMessage(i,e.data);
w.onerror=(e)=>_poolHandleFatal(i,e);
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
function _poolBroadcast(msg){
if(_dq9Pool)for(const w of _dq9Pool.workers)w.postMessage(msg);
}
function _poolDispatch(){
const a=_dq9Active,p=_dq9Pool;
if(a&&p&&!a.finished){
while(a.queue.length>0&&p.idle.length>0){
const chunkId=a.queue.shift();
const wi=p.idle.pop();
a.inFlight.set(chunkId,0);
p.workers[wi].postMessage(Object.assign({type:'chunk',gen:a.gen},a.chunks[chunkId]));
}
}
if(typeof _siSolveDispatch==='function')_siSolveDispatch();
}
function _poolFlushReady(a){
while(a.nextFlush<a.chunks.length&&a.slots[a.nextFlush]!==undefined){
const items=a.slots[a.nextFlush];
a.slots[a.nextFlush]=undefined;
a.nextFlush++;
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}
}
function _poolFlushRemaining(a){
for(let i=a.nextFlush;i<a.chunks.length;i++){
const items=a.slots[i];
if(items!==undefined){
a.slots[i]=undefined;
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}
}
a.nextFlush=a.chunks.length;
}
function _poolProgress(a){
if(a.finished||!a.callbacks.onProgress)return;
let processed=a.unitsDone;
for(const entry of a.inFlight)processed+=a.chunks[entry[0]].units*entry[1];
a.callbacks.onProgress({processed,total:a.totalUnits,hits:a.hits,rStr:a.lastRStr,seedHex:a.lastSeedHex});
}
function _poolFinish(a,result,errMsg){
if(a.finished)return;
a.finished=true;
if(a._watchdog){clearTimeout(a._watchdog);a._watchdog=null;}
_poolFlushRemaining(a);
if(_dq9Active===a)_dq9Active=null;
if(errMsg==='_RETRY_MAIN_THREAD_'&&a._retryJob&&a._retryCallbacks){
console.info('[DQ9] Retrying search on main thread...');
runSearchJob(a._retryJob,a._retryCallbacks);
return;
}
if(errMsg!==undefined){if(a.callbacks.onError)a.callbacks.onError(errMsg);}
else{if(a.callbacks.onDone)a.callbacks.onDone(result);}
if(typeof _siSolveDispatch==='function')setTimeout(_siSolveDispatch,0);
}
function _poolHandleMessage(workerIdx,m){
const p=_dq9Pool;
if(!m)return;
if(m.type==='solveDone'||m.type==='solveError'){
if(typeof _siSolveHandle==='function')_siSolveHandle(workerIdx,m);
return;
}
if(m.type==='chunkDone'||m.type==='error'){
if(p&&p.idle.indexOf(workerIdx)===-1)p.idle.push(workerIdx);
}
const a=_dq9Active;
if(!a||m.gen!==a.gen||a.finished){_poolDispatch();return;}
if(a._watchdog){clearTimeout(a._watchdog);a._watchdog=null;}
if(m.type==='tick'){
if(a.inFlight.has(m.chunkId))a.inFlight.set(m.chunkId,m.frac||0);
if(m.rStr!==undefined&&m.rStr!==null)a.lastRStr=m.rStr;
if(m.seedHex!==undefined&&m.seedHex!==null)a.lastSeedHex=m.seedHex;
_poolProgress(a);
return;
}
if(m.type==='chunkDone'){
a.inFlight.delete(m.chunkId);
if(m.aborted){a.queue.unshift(m.chunkId);_poolDispatch();return;}
a.hits+=m.hits||0;
a.unitsDone+=a.chunks[m.chunkId].units;
a.doneCount++;
if(a.unordered){
const items=m.items||[];
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}else{
a.slots[m.chunkId]=m.items||[];
_poolFlushReady(a);
}
_poolProgress(a);
if(a.doneCount===a.chunks.length){_poolFinish(a,{hits:a.hits,cancelled:false});}
else{_poolDispatch();}
return;
}
if(m.type==='error'){
console.error('Worker chunk error:',m.message);
_poolBroadcast({type:'cancel'});
_poolFinish(a,null,m.message);
return;
}
}
function _poolStartWatchdog(a){
a._watchdog=setTimeout(()=>{
if(a.doneCount===0&&!a.finished){
console.warn('[DQ9] Workers unresponsive — falling back to main thread');
if(typeof _siSolveAbortAll==='function')_siSolveAbortAll('Workers unresponsive');
for(const w of _dq9Pool.workers)w.terminate();
_dq9Pool=null;
_dq9PoolFailed=true;
_poolFinish(a,null,'_RETRY_MAIN_THREAD_');
}
},3000);
}
function _poolHandleFatal(workerIdx,e){
console.error('Search worker fatal error:',e&&(e.message||e));
if(typeof _siSolveBusy!=='undefined'&&_siSolveBusy.has(workerIdx)){
const t=_siSolveBusy.get(workerIdx);
_siSolveBusy.delete(workerIdx);
t.reject(new Error((e&&e.message)||'Worker error'));
_siSolveReplaceWorker(workerIdx);
}
const a=_dq9Active;
if(a&&!a.finished){
_poolBroadcast({type:'cancel'});
_poolFinish(a,null,(e&&e.message)||'Worker error');
}
}
function requestSearchCancel(){
searchCancel=true;
const a=_dq9Active;
if(a&&!a.finished){
_poolBroadcast({type:'cancel'});
_poolFinish(a,{hits:a.hits,cancelled:true});
}
}
function runSearchJob(job,callbacks){
const pool=getSearchWorkerPool();
if(pool){
if(typeof _siSolveRequeueBusy==='function')_siSolveRequeueBusy();
const gen=++_dq9Gen;
const chunkSize=DQ9_CHUNK_SIZES[job.kind]||1024;
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
_poolBroadcast({type:'job',gen,job});
_poolDispatch();
_poolStartWatchdog(_dq9Active);
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
function _uspDedupBetter(cand,cur){
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
const dedupBetter=config.dedupBetter||_uspDedupBetter;
const dedupKeyFn=config.dedupKeyFn||(it=>it.seed);
const sortBucket=(sortTopN!==undefined&&!dedupBySeed)?[]:null;
const sortCmp=(a,b)=>sortDesc?(b.sortCost-a.sortCost):(a.sortCost-b.sortCost);
const pruneCap=(sortTopN!==undefined&&sortTopN!==Infinity)?Math.max(sortTopN*4,200):Infinity;
const restoreBtn=()=>{if(btn){btn.textContent=config.btnText;btn.style.background=config.btnBg;btn.style.color=config.btnColor||'#000';}};
const job={
kind:'scan',
processor:config.processor,
params:config.params||{},
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
renderFinal:isMaxTile?((arr,sortCmp,grid)=>{
const groups={};
for(const it of arr){const d=it._dimLabel||'?';if(!groups[d])groups[d]=[];groups[d].push(it);}
const fragment=document.createDocumentFragment();
for(const dim of _MAXTILE_DIMS){
const dl=dim+'x'+dim;const g=groups[dl];if(!g||g.length===0)continue;
g.sort(sortCmp);
let cutoff=Math.min(10,g.length);
if(cutoff>0&&cutoff<g.length){const thr=g[cutoff-1].sortCost;while(cutoff<g.length&&g[cutoff].sortCost===thr)cutoff++;}
const top=g.slice(0,cutoff);
const hdr=document.createElement('div');
hdr.style.cssText='width:100%;color:#fc6;font-weight:bold;font-size:13px;margin:12px 0 4px;border-bottom:1px solid #555;padding-bottom:2px;';
hdr.textContent=dl+' — Top '+top.length;
fragment.appendChild(hdr);
for(const it of top)fragment.appendChild(materializeResultItem(it));
}
grid.appendChild(fragment);
}):undefined,
validateConds:()=>true,
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
function initCPUBenchmark(){
const h4=document.querySelector('#unified_search_panel h4');
if(!h4)return;
const cpuBtn=document.createElement('button');
cpuBtn.id='cpuBenchBtn';
cpuBtn.textContent='💻';
cpuBtn.title='CPU Benchmark';
cpuBtn.style.cssText='margin-left:6px;background:#224;color:#0ff;border:1px solid #088;border-radius:50%;width:20px;height:20px;font-size:11px;font-weight:bold;cursor:pointer;display:flex;justify-content:center;align-items:center;transition:all 0.2s;';
cpuBtn.onmouseover=function(){this.style.background='#0ff';this.style.color='#000';};
cpuBtn.onmouseout=function(){this.style.background='#224';this.style.color='#0ff';};
cpuBtn.onclick=startCPUBenchmark;
h4.appendChild(cpuBtn);
}
function startCPUBenchmark(){
if(isSearching){requestSearchCancel();return;}
const t0=performance.now();
executeSharedSearch({
btnId:'cpuBenchBtn',
btnText:'💻',
btnBg:'#224',
btnColor:'#0ff',
stopText:'🛑',
emptyRankMsg:B07,
searchFilterLoc:true,
validateConds:()=>true,
renderCap:0,
filterRanks:(ranksToSearch,conds)=>sharedRankFilter(ranksToSearch,conds,false),
processor:'fastest',
params:{searchOnlyWithD:false,benchmarkMode:true},
onDoneExtra:(d)=>{
const elapsed=((performance.now()-t0)/1000).toFixed(2);
const sp=document.getElementById('searchProgress');
if(sp)sp.textContent=searchDoneMsg(d.hits)+' ⏱ '+elapsed+'s';
},
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
let offset=0;
if(g.floor>=13)offset=3;
else if(g.floor>=9)offset=2;
else if(g.floor>=5)offset=1;
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
let reqCount,targetFloors;
if(isB9F){
reqCount=2;
targetFloors=[8];
}else{
reqCount=b3fThreeItems.includes(targetItem)?3:2;
targetFloors=b3fThreeItems.includes(targetItem)?[2]:[2,3];
}
const chestRanks=getChestRanksForItems(checkItems);
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'searchBtn',btnText:H01,btnBg:'linear-gradient(135deg,#4c4,#080)',
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checker:'quickload',
sortTopN:wantAstar?Infinity:undefined,
preSort:(wantAstar&&isB9F)?_qlB10PreSort:undefined,
groupTail:wantAstar?{match:it=>it.isX3,label:'x'+(reqCount+1)}:undefined,
checkerParams:{targetFloors,checkItems,reqCount,isB9F,chestRanks,wantAstar,checkB10:wantAstar&&isB9F}
});
}
function qlMode(){const el=document.getElementById('ql_mode');return el?el.value:'';}
function qlModeSec(){const m=qlMode();return(m==='5'||m==='5A'||m==='5D')?0:(m==='9'||m==='9A'||m==='9D')?4:null;}
function qlModeAstar(){const m=qlMode();return m==='D'||m==='5D'||m==='9D';}
function _qlB10PreSort(arr){
const b10=arr.filter(it=>it.isB10).sort((a,b)=>a.sortCost-b.sortCost).slice(0,5);
return arr.filter(it=>!it.isB10).concat(b10);
}
function _jfireB10PreSort(arr){
const b10wp=arr.filter(it=>it.isJfireB10).sort((a,b)=>a.sortCost-b.sortCost).slice(0,5);
return arr.filter(it=>!it.isJfireB10).concat(b10wp);
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
sortTopN:wantAstar?Infinity:undefined,
preSort:(wantAstar&&isB9F)?_qlB10PreSort:undefined,
groupTail:wantAstar?{match:it=>it.isX3,label:'x'+(reqCount+1)}:undefined,
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
sortTopN:wantAstar?Infinity:undefined,
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
if(targetValue==='Sainted soma'){
ThirdChestSearch(true);
}else{
ThirdChestSearch(false);
}
}
function JFireSearch(qlSec){
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'BtnTK',btnText:H02,btnBg:'linear-gradient(135deg,#f80,#c40)',
filterRanks:(ranks)=>ranks.filter(rank=>{
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1])return TableC[i*4+3]>=9;
}
return false;
}),
checker:'jfire',
sortTopN:wantAstar?Infinity:undefined,
preSort:wantAstar?_jfireB10PreSort:undefined,
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
sortTopN:wantAstar?Infinity:undefined,
checkerParams:{targetItem,wpTargets,strictMatTargets,broadMatTargets,isMillionaire,isMonsterBox,minSec,maxSec,qlSec,wantAstar}
});
}
const MRT_PREVIEW_ROWS=30;
const MRT_S_WEAPONS=ITEMS_S_WEAPONS;
const MRT_MILLIONAIRE=ITEMS_MILLIONAIRE;
const MRT_HL={};
MRT_HL['Sainted soma']={bg:'#FFC90E',fg:'#000',bd:'#da0'};
MRT_S_WEAPONS.forEach(w=>MRT_HL[w]={bg:'#1a8a3c',fg:'#fff',bd:'#2a4'});
MRT_HL['Ethereal stone']={bg:'#c018a0',fg:'#fff',bd:'#e4c'};
['Metal slime shield','Metal slime armour','Metal slime helm','Metal slime gauntlets','Metal slime sollerets'].forEach(i=>MRT_HL[i]={bg:'#383850',fg:'#d0d8f0',bd:'#88a'});
MRT_MILLIONAIRE.forEach(i=>MRT_HL[i]={bg:'#08c',fg:'#fff',bd:'#4af'});
MRT_HL['Lucida shard']={bg:'#B5E61D',fg:'#000',bd:'#8c0'};
['Dangerous bustier','Fuddle bow'].forEach(i=>MRT_HL[i]={bg:'#FFAEC9',fg:'#000',bd:'#f8a'});
const MRT_RK_COLORS={10:'#f4f',9:'#fa0',8:'#4cf',7:'#8f8',6:'#ff8',5:'#aaa',4:'#888',3:'#666',2:'#555',1:'#444'};
const MRT_RK_NAMES=CHEST_RANK;
const MRT_PRESETS={
'DD,263C':{custom:{3:[0],4:[0],7:[0],8:[1],9:[0],10:[0],11:[0],12:[0],13:[0],14:[0],15:[0],16:[0]}},
'B5,3CA2':{custom:{4:[0],5:[0],6:[0],7:[0],8:[0,2],9:[0],10:[1],13:[0],14:[0]}},
'DD,2E7A':{custom:{3:[0],4:[0],6:[0],7:[1],9:[0],10:[0],11:[0,2],12:[1]}},
'C9,7FE0':{custom:{3:[0],4:[0,2],5:[0],8:[0],9:[1],10:[0],11:[0],12:[0],13:[0]}},
'C9,2AC6':{custom:{3:[0,1]}},
'DD,32BB':{custom:{3:[0,1,2],4:[0,1]}},
'DD,235E':{custom:{3:[0,1]}},
'C9,158D':{custom:{3:[0,1]}},
'DD,5C43':{custom:{3:[0,1],4:[0],5:[1],6:[0],9:[0],10:[0],11:[0],13:[0,1],14:[1]}},
'DD,47D0':{custom:{3:[0,1],4:[1],5:[0],6:[0],7:[0,1,2],8:[0]}},
};
let mrtEngine=null,mrtChests=[],mrtVisChests=[],mrtFilter='ALL',mrtCustom=null,mrtHiddenChests=new Set(),mrtRankWidths={};
function mrtMeasureRankWidths(){
const canvas=document.createElement('canvas');
const ctx=canvas.getContext('2d');
const isMobile=window.innerWidth<=600;
const isEN=mrtLang!=='jp';
ctx.font=(isMobile?'10px ':'11px ')+(isEN?'system-ui,-apple-system,sans-serif':'"Hiragino Sans","PingFang TC",sans-serif');
mrtRankWidths={};
const ranks=new Set(mrtChests.map(cd=>cd.rank));
for(const rank of ranks){
let maxW=0,acc=0;
for(let i3=TableO[rank-1];i3<TableO[rank];i3++){
if(acc>99)break;
acc+=TableP[i3];
const r=TableR[TableQ[i3]];
const name=isEN?(r[0]||'\u2014'):(r[1]||r[0]||'\u2014');
const w=ctx.measureText(name).width;
if(w>maxW)maxW=w;
}
mrtRankWidths[rank]=Math.ceil(maxW)+12;
}
}
let mrtLang=DISPLAY_LANG==='EN'?'en':'jp',mrtRunning=false,mrtRAF=null,mrtOrigin=0,mrtRealSec=0,mrtElapsedMs=0;
function mrtInternalSec(){return mrtRealSec-5;}
function mrtGetItem(f,b,s){return s>=0?mrtEngine.getBoxItem(f,b,s):[null,null];}
function mrtGetStartSec(){
const el=document.getElementById('mrt_timerStart');
const v=el?parseFloat(el.value):NaN;
return isNaN(v)?0:v;
}
function mrtOpen(){
mrtCacheEls();
mrtLang=DISPLAY_LANG==='EN'?'en':'jp';
const bl=document.getElementById('mrt_btnLang');if(bl)bl.textContent=mrtLang.toUpperCase();
mrtPopulateCustomHL();
const modal=document.getElementById('marathonModal');
modal.classList.add('open');
const rSel=document.getElementById('rank');
const sSel=document.getElementById('seed');
if(rSel){const v=rSel.value.replace('0x','');document.getElementById('mrt_inRank').value=v;}
if(sSel&&sSel.value)document.getElementById('mrt_inSeed').value=sSel.value;
mrtInputChange();
mrtResizeMain();
}
function mrtClose(){mrtResetTimer();document.getElementById('marathonModal').classList.remove('open');}
function mrtResizeMain(){
const tb=document.querySelector('#marathonModal .mrt-topbar');
const ma=document.getElementById('mrt_mainArea');
if(tb&&ma)ma.style.height=(window.innerHeight-tb.offsetHeight)+'px';
}
function mrtCompute(){
const seed=parseInt(document.getElementById('mrt_inSeed').value.trim(),16);
if(isNaN(seed)||seed<0||seed>0x7FFF){document.getElementById('mrt_mainArea').innerHTML='<p style="color:#f44;padding:20px">Invalid Seed</p>';return;}
mrtEngine=new GrottoDetail();
mrtEngine.MapSeed=seed;
mrtEngine.MapRank=parseInt(document.getElementById('mrt_inRank').value,16);
mrtEngine.calculateDetail();
mrtChests=[];
for(let f=0;f<mrtEngine.floorCount;f++){
const d=mrtEngine.di[f];
for(let b=0;b<d[8];b++){
const info=mrtEngine.getBoxInfo(f,b);
mrtChests.push({floor:f,floorNum:f+1,floorLabel:'B'+(f+1)+'F',box:b,rank:info.rank,rankName:MRT_RK_NAMES[info.rank]||'?'});
}
}
mrtMeasureRankWidths();
mrtBuildTable();
mrtRenderRows();
}
function mrtIsVis(cd){
if(mrtFilter==='CUSTOM'&&mrtCustom){const a=mrtCustom[cd.floorNum];return a?a.includes(cd.box):false;}
if(mrtFilter==='SA')return cd.rank>=9;
if(mrtFilter==='AB')return cd.rank===9||cd.rank===8;
return true;
}
function mrtBuildTable(keepScroll){
const area=document.getElementById('mrt_mainArea');
const savedScroll=keepScroll?area.scrollLeft:0;
area.scrollLeft=0;area.scrollTop=0;
mrtVisChests=mrtChests.filter(cd=>mrtIsVis(cd)&&!mrtHiddenChests.has(cd.floor+':'+cd.box));
if(!mrtVisChests.length){area.innerHTML='<p style="color:#555;padding:20px;text-align:center">No chests</p>';return;}
const gridCols='42px '+mrtVisChests.map(cd=>(mrtRankWidths[cd.rank]||100)+'px').join(' ');
let hdr='<div class="mrt-vhdr-time">sec</div>';
for(let ci=0;ci<mrtVisChests.length;ci++){
const cd=mrtVisChests[ci];
const clr=MRT_RK_COLORS[cd.rank]||'#888';
hdr+='<div class="mrt-vhdr" data-ck="'+cd.floor+':'+cd.box+'" style="cursor:pointer"><span class="mrt-vhdr-floor">'+cd.floorLabel+'</span><br><span class="mrt-vhdr-rk" style="color:'+clr+'">'+cd.rankName+(cd.box+1)+'</span></div>';
}
area.innerHTML='<div class="mrt-vgrid" style="grid-template-columns:'+gridCols+'">'+hdr+'<div id="mrt_vbody" style="display:contents"></div></div>';
area.querySelector('.mrt-vgrid').addEventListener('click',function(e){
const cell=e.target.closest('[data-ck]');
if(!cell)return;
mrtHiddenChests.add(cell.dataset.ck);
document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.remove('active'));
mrtBuildTable(true);mrtRenderRows();
});
if(savedScroll)area.scrollLeft=savedScroll;
}
function mrtRenderRows(){
const vb=document.getElementById('mrt_vbody');
if(!vb||!mrtVisChests.length)return;
const is=mrtInternalSec();
const st=Math.max(0,is),ed=Math.max(st+MRT_PREVIEW_ROWS,is+MRT_PREVIEW_ROWS);
const isEN=mrtLang!=='jp';
const cellCls=isEN?'mrt-vcell mrt-vcell-en':'mrt-vcell';
const parts=[];
for(let s=st;s<=ed;s++){
const cur=(s===is),rCls=cur?' mrt-vrow-cur':'';
parts.push('<div class="mrt-vtime',rCls,'">',String(s+5).padStart(3,'0'),'</div>');
for(let ci=0;ci<mrtVisChests.length;ci++){
const cd=mrtVisChests[ci];
const[en,jp]=(s>=0)?mrtGetItem(cd.floor,cd.box,s):[null,null];
const hl=en?MRT_HL[en]:null;
const style=hl?' style="background:'+hl.bg+';color:'+hl.fg+';cursor:pointer"':' style="cursor:pointer"';
const label=mrtLang==='jp'?(jp||en||'\u2014'):(en||'\u2014');
parts.push('<div class="',cellCls,rCls,'" data-ck="',cd.floor,':',cd.box,'"',style,'>',label,'</div>');
}
}
vb.innerHTML=parts.join('');
}
function mrtTimerLoop(){
if(!mrtRunning)return;
mrtElapsedMs=Date.now()-mrtOrigin;
const ns=Math.floor(mrtElapsedMs/1000);
mrtUpdateStopwatch(mrtElapsedMs);
if(ns!==mrtRealSec){mrtRealSec=ns;mrtRenderRows();}
mrtRAF=requestAnimationFrame(mrtTimerLoop);
}
let _mrtTimerText=null,_mrtTimerDisp=null,_mrtBtnStart=null;
function mrtCacheEls(){
_mrtTimerText=document.getElementById('mrt_timerText');
_mrtTimerDisp=document.getElementById('mrt_timerDisp');
_mrtBtnStart=document.getElementById('mrt_btnStart');
}
function mrtUpdateStopwatch(ms){
const isPrep=ms<0;
const absMs=Math.abs(ms);
const s=Math.floor(absMs/1000);
const cs=Math.floor((absMs%1000)/10);
_mrtTimerText.textContent=isPrep?'-'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0')
:String(s).padStart(3,'0')+'.'+String(cs).padStart(2,'0');
_mrtTimerDisp.style.color=isPrep?'#f88':'#0f0';
}
function mrtToggleTimer(){
if(mrtRunning){
mrtRunning=false;
if(mrtRAF){cancelAnimationFrame(mrtRAF);mrtRAF=null;}
_mrtBtnStart.textContent='\u25B6';
_mrtBtnStart.classList.remove('running');
}else{
mrtOrigin=Date.now()-mrtElapsedMs;
mrtRunning=true;
_mrtBtnStart.textContent='\u23F8';
_mrtBtnStart.classList.add('running');
mrtTimerLoop();
}
}
function mrtResetTimer(){
if(mrtRunning){cancelAnimationFrame(mrtRAF);mrtRAF=null;mrtRunning=false;}
const s=mrtGetStartSec();
mrtRealSec=s;mrtElapsedMs=s*1000;
if(_mrtBtnStart){_mrtBtnStart.textContent='\u25B6';_mrtBtnStart.classList.remove('running');}
mrtUpdateStopwatch(mrtElapsedMs);
mrtRenderRows();
}
function mrtSetFilter(f){
mrtFilter=f;mrtCustom=null;mrtHiddenChests.clear();
document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.toggle('active',b.dataset.f===f));
mrtBuildTable();mrtRenderRows();
}
function mrtToggleLang(){
mrtLang=mrtLang==='en'?'jp':'en';
document.getElementById('mrt_btnLang').textContent=mrtLang.toUpperCase();
mrtPopulateCustomHL();
mrtMeasureRankWidths();
mrtBuildTable();mrtRenderRows();
}
function mrtApplyPreset(){
const sel=document.getElementById('mrt_presets');
if(!sel.value)return;
const[rank,seed]=sel.value.split(',');
document.getElementById('mrt_inRank').value=rank;
document.getElementById('mrt_inSeed').value=seed;
const pd=MRT_PRESETS[sel.value];
if(pd&&pd.custom){mrtFilter='CUSTOM';mrtCustom=pd.custom;document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.remove('active'));}
mrtHiddenChests.clear();
mrtResetTimer();mrtCompute();
}
function mrtInputChange(){
const seedVal=document.getElementById('mrt_inSeed').value.trim();
if(seedVal.length<1||/[^0-9A-Fa-f]/.test(seedVal))return;
mrtCustom=null;mrtFilter='ALL';mrtHiddenChests.clear();
document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.toggle('active',b.dataset.f==='ALL'));
mrtResetTimer();mrtCompute();
}
const debouncedMrtInput=debounce(mrtInputChange,200);
const MRT_CUSTOM_HL1={bg:'#801',fg:'#fff',bd:'#c24'};
const MRT_CUSTOM_HL2={bg:'#3f48cc',fg:'#fff',bd:'#66f'};
let mrtCustomHL1Item='',mrtCustomHL2Item='';
const MRT_BUILTIN_HL={};
for(const k in MRT_HL)MRT_BUILTIN_HL[k]=MRT_HL[k];
function mrtPopulateCustomHL(){
if(typeof TableR==='undefined')return;
const seen={},items=[];
TableR.forEach(r=>{if(!seen[r[0]]){seen[r[0]]=true;items.push({en:r[0],jp:r[1]});}});
const isJP=mrtLang==='jp';
items.sort((a,b)=>isJP?a.jp.localeCompare(b.jp,'ja'):a.en.localeCompare(b.en));
['mrt_customHL1','mrt_customHL2'].forEach(id=>{
const sel=document.getElementById(id);
if(!sel)return;
const prev=sel.value;
const label=id.endsWith('1')?'\u2014 HL1 \u2014':'\u2014 HL2 \u2014';
let html='<option value="">'+label+'</option>';
items.forEach(it=>{html+='<option value="'+it.en+'">'+(isJP?it.jp:it.en)+'</option>';});
sel.innerHTML=html;
sel.value=prev;
});
}
function mrtApplyCustomHL(){
[mrtCustomHL1Item,mrtCustomHL2Item].forEach(name=>{
if(!name)return;
if(MRT_BUILTIN_HL[name])MRT_HL[name]=MRT_BUILTIN_HL[name];
else delete MRT_HL[name];
});
mrtCustomHL1Item=document.getElementById('mrt_customHL1').value;
mrtCustomHL2Item=document.getElementById('mrt_customHL2').value;
if(mrtCustomHL1Item)MRT_HL[mrtCustomHL1Item]=MRT_CUSTOM_HL1;
if(mrtCustomHL2Item)MRT_HL[mrtCustomHL2Item]=MRT_CUSTOM_HL2;
mrtRenderRows();
}
window.addEventListener('resize',()=>{if(document.getElementById('marathonModal').classList.contains('open'))mrtResizeMain();});
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
const spawnList=SPAWN_DB[envType]&&SPAWN_DB[envType][floorMR];
if(!spawnList)return;
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
const spawnList=SPAWN_DB[envType]&&SPAWN_DB[envType][floorMR];
if(!spawnList)return"?";
for(const entry of spawnList){
if(entry.length>=3&&atVal>=entry[1]&&atVal<=entry[2]){
const md=MONSTER_DB[entry[0]];
return md?(DISPLAY_LANG!=='EN'?md.jp:md.en):"?";
}
}
return"?";
}
function getMonsterIdByAT(atVal,envType,floorMR){
const spawnList=SPAWN_DB[envType]&&SPAWN_DB[envType][floorMR];
if(!spawnList)return null;
for(const entry of spawnList){
if(entry.length>=3&&atVal>=entry[1]&&atVal<=entry[2])return entry[0];
}
return null;
}
function updateATOnlyMonsters(){
const envType=parseInt(document.getElementById('at_env').value);
const floorMR=parseInt(document.getElementById('at_mr').value);
document.querySelectorAll('.at-dynamic-mon').forEach(el=>{
const atVal=parseInt(el.getAttribute('data-at'));
if(!isNaN(atVal)){
el.textContent=getMonsterNameByAT(atVal,envType,floorMR);
}
});
}
const DW_PATS=[
['R2','連續 2 個稀有','2 Rare','レア×2'],
['R2_3','連續 2 個稀有 (N/N+3)','2 Rare (N/N+3)','レア×2 (チカラめし)'],
['R3','連續 3 個稀有','3 Rare','レア×3'],
['R4','連續 4 個稀有','4 Rare','レア×4'],
['R5','連續 5 個稀有','5 Rare','レア×5'],
['4_in_6','6 個中 4 個稀有','4 in 6 Rare','レア×4 (6連続)'],
['3_in_7','7 個中 3 個稀有','3 in 7 Rare','レア×3 (7連続)'],
['N2','連續 2 個通常','2 Normal','通常×2'],
['N3','連續 3 個通常','3 Normal','通常×3'],
['N4','連續 4 個通常','4 Normal','通常×4'],
['N5','連續 5 個通常','5 Normal','通常×5'],
['4_in_10','10 個中 4 個通常','4 in 10 Normal','通常×4 (10連続)'],
['3_in_10','10 個中 3 個通常','3 in 10 Normal','通常×3 (10連続)']
];
const DW_L={
TW:{
name:md=>md.jp,mainFmt:md=>`${md.jp} (${md.en})`,
drop:l=>'掉'+l,book:(b,l)=>'書'+b+l,
tag:['主怪','跟班1','跟班2'],single:'單組',
corr:n=>`→ 對照上表「${n === 1 ? '敵1組' : n + '組同時'}」表頭列`,
jr:(a,b)=>`判定 ${a}–${b}`,eq5:'＝上表 5 欄',no:'上表未列',
anchor:'Pattern 錨點（＝判定 1 的 AT 步數）：',
more:m=>`（共 ${m} 個，僅列前 12）`,
nf:'AT 38～2037 步內找不到符合的 Pattern 錨點',
bad:'Seed 需為 1～4 位十六進位',
hits:'命中：',leg:'R＝稀有命中　xN＝通常命中　xx＝落空',sep:'、',
nomon:'此 地形×FloorMR 組合無可選主怪。'
},
EN:{
name:md=>md.en,mainFmt:md=>md.en,
drop:l=>l?'D-'+l:'D',book:(b,l)=>'B'+b+l,
tag:['Main','Sup1','Sup2'],single:'Single',
corr:n=>`→ matches the "(${n === 1 ? '1 group' : n + ' groups'})" header row above`,
jr:(a,b)=>`Judg. ${a}–${b}`,eq5:'= 5 cols above',no:'not in table',
anchor:'Pattern anchors (AT step of judgment 1): ',
more:m=>` (${m} total, first 12 shown)`,
nf:'No matching pattern anchor within AT steps 38–2037',
bad:'Seed must be 1–4 hex digits',
hits:'Hits: ',leg:'R = rare hit / xN = normal hit / xx = miss',sep:', ',
nomon:'No selectable main monster for this terrain × FloorMR.'
},
JP:{
name:md=>md.jp,mainFmt:md=>md.jp,
drop:l=>'落'+l,book:(b,l)=>'盗'+b+l,
tag:['メイン','取り巻き1','取り巻き2'],single:'単組',
corr:n=>`→ 上表「${n === 1 ? '敵1組' : n + '組同時'}」の見出し行に対応`,
jr:(a,b)=>`判定 ${a}–${b}`,eq5:'＝上表の5欄',no:'上表対象外',
anchor:'パターン錨点（＝判定1のATステップ）：',
more:m=>`（全 ${m} 件、先頭12件のみ表示）`,
nf:'AT 38～2037 の範囲に一致する錨点なし',
bad:'Seed は16進数 1～4 桁で入力',
hits:'命中：',leg:'R＝レア成立　xN＝通常成立　xx＝不成立',sep:'、',
nomon:'この地形×FloorMRでは選択可能なメインがいません。'
}
};
const DW_CLSC={cr:'#f88',ct:'#39C5BB',cy:'#ffd700',cp:'#c8c',ck:'#cc8'};
const _dwSel={TW:0,EN:0,JP:0};
const _dwTmr={};
function dwSupPool(envType,floorMR){
const raw=(typeof GROTTO_SUPPORT!=='undefined'&&GROTTO_SUPPORT[envType])?(GROTTO_SUPPORT[envType][floorMR]||[]):[];
const out=[],seen=new Set();
for(const e of raw){
if(!Array.isArray(e))continue;
if(typeof e[0]==='string'&&!seen.has(e[0])){seen.add(e[0]);out.push(e[0]);}
for(const x of e){
if(Array.isArray(x)&&typeof x[0]==='string'&&!seen.has(x[0])){seen.add(x[0]);out.push(x[0]);}
}
}
return out;
}
function dwInit(){
['TW','EN','JP'].forEach((L,li)=>{
const patSel=document.getElementById('dw_pat_'+L);
if(patSel){
patSel.innerHTML='<option value="none">----</option>';
DW_PATS.forEach(p=>{
const o=document.createElement('option');
o.value=p[0];
o.textContent=p[1+li];
patSel.appendChild(o);
});
}
dwUpd(L);
});
}
function dwUpd(L){
const $=id=>document.getElementById(id+'_'+L);
const envEl=$('dw_env');
if(!envEl)return;
_dwSel[L]=0;
const envType=parseInt(envEl.value);
const floorMR=parseInt($('dw_mr').value);
const X=DW_L[L];
const monSel=$('dw_mon');
monSel.innerHTML='';
const spawnList=SPAWN_DB[envType]&&SPAWN_DB[envType][floorMR];
if(spawnList)appendSpawnMonsterOptions(monSel,spawnList,X.mainFmt);
const pool=dwSupPool(envType,floorMR);
['dw_sup1','dw_sup2'].forEach(id=>{
const sel=$(id);
if(!sel)return;
sel.innerHTML='<option value="">—</option>';
for(const hx of pool){
const md=MONSTER_DB[hx];
const opt=document.createElement('option');
opt.value=hx;
opt.textContent=md?X.name(md):hx;
sel.appendChild(opt);
}
});
dwRender(L);
}
function dwChanged(L){_dwSel[L]=0;dwRender(L);}
function dwRenderDeb(L){_dwSel[L]=0;clearTimeout(_dwTmr[L]);_dwTmr[L]=setTimeout(()=>dwRender(L),200);}
function dwSelStep(L,i){_dwSel[L]=i;dwRender(L);}
function dwRender(L){
const $=id=>document.getElementById(id+'_'+L);
const out=$('dw_out');
if(!out)return;
const X=DW_L[L];
const monHex=$('dw_mon').value;
if(!monHex){out.innerHTML=`<span style="color:#888;font-size:11px">${X.nomon}</span>`;return;}
const nameOf=hx=>{const md=MONSTER_DB[hx];return md?X.name(md):hx;};
const groups=[{name:nameOf(monHex),color:'#fff',tag:X.tag[0]}];
const s1=$('dw_sup1').value;
const s2=$('dw_sup2').value;
if(s1)groups.push({name:nameOf(s1),color:'#a8f',tag:X.tag[1]});
if(s2)groups.push({name:nameOf(s2),color:'#8cf',tag:X.tag[2]});
const n=groups.length;
const LET=['A','B','C'];
const BOOK_CLS=['','ct','cy','cp','ck'];
const slots=[];
for(let g=0;g<n;g++)slots.push({lbl:X.drop(n>1?LET[g]:''),cls:'cr',g});
for(let b=1;b<=4;b++)
for(let g=0;g<n;g++)slots.push({lbl:X.book(b,n>1?LET[g]:''),cls:BOOK_CLS[b],g});
const seedStr=($('dw_seed')?$('dw_seed').value:'').trim();
const patKey=$('dw_pat')?$('dw_pat').value:'none';
let scanHtml='',st=null;
if(seedStr&&patKey&&patKey!=='none'&&typeof SI_PATTERN_INDICES!=='undefined'){
if(!/^[0-9A-Fa-f]{1,4}$/.test(seedStr)){
scanHtml=`<div style="color:#f66;font-size:11px;margin-bottom:4px">${X.bad}</div>`;
}else{
const seed=parseInt(seedStr,16)>>>0;
const rr=parseInt($('dw_rr').value);
const nr=parseInt($('dw_nr').value);
const lv=Math.min(99,Math.max(1,parseInt($('dw_lv').value)||99));
const tLvs=[lv,lv,lv,lv];
const pats=SI_PATTERN_INDICES[patKey];
const isN=patKey.startsWith('N')||patKey==='4_in_10'||patKey==='3_in_10';
let rng=seed>>>0;
for(let i=0;i<37;i++)rng=lcg(rng);
const matches=[],rngs=[];
for(let step=38;step<=2037;step++){
const sim=siRunBattleSim(rng,n,rr,nr,tLvs,false);
const hits=isN?sim.normHits:sim.rareHits;
if(siMatchesPattern(hits,pats)){matches.push(step);rngs.push(rng);if(matches.length>=60)break;}
rng=lcg(rng);
}
if(!matches.length){
scanHtml=`<div style="color:#f80;font-size:11px;margin-bottom:4px">${X.nf}</div>`;
}else{
const sel=Math.min(_dwSel[L],matches.length-1);
_dwSel[L]=sel;
const seq=siRunBattleSim(rngs[sel],n,rr,nr,tLvs,true).seq;
st=[];
let si=-1;
for(const e of seq){
if(e.type.indexOf('(R)')>=0){si++;st[si]=e.red?'R':'x';}
else if(e.red&&st[si]==='x')st[si]='N';
}
const chips=matches.slice(0,12).map((s,i)=>
`<span onclick="dwSelStep('${L}',${i})" style="cursor:pointer;padding:0 5px;border:1px solid ${i === sel ? '#0f0' : '#555'};border-radius:3px;color:${i === sel ? '#0f0' : '#aaa'};margin:0 3px 2px 0;display:inline-block">${s}</span>`).join('');
const moreTxt=matches.length>12?`<span style="color:#666;font-size:10px">${X.more(matches.length)}</span>`:'';
scanHtml=`<div style="font-size:11px;margin-bottom:4px;color:#0ca">${X.anchor}${chips}${moreTxt}</div>`;
}
}
}
let html=scanHtml+'<div style="margin-bottom:6px;font-size:12px">'+
groups.map((gr,i)=>`<span style="color:#0ff">${n > 1 ? LET[i] : X.single}</span>＝<span style="color:${gr.color}">${gr.name}</span><span style="color:#666;font-size:10px">(${gr.tag})</span>`).join('　')+
`　<span style="color:#888;font-size:11px">${X.corr(n)}</span></div>`;
html+='<table class="h3t sm ctr" style="margin-bottom:4px">';
for(let r=0;r*5<slots.length;r++){
html+='<tr><td class="bg" style="width:18%">'+X.jr(r*5+1,r*5+5)+
(r===0?`<br><span style="color:#0ca;font-size:10px">${X.eq5}</span>`:`<br><span style="color:#666;font-size:10px">${X.no}</span>`)+'</td>';
for(let c=0;c<5;c++){
const s=slots[r*5+c];
let stat='',bg='';
if(st){
const v=st[r*5+c];
if(v==='R'){stat='<br><span class="cr b">R</span>';bg=';background:#2a0a0a';}
else if(v==='N'){stat='<br><span class="cc b">xN</span>';bg=';background:#0a2020';}
else stat='<br><span class="cx">xx</span>';
}
html+=`<td style="padding:4px${bg}"><span class="${s.cls} b">${s.lbl}</span><br><span style="color:${groups[s.g].color};font-size:11px">${groups[s.g].name}</span>${stat}</td>`;
}
html+='</tr>';
}
html+='</table>';
if(st){
const hitR=[],hitN=[];
st.forEach((v,i)=>{if(v==='R')hitR.push(i);else if(v==='N')hitN.push(i);});
const fmt=i=>`<span style="color:${DW_CLSC[slots[i].cls]};font-weight:bold">${slots[i].lbl}</span>·<span style="color:${groups[slots[i].g].color}">${groups[slots[i].g].name}</span>`;
html+=`<div style="font-size:11px;margin-bottom:2px"><span style="color:#0ca">${X.hits}</span><span style="color:#f88;font-weight:bold">R </span>${hitR.length ? hitR.map(fmt).join(X.sep) : '—'}　<span style="color:#ccc;font-weight:bold">N </span>${hitN.length ? hitN.map(fmt).join(X.sep) : '—'}<span style="color:#555;font-size:10px">　${X.leg}</span></div>`;
}
out.innerHTML=html;
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
let d1,d2,d4;
if(userDeft<deft){
d1=target-(pop+4);d2=target-(pop+5);d4=target-(pop+6);
}else{
d1=target-(pop+3);d2=target-(pop+4);d4=target-(pop+5);
}
el.textContent=`${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}`;
});
});
}
const debouncedUpdateBattleAT=debounce(updateBattleAT,100);
const debouncedUpdateSeedInspector=debounce(updateSeedInspector,100);
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
let atmin=-1,atmax=-1;
for(const entry of spawnList){
if(entry[0]===monId&&entry.length>=3){
atmin=entry[1];atmax=entry[2];break;
}
}
if(atmin<0){isSearching=false;restoreBtn();return;}
const md=MONSTER_DB[monId];
const conds=getUltimateConds();
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
<div style="color:#0ca;font-size:12px;margin-bottom:6px;">${ENV_NAMES[monEnvType][1]}Rank ${monFloorMR}｜${md.jp}(${md.en})｜POP=${N}(Zoom=${nVal})｜AT:${atmin}～${atmax}${headerExtra}</div>
${B01}<span id="searchProgress"style="color:#fff;font-weight:bold">0%</span></div><div id="searchGrid"class="search-grid"></div>`;
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
_finalizeATResults(allResults,grid,document.getElementById('at_sortPOP').checked);
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
handleSearchError("AT Monster Search error:",msg,restoreBtn,progressSpan,hitCount);
}
});
}
function _finalizeATResults(results,grid,sortByPOP){
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
const startSeed=rangeData.startSeed;
const endSeed=searchFilterLoc?Math.min(rangeData.endSeed,0x7FFF):rangeData.endSeed;
if(startSeed>endSeed){alert(A08);isSearching=false;restoreBtn();return;}
const patSel=document.getElementById('at_pattern');
const patternName=patSel.options[patSel.selectedIndex].text;
const probSel=document.getElementById('at_threshold');
const probText=probSel.options[probSel.selectedIndex].text;
const resultDiv=document.getElementById('searchResults');
resultDiv.innerHTML=`<div style="color:#aaa;font-size:13px;margin-bottom:8px;">
<div style="color:#f80;font-size:12px;margin-bottom:6px;">${patternName}｜${probText}｜N=${POPIndex}(n=${nVal||0})｜Rank ${rStr}</div>
${B01}<span id="searchProgress"style="color:#fff;font-weight:bold">0%</span></div><div id="searchGrid"class="search-grid"></div>`;
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
_finalizeATResults(allATResults,grid,document.getElementById('at_sortPOP').checked);
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
handleSearchError("AT Pattern Search error:",msg,restoreBtn,progressSpan,hitCount);
}
});
}
function _solverLegend(){
const L=DISPLAY_LANG;
const legends=[
['⚔',L==='EN'?'Falcon Blade':L==='JP'?'はやぶさの剣':'隼劍'],
['🪡',L==='EN'?'Poison Needle':L==='JP'?'どくばり':'毒針'],
['🎯',L==='EN'?'×1.1':L==='JP'?'×1.1':'×1.1'],
['🗡',L==='EN'?'Metal Slime Sword/Spear':L==='JP'?'メタスラの剣／やり':'金屬史萊姆劍／槍'],
['🌀',L==='EN'?'Attribeauty':'風林火山'],
['💨',L==='EN'?'Miss (AT consumed)':L==='JP'?'ミス (AT消費あり)':'Miss (AT 照常消耗)'],
['🔱',L==='EN'?'Poker':L==='JP'?'きしんのまそう':'鬼神槍'],
];
return'<div style="font-size:9px;color:#666;margin:4px 0 2px 0;line-height:1.6;">'
+legends.map(([e,n])=>e+'<span style="color:#888;">'+n+'</span>').join('  ')
+'</div>';
}
function applyJobStats(charNum){
const sel=document.getElementById('si_job'+charNum);
if(!sel||sel.value==='')return;
const job=JOB_STATS[parseInt(sel.value)];
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
function _showMoreCombos(bucketId){
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
else moreEl.textContent='+'+(st.total-st.shown)+' more ▾';
}
}
function _expandCombo(id){
const el=document.getElementById('combo_detail_'+id);
if(!el)return;
if(el.innerHTML){el.style.display=el.style.display==='none'?'block':'none';return;}
const data=window._solverComboMap[id];
if(!data)return;
el.innerHTML=_solverSimTrace(data);
el.style.display='block';
}
function _solverSimTrace(data){
const{combo,killTargets,eggAssign,assign,defend}=data;
if(!killTargets||killTargets.length===0)return'<div style="color:#666;font-size:9px;margin-left:24px;">—</div>';
const instances=[];
for(let ti=0;ti<killTargets.length;ti++){
const t=killTargets[ti];
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[t.hex]:null;
const baseName=_monDispName(t.hex);
for(let c=0;c<t.count;c++){
instances.push({name:t.count>1?baseName+(c+1):baseName,
hex:t.hex,hp:m?m.s[0]:9999,hpLow:m?Math.floor(m.s[0]*0.8):9999,death:t.death!==undefined?t.death:100,
alive:true,groupIdx:ti,mon:m});
}
}
if(!document.getElementById('si_useStats')?.checked){
return'<div style="color:#888;font-size:9px;margin-left:24px;">中立模式（未勾選 Stats）：不採用任何攻擊力假設，逐招上下界條件待加入</div>';
}
const chars=_readCharStats();
const inlineFource=combo.find(v=>v.at===0&&typeof _FOURCE_EL!=='undefined'&&_FOURCE_EL[v.jp]);
const _charLabel=(c)=>{
if(!c)return'?';
if(c.job!==null&&c.job!==undefined&&typeof JOB_STATS!=='undefined'&&JOB_STATS[c.job]){
return DISPLAY_LANG==='EN'?JOB_STATS[c.job].en:JOB_STATS[c.job].jp;
}
return'角色'+(c.slot||'?');
};
const fEls=inlineFource?(_FOURCE_EL[inlineFource.jp]||[]):null;
let fourceOn=false;
let _traceMainKilled=false;
let html='<div style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:4px;margin-top:1px;">';
const _hpRange=(i)=>'HP'+Math.max(0,i.hpLow)+'~'+i.hp;
html+='<div style="color:#888;">場上: '+instances.map(i=>'<b>'+i.name+'</b> '+_hpRange(i)).join(' / ')+'</div>';
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci];
const char=chars[assign?assign[ci]:ci]||chars[0]||{stats:{}};
const whoTag='<span style="color:#6cf;font-size:8px;">'+_charLabel(char)+'</span> ';
const sk=_skOf(action.jp);
const alive=instances.filter(i=>i.alive);
if(action.jp==='みのがす'){
const removed=alive.filter(i=>i.death>0&&(i.groupIdx>0||_traceMainKilled));
for(const i of removed)i.alive=false;
const mainStuck=alive.some(i=>i.death>0&&i.groupIdx===0&&!_traceMainKilled);
const left=instances.filter(i=>i.alive);
html+='<div>第'+(ci+1)+'招 '+whoTag+'<span style="color:#0ff;">みのがす</span> → ';
html+=removed.length>0?removed.map(i=>i.name).join(',')+' mercy移除':'無效';
if(mainStuck)html+=' <span style="color:#f80;">(主怪未殺,無法mercy放走)</span>';
html+=' → 剩: '+(left.length>0?left.map(i=>'<b>'+i.name+'</b> '+_hpRange(i)).join(' / '):'✓清場')+'</div>';
continue;
}
if(action.jp==='おうえん'){
const tgtCI=eggAssign?Object.keys(eggAssign).find(k=>+k>ci):null;
const tgtName=tgtCI?(combo[+tgtCI]?.jp||'?'):'?';
html+='<div>第'+(ci+1)+'招 '+whoTag+'<span style="color:#ff0;">おうえん</span> → 加成給 '+tgtName+'</div>';
continue;
}
if(inlineFource&&action.jp===inlineFource.jp&&!fourceOn){
fourceOn=true;
html+='<div>第'+(ci+1)+'招 '+whoTag+'<span style="color:#f80;">'+action.jp+'</span> (fource啟動)</div>';
continue;
}
if(!sk||alive.length===0){
html+='<div>第'+(ci+1)+'招 '+whoTag+action.jp+'</div>';
continue;
}
const mul=(eggAssign&&eggAssign[ci])?eggAssign[ci]:1;
const curFEls=fourceOn?fEls:null;
const hits=action.hits||1;
const tgt=(sk.target==='A'||sk.target==='RA')?'A':(sk.target==='G'||sk.target==='RG')?'G':'S';
const mulStr=mul>1?'<span style="color:#ff0;">×'+mul+'</span>':'';
let details='';
const hitTargets=tgt==='A'?alive.slice():
tgt==='G'?(()=>{
if(action.tgtGroup!==undefined)return alive.filter(i=>i.groupIdx===action.tgtGroup);
return _largestGroupOf(alive,'groupIdx');})():
(()=>{
if(_isMetalActionSk(action,sk)){
const mt=_findMetalInst(alive);
if(mt)return[mt];
}
if(action.tgtGroup!==undefined&&!action.soloGroup){
const t=alive.filter(i=>i.groupIdx===action.tgtGroup).sort((a,b)=>b.hp-a.hp)[0];
if(t)return[t];
}
return[alive.slice().sort((a,b)=>b.hp-a.hp)[0]];
})();
const repInst=hitTargets.reduce((a,b)=>(b&&(!a||b.hp>a.hp))?b:a,null);
const repHpHigh=repInst?repInst.hp:0;
const repHpLow=repInst?repInst.hpLow:0;
for(const inst of hitTargets){
const isMetalTgt=(typeof _METAL_MONSTERS!=='undefined')&&_METAL_MONSTERS.has(_monHex(inst.hex));
const exec=_checkMetalExecution(action.jp,inst.hex);
if(exec){
if(exec.isValid){
details+=inst.name+': HP'+inst.hp+'→<span style="color:#f44;">💀金屬必殺</span> ';
inst.hp=0;inst.hpLow=0;inst.alive=false;
}else{
details+=inst.name+': <span style="color:#f44;">✗禁止(對非金屬無效)</span> ';
}
continue;
}
let dMin,dMax;
if(isMetalTgt){
const elemental=!!(sk.el&&sk.el>0);
const me=(typeof _metalEffect==='function')&&_metalEffect(sk.metal||0,(typeof _weaponMetalFlag==='function'?_weaponMetalFlag(action.equip):0));
if(!elemental&&me){dMin=1*hits;dMax=2*hits;}else{dMin=0;dMax=0;}
}else{
const r=calcSkillDamage(sk,char.stats,inst.hex,curFEls,_weaponTypeMul(action.equip,inst.hex));
dMin=r?Math.floor(r.min*hits*mul):0;
dMax=r?Math.floor(r.max*hits*mul):0;
}
const hpAfterMax=inst.hp-dMin;
const hpAfterMin=inst.hpLow-dMax;
const dead=hpAfterMax<=0?'💀確殺':hpAfterMin<=0?'⚠可能殺':'';
details+=inst.name+': '+_hpRange(inst)+'→<span style="color:'+(hpAfterMax<=0?'#f44':hpAfterMin<=0?'#f80':'#8f8')+';">'+hpAfterMin+'~'+hpAfterMax+'</span>'+dead+' ';
inst.hp-=dMin;
inst.hpLow-=dMax;
if(inst.hp<=0){inst.alive=false;if(inst.groupIdx===0)_traceMainKilled=true;}
}
const left=instances.filter(i=>i.alive);
html+='<div>第'+(ci+1)+'招 '+whoTag+'<span style="color:#ccc;">'+action.jp+'</span>'+mulStr+' ['+tgt+'] '+details;
html+='→ 剩: '+(left.length>0?left.map(i=>'<b>'+i.name+'</b> '+_hpRange(i)).join(' / '):'✓清場')+'</div>';
if(repInst){
const repIsMetal=(typeof _METAL_MONSTERS!=='undefined')&&_METAL_MONSTERS.has(_monHex(repInst.hex));
if(!repIsMetal)html+='<div style="margin-left:10px;font-size:8px;">↳ '+_solverHintStr(sk,repInst.hex,hits,repHpHigh,repHpLow,curFEls,mul,_weaponTypeMul(action.equip,repInst.hex))+'</div>';
}
}
if(defend&&defend.length){
html+='<div style="color:#789;margin-top:1px;">防禦: '+defend.map(i=>_charLabel(chars[i])).join(', ')+'</div>';
}
html+='</div>';
return html;
}
function siBuildSeqHtml(seqArray){
let items=seqArray.map(item=>{
let color=item.red?'#f44':'#fff';
let fw=item.red?'bold':'normal';
let bg=item.steal?'background:rgba(255,150,0,0.4);padding:0 2px;border-radius:3px;':'';
return`<span style="color:${color};font-weight:${fw};${bg}" title="${item.type}">${item.val}</span>`;
});
return`<div style="margin-top:6px;font-size:11px;color:#aaa;line-height:1.6;">`+C24+`: [ ${items.join(', ')} ]</div>`;
}
function initSeedInspectorUI(){
const mrSel=document.getElementById('si_mr');
if(mrSel){
mrSel.options.length=0;
for(let i=1;i<=12;i++){
mrSel.options.add(new Option(i,i));
}
mrSel.value=2;
}
for(let b=1;b<=4;b++){
const tSel=document.getElementById(`si_t${b}`);
if(tSel){
tSel.options.length=0;
tSel.options.add(new Option('--',0));
for(let i=1;i<=99;i++){
tSel.options.add(new Option(i,i));
}
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
const groupSize=parseInt(document.getElementById('si_group_size').value)||1;
const rareRarity=parseInt(document.getElementById('si_rare_rate').value);
const normRarity=parseInt(document.getElementById('si_norm_rate').value);
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
const mapDeft=(typeof calcDeftness==='function')?calcDeftness(atN1_val):0;
let actualCost=(userDeft>=mapDeft)?3:4;
const canRound2=userDeft>=mapDeft;
let totalStartCost=actualCost;
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
if(step>=N+totalStartCost){
foundOffset=step-(N+totalStartCost);
foundSequence=siRunBattleSim(rngSnapshot,groupSize,rareRarity,normRarity,tLvs,true).seq;
break;
}
}
}
patternMsg=foundOffset!==-1?
C20+` <span class="si-highlight" style="color:#0f0;">AT +${N+totalStartCost+foundOffset}</span>`:`<span style="color:#888;">${scanMax}`+C21+`</span>`;
}
let battleStr="";
let seqHtml="";
if(pType>0&&foundOffset!==-1){
let target=N+totalStartCost+foundOffset;
let d1=target-(N+totalStartCost);
let d2=target-(N+totalStartCost+1);
let d4=target-(N+totalStartCost+2);
seqHtml=siBuildSeqHtml(foundSequence);
const showCombos=d1>0&&d1<=970;
const hexId=_monHex(monId);
const mainMon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
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
_eachPoolEntry(_rawPool,(a)=>{if(!seenHex.has(a[0])){seenHex.add(a[0]);out.push([a[0],a[1],a[2]]);}});
return out;
})();
const monNameFn=_monDispName;
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
_eachPoolEntry(_rawPool,(a)=>{if(!wByHex.has(a[0])){wByHex.set(a[0],{num:a[3]||0,min:a[1],max:a[2]});wDen=wDen||a[4]||0;}});
const P1=(!isAlone&&mainEntry&&mainEntry[5]>0)?mainEntry[4]/mainEntry[5]:0;
const P2=(!isAlone&&mainEntry&&mainEntry[7]>0)?mainEntry[6]/mainEntry[7]:0;
const P0=Math.max(0,1-P1-P2);
for(let mR=mainMin;mR<=mainMax;mR++){
{const[M]=_trimGroups([mR],battleMax);_pAdd(_kA(M),P0*pMain);}
if(wDen>0&&(P1>0||P2>0)){
if(P1>0)for(const[hx,w]of wByHex){
if(!w.num)continue;
const pS=w.num/wDen,nC=w.max-w.min+1;
for(let sR=w.min;sR<=w.max;sR++){
const[M,S]=_trimGroups([mR,sR],battleMax);
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
const[M,SA,SB]=_trimGroups([mR,aR,bR],battleMax);
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
const d0SC=sups.filter(g=>g.death===0).reduce((s,g)=>s+g.count,0);
const dG0SC=sups.filter(g=>g.death>0).reduce((s,g)=>s+g.count,0);
if(main.death>0){
if(main.count>=2||dG0SC>0)
return{type:'kill_mercy_clear',effMon:1+d0SC,postAlive:d0SC};
return{type:'kill_all',effMon:T,postAlive:0};
}
if(dG0SC>0)return{type:'mercy_first',effMon:main.count+d0SC,postAlive:main.count+d0SC};
return{type:'kill_all',effMon:T,postAlive:0};
}
function _addResult(T,effMon,desc,monGroups){
if(!resultsByT.has(T))resultsByT.set(T,{mixes:[],flee:[]});
const bucket=resultsByT.get(T);
if(effMon<0){bucket.flee.push(desc);return;}
bucket.mixes.push({effMon,desc,monGroups});
}
const seenMainOnly=new Set();
for(let raw=mainMin;raw<=mainMax;raw++){
const[M]=_trimGroups([raw],battleMax);
if(M<2||seenMainOnly.has(M))continue;
seenMainOnly.add(M);
const mgA=[{hex:hexId,count:M,death:mainDeath,isMain:true}];
const planA=_derivePlan(mgA);
if(planA.type==='kill_mercy_clear'){
_addResult(M,planA.effMon,`<span style="color:#ccc">${monNameFn(hexId)}×${M}</span><span style="color:#0f0"> ①殺1主②m放其餘→×${planA.effMon}</span>${_pFmt(_kA(M))}`,mgA);
_addResult(M,M,`<span style="color:#ccc">${monNameFn(hexId)}×${M}</span><span style="color:#fa6"> 全殺→×${M}</span>${_pFmt(_kA(M))}`,mgA.map(g=>({...g,death:0})));
}else{
_addResult(M,M,`<span style="color:#ccc">${monNameFn(hexId)}×${M}</span>${_pFmt(_kA(M))}`,mgA);
}
}
if(canSup1){
for(const sup of supportPool){
const supHex=sup[0],supMin=sup[1],supMax=sup[2];
const supName=monNameFn(supHex);
const supMon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[supHex]:null;
const supHP=supMon?supMon.s[0]:0;
const supDeath=supMon?supMon.s[12]:100;
const sameAsMain=supHex===hexId;
const seen=new Set();
for(let mR=mainMin;mR<=mainMax;mR++){
for(let sR=supMin;sR<=supMax;sR++){
const[M,S]=_trimGroups([mR,sR],battleMax);
if(S===0)continue;
const key=M+'_'+S;
if(seen.has(key))continue;
seen.add(key);
const T=M+S;
const sLbl=S>1?supName+'×'+S:supName;
const sameTag=sameAsMain?'<span style="color:#0f0"> 同種</span>':'';
const mg=[{hex:hexId,count:M,death:mainDeath,isMain:true},
{hex:supHex,count:S,death:supDeath,isMain:false}];
const plan=_derivePlan(mg);
if(plan.type==='kill_all'){
if(supHP>500){
_addResult(T,-1,`<span style="color:#a8f">+${sLbl}</span>${sameTag} <span style="color:#f44">HP${supHP}</span>${_pFmt(_kB(supHex, M, S))}`);
}else{
_addResult(T,T,`<span style="color:#a8f">+${sLbl} HP${supHP}</span>${sameTag}${_pFmt(_kB(supHex, M, S))}`,mg);
}
}else if(plan.type==='mercy_first'){
_addResult(T,plan.effMon,
`<span style="color:#a8f">+${sLbl}</span>${sameTag}<span style="color:#0f0">①m②殺主→×${plan.effMon}</span>${_pFmt(_kB(supHex, M, S))}`,mg);
}else{
const lbl=plan.postAlive>0?'①殺主②m③清場':'①殺主②m';
_addResult(T,plan.effMon,
`<span style="color:#a8f">+${sLbl}</span>${sameTag}<span style="color:#0f0">${lbl}→×${plan.effMon}</span>${_pFmt(_kB(supHex, M, S))}`,mg);
}
if(plan.type!=='kill_all'&&!(supHP>500)){
_addResult(T,T,`<span style="color:#a8f">+${sLbl} HP${supHP}</span>${sameTag}<span style="color:#fa6"> 全殺→×${T}</span>${_pFmt(_kB(supHex, M, S))}`,mg.map(g=>({...g,death:0})));
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
const mA=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[sA[0]]:null;
const mB=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[sB[0]]:null;
const sameA=sA[0]===hexId,sameB=sB[0]===hexId;
const twoSameSup=sA[0]===sB[0];
const hA=mA?mA.s[0]:0,hB=mB?mB.s[0]:0;
const dA=mA?mA.s[12]:100,dB=mB?mB.s[12]:100;
const seen=new Set();
for(let mR=mainMin;mR<=mainMax;mR++){
for(let aR=sA[1];aR<=sA[2];aR++){
for(let bR=sB[1];bR<=sB[2];bR++){
const[M,SA,SB]=_trimGroups([mR,aR,bR],battleMax);
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
const sameTag=(sameA||sameB||twoSameSup)?'<span style="color:#0f0"> 同種</span>':'';
const fleeHP=mg.some(g=>!g.isMain&&g.death===0&&
((g.hex===sA[0]&&hA>500)||(g.hex===sB[0]&&hB>500)));
if(fleeHP&&(plan.type==='kill_all'||plan.postAlive>0)){
_addResult(T,-1,`<span style="color:#a8f">+${lA}+${lB}</span>${sameTag}${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`);
}else if(plan.type==='kill_all'){
_addResult(T,plan.effMon,`<span style="color:#a8f">+${lA}+${lB}</span>${sameTag}${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg);
}else if(plan.type==='mercy_first'){
_addResult(T,plan.effMon,
`<span style="color:#a8f">+${lA}+${lB}</span>${sameTag}<span style="color:#0f0">①m②殺主→×${plan.effMon}</span>${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg);
}else{
const lbl=plan.postAlive>0?'①殺主②m③清場':'①殺主②m';
_addResult(T,plan.effMon,
`<span style="color:#a8f">+${lA}+${lB}</span>${sameTag}<span style="color:#0f0">${lbl}→×${plan.effMon}</span>${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg);
}
if(plan.type!=='kill_all'&&!(hA>500||hB>500)){
_addResult(T,T,`<span style="color:#a8f">+${lA}+${lB}</span>${sameTag}<span style="color:#fa6"> 全殺→×${T}</span>${_pFmt(_kC(sA[0], SA, sB[0], SB, M))}`,mg.map(g=>({...g,death:0})));
}
}
}
}
}
}
}
window._siBuckets={d1,d2,d4,monId,mapDeft,canRound2,hexId,mainDeath,resultsByT,useJP};
const _batBtn=(val,bk,lbl)=>`<span onclick="_siShowBucket('${bk}')" title="敵怪 ${lbl} 推薦組合" style="color:#fa0;font-weight:bold;font-size:15px;cursor:pointer;text-decoration:underline dotted;padding:0 3px;">${siFormatAT(val)}</span>`;
battleStr=`<div style="margin:2px 0;">${BATTLE_LABEL} ${_batBtn(d1, 'd1', '×1')} / ${_batBtn(d2, 'd2', '×2-3')} / ${_batBtn(d4, 'd4', '×4-5')}</div>`
+`<div style="color:#0aa;font-size:9px;margin:1px 0 0 0;">▸ 點 AT 值查看該怪數的推薦組合</div>`;
}else if(d1===0){
battleStr+=`<div style="margin:2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">0</span> <span style="color:#888;font-size:10px;">×1</span></div>`
+_solverRender(0,[{hex:hexId,count:1,death:mainDeath,isMain:true}],monId,mapDeft);
}
battleStr+=`<div style="color:#888;font-size:11px;margin-top:3px;">`+C22+`</div>`
+`<div style="margin-top:3px;">${seqHtml}</div>`;
}else{
let abs_1=N+totalStartCost;
let abs_2=abs_1+1;
let abs_4=abs_1+2;
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
let DropThreshold=Math.floor(32768/rareRarity);
let firstThiefLv=tLvs[0]>0?tLvs[0]:99;
const effectiveRate=Math.floor((rareRarity*100)/firstThiefLv);
const ThiefThreshold=Math.floor(32767/effectiveRate)+1;
const resBox=document.getElementById('si_at_results');
resBox.innerHTML=`
<div style="display:flex;justify-content:space-between;">
<span>AT ${N}:<span class="si-highlight">${atN_val}</span>→${monName}</span>
<span style="font-size:11px;">${patternMsg}</span>
</div>
<div>AT ${N+1}:<span style="color:#39C5BB;">${atN1_val}</span>➔`+G27+`:<span class="si-highlight">${mapDeft}</span></div>
<div style="margin-top:5px;padding-top:5px;border-top:1px dashed #335;">
${battleStr}
</div>`;
const targetBox=document.getElementById('si_target_results');
targetBox.innerHTML=`
<div>AT<span style="color:#fff;">${targetTotalStep}</span>:<span class="si-highlight"style="color:#f44;font-size:15px;">${atTarget_val}</span></div>
<div style="font-size:11px;margin-top:5px;color:#ccc;">
`+C25+`(≤${DropThreshold}):${atTarget_val<=DropThreshold?'✅ YES':'❌ NO'}<br>
`+C26+`(Lv${firstThiefLv}≤${ThiefThreshold}):${atTarget_val<=ThiefThreshold?'✅ YES':'❌ NO'}
</div>`;
}
function openSeedInspector(){
document.getElementById('seedInspectorModal').style.display='flex';
updateSeedInspector();
}
function closeSeedInspector(e){
if(!e||e.target.className==='modal-close'){
document.getElementById('seedInspectorModal').style.display='none';
}
}
let _siSolveGen=0;
let _siSolveSeq=0;
const _siSolveQueue=[];
const _siSolveBusy=new Map();
function _siPoolIdleTake(){
const p=_dq9Pool;
if(!p||p.idle.length===0)return-1;
const a=_dq9Active;
if(a&&!a.finished&&a.queue.length>0)return-1;
return p.idle.pop();
}
function _siSolveDispatch(){
while(_siSolveQueue.length>0){
const wi=_siPoolIdleTake();
if(wi<0)return;
const t=_siSolveQueue.shift();
_siSolveBusy.set(wi,t);
_dq9Pool.workers[wi].postMessage(t.msg);
}
}
function _siSolveHandle(workerIdx,m){
const t=_siSolveBusy.get(workerIdx);
if(!t||m.solveId!==t.solveId)return;
_siSolveBusy.delete(workerIdx);
const p=_dq9Pool;
if(p&&p.idle.indexOf(workerIdx)===-1)p.idle.push(workerIdx);
_poolDispatch();
if(m.type==='solveDone')t.resolve(m);
else t.reject(new Error(m.message||'Solver Worker error'));
}
function _siSolveTask(render,options,idBase,bucketBase){
const pool=getSearchWorkerPool();
if(!pool)return Promise.reject(new Error('Worker pool unavailable'));
const solveId=++_siSolveSeq;
return new Promise((resolve,reject)=>{
_siSolveQueue.push({solveId,resolve,reject,msg:{
type:'solve',solveId,lang:DISPLAY_LANG,
dom:{si_useStats:!!options.useStats,si_multiPlayer:!!options.multiPlayer},
chars:options.chars,render,idBase,bucketBase
}});
_siSolveDispatch();
});
}
function _siSolveReplaceWorker(wi){
const p=_dq9Pool;
if(!p)return;
try{p.workers[wi].onmessage=null;p.workers[wi].onerror=null;p.workers[wi].terminate();}catch(e){}
const w=new Worker(_dq9GetBlobURL());
w.onmessage=(e)=>_poolHandleMessage(wi,e.data);
w.onerror=(e)=>_poolHandleFatal(wi,e);
p.workers[wi]=w;
const a=_dq9Active;
if(a&&!a.finished&&a._retryJob)w.postMessage({type:'job',gen:a.gen,job:a._retryJob});
if(p.idle.indexOf(wi)===-1)p.idle.push(wi);
}
function _siSolveCancelAll(reason){
_siSolveGen++;
const err=new Error(reason||'Solver cancelled');
for(const t of _siSolveQueue)t.reject(err);
_siSolveQueue.length=0;
if(_siSolveBusy.size>0){
for(const[wi,t]of _siSolveBusy){t.reject(err);_siSolveReplaceWorker(wi);}
_siSolveBusy.clear();
_poolDispatch();
}
}
function _siSolveAbortAll(reason){
const err=new Error(reason||'Worker pool lost');
for(const t of _siSolveQueue)t.reject(err);
_siSolveQueue.length=0;
for(const t of _siSolveBusy.values())t.reject(err);
_siSolveBusy.clear();
}
function _siSolveRequeueBusy(){
if(_siSolveBusy.size===0)return;
for(const[wi,t]of _siSolveBusy){_siSolveQueue.unshift(t);_siSolveReplaceWorker(wi);}
_siSolveBusy.clear();
}
function _siSolveTaskMain(render,idBase,bucketBase){
window._solverComboId=idBase;
window._solverBucketId=bucketBase;
return _solverRender(render.bat,render.monGroups,render.monId,render.mapDeft,render.canRound2);
}
const _siSolverOptionsSnapshot=()=>({
chars:_readCharStats(),
useStats:!!document.getElementById('si_useStats')?.checked,
multiPlayer:!!document.getElementById('si_multiPlayer')?.checked
});
const _siD1Task=(b)=>({
bat:b.d1,
monGroups:[{hex:b.hexId,count:1,death:b.mainDeath,isMain:true}],
monId:b.monId,
mapDeft:b.mapDeft,
canRound2:b.canRound2
});
function _siEnsureSubmodal(){
if(document.getElementById('si_submodal'))return;
const ov=document.createElement('div');
ov.id='si_submodal';
ov.style.cssText='display:none;position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.78);align-items:flex-start;justify-content:center;padding:18px;overflow:auto;';
ov.onclick=(e)=>{if(e.target===ov)_siCloseBucket();};
ov.innerHTML='<div onclick="event.stopPropagation()" style="background:#0a0a1a;border:1px solid #0ff;border-radius:12px;max-width:920px;width:100%;max-height:90vh;overflow:auto;padding:14px;box-shadow:0 0 24px rgba(0,255,255,0.25);">'
+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;position:sticky;top:0;background:#0a0a1a;padding-bottom:6px;border-bottom:1px solid #224;">'
+'<span id="si_submodal_title" style="color:#0ff;font-size:14px;font-weight:bold;"></span>'
+'<span onclick="_siCloseBucket()" style="cursor:pointer;color:#999;font-size:22px;line-height:1;padding:0 4px;">&times;</span>'
+'</div><div id="si_submodal_body"></div></div>';
document.body.appendChild(ov);
}
function _siCloseBucket(){
_siSolveCancelAll('Solver view closed');
const ov=document.getElementById('si_submodal');
if(ov){ov.style.display='none';const b=document.getElementById('si_submodal_body');if(b)b.innerHTML='';}
}
function _siShowBucket(bucket){
const b=window._siBuckets;
if(!b)return;
_siSolveCancelAll('Superseded by a new Solver view');
const viewGen=_siSolveGen;
_siEnsureSubmodal();
window._solverComboMap={};window._solverComboId=0;window._solverBucketId=0;window._solverBuckets={};
let html=(typeof _solverLegend==='function'?_solverLegend():''),title='';
const tasks=[],taskElementIds=[];
const _hdr=(bat,tLbl)=>`<div style="margin:6px 0 2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">${siFormatAT(bat)}</span> <span style="color:#888;font-size:10px;">${tLbl}</span></div>`;
const _queueTask=(task)=>{
const id='si_solver_task_'+viewGen+'_'+tasks.length;
tasks.push(task);taskElementIds.push(id);
html+=`<div id="${id}"><div style="color:#39C5BB;font-size:10px;margin-left:16px;">Solver 計算中…</div></div>`;
};
if(bucket==='d1'){
title=`${BATTLE_LABEL} ${siFormatAT(b.d1)}｜敵怪 ×1`;
html+=_hdr(b.d1,'×1');
_queueTask(_siD1Task(b));
}else{
const Ts=bucket==='d2'?[2,3]:[4,5];
const headBat=bucket==='d2'?b.d2:b.d4;
const headLbl=bucket==='d2'?'×2-3':'×4-5';
title=`${BATTLE_LABEL} ${siFormatAT(headBat)}｜敵怪 ${headLbl}`;
let any=false;
for(const T of Ts){
const entry=b.resultsByT&&b.resultsByT.get(T);
if(!entry||(entry.mixes.length===0&&entry.flee.length===0))continue;
any=true;
const tBat=T<=3?b.d2:b.d4;
html+=_hdr(tBat,'×'+T);
for(const m of entry.mixes){
html+=`<div style="font-size:9px;margin-left:16px;color:#888;line-height:1.4;margin-bottom:1px;">${m.desc}</div>`;
_queueTask({bat:tBat,monGroups:m.monGroups||[{hex:b.hexId,count:m.effMon,death:b.mainDeath,isMain:true}],monId:b.monId,mapDeft:b.mapDeft,canRound2:b.canRound2});
}
if(entry.flee.length>0)html+=`<div style="font-size:9px;margin-left:16px;"><span style="color:#f44;">逃跑:</span> ${entry.flee.join(' · ')}</div>`;
}
if(!any)html+='<div style="color:#666;font-size:11px;margin-left:16px;">（此情形無對應形態）</div>';
}
document.getElementById('si_submodal_title').innerHTML=title;
document.getElementById('si_submodal_body').innerHTML=html;
document.getElementById('si_submodal').style.display='flex';
if(tasks.length===0)return;
const options=_siSolverOptionsSnapshot();
const ID_SPAN=100000,BK_SPAN=1000;
const _fill=(i,htmlStr)=>{
const el=document.getElementById(taskElementIds[i]);
if(el)el.innerHTML=htmlStr||'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
};
const _mergeState=(m)=>{
if(m.comboMap)Object.assign(window._solverComboMap,m.comboMap);
if(m.buckets)Object.assign(window._solverBuckets,m.buckets);
};
const pool=getSearchWorkerPool();
if(!pool){
let i=0;
const step=()=>{
if(viewGen!==_siSolveGen||i>=tasks.length)return;
_fill(i,_siSolveTaskMain(tasks[i],i*ID_SPAN,i*BK_SPAN));
i++;setTimeout(step,0);
};
setTimeout(step,0);
return;
}
tasks.forEach((task,i)=>{
_siSolveTask(task,options,i*ID_SPAN,i*BK_SPAN).then((m)=>{
if(viewGen!==_siSolveGen)return;
_mergeState(m);
_fill(i,m.html);
}).catch((e)=>{
if(viewGen!==_siSolveGen)return;
console.warn('[Solver] Worker solve 失敗,該任務退回主執行緒:',e&&e.message);
setTimeout(()=>{
if(viewGen!==_siSolveGen)return;
_fill(i,_siSolveTaskMain(task,i*ID_SPAN,i*BK_SPAN));
},0);
});
});
}
