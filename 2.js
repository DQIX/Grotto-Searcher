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
const BQ_MIN=2,BQ_MAX=248;
const BQ_D_MIN=245;
const LOCATION_FQ_BANDS=[
{fqMin:2,fqMax:50,locationMax:47},
{fqMin:51,fqMax:80,locationMax:131},
{fqMin:81,fqMax:248,locationMax:150}
];
const QUEST015="Quest 015";
const QUEST015_EXC={seed:0x0032,fq:0x02,loc:5,bqFill:2};
const BQ_MODULO=new Int32Array(256);
const BQ_TENTH=new Float64Array(256);
const BQ_FQ_LO=new Int32Array(256);
const BQ_FQ_HI=new Int32Array(256);
function hasConditionValue(raw){
return raw!==null&&raw!==undefined&&String(raw).trim()!=="";
}
function isValidBaseQuality(value){
return Number.isInteger(value)&&value>=BQ_MIN&&value<=BQ_MAX;
}
function parseBaseQuality(raw){
if(!hasConditionValue(raw))return null;
const value=Number(String(raw).trim());
return isValidBaseQuality(value)?value:NaN;
}
function parseLocationCode(raw){
if(!hasConditionValue(raw))return null;
const text=String(raw).trim();
if(!/^[0-9A-Fa-f]{1,2}$/.test(text))return NaN;
const value=parseInt(text,16);
return value>=0x01&&value<=0x96?value:NaN;
}
function getLocationBQFilters(conds){
const location=parseLocationCode(conds&&conds.location);
const baseQ=parseBaseQuality(conds&&conds.bq);
return{location,baseQ,valid:!Number.isNaN(location)&&!Number.isNaN(baseQ)};
}
function getLocationMax(finalQuality){
for(const band of LOCATION_FQ_BANDS)if(finalQuality<=band.fqMax)return band.locationMax;
return LOCATION_FQ_BANDS[LOCATION_FQ_BANDS.length-1].locationMax;
}
function calcFinalQuality(baseQ,r1){
const final=baseQ+Math.trunc(r1%BQ_MODULO[baseQ]-BQ_TENTH[baseQ]);
return final<2?2:final>248?248:final;
}
function getFinalQualityBounds(rawBaseQ){
const baseQ=parseBaseQuality(rawBaseQ);
if(!isValidBaseQuality(baseQ))return null;
return{baseQ,minFinalQ:BQ_FQ_LO[baseQ],maxFinalQ:BQ_FQ_HI[baseQ]};
}
for(let b=BQ_MIN;b<=BQ_MAX;b++){
const m=Math.floor(b/10)*2+1;
BQ_MODULO[b]=m;
BQ_TENTH[b]=b/10;
let lo=248,hi=2;
for(let r=0;r<m;r++){
const f=calcFinalQuality(b,r);
if(f<lo)lo=f;
if(f>hi)hi=f;
}
BQ_FQ_LO[b]=lo;
BQ_FQ_HI[b]=hi;
}
const bqScanRangeCache={};
function getBaseQScanRange(fqMin,fqMax){
const key=fqMin+':'+fqMax;
let r=bqScanRangeCache[key];
if(r)return r;
let lo=BQ_MIN,hi=BQ_MAX;
while(lo<=BQ_MAX&&BQ_FQ_HI[lo]<fqMin)lo++;
while(hi>=BQ_MIN&&BQ_FQ_LO[hi]>fqMax)hi--;
r=bqScanRangeCache[key]=Object.freeze({lo,hi});
return r;
}
let bqDCache=null;
function getBqDFq(){
if(bqDCache===null){
bqDCache=248;
for(let bq=BQ_D_MIN;bq<=BQ_MAX;bq++)if(BQ_FQ_LO[bq]<bqDCache)bqDCache=BQ_FQ_LO[bq];
}
return bqDCache;
}
const BQ_FEAS_R1_END=0x8000;
let bqCountFeasibility=null;
let bqFeasWork=null;
function advanceBqCountFeasibility(untilR1){
if(bqCountFeasibility)return true;
if(!bqFeasWork){
const keys=Object.keys(RANKS);
const acc={};
for(const k of keys)acc[k]={minTotal:Infinity,minGroup:Infinity};
bqFeasWork={keys,acc,pre:new Int32Array(248+2),r1:0};
}
const w=bqFeasWork;
const pre=w.pre;
const cnt=(lo,hi)=>hi<lo?0:pre[hi]-pre[lo-1];
const end=untilR1<BQ_FEAS_R1_END?untilR1:BQ_FEAS_R1_END;
for(;w.r1<end;w.r1++){
pre.fill(0);
for(let bq=BQ_MIN;bq<=BQ_MAX;bq++)pre[calcFinalQuality(bq,w.r1)]++;
for(let q=1;q<pre.length;q++)pre[q]+=pre[q-1];
for(const k of w.keys){
const{fqMin,fqMax}=RANKS[k];
const tot=cnt(fqMin,fqMax);
if(tot===0)continue;
const a=w.acc[k];
if(tot<a.minTotal)a.minTotal=tot;
for(const band of LOCATION_FQ_BANDS){
const groupCount=cnt(
Math.max(fqMin,band.fqMin),
Math.min(fqMax,band.fqMax)
);
if(groupCount>0&&groupCount<a.minGroup)a.minGroup=groupCount;
}
}
}
if(w.r1<BQ_FEAS_R1_END)return false;
bqCountFeasibility=w.acc;
bqFeasWork=null;
return true;
}
function getBqCountFeasibility(){
if(!bqCountFeasibility)advanceBqCountFeasibility(BQ_FEAS_R1_END);
return bqCountFeasibility;
}
function isBqCountRankPossible(rank,mode){
const info=RANKS[hex2(rank)];
if(!info)return true;
if(mode==='D'||mode==='Dp')return info.fqMax>=getBqDFq();
if(mode==='1p'&&QUEST015_EXC.fq>=info.fqMin&&QUEST015_EXC.fq<=info.fqMax)return true;
const f=getBqCountFeasibility()[hex2(rank)];
if(!f)return true;
return(mode==='1'?f.minTotal:f.minGroup)===1;
}
function formatRanges(nums){
if(nums.length===0)return C16;
const sorted=[...nums].sort((a,b)=>a-b);
const ranges=[];
let start=sorted[0],end=sorted[0];
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
function ensureSeedTimerCache(){
if(SEED_TO_TIMERS_CACHE)return;
SEED_TO_TIMERS_CACHE={};
for(let t=0;t<65536;t++){
const x1=lcg(t);
const x2=lcg(x1);
const s=(x2>>>16)&0x7FFF;
(SEED_TO_TIMERS_CACHE[s]??=[]).push(t);
}
}
function timerToR1R3(timer){
const x1=lcg(timer);
const x2=lcg(x1);
const x3=lcg(x2);
return{r1:(x1>>>16)&0x7FFF,r3:(x3>>>16)&0x7FFF};
}
function calcLocations(seed,rStr){
const{fqMin,fqMax}=RANKS[rStr]||{fqMin:2,fqMax:248};
const seenLocations={};
const outputOrder=[];
ensureSeedTimerCache();
const timers=SEED_TO_TIMERS_CACHE[seed]||[];
const addLoc=(timer,loc,bqs)=>{
if(!seenLocations[loc]){
const minBq=Math.min(...bqs);
seenLocations[loc]=new Set();
outputOrder.push({timer,location:loc,minBq});
}
for(const bq of bqs)seenLocations[loc].add(bq);
};
const scan=getBaseQScanRange(fqMin,fqMax);
for(const timer of timers){
const{r1,r3}=timerToR1R3(timer);
const locToBq={};
for(let baseQ=scan.lo;baseQ<=scan.hi;baseQ++){
const finalQ=calcFinalQuality(baseQ,r1);
if(finalQ<fqMin||finalQ>fqMax)continue;
const locMax=getLocationMax(finalQ);
const calcLoc=(r3%locMax)+1;
(locToBq[calcLoc]??=[]).push(baseQ);
}
for(const loc in locToBq)addLoc(timer,+loc,locToBq[loc]);
}
const q15=QUEST015_EXC;
if(seed===q15.seed&&q15.fq>=fqMin&&q15.fq<=fqMax)addLoc(QUEST015,q15.loc,[q15.bqFill]);
outputOrder.sort((a,b)=>{
if(a.timer===QUEST015)return 1;
if(b.timer===QUEST015)return-1;
if(a.timer!==b.timer)return a.timer-b.timer;
return a.minBq-b.minBq;
});
return{outputOrder,seenLocations};
}
let _cachedLocData=null;
let _cachedLocSeed=null;
let _cachedLocRankKey=null;
function resetLocationCache(){
_cachedLocData=null;
_cachedLocSeed=null;
_cachedLocRankKey=null;
}
function getLocDataCached(seed,targetRankKey){
if(!Number.isInteger(seed)||seed<0||seed>0x7FFF||targetRankKey==null)return null;
if(!_cachedLocData||_cachedLocSeed!==seed||_cachedLocRankKey!==targetRankKey){
_cachedLocData=calcLocations(seed,targetRankKey);
_cachedLocSeed=seed;
_cachedLocRankKey=targetRankKey;
}
return _cachedLocData;
}
function peekLocDataCached(seed,targetRankKey){
return _cachedLocData&&_cachedLocSeed===seed&&_cachedLocRankKey===targetRankKey
?_cachedLocData:null;
}
function matchesLocationBQ(locData,locNum,targetLocNum,targetBqNum){
const bqs=locData&&locData.seenLocations[locNum];
return!!bqs
&&(targetLocNum===null||locNum===targetLocNum)
&&(targetBqNum===null||bqs.has(targetBqNum));
}
function hex2(n){return n.toString(16).toUpperCase().padStart(2,'0');}
function hex4(n){return n.toString(16).toUpperCase().padStart(4,'0');}
function dispName(eng){return DISPLAY_LANG!=='EN'?eng.mapNameJP:eng.mapName;}
function dispBoss(eng){return DISPLAY_LANG!=='EN'?eng.bossNameJP:eng.bossName;}
function buildOnlyMonExpectedStr(conds){
if(!conds?.onlyMon)return'';
let targetJpName=conds.onlyMon;
for(let id in MONSTER_DB){
if(MONSTER_DB[id].en===conds.onlyMon){targetJpName=MONSTER_DB[id].jp;break;}
}
return(DISPLAY_LANG!=='EN'?targetJpName:conds.onlyMon)+(DISPLAY_LANG!=='EN'?"オンリー":" only");
}
function resolveRankKey(rStr,rankNum){
return RANKS[rStr]?rStr:(RANKS["0x"+rStr]?"0x"+rStr:((rankNum!==undefined&&RANKS[rankNum])?rankNum:null));
}
function checkBasicConds(searchEngine,conds){
if(conds.prefix&&searchEngine._details[5]!=conds.prefix)return false;
if(conds.suffix&&searchEngine._details[6]!=conds.suffix)return false;
if(conds.locale&&searchEngine.MapLocale!=conds.locale)return false;
if(conds.lv&&searchEngine._details[4]!=conds.lv)return false;
if(conds.env&&searchEngine._details[3]!=conds.env)return false;
if(conds.monster&&searchEngine._details[2]!=conds.monster)return false;
if(conds.depth&&searchEngine._details[1]!=conds.depth)return false;
if(conds.boss&&searchEngine._details[0]!=conds.boss)return false;
return true;
}
function isCombinedElistMonsterSearch(conds){
return!!conds?.onlyMon&&['2','3','4','PARTIAL_NONE'].includes(conds.elist);
}
function checkOnlyMonPossible(searchEngine,conds){
if(!conds?.onlyMon)return true;
let baseMR=searchEngine.monsterRank;
let maxFloorMR=Math.min(12,baseMR+Math.floor((searchEngine.floorCount-1)/4));
for(let fMR=baseMR;fMR<=maxFloorMR;fMR++){
if(matchesOnlyMonFloor(searchEngine._details[3],fMR,conds.onlyMon))return true;
}
return false;
}
function checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey){
const filters=getLocationBQFilters(conds);
if(!filters.valid)return{match:false};
const targetLocNum=filters.location;
const targetBqNum=filters.baseQ;
const bqCountFilter=conds.bqCount||"";
if(targetLocNum===null&&targetBqNum===null&&!searchFilterLoc&&!bqCountFilter)return{match:true};
if(seed>0x7FFF||targetRankKey==null)return{match:false};
const locData=getLocDataCached(seed,targetRankKey);
if(!locData||locData.outputOrder.length===0)return{match:false};
if(targetLocNum!==null||targetBqNum!==null){
let targetFound=false;
for(const locObj of locData.outputOrder){
if(matchesLocationBQ(locData,locObj.location,targetLocNum,targetBqNum)){
targetFound=true;
break;
}
}
if(!targetFound)return{match:false};
}
if(bqCountFilter==="1"){
let allBqs=new Set();
for(let loc in locData.seenLocations)for(let bq of locData.seenLocations[loc])allBqs.add(bq);
if(allBqs.size!==1)return{match:false};
}else if(bqCountFilter==="D"){
for(let loc in locData.seenLocations){
for(let bq of locData.seenLocations[loc])if(bq<BQ_D_MIN)return{match:false};
}
}else if(bqCountFilter==="Dp"){
let found=false;
for(let loc in locData.seenLocations){
let all=true;
for(let bq of locData.seenLocations[loc])if(bq<BQ_D_MIN){all=false;break;}
if(all){found=true;break;}
}
if(!found)return{match:false};
}else if(bqCountFilter==="1p"){
let found=false;
for(let loc in locData.seenLocations){
if(locData.seenLocations[loc].size===1){found=true;break;}
}
if(!found)return{match:false};
}
return{match:true};
}
function checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc){
resetLocationCache();
if(!checkBasicConds(engine,conds))return false;
if(!checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey).match)return false;
return true;
}
function makeDBadge(dValue){
return dValue>0?` <span style="background:#fa0;color:#000;padding:1px 4px;border-radius:3px;font-size:10px;">${dValue}</span>`:'';
}
function getElistMonsterBadge(envType,floorMR,targetCount,onlyMonNameStr){
let result={badge:'',isCombinedHit:false};
let spawnDb=getSpawnList(envType,floorMR);
if(!spawnDb.length)return result;
let survivingNames=[];
let isJP=(DISPLAY_LANG!=='EN');
let limit=targetCount>0?targetCount:spawnDb.length;
for(let i=0;i<spawnDb.length;i++){
if(spawnDb[i].length>1){
let mData=MONSTER_DB[spawnDb[i][0]];
if(mData){
survivingNames.push(isJP?mData.jp:mData.en);
}
if(survivingNames.length===limit)break;
}
}
result.isCombinedHit=matchesOnlyMonFloor(envType,floorMR,onlyMonNameStr);
if(targetCount>0&&survivingNames.length>0)result.badge=`<br><span style="display:inline-block;color:#aaa;font-size:11px;">${survivingNames.join(' + ')}</span>`;
return result;
}
function evalElistFloorHit(searchEngine,f,info,elistCond){
let targetCount=0;
let isElistHit=false;
if(info.state.includes(EL_4)){targetCount=4;if(elistCond==='4')isElistHit=true;}
else if(info.state.includes(EL_3)){targetCount=3;if(elistCond==='3')isElistHit=true;}
else if(info.state.includes(EL_2)){targetCount=2;if(elistCond==='2')isElistHit=true;}
if(!isElistHit&&elistCond){
if(elistCond==='PARTIAL_NONE'&&info.state.includes(EL_P))isElistHit=true;
else if(elistCond==='ONLY'&&(info.state.includes('only')||info.state.includes('オンリー')))isElistHit=true;
else if(elistCond==='NONE'&&info.state.includes(EL_0)&&!info.state.includes(EL_P))isElistHit=true;
else if(elistCond==='SIZE_15'&&searchEngine.di[f][2]===15)isElistHit=true;
}
return{targetCount,isElistHit};
}
function checkElistAndD(searchEngine,conds,searchOnlyWithD,_onlyMonExpectedStr){
let result={match:true,specialHitDetails:[],jumpToFloor:-1,hasMatchedD:false};
if(!(conds.elist||conds.onlyMon||searchOnlyWithD))return result;
const isCombinedSearch=isCombinedElistMonsterSearch(conds);
let hasAnyD=false;
let elistMatched=!conds.elist;
let onlyMatched=!conds.onlyMon;
if(isCombinedSearch){
elistMatched=false;
onlyMatched=false;
}
let specialFloorCount=0;
const currentMapSpecials=[];
const envType=searchEngine._details[3];
const baseMR=searchEngine._details[2];
for(let f=0;f<searchEngine.floorCount;f++){
let info=getFloorElistInfo(searchEngine,f);
if(!info.state)continue;
if(info.dValue>0)hasAnyD=true;
const floorHit=evalElistFloorHit(searchEngine,f,info,conds.elist);
let targetCount=floorHit.targetCount;
let isElistHit=floorHit.isElistHit;
let monBadge='';
let isCombinedMatchedThisFloor=false;
let needSpawnDb=(targetCount>0&&(conds.elist===targetCount.toString()||(conds.elist==='SIZE_15'&&isElistHit)))||(isCombinedSearch&&isElistHit);
if(needSpawnDb){
let floorMR=floorMRAt(baseMR,f);
let badgeData=getElistMonsterBadge(envType,floorMR,targetCount,isCombinedSearch?conds.onlyMon:null);
monBadge=badgeData.badge;
isCombinedMatchedThisFloor=badgeData.isCombinedHit;
}
specialFloorCount++;
let displayText=`B${f+1}F: ${info.state}${makeDBadge(info.dValue)}${monBadge}`;
currentMapSpecials.push({f,dValue:info.dValue,text:displayText});
if(isCombinedSearch){
if(isCombinedMatchedThisFloor){
if(info.dValue>0)result.hasMatchedD=true;
if(!elistMatched){
elistMatched=true;
onlyMatched=true;
result.specialHitDetails.push(displayText);
if(result.jumpToFloor===-1)result.jumpToFloor=f;
}
}
}else{
if(conds.elist&&conds.elist!=='MULTI_SPECIAL'&&isElistHit){
if(info.dValue>0)result.hasMatchedD=true;
if(!elistMatched){
elistMatched=true;
result.specialHitDetails.push(displayText);
if(result.jumpToFloor===-1)result.jumpToFloor=f;
}
}
if(conds.onlyMon&&info.state.includes(_onlyMonExpectedStr)){
if(info.dValue>0)result.hasMatchedD=true;
if(!onlyMatched){
onlyMatched=true;
if(!result.specialHitDetails.includes(displayText))result.specialHitDetails.push(displayText);
if(result.jumpToFloor===-1)result.jumpToFloor=f;
}
}
}
}
if(conds.elist==='MULTI_SPECIAL'){
if(specialFloorCount>=2){
elistMatched=true;
currentMapSpecials.forEach(s=>{
if(!result.specialHitDetails.includes(s.text))result.specialHitDetails.push(s.text);
if(s.dValue>0)result.hasMatchedD=true;
});
if(result.jumpToFloor===-1&&currentMapSpecials.length>0)result.jumpToFloor=currentMapSpecials[0].f;
}else{elistMatched=false;}
}
if(searchOnlyWithD&&!hasAnyD)result.match=false;
if(!elistMatched||!onlyMatched)result.match=false;
if(searchOnlyWithD&&result.match){
if((conds.elist||conds.onlyMon)&&conds.elist!=='MULTI_SPECIAL'){
if(!result.hasMatchedD)result.match=false;
}
}
return result;
}
const _ANOM_RULE={
chest:s=>[s.first.chest!==-1,s.first.chest],
nochest:s=>[s.first.nochest!==-1,s.first.nochest],
chamber:s=>[s.first.chamber!==-1,s.first.chamber],
stair:s=>[s.first.stair!==-1,s.first.stair],
ghost:s=>[s.first.ghost!==-1,s.first.ghost],
all_invalid:s=>[s.first.allInvalid!==-1,s.first.allInvalid],
multi_region:s=>[s.first.multiRegion!==-1,s.first.multiRegion],
multi_chamber:s=>[s.chamberFloors>=2,s.first.chamber],
chest_chamber:s=>[s.combo,s.first.chest!==-1?s.first.chest:s.first.chamber]
};
function anomRule(key){
switch(key){
case'chest':return _ANOM_RULE.chest;
case'nochest':return _ANOM_RULE.nochest;
case'chamber':return _ANOM_RULE.chamber;
case'stair':return _ANOM_RULE.stair;
case'ghost':return _ANOM_RULE.ghost;
case'all_invalid':return _ANOM_RULE.all_invalid;
case'multi_region':return _ANOM_RULE.multi_region;
case'multi_chamber':return _ANOM_RULE.multi_chamber;
case'chest_chamber':return _ANOM_RULE.chest_chamber;
}
return null;
}
function checkAnomalies(searchEngine,conds){
let result={match:true,anomalyDetails:[],jumpToFloor:-1};
if(conds.anomaly==="")return result;
const first={chest:-1,nochest:-1,chamber:-1,stair:-1,ghost:-1,allInvalid:-1,multiRegion:-1};
const mark=(k,f)=>{if(first[k]===-1)first[k]=f;};
let combo=false,chamberFloors=0;
for(let f=0;f<searchEngine.floorCount;f++){
if(conds.anomaly==='all_invalid'){
if(searchEngine.isStairOverflow[f]){
result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#c00;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_2}</span>`);
mark('allInvalid',f);
}
continue;
}
if(conds.anomaly==='ghost'){
const gs=[];
scanGhostStairs(searchEngine.di[f],gs);
if(gs.length>0){
result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#557;padding:1px 4px;border-radius:3px;border:1px solid #88a;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_1}: ${gs.join(', ')}</span>`);
mark('ghost',f);
}
continue;
}
const needsIso=conds.anomaly==='chamber'||conds.anomaly==='multi_chamber'||conds.anomaly==='multi_region'||conds.anomaly==='chest_chamber';
let anom=getFloorAnomalies(searchEngine,f,false,!needsIso);
if(anom.hasInaccessibleStair){
result.anomalyDetails.push(`<span style="color:#ff0000;font-size:11px;font-weight:bold;background:#550000;padding:1px 4px;border-radius:3px;">B${f+1}F ${TKB3_0}</span>`);
mark('stair',f);
}
if(anom.hasInaccessibleChest){
if(anom.totalChests===1){
result.anomalyDetails.push(`<span style="color:#0ff;font-size:11px;font-weight:bold;background:#004466;padding:1px 4px;border-radius:3px;border:1px solid #08a;">B${f+1}F ${TKB1_3}</span>`);
mark('nochest',f);
}else{
result.anomalyDetails.push(`<span style="color:#ff69b4;font-size:11px;font-weight:bold;">B${f+1}F ${TKB1_1}</span>`);
}
mark('chest',f);
}
if(anom.hasChamber){
chamberFloors++;
if(anom.isolatedRegions.length>=2)mark('multiRegion',f);
let countBadges=anom.isolatedRegions.map(size=>`<span style="background:#ff6ec7;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;margin-left:4px;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${size}</span>`).join('');
result.anomalyDetails.push(`<span style="color:#fa0;font-size:11px;">B${f+1}F ${TKB2_1} ${countBadges}</span>`);
mark('chamber',f);
}
if(anom.hasInaccessibleChest&&anom.hasChamber)combo=true;
}
const rule=anomRule(conds.anomaly);
if(rule){
const[ok,jump]=rule({first,chamberFloors,combo});
if(ok)result.jumpToFloor=jump;
else result.match=false;
}
return result;
}
function rankCanDropInMRRange(r,numMin,numMax){
for(let num=numMin;num<=numMax;num++){
const cMin=TableF[(num-1)*4+1];
const cMax=TableF[(num-1)*4+2];
if(r>=cMin&&r<=cMax)return true;
}
return false;
}
function getRankSMRInfo(rank,conds){
let rStr=hex2(rank);
if(conds&&hasConditionValue(conds.bq)){
const bounds=getFinalQualityBounds(conds.bq);
if(!bounds)return null;
const{minFinalQ,maxFinalQ}=bounds;
const rankInfo=RANKS[rStr];
if(rankInfo&&(maxFinalQ<rankInfo.fqMin||minFinalQ>rankInfo.fqMax))return null;
}
const[minSMR,maxSMR]=row4(TableC,8,rank,[1,9]);
if(conds?.monster){
let targetSMR=parseInt(conds.monster);
if(targetSMR<minSMR||targetSMR>maxSMR)return null;
}
const[floorLo,floorHi]=row4(TableB,9,rank,[2,16]);
let maxFloorCount=floorHi;
if(conds?.depth){
let d=parseInt(conds.depth);
if(d<floorLo||d>floorHi)return null;
maxFloorCount=d;
}
if(conds?.depth2){
let d2=parseInt(conds.depth2);
if(d2>floorHi)return null;
}
const[minBoss,maxBoss]=row4(TableD,9,rank,[1,12]);
if(conds?.boss){
let b=parseInt(conds.boss);
if(b<minBoss||b>maxBoss)return null;
}
if(conds?.lv){
const clampLv=v=>v<1?1:v>99?99:v;
let dLo=conds.depth?parseInt(conds.depth):floorLo;
let dHi=conds.depth?parseInt(conds.depth):floorHi;
let sLo=conds.monster?parseInt(conds.monster):minSMR;
let sHi=conds.monster?parseInt(conds.monster):maxSMR;
let bLo=conds.boss?parseInt(conds.boss):minBoss;
let bHi=conds.boss?parseInt(conds.boss):maxBoss;
let lvLo=clampLv((bLo+dLo+sLo-4)*3-5);
let lvHi=clampLv((bHi+dHi+sHi-4)*3+5);
let L=parseInt(conds.lv);
if(L<lvLo||L>lvHi)return null;
}
return{minSMR,maxSMR,maxFloorCount,minBoss,maxBoss};
}
function sharedRankFilter(ranksToSearch,conds,isBugSearch=false){
if(!getLocationBQFilters(conds).valid)return[];
if(conds.bqCount)ranksToSearch=ranksToSearch.filter(rank=>isBqCountRankPossible(rank,conds.bqCount));
if(!conds.onlyMon&&!conds.monster&&!hasConditionValue(conds.bq)&&!conds.hasBoxCond&&!conds.prefix&&!conds.suffix&&!conds.lv&&!conds.depth&&!conds.depth2&&!conds.boss){
return ranksToSearch;
}
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
const{minSMR,maxSMR,maxFloorCount,minBoss,maxBoss}=info;
if(conds.prefix){
const p=parseInt(conds.prefix);
let ok=false;
for(let smr=minSMR;smr<=maxSMR&&!ok;smr++){
const[pLo,pHi]=row4(TableH,5,smr,NO_ROW);
if(p>=pLo&&p<=pHi)ok=true;
}
if(!ok)return false;
}
if(conds.suffix){
const sf=parseInt(conds.suffix);
let ok=false;
for(let b=minBoss;b<=maxBoss&&!ok;b++){
const[sLo,sHi]=row4(TableI,4,b,NO_ROW);
if(sf>=sLo&&sf<=sHi)ok=true;
}
if(!ok)return false;
}
let maxOffset=isBugSearch?3:Math.floor((maxFloorCount-1)/4);
if(conds.hasBoxCond){
let maxPossibleNum=Math.min(12,maxSMR+maxOffset);
for(let r=10;r>=1;r--)if(conds.reqBox[r]>0&&!rankCanDropInMRRange(r,minSMR,maxPossibleNum))return false;
}
if(conds.onlyMon){
let targetEnv=conds.env?parseInt(conds.env):0;
let isPossible=false;
for(let env=1;env<=5;env++){
if(targetEnv&&env!==targetEnv)continue;
for(let fMR=1;fMR<=12;fMR++){
if(matchesOnlyMonFloor(env,fMR,conds.onlyMon)){
let smrStart=conds.monster?parseInt(conds.monster):minSMR;
let smrEnd=conds.monster?parseInt(conds.monster):maxSMR;
for(let smr=smrStart;smr<=smrEnd;smr++){
if(fMR>=smr&&fMR<=smr+maxOffset){
isPossible=true;
break;
}
}
}
if(isPossible)break;
}
if(isPossible)break;
}
if(!isPossible)return false;
}
return true;
});
}
function getDispItem(enName){let trans=i18nDict['I_'+enName];return trans?String(trans).split('(')[0]:enName;}
const ITEMS_MILLIONAIRE=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
const ITEMS_MILLIONAIRE_BOX3=ITEMS_MILLIONAIRE.slice(0,7);
const ITEMS_S_WEAPONS=["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
function getChestRanksForItems(itemNames){
const ranks=[];
for(let r=1;r<=10;r++){
let startIdx=TableO[r-1],endIdx=TableO[r];
for(let i=startIdx;i<endIdx;i++){
if(itemNames.includes(TableR[TableQ[i]][0])&&!ranks.includes(r))ranks.push(r);
}
}
return ranks;
}
function filterMapRanksBySMRAndChest(ranksToSearch,conds,chestRankGroups,targetFloorOffset){
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
const{minSMR,maxSMR,maxFloorCount}=info;
if(!chestRankGroups||chestRankGroups.length===0)return true;
let minOffset=0;
let maxOffset=Math.floor((maxFloorCount-1)/4);
if(targetFloorOffset!=null){
let requiredFloors=(targetFloorOffset*4)+1;
if(maxFloorCount<requiredFloors)return false;
minOffset=targetFloorOffset;
maxOffset=targetFloorOffset;
}
let minPossibleNum=minSMR+minOffset;
let maxPossibleNum=Math.min(12,maxSMR+maxOffset);
return chestRankGroups.every(group=>
group.some(r=>rankCanDropInMRRange(r,minPossibleNum,maxPossibleNum))
);
});
}
function calcDeftness(at){
const raw=Math.ceil(at/32768*100-2)*20;
if(raw<=0)return 0;
if(raw>999)return 1000;
return raw;
}
function formatDeftness(at){
const deft=calcDeftness(at);
const color=deft>=1000?'#f44':deft<=1?'#888':'#39C5BB';
const label=deft>=1000?'1000':(deft<=0?'1':deft.toString());
return{deft,color,label};
}
function siFormatAT(val){
if(val<-2)return'⊖';
if(val>970)return'⊕';
return val;
}
const atPopIndex=n=>35+29*n;
function advanceATRng(seed,steps){
let rng=seed>>>0;
for(let i=0;i<steps;i++)rng=lcg(rng);
return rng;
}
function getATPair(seed,N){
let s=advanceATRng(seed,N);
const atN=(s>>>16)&0x7FFF;
s=lcg(s);
const atN1=(s>>>16)&0x7FFF;
return{atN,atN1};
}
function battleATContext(N,mapDeft,userDeft){
const canRound2=userDeft>=mapDeft,startCost=canRound2?3:4;
const first=N+startCost;
return{N,mapDeft,userDeft,canRound2,startCost,firstUnused:[first,first+1,first+2]};
}
function battleATBudgets(context,target){
return{d1:target-context.firstUnused[0],d2:target-context.firstUnused[1],d4:target-context.firstUnused[2]};
}
const battleATForCount=(budget,count)=>count===1?budget.d1:count<=3?budget.d2:budget.d4;
function dropATThreshold(inverseRate){
return inverseRate>0?Math.floor(32768/inverseRate):-1;
}
function thiefATThreshold(inverseRate,level){
if(!(inverseRate>0)||!(level>0))return-1;
return Math.floor(32767/Math.floor(inverseRate*100/level))+1;
}
function passesATThreshold(at,threshold){
return at<=threshold;
}
function evaluateATPtn(pType,validCount,hb){
const lengths=[];
for(const row of AT_PATTERN_TABLES[pType]||[])
if(validCount>=row.length&&row.accept[hb&row.mask])lengths.push(row.length);
return{matched:lengths.length>0,extractLen:lengths[0]||0,lengths};
}
function formatATPtnHTML(extractLen,step,valsBuffer,hb){
let formattedVals=[];
for(let i=extractLen-1;i>=0;i--){
let sv=step-i;
let v=valsBuffer[sv%10];
let m=(hb&(1<<i))!==0;
if(m)formattedVals.push(`<strong style="color:#f44;">${v}</strong>`);
else formattedVals.push(`<span style="color:#666;">${v}</span>`);
}
return formattedVals.join(', ');
}
function scanSeedForAtPattern(seed,maxSteps,threshold,pType,minStart,popIndex){
const valsBuffer=new Int32Array(10);
let rng=seed,historyBits=0,validCount=0;
const foundByStart=new Map();
let popValue=null,defValue=null;
const noLowerBound=(maxSteps<=50);
const effMinStart=noLowerBound?1:minStart;
for(let step=1;step<=maxSteps;step++){
rng=lcg(rng);
const val=(rng>>>16)&0x7FFF;
if(popIndex>0){
if(step===popIndex)popValue=val;
if(step===popIndex+1)defValue=val;
}
if(!noLowerBound&&step<38)continue;
historyBits=((historyBits<<1)|(passesATThreshold(val,threshold)?1:0))&1023;
valsBuffer[step%10]=val;
validCount++;
const{lengths}=evaluateATPtn(pType,validCount,historyBits);
for(const extractLen of lengths){
const startStep=step-extractLen+1;
if(startStep>=effMinStart&&!foundByStart.has(startStep)){
foundByStart.set(startStep,{start:startStep,valsHtml:formatATPtnHTML(extractLen,step,valsBuffer,historyBits)});
}
}
}
const foundOffsets=[...foundByStart.values()].sort((a,b)=>a.start-b.start);
return{foundOffsets,popValue,defValue};
}
function LocaHtmlFromData(locData,conds){
if(!locData||locData.outputOrder.length===0)return"";
const filters=getLocationBQFilters(conds);
if(!filters.valid)return"";
const matchedLocs=[];
for(const locObj of locData.outputOrder){
const locNum=locObj.location;
if(matchesLocationBQ(locData,locNum,filters.location,filters.baseQ)){
matchedLocs.push(hex2(locNum));
}
}
return matchedLocs.length>0
?`<span style="margin-left:4px;color:#ccc;font-size:10px;background:#222;padding:1px 4px;border-radius:3px;">${matchedLocs.join(' / ')}</span>`:"";
}
function getLocHtmlCached(seed,targetRankKey,conds){
const locData=getLocDataCached(seed,targetRankKey);
return locData?LocaHtmlFromData(locData,conds):"";
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
html:`<span style="color:#fc0;font-size:11px;background:#420;padding:2px 4px;border-radius:3px;">${boxStr.join(' ')}</span>`
};
}
const fmtStep=v=>Number.isInteger(v)?''+v:v.toFixed(1);
const fmtStepD=v=>v==null?'—':fmtStep(v);
const minAstar=arr=>{const m=Math.min(...arr.map(v=>v==null?Infinity:v));return m===Infinity?null:m;};
function buildSearchDetailHtml(specialHitDetails,anomalyDetails){
return{
specialHtml:specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(s=>`<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>`:'',
anomalyHtml:anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html=>html.replace('<span style="','<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'',
};
}
function buildAtOffsetsHtml(foundOffsets){
return foundOffsets.map(o=>`<span style="color:#0ff;font-size:12px;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`).join('<br>');
}
function buildBattleAtDiffsHtml(foundOffsets,N,deft,userDeft=999){
const context=battleATContext(N,deft,userDeft);
const lines=foundOffsets.map(o=>{
const{d1,d2,d4}=battleATBudgets(context,o.start);
return`<span class="at-dynamic-battle" data-target="${o.start}" data-n="${N}" data-req="${deft}" style="font-size:11px;text-shadow:0 0 2px rgba(255,170,0,0.5);">${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}</span>`;
}).join(`<br><span style="color:transparent;font-size:11px;">${BATTLE_LABEL} </span>`);
return`<span style="color:#fa0;margin-left:12px;font-size:11px;">${BATTLE_LABEL} ${lines}</span>`;
}
function buildAtInfoCardHtml(seed,N,atN,atN1,diffsHtml){
const{deft,color:deftColor,label:deftLabel}=formatDeftness(atN1);
return`<div class="at-m-card" data-seed="${seed}" style="margin-top:4px;padding:5px 8px;background:#0a1a1a;border:1px solid #055;border-radius:3px;">
    <span style="color:#4c4;font-size:11px;"><span class="at-m-atn-label">AT[${N}]: </span><span class="at-m-atval">${atN}</span></span>
    <strong class="at-dynamic-mon" data-at="${atN}" style="color:#f8f;margin-left:8px;font-size:11px;text-shadow:0 0 2px rgba(255,136,255,0.5);"></strong>
    <br><span class="at-m-deft" style="color:${deftColor};display:inline-block;margin-top:4px;font-size:11px;">${G18} ${deftLabel}</span>
    ${diffsHtml}</div>`;
}
function buildAtPatternBoxHtml(patternName,probText,offsetsHtml){
return`<div style="margin-top:4px;padding:4px 8px;background:#111;border:1px solid #333;border-radius:4px;">
  <span style="color:#fa0;font-size:11px;font-weight:bold;">${patternName} (${probText})</span><br>${offsetsHtml}</div>`;
}
const SI_PATTERN_INDICES={
'R2':[[1,2]],
'R2_3':[[1,4]],
'R2_5':[[1,6]],
'R2_7':[[1,8]],
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
const isNormalDropPattern=key=>key.startsWith('N')||key==='4_in_10'||key==='3_in_10';
function rollDropSlot(nextAT,rareThreshold,normalThreshold){
const rareVal=nextAT(),rareHit=passesATThreshold(rareVal,rareThreshold);
const normalVal=rareHit?null:nextAT();
return{rareVal,rareHit,normalVal,normalHit:normalVal!==null&&passesATThreshold(normalVal,normalThreshold)};
}
function forEachDropSlot(gSize,tLevels,visit){
for(let bk=0;bk<=4;bk++){
if(bk&&!(tLevels[bk-1]>0))continue;
for(let m=0;m<gSize;m++)visit(m,bk);
}
}
function buildDropSlots(gSize,rRarity,nRarity,tLevels){
const rate=(rates,i)=>Array.isArray(rates)?(rates[i]!==undefined?rates[i]:rates[0]):rates;
const slots=[];
forEachDropSlot(gSize,tLevels,(m,bk)=>{
slots.push({gIdx:m,bk,
rareThreshold:bk?thiefATThreshold(rate(rRarity,m),tLevels[bk-1]):dropATThreshold(rate(rRarity,m)),
normalThreshold:bk?thiefATThreshold(rate(nRarity,m),tLevels[bk-1]):dropATThreshold(rate(nRarity,m))});
});
return slots;
}
function simulateDropSlots(startRng,slots,recordSeq){
let rng=startRng>>>0,rngCount=0;
const seq=[],rareHits=[],normHits=[];
const nextAT=()=>{rng=lcg(rng);rngCount++;return(rng>>>16)&0x7FFF;};
for(const slot of slots){
const first=rngCount+1,{gIdx,bk}=slot;
const draw=rollDropSlot(nextAT,slot.rareThreshold,slot.normalThreshold);
if(draw.rareHit)rareHits.push(first);
if(draw.normalHit)normHits.push(first+1);
if(recordSeq){
const row=(isR,val,red)=>({val,red,...(bk?{steal:true}:{}),gIdx,isR,bk,
type:bk?`Book${bk} Group${gIdx+1} (${isR?'R':'N'})`:`Group${gIdx+1} Drop (${isR?'R':'N'})`});
seq.push(row(true,draw.rareVal,draw.rareHit));
if(draw.normalVal!==null)seq.push(row(false,draw.normalVal,draw.normalHit));
}
}
return{successRare:rareHits.length,successNorm:normHits.length,seq,rareHits,normHits};
}
function compileATPattern(patterns,normal){
return[...new Set(patterns.map(p=>p[p.length-1]))].sort((a,b)=>a-b).map(length=>{
const candidates=patterns.filter(p=>p[p.length-1]===length),accept=new Uint8Array(1<<length);
for(let bits=0;bits<accept.length;bits++){
let at=0;const hits=[];
const nextAT=()=>{const pos=at++;return pos<length&&(bits&(1<<(length-1-pos)))?0:1;};
while(at<length){
const first=at+1,draw=rollDropSlot(nextAT,0,0);
if(normal?draw.normalHit:draw.rareHit)hits.push(first+(normal?1:0));
}
accept[bits]=siMatchesPattern(hits,candidates)?1:0;
}
return{length,mask:(1<<length)-1,accept};
});
}
const AT_PATTERN_TABLES=Object.fromEntries(Object.entries(SI_PATTERN_INDICES)
.map(([key,patterns])=>[AT_PAT[key],compileATPattern(patterns,isNormalDropPattern(key))]));
function scanDropPatternStarts(seed,key,slots,firstStart,lastStart,limit=Infinity){
const patterns=SI_PATTERN_INDICES[key];
if(!patterns||firstStart>lastStart||limit<1)return[];
const normal=isNormalDropPattern(key),out=[];
let rng=advanceATRng(seed,firstStart-1);
for(let start=firstStart;start<=lastStart;start++){
const sim=simulateDropSlots(rng,slots,false);
if(siMatchesPattern(normal?sim.normHits:sim.rareHits,patterns)){
out.push({start,rng,simulation:simulateDropSlots(rng,slots,true)});
if(out.length>=limit)break;
}
rng=lcg(rng);
}
return out;
}
function siRunBattleSim(startRng,gSize,rRarity,nRarity,tLevels,recordSeq){
return simulateDropSlots(startRng,buildDropSlots(gSize,rRarity,nRarity,tLevels),recordSeq);
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
function initItemI18n(){
TableR.forEach(pair=>{i18nDict['I_'+pair[0]]=T(pair[0],pair[1],pair[1]);});
Object.assign(i18nDict,{
"I_Millionaire":T("Millionaire","大富豪","大富豪"),
"I_S weapon":T("S weapon","S武器","S武器")
});
}
const SEED_SETUP={
ultimate:(engine,job)=>{
engine.trackOverflow=(job.conds.anomaly==='all_invalid'||job.conds.anomaly==='ghost');
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
},
item:null,
multibug:(engine,job)=>{
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
},
fastest:(engine,job)=>{
engine.trackOverflow=(job.conds.anomaly==='all_invalid'||job.conds.anomaly==='ghost');
engine._force_16_floors=(job.params.fastestMode==='maxtile');
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
}
};
const meetsQuickloadBasicReq=(eng,p,conds)=>eng.floorCount>=(p.isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isB9F?2:0).length>0;
const ITEM_BASIC_REQS={
free:(eng,p,conds)=>eng.floorCount>=p.reqFloorCount,
quickload:meetsQuickloadBasicReq,
quickload9:meetsQuickloadBasicReq,
quickload9all:(eng,p,conds)=>eng.floorCount>=2&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],null).length>0,
third:(eng,p,conds)=>eng.floorCount>=(p.isS3?14:4)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isS3?3:0).length>0,
jfire:(eng,p,conds)=>eng.monsterRank===9&&eng.floorCount>=9,
tk:(eng,p,conds)=>eng.floorCount>=3,
};
const getQuickloadMark=(p)=>{
const sec=(p.qlSec==null)?4:p.qlSec;
return{sec,mk:sec===0?'⑤':'⑨',mkColor:sec===0?'#7fd4ff':'#b19cd9'};
};
const buildQuickloadResult=(eng,p,st)=>{
if(st.useB10)return st.multi.length>0?{isHit:true,multi:st.multi}:{isHit:false};
if(st.hitTypes.length===0)return{isHit:false};
const res={isHit:true,jumpFloor:st.firstHitFloor,displayHtml:st.hitTypes.join('<br>')};
if(st.astarBoxes){
res.astar=calcSameFloorChestChainCost(eng,st.astarFloor,st.astarBoxes);
if(st.astarBoxes.length>p.reqCount)res.astarX3=true;
}
return res;
};
function getWpChestCases(uniSec,wpPartyIdx,wpSoloIdx){
if(uniSec!=null)return wpPartyIdx.length?[wpPartyIdx]:(wpSoloIdx.length?[wpSoloIdx]:[]);
const same=wpPartyIdx.length===wpSoloIdx.length&&wpPartyIdx.every((v,i)=>v===wpSoloIdx[i]);
if(same)return wpPartyIdx.length?[wpPartyIdx]:[];
const cs=[];
if(wpPartyIdx.length)cs.push(wpPartyIdx);
if(wpSoloIdx.length)cs.push(wpSoloIdx);
return cs;
}
function checkTKThirdChest(eng,floor,checkSec,laterSec,targets,laterTargets){
let valid=false,item="",rank="";
if(eng.floorCount>floor&&eng.getBoxCount(floor)>=3){
item=eng.getBoxItem(floor,2,checkSec)[0];
rank=CHEST_RANK[eng.getBoxInfo(floor,2).rank]||'?';
if(targets.includes(item)){
const laterItem=eng.getBoxItem(floor,2,laterSec)[0];
if(!laterTargets.includes(laterItem))valid=true;
}
}
return{valid,item,rank};
}
const DUNGEON_CHECKERS={
free:(eng,p)=>{
let groupHits=[];
let usedHits=new Set();
for(let g of p.groups){
let hitFoundForGroup=false;
let gHtmlStr="";
let f=g.floor-1;
if(f>=eng.floorCount)return{isHit:false};
let bCount=eng.getBoxCount(f);
boxLoop:
for(let b=0;b<bCount;b++){
if(g.boxIdx===0&&b!==0)continue;
if(g.boxIdx===1&&b!==1)continue;
if(g.boxIdx===2&&b!==2)continue;
if(g.boxIdx===3&&(b===2||b>=3))continue;
let boxInfo=eng.getBoxInfo(f,b);
if(g.rank>0&&boxInfo.rank!==g.rank)continue;
if(!g.items&&g.timerVal===-1){
let boxKey=`${f}_${b}_ANY`;
let isBoxUsed=false;
for(let k of usedHits){
if(k.startsWith(`${f}_${b}_`)){isBoxUsed=true;break;}
}
if(isBoxUsed)continue;
hitFoundForGroup=true;
usedHits.add(boxKey);
gHtmlStr=`<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[boxInfo.rank]}${b+1} (Any)</span>`;
break boxLoop;
}
let checkSecStart=g.timerVal===-1?0:g.timerVal-5;
let checkSecEnd=g.timerVal===-1?255:g.timerVal-5;
if(checkSecStart<0)checkSecStart=0;
if(checkSecEnd<0)checkSecEnd=0;
for(let s=checkSecStart;s<=checkSecEnd;s++){
let hitKey=`${f}_${b}_${s}`;
let boxKey=`${f}_${b}_ANY`;
if(usedHits.has(hitKey)||usedHits.has(boxKey))continue;
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
return{isHit:true,jumpFloor:p.groups[0].floor-1,displayHtml:groupHits.join('<br>'),specialStyle:"1px solid #08c"};
},
quickload:(eng,p)=>{
const checkSet=new Set(p.checkItems);
let hitTypes=[];
let firstHitFloor=-1;
let astarBoxes=null,astarFloor=-1;
const useB10=!!(p.checkB10&&p.isB9F);
const floors=useB10?[8,9]:p.targetFloors;
const multi=[];
for(let f of floors){
if(f>=eng.floorCount)continue;
const soloNames=eng.getFloorItemNames(f,1);
const partyNames=eng.getFloorItemNames(f,2);
let soloC=0,partyC=0;
const soloIdx=[],partyIdx=[];
for(let b=0;b<soloNames.length;b++){
if(checkSet.has(soloNames[b])){soloC++;soloIdx.push(b);}
if(checkSet.has(partyNames[b])){partyC++;partyIdx.push(b);}
}
if(soloC>=p.reqCount||partyC>=p.reqCount){
if(firstHitFloor===-1){
firstHitFloor=f;
if(p.wantAstar){astarFloor=f;astarBoxes=soloC>=p.reqCount?soloIdx:partyIdx;}
}
}
let prefixStr=(p.isB9F&&!useB10)?'B9F ':`B${f+1}F `;
const fHits=[];
if(soloC>=p.reqCount)fHits.push(`<span style="color:#f9b;font-size:11px">${prefixStr}${STR_SOLO} x${soloC}</span>`);
if(partyC>=p.reqCount)fHits.push(`<span style="color:#ffd700;font-size:11px">${prefixStr}${STR_PARTY} x${partyC}</span>`);
hitTypes.push(...fHits);
if(useB10&&fHits.length>0){
const boxes=soloC>=p.reqCount?soloIdx:partyIdx;
multi.push({floor:f,displayHtml:fHits.join('<br>'),astar:calcSameFloorChestChainCost(eng,f,boxes),isB10:f===9,isX3:boxes.length>p.reqCount});
}
}
return buildQuickloadResult(eng,p,{useB10,multi,hitTypes,firstHitFloor,astarFloor,astarBoxes});
},
quickload9:(eng,p)=>{
const{sec,mk,mkColor}=getQuickloadMark(p);
const checkSet=new Set(p.checkItems);
let hitTypes=[];
let firstHitFloor=-1;
let astarBoxes=null,astarFloor=-1;
const useB10=!!(p.checkB10&&p.isB9F);
const floors=useB10?[8,9]:p.targetFloors;
const multi=[];
for(let f of floors){
if(f>=eng.floorCount)continue;
const names=eng.getFloorItemNames(f,sec);
let cnt=0;
const hitIdx=[];
for(let b=0;b<names.length;b++){
if(checkSet.has(names[b])){cnt++;hitIdx.push(b);}
}
if(cnt>=p.reqCount){
if(firstHitFloor===-1){
firstHitFloor=f;
if(p.wantAstar){astarFloor=f;astarBoxes=hitIdx;}
}
}
let prefixStr=(p.isB9F&&!useB10)?'B9F ':`B${f+1}F `;
if(cnt>=p.reqCount){
const line=`<span style="color:${mkColor};font-size:11px">${prefixStr}${mk} x${cnt}</span>`;
hitTypes.push(line);
if(useB10)multi.push({floor:f,displayHtml:line,astar:calcSameFloorChestChainCost(eng,f,hitIdx),isB10:f===9,isX3:hitIdx.length>p.reqCount});
}
}
return buildQuickloadResult(eng,p,{useB10,multi,hitTypes,firstHitFloor,astarFloor,astarBoxes});
},
quickload9all:(eng,p)=>{
const{sec,mk,mkColor}=getQuickloadMark(p);
const checkSet=new Set(p.checkItems);
const anchorSet=new Set(p.anchorFloors||[]);
let anchorHit=false;
let hitFloors=[];
for(let f=0;f<eng.floorCount;f++){
const names=eng.getFloorItemNames(f,sec);
let cnt=0;
for(let b=0;b<names.length;b++){if(checkSet.has(names[b]))cnt++;}
const isAnchor=anchorSet.has(f);
const thr=isAnchor?p.anchorThreshold:p.otherThreshold;
if(cnt>=thr){
hitFloors.push({f,cnt});
if(isAnchor)anchorHit=true;
}
}
const needAnchor=anchorSet.size>0;
const oneOK=!p.needOneWith||hitFloors.some(h=>h.cnt>=p.needOneWith);
if(hitFloors.length>=2&&(!needAnchor||anchorHit)&&oneOK){
const parts=hitFloors.map(h=>`<span style="color:${mkColor};font-size:11px">B${h.f+1}F ${mk} x${h.cnt}</span>`);
return{isHit:true,jumpFloor:hitFloors[0].f,displayHtml:parts.join('<br>')};
}
return{isHit:false};
},
third:(eng,p)=>{
let f1=p.targetFloors[0],f2=p.targetFloors[1];
if(eng.getBoxCount(f1)>=3&&eng.getBoxCount(f2)>=3){
if(p.isS3&&(eng.getBoxInfo(f1,2).rank!==10||eng.getBoxInfo(f2,2).rank!==10)){
return{isHit:false};
}
let p1=eng.getBoxItem(f1,2,2)[0];
let p2=eng.getBoxItem(f2,2,2)[0];
let r1=CHEST_RANK[eng.getBoxInfo(f1,2).rank]||'?';
let r2=CHEST_RANK[eng.getBoxInfo(f2,2).rank]||'?';
if(p.checkItems.includes(p1)&&p.checkItems.includes(p2)){
const res={
isHit:true,jumpFloor:f1,
displayHtml:`<span style="color:${p.colorStyle};font-size:11px">B${f1+1}F ${r1}3: ${getDispItem(p1)}<br>B${f2+1}F ${r2}3: ${getDispItem(p2)}</span>`
};
if(p.wantAstar){
const d1=eng.di[f1],d2=eng.di[f2];
const sumLegs=(...legs)=>legs.some(v=>v==null)?null:legs.reduce((a,b)=>a+b,0);
const prefix=calcWalkCostUpToFloor(eng,f1);
const forward=sumLegs(
prefix,
calcPointWalkCost(eng,f1,d1[4],d1[5],d1[17],d1[18]),
calcCrossFloorLegCost(eng,f1,d1[17],d1[18],f2,d2[17],d2[18])
);
const reverse=sumLegs(
prefix,
calcCrossFloorLegCost(eng,f1,d1[4],d1[5],f2,d2[17],d2[18]),
calcCrossFloorLegCost(eng,f2,d2[17],d2[18],f1,d1[17],d1[18])
);
const vals=[forward,reverse];
res.astar=minAstar(vals);
res.astarText=vals.map(fmtStepD).join(' / ');
res.astarTitle=''+T('Forward / Reverse full A* route','順走 / 逆走完整 A* 路線','順走 / 逆走の完全 A* ルート');
}
return res;
}
}
return{isHit:false};
},
jfire:(eng,p)=>{
const uniSec=(p.qlSec==null)?null:p.qlSec;
const shift=uniSec==null?0:uniSec-2;
const SOMA="Sainted soma",ELIXIR="Sage's elixir";
const scanWp=(wpFloor,thirdFloors,chooseShortest)=>{
if(wpFloor>=eng.floorCount)return null;
const wpBoxCount=eng.getBoxCount(wpFloor);
const soloNames=eng.getFloorItemNames(wpFloor,uniSec==null?1:uniSec);
const partyNames=uniSec==null?eng.getFloorItemNames(wpFloor,2):soloNames;
let wpMet=false;
const wpHits=[],wpSoloIdx=[],wpPartyIdx=[];
const limit=Math.min(2,soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b],pp=partyNames[b];
if(s===SOMA||pp===SOMA){
wpMet=true;
if(s===SOMA)wpSoloIdx.push(b);
if(pp===SOMA)wpPartyIdx.push(b);
let t=uniSec!=null?`${uniSec+5}s`:((s===pp)?STR_BOTH:(pp===SOMA?STR_PARTY:STR_SOLO));
let color="#f9d";
if(uniSec!=null)color=uniSec===0?'#7fd4ff':'#b19cd9';
else if(t===STR_PARTY)color="#ffd700";
wpHits.push(`<span style="color:${color};font-size:11px">B${wpFloor+1}F S${b+1}: ${getDispItem(SOMA)} (${t})</span>`);
}
}
if(!wpMet||(wpBoxCount>=3&&eng.getBoxItem(wpFloor,2,2+shift)[0]===SOMA))return null;
const targets=[];
for(const fIdx of thirdFloors){
if(fIdx>=eng.floorCount||eng.getBoxCount(fIdx)<3||eng.getBoxInfo(fIdx,2).rank!==10)continue;
const pItem=eng.getBoxItem(fIdx,2,2+shift)[0];
if(pItem!==SOMA&&pItem!==ELIXIR)continue;
const target={floor:fIdx,det:`B${fIdx+1}F S3: ${getDispItem(pItem)}`};
if(p.wantAstar){
const d3=eng.di[fIdx];
const tgt=[{g:fIdx,gx:d3[17],gy:d3[18]}];
const vals=getWpChestCases(uniSec,wpPartyIdx,wpSoloIdx).map(bx=>calcCrossFloorChestRouteCost(eng,wpFloor,bx,tgt));
target.astar=minAstar(vals);
if(vals.length===2)target.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
targets.push(target);
}
if(targets.length===0)return null;
let best=targets[0];
if(chooseShortest&&p.wantAstar){
for(let i=1;i<targets.length;i++){
const a=targets[i].astar==null?Infinity:targets[i].astar;
const b=best.astar==null?Infinity:best.astar;
if(a<b)best=targets[i];
}
}
const html=`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${best.det}</span>`;
const res={isHit:true,jumpFloor:wpFloor,displayHtml:html};
if(p.wantAstar){
res.astar=best.astar;
if(best.astarText!==undefined)res.astarText=best.astarText;
}
return res;
};
const main=scanWp(8,[8,9],false);
if(!p.wantAstar)return main||{isHit:false};
const extra=scanWp(9,[8,9,10],true);
const multi=[];
if(main)multi.push(Object.assign({floor:8,isJfireB10:false},main));
if(extra)multi.push(Object.assign({floor:9,isJfireB10:true},extra));
return multi.length>0?{isHit:true,multi}:{isHit:false};
},
tk:(eng,p)=>{
let wpSet=new Set(p.wpTargets);
let wpMet=false,wpFloor=2;
let wpHits=[];
let wpSoloIdx=[],wpPartyIdx=[];
const uniSec=(p.qlSec==null)?null:p.qlSec;
const shift=uniSec==null?0:uniSec-2;
let checkWp=(fIdx)=>{
if(fIdx>=eng.floorCount)return false;
const soloNames=eng.getFloorItemNames(fIdx,uniSec==null?1:uniSec);
const partyNames=uniSec==null?eng.getFloorItemNames(fIdx,2):soloNames;
let foundAny=false;
const limit=Math.min(2,soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b],pp=partyNames[b];
if(wpSet.has(s)||wpSet.has(pp)){
let t=uniSec!=null?`${uniSec+5}s`:((wpSet.has(s)&&wpSet.has(pp))?STR_BOTH:(wpSet.has(pp)?STR_PARTY:STR_SOLO));
let hitItem=wpSet.has(pp)?pp:s;
let hitItemStr=getDispItem(hitItem);
let rName=CHEST_RANK[eng.getBoxInfo(fIdx,b).rank]||'?';
let color="#f9b";
if(uniSec!=null)color=uniSec===0?'#7fd4ff':'#b19cd9';
else if(t===STR_PARTY)color="#ffd700";
wpHits.push(`<span style="color:${color};font-size:11px">B${fIdx+1}F ${rName}${b+1}: ${hitItemStr} (${t})</span>`);
wpMet=true;
wpFloor=fIdx;
if(wpSet.has(s))wpSoloIdx.push(b);
if(wpSet.has(pp))wpPartyIdx.push(b);
foundAny=true;
}
}
return foundAny;
};
if(p.isMonsterBox){
if(!checkWp(2))return{isHit:false};
let c1Met=false,matDet="",b3Rank="";
if(eng.floorCount>2&&eng.getBoxCount(2)>=3){
b3Rank=CHEST_RANK[eng.getBoxInfo(2,2).rank]||'?';
let foundSec=-1;
for(let s=p.minSec+shift;s<=p.maxSec+shift;s++){
if(eng.getBoxItem(2,2,s)[0]===p.targetItem){foundSec=s;break;}
}
if(foundSec!==-1){
c1Met=true;
matDet=`B3F ${b3Rank}3 (${foundSec+5}s): ${getDispItem(p.targetItem)}`;
}
}
if(c1Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#f66;font-size:11px;font-weight:bold;">${matDet}</span>`;
const res={isHit:true,jumpFloor:2,displayHtml:html,specialStyle:"1px solid #f66"};
if(p.wantAstar){
const d3=eng.di[2];
const tgt=[{g:2,gx:d3[17],gy:d3[18]}];
const vals=getWpChestCases(uniSec,wpPartyIdx,wpSoloIdx).map(bx=>calcCrossFloorChestRouteCost(eng,2,bx,tgt));
res.astar=minAstar(vals);
if(vals.length===2)res.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
return res;
}
return{isHit:false};
}
if(!checkWp(2))checkWp(3);
if(!wpMet)return{isHit:false};
let c1Met=false,c2Met=false,matDet="";
let currentB3Targets=p.isMillionaire?(wpFloor===2?p.strictMatTargets:p.broadMatTargets):p.strictMatTargets;
let currentB4Targets=p.isMillionaire?(wpFloor===3?p.strictMatTargets:p.broadMatTargets):p.strictMatTargets;
let checkSec=(p.isMillionaire?2:8)+shift;
let labelText=p.isMillionaire?"":`(${checkSec+5}s)`;
const{valid:b3V,item:pB3,rank:b3Rank}=checkTKThirdChest(eng,2,checkSec,20+shift,
currentB3Targets,p.isMillionaire?p.strictMatTargets:currentB3Targets);
const{valid:b4V,item:pB4,rank:b4Rank}=checkTKThirdChest(eng,3,checkSec,20+shift,
currentB4Targets,p.isMillionaire?p.strictMatTargets:currentB4Targets);
if(b3V&&b4V){c2Met=true;matDet=`B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}<br>B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`;}
else if(b3V){c1Met=true;matDet=`B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}`;}
else if(b4V){c1Met=true;matDet=`B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`;}
if(c1Met||c2Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${matDet}</span>`;
const res={isHit:true,jumpFloor:wpFloor,displayHtml:html,specialStyle:c2Met?"1px solid #fa0":""};
if(p.wantAstar){
const t3=b3V?{g:2,gx:eng.di[2][17],gy:eng.di[2][18]}:null;
const t4=b4V?{g:3,gx:eng.di[3][17],gy:eng.di[3][18]}:null;
const cases=getWpChestCases(uniSec,wpPartyIdx,wpSoloIdx);
if(cases.length===1){
if(c2Met){
const a3=calcCrossFloorChestRouteCost(eng,wpFloor,cases[0],[t3]);
const a4=calcCrossFloorChestRouteCost(eng,wpFloor,cases[0],[t4]);
const ab=calcCrossFloorChestRouteCost(eng,wpFloor,cases[0],[t3,t4]);
res.astar=minAstar([a3,a4,ab]);
res.astarText=`${fmtStepD(a3)} / ${fmtStepD(a4)} / ${fmtStepD(ab)}`;
}else{
res.astar=calcCrossFloorChestRouteCost(eng,wpFloor,cases[0],[b3V?t3:t4]);
}
}else if(cases.length===2){
const vals=cases.map(bx=>c2Met
?minAstar([calcCrossFloorChestRouteCost(eng,wpFloor,bx,[t3]),calcCrossFloorChestRouteCost(eng,wpFloor,bx,[t4]),calcCrossFloorChestRouteCost(eng,wpFloor,bx,[t3,t4])])
:calcCrossFloorChestRouteCost(eng,wpFloor,bx,[b3V?t3:t4]));
res.astar=minAstar(vals);
res.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
}
return res;
}
return{isHit:false};
}
};
function countFloorTiles(eng,f){
const di=eng.di[f];
const W=di[2],H=di[3];
if(W<=0||H<=0)return 0;
let count=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(isMainWalkable(di[(y<<4)+x+792]))count++;}
return count;
}
const _MAXTILE_DIMS=[16,15,14,13,12,11,10];
const _MAXTILE_REP_FLOORS=[0,4,8,12];
const _MAXTILE_CHEST_VARIANT_FLOORS=[2,3];
const _MAXTILE_EDGE_SEED=0x7FFF;
const _MAXTILE_EDGE_FLOORS=[1,2,3,5,6,7,9,10,11,13,14,15];
function listMetricSampleFloors(eng,includeChestVariants=false,edgeSeed=_MAXTILE_EDGE_SEED){
const floors=_MAXTILE_REP_FLOORS.slice();
if(includeChestVariants)floors.push(..._MAXTILE_CHEST_VARIANT_FLOORS);
if(eng.MapSeed===edgeSeed)floors.push(..._MAXTILE_EDGE_FLOORS);
return[...new Set(floors)];
}
function findFloorMaxChamberArea(eng,f){
const a=getFloorAnomalies(eng,f,false,false);
let mx=0;for(const s of a.isolatedRegions)if(s>mx)mx=s;
return mx>=3?mx:null;
}
function countFloorGhostStairs(eng,f){
const c=scanGhostStairs(eng.di[f]);
return c>0?c:null;
}
function forEachFloorMetric(eng,metricFn,visit,includeChestVariants,edgeSeed){
const fc=eng.floorCount;
for(const f of listMetricSampleFloors(eng,includeChestVariants,edgeSeed)){
if(f>=fc)continue;
const di=eng.di[f];const W=di[2],H=di[3];
if(W<=0||H<=0||W!==H||!_MAXTILE_DIMS.includes(W))continue;
const val=metricFn(eng,f);
if(val===null||val===undefined)continue;
visit(f,val,W+'x'+H);
}
}
function collectMetricPerFloor(eng,metricFn,includeChestVariants=false,edgeSeed=_MAXTILE_EDGE_SEED){
const out=[];
forEachFloorMetric(eng,metricFn,(f,val,dim)=>out.push({f,val,dim}),includeChestVariants,edgeSeed);
return out;
}
function collectMetricByFloorSize(eng,metricFn,better,includeChestVariants=false,edgeSeed=_MAXTILE_EDGE_SEED){
const r={};
forEachFloorMetric(eng,metricFn,(f,val,dim)=>{
if(!r[dim])r[dim]={bestVal:val,bestFloor:f,floors:[]};
r[dim].floors.push({f,val});
if(better(val,r[dim].bestVal)){r[dim].bestVal=val;r[dim].bestFloor=f;}
},includeChestVariants,edgeSeed);
return r;
}
function buildMetricCardHtml(dimData,fmtFn){
const fm=fmtFn||fmtStep;
return`<span style="color:#ffc90e;font-weight:bold;font-size:13px">${fm(dimData.bestVal)}</span> <span style="color:#9ab;font-size:11px">B${dimData.bestFloor+1}F</span>`;
}
function buildFastestMapHtml(eng,opts){
opts=opts||{};
const hideFloors=!!opts.hideFloors;
const fcAll=eng.floorCount;if(fcAll<=0)return null;
const hasLimit=(typeof opts.upToFloor==='number'&&opts.upToFloor>=0);
const limit=hasLimit?Math.min(opts.upToFloor,fcAll):fcAll;
const pf=new Array(limit);let sum=0;
for(let f=0;f<limit;f++){const c=calcFloorWalkCost(eng,f);if(c===null)return null;pf[f]=c;sum+=c;}
let html=`<div style="margin-top:4px;"><span style="color:#ffc90e;font-weight:bold;font-size:14px">${fmtStep(sum)}</span></div>`;
if(!hideFloors){
const floors=pf.map((c,f)=>{const isGoal=(!hasLimit&&f===limit-1);return`<span style="color:${isGoal?'#fc6':'#9ab'}">B${f+1}F${isGoal?'✦':''}<b style="color:#cde">${fmtStep(c)}</b></span>`;}).join('<span style="color:#445"> · </span>');
html+=`<div style="margin-top:3px;font-size:11px;font-family:monospace;line-height:1.7">${floors}</div>`;
}
return{html,cost:sum};
}
function needsMapGeneration(conds,searchOnlyWithD){
return!!(conds.hasBoxCond||conds.elist||conds.onlyMon||searchOnlyWithD||conds.anomaly!=="");
}
function evaluateMapSearchConditions(engine,seed,targetRankKey,conds,searchFilterLoc,searchOnlyWithD,onlyMonExpectedStr){
engine.calculateDetail(true);
if(!checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc))return null;
if(!checkOnlyMonPossible(engine,conds))return null;
if(needsMapGeneration(conds,searchOnlyWithD))engine.createDungeonDetail();
const chestResult=ChestHtml(engine,conds);
if(!chestResult.isMatch)return null;
const elistResult=checkElistAndD(engine,conds,searchOnlyWithD,onlyMonExpectedStr);
if(!elistResult.match)return null;
const anomResult=checkAnomalies(engine,conds);
if(!anomResult.match)return null;
return{boxHtml:chestResult.html,elistResult,anomResult};
}
const SEED_PROCESSORS={
ultimate:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const searchOnlyWithD=job.params.searchOnlyWithD;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const match=evaluateMapSearchConditions(searchEngine,seed,targetRankKey,conds,
job.searchFilterLoc,searchOnlyWithD,_onlyMonExpectedStr);
if(!match)return null;
const{boxHtml,elistResult,anomResult}=match;
let specialHitDetails=elistResult.specialHitDetails;
let anomalyDetails=anomResult.anomalyDetails;
let hasMatchedD=elistResult.hasMatchedD;
let jumpToFloor=elistResult.jumpToFloor!==-1?elistResult.jumpToFloor:anomResult.jumpToFloor;
let locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const{specialHtml,anomalyHtml}=buildSearchDetailHtml(specialHitDetails,anomalyDetails);
let mapNameDisp=dispName(searchEngine);
const html=`
    <span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span> 
    <span style="color:#888">(Rank ${rStr})</span><br>
    <span style="color:#0ff;font-size:11px">${mapNameDisp}</span>${locHtml}
    <div style="margin-top:4px;">${boxHtml}</div>
    ${specialHtml}
    ${anomalyHtml}
    `;
return{seed,rStr,html,hasD:hasMatchedD,jumpFloor:jumpToFloor};
},
multibug:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const cond_elist=conds.elist;
const cond_only_mon=conds.onlyMon;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const{requireFloorIncrease,requireBugFloorHit,searchOnlyWithD,effectiveElistCond,isCombinedSearch}=job.params;
searchEngine._at_offset=0;
searchEngine._force_16_floors=false;
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
let origFloors=searchEngine.floorCount;
let origBoss=dispBoss(searchEngine);
let origName=dispName(searchEngine);
searchEngine._at_offset=1;
searchEngine._force_16_floors=false;
searchEngine.calculateDetail();
let bugFloors=searchEngine.floorCount;
let bugBoss=dispBoss(searchEngine);
let bugName=dispName(searchEngine);
let isFloorIncreased=bugFloors>origFloors;
if(requireFloorIncrease&&!isFloorIncreased)return null;
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
if(!boxMatch){
searchEngine._force_16_floors=false;
return null;
}
boxHtml=`<div style="margin-top:4px;"><span style="color:#fc0;font-size:10px;background:#420;padding:2px 4px;border-radius:3px;">${boxStr.join(' ')}</span></div>`;
}
let foundSpecialFloors=[];
let specialHitCount=0;
let hasAnyD=false;
for(let f=4;f<16;f++){
let elistInfo=getFloorElistInfo(searchEngine,f);
if(elistInfo.dValue>0)hasAnyD=true;
let isElistHit=false;
let isOnlyHit=false;
let floorHit=null;
if(elistInfo.state){
if(!effectiveElistCond||effectiveElistCond==='MULTI_SPECIAL'){
isElistHit=true;
}else{
floorHit=evalElistFloorHit(searchEngine,f,elistInfo,effectiveElistCond);
isElistHit=floorHit.isElistHit;
}
if(isCombinedSearch){
if(isElistHit&&floorHit){
const bd=getElistMonsterBadge(searchEngine._details[3],floorMRAt(searchEngine._details[2],f),floorHit.targetCount,cond_only_mon);
if(bd.isCombinedHit)isOnlyHit=true;
}
}else{
if(!cond_only_mon){
isOnlyHit=true;
}else if(elistInfo.state.includes(_onlyMonExpectedStr)){
isOnlyHit=true;
}
}
}
let isSpecialMatch=(isElistHit&&isOnlyHit&&elistInfo.state);
if(isSpecialMatch){specialHitCount++;}
if(elistInfo.state||(searchOnlyWithD&&elistInfo.dValue>0)){
if(!foundSpecialFloors.some(x=>x.floor===f+1)){
const fMR=floorMRAt(searchEngine._details[2],f);
foundSpecialFloors.push({
floor:f+1,
isElistHit:isElistHit,
hex:elistInfo.hex,
state:elistInfo.state||EL_NORMAL,
dValue:elistInfo.dValue,
envType:searchEngine._details[3],
floorMR:fMR,
isSpecialMatch:!!isSpecialMatch
});
}
}
}
if(requireBugFloorHit){
foundSpecialFloors=foundSpecialFloors.filter(info=>info.floor>origFloors&&info.floor<=bugFloors);
hasAnyD=foundSpecialFloors.some(info=>info.dValue>0);
specialHitCount=foundSpecialFloors.filter(info=>info.state!==EL_NORMAL).length;
if(foundSpecialFloors.length===0){
searchEngine._force_16_floors=false;
return null;
}
}
if(searchOnlyWithD&&!hasAnyD){
searchEngine._force_16_floors=false;
return null;
}
if(searchOnlyWithD&&(effectiveElistCond||cond_only_mon)&&effectiveElistCond!=='MULTI_SPECIAL'){
let hasMatchedD_mb=foundSpecialFloors.some(info=>info.dValue>0&&info.isSpecialMatch);
if(!hasMatchedD_mb){
searchEngine._force_16_floors=false;
return null;
}
}
if(effectiveElistCond==='MULTI_SPECIAL'&&specialHitCount<2){
searchEngine._force_16_floors=false;
return null;
}
if((effectiveElistCond||cond_only_mon)&&specialHitCount===0){
searchEngine._force_16_floors=false;
return null;
}
const isJP_mb=(DISPLAY_LANG!=='EN');
let elistHtmlStr=foundSpecialFloors.map(info=>{
let stateColor="#888";
if(info.state!==EL_NORMAL){
if(info.floor<=Math.min(origFloors,bugFloors)){
stateColor="#4f4";
}else if(info.floor<=origFloors){
stateColor="#00a2e8";
}else if(info.floor<=bugFloors){
stateColor="#fa0";
}else{
stateColor="#f7f";
}
}
let dHtml=info.dValue>0?` <span style="background:#fa0;color:#000;padding:1px 5px;border-radius:3px;font-size:10px;margin-left:4px;white-space:nowrap;">${info.dValue}</span>`:'';
let line=`<span style="color:#0ff;font-size:12px;">B${info.floor}F: [${info.hex}] <strong style="color:${stateColor};">${info.state}</strong>${dHtml}</span>`;
const st=info.state;
let surviveCount=0;
if(st.includes(EL_4))surviveCount=4;
else if(st.includes(EL_3))surviveCount=3;
else if(st.includes(EL_2))surviveCount=2;
let shouldShowMonBadge=surviveCount>0&&(cond_elist===surviveCount.toString()||isCombinedSearch||(cond_elist==='SIZE_15'&&info.isElistHit));
if(shouldShowMonBadge)line+=getElistMonsterBadge(info.envType,info.floorMR,surviveCount,null).badge;
return line;
}).join('<br>');
const cachedLocData=peekLocDataCached(seed,targetRankKey);
const locHtml=cachedLocData?LocaHtmlFromData(cachedLocData,conds):"";
let bugIcon=isFloorIncreased?'📈':'';
const html=`
      <span style="color:#ffd700;font-weight:bold;font-size:15px;">${hex4(seed)}</span>
      <span style="color:#888">(Rank ${rStr})</span><br>
      <div style="background:#111;padding:4px 8px;border-radius:4px;margin:4px 0;border:1px solid #333;">
      <span style="color:#aaa;font-size:11px">[Source] ${origName} | B${origFloors}F | ${origBoss}</span><br>
      <span style="color:#f8f;font-size:11px">[Bug] ${bugName} | B${bugFloors}F | ${bugBoss} ${bugIcon}</span>
      </div>${locHtml}${boxHtml}
      <div style="padding-top:2px;">${elistHtmlStr}</div>
      `;
searchEngine._force_16_floors=false;
return{seed,rStr,html,hasD:hasAnyD};
},
item:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const p=job.params;
searchEngine.calculateDetail(true);
const basicReq=ITEM_BASIC_REQS[p.checker];
if(basicReq&&!basicReq(searchEngine,p,conds))return null;
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
searchEngine.createDungeonDetail();
let chestResult=ChestHtml(searchEngine,conds);
if(!chestResult.isMatch)return null;
let boxHtml=chestResult.html;
let hitResult=DUNGEON_CHECKERS[p.checker](searchEngine,p);
if(hitResult&&hitResult.isHit){
let locHtml=getLocHtmlCached(seed,targetRankKey,conds);
let mapNameDisp=dispName(searchEngine);
const fmtAstar=a=>` <span style="color:#ffc90e;font-size:11px;font-family:monospace;">${fmtStepD(a)}</span>`;
const buildHtml=(astarHtml,displayHtml)=>`
        <span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span>
        <span style="color:#888">(Rank ${rStr})</span>${astarHtml}<br>
        <span style="color:#0ff;font-size:11px;margin-bottom:2px;display:inline-block;">${mapNameDisp}</span>${locHtml}
        <div style="margin-top:4px;">${boxHtml}</div>
        <div style="margin-top:4px;">${displayHtml}</div>
        `;
if(hitResult.multi){
return hitResult.multi.map(row=>({
seed,rStr,html:buildHtml(row.astarText!==undefined
?` <span style="color:#ffc90e;font-size:11px;font-family:monospace;">${row.astarText}</span>`
:fmtAstar(row.astar),row.displayHtml),
jumpFloor:row.floor,specialStyle:'',title:''+J01,
sortCost:row.astar==null?1e9:row.astar,
isB10:row.isB10,isJfireB10:!!row.isJfireB10,isX3:!!row.isX3
}));
}
const astarTitle=hitResult.astarTitle?` title="${hitResult.astarTitle}"`:'';
const astarSpan=hitResult.astarText!==undefined
?` <span${astarTitle} style="color:#ffc90e;font-size:11px;font-family:monospace;">${hitResult.astarText}</span>`
:(hitResult.astar!==undefined?fmtAstar(hitResult.astar):'');
const html=buildHtml(astarSpan,hitResult.displayHtml);
const ret={seed,rStr,html,jumpFloor:hitResult.jumpFloor||0,specialStyle:hitResult.specialStyle||'',title:''+J01};
if(hitResult.astar!==undefined)ret.sortCost=hitResult.astar==null?1e9:hitResult.astar;
if(hitResult.astarX3)ret.isX3=true;
return ret;
}
return null;
},
fastest:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const searchOnlyWithD=job.params.searchOnlyWithD;
const benchmarkMode=!!job.params.benchmarkMode;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const _fastMode=job.params.fastestMode;
searchEngine.calculateDetail(true);
if(_fastMode!=='maxtile'&&!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
const excludeGrey=(_fastMode==='map'&&!job.params.slowest);
if(!benchmarkMode&&excludeGrey&&searchEngine._details[0]===12&&parseInt(conds.boss)!==12)return null;
if(_fastMode!=='maxtile'&&!checkOnlyMonPossible(searchEngine,conds))return null;
searchEngine.createDungeonDetail();
if(_fastMode==='maxtile'){
const _metric=job.params.metricType||'maxtile';
const _chestSensitive=(_metric!=='maxghost');
const _edgeSeed=(job.params.metricEdgeSeed===undefined)?job.endSeed:job.params.metricEdgeSeed;
if(_metric==='maxiso'||_metric==='maxghost'){
const rows=collectMetricPerFloor(searchEngine,_metric==='maxiso'?findFloorMaxChamberArea:countFloorGhostStairs,_chestSensitive,_edgeSeed);
if(rows.length===0)return null;
return rows.map(r=>({
seed,rStr:'DD',
html:`<span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span><br>`
+`<span style="color:#ffc90e;font-weight:bold;font-size:13px">${r.val}</span> `
+`<span style="color:#9ab;font-size:11px">B${r.f+1}F</span> `
+`<span style="color:#678;font-size:10px">${r.dim}</span>`,
jumpFloor:r.f,sortCost:r.val,fc:searchEngine.floorCount,_dimLabel:r.dim
}));
}
let metricFn,better,fmtFn;
if(_metric==='maxwalk'){
metricFn=calcFloorWalkCost;better=(a,b)=>a>b;fmtFn=fmtStep;
}else if(_metric==='mintile'){
metricFn=countFloorTiles;better=(a,b)=>a<b;fmtFn=null;
}else{
metricFn=countFloorTiles;better=(a,b)=>a>b;fmtFn=null;
}
const rows=collectMetricPerFloor(searchEngine,metricFn,_chestSensitive,_edgeSeed);
const results=rows.map(r=>{
const valHtml=fmtFn?fmtFn(r.val):r.val;
const cardHtml=`<span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span><br>`
+`<span style="color:#ffc90e;font-weight:bold;font-size:13px">${valHtml}</span> `
+`<span style="color:#9ab;font-size:11px">B${r.f+1}F</span>`;
return{seed,rStr:'DD',html:cardHtml,jumpFloor:r.f,sortCost:r.val,fc:searchEngine.floorCount,_dimLabel:r.dim};
});
return results.length>0?results:null;
}
let boxHtml="";
if(conds.hasBoxCond){
let chestResult=ChestHtml(searchEngine,conds);
if(!chestResult.isMatch)return null;
boxHtml=chestResult.html;
}
let elistResult=checkElistAndD(searchEngine,conds,searchOnlyWithD,_onlyMonExpectedStr);
if(!elistResult.match)return null;
let anomResult=checkAnomalies(searchEngine,conds);
if(!anomResult.match)return null;
let specialHitDetails=elistResult.specialHitDetails;
let anomalyDetails=anomResult.anomalyDetails;
let hasMatchedD=elistResult.hasMatchedD;
let jumpToFloor=elistResult.jumpToFloor!==-1?elistResult.jumpToFloor:anomResult.jumpToFloor;
let upToFloor=-1;
if(!benchmarkMode){
if(_fastMode==='floor'){
if((conds.elist||conds.onlyMon)&&elistResult.jumpToFloor!==-1){
upToFloor=elistResult.jumpToFloor;
}else if(conds.depth2){
const _d2=parseInt(conds.depth2);
if(searchEngine.floorCount<_d2)return null;
upToFloor=_d2;
if(jumpToFloor===-1)jumpToFloor=_d2-1;
}
}else if(_fastMode==='map'){
upToFloor=-1;
}else if((conds.elist||conds.onlyMon)&&elistResult.jumpToFloor!==-1){
upToFloor=elistResult.jumpToFloor;
}
}
const _showFloors=benchmarkMode||!!job.params.showFloors;
let fastestRes=buildFastestMapHtml(searchEngine,benchmarkMode?{hideFloors:false,upToFloor:-1}:{hideFloors:!_showFloors,upToFloor:upToFloor});
if(fastestRes===null)return null;
let fastestHtml=fastestRes.html;
let locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const{specialHtml,anomalyHtml}=buildSearchDetailHtml(specialHitDetails,anomalyDetails);
let mapNameDisp=dispName(searchEngine);
const html=`
    <span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span> 
    <span style="color:#888">(Rank ${rStr})</span><br>
    <span style="color:#0ff;font-size:11px">${mapNameDisp}</span>${locHtml}
    ${fastestHtml}
    <div style="margin-top:4px;">${boxHtml}</div>
    ${specialHtml}
    ${anomalyHtml}
    `;
return{seed,rStr,html,hasD:hasMatchedD,jumpFloor:jumpToFloor,sortCost:fastestRes.cost,fc:searchEngine.floorCount};
}
};
function getProcessorEntry(name){
switch(name){
case'ultimate':return{setup:SEED_SETUP.ultimate,proc:SEED_PROCESSORS.ultimate};
case'multibug':return{setup:SEED_SETUP.multibug,proc:SEED_PROCESSORS.multibug};
case'fastest':return{setup:SEED_SETUP.fastest,proc:SEED_PROCESSORS.fastest};
case'item':return{setup:SEED_SETUP.item,proc:SEED_PROCESSORS.item};
}
return null;
}
async function coreRunScanJob(job,io){
const conds=job.conds;
const totalCombos=job.ranks.length*(job.endSeed-job.startSeed+1);
let processed=0;
let hitCount=0;
let batch=[];
let searchEngine=new GrottoDetail();
const entry=getProcessorEntry(job.processor);
if(!entry)throw new Error('unknown processor: '+job.processor);
const setup=entry.setup,proc=entry.proc;
if(setup)setup(searchEngine,job);
const yieldStride=(job.processor==='ultimate'
&&!needsMapGeneration(conds,job.params&&job.params.searchOnlyWithD))?1000:250;
for(let rank of job.ranks){
if(io.cancelled())break;
let rStr=hex2(rank);
let targetRankKey=resolveRankKey(rStr,rank);
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(seed%yieldStride===0){
io.progress({processed,total:totalCombos,hits:hitCount,rStr,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
resetLocationCache();
let item=proc(searchEngine,seed,rStr,targetRankKey,job);
if(item){
hitCount++;
if(Array.isArray(item))for(const it of item)batch.push(it);
else batch.push(item);
}
processed++;
}
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
async function coreRunATMonsterJob(job,io){
const conds=job.conds;
const{N,atmin,atmax,deftMax,pType,atThreshold,atMaxSteps,rank,rStr,targetRankKey,searchOnlyWithD,searchFilterLoc}=job;
const atMchSeeds=new Map();
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if((seed&8191)===0){if(io.cancelled())return 0;await io.yield();}
const{atN,atN1}=getATPair(seed,N);
if(atN<atmin||atN>atmax)continue;
if(deftMax>=0&&calcDeftness(atN1)>deftMax)continue;
atMchSeeds.set(seed,{atN,atN1});
}
const atPtnDetails=new Map();
if(pType>0){
const toDelete=[];
let scanned=0;
for(const[seed]of atMchSeeds){
if((++scanned&255)===0){if(io.cancelled())return 0;await io.yield();}
const frame=battleATContext(N,calcDeftness(atMchSeeds.get(seed).atN1),job.userDeft??999);
const{foundOffsets}=scanSeedForAtPattern(seed,atMaxSteps,atThreshold,pType,frame.firstUnused[0],0);
if(foundOffsets.length>0)atPtnDetails.set(seed,{foundOffsets});
else toDelete.push(seed);
}
for(const seed of toDelete)atMchSeeds.delete(seed);
}
const needMapGeneration=needsMapGeneration(conds,searchOnlyWithD);
const yieldStride=needMapGeneration?250:1000;
let _onlyMonExpectedStr=buildOnlyMonExpectedStr(conds);
let searchEngine=new GrottoDetail();
searchEngine.trackOverflow=(conds.anomaly==='all_invalid'||conds.anomaly==='ghost');
let totalCombos=atMchSeeds.size;
let processed=0;
let hitCount=0;
let batch=[];
for(const[seed,atinfo]of atMchSeeds){
if(io.cancelled())break;
if(processed%yieldStride===0){
io.progress({processed,total:totalCombos,hits:hitCount});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
const match=evaluateMapSearchConditions(searchEngine,seed,targetRankKey,conds,
searchFilterLoc,searchOnlyWithD,_onlyMonExpectedStr);
if(!match){processed++;continue;}
const{boxHtml,elistResult,anomResult}=match;
let jumpToFloor=elistResult.jumpToFloor!==-1?elistResult.jumpToFloor:anomResult.jumpToFloor;
hitCount++;
let locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const{specialHtml,anomalyHtml}=buildSearchDetailHtml(elistResult.specialHitDetails,anomResult.anomalyDetails);
let mapNameDisp=dispName(searchEngine);
const{deft}=formatDeftness(atinfo.atN1);
let diffsHtml='';
let patHtml='';
const patData=atPtnDetails.get(seed);
if(pType>0&&patData){
patHtml=buildAtPatternBoxHtml(job.patternName,job.probText,buildAtOffsetsHtml(patData.foundOffsets));
diffsHtml=buildBattleAtDiffsHtml(patData.foundOffsets,N,deft,job.userDeft??999);
}
let atHtml=buildAtInfoCardHtml(seed,N,atinfo.atN,atinfo.atN1,diffsHtml);
const html=`
      <span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span>
      <span style="color:#888">(Rank ${rStr})</span><br>
      <span style="color:#0ff;font-size:11px">${mapNameDisp}</span>${locHtml}
      <div style="margin-top:4px;">${boxHtml}</div>
      ${specialHtml}
      ${anomalyHtml}
      ${atHtml}
      ${patHtml}
      `;
batch.push({seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor:jumpToFloor,pop:atinfo.atN});
processed++;
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
async function coreRunATPatternJob(job,io){
let hitCount=0;
let processed=0;
let totalSeeds=job.endSeed-job.startSeed+1;
let batch=[];
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(job.searchFilterLoc){
let locData=calcLocations(seed,job.targetRankKey);
if(locData.outputOrder.length===0){processed++;continue;}
}
if(processed%1000===0){
io.progress({processed,total:totalSeeds,hits:hitCount,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
processed++;
const pair=getATPair(seed,job.POPIndex);
const frame=battleATContext(job.POPIndex,calcDeftness(pair.atN1),job.userDeft??999);
const{foundOffsets}=scanSeedForAtPattern(seed,job.maxSteps,job.threshold,job.pType,frame.firstUnused[0],0);
const{atN:popValue,atN1:defValue}=pair;
if(foundOffsets.length>0){
hitCount++;
const{deft}=formatDeftness(defValue);
const diffsHtml=buildBattleAtDiffsHtml(foundOffsets,job.POPIndex,deft,job.userDeft??999);
const specificAtHtml=buildAtInfoCardHtml(seed,job.POPIndex,popValue,defValue,diffsHtml);
const html=`
        <span style="color:#ffd700;font-weight:bold;font-size:13px;">${hex4(seed)}</span><br>
        ${buildAtPatternBoxHtml(job.patternName,job.probText,buildAtOffsetsHtml(foundOffsets))}
        ${specificAtHtml}
        `;
batch.push({seed,rStr:null,html,pop:popValue});
}
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
function getCoreSearchRunner(kind){
if(kind==='scan')return coreRunScanJob;
if(kind==='atMonster')return coreRunATMonsterJob;
if(kind==='atPattern')return coreRunATPatternJob;
return null;
}
const SK_ISSEN=1,SK_MERCY=2,SK_EGG=3,SK_ATK=4,SK_ATK_ALL=5;
const SKILL_DB=[
{cat:"skill",weapon:"Minstrel",jp:"火ふき芸",en:"Hot Lick",target:"S",at:[128,0],miss:120,ev:0,blk:0,el:5,metal:0,dmg:{s:3,b:20}},
{cat:"skill",weapon:"Hammer",jp:"ビッグバン",en:"Big Banga",target:"A",at:[74,0],miss:74,ev:0,blk:1,el:10,metal:0,dmg:{s:60,b:300},hiden:1},
{cat:"spell",jp:"ドルマドン",en:"Kazammle",target:"S",at:[67,0],miss:59,ev:0,blk:1,el:10,metal:0,cls:[10],dmg:{s:30,b:285,m:615,st:"might",lo:480,hi:999}},
{cat:"spell",jp:"メラガイアー",en:"Kafrizzle",target:"S",at:[55,0],miss:41,ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:23,b:292,m:600,st:"might",lo:480,hi:999}},
{cat:"skill",weapon:"Boomerang",jp:"ギガスロー",en:"Gigathrow",target:"S",at:[39,0],miss:29,ev:1,blk:1,el:8,metal:0,hiden:1},
{cat:"skill",weapon:"Whip",jp:"双竜打ち (単体)",en:"Twin Dragon Lash (Single)",target:"S",at:[30,12],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:2,max:2},mul:1.25},
{cat:"spell",jp:"マヒャド",en:"Kacrack",target:"A",at:[29,1],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:12,b:92,m:216,st:"might",lo:200,hi:999}},
{cat:"skill",weapon:"Whip",jp:"地這い大蛇",en:"Serpent's Bite",target:"G",at:[29,1],ev:1,blk:1,el:9,metal:0,hiden:1,mul:2},
{cat:"skill",weapon:"Hammer",jp:"ランドインパクト",en:"Crackerwhack",target:"A",at:[29,1],ev:0,blk:1,el:9,metal:0,dmg:{s:15,b:175}},
{cat:"skill",weapon:"Bow",jp:"シャイニングボウ",en:"Shining Shot",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:5,b:150},hiden:1},
{cat:"skill",weapon:"Boomerang",jp:"シャインスコール",en:"Starburst Throw",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:10,b:105}},
{cat:"spell",jp:"イオグランデ",en:"Kaboomle",target:"A",at:[29,1],ev:0,blk:0,el:8,metal:0,cls:[10],dmg:{s:10,b:210,m:480,st:"might",lo:550,hi:999}},
{cat:"item",jp:"ばくだん石",en:"Rockbomb shard",target:"A",at:[29,1],ev:0,blk:0,el:0,metal:0,dmg:{s:5,b:25}},
{cat:"item",jp:"マグマの杖",en:"Magma Staff",target:"A",at:[28,1],miss:20,ev:0,blk:0,el:8,metal:0,dmg:{s:8,b:60}},
{cat:"skill",weapon:"Sword",jp:"ギガブレイク",en:"Gigagash",target:"G",at:[23,1],miss:0,ev:0,blk:1,el:11,metal:0,dmg:{s:75,b:260,m:520,st:"str+might",lo:500,hi:1998},hiden:1},
{cat:"skill",weapon:"Whip",jp:"らせん打ち",en:"Hypnowhip",target:"S",at:[22,0],miss:14,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Spear",jp:"ジゴスパーク",en:"Lightning Storm",target:"A",at:[20,1],ev:0,blk:1,el:8,metal:0,dmg:{s:15,b:205,m:405,st:"str+might",lo:500,hi:1998},hiden:1},
{cat:"skill",weapon:"Fisticuffs",jp:"ばくれつけん",en:"Multifists",target:"RA",at:[20,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{cat:"skill",weapon:"Fisticuffs",jp:"岩石おとし",en:"Boulder Toss",target:"A",at:[20,1],ev:1,blk:1,el:9,metal:0,dmg:{s:10,b:110,m:300,st:"str+deft",lo:500,hi:1998}},
{cat:"spell",jp:"マヒャデドス",en:"Kacrackle",target:"A",at:[17,1],ev:0,blk:0,el:6,metal:0,cls:[2],dmg:{s:20,b:185,m:510,st:"might",lo:550,hi:999}},
{cat:"spell",jp:"バギクロス",en:"Kaswoosh",target:"G",at:[17,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:50,b:130,m:205,st:"might",lo:200,hi:999}},
{id:SK_ISSEN,cat:"skill",weapon:"Spear",jp:"一閃づき",en:"Thunder Thrust",target:"S",at:[14,0],miss:0,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Whip",jp:"愛のムチ",en:"Lashings of Love",target:"G",at:[14,5],ev:1,blk:1,el:0,metal:0,tmul:{12:1.5}},
{cat:"skill",weapon:"Claws",jp:"ゴッドスマッシュ",en:"Hand of God",target:"S",at:[14,0],ev:0,blk:1,el:11,metal:0,dmg:{s:40,b:220,m:440,st:"str",lo:300,hi:999},hiden:1},
{cat:"skill",weapon:"Fan",jp:"波紋演舞",en:"Water Slaughterer",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{10:1.5}},
{cat:"skill",weapon:"Axe",jp:"たいぼく斬",en:"Poplar Toppler",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{4:1.5}},
{cat:"skill",weapon:"Axe",jp:"蒼天魔斬",en:"Parallax",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,mul:1.25},
{cat:"skill",weapon:"Axe",jp:"オノむそう",en:"Axes of Evil",target:"G",at:[14,4],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Axe",jp:"森羅万象斬",en:"Whopper Chop",target:"S",at:[14,0],ev:0,blk:1,el:0,metal:0,dmg:{s:20,b:200,m:480,st:"str",lo:250,hi:600},hiden:1},
{cat:"skill",weapon:"Bow",jp:"さみだれうち",en:"Rain of Pain",target:"RA",at:[14,10],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{cat:"skill",weapon:"Fisticuffs",jp:"せいけんづき",en:"Knuckle Sandwich",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Gladiator",jp:"とうこん討ち",en:"Clap Trap",target:"S",at:[14,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.2},
{cat:"skill",weapon:"Gladiator",jp:"とうこん討ち(毒針)",en:"Clap Trap (Poison Needle)",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,fixedDmg:1},
{cat:"skill",weapon:"Paladin",jp:"グランドネビュラ",en:"Solar Flair",target:"G",at:[14,1],ev:0,blk:1,el:11,metal:0,dmg:{s:15,b:195,m:390,st:"mending",lo:200,hi:849},hiden:1},
{cat:"spell",jp:"ドルモーア",en:"Kazam",target:"S",at:[14,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:30,b:150,m:345,st:"might",lo:225,hi:999}},
{cat:"spell",jp:"バギマ",en:"Swoosh",target:"G",at:[14,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:15,b:40,m:138,st:"might",lo:100,hi:999}},
{cat:"spell",jp:"メラゾーマ",en:"Kafrizz",target:"S",at:[11,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:12,b:190,m:319,st:"might",lo:220,hi:999}},
{cat:"spell",jp:"バギ",en:"Woosh",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:8,b:16,m:69,st:"might",lo:50,hi:999}},
{cat:"item",jp:"さばきの杖",en:"Staff of Sentencing",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:10,b:85}},
{cat:"item",jp:"れっぷうのおうぎ",en:"Foehn Fan",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:10,b:85}},
{id:SK_ATK,cat:"skill",weapon:"Other",jp:"攻撃",en:"Attack",target:"S",at:[8,8],miss:0,ev:1,blk:1,el:0,metal:0,fh:2},
{cat:"skill",weapon:"Other",jp:"攻撃(毒針)",en:"Attack (Poison Needle)",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,fixedDmg:1},
{cat:"skill",weapon:"Other",jp:"攻撃 (ｸﾞﾙｰﾌﾟ)",en:"Attack (Group)",target:"G",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{id:SK_ATK_ALL,cat:"skill",weapon:"Other",jp:"攻撃 (全体)",en:"Attack (All)",target:"A",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Sword",jp:"ドラゴン斬り",en:"Dragon Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,tmul:{1:1.5}},
{cat:"skill",weapon:"Sword",jp:"メタル斬り",en:"Metal Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:1,fh:2},
{cat:"skill",weapon:"Sword",jp:"はやぶさ斬り",en:"Falcon Slash",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,fh:4,mul:0.75},
{cat:"skill",weapon:"Sword",jp:"ギガスラッシュ",en:"Gigaslash",target:"G",at:[8,4],ev:0,blk:1,el:11,metal:0,dmg:{s:20,b:160,m:360,st:"str+might",lo:500,hi:1998}},
{cat:"skill",weapon:"Spear",jp:"しっぷうづき",en:"Mercurial Thrust",target:"S",at:[8,0],pri:2,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Spear",jp:"けものづき",en:"Cattle Prod",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{2:1.5}},
{cat:"skill",weapon:"Knife",jp:"キラーブーン",en:"Fly Swat",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2,tmul:{5:1.5}},
{cat:"skill",weapon:"Wand",jp:"悪魔ばらい",en:"Beelzefreeze",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Staff",jp:"黄泉送り",en:"Deliverance",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{7:1.5}},
{cat:"skill",weapon:"Claws",jp:"ウィングブロウ",en:"Propeller Blade",target:"S",at:[8,8],ev:1,blk:1,el:7,metal:0,hit:2},
{cat:"skill",weapon:"Claws",jp:"裂鋼拳",en:"Can Opener",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{6:1.5}},
{cat:"skill",weapon:"Claws",jp:"タイガークロー",en:"Hardclaw",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,mul:0.75},
{cat:"skill",weapon:"Hammer",jp:"ドラムクラッシュ",en:"Monster Masher",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{11:1.5}},
{cat:"skill",weapon:"Bow",jp:"バードシュート",en:"Flutter Disaster",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{3:1.5}},
{cat:"skill",weapon:"Boomerang",jp:"クロスカッター",en:"Crosscutter Throw",target:"A",at:[8,4],ev:1,blk:1,el:0,metal:0,mul:0.75},
{cat:"skill",weapon:"Boomerang",jp:"パワフルスロー",en:"Power Throw",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,mul:0.75},
{cat:"skill",weapon:"Boomerang",jp:"スライムブロウ",en:"Ooze Bruiser",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,tmul:{0:1.5}},
{cat:"skill",weapon:"Boomerang",jp:"バーニングバード",en:"Firebird Throw",target:"RA",at:[8,8],ev:1,blk:1,el:5,metal:0,hitRange:{normalMin:7,max:7},mul:0.3},
{cat:"skill",weapon:"Boomerang",jp:"メタルウィング",en:"Metalicker",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:1},
{cat:"skill",weapon:"Shield",jp:"シールドアタック",en:"Blockenspiel",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Fisticuffs",jp:"石つぶて",en:"Stone's Throw",target:"G",at:[8,8],ev:1,blk:1,el:9,metal:0,dmg:{s:7,b:17}},
{cat:"skill",weapon:"Fisticuffs",jp:"かまいたち",en:"Wind Sickles",target:"G",at:[8,5],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Gladiator",jp:"もろば斬り",en:"Double-Edged Slash",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,mul:1.5},
{cat:"skill",weapon:"Gladiator",jp:"無心こうげき",en:"Blind Man's Biff",target:"RS",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.5},
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
{id:SK_MERCY,cat:"skill",weapon:"Ranger",jp:"みのがす",en:"Mercy",target:"A",at:[0,0],miss:0,ev:0,blk:0,el:12,metal:0},
{cat:"spell",jp:"ザラキーマ",en:"Kathwack",target:"A",at:[0,0],ev:0,blk:0,el:12,metal:0,cls:[1]},
{cat:"skill",weapon:"Armamentalist",jp:"ファイアフォース",en:"Fire Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[5]},
{cat:"skill",weapon:"Armamentalist",jp:"アイスフォース",en:"Frost Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[6]},
{cat:"skill",weapon:"Armamentalist",jp:"ストームフォース",en:"Gale Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[7,8]},
{cat:"skill",weapon:"Armamentalist",jp:"ダークフォース",en:"Funereal Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[9,10]},
{cat:"skill",weapon:"Armamentalist",jp:"ライトフォース",en:"Life Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[11]},
{id:SK_EGG,cat:"skill",weapon:"Other",jp:"おうえん",en:"Egg On",target:"S",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0,hiden:1},
];
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
const WEAPON_META={
'はやぶさの剣':{cat:'Sword',en:'Falcon blade',falcon:true,metal:0,antiBlk:false},
'メタスラの剣':{cat:'Sword',en:'Metal slime sword',falcon:false,metal:1,antiBlk:false},
'メタスラのやり':{cat:'Spear',en:'Metal slime spear',falcon:false,metal:1,antiBlk:false},
'きしんのまそう':{cat:'Spear',en:'Poker',falcon:false,metal:0,antiBlk:true},
'風林火山':{cat:'Fan',en:'Attribeauty',falcon:false,metal:1,antiBlk:true,pri:1},
'キラーピアス':{cat:'Knife',en:'Falcon knife earrings',falcon:true,metal:0,antiBlk:false},
'どくばり':{cat:'Knife',en:'Poison needle',falcon:false,metal:0,antiBlk:false,fixedDmg:1,hits:1},
'剣(汎用)':{cat:'Sword',en:'Sword(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'やり(汎用)':{cat:'Spear',en:'Spear(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'弓(汎用)':{cat:'Bow',en:'Bow(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'オノ(汎用)':{cat:'Axe',en:'Axe(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'ナイフ(汎用)':{cat:'Knife',en:'Knife(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'ツメ(汎用)':{cat:'Claw',en:'Claw(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'棍(汎用)':{cat:'Pole',en:'Pole(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'杖(汎用)':{cat:'Wand',en:'Wand(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'扇(汎用)':{cat:'Fan',en:'Fan(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'ハンマー(汎用)':{cat:'Hammer',en:'Hammer(any)',falcon:false,metal:0,antiBlk:false,generic:true},
'ムチ(汎用)':{cat:'Whip',en:'Whip(any)',falcon:false,metal:0,antiBlk:false,generic:true},
};
const _WTYPE_T={Sword:1,Spear:2,Bow:3,Axe:4,Knife:5,Claw:6,Pole:7,Wand:8,Fan:10,Hammer:11,Whip:12};
const _WTYPE_GENERIC_BY_T={};
for(const _wjp in WEAPON_META){
const _wm=WEAPON_META[_wjp];
if(_wm.generic&&_WTYPE_T[_wm.cat]!==undefined)_WTYPE_GENERIC_BY_T[_WTYPE_T[_wm.cat]]={cat:_wm.cat,jp:_wjp};
}
function getWeaponTypeMultiplier(equip,monId){
if(!equip)return 1;
const wm=WEAPON_META[equip];
const mon=getMonDB(monId);
return(wm&&mon&&_WTYPE_T[wm.cat]===mon.t)?1.1:1;
}
function getRankOrderValue(r){return r==='gold'?2:r==='orange'?1:0;}
function binarySearchMinTrue(lo,hi,pred){
while(lo<hi){const m=(lo+hi)>>1;if(pred(m))hi=m;else lo=m+1;}
return lo;
}
function binarySearchMaxTrue(lo,hi,pred){
let cap=lo-1;
while(lo<=hi){const m=(lo+hi)>>1;if(pred(m)){cap=m;lo=m+1;}else hi=m-1;}
return cap;
}
const SKILL_IDX={};
const _SOLVER_SKILL_DATA={};
const _FOURCE_EL={};
const _FOURCE_EN={};
const _HIDEN_SKILLS=new Set();
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
if(s.weapon==='Armamentalist'&&s.en)_FOURCE_EN[s.jp]=s.en;
if(s.cat!=='spell'&&s.cat!=='item'){
const isGlad=s.weapon==='Gladiator';
const isAtkS=s.id===SK_ATK&&s.target==='S';
for(const cat of Object.keys(_WEAPON_SKILLS))if(s.weapon===cat||isGlad||isAtkS)_WEAPON_SKILLS[cat].add(s.jp);
}
}
const FOURCE_MAP=_FOURCE_EL;
function isHitBased(skill){
const t=skill.target;
return t==='S'||t==='RS'||t==='RG'||t==='RA';
}
function getHits(skill,hasDoubling){
if(!isHitBased(skill))return 1;
const dh=skill.fh||skill.kph;
const fixedRange=(skill.hitRange&&skill.hitRange.normalMin===skill.hitRange.max)?skill.hitRange.max:0;
const base=skill.hit||fixedRange||(dh?dh/2:1);
let hits=(hasDoubling&&!fixedRange)?(dh||base*2):base;
return hits;
}
function getEquipHitCount(sk,eq){
if(sk.fh)return(eq==='はやぶさの剣')?sk.fh:(sk.hit||Math.floor(sk.fh/2));
return sk.hit||1;
}
function buildSolverExactHitVariants(base,firstAT,diffAT,maxHits,minEarlyHits){
const H=Math.max(1,Math.floor(maxHits||1));
const full=Object.assign({},base,{at:firstAT+diffAT*(H-1),hits:H});
const out=[full];
for(let h=Math.max(1,Math.floor(minEarlyHits||1));h<H;h++){
out.push(Object.assign({},base,{
at:firstAT+diffAT*(h-1),hits:h,earlyKill:true,
note:(base.note||'')+`⚡${h}hit`
}));
}
return out;
}
const _SOLVER_ENTRIES=[
{id:SK_ATK,jp:'攻撃'},
{id:SK_ATK_ALL,jp:'攻撃 (全体)',en:'Attack(All)'},
{jp:'攻撃(毒針)',needle:true},
{jp:'しっぷうづき'},
{jp:'はやぶさ斬り'},
{jp:'メタル斬り'},
{jp:'とうこん討ち'},
{jp:'とうこん討ち(毒針)',needle:true},
{jp:'火ふき芸'},
{jp:'ビッグバン'},
{jp:'ドルマドン'},
{jp:'メラガイアー'},
{jp:'メラゾーマ'},
{jp:'メラ'},
{jp:'森羅万象斬'},
{jp:'さばきの杖'},
{jp:'なぎはらい'},
{id:SK_MERCY,jp:'みのがす'},
{jp:'ザラキーマ'},
{id:SK_EGG,jp:'おうえん'},
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
function lookupSkill(jp){return _SOLVER_SK[jp]||SKILL_IDX[jp];}
function lookupSkillData(jp){const rsk=_SOLVER_SK[jp];return rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[jp];}
function toMonsterHexId(monId){
if(!monId)return null;
if(typeof monId==='string')return monId.toUpperCase();
return monId.toString(16).toUpperCase().padStart(3,'0');
}
const _FOURCE_BONUS=1.1;
function calcPhysicalDamageRange(x,y,mul){
const ratio=x>0?y/x:999;
if(ratio>=2)return{min:0,max:1};
if(ratio>=1.75)return{min:0,max:Math.floor(x/16)};
const zBase=Math.floor(x/2)-Math.floor(y/4);
const z=Math.floor(Math.max(zBase,0)*(mul||1));
const eps=Math.floor(z/16)+1;
return{min:Math.max(0,z-eps),max:z+eps};
}
function applyElementMod(baseDmg,el,monId){
if(!el)return baseDmg;
const mon=MONSTER_DB[monId];
if(!mon)return baseDmg;
return Math.floor(baseDmg*mon.s[el]/100);
}
function applyElementAndFource(baseDmg,skill,monId,fourceEls){
if(skill.el)return applyElementMod(baseDmg,skill.el,monId);
if(!fourceEls||fourceEls.length===0)return baseDmg;
const mon=MONSTER_DB[monId];
if(!mon)return baseDmg;
let best=baseDmg;
for(const el of fourceEls){
const mod=Math.floor(applyElementMod(baseDmg,el,monId)*_FOURCE_BONUS);
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
function getDamageStat(statKey,stats){
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
if(!d)return null;
if(!d.m||d.b===d.m){return{min:d.b-d.s,max:d.b+d.s};}
const sv=getDamageStat(d.st,stats);
const clamped=Math.max(d.lo,Math.min(sv,d.hi));
const calcBase=d.b+Math.floor((clamped-d.lo)*(d.m-d.b)/(d.hi-d.lo));
return{min:calcBase-d.s,max:calcBase+d.s};
}
function calcSkillDamage(skill,stats,monId,fourceEls,wmul,metalEff){
const mon=MONSTER_DB[monId];
if(!mon)return null;
let base=calcBaseDmg(skill,stats);
if(!base)base=calcPhysicalDamageRange(Math.min(stats.atk||0,ST_CAP),mon.s[2],skill.mul);
let dMin=applyTypeMul(base.min,skill,monId);
let dMax=applyTypeMul(base.max,skill,monId);
if(wmul&&wmul!==1){dMin=Math.floor(dMin*wmul);dMax=Math.floor(dMax*wmul);}
dMin=applyElementAndFource(dMin,skill,monId,fourceEls);
dMax=applyElementAndFource(dMax,skill,monId,fourceEls);
dMin+=metalEff;dMax+=metalEff;
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
function calcMaxSkillDamage(jp,hexId,wmul,metalEff){
const sd=SKILL_IDX[jp];
const mon=getMonDB(hexId);
if(!sd||!mon)return 9999;
const tFactor=(sd.tmul&&sd.tmul[mon.t])||1;
const base=calcBaseDmg(sd,_EXT_STATS);
if(!base){
const phyMax=calcPhysicalDamageRange(ST_CAP,mon.s[2],sd.mul).max;
return Math.max(0,Math.floor(applyElementMod(phyMax,sd.el,hexId)*tFactor*(wmul||1))+(metalEff||0));
}
return Math.max(0,Math.floor(applyElementMod(base.max,sd.el,hexId)*tFactor*(wmul||1))+(metalEff||0));
}
const ST_CAP=999;
const VOC_STATS=[
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
{jp:'種ﾄﾞｰﾋﾟﾝｸﾞ',en:'Boosted',s:[ST_CAP,ST_CAP,ST_CAP,ST_CAP,ST_CAP,ST_CAP]},
];
const NEUTRAL_PARTY=()=>[0,1,2,3].map(i=>({
stats:{..._EXT_STATS},agi:4-i,lv:99,job:12,slot:i+1,
}));
function readCharStatsFromDom(){
if(!document.getElementById('si_useStats')?.checked)return NEUTRAL_PARTY();
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
const _EXT_STATS={atk:ST_CAP,might:ST_CAP,str:ST_CAP,mending:ST_CAP,deft:ST_CAP};
const _TENSION=[
{eggs:1,lv:5,mul:1.5},
{eggs:2,lv:20,mul:2.5},
{eggs:3,lv:50,mul:4.0},
];
const _TENSION_MULS=_TENSION.map(t=>t.mul);
const getTensionLevel=(mul)=>mul>=4?50:mul>=2.5?20:5;
const tensionStage=(mul)=>mul>=4?3:mul>=2.5?2:mul>1?1:0;
const tensionFlat=(mul,lv,isMetal)=>isMetal?0:tensionStage(mul)*(1+Math.floor((lv>0?lv:99)/10));
const applyTension=(dmg,mul,lv,isMetal)=>mul>1?Math.floor(dmg*mul)+tensionFlat(mul,lv,isMetal):dmg;
const isMetalHex=(hex)=>_METAL_MONSTERS.has(toMonsterHexId(hex));
const getMonDB=(hex)=>MONSTER_DB[hex];
const getFourceEls=(jp)=>_FOURCE_EL[jp]||null;
const findInlineFource=(combo)=>combo.find(v=>v.at===0&&getFourceEls(v.jp))||null;
const maxCharLv=(chars)=>(chars&&chars.length)?Math.max.apply(null,chars.map(c=>(c&&c.lv)||99)):99;
function actorAt(chars,assign,ci){
if(!chars)return undefined;
return chars[assign?assign[ci]:(chars.length?ci%chars.length:ci)];
}
function actorLv(chars,assign,ci){
const c=actorAt(chars,assign,ci);
return(c&&c.lv)?c.lv:maxCharLv(chars);
}
const _ACT_EGG={id:SK_EGG,jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0};
const _ACT_MERCY={id:SK_MERCY,jp:'みのがす',en:'Mercy',at:0,equip:'',note:'',hits:0};
const _ACT_ISSEN={id:SK_ISSEN,jp:'一閃づき',en:'Thunder Thrust',at:14,equip:'',note:'',hits:1};
const makeEggOnPrefix=(n)=>Array(n).fill(_ACT_EGG);
const makeFourceAction=(f)=>({jp:f.jp,en:f.en||f.jp,at:0,equip:'',note:'',hits:0});
function pickBestFource(hexId){
const mon=getMonDB(hexId);
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
function isMultiTargetOnly(combo){
const counts={};
for(const v of combo){
if(v.id===SK_EGG||_HIDEN_SKILLS.has(v.jp)){
counts[v.jp]=(counts[v.jp]||0)+1;
if(counts[v.jp]>=2)return true;
}
}
return false;
}
const _METAL_MONSTERS=new Set(['01B','04C','04D','0B5','0B9','0F2']);
const _WEAPON_METAL_SHORT={'メタスラ':1};
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
function getWeaponMetalFlag(eq){
if(eq==null||eq===''||eq==='miss')return 0;
if(eq in _WEAPON_METAL_SHORT)return _WEAPON_METAL_SHORT[eq];
return(WEAPON_META[eq]&&WEAPON_META[eq].metal)?1:0;
}
function canExecuteMetal(actionId,hexId){
if(actionId!==SK_ISSEN)return null;
return{isValid:isMetalHex(hexId)};
}
function actionMetalEff(sk,eq){return((sk&&sk.metal)||getWeaponMetalFlag(eq))?1:0;}
function getMetalChipMaxDamage(jp,eq){
const sk=SKILL_IDX[jp]||null;
if(!sk)return 0;
return metalChipPerHit(sk,eq).max*getEquipHitCount(sk,eq);
}
function canMetalChipsKill(comboPads,metalHPs){
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
function solveMetalCombo(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads){
if(hexId&&!isMetalHex(hexId)){
return[];
}
metalCount=metalCount||monCount;
const issenAT=14;
const totalIssenAT=issenAT*metalCount;
if(bat<totalIssenAT)return[];
if(metalCount>maxSlots)return[];
const remaining=bat-totalIssenAT;
const issenTail=Array(metalCount).fill(_ACT_ISSEN);
if(remaining===0)return[issenTail.slice()];
const mkPads=(excl)=>_METAL_PADDING
.map(([jp,en,at,eq,note])=>{
const sk=SKILL_IDX[jp]||null;
return{id:sk&&sk.id,jp,en,at,equip:eq,note,hits:sk?getEquipHitCount(sk,eq):1,
mdmg:(eq==='miss'?0:getMetalChipMaxDamage(jp,eq))};
})
.filter(p=>p.equip==='miss'||p.at===0||p.mdmg>0)
.filter(p=>!excl||!excl.has(p.jp))
.sort((a,b)=>b.at-a.at);
const pads=mkPads(excludedPads);
const _relax=(relaxPads&&relaxPads!==excludedPads)?relaxPads:null;
const padsRelax=_relax?mkPads(_relax):null;
const unlocked=_relax&&excludedPads?new Set([...excludedPads].filter(jp=>!_relax.has(jp))):null;
const MAX=3;
const padSlots=maxSlots-metalCount;
function dfs(pool,startIdx,rem,combo,out,slots,head,needUnlocked){
if(out.length>=MAX)return;
if(rem===0){
if(needUnlocked&&!combo.some(p=>unlocked.has(p.jp)))return;
if(canMetalChipsKill([...head,...combo],metalHPs))out.push([...head,...combo,...issenTail]);
return;
}
if(rem<0||combo.length>=slots)return;
for(let i=startIdx;i<pool.length;i++){
if(pool[i].at===0&&rem>0&&combo.length>=slots-1)continue;
if(pool[i].at>rem)continue;
combo.push(pool[i]);
dfs(pool,i,rem-pool[i].at,combo,out,slots,head,needUnlocked);
combo.pop();
}
}
const results=[];
dfs(pads,0,remaining,[],results,padSlots,[],false);
results.sort((a,b)=>a.length-b.length);
const relaxRes=[];
if(padsRelax){
dfs(padsRelax,0,remaining,[],relaxRes,padSlots,[],true);
relaxRes.sort((a,b)=>a.length-b.length);
}
const supRes=[];
if(supPads&&supPads.length&&padSlots>=1){
for(const sp of supPads){
if(sp.at>remaining)continue;
dfs(padsRelax||pads,0,remaining-sp.at,[],supRes,padSlots-1,[sp],false);
if(supRes.length>=MAX)break;
}
supRes.sort((a,b)=>a.length-b.length);
}
return results.concat(relaxRes,supRes);
}
let _solverGroupCounts=null;
let _solverFieldTotal=null;
let _solverIssenNeed=0;
let _solverUseStats=true;
function withSolverBuildContext(spec,run){
const prev=[_solverGroupCounts,_solverFieldTotal,_solverIssenNeed,_solverUseStats];
_solverGroupCounts=spec.groupCounts?spec.groupCounts.slice():null;
_solverFieldTotal=spec.fieldTotal;_solverIssenNeed=spec.metalSupNeed||0;
_solverUseStats=spec.useStats!==false;
try{return run();}
finally{[_solverGroupCounts,_solverFieldTotal,_solverIssenNeed,_solverUseStats]=prev;}
}
function solverAllowsRound2(mapDeft,canRound2){
return canRound2===undefined?mapDeft<1000:!!canRound2;
}
function solverActionSkeletonKey(v){
return[v.jp,v.at||0,v.equip||'',SolverActionGate.hits(v),
v.earlyKill?1:0,v.needle?1:0].join('\x1f');
}
function solverComboActionSignature(combo){
return(combo||[]).map(v=>[
v.jp,v.at||0,v.equip||'',v.note||'',SolverActionGate.hits(v),v.earlyKill?1:0,
v.aoeK!==undefined?v.aoeK:'',v.soloGroup?1:0,v.needle?1:0,v.needDeath0?1:0
].join('\x1f')).join('\x1e');
}
function deriveSolverBattlePlan(monGroups,monId,mercyLv,forceKillAll){
const T=(monGroups||[]).reduce((s,g)=>s+(g.count||1),0);
const tc2=Math.floor(T/2);
const hexId=toMonsterHexId(monId);
const isMetal=isMetalHex(hexId);
const mainGroup=monGroups&&monGroups[0];
const sups=(monGroups||[]).filter(g=>!g.isMain);
mercyLv=mercyLv>0?mercyLv:99;
const effectiveDeath=(g)=>{
if(!g||!(g.death>0))return 0;
const m=getMonDB(g.hex);
return(m&&m.s&&(m.s[13]+7)>mercyLv)?0:g.death;
};
const metalSupCount=!isMetal
?sups.reduce((s,g)=>s+((g.count>0&&g.hex&&isMetalHex(g.hex))?g.count:0),0):0;
let planType='kill_all',postAlive=T;
if(!forceKillAll&&T>1&&mainGroup){
const d0SC=sups.filter(g=>effectiveDeath(g)===0).reduce((s,g)=>s+g.count,0);
const dG0SC=sups.filter(g=>effectiveDeath(g)>0).reduce((s,g)=>s+g.count,0);
if(effectiveDeath(mainGroup)===0&&dG0SC>0){
if(metalSupCount>0){
planType='kill_mercy_clear';postAlive=d0SC+(mainGroup.count-1);
}else{
planType='mercy_first';postAlive=mainGroup.count+d0SC;
}
}else if(effectiveDeath(mainGroup)>0&&(mainGroup.count>=2||dG0SC>0)){
planType='kill_mercy_clear';postAlive=d0SC;
}
}
if(forceKillAll){planType='kill_all';postAlive=0;}
return{T,tc2,hexId,isMetal,mainGroup,sups,metalSupCount,planType,postAlive,effectiveDeath};
}
function expandSolverCombos(monCount,protectedSups,hexId,fieldShape){
const groupCounts=fieldShape&&Object.prototype.hasOwnProperty.call(fieldShape,'groupCounts')
?fieldShape.groupCounts:_solverGroupCounts;
const fieldTotal=fieldShape&&Object.prototype.hasOwnProperty.call(fieldShape,'fieldTotal')
?fieldShape.fieldTotal:_solverFieldTotal;
const variants=[];
for(const e of _SOLVER_ENTRIES){
const sk=SKILL_IDX[e.alias||e.jp];
if(!sk)continue;
if(protectedSups&&protectedSups.length&&sk.target!=='S'){
let couldKillSup=false;
for(const supHex of protectedSups){
const supMon=MONSTER_DB[supHex];
if(supMon&&calcMaxSkillDamage(e.alias||e.jp,supHex)>=supMon.s[0]){couldKillSup=true;break;}
}
if(couldKillSup)continue;
}
const first=sk.at[0];
const diff=e.diff!==undefined?e.diff:sk.at[1];
const en=e.en||sk.en;
if(sk.target==='RS'||sk.target==='RG'||sk.target==='RA'){
if(monCount>1)continue;
const hr=sk.hitRange;
if(hr&&hr.normalMin!==hr.max){
for(let h=1;h<hr.normalMin;h++){
const earlyAT=first+diff*Math.max(0,h-1);
variants.push({id:e.id,jp:e.jp,en,at:earlyAT,equip:'',note:`⚡${h}hit`,hits:h,earlyKill:true});
}
continue;
}
}
const isGA=!!e.ga;
if(e.id===SK_ATK_ALL&&monCount<=1)continue;
const isMulti=isGA||sk.target==='A'||sk.target==='G';
const hitBased=!isMulti&&isHitBased(sk);
const baseHits=hitBased?getHits(sk,false):0;
if(isMulti){
if(diff===0){
if(sk.target==='G'&&groupCounts){
for(let gi=0;gi<groupCounts.length;gi++){
if(!(groupCounts[gi]>0))continue;
variants.push({id:e.id,jp:e.jp,en,at:first,equip:'',note:'',hits:0,tgtGroup:gi});
}
}else{
variants.push({id:e.id,jp:e.jp,en,at:first,equip:'',note:'',hits:0});
}
}else if(sk.target==='G'&&groupCounts){
for(let gi=0;gi<groupCounts.length;gi++){
for(let k=1;k<=groupCounts[gi];k++){
variants.push({id:e.id,jp:e.jp,en,at:first+diff*(k-1),equip:'',note:'',hits:0,aoeK:k,tgtGroup:gi});
}
}
}else{
const kMaxA=(typeof fieldTotal==='number'&&fieldTotal>0)?fieldTotal:monCount;
for(let k=1;k<=kMaxA;k++){
if(e.id===SK_ATK_ALL&&k<=1)continue;
variants.push({id:e.id,jp:e.jp,en,at:first+diff*(k-1),equip:'',note:'',hits:0,aoeK:k});
}
}
}else{
const n=hitBased?baseHits:(sk.hit||1);
const baseVariant={id:e.id,jp:e.jp,en,equip:e.needle?'どくばり':'',note:e.needle?'🪡':'',
soloGroup:e.soloGroup,needle:e.needle,needDeath0:e.needle};
if(hitBased)variants.push(...buildSolverExactHitVariants(baseVariant,first,diff,n));
else variants.push(Object.assign({},baseVariant,{at:first+diff*Math.max(0,n-1),hits:0}));
if(hitBased){
if(sk.fh){
const fHits=getHits(sk,true);
if(fHits>baseHits){
variants.push(...buildSolverExactHitVariants({id:e.id,jp:e.jp,en,equip:'はやぶさの剣',note:'⚔'},first,diff,fHits,baseHits+1));
}
}else if(sk.kph){
const kHits=getHits(sk,true);
if(kHits>baseHits){
variants.push(...buildSolverExactHitVariants({id:e.id,jp:e.jp,en,equip:'キラーピアス',note:'💍',needDeath0:true},first,diff,kHits,baseHits+1));
}
}
}
}
}
if(_solverIssenNeed>0)variants.unshift(_ACT_ISSEN);
return variants;
}
const _AB_WEAPONS=[['風林火山','🌀'],['きしんのまそう','🔱']];
function getSkillEquipOpts(jp,mon,hexId){
const sd=lookupSkillData(jp);
const sk=lookupSkill(jp);
const opts=[];
if(sd&&sk&&!sk.dmg&&!sk.fixedDmg){
const g=mon?_WTYPE_GENERIC_BY_T[mon.t]:null;
if(g&&_WEAPON_SKILLS[g.cat]&&_WEAPON_SKILLS[g.cat].has(jp))
opts.push({equip:g.jp,note:'🎯'});
}
if(sd&&sd.blk===1){
const hasBlk=!!(mon&&mon.s[4]>0);
const isMetal=hexId?isMetalHex(hexId):false;
for(const[eq,note]of _AB_WEAPONS){
const meta=WEAPON_META[eq];
if(!hasBlk&&!(isMetal&&meta.metal))continue;
if(_WEAPON_SKILLS[meta.cat]&&_WEAPON_SKILLS[meta.cat].has(jp))
opts.push({equip:eq,note});
}
}
return opts;
}
function expandComboEquipVariants(combos,hexId){
if(!hexId)return combos;
const mon=getMonDB(hexId);
if(!mon)return combos;
const cache={};
const getOpts=(jp)=>{
if(cache[jp]===undefined){
const opts=getSkillEquipOpts(jp,mon,hexId);
cache[jp]=opts.length?opts:null;
}
return cache[jp];
};
const result=[];
for(const combo of combos){
result.push(combo);
const exp=[];
for(let i=0;i<combo.length;i++){
const v=combo[i];
if(v.at===0||v.equip||v.needle){exp.push(null);continue;}
exp.push(getOpts(v.alias||v.jp));
}
if(exp.every(e=>!e))continue;
const choices=exp.map((opts,i)=>opts?[{equip:'',note:''},...opts]:[null]);
const enumerate=(k,cur)=>{
if(k===combo.length){
if(cur.every(c=>c===null||c.equip===''))return;
const nc=combo.slice();
for(let j=0;j<cur.length;j++){
if(cur[j]&&cur[j].equip)nc[j]=Object.assign({},combo[j],cur[j]);
}
const sorted=sortComboByPriority(nc);
if(sorted.some((v,i)=>v!==nc[i])
&&(isMetalHex(hexId)||nc.some(isMetalExecutionAction)))return;
result.push(sorted);
return;
}
for(const opt of choices[k]){cur.push(opt);enumerate(k+1,cur);cur.pop();}
};
enumerate(0,[]);
}
return result;
}
function isSolverATReachable(variants,target,maxSlots,minSlots){
minSlots=Math.max(1,minSlots||1);
if(!(target>0)||!(maxSlots>0))return false;
const depths=solverATReachableDepths(variants,target,maxSlots,minSlots);
for(let slot=minSlots;slot<=maxSlots;slot++)if(depths[slot])return true;
return false;
}
function solverATReachableDepths(variants,target,maxSlots,stopAtReachableFrom){
const reachable=new Uint8Array(maxSlots+1);
if(!(target>0)||!(maxSlots>0))return reachable;
const atValues=[...new Set((variants||[]).map(v=>v.at||0)
.filter(at=>at>0&&at<=target))];
if(atValues.length===0)return reachable;
const maxAT=Math.max(...atValues);
if(target>maxAT*maxSlots)return reachable;
let prev=new Uint8Array(target+1);
prev[0]=1;
for(let slot=1;slot<=maxSlots;slot++){
const next=new Uint8Array(target+1);
for(let sum=0;sum<=target;sum++){
if(!prev[sum])continue;
for(const at of atValues){
const n=sum+at;
if(n<=target)next[n]=1;
}
}
reachable[slot]=next[target];
if(stopAtReachableFrom!==undefined&&slot>=stopAtReachableFrom&&reachable[slot])break;
prev=next;
}
return reachable;
}
function isSolverATReachableAtDepth(variants,target,depth){
if(!(target>0)||!(depth>0))return false;
return!!solverATReachableDepths(variants,target,depth)[depth];
}
function buildSolverATSearch(variants){
const n=variants.length;
const min=new Int32Array(n+1),max=new Int32Array(n+1);
min[n]=0x7fffffff;max[n]=-0x7fffffff;
for(let i=n-1;i>=0;i--){
const at=variants[i].at;
min[i]=at>0&&at<min[i+1]?at:min[i+1];
max[i]=at>0&&at>max[i+1]?at:max[i+1];
}
return{variants,min,max};
}
function walkSolverATCombos(search,target,depth,visit,stop,rootIdx){
const{variants,min,max}=search;
const dfs=(start,remaining,combo)=>{
if(stop())return;
if(remaining===0&&combo.length===depth){visit(combo);return;}
if(remaining<=0||combo.length>=depth)return;
const slots=depth-combo.length-1;
for(let i=start;i<variants.length;i++){
const v=variants[i];
if(!(v.at>0)||v.at>remaining)continue;
const rem=remaining-v.at;
if(slots===0){if(rem!==0)continue;}
else if(rem<min[i]*slots||rem>max[i]*slots)continue;
combo.push(v);dfs(i,rem,combo);combo.pop();
if(stop())return;
}
};
if(rootIdx===undefined)dfs(0,target,[]);
else{
const root=variants[rootIdx];
if(root&&root.at>0&&root.at<=target&&depth>=1)
dfs(rootIdx,target-root.at,[root]);
}
}
function findUniqueSolverATCombo(variants,target,minSlots,maxSlots){
minSlots=Math.max(1,minSlots||1);
maxSlots=Math.max(minSlots,maxSlots||minSlots);
if(!(target>0))return null;
const seen=new Set(),items=[];
for(const v of(variants||[])){
if(!(v.at>0)||v.at>target)continue;
const key=solverActionSkeletonKey(v);
if(!seen.has(key)){seen.add(key);items.push(v);}
}
const width=target+1;
const count=new Uint8Array((maxSlots+1)*width);
const path=new Array((maxSlots+1)*width);
count[0]=1;path[0]=[];
for(const item of items){
const at=item.at;
for(let k=1;k<=maxSlots;k++){
for(let sum=at;sum<=target;sum++){
const src=(k-1)*width+sum-at;
const ways=count[src];
if(!ways)continue;
const dst=k*width+sum;
const old=count[dst];
count[dst]=Math.min(2,old+ways);
if(old===0&&ways===1&&path[src])path[dst]=path[src].concat(item);
else path[dst]=null;
}
}
}
let total=0,unique=null;
for(let k=minSlots;k<=maxSlots;k++){
const idx=k*width+target;
if(!count[idx])continue;
if(count[idx]===1&&total===0)unique=path[idx];
else unique=null;
total=Math.min(2,total+count[idx]);
}
return total===1?unique:null;
}
function getUniqueSolverSkeleton(combos){
const byKey=new Map();
for(const combo of(combos||[])){
const tokens=combo.map(solverActionSkeletonKey).sort();
const key=tokens.join('\x1e');
if(!byKey.has(key))byKey.set(key,combo);
if(byKey.size>1)return null;
}
return byKey.size===1?byKey.values().next().value:null;
}
function solveBattleCombo(bat,monCount,maxSlots,protectedSups,hexId,fieldShape){
if(bat<=0)return[];
const variants=expandSolverCombos(monCount,protectedSups,hexId,fieldShape);
if(!isSolverATReachable(variants,bat,maxSlots))return[];
const results=[];
const _mon=hexId?getMonDB(hexId):null;
const useScreen=!!(_mon&&monCount<=1);
const _bf=useScreen?pickBestFource(hexId):null;
const _bfEls=_bf?getFourceEls(_bf.jp):null;
let raw=0;const RAW_CAP=6000;
const _scoreOne=(combo)=>{
const r1=getRankOrderValue(checkSolverDamage(combo,hexId,_mon,null,1,null,{},undefined));
if(r1===2)return 9*10000;
const rf=_bfEls?getRankOrderValue(checkSolverDamage(combo,hexId,_mon,null,1,_bfEls,{},undefined)):0;
if(rf===2)return 7*10000;
const q1=calcSolverMinStat(combo,hexId,1,null);
if(q1)return 5*10000-Math.min(q1.min,9999);
if(r1===1)return 4*10000+5000;
const qf=_bf?calcSolverMinStat(combo,hexId,1,_bf):null;
if(qf)return 4*10000-Math.min(qf.min,9999);
if(rf===1)return 3*10000+5000;
for(const T of _TENSION_MULS){
if(checkSolverDamage(combo,hexId,_mon,null,T,null,{},undefined)||(_bfEls&&checkSolverDamage(combo,hexId,_mon,null,T,_bfEls,{},undefined)))return 3*10000;
const qt=calcSolverMinStat(combo,hexId,T,null);
if(qt)return 2*10000-Math.min(qt.min,9999);
const qtf=_bf?calcSolverMinStat(combo,hexId,T,_bf):null;
if(qtf)return 1*10000-Math.min(qtf.min,9999);
}
return 0;
};
const _bestEquipCache={};
const _bestEquip=(jp)=>{
if(_bestEquipCache[jp]===undefined)
_bestEquipCache[jp]=getSkillEquipOpts(jp,_mon,hexId)[0]||null;
return _bestEquipCache[jp];
};
const score=(combo)=>{
let best=_scoreOne(combo);
if(best>=9*10000)return best;
const equipped=combo.map(v=>{
if(v.at===0||v.equip||v.needle)return v;
const eq=_bestEquip(v.alias||v.jp);
return eq?Object.assign({},v,eq):v;
});
if(equipped.some((v,i)=>v!==combo[i])){
const s=_scoreOne(equipped);
if(s>best)best=s;
}
return best;
};
const search=buildSolverATSearch(variants);
for(let depth=1;depth<=maxSlots;depth++){
const sink=[];
walkSolverATCombos(search,bat,depth,combo=>{
raw++;
const sc=useScreen?score(combo):0;
if(!useScreen||sc>0||!_solverUseStats)sink.push({c:combo.slice(),sc,ord:sink.length});
},()=>(!useScreen&&sink.length>=30)||raw>=RAW_CAP);
if(useScreen)sink.sort((a,b)=>(b.sc-a.sc)||(a.ord-b.ord));
for(const s of sink)results.push(s.c);
}
return results;
}
function solveMetalComboOrders(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads,phaseBGroupCounts){
const last=solveMetalCombo(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads);
if(!isMetalHex(hexId))return last;
const mc=metalCount||monCount;
const nonMetalCount=monCount-mc;
if(!(nonMetalCount>0))return last;
const rem=bat-14*mc,slots=maxSlots-mc;
if(!(rem>0)||slots<1)return last;
const issenMF={..._ACT_ISSEN,metalFirst:true,orderVariant:true};
const head=Array(mc).fill(issenMF);
const phaseCounts=Array.isArray(phaseBGroupCounts)
?phaseBGroupCounts
:(_solverGroupCounts?_solverGroupCounts.map((n,gi)=>gi===0?0:n):null);
const phaseShape={groupCounts:phaseCounts,fieldTotal:nonMetalCount};
const first=[];
for(const c of solveBattleCombo(rem,nonMetalCount,slots,[],null,phaseShape)){
if(c.some(v=>_actionPri(v)>0))continue;
if(c.some(isMetalExecutionAction))continue;
first.push([...head,...c]);
}
return last.concat(first);
}
function expandMetalRetarget(combos,killTargets,hexId){
if(!combos.length||!killTargets||killTargets.length<2)return combos;
const cand=[];
for(let gi=1;gi<killTargets.length;gi++){
const hx=toMonsterHexId(killTargets[gi].hex);
if(isMetalHex(hx))continue;
const m=MONSTER_DB[hx];
if(m)cand.push({gi,evade:m.s[3],block:m.s[4],death:killTargets[gi].death});
}
if(!cand.length)return combos;
const out=[];
for(const combo of combos){
const mercyAt=combo.findIndex(v=>v.id===SK_MERCY);
const lastExec=findLastMetalExecutionIndex(combo);
const slots=[],sks=[],phaseB=[];
for(let i=0;i<combo.length;i++){
const v=combo[i];
if(!(v.at>0)||v.supTarget||v.tgtGroup!==undefined)continue;
if(canExecuteMetal(v.id,hexId))continue;
const sk=lookupSkill(v.jp);
if(!sk||sk.target!=='S')continue;
const pb=i>lastExec;
if(!pb)continue;
slots.push(i);sks.push(sk);phaseB.push(pb);
}
if(!slots.length||slots.length>4)continue;
const opts=slots.map((si,k)=>{
const ok=cand.filter(c=>(!sks[k].ev||c.evade===0)&&(!sks[k].blk||c.block===0)
&&!(c.death>0&&mercyAt>=0&&si>mercyAt));
return phaseB[k]?ok:[null].concat(ok);
});
const total=opts.reduce((a,o)=>a*o.length,1);
const skip0=!phaseB.some(Boolean);
for(let n=skip0?1:0;n<total;n++){
let x=n;const nc=combo.slice();
for(let k=0;k<slots.length;k++){
const o=opts[k],pick=o[x%o.length];x=Math.floor(x/o.length);
if(!pick)continue;
const v=combo[slots[k]];
nc[slots[k]]=phaseB[k]
?Object.assign({},v,{tgtGroup:pick.gi})
:Object.assign({},v,{tgtGroup:pick.gi,supTarget:true,retarget:true,
note:(v.note||'')+'👉',
mdmg:0});
}
out.push(nc);
}
}
return combos.concat(out);
}
function makeKmcBuildSpec(bat,T,postAlive,tc2,canRound2,hexId,metalSupNeed){
const phaseAVars=expandSolverCombos(T,[]);
const sSkills=phaseAVars.filter(v=>{
if(metalSupNeed>0&&isMetalExecutionAction(v))return false;
const sk=lookupSkill(v.jp);
return sk&&(sk.target==='S'||sk.target==='RS')&&v.at>0&&v.at<=bat;
});
const kmcFource=(!isMetalHex(hexId)&&hexId)?pickBestFource(hexId):null;
const spaces=[{key:'r1',target:bat,loLen:1,hiLen:4,cap:30}];
if(canRound2){
spaces.push({key:'r2a',target:bat,loLen:5,hiLen:8,cap:14});
if(tc2>0)spaces.push({key:'r2b',target:bat-tc2,loLen:5,hiLen:8,cap:14});
}
return{bat,T,postAlive,tc2,canRound2:!!canRound2,hexId,
metalSupNeed,sSkills,kmcFourceAction:kmcFource?makeFourceAction(kmcFource):null,
groupCounts:_solverGroupCounts?_solverGroupCounts.slice():null,
fieldTotal:_solverFieldTotal,useStats:_solverUseStats,spaces};
}
function buildKmcRootSpace(spec,space,rootIdx){
const res=[],sSkills=spec.sSkills||[];
const root=sSkills[rootIdx];
if(!root||root.at>space.target)return res;
const pushV=(arr)=>{
if(arr.length>=space.loLen&&arr.length<=space.hiLen&&res.length<space.cap)res.push(arr);
};
const dfsA=(start,seqA,aSum)=>{
if(res.length>=space.cap)return;
if(aSum>0){
if(spec.postAlive===0){
if(aSum===space.target){
pushV([...seqA,_ACT_MERCY]);
pushV([_ACT_EGG,...seqA,_ACT_MERCY]);
if(spec.kmcFourceAction)pushV([spec.kmcFourceAction,...seqA,_ACT_MERCY]);
}
}else{
const bTgt=space.target-aSum;
if(bTgt>0){
const maxLenB=space.hiLen-seqA.length-1;
if(maxLenB>=1){
const bCombos=solveBattleCombo(bTgt,spec.postAlive,maxLenB,[]);
for(const b of bCombos){
pushV([...seqA,_ACT_MERCY,...b]);
pushV([_ACT_EGG,...seqA,_ACT_MERCY,...b]);
pushV([...seqA,_ACT_MERCY,_ACT_EGG,...b]);
if(spec.kmcFourceAction){
pushV([spec.kmcFourceAction,...seqA,_ACT_MERCY,...b]);
pushV([...seqA,_ACT_MERCY,spec.kmcFourceAction,...b]);
}
if(res.length>=space.cap)break;
}
}
}
}
}
if(seqA.length>=space.hiLen-1)return;
for(let i=start;i<sSkills.length;i++){
if(aSum+sSkills[i].at>space.target)continue;
seqA.push(sSkills[i]);
dfsA(i,seqA,aSum+sSkills[i].at);
seqA.pop();
if(res.length>=space.cap)return;
}
};
dfsA(rootIdx,[root],root.at);
return res;
}
function buildSolverShardPayload(spec,roots,buildRows){
return withSolverBuildContext(spec,()=>{
const buckets={};
for(const space of spec.spaces)buckets[space.key]=[];
for(const root of roots)for(const space of spec.spaces)
buckets[space.key].push(...buildRows(space,root));
return{buckets};
});
}
function mergeSolverShardPayloads(spec,payloads){
const merged={};
for(const space of spec.spaces){
const rows=[];
for(const p of payloads||[]){
const part=p&&p.buckets&&p.buckets[space.key];
if(part)rows.push(...part);
}
rows.sort((a,b)=>(space.depths?a.depth-b.depth:0)||(a.root-b.root));
const out=[];
for(const depth of space.depths||[null]){
let kept=0;
for(const row of rows){
if(depth!==null&&row.depth!==depth)continue;
for(const combo of row.combos||[]){
if(kept>=space.cap)break;
out.push(combo);kept++;
}
if(kept>=space.cap)break;
}
}
merged[space.key]=out;
}
return merged;
}
function buildKmcShardPayload(spec,roots){
return buildSolverShardPayload(spec,roots,(space,root)=>
[{root,combos:buildKmcRootSpace(spec,space,root)}]);
}
function mergeKmcShardPayloads(spec,payloads){return mergeSolverShardPayloads(spec,payloads);}
function buildKmcSerialPayload(spec){
const roots=spec.sSkills.map((_,i)=>i);
return mergeKmcShardPayloads(spec,[buildKmcShardPayload(spec,roots)]);
}
function makeKillAllBuildSpec(bat,T,tc2,canRound2,hexId,metalSupNeed,stage){
const variants=expandSolverCombos(T,[],hexId);
const spaces=[];
const byTarget=new Map();
const reachable=(target,depths)=>{
if(!byTarget.has(target))byTarget.set(target,solverATReachableDepths(variants,target,canRound2?8:4));
return depths.filter(d=>byTarget.get(target)[d]);
};
if(stage!=='r2')spaces.push({key:'r1',target:bat,depths:reachable(bat,[1,2,3,4]),cap:30});
if(stage!=='r1'&&canRound2){
spaces.push({key:'r2a',target:bat,depths:reachable(bat,[5,6,7,8]),cap:30});
if(tc2>0)spaces.push({key:'r2b',target:bat-tc2,depths:reachable(bat-tc2,[5,6,7,8]),cap:30});
}
return{bat,T,tc2,canRound2:!!canRound2,hexId,metalSupNeed,variants,
groupCounts:_solverGroupCounts?_solverGroupCounts.slice():null,
fieldTotal:_solverFieldTotal,useStats:_solverUseStats,spaces};
}
function buildKillAllRootDepth(spec,space,depth,rootIdx,search){
const res=[];
walkSolverATCombos(search||buildSolverATSearch(spec.variants||[]),space.target,depth,
combo=>res.push(combo.slice()),()=>res.length>=space.cap,rootIdx);
return res;
}
function buildKillAllShardPayload(spec,roots){
const search=buildSolverATSearch(spec.variants||[]);
return buildSolverShardPayload(spec,roots,(space,root)=>space.depths.map(depth=>
({depth,root,combos:buildKillAllRootDepth(spec,space,depth,root,search)})));
}
function mergeKillAllShardPayloads(spec,payloads){return mergeSolverShardPayloads(spec,payloads);}
function buildKillAllSerialPayload(spec){
const roots=spec.variants.map((_,i)=>i);
return mergeKillAllShardPayloads(spec,[buildKillAllShardPayload(spec,roots)]);
}
function prepareParallelSolverSpec(render,options,kind,stage){
if(!render||!(render.bat>0)||!render.monGroups||!render.monGroups.length)return null;
const monGroups=render.monGroups;
const canRound2=solverAllowsRound2(render.mapDeft,render.canRound2);
const chars=options&&options.chars||[];
const mercyLv=chars.length?Math.max(...chars.map(c=>c.lv||99)):99;
const plan=deriveSolverBattlePlan(monGroups,render.monId,mercyLv,false);
const{T,tc2,hexId,metalSupCount:metalSupNeed}=plan;
return withSolverBuildContext({groupCounts:monGroups.map(g=>g.count||1),fieldTotal:T,
metalSupNeed,useStats:!(options&&options.useStats===false)},()=>{
if(kind==='kmc'){
if(plan.planType!=='kill_mercy_clear')return null;
return makeKmcBuildSpec(render.bat,T,plan.postAlive,tc2,canRound2,hexId,metalSupNeed);
}
if(kind==='killAll'){
if(T<=1||isMetalHex(hexId))return null;
return makeKillAllBuildSpec(render.bat,T,tc2,canRound2,hexId,metalSupNeed,stage);
}
return{plan};
});
}
function findLargestGroup(list,gik){
const groups={};
for(const inst of list)(groups[inst[gik]]=groups[inst[gik]]||[]).push(inst);
let best=null,bestLen=0;
for(const g in groups){if(groups[g].length>bestLen){bestLen=groups[g].length;best=groups[g];}}
return best||[];
}
const _METAL_ACTION_KEYS=new Set(_METAL_PADDING
.filter(row=>row[2]>0)
.map(row=>row[0]+'\x1f'+row[2]+'\x1f'+row[3]));
function isMetalActionSkill(action,sk){
if(!action||action.supTarget||!(action.at>0))return false;
if(action.id===SK_ISSEN)return action.at===_ACT_ISSEN.at;
return _METAL_ACTION_KEYS.has(action.jp+'\x1f'+action.at+'\x1f'+(action.equip||''));
}
function isMetalExecutionAction(action){
return!!action&&action.id===SK_ISSEN;
}
function buildSimInstances(targets){
const sim=[];
for(let ti=0;ti<targets.length;ti++){
const t=targets[ti];
const m=getMonDB(t.hex);
const hp=m?m.s[0]:9999;
for(let k=0;k<(t.count||1);k++)
sim.push({hex:t.hex,hp,hpLow:Math.floor(hp*0.8),alive:true,
death:t.death!==undefined?t.death:(m?m.s[12]:100),groupIdx:ti});
}
return sim;
}
function metalExecuteInst(inst){
inst.hp=0;if('hpLow'in inst)inst.hpLow=0;inst.alive=false;
return inst.groupIdx===0;
}
function metalChipPerHit(sk,equip){
if(sk.el>0)return{min:0,max:0};
if(actionMetalEff(sk,equip))return{min:1,max:2};
return!sk.dmg&&!sk.fixedDmg?{min:0,max:1}:{min:0,max:0};
}
function skillDamagePerHit(sk,action,hex,stats,fourceEls,wmulOverride){
if(isMetalHex(hex)){
const mc=metalChipPerHit(sk,action.equip);
return{min:mc.min,max:mc.max,metal:true};
}
const wm=wmulOverride!==undefined?wmulOverride:getWeaponTypeMultiplier(action.equip,hex);
const r=calcSkillDamage(sk,stats,hex,fourceEls||null,wm,actionMetalEff(sk,action.equip));
return r?{min:r.min,max:r.max,metal:false}
:{min:0,max:0,metal:false,none:true};
}
const SolverActionGate=Object.freeze({
hits(action){return action&&action.hits>0?Math.floor(action.hits):1;},
targetKind(sk){
if(!sk)return null;
return(sk.target==='A'||sk.target==='RA')?'A'
:(sk.target==='G'||sk.target==='RG')?'G':'S';
},
targets(alive,action,sk,groupKey){
groupKey=groupKey||'groupIdx';
if(sk.target&&sk.target.charAt(0)==='R'&&alive.length!==1){
return{targets:[],reason:'randomTarget'};
}
const tgt=this.targetKind(sk);
const ordered=alive.slice().sort((a,b)=>b.hp-a.hp);
const metalAction=isMetalActionSkill(action,sk);
const mainMetalAlive=alive.some(x=>x[groupKey]===0&&isMetalHex(x.hex));
const finish=(targets)=>{
if(!targets.length)return{targets:[],reason:'tgtdead'};
const hitsMetal=targets.some(x=>isMetalHex(x.hex));
const hitsNonMetal=targets.some(x=>!isMetalHex(x.hex));
if(hitsMetal&&!hitsNonMetal&&!metalAction)
return{targets:[],reason:'metalRule'};
if(mainMetalAlive&&hitsNonMetal&&!metalAction&&!action.supTarget)
return{targets:[],reason:'metalAim'};
return{targets,reason:null};
};
if(tgt==='A')return finish(alive.slice());
if(tgt==='G'){
let targets;
if(action.tgtGroup!==undefined){
targets=alive.filter(x=>x[groupKey]===action.tgtGroup);
}else if(metalAction){
const mt=ordered.find(x=>isMetalHex(x.hex));
targets=mt?alive.filter(x=>x[groupKey]===mt[groupKey]):[];
}else{
targets=findLargestGroup(alive,groupKey);
}
return finish(targets);
}
let target=ordered[0];
const mt=metalAction?ordered.find(i=>isMetalHex(i.hex)):undefined;
if(mt){
target=mt;
}else if(action.soloGroup){
const gc={};
for(const x of ordered)gc[x[groupKey]]=(gc[x[groupKey]]||0)+1;
target=ordered.find(x=>gc[x[groupKey]]===1);
if(!target)return{targets:[],reason:'soloGroup'};
}else if(action.tgtGroup!==undefined){
target=ordered.find(x=>x[groupKey]===action.tgtGroup);
if(!target)return{targets:[],reason:'tgtdead'};
}
return finish(target?[target]:[]);
},
survivesBeforeHit(hits,perHitMax,hpLow,tFlat){
hits=Math.max(1,Math.floor(hits||1));
return hits<=1||(hits-1)*Math.floor(perHitMax||0)+Math.floor(tFlat||0)<hpLow;
},
step(target,hits,perHitMax,dMin,dMax,tFlat){
hits=Math.max(1,Math.floor(hits||1));
const hp=target.hp-Math.floor(dMin||0);
const hpLow=target.hpLow-Math.floor(dMax||0);
return{
hp,hpLow,
fullHits:this.survivesBeforeHit(hits,perHitMax,target.hpLow,tFlat),
uncertain:hpLow<=0&&hp>0,
dead:hp<=0
};
},
exactHitReason(action,step){
if(!step.fullHits)return'at_hit_count';
if(action&&action.earlyKill&&!step.dead)return'at_hit_count';
return null;
},
commit(target,step){
target.hp=step.hp;target.hpLow=step.hpLow;
if(step.dead)target.alive=false;
}
});
function actionAtUnstable(action,minDmg,maxDmg){
if(!action||!(action.at>0))return false;
return!(minDmg>0)&&maxDmg>0;
}
function buildCharDamageSpan(sk,hx,eq,hits,charsArr){
let minDmg=Infinity,maxDmg=0;
for(const c of charsArr){
const r=calcSkillDamage(sk,c.stats,hx,null,getWeaponTypeMultiplier(eq,hx),actionMetalEff(sk,eq));
if(r){
if(r.min*hits<minDmg)minDmg=r.min*hits;
if(r.max*hits>maxDmg)maxDmg=r.max*hits;
}
}
if(minDmg===Infinity)minDmg=0;
return{min:minDmg,max:maxDmg};
}
function solverCandidateStructureOK(rawCombo,context){
const{isMetal,killTargets,T,planType,postAlive,metalSupNeed:_metalSupNeed}=context;
if(isMetal||!killTargets||T<=1)return true;
const combo=_metalSupNeed>0?[...rawCombo.filter(v=>!isMetalExecutionAction(v)),...rawCombo.filter(isMetalExecutionAction)]:rawCombo;
const K=planType==='kill_all'?T:(planType==='kill_mercy_clear'?1+postAlive:postAlive);
const maxGrp=Math.max(...killTargets.map(g=>g.count||1));
let cap=0;
for(const v of combo){
if(!(v.at>0))continue;
const sk=lookupSkill(v.jp);
const tgt=sk?sk.target:'S';
if(tgt==='A'){cap=K;break;}
else if(tgt==='G'||tgt==='RG')cap+=maxGrp;
else if(tgt==='RA'||tgt==='RS')cap+=Math.max(v.hits||0,(sk&&sk.hitRange&&sk.hitRange.max)||1);
else cap+=1;
}
if(cap<K)return false;
const _isMetalG=killTargets.map(g=>isMetalHex(g.hex));
const gMaxW=killTargets.map(g=>g.count||0);
let mAliveW=0;
for(let gi=0;gi<killTargets.length;gi++)if(_isMetalG[gi])mAliveW+=gMaxW[gi];
let nmMaxW=T-mAliveW;
let nmCapW=0;
for(const v of combo){
if(v.id===SK_MERCY){
let drop=0;
for(let gi=1;gi<killTargets.length;gi++){
if(killTargets[gi].death>0){drop+=killTargets[gi].count;gMaxW[gi]=0;}
}
if(planType==='kill_mercy_clear'){
drop+=killTargets[0].death>0?killTargets[0].count:1;
gMaxW[0]=killTargets[0].death>0?0:Math.max(0,gMaxW[0]-1);
}
nmMaxW-=drop;
continue;
}
if(!(v.at>0))continue;
if(_metalSupNeed>0&&isMetalExecutionAction(v)){
if(mAliveW<1)return false;
mAliveW-=1;continue;
}
const skW=lookupSkill(v.jp);
if(v.tgtGroup!==undefined&&_isMetalG[v.tgtGroup]&&!isMetalActionSkill(v,skW))return false;
const nmLowW=Math.max(0,nmMaxW-nmCapW);
const aliveMaxW=nmMaxW+mAliveW;
const aliveLowW=Math.max(1,nmLowW+mAliveW);
if(aliveMaxW<1)return false;
if(v.tgtGroup!==undefined&&(gMaxW[v.tgtGroup]||0)<1)return false;
if(v.soloGroup){
let anySolo=false;
for(let gi=0;gi<killTargets.length;gi++){
if(gMaxW[gi]<1)continue;
if(_isMetalG[gi]?gMaxW[gi]===1:Math.max(0,gMaxW[gi]-nmCapW)<=1){anySolo=true;break;}
}
if(!anySolo)return false;
}
if(v.aoeK!==undefined){
if(v.tgtGroup!==undefined){
const gm=gMaxW[v.tgtGroup]!==undefined?gMaxW[v.tgtGroup]:0;
if(_isMetalG[v.tgtGroup]?(v.aoeK!==gm):(v.aoeK>gm||v.aoeK<Math.max(1,gm-nmCapW)))return false;
}else if(v.aoeK>aliveMaxW||v.aoeK<aliveLowW)return false;
}else if(skW&&(skW.target==='RS'||skW.target==='RG'||skW.target==='RA')){
if(aliveMaxW!==1)return false;
}
const tgtW=skW?skW.target:'S';
if(v.aoeK!==undefined)nmCapW+=v.aoeK;
else if(tgtW==='A')nmCapW+=nmMaxW;
else if(tgtW==='G'||tgtW==='RG')nmCapW+=(v.tgtGroup!==undefined&&gMaxW[v.tgtGroup]!==undefined)?gMaxW[v.tgtGroup]:Math.max(...gMaxW);
else if(tgtW==='RA'||tgtW==='RS')nmCapW+=Math.max(v.hits||0,1);
else nmCapW+=1;
}
return true;
}
function findLastMetalExecutionIndex(combo){
for(let i=combo.length-1;i>=0;i--)if(isMetalExecutionAction(combo[i]))return i;
return-1;
}
function priOrderOK(combo){
for(let i=1;i<combo.length;i++){
if(i%4===0)continue;
if(_actionPri(combo[i])>_actionPri(combo[i-1]))return false;
}
return true;
}
const _actionPri=(v)=>(SKILL_IDX[v.jp]&&SKILL_IDX[v.jp].pri)||(v.equip&&WEAPON_META[v.equip]&&WEAPON_META[v.equip].pri)||0;
function makeFinisherGate(combo){
const pri=combo.map(_actionPri);
const minPri=Math.min.apply(null,pri);
const earlyN=combo.reduce((n,v)=>n+(v.earlyKill?1:0),0);
return(fi)=>pri[fi]===minPri&&earlyN-(combo[fi].earlyKill?1:0)===0;
}
function sortComboByPriority(combo){
if(!combo.some(v=>_actionPri(v)!==0))return combo;
return combo.map((v,i)=>({v,i}))
.sort((a,b)=>(_actionPri(b.v)-_actionPri(a.v))||(a.i-b.i))
.map(x=>x.v);
}
function finisherLastOrder(arr,fi){
if(fi==null||fi<0||fi>=arr.length-1)return arr;
return arr.slice(0,fi).concat(arr.slice(fi+1),[arr[fi]]);
}
function permuteComboSlots(combo,slotFilter,keyFn,evalFn){
const slots=[],vals=[];
for(let i=0;i<combo.length;i++)if(slotFilter(combo[i])){slots.push(i);vals.push(combo[i]);}
if(vals.length<2||vals.length>5)return null;
const seen=new Set();
let result=null;
const walk=(rest,cur)=>{
if(result&&result.done)return;
if(!rest.length){
const nc=combo.slice();
for(let k=0;k<slots.length;k++)nc[slots[k]]=cur[k];
const key=nc.map(keyFn).join('¶');
if(seen.has(key))return;
seen.add(key);
result=evalFn(nc,result);
return;
}
const choices=new Set();
for(let i=0;i<rest.length;i++){
if(result&&result.done)return;
const key=keyFn(rest[i]);
if(choices.has(key))continue;
choices.add(key);
walk(rest.slice(0,i).concat(rest.slice(i+1)),cur.concat([rest[i]]));
}
};
walk(vals,[]);
return result;
}
function getSkillClassLock(action){
const sk=lookupSkill(action.jp);
return(sk&&sk.cat==='spell'&&Array.isArray(sk.cls))?sk.cls:null;
}
function forEachSolverAssignment(combo,chars,visitor){
const N=chars.length,n=combo.length;
const locks=combo.map(getSkillClassLock);
const pri=combo.map(_actionPri);
const pick=[];
let stopped=false;
const walk=()=>{
if(stopped)return;
if(pick.length===n){
if(visitor(pick.slice())===true)stopped=true;
return;
}
const k=pick.length;
const r0=Math.floor(k/4)*4;
for(let i=0;i<N&&!stopped;i++){
let duplicate=false;
for(let j=r0;j<k;j++)if(pick[j]===i){duplicate=true;break;}
if(duplicate)continue;
const lock=locks[k];
if(lock){
const job=chars[i].job;
if(job===null||(job!==12&&lock.indexOf(job)<0))continue;
}
if(k>r0&&pri[k]===pri[k-1]&&i<pick[k-1])continue;
pick.push(i);
walk();
pick.pop();
}
};
walk();
return stopped;
}
function findMetalClearAssign(combo,killTargets,chars,hexId){
const field=[];
for(let gi=0;gi<killTargets.length;gi++){
const hx=toMonsterHexId(killTargets[gi].hex);
const m=getMonDB(hx);
if(!m)continue;
field.push({gi,hx,m,count:killTargets[gi].count||0,death:killTargets[gi].death,
metal:isMetalHex(hx)});
}
if(!field.some(g=>!g.metal&&g.count>0))return null;
const N=chars.length,n=combo.length;
const dmg=[];
for(let ci=0;ci<n;ci++){
const v=combo[ci];
const sk=(v.id===SK_MERCY||!(v.at>0))?null:lookupSkill(v.jp);
const hits=SolverActionGate.hits(v);
const row=[];
for(let ai=0;ai<N;ai++){
const cell=[];
for(let gi=0;gi<killTargets.length;gi++){
const g=field.find(x=>x.gi===gi);
if(!sk||!g){cell.push(null);continue;}
const d=skillDamagePerHit(sk,v,g.hx,chars[ai].stats,null);
cell.push({min:d.min*hits,max:d.max*hits,hits,perHitMax:d.max});
}
row.push(cell);
}
dmg.push(row);
}
const walkOK=(assign)=>{
const sim=[];
for(const g of field){
for(let k=0;k<g.count;k++){
sim.push({hex:g.hx,groupIdx:g.gi,death:g.death||0,metal:g.metal,
hp:g.m.s[0],hpLow:Math.floor(g.m.s[0]*0.8),alive:true});
}
}
let mainKilled=false;
for(let ci=0;ci<n;ci++){
const v=combo[ci];
if(v.id===SK_MERCY){
for(const inst of sim)if(inst.alive&&inst.death>0)inst.alive=false;
continue;
}
if(!(v.at>0))continue;
const sk=lookupSkill(v.jp);
if(!sk)continue;
const alive=sim.filter(x=>x.alive);
if(!alive.length)return false;
const ai=assign[ci];
if(ai===undefined||!dmg[ci][ai])return false;
const picked=SolverActionGate.targets(alive,v,sk,'groupIdx');
if(picked.reason)return false;
const targets=picked.targets;
for(const target of targets){
const exec=canExecuteMetal(v.id,target.hex);
if(exec){
if(!exec.isValid)return false;
if(metalExecuteInst(target))mainKilled=true;
continue;
}
const d=dmg[ci][ai][target.groupIdx];
if(!d)continue;
if(actionAtUnstable(v,d.min,d.max))return false;
const step=SolverActionGate.step(target,d.hits,d.perHitMax,d.min,d.max);
if(SolverActionGate.exactHitReason(v,step))return false;
if(step.uncertain)return false;
SolverActionGate.commit(target,step);
if(step.dead&&target.groupIdx===0)mainKilled=true;
if(step.dead&&!mainKilled&&!target.metal)return false;
}
}
return sim.every(x=>x.metal||!x.alive);
};
let found;
forEachSolverAssignment(combo,chars,(assign)=>{
if(!walkOK(assign))return false;
found=assign;
return true;
});
if(found===undefined)return undefined;
return n>N?null:found;
}
function metalClearReorder(combo,killTargets,chars,hexId){
return permuteComboSlots(combo,
v=>v.at>0&&!isMetalExecutionAction(v),
v=>v.jp+'|'+(v.equip||'')+'|'+(v.hits||0)+'|'+v.at,
(nc,prev)=>{
if(!priOrderOK(nc))return prev;
const a=findMetalClearAssign(nc,killTargets,chars,hexId);
return a!==undefined?{combo:nc,assign:a,done:true}:prev;
});
}
function findBestAssignment(combo,hexId,mon,killTargets,tensionMul,fourceEls){
const chars=readCharStatsFromDom();
const idxs=[];for(let i=0;i<chars.length;i++)idxs.push(i);
let best=null;
forEachSolverAssignment(combo,chars,(assign)=>{
const out={};
const rating=checkSolverDamage(combo,hexId,mon,killTargets,tensionMul,fourceEls,out,assign);
const rk=getRankOrderValue(rating);
if(rk>0){
const entry={rating,assign,defend:idxs.filter(k=>!assign.includes(k)),eggAssign:out.eggAssign||null,finIdx:out.finIdx};
if(!best||rk>getRankOrderValue(best.rating))best=entry;
}
return!!(best&&getRankOrderValue(best.rating)===2);
});
if(!best)return{rating:null,assign:null,defend:idxs.slice(),eggAssign:null,infeasible:true};
return best;
}
function findBestOrderedAssignment(combo,hexId,mon,killTargets,tensionMul,fourceEls){
const _eval=(c)=>findBestAssignment(c,hexId,mon,killTargets,tensionMul,fourceEls);
const r=permuteComboSlots(combo,
v=>v.at>0,
v=>v.jp+'|'+(v.equip||'')+'|'+(v.hits||0),
(nc,prev)=>{
if(!priOrderOK(nc))return prev;
const b=_eval(nc);
if(!b.rating||(prev&&getRankOrderValue(b.rating)<=getRankOrderValue(prev.best.rating)))return prev;
return{combo:nc,best:b,done:b.rating==='gold'};
});
return r?{combo:r.combo,best:r.best}:{combo,best:_eval(combo)};
}
function buildSolverEggAssignments(eggCIs,dmgCIs){
if(!eggCIs.length)return[null];
const results=[],seen=new Set();
const validPerEgg=eggCIs.map(eCI=>dmgCIs.filter(dCI=>dCI>eCI));
const recurse=(idx,counts)=>{
const key=idx+':'+dmgCIs.map(ci=>counts[ci]||0).join(',');
if(seen.has(key))return;
seen.add(key);
if(idx===eggCIs.length){
const assign={};
for(const ci in counts)assign[ci]=_TENSION[Math.min(counts[ci]-1,_TENSION.length-1)].mul;
results.push(assign);return;
}
for(const ci of validPerEgg[idx]){
counts[ci]=(counts[ci]||0)+1;
recurse(idx+1,counts);
if(--counts[ci]===0)delete counts[ci];
}
};
recurse(0,{});
return results.length?results:[null];
}
function solverConditionEggTargets(combo,eggAssign){
if(!eggAssign)return{};
const eggs=combo.map((a,ci)=>a.id===SK_EGG?ci:-1).filter(ci=>ci>=0);
const keys=Object.keys(eggAssign).map(Number).sort((a,b)=>a-b),counts={},targets={};
if(keys.some(ci=>!combo[ci]||!(combo[ci].at>0)||!_TENSION_MULS.includes(eggAssign[ci])))return{};
const walk=i=>{
if(i===eggs.length)return keys.every(ci=>counts[ci]&&
_TENSION[Math.min(counts[ci]-1,_TENSION.length-1)].mul===eggAssign[ci]);
for(const ci of keys){
if(ci<=eggs[i])continue;
const count=(counts[ci]||0)+1;
if(_TENSION[Math.min(count-1,_TENSION.length-1)].mul>eggAssign[ci])continue;
counts[ci]=count;targets[eggs[i]]=ci;
if(walk(i+1))return true;
counts[ci]--;delete targets[eggs[i]];
}
return false;
};
return walk(0)?targets:{};
}
function checkSolverDamage(combo,hexId,mon,killTargets,tensionMul,fourceEls,outInfo,assign,forcedEggAssign,evaluationChars,evaluation){
const chars=evaluationChars||readCharStatsFromDom();
if(!mon)return null;
tensionMul=tensionMul||1;
const _actor=(ci)=>actorAt(chars,assign,ci);
if(evaluation&&evaluation.initialHP!=null)return null;
if(!killTargets||!killTargets.length)killTargets=[{hex:hexId,count:1,death:getMonDB(hexId).s[12]}];
const instances=buildSimInstances(killTargets);
if(instances.length===0)return null;
const uniqueHexes=[...new Set(killTargets.map(t=>t.hex))];
const inlineFource=findInlineFource(combo);
const effectiveFEls=inlineFource?(getFourceEls(inlineFource.jp)||[]):fourceEls;
const hasFource=effectiveFEls&&effectiveFEls.length>0;
const skillDmg=[];
for(let ci=0;ci<combo.length;ci++){
const sk=lookupSkill(combo[ci].jp);
const hits=SolverActionGate.hits(combo[ci]);
const tgt=SolverActionGate.targetKind(sk);
const dmg={},dmgF={};
for(const hex of uniqueHexes){
if(!sk){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
const tMon=getMonDB(hex);
if(!tMon){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
if(isMetalHex(hex)){
const mc=skillDamagePerHit(sk,combo[ci],hex,null,null);
const _md={min:mc.min*hits,max:mc.max*hits,phMax:mc.max};
dmg[hex]=_md;dmgF[hex]=_md;
continue;
}
const _ac=_actor(ci);
if(!_ac){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
const r=skillDamagePerHit(sk,combo[ci],hex,_ac.stats,null);
dmg[hex]=r.none?{min:0,max:0,phMax:0}:{min:r.min*hits,max:r.max*hits,phMax:r.max};
if(hasFource){
const rF=calcSkillDamage(sk,_ac.stats,hex,effectiveFEls,getWeaponTypeMultiplier(combo[ci].equip,hex),actionMetalEff(sk,combo[ci].equip));
dmgF[hex]=rF?{min:rF.min*hits,max:rF.max*hits,phMax:rF.max}:dmg[hex];
}else{
dmgF[hex]=dmg[hex];
}
}
skillDmg.push({dmg,dmgF,tgt,hits,ci,jp:combo[ci].jp});
}
const eggCIs=[];
const dmgCIs=[];
for(let ci=0;ci<combo.length;ci++)if(combo[ci].id===SK_EGG)eggCIs.push(ci);
for(let ci=0;ci<skillDmg.length;ci++){
if(skillDmg[ci]&&combo[ci].at>0)dmgCIs.push(ci);
}
const externalAssign=(!eggCIs.length&&tensionMul>1&&dmgCIs.length>0)
?{[dmgCIs[dmgCIs.length-1]]:tensionMul}:null;
function _simRun(mode,eggAssign){
const trace=evaluation&&evaluation.trace;
const actionResults=evaluation&&evaluation.captureActions?[]:null;
if(trace)trace.length=0;
const sim=instances.map(inst=>({
hex:inst.hex,groupIdx:inst.groupIdx,death:inst.death,
hp:mode==='min'?inst.hp:Math.floor(inst.hp*0.8),
hpLow:Math.floor(inst.hp*0.8),
alive:true
}));
const path=[];
const _targetKey=(inst)=>[(inst.groupIdx===0?'M':'S'),inst.hex,inst.death,inst.hp,inst.hpLow].join(':');
let r1Removal=false;
const _done=(allDead,rejectAt,reason)=>({allDead,rejectAt,reason,pathSig:path.join(';'),actionResults,r1Removal});
const resultTarget=(target,outcome,step)=>({index:sim.indexOf(target),groupIdx:target.groupIdx,hex:target.hex,outcome,
hpBefore:target.hp,hpLowBefore:target.hpLow,
hp:outcome==='ko'?0:step?step.hp:target.hp,
hpLow:outcome==='ko'?0:step?step.hpLow:target.hpLow});
const recordAction=(ci,kind,targets)=>{
const changed=new Map(targets.map(t=>[t.index,t]));
const remaining=sim.map((t,index)=>({index,hex:t.hex,groupIdx:t.groupIdx,hp:t.hp,hpLow:t.hpLow,alive:t.alive}))
.filter(t=>t.alive&&!['ko','removed'].includes(changed.get(t.index)?.outcome))
.map(t=>changed.has(t.index)?{...t,hp:changed.get(t.index).hp,hpLow:changed.get(t.index).hpLow}:t);
actionResults.push({ci,kind,targets,remaining});
};
let fourceOn=!inlineFource&&hasFource;
let mainKilled=false;
for(let ci=0;ci<skillDmg.length;ci++){
const sd=skillDmg[ci];
if(combo[ci].id===SK_MERCY){
const removed=[],removedTargets=[];
for(const inst of sim){
if(!inst.alive||inst.death<=0)continue;
const targetMon=getMonDB(inst.hex);
if(!targetMon||targetMon.s[12]<=0||actorLv(chars,assign,ci)<targetMon.s[13]+7)continue;
if(inst.groupIdx===0&&!mainKilled){path.push(ci+':m!');return _done(false,ci,'mercymain');}
removed.push(_targetKey(inst));
if(actionResults)removedTargets.push(resultTarget(inst,'removed'));
inst.alive=false;
}
path.push(ci+':m:'+removed.sort().join(','));
if(ci<4&&removed.length)r1Removal=true;
if(actionResults)recordAction(ci,'mercy',removedTargets);
continue;
}
if(combo[ci].id===SK_EGG){path.push(ci+':e');continue;}
if(inlineFource&&combo[ci].jp===inlineFource.jp&&!fourceOn){fourceOn=true;path.push(ci+':f');continue;}
if(!sd.tgt){path.push(ci+':n');continue;}
const mul=(eggAssign&&eggAssign[ci])?eggAssign[ci]:1;
const tLv=mul>1?actorLv(chars,assign,ci):99;
const tFlat=tensionFlat(mul,tLv);
const dTable=fourceOn?sd.dmgF:sd.dmg;
const alive=sim.filter(i=>i.alive);
if(alive.length===0){path.push(ci+':!earlyclear');return _done(false,ci,'earlyclear');}
const useDmg=mode==='min'?'min':'max';
const picked=SolverActionGate.targets(alive,combo[ci],lookupSkill(combo[ci].jp),'groupIdx');
if(picked.reason){path.push(ci+':!'+picked.reason);return _done(false,ci,picked.reason);}
if(combo[ci].aoeK!==undefined&&combo[ci].aoeK!==picked.targets.length){
path.push(ci+':!aoeK');return _done(false,ci,'aoeK');
}
path.push(ci+':d:'+picked.targets.map(_targetKey).sort().join(','));
const stepForTarget=target=>{
const table=dTable[target.hex]||{},metal=isMetalHex(target.hex);
return SolverActionGate.step(target,sd.hits,(table.phMax||0)*mul,
applyTension(table[useDmg]||0,mul,tLv,metal),applyTension(table.max||0,mul,tLv,metal),metal?0:tFlat);
};
const savedSteps=new Map();
if(actionResults){
const results=picked.targets.map(target=>{
const exec=canExecuteMetal(combo[ci].id,target.hex);
if(exec)return resultTarget(target,exec.isValid?'ko':'alive');
const step=stepForTarget(target);savedSteps.set(target,step);
return resultTarget(target,step.dead?'ko':step.uncertain?'possible':'alive',step);
});
recordAction(ci,'damage',results);
}
const traceRow=trace?{ci,mode,fourceOn,targets:picked.targets.map(t=>sim.indexOf(t)),
alive:alive.map(t=>sim.indexOf(t)),steps:[]}:null;
if(traceRow)trace.push(traceRow);
for(const target of picked.targets){
const exec=canExecuteMetal(combo[ci].id,target.hex);
if(exec){
if(!exec.isValid)return _done(false,ci,'non_metal_issen');
if(traceRow)traceRow.steps.push({index:sim.indexOf(target),execute:true});
if(ci<4)r1Removal=true;
if(metalExecuteInst(target))mainKilled=true;
continue;
}
const dMax=(dTable[target.hex]||{}).max||0;
if(actionAtUnstable(combo[ci],(dTable[target.hex]||{}).min||0,dMax)){
path.push(ci+':!at_unstable');
return _done(false,ci,'at_unstable');
}
const step=savedSteps.get(target)||stepForTarget(target);
if(traceRow)traceRow.steps.push({index:sim.indexOf(target),dead:step.dead,uncertain:step.uncertain});
if(SolverActionGate.exactHitReason(combo[ci],step))return _done(false,ci,'at_hit_count');
if(step.uncertain)return _done(false,ci,'uncertain');
SolverActionGate.commit(target,step);
if(ci<4&&step.dead)r1Removal=true;
if(step.dead&&target.groupIdx===0)mainKilled=true;
}
}
return _done(sim.every(i=>!i.alive),-1,null);
}
const proposedAssigns=forcedEggAssign!==undefined?[forcedEggAssign]:(eggCIs.length>0?buildSolverEggAssignments(eggCIs,dmgCIs):[externalAssign]);
const assigns=eggCIs.length?proposedAssigns.filter(a=>
Object.keys(solverConditionEggTargets(combo,a)).length===eggCIs.length):proposedAssigns;
const _lastCI=skillDmg.length-1;
const _mercyFinal=_lastCI>=0&&combo[_lastCI]&&combo[_lastCI].id===SK_MERCY;
const _finalActionCI=_mercyFinal?-1:_lastCI;
let bestRating=null,bestAssign=null,bestPathSig=null,bestActionResults=null,bestR1Removal=false,cleanPathSig=null,fallbackPathSig=null;
let _cleanIncomplete=false;
const minRuns=[];
for(const assign of assigns){
const r=_simRun('min',assign);
minRuns.push(r);
if(fallbackPathSig===null)fallbackPathSig=r.pathSig;
if(r.allDead&&r.rejectAt<0){bestRating='gold';bestAssign=assign;bestPathSig=r.pathSig;bestActionResults=r.actionResults;bestR1Removal=r.r1Removal;break;}
if(!r.allDead&&r.rejectAt<0){_cleanIncomplete=true;if(cleanPathSig===null)cleanPathSig=r.pathSig;}
}
if(!bestRating&&!_mercyFinal){
for(let i=0;i<assigns.length;i++){
const assign=assigns[i],rMin=minRuns[i];
if(rMin.reason==='uncertain'&&rMin.rejectAt===_finalActionCI){
const rMax=_simRun('max',assign);
if(rMax.allDead){bestRating='orange';bestAssign=assign;bestPathSig=rMin.pathSig+'>'+rMax.pathSig;bestActionResults=rMin.actionResults;bestR1Removal=rMin.r1Removal;break;}
}
}
}
if(outInfo){if(bestAssign)outInfo.eggAssign=bestAssign;outInfo.cleanIncomplete=_cleanIncomplete;outInfo.pathSig=bestPathSig!==null?bestPathSig:(cleanPathSig!==null?cleanPathSig:(fallbackPathSig||''));}
if(outInfo&&evaluation&&evaluation.captureActions)
outInfo.actionResults=bestActionResults||minRuns[0]?.actionResults||[];
if(outInfo){
outInfo.r1Removal=bestR1Removal;
outInfo.finIdx=dmgCIs.length?dmgCIs[dmgCIs.length-1]:-1;
outInfo.rejection=bestRating?null:(minRuns[0]&&minRuns[0].reason)||'incomplete';
outInfo.rejectAt=bestRating?-1:(minRuns[0]?.rejectAt??-1);
}
return bestRating;
}
function evalRound1Removal(combo,killTargets,eggAssign,assign,chars){
if(!killTargets||!killTargets.length)return'invalid';
const info={},hex=killTargets[0].hex;
const rating=checkSolverDamage(combo,hex,getMonDB(hex),killTargets,1,null,info,assign,eggAssign,chars);
if(!rating)return info.rejection==='uncertain'?'uncertain':'invalid';
return info.r1Removal?'definite':'none';
}
function canComboAntiBlock(combo){
for(const v of combo){
if(v.at===0)continue;
const sd=lookupSkillData(v.jp);
if(sd&&sd.blk===0)continue;
if(v.equip){const wm=WEAPON_META[v.equip];if(wm&&wm.antiBlk)continue;}
return false;
}
return true;
}
function planAFinisher(combo,hexId,mon,killTargets,maxSlots){
if(!killTargets||killTargets.length<2)return null;
if(!combo.every(v=>v.at>0))return null;
const aIdx=[];
for(let i=0;i<combo.length;i++){const sk=lookupSkill(combo[i].jp);if(sk&&sk.target==='A')aIdx.push(i);}
if(aIdx.length!==1)return null;
const fin=combo[aIdx[0]];
if(SolverActionGate.hits(fin)>1)return null;
const chips=combo.filter((v,i)=>i!==aIdx[0]);
const freeCI=[];
for(let ci=0;ci<chips.length;ci++){
const sk=lookupSkill(chips[ci].jp);
if(!sk)return null;
if(sk.target==='S'&&!chips[ci].soloGroup&&chips[ci].tgtGroup===undefined){freeCI.push(ci);continue;}
if(sk.target==='G'&&chips[ci].tgtGroup!==undefined)continue;
return null;
}
const chars=readCharStatsFromDom();
const nG=killTargets.length;
const dmgOf=(v)=>{
const sk=lookupSkill(v.jp);const hits=SolverActionGate.hits(v);const out={};
for(const t of killTargets){
let mn=0,mx=0;
for(const c of chars){const r=calcSkillDamage(sk,c.stats,t.hex,null,1,actionMetalEff(sk,v.equip));if(r){if(r.min>mn)mn=r.min;if(r.max>mx)mx=r.max;}}
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
const m=getMonDB(killTargets[g].hex);
if(!m){feas=false;break;}
const H=m.s[0];
needG[g]=Math.max(0,H-applyTension(finD[killTargets[g].hex].min||0,tier.mul,maxCharLv(chars)));
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
const prefix=makeEggOnPrefix(tier.eggs);
const planned=[...prefix,...chips.map((c,ci)=>{const k=freeCI.indexOf(ci);return k>=0?Object.assign({},c,{tgtGroup:idxs[k]}):c;}),fin];
if(--vBudget<0)return null;
const pb=findBestAssignment(planned,hexId,mon,killTargets,1,null);
if(pb.rating==='gold')return{combo:planned,eggAssign:pb.eggAssign,assign:pb.assign,defend:pb.defend,multiOnly:tier.eggs>=2};
}
let j=0;
while(j<idxs.length&&++idxs[j]>=nG){idxs[j]=0;j++;}
if(j>=idxs.length)break;
}
}
return null;
}
let _solverDmgCache=new WeakMap();
function resetSolverDamageCache(){_solverDmgCache=new WeakMap();}
function calcSolverSkillDamage(sk,st,hexId,fEls,wmul,metalEff){
let byContext=_solverDmgCache.get(sk);
if(!byContext){byContext=new Map();_solverDmgCache.set(sk,byContext);}
const contextKey=hexId+'|'+(fEls?fEls.join(','):'')+'|'+(wmul||1)+'|'+(metalEff||0);
let byStats=byContext.get(contextKey);
if(!byStats){byStats=new Map();byContext.set(contextKey,byStats);}
const statsKey=(st.atk||0)
+(st.might||0)*1024
+(st.str||0)*1048576
+(st.mending||0)*1073741824
+(st.deft||0)*1099511627776;
if(byStats.has(statsKey))return byStats.get(statsKey);
const result=calcSkillDamage(sk,st,hexId,fEls,wmul,metalEff);
byStats.set(statsKey,result);
return result;
}
function calcSolverMinStat(combo,hexId,tensionMul,fource){
tensionMul=tensionMul||1;
const _tChars=tensionMul>1?readCharStatsFromDom():null;
const tLv=(fi)=>_tChars?actorLv(_tChars,null,fi):99;
const mon=getMonDB(hexId);
if(!mon)return null;
const hp=mon.s[0];
if(combo.length!==1){
const fEls=fource?(getFourceEls(fource.jp)):null;
const hp80m=Math.floor(hp*0.8),hp100=hp;
let paper=0;
const skArr=[],hitsArr=[],wmArr=[];
for(const v of combo){
skArr.push(lookupSkill(v.jp));
hitsArr.push(SolverActionGate.hits(v));
wmArr.push(getWeaponTypeMultiplier(v.equip,hexId));
paper+=calcMaxSkillDamage(v.jp,hexId,wmArr[wmArr.length-1],actionMetalEff(skArr[skArr.length-1],v.equip))*SolverActionGate.hits(v);
}
if(paper<hp80m)return null;
const dmgMemo=skArr.map(()=>new Map());
const dmgAt=(i,key,s)=>{
if(!skArr[i]||combo[i].at===0)return{min:0,max:0,perHitMax:0};
if(canExecuteMetal(combo[i].id,hexId))return{min:0,max:0,perHitMax:0};
const keyCode=key==='atk'?0:key==='might'?1:key==='str'?2:key==='mending'?3:key==='deft'?4:5;
const memoKey=keyCode*1024+s,memo=dmgMemo[i];
if(memo.has(memoKey))return memo.get(memoKey);
const st={..._EXT_STATS};if(key)st[key]=s;
const r=calcSolverSkillDamage(skArr[i],st,hexId,fEls,wmArr[i],actionMetalEff(skArr[i],combo[i].equip));
const out=r?{min:r.min*hitsArr[i],max:r.max*hitsArr[i],perHitMax:r.max}:{min:0,max:0,perHitMax:0};
memo.set(memoKey,out);return out;
};
let best=null;
const _finGate=makeFinisherGate(combo);
for(let fi=0;fi<combo.length;fi++){
if(!_finGate(fi))continue;
const key=getSkillDriveStat(skArr[fi]);
if(!key)continue;
const finHits=hitsArr[fi];
const evalAt=(s)=>{
let cMin=0,cMax=0;
for(let i=0;i<combo.length;i++){
if(i===fi)continue;
const d=dmgAt(i,key,s);cMin+=d.min;cMax+=d.max;
}
return{cMin,cMax,f:dmgAt(fi,key,s)};
};
const goldOK=(s)=>{const e=evalAt(s);return(e.cMax+e.f.max)>=hp80m&&e.cMin+applyTension(e.f.min,tensionMul,tLv(fi))>=hp100;};
const capOK=(s)=>{
const e=evalAt(s);
if(e.cMax>=hp80m)return false;
if(!SolverActionGate.survivesBeforeHit(finHits,e.f.perHitMax*tensionMul,hp80m-e.cMax,tensionFlat(tensionMul,tLv(fi))))return false;
return true;
};
if(!goldOK(999))continue;
const minS=binarySearchMinTrue(0,999,goldOK);
if(!capOK(minS))continue;
const cand={key,fi,minS,capS:binarySearchMaxTrue(minS,999,capOK)};
if(!best||cand.minS<best.minS||(cand.minS===best.minS&&cand.capS>best.capS))best=cand;
}
if(!best)return null;
const perPos=(()=>{
const fFi=best.fi;
if(!getSkillDriveStat(skArr[fFi]))return null;
const posD=(i,s)=>{
const d=dmgAt(i,getSkillDriveStat(skArr[i]),s);
return{min:d.min,max:d.max,phm:d.perHitMax};
};
const varPos=[];
for(let i=0;i<combo.length;i++){
if(i===fFi||!getSkillDriveStat(skArr[i]))continue;
if(posD(i,999).min>posD(i,0).min)varPos.push(i);
}
let constMin=0,constMax=0;
for(let i=0;i<combo.length;i++){if(i===fFi||varPos.indexOf(i)>=0)continue;const d=posD(i,0);constMin+=d.min;constMax+=d.max;}
const posCap={};let chipMaxCap=constMax,chipMinCap=constMin;
for(const j of varPos){
const cap=binarySearchMaxTrue(0,999,(m)=>chipMaxCap+posD(j,m).max<hp80m);
if(cap<0)return null;
posCap[j]=cap;chipMaxCap+=posD(j,cap).max;chipMinCap+=posD(j,cap).min;
}
const finHitsP=hitsArr[fFi];
let sFinCap=999;
if(finHitsP>1){
const headA=hp80m-chipMaxCap;
sFinCap=binarySearchMaxTrue(0,999,(m)=>SolverActionGate.survivesBeforeHit(finHitsP,posD(fFi,m).phm*tensionMul,headA,tensionFlat(tensionMul,tLv(fFi))));
if(sFinCap<0)return null;
}
const finNeed=hp100-chipMinCap;
const finMinT=(s)=>applyTension(posD(fFi,s).min,tensionMul,tLv(fFi));
if(finMinT(sFinCap)<finNeed)return null;
const sFin=binarySearchMinTrue(0,sFinCap,(m)=>finMinT(m)>=finNeed);
return{finFi:fFi,fKey:getSkillDriveStat(skArr[fFi]),sFin,sFinCap,varPos,posCap};
})();
let posLabel='';
if(perPos){
const _nm=(i)=>(DISPLAY_LANG==='EN'?(combo[i].en||combo[i].jp):combo[i].jp)+(combo[i].note||'');
const _kL=(i)=>{const k=getSkillDriveStat(skArr[i]);return(k&&k!=='atk')?'('+getStatLabel(k)+')':'';};
const parts=[];
const capParts=[];
for(const j of perPos.varPos){
const cp=perPos.posCap[j];
if(cp<999){parts.push(_nm(j)+_kL(j)+'≤'+cp);capParts.push(_nm(j)+cp);}
}
let finSeg=L08+_nm(perPos.finFi)+_kL(perPos.finFi);
finSeg+=(perPos.sFinCap<999?' '+perPos.sFin+'~'+perPos.sFinCap:'≥'+perPos.sFin);
if(capParts.length>0)finSeg+='(@'+capParts.join(',')+')';
parts.push(finSeg);
posLabel=parts.join(' · ');
}
const jpTag='@'+(DISPLAY_LANG==='EN'?(combo[best.fi].en||combo[best.fi].jp):combo[best.fi].jp)+(combo[best.fi].note||'');
if(best.capS>=999)return{stat:best.key,min:best.minS,finIdx:best.fi,perPos,posLabel,label:getStatLabel(best.key)+'≥'+best.minS+jpTag};
return{stat:best.key,min:best.minS,max:best.capS,finIdx:best.fi,perPos,posLabel,label:getStatLabel(best.key)+' '+best.minS+'~'+best.capS+jpTag};
}
const v=combo[0],hits=SolverActionGate.hits(v);
if(canExecuteMetal(v.id,hexId))return null;
const sd=lookupSkillData(v.jp);
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
const mul=elMul;
const tLv0=tLv(0),tFlat0=tensionFlat(tensionMul,tLv0);
const _wmulV=getWeaponTypeMultiplier(v.equip,hexId);
const hp80=Math.floor(hp*0.8);
const _capSolve=(statKey,minStat)=>{
const sk2=lookupSkill(v.jp);
if(!sk2)return-1;
const fEls2=fource?(getFourceEls(fource.jp)):null;
const capOK=(s)=>{
const st={atk:0,might:0,str:0,mending:0,deft:0};st[statKey]=s;
const r=calcSolverSkillDamage(sk2,st,hexId,fEls2,_wmulV,actionMetalEff(sk2,v.equip));
return r?SolverActionGate.survivesBeforeHit(hits,r.max*tensionMul,hp80,tFlat0):false;
};
if(!capOK(minStat))return-1;
return binarySearchMaxTrue(minStat,999,capOK);
};
const _rangeWrap=(statKey,minStat,baseLabel)=>{
if(hits<=1)return{stat:statKey,min:minStat,label:baseLabel};
const capMax=_capSolve(statKey,minStat);
if(capMax<0)return null;
if(capMax>=999)return{stat:statKey,min:minStat,label:baseLabel};
return{stat:statKey,min:minStat,max:capMax,label:getStatLabel(statKey)+' '+minStat+'~'+capMax};
};
if(sd&&sd.dmg){
const d=sd.dmg;
if(!d.m||d.b===d.m){
if(applyTension((d.b-d.s)*hits*mul,tensionMul,tLv0)<hp)return null;
if(!SolverActionGate.survivesBeforeHit(hits,(d.b+d.s)*mul*tensionMul,hp80,tFlat0))return null;
return{stat:null,min:0,label:''};
}
const needBase=Math.ceil(Math.max(0,hp-tFlat0)/(mul*tensionMul*hits))+d.s;
if(needBase<=d.b)return _rangeWrap(d.st,d.lo,getStatLabel(d.st)+'≥'+d.lo);
if(needBase>d.m)return null;
const need=Math.ceil(d.lo+(needBase-d.b)*(d.hi-d.lo)/(d.m-d.b));
return _rangeWrap(d.st,Math.min(need,999),getStatLabel(d.st)+'≥'+Math.min(need,999));
}
if(!sd||!sd.el){
const sk=lookupSkill(v.jp);
if(!sk)return null;
const fEls=fource?(getFourceEls(fource.jp)):null;
const killAt=(a)=>{
const r=calcSolverSkillDamage(sk,{atk:a,might:0,str:0,mending:0,deft:0},hexId,fEls,_wmulV,actionMetalEff(sk,v.equip));
return r?(applyTension(r.min*hits,tensionMul,tLv0)>=hp):false;
};
if(!killAt(999))return null;
const lo=binarySearchMinTrue(0,999,killAt);
return _rangeWrap('atk',lo,'ATK≥'+lo);
}
return null;
}
function getSkillDriveStat(sk){
if(sk&&sk.fixedDmg)return null;
if(!sk||!sk.dmg)return'atk';
if(sk.dmg.st){
const s=sk.dmg.st;
return(s==='might'||s==='str'||s==='mending')?s:null;
}
return null;
}
function solverConditionStatKeys(sk){
if(!sk||sk.fixedDmg)return[];
if(!sk.dmg)return['atk'];
switch(sk.dmg.st){
case'might':return['might'];
case'str':return['str'];
case'mending':return['mending'];
case'str+might':return['str','might'];
case'str+deft':return['str','deft'];
case'stat':return['might','mending'];
default:return[];
}
}
function solverConditionActionHitsNonMetal(ci,targets,pathSig){
if(pathSig){
const row=pathSig.split(';').find(v=>v.indexOf(ci+':d:')===0);
if(row){
const hexes=row.match(/\b[0-9A-F]{3}\b/g)||[];
return hexes.some(hex=>!isMetalHex(hex));
}
}
return(targets||[]).some(g=>!isMetalHex(g.hex));
}
function solverConditionVariables(combo,assign,targets,pathSig){
const vars=[],seen=new Set();
for(let ci=0;ci<combo.length;ci++){
if(!(combo[ci].at>0)||assign[ci]===undefined||
!solverConditionActionHitsNonMetal(ci,targets,pathSig))continue;
for(const key of solverConditionStatKeys(lookupSkill(combo[ci].jp))){
const index=assign[ci],id=index+':'+key;
if(!seen.has(id)){seen.add(id);vars.push({index,key,first:ci,last:ci});}
else vars.find(v=>v.index===index&&v.key===key).last=ci;
}
}
return vars;
}
function cloneSolverConditionParty(party){
return party.map(c=>({...c,stats:{...c.stats}}));
}
function solverConditionActionUsage(combo,proof,targets){
const eggTargets=solverConditionEggTargets(combo,proof&&proof.eggAssign);
return combo.map((action,ci)=>{
const index=proof&&proof.assign?proof.assign[ci]:undefined;
const sk=lookupSkill(action.jp);
const stats=(action.at>0&&index!==undefined&&
solverConditionActionHitsNonMetal(ci,targets,proof&&proof.pathSig))
?solverConditionStatKeys(sk):[];
return{ci,index,stats,level:action.id===SK_MERCY||!!(proof&&proof.eggAssign&&proof.eggAssign[ci]>1),
eggTarget:eggTargets[ci]};
});
}
function solverConditionStatUsage(combo,proof,targets){
const byActor=new Map();
for(const row of solverConditionActionUsage(combo,proof||{},targets)){
if(row.index===undefined)continue;
let entry=byActor.get(row.index);
if(!entry){entry={index:row.index,stats:[],level:false};byActor.set(row.index,entry);}
for(const key of row.stats)if(!entry.stats.includes(key))entry.stats.push(key);
entry.level=entry.level||row.level;
}
return[...byActor.values()].sort((a,b)=>a.index-b.index);
}
function solverConditionStatRequirement(combo,targets,hexId,bat,proof,tensionMul,fourceEls){
if(!proof||proof.rating!=='gold'||(targets||[]).reduce((n,g)=>n+(g.count||1),0)!==1)return null;
const rows=solverConditionActionUsage(combo,proof,targets);
const variables=[];
for(const row of rows)for(const key of row.stats)variables.push({ci:row.ci,index:row.index,key});
const ids=[...new Set(variables.map(v=>v.index+':'+v.key))];
if(ids.length!==1)return null;
const v=variables[0];
const fin=combo.map((a,i)=>a.at>0?i:-1).filter(i=>i>=0).pop();
if(v.ci!==fin||SolverActionGate.hits(combo[fin])!==1||
variables.some(x=>x.ci!==fin))return null;
const party=cloneSolverConditionParty(proof.party);
const replay=value=>{
party[v.index].stats[v.key]=value;
const out=verifySolverConditionParty(combo,targets,hexId,bat,party,proof.assign,
tensionMul,fourceEls,null,proof.eggAssign);
return!!(out&&out.rating==='gold');
};
if(!replay(ST_CAP))return null;
const min=replay(0)?0:binarySearchMinTrue(0,ST_CAP,replay);
if(!replay(min)||(min>0&&replay(min-1)))return null;
return{index:v.index,key:v.key,min};
}
function finalizeSolverConditionProof(combo,targets,hexId,bat,proof,tensionMul,fourceEls){
if(!proof)return null;
const out={...proof,party:cloneSolverConditionParty(proof.party)};
const solved=solveSolverConditionBounds(combo,targets,hexId,bat,out,tensionMul,fourceEls);
if(solved)Object.assign(out,solved);
const captured=verifySolverConditionParty(combo,targets,hexId,bat,out.party,out.assign,
tensionMul,fourceEls,undefined,out.eggAssign,true);
if(captured&&captured.rating===out.rating)out.actionResults=captured.actionResults;
return out;
}
function solveSolverConditionBounds(combo,targets,hexId,bat,proof,tensionMul,fourceEls){
const vars=solverConditionVariables(combo,proof.assign,targets,proof.pathSig);
const trace=[],info={};
const rating=checkSolverDamage(combo,hexId,getMonDB(hexId),targets,tensionMul,fourceEls,info,
proof.assign,proof.eggAssign,proof.party,{trace});
if(rating!==proof.rating)return null;
const instances=buildSimInstances(targets),constraints=[],terms=[];
const cumulative=instances.map(()=>[]);
const fource=findInlineFource(combo),fEls=fource?getFourceEls(fource.jp):fourceEls;
const reference=vars.map(v=>proof.party[v.index].stats[v.key]);
const term=(ci,hex,on)=>{
const action=combo[ci],sk=lookupSkill(action.jp),ai=proof.assign[ci];
const keys=isMetalHex(hex)?[]:solverConditionStatKeys(sk);
const depends=vars.map((v,i)=>v.index===ai&&keys.includes(v.key)?i:-1).filter(i=>i>=0);
const hits=SolverActionGate.hits(action),mul=(proof.eggAssign||{})[ci]||1;
const lv=proof.party[ai].lv,cache=new Map();
const t={depends,read(values){
const key=depends.map(i=>values[i]).join(',');
if(cache.has(key))return cache.get(key);
const stats={...proof.party[ai].stats};
for(const i of depends)stats[vars[i].key]=values[i];
const d=skillDamagePerHit(sk,action,hex,stats,on?fEls:null);
const result={min:applyTension(d.min*hits,mul,lv,d.metal),max:applyTension(d.max*hits,mul,lv,d.metal),
head:(hits-1)*Math.floor(d.max*mul)+(d.metal?0:tensionFlat(mul,lv)),hitmin:d.min,hitmax:d.max};
cache.set(key,result);return result;
}};
terms.push(t);return terms.length-1;
};
const expression=(ids,part,sign=1)=>ids.map(t=>({t,part,sign}));
const add=(expr,op,rhs)=>constraints.push({expr,op,rhs});
const orange=[];
for(const row of trace){
const ci=row.ci,action=combo[ci],sk=lookupSkill(action.jp);
if(SolverActionGate.targetKind(sk)==='S'&&row.targets.length===1){
const selected=row.targets[0];
let candidates=row.alive.slice();
if(isMetalActionSkill(action,sk)&&candidates.some(i=>isMetalHex(instances[i].hex)))
candidates=candidates.filter(i=>isMetalHex(instances[i].hex));
else if(action.soloGroup){
const counts={};
for(const i of candidates)counts[instances[i].groupIdx]=(counts[instances[i].groupIdx]||0)+1;
candidates=candidates.filter(i=>counts[instances[i].groupIdx]===1);
}else if(action.tgtGroup!==undefined)candidates=candidates.filter(i=>instances[i].groupIdx===action.tgtGroup);
for(const other of candidates)if(other!==selected)add([
...expression(cumulative[selected],'min'),...expression(cumulative[other],'min',-1)
],'le',instances[selected].hp-instances[other].hp-(other<selected?1:0));
}
for(const step of row.steps){
if(step.execute)continue;
const i=step.index,inst=instances[i],t=term(ci,inst.hex,row.fourceOn);
const d=terms[t].read(reference);
add([{t,part:d.hitmin>0?'hitmin':'hitmax',sign:1}],d.hitmin>0?'ge':'le',d.hitmin>0?1:0);
if(SolverActionGate.hits(action)>1)
add([...expression(cumulative[i],'max'),{t,part:'head',sign:1}],'le',inst.hpLow-1);
cumulative[i].push(t);
if(proof.rating==='orange'&&ci===combo.length-1){
add(expression(cumulative[i],'max'),'ge',inst.hpLow);
orange.push({expr:expression(cumulative[i],'min'),op:'le',rhs:inst.hp-1});
}else if(step.dead)add(expression(cumulative[i],'min'),'ge',inst.hp);
else add(expression(cumulative[i],'max'),'le',inst.hpLow-1);
}
}
if(orange.length)constraints.push({any:orange});
const limits=(c,box)=>{
if(c.any)return c.any.some(x=>limits(x,box).possible)?{possible:true}:{possible:false};
const lo=box.map(x=>x.lo),hi=box.map(x=>x.hi);
let min=0,max=0;
for(const x of c.expr){
const a=terms[x.t].read(lo)[x.part],b=terms[x.t].read(hi)[x.part];
min+=x.sign>0?a:-b;max+=x.sign>0?b:-a;
}
return{min,max,possible:c.op==='ge'?max>=c.rhs:min<=c.rhs};
};
const propagate=box=>{
let changed=true;
while(changed){
changed=false;
for(const original of constraints){
const active=original.any?original.any.filter(c=>limits(c,box).possible):[original];
if(!active.length)return null;
if(original.any&&active.length>1)continue;
const c=active[0];if(!limits(c,box).possible)return null;
for(let vi=0;vi<vars.length;vi++){
const signs=c.expr.filter(x=>terms[x.t].depends.includes(vi)).map(x=>x.sign);
if(!signs.length||signs.some(s=>s!==signs[0]))continue;
const lower=(c.op==='ge')===(signs[0]>0),b=box[vi];
if(b.lo===b.hi)continue;
const possible=value=>{
const old=box[vi];box[vi]={lo:value,hi:value};
const ok=limits(c,box).possible;box[vi]=old;return ok;
};
if(lower&&!possible(b.lo)){
const value=binarySearchMinTrue(b.lo,b.hi,possible);
if(!possible(value))return null;
b.lo=value;changed=true;
}else if(!lower&&!possible(b.hi)){
const value=binarySearchMaxTrue(b.lo,b.hi,possible);
if(value<b.lo)return null;
b.hi=value;changed=true;
}
}
}
}
return box;
};
const partyAt=values=>{
const party=cloneSolverConditionParty(proof.party);
for(const c of party)for(const key of['atk','might','str','mending','deft'])c.stats[key]=0;
vars.forEach((v,i)=>{party[v.index].stats[v.key]=values[i];});return party;
};
const replay=values=>verifySolverConditionParty(combo,targets,hexId,bat,partyAt(values),proof.assign,
tensionMul,fourceEls,undefined,proof.eggAssign);
const checked=values=>{
const box=values.map(x=>({lo:x,hi:x}));
if(constraints.some(c=>!limits(c,box).possible))return null;
const p=replay(values);return p&&p.rating===proof.rating?values:null;
};
const find=(input,preferred)=>{
const box=propagate(input.map(b=>({...b})));if(!box)return null;
const candidate=box.map((b,i)=>Math.max(b.lo,Math.min(b.hi,preferred[i])));
if(checked(candidate))return candidate;
const low=box.map(b=>b.lo);if(checked(low))return low;
let vi=-1,width=0;
box.forEach((b,i)=>{if(b.hi-b.lo>width){vi=i;width=b.hi-b.lo;}});
if(vi<0)return null;
const mid=(box[vi].lo+box[vi].hi)>>1,left=box.map(b=>({...b})),right=box.map(b=>({...b}));
left[vi].hi=mid;right[vi].lo=mid+1;
return find(left,preferred)||find(right,preferred);
};
const root=propagate(vars.map(()=>({lo:0,hi:ST_CAP})));
if(!root)return null;
const bounds=[],witnesses=[];
for(let vi=0;vi<vars.length;vi++){
const extreme=upper=>{
let lo=root[vi].lo,hi=root[vi].hi,witness=reference;
while(lo<hi){
const mid=upper?Math.ceil((lo+hi)/2):(lo+hi)>>1;
const box=root.map(b=>({...b}));
if(upper)box[vi].lo=mid;else box[vi].hi=mid;
const found=find(box,reference);
if(found){witness=found;if(upper)lo=mid;else hi=mid;}
else if(upper)hi=mid-1;else lo=mid+1;
}
const box=root.map(b=>({...b}));box[vi]={lo,hi:lo};
witness=find(box,witness);
return witness?{value:lo,witness}:null;
};
const lower=extreme(false),upper=extreme(true);
if(!lower||!upper)return null;
bounds.push({...vars[vi],lo:lower.value,hi:upper.value});
witnesses.push({lo:lower.witness,hi:upper.witness});
}
const chosen=find(root,root.map(b=>b.lo));
if(!chosen)return null;
const verified=replay(chosen);
const atPoint=(c,values)=>{
if(c.any)return c.any.some(x=>atPoint(x,values));
const value=c.expr.reduce((sum,x)=>sum+x.sign*terms[x.t].read(values)[x.part],0);
return c.op==='ge'?value>=c.rhs:value<=c.rhs;
};
const conditionalBounds=[],sliceCache=new Map();
const addSlice=(anchor,side)=>{
const values=witnesses[anchor][side].slice();
const target=vars.length===1?0:(anchor+1)%vars.length;
const fixed=vars.map((v,i)=>({variable:i,value:values[i]})).filter(v=>v.variable!==target);
const cacheKey=JSON.stringify([target,fixed]);
if(sliceCache.has(cacheKey)){
sliceCache.get(cacheKey).endpoints.push({variable:anchor,side});return;
}
const allowed=[];
for(let value=bounds[target].lo;value<=bounds[target].hi;value++){
values[target]=value;
if(constraints.every(c=>atPoint(c,values)))allowed.push(value);
}
const toRanges=numbers=>{
const ranges=[];
for(const value of numbers){
const last=ranges[ranges.length-1];
if(last&&last.hi+1===value)last.hi=value;
else ranges.push({lo:value,hi:value});
}
return ranges;
};
let ranges=toRanges(allowed);
if(ranges.some(r=>[r.lo,r.hi].some(value=>{values[target]=value;return!checked(values);})))
ranges=toRanges(allowed.filter(value=>{values[target]=value;return!!checked(values);}));
const entry={fixed,target,ranges,endpoints:[{variable:anchor,side}]};
sliceCache.set(cacheKey,entry);conditionalBounds.push(entry);
};
for(let vi=0;vi<vars.length;vi++)for(const side of['lo','hi'])addSlice(vi,side);
return{...verified,statBounds:bounds,boundWitnesses:witnesses,conditionalBounds,boundsScope:'joint-path',
statRequirement:vars.length===1&&bounds[0].hi===ST_CAP?{index:vars[0].index,key:vars[0].key,min:bounds[0].lo}:null};
}
function findVariableConditionProof(combo,targets,hexId,bat,assign,tensionMul,fourceEls){
const vars=solverConditionVariables(combo,assign,targets);
if(!vars.length)return null;
let candidates=vars;
if(vars.length>1){
const out={};
checkSolverDamage(combo,hexId,getMonDB(hexId),targets,tensionMul,fourceEls,out,
assign,undefined,NEUTRAL_PARTY());
if(!['uncertain','at_hit_count','at_unstable'].includes(out.rejection)||out.rejectAt<0)return null;
const ci=out.rejectAt,keys=solverConditionStatKeys(lookupSkill(combo[ci].jp));
candidates=vars.filter(v=>v.index===assign[ci]&&keys.includes(v.key));
}
for(const v of candidates){
const party=NEUTRAL_PARTY();
for(let value=0;value<=ST_CAP;value++){
party[v.index].stats[v.key]=value;
const proof=verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tensionMul,fourceEls);
if(proof)return proof;
}
}
return null;
}
function verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tensionMul,fourceEls,monOverride,forcedEggAssign,captureActions=false){
if(monOverride!=null)return null;
if(!combo.length||combo.length>8||!priOrderOK(combo))return null;
if(!assign||assign.length!==combo.length||!party||party.length!==4)return null;
if(party.some(c=>!c.stats||['atk','might','str','mending','deft'].some(key=>
!Number.isInteger(c.stats[key])||c.stats[key]<0||c.stats[key]>999)))return null;
if(!forEachSolverAssignment(combo,party,pick=>pick.every((ai,ci)=>ai===assign[ci])))return null;
if(combo.some((v,ci)=>v.earlyKill&&ci!==combo.length-1))return null;
if(!(combo[combo.length-1].at>0)&&combo[combo.length-1].id!==SK_MERCY)return null;
const mon=getMonDB(hexId),out={};
const total=targets.reduce((n,g)=>n+(g.count||1),0);
const rating=checkSolverDamage(combo,hexId,mon,targets,
tensionMul,fourceEls,out,assign,forcedEggAssign,party,
{captureActions});
if(!rating)return null;
const r1Removal=combo.length>4&&!!out.r1Removal;
const cost=combo.length>4&&r1Removal?Math.floor(total/2):0;
if(combo.reduce((n,v)=>n+(v.at||0),0)+cost!==bat)return null;
return{rating,party,assign:assign.slice(),eggAssign:out.eggAssign||forcedEggAssign||null,
finIdx:out.finIdx,r1Removal,pathSig:out.pathSig||'',
...(out.actionResults?{actionResults:out.actionResults}:{})};
}
function findSolverConditionProof(combo,targets,hexId,bat,req){
if(!targets||!targets.length||!priOrderOK(combo)||combo.length>8)return null;
const total=targets.reduce((n,g)=>n+(g.count||1),0),single=total===1;
const mon=getMonDB(hexId);
if(!mon)return null;
const fin=combo.map((v,i)=>v.at>0?i:-1).filter(i=>i>=0).pop();
const fource=findInlineFource(combo),fEls=fource?getFourceEls(fource.jp):null;
const eggs=combo.filter(v=>v.id===SK_EGG).length;
const tension=single&&eggs?_TENSION[Math.min(eggs-1,_TENSION.length-1)].mul:1;
let best=null;
const finish=()=>finalizeSolverConditionProof(combo,targets,hexId,bat,best,tension,fEls);
const accept=(party,assign)=>{
const proof=verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tension,fEls);
if(proof){
proof.statTotal=party.reduce((n,c)=>n+Object.values(c.stats).reduce((s,v)=>s+v,0),0);
proof.tuned=party.some(c=>Object.values(c.stats).some(v=>v!==999));
if(!best||getRankOrderValue(proof.rating)>getRankOrderValue(best.rating)
||(proof.rating===best.rating&&proof.statTotal<best.statTotal))best=proof;
}
return proof;
};
forEachSolverAssignment(combo,NEUTRAL_PARTY(),assign=>{
accept(NEUTRAL_PARTY(),assign);
return best&&best.rating==='gold';
});
if(!best){
forEachSolverAssignment(combo,NEUTRAL_PARTY(),assign=>{
const proof=findVariableConditionProof(combo,targets,hexId,bat,assign,tension,fEls);
if(!proof)return false;
best=proof;
return proof.rating==='gold';
});
}
if(best&&best.rating==='gold'&&!single)return finish();
if(single&&!isMetalHex(hexId)&&fin!==undefined){
const proposed=calcSolverMinStat(combo,hexId,tension,fource)||req;
forEachSolverAssignment(combo,NEUTRAL_PARTY(),assign=>{
if(proposed&&proposed.stat&&proposed.min<=999){
const party=NEUTRAL_PARTY();
for(const c of party)c.stats[proposed.stat]=proposed.min;
accept(party,assign);
}
const pp=proposed&&proposed.perPos;
if(pp&&pp.finFi===fin){
const party=NEUTRAL_PARTY(),bound=new Map();let compatible=true;
const set=(ci,key,value)=>{
const id=assign[ci]+':'+key;
if(bound.has(id)&&bound.get(id)!==value){compatible=false;return;}
bound.set(id,value);party[assign[ci]].stats[key]=value;
};
for(const ci of pp.varPos)set(ci,getSkillDriveStat(lookupSkill(combo[ci].jp)),pp.posCap[ci]);
set(fin,pp.fKey,pp.sFin);
if(compatible)accept(party,assign);
}
if((!best||best.rating!=='gold')&&combo.length<=4&&combo.every(v=>v.at>0)){
const party=NEUTRAL_PARTY(),hp80=Math.floor(mon.s[0]*0.8);
const drive=ci=>getSkillDriveStat(lookupSkill(combo[ci].jp));
const damage=ci=>{
const d=skillDamagePerHit(lookupSkill(combo[ci].jp),combo[ci],hexId,party[assign[ci]].stats,fEls);
const hits=SolverActionGate.hits(combo[ci]);
return{min:d.min*hits,max:d.max*hits};
};
const chipSum=endpoint=>combo.reduce((n,v,ci)=>ci===fin?n:n+damage(ci)[endpoint],0);
for(let ci=0;ci<combo.length;ci++)if(ci!==fin&&drive(ci))party[assign[ci]].stats[drive(ci)]=0;
for(let ci=0;ci<combo.length;ci++){
const key=drive(ci);
if(ci===fin||!key)continue;
const ok=value=>{party[assign[ci]].stats[key]=value;return chipSum('max')<hp80;};
if(ok(0))party[assign[ci]].stats[key]=binarySearchMaxTrue(0,999,ok);
}
const key=drive(fin);
if(key){
const gold=value=>{party[assign[fin]].stats[key]=value;return chipSum('min')+damage(fin).min>=mon.s[0];};
if(gold(999))party[assign[fin]].stats[key]=binarySearchMinTrue(0,999,gold);
}
accept(party,assign);
}
return best&&best.rating==='gold'&&best.tuned;
});
}
if(best&&best.rating==='gold')return finish();
return finish();
}
function trimGroups(groups,max){
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
function forEachPoolEntry(rawPool,fn){
for(const e of rawPool){
if(!Array.isArray(e))continue;
if(typeof e[0]==='string')fn(e);
for(const x of e){if(Array.isArray(x)&&typeof x[0]==='string')fn(x);}
}
}
function getEncounterSupportPool(env,mr){
const supportPool=[],seen=new Set();
let denominator=0;
forEachPoolEntry(GROTTO_SUPPORT[env]?.[mr]||[],e=>{
if(seen.has(e[0]))return;
seen.add(e[0]);denominator=denominator||e[4]||0;
supportPool.push({hex:e[0],min:e[1],max:e[2],weight:e[3]||0,index:supportPool.length});
});
return{supportPool,denominator};
}
function getEncounterModel(env,mr,hex){
const info=GROTTO_BATTLE[env]?.[mr],entry=info?.m.find(e=>e[0]===hex);
if(!entry)return null;
const isAlone=entry[3]===1;
const{supportPool,denominator}=isAlone?{supportPool:[],denominator:0}:getEncounterSupportPool(env,mr);
const p1=!isAlone&&entry[5]>0?entry[4]/entry[5]:0;
const p2=!isAlone&&entry[7]>0?entry[6]/entry[7]:0;
return{hex,isAlone,max:info.x,mainMin:entry[1],mainMax:entry[2],
supportPool,denominator,branches:[Math.max(0,1-p1-p2),p1,p2]};
}
function enumerateEncounterOutcomes(model){
if(!model)return[];
const{hex,max,mainMin,mainMax,supportPool,denominator,branches}=model;
const outcomes=new Map(),pMain=1/(mainMax-mainMin+1);
const add=(mainRaw,supports,counts,probability)=>{
if(!(probability>0))return;
const[M,...remaining]=trimGroups([mainRaw,...counts],max);
const survivors=supports.map((s,i)=>({...s,count:remaining[i]})).filter(s=>s.count>0)
.sort((a,b)=>a.index-b.index);
const kind=['A','B','C'][survivors.length];
const key=kind==='A'?'A_'+M:kind==='B'?'B_'+survivors[0].hex+'_'+M+'_'+survivors[0].count
:'C_'+survivors[0].hex+'_'+survivors[0].count+'_'+survivors[1].hex+'_'+survivors[1].count+'_'+M;
const existing=outcomes.get(key);
if(existing){existing.probability+=probability;return;}
const group=(id,count,isMain)=>({hex:id,count,death:getMonDB(id)?.s[12]??100,isMain});
const monGroups=[group(hex,M,true),...survivors.map(s=>group(s.hex,s.count,false))];
outcomes.set(key,{key,kind,mainCount:M,supports:survivors,monGroups,
total:monGroups.reduce((n,g)=>n+g.count,0),probability});
};
for(let m=mainMin;m<=mainMax;m++){
add(m,[],[],pMain*branches[0]);
if(!(denominator>0))continue;
if(branches[1]>0)for(const a of supportPool){
const p=pMain*branches[1]*a.weight/denominator/(a.max-a.min+1);
for(let n=a.min;n<=a.max;n++)add(m,[a],[n],p);
}
if(branches[2]>0)for(const a of supportPool)for(const b of supportPool){
const p=pMain*branches[2]*(a.weight/denominator)*(b.weight/denominator)
/((a.max-a.min+1)*(b.max-b.min+1));
for(let na=a.min;na<=a.max;na++)for(let nb=b.min;nb<=b.max;nb++)add(m,[a,b],[na,nb],p);
}
}
return[...outcomes.values()].sort((a,b)=>a.supports.length-b.supports.length
||(a.supports[0]?.index??0)-(b.supports[0]?.index??0)
||(a.supports[1]?.index??0)-(b.supports[1]?.index??0));
}
function getMonsterDisplayName(hx){
const m=getMonDB(hx);
return m?(DISPLAY_LANG==='EN'?m.en:m.jp):hx;
}
function getStatLabel(st){
switch(st){
case'might':return'M';
case'str':return'STR';
case'str+might':return'STR+M';
case'str+deft':return'STR+D';
case'mending':return'Mend';
case'deft':return'D';
default:return'ATK';
}
}
function renderKathwackPlan(monId,monGroups){
const hexId=toMonsterHexId(monId);
const useJP=DISPLAY_LANG!=='EN';
const name=useJP?'ザラキーマ':'Kathwack';
const groups=(monGroups&&monGroups.length)?monGroups:(hexId?[{hex:hexId,count:1}]:[]);
for(const g of groups){
const m=getMonDB(g.hex);
if(!m||m.s[12]<=0){
return`<div style="font-size:10px;margin-left:16px;color:#666;">${name} <span style="color:#f44;">✗</span> <span style="font-size:9px;color:#888;">death=0</span></div>`;
}
}
const chars=readCharStatsFromDom();
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
const nm=multi?getMonsterDisplayName(g.hex)+(cnt>1?'×'+cnt:'')+' ':'';
html+=` <span style="color:#f80;font-size:9px;">${nm}×d=${res} → ${fmtAcc(eff)}</span>`;
}
}
if(multi){
html+=` <span style="color:#ff0;font-size:9px;">${L12}≈${(wipe*100)%1===0?(wipe*100)+'%':(wipe*100).toFixed(1)+'%'}</span>`;
}
if(baseAcc<100){
html+=!anyRes
?' <span style="color:#888;font-size:9px;">(100%: M≥799)</span>'
:' <span style="color:#888;font-size:9px;">('+L18+': M≥799)</span>';
}
html+='</div>';
return html;
}
function solverConditionText(value){
return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function buildSolverNeutralConditions(entry,targets,bat,turn2Cost){
const proof=entry.conditionProof;
return{
bat,turn2Cost,multiOnly:!!entry.multiOnly,
proof:{rating:proof.rating,party:proof.party,assign:proof.assign,eggAssign:proof.eggAssign||null,
pathSig:proof.pathSig||'',actionResults:proof.actionResults||null,statRequirement:proof.statRequirement||null,
statBounds:proof.statBounds||null,boundWitnesses:proof.boundWitnesses||null,
conditionalBounds:proof.conditionalBounds||null,boundsScope:proof.boundsScope||null,
usage:solverConditionStatUsage(entry.combo,proof,targets)},
targets:(targets||[]).map(g=>{
const mon=getMonDB(g.hex),hp=mon?mon.s[0]:null;
return{hex:g.hex,name:getMonsterDisplayName(g.hex),count:g.count||1,
hp,hpLow:hp===null?null:Math.floor(hp*0.8)};
})
};
}
function solverConditionValue(proof,index,key,summary){
const bound=proof&&proof.statBounds&&proof.statBounds.find(b=>b.index===index&&b.key===key);
if(bound){
const label=getStatLabel(key);
if(bound.lo===0&&bound.hi===ST_CAP)return label+' '+L78;
return label+(bound.lo===bound.hi?'='+bound.lo:bound.hi===ST_CAP?'≥'+bound.lo:' '+bound.lo+'–'+bound.hi);
}
const requirement=proof&&proof.statRequirement;
const label=getStatLabel(key);
if(requirement&&requirement.index===index&&requirement.key===key){
if(requirement.min===0)return label+' '+L78;
return label+'≥'+requirement.min;
}
const value=proof&&proof.party&&proof.party[index]&&proof.party[index].stats
?proof.party[index].stats[key]:ST_CAP;
return label+(summary?'=':':')+value;
}
function solverConditionConditionalRows(proof){
if(!proof||!proof.statBounds||!proof.conditionalBounds)return[];
const circled=['①','②','③','④'];
const label=vi=>{
const b=proof.statBounds[vi];
return(circled[b.index]||(b.index+1)+'.')+' '+getStatLabel(b.key);
};
return proof.conditionalBounds.filter(c=>c.ranges.length&&c.fixed.every(f=>f.variable<c.target)).map(c=>{
const premise=c.fixed.map(f=>label(f.variable)+'='+f.value).join(' ＋ ');
const range=c.ranges.map(r=>r.lo===0&&r.hi===ST_CAP?' '+L78
:r.lo===r.hi?'='+r.lo:' '+r.lo+'–'+r.hi).join(T(' or ',' 或 ',' または '));
return(premise?premise+' → ':'')+label(c.target)+range;
});
}
function renderSolverConditionalBounds(proof){
const rows=solverConditionConditionalRows(proof);
if(!rows.length)return'';
return'<span data-condition-endpoint-cases="1" style="white-space:nowrap;">'
+rows.map(row=>'<span data-condition-endpoint-case="1">'+solverConditionText(row)+'</span>').join('；')+'</span>';
}
function renderSolverConditionSummary(conditions){
const proof=conditions&&conditions.proof;
if(!proof)return'';
const conditional=renderSolverConditionalBounds(proof);
if(conditional)return conditional;
const usage=proof.usage||[];
const circled=['①','②','③','④'];
const groups=[];
for(let i=0;i<usage.length;i++){
const row=usage[i];
if(!row.stats||!row.stats.length)continue;
const values=row.stats.map(key=>solverConditionValue(proof,row.index,key,true));
groups.push((circled[row.index]||(row.index+1)+'.')+' '+values.join(' + '));
}
return groups.join(' · ');
}
function solverConditionFullStat(proof,index,key){
if(!proof.statBounds)return getStatLabel(key)+' '+proof.party[index].stats[key];
const b=proof.statBounds.find(b=>b.index===index&&b.key===key);
const lo=b?b.lo:0,hi=b?b.hi:ST_CAP;
return getStatLabel(key)+' '+(lo===0&&hi===ST_CAP?L78:lo===hi?lo:lo+'–'+hi);
}
function solverConditionActionTargets(proof,ci){
const result=proof&&proof.actionResults&&proof.actionResults.find(r=>r.ci===ci);
if(result){
const groups=new Map();
for(const t of result.targets){
const key=t.groupIdx+':'+t.outcome;
if(!groups.has(key))groups.set(key,{role:t.groupIdx===0?'M':'S',groupIdx:t.groupIdx,
hex:t.hex,count:0,outcome:t.outcome,indices:[]});
const group=groups.get(key);group.count++;group.indices.push(t.index);
}
return groups.size?[Array.from(groups.values())]:[];
}
const alternatives=[],seen=new Set(),prefix=ci+':d:';
for(const path of((proof&&proof.pathSig)||'').split('>')){
const row=path.split(';').find(r=>r.startsWith(prefix));
if(!row)continue;
const groups=new Map();
for(const target of row.slice(prefix.length).split(',')){
const fields=target.split(':'),role=fields[0],hex=fields[1];
if(fields.length!==5||!/^[MS]$/.test(role)||!/^[0-9A-F]{3}$/.test(hex))continue;
const key=role+':'+hex;
if(!groups.has(key))groups.set(key,{role,hex,count:0});
groups.get(key).count++;
}
const targets=Array.from(groups.values());
const key=JSON.stringify(targets);
if(targets.length&&!seen.has(key)){seen.add(key);alternatives.push(targets);}
}
return alternatives;
}
function renderSolverNeutralDetails(data){
const conditions=data.neutralConditions;
if(!conditions)return'<div style="color:#888;font-size:9px;margin-left:24px;">'+L19+'</div>';
const escape=solverConditionText;
const lines=['<div style="color:#0ff;">'+L60+'</div>',
'<div style="color:#888;">'+L19+'</div>'];
if(conditions.targets.length)lines.push('<div>'+L21+conditions.targets.map(g=>
escape(g.name)+(g.count>1?'×'+g.count:'')+(g.hp===null?'':' HP '+g.hpLow+'–'+g.hp)).join(' / ')+'</div>');
if(conditions.proof){
const proof=conditions.proof;
lines.push('<div data-stat-proof="1" style="color:#0ff;">'+L71+' · '+L73+': '+escape(proof.rating)+'</div>');
lines.push('<div style="color:#789;">'+(proof.statBounds
?T('Actor rows show individual extrema for this action/target order, not freely combinable ranges. Each arrow below fixes all stats on its left; any integer in a right-hand interval then works. These are endpoint pairings, not a list of every intermediate pairing.',
'角色列為本出手／命中順序中各能力值的總上下界，不可任意配對。每個箭頭須固定左側全部數值，右側區間內任一整數才可成立；分號分隔不同成立條件，並非列盡所有中間搭配。',
'各キャラの行はこの行動・対象順での個別の上下限で、自由には組み合わせられません。各矢印の左側をすべて固定すると右側の区間内の整数が成立します。上下限の組合せであり、中間の全組合せを列挙したものではありません。')
:L72)+'</div>');
for(const index of[0,1,2,3]){
const c=proof.party[index],s=c.stats;
lines.push('<div data-condition-actor="'+index+'">'+L20+(index+1)+' · Lv'+c.lv+' · '+L75+' '+(index+1)
+' · '+['atk','might','str','mending','deft'].map(key=>solverConditionFullStat(proof,index,key)).join(' · ')+'</div>');
}
const conditional=renderSolverConditionalBounds(proof);
if(conditional)lines.push('<div style="color:#0cc;">'+conditional+'</div>');
if(proof.statBounds&&proof.statBounds.length>1)lines.push('<div style="color:#789;">'
+T('Verified example: ','成立數值例：','成立例：')
+proof.statBounds.map(b=>L20+(b.index+1)+' '+getStatLabel(b.key)+' '+proof.party[b.index].stats[b.key]).join(' · ')+'</div>');
}
const combo=data.combo||[],atSum=combo.reduce((n,v)=>n+(v.at||0),0);
const eggTargets=solverConditionEggTargets(combo,conditions.proof.eggAssign||data.eggAssign);
lines.push('<div>AT '+atSum+(conditions.turn2Cost===null?'':' + '+conditions.turn2Cost+' ('+L13+')')
+' = Bat. '+conditions.bat+'</div>');
if(conditions.multiOnly)lines.push('<div style="color:#ff0;">'+L68+'</div>');
lines.push('<div style="color:#789;">'+L69+'</div>');
for(let ci=0;ci<combo.length;ci++){
if(ci%4===0){
const acting=conditions.proof.assign.slice(ci,ci+4);
const defenders=[0,1,2,3].filter(ai=>!acting.includes(ai));
lines.push('<div style="color:#789;">'+(ci?L13:L76)
+(defenders.length?' · '+L34+defenders.map(ai=>L20+(ai+1)).join(', '):'')+'</div>');
}
const v=combo[ci],sk=lookupSkill(v.jp);
const targetOptions=solverConditionActionTargets(conditions.proof,ci);
const area=sk&&(SolverActionGate.targetKind(sk)==='G'||SolverActionGate.targetKind(sk)==='A');
const name=DISPLAY_LANG==='EN'?(v.en||v.jp):v.jp;
let text=L22+(ci+1)+L23+escape(name)+' · AT '+(v.at||0);
if(conditions.proof)text+=' · '+L20+(conditions.proof.assign[ci]+1);
if(v.id===SK_EGG&&eggTargets[ci]!==undefined){
const target=eggTargets[ci],beneficiary=combo[target];
text+=' → '+L20+(conditions.proof.assign[target]+1)+' '+escape(DISPLAY_LANG==='EN'?beneficiary.en||beneficiary.jp:beneficiary.jp);
}
if(v.at===0&&findInlineFource([v]))text+=' → '+T('All allies','全員','味方全員');
if(v.at>0){
text+=' · '+(area?T('Hits per enemy','每隻擊數','1体あたりの攻撃回数'):L65)+' '+SolverActionGate.hits(v);
if(area&&targetOptions.length){
const counts=Array.from(new Set(targetOptions.map(ts=>ts.reduce((sum,t)=>sum+t.count,0))));
text+=' · '+T('Enemies hit: ','命中 ','対象数 ')+counts.join(' / ')+T('',' 隻','体');
}
}
if(v.equip)text+=' · '+L64+' '+escape(v.equip);
if(data.eggAssign&&data.eggAssign[ci])text+=' · ⊕T'+getTensionLevel(data.eggAssign[ci]);
if(v.earlyKill)text+=' · '+L66;
if(sk&&/^R/.test(sk.target))text+=' · '+L67;
if(targetOptions.length){
const targetName=t=>{
const group=t.groupIdx!==undefined?conditions.targets[t.groupIdx]
:t.role==='M'?conditions.targets[0]:conditions.targets.slice(1).find(g=>g.hex===t.hex);
let name=escape(group&&group.hex===t.hex?group.name:getMonsterDisplayName(t.hex));
if(group&&group.count>t.count&&t.indices){
const offset=conditions.targets.slice(0,t.groupIdx).reduce((sum,g)=>sum+g.count,0);
name+=' '+t.indices.map(i=>i-offset+1).join(',');
}
if(t.count>1)name+='×'+t.count;
if(t.outcome==='ko')name+=' '+L32;
else if(t.outcome==='possible')name+=' '+L33;
else if(t.outcome==='removed')name+=' '+L24;
return name;
};
text+=' → '+targetOptions.map(ts=>ts.map(targetName).join(' / ')).join(T(' or ',' 或 ',' または '));
}else if(v.tgtGroup!==undefined&&conditions.targets[v.tgtGroup])text+=' → '+escape(conditions.targets[v.tgtGroup].name);
lines.push('<div data-condition-action="'+ci+'">'+text+'</div>');
}
return'<div data-neutral-conditions="1" style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:6px;margin-top:2px;">'
+lines.join('')+'</div>';
}
function renderSolverResult(bat,monGroups,monId,mapDeft,canRound2,_forceKillAll,_prebuiltKmc,_prebuiltKillAll,_deferKillAll){
canRound2=solverAllowsRound2(mapDeft,canRound2);
try{
window._solverSolvable=null;
if(bat<0)return'';
const useStats=!!document.getElementById('si_useStats')?.checked;
_solverUseStats=useStats;
resetSolverDamageCache();
const T=monGroups.reduce((s,g)=>s+g.count,0);
const realT=monGroups.reduce((s,g)=>s+(g.count||1),0);
const tc2=Math.floor(realT/2);
if(bat===0){
const allD=monGroups.every(g=>{const m=getMonDB(g.hex);return m&&m.s[12]>0;});
if(allD){window._solverSolvable=true;return renderKathwackPlan(monId,monGroups);}
return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
}
const _mercyLv=Math.max(...(readCharStatsFromDom().map(c=>c.lv||99)));
const _planMeta=deriveSolverBattlePlan(monGroups,monId,_mercyLv,_forceKillAll);
const{hexId,isMetal,mainGroup,sups,metalSupCount:_metalSupCount}=_planMeta;
const mon=hexId?getMonDB(hexId):null;
const hasSups=sups.length>0&&sups.some(g=>g.count>0);
const _nonMetalSups=sups.filter(g=>(g.count>0)&&g.hex&&!isMetalHex(g.hex));
const _effDeath=_planMeta.effectiveDeath;
let planType=_planMeta.planType,postAlive=_planMeta.postAlive;
const _fallbackKillAll=()=>{
window._solverFallback=true;
if(_deferKillAll&&!_prebuiltKillAll){
window._solverNeedsKillAll='r1';
return'';
}
return renderSolverResult(bat,monGroups,monId,mapDeft,canRound2,true,null,_prebuiltKillAll,_deferKillAll);
};
let killTargets=null;
if(T>1)killTargets=monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)}));
let excludedPads=null,excludedPadsAfterMercy=null,supPads=null;
if(isMetal&&_nonMetalSups.length>0){
const _currentChars=readCharStatsFromDom();
const _mkExcluded=(supList)=>{
const set=new Set();
const seen=new Set();
for(const row of _METAL_PADDING){
const jp=row[0];
if(seen.has(jp))continue;seen.add(jp);
const sk=SKILL_IDX[jp]||null;
if(!sk)continue;
if(sk.target==='S'||sk.target==='G')continue;
for(const g of supList){
const m=MONSTER_DB[g.hex];
if(!m)continue;
const hp100=m.s[0];
const hp80=Math.floor(hp100*0.8);
const eq=row[3];
const span=buildCharDamageSpan(sk,toMonsterHexId(g.hex),eq,getEquipHitCount(sk,eq),_currentChars);
if(span.max>=hp80){set.add(jp);break;}
}
}
return set;
};
excludedPads=_mkExcluded(_nonMetalSups);
const _stayAfterMercy=_nonMetalSups.filter(g=>_effDeath(g)===0);
excludedPadsAfterMercy=_stayAfterMercy.length===_nonMetalSups.length
?excludedPads:_mkExcluded(_stayAfterMercy);
supPads=[];
for(const row of _METAL_PADDING){
if(row[3]!=='miss')continue;
const sk=SKILL_IDX[row[0]]||null;
if(!sk||sk.target!=='S'||sk.ev!==0||!(sk.el>0))continue;
const hitAT=sk.at[0];
if(!(hitAT>0)||hitAT===sk.miss)continue;
for(let gi=0;gi<monGroups.length;gi++){
const g=monGroups[gi];
if(!(g.count>0)||!g.hex||isMetalHex(g.hex))continue;
const m=MONSTER_DB[g.hex];
if(!m||!(m.s[sk.el]>0))continue;
const hp100=m.s[0];
const hp80=Math.floor(hp100*0.8);
const span=buildCharDamageSpan(sk,toMonsterHexId(g.hex),'',getEquipHitCount(sk,''),_currentChars);
if(span.max>=hp80)continue;
supPads.push({jp:row[0],en:row[1],at:hitAT,equip:'',note:'👉',hits:1,mdmg:0,tgtGroup:gi,supTarget:true});
}
}
for(const row of _METAL_PADDING){
const sk=SKILL_IDX[row[0]]||null;
if(!sk||sk.target!=='S'||row[3]==='miss')continue;
const H=getEquipHitCount(sk,row[3]);
if(H<=1)continue;
for(let gi=0;gi<monGroups.length;gi++){
const g=monGroups[gi];
if(!(g.count>0)||!g.hex||isMetalHex(g.hex))continue;
const m=MONSTER_DB[g.hex];
if(!m||(sk.ev&&m.s[3]!==0)||(sk.blk&&m.s[4]!==0))continue;
for(let h=1;h<H;h++){
supPads.push({jp:row[0],en:row[1],at:sk.at[0]+sk.at[1]*(h-1),equip:row[3],note:(row[4]||'')+'👉'+`⚡${h}hit`,hits:h,earlyKill:true,mdmg:0,tgtGroup:gi,supTarget:true,retarget:true});
}
}
}
supPads.sort((a,b)=>b.at-a.at);
}
_solverGroupCounts=killTargets?killTargets.map(t=>t.count):null;
_solverFieldTotal=killTargets?killTargets.reduce((s,t)=>s+t.count,0):null;
const _phaseBCountsAll=killTargets?killTargets.map(t=>
isMetalHex(t.hex)?0:(t.count||0)):null;
const _phaseBCountsAfterMercy=killTargets?killTargets.map(t=>
(isMetalHex(t.hex)||t.death>0)?0:(t.count||0)):null;
const _metalSupNeed=(killTargets&&T>1)?_metalSupCount:0;
_solverIssenNeed=_metalSupNeed;
const _metalSupFilter=(cs)=>_metalSupNeed===0?cs
:cs.filter(c=>c.reduce((n,v)=>n+(isMetalExecutionAction(v)?1:0),0)===_metalSupNeed);
const _walkOK=rawCombo=>solverCandidateStructureOK(rawCombo,{isMetal,killTargets,T,planType,postAlive,metalSupNeed:_metalSupNeed});
let combos=[],isRound2=false;
const mercyAction=_ACT_MERCY;
const _metalHPs=[];
let _metalCount=0;
for(const g of monGroups){
const gHex=g.hex?toMonsterHexId(g.hex):null;
const gIsMetal=gHex&&isMetalHex(gHex);
if(gIsMetal){
const s=(getMonDB(g.hex)||{}).s;
const h=(s&&s[0])?s[0]:999;
for(let i=0;i<(g.count||1);i++){_metalHPs.push(h);_metalCount++;}
}
}
if(isMetal&&_metalCount===0)_metalCount=T;
let _atVariants=null,_atSpaces=null;
if(_metalCount===0){
_atVariants=expandSolverCombos(T,[],hexId);
const r1AT=isSolverATReachable(_atVariants,bat,4);
const r2SameAT=canRound2&&isSolverATReachable(_atVariants,bat,8,5);
const r2DropAT=canRound2&&tc2>0&&isSolverATReachable(_atVariants,bat-tc2,8,5);
const r2AT=r2SameAT||r2DropAT;
_atSpaces=[];
if(r1AT)_atSpaces.push({target:bat,min:1,max:4});
if(r2SameAT)_atSpaces.push({target:bat,min:5,max:8});
if(r2DropAT)_atSpaces.push({target:bat-tc2,min:5,max:8});
if(!r1AT&&!r2AT){
window._solverSolvable=false;
return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
}
}
if(planType!=='kill_all'&&_metalCount===0){
const _allNeedEight=_atSpaces&&_atSpaces.length&&_atSpaces.every(sp=>
sp.min===5&&!isSolverATReachable(_atVariants,sp.target,7,5));
if(_allNeedEight){
planType='kill_all';postAlive=0;window._solverFallback=true;
}
}
if(planType==='kill_all'){
if(_deferKillAll&&!_prebuiltKillAll&&!_forceKillAll){
window._solverFallback=true;window._solverNeedsKillAll='r1';return'';
}
const _kaR1=_prebuiltKillAll&&Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r1')
?_prebuiltKillAll.r1
:(isMetal?solveMetalComboOrders(bat,T,4,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll):solveBattleCombo(bat,T,4,[],hexId));
combos=_metalSupFilter(_kaR1||[]).filter(_walkOK);
if(combos.length===0&&canRound2){
if(_deferKillAll&&_prebuiltKillAll&&
!Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r2a')){
window._solverNeedsKillAll='r2';return'';
}
const r2a=_prebuiltKillAll&&Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r2a')
?_prebuiltKillAll.r2a
:(isMetal?solveMetalComboOrders(bat,T,8,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll):solveBattleCombo(bat,T,8,[],hexId));
const r2b=tc2>0?((_prebuiltKillAll&&Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r2b'))
?_prebuiltKillAll.r2b
:(isMetal?solveMetalComboOrders(bat-tc2,T,8,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll):solveBattleCombo(bat-tc2,T,8,[],hexId))):[];
combos=_metalSupFilter([...r2a,...r2b]).filter(c=>c.length>=5).filter(_walkOK);
isRound2=combos.length>0;
}
}else if(planType==='mercy_first'){
const _placeMercy=(c)=>{
if(c.some(v=>v.metalFirst)){
let k=0;
while(k<c.length&&isMetalExecutionAction(c[k]))k++;
return[...c.slice(0,k),mercyAction,...c.slice(k)];
}
return(c[0]&&c[0].supTarget)?[c[0],mercyAction,...c.slice(1)]:[mercyAction,...c];
};
const r1Dmg=_metalSupFilter(isMetal?solveMetalComboOrders(bat,postAlive,3,_metalCount,_metalHPs,excludedPads,hexId,supPads,excludedPadsAfterMercy,_phaseBCountsAfterMercy):solveBattleCombo(bat,postAlive,3,[]));
combos=r1Dmg.map(_placeMercy).filter(_walkOK);
if(combos.length===0&&canRound2){
if(tc2>0){
const s0=_metalSupFilter(isMetal?solveMetalComboOrders(bat-tc2,postAlive,7,_metalCount,_metalHPs,excludedPads,hexId,supPads,excludedPadsAfterMercy,_phaseBCountsAfterMercy):solveBattleCombo(bat-tc2,postAlive,7,[]))
.filter(c=>c.length>=4)
.map(_placeMercy).filter(_walkOK);
combos=combos.concat(s0);
}
const s4=_metalSupFilter(isMetal?solveMetalComboOrders(bat,postAlive,7,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAfterMercy):solveBattleCombo(bat,postAlive,7,[]))
.filter(c=>c.length>=5)
.map(c=>c.some(v=>v.metalFirst)?_placeMercy(c):[...c.slice(0,4),mercyAction,...c.slice(4)]).filter(_walkOK);
combos=combos.concat(s4);
isRound2=combos.length>0;
}
}else{
const kmcSpec=makeKmcBuildSpec(bat,T,postAlive,tc2,canRound2,hexId,_metalSupNeed);
const kmcRaw=_prebuiltKmc||buildKmcSerialPayload(kmcSpec);
combos=_metalSupFilter(kmcRaw.r1||[]).filter(_walkOK);
if(canRound2){
const r2a=_metalSupFilter(kmcRaw.r2a||[]).filter(_walkOK);
const r2b=tc2>0?_metalSupFilter(kmcRaw.r2b||[]).filter(_walkOK):[];
if(r2a.length+r2b.length>0){combos=combos.concat(r2a,r2b);isRound2=true;}
}
}
if(_metalSupNeed>0&&combos.length){
const _seenN=new Set(),_normN=[];
for(const c of combos){
const nc=[...c.filter(v=>!isMetalExecutionAction(v)),...c.filter(isMetalExecutionAction)];
const key=nc.map(v=>v.jp+'|'+(v.at||0)+'|'+(v.equip||'')+'|'+(v.aoeK!==undefined?v.aoeK:'')+'|'+(v.tgtGroup!==undefined?v.tgtGroup:'')+'|'+(v.hits||0)).join('¶');
if(!_seenN.has(key)){_seenN.add(key);_normN.push(nc);}
}
combos=_normN;
}
combos=combos.map(sortComboByPriority);
if(isMetal)combos=expandMetalRetarget(combos,killTargets,hexId);
if(combos.length===0){
if(planType!=='kill_all')return _fallbackKillAll();
window._solverSolvable=false;return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
}
window._solverSolvable=true;
const useJP=(DISPLAY_LANG!=='EN');
const filtered=[];
const fource=(!isMetal&&hexId)?pickBestFource(hexId):null;
const canFilter=mon&&!isMetal&&useStats;
const monEvade=mon?mon.s[3]:0;
const monBlock=mon?mon.s[4]:0;
const seen1=new Map();
combos=expandComboEquipVariants(combos,hexId);
let _anyRated=false;
for(const combo of combos){
if(mon&&combo.some(v=>v.needDeath0)&&mon.s[12]>0)continue;
if(isMetal&&combo.some(v=>v.needle))continue;
const dmgParts=combo.filter(v=>v.at>0);
if(dmgParts.length===1){
const v=dmgParts[0];
const rsk=_SOLVER_SK[v.jp];const sd=lookupSkillData(v.jp);
const statType=((rsk&&rsk.fixedDmg)?'fix'+rsk.fixedDmg:(sd&&sd.dmg&&sd.dmg.st)?sd.dmg.st:(sd&&sd.el?'el'+sd.el:'atk'))+(getWeaponTypeMultiplier(v.equip,hexId)>1?'_w11':'');
const _abKey=(v.equip&&WEAPON_META[v.equip]&&WEAPON_META[v.equip].antiBlk)?'_'+v.equip:'';
const key=v.at+'_'+statType+_abKey;
const vEv=sd?sd.ev:1;
const vBlk=sd?sd.blk:1;
const curReq=calcSolverMinStat(combo,hexId,1,null);
const curMin=curReq?curReq.min:Infinity;
if(seen1.has(key)){
const prev=seen1.get(key);
let dominated=true;
if(curMin<prev.reqMin)dominated=false;
if(monEvade>0&&vEv===0&&prev.ev===1)dominated=false;
if(monBlock>0&&vBlk===0&&prev.blk===1)dominated=false;
if(dominated)continue;
seen1.set(key,{jp:v.jp,ev:vEv,blk:vBlk,reqMin:curMin});
const prevIdx=filtered.findIndex(f=>{
const pDmg=f.combo.filter(x=>x.at>0);
return pDmg.length===1&&pDmg[0].jp===prev.jp;
});
if(prevIdx>=0)filtered.splice(prevIdx,1);
}else{
seen1.set(key,{jp:v.jp,ev:vEv,blk:vBlk,reqMin:curMin});
}
}
let _metalClearAssign=null;
const _hasPriDmg=combo.some(v=>v.at>0&&_actionPri(v)>0);
const _hasNonEl=combo.some(v=>{const sd=lookupSkillData(v.jp);return sd&&!sd.el;});
if(canFilter){
const _ord=(T===1)
?findBestOrderedAssignment(combo,hexId,mon,killTargets,1,null)
:{combo,best:findBestAssignment(combo,hexId,mon,killTargets,1,null)};
const _c1=_ord.combo,baseBest=_ord.best;
const kill=baseBest.rating;
const req=calcSolverMinStat(_c1,hexId);
const _baseRk=getRankOrderValue(kill);
if(kill){
filtered.push({combo:_c1,kill,req,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(_c1),eggAssign:baseBest.eggAssign||null,assign:baseBest.assign,defend:baseBest.defend,finIdx:baseBest.finIdx});
}
if(!_hasPriDmg&&planType!=='kill_mercy_clear'&&dmgParts.length<4&&_baseRk<2){
for(const t of _TENSION){
if(combo.length+t.eggs>4)break;
const prefix=makeEggOnPrefix(t.eggs);
const eggCombo=sortComboByPriority([...prefix,...combo]);
const eggBest=findBestAssignment(eggCombo,hexId,mon,killTargets,t.mul,null);
if(eggBest.rating&&(getRankOrderValue(eggBest.rating)>_baseRk||(eggBest.rating==='orange'&&_baseRk===1))){
const eggReq=calcSolverMinStat(combo,hexId,t.mul);
filtered.push({combo:eggCombo,kill:eggBest.rating,req:eggReq,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo),multiOnly:t.eggs>=2,eggAssign:eggBest.eggAssign,assign:eggBest.assign,defend:eggBest.defend,finIdx:eggBest.finIdx});
}
}
}
if(!_hasPriDmg&&fource&&combo.length<4&&_baseRk<2&&_hasNonEl){
const fEls=getFourceEls(fource.jp)||[];
const fCombo=sortComboByPriority([makeFourceAction(fource),...combo]);
const fBest=findBestAssignment(fCombo,hexId,mon,killTargets,1,fEls);
if(fBest.rating&&(getRankOrderValue(fBest.rating)>_baseRk||(fBest.rating==='orange'&&_baseRk===1))){
const fReq=calcSolverMinStat(combo,hexId,1,fource);
filtered.push({combo:fCombo,kill:fBest.rating,req:fReq,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo),eggAssign:fBest.eggAssign,assign:fBest.assign,defend:fBest.defend,finIdx:fBest.finIdx});
}
}
if(!_hasPriDmg&&fource&&_baseRk<2&&_hasNonEl){
const fEls=getFourceEls(fource.jp)||[];
for(const t of _TENSION){
if(combo.length+t.eggs+1>4)break;
const eggPrefix=makeEggOnPrefix(t.eggs);
const fourceEntry=makeFourceAction(fource);
const efCombo=sortComboByPriority([...eggPrefix,fourceEntry,...combo]);
const efBest=findBestAssignment(efCombo,hexId,mon,killTargets,t.mul,fEls);
if(efBest.rating&&(getRankOrderValue(efBest.rating)>_baseRk||(efBest.rating==='orange'&&_baseRk===1))){
const efReq=calcSolverMinStat(combo,hexId,t.mul,fource);
filtered.push({combo:efCombo,kill:efBest.rating,req:efReq,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo),multiOnly:t.eggs>=2,eggAssign:efBest.eggAssign,assign:efBest.assign,defend:efBest.defend,finIdx:efBest.finIdx});
}
}
}
}else if(mon&&T===1&&!isMetal){
const req=calcSolverMinStat(combo,hexId);
filtered.push({combo:finisherLastOrder(combo,req?req.finIdx:undefined),kill:null,req,
dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo)});
if(!_hasPriDmg&&planType!=='kill_mercy_clear'&&combo.length<4){
for(const t of _TENSION){
if(combo.length+t.eggs>4)break;
const eggReq=calcSolverMinStat(combo,hexId,t.mul);
if(eggReq&&eggReq.min<=999&&(!req||eggReq.min<req.min)){
const prefix=makeEggOnPrefix(t.eggs);
filtered.push({combo:sortComboByPriority([...prefix,...finisherLastOrder(combo,eggReq.finIdx)]),kill:null,req:eggReq,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo),multiOnly:t.eggs>=2});
}
}
}
if(!_hasPriDmg&&fource&&combo.length<4&&_hasNonEl){
const fReq=calcSolverMinStat(combo,hexId,1,fource);
if(fReq&&fReq.min<=999&&(!req||fReq.min<req.min)){
const fCombo=sortComboByPriority([makeFourceAction(fource),...finisherLastOrder(combo,fReq.finIdx)]);
filtered.push({combo:fCombo,kill:null,req:fReq,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo)});
}
}
if(!_hasPriDmg&&fource&&_hasNonEl){
for(const t of _TENSION){
if(combo.length+t.eggs+1>4)break;
const efReq=calcSolverMinStat(combo,hexId,t.mul,fource);
if(efReq&&efReq.min<=999&&(!req||efReq.min<req.min)){
const eggPrefix=makeEggOnPrefix(t.eggs);
const fourceEntry=makeFourceAction(fource);
filtered.push({combo:sortComboByPriority([...eggPrefix,fourceEntry,...finisherLastOrder(combo,efReq.finIdx)]),kill:null,req:efReq,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo),multiOnly:t.eggs>=2});
}
}
}
}else{
let _mCombo=combo;
if(isMetal&&killTargets&&killTargets.length&&T>1){
_metalClearAssign=findMetalClearAssign(combo,killTargets,readCharStatsFromDom(),hexId);
if(_metalClearAssign===undefined){
const _alt=metalClearReorder(combo,killTargets,readCharStatsFromDom(),hexId);
if(!_alt)continue;
_mCombo=_alt.combo;_metalClearAssign=_alt.assign;
}
}
let _kill=isMetal?'metal':null;
let _mAssign=_metalClearAssign||undefined;
if(useStats&&isMetal){
const _b=_metalClearAssign
?{rating:checkSolverDamage(_mCombo,hexId,mon,killTargets,1,null,{},_metalClearAssign),assign:_metalClearAssign}
:findBestAssignment(_mCombo,hexId,mon,killTargets,1,null);
if(_b.rating){_kill=_b.rating;if(_b.assign)_mAssign=_b.assign;}
}
filtered.push({combo:_mCombo,kill:_kill,req:null,dmgSkills:dmgParts.length,canAntiBlk:canComboAntiBlock(combo),
assign:_mAssign});
}
}
for(const entry of filtered){
if(!entry.multiOnly)entry.multiOnly=isMultiTargetOnly(entry.combo);
entry.retarget=entry.combo.some(v=>v.retarget);
entry.orderVariant=entry.combo.some(v=>v.orderVariant);
entry.addedVariant=entry.retarget||entry.orderVariant;
}
if(!document.getElementById('si_multiPlayer')?.checked){
for(let i=filtered.length-1;i>=0;i--)if(filtered[i].multiOnly)filtered.splice(i,1);
}
if(canFilter&&hexId&&(killTargets||T===1)){
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
const _tgN=killTargets?killTargets.length:1;
for(const entry of filtered){
if(entry.kill==='gold')continue;
const dmgIdx=[],dmgSk=[];
for(let i=0;i<entry.combo.length;i++){
if(entry.combo[i].at>0){dmgIdx.push(i);dmgSk.push(entry.combo[i]);}
}
const canTG=_tgN>=2;
if(dmgSk.length===0||(dmgSk.length<=1&&!canTG))continue;
let perms=dmgSk.length>1?_perms(dmgSk):[dmgSk];
if(_metalSupNeed>0){
perms=perms.filter(p=>{let seen=false;for(const v of p){if(isMetalExecutionAction(v))seen=true;else if(seen)return false;}return true;});
if(!perms.length)continue;
}
let bestCombo=entry.combo,bestRating=entry.kill,bestEgg=entry.eggAssign,bestCharAssign=entry.assign,bestDefend=entry.defend;
const evalCombo=(perm,tgs)=>{
let testCombo=entry.combo.slice();
for(let j=0;j<perm.length;j++){
const tg=tgs?tgs[j]:undefined;
testCombo[dmgIdx[j]]=tg===undefined?perm[j]:Object.assign({},perm[j],{tgtGroup:tg});
}
testCombo=sortComboByPriority(testCombo);
const pBest=findBestAssignment(testCombo,hexId,mon,killTargets,1,null);
if(getRankOrderValue(pBest.rating)>getRankOrderValue(bestRating)){
bestCombo=testCombo;bestRating=pBest.rating;bestEgg=pBest.eggAssign;bestCharAssign=pBest.assign;bestDefend=pBest.defend;
}
return bestRating==='gold';
};
let done=false;
for(const perm of perms){if(evalCombo(perm,null)){done=true;break;}}
if(T>1){
if(!done&&canTG){
let budget=216;
outer:
for(const perm of perms){
const opts=perm.map(v=>{
const sk=lookupSkill(v.jp);
if(!sk||sk.target!=='S'||v.soloGroup||v.tgtGroup!==undefined)return[undefined];
if(isMetalExecutionAction(v))return[undefined];
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
if(bestRating!=='gold'&&_metalSupNeed===0){
const plan=planAFinisher(entry.combo,hexId,mon,killTargets,entry.combo.length<=4?4:8);
if(plan){bestCombo=plan.combo;bestRating='gold';bestEgg=plan.eggAssign;bestCharAssign=plan.assign;bestDefend=plan.defend;if(plan.multiOnly)entry.multiOnly=true;}
}
if(bestRating!=='gold'&&bestCombo.length<=4&&_metalSupNeed===0){
const _mercyIdx35=bestCombo.findIndex(v=>v.id===SK_MERCY);
if(_mercyIdx35>=0&&killTargets&&killTargets.length>=2){
const _dmgOnly35=bestCombo.filter(v=>v.at>0);
if(_dmgOnly35.length>=2){
const _lastDmg35=_dmgOnly35[_dmgOnly35.length-1];
const _lastSk35=lookupSkill(_lastDmg35.jp);
if(_lastSk35&&(_lastSk35.target==='A'||_lastSk35.target==='RA')
&&_lastSk35.at&&_lastSk35.at.length>=2&&_lastSk35.at[1]===0){
const plan35=planAFinisher(_dmgOnly35,hexId,mon,killTargets,bestCombo.length);
if(plan35){
bestCombo=plan35.combo;bestRating='gold';bestEgg=plan35.eggAssign;
bestCharAssign=plan35.assign;bestDefend=plan35.defend;
if(plan35.multiOnly)entry.multiOnly=true;
}
if(bestRating!=='gold'){
const _swap35=bestCombo.slice();
_swap35[_mercyIdx35]=_ACT_EGG;
const _swBest35=findBestAssignment(_swap35,hexId,mon,killTargets,1,null);
if(getRankOrderValue(_swBest35.rating)>getRankOrderValue(bestRating)){
bestCombo=_swap35;bestRating=_swBest35.rating;bestEgg=_swBest35.eggAssign;
bestCharAssign=_swBest35.assign;bestDefend=_swBest35.defend;
}
}
}
}
}
}
}
entry.combo=bestCombo;
entry.kill=bestRating;
entry.eggAssign=bestEgg;
entry.assign=bestCharAssign;
entry.defend=bestDefend;
}
}
if(!useStats){
const proofTargets=killTargets||monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)}));
const proofs=new Map();
for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i],key=JSON.stringify(e.combo);
if(!proofs.has(key))proofs.set(key,findSolverConditionProof(e.combo,proofTargets,hexId,bat,e.req));
const proof=proofs.get(key);
if(!proof){filtered.splice(i,1);continue;}
e.conditionProof=proof;
e.assign=proof.assign;e.eggAssign=proof.eggAssign;
e.r1Removal=proof.r1Removal;e.finIdx=proof.finIdx;
e.defend=[0,1,2,3].filter(ci=>!proof.assign.includes(ci));
e.kill=null;
}
_anyRated=filtered.length>0;
}else{
const realTargets=killTargets||monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)}));
const chars=readCharStatsFromDom();
for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i];
const p=verifySolverConditionParty(e.combo,realTargets,hexId,bat,chars,e.assign,1,null,undefined,e.eggAssign,true);
if(!p){filtered.splice(i,1);continue;}
e.kill=p.rating;e.eggAssign=p.eggAssign;e.r1Removal=p.r1Removal;
e.battleProof=p;e.finIdx=p.finIdx;
}
_anyRated=filtered.length>0;
}
if(filtered.some(e=>e.kill==='gold'||e.kill==='orange'))_anyRated=true;
if(mon&&useStats&&hexId&&(killTargets||T===1)){
const _hasGold=filtered.some(e=>e.kill==='gold');
const _keepKill=_hasGold?'gold':'orange';
for(let i=filtered.length-1;i>=0;i--){
if(filtered[i].kill!==_keepKill)filtered.splice(i,1);
}
}
{
const _sigOf=(e)=>e.combo.map(v=>v.jp+(v.tgtGroup!==undefined?'>'+v.tgtGroup:'')+(v.soloGroup?'!':'')+(v.equip?'@'+v.equip:'')).join('+')
+'|'+(e.eggAssign?Object.keys(e.eggAssign).sort().map(k=>k+':'+e.eggAssign[k]).join(','):'');
const seenSig=new Map();
for(let i=0;i<filtered.length;i++){
const sig=_sigOf(filtered[i]);
if(seenSig.has(sig)){
const j=seenSig.get(sig);
if(getRankOrderValue(filtered[i].kill)>getRankOrderValue(filtered[j].kill))filtered[j]=filtered[i];
filtered.splice(i,1);i--;
}else seenSig.set(sig,i);
}
}
if(monBlock>0&&filtered.some(e=>e.canAntiBlk)){
for(let i=filtered.length-1;i>=0;i--)if(!filtered[i].canAntiBlk)filtered.splice(i,1);
}
const _isAUnifiedFinish=(e)=>{
const fi=(e.finIdx!=null)?e.finIdx:e.combo.length-1;
const fs=e.combo[fi];if(!fs)return false;
const sk=lookupSkill(fs.jp);
if(!sk||sk.target!=='A')return false;
return e.combo.some((v,i)=>i!==fi&&v.at>0);
};
filtered.sort((a,b)=>{
if(!useStats){
const rank=e=>e.conditionProof?getRankOrderValue(e.conditionProof.rating):0;
const diff=rank(b)-rank(a);
if(diff)return diff;
}
if(a.combo.length===1&&b.combo.length===1&&a.req&&b.req&&a.req.stat===b.req.stat){
if(a.req.min!==b.req.min)return a.req.min-b.req.min;
}
const ka=2-getRankOrderValue(a.kill);
const kb=2-getRankOrderValue(b.kill);
if(ka!==kb)return ka-kb;
if(monBlock>0){
const ba=a.canAntiBlk?0:1;
const bb=b.canAntiBlk?0:1;
if(ba!==bb)return ba-bb;
}
if(a.combo.length!==b.combo.length)return a.combo.length-b.combo.length;
const ua=_isAUnifiedFinish(a)?0:1;
const ub=_isAUnifiedFinish(b)?0:1;
if(ua!==ub)return ua-ub;
if(T>1&&a.kill!=='gold'){
const bufsA=a.combo.filter(v=>v.at===0&&v.id!==SK_MERCY).length;
const bufsB=b.combo.filter(v=>v.at===0&&v.id!==SK_MERCY).length;
if(bufsA!==bufsB)return bufsB-bufsA;
}
if(a.dmgSkills!==b.dmgSkills)return T>1?b.dmgSkills-a.dmgSkills:a.dmgSkills-b.dmgSkills;
const ma=a.multiOnly?1:0;
const mb=b.multiOnly?1:0;
if(ma!==mb)return ma-mb;
return(a.req?.min||0)-(b.req?.min||0);
});
{
const statsOn=!!document.getElementById('si_useStats')?.checked;
const simTargets=killTargets?killTargets
:((T===1&&monGroups)?monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)})):null);
const seen=new Set();
for(let i=0;i<filtered.length;i++){
const e=filtered[i];
const actionSig=solverComboActionSignature(e.combo);
let outcomeSig='';
if(statsOn&&simTargets){
outcomeSig=e.battleProof.pathSig;
}
e.outcomeSig=outcomeSig;
const reqSig=e.req?(e.req.posLabel||e.req.label||''):'';
const sig=[e.kill||'',reqSig,e.r1Removal===undefined?'':+!!e.r1Removal,
JSON.stringify(e.eggAssign||null),JSON.stringify(e.assign||null),JSON.stringify(e.defend||null),
actionSig,outcomeSig,JSON.stringify(e.conditionProof||null)].join('\x1d');
if(seen.has(sig)){filtered.splice(i,1);i--;}
else seen.add(sig);
}
}
if(filtered.length===0){
if(planType!=='kill_all')return _fallbackKillAll();
window._solverSolvable=_anyRated;
return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
}
const SHOW_INIT=5,SHOW_MAX=30;
let shownList=filtered.slice(0,SHOW_MAX);
if(filtered.length>SHOW_MAX&&filtered.some(e=>e.addedVariant)){
const room=Math.max(0,SHOW_MAX-filtered.filter(e=>!e.addedVariant).length);
let quota=room;
shownList=filtered.filter(e=>!e.addedVariant||quota-->0).slice(0,SHOW_MAX);
}
const bucketId='sb'+(window._solverBucketId++);
window._solverBuckets=window._solverBuckets||{};
const renderOne=(e,hidden)=>{
const{combo,kill,req,eggAssign,assign,defend}=e;
const cid=window._solverComboId++;
const _simTargets=killTargets?killTargets:((T===1&&monGroups)?monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)})):null);
window._solverComboMap[cid]={combo,killTargets:_simTargets,eggAssign,assign,defend,
outcomeSig:e.outcomeSig||'',
battleProof:useStats?e.battleProof:null,
neutralConditions:useStats?null:buildSolverNeutralConditions(e,_simTargets,bat,
combo.length>4?(e.r1Removal?tc2:0):null)};
const parts=combo.map((v,ci)=>{
const name=useJP?v.jp:v.en;
let s='<span style="color:#ccc;">'+name+'</span>';
if(v.note)s+='<span style="font-size:9px;">'+v.note+'</span>';
if(eggAssign&&eggAssign[ci]){
const tLv=getTensionLevel(eggAssign[ci]);
s+='<span style="color:#ff0;font-size:8px;">⊕T'+tLv+'</span>';
}
return s;
});
let tag='';
if(kill==='gold')tag=' <span style="color:#ffd700;font-size:9px;">★</span>';
else if(kill==='orange')tag=' <span style="color:#f80;font-size:9px;">☆</span>';
let comboHtml;
if(isRound2&&parts.length>4){
const tc=e.r1Removal?tc2:0;
const transSkill=' <span style="color:#f80;font-weight:bold;font-size:9px;">⮕'+L13+'(+'+tc+')</span> ';
comboHtml=parts.slice(0,4).join(' + ')+transSkill+parts.slice(4).join(' + ');
}else{
comboHtml=parts.join(' + ');
}
const disp=hidden?'display:none;':'';
let conditionHtml='';
const neutralDetails=useStats?'':renderSolverNeutralDetails(window._solverComboMap[cid]);
if(!useStats){
const summary=renderSolverConditionSummary(window._solverComboMap[cid].neutralConditions);
if(summary)tag+=' <span data-neutral-condition-summary="1" style="color:#39C5BB;font-size:9px;">'+summary+'</span>';
}
return'<div class="'+bucketId+'_row" style="'+disp+(!useStats?'white-space:nowrap;':'')+'font-size:10px;margin-left:16px;color:#aaa;cursor:pointer;" onclick="expandCombo('+cid+')">'
+comboHtml+tag+' <span style="color:#555;font-size:8px;">▶'+L14+'</span></div>'
+conditionHtml+'<div id="combo_detail_'+cid+'" style="display:none;">'+neutralDetails+'</div>';
};
const lines=shownList.map((e,i)=>renderOne(e,i>=SHOW_INIT));
window._solverBuckets[bucketId]={shown:Math.min(SHOW_INIT,shownList.length),total:shownList.length};
if(shownList.length>SHOW_INIT){
const remain=shownList.length-SHOW_INIT;
lines.push('<div id="'+bucketId+'_more" style="font-size:9px;margin-left:16px;color:#39C5BB;cursor:pointer;text-decoration:underline;" onclick="showMoreCombos(\''+bucketId+'\')">+'+remain+L16+'</div>');
}
const shownRound2=shownList.slice(0,SHOW_INIT).some(e=>e.combo.length>4);
if(shownRound2)lines.unshift('<div style="font-size:9px;margin-left:16px;color:#f80;">'+L15+'</div>');
return lines.join('');
}catch(e){console.error('[Solver]',e);window._solverSolvable=null;return'<div style="color:#f44;font-size:9px;">⚠ Solver error</div>';}
}
