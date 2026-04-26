const RANKS={
"02":{fqMin:2,fqMax:55},
"38":{fqMin:56,fqMax:60},
"3D":{fqMin:61,fqMax:75},
"4C":{fqMin:76,fqMax:80},
"51":{fqMin:81,fqMax:100},
"65":{fqMin:101,fqMax:120},
"79":{fqMin:121,fqMax:140},
"8D":{fqMin:141,fqMax:160},
"A1":{fqMin:161,fqMax:180},
"B5":{fqMin:181,fqMax:200},
"C9":{fqMin:201,fqMax:220},
"DD":{fqMin:221,fqMax:248}
};
function getLocationMax(finalQuality){
if(finalQuality<=50)return 47;
if(finalQuality<=80)return 131;
return 150;
}
function calcFinalQuality(baseQ, r1){
const modulo=Math.floor(baseQ / 10)*2+1;
const offset=Math.trunc(r1 % modulo - baseQ / 10);
let final=baseQ+offset;
if(final<2) final=2;
if(final>248) final=248;
return final;
}
function formatRanges(nums){
if(nums.length===0)return C16;
const sorted=[...nums].sort((a, b)=>a - b);
const ranges=[];
let start=sorted[0], end=sorted[0];
for(let i=1;i<sorted.length;i++){
if(sorted[i]===end+1){
end=sorted[i];
}else{
ranges.push(start===end?`${start}`:`${start}-${end}`);
start=end=sorted[i];
}
}
ranges.push(start===end?`${start}`:`${start}-${end}`);
return ranges.join(',');
}
let SEED_TO_TIMERS_CACHE=null;
function calcLocations(seed, rStr){
const {fqMin,fqMax}=RANKS[rStr]||{fqMin:2,fqMax:248};
const seenLocations={};
const outputOrder=[];
if(!SEED_TO_TIMERS_CACHE){
SEED_TO_TIMERS_CACHE={};
for(let t=0;t<65536;t++){
const x1=lcg(t);
const x2=lcg(x1);
const s=(x2>>>16)&0x7FFF;
if(!SEED_TO_TIMERS_CACHE[s]) SEED_TO_TIMERS_CACHE[s]=[];
SEED_TO_TIMERS_CACHE[s].push(t);
}
}
const timers=SEED_TO_TIMERS_CACHE[seed]||[];
for(const timer of timers){
const x1=lcg(timer);
const x2=lcg(x1);
const x3=lcg(x2);
const r1=(x1>>>16)&0x7FFF;
const r3=(x3>>>16)&0x7FFF;
const locToBq={};
for(let baseQ=2;baseQ<=248;baseQ++){
const finalQ=calcFinalQuality(baseQ, r1);
if(finalQ<fqMin||finalQ>fqMax) continue;
const locMax=getLocationMax(finalQ);
const calcLoc=(r3 % locMax)+1;
if(!locToBq[calcLoc]) locToBq[calcLoc]=new Set();
locToBq[calcLoc].add(baseQ);
}
for(const loc of Object.keys(locToBq).map(Number)){
let minBq=255;
for(const bq of locToBq[loc]){
if(bq<minBq) minBq=bq;
}
if(!seenLocations[loc]){
seenLocations[loc]=new Set();
outputOrder.push({ timer, location: loc, minBq});
}
for(const bq of locToBq[loc]){
seenLocations[loc].add(bq);
}
}
}
if(rStr==="02"&&seed===0x0032){
if(2>=fqMin&&2<=fqMax){
if(!seenLocations[5]){
seenLocations[5]=new Set();
outputOrder.push({timer:"Quest 015",location:5,minBq:2});
}
seenLocations[5].add(2);
}
}
outputOrder.sort((a, b)=>{
if(a.timer==="Quest 015")return 1;
if(b.timer==="Quest 015")return -1;
if(a.timer!==b.timer)return a.timer - b.timer;
return a.minBq - b.minBq;
});
return{outputOrder,seenLocations};
}
function getValidatedSeedRange(){
let minStr=document.getElementById('cond_seed_min')?document.getElementById('cond_seed_min').value.trim() :"";
let maxStr=document.getElementById('cond_seed_max')?document.getElementById('cond_seed_max').value.trim() :"";
let customMin=minStr?parseInt(minStr, 16):0;
let customMax=maxStr?parseInt(maxStr, 16):0x7FFF;
if(isNaN(customMin)||customMin<0) customMin=0;
if(isNaN(customMax)||customMax>0x7FFF) customMax=0x7FFF;
if(customMin>customMax){
return{error: A08};
}
const searchFilterLoc=true;
const startSeed=customMin;
const endSeed=searchFilterLoc?Math.min(customMax, 0x7FFF):customMax;
if(startSeed>endSeed){
return{error: A09};
}
return{startSeed, endSeed, searchFilterLoc};
}
function getUltimateConds(){
const getV=(id) =>{const el=document.getElementById(id);return el?el.value.trim() :"";};
const reqBox={};
['I','H','G','F','E','D','C','B','A','S'].forEach((ch, i)=>{
reqBox[i+1]=parseInt(getV('cond_box_'+ch))||0;
});
return{
prefix: getV('cond_prefix'), suffix: getV('cond_suffix'), locale: getV('cond_locale'),
lv: getV('cond_lv'), location: getV('cond_location'), bq: getV('cond_bq'), bqCount: getV('cond_bq_count'),
env: getV('cond_env'), monster: getV('cond_monster'), depth: getV('cond_depth'), boss: getV('cond_boss'),
seedMin: getV('cond_seed_min'), seedMax: getV('cond_seed_max'), elist: getV('cond_elist'),
onlyMon: getV('cond_only_mon'), anomaly: getV('cond_anomaly'),
reqBox: reqBox, hasBoxCond: Object.values(reqBox).some(v=>v>0)
};
}
function checkUltimateCondsMatch(engine, seed, targetRankKey, conds, searchFilterLoc){
_cachedLocData=null;
if(conds.prefix&&engine._details[5] != conds.prefix)return false;
if(conds.suffix&&engine._details[6] != conds.suffix)return false;
if(conds.locale&&(engine.MapLocale) != conds.locale)return false;
if(conds.lv&&engine._details[4] != conds.lv)return false;
if(conds.env&&engine._details[3] != conds.env)return false;
if(conds.monster&&engine._details[2] != conds.monster)return false;
if(conds.depth&&engine._details[1] != conds.depth)return false;
if(conds.boss&&engine._details[0] != conds.boss)return false;
let targetLocNum=conds.location?parseInt(conds.location, 16):null;
let targetBqNum=conds.bq?parseInt(conds.bq):null;
let bqCountFilter=conds.bqCount||"";
if(targetLocNum!==null||targetBqNum!==null||searchFilterLoc||bqCountFilter){
if(targetRankKey!==null&&typeof calcLocations==='function'){
let locData=calcLocations(seed, targetRankKey);
_cachedLocData=locData;
if(locData.outputOrder.length===0)return false;
if(targetLocNum!==null){
if(!locData.seenLocations[targetLocNum])return false;
if(targetBqNum!==null&&!locData.seenLocations[targetLocNum].has(targetBqNum))return false;
}else if(targetBqNum!==null){
let bqFound=false;
for(let loc in locData.seenLocations){
if(locData.seenLocations[loc].has(targetBqNum)){bqFound=true;break;}
}
if(!bqFound)return false;
}
if(bqCountFilter==="1"){
let allBqs=new Set();
for(let loc in locData.seenLocations){
for(let bq of locData.seenLocations[loc]) allBqs.add(bq);
}
if(allBqs.size!==1)return false;
}else if(bqCountFilter==="1p"){
let found=false;
for(let loc in locData.seenLocations){
if(locData.seenLocations[loc].size===1){found=true;break;}
}
if(!found)return false;
}
}else if(bqCountFilter){
return false;
}
}
return true;
}
function ChestHtml(engine,conds){
if(!conds.hasBoxCond)return{isMatch:true,html:""};
let boxStr=[];
for(let r=10;r>=1;r--){
if(conds.reqBox[r]>0){
if(engine._details2[r-1]!==conds.reqBox[r])return{isMatch:false,html:""};
boxStr.push(`${CHEST_RANK[r]}${conds.reqBox[r]}`);
}
}return{
isMatch:true,
html:`<span style="color:#ffcc00;font-size:11px;background:#420;padding:2px 4px;border-radius:3px;">${boxStr.join(' ')}</span>`
};
}
function LocaHtmlFromData(locData, conds){
if(!locData||locData.outputOrder.length===0)return "";
let targetLocNum=conds.location?parseInt(conds.location,16):null;
let targetBqNum=conds.bq?parseInt(conds.bq):null;
let matchedLocs=[];
for(let locObj of locData.outputOrder){
let locNum=locObj.location;
let isMatch=true;
if(targetLocNum!==null&&locNum!==targetLocNum) isMatch=false;
if(targetBqNum!==null&&!locData.seenLocations[locNum].has(targetBqNum)) isMatch=false;
if(isMatch){matchedLocs.push(locNum.toString(16).toUpperCase().padStart(2,'0'));}
}
if(matchedLocs.length>0){
return `<span style="margin-left:4px;color:#ccc;font-size:10px;background:#222;padding:1px 4px;border-radius:3px;">${matchedLocs.join(' / ')}</span>`;
}
return "";
}
let _cachedLocData=null;
function checkBasicConds(searchEngine, conds){
if(conds.prefix&&searchEngine._details[5] != conds.prefix)return false;
if(conds.suffix&&searchEngine._details[6] != conds.suffix)return false;
if(conds.locale&&searchEngine.MapLocale != conds.locale)return false;
if(conds.lv&&searchEngine._details[4] != conds.lv)return false;
if(conds.env&&searchEngine._details[3] != conds.env)return false;
if(conds.monster&&searchEngine._details[2] != conds.monster)return false;
if(conds.depth&&searchEngine._details[1] != conds.depth)return false;
if(conds.boss&&searchEngine._details[0] != conds.boss)return false;
return true;
}
function checkOnlyMonPossible(searchEngine, conds){
if(!conds.onlyMon)return true;
let baseMR=searchEngine.monsterRank;
let maxFloorMR=Math.min(12, baseMR+Math.floor((searchEngine.floorCount - 1) / 4));
let envMonsters=ONLY_MONSTERS[searchEngine._details[3]];
if(envMonsters){
for(let fMR=baseMR;fMR<=maxFloorMR;fMR++){
let mId=envMonsters[fMR];
if(mId&&MONSTER_DATA[mId]&&MONSTER_DATA[mId].en===conds.onlyMon)return true;
}
}
return false;
}
function checkElistAndD(searchEngine, conds, searchOnlyWithD, _onlyMonExpectedStr){
let result ={match: true, specialHitDetails:[], jumpToFloor: -1, hasMatchedD: false};
if(!(conds.elist||conds.onlyMon||searchOnlyWithD))return result;
let hasAnyD=false, elistMatched=!conds.elist, onlyMatched=!conds.onlyMon;
let specialFloorCount=0, currentMapSpecials=[];
for(let f=0;f<searchEngine.floorCount;f++){
let info=getFloorElistInfo(searchEngine, f);
if(!info.state) continue;
if(info.dValue>0) hasAnyD=true;
specialFloorCount++;
currentMapSpecials.push({f, state:info.state, dValue:info.dValue});
let dBadge=info.dValue>0?` <span style="background:#fa0;color:#000;padding:1px 4px;border-radius:3px;font-size:10px;">${info.dValue}</span>`:'';
if(conds.elist&&conds.elist!=='MULTI_SPECIAL'&&!elistMatched){
let isElistHit=false;
if(conds.elist==='PARTIAL_NONE'&&info.state.includes(EL_P)) isElistHit=true;
else if(conds.elist==='4'&&info.state.includes(EL_4)) isElistHit=true;
else if(conds.elist==='3'&&info.state.includes(EL_3)) isElistHit=true;
else if(conds.elist==='2'&&info.state.includes(EL_2)) isElistHit=true;
else if(conds.elist==='ONLY'&&(info.state.includes('only')||info.state.includes('オンリー'))) isElistHit=true;
else if(conds.elist==='NONE'&&info.state.includes(EL_0)&&!info.state.includes(EL_P)) isElistHit=true;
if(isElistHit){
elistMatched=true;
result.specialHitDetails.push(`B${f+1}F: ${info.state}${dBadge}`);
if(result.jumpToFloor===-1) result.jumpToFloor=f;
if(info.dValue>0) result.hasMatchedD=true;
}
}
if(conds.onlyMon&&!onlyMatched){
if(info.state.includes(_onlyMonExpectedStr)){
onlyMatched=true;
let text=`B${f+1}F: ${info.state}${dBadge}`;
if(!result.specialHitDetails.includes(text)) result.specialHitDetails.push(text);
if(result.jumpToFloor===-1) result.jumpToFloor=f;
if(info.dValue>0) result.hasMatchedD=true;
}
}
}
if(conds.elist==='MULTI_SPECIAL'){
if(specialFloorCount>=2){
elistMatched=true;
currentMapSpecials.forEach(s=>{
let dBadge=s.dValue>0?` <span style="background:#fa0;color:#000;padding:1px 4px;border-radius:3px;font-size:10px;">${s.dValue}</span>`:'';
let text=`B${s.f+1}F: ${s.state}${dBadge}`;
if(!result.specialHitDetails.includes(text)) result.specialHitDetails.push(text);
if(s.dValue>0) result.hasMatchedD=true;
});
if(result.jumpToFloor===-1&&currentMapSpecials.length>0) result.jumpToFloor=currentMapSpecials[0].f;
} else{elistMatched=false;}
}
if(searchOnlyWithD&&!hasAnyD) result.match=false;
if(!elistMatched||!onlyMatched) result.match=false;
if(searchOnlyWithD&&result.match){
if((conds.elist||conds.onlyMon)&&conds.elist!=='MULTI_SPECIAL'){
if(!result.hasMatchedD) result.match=false;
}
}
return result;
}
function checkLocationBQ(seed, conds, searchFilterLoc, targetRankKey){
let targetLocNum=conds.location?parseInt(conds.location, 16):null;
let targetBqNum=conds.bq?parseInt(conds.bq):null;
if(targetLocNum===null&&targetBqNum===null&&!searchFilterLoc)return{match: true};
if(seed>0x7FFF||targetRankKey===null)return{match: false};
_cachedLocData=calcLocations(seed, targetRankKey);
let locData=_cachedLocData;
if(locData.outputOrder.length===0)return{match: false};
if(targetLocNum!==null){
if(!locData.seenLocations[targetLocNum])return{match: false};
if(targetBqNum!==null&&!locData.seenLocations[targetLocNum].has(targetBqNum))return{match: false};
}else if(targetBqNum!==null){
let bqFound=false;
for(let loc in locData.seenLocations){if(locData.seenLocations[loc].has(targetBqNum)){bqFound=true;break;}}
if(!bqFound)return{match: false};
}
return{match: true};
}
function checkAnomalies(searchEngine, conds){
let result ={match: true, anomalyDetails:[], jumpToFloor: -1};
if(conds.anomaly==="")return result;
let hasAnyChestAnomaly=false, hasAnyCorridorAnomaly=false, hasAnyStairAnomaly=false;
let hasAnyNoChestAnomaly=false, hasAnyMultiRegionAnomaly=false, hasAnyChestCorridorCombo=false;
let hasAnyGhostAnomaly=false, hasAnyAllInvalidAnomaly=false, corridorFloorCount=0;
let firstChestFloor=-1, firstCorridorFloor=-1, firstStairFloor=-1;
let firstNoChestFloor=-1, firstMultiRegionFloor=-1, firstGhostFloor=-1, firstAllInvalidFloor=-1;
for(let f=0;f<searchEngine.floorCount;f++){
let anom=getFloorAnomalies(searchEngine, f, conds.anomaly==='ghost');
if(anom.isAllInvalidStair){hasAnyAllInvalidAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#cc0000;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_2}</span>`);if(firstAllInvalidFloor===-1)firstAllInvalidFloor=f;}
if(anom.hasInaccessibleStair){hasAnyStairAnomaly=true;result.anomalyDetails.push(`<span style="color:#ff0000;font-size:11px;font-weight:bold;background:#550000;padding:1px 4px;border-radius:3px;">B${f+1}F ${TKB3_0}</span>`);if(firstStairFloor===-1)firstStairFloor=f;}
if(anom.hasInaccessibleChest){hasAnyChestAnomaly=true;if(anom.totalChests===1){hasAnyNoChestAnomaly=true;result.anomalyDetails.push(`<span style="color:#0ff;font-size:11px;font-weight:bold;background:#004466;padding:1px 4px;border-radius:3px;border:1px solid #08a;">B${f+1}F ${TKB1_3}</span>`);if(firstNoChestFloor===-1)firstNoChestFloor=f;}else{result.anomalyDetails.push(`<span style="color:#ff69b4;font-size:11px;font-weight:bold;">B${f+1}F ${TKB1_1}</span>`);} if(firstChestFloor===-1)firstChestFloor=f;}
if(anom.hasIsolatedCorridor){hasAnyCorridorAnomaly=true;corridorFloorCount++;if(anom.isolatedRegions.length>=2){hasAnyMultiRegionAnomaly=true;if(firstMultiRegionFloor===-1)firstMultiRegionFloor=f;} let countBadges=anom.isolatedRegions.map(size=>`<span style="background:#ff6ec7;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;margin-left:4px;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${size}</span>`).join('');result.anomalyDetails.push(`<span style="color:#fa0;font-size:11px;">B${f+1}F ${TKB2_1} ${countBadges}</span>`);if(firstCorridorFloor===-1)firstCorridorFloor=f;}
if(anom.hasGhostStair){hasAnyGhostAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#555577;padding:1px 4px;border-radius:3px;border:1px solid #8888aa;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_1}: ${anom.GhostStairs.join(', ')}</span>`);if(firstGhostFloor===-1)firstGhostFloor=f;}
if(anom.hasInaccessibleChest&&anom.hasIsolatedCorridor) hasAnyChestCorridorCombo=true;
}
if(conds.anomaly==='chest'&&!hasAnyChestAnomaly) result.match=false;
else if(conds.anomaly==='nochest'&&!hasAnyNoChestAnomaly) result.match=false;
else if(conds.anomaly==='corridor'&&!hasAnyCorridorAnomaly) result.match=false;
else if(conds.anomaly==='stair'&&!hasAnyStairAnomaly) result.match=false;
else if(conds.anomaly==='ghost'&&!hasAnyGhostAnomaly) result.match=false;
else if(conds.anomaly==='all_invalid'&&!hasAnyAllInvalidAnomaly) result.match=false;
else if(conds.anomaly==='chest_corridor'&&!hasAnyChestCorridorCombo) result.match=false;
else if(conds.anomaly==='multi_corridor'&&corridorFloorCount<2) result.match=false;
else if(conds.anomaly==='multi_region'&&!hasAnyMultiRegionAnomaly) result.match=false;
if(result.match){
if(conds.anomaly==='chest') result.jumpToFloor=firstChestFloor;
else if(conds.anomaly==='nochest') result.jumpToFloor=firstNoChestFloor;
else if(conds.anomaly==='corridor'||conds.anomaly==='multi_corridor') result.jumpToFloor=firstCorridorFloor;
else if(conds.anomaly==='multi_region') result.jumpToFloor=firstMultiRegionFloor;
else if(conds.anomaly==='stair') result.jumpToFloor=firstStairFloor;
else if(conds.anomaly==='ghost') result.jumpToFloor=firstGhostFloor;
else if(conds.anomaly==='all_invalid') result.jumpToFloor=firstAllInvalidFloor;
else if(conds.anomaly==='chest_corridor') result.jumpToFloor=(firstChestFloor!==-1)?firstChestFloor:firstCorridorFloor;
}
return result;
}
function buildOnlyMonExpectedStr(conds){
if(!conds.onlyMon)return '';
let targetJpName=conds.onlyMon;
for(let id in MONSTER_DATA){
if(MONSTER_DATA[id].en===conds.onlyMon){targetJpName=MONSTER_DATA[id].jp;break;}
}
return (DISPLAY_LANG!=='EN'?targetJpName:conds.onlyMon)+(DISPLAY_LANG!=='EN'?"オンリー":" only");
}
async function executeSharedSearchLoop(config){
if(isSearching){searchCancel=true;return;}
const conds=getUltimateConds();
const searchFilterLoc=true;
if(config.validateConds&&!config.validateConds(conds, searchFilterLoc)){return;}
const rangeData=getValidatedSeedRange();
if(rangeData.error){alert(rangeData.error);return;}
const {startSeed, endSeed}=rangeData;
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
let totalCombos=ranksToSearch.length*(endSeed - startSeed+1);
let processed=0;
let hitCount=0;
let searchEngine=new GrottoDetail();
if(config.setupEngine) config.setupEngine(searchEngine, conds);
let fragment=document.createDocumentFragment();
try{
for(let rank of ranksToSearch){
if(searchCancel) break;
let rStr=rank.toString(16).toUpperCase().padStart(2, '0');
let targetRankKey=RANKS[rStr]?rStr:(RANKS["0x"+rStr]?"0x"+rStr:(RANKS[rank]?rank:null));
for(let seed=startSeed;seed<=endSeed;seed++){
if(searchCancel) break;
if(seed % 250===0){
progressSpan.textContent=Math.floor((processed / totalCombos)*100)+'% ('+B02+' '+rStr+', Seed '+seed.toString(16).toUpperCase().padStart(4,'0')+') ['+B04+''+hitCount+' '+B03+']';
if(fragment.children.length>0) grid.appendChild(fragment);
await new Promise(r=>setTimeout(r, 0));
}
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
_cachedLocData=null;
let itemNode=config.processSeed(searchEngine, seed, rStr, targetRankKey, conds, searchFilterLoc);
if(itemNode){
hitCount++;
fragment.appendChild(itemNode);
}
processed++;
}
}
if(fragment.children.length>0) grid.appendChild(fragment);
}catch(error){
console.error("搜尋過程發生錯誤：", error);
alert(A03);
searchCancel=true;
}finally{
isSearching=false;
if(btn){btn.textContent=config.btnText;btn.style.background=config.btnBg;btn.style.color=config.btnColor||'#000';}
progressSpan.textContent=searchCancel?`${B05} (${B04}${hitCount} ${B03})`:`100% (${B06?B06+' ':''}${hitCount} ${B03})`;
}
}
function startUltimateSearch(){
const tempConds=getUltimateConds();
let _onlyMonExpectedStr='';
if(tempConds.onlyMon){
let targetJpName=tempConds.onlyMon;
for(let id in MONSTER_DATA){
if(MONSTER_DATA[id].en===tempConds.onlyMon){targetJpName=MONSTER_DATA[id].jp;break;}
}
let expectedName=(DISPLAY_LANG!=='EN')?targetJpName:tempConds.onlyMon;
let expectedSuffix=(DISPLAY_LANG!=='EN')?"オンリー":" only";
_onlyMonExpectedStr=expectedName+expectedSuffix;
}
executeSharedSearchLoop({
btnId:'searchBtnSpecific',btnText:'🎯 Search',btnBg:'linear-gradient(135deg,#0ff,#08a)',btnColor:'#000',stopText:'🛑 STOP',emptyRankMsg:B07,
validateConds:(conds,searchFilterLoc)=>{
const hasBasicCond=Object.keys(conds).some(k=>k!=='reqBox'&&k!=='hasBoxCond'&&conds[k]!=="");
const hasBoxCond=conds.hasBoxCond;
if(!hasBasicCond&&!hasBoxCond&&!searchFilterLoc){alert(A01);return false;}
return true;
},
filterRanks:(ranksToSearch,conds)=>{
if(conds.onlyMon||conds.monster||conds.bq||conds.hasBoxCond){
return ranksToSearch.filter(rank=>{
if(conds.bq){
let baseQ=parseInt(conds.bq);
let modulo=Math.floor(baseQ/10)*2+1;
let minOffset=Math.trunc(0-baseQ/10);
let maxOffset=Math.trunc((modulo-1)-baseQ/10);
let minFinalQ=Math.max(2, baseQ+minOffset);
let maxFinalQ=Math.min(248, baseQ+maxOffset);
let rStr=rank.toString(16).toUpperCase().padStart(2, '0');
let rankInfo=RANKS[rStr];
if(rankInfo&&(maxFinalQ<rankInfo.fqMin||minFinalQ>rankInfo.fqMax))return false;
}
let minSMR=1, maxSMR=9;
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1]){
minSMR=TableC[i*4+2];maxSMR=TableC[i*4+3];break;
}
}
if(conds.hasBoxCond){
let maxFloorCount=16;
for(let i=0;i<9;i++){
if(rank>=TableB[i*4]&&rank<=TableB[i*4+1]){maxFloorCount=TableB[i*4+3];break;}
}
if(conds.depth) maxFloorCount=parseInt(conds.depth);
let maxPossibleNum=Math.min(12, maxSMR+Math.floor((maxFloorCount - 1) / 4));
for(let r=10;r>=1;r--){
if(conds.reqBox[r]>0){
let canDrop=false;
for(let num=minSMR;num<=maxPossibleNum;num++){
let cMin=TableN[(num-1)*4+1];
let cMax=TableN[(num-1)*4+2];
if(r>=cMin&&r<=cMax){canDrop=true;break;}
}
if(!canDrop)return false;
}
}
}
if(!conds.onlyMon&&!conds.monster)return true;
if(conds.monster){
let targetSMR=parseInt(conds.monster);
if(targetSMR<minSMR||targetSMR>maxSMR)return false;
}
if(conds.onlyMon){
let maxFloorCount=16;
for(let i=0;i<9;i++){
if(rank>=TableB[i*4]&&rank<=TableB[i*4+1]){maxFloorCount=TableB[i*4+3];break;}
}
let maxOffset=Math.floor((maxFloorCount-1)/4);
let targetEnv=conds.env?parseInt(conds.env):0;
let isPossible=false;
for(let env=1;env<=5;env++){
if(targetEnv&&env!==targetEnv) continue;
for(let fMR=1;fMR<=12;fMR++){
let mId=ONLY_MONSTERS[env][fMR];
if(mId&&MONSTER_DATA[mId]&&MONSTER_DATA[mId].en===conds.onlyMon){
let smrStart=conds.monster?parseInt(conds.monster):minSMR;
let smrEnd=conds.monster?parseInt(conds.monster):maxSMR;
for(let smr=smrStart;smr<=smrEnd;smr++){
if(fMR>=smr&&fMR<=smr+maxOffset){isPossible=true;break;}
}
}
if(isPossible) break;
}
if(isPossible) break;
}
if(!isPossible)return false;
}
return true;
});
}
return ranksToSearch;
},
setupEngine:(eng, conds)=>{
eng.trackOverflow=(conds.anomaly==='all_invalid'||conds.anomaly==='ghost');
},
processSeed:(searchEngine, seed, rStr, targetRankKey, conds, searchFilterLoc)=>{
const searchOnlyWithD=document.getElementById('searchOnlyWithD').checked;
const needMapGeneration=conds.hasBoxCond||conds.elist||conds.onlyMon||searchOnlyWithD||conds.anomaly!=="";
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine, seed, targetRankKey, conds, searchFilterLoc))return null;
if(conds.onlyMon){
let possible=false;
let baseMR=searchEngine.monsterRank;
let maxFloorMR=Math.min(12, baseMR+Math.floor((searchEngine.floorCount-1)/4));
let envMonsters=ONLY_MONSTERS[searchEngine._details[3]];
if(envMonsters){
for(let fMR=baseMR;fMR<=maxFloorMR;fMR++){
let mId=envMonsters[fMR];
if(mId&&MONSTER_DATA[mId]&&MONSTER_DATA[mId].en===conds.onlyMon){possible=true;break;}
}
}
if(!possible)return null;
}
if(needMapGeneration) searchEngine.createDungeonDetail();
let boxHtml="";
if(conds.hasBoxCond){
let chestResult=ChestHtml(searchEngine, conds);
if(!chestResult.isMatch)return null;
boxHtml=chestResult.html;
}
let elistResult=checkElistAndD(searchEngine, conds, searchOnlyWithD, _onlyMonExpectedStr);
if(!elistResult.match)return null;
let anomResult=checkAnomalies(searchEngine, conds);
if(!anomResult.match)return null;
let specialHitDetails=elistResult.specialHitDetails;
let anomalyDetails=anomResult.anomalyDetails;
let hasMatchedD=elistResult.hasMatchedD;
let jumpToFloor=elistResult.jumpToFloor!==-1?elistResult.jumpToFloor:anomResult.jumpToFloor;
let itemNode=document.createElement('div');
itemNode.className='search-result-item';
if(hasMatchedD) itemNode.dataset.hasD="true";
if(!_cachedLocData&&seed<=0x7FFF&&targetRankKey!==null){
_cachedLocData=calcLocations(seed, targetRankKey);
}
let locHtml=_cachedLocData?LocaHtmlFromData(_cachedLocData, conds) :"";
let specialHtml=specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(s=>`<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>`:'';
let anomalyHtml=anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html=>html.replace('<span style="', '<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'';
let mapNameDisp=DISPLAY_LANG!=='EN'?searchEngine.mapNameJP:searchEngine.mapName;
itemNode.innerHTML=`
<span style="color:#ffd700;font-weight:bold">${seed.toString(16).toUpperCase().padStart(4,'0')}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<span style="color:#0ff;font-size:11px">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div>
${specialHtml}
${anomalyHtml}
`;
itemNode.onclick=()=>{
document.getElementById('seed').value=seed.toString(16).toUpperCase().padStart(4,'0');
document.getElementById('rank').value="0x"+rStr;
calculate();
document.getElementById('result').scrollIntoView({ behavior: 'smooth'});
if(jumpToFloor!==-1){
setTimeout(()=>{
const tab=document.querySelectorAll('.floor-tab')[jumpToFloor];
if(tab) tab.click();
}, 50);
}
};
return itemNode;
}
});
}
function clearUltimateSearch(){
const inputIds=[
'cond_prefix','cond_suffix','cond_locale','cond_lv','cond_location',
'cond_bq','cond_bq_count','cond_env','cond_monster','cond_depth','cond_boss',
'cond_seed_min','cond_seed_max','cond_elist','cond_only_mon','cond_anomaly',
'cond_box_S', 'cond_box_A', 'cond_box_B', 'cond_box_C', 'cond_box_D',
'cond_box_E', 'cond_box_F', 'cond_box_G', 'cond_box_H', 'cond_box_I'
];
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
let isSearching=false;
let searchCancel=false;
function getDispItem(enName){let trans=i18nDict['I_'+enName];return trans?trans.split('(')[0]:enName;}
function executeCustomSearch(config){
executeSharedSearchLoop({
btnId: config.btnId,
btnText: config.btnText,
btnBg:config.btnBg,
btnColor: config.btnColor||'#fff',
stopText: 'STOP',
emptyRankMsg:B08,
filterRanks: config.filterRanks,
processSeed:(searchEngine, seed, rStr, targetRankKey, conds, searchFilterLoc)=>{
searchEngine.calculateDetail(true);
if(config.checkBasicReq&&!config.checkBasicReq(searchEngine, conds))return null;
if(!checkUltimateCondsMatch(searchEngine, seed, targetRankKey, conds, searchFilterLoc))return null;
searchEngine.createDungeonDetail();
let chestResult=ChestHtml(searchEngine, conds);
if(!chestResult.isMatch)return null;
let boxHtml=chestResult.html;
let hitResult=config.checkDungeon(searchEngine);
if(hitResult&&hitResult.isHit){
if(!_cachedLocData&&seed<=0x7FFF&&targetRankKey!==null){_cachedLocData=calcLocations(seed, targetRankKey);}
let locHtml=_cachedLocData?LocaHtmlFromData(_cachedLocData, conds) :"";
let itemNode=document.createElement('div');
itemNode.className='search-result-item';
if(hitResult.specialStyle) itemNode.style.border=hitResult.specialStyle;
let mapNameDisp=DISPLAY_LANG!=='EN'?searchEngine.mapNameJP:searchEngine.mapName;
itemNode.innerHTML=`
<span style="color:#ffd700;font-weight:bold">${seed.toString(16).toUpperCase().padStart(4,'0')}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<span style="color:#0ff;font-size:11px;margin-bottom:2px;display:inline-block;">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div>
<div style="margin-top:4px;">${hitResult.displayHtml}</div>
`;
itemNode.title=J01;
itemNode.onclick=()=>{
document.getElementById('seed').value=seed.toString(16).toUpperCase().padStart(4,'0');
document.getElementById('rank').value="0x"+rStr;
calculate();
document.getElementById('result').scrollIntoView({ behavior: 'smooth'});
setTimeout(()=>{
const tab=document.querySelectorAll('.floor-tab')[hitResult.jumpFloor||0];
if(tab) tab.click();
}, 50);
};
return itemNode;
}
return null;
}
});
}
function getChestRanksForItems(itemNames){
const ranks=[];
for(let r=1;r<=10;r++){
let startIdx=TableO[r - 1], endIdx=TableO[r];
for(let i=startIdx;i<endIdx;i++){
if(itemNames.includes(TableR[TableQ[i]][0])&&!ranks.includes(r)) ranks.push(r);
}
}
return ranks;
}
function filterMapRanksBySMRAndChest(ranksToSearch,conds,chestRankGroups,targetFloorOffset){
return ranksToSearch.filter(rank=>{
if(conds&&conds.bq){
let baseQ=parseInt(conds.bq);
let modulo=Math.floor(baseQ/10)*2+1;
let minOffset=Math.trunc(0-baseQ/10);
let maxOffset=Math.trunc((modulo-1)-baseQ/10);
let minFinalQ=Math.max(2,baseQ+minOffset);
let maxFinalQ=Math.min(248,baseQ+maxOffset);
let rStr=rank.toString(16).toUpperCase().padStart(2,'0');
let rankInfo=RANKS[rStr];
if(rankInfo&&(maxFinalQ<rankInfo.fqMin||minFinalQ>rankInfo.fqMax)){return false;}
}
let minSMR=1, maxSMR=9;
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1]){minSMR=TableC[i*4+2];maxSMR=TableC[i*4+3];break;}
}
if(conds&&conds.monster){
let targetSMR=parseInt(conds.monster);
if(targetSMR<minSMR||targetSMR>maxSMR)return false;
}
if(!chestRankGroups||chestRankGroups.length===0)return true;
let maxFloorCount=16;
for(let i=0;i<9;i++){
if(rank>=TableB[i*4]&&rank<=TableB[i*4+1]){maxFloorCount=TableB[i*4+3];break;}
}
if(conds&&conds.depth)maxFloorCount=parseInt(conds.depth);
let minOffset=0;
let maxOffset=Math.floor((maxFloorCount-1)/4);
if(targetFloorOffset!==undefined&&targetFloorOffset!==null){
let requiredFloors=(targetFloorOffset*4)+1;
if(maxFloorCount<requiredFloors)return false;
minOffset=targetFloorOffset;
maxOffset=targetFloorOffset;
}
let minPossibleNum=minSMR+minOffset;
let maxPossibleNum=Math.min(12,maxSMR+maxOffset);
return chestRankGroups.every(group=>{
return group.some(r=>{
for(let num=minPossibleNum;num<=maxPossibleNum;num++){
let cMin=TableN[(num-1)*4+1];
let cMax=TableN[(num-1)*4+2];
if(r>=cMin&&r<=cMax)return true;
}
return false;
});
});
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
if(b===-1&&r===0&&itm==="ANY") continue;
if(f===0){
alert(typeof T==='function'?T('Please specify a floor.','請指定目標樓層！','階層を指定してください！'):'請指定目標樓層');
return;
}
let t_val=t_str===""?-1:parseInt(t_str);
if(t_val!==-1&&t_val<5) t_val=5;
let targetItems=[];
if(itm==="Rich"){
targetItems=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
}else if(itm==="Metasla"){
targetItems=["Metal slime sword","Metal slime spear","Metal slime shield","Metal slime armour","Metal slime helm","Metal slime gauntlets","Metal slime sollerets"];
}else if(itm==="S_wpn"){
targetItems=["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
}else if(itm!=="ANY"){
targetItems=[itm];
}
let allowedRanks=new Set();
if(r>0) allowedRanks.add(r);
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
id: i, floor: f, boxIdx: b, rank: r,
items: targetItems.length>0?targetItems:null,
timeStr: t_str, timerVal: t_val,
allowedRanks: allowedRanks
});
}
if(groups.length===0){alert(typeof A01!=='undefined'?A01:'A01');return;}
executeCustomSearch({
btnId: 'btnFreeSearch', btnText: 'Free', btnBg:'linear-gradient(135deg, #0088cc, #004488)',
filterRanks:(ranks, conds)=>{
let validRanks=ranks;
for(let g of groups){
if(g.allowedRanks.size>0){
let offset=0;
if(g.floor>=13) offset=3;
else if(g.floor>=9) offset=2;
else if(g.floor>=5) offset=1;
validRanks=filterMapRanksBySMRAndChest(validRanks, conds, [Array.from(g.allowedRanks)], offset);
}
}
return validRanks;
},
checkBasicReq:(eng, conds)=>eng.floorCount>=reqFloorCount,
checkDungeon:(eng)=>{
let groupHits=[];
let usedHits=new Set();
for(let g of groups){
let hitFoundForGroup=false;
let gHtmlStr="";
let f=g.floor - 1;
if(f>=eng.floorCount)return{isHit:false};
let bCount=eng.getBoxCount(f);
boxLoop:
for(let b=0;b<bCount;b++){
if(g.boxIdx===0&&b!==0) continue;
if(g.boxIdx===1&&b!==1) continue;
if(g.boxIdx===2&&b!==2) continue;
if(g.boxIdx===3&&(b===2||b>=3)) continue;
let boxInfo=eng.getBoxInfo(f, b);
if(g.rank>0&&boxInfo.rank!==g.rank) continue;
if(!g.items&&g.timerVal===-1){
let boxKey=`${f}_${b}_ANY`;
let isBoxUsed=false;
for(let k of usedHits){
if(k.startsWith(`${f}_${b}_`)){isBoxUsed=true;break;}
}
if(isBoxUsed) continue;
hitFoundForGroup=true;
usedHits.add(boxKey);
gHtmlStr=`<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[boxInfo.rank]}${b+1} (Any)</span>`;
break boxLoop;
}
let checkSecStart=g.timerVal===-1?0:g.timerVal - 5;
let checkSecEnd=g.timerVal===-1?255:g.timerVal - 5;
if(checkSecStart<0) checkSecStart=0;
if(checkSecEnd<0) checkSecEnd=0;
for(let s=checkSecStart;s<=checkSecEnd;s++){
let hitKey=`${f}_${b}_${s}`;
let boxKey=`${f}_${b}_ANY`;
if(usedHits.has(hitKey)||usedHits.has(boxKey)) continue;
let itemEN=eng.getBoxItem(f,b,s)[0];
if(g.items===null||g.items.includes(itemEN)){
hitFoundForGroup=true;
usedHits.add(hitKey);
let tDisp=s+5;
let itemDisp=getDispItem(itemEN);
gHtmlStr=`<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[boxInfo.rank]}${b+1} (${tDisp}s): ${itemDisp}</span>`;
break boxLoop;
}
}
}
if(!hitFoundForGroup)return{isHit:false};
groupHits.push(gHtmlStr);
}
return{isHit: true, jumpFloor: groups[0].floor - 1, displayHtml: groupHits.join('<br>'), specialStyle:"1px solid #0088cc"};
}
});
}
function QuickloadSearch(){
const targetItem=document.getElementById('searchItem').value;
const b9fItems=["Sainted soma","Yggdrasil leaf","Reset stone","S weapon"];
const isB9F=b9fItems.includes(targetItem);
if(["Cannibox","Mimic","Pandora's box"].includes(targetItem)){alert(A04);return;}
const millionaireItems=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
const sWeapons=["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
let reqCount, targetFloors, checkItems, btnConfig;
if(isB9F){
reqCount=2;
targetFloors=[8];
checkItems=(targetItem==='S weapon')?sWeapons:[targetItem];
btnConfig ={id: 'searchBtn', text: H01, bg:'linear-gradient(135deg,#4c4,#080)'};
}else{
reqCount=b3fThreeItems.includes(targetItem)?3:2;
targetFloors=b3fThreeItems.includes(targetItem)?[2]:[2, 3];
checkItems=(targetItem==='Millionaire')?millionaireItems:[targetItem];
btnConfig={id:'searchBtn',text:H01,bg:'linear-gradient(135deg,#4c4,#080)'};
}
const chestRanks=getChestRanksForItems(checkItems);
const checkSet=new Set(checkItems);
executeCustomSearch({
btnId:btnConfig.id, btnText:btnConfig.text, btnBg:btnConfig.bg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checkBasicReq:(eng,conds)=>eng.floorCount>=(isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[chestRanks],isB9F?2:0).length>0,
checkDungeon:(eng)=>{
let hitTypes=[];
let firstHitFloor=-1;
for(let f of targetFloors){
if(f>=eng.floorCount) continue;
const soloNames=eng.getFloorItemNames(f,1);
const partyNames=eng.getFloorItemNames(f,2);
let soloC=0, partyC=0;
for(let b=0;b<soloNames.length;b++){
if(checkSet.has(soloNames[b])) soloC++;
if(checkSet.has(partyNames[b])) partyC++;
}
if(soloC>=reqCount||partyC>=reqCount){if(firstHitFloor===-1) firstHitFloor=f;}
let prefixStr=isB9F?'B9F ':`B${f+1}F `;
if(soloC>=reqCount){
hitTypes.push(`<span style="color:#ff99bb;font-size:11px">${prefixStr}${STR_SOLO} x${soloC}</span>`);
}
if(partyC>=reqCount){
hitTypes.push(`<span style="color:#ffd700;font-size:11px">${prefixStr}${STR_PARTY} x${partyC}</span>`);
}
}
if(hitTypes.length>0){
return{isHit: true, jumpFloor: firstHitFloor, displayHtml: hitTypes.join('<br>')};
}
return{isHit:false};
}
});
}
function startSearch(){QuickloadSearch();}
function ThirdChestSearch(isS3){
let checkItems,btnConfig,targetFloors,colorStyle;
if(isS3){
checkItems=["Sage's elixir","Sainted soma"];
targetFloors=[12,13];
btnConfig={id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#fa0,#cc6600)'};
colorStyle='#F0F0aa';
}else{
const targetItem=document.getElementById('searchItem').value;
const millionaire2Items=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet"];
checkItems=(targetItem==='Millionaire')?millionaire2Items:[targetItem];
targetFloors=[2,3];
btnConfig={id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#fa0,#cc6600)'};
colorStyle='#11F514';
}
const chestRanks=isS3?[10]:getChestRanksForItems(checkItems);
executeCustomSearch({
btnId: btnConfig.id, btnText: btnConfig.text, btnBg:btnConfig.bg,
filterRanks:(ranks, conds)=>filterMapRanksBySMRAndChest(ranks, conds, [chestRanks], isS3?3:0),
checkBasicReq:(eng, conds)=>eng.floorCount>=(isS3?14:4)&&filterMapRanksBySMRAndChest([eng.MapRank], conds, [chestRanks], isS3?3:0).length>0,
checkDungeon:(eng)=>{
let f1=targetFloors[0], f2=targetFloors[1];
if(eng.getBoxCount(f1)>=3&&eng.getBoxCount(f2)>=3){
if(isS3&&(eng.getBoxInfo(f1,2).rank!==10||eng.getBoxInfo(f2,2).rank!==10)){
return{isHit:false};
}
let p1=eng.getBoxItem(f1,2,2)[0];
let p2=eng.getBoxItem(f2,2,2)[0];
let r1=CHEST_RANK[eng.getBoxInfo(f1,2).rank]||'?';
let r2=CHEST_RANK[eng.getBoxInfo(f2,2).rank]||'?';
if(checkItems.includes(p1)&&checkItems.includes(p2)){
return{
isHit: true, jumpFloor: f1,
displayHtml: `<span style="color:${colorStyle};font-size:11px">B${f1+1}F ${r1}3: ${getDispItem(p1)}<br>B${f2+1}F ${r2}3: ${getDispItem(p2)}</span>`
};
}
}
return{isHit:false};
}
});
}
function Box3Search(){
const targetValue=document.getElementById('searchItem').value;
const supportedForBox3=['Ethereal stone', 'Lucida shard', 'Sainted soma', 'Millionaire'];
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
function TKSearch(){
const targetItem=document.getElementById('searchItem').value;
if(targetItem==='Sainted soma'){JFireSearch();return;}
let wpTargets=[];
let strictMatTargets=[];
let broadMatTargets=[];
let isMillionaire=false;
let isMonsterBox=false;
let minSec=0, maxSec=0;
if(targetItem==='Millionaire'){
isMillionaire=true;
wpTargets=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
strictMatTargets=["Gold bar","Orichalcum"];
broadMatTargets=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Gold bar","Orichalcum"];
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
const wpSet=new Set(wpTargets);
executeCustomSearch({
btnId: 'BtnTK', btnText: H02, btnBg:'linear-gradient(135deg, #f80, #cc4400)',
filterRanks:(ranks, conds)=>filterMapRanksBySMRAndChest(ranks, conds, [getChestRanksForItems(wpTargets),getChestRanksForItems(allMatTargets)], 0),
checkBasicReq:(eng, conds)=>eng.floorCount>=3,
checkDungeon:(eng)=>{
let wpMet=false, wpFloor=2;
let wpHits=[];
let checkWp=(fIdx)=>{
if(fIdx>=eng.floorCount)return false;
const soloNames=eng.getFloorItemNames(fIdx, 1);
const partyNames=eng.getFloorItemNames(fIdx, 2);
let foundAny=false;
const limit=Math.min(2, soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b], p=partyNames[b];
if(wpSet.has(s)||wpSet.has(p)){
let t=(wpSet.has(s)&&wpSet.has(p))?STR_BOTH:(wpSet.has(p)?STR_PARTY:STR_SOLO);
let hitItem=wpSet.has(p)?p:s;
let hitItemStr=getDispItem(hitItem);
let rName=CHEST_RANK[eng.getBoxInfo(fIdx,b).rank]||'?';
let color="#ff99bb";
if(t===STR_PARTY) color="#ffd700";
wpHits.push(`<span style="color:${color};font-size:11px">B${fIdx+1}F ${rName}${b+1}: ${hitItemStr} (${t})</span>`);
wpMet=true;
wpFloor=fIdx;
foundAny=true;
}
}
return foundAny;
};
if(isMonsterBox){
if(!checkWp(2))return{isHit:false};
let c1Met=false, matDet="", b3Rank="";
if(eng.floorCount>2&&eng.getBoxCount(2)>=3){
b3Rank=CHEST_RANK[eng.getBoxInfo(2, 2).rank]||'?';
let foundSec=-1;
for(let s=minSec;s<=maxSec;s++){
if(eng.getBoxItem(2,2,s)[0]===targetItem){foundSec=s;break;}
}
if(foundSec!==-1){
c1Met=true;
matDet=`B3F ${b3Rank}3 (${foundSec+5}s): ${getDispItem(targetItem)}`;
}
}
if(c1Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#ff6666;font-size:11px;font-weight:bold;">${matDet}</span>`;
return{isHit:true, jumpFloor:2, displayHtml:html, specialStyle:"1px solid #ff6666"};
}
return{isHit:false};
}
if(!checkWp(2)) checkWp(3);
if(!wpMet)return{isHit: false};
let c1Met=false, c2Met=false, matDet="";
let b3V=false, pB3="", b3Rank="";
let b4V=false, pB4="", b4Rank="";
let currentB3Targets=isMillionaire?(wpFloor===2?strictMatTargets:broadMatTargets):strictMatTargets;
let currentB4Targets=isMillionaire?(wpFloor===3?strictMatTargets:broadMatTargets):strictMatTargets;
let checkSec=isMillionaire?2:8;
let labelText=isMillionaire?"" :"(13s)";
if(eng.floorCount>2&&eng.getBoxCount(2)>=3){
pB3=eng.getBoxItem(2,2,checkSec)[0];
b3Rank=CHEST_RANK[eng.getBoxInfo(2,2).rank]||'?';
if(currentB3Targets.includes(pB3)){
let pB3_25s=eng.getBoxItem(2,2,20)[0];
if(!isMillionaire){
if(!currentB3Targets.includes(pB3_25s)) b3V=true;
}else{
if(!strictMatTargets.includes(pB3_25s)) b3V=true;
}
}
}
if(eng.floorCount>3&&eng.getBoxCount(3)>=3){
pB4=eng.getBoxItem(3,2,checkSec)[0];
b4Rank=CHEST_RANK[eng.getBoxInfo(3,2).rank]||'?';
if(currentB4Targets.includes(pB4)){
let pB4_25s=eng.getBoxItem(3,2,20)[0];
if(!isMillionaire){
if(!currentB4Targets.includes(pB4_25s)) b4V=true;
}else{
if(!strictMatTargets.includes(pB4_25s)) b4V=true;
}
}
}
if(b3V&&b4V){c2Met=true;matDet=`B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}<br>B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`;}
else if(b3V){c1Met=true;matDet=`B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}`;}
else if(b4V){c1Met=true;matDet=`B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`;}
if(c1Met||c2Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${matDet}</span>`;
return{isHit: true, jumpFloor: wpFloor, displayHtml: html, specialStyle: c2Met?"1px solid #fa0" :""};
}
return{isHit: false};
}
});
}
function JFireSearch(){
executeCustomSearch({
btnId: 'BtnTK', btnText: H02, btnBg:'linear-gradient(135deg, #f80, #cc4400)',
filterRanks:(ranks)=>ranks.filter(rank=>{
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1])return TableC[i*4+3]>=9;
}
return false;
}),
checkBasicReq:(eng)=>eng.monsterRank===9&&eng.floorCount>=9,
checkDungeon:(eng)=>{
let b9Boxes=eng.getBoxCount(8);
let c1Met=false;
let c1Hits=[];
const soloNames=eng.getFloorItemNames(8, 1);
const partyNames=eng.getFloorItemNames(8, 2);
const limit=Math.min(2, soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b], p=partyNames[b];
if(s==="Sainted soma"||p==="Sainted soma"){
c1Met=true;
let t=(s===p)?STR_BOTH:(p==="Sainted soma"?STR_PARTY:STR_SOLO);
let color="#ff99d7";
if(t===STR_PARTY) color="#ffd700";
c1Hits.push(`<span style="color:${color};font-size:11px">B9F S${b+1}: ${getDispItem("Sainted soma")} (${t})</span>`);
}
}
if(!c1Met||(b9Boxes>=3&&partyNames[2]==="Sainted soma"))return{isHit: false};
let c2Met=false, c2Det="";
const chk3=(fIdx, n)=>{
if(eng.getBoxCount(fIdx)>=3&&eng.getBoxInfo(fIdx, 2).rank===10){
let pItem=eng.getBoxItem(fIdx,2,2)[0];
if(pItem==="Sainted soma"||pItem==="Sage's elixir"){
let dispItem=pItem==="Sainted soma"?getDispItem("Sainted soma"):getDispItem("Sage's elixir");
return{met:true, det:`${n} S3: ${dispItem}`};
}
}
return{met:false};
};
let b9Res=chk3(8, "B9F");
if(b9Res.met){c2Met=true;c2Det=b9Res.det;}
else if(eng.floorCount>=10){
let b10Res=chk3(9, "B10F");
if(b10Res.met){c2Met=true;c2Det=b10Res.det;}
}
if(c1Met&&c2Met){
let html=`${c1Hits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${c2Det}</span>`;
return{isHit: true, jumpFloor: 8, displayHtml: html};
}
return{isHit:false};
}
});
}
async function startSearchATBug(){
if(isSearching){searchCancel=true;return;}
isSearching=true;searchCancel=false;
const btn=document.getElementById('searchBtnBug');
if(btn){btn.textContent='STOP';btn.style.background='#f44';btn.style.color='#fff';}
const searchAllRanks=document.getElementById('searchAllRanks').checked;
const baseRankStr=document.getElementById('rank').value;
const searchFilterLoc=true;
const searchOnlyWithD=document.getElementById('searchOnlyWithD')?document.getElementById('searchOnlyWithD').checked:false;
const requireFloorIncrease=document.getElementById('requireFloorIncrease').checked;
const requireBugFloorHit=document.getElementById('requireBugFloorHit')?document.getElementById('requireBugFloorHit').checked:false;
const conds=getUltimateConds();
const cond_elist=conds.elist;
const cond_only_mon=conds.onlyMon;
const _onlyMonExpectedStr=buildOnlyMonExpectedStr(conds);
let effectiveElistCond=cond_elist;
if(!cond_elist&&!cond_only_mon&&!searchOnlyWithD&&!conds.hasBoxCond){effectiveElistCond='ONLY';}
const resultDiv=document.getElementById('searchResults');
resultDiv.innerHTML='<div style="color:#aaa;font-size:13px;margin-bottom:8px">'+B01+' <span id="searchProgress" style="color:#fff;font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>';
const grid=document.getElementById('searchGrid');
const progressSpan=document.getElementById('searchProgress');
let ranksToSearch=searchAllRanks?MAP_RANK:[parseInt(baseRankStr)];
if(cond_only_mon||conds.monster||conds.bq||conds.hasBoxCond){
ranksToSearch=ranksToSearch.filter(rank=>{
if(conds.bq){
let baseQ=parseInt(conds.bq);
let modulo=Math.floor(baseQ/10)*2+1;
let minOffset=Math.trunc(0-baseQ/10);
let maxOffset=Math.trunc((modulo-1)-baseQ/10);
let minFinalQ=Math.max(2,baseQ+minOffset);
let maxFinalQ=Math.min(248,baseQ+maxOffset);
let rStr=rank.toString(16).toUpperCase().padStart(2,'0');
let rankInfo=RANKS[rStr];
if(rankInfo&&(maxFinalQ<rankInfo.fqMin||minFinalQ>rankInfo.fqMax)){
return false;
}
}
let minSMR=1,maxSMR=9;
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1]){
minSMR=TableC[i*4+2];maxSMR=TableC[i*4+3];break;
}
}
if(conds.hasBoxCond){
let maxPossibleNum=Math.min(12,maxSMR+3);
for(let r=10;r>=1;r--){
if(conds.reqBox[r]>0){
let canDrop=false;
for(let num=minSMR;num<=maxPossibleNum;num++){
let cMin=TableN[(num-1)*4+1];
let cMax=TableN[(num-1)*4+2];
if(r>=cMin&&r<=cMax){canDrop=true;break;}
}
if(!canDrop)return false;
}
}
}
if(!cond_only_mon&&!conds.monster)return true;
if(conds.monster){
let tgt=parseInt(conds.monster);
if(tgt<minSMR||tgt>maxSMR)return false;
}
if(cond_only_mon){
let isPossible=false;
let targetEnv=conds.env?parseInt(conds.env):0;
let maxOffset=3;
for(let env=1;env<=5;env++){
if(targetEnv&&env!==targetEnv) continue;
for(let fMR=1;fMR<=12;fMR++){
let mId=ONLY_MONSTERS[env][fMR];
if(mId&&MONSTER_DATA[mId]&&MONSTER_DATA[mId].en===cond_only_mon){
let smrStart=conds.monster?parseInt(conds.monster):minSMR;
let smrEnd=conds.monster?parseInt(conds.monster):maxSMR;
for(let smr=smrStart;smr<=smrEnd;smr++){
if(fMR>=smr&&fMR<=smr+maxOffset){isPossible=true;break;}
}
}
if(isPossible) break;
}
if(isPossible) break;
}
if(!isPossible)return false;
}
return true;
});
if(ranksToSearch.length===0){
progressSpan.textContent="100% ("+B07+")";
isSearching=false;
if(btn){btn.textContent=H05;btn.style.background='linear-gradient(135deg,#cc00cc,#660066)';btn.style.color='#fff';}
return;
}
}
const rangeData=getValidatedSeedRange();
if(rangeData.error){
alert(rangeData.error);
isSearching=false;
if(btn){btn.textContent=H05;btn.style.background='linear-gradient(135deg,#cc00cc,#660066)';btn.style.color='#fff';}
return;
}
const {startSeed,endSeed}=rangeData;
let totalCombos=ranksToSearch.length*(endSeed-startSeed+1);
let processed=0;
let hitCount=0;
let searchEngine=new GrottoDetail();
let fragment=document.createDocumentFragment();
for(let rank of ranksToSearch){
if(searchCancel) break;
let rStr=rank.toString(16).toUpperCase().padStart(2, '0');
let targetRankKey=RANKS[rStr]?rStr:(RANKS["0x"+rStr]?"0x"+rStr:null);
for(let seed=startSeed;seed<=endSeed;seed++){
if(searchCancel) break;
if(processed % 200===0){
progressSpan.textContent=Math.floor((processed/totalCombos)*100)+'% ('+B02+' '+rStr+', Seed '+seed.toString(16).toUpperCase().padStart(4,'0')+') ['+B04+''+hitCount+' '+B03+']';
if(fragment.children.length>0) grid.appendChild(fragment);
await new Promise(r=>setTimeout(r, 0));
}
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
searchEngine._at_offset=0;
searchEngine._force_16_floors=false;
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine, seed, targetRankKey, conds, searchFilterLoc)){processed++;continue;}
let origFloors=searchEngine.floorCount;
let origBoss=DISPLAY_LANG!=='EN'?searchEngine.bossNameJP:searchEngine.bossName;
let origName=DISPLAY_LANG!=='EN'?searchEngine.mapNameJP:searchEngine.mapName;
let origLevel=searchEngine.mapLevel;
searchEngine._at_offset=1;
searchEngine._force_16_floors=false;
searchEngine.calculateDetail();
let bugFloors=searchEngine.floorCount;
let bugBoss=DISPLAY_LANG!=='EN'?searchEngine.bossNameJP:searchEngine.bossName;
let bugName=DISPLAY_LANG!=='EN'?searchEngine.mapNameJP:searchEngine.mapName;
let bugLevel=searchEngine.mapLevel;
let isFloorIncreased=bugFloors>origFloors;
if(requireFloorIncrease&&!isFloorIncreased){processed++;continue;}
searchEngine._at_offset=0;
searchEngine._force_16_floors=true;
searchEngine.calculateDetail();
let boxHtml="";
if(conds.hasBoxCond){
let actualBoxCounts={10:0,9:0,8:0,7:0,6:0,5:0,4:0,3:0,2:0,1:0};
for(let f=2;f<bugFloors;f++){
let boxes=searchEngine.di[f][8];
for(let b=0;b<boxes;b++){
actualBoxCounts[searchEngine.di[f][9+b]]++;
}
}
let boxMatch=true;
let boxStr=[];
for(let r=10;r>=1;r--){
if(conds.reqBox[r]>0){
if(actualBoxCounts[r]!==conds.reqBox[r]){boxMatch=false;break;}
boxStr.push(`${CHEST_RANK[r]}${conds.reqBox[r]}`);
}
}
if(!boxMatch){processed++;continue;}
boxHtml=`<div style="margin-top:4px;"><span style="color:#ffcc00;font-size:11px;background:#420;padding:2px 4px;border-radius:3px;">${boxStr.join(' ')}</span></div>`;
}
let foundSpecialFloors=[];
let specialHitCount=0;
let hasAnyD=false;
for(let f=2;f<16;f++){
let elistInfo=getFloorElistInfo(searchEngine, f);
let val=parseInt(elistInfo.hex, 16);
if(elistInfo.dValue>0) hasAnyD=true;
let isElistHit=false;
let isOnlyHit=false;
if(val>=0x2B00&&elistInfo.state){
if(!effectiveElistCond){isElistHit=true;}
else if(effectiveElistCond==='PARTIAL_NONE'&&elistInfo.state.includes(EL_P)) isElistHit=true;
else if(effectiveElistCond==='4'&&elistInfo.state.includes(EL_4)) isElistHit=true;
else if(effectiveElistCond==='3'&&elistInfo.state.includes(EL_3)) isElistHit=true;
else if(effectiveElistCond==='2'&&elistInfo.state.includes(EL_2)) isElistHit=true;
else if(effectiveElistCond==='ONLY'&&(elistInfo.state.includes('only')||elistInfo.state.includes('オンリー'))) isElistHit=true;
else if(effectiveElistCond==='NONE'&&elistInfo.state.includes(EL_0)&&!elistInfo.state.includes(EL_P)) isElistHit=true;
else if(effectiveElistCond==='MULTI_SPECIAL') isElistHit=true;
if(!cond_only_mon){
isOnlyHit=true;
}else if(elistInfo.state.includes(_onlyMonExpectedStr)){
isOnlyHit=true;
}
}
let isSpecialMatch=(isElistHit&&isOnlyHit&&val>=0x2B00&&val<=0x2BBC&&elistInfo.state);
if(isSpecialMatch){specialHitCount++;}
if((val>=0x2B00&&elistInfo.state)||(searchOnlyWithD&&elistInfo.dValue>0)){
if(!foundSpecialFloors.some(x=>x.floor===f+1)){
let fMR=searchEngine._details[2]+(f >> 2);
if(fMR>12) fMR=12;
foundSpecialFloors.push({
floor: f+1,
hex: elistInfo.hex,
state: elistInfo.state||EL_NORMAL,
dValue: elistInfo.dValue,
envType: searchEngine._details[3],
floorMR: fMR,
isSpecialMatch: !!isSpecialMatch
});
}
}
}
if(requireBugFloorHit){
foundSpecialFloors=foundSpecialFloors.filter(info=>info.floor>origFloors&&info.floor<=bugFloors);
hasAnyD=foundSpecialFloors.some(info=>info.dValue>0);
specialHitCount=foundSpecialFloors.filter(info=>info.state!==EL_NORMAL).length;
if(foundSpecialFloors.length===0){
processed++;
continue;
}
}
if(searchOnlyWithD&&!hasAnyD){processed++;continue;}
if(searchOnlyWithD&&(effectiveElistCond||cond_only_mon)&&effectiveElistCond!=='MULTI_SPECIAL'){
let hasMatchedD_mb=foundSpecialFloors.some(info=>info.dValue>0&&info.isSpecialMatch);
if(!hasMatchedD_mb){processed++;continue;}
}
if(effectiveElistCond==='MULTI_SPECIAL'&&specialHitCount<2){processed++;continue;}
if((effectiveElistCond||cond_only_mon)&&specialHitCount===0){processed++;continue;}
hitCount++;
const isJP_mb=(DISPLAY_LANG!=='EN');
let elistHtmlStr=foundSpecialFloors.map(info=>{
let stateColor="#888";
if(info.state!==EL_NORMAL){
if(info.floor<=origFloors){
stateColor="#44ff44";
}else if(info.floor<=bugFloors){
stateColor="#fa0";
}else{
stateColor="#f8f";
}
}
let dHtml=info.dValue>0?` <span style="background:#fa0;color:#000;padding:1px 5px;border-radius:3px;font-size:10px;margin-left:4px;white-space:nowrap;">${info.dValue}</span>`:'';
let line=`<span style="color:#0ff;font-size:12px;">B${info.floor}F:[${info.hex}] <strong style="color:${stateColor};">${info.state}</strong>${dHtml}</span>`;
const st=info.state;
let surviveCount=0;
if(st.includes(EL_4))surviveCount=4;
else if(st.includes(EL_3))surviveCount=3;
else if(st.includes(EL_2))surviveCount=2;
if(surviveCount>0){
const spList=(SPAWN_DB[info.envType]&&SPAWN_DB[info.envType][info.floorMR])||[];
const norms=spList.filter(e=>e.length===3);
const names=norms.slice(0, surviveCount).map(e=>{
const md=MONSTER_DATA[e[0]];
return md?(isJP_mb?md.jp:md.en):'?';
});
line += `<br><span style="color:#aaa;font-size:10px;">${names.join('+')}</span>`;
}
return line;
}).join('<br>');
let itemNode=document.createElement('div');
itemNode.className='search-result-item';
if(hasAnyD) itemNode.dataset.hasD="true";
let bugIcon=isFloorIncreased?'📈':'';
itemNode.innerHTML=`
<span style="color:#ffd700;font-weight:bold;font-size:15px;">${seed.toString(16).toUpperCase().padStart(4,'0')}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<div style="background:#111;padding:4px 8px;border-radius:4px;margin:4px 0;border:1px solid #333;">
<span style="color:#aaa;font-size:11px">[Source] ${origName} | B${origFloors}F | ${origBoss}</span><br>
<span style="color:#f8f;font-size:12px">[Bug] ${bugName} | B${bugFloors}F | ${bugBoss} ${bugIcon}</span>
</div>${boxHtml}
<div style="padding-top:2px;">${elistHtmlStr}</div>
`;
itemNode.onclick=()=>{
document.getElementById('seed').value=seed.toString(16).toUpperCase().padStart(4,'0');
document.getElementById('rank').value="0x"+rStr;
calculate();
document.getElementById('result').scrollIntoView({ behavior: 'smooth'});
};
fragment.appendChild(itemNode);
searchEngine._force_16_floors=false;
processed++;
}
}
if(fragment.children.length>0) grid.appendChild(fragment);
isSearching=false;
if(btn){btn.textContent=H05;btn.style.background='linear-gradient(135deg,#cc00cc,#660066)';btn.style.color='#fff';}
progressSpan.textContent=searchCancel?`${B05} (${B04}${hitCount} ${B03})`:`100% (${B06?B06+' ':''}${hitCount} ${B03})`;
}