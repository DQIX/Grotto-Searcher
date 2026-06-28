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
['atConsecutiveCount','at_pattern'].forEach(sid=>{
const sel=document.getElementById(sid);
if(sel&&typeof AT_O!=='undefined'){
const cv=sel.value;
sel.querySelectorAll('option').forEach((o,idx)=>{if(idx>0&&AT_O[idx-1])o.textContent=AT_O[idx-1][1];});
sel.value=cv;
}
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
let _dq9Gen=0;
let _dq9Active=null;
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
if(_dq9PoolFailed||typeof Worker==='undefined')return null;
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
_poolFlushRemaining(a);
if(_dq9Active===a)_dq9Active=null;
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
a.slots[m.chunkId]=m.items||[];
a.hits+=m.hits||0;
a.unitsDone+=a.chunks[m.chunkId].units;
a.doneCount++;
_poolFlushReady(a);
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
queue:chunks.map(c=>c.chunkId),
slots:new Array(chunks.length),
nextFlush:0,inFlight:new Map(),
lastRStr:(job.kind==='scan'&&chunks[0].rank!==undefined)?hex2(chunks[0].rank):'',
lastSeedHex:hex4(job.startSeed),
finished:false,
};
_poolBroadcast({type:'job',gen,job});
_poolDispatch();
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
function executeSharedSearch(config){
if(isSearching){requestSearchCancel();return;}
const conds=getUltimateConds();
const searchFilterLoc=true;
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
resultDiv.innerHTML='<div style="color:#aaa; font-size:13px; margin-bottom:8px">'+B01+' <span id="searchProgress" style="color:#fff; font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>';
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
const sortBucket=(sortTopN!==undefined)?[]:null;
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
onProgress:(p)=>{hitCount=p.hits;
progressSpan.textContent=Math.floor((p.processed/p.total)*100)+'% ('+B02+' '+p.rStr+', Seed '+p.seedHex+') ['+B04+''+p.hits+' '+B03+']';
},
onBatch:(items)=>{
if(sortBucket){for(const it of items)sortBucket.push(it);return;}
if(config.renderCap!==undefined&&renderedCount>=config.renderCap)return;
const fragment=document.createDocumentFragment();
for(const it of items){
if(config.renderCap!==undefined&&renderedCount>=config.renderCap)break;
fragment.appendChild(materializeResultItem(it));
renderedCount++;
}
if(fragment.childNodes.length>0)grid.appendChild(fragment);
},
onDone:(d)=>{hitCount=d.hits;isSearching=false;restoreBtn();
if(sortBucket){
sortBucket.sort((a, b)=>(a.sortCost-b.sortCost));
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
if(conds.elist==='MULTI_SPECIAL'||conds.anomaly){alert(A13);return;}
if(!(conds.depth||conds.lv||conds.elist||conds.onlyMon||conds.location||conds.boss)){alert(A14);return;}
const searchOnlyWithD=document.getElementById('searchOnlyWithD').checked;
executeSharedSearch({btnId:'fastestBtn',btnText:'短',btnBg:'#224',btnColor:'#0f0',stopText:'⏹',emptyRankMsg:B07,
sortTopN:(conds.elist||conds.onlyMon)?Infinity:50,
validateConds:(conds,searchFilterLoc)=>{
const hasBasicCond=Object.keys(conds).some(k=>k!=='reqBox'&&k!=='hasBoxCond'&&conds[k]!=="");
if(!hasBasicCond&&!conds.hasBoxCond){alert(A01);return false;}
return true;
},
filterRanks:(ranksToSearch,conds)=>sharedRankFilter(ranksToSearch,conds,false),
processor:'fastest',
params:{searchOnlyWithD},
});
}
function initFastest(){
const h4=document.querySelector('#unified_search_panel h4');
if(!h4)return;
if(document.getElementById('fastestBtn'))return;
const btn=document.createElement('button');
btn.id='fastestBtn';
btn.textContent='短';
btn.title='最短地図検索';
btn.style.cssText='margin-left:6px;background:#224;color:#0f0;border:1px solid #080;border-radius:50%;width:20px;height:20px;font-size:11px;font-weight:bold;cursor:pointer;display:flex;justify-content:center;align-items:center;transition:all 0.2s;';
btn.onmouseover=function(){if(isSearching)return;this.style.background='#0f0';this.style.color='#000';};
btn.onmouseout=function(){if(isSearching)return;this.style.background='#224';this.style.color='#0f0';};
btn.onclick=startFastestSearch;
h4.appendChild(btn);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFastest);
else initFastest();
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
executeSharedSearch({btnId:'cpuBenchBtn',btnText:'💻',btnBg:'#224',btnColor:'#0ff',stopText:'🛑',emptyRankMsg:B07,validateConds:()=>true,
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
if(isNaN(atMaxSteps)||atMaxSteps<38)atMaxSteps=400;
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
resultDiv.innerHTML=`<div style="color:#aaa; font-size:13px; margin-bottom:8px;">
<div style="color:#0ca; font-size:12px; margin-bottom:6px;">${ENV_NAMES[monEnvType][1]}Rank ${monFloorMR}｜${md.jp}(${md.en})｜POP=${N}(Zoom=${nVal})｜AT:${atmin}～${atmax}${headerExtra}</div>
${B01}<span id="searchProgress"style="color:#fff; font-weight:bold">0%</span></div><div id="searchGrid"class="search-grid"></div>`;
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
if(isNaN(maxSteps)||maxSteps<38)maxSteps=400;
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
resultDiv.innerHTML=`<div style="color:#aaa; font-size:13px; margin-bottom:8px;">
<div style="color:#f80; font-size:12px; margin-bottom:6px;">${patternName}｜${probText}｜N=${POPIndex}(n=${nVal||0})｜Rank ${rStr}</div>
${B01}<span id="searchProgress"style="color:#fff; font-weight:bold">0%</span></div><div id="searchGrid"class="search-grid"></div>`;
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
let bg=item.steal?'background:rgba(255,150,0,0.4); padding:0 2px; border-radius:3px;':'';
return`<span style="color:${color}; font-weight:${fw}; ${bg}" title="${item.type}">${item.val}</span>`;
});
return`<div style="margin-top:6px; font-size:11px; color:#aaa; line-height:1.6;">`+C24+`: [ ${items.join(', ')} ]</div>`;
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
const enemyCount=parseInt(document.getElementById('si_enemy_count').value);
const groupSize=parseInt(document.getElementById('si_group_size').value)||1;
const is2ndTurn=document.getElementById('si_2nd_turn').checked;
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
const mapDeft=(typeof calcDeftness==='function')?calcDeftness(atN1_val):0;
let actualCost=(userDeft>=mapDeft)?3:4;
let extraTurnCost=is2ndTurn?Math.floor(enemyCount/2):0;
let totalStartCost=actualCost+extraTurnCost;
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
battleStr=`${BATTLE_LABEL}: <span style="color:#fa0; font-weight:bold; font-size:14px;">${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}</span> <span style="color:#888; font-size:11px;">`+C22+`</span> ${seqHtml}`;
}else{
let abs_1=N+totalStartCost;
let abs_2=abs_1+1;
let abs_4=abs_1+2;
let currentRng=seed>>>0;
for(let i=0;i<abs_1-1;i++)currentRng=lcg(currentRng);
let defaultSim=siRunBattleSim(currentRng,groupSize,rareRarity,normRarity,tLvs,true);
seqHtml=siBuildSeqHtml(defaultSim.seq);
battleStr=`${BATTLE_LABEL}: <span style="color:#fa0; font-weight:bold; font-size:14px;">${abs_1} / ${abs_2} / ${abs_4}</span> <span style="color:#888; font-size:11px;">`+C23+`</span> ${seqHtml}`;
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
<div style="display:flex; justify-content:space-between;">
<span>AT ${N}: <span class="si-highlight">${atN_val}</span> → <span style="color:#FFAEC9;">${monName}</span></span>
<span style="font-size:11px;">${patternMsg}</span>
</div>
<div>AT ${N+1}: <span style="color:#39C5BB;">${atN1_val}</span> → `+G27+`: <span class="si-highlight">${mapDeft}</span></div>
<div style="margin-top:5px; padding-top:5px; border-top:1px dashed #335;">
${battleStr}
</div>`;
const targetBox=document.getElementById('si_target_results');
targetBox.innerHTML=`
<div>AT<span style="color:#fff;">${targetTotalStep}</span>:<span class="si-highlight"style="color:#f44; font-size:15px;">${atTarget_val}</span></div>
<div style="font-size:11px; margin-top:5px; color:#ccc;">
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
