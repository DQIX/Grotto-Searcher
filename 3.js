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
function getSearchWorkerPool(){
if(_dq9Pool)return _dq9Pool;
if(!_dq9PreflightDone||_dq9PoolFailed||typeof Worker==='undefined')return null;
try{
const count=getWorkerCount();
const workers=[];
for(let i=0;i<count;i++){
const w=new Worker('5.js');
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
if(!a||!p||a.finished)return;
while(a.queue.length>0&&p.idle.length>0){
const chunkId=a.queue.shift();
const wi=p.idle.pop();
a.inFlight.set(chunkId,0);
p.workers[wi].postMessage(Object.assign({type:'chunk',gen:a.gen},a.chunks[chunkId]));
}
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
}
function _poolHandleMessage(workerIdx,m){
const p=_dq9Pool;
if(!m)return;
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
for(const w of _dq9Pool.workers)w.terminate();
_dq9Pool=null;
_dq9PoolFailed=true;
_poolFinish(a,null,'_RETRY_MAIN_THREAD_');
}
},3000);
}
function _poolHandleFatal(workerIdx,e){
console.error('Search worker fatal error:',e&&(e.message||e));
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
const cur=dedupMap.get(it.seed);
if(!cur||_uspDedupBetter(it,cur))dedupMap.set(it.seed,it);
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
isSearching=false;
restoreBtn();
if(dedupMap){
const arr=[...dedupMap.values()];
arr.sort(sortCmp);
const shown=(sortTopN!==undefined&&sortTopN!==Infinity)?arr.slice(0,sortTopN):arr;
const fragment=document.createDocumentFragment();
for(const it of shown)fragment.appendChild(materializeResultItem(it));
if(fragment.childNodes.length>0)grid.appendChild(fragment);
let doneTxt=searchDoneMsg(hitCount);
if(arr.length!==hitCount)doneTxt+=' · '+arr.length;
progressSpan.textContent=doneTxt;
}else if(sortBucket){
sortBucket.sort(sortCmp);
const shown=sortBucket.slice(0,sortTopN);
const fragment=document.createDocumentFragment();
for(const it of shown)fragment.appendChild(materializeResultItem(it));
if(fragment.childNodes.length>0)grid.appendChild(fragment);
progressSpan.textContent=searchDoneMsg(hitCount);
}else{
progressSpan.textContent=searchDoneMsg(hitCount);
}
if(config.onDoneExtra)config.onDoneExtra(d);
},
onError:(msg)=>{
console.error("搜尋過程發生錯誤：",msg);
alert(A02);
searchCancel=true;
isSearching=false;
restoreBtn();
progressSpan.textContent=searchDoneMsg(hitCount);
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
}else{
if(!(conds.depth||conds.lv||conds.elist||conds.onlyMon||conds.location||conds.boss)){alert(A14);return;}
}
const useDepth2=(mode==='floor'&&!(conds.elist||conds.onlyMon)&&!!conds.depth);
const allRanksOn=document.getElementById('searchAllRanks').checked;
const dedupBySeed=(useDepth2&&parseInt(conds.depth)>=15&&allRanksOn);
const searchOnlyWithD=document.getElementById('searchOnlyWithD').checked;
executeSharedSearch({
btnId:'searchBtnSpecific',
btnText:'🎯 Search',
btnBg:'linear-gradient(135deg,#0ff,#08a)',
btnColor:'#000',
stopText:'🛑 STOP',
emptyRankMsg:B07,
sortTopN:(mode==='floor'&&!useDepth2)?Infinity:50,
sortDesc:slowest,
dedupBySeed,
validateConds:()=>true,
condsTransform:(c)=>{
if(USP_FAST_MODES[c.anomaly])c.anomaly='';
if(useDepth2){c.depth2=c.depth;c.depth='';}
},
filterRanks:(ranksToSearch,conds)=>{
const allRanks=document.getElementById('searchAllRanks').checked;
let ranks=(allRanks&&conds.depth2&&parseInt(conds.depth2)<=14)?[0xDD]:ranksToSearch;
return sharedRankFilter(ranks,conds,false);
},
processor:'fastest',
params:{searchOnlyWithD,fastestMode:mode,showFloors,slowest},
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
function QuickloadSearch(){
const targetItem=document.getElementById('searchItem').value;
const b9fItems=["Sainted soma","Yggdrasil leaf","Reset stone","S weapon"];
const isB9F=b9fItems.includes(targetItem);
if(["Cannibox","Mimic","Pandora's box"].includes(targetItem)){alert(A03);return;}
const millionaireItems=ITEMS_MILLIONAIRE;
const sWeapons=ITEMS_S_WEAPONS;
let reqCount,targetFloors,checkItems,btnConfig;
if(isB9F){
reqCount=2;
targetFloors=[8];
checkItems=(targetItem==='S weapon')?sWeapons:[targetItem];
btnConfig={id:'searchBtn',text:H01,bg:'linear-gradient(135deg,#4c4,#080)'};
}else{
reqCount=b3fThreeItems.includes(targetItem)?3:2;
targetFloors=b3fThreeItems.includes(targetItem)?[2]:[2,3];
checkItems=(targetItem==='Millionaire')?millionaireItems:[targetItem];
btnConfig={id:'searchBtn',text:H01,bg:'linear-gradient(135deg,#4c4,#080)'};
}
const chestRanks=getChestRanksForItems(checkItems);
executeItemSearch({
btnId:btnConfig.id,btnText:btnConfig.text,btnBg:btnConfig.bg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checker:'quickload',
checkerParams:{targetFloors,checkItems,reqCount,isB9F,chestRanks}
});
}
function startSearch(){QuickloadSearch();}
function NineSearch(){
const targetItem=document.getElementById('searchItem').value;
const b9fItems=["Sainted soma","Yggdrasil leaf","Reset stone","S weapon"];
const isB9F=b9fItems.includes(targetItem);
if(["Cannibox","Mimic","Pandora's box"].includes(targetItem)){alert(A03);return;}
const millionaireItems=ITEMS_MILLIONAIRE;
const sWeapons=ITEMS_S_WEAPONS;
let reqCount,targetFloors,checkItems;
if(isB9F){
reqCount=2;
targetFloors=[8];
checkItems=(targetItem==='S weapon')?sWeapons:[targetItem];
}else{
reqCount=b3fThreeItems.includes(targetItem)?3:2;
targetFloors=b3fThreeItems.includes(targetItem)?[2]:[2,3];
checkItems=(targetItem==='Millionaire')?millionaireItems:[targetItem];
}
const chestRanks=getChestRanksForItems(checkItems);
executeItemSearch({
btnId:'BtnNine',btnText:'⑨',btnBg:'linear-gradient(135deg,#b19cd9,#6a5acd)',
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checker:'quickload9',
checkerParams:{targetFloors,checkItems,reqCount,isB9F,chestRanks}
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
executeItemSearch({
btnId:btnConfig.id,btnText:btnConfig.text,btnBg:btnConfig.bg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isS3?3:0),
checker:'third',
checkerParams:{targetFloors,checkItems,isS3:!!isS3,colorStyle,chestRanks}
});
}
function Box3Search(){
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
function JFireSearch(){
executeItemSearch({
btnId:'BtnTK',btnText:H02,btnBg:'linear-gradient(135deg,#f80,#c40)',
filterRanks:(ranks)=>ranks.filter(rank=>{
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1])return TableC[i*4+3]>=9;
}
return false;
}),
checker:'jfire',
checkerParams:{}
});
}
function TKSearch(){
const targetItem=document.getElementById('searchItem').value;
if(targetItem==='Sainted soma'){JFireSearch();return;}
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
executeItemSearch({
btnId:'BtnTK',btnText:H02,btnBg:'linear-gradient(135deg, #f80, #c40)',
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[getChestRanksForItems(wpTargets),getChestRanksForItems(allMatTargets)],0),
checker:'tk',
checkerParams:{targetItem,wpTargets,strictMatTargets,broadMatTargets,isMillionaire,isMonsterBox,minSec,maxSec}
});
}
const MRT_PREVIEW_ROWS=30;
const MRT_S_WEAPONS=ITEMS_S_WEAPONS;
const MRT_MILLIONAIRE=ITEMS_MILLIONAIRE;
const MRT_HL={};
MRT_HL['Sainted soma']={bg:'#FFC90E',fg:'#000'};
MRT_S_WEAPONS.forEach(w=>MRT_HL[w]={bg:'#22B14C',fg:'#fff'});
MRT_HL['Ethereal stone']={bg:'#EF1BBA',fg:'#fff'};
['Metal slime shield','Metal slime armour','Metal slime helm','Metal slime gauntlets','Metal slime sollerets'].forEach(i=>MRT_HL[i]={bg:'#383850',fg:'#d0d8f0'});
MRT_MILLIONAIRE.forEach(i=>MRT_HL[i]={bg:'#00a2e8',fg:'#fff'});
MRT_HL['Lucida shard']={bg:'#B5E61D',fg:'#000'};
['Dangerous bustier','Fuddle bow'].forEach(i=>MRT_HL[i]={bg:'#FFAEC9',fg:'#000'});
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
const sample=mrtChests.find(cd=>cd.rank===rank);
if(!sample)continue;
let maxW=0;
for(let s=0;s<300;s++){
const[en,jp]=mrtEngine.getBoxItem(sample.floor,sample.box,s);
const name=isEN?(en||'\u2014'):(jp||en||'\u2014');
const w=ctx.measureText(name).width;
if(w>maxW)maxW=w;
}
mrtRankWidths[rank]=Math.ceil(maxW)+12;
}
}
let mrtLang=DISPLAY_LANG==='EN'?'en':'jp',mrtRunning=false,mrtRAF=null,mrtOrigin=0,mrtRealSec=0,mrtElapsedMs=0;
function mrtInternalSec(){return mrtRealSec-5;}
function mrtGetItem(f,b,s){return s>=0?mrtEngine.getBoxItem(f,b,s):[null,null];}
function mrtOpen(){
mrtCacheEls();
mrtLang=DISPLAY_LANG==='EN'?'en':'jp';
const bl=document.getElementById('mrt_btnLang');if(bl)bl.textContent=mrtLang.toUpperCase();
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
const cols=mrtVisChests.length;
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
const absMs=Math.abs(ms);
const s=Math.floor(absMs/1000);
const cs=Math.floor((absMs%1000)/10);
const sign=ms<0?'-':'';
_mrtTimerText.textContent=sign+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
_mrtTimerDisp.style.color=(ms<0)?'#f88':'#0f0';
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
mrtRealSec=0;mrtElapsedMs=0;
if(_mrtBtnStart){_mrtBtnStart.textContent='\u25B6';_mrtBtnStart.classList.remove('running');}
mrtUpdateStopwatch(0);
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
window.addEventListener('resize',()=>{if(document.getElementById('marathonModal').classList.contains('open'))mrtResizeMain();});
function atUpd(){
const envType=parseInt(document.getElementById('at_env').value);
const floorMR=parseInt(document.getElementById('at_mr').value);
const sel=document.getElementById('at_mon');
sel.innerHTML='';
const spawnList=SPAWN_DB[envType]&&SPAWN_DB[envType][floorMR];
if(!spawnList)return;
for(const entry of spawnList){
if(entry.length<3)continue;
const md=MONSTER_DATA[entry[0]];
if(!md)continue;
const opt=document.createElement('option');
opt.value=entry[0];
opt.textContent=`${md.jp} (${md.en})`;
sel.appendChild(opt);
}
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
const md=MONSTER_DATA[entry[0]];
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
if(spawnList){
for(const entry of spawnList){
if(entry.length<3)continue;
const md=MONSTER_DATA[entry[0]];
if(!md)continue;
const opt=document.createElement('option');
opt.value=entry[0];
opt.textContent=X.mainFmt(md);
monSel.appendChild(opt);
}
}
const pool=dwSupPool(envType,floorMR);
['dw_sup1','dw_sup2'].forEach(id=>{
const sel=$(id);
if(!sel)return;
sel.innerHTML='<option value="">—</option>';
for(const hx of pool){
const md=MONSTER_DATA[hx];
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
const nameOf=hx=>{const md=MONSTER_DATA[hx];return md?X.name(md):hx;};
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
const md=MONSTER_DATA[monId];
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
isSearching=false;
restoreBtn();
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
console.error("AT Monster Search error:",msg);
alert(A02);
searchCancel=true;
isSearching=false;
restoreBtn();
progressSpan.textContent=searchDoneMsg(hitCount);
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
isSearching=false;
restoreBtn();
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
console.error("AT Pattern Search error:",msg);
alert(A02);
searchCancel=true;
isSearching=false;
restoreBtn();
progressSpan.textContent=searchDoneMsg(hitCount);
}
});
}
const MONSTER_DB={
"008":{t:9,en:"Lost Soul",jp:"さまようたましい",g:20,s:[62,32,32,0,0,100,100,100,100,100,100,200,50,12,70],d:[15,8,34,64]},
"00B":{t:4,en:"Mushroom Mage",jp:"マージマタンゴ",g:16,s:[67,50,56,0,0,125,100,100,100,100,100,125,100,13,56],d:["Belle cap",8,36,8]},
"00E":{t:2,en:"Purrestidigitator",jp:"ベンガルクーン",g:16,s:[96,84,110,0,0,100,125,100,100,125,100,100,50,23,102],d:["Kitty litter",8,"Stolos' staff",256]},
"012":{t:0,en:"Sootheslime",jp:"ベホイムスライム",g:20,s:[138,113,125,2,0,100,100,100,100,100,200,75,100,30,105],d:[12,8,"Slimedrop",8]},
"013":{t:0,en:"Cureslime",jp:"ベホマスライム",g:16,s:[165,158,172,0,0,100,100,100,100,100,150,75,50,38,143],d:["Slimedrop",16,24,64]},
"015":{t:6,en:"Robo-robin",jp:"アイアンクック",g:16,s:[75,100,210,2,0,75,75,100,150,100,100,100,0,24,113],d:[43,16,"Handrills",128]},
"01B":{t:0,en:"Liquid Metal Slime",jp:"はぐれメタル",g:16,s:[8,100,256,4,0,100,100,100,100,100,100,100,0,29,179],d:[51,32,86,128]},
"022":{t:5,en:"Dread Admiral",jp:"しびれあげは",g:16,s:[76,75,76,2,0,100,100,75,100,100,200,100,100,15,80],d:["Butterfly wing",8,"Coagulant",64]},
"026":{t:11,en:"Cannibox",jp:"ひとくいばこ",g:16,s:[187,140,108,0,0,125,100,125,100,100,100,125,0,15,140],d:[11,16,39,128]},
"027":{t:11,en:"Mimic",jp:"ミミック",g:12,s:[627,256,218,0,0,100,100,125,100,100,100,100,0,27,173],d:[11,16,"Gold rosary",64]},
"028":{t:11,en:"Pandora's Box",jp:"パンドラボックス",g:20,s:[868,623,623,2,0,100,50,150,100,100,50,150,0,80,407],d:[11,8,10,128]},
"02A":{t:5,en:"Raving Lunatick",jp:"メーダロード",g:16,s:[85,86,100,2,0,100,100,100,75,100,75,150,100,19,90],d:["Thorn whip",32,19,64]},
"02C":{t:11,en:"Goodybag",jp:"おどるほうせき",g:16,s:[126,115,130,8,0,100,100,125,100,100,125,125,75,30,146],d:["Brighten rock",16,"Pink pearl",64]},
"02E":{t:9,en:"Hell Niño",jp:"ヒートギズモ",g:16,s:[125,115,145,2,0,50,150,100,100,75,100,200,50,33,117],d:["Coagulant",32,"Flame shield",128]},
"02F":{t:9,en:"Freezing Fog",jp:"フロストギズモ",g:16,s:[126,126,156,2,0,150,50,100,100,100,50,200,25,35,162],d:["Ice crystal",16,17,64]},
"031":{t:12,en:"Grim Grinner",jp:"ダークホビット",g:16,s:[110,115,176,0,8,100,75,150,100,100,75,150,75,29,110],d:["Cautery sword",64,"Magic shield",64]},
"034":{t:5,en:"Sluggernaut",jp:"スーパーテンツク",g:20,s:[118,96,123,2,0,75,125,75,100,100,150,100,75,29,124],d:["Cloak of evasion",32,"Starlet sandals",128]},
"035":{t:5,en:"Sluggerslaught",jp:"ラストテンツク",g:16,s:[468,324,324,2,0,100,100,100,125,50,100,125,50,66,246],d:["Heavy handwear",64,"Bardic boots",128]},
"036":{t:8,en:"Pink Sanguini",jp:"ピンクモーモン",g:16,s:[85,85,92,4,0,125,100,100,100,100,125,125,100,18,104],d:[23,16,53,32]},
"037":{t:8,en:"Genie Sanguini",jp:"マポレーナ",g:12,s:[155,89,155,2,0,100,100,100,100,100,200,50,25,33,162],d:["Prayer ring",64,56,128]},
"03B":{t:4,en:"Scourgette",jp:"ブラックベジター",g:20,s:[96,90,98,0,0,150,100,100,100,100,75,150,50,23,81],d:[46,32,"Long spear",128]},
"03D":{t:10,en:"Salamarauder",jp:"かいぞくウーパー",g:20,s:[80,75,67,0,4,125,100,100,100,100,125,125,75,15,70],d:["Emerald moss",16,"Iron shield",64]},
"03E":{t:10,en:"Axolhotl",jp:"ウパパロン",g:12,s:[92,90,100,0,8,75,125,100,100,100,125,125,75,21,83],d:["Iron helmet",32,"Cautery sword",64]},
"040":{t:11,en:"Bagma",jp:"ようがんピロー",g:16,s:[120,120,120,0,0,50,200,100,100,100,100,150,50,32,120],d:[33,16,"Softwort",64]},
"04C":{t:0,en:"Metal Medley",jp:"メタルブラザーズ",g:20,s:[6,70,256,4,0,100,100,100,100,100,100,100,0,29,135],d:["Slimedrop",8,74,128]},
"04D":{t:0,en:"Gem Jamboree",jp:"ゴールデントーテム",g:20,s:[5,208,512,2,0,100,100,100,100,100,100,100,0,55,296],d:[9,16,10,256]},
"051":{t:5,en:"Giddy Gastropog",jp:"メダパニつむり",g:16,s:[90,104,140,0,0,100,125,100,100,100,100,100,100,24,50],d:[41,8,30,64]},
"052":{t:5,en:"Gloomy Gastropog",jp:"ダークデンデン",g:16,s:[144,133,210,0,0,100,50,100,100,100,50,200,50,34,144],d:[41,8,"Spiked armour",256]},
"053":{t:11,en:"Earthenwarrior",jp:"はにわナイト",g:16,s:[55,58,65,0,4,100,100,200,100,75,125,125,100,12,48],d:["Scale shield",32,"Soldier's sword",64]},
"056":{t:7,en:"Skeleton Soldier",jp:"死霊の騎士",g:32,s:[146,136,160,0,0,125,75,100,100,125,100,150,50,30,126],d:["Chain mail",32,"Platinum sword",64]},
"057":{t:7,en:"Dark Skeleton",jp:"影の騎士",g:24,s:[186,153,194,0,0,125,50,100,100,100,50,200,50,35,155],d:["Evencloth",32,"Smart suit",128]},
"059":{t:1,en:"Diethon",jp:"ヘルバイパー",g:16,s:[109,104,108,0,0,100,125,100,100,125,100,100,75,23,102],d:["Snakeskin",8,"Wing of bat",16]},
"05A":{t:1,en:"Sail Serpent",jp:"オーシャンナーガ",g:20,s:[148,144,143,0,0,100,150,100,100,100,125,100,100,32,125],d:["Snakeskin",8,"Snakeskin whip",128]},
"05D":{t:3,en:"Belisha Beakon",jp:"アカイライ",g:12,s:[136,146,143,0,0,150,50,50,100,100,100,150,50,37,167],d:["Crimson coral",32,"Red tights",128]},
"05E":{t:7,en:"Lesionnaire",jp:"がいこつ兵",g:20,s:[99,106,115,0,0,125,75,100,100,100,75,200,50,22,99],d:["Gold rosary",16,"Iron cuirass",64]},
"05F":{t:7,en:"Deadcurion",jp:"しにがみ兵",g:20,s:[112,115,117,0,0,200,50,100,100,100,50,200,0,26,98],d:[40,64,"Battle fork",128]},
"060":{t:7,en:"Stenchurion",jp:"ゾンビナイト",g:16,s:[160,148,175,0,0,150,50,100,100,100,50,200,0,34,136],d:[52,8,"Partisan",128]},
"062":{t:11,en:"Teaky Mask",jp:"トーテムキラー",g:16,s:[98,111,131,0,0,150,75,150,100,75,100,100,50,28,114],d:["Hardwood headwear",16,"Ice shield",256]},
"063":{t:2,en:"Bewarewolf",jp:"リカント",g:12,s:[87,83,89,0,0,100,100,100,125,100,100,100,75,16,77],d:["Magic beast hide",16,"Iron claws",64]},
"065":{t:2,en:"Scarewolf",jp:"リカントマムル",g:16,s:[102,94,105,0,0,100,75,100,125,100,100,100,75,19,87],d:["Magic beast hide",8,"Sacred claws",64]},
"067":{t:7,en:"Toxic Zombie",jp:"どくどくゾンビ",g:16,s:[150,82,35,0,0,150,50,100,100,100,100,200,50,17,32],d:[52,16,"Boomer briefs",64]},
"068":{t:7,en:"Ghoul",jp:"グール",g:8,s:[162,112,65,0,0,150,50,125,100,100,75,200,75,26,90],d:[52,16,"Tough guy tattoo",64]},
"06A":{t:10,en:"Spinchilla",jp:"うずしおキング",g:16,s:[126,88,78,8,0,125,75,100,100,100,125,125,50,17,96],d:["Seashell",16,"Crimson coral",32]},
"06B":{t:9,en:"Whirly Girly",jp:"レッドサイクロン",g:20,s:[144,120,150,8,0,100,125,50,100,100,150,100,50,30,131],d:[51,32,"Pretty betsy",256]},
"06D":{t:7,en:"Mummy",jp:"マミー",g:8,s:[138,112,80,0,0,125,75,100,100,100,75,200,50,23,66],d:["Grubby bandage",8,57,256]},
"06E":{t:7,en:"Blood Mummy",jp:"ブラッドマミー",g:16,s:[166,138,135,0,0,150,75,75,100,100,75,150,50,31,67],d:["Grubby bandage",8,57,128]},
"070":{t:1,en:"Wyrtoise",jp:"ガメゴンロード",g:16,s:[215,171,240,0,0,50,150,100,50,100,100,100,75,37,103],d:["Tortoiseshell",8,"Dragon scale",32]},
"072":{t:2,en:"Rampage",jp:"ゴートドン",g:12,s:[100,80,80,0,0,125,75,100,100,125,100,100,75,16,60],d:["Lambswool",8,"Magic beast horn",64]},
"074":{t:11,en:"Rockbomb",jp:"ばくだん岩",g:20,s:[100,100,156,0,0,100,100,125,100,75,100,125,50,25,76],d:[46,8,58,128]},
"076":{t:11,en:"Bomboulder",jp:"メガザルロック",g:16,s:[146,78,180,0,0,75,100,150,100,75,100,150,50,32,100],d:[46,16,"Yggdrasil dew",128]},
"077":{t:11,en:"Restless Armour",jp:"さまようよろい",g:16,s:[100,95,97,0,8,100,100,125,100,100,100,100,50,17,63],d:["Iron broadsword",64,"Iron armour",128]},
"078":{t:11,en:"Infernal Armour",jp:"じごくのよろい",g:16,s:[125,135,130,0,8,75,125,100,100,100,75,125,50,27,102],d:["Cautery sword",64,"Silver mail",128]},
"079":{t:11,en:"Lethal Armour",jp:"キラーアーマー",g:16,s:[194,158,210,0,8,75,75,150,100,100,75,150,50,35,117],d:["Magic armour",128,"Seed of defence",256]},
"07B":{t:0,en:"Metal Slime Knight",jp:"メタルライダー",g:16,s:[46,82,140,0,4,50,50,50,50,100,200,100,50,18,80],d:["Light shield",64,"Iron helmet",128]},
"07C":{t:2,en:"Swinoceros",jp:"突げきホーン",g:20,s:[120,105,121,0,0,100,75,100,75,100,200,100,75,24,91],d:["Magic beast horn",8,"Cowpat",32]},
"07D":{t:2,en:"Splatterhorn",jp:"ライノキング",g:16,s:[134,120,164,0,0,50,125,100,75,100,150,100,50,29,118],d:["Magic beast horn",16,"Magic beast hide",32]},
"07F":{t:9,en:"Admirer",jp:"ジェリーマン",g:16,s:[120,102,85,0,0,125,125,100,100,75,100,100,50,22,75],d:[33,32,45,64]},
"080":{t:9,en:"Live Lava",jp:"マグマロン",g:12,s:[165,140,186,0,0,50,150,100,100,100,100,100,50,33,124],d:[33,16,"Magma staff",128]},
"082":{t:2,en:"Big Badboon",jp:"バブーン",g:12,s:[147,106,74,0,0,100,125,100,100,100,100,100,75,19,62],d:["Magic beast hide",8,50,128]},
"083":{t:2,en:"Brainy Badboon",jp:"ヒババンゴ",g:12,s:[150,120,99,0,0,75,125,100,100,100,200,100,50,26,95],d:["Magic beast hide",32,"Raging ruby",32]},
"084":{t:12,en:"Magus",jp:"まじゅつし",g:12,s:[58,48,38,0,0,100,100,100,100,100,100,150,50,12,70],d:["Wizard's staff",64,16,128]},
"086":{t:12,en:"Sorcerer",jp:"ようじゅつし",g:16,s:[99,94,114,0,0,100,75,125,100,125,100,150,50,26,114],d:["Magical robes",32,"Seed of magic",256]},
"087":{t:1,en:"Mandrake Major",jp:"リザードマン",g:16,s:[107,98,107,0,4,100,125,100,100,100,100,100,100,23,87],d:["Dragon scale",16,"Heavy armour",128]},
"088":{t:1,en:"Mandrake Marauder",jp:"りゅう兵士",g:20,s:[172,132,198,0,4,75,100,100,150,150,100,100,50,34,144],d:["Dragon scale",16,"Bandit blade",128]},
"089":{t:1,en:"Mandrake Marshal",jp:"シュプリンガー",g:16,s:[222,163,212,2,4,100,50,100,50,150,150,100,100,36,152],d:["Dragon scale",64,"Dragonsbane",128]},
"08B":{t:4,en:"Treevil",jp:"ウドラー",g:12,s:[111,101,101,2,0,150,100,75,100,75,100,100,50,24,99],d:[22,16,"Coagulant",64]},
"08C":{t:3,en:"Chimaera",jp:"キメラ",g:8,s:[75,70,72,2,0,75,125,100,100,100,100,125,75,14,86],d:[27,8,"Flurry feather",32]},
"08D":{t:3,en:"Hocus Chimaera",jp:"メイジキメラ",g:16,s:[80,80,80,2,0,75,125,100,100,100,100,100,75,18,86],d:[27,16,"Prayer ring",128]},
"08F":{t:11,en:"Raving Reaper",jp:"アサシンドール",g:16,s:[134,135,134,0,0,125,100,100,100,50,50,150,0,28,119],d:["Thief's turban",64,"Assassin's dagger",128]},
"092":{t:2,en:"Badja",jp:"ブラックタヌー",g:16,s:[105,98,101,2,4,100,100,100,100,150,100,150,100,23,104],d:["Magic beast hide",8,"Special medicine",64]},
"094":{t:12,en:"Corrupt Carter",jp:"エビルチャリオット",g:20,s:[155,138,200,0,0,100,100,100,150,100,100,150,50,33,147],d:[43,32,"Handrills",64]},
"095":{t:10,en:"Mortoad",jp:"ガマキャノン",g:16,s:[140,80,70,0,0,75,125,100,100,100,125,125,100,16,48],d:[41,8,52,32]},
"096":{t:2,en:"Expload",jp:"デザートタンク",g:16,s:[142,102,116,0,0,75,100,100,150,100,100,100,75,22,64],d:[41,8,"Bow tie",64]},
"097":{t:2,en:"Blastoad",jp:"キャノンキング",g:16,s:[356,163,160,0,0,50,100,100,150,100,100,100,50,35,101],d:[41,8,24,64]},
"099":{t:3,en:"Peckerel",jp:"アサシンエミュー",g:20,s:[107,107,107,2,0,100,125,75,100,100,100,100,50,25,107],d:[19,16,"Poison needle",64]},
"09D":{t:10,en:"Knocktopus",jp:"ニードルオクト",g:16,s:[75,68,60,0,0,125,75,100,100,100,125,125,100,14,51],d:["Magic beast horn",16,"Crimson coral",32]},
"09E":{t:6,en:"Shocktopus",jp:"オクトスパイカー",g:20,s:[75,85,156,0,0,75,75,100,150,100,100,100,150,21,90],d:["Magic beast horn",16,37,32]},
"09F":{t:8,en:"Manguini",jp:"アーゴンデビル",g:16,s:[108,112,114,4,0,100,100,100,125,100,75,150,50,23,117],d:["Wing of bat",8,"Terrible tattoo",32]},
"0A0":{t:8,en:"Bloody Manguini",jp:"ブラッドアーゴン",g:20,s:[154,133,148,2,0,75,100,150,100,100,75,150,0,12,139],d:["Wing of bat",8,"Terrible tattoo",16]},
"0A2":{t:8,en:"Great Gruffon",jp:"ビッグボック",g:16,s:[150,120,120,0,0,125,50,100,150,100,75,125,50,28,70],d:["Wing of bat",8,"Fur poncho",64]},
"0A3":{t:8,en:"Gramarye Gruffon",jp:"アロダイタス",g:16,s:[215,150,125,0,0,100,100,100,150,100,50,100,50,30,76],d:["Wing of bat",16,"Safety shoes",64]},
"0A4":{t:2,en:"Trigertaur",jp:"タイガーランス",g:16,s:[100,98,100,2,0,100,125,100,100,100,100,100,50,20,85],d:["Magic beast hide",8,"Holy lance",128]},
"0A5":{t:2,en:"White Trigertaur",jp:"ホワイトランサー",g:20,s:[128,130,135,2,0,125,75,75,100,100,100,100,0,2,116],d:["Horse manure",16,"Seed of deftness",256]},
"0A6":{t:2,en:"Sick Trigertaur",jp:"キマライガー",g:16,s:[480,208,222,2,0,100,50,150,50,100,50,150,0,40,156],d:["Horse manure",16,"Partisan",128]},
"0A7":{t:8,en:"Moosifer",jp:"アンクルホーン",g:16,s:[156,140,155,0,0,50,100,150,100,100,50,150,50,31,133],d:["Magic beast hide",16,"Seed of life",256]},
"0A8":{t:8,en:"Barbatos",jp:"ヘルバトラー",g:16,s:[355,199,255,0,0,50,150,100,100,100,100,100,50,40,178],d:["Terrible tattoo",16,"Raging bull helm",128]},
"0A9":{t:1,en:"Green Dragon",jp:"グリーンドラゴン",g:20,s:[245,178,208,0,0,100,100,100,100,150,100,150,50,34,109],d:["Emerald moss",16,"Dragon scale",16]},
"0AA":{t:1,en:"Red Dragon",jp:"レッドドラゴン",g:16,s:[325,198,230,0,0,50,50,100,100,100,100,200,0,38,121],d:["Dragon scale",16,"Dragon claws",128]},
"0AB":{t:1,en:"Rashaverak",jp:"アンドレアル",g:16,s:[1124,707,604,0,0,50,100,150,100,100,100,100,0,98,98],d:["Dragon scale",8,"Brighten rock",64]},
"0AC":{t:11,en:"Living Statue",jp:"うごくせきぞう",g:16,s:[236,155,200,0,0,100,100,125,100,75,100,100,50,31,99],d:[47,16,49,128]},
"0AE":{t:1,en:"Drakularge",jp:"ギガントヒルズ",g:16,s:[286,160,175,0,0,100,100,100,150,100,100,100,50,32,106],d:["Dragon scale",16,10,256]},
"0AF":{t:1,en:"Drakulard",jp:"ギガントドラゴン",g:20,s:[520,203,203,0,0,100,150,50,100,50,100,150,50,40,112],d:["Dragon scale",16,71,128]},
"0B0":{t:1,en:"Drakulord",jp:"ドラゴン・ウー",g:16,s:[1414,725,404,0,0,50,150,100,100,50,100,150,0,40,286],d:["Dragon scale",8,"Dragon claws",64]},
"0B1":{t:6,en:"Hunter Mech",jp:"メタルハンター",g:16,s:[95,95,110,2,0,75,75,100,200,100,100,100,0,20,100],d:[43,32,"Hunter's bow",64]},
"0B2":{t:6,en:"Killing Machine",jp:"キラーマシン",g:16,s:[182,155,216,2,0,75,100,100,125,100,100,150,0,35,164],d:[37,16,"Seed of agility",256]},
"0B3":{t:0,en:"King Slime",jp:"キングスライム",g:16,s:[245,136,95,0,0,100,100,100,100,100,200,50,50,22,75],d:["Slimedrop",8,"Slime crown",256]},
"0B4":{t:0,en:"King Cureslime",jp:"スライムベホマズン",g:20,s:[256,216,235,0,0,100,100,100,100,100,150,50,0,56,101],d:["Slimedrop",64,"Slime crown",128]},
"0B5":{t:0,en:"Metal King Slime",jp:"メタルキング",g:16,s:[16,318,512,4,0,100,100,100,100,100,100,100,0,29,349],d:["Slime crown",128,114,256]},
"0B6":{t:9,en:"Cumulus Rex",jp:"くもの大王",g:28,s:[252,140,151,4,0,150,100,50,50,100,100,150,50,33,134],d:["Thunderball",16,"Lightning staff",128]},
"0B7":{t:9,en:"Cumulus Vex",jp:"ヘルクラウダー",g:16,s:[268,169,246,4,0,100,100,50,50,50,100,200,0,37,161],d:["Thunderball",16,"Seed of sorcery",256]},
"0B8":{t:0,en:"Darkonium Slime",jp:"スライムマデュラ",g:20,s:[420,400,500,2,0,0,0,0,0,0,0,0,0,22,403],d:["Slimedrop",32,"Thinking cap",128]},
"0B9":{t:0,en:"Gem Slime",jp:"ゴールデンスライム",g:20,s:[20,455,512,4,0,100,100,100,100,100,100,100,0,40,456],d:[10,128,114,256]},
"0BA":{t:11,en:"Stone Golem",jp:"ストーンマン",g:16,s:[156,104,130,0,0,100,100,200,100,75,100,100,50,19,55],d:[47,16,49,128]},
"0BB":{t:11,en:"Gold Golem",jp:"ゴールドマン",g:16,s:[250,136,130,0,0,100,75,125,100,100,125,100,50,24,77],d:[38,32,9,256]},
"0BC":{t:11,en:"Golem",jp:"ゴーレム",g:12,s:[300,175,210,0,0,75,50,150,100,100,100,150,0,33,99],d:[47,16,74,128]},
"0BD":{t:2,en:"Drackal",jp:"ストロングアニマル",g:20,s:[230,148,123,0,0,100,125,100,100,100,150,100,50,27,87],d:["Lambswool",16,"Platinum ore",128]},
"0BE":{t:2,en:"Drastic Drackal",jp:"ヘルジャッカル",g:16,s:[225,165,164,0,0,150,50,100,100,100,50,150,75,12,124],d:[32,16,"Raging ruby",64]},
"0C0":{t:11,en:"Harmour",jp:"デビルアーマー",g:16,s:[145,135,180,0,4,100,100,100,50,150,100,150,50,31,108],d:["Silver mail",64,40,128]},
"0C1":{t:11,en:"Bad Karmour",jp:"てっこうまじん",g:16,s:[188,161,262,0,4,50,100,50,50,150,100,150,50,37,98],d:[43,16,81,128]},
"0C2":{t:11,en:"Alarmour",jp:"サタンメイル",g:16,s:[454,454,612,0,4,100,100,50,50,150,50,150,50,77,109],d:[40,64,94,256]},
"0C3":{t:7,en:"Fright Knight",jp:"ナイトリッチ",g:16,s:[226,161,206,0,25,125,50,100,100,100,50,200,0,36,130],d:["Sword breaker",64,"Dark shield",256]},
"0C4":{t:7,en:"Night Knight",jp:"ナイトキング",g:16,s:[256,186,225,0,25,150,50,100,100,100,50,200,0,39,169],d:["Dark shield",64,96,256]},
"0C5":{t:3,en:"Terrorhawk",jp:"マッドファルコン",g:20,s:[146,128,160,2,0,100,150,100,100,100,150,100,50,32,140],d:[33,32,"Fowl fan",64]},
"0C6":{t:3,en:"Prism Peacock",jp:"にじくじゃく",g:16,s:[246,171,234,2,0,50,125,100,100,100,150,50,0,39,177],d:["Lunaria",32,"Tint-tastic tutu",256]},
"0C7":{t:3,en:"Bird of Terrordise",jp:"れんごくまちょう",g:20,s:[648,514,528,2,0,50,150,100,100,100,100,100,50,52,285],d:["Fowl fan",64,"Flame shield",128]},
"0C8":{t:11,en:"Mad Moai",jp:"ビッグモアイ",g:16,s:[125,100,125,0,0,100,100,200,100,75,100,100,0,6,9],d:[32,16,47,128]},
"0C9":{t:11,en:"Mega Moai",jp:"ゴードンヘッド",g:16,s:[180,162,235,0,0,75,100,150,100,100,100,150,0,10,88],d:[48,32,"Tough guy tattoo",128]},
"0CA":{t:8,en:"Sculptrice",jp:"ヘルビースト",g:16,s:[145,145,144,0,0,100,100,125,100,75,100,200,50,29,89],d:["Galvanised geta",64,56,128]},
"0CB":{t:11,en:"Sculpture Vulture",jp:"リビングスタチュー",g:20,s:[153,140,190,0,0,50,150,150,100,100,100,100,50,31,110],d:[20,32,49,128]},
"0CC":{t:8,en:"Aggrosculpture",jp:"ウィングデビル",g:16,s:[220,150,220,2,0,100,100,100,100,100,100,100,50,37,153],d:[38,32,79,256]},
"0CD":{t:7,en:"Wight Priest",jp:"デスプリースト",g:16,s:[126,108,136,0,0,150,50,100,100,150,100,200,0,28,125],d:["Gold rosary",32,"Ascetic robe",128]},
"0CE":{t:7,en:"Wight King",jp:"ワイトキング",g:16,s:[186,143,196,0,0,150,50,100,100,100,50,200,0,36,149],d:["Priestess's pinafore",128,"Seed of therapeusis",256]},
"0CF":{t:10,en:"Claw Hammer",jp:"ヘルマリーン",g:16,s:[98,108,90,0,0,125,50,100,200,100,100,100,75,20,90],d:["Magic beast horn",16,"Tough guy tattoo",128]},
"0D0":{t:10,en:"Power Hammer",jp:"サンドシャーク",g:16,s:[110,85,105,0,0,100,125,100,100,100,100,100,75,22,100],d:["Glass frit",32,"Kitty litter",64]},
"0D4":{t:8,en:"Python Priest",jp:"スネークロード",g:16,s:[136,120,160,0,0,100,100,100,150,100,50,150,50,32,130],d:["Watermaul wand",64,"Fizzle-retardant suit",128]},
"0D5":{t:8,en:"Cobra Cardinal",jp:"じごくのメンドーサ",g:20,s:[236,163,198,0,0,100,100,100,150,50,50,200,0,39,160],d:["Fizzle-retardant blouse",128,"Elfin elixir",256]},
"0D6":{t:2,en:"Tantamount",jp:"れんごく天馬",g:24,s:[1056,358,388,2,0,50,150,100,75,100,100,100,0,66,338],d:["Horse manure",16,"Friendly fan",256]},
"0D7":{t:2,en:"Godsteed",jp:"レジェンドホース",g:20,s:[686,575,566,2,0,100,100,100,100,100,150,50,50,10,415],d:["Horse manure",8,"Friendly fan",256]},
"0D9":{t:8,en:"Cyclops",jp:"サイクロプス",g:16,s:[355,170,150,0,0,100,50,100,150,100,100,150,50,32,75],d:[28,16,"Fur vest",128]},
"0DA":{t:8,en:"Gigantes",jp:"ギガンテス",g:12,s:[640,212,190,0,0,100,50,100,150,100,100,100,1,30,115],d:[50,64,"Ace of clubs",128]},
"0DC":{t:8,en:"Troll",jp:"トロル",g:8,s:[413,158,70,0,0,100,100,100,125,75,100,150,50,32,60],d:[28,8,"Seed of strength",256]},
"0DD":{t:8,en:"Boss Troll",jp:"ボストロール",g:16,s:[496,186,86,0,0,100,100,100,100,100,50,150,50,36,95],d:[28,16,"Boomer briefs",64]},
"0DE":{t:8,en:"Great Troll",jp:"トロルキング",g:16,s:[768,220,132,0,0,100,100,100,100,50,50,200,50,40,107],d:["Special medicine",32,"Marauder's maul",128]},
"0DF":{t:9,en:"Magmalice",jp:"ようがんまじん",g:16,s:[200,158,225,0,0,50,150,100,100,75,100,150,0,34,105],d:[33,16,58,128]},
"0E0":{t:9,en:"Firn Fiend",jp:"ひょうがまじん",g:16,s:[365,195,268,0,0,200,50,100,100,50,100,150,0,40,104],d:["Ice crystal",16,123,256]},
"0E2":{t:0,en:"Slionheart",jp:"ゴッドライダー",g:16,s:[825,506,512,0,4,100,100,100,75,100,150,100,0,98,336],d:["Falcon blade",128,"Pallium Regale",256]},
"0E4":{t:6,en:"AU-1000",jp:"ゴールドマジンガ",g:20,s:[996,567,798,4,0,100,100,100,100,100,200,75,0,99,124],d:[10,128,107,256]},
"0E5":{t:6,en:"Void Droid",jp:"ファイナルウェポン",g:20,s:[1325,575,625,2,0,75,75,75,200,75,100,100,0,99,348],d:[74,32,"Brawling byrnie",128]},
"0E6":{t:2,en:"Alphyn",jp:"キマイラロード",g:16,s:[1246,525,556,0,0,75,75,150,75,100,150,100,0,98,436],d:[48,32,82,64]},
"0E7":{t:2,en:"Vermil Lion",jp:"じごくのヌエ",g:16,s:[1378,564,626,2,0,50,100,100,100,100,50,150,0,99,455],d:[105,128,95,128]},
"0E8":{t:9,en:"Shivery Shrubbery",jp:"デビルスノー",g:16,s:[81,96,99,25,0,150,50,100,100,100,75,150,75,8,102],d:["Ice crystal",32,20,64]},
"0E9":{t:3,en:"Apeckalypse",jp:"ランドンクイナ",g:16,s:[130,118,118,2,0,125,75,100,100,100,100,100,75,27,121],d:[52,32,"Assassin's dagger",128]},
"0EB":{t:1,en:"Wonder Wyrtle",jp:"ガメゴンレジェンド",g:20,s:[1040,606,720,0,0,50,150,100,50,100,150,100,0,42,52],d:["Tortoiseshell",8,"Dragon shield",64]},
"0EC":{t:9,en:"Geothaum",jp:"あんこくまじん",g:16,s:[708,708,668,0,0,100,100,100,100,50,50,200,0,98,72],d:[47,16,"Evencloth",32]},
"0ED":{t:3,en:"Cosmic Chimaera",jp:"スターキメラ",g:16,s:[516,378,396,4,0,100,100,100,100,100,200,50,50,77,275],d:["Brighten rock",8,85,128]},
"0EE":{t:8,en:"Master Moosifer",jp:"デスカイザー",g:16,s:[1056,684,648,0,0,50,125,100,100,100,75,150,0,99,308],d:["Magic beast hide",8,"Raging ruby",128]},
"0EF":{t:11,en:"Freaky Tiki",jp:"まおうのかめん",g:16,s:[596,442,498,8,0,75,75,150,75,75,75,150,75,77,245],d:["Terrible tattoo",32,"Boss shield",128]},
"0F0":{t:1,en:"Mandrake Monarch",jp:"まかいファイター",g:20,s:[735,486,496,0,4,75,75,150,100,100,75,125,50,77,250],d:["Dragon scale",16,"Veteran's helm",128]},
"0F1":{t:9,en:"Cumulus Hex",jp:"ヘルミラージュ",g:16,s:[796,462,472,2,0,150,100,50,50,50,100,150,0,88,282],d:["Mistick",32,"Flowing dress",64]},
"0F2":{t:0,en:"Platinum King Jewel",jp:"プラチナキング",g:16,s:[20,356,546,2,0,100,100,100,100,100,100,100,0,29,505],d:["Platinum ore",8,"Seed of skill",256]},
"0F3":{t:11,en:"Charmour",jp:"マジックアーマー",g:20,s:[220,171,270,0,0,75,75,50,50,200,75,100,50,38,134],d:["Magic armour",32,"Halberd",128]},
"0F4":{t:7,en:"Blight Knight",jp:"ヴァルハラー",g:16,s:[965,695,598,0,25,150,50,100,100,100,50,150,0,99,298],d:[96,64,"Veteran's helm",128]},
"0F5":{t:11,en:"Moai Minstrel",jp:"クラウンヘッド",g:16,s:[518,368,567,0,0,100,100,125,100,75,100,100,0,66,206],d:[20,32,"Witch's hat",64]},
"0F6":{t:2,en:"Grrrgoyle",jp:"ホラービースト",g:16,s:[636,538,598,0,0,100,100,150,100,50,100,100,50,88,255],d:[49,32,57,256]},
"0F7":{t:7,en:"Wight Emperor",jp:"ロードコープス",g:16,s:[488,465,455,0,0,150,50,100,100,100,50,200,0,77,242],d:["Mitre",64,"Surplice",128]},
"0F8":{t:8,en:"Boogie Manguini",jp:"イエローサタン",g:16,s:[488,402,478,4,0,100,100,100,75,125,75,125,50,77,393],d:["Wing of bat",8,"Lunaria",64]},
"0F9":{t:11,en:"Barriearthenwarrior",jp:"ちていのばんにん",g:20,s:[512,432,596,0,4,100,100,150,100,50,100,100,0,77,239],d:[32,16,"Warrior's sword",128]},
"0FA":{t:11,en:"Grim Reaper",jp:"メフィストフェレス",g:20,s:[596,476,448,2,0,100,50,100,100,100,50,200,0,77,383],d:["Minister's mittens",64,78,128]},
"0FB":{t:2,en:"Bling Badger",jp:"ゴールドタヌ",g:16,s:[445,394,495,0,0,100,100,100,75,150,150,50,50,88,315],d:["Magic beast hide",8,26,128]},
"0FC":{t:12,en:"Flamin' Drayman",jp:"じごくぐるま",g:16,s:[480,416,452,0,0,50,150,100,100,100,100,150,50,66,229],d:[46,32,58,64]},
"0FD":{t:10,en:"Hammer Horror",jp:"ダークマリーン",g:16,s:[874,586,586,2,0,100,100,100,150,100,50,150,0,10,375],d:["Heavy handwear",32,"Cobra claws",128]},
"0FE":{t:8,en:"Boa Bishop",jp:"ビュアール",g:12,s:[633,309,296,0,0,125,75,100,125,100,75,75,50,40,264],d:["Wizard's hat",64,"Wizard's robe",256]},
"0FF":{t:10,en:"Handsome Crab",jp:"ガニラス",g:12,s:[121,68,195,0,0,150,50,100,100,100,100,100,100,33,56],d:[49,32,"Deadly nightblade",128]},
"101":{t:10,en:"Crabber Dabber Doo",jp:"じごくのハサミ",g:16,s:[112,115,121,0,0,125,100,125,100,50,100,100,100,24,78],d:["Seashell",16,"Poison moth knife",64]},
"102":{t:10,en:"King Crab",jp:"キラークラブ",g:16,s:[270,181,235,0,0,100,75,100,125,50,100,100,75,38,158],d:["Sleeping hibiscus",16,"Poison moth knife",128]},
"103":{t:12,en:"Icikiller",jp:"アイスビックル",g:16,s:[140,140,144,4,0,150,50,100,100,100,100,100,50,32,136],d:["Scale armour",16,"Crow's claws",64]},
"104":{t:10,en:"Riptide",jp:"オーシャンクロー",g:20,s:[102,102,105,2,0,100,100,100,100,125,100,125,0,5,105],d:["Dragon scale",32,"Razor claws",64]},
"105":{t:12,en:"Claws",jp:"クローハンズ",g:16,s:[206,153,198,4,0,100,50,50,100,125,100,150,0,7,178],d:["Sacred claws",64,"Dragon mail",128]},
"106":{t:10,en:"Seasaur",jp:"ギャオース",g:12,s:[304,180,192,0,0,50,50,100,125,100,100,150,50,34,101],d:["Dragon scale",16,"Magic beast horn",64]},
"107":{t:10,en:"Abyss Diver",jp:"ヘルダイバー",g:16,s:[600,200,220,0,0,50,50,100,150,100,100,150,75,38,126],d:["Dragon scale",32,"Watermaul wand",128]},
"108":{t:10,en:"Seavern",jp:"シーバーン",g:12,s:[1127,686,546,0,0,50,50,100,150,100,100,150,50,60,126],d:[56,32,"Cobra fan",64]},
"109":{t:8,en:"Terror Troll",jp:"ダークトロル",g:16,s:[1176,454,263,0,0,100,100,100,100,50,50,200,50,66,84],d:[32,16,"Roguess's robes",128]},
"10C":{t:0,en:"Prime Slime",jp:"デンガー",g:12,s:[914,445,375,0,4,100,100,100,50,100,150,100,50,88,432],d:["Valkyrie sword",64,"Falcon blade",128]},
"141":{t:2,en:"Octagoon",jp:"アイアンブルドー",g:20,s:[522,420,516,0,0,75,75,75,75,75,200,100,0,66,129],d:["Magic beast hide",8,"Platinum ore",32]},
"143":{t:8,en:"Cannibelle",jp:"ヘルヴィーナス",g:16,s:[468,396,396,0,0,100,50,100,150,100,50,150,0,66,228],d:["Spangled dress",32,"Fencing frock",128]},
"144":{t:9,en:"Scarlet Fever",jp:"エビルフレイム",g:16,s:[743,429,478,4,0,50,150,100,100,100,100,150,0,88,319],d:[33,16,"Fire blade",128]},
"145":{t:9,en:"Uncommon Cold",jp:"マッドブリザード",g:20,s:[907,528,487,4,0,150,50,100,100,100,100,150,0,42,356],d:["Ice crystal",32,"Icicle dirk",128]},
"147":{t:10,en:"Stale Whale",jp:"だいおうクジラ",g:16,s:[1244,584,496,0,0,100,100,100,150,100,100,100,50,88,106],d:["Glass frit",16,"Trident",64]},
"148":{t:10,en:"Pale Whale",jp:"オーシャンボーン",g:20,s:[1456,748,586,2,0,100,100,100,100,100,150,50,0,20,79],d:[22,16,"Wizard's hat",128]},
"149":{t:5,en:"Widow's Pique",jp:"デスタランチュラ",g:20,s:[955,595,625,0,0,50,100,150,100,100,100,150,50,99,302],d:["Tangleweb",8,"Rogue's robes",128]},
"14A":{t:5,en:"Cyber Spider",jp:"ボーンスパイダ",g:16,s:[596,478,488,0,0,125,125,125,125,75,125,125,50,88,255],d:["Tangleweb",8,"Handrills",128]},
"14B":{t:8,en:"Slugly Betsy",jp:"うみうしひめ",g:16,s:[1477,404,236,0,0,150,50,100,100,50,150,100,0,60,170],d:["Watermaul wand",64,"Nomadic deel",128]},
"14D":{t:2,en:"Hell's Gatekeeper",jp:"ヘルガーディアン",g:20,s:[996,535,645,0,4,100,100,100,150,100,75,150,50,98,115],d:[81,64,80,128]},
"14E":{t:2,en:"Wishmaster",jp:"ギリメカラ",g:12,s:[663,513,563,0,0,100,150,100,100,50,50,150,50,77,96],d:[71,32,"Holy femail",128]},
"025":{t:8,en:"Jinkster",jp:"ひとつめピエロ",g:0,s:[60,50,60,2,0,100,100,100,100,100,100,125,100,14,78],d:[0,256,0,256]},
"032":{t:12,en:"Gum Shield",jp:"ビッグフェイス",g:0,s:[80,80,101,0,4,100,100,100,100,100,100,125,75,18,81],d:["Light shield",64,"Iron broadsword",128]},
"04B":{t:0,en:"Slime Stack",jp:"スライムタワー",g:0,s:[177,93,68,0,0,100,100,100,125,100,200,100,50,14,102],d:[0,256,0,256]},
"054":{t:11,en:"Brrearthenwarrior",jp:"ふゆしょうぐん",g:0,s:[125,125,135,0,4,150,50,100,100,75,100,100,50,27,105],d:["Ice crystal",32,"Ice shield",256]},
"05C":{t:3,en:"Weaken Beakon",jp:"デッドペッカー",g:0,s:[78,72,90,0,0,100,150,75,100,125,100,100,75,19,88],d:[0,256,0,256]},
"064":{t:2,en:"Tearwolf",jp:"キラーリカント",g:0,s:[136,121,125,0,0,100,75,100,125,100,100,100,50,27,112],d:["Magic beast hide",8,"Cloak of evasion",64]},
"08A":{t:4,en:"Treeface",jp:"じんめんじゅ",g:0,s:[95,83,78,2,0,125,100,100,100,100,100,100,100,18,63],d:[0,256,0,256]},
"0AD":{t:11,en:"Stone Guardian",jp:"だいまじん",g:0,s:[255,160,255,0,0,75,75,150,100,100,75,100,0,11,102],d:[49,64,123,256]},
"100":{t:5,en:"Crabid",jp:"ぐんたいガニ",g:0,s:[72,72,83,0,0,100,100,100,100,100,150,150,100,16,15],d:[0,256,0,256]},
};
function applyElementMod(baseDmg,el,monId){
if(!el)return baseDmg;
const mon=MONSTER_DB[monId];
if(!mon)return baseDmg;
return Math.floor(baseDmg*mon.s[el]/100);
}
function applyElementAndFource(baseDmg,skill,monId,fourceEls){
if(skill.el){
return applyElementMod(baseDmg,skill.el,monId);
}
if(!fourceEls||fourceEls.length===0)return baseDmg;
const mon=MONSTER_DB[monId];
if(!mon)return baseDmg;
let best=baseDmg;
for(const el of fourceEls){
const mod=Math.floor(Math.floor(baseDmg*mon.s[el]/100)*1.1);
if(mod>best)best=mod;
}
return best;
}
function applyTypeMul(baseDmg,skill,monId){
if(!skill.tmul)return baseDmg;
const mon=MONSTER_DB[monId];
if(!mon)return baseDmg;
const factor=skill.tmul[mon.t]||1.0;
return Math.floor(baseDmg*factor);
}
const SKILL_DB=[
{cat:"skill",weapon:"Minstrel",jp:"火ふき芸",en:"Hot Lick",target:"S",at:[128,0],miss:120,ev:0,blk:0,el:5,metal:0,dmg:{s:3,b:20}},
{cat:"skill",weapon:"Hammer",jp:"ビッグバン",en:"Big Banga",target:"A",at:[74,0],miss:74,ev:0,blk:1,el:10,metal:0,dmg:{s:60,b:300},hiden:1},
{cat:"spell",jp:"ドルマドン",en:"Kazammle",target:"S",at:[67,0],miss:59,ev:0,blk:1,el:10,metal:0,cls:[10],dmg:{s:30,b:285,m:615,st:"might",lo:480,hi:999}},
{cat:"spell",jp:"メラガイアー",en:"Kafrizzle",target:"S",at:[55,0],miss:41,ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:23,b:292,m:600,st:"might",lo:480,hi:999}},
{cat:"skill",weapon:"Boomerang",jp:"ギガスロー",en:"Gigathrow",target:"S",at:[39,0],miss:29,ev:1,blk:1,el:8,metal:0,hiden:1},
{cat:"skill",weapon:"Whip",jp:"双竜打ち (単体)",en:"Twin Dragon Lash (Single)",target:"S",at:[30,12],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:2,max:2},mul:1.25},
{cat:"skill",weapon:"Whip",jp:"双竜打ち (ｸﾞﾙｰﾌﾟ)",en:"Twin Dragon Lash (Group)",target:"RG",at:[30,13],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:2,max:2},mul:1.25},
{cat:"spell",jp:"マヒャド",en:"Kacrack",target:"A",at:[30,1],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:12,b:92,m:216,st:"might",lo:200,hi:999}},
{cat:"skill",weapon:"Whip",jp:"地這い大蛇",en:"Serpent's Bite",target:"G",at:[29,1],ev:1,blk:1,el:9,metal:0,hiden:1,mul:2},
{cat:"skill",weapon:"Hammer",jp:"ランドインパクト",en:"Crackerwhack",target:"A",at:[29,1],ev:0,blk:1,el:9,metal:0,dmg:{s:15,b:175}},
{cat:"skill",weapon:"Bow",jp:"シャイニングボウ",en:"Shining Shot",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:5,b:150},hiden:1},
{cat:"skill",weapon:"Boomerang",jp:"シャインスコール",en:"Starburst Throw",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:10,b:105}},
{cat:"spell",jp:"イオグランデ",en:"Kaboomle",target:"A",at:[29,1],ev:0,blk:0,el:8,metal:0,cls:[10],dmg:{s:10,b:210,m:480,st:"might",lo:550,hi:999}},
{cat:"item",jp:"ばくだん石",en:"Rockbomb shard",target:"A",at:[29,1],ev:0,blk:0,el:0,metal:0,dmg:{s:5,b:25}},
{cat:"skill",weapon:"Spear",jp:"さみだれづき",en:"Multithrust",target:"RA",at:[28,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:3,max:4}},
{cat:"item",jp:"マグマの杖",en:"Magma Staff",target:"A",at:[28,1],ev:0,blk:0,el:8,metal:0,dmg:{s:8,b:60}},
{cat:"skill",weapon:"Sword",jp:"ギガブレイク",en:"Gigagash",target:"G",at:[23,1],ev:0,blk:1,el:11,metal:0,dmg:{s:75,b:260,m:520,st:"str+might",lo:500,hi:1998},hiden:1},
{cat:"skill",weapon:"Whip",jp:"らせん打ち",en:"Hypnowhip",target:"S",at:[22,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Whip",jp:"しばり打ち",en:"Trammel Lash",target:"S",at:[22,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Spear",jp:"ジゴスパーク",en:"Lightning Storm",target:"A",at:[20,1],ev:0,blk:1,el:8,metal:0,dmg:{s:15,b:205,m:405,st:"str+might",lo:500,hi:1998},hiden:1},
{cat:"skill",weapon:"Fisticuffs",jp:"ばくれつけん",en:"Multifists",target:"RA",at:[20,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{cat:"skill",weapon:"Fisticuffs",jp:"岩石おとし",en:"Boulder Toss",target:"A",at:[20,1],ev:1,blk:1,el:9,metal:0,dmg:{s:10,b:110,m:300,st:"str+deft",lo:500,hi:1998}},
{cat:"spell",jp:"マヒャデドス",en:"Kacrackle",target:"A",at:[17,1],ev:0,blk:0,el:6,metal:0,cls:[2],dmg:{s:20,b:185,m:510,st:"might",lo:550,hi:999}},
{cat:"spell",jp:"バギクロス",en:"Kaswoosh",target:"G",at:[17,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:50,b:130,m:205,st:"might",lo:200,hi:999}},
{cat:"skill",weapon:"Spear",jp:"きゅうしょづき",en:"Pressure Pointer",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Spear",jp:"一閃づき",en:"Thunder Thrust",target:"S",at:[14,0],miss:0,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Whip",jp:"愛のムチ",en:"Lashings of Love",target:"G",at:[14,5],ev:1,blk:1,el:0,metal:0,tmul:{12:1.5}},
{cat:"skill",weapon:"Whip",jp:"ねむり打ち",en:"Hit the Hay",target:"G",at:[14,5],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Whip",jp:"ヒールウィップ",en:"Schadenfreude",target:"G",at:[14,5],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Claws",jp:"ゴッドスマッシュ",en:"Hand of God",target:"S",at:[14,0],ev:0,blk:1,el:11,metal:0,dmg:{s:40,b:220,m:440,st:"str",lo:300,hi:999},hiden:1},
{cat:"skill",weapon:"Fan",jp:"波紋演舞",en:"Water Slaughterer",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{10:1.5}},
{cat:"skill",weapon:"Axe",jp:"たいぼく斬",en:"Poplar Toppler",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{4:1.5}},
{cat:"skill",weapon:"Axe",jp:"蒼天魔斬",en:"Parallax",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,mul:1.25},
{cat:"skill",weapon:"Axe",jp:"かぶと割り",en:"Helm Splitter",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Axe",jp:"魔神斬り",en:"Hatchet Man",target:"S",at:[14,0],miss:0,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Axe",jp:"オノむそう",en:"Axes of Evil",target:"G",at:[14,4],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Axe",jp:"森羅万象斬",en:"Whopper Chop",target:"S",at:[14,0],ev:0,blk:1,el:0,metal:0,dmg:{s:20,b:200,m:480,st:"str",lo:250,hi:600},hiden:1},
{cat:"skill",weapon:"Hammer",jp:"ハートブレイク",en:"Heart Breaker",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Hammer",jp:"ゴールドハンマー",en:"Penny Pincher",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Hammer",jp:"ラストバッター",en:"Bagsy Last",target:"S",at:[14,0],pri:-1,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Bow",jp:"さみだれうち",en:"Rain of Pain",target:"RA",at:[14,10],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{cat:"skill",weapon:"Fisticuffs",jp:"せいけんづき",en:"Knuckle Sandwich",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Gladiator",jp:"とうこん討ち",en:"Clap Trap",target:"S",at:[14,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.2},
{cat:"skill",weapon:"Paladin",jp:"グランドネビュラ",en:"Solar Flair",target:"G",at:[14,1],ev:0,blk:1,el:11,metal:0,dmg:{s:15,b:195,m:390,st:"mending",lo:200,hi:849},hiden:1},
{cat:"spell",jp:"ドルモーア",en:"Kazam",target:"S",at:[14,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:30,b:150,m:345,st:"might",lo:225,hi:999}},
{cat:"spell",jp:"バギマ",en:"Swoosh",target:"G",at:[14,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:15,b:40,m:138,st:"might",lo:100,hi:999}},
{cat:"skill",weapon:"Minstrel",jp:"キラージャグリング",en:"Have a Ball",target:"RA",at:[11,4],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:6,max:8},mul:0.3},
{cat:"spell",jp:"メラゾーマ",en:"Kafrizz",target:"S",at:[11,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:12,b:190,m:319,st:"might",lo:220,hi:999}},
{cat:"spell",jp:"バギ",en:"Woosh",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:8,b:16,m:69,st:"might",lo:50,hi:999}},
{cat:"item",jp:"てんばつの杖",en:"Staff of Divine Wrath",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:10,b:85}},
{cat:"item",jp:"さばきの杖",en:"Staff of Sentencing",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:10,b:85}},
{cat:"item",jp:"れっぷうのおうぎ",en:"Foehn Fan",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:10,b:85}},
{cat:"item",jp:"たつまきのおうぎ",en:"Gale Force Fan",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:10,b:85}},
{cat:"skill",weapon:"Other",jp:"攻撃",en:"Attack",target:"S",at:[8,8],miss:0,ev:1,blk:1,el:0,metal:0,fh:2,gbh:1},
{cat:"skill",weapon:"Other",jp:"攻撃 (ｸﾞﾙｰﾌﾟ)",en:"Attack (Group)",target:"G",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0,gbh:1},
{cat:"skill",weapon:"Other",jp:"攻撃 (全体)",en:"Attack (All)",target:"A",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0,gbh:1},
{cat:"skill",weapon:"Sword",jp:"ドラゴン斬り",en:"Dragon Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,tmul:{1:1.5}},
{cat:"skill",weapon:"Sword",jp:"メタル斬り",en:"Metal Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:1,fh:2},
{cat:"skill",weapon:"Sword",jp:"ミラクルソード",en:"Miracle Slash",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Sword",jp:"はやぶさ斬り",en:"Falcon Slash",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,fh:4,mul:0.75},
{cat:"skill",weapon:"Sword",jp:"ギガスラッシュ",en:"Gigaslash",target:"G",at:[8,4],ev:0,blk:1,el:11,metal:0,dmg:{s:20,b:160,m:360,st:"str+might",lo:500,hi:1998}},
{cat:"skill",weapon:"Spear",jp:"しっぷうづき",en:"Mercurial Thrust",target:"S",at:[8,0],pri:2,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Spear",jp:"けものづき",en:"Cattle Prod",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{2:1.5}},
{cat:"skill",weapon:"Knife",jp:"ポイズンダガー",en:"Toxic Dagger",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2},
{cat:"skill",weapon:"Knife",jp:"キラーブーン",en:"Fly Swat",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2,tmul:{5:1.5}},
{cat:"skill",weapon:"Knife",jp:"タナトスハント",en:"Victimiser",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2},
{cat:"skill",weapon:"Knife",jp:"アサシンアタック",en:"Assassin's Stab",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2},
{cat:"skill",weapon:"Knife",jp:"バンパイアエッジ",en:"HP Hoover",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Knife",jp:"ヒュプノスハント",en:"Persecutter",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2},
{cat:"skill",weapon:"Wand",jp:"悪魔ばらい",en:"Beelzefreeze",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Staff",jp:"黄泉送り",en:"Deliverance",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{7:1.5}},
{cat:"skill",weapon:"Claws",jp:"ウィングブロウ",en:"Propeller Blade",target:"S",at:[8,8],ev:1,blk:1,el:7,metal:0,hit:2},
{cat:"skill",weapon:"Claws",jp:"裂鋼拳",en:"Can Opener",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{6:1.5}},
{cat:"skill",weapon:"Claws",jp:"ネイルスクラッチ",en:"Flailing Nails",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:4},
{cat:"skill",weapon:"Claws",jp:"タイガークロー",en:"Hardclaw",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,mul:0.75},
{cat:"skill",weapon:"Claws",jp:"ゴールドフィンガー",en:"Rake 'n' Break",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Fan",jp:"おうぎのまい",en:"Fan Dango",target:"RA",at:[8,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:3,max:4}},
{cat:"skill",weapon:"Hammer",jp:"ドラムクラッシュ",en:"Monster Masher",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{11:1.5}},
{cat:"skill",weapon:"Bow",jp:"マジックアロー",en:"Conjury Conductor",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Bow",jp:"バードシュート",en:"Flutter Disaster",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{3:1.5}},
{cat:"skill",weapon:"Bow",jp:"ニードルショット",en:"Needle Shot",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,dmg:{s:0,b:1}},
{cat:"skill",weapon:"Bow",jp:"天使の矢",en:"Hallowed Arrow",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Boomerang",jp:"クロスカッター",en:"Crosscutter Throw",target:"A",at:[8,4],ev:1,blk:1,el:0,metal:0,mul:0.75},
{cat:"skill",weapon:"Boomerang",jp:"パワフルスロー",en:"Power Throw",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,mul:0.75},
{cat:"skill",weapon:"Boomerang",jp:"スライムブロウ",en:"Ooze Bruiser",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,tmul:{0:1.5}},
{cat:"skill",weapon:"Boomerang",jp:"バーニングバード",en:"Firebird Throw",target:"RA",at:[8,8],ev:1,blk:1,el:5,metal:0,hitRange:{normalMin:7,max:7},mul:0.3},
{cat:"skill",weapon:"Boomerang",jp:"メタルウィング",en:"Metalicker",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:1},
{cat:"skill",weapon:"Shield",jp:"シールドアタック",en:"Blockenspiel",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Fisticuffs",jp:"石つぶて",en:"Stone's Throw",target:"G",at:[8,8],ev:1,blk:1,el:9,metal:0,dmg:{s:7,b:17}},
{cat:"skill",weapon:"Fisticuffs",jp:"かまいたち",en:"Wind Sickles",target:"G",at:[8,5],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Warrior",jp:"ロストアタック",en:"Morale Masher",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2},
{cat:"skill",weapon:"Warrior",jp:"やいばくだき",en:"Attack Attacker",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2},
{cat:"skill",weapon:"Gladiator",jp:"もろば斬り",en:"Double-Edged Slash",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,mul:1.5},
{cat:"skill",weapon:"Gladiator",jp:"無心こうげき",en:"Blind Man's Biff",target:"RS",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.5},
{cat:"skill",weapon:"Luminary",jp:"サインぜめ",en:"Autograph",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Luminary",jp:"バックダンサー呼び",en:"Disco Stew",target:"A",at:[8,1],ev:1,blk:1,el:0,metal:0,dmg:{s:25,b:210}},
{cat:"spell",jp:"メラ",en:"Frizz",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:2,b:14,m:99,st:"might",lo:50,hi:999}},
{cat:"spell",jp:"メラミ",en:"Frizzle",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:10,b:80,m:199,st:"might",lo:100,hi:999}},
{cat:"spell",jp:"ヒャド",en:"Crack",target:"S",at:[8,0],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:5,b:30,m:119,st:"might",lo:50,hi:999}},
{cat:"spell",jp:"ヒャダルコ",en:"Crackle",target:"G",at:[8,8],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:8,b:50,m:150,st:"might",lo:100,hi:999}},
{cat:"spell",jp:"ドルマ",en:"Zam",target:"S",at:[8,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:8,b:24,m:139,st:"might",lo:62,hi:999}},
{cat:"spell",jp:"ドルクマ",en:"Zammle",target:"S",at:[8,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:15,b:65,m:228,st:"might",lo:125,hi:999}},
{cat:"item",jp:"はじゃのつるぎ",en:"Cautery Sword",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0},
{cat:"item",jp:"ひかりのつるぎ",en:"Aurora Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0},
{cat:"item",jp:"ほのおのつるぎ",en:"Fire Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0},
{cat:"item",jp:"インフェルノソード",en:"Inferno Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0},
{cat:"item",jp:"こおりのやいば",en:"Icicle Dirk",target:"G",at:[8,8],ev:0,blk:0,el:6,metal:0},
{cat:"item",jp:"フェンリルのキバ",en:"Fenrir Fang",target:"G",at:[8,8],ev:0,blk:0,el:6,metal:0},
{cat:"item",jp:"まどうしの杖",en:"Wizard's Staff",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0},
{cat:"item",jp:"ドラゴンの杖",en:"Wyrmwand",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:10,b:75}},
{cat:"item",jp:"ほのおのツメ",en:"Fire Claws",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0},
{cat:"item",jp:"しゃくねつのツメ",en:"Combusticlaws",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0},
{cat:"skill",weapon:"Staff",jp:"なぎはらい",en:"Party Pooper",target:"G",at:[6,6],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Ranger",jp:"みのがす",en:"Mercy",target:"A",at:[0,0],miss:0,ev:0,blk:0,el:12,metal:0},
{cat:"spell",jp:"ザラキーマ",en:"Kathwack",target:"A",at:[0,0],ev:0,blk:0,el:12,metal:0,cls:[1]},
{cat:"skill",weapon:"Armamentalist",jp:"ファイアフォース",en:"Fire Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[5]},
{cat:"skill",weapon:"Armamentalist",jp:"アイスフォース",en:"Frost Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[6]},
{cat:"skill",weapon:"Armamentalist",jp:"ストームフォース",en:"Gale Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[7,8]},
{cat:"skill",weapon:"Armamentalist",jp:"ダークフォース",en:"Funereal Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[9,10]},
{cat:"skill",weapon:"Armamentalist",jp:"ライトフォース",en:"Life Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[11]},
{cat:"skill",weapon:"Other",jp:"おうえん",en:"Egg On",target:"S",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0,hiden:1},
];
const WEAPON_META={
'はやぶさの剣':{cat:'Sword',en:'Falcon blade',falcon:true,metal:0,antiBlk:false},
'メタスラの剣':{cat:'Sword',en:'Metal slime sword',falcon:false,metal:1,antiBlk:false},
'メタスラのやり':{cat:'Spear',en:'Metal slime spear',falcon:false,metal:1,antiBlk:false},
'きしんのまそう':{cat:'Spear',en:'Poker',falcon:false,metal:0,antiBlk:true},
'風林火山':{cat:'Fan',en:'Attribeauty',falcon:false,metal:1,antiBlk:true},
'キラーピアス':{cat:'Knife',en:'Falcon knife earrings',falcon:true,metal:0,antiBlk:false},
'どくばり':{cat:'Knife',en:'Poison needle',falcon:false,metal:0,antiBlk:false,fixedDmg:1,hits:1},
};
const SKILL_IDX={};
const _SOLVER_SKILL_DATA={};
const _FOURCE_EL={};
const _FOURCE_EN={};
const _HIDEN_SKILLS=new Set();
const _PRIORITY={};
const _WEAPON_SKILLS={};
for(const wm of Object.values(WEAPON_META)){
if(!_WEAPON_SKILLS[wm.cat])_WEAPON_SKILLS[wm.cat]=new Set();
}
for(const s of SKILL_DB){
if(!s.jp)continue;
SKILL_IDX[s.jp]=s;
_SOLVER_SKILL_DATA[s.jp]={el:s.el,ev:s.ev,blk:s.blk,dmg:s.dmg||null};
if(s.addsEl)_FOURCE_EL[s.jp]=s.addsEl;
if(s.hiden)_HIDEN_SKILLS.add(s.jp);
if(s.pri)_PRIORITY[s.jp]=s.pri;
if(s.weapon==='Armamentalist'&&s.en)_FOURCE_EN[s.jp]=s.en;
if(s.cat!=='spell'&&s.cat!=='item'){
const isGlad=s.weapon==='Gladiator';
const isAtkS=s.jp==='攻撃'&&s.target==='S';
for(const cat of Object.keys(_WEAPON_SKILLS)){
if(s.weapon===cat||isGlad||isAtkS)_WEAPON_SKILLS[cat].add(s.jp);
}
}
}
const FOURCE_MAP=_FOURCE_EL;
function isHitBased(skill){
const t=skill.target;
return t==='S'||t==='RS'||t==='RG'||t==='RA';
}
function getHits(skill,hasDoubling,hasGladiatorBook){
if(!isHitBased(skill))return 1;
const dh=skill.fh||skill.kph;
const base=skill.hit||(dh?dh/2:1);
let hits=hasDoubling?(dh||base*2):base;
if(hasGladiatorBook&&skill.gbh)hits+=1;
return hits;
}
function _getDmgStat(statKey,stats){
switch(statKey){
case'might':return stats.might||0;
case'str':return stats.str||0;
case'str+might':return(stats.str||0)+(stats.might||0);
case'str+deft':return(stats.str||0)+(stats.deft||0);
case'mending':return stats.mending||0;
case'stat':return stats.might||stats.mending||0;
default:return 0;
}
}
function calcBaseDmg(skill,stats){
if(skill.fixedDmg)return{min:skill.fixedDmg,max:skill.fixedDmg};
const d=skill.dmg;
if(!d){
return null;
}
if(!d.m||d.b===d.m){
return{min:d.b-d.s,max:d.b+d.s};
}
const sv=_getDmgStat(d.st,stats);
const clamped=Math.max(d.lo,Math.min(sv,d.hi));
const calcBase=d.b+Math.floor((clamped-d.lo)*(d.m-d.b)/(d.hi-d.lo));
return{min:calcBase-d.s,max:calcBase+d.s};
}
function calcSkillDamage(skill,stats,monId,fourceEls){
const mon=MONSTER_DB[monId];
if(!mon)return null;
let base=calcBaseDmg(skill,stats);
if(!base){
const x=Math.min(stats.atk||0,999);
const y=mon.s[2];
const ratio=x>0?y/x:999;
if(ratio>=2){
base={min:0,max:1};
}else if(ratio>=1.75){
base={min:0,max:Math.floor(x/16)};
}else{
const zBase=Math.floor(x/2)-Math.floor(y/4);
const z=Math.floor(Math.max(zBase,0)*(skill.mul||1));
const eps=Math.floor(z/16)+1;
base={min:Math.max(0,z-eps),max:z+eps};
}
}
let dMin=applyTypeMul(base.min,skill,monId);
let dMax=applyTypeMul(base.max,skill,monId);
dMin=applyElementAndFource(dMin,skill,monId,fourceEls);
dMax=applyElementAndFource(dMax,skill,monId,fourceEls);
const hpMax=mon.s[0];
const hpMin=Math.floor(hpMax*0.8);
const kill=dMin>=hpMax?'gold':dMax>=hpMin?'orange':null;
return{
min:dMin,max:dMax,
hpMin,hpMax,kill,
evade:skill.ev?mon.s[3]:0,
block:skill.blk?mon.s[4]:0,
};
}
const _TENSION=[
{eggs:1,lv:5,mul:1.5},
{eggs:2,lv:20,mul:2.5},
{eggs:3,lv:50,mul:4.0},
];
const _FOURCE_BONUS=1.1;
function _bestFource(hexId){
const mon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
if(!mon)return null;
let bestJp=null,bestEl=0,bestMod=0;
for(const[jp,elArr]of Object.entries(_FOURCE_EL)){
for(const elIdx of elArr){
const mod=mon.s[elIdx]||100;
if(mod>bestMod){bestJp=jp;bestEl=elIdx;bestMod=mod;}
}
}
if(bestMod<=100)return null;
return{jp:bestJp,en:_FOURCE_EN[bestJp]||bestJp,el:bestEl,mod:bestMod};
}
const GROTTO_BATTLE={
1:{
1:{x:3,m:[["00B",1,3,0,4,10,2,10],["00E",1,3,0,4,12,2,12],["022",1,3,0,4,10,2,10],["082",1,2,0,4,11,1,11],["08C",1,3,0,4,11,2,11]]},
2:{x:3,m:[["036",1,3,0,4,11,2,11],["03B",1,3,0,4,11,2,11],["063",1,2,0,4,10,2,10],["087",1,2,0,4,11,2,11],["0BD",1,1,0,4,11,1,11]]},
3:{x:4,m:[["034",1,3,0,4,10,1,10],["083",1,3,0,4,12,2,12],["08B",1,2,0,4,11,2,11],["099",1,2,0,4,11,2,11],["101",1,2,0,4,11,2,11]]},
4:{x:4,m:[["076",1,3,0,4,11,2,11],["07C",1,3,0,4,11,2,11],["080",1,2,0,4,12,2,12],["0AE",1,1,0,4,12,2,12],["0D9",1,2,0,4,11,1,11]]},
5:{x:4,m:[["052",1,2,0,4,11,1,11],["07D",1,3,0,4,11,2,11],["0B6",1,2,0,4,12,2,12],["0C5",1,2,0,4,12,2,12],["0DD",1,1,0,4,11,1,11]]},
6:{x:4,m:[["02F",1,3,0,4,11,2,11],["089",1,2,0,4,11,1,11],["097",1,3,0,4,12,2,12],["0A9",1,1,0,4,12,2,12],["105",1,2,0,4,12,2,12]]},
7:{x:4,m:[["04D",1,1,0,4,10,0,1],["089",1,2,0,4,12,2,12],["0B4",1,2,0,4,12,2,12],["0B7",1,1,0,4,12,2,12],["0D5",1,2,0,4,11,1,11]]},
8:{x:3,m:[["037",1,3,0,4,6,2,6],["0C6",1,2,0,4,12,2,12],["0F5",1,1,0,4,11,2,11],["102",1,1,0,4,12,2,12],["109",1,1,0,4,12,2,12]]},
9:{x:3,m:[["035",1,2,0,4,11,2,11],["0AF",1,1,0,4,11,1,11],["0ED",1,1,0,4,11,1,11],["109",1,1,0,4,11,1,11],["14E",1,1,0,4,11,1,11]]},
10:{x:3,m:[["0B5",1,2,0,4,11,1,11],["0ED",1,2,0,4,11,1,11],["0F1",1,1,0,4,11,1,11],["147",1,1,1,0,1,0,1],["14E",1,1,0,4,11,1,11]]},
11:{x:3,m:[["035",1,2,0,4,11,2,11],["0D7",1,1,0,4,12,1,12],["0E2",1,1,0,4,11,1,11],["0ED",1,2,0,4,11,1,11],["147",1,1,1,0,1,0,1]]},
12:{x:3,m:[["0D7",1,1,0,4,11,1,11],["0E2",1,1,0,4,12,1,12],["0EB",1,1,0,4,11,1,11],["0F1",1,1,0,4,11,1,11],["149",1,1,0,4,12,1,12]]},
},
2:{
1:{x:3,m:[["053",1,3,0,4,10,2,10],["077",1,2,1,0,1,0,1],["084",1,3,0,4,10,2,10],["096",1,2,0,4,11,1,11],["0BA",1,2,0,4,11,2,11]]},
2:{x:3,m:[["02A",1,3,0,4,12,2,12],["09F",1,2,0,4,11,2,11],["0A4",1,1,0,4,10,2,10],["0C8",1,3,0,4,11,2,11],["0DC",1,1,1,4,11,1,11]]},
3:{x:4,m:[["040",1,4,1,0,1,0,1],["04C",1,2,0,4,12,2,12],["0A3",1,2,0,4,11,1,11],["0B1",1,2,0,4,12,2,12]]},
4:{x:4,m:[["034",1,3,0,4,11,2,11],["062",1,3,0,4,11,2,11],["086",1,3,0,4,11,2,11],["08F",1,3,0,4,12,2,12],["0AC",1,1,0,4,11,1,11]]},
5:{x:4,m:[["062",1,3,0,4,11,2,11],["094",1,2,0,4,12,2,12],["0B2",1,2,0,4,11,1,11],["0CB",1,2,0,4,12,2,12],["0DD",1,1,0,4,11,1,11]]},
6:{x:4,m:[["097",1,3,0,4,12,2,12],["0A6",1,1,0,4,12,2,12],["0BC",1,2,0,4,12,2,12],["0D5",1,2,0,4,11,1,11],["105",1,2,0,4,12,2,12]]},
7:{x:4,m:[["01B",1,3,0,4,12,2,12],["0B8",1,1,0,4,12,2,12],["0DE",1,1,0,4,12,2,12],["105",1,2,0,4,12,2,12],["141",1,1,0,4,11,1,11]]},
8:{x:3,m:[["035",1,2,0,4,11,2,11],["04D",1,2,0,4,12,2,12],["0A8",1,2,0,4,12,2,12],["0B8",1,2,0,4,12,2,12],["141",1,2,0,4,12,2,12]]},
9:{x:3,m:[["035",1,2,0,4,11,2,11],["0B8",1,2,0,4,11,1,11],["0C2",1,2,0,4,11,1,11],["0EF",1,2,0,4,11,1,11],["141",1,3,0,4,11,1,11]]},
10:{x:3,m:[["04D",1,2,0,4,11,1,11],["0C2",1,2,0,4,11,1,11],["0EF",1,2,0,4,11,1,11],["0FE",1,2,0,4,11,1,11],["14A",1,1,0,4,12,1,12]]},
11:{x:3,m:[["0B9",1,1,0,4,12,1,12],["0E6",1,1,1,0,1,0,1],["0EF",1,2,0,4,11,1,11],["0FE",1,2,0,4,11,1,11],["14A",1,1,0,4,12,1,12]]},
12:{x:3,m:[["0E4",1,1,1,0,1,0,1],["0E5",1,1,1,0,1,0,1],["0E6",1,1,1,0,1,0,1],["0F2",1,1,0,4,12,1,12],["14A",1,1,0,4,11,1,11]]},
},
3:{
1:{x:3,m:[["008",1,3,0,4,10,2,10],["067",1,3,0,4,10,2,10],["06A",1,2,0,4,11,1,11],["06D",1,3,0,4,11,2,11]]},
2:{x:3,m:[["012",1,3,0,4,11,2,11],["05F",1,3,0,4,12,2,12],["065",1,2,0,4,11,2,11],["072",1,3,0,4,11,2,11],["0CA",1,2,0,4,11,1,11]]},
3:{x:4,m:[["068",1,3,0,4,11,2,11],["06D",1,3,0,4,10,2,10],["0A5",1,1,0,4,11,1,11],["0E8",1,4,0,4,11,2,11],["0E9",1,2,0,4,11,2,11]]},
4:{x:4,m:[["056",1,2,0,4,12,2,12],["079",1,3,1,0,1,0,1],["0A2",1,2,0,4,12,2,12],["0A5",1,1,0,4,12,2,12],["0D9",1,1,0,4,10,1,10]]},
5:{x:4,m:[["031",1,3,0,4,10,2,10],["0BE",1,1,0,4,12,2,12],["0CC",1,2,0,4,11,1,11],["0D9",1,1,0,4,12,2,12],["103",1,2,0,4,12,2,12]]},
6:{x:4,m:[["0B2",1,2,0,4,12,2,12],["0B7",1,1,0,4,12,2,12],["0C1",1,2,0,4,12,2,12],["0CC",1,3,0,4,12,2,12],["103",1,2,0,4,12,2,12]]},
7:{x:4,m:[["02F",1,3,0,4,11,2,11],["0B7",1,1,0,4,12,2,12],["0C1",1,2,0,4,12,2,12],["0CE",1,2,0,4,12,2,12],["0DE",1,3,0,4,12,2,12]]},
8:{x:3,m:[["05D",1,3,0,4,11,2,11],["0C4",1,2,0,4,12,2,12],["0E0",1,1,0,4,12,2,12],["0F3",1,2,0,4,12,2,12],["143",1,2,0,4,12,2,12]]},
9:{x:3,m:[["0B8",1,2,0,4,11,1,11],["0E0",1,2,0,4,11,1,11],["0F7",1,2,0,4,11,1,11],["0FA",1,2,0,4,11,1,11],["143",1,2,0,4,11,1,11]]},
10:{x:3,m:[["0B9",1,1,0,4,11,1,11],["0F6",1,2,0,4,11,1,11],["0F7",1,2,0,4,11,1,11],["0FA",1,2,0,4,11,1,11]]},
11:{x:3,m:[["0EC",1,1,0,4,12,1,12],["0F6",1,2,0,4,11,1,11],["0FA",1,2,0,4,11,1,11],["145",1,1,0,4,11,1,11]]},
12:{x:3,m:[["0EC",1,2,0,4,12,1,12],["0F4",1,1,0,4,11,1,11],["0F8",1,2,0,4,9,1,9],["145",1,1,0,4,12,1,12]]},
},
4:{
1:{x:3,m:[["03D",1,3,0,4,13,2,13],["05E",1,3,0,4,10,2,10],["09D",1,3,0,4,11,2,11],["0CF",1,2,0,4,12,2,12],["104",1,2,0,4,12,1,12]]},
2:{x:3,m:[["051",1,2,0,4,11,2,11],["095",1,2,0,4,13,2,13],["09E",1,3,0,4,13,2,13],["0B3",1,2,0,4,11,2,11],["0D4",1,2,0,4,10,1,10]]},
3:{x:4,m:[["059",1,2,0,4,13,2,13],["06E",1,3,0,4,12,2,12],["0A2",1,3,0,4,13,2,13],["0CD",1,2,0,4,9,1,9],["104",1,2,0,4,10,2,10]]},
4:{x:4,m:[["013",1,3,0,4,11,2,11],["05A",1,2,0,4,12,2,12],["0A0",1,3,0,4,13,2,13],["0FF",1,2,0,4,12,2,12],["106",1,1,0,4,12,1,12]]},
5:{x:4,m:[["057",1,3,0,4,12,2,12],["060",1,3,0,4,12,2,12],["070",1,2,0,4,13,2,13],["0B4",1,3,0,4,13,2,13],["107",1,1,0,4,11,1,11]]},
6:{x:4,m:[["057",1,2,0,4,12,2,12],["0A8",1,1,0,4,12,2,12],["0A9",1,1,0,4,11,2,11],["0B4",1,2,0,4,13,2,13],["102",1,2,0,4,12,1,12]]},
7:{x:4,m:[["037",1,3,0,4,6,2,6],["0A8",1,1,0,4,12,1,12],["0AF",1,1,0,4,12,2,12],["0DA",1,1,0,4,13,2,13],["102",1,1,0,4,12,2,12]]},
8:{x:3,m:[["0B5",1,2,0,4,13,2,13],["0DA",1,1,0,4,12,2,12],["0F3",1,2,0,4,13,2,13],["0F5",1,1,0,4,12,2,12],["14B",1,1,0,4,12,2,12]]},
9:{x:3,m:[["0F0",1,2,0,4,11,1,11],["0F3",1,2,0,4,11,1,11],["0F5",1,1,0,4,12,1,12],["0F8",1,2,0,4,9,1,9],["14B",1,1,0,4,12,1,12]]},
10:{x:3,m:[["0F0",1,2,0,4,12,1,12],["0F8",1,2,0,4,9,1,9],["0FB",2,3,0,4,10,1,10],["10C",1,1,0,4,12,1,12],["14B",1,1,0,4,11,1,11]]},
11:{x:3,m:[["0B0",1,1,0,4,12,1,12],["0F8",1,2,0,4,9,1,9],["0FB",2,3,0,4,12,1,12],["0FD",1,2,0,4,11,1,11],["10C",1,1,0,4,12,1,12]]},
12:{x:3,m:[["0B0",1,1,0,4,12,1,12],["0FD",1,2,0,4,12,1,12],["108",1,1,0,4,12,1,12],["10C",1,1,0,4,11,1,11],["148",1,1,1,0,1,0,1]]},
},
5:{
1:{x:3,m:[["03E",1,3,0,4,10,1,10],["074",1,3,0,4,12,2,12],["07B",1,3,0,4,11,2,11],["07F",1,3,0,4,12,2,12],["0C8",1,1,0,4,11,2,11]]},
2:{x:3,m:[["086",1,3,0,4,11,1,11],["087",1,2,0,4,11,2,11],["08D",1,3,0,4,11,2,11],["0BB",1,2,0,4,12,2,12],["0D0",1,3,0,4,11,2,11]]},
3:{x:4,m:[["015",1,4,0,4,11,2,11],["02C",1,3,0,4,11,2,11],["078",1,3,1,0,1,0,1],["08C",1,3,0,4,10,2,10],["0DC",1,2,0,4,11,1,11]]},
4:{x:4,m:[["01B",1,3,0,4,12,2,12],["040",1,4,1,0,1,0,1],["078",1,3,1,0,1,0,1],["0A7",1,1,0,4,11,1,11],["0B1",1,2,0,4,11,2,11]]},
5:{x:4,m:[["080",1,2,0,4,11,2,11],["088",1,2,0,4,12,2,12],["092",1,3,0,4,11,2,11],["0A7",1,2,0,4,12,2,12],["0C9",1,2,0,4,11,1,11]]},
6:{x:4,m:[["02E",1,3,0,4,11,2,11],["06B",1,3,0,4,12,2,12],["0B2",1,2,0,4,12,2,12],["0C0",1,2,0,4,10,1,10],["0DF",1,3,0,4,12,2,12]]},
7:{x:4,m:[["0AA",1,1,0,4,12,2,12],["0C0",1,3,0,4,10,2,10],["0C3",1,2,0,4,12,2,12],["0C6",1,2,0,4,11,1,11],["0DF",1,2,0,4,12,2,12]]},
8:{x:3,m:[["0C3",1,2,0,4,12,2,12],["0D5",1,2,0,4,12,2,12],["0D6",1,1,0,4,11,1,11],["0DA",1,1,0,4,12,2,12],["0FC",1,2,0,4,12,2,12]]},
9:{x:3,m:[["0B5",1,2,0,4,11,1,11],["0D6",1,1,0,4,11,1,11],["0F9",1,2,0,4,11,1,11],["0FC",1,2,0,4,11,1,11],["109",1,1,0,4,11,1,11]]},
10:{x:3,m:[["0C7",1,2,0,4,11,1,11],["0F9",1,2,0,4,11,1,11],["0FC",1,2,0,4,11,1,11],["109",1,1,0,4,11,1,11],["144",1,1,0,4,11,1,11]]},
11:{x:3,m:[["0AB",1,1,0,4,12,1,12],["0C7",1,2,0,4,11,1,11],["0F9",1,2,0,4,11,1,11],["144",1,1,0,4,11,1,11],["14D",1,1,0,4,11,1,11]]},
12:{x:3,m:[["0AB",1,1,0,4,12,1,12],["0C7",1,2,0,4,11,1,11],["0E7",1,1,1,0,1,0,1],["0EE",1,1,0,4,11,1,11],["14D",1,1,0,4,12,1,12]]},
},
};
const GROTTO_SUPPORT={
1:{
1:[["00B",1,4,3,21],["00E",1,3,4,21],["022",1,4,3,21],["082",1,2,4,21],["08C",1,3,4,21,["100",1,3,3,21]]],
2:[["036",1,4,3,21],["03B",1,3,3,21],["063",1,2,4,21],["087",1,2,4,21],["0BD",1,1,4,21,["08A",1,2,3,21]]],
3:[["034",1,4,4,21],["083",1,2,4,21],["08B",1,2,3,21],["099",1,2,3,21],["101",1,3,3,21],["0BD",1,1,4,21]],
4:[["076",1,3,3,21],["07C",1,3,3,21],["080",1,2,4,21],["0AE",1,1,4,21],["0D9",1,1,4,21,["064",1,2,3,21]]],
5:[["052",1,3,4,21],["07D",1,3,3,21],["0B6",1,3,3,21],["0C5",1,3,3,21],["0DD",1,2,4,21],["0AE",1,1,4,21]],
6:[["02F",1,4,4,21],["089",1,2,4,21],["097",1,2,4,21],["0A9",1,2,3,21],["105",1,2,3,21],["0DF",1,1,3,21]],
7:[["04D",1,2,2,34],["089",1,2,6,34],["0B4",1,1,7,34],["0B7",1,2,6,34],["0D5",1,3,7,34],["0AA",1,2,6,34]],
8:[["037",1,3,3,33],["0C6",1,3,6,33],["0F5",1,1,5,33],["102",1,2,6,33],["109",1,1,7,33],["0AF",1,1,6,33]],
9:[["0AF",1,1,5,35],["0ED",1,1,7,35],["109",1,1,6,35],["14E",1,1,7,35],["0F5",1,1,5,35],["0C6",1,3,5,35]],
10:[["0B5",2,4,2,27],["0ED",1,2,6,27],["0F1",1,1,7,27],["14E",1,1,6,27],["141",1,2,6,27]],
11:[["035",1,4,3,33],["0D7",1,1,7,33],["0E2",1,1,7,33],["0ED",1,3,5,33],["0F1",1,1,6,33],["14E",1,1,5,33]],
12:[["0D7",1,1,6,31],["0E2",1,1,6,31],["0EB",1,1,7,31],["0F1",1,1,5,31],["149",1,1,7,31]]
},
2:{
1:[["053",1,2,3,16],["084",1,3,3,16],["096",1,2,4,16],["0BA",1,2,4,16],["0DC",1,1,2,16]],
2:[["02A",1,4,4,17],["09F",1,2,4,17],["0A4",1,1,3,17],["0C8",1,1,4,17],["0BC",1,2,2,17]],
3:[["04C",1,3,1,20],["0A3",1,2,6,20],["0B1",1,2,7,20,["032",1,3,6,20]]],
4:[["034",1,4,4,17],["062",1,4,4,17],["086",1,3,3,17],["08F",1,3,4,17],["0AC",1,1,2,17]],
5:[["062",1,4,4,20],["094",1,2,4,20],["0B2",1,2,4,20],["0CB",1,2,4,20],["0DD",1,1,2,20],["097",1,2,2,20]],
6:[["097",1,2,4,21],["0A6",1,1,3,21],["0BC",1,2,3,21],["0D5",1,2,3,21],["105",1,2,4,21],["0B2",1,2,4,21]],
7:[["01B",1,3,1,19],["0B8",1,1,4,19],["0DE",1,1,4,19],["105",1,2,3,19],["141",1,1,3,19],["0A6",1,1,4,19]],
8:[["035",1,3,3,31],["04D",1,2,2,31],["0A8",1,1,6,31],["0B8",1,2,7,31],["141",1,2,7,31],["0DE",1,1,6,31]],
9:[["035",1,2,5,31],["0B8",1,2,6,31],["0C2",1,2,7,31],["0EF",1,2,7,31],["141",1,2,6,31]],
10:[["04D",1,3,1,32],["0C2",1,2,6,32],["0EF",1,3,6,32],["0FE",1,2,7,32],["14A",1,1,7,32],["0FC",1,2,5,32]],
11:[["0B9",1,2,1,29],["0EF",1,3,7,29],["0FE",1,2,7,29],["14A",1,1,7,29],["0C2",1,2,7,29]],
12:[["0E4",1,1,7,27],["0E5",1,1,7,27],["0F2",1,2,1,27],["035",1,4,6,27],["0FE",1,2,6,27]]
},
3:{
1:[["008",1,4,3,18],["067",1,4,4,18],["06A",1,4,4,18],["06D",1,3,3,18],["05C",1,4,4,18]],
2:[["012",1,4,4,20],["05F",1,3,3,20],["065",1,2,3,20],["072",1,2,4,20],["0CA",1,2,3,20],["06A",1,4,3,20]],
3:[["068",1,4,4,23],["06D",1,3,3,23],["0A5",1,1,3,23],["0E8",1,4,4,23],["0E9",1,2,4,23],["054",1,2,5,23]],
4:[["056",1,2,3,18],["0A2",1,2,4,18],["0A5",1,1,5,18],["0D9",1,1,3,18],["0BE",1,1,3,18]],
5:[["031",1,4,3,21],["0BE",1,1,4,21],["0CC",1,2,3,21],["0D9",1,1,4,21],["103",1,2,4,21],["0AD",1,1,3,21]],
6:[["0B2",1,2,4,21],["0B7",1,1,3,21],["0C1",1,2,3,21],["0CC",1,2,4,21],["103",1,2,3,21],["0AD",1,1,4,21]],
7:[["02F",1,3,3,21],["0B7",1,1,4,21],["0C1",1,2,4,21],["0CE",1,3,4,21],["0DE",1,1,3,21],["05D",1,3,3,21]],
8:[["05D",1,4,6,36],["0C4",1,2,5,36],["0E0",1,2,5,36],["0F3",1,2,7,36],["143",1,1,7,36],["02F",1,4,6,36]],
9:[["0B8",1,2,6,36],["0E0",1,2,5,36],["0F7",1,2,7,36],["0FA",1,2,7,36],["143",1,2,6,36],["0C4",1,2,5,36]],
10:[["0B9",1,2,1,29],["0F6",1,2,7,29],["0F7",1,1,7,29],["0FA",1,2,7,29],["143",1,2,7,29]],
11:[["0EC",1,1,7,30],["0F6",1,2,6,30],["0FA",1,3,5,30],["145",1,1,7,30],["0F7",1,3,5,30]],
12:[["0EC",1,2,6,27],["0F4",1,1,7,27],["0F8",1,2,6,27],["145",1,1,7,27],["0F2",1,4,1,27]]
},
4:{
1:[["03D",1,4,3,21],["05E",1,3,4,21],["09D",1,2,4,21],["0CF",1,2,4,21],["104",1,2,3,21,["04B",1,2,3,21]]],
2:[["051",1,2,3,21],["095",1,2,4,21],["09E",1,2,4,21],["0B3",1,2,3,21],["0D4",1,2,3,21],["101",1,2,4,21]],
3:[["059",1,2,3,21],["06E",1,3,4,21],["0A2",1,2,4,21],["0CD",1,2,3,21],["104",1,2,4,21],["101",1,2,3,21]],
4:[["013",1,4,3,20],["05A",1,2,3,20],["0A0",1,2,4,20],["0FF",1,2,4,20],["106",1,1,4,20],["107",1,1,2,20]],
5:[["057",1,2,4,21],["060",1,3,3,21],["070",1,2,3,21],["0B4",1,2,3,21],["107",1,1,4,21],["0A9",1,2,4,21]],
6:[["057",1,2,3,21],["0A8",1,1,4,21],["0A9",1,2,3,21],["0B4",1,2,3,21],["102",1,2,4,21],["0CE",1,2,4,21]],
7:[["037",1,4,3,25],["0A8",1,1,4,25],["0AF",1,1,4,25],["0DA",1,1,5,25],["102",1,2,5,25],["0CE",1,2,4,25]],
8:[["0B5",1,4,2,33],["0DA",1,1,6,33],["0F3",1,2,5,33],["0F5",1,1,7,33],["14B",1,1,7,33],["037",1,4,6,33]],
9:[["0F0",1,2,7,31],["0F3",1,2,5,31],["0F5",1,1,6,31],["0F8",1,2,7,31],["14B",1,1,6,31]],
10:[["0F0",1,2,6,36],["0F8",1,2,6,36],["0FB",1,2,7,36],["10C",1,1,7,36],["14B",1,1,5,36],["0F5",1,1,5,36]],
11:[["0B0",1,1,7,36],["0F8",1,2,5,36],["0FB",1,2,6,36],["0FD",1,1,7,36],["10C",1,1,6,36],["0F0",1,2,5,36]],
12:[["0B0",1,1,7,29],["0FD",1,2,7,29],["108",1,1,7,29],["10C",1,1,7,29],["0B9",1,2,1,29]]
},
5:{
1:[["03E",1,4,4,21],["074",1,4,3,21],["07B",1,3,4,21],["07F",1,2,3,21],["0C8",1,1,4,21,["025",1,4,3,21]]],
2:[["086",1,3,3,21],["087",1,2,3,21],["08D",1,3,4,21],["0BB",1,2,4,21],["0D0",1,2,4,21],["02C",1,4,3,21]],
3:[["015",1,4,4,14],["02C",1,4,3,14],["08C",1,3,3,14],["0DC",1,1,4,14]],
4:[["01B",1,3,1,29],["0A7",1,2,7,29],["0B1",1,2,7,29],["088",1,2,7,29],["0DC",1,1,7,29]],
5:[["080",1,2,3,21],["088",1,2,4,21],["092",1,3,3,21],["0A7",1,2,3,21],["0C9",1,1,4,21],["02E",1,3,4,21]],
6:[["02E",1,4,5,24],["06B",1,4,3,24],["0B2",1,2,3,24],["0C0",1,2,4,24],["0DF",1,1,5,24],["0AA",1,1,4,24]],
7:[["0AA",1,1,3,21],["0C0",1,2,3,21],["0C3",1,2,4,21],["0C6",1,2,4,21],["0DF",1,2,3,21],["0D5",1,2,4,21]],
8:[["0C3",1,2,5,33],["0D5",1,3,5,33],["0D6",1,1,7,33],["0DA",1,1,6,33],["0FC",1,2,3,33],["0AF",1,1,7,33]],
9:[["0B5",2,3,2,34],["0D6",1,1,6,34],["0F9",1,2,7,34],["0FC",1,2,6,34],["109",1,1,7,34],["0AF",1,1,6,34]],
10:[["0C7",1,2,7,36],["0F9",1,2,6,36],["0FC",1,2,5,36],["109",1,1,6,36],["144",1,1,7,36],["0D6",1,1,5,36]],
11:[["0AB",1,1,7,36],["0C7",1,2,6,36],["0F9",1,2,5,36],["144",1,1,6,36],["14D",1,1,7,36],["109",1,1,5,36]],
12:[["0AB",1,1,6,29],["0C7",1,2,5,29],["0EE",1,1,7,29],["14D",1,1,6,29],["144",1,1,5,29]]
}
};
const _METAL_MONSTERS=new Set(['01B','04C','04D','0B5','0B9','0F2']);
function _isMultiOnly(combo){
const counts={};
for(const v of combo){
if(v.jp==='おうえん'||_HIDEN_SKILLS.has(v.jp)){
counts[v.jp]=(counts[v.jp]||0)+1;
if(counts[v.jp]>=2)return true;
}
}
return false;
}
const _METAL_PADDING=[
['攻撃','Attack',8,'メタスラ','🗡'],
['攻撃','Attack',8,'風林火山','🌀'],
['しっぷうづき','Mercurial Thrust',8,'メタスラ','🗡'],
['はやぶさ斬り','Falcon Slash',16,'メタスラ','🗡'],
['メタル斬り','Metal Slash',8,'',''],
['メタル斬り','Metal Slash',9,'はやぶさの剣','⚔'],
['とうこん討ち','Clap Trap',14,'メタスラ','🗡'],
['とうこん討ち','Clap Trap',14,'風林火山','🌀'],
['無心こうげき',"Blind Man's Biff",8,'メタスラ','🗡'],
['無心こうげき',"Blind Man's Biff",8,'風林火山','🌀'],
['火ふき芸','Hot Lick',120,'miss','💨'],
['ビッグバン','Big Banga',74,'miss','💨'],
['ドルマドン','Kazammle',59,'miss','💨'],
['メラガイアー','Kafrizzle',41,'miss','💨'],
['おうえん','Egg On',0,'',''],
];
const _WEAPON_METAL_SHORT={'メタスラ':1};
function _weaponMetalFlag(eq){
if(eq==null||eq===''||eq==='miss')return 0;
if(eq in _WEAPON_METAL_SHORT)return _WEAPON_METAL_SHORT[eq];
return(typeof WEAPON_META!=='undefined'&&WEAPON_META[eq]&&WEAPON_META[eq].metal)?1:0;
}
function _weaponIsFalcon(eq){
if(eq==='はやぶさの剣')return true;
return!!(typeof WEAPON_META!=='undefined'&&WEAPON_META[eq]&&WEAPON_META[eq].falcon);
}
function _metalEffect(skillMetal,weaponMetal){return(skillMetal||weaponMetal)?1:0;}
function _metalChipMaxDmg(jp,eq){
const sk=(typeof SKILL_IDX!=='undefined')?SKILL_IDX[jp]:null;
if(!sk)return 0;
if(sk.el&&sk.el>0)return 0;
if(_metalEffect(sk.metal?1:0,_weaponMetalFlag(eq))===0)return 0;
let hits;
if(sk.fh)hits=_weaponIsFalcon(eq)?sk.fh:(sk.hit||Math.floor(sk.fh/2));
else hits=sk.hit||1;
return 2*hits;
}
function _metalChipsOK(comboPads,metalHPs){
if(!metalHPs||metalHPs.length===0)return true;
const chips=comboPads.filter(c=>(c.mdmg||0)>0).map(c=>c.mdmg);
if(chips.length===0)return true;
const minHPs=metalHPs.map(h=>Math.floor(h*0.8));
const D=chips.reduce((a,b)=>a+b,0);
const cap=minHPs.reduce((s,h)=>s+Math.max(0,h-1),0);
if(D>cap)return false;
const maxChip=Math.max(...chips);
const maxBin=Math.max(...minHPs.map(h=>h-1));
if(maxChip>maxBin)return false;
return true;
}
function _solverFindMetal(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads){
metalCount=metalCount||monCount;
const issenAT=14;
const totalIssenAT=issenAT*metalCount;
if(bat<totalIssenAT)return[];
if(metalCount>maxSlots)return[];
const remaining=bat-totalIssenAT;
const issen={jp:'一閃づき',en:'Thunder Thrust',at:14,equip:'',note:'',hits:1};
const issenTail=Array(metalCount).fill(issen);
if(remaining===0)return[issenTail.slice()];
const pads=_METAL_PADDING
.map(([jp,en,at,eq,note])=>({jp,en,at,equip:eq,note,hits:1,mdmg:(eq==='miss'?0:_metalChipMaxDmg(jp,eq))}))
.filter(p=>p.equip==='miss'||p.at===0||p.mdmg>0)
.filter(p=>!excludedPads||!excludedPads.has(p.jp));
pads.sort((a,b)=>b.at-a.at);
const results=[];
const MAX=3;
const padSlots=maxSlots-metalCount;
function dfs(startIdx,rem,combo){
if(results.length>=MAX)return;
if(rem===0){
if(_metalChipsOK(combo,metalHPs))results.push([...combo,...issenTail]);
return;
}
if(rem<0||combo.length>=padSlots)return;
for(let i=startIdx;i<pads.length;i++){
if(pads[i].at===0&&rem>0&&combo.length>=padSlots-1)continue;
if(pads[i].at>rem)continue;
combo.push(pads[i]);
dfs(i,rem-pads[i].at,combo);
combo.pop();
}
}
dfs(0,remaining,[]);
results.sort((a,b)=>a.length-b.length);
return results;
}
const _SOLVER_ENTRIES=[
{jp:'攻撃'},
{jp:'攻撃',en:'Attack(All)',ga:true,diff:4},
{jp:'しっぷうづき'},
{jp:'はやぶさ斬り'},
{jp:'メタル斬り'},
{jp:'とうこん討ち'},
{jp:'火ふき芸'},
{jp:'ビッグバン'},
{jp:'ドルマドン'},
{jp:'メラガイアー'},
{jp:'メラゾーマ'},
{jp:'メラ'},
{jp:'森羅万象斬'},
{jp:'さばきの杖'},
{jp:'なぎはらい'},
{jp:'みのがす'},
{jp:'ザラキーマ'},
{jp:'おうえん'},
{jp:'波紋演舞'},
{jp:'バギムーチョ'},
{jp:'ギガスロー'},
{jp:'双竜打ち',alias:'双竜打ち (単体)',soloGroup:true},
{jp:'マヒャド'},
{jp:'ランドインパクト'},
{jp:'マグマの杖'},
{jp:'ギガブレイク'},
{jp:'らせん打ち'},
{jp:'ジゴスパーク'},
{jp:'マヒャデドス'},
{jp:'愛のムチ'},
{jp:'オノむそう'},
{jp:'グランドネビュラ'},
{jp:'ヒャダルコ'},
{jp:'パワフルスロー'},
{jp:'バックダンサー呼び'},
{jp:'シャイニングボウ'},
{jp:'地這い大蛇'},
{jp:'ゴッドスマッシュ'},
{jp:'無心こうげき'},
];
const _SOLVER_SK={};
for(const e of _SOLVER_ENTRIES){
_SOLVER_SK[e.jp]=SKILL_IDX[e.alias||e.jp]||null;
}
let _solverGroupCounts=null;
let _solverFieldTotal=null;
function _solverExpand(monCount,protectedSups){
const variants=[];
for(const e of _SOLVER_ENTRIES){
const sk=SKILL_IDX[e.alias||e.jp];
if(!sk)continue;
if(protectedSups&&protectedSups.length&&sk.target!=='S'){
let couldKillSup=false;
for(const supHex of protectedSups){
const supMon=MONSTER_DB[supHex];
if(supMon&&_maxSkillDmg(e.alias||e.jp,supHex)>=supMon.s[0]){couldKillSup=true;break;}
}
if(couldKillSup)continue;
}
if(sk.target==='RS'||sk.target==='RG'||sk.target==='RA'){
if(monCount>1)continue;
const hr=sk.hitRange;
if(hr&&hr.normalMin!==hr.max){
for(let h=1;h<hr.normalMin;h++){
const earlyAT=first+diff*Math.max(0,h-1);
variants.push({jp:e.jp,en,at:earlyAT,equip:'',note:`⚡${h}hit`,hits:h,earlyKill:true});
}
continue;
}
}
const first=sk.at[0];
const diff=e.diff!==undefined?e.diff:sk.at[1];
const en=e.en||sk.en;
const isGA=!!e.ga;
if(isGA&&e.jp==='攻撃'&&monCount<=1)continue;
const isMulti=isGA||sk.target==='A'||sk.target==='G';
const hitBased=!isMulti&&isHitBased(sk);
const baseHits=hitBased?getHits(sk,false,false):0;
if(isMulti){
if(diff===0){
if(sk.target==='G'&&_solverGroupCounts){
for(let gi=0;gi<_solverGroupCounts.length;gi++){
variants.push({jp:e.jp,en,at:first,equip:'',note:'',hits:0,tgtGroup:gi});
}
}else{
variants.push({jp:e.jp,en,at:first,equip:'',note:'',hits:0});
}
}else if(sk.target==='G'&&_solverGroupCounts){
for(let gi=0;gi<_solverGroupCounts.length;gi++){
for(let k=1;k<=_solverGroupCounts[gi];k++){
variants.push({jp:e.jp,en,at:first+diff*(k-1),equip:'',note:'',hits:0,aoeK:k,tgtGroup:gi});
}
}
}else{
const kMaxA=(typeof _solverFieldTotal==='number'&&_solverFieldTotal>0)?_solverFieldTotal:monCount;
for(let k=1;k<=kMaxA;k++){
if(e.jp==='攻撃'&&k<=1)continue;
variants.push({jp:e.jp,en,at:first+diff*(k-1),equip:'',note:'',hits:0,aoeK:k});
}
}
}else{
const n=hitBased?baseHits:(sk.hit||1);
const nAT=first+diff*Math.max(0,n-1);
variants.push({jp:e.jp,en,at:nAT,equip:'',note:'',hits:hitBased?baseHits:0,soloGroup:e.soloGroup});
if(hitBased){
if(sk.fh){
const fHits=getHits(sk,true,false);
if(fHits>baseHits){
const fAT=first+diff*Math.max(0,fHits-1);
if(fAT!==nAT)variants.push({jp:e.jp,en,at:fAT,equip:'はやぶさの剣',note:'⚔',hits:fHits});
}
}else if(sk.kph){
const kHits=getHits(sk,true,false);
if(kHits>baseHits){
const kAT=first+diff*Math.max(0,kHits-1);
if(kAT!==nAT)variants.push({jp:e.jp,en,at:kAT,equip:'キラーピアス',note:'💍',hits:kHits,needDeath0:true});
}
}
}
}
}
return variants;
}
function _solverFind(bat,monCount,maxSlots,protectedSups){
if(bat<=0)return[];
const variants=_solverExpand(monCount,protectedSups);
const results=[];
let depthCap=0;
function dfs(startIdx,remaining,combo,maxDepth){
if(results.length>=depthCap)return;
if(remaining===0&&combo.length===maxDepth){
results.push(combo.slice());
return;
}
if(remaining<=0||combo.length>=maxDepth)return;
for(let i=startIdx;i<variants.length;i++){
const v=variants[i];
if(v.at===0)continue;
if(v.at>remaining)continue;
combo.push(v);
dfs(i,remaining-v.at,combo,maxDepth);
combo.pop();
}
}
for(let depth=1;depth<=maxSlots;depth++){
depthCap=results.length+15;
dfs(0,bat,[],depth);
}
return results;
}
function _solverLegend(){
const L=DISPLAY_LANG;
const legends=[
['⚔',L==='EN'?'Falcon Blade':L==='JP'?'はやぶさの剣':'隼劍'],
['🪡',L==='EN'?'Poison Needle (1dmg, death=0 only)':L==='JP'?'どくばり(固傷1)':'毒針(固傷1,限death=0)'],
['🗡',L==='EN'?'Metal Slime Sword/Spear':L==='JP'?'メタスラの剣・やり':'金屬史萊姆劍・槍'],
['🌀',L==='EN'?'Attribeauty':'風林火山'],
['📕',L==='EN'?"Gladiator's Guide":L==='JP'?'バトルマスターの書':'戰鬥大師秘傳書'],
['💨',L==='EN'?'Miss (AT consumed)':L==='JP'?'ミス（AT消費あり）':'Miss（AT 照常消耗）'],
['🔱',L==='EN'?'Poker':L==='JP'?'きしんのまそう':'鬼神槍'],
];
return'<div style="font-size:9px;color:#666;margin:4px 0 2px 0;line-height:1.6;">'
+legends.map(([e,n])=>e+'<span style="color:#888;">'+n+'</span>').join('')
+'</div>';
}
const JOB_STATS=[
{jp:'戦士',en:'Warrior',s:[744,300,504,278,300,421]},
{jp:'僧侶',en:'Priest',s:[309,300,301,512,700,416]},
{jp:'魔法使い',en:'Mage',s:[282,700,196,601,300,514]},
{jp:'武闘家',en:'Martial Artist',s:[739,300,499,700,300,465]},
{jp:'盗賊',en:'Thief',s:[639,300,399,610,381,612]},
{jp:'旅芸人',en:'Minstrel',s:[586,461,346,559,495,514]},
{jp:'ﾊﾞﾄﾙﾏｽﾀｰ',en:'Gladiator',s:[840,300,600,224,300,466]},
{jp:'ﾊﾟﾗﾃﾞｨﾝ',en:'Paladin',s:[694,300,454,173,464,219]},
{jp:'魔法戦士',en:'Armamentalist',s:[691,582,451,273,300,320]},
{jp:'ﾚﾝｼﾞｬｰ',en:'Ranger',s:[645,300,405,364,500,710]},
{jp:'賢者',en:'Sage',s:[309,537,302,318,508,267]},
{jp:'ｽｰﾊﾟｰｽﾀｰ',en:'Luminary',s:[334,377,248,561,618,469]},
{jp:'種ﾄﾞｰﾋﾟﾝｸﾞ',en:'Boosted',s:[999,999,999,999,999,999]},
];
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
function _readCharStats(){
const chars=[];
for(let i=1;i<=4;i++){
const v=(id)=>parseInt(document.getElementById(id)?.value)||0;
const jobRaw=document.getElementById('si_job'+i)?.value;
chars.push({
stats:{
atk:v('si_atk'+i),might:v('si_might'+i),
str:v('si_str'+i),mending:v('si_mend'+i),deft:v('si_deft'+i),
},
agi:v('si_agi'+i),
lv:parseInt(document.getElementById('si_t'+i)?.value)||99,
job:(jobRaw===undefined||jobRaw==='')?null:parseInt(jobRaw),
slot:i,
});
}
chars.sort((a,b)=>b.agi-a.agi);
return chars;
}
const _EXT_STATS={atk:999,might:999,str:914,mending:600,deft:500};
function _extremeRatingOK(combo,hexId,mon,killTargets){
const orig=_readCharStats;
_readCharStats=()=>orig().map(c=>({...c,stats:{..._EXT_STATS}}));
try{const b=_bestAssign(combo,hexId,mon,killTargets,1,null);return{rating:b.rating,finIdx:b.finIdx};}
finally{_readCharStats=orig;}
}
function _maxSkillDmg(jp,hexId){
const sd=SKILL_IDX[jp];
const mon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
if(!sd||!mon)return 9999;
const tFactor=(sd.tmul&&sd.tmul[mon.t])||1;
const base=calcBaseDmg(sd,{atk:999,str:999,might:999,mending:999,deft:999});
if(!base){
const def=mon.s[2];
const ratio=def/999;
let phyMax;
if(ratio>=2){phyMax=1;}
else if(ratio>=1.75){phyMax=Math.floor(999/16);}
else{
const zBase=Math.floor(999/2)-Math.floor(def/4);
const z=Math.floor(Math.max(zBase,0)*(sd.mul||1));
phyMax=z+Math.floor(z/16)+1;
}
return Math.max(0,Math.floor(applyElementMod(phyMax,sd.el,hexId)*tFactor));
}
return Math.max(0,Math.floor(applyElementMod(base.max,sd.el,hexId)*tFactor));
}
function _monHex(monId){
if(!monId)return null;
if(typeof monId==='string')return monId.toUpperCase();
return monId.toString(16).toUpperCase().padStart(3,'0');
}
function _solverMinStat(combo,hexId,tensionMul,fource){
tensionMul=tensionMul||1;
const mon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
if(!mon)return null;
const hp=mon.s[0];
if(combo.length!==1){
if(tensionMul!==1||fource)return null;
let totalMax=0;
const stats=new Set();
for(const v of combo){
const rsk=_SOLVER_SK[v.jp];const sd=rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[v.jp];
if(sd&&sd.dmg&&sd.dmg.st)stats.add(sd.dmg.st);
else if(v.at>0)stats.add('atk');
const hits=v.hits||1;
totalMax+=_maxSkillDmg(v.jp,hexId)*hits;
}
if(totalMax<Math.floor(hp*0.8))return null;
return{stat:'multi',min:0,label:[...stats].map(s=>_statLabel(s)).join('+')};
}
const v=combo[0],hits=v.hits||1;
const rsk=_SOLVER_SK[v.jp];const sd=rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[v.jp];
let elMul;
if(fource&&!(sd&&sd.el)){
elMul=(fource.mod/100)*_FOURCE_BONUS;
}else if(sd&&sd.el){
if(fource)return null;
elMul=(mon.s[sd.el]||100)/100;
}else{
elMul=1;
}
if(elMul<=0)return{stat:null,min:Infinity,label:'×'};
const mul=tensionMul*elMul;
if(sd&&sd.dmg){
const d=sd.dmg;
if(!d.m||d.b===d.m){
return((d.b-d.s)*hits*mul>=hp)?{stat:null,min:0,label:''}:null;
}
const needBase=Math.ceil(hp/(mul*hits))+d.s;
if(needBase<=d.b)return{stat:d.st,min:d.lo,label:_statLabel(d.st)+'≥'+d.lo};
if(needBase>d.m)return null;
const need=Math.ceil(d.lo+(needBase-d.b)*(d.hi-d.lo)/(d.m-d.b));
return{stat:d.st,min:Math.min(need,999),label:_statLabel(d.st)+'≥'+Math.min(need,999)};
}
if(!sd||!sd.el){
const sk=rsk||(typeof SKILL_IDX!=='undefined'?SKILL_IDX[v.jp]:null);
if(!sk)return null;
const fEls=fource?((typeof _FOURCE_EL!=='undefined'&&_FOURCE_EL[fource.jp])||null):null;
const killAt=(a)=>{
const r=calcSkillDamage(sk,{atk:a,might:0,str:0,mending:0,deft:0},hexId,fEls);
return r?(Math.floor(r.min*tensionMul)*hits>=hp):false;
};
if(!killAt(999))return null;
let lo=0,hi=999;
while(lo<hi){const m=(lo+hi)>>1;if(killAt(m))hi=m;else lo=m+1;}
return{stat:'atk',min:lo,label:'ATK≥'+lo};
}
return null;
}
function _statLabel(st){
switch(st){
case'might':return'M';
case'str':return'STR';
case'str+might':return'STR+M';
case'str+deft':return'STR+D';
case'mending':return'Mend';
default:return'ATK';
}
}
function _skillClassLock(action){
const sk=_SOLVER_SK[action.jp]||SKILL_IDX[action.jp];
return(sk&&sk.cat==='spell'&&Array.isArray(sk.cls))?sk.cls:null;
}
function _bestAssign(combo,hexId,mon,killTargets,tensionMul,fourceEls){
const chars=_readCharStats();
const N=chars.length,n=combo.length;
const _rkA=r=>r==='gold'?2:r==='orange'?1:0;
if(n>N){
const out={};
const rating=_solverDmgCheck(combo,hexId,mon,killTargets,tensionMul,fourceEls,out);
return{rating,assign:null,defend:[],eggAssign:out.eggAssign||null,round1Removed:out.round1Removed,finIdx:out.finIdx,positional:true};
}
const locks=combo.map(_skillClassLock);
const idxs=[];for(let i=0;i<N;i++)idxs.push(i);
let best=null;
const pick=[];
const dfs=(start)=>{
if(best&&_rkA(best.rating)===2)return;
if(pick.length===n){
for(let i=0;i<n;i++){if(locks[i]){const j=chars[pick[i]].job;if(j===null||!locks[i].includes(j))return;}}
const assign=pick.slice();
const out={};
const rating=_solverDmgCheck(combo,hexId,mon,killTargets,tensionMul,fourceEls,out,assign);
if(!best||_rkA(rating)>_rkA(best.rating)){
best={rating,assign,defend:idxs.filter(k=>!assign.includes(k)),eggAssign:out.eggAssign||null,round1Removed:out.round1Removed,finIdx:out.finIdx};
}
return;
}
for(let i=start;i<N;i++){pick.push(i);dfs(i+1);pick.pop();}
};
dfs(0);
if(!best)return{rating:null,assign:null,defend:idxs.slice(),eggAssign:null,round1Removed:null,infeasible:true};
return best;
}
function _solverDmgCheck(combo,hexId,mon,killTargets,tensionMul,fourceEls,outInfo,assign){
const chars=_readCharStats();
if(!mon)return null;
tensionMul=tensionMul||1;
if(!killTargets||(killTargets.length===1&&killTargets[0].count<=1)){
const perSkill=[];
for(let ci=0;ci<combo.length&&ci<chars.length;ci++){
const sk=_SOLVER_SK[combo[ci].jp]||SKILL_IDX[combo[ci].jp];
if(!sk){perSkill.push({min:0,max:0,perHitMax:0,hits:1});continue;}
if(combo[ci].at===0){perSkill.push({min:0,max:0,perHitMax:0,hits:1});continue;}
const hits=combo[ci].hits||1;
const result=calcSkillDamage(sk,chars[assign?assign[ci]:ci].stats,hexId,fourceEls);
perSkill.push(result
?{min:result.min*hits,max:result.max*hits,perHitMax:result.max,hits}
:{min:0,max:0,perHitMax:0,hits:1});
}
const hp100=mon.s[0],hp80=Math.floor(hp100*0.8);
const totalMin=perSkill.reduce((s,d)=>s+d.min,0);
const totalMax=perSkill.reduce((s,d)=>s+d.max,0);
if(totalMax<hp80){if(outInfo)outInfo.cleanIncomplete=true;return null;}
let _cleanFi=false;
for(let fi=0;fi<perSkill.length;fi++){
const fin=perSkill[fi];
if(fin.max<=0)continue;
if(combo.some((v,i)=>i!==fi&&v.earlyKill))continue;
if(fin.hits>1){
const chipMaxForStab=totalMax-fin.max;
const remainHP=hp80-chipMaxForStab;
if((fin.hits-1)*Math.floor(fin.perHitMax*tensionMul)>=remainHP)continue;
}
const finMin=Math.floor(fin.min*tensionMul);
const finMax=Math.floor(fin.max*tensionMul);
const chipMin=totalMin-fin.min;
const chipMax=totalMax-fin.max;
if(chipMax>=hp80)continue;
if(chipMin+finMin>=hp100){if(outInfo){outInfo.finIdx=fi;if(tensionMul>1)outInfo.eggAssign={[fi]:tensionMul};}return'gold';}
if(chipMax+finMax>=hp80){if(outInfo){outInfo.finIdx=fi;if(tensionMul>1)outInfo.eggAssign={[fi]:tensionMul};}return'orange';}
_cleanFi=true;
}
if(outInfo)outInfo.cleanIncomplete=_cleanFi;
return null;
}
const targets=killTargets.map(t=>{
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[t.hex]:null;
return{hex:t.hex,count:t.count,death:t.death!==undefined?t.death:(m?m.s[12]:100),
hp:m?m.s[0]:9999,mon:m};
});
const instances=[];
for(let ti=0;ti<targets.length;ti++){
for(let c=0;c<targets[ti].count;c++){
instances.push({hex:targets[ti].hex,hp:targets[ti].hp,
death:targets[ti].death,mon:targets[ti].mon,groupIdx:ti});
}
}
if(instances.length===0)return null;
const uniqueHexes=[...new Set(killTargets.map(t=>t.hex))];
const inlineFource=combo.find(v=>v.at===0&&typeof _FOURCE_EL!=='undefined'&&_FOURCE_EL[v.jp]);
const effectiveFEls=inlineFource?(_FOURCE_EL[inlineFource.jp]||[]):fourceEls;
const hasFource=effectiveFEls&&effectiveFEls.length>0;
const skillDmg=[];
for(let ci=0;ci<combo.length&&ci<chars.length;ci++){
const sk=_SOLVER_SK[combo[ci].jp]||SKILL_IDX[combo[ci].jp];
const hits=combo[ci].hits||1;
const tgt=!sk?null:(sk.target==='A'||sk.target==='RA')?'A':(sk.target==='G'||sk.target==='RG')?'G':'S';
const dmg={},dmgF={};
for(const hex of uniqueHexes){
if(!sk){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
const tMon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hex]:null;
if(!tMon){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
const r=calcSkillDamage(sk,chars[assign?assign[ci]:ci].stats,hex,null);
dmg[hex]=r?{min:r.min*hits,max:r.max*hits,phMax:r.max}:{min:0,max:0,phMax:0};
if(hasFource){
const rF=calcSkillDamage(sk,chars[assign?assign[ci]:ci].stats,hex,effectiveFEls);
dmgF[hex]=rF?{min:rF.min*hits,max:rF.max*hits,phMax:rF.max}:dmg[hex];
}else{
dmgF[hex]=dmg[hex];
}
}
skillDmg.push({dmg,dmgF,tgt,hits,ci,jp:combo[ci].jp});
}
const eggCIs=[];
const dmgCIs=[];
for(let ci=0;ci<combo.length;ci++){
if(combo[ci].jp==='おうえん')eggCIs.push(ci);
}
for(let ci=0;ci<skillDmg.length;ci++){
if(skillDmg[ci]&&combo[ci].at>0)dmgCIs.push(ci);
}
function _genEggAssigns(){
if(eggCIs.length===0)return[null];
const results=[];
const validPerEgg=eggCIs.map(eCI=>dmgCIs.filter(dCI=>dCI>eCI));
function recurse(idx,counts){
if(idx>=eggCIs.length){
const assign={};
for(const ci in counts){
assign[ci]=_TENSION[Math.min(counts[ci]-1,_TENSION.length-1)].mul;
}
results.push(assign);
return;
}
for(const t of validPerEgg[idx]){
counts[t]=(counts[t]||0)+1;
recurse(idx+1,counts);
counts[t]--;
if(counts[t]===0)delete counts[t];
}
}
recurse(0,{});
return results.length>0?results:[null];
}
const externalAssign=(!eggCIs.length&&tensionMul>1&&dmgCIs.length>0)
?{[dmgCIs[dmgCIs.length-1]]:tensionMul}:null;
function _simRun(mode,eggAssign){
const sim=instances.map(inst=>({
hex:inst.hex,groupIdx:inst.groupIdx,death:inst.death,
hp:mode==='min'?inst.hp:Math.floor(inst.hp*0.8),
hpLow:Math.floor(inst.hp*0.8),
alive:true
}));
let fourceOn=!inlineFource&&hasFource;
let mainKilled=false;
for(let ci=0;ci<skillDmg.length;ci++){
const sd=skillDmg[ci];
if(combo[ci].jp==='みのがす'){
for(const inst of sim){
if(!inst.alive||inst.death<=0)continue;
if(inst.groupIdx===0&&!mainKilled)return{allDead:false,rejectAt:ci,reason:'mercymain'};
inst.alive=false;
}
continue;
}
if(combo[ci].jp==='おうえん')continue;
if(inlineFource&&combo[ci].jp===inlineFource.jp&&!fourceOn){fourceOn=true;continue;}
if(!sd.tgt)continue;
const mul=(eggAssign&&eggAssign[ci])?eggAssign[ci]:1;
const dTable=fourceOn?sd.dmgF:sd.dmg;
const alive=sim.filter(i=>i.alive);
if(alive.length===0)return{allDead:false,rejectAt:ci,reason:'earlyclear'};
if(combo[ci].aoeK!==undefined){
let hitN;
if(sd.tgt==='A')hitN=alive.length;
else if(sd.tgt==='G'){
if(combo[ci].tgtGroup!==undefined)hitN=alive.filter(i=>i.groupIdx===combo[ci].tgtGroup).length;
else{const gsz={};for(const inst of alive)gsz[inst.groupIdx]=(gsz[inst.groupIdx]||0)+1;hitN=Math.max.apply(null,Object.values(gsz));}
}
else hitN=1;
if(combo[ci].aoeK!==hitN)return{allDead:false,rejectAt:ci,reason:'aoeK'};
}
const useDmg=mode==='min'?'min':'max';
if(sd.tgt==='A'){
for(const inst of alive){
const d=(dTable[inst.hex]||{})[useDmg]||0;
const dMax=(dTable[inst.hex]||{}).max||0;
inst.hp-=Math.floor(d*mul);
inst.hpLow-=Math.floor(dMax*mul);
if(inst.hpLow<=0&&inst.hp>0)return{allDead:false,rejectAt:ci,reason:'uncertain'};
if(inst.hp<=0){inst.alive=false;if(inst.groupIdx===0)mainKilled=true;}
}
}else if(sd.tgt==='G'){
let grpInsts;
if(combo[ci].tgtGroup!==undefined){
grpInsts=alive.filter(inst=>inst.groupIdx===combo[ci].tgtGroup);
}else{
const groups={};
for(const inst of alive){if(!groups[inst.groupIdx])groups[inst.groupIdx]=[];groups[inst.groupIdx].push(inst);}
let bestGrp=null,bestLen=0;
for(const g in groups){if(groups[g].length>bestLen||(groups[g].length===bestLen&&+g===0)){bestLen=groups[g].length;bestGrp=g;}}
grpInsts=bestGrp!==null?groups[bestGrp]:[];
}
for(const inst of grpInsts){
const d=(dTable[inst.hex]||{})[useDmg]||0;
const dMax=(dTable[inst.hex]||{}).max||0;
inst.hp-=Math.floor(d*mul);
inst.hpLow-=Math.floor(dMax*mul);
if(inst.hpLow<=0&&inst.hp>0)return{allDead:false,rejectAt:ci,reason:'uncertain'};
if(inst.hp<=0){inst.alive=false;if(inst.groupIdx===0)mainKilled=true;}
}
}else{
alive.sort((a,b)=>b.hp-a.hp);
let target=alive[0];
if(combo[ci].soloGroup){
const gc={};
for(const x of alive)gc[x.groupIdx]=(gc[x.groupIdx]||0)+1;
target=alive.find(x=>gc[x.groupIdx]===1);
if(!target)return{allDead:false,rejectAt:ci,reason:'soloGroup'};
}else if(combo[ci].tgtGroup!==undefined){
target=alive.find(x=>x.groupIdx===combo[ci].tgtGroup);
if(!target)return{allDead:false,rejectAt:ci,reason:'tgtdead'};
}
const d=(dTable[target.hex]||{})[useDmg]||0;
const dMax=(dTable[target.hex]||{}).max||0;
const phMax=(dTable[target.hex]||{}).phMax||0;
if(sd.hits>1&&(sd.hits-1)*Math.floor(phMax*mul)>=target.hpLow)return{allDead:false,rejectAt:ci,reason:'ruleA'};
target.hp-=Math.floor(d*mul);
target.hpLow-=Math.floor(dMax*mul);
if(target.hpLow<=0&&target.hp>0)return{allDead:false,rejectAt:ci,reason:'uncertain'};
if(target.hp<=0){target.alive=false;if(target.groupIdx===0)mainKilled=true;}
}
}
return{allDead:sim.every(i=>!i.alive),rejectAt:-1,reason:null};
}
function _round1Removed(eggAssign){
const sim=instances.map(inst=>({hex:inst.hex,groupIdx:inst.groupIdx,death:inst.death,hp:inst.hp,alive:true}));
let fourceOn=!inlineFource&&hasFource;
const init=sim.length;
let r1MainKilled=false;
for(let ci=0;ci<skillDmg.length&&ci<4;ci++){
const sd=skillDmg[ci];
if(combo[ci].jp==='みのがす'){for(const x of sim){if(x.alive&&x.death>0&&(x.groupIdx>0||r1MainKilled))x.alive=false;}continue;}
if(combo[ci].jp==='おうえん')continue;
if(inlineFource&&combo[ci].jp===inlineFource.jp&&!fourceOn){fourceOn=true;continue;}
if(!sd.tgt)continue;
const mul=(eggAssign&&eggAssign[ci])?eggAssign[ci]:1;
const dTable=fourceOn?sd.dmgF:sd.dmg;
const alive=sim.filter(i=>i.alive);
if(alive.length===0)break;
if(sd.tgt==='A'){
for(const x of alive){x.hp-=Math.floor(((dTable[x.hex]||{}).min||0)*mul);if(x.hp<=0){x.alive=false;if(x.groupIdx===0)r1MainKilled=true;}}
}else if(sd.tgt==='G'){
let grp;
if(combo[ci].tgtGroup!==undefined){
grp=alive.filter(x=>x.groupIdx===combo[ci].tgtGroup);
}else{
const groups={};
for(const x of alive){(groups[x.groupIdx]=groups[x.groupIdx]||[]).push(x);}
let bg=null,bl=0;
for(const g in groups){if(groups[g].length>bl||(groups[g].length===bl&&+g===0)){bl=groups[g].length;bg=g;}}
grp=bg!==null?groups[bg]:[];
}
for(const x of grp){x.hp-=Math.floor(((dTable[x.hex]||{}).min||0)*mul);if(x.hp<=0){x.alive=false;if(x.groupIdx===0)r1MainKilled=true;}}
}else{
alive.sort((a,b)=>b.hp-a.hp);
let t=alive[0];
if(combo[ci].soloGroup){
const gc={};
for(const x of alive)gc[x.groupIdx]=(gc[x.groupIdx]||0)+1;
t=alive.find(x=>gc[x.groupIdx]===1);
if(!t)continue;
}else if(combo[ci].tgtGroup!==undefined){
t=alive.find(x=>x.groupIdx===combo[ci].tgtGroup);
if(!t)continue;
}
t.hp-=Math.floor(((dTable[t.hex]||{}).min||0)*mul);if(t.hp<=0){t.alive=false;if(t.groupIdx===0)r1MainKilled=true;}
}
}
return sim.filter(i=>i.alive).length<init;
}
const assigns=eggCIs.length>0?_genEggAssigns():[externalAssign];
const _lastCI=skillDmg.length-1;
const _mercyFinal=_lastCI>=0&&combo[_lastCI]&&combo[_lastCI].jp==='みのがす';
const _finalActionCI=_mercyFinal?-1:_lastCI;
let bestRating=null,bestAssign=null;
let _cleanIncomplete=false;
for(const assign of assigns){
const r=_simRun('min',assign);
if(r.allDead&&r.rejectAt<0){bestRating='gold';bestAssign=assign;break;}
if(!r.allDead&&r.rejectAt<0)_cleanIncomplete=true;
}
if(!bestRating&&!_mercyFinal){
for(const assign of assigns){
const rMin=_simRun('min',assign);
if(rMin.reason==='uncertain'&&rMin.rejectAt===_finalActionCI){
const rMax=_simRun('max',assign);
if(rMax.allDead){bestRating='orange';bestAssign=assign;break;}
}
}
}
if(outInfo){if(bestAssign)outInfo.eggAssign=bestAssign;outInfo.round1Removed=_round1Removed(bestAssign);outInfo.cleanIncomplete=_cleanIncomplete;}
return bestRating;
}
function _comboCanAntiBlk(combo){
for(const v of combo){
if(v.at===0)continue;
const rsk=_SOLVER_SK[v.jp];const sd=rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[v.jp];
if(sd&&sd.blk===0)continue;
if(v.equip)return false;
let hasAntiBlk=false;
for(const wm of Object.values(WEAPON_META)){
if(wm.antiBlk&&_WEAPON_SKILLS[wm.cat]&&_WEAPON_SKILLS[wm.cat].has(v.jp)){
hasAntiBlk=true;break;
}
}
if(!hasAntiBlk)return false;
}
return true;
}
function _planAFinisher(combo,hexId,mon,killTargets,maxSlots){
if(!killTargets||killTargets.length<2)return null;
if(!combo.every(v=>v.at>0))return null;
const aIdx=[];
for(let i=0;i<combo.length;i++){const sk=_SOLVER_SK[combo[i].jp]||SKILL_IDX[combo[i].jp];if(sk&&sk.target==='A')aIdx.push(i);}
if(aIdx.length!==1)return null;
const fin=combo[aIdx[0]];
if((fin.hits||1)>1)return null;
const chips=combo.filter((v,i)=>i!==aIdx[0]);
const freeCI=[];
for(let ci=0;ci<chips.length;ci++){
const sk=_SOLVER_SK[chips[ci].jp]||SKILL_IDX[chips[ci].jp];
if(!sk)return null;
if(sk.target==='S'&&!chips[ci].soloGroup&&chips[ci].tgtGroup===undefined){freeCI.push(ci);continue;}
if(sk.target==='G'&&chips[ci].tgtGroup!==undefined)continue;
return null;
}
const chars=_readCharStats();
const nG=killTargets.length;
const dmgOf=(v)=>{
const sk=_SOLVER_SK[v.jp]||SKILL_IDX[v.jp];const hits=v.hits||1;const out={};
for(const t of killTargets){
let mn=0,mx=0;
for(const c of chars){const r=calcSkillDamage(sk,c.stats,t.hex,null);if(r){if(r.min>mn)mn=r.min;if(r.max>mx)mx=r.max;}}
out[t.hex]={min:mn*hits,max:mx*hits};
}
return out;
};
const finD=dmgOf(fin);
const chipD=chips.map(dmgOf);
const tiers=[{eggs:0,mul:1}].concat(_TENSION);
let vBudget=48;
for(const tier of tiers){
if(combo.length+tier.eggs>maxSlots)break;
let feas=true;const needG=[],capG=[];
for(let g=0;g<nG;g++){
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[killTargets[g].hex]:null;
if(!m){feas=false;break;}
const H=m.s[0];
needG[g]=Math.max(0,H-Math.floor((finD[killTargets[g].hex].min||0)*tier.mul));
capG[g]=Math.floor(H*0.8)-1;
if(needG[g]>0&&(killTargets[g].count||1)>1){feas=false;break;}
if(needG[g]>capG[g]){feas=false;break;}
}
if(!feas)continue;
const baseMin=new Array(nG).fill(0),baseMax=new Array(nG).fill(0);
for(let ci=0;ci<chips.length;ci++){
if(freeCI.indexOf(ci)>=0)continue;
const g=chips[ci].tgtGroup;const hx=killTargets[g].hex;
baseMin[g]+=chipD[ci][hx].min;baseMax[g]+=chipD[ci][hx].max;
}
const idxs=freeCI.map(()=>0);
while(true){
const minS=baseMin.slice(),maxS=baseMax.slice();
freeCI.forEach((ci,k)=>{const g=idxs[k];const hx=killTargets[g].hex;minS[g]+=chipD[ci][hx].min;maxS[g]+=chipD[ci][hx].max;});
let ok=true;
for(let g=0;g<nG;g++){if(minS[g]<needG[g]||maxS[g]>capG[g]){ok=false;break;}}
if(ok){
const prefix=Array(tier.eggs).fill({jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0});
const planned=[...prefix,...chips.map((c,ci)=>{const k=freeCI.indexOf(ci);return k>=0?Object.assign({},c,{tgtGroup:idxs[k]}):c;}),fin];
if(--vBudget<0)return null;
const pb=_bestAssign(planned,hexId,mon,killTargets,1,null);
if(pb.rating==='gold')return{combo:planned,eggAssign:pb.eggAssign,assign:pb.assign,defend:pb.defend,round1Removed:pb.round1Removed,multiOnly:tier.eggs>=2};
}
let j=0;
while(j<idxs.length&&++idxs[j]>=nG){idxs[j]=0;j++;}
if(j>=idxs.length)break;
}
}
return null;
}
function _trimGroups(groups,max){
groups=groups.slice();
let total=groups.reduce((s,v)=>s+v,0);
while(total>max){
let changed=false;
for(let g=0;g<groups.length&&total>max;g++){
const excess=total-max;
const amt=excess>=12?4:excess>=9?3:excess>=6?2:1;
const floor=g===0?1:0;
const remove=Math.min(amt,groups[g]-floor);
if(remove>0){groups[g]-=remove;total-=remove;changed=true;}
}
if(!changed)break;
}
return groups;
}
function _renderKathwack(monId,monGroups){
const hexId=_monHex(monId);
const useJP=DISPLAY_LANG!=='EN';
const name=useJP?'ザラキーマ':'Kathwack';
const groups=(monGroups&&monGroups.length)?monGroups:(hexId?[{hex:hexId,count:1}]:[]);
for(const g of groups){
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[g.hex]:null;
if(!m||m.s[12]<=0){
return`<div style="font-size:10px;margin-left:16px;color:#666;">${name} <span style="color:#f44;">✗</span> <span style="font-size:9px;color:#888;">death=0</span></div>`;
}
}
const chars=_readCharStats();
const might=Math.max(...chars.map(c=>c.stats.might||0));
let baseAcc;
if(might>=799)baseAcc=100;
else if(might>200)baseAcc=75+(might-200)*25/599;
else baseAcc=75;
const fmtAcc=v=>(v%1===0)?v+'%':v.toFixed(1)+'%';
let html='<div style="font-size:10px;margin-left:16px;">';
html+=`<span style="color:#ccc;">${name}</span> `;
const accColor=baseAcc>=100?'#4f4':'#0ff';
html+=`<span style="color:${accColor};font-size:9px;">M=${might} → ${fmtAcc(baseAcc)}</span>`;
const multi=groups.length>1||(groups[0]&&(groups[0].count||1)>1);
let wipe=1,anyRes=false;
for(const g of groups){
const m=MONSTER_DB[g.hex];
const res=m.s[12];
const cnt=g.count||1;
const eff=baseAcc*res/100;
wipe*=Math.pow(eff/100,cnt);
if(res<100)anyRes=true;
if(res<100||multi){
const nm=multi?(useJP?m.jp:m.en)+(cnt>1?'×'+cnt:'')+' ':'';
html+=` <span style="color:#f80;font-size:9px;">${nm}×d=${res} → ${fmtAcc(eff)}</span>`;
}
}
if(multi){
html+=` <span style="color:#ff0;font-size:9px;">${useJP ? '全滅' : 'wipe'}≈${(wipe * 100) % 1 === 0 ? (wipe * 100) + '%' : (wipe * 100).toFixed(1) + '%'}</span>`;
}
if(baseAcc<100){
html+=!anyRes
?' <span style="color:#888;font-size:9px;">(100%: M≥799)</span>'
:' <span style="color:#888;font-size:9px;">(max: M≥799)</span>';
}
html+='</div>';
return html;
}
window._solverComboMap={};
window._solverComboId=0;
function _expandCombo(id){
const el=document.getElementById('combo_detail_'+id);
if(!el)return;
if(el.innerHTML){el.style.display=el.style.display==='none'?'block':'none';return;}
const data=window._solverComboMap[id];
if(!data)return;
el.innerHTML=_solverSimTrace(data);
el.style.display='block';
}
function _solverDriveStat(sk){
if(!sk||!sk.dmg)return'atk';
if(sk.dmg.st){
const s=sk.dmg.st;
return(s==='might'||s==='str'||s==='mending')?s:null;
}
return null;
}
function _solverStatBound(sk,monId,hits,hp,dir,fEls){
const key=_solverDriveStat(sk);
if(!key)return null;
const dmgAt=(v)=>{const st={atk:0,might:0,str:0,mending:0,deft:0};st[key]=v;const r=calcSkillDamage(sk,st,monId,fEls);return r||{min:0,max:0};};
const MAXV=999;
if(dir==='kill'){
if(dmgAt(MAXV).min*hits<hp)return{key,val:Infinity};
let lo=0,hi=MAXV;while(lo<hi){const m=(lo+hi)>>1;if(dmgAt(m).min*hits>=hp)hi=m;else lo=m+1;}return{key,val:lo};
}
if(dir==='chip'){
if(dmgAt(MAXV).max*hits<hp)return{key,val:Infinity};
let lo=0,hi=MAXV;while(lo<hi){const m=(lo+hi+1)>>1;if(dmgAt(m).max*hits<hp)lo=m;else hi=m-1;}return{key,val:lo};
}
if(dir==='detcap'){
if(hits<=1)return{key,val:Infinity};
if((hits-1)*dmgAt(MAXV).max<hp)return{key,val:Infinity};
let lo=0,hi=MAXV;while(lo<hi){const m=(lo+hi+1)>>1;if((hits-1)*dmgAt(m).max<hp)lo=m;else hi=m-1;}return{key,val:lo};
}
return null;
}
function _solverHintStr(sk,monId,hits,hpHigh,hpLow,fEls){
const key=_solverDriveStat(sk);
if(!key)return'<span style="color:#667;">固定傷害 · 無屬性門檻</span>';
const label={atk:'攻擊力',might:'攻魔',str:'力',mending:'回魔'}[key]||key;
const chip=_solverStatBound(sk,monId,hits,Math.max(1,hpLow),'chip',fEls);
const kill=_solverStatBound(sk,monId,hits,Math.max(1,hpHigh),'kill',fEls);
const parts=[];
parts.push('削血≤'+(chip?(chip.val===Infinity?'任意':chip.val):'?'));
parts.push('收尾'+(kill?(kill.val===Infinity?'(殺不死)':'≥'+kill.val):'?'));
if(hits>1){const det=_solverStatBound(sk,monId,hits,Math.max(1,hpLow),'detcap',fEls);if(det&&det.val!==Infinity)parts.push('滿hit<'+det.val);}
if(hpLow<=0)parts.unshift('<span style="color:#f80;">前置招恐已殺</span>');
return'<span style="color:#789;">['+label+'] '+parts.join(' · ')+'</span>';
}
function _solverSimTrace(data){
const{combo,killTargets,eggAssign,assign,defend}=data;
if(!killTargets||killTargets.length===0)return'<div style="color:#666;font-size:9px;margin-left:24px;">—</div>';
const instances=[];
for(let ti=0;ti<killTargets.length;ti++){
const t=killTargets[ti];
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[t.hex]:null;
const baseName=m?(DISPLAY_LANG==='EN'?m.en:m.jp):t.hex;
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
const sk=_SOLVER_SK[action.jp]||SKILL_IDX[action.jp];
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
const gr={};for(const i of alive){if(!gr[i.groupIdx])gr[i.groupIdx]=[];gr[i.groupIdx].push(i);}let best=null,bLen=0;for(const g in gr){if(gr[g].length>bLen){bLen=gr[g].length;best=g;}}return best!==null?gr[best]:[];})():
(()=>{
const mt=alive.find(i=>(typeof _METAL_MONSTERS!=='undefined')&&_METAL_MONSTERS.has(_monHex(i.hex)));
if(mt)return[mt];
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
if(isMetalTgt&&action.jp==='一閃づき'){
details+=inst.name+': HP'+inst.hp+'→<span style="color:#f44;">💀金屬必殺</span> ';
inst.hp=0;inst.hpLow=0;inst.alive=false;
continue;
}
let dMin,dMax;
if(isMetalTgt){
const elemental=!!(sk.el&&sk.el>0);
const me=(typeof _metalEffect==='function')&&_metalEffect(sk.metal||0,(typeof _weaponMetalFlag==='function'?_weaponMetalFlag(action.equip):0));
if(!elemental&&me){dMin=1*hits;dMax=2*hits;}else{dMin=0;dMax=0;}
}else{
const r=calcSkillDamage(sk,char.stats,inst.hex,curFEls);
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
if(!repIsMetal)html+='<div style="margin-left:10px;font-size:8px;">↳ '+_solverHintStr(sk,repInst.hex,hits,repHpHigh,repHpLow,curFEls)+'</div>';
}
}
if(defend&&defend.length){
html+='<div style="color:#789;margin-top:1px;">防禦: '+defend.map(i=>_charLabel(chars[i])).join(', ')+'</div>';
}
html+='</div>';
return html;
}
function _solverRender(bat,monGroups,monId,mapDeft,canRound2){
if(canRound2===undefined)canRound2=mapDeft<1000;
try{
if(bat<0)return'';
const T=monGroups.reduce((s,g)=>s+g.count,0);
const realT=monGroups.reduce((s,g)=>s+(g.count||1),0);
const tc2=Math.floor(realT/2);
if(bat===0){
const allD=monGroups.every(g=>{const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[g.hex]:null;return m&&m.s[12]>0;});
if(allD)return _renderKathwack(monId,monGroups);
return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
}
const hexId=_monHex(monId);
const isMetal=hexId&&_METAL_MONSTERS.has(hexId);
const mainGroup=monGroups[0];
const sups=monGroups.filter(g=>!g.isMain);
const hasSups=sups.length>0&&sups.some(g=>g.count>0);
const _nonMetalSups=sups.filter(g=>(g.count>0)&&g.hex&&!_METAL_MONSTERS.has(_monHex(g.hex)));
let excludedPads=null;
if(isMetal&&_nonMetalSups.length>0&&typeof calcSkillDamage==='function'){
excludedPads=new Set();
const _killStats={atk:999,might:999,str:914,mending:600,deft:500};
const _seen=new Set();
for(const row of _METAL_PADDING){
const jp=row[0];
if(_seen.has(jp))continue;_seen.add(jp);
const sk=(typeof SKILL_IDX!=='undefined')?SKILL_IDX[jp]:null;
if(!sk)continue;
if(sk.target==='S'||sk.target==='G')continue;
for(const g of _nonMetalSups){
const r=calcSkillDamage(sk,_killStats,_monHex(g.hex),null);
if(r&&r.kill!==null){excludedPads.add(jp);break;}
}
}
}
const _mercyLv=(typeof _readCharStats==='function')?Math.max(...(_readCharStats().map(c=>c.lv||99))):99;
const _effDeath=(g)=>{
if(!(g.death>0))return 0;
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[g.hex]:null;
return(m&&m.s&&(m.s[13]+7)>_mercyLv)?0:g.death;
};
let planType='kill_all',postAlive=T;
if(T>1){
const d0SC=sups.filter(g=>_effDeath(g)===0).reduce((s,g)=>s+g.count,0);
const dG0SC=sups.filter(g=>_effDeath(g)>0).reduce((s,g)=>s+g.count,0);
if(_effDeath(mainGroup)===0&&dG0SC>0){
planType='mercy_first';postAlive=mainGroup.count+d0SC;
}else if(_effDeath(mainGroup)>0&&(mainGroup.count>=2||dG0SC>0)){
planType='kill_mercy_clear';postAlive=d0SC;
}
}
let killTargets=null;
if(T>1)killTargets=monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)}));
_solverGroupCounts=killTargets?killTargets.map(t=>t.count):null;
_solverFieldTotal=killTargets?killTargets.reduce((s,t)=>s+t.count,0):null;
let combos=[],isRound2=false;
const mercyAction={jp:'みのがす',en:'Mercy',at:0,equip:'',note:'',hits:0};
const eggOnAction={jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0};
const _metalHPs=[];
for(const g of monGroups){
const s=((typeof MONSTER_DB!=='undefined'&&MONSTER_DB[g.hex])||{}).s;
const h=(s&&s[0])?s[0]:999;
for(let i=0;i<(g.count||1);i++)_metalHPs.push(h);
}
if(planType==='kill_all'){
combos=isMetal?_solverFindMetal(bat,T,4,T,_metalHPs,excludedPads):_solverFind(bat,T,4,[]);
if(combos.length===0&&canRound2){
const r2a=isMetal?_solverFindMetal(bat,T,8,T,_metalHPs,excludedPads):_solverFind(bat,T,8,[]);
const r2b=tc2>0
?(isMetal?_solverFindMetal(bat-tc2,T,8,T,_metalHPs,excludedPads):_solverFind(bat-tc2,T,8,[]))
:[];
combos=[...r2a,...r2b].filter(c=>c.length>=5);
isRound2=combos.length>0;
}
}else if(planType==='mercy_first'){
const r1Dmg=isMetal?_solverFindMetal(bat,postAlive,3,postAlive,_metalHPs,excludedPads):_solverFind(bat,postAlive,3,[]);
combos=r1Dmg.map(c=>[mercyAction,...c]);
if(combos.length===0&&canRound2){
if(tc2>0){
const s0=(isMetal?_solverFindMetal(bat-tc2,postAlive,7,postAlive,_metalHPs,excludedPads):_solverFind(bat-tc2,postAlive,7,[]))
.filter(c=>c.length>=4)
.map(c=>[mercyAction,...c]);
combos=combos.concat(s0);
}
const s4=(isMetal?_solverFindMetal(bat,postAlive,7,postAlive,_metalHPs,excludedPads):_solverFind(bat,postAlive,7,[]))
.filter(c=>c.length>=5)
.map(c=>[...c.slice(0,4),mercyAction,...c.slice(4)]);
combos=combos.concat(s4);
isRound2=combos.length>0;
}
}else{
const phaseAVars=_solverExpand(T,[]);
const sSkills=phaseAVars.filter(v=>{
const sk=_SOLVER_SK[v.jp]||SKILL_IDX[v.jp];
return sk&&(sk.target==='S'||sk.target==='RS')&&v.at>0&&v.at<=bat;
});
const kmcFource=(!isMetal&&hexId)?_bestFource(hexId):null;
const kmcFourceAction=kmcFource?{jp:kmcFource.jp,en:kmcFource.en||kmcFource.jp,at:0,equip:'',note:'',hits:0}:null;
const _kmcBuild=(target,loLen,hiLen,cap)=>{
const res=[];
const pushV=(arr)=>{if(arr.length>=loLen&&arr.length<=hiLen&&res.length<cap)res.push(arr);};
const dfsA=(start,seqA,aSum)=>{
if(res.length>=cap)return;
if(aSum>0){
if(postAlive===0){
if(aSum===target){
pushV([...seqA,mercyAction]);
pushV([eggOnAction,...seqA,mercyAction]);
if(kmcFourceAction)pushV([kmcFourceAction,...seqA,mercyAction]);
}
}else{
const bTgt=target-aSum;
if(bTgt>0){
const maxLenB=hiLen-seqA.length-1;
if(maxLenB>=1){
const bCombos=_solverFind(bTgt,postAlive,maxLenB,[]);
for(const b of bCombos){
pushV([...seqA,mercyAction,...b]);
pushV([eggOnAction,...seqA,mercyAction,...b]);
pushV([...seqA,mercyAction,eggOnAction,...b]);
if(kmcFourceAction){
pushV([kmcFourceAction,...seqA,mercyAction,...b]);
pushV([...seqA,mercyAction,kmcFourceAction,...b]);
}
if(res.length>=cap)break;
}
}
}
}
}
if(seqA.length>=hiLen-1)return;
for(let i=start;i<sSkills.length;i++){
if(aSum+sSkills[i].at>target)continue;
seqA.push(sSkills[i]);
dfsA(i,seqA,aSum+sSkills[i].at);
seqA.pop();
}
};
dfsA(0,[],0);
return res;
};
combos=_kmcBuild(bat,1,4,30);
if(canRound2){
const r2a=_kmcBuild(bat,5,8,14);
const r2b=tc2>0?_kmcBuild(bat-tc2,5,8,14):[];
if(r2a.length+r2b.length>0){combos=combos.concat(r2a,r2b);isRound2=true;}
}
}
if(combos.length===0)return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const useJP=(DISPLAY_LANG!=='EN');
const mon=hexId&&typeof MONSTER_DB!=='undefined'?MONSTER_DB[hexId]:null;
const filtered=[];
const fource=(!isMetal&&hexId)?_bestFource(hexId):null;
const useStats=document.getElementById('si_useStats')?.checked;
const canFilter=mon&&!isMetal&&useStats;
const monEvade=mon?mon.s[3]:0;
const monBlock=mon?mon.s[4]:0;
const seen1=new Map();
for(const combo of combos){
if(mon&&combo.some(v=>v.needDeath0)&&mon.s[12]>0)continue;
const dmgParts=combo.filter(v=>v.at>0);
if(dmgParts.length===1){
const v=dmgParts[0];
const rsk=_SOLVER_SK[v.jp];const sd=rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[v.jp];
const statType=(sd&&sd.dmg&&sd.dmg.st)?sd.dmg.st:(sd&&sd.el?'el'+sd.el:'atk');
const key=v.at+'_'+statType;
const vEv=sd?sd.ev:1;
const vBlk=sd?sd.blk:1;
if(seen1.has(key)){
const prev=seen1.get(key);
let dominated=true;
if(monEvade>0&&vEv===0&&prev.ev===1)dominated=false;
if(monBlock>0&&vBlk===0&&prev.blk===1)dominated=false;
if(dominated)continue;
seen1.set(key,{jp:v.jp,ev:vEv,blk:vBlk});
const prevIdx=filtered.findIndex(f=>{
const pDmg=f.combo.filter(x=>x.at>0);
return pDmg.length===1&&pDmg[0].jp===prev.jp;
});
if(prevIdx>=0)filtered.splice(prevIdx,1);
}else{
seen1.set(key,{jp:v.jp,ev:vEv,blk:vBlk});
}
}
if(canFilter){
const baseBest=_bestAssign(combo,hexId,mon,killTargets,1,null);
const dmgInfo={eggAssign:baseBest.eggAssign,round1Removed:baseBest.round1Removed};
const kill=baseBest.rating;
const req=_solverMinStat(combo,hexId);
const _rk=r=>r==='gold'?2:r==='orange'?1:0;
const _baseRk=_rk(kill);
if(kill){
filtered.push({combo,kill,req,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),eggAssign:dmgInfo.eggAssign||null,round1Removed:dmgInfo.round1Removed,assign:baseBest.assign,defend:baseBest.defend,finIdx:baseBest.finIdx});
}else if(req&&req.min<Infinity){
const gateOut={};
_solverDmgCheck(combo,hexId,mon,killTargets,1,null,gateOut,undefined);
const ext=_extremeRatingOK(combo,hexId,mon,killTargets);
if(gateOut.cleanIncomplete&&ext.rating==='gold'){
filtered.push({combo,kill:null,req,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),round1Removed:dmgInfo.round1Removed,finIdx:ext.finIdx});
}
}
if(planType!=='kill_mercy_clear'&&dmgParts.length<4&&_baseRk<2){
for(const t of _TENSION){
if(combo.length+t.eggs>4)break;
const prefix=Array(t.eggs).fill({jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0});
const eggCombo=[...prefix,...combo];
const eggBest=_bestAssign(eggCombo,hexId,mon,killTargets,t.mul,null);
if(eggBest.rating&&(_rk(eggBest.rating)>_baseRk||(eggBest.rating==='orange'&&_baseRk===1))){
const eggReq=_solverMinStat(combo,hexId,t.mul);
filtered.push({combo:eggCombo,kill:eggBest.rating,req:eggReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2,eggAssign:eggBest.eggAssign,round1Removed:eggBest.round1Removed,assign:eggBest.assign,defend:eggBest.defend,finIdx:eggBest.finIdx});
break;
}
}
}
if(fource&&combo.length<4&&_baseRk<2&&combo.some(v=>{const s=_SOLVER_SK[v.jp]||SKILL_IDX[v.jp];return s&&!s.el;})){
const fEls=_FOURCE_EL[fource.jp]||[];
const fCombo=[{jp:fource.jp,en:fource.en||fource.jp,at:0,equip:'',note:'',hits:0},...combo];
const fBest=_bestAssign(fCombo,hexId,mon,killTargets,1,fEls);
if(fBest.rating&&(_rk(fBest.rating)>_baseRk||(fBest.rating==='orange'&&_baseRk===1))){
const fReq=_solverMinStat(combo,hexId,1,fource);
filtered.push({combo:fCombo,kill:fBest.rating,req:fReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),eggAssign:fBest.eggAssign,round1Removed:fBest.round1Removed,assign:fBest.assign,defend:fBest.defend,finIdx:fBest.finIdx});
}
}
if(fource&&_baseRk<2&&combo.some(v=>{const s=_SOLVER_SK[v.jp]||SKILL_IDX[v.jp];return s&&!s.el;})){
const fEls=_FOURCE_EL[fource.jp]||[];
for(const t of _TENSION){
if(combo.length+t.eggs+1>4)break;
const eggPrefix=Array(t.eggs).fill({jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0});
const fourceEntry={jp:fource.jp,en:fource.en||fource.jp,at:0,equip:'',note:'',hits:0};
const efCombo=[...eggPrefix,fourceEntry,...combo];
const efBest=_bestAssign(efCombo,hexId,mon,killTargets,t.mul,fEls);
if(efBest.rating&&(_rk(efBest.rating)>_baseRk||(efBest.rating==='orange'&&_baseRk===1))){
const efReq=_solverMinStat(combo,hexId,t.mul,fource);
filtered.push({combo:efCombo,kill:efBest.rating,req:efReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2,eggAssign:efBest.eggAssign,round1Removed:efBest.round1Removed,assign:efBest.assign,defend:efBest.defend,finIdx:efBest.finIdx});
break;
}
}
}
}else if(mon&&T===1&&!isMetal){
const req=_solverMinStat(combo,hexId);
if(req&&req.min<=999){
filtered.push({combo,kill:null,req,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo)});
}
if(planType!=='kill_mercy_clear'&&combo.length<4){
for(const t of _TENSION){
if(combo.length+t.eggs>4)break;
const eggReq=_solverMinStat(combo,hexId,t.mul);
if(eggReq&&eggReq.min<=999&&(!req||eggReq.min<req.min)){
const prefix=Array(t.eggs).fill({jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0});
filtered.push({combo:[...prefix,...combo],kill:null,req:eggReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2});
break;
}
}
}
if(fource&&combo.length<4&&combo.some(v=>!_SOLVER_SKILL_DATA[v.jp]?.el)){
const fReq=_solverMinStat(combo,hexId,1,fource);
if(fReq&&fReq.min<=999&&(!req||fReq.min<req.min)){
const fCombo=[{jp:fource.jp,en:fource.en||fource.jp,at:0,equip:'',note:'',hits:0},...combo];
filtered.push({combo:fCombo,kill:null,req:fReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo)});
}
}
if(fource&&combo.some(v=>!_SOLVER_SKILL_DATA[v.jp]?.el)){
for(const t of _TENSION){
if(combo.length+t.eggs+1>4)break;
const efReq=_solverMinStat(combo,hexId,t.mul,fource);
if(efReq&&efReq.min<=999&&(!req||efReq.min<req.min)){
const eggPrefix=Array(t.eggs).fill({jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0});
const fourceEntry={jp:fource.jp,en:fource.en||fource.jp,at:0,equip:'',note:'',hits:0};
filtered.push({combo:[...eggPrefix,fourceEntry,...combo],kill:null,req:efReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2});
break;
}
}
}
}else{
filtered.push({combo,kill:isMetal?'metal':null,req:null,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo)});
}
}
for(const entry of filtered){
if(!entry.multiOnly)entry.multiOnly=_isMultiOnly(entry.combo);
}
if(!document.getElementById('si_multiPlayer')?.checked){
for(let i=filtered.length-1;i>=0;i--){
if(filtered[i].multiOnly)filtered.splice(i,1);
}
}
if(T===1&&hexId){
for(const entry of filtered){
if(entry.dmgSkills<=1)continue;
const items=entry.combo.map((v,i)=>({v,i}));
const support=items.filter(x=>x.v.at===0);
let damage=items.filter(x=>x.v.at>0);
if(damage.length>1){
let finIt=null;
if(entry.finIdx!==undefined&&entry.combo[entry.finIdx]&&entry.combo[entry.finIdx].at>0){
finIt=items[entry.finIdx];
damage=damage.filter(x=>x!==finIt);
}
damage.sort((a,b)=>{
const pa=_PRIORITY[a.v.jp]||0,pb=_PRIORITY[b.v.jp]||0;
if(pa!==pb)return pb-pa;
return _maxSkillDmg(a.v.jp,hexId)-_maxSkillDmg(b.v.jp,hexId);
});
const order=[...support,...damage,...(finIt?[finIt]:[])];
entry.combo=order.map(x=>x.v);
if(entry.assign)entry.assign=order.map(x=>entry.assign[x.i]);
if(entry.eggAssign){const na={};for(let k=0;k<order.length;k++){const m=entry.eggAssign[order[k].i];if(m!==undefined)na[k]=m;}entry.eggAssign=na;}
if(finIt)entry.finIdx=order.length-1;
}
}
}
if(canFilter&&T>1&&hexId&&killTargets){
const _permsFull=(arr)=>{
if(arr.length<=1)return[arr.slice()];
const r=[];
for(let i=0;i<arr.length;i++){
const rest=arr.slice(0,i).concat(arr.slice(i+1));
for(const p of _permsFull(rest))r.push([arr[i],...p]);
}
return r;
};
const _perms=(arr)=>{
if(arr.length<=6)return _permsFull(arr);
const seen=new Set(),out=[];
const add=(a)=>{const k=a.map(x=>x.jp).join('|');if(!seen.has(k)){seen.add(k);out.push(a);}};
add(arr.slice());
add(arr.slice().reverse());
for(let i=0;i<arr.length;i++){const rest=arr.slice(0,i).concat(arr.slice(i+1));add([arr[i],...rest]);add([...rest,arr[i]]);}
return out;
};
const _tgN=killTargets.length;
for(const entry of filtered){
if(entry.kill==='gold')continue;
const dmgIdx=[],dmgSk=[];
for(let i=0;i<entry.combo.length;i++){
if(entry.combo[i].at>0){dmgIdx.push(i);dmgSk.push(entry.combo[i]);}
}
const canTG=_tgN>=2;
if(dmgSk.length===0||(dmgSk.length<=1&&!canTG))continue;
const perms=dmgSk.length>1?_perms(dmgSk):[dmgSk];
let bestCombo=entry.combo,bestRating=entry.kill,bestEgg=entry.eggAssign,bestRound1=entry.round1Removed,bestCharAssign=entry.assign,bestDefend=entry.defend;
const rk=r=>r==='gold'?2:r==='orange'?1:0;
const evalCombo=(perm,tgs)=>{
const testCombo=entry.combo.slice();
for(let j=0;j<perm.length;j++){
const tg=tgs?tgs[j]:undefined;
testCombo[dmgIdx[j]]=tg===undefined?perm[j]:Object.assign({},perm[j],{tgtGroup:tg});
}
const pBest=_bestAssign(testCombo,hexId,mon,killTargets,1,null);
if(rk(pBest.rating)>rk(bestRating)){
bestCombo=testCombo;bestRating=pBest.rating;bestEgg=pBest.eggAssign;bestRound1=pBest.round1Removed;bestCharAssign=pBest.assign;bestDefend=pBest.defend;
}
return bestRating==='gold';
};
let done=false;
for(const perm of perms){if(evalCombo(perm,null)){done=true;break;}}
if(!done&&canTG){
let budget=216;
outer:
for(const perm of perms){
const opts=perm.map(v=>{
const sk=_SOLVER_SK[v.jp]||SKILL_IDX[v.jp];
if(!sk||sk.target!=='S'||v.soloGroup||v.tgtGroup!==undefined)return[undefined];
const o=[undefined];
for(let g=0;g<_tgN;g++)o.push(g);
return o;
});
if(opts.every(o=>o.length===1))continue;
const slots=perm.map(()=>0);
while(true){
let j=0;
while(j<slots.length&&++slots[j]>=opts[j].length){slots[j]=0;j++;}
if(j>=slots.length)break;
const tgs=slots.map((sv,k)=>opts[k][sv]);
if(evalCombo(perm,tgs))break outer;
if(--budget<=0)break outer;
}
}
}
if(bestRating!=='gold'){
const plan=_planAFinisher(entry.combo,hexId,mon,killTargets,entry.combo.length<=4?4:8);
if(plan){bestCombo=plan.combo;bestRating='gold';bestEgg=plan.eggAssign;bestRound1=plan.round1Removed;bestCharAssign=plan.assign;bestDefend=plan.defend;if(plan.multiOnly)entry.multiOnly=true;}
}
if(bestRating!=='gold'&&bestCombo.length<=4){
const _mercyIdx35=bestCombo.findIndex(v=>v.jp==='みのがす');
if(_mercyIdx35>=0&&killTargets&&killTargets.length>=2){
const _dmgOnly35=bestCombo.filter(v=>v.at>0);
if(_dmgOnly35.length>=2){
const _lastDmg35=_dmgOnly35[_dmgOnly35.length-1];
const _lastSk35=_SOLVER_SK[_lastDmg35.jp]||SKILL_IDX[_lastDmg35.jp];
if(_lastSk35&&(_lastSk35.target==='A'||_lastSk35.target==='RA')
&&_lastSk35.at&&_lastSk35.at.length>=2&&_lastSk35.at[1]===0){
const plan35=_planAFinisher(_dmgOnly35,hexId,mon,killTargets,bestCombo.length);
if(plan35){
bestCombo=plan35.combo;bestRating='gold';bestEgg=plan35.eggAssign;
bestRound1=plan35.round1Removed;bestCharAssign=plan35.assign;bestDefend=plan35.defend;
if(plan35.multiOnly)entry.multiOnly=true;
}
if(bestRating!=='gold'){
const _swap35=bestCombo.slice();
_swap35[_mercyIdx35]={jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0};
const _swBest35=_bestAssign(_swap35,hexId,mon,killTargets,1,null);
if(rk(_swBest35.rating)>rk(bestRating)){
bestCombo=_swap35;bestRating=_swBest35.rating;bestEgg=_swBest35.eggAssign;
bestRound1=_swBest35.round1Removed;bestCharAssign=_swBest35.assign;bestDefend=_swBest35.defend;
}
}
}
}
}
}
entry.combo=bestCombo;
entry.kill=bestRating;
entry.eggAssign=bestEgg;
entry.round1Removed=bestRound1;
entry.assign=bestCharAssign;
entry.defend=bestDefend;
}
}
if(isRound2&&tc2>0){
for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i];
if(e.combo.length<5)continue;
const atSum=e.combo.reduce((s,v)=>s+(v.at||0),0);
const r1=(e.round1Removed!==undefined?e.round1Removed:false)
||e.combo.slice(0,4).some(a=>a.jp==='みのがす'||a.jp==='一閃づき');
const expected=r1?(bat-tc2):bat;
if(atSum!==expected)filtered.splice(i,1);
}
}
const _MAX_STATS=_EXT_STATS;
if(killTargets){
for(const entry of filtered){
if(entry.dmgSkills<=1)continue;
const c=entry.combo;
const dmgIdx=c.map((v,i)=>v.at>0?i:-1).filter(i=>i>=0);
if(dmgIdx.length<=1)continue;
const lastDI=dmgIdx[dmgIdx.length-1];
const mercyCI=c.findIndex(v=>v.jp==='みのがす');
let exemptCI=-1;
if(mercyCI>=0){
for(let i=mercyCI-1;i>=0;i--){if(c[i].at>0){exemptCI=i;break;}}
}
const sim=[];
for(const t of killTargets){
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[t.hex]:null;
for(let k=0;k<t.count;k++)
sim.push({hex:t.hex,hp:m?m.s[0]:9999,alive:true,death:t.death||0,gi:killTargets.indexOf(t)});
}
let overkill=false;
let r1mk=false;
for(let ci=0;ci<c.length&&ci<lastDI;ci++){
if(ci===exemptCI)continue;
if(c[ci].jp==='みのがす'){for(const i of sim)if(i.alive&&i.death>0&&(i.gi>0||r1mk))i.alive=false;continue;}
if(c[ci].at===0)continue;
const sk=_SOLVER_SK[c[ci].jp]||SKILL_IDX[c[ci].jp];
if(!sk)continue;
const hits=c[ci].hits||1;
const alive=sim.filter(i=>i.alive);
if(alive.length===0)break;
const tgt=(sk.target==='A'||sk.target==='RA')?'A':(sk.target==='G'||sk.target==='RG')?'G':'S';
const hitList=tgt==='A'?alive:tgt==='S'?(()=>{
const t=(c[ci].tgtGroup!==undefined&&!c[ci].soloGroup)
?alive.filter(i=>i.gi===c[ci].tgtGroup).sort((a,b)=>b.hp-a.hp)[0]
:alive.sort((a,b)=>b.hp-a.hp)[0];
return t?[t]:[];})():
(()=>{if(c[ci].tgtGroup!==undefined)return alive.filter(i=>i.gi===c[ci].tgtGroup);
const gr={};for(const i of alive){if(!gr[i.gi])gr[i.gi]=[];gr[i.gi].push(i);}return Object.values(gr).sort((a,b)=>b.length-a.length)[0]||[];})();
for(const inst of hitList){
const r=calcSkillDamage(sk,_MAX_STATS,inst.hex,null);
if(r&&Math.floor(r.max*hits)>=inst.hp){overkill=true;break;}
inst.hp-=r?Math.floor(r.min*hits):0;
if(inst.hp<=0){inst.alive=false;if(inst.gi===0)r1mk=true;}
}
if(overkill)break;
}
if(overkill)entry.chipOverkill=true;
}
}
{
const _sigOf=(e)=>e.combo.map(v=>v.jp+(v.tgtGroup!==undefined?'>'+v.tgtGroup:'')+(v.soloGroup?'!':'')+(v.equip?'@'+v.equip:'')).join('+')
+'|'+(e.eggAssign?Object.keys(e.eggAssign).sort().map(k=>k+':'+e.eggAssign[k]).join(','):'');
const _rkD=(e)=>e.kill==='gold'?2:e.kill==='orange'?1:0;
const seenSig=new Map();
for(let i=0;i<filtered.length;i++){
const sig=_sigOf(filtered[i]);
if(seenSig.has(sig)){
const j=seenSig.get(sig);
if(_rkD(filtered[i])>_rkD(filtered[j]))filtered[j]=filtered[i];
filtered.splice(i,1);i--;
}else seenSig.set(sig,i);
}
}
filtered.sort((a,b)=>{
const ka=a.kill==='gold'?0:a.kill==='orange'?1:2;
const kb=b.kill==='gold'?0:b.kill==='orange'?1:2;
if(ka!==kb)return ka-kb;
const oa=a.chipOverkill?1:0;
const ob=b.chipOverkill?1:0;
if(oa!==ob)return oa-ob;
if(monBlock>0){
const ba=a.canAntiBlk?0:1;
const bb=b.canAntiBlk?0:1;
if(ba!==bb)return ba-bb;
}
if(a.kill==='gold'){
if(a.combo.length!==b.combo.length)return a.combo.length-b.combo.length;
}
if(T>1&&a.kill!=='gold'){
const bufsA=a.combo.filter(v=>v.at===0&&v.jp!=='みのがす').length;
const bufsB=b.combo.filter(v=>v.at===0&&v.jp!=='みのがす').length;
if(bufsA!==bufsB)return bufsB-bufsA;
}
if(a.dmgSkills!==b.dmgSkills)return T>1?b.dmgSkills-a.dmgSkills:a.dmgSkills-b.dmgSkills;
const ma=a.multiOnly?1:0;
const mb=b.multiOnly?1:0;
if(ma!==mb)return ma-mb;
if(a.combo.length!==b.combo.length)return a.combo.length-b.combo.length;
return(a.req?.min||0)-(b.req?.min||0);
});
if(filtered.length===0)return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const lines=filtered.slice(0,3).map(({combo,kill,req,eggAssign,round1Removed,assign,defend})=>{
const cid=window._solverComboId++;
const _simTargets=killTargets?killTargets:((T===1&&monGroups)?monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)})):null);
window._solverComboMap[cid]={combo,killTargets:_simTargets,eggAssign,assign,defend};
const parts=combo.map((v,ci)=>{
const name=useJP?v.jp:v.en;
let s='<span style="color:#ccc;">'+name+'</span>';
if(v.note)s+='<span style="font-size:9px;">'+v.note+'</span>';
if(eggAssign&&eggAssign[ci]){
const tLv=eggAssign[ci]>=4?50:eggAssign[ci]>=2.5?20:5;
s+='<span style="color:#ff0;font-size:8px;">⊕T'+tLv+'</span>';
}
if(monBlock>0&&v.at>0&&!v.equip){
const rsk=_SOLVER_SK[v.jp];const sd=rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[v.jp];
if(sd&&sd.blk===1){
const abWeapons=[];
for(const[wn,wm]of Object.entries(WEAPON_META)){
if(wm.antiBlk&&_WEAPON_SKILLS[wm.cat]&&_WEAPON_SKILLS[wm.cat].has(v.jp))
abWeapons.push(wn==='風林火山'?'🌀':'🔱');
}
if(abWeapons.length)s+='<span style="color:#f80;font-size:8px;">'+abWeapons.join('')+'</span>';
}
}
return s;
});
let tag='';
if(kill==='gold')tag=' <span style="color:#ffd700;font-size:9px;">★</span>';
else if(kill==='orange')tag=' <span style="color:#f80;font-size:9px;">☆</span>';
if(req&&req.label){
const reqColor=kill?'#666':'#0ff';
tag+=' <span style="color:'+reqColor+';font-size:9px;">'+req.label+'</span>';
}
let comboHtml;
if(isRound2&&parts.length>4){
const t1Removal=(round1Removed!==undefined?round1Removed:false)
||combo.slice(0,4).some(a=>a.jp==='みのがす'||a.jp==='一閃づき');
const tc=t1Removal?tc2:0;
const transSkill=' <span style="color:#f80;font-weight:bold;font-size:9px;">⮕2回目(+'+tc+')</span> ';
comboHtml=parts.slice(0,4).join(' + ')+transSkill+parts.slice(4).join(' + ');
}else{
comboHtml=parts.join(' + ');
}
return'<div style="font-size:10px;margin-left:16px;color:#aaa;cursor:pointer;" onclick="_expandCombo('+cid+')">'
+comboHtml+tag+' <span style="color:#555;font-size:8px;">▶詳</span></div>'
+'<div id="combo_detail_'+cid+'" style="display:none;"></div>';
});
if(filtered.length>3)lines.push('<div style="font-size:9px;margin-left:16px;color:#666;">+'+(filtered.length-3)+' more</div>');
const shownRound2=filtered.slice(0,3).some(e=>e.combo.length>4);
if(shownRound2)lines.unshift('<div style="font-size:9px;margin-left:16px;color:#f80;">⚠ 2T (5~8 moves)｜⮕2回目 標各組合 AT 追加(+n/2 或 +0)</div>');
return lines.join('');
}catch(e){console.error('[Solver]',e);return'<div style="color:#f44;font-size:9px;">⚠ solver error</div>';}
}
const SI_PATTERN_INDICES={
'R2':[[1,2]],
'R2_3':[[1,4]],
'R3':[[1,2,3]],
'R4':[[1,2,3,4]],
'R5':[[1,2,3,4,5]],
'4_in_6':[[1,2,3,6],[1,2,5,6],[1,4,5,6]],
'3_in_7':[[1,2,5],[1,2,7],[1,4,5],[1,4,7],[1,6,7]],
'N2':[[2,4]],
'N3':[[2,4,6]],
'N4':[[2,4,6,8]],
'N5':[[2,4,6,8,10]],
'4_in_10':[[2,4,6,10],[2,4,8,10],[2,6,8,10]],
'3_in_10':[[2,4,8],[2,4,10],[2,6,8],[2,6,10],[2,8,10]]
};
function siRunBattleSim(startRng,gSize,rRarity,nRarity,tLevels,recordSeq){
let rng=startRng>>>0;
let seq=[];
let rareHits=[];
let normHits=[];
let rngCount=0;
let successRare=0;
let successNorm=0;
let threshR=rRarity>0?Math.floor(32768/rRarity):-1;
let threshN=nRarity>0?Math.floor(32768/nRarity):-1;
for(let m=0;m<gSize;m++){
rng=lcg(rng);
rngCount++;
let vR=(rng>>>16)&0x7FFF;
let okR=vR<=threshR;
if(recordSeq)seq.push({val:vR,red:okR,type:`Group${m+1} Drop (R)`});
if(okR){
successRare++;
rareHits.push(rngCount);
}else{
rng=lcg(rng);
rngCount++;
let vN=(rng>>>16)&0x7FFF;
let okN=vN<=threshN;
if(recordSeq)seq.push({val:vN,red:okN,type:`Group${m+1} Drop (N)`});
if(okN){
successNorm++;
normHits.push(rngCount);
}
}
}
for(let b=0;b<4;b++){
if(tLevels[b]<=0)continue;
for(let m=0;m<gSize;m++){
rng=lcg(rng);
rngCount++;
let vTR=(rng>>>16)&0x7FFF;
let eRateR=Math.floor((rRarity*100)/tLevels[b]);
let thTR=Math.floor(32767/eRateR)+1;
let okTR=vTR<=thTR;
if(recordSeq)seq.push({val:vTR,red:okTR,steal:true,type:`Book${b+1} Group${m+1} (R)`});
if(okTR){
successRare++;
rareHits.push(rngCount);
}else{
rng=lcg(rng);
rngCount++;
let vTN=(rng>>>16)&0x7FFF;
let eRateN=Math.floor((nRarity*100)/tLevels[b]);
let thTN=Math.floor(32767/eRateN)+1;
let okTN=vTN<=thTN;
if(recordSeq)seq.push({val:vTN,red:okTN,steal:true,type:`Book${b+1} Group${m+1} (N)`});
if(okTN){
successNorm++;
normHits.push(rngCount);
}
}
}
}
return{successRare,successNorm,seq,rareHits,normHits};
}
function siMatchesPattern(hits,patterns){
if(!patterns||patterns.length===0)return false;
for(let p of patterns){
if(hits.length<p.length)continue;
let match=true;
for(let i=0;i<p.length;i++){
if(hits[i]!==p[i]){match=false;break;}
}
if(match)return true;
}
return false;
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
for(const e of _rawPool){
if(!Array.isArray(e))continue;
if(typeof e[0]==='string'&&!seenHex.has(e[0])){seenHex.add(e[0]);out.push([e[0],e[1],e[2]]);}
for(const x of e){
if(Array.isArray(x)&&typeof x[0]==='string'&&!seenHex.has(x[0])){seenHex.add(x[0]);out.push([x[0],x[1],x[2]]);}
}
}
return out;
})();
const monNameFn=(hx)=>{
const md=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hx]:null;
return md?(DISPLAY_LANG==='EN'?md.en:md.jp):hx;
};
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
for(const e of _rawPool){
if(!Array.isArray(e))continue;
if(typeof e[0]==='string'&&!wByHex.has(e[0])){wByHex.set(e[0],{num:e[3]||0,min:e[1],max:e[2]});wDen=wDen||e[4]||0;}
for(const x of e)if(Array.isArray(x)&&typeof x[0]==='string'&&!wByHex.has(x[0])){wByHex.set(x[0],{num:x[3]||0,min:x[1],max:x[2]});wDen=wDen||x[4]||0;}
}
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
const ov=document.getElementById('si_submodal');
if(ov){ov.style.display='none';const b=document.getElementById('si_submodal_body');if(b)b.innerHTML='';}
}
function _siShowBucket(bucket){
const b=window._siBuckets;
if(!b)return;
_siEnsureSubmodal();
window._solverComboMap={};window._solverComboId=0;
let html=(typeof _solverLegend==='function'?_solverLegend():''),title='';
const _hdr=(bat,tLbl)=>`<div style="margin:6px 0 2px 0;">${BATTLE_LABEL} <span style="color:#fa0;font-weight:bold;font-size:14px;">${siFormatAT(bat)}</span> <span style="color:#888;font-size:10px;">${tLbl}</span></div>`;
if(bucket==='d1'){
title=`${BATTLE_LABEL} ${siFormatAT(b.d1)}｜敵怪 ×1`;
html+=_hdr(b.d1,'×1')+_solverRender(b.d1,[{hex:b.hexId,count:1,death:b.mainDeath,isMain:true}],b.monId,b.mapDeft,b.canRound2);
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
html+=_solverRender(tBat,m.monGroups||[{hex:b.hexId,count:m.effMon,death:b.mainDeath,isMain:true}],b.monId,b.mapDeft,b.canRound2);
}
if(entry.flee.length>0)html+=`<div style="font-size:9px;margin-left:16px;"><span style="color:#f44;">逃跑:</span> ${entry.flee.join(' · ')}</div>`;
}
if(!any)html+='<div style="color:#666;font-size:11px;margin-left:16px;">（此情形無對應形態）</div>';
}
document.getElementById('si_submodal_title').innerHTML=title;
document.getElementById('si_submodal_body').innerHTML=html;
document.getElementById('si_submodal').style.display='flex';
}
