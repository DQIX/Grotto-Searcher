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
function calcFinalQuality(baseQ,r1){
const modulo=Math.floor(baseQ/10)*2+1;
const offset=Math.trunc(r1%modulo-baseQ/10);
let final=baseQ+offset;
if(final<2)final=2;
if(final>248)final=248;
return final;
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
if(!SEED_TO_TIMERS_CACHE[s])SEED_TO_TIMERS_CACHE[s]=[];
SEED_TO_TIMERS_CACHE[s].push(t);
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
for(const timer of timers){
const{r1,r3}=timerToR1R3(timer);
const locToBq={};
for(let baseQ=2;baseQ<=248;baseQ++){
const finalQ=calcFinalQuality(baseQ,r1);
if(finalQ<fqMin||finalQ>fqMax)continue;
const locMax=getLocationMax(finalQ);
const calcLoc=(r3%locMax)+1;
if(!locToBq[calcLoc])locToBq[calcLoc]=new Set();
locToBq[calcLoc].add(baseQ);
}
for(const loc of Object.keys(locToBq).map(Number)){
let minBq=255;
for(const bq of locToBq[loc]){
if(bq<minBq)minBq=bq;
}
if(!seenLocations[loc]){
seenLocations[loc]=new Set();
outputOrder.push({timer,location:loc,minBq});
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
outputOrder.sort((a,b)=>{
if(a.timer==="Quest 015")return 1;
if(b.timer==="Quest 015")return-1;
if(a.timer!==b.timer)return a.timer-b.timer;
return a.minBq-b.minBq;
});
return{outputOrder,seenLocations};
}
let _cachedLocData=null;
function checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc){
_cachedLocData=null;
if(!checkBasicConds(engine,conds))return false;
if(!checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey,true).match)return false;
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
function LocaHtmlFromData(locData,conds){
if(!locData||locData.outputOrder.length===0)return"";
let targetLocNum=conds.location?parseInt(conds.location,16):null;
let targetBqNum=conds.bq?parseInt(conds.bq):null;
let matchedLocs=[];
for(let locObj of locData.outputOrder){
let locNum=locObj.location;
let isMatch=true;
if(targetLocNum!==null&&locNum!==targetLocNum)isMatch=false;
if(targetBqNum!==null&&!locData.seenLocations[locNum].has(targetBqNum))isMatch=false;
if(isMatch){matchedLocs.push(hex2(locNum));}
}
if(matchedLocs.length>0){
return`<span style="margin-left:4px;color:#ccc;font-size:10px;background:#222;padding:1px 4px;border-radius:3px;">${matchedLocs.join(' / ')}</span>`;
}
return"";
}
function getLocHtmlCached(seed,targetRankKey,conds){
if(!_cachedLocData&&seed<=0x7FFF&&targetRankKey!==null){
_cachedLocData=calcLocations(seed,targetRankKey);
}
return _cachedLocData?LocaHtmlFromData(_cachedLocData,conds):"";
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
function checkOnlyMonPossible(searchEngine,conds){
if(!conds.onlyMon)return true;
let baseMR=searchEngine.monsterRank;
let maxFloorMR=Math.min(12,baseMR+Math.floor((searchEngine.floorCount-1)/4));
let envMonsters=ONLY_MONSTERS[searchEngine._details[3]];
if(envMonsters){
for(let fMR=baseMR;fMR<=maxFloorMR;fMR++){
let mId=envMonsters[fMR];
if(mId&&MONSTER_DB[mId]&&MONSTER_DB[mId].en===conds.onlyMon)return true;
}
}
return false;
}
function getElistMonsterBadge(envType,floorMR,targetCount,onlyMonNameStr){
let result={badge:'',isCombinedHit:false};
let spawnDb=SPAWN_DB[envType][floorMR];
if(!spawnDb)return result;
let survivingNames=[];
let survivingNamesEn=[];
let isJP=(DISPLAY_LANG!=='EN');
let limit=targetCount>0?targetCount:spawnDb.length;
for(let i=0;i<spawnDb.length;i++){
if(spawnDb[i].length>1){
let mData=MONSTER_DB[spawnDb[i][0]];
if(mData){
survivingNames.push(isJP?mData.jp:mData.en);
survivingNamesEn.push(mData.en);
}
if(survivingNames.length===limit)break;
}
}
if(onlyMonNameStr&&survivingNamesEn.includes(onlyMonNameStr)){
result.isCombinedHit=true;
}
if(targetCount>0&&survivingNames.length>0){
result.badge=`<br><span style="display:inline-block;color:#aaa;font-size:11px;">${survivingNames.join(' + ')}</span>`;
}
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
function makeDBadge(dValue){
return dValue>0?` <span style="background:#fa0;color:#000;padding:1px 4px;border-radius:3px;font-size:10px;">${dValue}</span>`:'';
}
function checkElistAndD(searchEngine,conds,searchOnlyWithD,_onlyMonExpectedStr){
let result={match:true,specialHitDetails:[],jumpToFloor:-1,hasMatchedD:false};
if(!(conds.elist||conds.onlyMon||searchOnlyWithD))return result;
const isCombinedSearch=(['2','3','4','PARTIAL_NONE'].includes(conds.elist))&&!!conds.onlyMon;
let hasAnyD=false;
let elistMatched=!conds.elist;
let onlyMatched=!conds.onlyMon;
if(isCombinedSearch){
elistMatched=false;
onlyMatched=false;
}
let specialFloorCount=0,currentMapSpecials=[];
const envType=searchEngine._details[3];
const baseMR=searchEngine._details[2];
const isJP=(DISPLAY_LANG!=='EN');
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
let dBadge=makeDBadge(info.dValue);
let displayText=`B${f+1}F: ${info.state}${dBadge}${monBadge}`;
currentMapSpecials.push({f,state:info.state,dValue:info.dValue,monBadge});
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
let dBadge=makeDBadge(s.dValue);
let text=`B${s.f+1}F: ${s.state}${dBadge}${s.monBadge}`;
if(!result.specialHitDetails.includes(text))result.specialHitDetails.push(text);
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
function checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey,applyBqCount){
let targetLocNum=conds.location?parseInt(conds.location,16):null;
let targetBqNum=conds.bq?parseInt(conds.bq):null;
const bqCountFilter=applyBqCount?(conds.bqCount||""):"";
if(targetLocNum===null&&targetBqNum===null&&!searchFilterLoc&&!bqCountFilter)return{match:true};
if(seed>0x7FFF||targetRankKey===null)return{match:false};
_cachedLocData=calcLocations(seed,targetRankKey);
let locData=_cachedLocData;
if(locData.outputOrder.length===0)return{match:false};
if(targetLocNum!==null){
if(!locData.seenLocations[targetLocNum])return{match:false};
if(targetBqNum!==null&&!locData.seenLocations[targetLocNum].has(targetBqNum))return{match:false};
}else if(targetBqNum!==null){
let bqFound=false;
for(let loc in locData.seenLocations){if(locData.seenLocations[loc].has(targetBqNum)){bqFound=true;break;}}
if(!bqFound)return{match:false};
}
if(bqCountFilter==="1"){
let allBqs=new Set();
for(let loc in locData.seenLocations){
for(let bq of locData.seenLocations[loc])allBqs.add(bq);
}
if(allBqs.size!==1)return{match:false};
}else if(bqCountFilter==="1p"){
let found=false;
for(let loc in locData.seenLocations){
if(locData.seenLocations[loc].size===1){found=true;break;}
}
if(!found)return{match:false};
}
return{match:true};
}
function checkAnomalies(searchEngine,conds){
let result={match:true,anomalyDetails:[],jumpToFloor:-1};
if(conds.anomaly==="")return result;
let hasAnyChestAnomaly=false,hasAnyCorridorAnomaly=false,hasAnyStairAnomaly=false;
let hasAnyNoChestAnomaly=false,hasAnyMultiRegionAnomaly=false,hasAnyChestCorridorCombo=false;
let hasAnyGhostAnomaly=false,hasAnyAllInvalidAnomaly=false,corridorFloorCount=0;
let firstChestFloor=-1,firstCorridorFloor=-1,firstStairFloor=-1;
let firstNoChestFloor=-1,firstMultiRegionFloor=-1,firstGhostFloor=-1,firstAllInvalidFloor=-1;
for(let f=0;f<searchEngine.floorCount;f++){
if(conds.anomaly==='all_invalid'){
if(searchEngine.isStairOverflow[f]){hasAnyAllInvalidAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#cc0000;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_2}</span>`);if(firstAllInvalidFloor===-1)firstAllInvalidFloor=f;}
continue;
}
if(conds.anomaly==='ghost'){
const di=searchEngine.di[f];const W=di[2],H=di[3];
const upX=di[4],upY=di[5],downX=di[6],downY=di[7];
const gs=[];
for(let y=0;y<H;y++){const yOfs=(y<<4)+792;for(let x=0;x<W;x++){const t=di[yOfs+x];if(t===4||t===5){if(!((x===upX&&y===upY)||(x===downX&&y===downY)))gs.push(`(${x},${y})`);}}}
if(gs.length>0){hasAnyGhostAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#555577;padding:1px 4px;border-radius:3px;border:1px solid #8888aa;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_1}: ${gs.join(', ')}</span>`);if(firstGhostFloor===-1)firstGhostFloor=f;}
continue;
}
const needsIso=conds.anomaly==='corridor'||conds.anomaly==='multi_corridor'||conds.anomaly==='multi_region'||conds.anomaly==='chest_corridor';
let anom=getFloorAnomalies(searchEngine,f,false,!needsIso);
if(anom.isAllInvalidStair){hasAnyAllInvalidAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#cc0000;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_2}</span>`);if(firstAllInvalidFloor===-1)firstAllInvalidFloor=f;}
if(anom.hasInaccessibleStair){hasAnyStairAnomaly=true;result.anomalyDetails.push(`<span style="color:#ff0000;font-size:11px;font-weight:bold;background:#550000;padding:1px 4px;border-radius:3px;">B${f+1}F ${TKB3_0}</span>`);if(firstStairFloor===-1)firstStairFloor=f;}
if(anom.hasInaccessibleChest){hasAnyChestAnomaly=true;if(anom.totalChests===1){hasAnyNoChestAnomaly=true;result.anomalyDetails.push(`<span style="color:#0ff;font-size:11px;font-weight:bold;background:#004466;padding:1px 4px;border-radius:3px;border:1px solid #08a;">B${f+1}F ${TKB1_3}</span>`);if(firstNoChestFloor===-1)firstNoChestFloor=f;}else{result.anomalyDetails.push(`<span style="color:#ff69b4;font-size:11px;font-weight:bold;">B${f+1}F ${TKB1_1}</span>`);}if(firstChestFloor===-1)firstChestFloor=f;}
if(anom.hasIsolatedCorridor){hasAnyCorridorAnomaly=true;corridorFloorCount++;if(anom.isolatedRegions.length>=2){hasAnyMultiRegionAnomaly=true;if(firstMultiRegionFloor===-1)firstMultiRegionFloor=f;}let countBadges=anom.isolatedRegions.map(size=>`<span style="background:#ff6ec7;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;margin-left:4px;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${size}</span>`).join('');result.anomalyDetails.push(`<span style="color:#fa0;font-size:11px;">B${f+1}F ${TKB2_1} ${countBadges}</span>`);if(firstCorridorFloor===-1)firstCorridorFloor=f;}
if(anom.hasGhostStair){hasAnyGhostAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#555577;padding:1px 4px;border-radius:3px;border:1px solid #8888aa;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_1}: ${anom.GhostStairs.join(', ')}</span>`);if(firstGhostFloor===-1)firstGhostFloor=f;}
if(anom.hasInaccessibleChest&&anom.hasIsolatedCorridor)hasAnyChestCorridorCombo=true;
}
if(conds.anomaly==='chest'&&!hasAnyChestAnomaly)result.match=false;
else if(conds.anomaly==='nochest'&&!hasAnyNoChestAnomaly)result.match=false;
else if(conds.anomaly==='corridor'&&!hasAnyCorridorAnomaly)result.match=false;
else if(conds.anomaly==='stair'&&!hasAnyStairAnomaly)result.match=false;
else if(conds.anomaly==='ghost'&&!hasAnyGhostAnomaly)result.match=false;
else if(conds.anomaly==='all_invalid'&&!hasAnyAllInvalidAnomaly)result.match=false;
else if(conds.anomaly==='chest_corridor'&&!hasAnyChestCorridorCombo)result.match=false;
else if(conds.anomaly==='multi_corridor'&&corridorFloorCount<2)result.match=false;
else if(conds.anomaly==='multi_region'&&!hasAnyMultiRegionAnomaly)result.match=false;
if(result.match){
if(conds.anomaly==='chest')result.jumpToFloor=firstChestFloor;
else if(conds.anomaly==='nochest')result.jumpToFloor=firstNoChestFloor;
else if(conds.anomaly==='corridor'||conds.anomaly==='multi_corridor')result.jumpToFloor=firstCorridorFloor;
else if(conds.anomaly==='multi_region')result.jumpToFloor=firstMultiRegionFloor;
else if(conds.anomaly==='stair')result.jumpToFloor=firstStairFloor;
else if(conds.anomaly==='ghost')result.jumpToFloor=firstGhostFloor;
else if(conds.anomaly==='all_invalid')result.jumpToFloor=firstAllInvalidFloor;
else if(conds.anomaly==='chest_corridor')result.jumpToFloor=(firstChestFloor!==-1)?firstChestFloor:firstCorridorFloor;
}
return result;
}
function hex2(n){return n.toString(16).toUpperCase().padStart(2,'0');}
function hex4(n){return n.toString(16).toUpperCase().padStart(4,'0');}
function dispName(eng){return DISPLAY_LANG!=='EN'?eng.mapNameJP:eng.mapName;}
function dispBoss(eng){return DISPLAY_LANG!=='EN'?eng.bossNameJP:eng.bossName;}
function buildOnlyMonExpectedStr(conds){
if(!conds.onlyMon)return'';
let targetJpName=conds.onlyMon;
for(let id in MONSTER_DB){
if(MONSTER_DB[id].en===conds.onlyMon){targetJpName=MONSTER_DB[id].jp;break;}
}
return(DISPLAY_LANG!=='EN'?targetJpName:conds.onlyMon)+(DISPLAY_LANG!=='EN'?"オンリー":" only");
}
function resolveRankKey(rStr,rankNum){
return RANKS[rStr]?rStr:(RANKS["0x"+rStr]?"0x"+rStr:((rankNum!==undefined&&RANKS[rankNum])?rankNum:null));
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
if(conds&&conds.bq){
let baseQ=parseInt(conds.bq);
let modulo=Math.floor(baseQ/10)*2+1;
let minOffset=Math.trunc(0-baseQ/10);
let maxOffset=Math.trunc((modulo-1)-baseQ/10);
let minFinalQ=Math.max(2,baseQ+minOffset);
let maxFinalQ=Math.min(248,baseQ+maxOffset);
let rankInfo=RANKS[rStr];
if(rankInfo&&(maxFinalQ<rankInfo.fqMin||minFinalQ>rankInfo.fqMax))return null;
}
let minSMR=1,maxSMR=9;
for(let i=0;i<8;i++){
if(rank>=TableC[i*4]&&rank<=TableC[i*4+1]){
minSMR=TableC[i*4+2];
maxSMR=TableC[i*4+3];
break;
}
}
if(conds&&conds.monster){
let targetSMR=parseInt(conds.monster);
if(targetSMR<minSMR||targetSMR>maxSMR)return null;
}
let floorLo=2,floorHi=16;
for(let i=0;i<9;i++){
if(rank>=TableB[i*4]&&rank<=TableB[i*4+1]){
floorLo=TableB[i*4+2];
floorHi=TableB[i*4+3];
break;
}
}
let maxFloorCount=floorHi;
if(conds&&conds.depth){
let d=parseInt(conds.depth);
if(d<floorLo||d>floorHi)return null;
maxFloorCount=d;
}
if(conds&&conds.depth2){
let d2=parseInt(conds.depth2);
if(d2>floorHi)return null;
}
let minBoss=1,maxBoss=12;
for(let i=0;i<9;i++){
if(rank>=TableD[i*4]&&rank<=TableD[i*4+1]){
minBoss=TableD[i*4+2];
maxBoss=TableD[i*4+3];
break;
}
}
if(conds&&conds.boss){
let b=parseInt(conds.boss);
if(b<minBoss||b>maxBoss)return null;
}
if(conds&&conds.lv){
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
return{minSMR,maxSMR,maxFloorCount};
}
function sharedRankFilter(ranksToSearch,conds,isBugSearch=false){
if(!conds.onlyMon&&!conds.monster&&!conds.bq&&!conds.hasBoxCond&&!conds.prefix&&!conds.suffix&&!conds.lv&&!conds.depth&&!conds.depth2&&!conds.boss){
return ranksToSearch;
}
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
const{minSMR,maxSMR,maxFloorCount}=info;
if(conds.prefix){
const p=parseInt(conds.prefix);
let ok=false;
for(let smr=minSMR;smr<=maxSMR&&!ok;smr++){
for(let j=0;j<5;j++){
if(smr>=TableH[j*4]&&smr<=TableH[j*4+1]){
if(p>=TableH[j*4+2]&&p<=TableH[j*4+3])ok=true;
break;
}
}
}
if(!ok)return false;
}
if(conds.suffix){
const sf=parseInt(conds.suffix);
let ok=false;
for(let i=0;i<9&&!ok;i++){
if(rank>=TableD[i*4]&&rank<=TableD[i*4+1]){
for(let b=TableD[i*4+2];b<=TableD[i*4+3]&&!ok;b++){
for(let j=0;j<4;j++){
if(b>=TableI[j*4]&&b<=TableI[j*4+1]){
if(sf>=TableI[j*4+2]&&sf<=TableI[j*4+3])ok=true;
break;
}
}
}
}
}
if(!ok)return false;
}
let maxOffset=isBugSearch?3:Math.floor((maxFloorCount-1)/4);
if(conds.hasBoxCond){
let maxPossibleNum=Math.min(12,maxSMR+maxOffset);
for(let r=10;r>=1;r--){
if(conds.reqBox[r]>0&&!rankCanDropInMRRange(r,minSMR,maxPossibleNum))return false;
}
}
if(conds.onlyMon){
let targetEnv=conds.env?parseInt(conds.env):0;
let isPossible=false;
for(let env=1;env<=5;env++){
if(targetEnv&&env!==targetEnv)continue;
for(let fMR=1;fMR<=12;fMR++){
let mId=ONLY_MONSTERS[env][fMR];
if(mId&&MONSTER_DB[mId]&&MONSTER_DB[mId].en===conds.onlyMon){
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
if(targetFloorOffset!==undefined&&targetFloorOffset!==null){
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
function getATPair(seed,N){
let s=seed>>>0;
for(let i=0;i<N;i++)s=lcg(s);
const atN=(s>>>16)&0x7FFF;
s=lcg(s);
const atN1=(s>>>16)&0x7FFF;
return{atN,atN1};
}
function evaluateATPtn(pType,validCount,hb){
let matched=false,extractLen=0;
switch(pType){
case 1:if(validCount>=2&&(hb&3)===3){matched=true;extractLen=2;}break;
case 2:if(validCount>=3&&(hb&15)===5){matched=true;extractLen=4;}break;
case 3:if(validCount>=4&&(hb&9)===9){matched=true;extractLen=4;}break;
case 4:if(validCount>=3&&(hb&7)===7){matched=true;extractLen=3;}break;
case 5:if(validCount>=4&&(hb&15)===15){matched=true;extractLen=4;}break;
case 6:if(validCount>=5&&(hb&31)===31){matched=true;extractLen=5;}break;
case 7:if(validCount>=6){let v=hb&63;if(v===57||v===51||v===39){matched=true;extractLen=6;}}break;
case 8:if(validCount>=7){let v=hb&127;if(v===97||v===100||v===76||v===73||v===67){matched=true;extractLen=7;}}break;
case 9:if(validCount>=6&&(hb&63)===21){matched=true;extractLen=6;}break;
case 10:if(validCount>=8&&(hb&255)===85){matched=true;extractLen=8;}break;
case 11:if(validCount>=10&&(hb&1023)===341){matched=true;extractLen=10;}break;
case 12:if(validCount>=10){let v=hb&1023;if(v===337||v===325||v===277){matched=true;extractLen=10;}}break;
case 13:if(validCount>=10){let v=hb&1023;if(v===321||v===324||v===276||v===273||v===261){matched=true;extractLen=10;}}break;
}
return{matched,extractLen};
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
function _scanPattern(seed,maxSteps,threshold,pType,minStart,popIndex){
const valsBuffer=new Int32Array(10);
let rng=seed,historyBits=0,validCount=0;
let foundOffsets=[];
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
historyBits=((historyBits<<1)|((val<=threshold)?1:0))&1023;
valsBuffer[step%10]=val;
validCount++;
const{matched,extractLen}=evaluateATPtn(pType,validCount,historyBits);
if(matched){
const startStep=step-extractLen+1;
if(startStep>=effMinStart){
foundOffsets.push({start:startStep,valsHtml:formatATPtnHTML(extractLen,step,valsBuffer,historyBits)});
}
historyBits=0;validCount=0;
}
}
return{foundOffsets,popValue,defValue};
}
function _buildOffsetsHtml(foundOffsets){
return foundOffsets.map(o=>`<span style="color:#0ff;font-size:12px;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`).join('<br>');
}
function _buildDiffsHtml(foundOffsets,N,deft){
const lines=foundOffsets.map(o=>{
const d1=o.start-(N+3),d2=o.start-(N+4),d4=o.start-(N+5);
return`<span class="at-dynamic-battle" data-target="${o.start}" data-n="${N}" data-req="${deft}" style="font-size:11px;text-shadow:0 0 2px rgba(255,170,0,0.5);">${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}</span>`;
}).join(`<br><span style="color:transparent;font-size:11px;">${BATTLE_LABEL} </span>`);
return`<span style="color:#fa0;margin-left:12px;font-size:11px;">${BATTLE_LABEL} ${lines}</span>`;
}
function _buildATCard(seed,N,atN,atN1,diffsHtml){
const{deft,color:deftColor,label:deftLabel}=formatDeftness(atN1);
return`<div class="at-m-card" data-seed="${seed}" style="margin-top:4px;padding:5px 8px;background:#0a1a1a;border:1px solid #055;border-radius:3px;">
<span style="color:#4c4;font-size:11px;"><span class="at-m-atn-label">AT[${N}]:</span><span class="at-m-atval">${atN}</span></span>
<strong class="at-dynamic-mon"data-at="${atN}"style="color:#f8f;margin-left:8px;font-size:11px;text-shadow:0 0 2px rgba(255,136,255,0.5);"></strong>
<br><span class="at-m-deft"style="color:${deftColor};display:inline-block;margin-top:4px;font-size:11px;">${G18}${deftLabel}</span>
${diffsHtml}</div>`;
}
function _buildPatternBox(patternName,probText,offsetsHtml){
return`<div style="margin-top:4px;padding:4px 8px;background:#111;border:1px solid #333;border-radius:4px;">
<span style="color:#fa0;font-size:11px;font-weight:bold;">${patternName}(${probText})</span><br>${offsetsHtml}</div>`;
}
function buildSearchDetailHtml(specialHitDetails,anomalyDetails){
return{
specialHtml:specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(s => `<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>`:'',
anomalyHtml:anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html => html.replace('<span style="', '<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'',
};
}
function initItemI18n(){
if(typeof TableR!=='undefined'){TableR.forEach(pair=>{i18nDict['I_'+pair[0]]=T(pair[0],pair[1],pair[1]);});}
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
multibug:(engine,job)=>{
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
},
};
const ITEM_BASIC_REQS={
free:(eng,p,conds)=>eng.floorCount>=p.reqFloorCount,
quickload:(eng,p,conds)=>eng.floorCount>=(p.isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isB9F?2:0).length>0,
quickload9:(eng,p,conds)=>eng.floorCount>=(p.isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isB9F?2:0).length>0,
quickload9all:(eng,p,conds)=>eng.floorCount>=2&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],null).length>0,
third:(eng,p,conds)=>eng.floorCount>=(p.isS3?14:4)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isS3?3:0).length>0,
jfire:(eng,p,conds)=>eng.monsterRank===9&&eng.floorCount>=9,
tk:(eng,p,conds)=>eng.floorCount>=3,
};
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
if(soloC>=p.reqCount){
fHits.push(`<span style="color:#ff99bb;font-size:11px">${prefixStr}${STR_SOLO} x${soloC}</span>`);
}
if(partyC>=p.reqCount){
fHits.push(`<span style="color:#ffd700;font-size:11px">${prefixStr}${STR_PARTY} x${partyC}</span>`);
}
hitTypes.push(...fHits);
if(useB10&&fHits.length>0){
const boxes=soloC>=p.reqCount?soloIdx:partyIdx;
multi.push({floor:f,displayHtml:fHits.join('<br>'),astar:_uspChestChainCost(eng,f,boxes),isB10:f===9,isX3:boxes.length>p.reqCount});
}
}
if(useB10){
return multi.length>0?{isHit:true,multi}:{isHit:false};
}
if(hitTypes.length>0){
const res={isHit:true,jumpFloor:firstHitFloor,displayHtml:hitTypes.join('<br>')};
if(astarBoxes){
res.astar=_uspChestChainCost(eng,astarFloor,astarBoxes);
if(astarBoxes.length>p.reqCount)res.astarX3=true;
}
return res;
}
return{isHit:false};
},
quickload9:(eng,p)=>{
const sec=(p.qlSec==null)?4:p.qlSec;
const mk=sec===0?'⑤':'⑨';
const mkColor=sec===0?'#7fd4ff':'#b19cd9';
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
if(useB10)multi.push({floor:f,displayHtml:line,astar:_uspChestChainCost(eng,f,hitIdx),isB10:f===9,isX3:hitIdx.length>p.reqCount});
}
}
if(useB10){
return multi.length>0?{isHit:true,multi}:{isHit:false};
}
if(hitTypes.length>0){
const res={isHit:true,jumpFloor:firstHitFloor,displayHtml:hitTypes.join('<br>')};
if(astarBoxes){
res.astar=_uspChestChainCost(eng,astarFloor,astarBoxes);
if(astarBoxes.length>p.reqCount)res.astarX3=true;
}
return res;
}
return{isHit:false};
},
quickload9all:(eng,p)=>{
const sec=(p.qlSec==null)?4:p.qlSec;
const mk=sec===0?'⑤':'⑨';
const mkColor=sec===0?'#7fd4ff':'#b19cd9';
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
let prefix=0;
for(let f=0;f<f1;f++){
const c=_uspFloorCost(eng,f);
if(c==null){prefix=null;break;}
prefix+=c;
}
const forward=sumLegs(
prefix,
_uspPointCost(eng,f1,d1[4],d1[5],d1[17],d1[18]),
_tkLegCost(eng,f1,d1[17],d1[18],f2,d2[17],d2[18])
);
const reverse=sumLegs(
prefix,
_tkLegCost(eng,f1,d1[4],d1[5],f2,d2[17],d2[18]),
_tkLegCost(eng,f2,d2[17],d2[18],f1,d1[17],d1[18])
);
const vals=[forward,reverse];
const mnV=Math.min(...vals.map(v=>v==null?Infinity:v));
const fmt=v=>v==null?'—':(Number.isInteger(v)?v:v.toFixed(1));
res.astar=mnV===Infinity?null:mnV;
res.astarText=vals.map(fmt).join(' / ');
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
const fmt=v=>v==null?'—':(Number.isInteger(v)?v:v.toFixed(1));
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
let t=uniSec!=null?`${uniSec + 5}s`:((s===pp)?STR_BOTH:(pp===SOMA?STR_PARTY:STR_SOLO));
let color="#ff99d7";
if(uniSec!=null)color=uniSec===0?'#7fd4ff':'#b19cd9';
else if(t===STR_PARTY)color="#ffd700";
wpHits.push(`<span style="color:${color};font-size:11px">B${wpFloor+1}F S${b+1}: ${getDispItem(SOMA)} (${t})</span>`);
}
}
const wpCases=()=>{
if(uniSec!=null)return wpPartyIdx.length?[wpPartyIdx]:(wpSoloIdx.length?[wpSoloIdx]:[]);
const same=wpPartyIdx.length===wpSoloIdx.length&&wpPartyIdx.every((v,i)=>v===wpSoloIdx[i]);
if(same)return wpPartyIdx.length?[wpPartyIdx]:[];
const cs=[];
if(wpPartyIdx.length)cs.push(wpPartyIdx);
if(wpSoloIdx.length)cs.push(wpSoloIdx);
return cs;
};
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
const vals=wpCases().map(bx=>_tkAstar(eng,wpFloor,bx,tgt));
const mnV=Math.min(...vals.map(v=>v==null?Infinity:v));
target.astar=mnV===Infinity?null:mnV;
if(vals.length===2)target.astarText=`${fmt(vals[0])} / ${fmt(vals[1])}`;
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
let t=uniSec!=null?`${uniSec + 5}s`:((wpSet.has(s)&&wpSet.has(pp))?STR_BOTH:(wpSet.has(pp)?STR_PARTY:STR_SOLO));
let hitItem=wpSet.has(pp)?pp:s;
let hitItemStr=getDispItem(hitItem);
let rName=CHEST_RANK[eng.getBoxInfo(fIdx,b).rank]||'?';
let color="#ff99bb";
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
const wpCases=()=>{
if(uniSec!=null)return wpPartyIdx.length?[wpPartyIdx]:(wpSoloIdx.length?[wpSoloIdx]:[]);
const same=wpPartyIdx.length===wpSoloIdx.length&&wpPartyIdx.every((v,i)=>v===wpSoloIdx[i]);
if(same)return wpPartyIdx.length?[wpPartyIdx]:[];
const cs=[];
if(wpPartyIdx.length)cs.push(wpPartyIdx);
if(wpSoloIdx.length)cs.push(wpSoloIdx);
return cs;
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
matDet=`B3F ${b3Rank}3 (${foundSec + 5}s): ${getDispItem(p.targetItem)}`;
}
}
if(c1Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#f66;font-size:11px;font-weight:bold;">${matDet}</span>`;
const res={isHit:true,jumpFloor:2,displayHtml:html,specialStyle:"1px solid #f66"};
if(p.wantAstar){
const d3=eng.di[2];
const tgt=[{g:2,gx:d3[17],gy:d3[18]}];
const vals=wpCases().map(bx=>_tkAstar(eng,2,bx,tgt));
const mnV=Math.min(...vals.map(v=>v==null?Infinity:v));
res.astar=mnV===Infinity?null:mnV;
if(vals.length===2){
const fmt=v=>v==null?'—':(Number.isInteger(v)?v:v.toFixed(1));
res.astarText=`${fmt(vals[0])} / ${fmt(vals[1])}`;
}
}
return res;
}
return{isHit:false};
}
if(!checkWp(2))checkWp(3);
if(!wpMet)return{isHit:false};
let c1Met=false,c2Met=false,matDet="";
let b3V=false,pB3="",b3Rank="";
let b4V=false,pB4="",b4Rank="";
let currentB3Targets=p.isMillionaire?(wpFloor===2?p.strictMatTargets:p.broadMatTargets):p.strictMatTargets;
let currentB4Targets=p.isMillionaire?(wpFloor===3?p.strictMatTargets:p.broadMatTargets):p.strictMatTargets;
let checkSec=(p.isMillionaire?2:8)+shift;
let labelText=p.isMillionaire?"":`(${checkSec + 5}s)`;
if(eng.floorCount>2&&eng.getBoxCount(2)>=3){
pB3=eng.getBoxItem(2,2,checkSec)[0];
b3Rank=CHEST_RANK[eng.getBoxInfo(2,2).rank]||'?';
if(currentB3Targets.includes(pB3)){
let pB3_25s=eng.getBoxItem(2,2,20+shift)[0];
if(!p.isMillionaire){
if(!currentB3Targets.includes(pB3_25s))b3V=true;
}else{
if(!p.strictMatTargets.includes(pB3_25s))b3V=true;
}
}
}
if(eng.floorCount>3&&eng.getBoxCount(3)>=3){
pB4=eng.getBoxItem(3,2,checkSec)[0];
b4Rank=CHEST_RANK[eng.getBoxInfo(3,2).rank]||'?';
if(currentB4Targets.includes(pB4)){
let pB4_25s=eng.getBoxItem(3,2,20+shift)[0];
if(!p.isMillionaire){
if(!currentB4Targets.includes(pB4_25s))b4V=true;
}else{
if(!p.strictMatTargets.includes(pB4_25s))b4V=true;
}
}
}
if(b3V&&b4V){c2Met=true;matDet=`B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}<br>B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`;}
else if(b3V){c1Met=true;matDet=`B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}`;}
else if(b4V){c1Met=true;matDet=`B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`;}
if(c1Met||c2Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${matDet}</span>`;
const res={isHit:true,jumpFloor:wpFloor,displayHtml:html,specialStyle:c2Met?"1px solid #fa0":""};
if(p.wantAstar){
const t3=b3V?{g:2,gx:eng.di[2][17],gy:eng.di[2][18]}:null;
const t4=b4V?{g:3,gx:eng.di[3][17],gy:eng.di[3][18]}:null;
const fmt=v=>v==null?'—':(Number.isInteger(v)?v:v.toFixed(1));
const mnOf=arr=>{const m=Math.min(...arr.map(v=>v==null?Infinity:v));return m===Infinity?null:m;};
const cases=wpCases();
if(cases.length===1){
if(c2Met){
const a3=_tkAstar(eng,wpFloor,cases[0],[t3]);
const a4=_tkAstar(eng,wpFloor,cases[0],[t4]);
const ab=_tkAstar(eng,wpFloor,cases[0],[t3,t4]);
res.astar=mnOf([a3,a4,ab]);
res.astarText=`${fmt(a3)} / ${fmt(a4)} / ${fmt(ab)}`;
}else{
res.astar=_tkAstar(eng,wpFloor,cases[0],[b3V?t3:t4]);
}
}else if(cases.length===2){
const vals=cases.map(bx=>c2Met
?mnOf([_tkAstar(eng,wpFloor,bx,[t3]),_tkAstar(eng,wpFloor,bx,[t4]),_tkAstar(eng,wpFloor,bx,[t3,t4])])
:_tkAstar(eng,wpFloor,bx,[b3V?t3:t4]));
res.astar=mnOf(vals);
res.astarText=`${fmt(vals[0])} / ${fmt(vals[1])}`;
}
}
return res;
}
return{isHit:false};
},
};
const SEED_PROCESSORS={
ultimate:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const searchOnlyWithD=job.params.searchOnlyWithD;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const needMapGeneration=conds.hasBoxCond||conds.elist||conds.onlyMon||searchOnlyWithD||conds.anomaly!=="";
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
if(conds.onlyMon){
let isCombinedSearch=['2','3','4','PARTIAL_NONE'].includes(conds.elist);
if(!isCombinedSearch&&!checkOnlyMonPossible(searchEngine,conds))return null;
}
if(needMapGeneration)searchEngine.createDungeonDetail();
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
let fMR=searchEngine._details[2]+(f>>2);
if(fMR>12)fMR=12;
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
if(shouldShowMonBadge){
line+=getElistMonsterBadge(info.envType,info.floorMR,surviveCount,null).badge;
}
return line;
}).join('<br>');
const locHtml=_cachedLocData?LocaHtmlFromData(_cachedLocData,conds):"";
let bugIcon=isFloorIncreased?'📈':'';
const html=`
<span style="color:#ffd700;font-weight:bold;font-size:15px;">${hex4(seed)}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<div style="background:#111;padding:4px 8px;border-radius:4px;margin:4px 0;border:1px solid #333;">
<span style="color:#aaa;font-size:11px">[Source]${origName}|B${origFloors}F|${origBoss}</span><br>
<span style="color:#f8f;font-size:11px">[Bug]${bugName}|B${bugFloors}F|${bugBoss}${bugIcon}</span>
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
const fmtAstar=a=>` <span style="color:#ffc90e;font-size:11px;font-family:monospace;">${a == null ? '—' : (Number.isInteger(a) ? a : a.toFixed(1))}</span>`;
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
};
const _uspDIST=new Float64Array(256);
const _uspHC=new Float64Array(4096);
const _uspHN=new Int32Array(4096);
let _uspHS=0,_uspPC=0;
function _uspPush(c,n){
let i=_uspHS++;_uspHC[i]=c;_uspHN[i]=n;
while(i>0){
const p=(i-1)>>1;if(_uspHC[p]<=_uspHC[i])break;
let t=_uspHC[p];_uspHC[p]=_uspHC[i];_uspHC[i]=t;
t=_uspHN[p];_uspHN[p]=_uspHN[i];_uspHN[i]=t;i=p;
}
}
function _uspPop(){
const nd=_uspHN[0];_uspPC=_uspHC[0];const last=--_uspHS;
if(last>0){
_uspHC[0]=_uspHC[last];_uspHN[0]=_uspHN[last];let i=0;
for(;;){
const l=2*i+1,r=2*i+2;let m=i;
if(l<_uspHS&&_uspHC[l]<_uspHC[m])m=l;
if(r<_uspHS&&_uspHC[r]<_uspHC[m])m=r;
if(m===i)break;
let t=_uspHC[m];_uspHC[m]=_uspHC[i];_uspHC[i]=t;
t=_uspHN[m];_uspHN[m]=_uspHN[i];_uspHN[i]=t;i=m;
}
}
return nd;
}
function _uspPointCost(eng,f,sx,sy,gx,gy){
const di=eng.di[f];
const W=di[2],H=di[3];
if(W<=0||H<=0)return null;
if(sx===gx&&sy===gy)return 0;
if(sx<0||sx>=W||sy<0||sy>=H||gx<0||gx>=W||gy<0||gy>=H)return null;
const tl=(x,y)=>di[(y<<4)+x+792];
const wk=(x,y)=>(x>=0&&x<W&&y>=0&&y<H&&tl(x,y)!==1&&tl(x,y)!==3);
_uspDIST.fill(Infinity,0,(H<<4));
const s=(sy<<4)+sx;_uspDIST[s]=0;_uspHS=0;_uspPush(0,s);
while(_uspHS>0){
const nd=_uspPop();const co=_uspPC;
if(co>_uspDIST[nd])continue;
const cx=nd&0xF,cy=nd>>4;
if(cx===gx&&cy===gy)return co;
if(wk(cx,cy-1)){const ni=((cy-1)<<4)+cx,nc=co+1;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx,cy+1)){const ni=((cy+1)<<4)+cx,nc=co+1;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx-1,cy)){const ni=(cy<<4)+(cx-1),nc=co+1;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx+1,cy)){const ni=(cy<<4)+(cx+1),nc=co+1;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx+1,cy+1)&&wk(cx+1,cy)&&wk(cx,cy+1)){const ni=((cy+1)<<4)+(cx+1),nc=co+1.5;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx+1,cy-1)&&wk(cx+1,cy)&&wk(cx,cy-1)){const ni=((cy-1)<<4)+(cx+1),nc=co+1.5;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx-1,cy+1)&&wk(cx-1,cy)&&wk(cx,cy+1)){const ni=((cy+1)<<4)+(cx-1),nc=co+1.5;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
if(wk(cx-1,cy-1)&&wk(cx-1,cy)&&wk(cx,cy-1)){const ni=((cy-1)<<4)+(cx-1),nc=co+1.5;if(nc<_uspDIST[ni]){_uspDIST[ni]=nc;_uspPush(nc,ni);}}
}
return null;
}
function _uspFloorCost(eng,f){
const di=eng.di[f];
return _uspPointCost(eng,f,di[4],di[5],di[6],di[7]);
}
function _uspChestChainCost(eng,floor,boxes){
let sum=0;
for(let f=0;f<floor;f++){
const c=_uspFloorCost(eng,f);
if(c===null)return null;
sum+=c;
}
const d=eng.di[floor];
const n=boxes.length;
const px=[d[4]],py=[d[5]];
for(const b of boxes){px.push(d[b*2+13]);py.push(d[b*2+14]);}
const dist=[];
for(let i=0;i<=n;i++){
dist[i]=[];
for(let j=1;j<=n;j++)dist[i][j]=(i===j)?0:_uspPointCost(eng,floor,px[i],py[i],px[j],py[j]);
}
let best=null;
const walk=(rest,cur,cost)=>{
if(best!==null&&cost>=best)return;
if(rest.length===0){best=cost;return;}
for(let k=0;k<rest.length;k++){
const leg=dist[cur][rest[k]];
if(leg===null)continue;
walk(rest.slice(0,k).concat(rest.slice(k+1)),rest[k],cost+leg);
}
};
walk(boxes.map((_,i)=>i+1),0,0);
return best===null?null:sum+best;
}
function _tkLegCost(eng,f,x,y,g,gx,gy){
if(f===g)return _uspPointCost(eng,f,x,y,gx,gy);
const df=eng.di[f],dg=eng.di[g];
let a,b;
if(g===f+1){a=_uspPointCost(eng,f,x,y,df[6],df[7]);b=(a===null)?null:_uspPointCost(eng,g,dg[4],dg[5],gx,gy);}
else{a=_uspPointCost(eng,f,x,y,df[4],df[5]);b=(a===null)?null:_uspPointCost(eng,g,dg[6],dg[7],gx,gy);}
return b===null?null:a+b;
}
function _tkAstar(eng,wpFloor,wpIdx,targets){
let prefix=0;
for(let i=0;i<wpFloor;i++){
const c=_uspFloorCost(eng,i);
if(c===null)return null;
prefix+=c;
}
const d=eng.di[wpFloor];
const wpPts=wpIdx.map(b=>[d[b*2+13],d[b*2+14]]);
const orders=wpPts.length===2?[[0,1],[1,0]]:[wpPts.map((_,i)=>i)];
let bestWp=null,bestTotal=null;
for(const ord of orders){
let cx=d[4],cy=d[5],wpCost=0,ok=true;
for(const oi of ord){
const c=_uspPointCost(eng,wpFloor,cx,cy,wpPts[oi][0],wpPts[oi][1]);
if(c===null){ok=false;break;}
wpCost+=c;cx=wpPts[oi][0];cy=wpPts[oi][1];
}
if(!ok)continue;
const tOrders=targets.length===2?[[0,1],[1,0]]:[targets.map((_,i)=>i)];
let segBest=null;
for(const tOrd of tOrders){
let f=wpFloor,x=cx,y=cy,seg=0,tOk=true;
for(const ti of tOrd){
const t=targets[ti];
const c=_tkLegCost(eng,f,x,y,t.g,t.gx,t.gy);
if(c===null){tOk=false;break;}
seg+=c;f=t.g;x=t.gx;y=t.gy;
}
if(tOk&&(segBest===null||seg<segBest))segBest=seg;
}
if(segBest===null)continue;
const total=wpCost+segBest;
if(bestWp===null||wpCost<bestWp||(wpCost===bestWp&&total<bestTotal)){bestWp=wpCost;bestTotal=total;}
}
return bestTotal===null?null:prefix+bestTotal;
}
function _uspFloorTileCount(eng,f){
const di=eng.di[f];
const W=di[2],H=di[3];
if(W<=0||H<=0)return 0;
let count=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(isMainWalkable(di[(y<<4)+x+792]))count++;}
return count;
}
const _MAXTILE_DIMS=[16,15,14,13,12,11,10];
const _MAXTILE_REP_FLOORS=[0,4,8,12];
function _uspMetricByDim(eng,metricFn,better){
const fc=eng.floorCount;const r={};
for(const f of _MAXTILE_REP_FLOORS){
if(f>=fc)continue;
const di=eng.di[f];const W=di[2],H=di[3];
if(W<=0||H<=0||W!==H)continue;
if(!_MAXTILE_DIMS.includes(W))continue;
const dim=W+'x'+H;
const val=metricFn(eng,f);
if(val===null||val===undefined)continue;
if(!r[dim])r[dim]={bestVal:val,bestFloor:f,floors:[]};
r[dim].floors.push({f,val});
if(better(val,r[dim].bestVal)){r[dim].bestVal=val;r[dim].bestFloor=f;}
}
return r;
}
function _uspMakeMetricHtml(dimData,fmtFn){
const fm=fmtFn||(v=>Number.isInteger(v)?''+v:v.toFixed(1));
return`<span style="color:#ffc90e;font-weight:bold;font-size:13px">${fm(dimData.bestVal)}</span> <span style="color:#9ab;font-size:11px">B${dimData.bestFloor+1}F</span>`;
}
function _uspFastestHtml(eng,opts){
opts=opts||{};
const hideFloors=!!opts.hideFloors;
const fcAll=eng.floorCount;if(fcAll<=0)return null;
const hasLimit=(typeof opts.upToFloor==='number'&&opts.upToFloor>=0);
const limit=hasLimit?Math.min(opts.upToFloor,fcAll):fcAll;
const pf=new Array(limit);let sum=0;
for(let f=0;f<limit;f++){const c=_uspFloorCost(eng,f);if(c===null)return null;pf[f]=c;sum+=c;}
const fm=v=>(Number.isInteger(v)?v:v.toFixed(1));
let html=`<div style="margin-top:4px;"><span style="color:#ffc90e;font-weight:bold;font-size:14px">${fm(sum)}</span></div>`;
if(!hideFloors){
const floors=pf.map((c,f)=>{const isGoal=(!hasLimit&&f===limit-1);return`<span style="color:${isGoal?'#fc6':'#9ab'}">B${f+1}F${isGoal?'✦':''}<b style="color:#cde">${fm(c)}</b></span>`;}).join('<span style="color:#445"> · </span>');
html+=`<div style="margin-top:3px;font-size:11px;font-family:monospace;line-height:1.7">${floors}</div>`;
}
return{html,cost:sum};
}
SEED_SETUP.fastest=(engine,job)=>{
engine.trackOverflow=(job.conds.anomaly==='all_invalid'||job.conds.anomaly==='ghost');
engine._force_16_floors=(job.params.fastestMode==='maxtile');
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
};
SEED_PROCESSORS.fastest=(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const searchOnlyWithD=job.params.searchOnlyWithD;
const benchmarkMode=!!job.params.benchmarkMode;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const _fastMode=job.params.fastestMode;
searchEngine.calculateDetail(true);
if(_fastMode!=='maxtile'){
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
}
if(!benchmarkMode&&_fastMode!=='maxtile'&&searchEngine._details[0]===12){
const allowGrey=(parseInt(conds.boss)===12||conds.elist||conds.onlyMon||job.params.slowest||conds.depth2);
if(!allowGrey)return null;
}
if(conds.onlyMon&&_fastMode!=='maxtile'){
let isCombinedSearch=['2','3','4','PARTIAL_NONE'].includes(conds.elist);
if(!isCombinedSearch&&!checkOnlyMonPossible(searchEngine,conds))return null;
}
searchEngine.createDungeonDetail();
if(_fastMode==='maxtile'){
const _metric=job.params.metricType||'maxtile';
let metricFn,better,fmtFn;
if(_metric==='maxwalk'){
metricFn=_uspFloorCost;better=(a,b)=>a>b;fmtFn=(v=>Number.isInteger(v)?''+v:v.toFixed(1));
}else if(_metric==='mintile'){
metricFn=_uspFloorTileCount;better=(a,b)=>a<b;fmtFn=null;
}else{
metricFn=_uspFloorTileCount;better=(a,b)=>a>b;fmtFn=null;
}
const byDim=_uspMetricByDim(searchEngine,metricFn,better);
const results=[];
for(const dim of _MAXTILE_DIMS){
const dl=dim+'x'+dim;
const dd=byDim[dl];if(!dd)continue;
const mHtml=_uspMakeMetricHtml(dd,fmtFn);
const cardHtml=`<span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span><br>${mHtml}`;
results.push({seed,rStr:'DD',html:cardHtml,jumpFloor:dd.bestFloor,sortCost:dd.bestVal,fc:searchEngine.floorCount,_dimLabel:dl});
}
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
let fastestRes=_uspFastestHtml(searchEngine,benchmarkMode?{hideFloors:false,upToFloor:-1}:{hideFloors:!_showFloors,upToFloor:upToFloor});
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
};
async function coreRunScanJob(job,io){
const conds=job.conds;
const totalCombos=job.ranks.length*(job.endSeed-job.startSeed+1);
let processed=0;
let hitCount=0;
let batch=[];
let searchEngine=new GrottoDetail();
const setup=SEED_SETUP[job.processor];
if(setup)setup(searchEngine,job);
const proc=SEED_PROCESSORS[job.processor];
for(let rank of job.ranks){
if(io.cancelled())break;
let rStr=hex2(rank);
let targetRankKey=resolveRankKey(rStr,rank);
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(seed%250===0){
io.progress({processed,total:totalCombos,hits:hitCount,rStr,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
_cachedLocData=null;
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
const hasBoxCond=conds.hasBoxCond;
const atMchSeeds=new Map();
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if((seed&8191)===0){if(io.cancelled())return 0;await io.yield();}
let s=seed>>>0;
for(let i=0;i<N;i++)s=lcg(s);
const atN=(s>>>16)&0x7FFF;
if(atN<atmin||atN>atmax)continue;
if(deftMax>=0){
s=lcg(s);
const atN1=(s>>>16)&0x7FFF;
if(calcDeftness(atN1)>deftMax)continue;
atMchSeeds.set(seed,{atN,atN1});
}else{
s=lcg(s);
atMchSeeds.set(seed,{atN,atN1:(s>>>16)&0x7FFF});
}
}
const atPtnDetails=new Map();
if(pType>0){
const toDelete=[];
let scanned=0;
for(const[seed]of atMchSeeds){
if((++scanned&255)===0){if(io.cancelled())return 0;await io.yield();}
const{foundOffsets}=_scanPattern(seed,atMaxSteps,atThreshold,pType,N+3,0);
if(foundOffsets.length>0){
atPtnDetails.set(seed,{foundOffsets});
}else{
toDelete.push(seed);
}
}
for(const seed of toDelete)atMchSeeds.delete(seed);
}
const needMapGeneration=hasBoxCond||conds.elist||conds.onlyMon||searchOnlyWithD||conds.anomaly!=="";
let _onlyMonExpectedStr=buildOnlyMonExpectedStr(conds);
let searchEngine=new GrottoDetail();
searchEngine.trackOverflow=(conds.anomaly==='all_invalid'||conds.anomaly==='ghost');
let totalCombos=atMchSeeds.size;
let processed=0;
let hitCount=0;
let batch=[];
for(const[seed,atinfo]of atMchSeeds){
if(io.cancelled())break;
if(processed%200===0){
io.progress({processed,total:totalCombos,hits:hitCount});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
_cachedLocData=null;
searchEngine.calculateDetail(true);
if(!checkBasicConds(searchEngine,conds)){processed++;continue;}
if(!checkOnlyMonPossible(searchEngine,conds)){processed++;continue;}
if(needMapGeneration)searchEngine.createDungeonDetail();
let boxHtml="";
if(hasBoxCond){
let chestResult=ChestHtml(searchEngine,conds);
if(!chestResult.isMatch){processed++;continue;}
boxHtml=chestResult.html;
}
let elistResult=checkElistAndD(searchEngine,conds,searchOnlyWithD,_onlyMonExpectedStr);
if(!elistResult.match){processed++;continue;}
let locResult=checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey);
if(!locResult.match){processed++;continue;}
let anomResult=checkAnomalies(searchEngine,conds);
if(!anomResult.match){processed++;continue;}
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
patHtml=_buildPatternBox(job.patternName,job.probText,_buildOffsetsHtml(patData.foundOffsets));
diffsHtml=_buildDiffsHtml(patData.foundOffsets,N,deft);
}
let atHtml=_buildATCard(seed,N,atinfo.atN,atinfo.atN1,diffsHtml);
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
const{foundOffsets,popValue,defValue}=_scanPattern(seed,job.maxSteps,job.threshold,job.pType,job.POPIndex+3,job.POPIndex);
if(foundOffsets.length>0){
hitCount++;
let specificAtHtml='';
if(popValue!==null&&defValue!==null){
const{deft}=formatDeftness(defValue);
const diffsHtml=_buildDiffsHtml(foundOffsets,job.POPIndex,deft);
specificAtHtml=_buildATCard(seed,job.POPIndex,popValue,defValue,diffsHtml);
}
const html=`
<span style="color:#ffd700;font-weight:bold;font-size:13px;">${hex4(seed)}</span><br>
${_buildPatternBox(job.patternName,job.probText,_buildOffsetsHtml(foundOffsets))}
${specificAtHtml}
`;
batch.push({seed,rStr:null,html,pop:popValue!==null?popValue:99999});
}
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
const SKILL_DB=[
{cat:"skill",weapon:"Minstrel",jp:"火ふき芸",en:"Hot Lick",target:"S",at:[128,0],miss:120,ev:0,blk:0,el:5,metal:0,dmg:{s:3,b:20}},
{cat:"skill",weapon:"Hammer",jp:"ビッグバン",en:"Big Banga",target:"A",at:[74,0],miss:74,ev:0,blk:1,el:10,metal:0,dmg:{s:60,b:300},hiden:1},
{cat:"spell",jp:"ドルマドン",en:"Kazammle",target:"S",at:[67,0],miss:59,ev:0,blk:1,el:10,metal:0,cls:[10],dmg:{s:30,b:285,m:615,st:"might",lo:480,hi:999}},
{cat:"spell",jp:"メラガイアー",en:"Kafrizzle",target:"S",at:[55,0],miss:41,ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:23,b:292,m:600,st:"might",lo:480,hi:999}},
{cat:"skill",weapon:"Boomerang",jp:"ギガスロー",en:"Gigathrow",target:"S",at:[39,0],miss:29,ev:1,blk:1,el:8,metal:0,hiden:1},
{cat:"skill",weapon:"Whip",jp:"双竜打ち (単体)",en:"Twin Dragon Lash (Single)",target:"S",at:[30,12],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:2,max:2},mul:1.25},
{cat:"spell",jp:"マヒャド",en:"Kacrack",target:"A",at:[30,1],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:12,b:92,m:216,st:"might",lo:200,hi:999}},
{cat:"skill",weapon:"Whip",jp:"地這い大蛇",en:"Serpent's Bite",target:"G",at:[29,1],ev:1,blk:1,el:9,metal:0,hiden:1,mul:2},
{cat:"skill",weapon:"Hammer",jp:"ランドインパクト",en:"Crackerwhack",target:"A",at:[29,1],ev:0,blk:1,el:9,metal:0,dmg:{s:15,b:175}},
{cat:"skill",weapon:"Bow",jp:"シャイニングボウ",en:"Shining Shot",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:5,b:150},hiden:1},
{cat:"skill",weapon:"Boomerang",jp:"シャインスコール",en:"Starburst Throw",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:10,b:105}},
{cat:"spell",jp:"イオグランデ",en:"Kaboomle",target:"A",at:[29,1],ev:0,blk:0,el:8,metal:0,cls:[10],dmg:{s:10,b:210,m:480,st:"might",lo:550,hi:999}},
{cat:"item",jp:"ばくだん石",en:"Rockbomb shard",target:"A",at:[29,1],ev:0,blk:0,el:0,metal:0,dmg:{s:5,b:25}},
{cat:"item",jp:"マグマの杖",en:"Magma Staff",target:"A",at:[28,1],ev:0,blk:0,el:8,metal:0,dmg:{s:8,b:60}},
{cat:"skill",weapon:"Sword",jp:"ギガブレイク",en:"Gigagash",target:"G",at:[23,1],ev:0,blk:1,el:11,metal:0,dmg:{s:75,b:260,m:520,st:"str+might",lo:500,hi:1998},hiden:1},
{cat:"skill",weapon:"Whip",jp:"らせん打ち",en:"Hypnowhip",target:"S",at:[22,0],ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Spear",jp:"ジゴスパーク",en:"Lightning Storm",target:"A",at:[20,1],ev:0,blk:1,el:8,metal:0,dmg:{s:15,b:205,m:405,st:"str+might",lo:500,hi:1998},hiden:1},
{cat:"skill",weapon:"Fisticuffs",jp:"ばくれつけん",en:"Multifists",target:"RA",at:[20,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{cat:"skill",weapon:"Fisticuffs",jp:"岩石おとし",en:"Boulder Toss",target:"A",at:[20,1],ev:1,blk:1,el:9,metal:0,dmg:{s:10,b:110,m:300,st:"str+deft",lo:500,hi:1998}},
{cat:"spell",jp:"マヒャデドス",en:"Kacrackle",target:"A",at:[17,1],ev:0,blk:0,el:6,metal:0,cls:[2],dmg:{s:20,b:185,m:510,st:"might",lo:550,hi:999}},
{cat:"spell",jp:"バギクロス",en:"Kaswoosh",target:"G",at:[17,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:50,b:130,m:205,st:"might",lo:200,hi:999}},
{cat:"skill",weapon:"Spear",jp:"一閃づき",en:"Thunder Thrust",target:"S",at:[14,0],miss:0,ev:1,blk:1,el:0,metal:0},
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
{cat:"skill",weapon:"Other",jp:"攻撃",en:"Attack",target:"S",at:[8,8],miss:0,ev:1,blk:1,el:0,metal:0,fh:2},
{cat:"skill",weapon:"Other",jp:"攻撃(毒針)",en:"Attack (Poison Needle)",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,fixedDmg:1},
{cat:"skill",weapon:"Other",jp:"攻撃 (ｸﾞﾙｰﾌﾟ)",en:"Attack (Group)",target:"G",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{cat:"skill",weapon:"Other",jp:"攻撃 (全体)",en:"Attack (All)",target:"A",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
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
{cat:"skill",weapon:"Ranger",jp:"みのがす",en:"Mercy",target:"A",at:[0,0],miss:0,ev:0,blk:0,el:12,metal:0},
{cat:"spell",jp:"ザラキーマ",en:"Kathwack",target:"A",at:[0,0],ev:0,blk:0,el:12,metal:0,cls:[1]},
{cat:"skill",weapon:"Armamentalist",jp:"ファイアフォース",en:"Fire Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[5]},
{cat:"skill",weapon:"Armamentalist",jp:"アイスフォース",en:"Frost Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[6]},
{cat:"skill",weapon:"Armamentalist",jp:"ストームフォース",en:"Gale Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[7,8]},
{cat:"skill",weapon:"Armamentalist",jp:"ダークフォース",en:"Funereal Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[9,10]},
{cat:"skill",weapon:"Armamentalist",jp:"ライトフォース",en:"Life Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[11]},
{cat:"skill",weapon:"Other",jp:"おうえん",en:"Egg On",target:"S",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0,hiden:1},
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
'はやぶさの剣':{cat:'Sword',en:'Falconblade',falcon:true,metal:0,antiBlk:false},
'メタスラの剣':{cat:'Sword',en:'Metalslimesword',falcon:false,metal:1,antiBlk:false},
'メタスラのやり':{cat:'Spear',en:'Metalslimespear',falcon:false,metal:1,antiBlk:false},
'きしんのまそう':{cat:'Spear',en:'Poker',falcon:false,metal:0,antiBlk:true},
'風林火山':{cat:'Fan',en:'Attribeauty',falcon:false,metal:1,antiBlk:true},
'キラーピアス':{cat:'Knife',en:'Falconknifeearrings',falcon:true,metal:0,antiBlk:false},
'どくばり':{cat:'Knife',en:'Poisonneedle',falcon:false,metal:0,antiBlk:false,fixedDmg:1,hits:1},
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
function _weaponTypeMul(equip,monId){
if(!equip)return 1;
const wm=WEAPON_META[equip];
const mon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[monId]:null;
return(wm&&mon&&_WTYPE_T[wm.cat]===mon.t)?1.1:1;
}
const _FOURCE_BONUS=1.1;
function _rankVal(r){return r==='gold'?2:r==='orange'?1:0;}
function _bsMinTrue(lo,hi,pred){
while(lo<hi){const m=(lo+hi)>>1;if(pred(m))hi=m;else lo=m+1;}
return lo;
}
function _bsMaxTrue(lo,hi,pred){
let cap=lo-1;
while(lo<=hi){const m=(lo+hi)>>1;if(pred(m)){cap=m;lo=m+1;}else hi=m-1;}
return cap;
}
function _physRange(x,y,mul){
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
if(skill.el){
return applyElementMod(baseDmg,skill.el,monId);
}
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
function getHits(skill,hasDoubling){
if(!isHitBased(skill))return 1;
const dh=skill.fh||skill.kph;
const fixedRange=(skill.hitRange&&skill.hitRange.normalMin===skill.hitRange.max)?skill.hitRange.max:0;
const base=skill.hit||fixedRange||(dh?dh/2:1);
let hits=(hasDoubling&&!fixedRange)?(dh||base*2):base;
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
if(!d){return null;}
if(!d.m||d.b===d.m){return{min:d.b-d.s,max:d.b+d.s};}
const sv=_getDmgStat(d.st,stats);
const clamped=Math.max(d.lo,Math.min(sv,d.hi));
const calcBase=d.b+Math.floor((clamped-d.lo)*(d.m-d.b)/(d.hi-d.lo));
return{min:calcBase-d.s,max:calcBase+d.s};
}
function calcSkillDamage(skill,stats,monId,fourceEls,wmul){
const mon=MONSTER_DB[monId];
if(!mon)return null;
let base=calcBaseDmg(skill,stats);
if(!base){
base=_physRange(Math.min(stats.atk||0,999),mon.s[2],skill.mul);
}
let dMin=applyTypeMul(base.min,skill,monId);
let dMax=applyTypeMul(base.max,skill,monId);
if(wmul&&wmul!==1){dMin=Math.floor(dMin*wmul);dMax=Math.floor(dMax*wmul);}
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
const _TENSION_MULS=_TENSION.map(t=>t.mul);
const _tensionLvOf=(mul)=>mul>=4?50:mul>=2.5?20:5;
const _ACT_EGG={jp:'おうえん',en:'Egg On',at:0,equip:'',note:'',hits:0};
const _ACT_MERCY={jp:'みのがす',en:'Mercy',at:0,equip:'',note:'',hits:0};
const _eggPrefix=(n)=>Array(n).fill(_ACT_EGG);
const _mkFourceAction=(f)=>({jp:f.jp,en:f.en||f.jp,at:0,equip:'',note:'',hits:0});
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
const _METAL_MONSTERS=new Set(['01B','04C','04D','0B5','0B9','0F2']);
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
function _isMetalTargeting(action){
return action.jp==='一閃づき'||action.jp==='魔神斬り'||action.equip==='miss'||(action.skRef&&action.skRef.metal)||action.metal;
}
function _checkMetalExecution(actionJp,hexId){
if(actionJp!=='一閃づき'&&actionJp!=='魔神斬り')return null;
const isValid=typeof _METAL_MONSTERS!=='undefined'&&typeof _monHex==='function'&&_METAL_MONSTERS.has(_monHex(hexId));
return{isValid};
}
const _WEAPON_METAL_SHORT={'メタスラ':1};
function _weaponMetalFlag(eq){
if(eq==null||eq===''||eq==='miss')return 0;
if(eq in _WEAPON_METAL_SHORT)return _WEAPON_METAL_SHORT[eq];
return(typeof WEAPON_META!=='undefined'&&WEAPON_META[eq]&&WEAPON_META[eq].metal)?1:0;
}
function _metalEffect(skillMetal,weaponMetal){return(skillMetal||weaponMetal)?1:0;}
function _equipHits(sk,eq){
if(sk.fh)return(eq==='はやぶさの剣')?sk.fh:(sk.hit||Math.floor(sk.fh/2));
return sk.hit||1;
}
function _metalChipMaxDmg(jp,eq){
const sk=(typeof SKILL_IDX!=='undefined')?SKILL_IDX[jp]:null;
if(!sk)return 0;
if(sk.el&&sk.el>0)return 0;
if(_metalEffect(sk.metal?1:0,_weaponMetalFlag(eq))===0)return 0;
return 2*_equipHits(sk,eq);
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
function _solverFindMetal(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId){
if(hexId&&(typeof _METAL_MONSTERS!=='undefined')&&!_METAL_MONSTERS.has(hexId)){
return[];
}
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
{jp:'攻撃 (全体)',en:'Attack(All)'},
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
function _skOf(jp){return _SOLVER_SK[jp]||SKILL_IDX[jp];}
function _sdOf(jp){const rsk=_SOLVER_SK[jp];return rsk?_SOLVER_SKILL_DATA[rsk.jp]:_SOLVER_SKILL_DATA[jp];}
let _solverGroupCounts=null;
let _solverFieldTotal=null;
let _solverIssenNeed=0;
let _solverUseStats=true;
function _solverExpand(monCount,protectedSups,hexId){
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
const first=sk.at[0];
const diff=e.diff!==undefined?e.diff:sk.at[1];
const en=e.en||sk.en;
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
const isGA=!!e.ga;
if(e.jp==='攻撃 (全体)'&&monCount<=1)continue;
const isMulti=isGA||sk.target==='A'||sk.target==='G';
const hitBased=!isMulti&&isHitBased(sk);
const baseHits=hitBased?getHits(sk,false):0;
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
if(e.jp==='攻撃 (全体)'&&k<=1)continue;
variants.push({jp:e.jp,en,at:first+diff*(k-1),equip:'',note:'',hits:0,aoeK:k});
}
}
}else{
const n=hitBased?baseHits:(sk.hit||1);
const nAT=first+diff*Math.max(0,n-1);
variants.push({jp:e.jp,en,at:nAT,equip:e.needle?'どくばり':'',note:e.needle?'🪡':'',hits:hitBased?baseHits:0,soloGroup:e.soloGroup,needle:e.needle,needDeath0:e.needle});
if(hitBased&&sk.hitRange&&sk.hitRange.normalMin===sk.hitRange.max&&baseHits>=2){
for(let h=1;h<baseHits;h++){
variants.push({jp:e.jp,en,at:first+diff*Math.max(0,h-1),equip:'',note:`⚡${h}hit`,hits:h,earlyKill:true,soloGroup:e.soloGroup});
}
}
if(hexId&&sk&&!sk.dmg&&!sk.fixedDmg&&!e.needle&&typeof _WTYPE_GENERIC_BY_T!=='undefined'){
const _tm=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
const _g=_tm?_WTYPE_GENERIC_BY_T[_tm.t]:null;
if(_g&&_WEAPON_SKILLS[_g.cat]&&_WEAPON_SKILLS[_g.cat].has(e.alias||e.jp)){
variants.push({jp:e.jp,en,at:nAT,equip:_g.jp,note:'🎯',hits:hitBased?baseHits:0,soloGroup:e.soloGroup});
}
}
if(hitBased){
if(sk.fh){
const fHits=getHits(sk,true);
if(fHits>baseHits){
const fAT=first+diff*Math.max(0,fHits-1);
if(fAT!==nAT)variants.push({jp:e.jp,en,at:fAT,equip:'はやぶさの剣',note:'⚔',hits:fHits});
}
}else if(sk.kph){
const kHits=getHits(sk,true);
if(kHits>baseHits){
const kAT=first+diff*Math.max(0,kHits-1);
if(kAT!==nAT)variants.push({jp:e.jp,en,at:kAT,equip:'キラーピアス',note:'💍',hits:kHits,needDeath0:true});
}
}
}
}
}
if(_solverIssenNeed>0)variants.unshift({jp:'一閃づき',en:'Thunder Thrust',at:14,equip:'',note:'',hits:1});
return variants;
}
function _solverFind(bat,monCount,maxSlots,protectedSups,hexId){
if(bat<=0)return[];
const variants=_solverExpand(monCount,protectedSups,hexId);
const results=[];
let depthCap=0;
const _mon=(hexId&&typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
const useScreen=!!(_mon&&monCount<=1&&_solverUseStats);
const _bf=useScreen?_bestFource(hexId):null;
const _bfEls=(_bf&&typeof _FOURCE_EL!=='undefined')?(_FOURCE_EL[_bf.jp]||null):null;
let raw=0;const RAW_CAP=6000;
const score=(combo)=>{
const r1=_rankVal(_solverDmgCheck(combo,hexId,_mon,null,1,null,{},undefined));
if(r1===2)return 9*10000;
const rf=_bfEls?_rankVal(_solverDmgCheck(combo,hexId,_mon,null,1,_bfEls,{},undefined)):0;
if(rf===2)return 7*10000;
const q1=_solverMinStat(combo,hexId,1,null);
if(q1)return 5*10000-Math.min(q1.min,9999);
if(r1===1)return 4*10000+5000;
const qf=_bf?_solverMinStat(combo,hexId,1,_bf):null;
if(qf)return 4*10000-Math.min(qf.min,9999);
if(rf===1)return 3*10000+5000;
for(const T of _TENSION_MULS){
if(_solverDmgCheck(combo,hexId,_mon,null,T,null,{},undefined)||(_bfEls&&_solverDmgCheck(combo,hexId,_mon,null,T,_bfEls,{},undefined)))return 3*10000;
const qt=_solverMinStat(combo,hexId,T,null);
if(qt)return 2*10000-Math.min(qt.min,9999);
const qtf=_bf?_solverMinStat(combo,hexId,T,_bf):null;
if(qtf)return 1*10000-Math.min(qtf.min,9999);
}
return 0;
};
function dfs(startIdx,remaining,combo,maxDepth,sink){
if((!useScreen&&sink.length>=depthCap)||raw>=RAW_CAP)return;
if(remaining===0&&combo.length===maxDepth){
raw++;
if(useScreen){const sc=score(combo);if(sc>0)sink.push({c:combo.slice(),sc,ord:sink.length});}
else sink.push({c:combo.slice(),sc:0,ord:sink.length});
return;
}
if(remaining<=0||combo.length>=maxDepth)return;
for(let i=startIdx;i<variants.length;i++){
const v=variants[i];
if(v.at===0)continue;
if(v.at>remaining)continue;
combo.push(v);
dfs(i,remaining-v.at,combo,maxDepth,sink);
combo.pop();
}
}
for(let depth=1;depth<=maxSlots;depth++){
depthCap=30;
const sink=[];
dfs(0,bat,[],depth,sink);
if(useScreen)sink.sort((a,b)=>(b.sc-a.sc)||(a.ord-b.ord));
for(let k=0;k<sink.length&&k<depthCap;k++)results.push(sink[k].c);
}
return results;
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
function _charsSafe(){return(typeof chars!=='undefined')?chars:_readCharStats();}
const _EXT_STATS={atk:999,might:999,str:999,mending:999,deft:999};
function _extremeRatingOK(combo,hexId,mon,killTargets,statsOverride){
const orig=_readCharStats;
const _st=statsOverride||_EXT_STATS;
_readCharStats=()=>orig().map(c=>({...c,stats:{..._st}}));
try{const b=_bestAssign(combo,hexId,mon,killTargets,1,null);return{rating:b.rating,finIdx:b.finIdx};}
finally{_readCharStats=orig;}
}
function _maxSkillDmg(jp,hexId,wmul){
const sd=SKILL_IDX[jp];
const mon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
if(!sd||!mon)return 9999;
const tFactor=(sd.tmul&&sd.tmul[mon.t])||1;
const base=calcBaseDmg(sd,{atk:999,str:999,might:999,mending:999,deft:999});
if(!base){
const phyMax=_physRange(999,mon.s[2],sd.mul).max;
return Math.max(0,Math.floor(applyElementMod(phyMax,sd.el,hexId)*tFactor*(wmul||1)));
}
return Math.max(0,Math.floor(applyElementMod(base.max,sd.el,hexId)*tFactor*(wmul||1)));
}
function _monHex(monId){
if(!monId)return null;
if(typeof monId==='string')return monId.toUpperCase();
return monId.toString(16).toUpperCase().padStart(3,'0');
}
function _monDispName(hx){
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hx]:null;
return m?(DISPLAY_LANG==='EN'?m.en:m.jp):hx;
}
let _solverDmgCache=new WeakMap();
function _solverResetDmgCache(){_solverDmgCache=new WeakMap();}
function _solverCalcSkillDamage(sk,st,hexId,fEls,wmul){
let byContext=_solverDmgCache.get(sk);
if(!byContext){byContext=new Map();_solverDmgCache.set(sk,byContext);}
const contextKey=hexId+'|'+(fEls?fEls.join(','):'')+'|'+(wmul||1);
let byStats=byContext.get(contextKey);
if(!byStats){byStats=new Map();byContext.set(contextKey,byStats);}
const statsKey=(st.atk||0)
+(st.might||0)*1024
+(st.str||0)*1048576
+(st.mending||0)*1073741824
+(st.deft||0)*1099511627776;
if(byStats.has(statsKey))return byStats.get(statsKey);
const result=calcSkillDamage(sk,st,hexId,fEls,wmul);
byStats.set(statsKey,result);
return result;
}
function _solverMinStat(combo,hexId,tensionMul,fource){
tensionMul=tensionMul||1;
const mon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hexId]:null;
if(!mon)return null;
const hp=mon.s[0];
if(combo.length!==1){
const fEls=fource?((typeof _FOURCE_EL!=='undefined'&&_FOURCE_EL[fource.jp])||null):null;
const hp80m=Math.floor(hp*0.8),hp100=hp;
let paper=0;
const skArr=[],hitsArr=[],wmArr=[];
for(const v of combo){
skArr.push(_SOLVER_SK[v.jp]||(typeof SKILL_IDX!=='undefined'?SKILL_IDX[v.jp]:null));
hitsArr.push(v.hits||1);
wmArr.push(_weaponTypeMul(v.equip,hexId));
paper+=_maxSkillDmg(v.jp,hexId,wmArr[wmArr.length-1])*(v.hits||1);
}
if(paper<hp80m)return null;
const dmgMemo=skArr.map(()=>new Map());
const dmgAt=(i,key,s)=>{
if(!skArr[i]||combo[i].at===0)return{min:0,max:0,perHitMax:0};
if(_checkMetalExecution(combo[i].jp,hexId))return{min:0,max:0,perHitMax:0};
const keyCode=key==='atk'?0:key==='might'?1:key==='str'?2:key==='mending'?3:key==='deft'?4:5;
const memoKey=keyCode*1024+s,memo=dmgMemo[i];
if(memo.has(memoKey))return memo.get(memoKey);
const st={..._EXT_STATS};if(key)st[key]=s;
const r=_solverCalcSkillDamage(skArr[i],st,hexId,fEls,wmArr[i]);
const out=r?{min:r.min*hitsArr[i],max:r.max*hitsArr[i],perHitMax:r.max}:{min:0,max:0,perHitMax:0};
memo.set(memoKey,out);return out;
};
let best=null;
for(let fi=0;fi<combo.length;fi++){
const key=_solverDriveStat(skArr[fi]);
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
const goldOK=(s)=>{const e=evalAt(s);return(e.cMax+e.f.max)>=hp80m&&e.cMin+Math.floor(e.f.min*tensionMul)>=hp100;};
const capOK=(s)=>{
const e=evalAt(s);
if(e.cMax>=hp80m)return false;
if(finHits>1&&(finHits-1)*Math.floor(e.f.perHitMax*tensionMul)>=hp80m-e.cMax)return false;
return true;
};
if(!goldOK(999))continue;
const minS=_bsMinTrue(0,999,goldOK);
if(!capOK(minS))continue;
const cand={key,fi,minS,capS:_bsMaxTrue(minS,999,capOK)};
if(!best||cand.minS<best.minS||(cand.minS===best.minS&&cand.capS>best.capS))best=cand;
}
if(!best)return null;
const perPos=(()=>{
const fFi=best.fi;
if(!_solverDriveStat(skArr[fFi]))return null;
const posD=(i,s)=>{
const d=dmgAt(i,_solverDriveStat(skArr[i]),s);
return{min:d.min,max:d.max,phm:d.perHitMax};
};
const varPos=[];
for(let i=0;i<combo.length;i++){
if(i===fFi||!_solverDriveStat(skArr[i]))continue;
if(posD(i,999).min>posD(i,0).min)varPos.push(i);
}
let constMin=0,constMax=0;
for(let i=0;i<combo.length;i++){if(i===fFi||varPos.indexOf(i)>=0)continue;const d=posD(i,0);constMin+=d.min;constMax+=d.max;}
const posCap={};let chipMaxCap=constMax,chipMinCap=constMin;
for(const j of varPos){
const cap=_bsMaxTrue(0,999,(m)=>chipMaxCap+posD(j,m).max<hp80m);
if(cap<0)return null;
posCap[j]=cap;chipMaxCap+=posD(j,cap).max;chipMinCap+=posD(j,cap).min;
}
const finHitsP=hitsArr[fFi];
let sFinCap=999;
if(finHitsP>1){
const headA=hp80m-chipMaxCap;
sFinCap=_bsMaxTrue(0,999,(m)=>(finHitsP-1)*Math.floor(posD(fFi,m).phm*tensionMul)<headA);
if(sFinCap<0)return null;
}
const finNeed=hp100-chipMinCap;
const finMinT=(s)=>Math.floor(posD(fFi,s).min*tensionMul);
if(finMinT(sFinCap)<finNeed)return null;
const sFin=_bsMinTrue(0,sFinCap,(m)=>finMinT(m)>=finNeed);
return{finFi:fFi,fKey:_solverDriveStat(skArr[fFi]),sFin,sFinCap,varPos,posCap};
})();
let posLabel='';
if(perPos){
const _nm=(i)=>combo[i].jp+(combo[i].note||'');
const _kL=(i)=>{const k=_solverDriveStat(skArr[i]);return(k&&k!=='atk')?'('+_statLabel(k)+')':'';};
const parts=[];
const capParts=[];
for(const j of perPos.varPos){
const cp=perPos.posCap[j];
if(cp<999){parts.push(_nm(j)+_kL(j)+'≤'+cp);capParts.push(_nm(j)+cp);}
}
let finSeg='收尾'+_nm(perPos.finFi)+_kL(perPos.finFi);
finSeg+=(perPos.sFinCap<999?' '+perPos.sFin+'~'+perPos.sFinCap:'≥'+perPos.sFin);
if(capParts.length>0)finSeg+='(@'+capParts.join(',')+')';
parts.push(finSeg);
posLabel=parts.join(' · ');
}
const jpTag='@'+combo[best.fi].jp+(combo[best.fi].note||'');
if(best.capS>=999)return{stat:best.key,min:best.minS,finIdx:best.fi,perPos,posLabel,label:_statLabel(best.key)+'≥'+best.minS+jpTag};
return{stat:best.key,min:best.minS,max:best.capS,finIdx:best.fi,perPos,posLabel,label:_statLabel(best.key)+' '+best.minS+'~'+best.capS+jpTag};
}
const v=combo[0],hits=v.hits||1;
if(_checkMetalExecution(v.jp,hexId))return null;
const rsk=_SOLVER_SK[v.jp];const sd=_sdOf(v.jp);
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
const _wmulV=_weaponTypeMul(v.equip,hexId);
const hp80=Math.floor(hp*0.8);
const _capSolve=(statKey,minStat)=>{
const sk2=rsk||(typeof SKILL_IDX!=='undefined'?SKILL_IDX[v.jp]:null);
if(!sk2)return-1;
const fEls2=fource?((typeof _FOURCE_EL!=='undefined'&&_FOURCE_EL[fource.jp])||null):null;
const capOK=(s)=>{
const st={atk:0,might:0,str:0,mending:0,deft:0};st[statKey]=s;
const r=_solverCalcSkillDamage(sk2,st,hexId,fEls2,_wmulV);
return r?((hits-1)*Math.floor(r.max*tensionMul)<hp80):false;
};
if(!capOK(minStat))return-1;
return _bsMaxTrue(minStat,999,capOK);
};
const _rangeWrap=(statKey,minStat,baseLabel)=>{
if(hits<=1)return{stat:statKey,min:minStat,label:baseLabel};
const capMax=_capSolve(statKey,minStat);
if(capMax<0)return null;
if(capMax>=999)return{stat:statKey,min:minStat,label:baseLabel};
return{stat:statKey,min:minStat,max:capMax,label:_statLabel(statKey)+' '+minStat+'~'+capMax};
};
if(sd&&sd.dmg){
const d=sd.dmg;
if(!d.m||d.b===d.m){
if((d.b-d.s)*hits*mul<hp)return null;
if(hits>1&&(hits-1)*Math.floor((d.b+d.s)*mul)>=hp80)return null;
return{stat:null,min:0,label:''};
}
const needBase=Math.ceil(hp/(mul*hits))+d.s;
if(needBase<=d.b)return _rangeWrap(d.st,d.lo,_statLabel(d.st)+'≥'+d.lo);
if(needBase>d.m)return null;
const need=Math.ceil(d.lo+(needBase-d.b)*(d.hi-d.lo)/(d.m-d.b));
return _rangeWrap(d.st,Math.min(need,999),_statLabel(d.st)+'≥'+Math.min(need,999));
}
if(!sd||!sd.el){
const sk=rsk||(typeof SKILL_IDX!=='undefined'?SKILL_IDX[v.jp]:null);
if(!sk)return null;
const fEls=fource?((typeof _FOURCE_EL!=='undefined'&&_FOURCE_EL[fource.jp])||null):null;
const killAt=(a)=>{
const r=_solverCalcSkillDamage(sk,{atk:a,might:0,str:0,mending:0,deft:0},hexId,fEls,_wmulV);
return r?(Math.floor(r.min*tensionMul)*hits>=hp):false;
};
if(!killAt(999))return null;
const lo=_bsMinTrue(0,999,killAt);
return _rangeWrap('atk',lo,'ATK≥'+lo);
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
function _largestGroupOf(list,gik){
const groups={};
for(const inst of list)(groups[inst[gik]]=groups[inst[gik]]||[]).push(inst);
let best=null,bestLen=0;
for(const g in groups){if(groups[g].length>bestLen){bestLen=groups[g].length;best=groups[g];}}
return best||[];
}
function _isMetalActionSk(action,sk){
return action.jp==='一閃づき'||action.jp==='魔神斬り'||action.equip==='miss'||!!(sk&&sk.metal);
}
function _findMetalInst(alive){
return(typeof _METAL_MONSTERS!=='undefined')?alive.find(i=>_METAL_MONSTERS.has(_monHex(i.hex))):undefined;
}
function _charDmgSpan(sk,hx,eq,hits,charsArr){
let minDmg=Infinity,maxDmg=0;
for(const c of charsArr){
const r=calcSkillDamage(sk,c.stats,hx,null,_weaponTypeMul(eq,hx));
if(r){
if(r.min*hits<minDmg)minDmg=r.min*hits;
if(r.max*hits>maxDmg)maxDmg=r.max*hits;
}
}
if(minDmg===Infinity)minDmg=0;
return{min:minDmg,max:maxDmg};
}
function _skillClassLock(action){
const sk=_skOf(action.jp);
return(sk&&sk.cat==='spell'&&Array.isArray(sk.cls))?sk.cls:null;
}
function _bestAssign(combo,hexId,mon,killTargets,tensionMul,fourceEls){
const chars=_readCharStats();
const N=chars.length,n=combo.length;
if(n>N){
const out={};
const rating=_solverDmgCheck(combo,hexId,mon,killTargets,tensionMul,fourceEls,out);
return{rating,assign:null,defend:[],eggAssign:out.eggAssign||null,round1Removed:out.round1Removed,finIdx:out.finIdx,positional:true};
}
const locks=combo.map(_skillClassLock);
const idxs=[];for(let i=0;i<N;i++)idxs.push(i);
let best=null;
const pick=[];
const used=new Uint8Array(N);
const dfs=()=>{
if(best&&_rankVal(best.rating)===2)return;
if(pick.length===n){
for(let i=0;i<n;i++){if(locks[i]){const j=chars[pick[i]].job;if(j===null||!locks[i].includes(j))return;}}
const assign=pick.slice();
const out={};
const rating=_solverDmgCheck(combo,hexId,mon,killTargets,tensionMul,fourceEls,out,assign);
if(!best||_rankVal(rating)>_rankVal(best.rating)){
best={rating,assign,defend:idxs.filter(k=>!assign.includes(k)),eggAssign:out.eggAssign||null,round1Removed:out.round1Removed,finIdx:out.finIdx};
}
return;
}
for(let i=0;i<N;i++){
if(used[i])continue;
pick.push(i);used[i]=1;
dfs();
pick.pop();used[i]=0;
}
};
dfs();
if(!best)return{rating:null,assign:null,defend:idxs.slice(),eggAssign:null,round1Removed:null,infeasible:true};
return best;
}
function _hasChipMiss(combo,hexId,assign,finIdx,fourceEls){
if(!assign)return false;
const chars=_readCharStats();
for(let ci=0;ci<combo.length&&ci<chars.length;ci++){
if(ci===finIdx)continue;
const v=combo[ci];
if(v.at===0||v.fixedDmg)continue;
if(_checkMetalExecution(v.jp,hexId))continue;
const sk=_skOf(v.jp);
if(!sk)continue;
const cIdx=assign[ci];
if(cIdx===undefined||!chars[cIdx])continue;
const result=calcSkillDamage(sk,chars[cIdx].stats,hexId,fourceEls,_weaponTypeMul(v.equip,hexId));
if(!result||result.min<=0)return true;
}
return false;
}
function _solverDmgCheck(combo,hexId,mon,killTargets,tensionMul,fourceEls,outInfo,assign){
const chars=_readCharStats();
if(!mon)return null;
tensionMul=tensionMul||1;
if(!killTargets||(killTargets.length===1&&killTargets[0].count<=1)){
const perSkill=[];
for(let ci=0;ci<combo.length&&ci<chars.length;ci++){
const sk=_skOf(combo[ci].jp);
if(!sk){perSkill.push({min:0,max:0,perHitMax:0,hits:1});continue;}
if(combo[ci].at===0){perSkill.push({min:0,max:0,perHitMax:0,hits:1});continue;}
const hits=combo[ci].hits||1;
const exec=_checkMetalExecution(combo[ci].jp,hexId);
if(exec){
perSkill.push(exec.isValid?{min:9999,max:9999,perHitMax:9999,hits:1}:{min:0,max:0,perHitMax:0,hits:1});
continue;
}
const result=calcSkillDamage(sk,chars[assign?assign[ci]:ci].stats,hexId,fourceEls,_weaponTypeMul(combo[ci].equip,hexId));
perSkill.push(result
?{min:result.min*hits,max:result.max*hits,perHitMax:result.max,hits}
:{min:0,max:0,perHitMax:0,hits:1});
}
const hp100=mon.s[0],hp80=Math.floor(hp100*0.8);
const totalMin=perSkill.reduce((s,d)=>s+d.min,0);
const totalMax=perSkill.reduce((s,d)=>s+d.max,0);
if(totalMax<hp80){if(outInfo)outInfo.cleanIncomplete=true;return null;}
let _cleanFi=false;
let _orangeInfo=null;
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
if(chipMax+finMax>=hp80){if(!_orangeInfo)_orangeInfo={finIdx:fi};continue;}
_cleanFi=true;
}
if(_orangeInfo){if(outInfo){outInfo.finIdx=_orangeInfo.finIdx;if(tensionMul>1)outInfo.eggAssign={[_orangeInfo.finIdx]:tensionMul};}return'orange';}
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
const sk=_skOf(combo[ci].jp);
const hits=combo[ci].hits||1;
const tgt=!sk?null:(sk.target==='A'||sk.target==='RA')?'A':(sk.target==='G'||sk.target==='RG')?'G':'S';
const dmg={},dmgF={};
for(const hex of uniqueHexes){
if(!sk){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
const tMon=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[hex]:null;
if(!tMon){dmg[hex]={min:0,max:0,phMax:0};dmgF[hex]=dmg[hex];continue;}
if((typeof _METAL_MONSTERS!=='undefined')&&_METAL_MONSTERS.has(_monHex(hex))){
const _elem=!!(sk.el&&sk.el>0);
const _me=_metalEffect(sk.metal||0,_weaponMetalFlag(combo[ci].equip));
const _md=(!_elem&&_me)?{min:1*hits,max:2*hits,phMax:2}:{min:0,max:0,phMax:0};
dmg[hex]=_md;dmgF[hex]=_md;
continue;
}
const r=calcSkillDamage(sk,chars[assign?assign[ci]:ci].stats,hex,null,_weaponTypeMul(combo[ci].equip,hex));
dmg[hex]=r?{min:r.min*hits,max:r.max*hits,phMax:r.max}:{min:0,max:0,phMax:0};
if(hasFource){
const rF=calcSkillDamage(sk,chars[assign?assign[ci]:ci].stats,hex,effectiveFEls,_weaponTypeMul(combo[ci].equip,hex));
dmgF[hex]=rF?{min:rF.min*hits,max:rF.max*hits,phMax:rF.max}:dmg[hex];
}else{
dmgF[hex]=dmg[hex];
}
}
skillDmg.push({dmg,dmgF,tgt,hits,ci,jp:combo[ci].jp,mAct:_isMetalActionSk(combo[ci],sk)});
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
grpInsts=_largestGroupOf(alive,'groupIdx');
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
const _mt=sd.mAct?_findMetalInst(alive):undefined;
if(_mt){
target=_mt;
}else if(combo[ci].soloGroup){
const gc={};
for(const x of alive)gc[x.groupIdx]=(gc[x.groupIdx]||0)+1;
target=alive.find(x=>gc[x.groupIdx]===1);
if(!target)return{allDead:false,rejectAt:ci,reason:'soloGroup'};
}else if(combo[ci].tgtGroup!==undefined){
target=alive.find(x=>x.groupIdx===combo[ci].tgtGroup);
if(!target)return{allDead:false,rejectAt:ci,reason:'tgtdead'};
}
const exec=_checkMetalExecution(combo[ci].jp,target.hex);
if(exec){
if(!exec.isValid)return{allDead:false,rejectAt:ci,reason:'non_metal_issen'};
target.hp=0;target.hpLow=0;target.alive=false;
if(target.groupIdx===0)mainKilled=true;
continue;
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
grp=_largestGroupOf(alive,'groupIdx');
}
for(const x of grp){x.hp-=Math.floor(((dTable[x.hex]||{}).min||0)*mul);if(x.hp<=0){x.alive=false;if(x.groupIdx===0)r1MainKilled=true;}}
}else{
alive.sort((a,b)=>b.hp-a.hp);
let t=alive[0];
const _mt1=sd.mAct?_findMetalInst(alive):undefined;
if(_mt1){
t=_mt1;
}else if(combo[ci].soloGroup){
const gc={};
for(const x of alive)gc[x.groupIdx]=(gc[x.groupIdx]||0)+1;
t=alive.find(x=>gc[x.groupIdx]===1);
if(!t)continue;
}else if(combo[ci].tgtGroup!==undefined){
t=alive.find(x=>x.groupIdx===combo[ci].tgtGroup);
if(!t)continue;
}
const exec=_checkMetalExecution(combo[ci].jp,t.hex);
if(exec){
if(exec.isValid){t.hp=0;t.alive=false;if(t.groupIdx===0)r1MainKilled=true;}
continue;
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
const sd=_sdOf(v.jp);
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
for(let i=0;i<combo.length;i++){const sk=_skOf(combo[i].jp);if(sk&&sk.target==='A')aIdx.push(i);}
if(aIdx.length!==1)return null;
const fin=combo[aIdx[0]];
if((fin.hits||1)>1)return null;
const chips=combo.filter((v,i)=>i!==aIdx[0]);
const freeCI=[];
for(let ci=0;ci<chips.length;ci++){
const sk=_skOf(chips[ci].jp);
if(!sk)return null;
if(sk.target==='S'&&!chips[ci].soloGroup&&chips[ci].tgtGroup===undefined){freeCI.push(ci);continue;}
if(sk.target==='G'&&chips[ci].tgtGroup!==undefined)continue;
return null;
}
const chars=_readCharStats();
const nG=killTargets.length;
const dmgOf=(v)=>{
const sk=_skOf(v.jp);const hits=v.hits||1;const out={};
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
const prefix=_eggPrefix(tier.eggs);
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
function _solverDriveStat(sk){
if(sk&&sk.fixedDmg)return null;
if(!sk||!sk.dmg)return'atk';
if(sk.dmg.st){
const s=sk.dmg.st;
return(s==='might'||s==='str'||s==='mending')?s:null;
}
return null;
}
function _solverStatBound(sk,monId,hits,hp,dir,fEls,tensionMul,wmul){
tensionMul=tensionMul||1;
const key=_solverDriveStat(sk);
if(!key)return null;
const dmgAt=(v)=>{const st={atk:0,might:0,str:0,mending:0,deft:0};st[key]=v;const r=calcSkillDamage(sk,st,monId,fEls,wmul);return r||{min:0,max:0};};
const minT=(v)=>Math.floor(dmgAt(v).min*tensionMul);
const maxT=(v)=>Math.floor(dmgAt(v).max*tensionMul);
const MAXV=999;
if(dir==='kill'){
if(minT(MAXV)*hits<hp)return{key,val:Infinity};
return{key,val:_bsMinTrue(0,MAXV,(m)=>minT(m)*hits>=hp)};
}
if(dir==='chip'){
if(maxT(MAXV)*hits<hp)return{key,val:Infinity};
return{key,val:Math.max(0,_bsMaxTrue(0,MAXV,(m)=>maxT(m)*hits<hp))};
}
if(dir==='detcap'){
if(hits<=1)return{key,val:Infinity};
if((hits-1)*maxT(MAXV)<hp)return{key,val:Infinity};
return{key,val:Math.max(0,_bsMaxTrue(0,MAXV,(m)=>(hits-1)*maxT(m)<hp))};
}
return null;
}
function _solverHintStr(sk,monId,hits,hpHigh,hpLow,fEls,tensionMul,wmul){
const key=_solverDriveStat(sk);
if(!key)return'<span style="color:#667;">固定傷害 · 無屬性門檻</span>';
const label={atk:'攻擊力',might:'攻魔',str:'力',mending:'回魔'}[key]||key;
const chip=_solverStatBound(sk,monId,hits,Math.max(1,hpLow),'chip',fEls,tensionMul,wmul);
const kill=_solverStatBound(sk,monId,hits,Math.max(1,hpHigh),'kill',fEls,tensionMul,wmul);
const parts=[];
parts.push('削血≤'+(chip?(chip.val===Infinity?'任意':chip.val):'?'));
parts.push('收尾'+(kill?(kill.val===Infinity?'(殺不死)':'≥'+kill.val):'?'));
if(hits>1){const det=_solverStatBound(sk,monId,hits,Math.max(1,hpLow),'detcap',fEls,tensionMul,wmul);if(det&&det.val!==Infinity)parts.push('滿hit≤'+det.val);}
if(hpLow<=0)parts.unshift('<span style="color:#f80;">前置招恐已殺</span>');
return'<span style="color:#789;">['+label+'] '+parts.join(' · ')+'</span>';
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
function _eachPoolEntry(rawPool,fn){
for(const e of rawPool){
if(!Array.isArray(e))continue;
if(typeof e[0]==='string')fn(e);
for(const x of e){if(Array.isArray(x)&&typeof x[0]==='string')fn(x);}
}
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
const nm=multi?_monDispName(g.hex)+(cnt>1?'×'+cnt:'')+' ':'';
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
function _solverRender(bat,monGroups,monId,mapDeft,canRound2){
if(canRound2===undefined)canRound2=mapDeft<1000;
try{
if(bat<0)return'';
const useStats=!!document.getElementById('si_useStats')?.checked;
_solverUseStats=useStats;
_solverResetDmgCache();
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
const _metalSupCount=(!isMetal&&typeof _METAL_MONSTERS!=='undefined')
?sups.reduce((s,g)=>s+((g.count>0&&g.hex&&_METAL_MONSTERS.has(_monHex(g.hex)))?g.count:0),0):0;
let excludedPads=null;
if(isMetal&&_nonMetalSups.length>0&&typeof calcSkillDamage==='function'){
excludedPads=new Set();
const _seen=new Set();
const _currentChars=_charsSafe();
for(const row of _METAL_PADDING){
const jp=row[0];
if(_seen.has(jp))continue;_seen.add(jp);
const sk=(typeof SKILL_IDX!=='undefined')?SKILL_IDX[jp]:null;
if(!sk)continue;
if(sk.target==='S'||sk.target==='G')continue;
for(const g of _nonMetalSups){
const m=MONSTER_DB[g.hex];
if(!m)continue;
const hp100=m.s[0];
const hp80=Math.floor(hp100*0.8);
const eq=row[3];
const span=_charDmgSpan(sk,_monHex(g.hex),eq,_equipHits(sk,eq),_currentChars);
if(span.max>=hp80&&span.min<hp100){excludedPads.add(jp);break;}
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
if(_metalSupCount>0){
planType='kill_mercy_clear';postAlive=d0SC+(mainGroup.count-1);
}else{
planType='mercy_first';postAlive=mainGroup.count+d0SC;
}
}else if(_effDeath(mainGroup)>0&&(mainGroup.count>=2||dG0SC>0)){
planType='kill_mercy_clear';postAlive=d0SC;
}
}
let killTargets=null;
if(T>1)killTargets=monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)}));
_solverGroupCounts=killTargets?killTargets.map(t=>t.count):null;
_solverFieldTotal=killTargets?killTargets.reduce((s,t)=>s+t.count,0):null;
const _metalSupNeed=(killTargets&&T>1)?_metalSupCount:0;
_solverIssenNeed=_metalSupNeed;
const _metalSupFilter=(cs)=>_metalSupNeed===0?cs
:cs.filter(c=>c.reduce((s,v)=>s+((v.jp==='一閃づき'||v.jp==='魔神斬り')?1:0),0)===_metalSupNeed);
const _walkOK=(rawCombo)=>{
if(isMetal||!killTargets||T<=1)return true;
const _isExecW=(v)=>v.jp==='一閃づき'||v.jp==='魔神斬り';
const combo=_metalSupNeed>0?[...rawCombo.filter(v=>!_isExecW(v)),...rawCombo.filter(_isExecW)]:rawCombo;
const K=planType==='kill_all'?T:(planType==='kill_mercy_clear'?1+postAlive:postAlive);
const maxGrp=Math.max(...killTargets.map(g=>g.count||1));
let cap=0;
for(const v of combo){
if(!(v.at>0))continue;
const sk=_skOf(v.jp);
const tgt=sk?sk.target:'S';
if(tgt==='A'){cap=K;break;}
else if(tgt==='G'||tgt==='RG')cap+=maxGrp;
else if(tgt==='RA'||tgt==='RS')cap+=Math.max(v.hits||0,(sk&&sk.hitRange&&sk.hitRange.max)||1);
else cap+=1;
}
if(cap<K)return false;
const _isMetalG=killTargets.map(g=>typeof _METAL_MONSTERS!=='undefined'&&_METAL_MONSTERS.has(_monHex(g.hex)));
const gMaxW=killTargets.map(g=>g.count||0);
let mAliveW=0;
for(let gi=0;gi<killTargets.length;gi++)if(_isMetalG[gi])mAliveW+=gMaxW[gi];
let nmMaxW=T-mAliveW;
let nmCapW=0;
for(const v of combo){
if(v.jp==='みのがす'){
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
if(_metalSupNeed>0&&_isExecW(v)){
if(mAliveW<1)return false;
mAliveW-=1;continue;
}
const skW=_skOf(v.jp);
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
};
let combos=[],isRound2=false;
const mercyAction=_ACT_MERCY;
const eggOnAction=_ACT_EGG;
const _metalHPs=[];
let _metalCount=0;
for(const g of monGroups){
const gHex=g.hex?_monHex(g.hex):null;
const gIsMetal=gHex&&(typeof _METAL_MONSTERS!=='undefined')&&_METAL_MONSTERS.has(gHex);
if(gIsMetal){
const s=((typeof MONSTER_DB!=='undefined'&&MONSTER_DB[g.hex])||{}).s;
const h=(s&&s[0])?s[0]:999;
for(let i=0;i<(g.count||1);i++){_metalHPs.push(h);_metalCount++;}
}
}
if(isMetal&&_metalCount===0)_metalCount=T;
if(planType==='kill_all'){
combos=_metalSupFilter(isMetal?_solverFindMetal(bat,T,4,_metalCount,_metalHPs,excludedPads,hexId):_solverFind(bat,T,4,[],hexId)).filter(_walkOK);
if(combos.length===0&&canRound2){
const r2a=isMetal?_solverFindMetal(bat,T,8,_metalCount,_metalHPs,excludedPads,hexId):_solverFind(bat,T,8,[],hexId);
const r2b=tc2>0
?(isMetal?_solverFindMetal(bat-tc2,T,8,_metalCount,_metalHPs,excludedPads,hexId):_solverFind(bat-tc2,T,8,[],hexId))
:[];
combos=_metalSupFilter([...r2a,...r2b]).filter(c=>c.length>=5).filter(_walkOK);
isRound2=combos.length>0;
}
}else if(planType==='mercy_first'){
const r1Dmg=_metalSupFilter(isMetal?_solverFindMetal(bat,postAlive,3,_metalCount,_metalHPs,excludedPads,hexId):_solverFind(bat,postAlive,3,[]));
combos=r1Dmg.map(c=>[mercyAction,...c]).filter(_walkOK);
if(combos.length===0&&canRound2){
if(tc2>0){
const s0=_metalSupFilter(isMetal?_solverFindMetal(bat-tc2,postAlive,7,_metalCount,_metalHPs,excludedPads,hexId):_solverFind(bat-tc2,postAlive,7,[]))
.filter(c=>c.length>=4)
.map(c=>[mercyAction,...c]).filter(_walkOK);
combos=combos.concat(s0);
}
const s4=_metalSupFilter(isMetal?_solverFindMetal(bat,postAlive,7,_metalCount,_metalHPs,excludedPads,hexId):_solverFind(bat,postAlive,7,[]))
.filter(c=>c.length>=5)
.map(c=>[...c.slice(0,4),mercyAction,...c.slice(4)]).filter(_walkOK);
combos=combos.concat(s4);
isRound2=combos.length>0;
}
}else{
const phaseAVars=_solverExpand(T,[]);
const sSkills=phaseAVars.filter(v=>{
if(_metalSupNeed>0&&(v.jp==='一閃づき'||v.jp==='魔神斬り'))return false;
const sk=_skOf(v.jp);
return sk&&(sk.target==='S'||sk.target==='RS')&&v.at>0&&v.at<=bat;
});
const kmcFource=(!isMetal&&hexId)?_bestFource(hexId):null;
const kmcFourceAction=kmcFource?_mkFourceAction(kmcFource):null;
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
combos=_metalSupFilter(_kmcBuild(bat,1,4,30)).filter(_walkOK);
if(canRound2){
const r2a=_metalSupFilter(_kmcBuild(bat,5,8,14)).filter(_walkOK);
const r2b=tc2>0?_metalSupFilter(_kmcBuild(bat-tc2,5,8,14)).filter(_walkOK):[];
if(r2a.length+r2b.length>0){combos=combos.concat(r2a,r2b);isRound2=true;}
}
}
if(_metalSupNeed>0&&combos.length){
const _isExecN=(v)=>v.jp==='一閃づき'||v.jp==='魔神斬り';
const _seenN=new Set(),_normN=[];
for(const c of combos){
const nc=[...c.filter(v=>!_isExecN(v)),...c.filter(_isExecN)];
const key=nc.map(v=>v.jp+'|'+(v.at||0)+'|'+(v.equip||'')+'|'+(v.aoeK!==undefined?v.aoeK:'')+'|'+(v.tgtGroup!==undefined?v.tgtGroup:'')+'|'+(v.hits||0)).join('¶');
if(!_seenN.has(key)){_seenN.add(key);_normN.push(nc);}
}
combos=_normN;
}
if(combos.length===0)return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const useJP=(DISPLAY_LANG!=='EN');
const mon=hexId&&typeof MONSTER_DB!=='undefined'?MONSTER_DB[hexId]:null;
const filtered=[];
const fource=(!isMetal&&hexId)?_bestFource(hexId):null;
const canFilter=mon&&!isMetal&&useStats;
const monEvade=mon?mon.s[3]:0;
const monBlock=mon?mon.s[4]:0;
const seen1=new Map();
for(const combo of combos){
if(mon&&combo.some(v=>v.needDeath0)&&mon.s[12]>0)continue;
if(isMetal&&combo.some(v=>v.needle))continue;
const dmgParts=combo.filter(v=>v.at>0);
if(dmgParts.length===1){
const v=dmgParts[0];
const rsk=_SOLVER_SK[v.jp];const sd=_sdOf(v.jp);
const statType=((rsk&&rsk.fixedDmg)?'fix'+rsk.fixedDmg:(sd&&sd.dmg&&sd.dmg.st)?sd.dmg.st:(sd&&sd.el?'el'+sd.el:'atk'))+(_weaponTypeMul(v.equip,hexId)>1?'_w11':'');
const key=v.at+'_'+statType;
const vEv=sd?sd.ev:1;
const vBlk=sd?sd.blk:1;
const curReq=_solverMinStat(combo,hexId,1,null);
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
if(canFilter){
const baseBest=_bestAssign(combo,hexId,mon,killTargets,1,null);
const dmgInfo={eggAssign:baseBest.eggAssign,round1Removed:baseBest.round1Removed};
const kill=baseBest.rating;
const req=_solverMinStat(combo,hexId);
const _baseRk=_rankVal(kill);
if(kill){
if(!_hasChipMiss(combo,hexId,baseBest.assign,baseBest.finIdx,null))
filtered.push({combo,kill,req,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),eggAssign:dmgInfo.eggAssign||null,round1Removed:dmgInfo.round1Removed,assign:baseBest.assign,defend:baseBest.defend,finIdx:baseBest.finIdx});
}else if(req&&req.min<Infinity){
const gateOut={};
_solverDmgCheck(combo,hexId,mon,killTargets,1,null,gateOut,undefined);
let ext=_extremeRatingOK(combo,hexId,mon,killTargets);
if(ext.rating!=='gold'&&req&&req.max!==undefined&&req.min<=req.max&&req.stat){
ext=_extremeRatingOK(combo,hexId,mon,killTargets,{..._EXT_STATS,[req.stat]:req.min});
}
if(gateOut.cleanIncomplete&&ext.rating==='gold'){
filtered.push({combo,kill:null,req,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),round1Removed:dmgInfo.round1Removed,finIdx:ext.finIdx});
}
}
if(planType!=='kill_mercy_clear'&&dmgParts.length<4&&_baseRk<2){
for(const t of _TENSION){
if(combo.length+t.eggs>4)break;
const prefix=_eggPrefix(t.eggs);
const eggCombo=[...prefix,...combo];
const eggBest=_bestAssign(eggCombo,hexId,mon,killTargets,t.mul,null);
if(eggBest.rating&&(_rankVal(eggBest.rating)>_baseRk||(eggBest.rating==='orange'&&_baseRk===1))){
if(!_hasChipMiss(eggCombo,hexId,eggBest.assign,eggBest.finIdx,null)){
const eggReq=_solverMinStat(combo,hexId,t.mul);
filtered.push({combo:eggCombo,kill:eggBest.rating,req:eggReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2,eggAssign:eggBest.eggAssign,round1Removed:eggBest.round1Removed,assign:eggBest.assign,defend:eggBest.defend,finIdx:eggBest.finIdx});
break;
}
}
}
}
if(fource&&combo.length<4&&_baseRk<2&&combo.some(v=>{const s=_skOf(v.jp);return s&&!s.el;})){
const fEls=_FOURCE_EL[fource.jp]||[];
const fCombo=[_mkFourceAction(fource),...combo];
const fBest=_bestAssign(fCombo,hexId,mon,killTargets,1,fEls);
if(fBest.rating&&(_rankVal(fBest.rating)>_baseRk||(fBest.rating==='orange'&&_baseRk===1))){
if(!_hasChipMiss(fCombo,hexId,fBest.assign,fBest.finIdx,fEls)){
const fReq=_solverMinStat(combo,hexId,1,fource);
filtered.push({combo:fCombo,kill:fBest.rating,req:fReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),eggAssign:fBest.eggAssign,round1Removed:fBest.round1Removed,assign:fBest.assign,defend:fBest.defend,finIdx:fBest.finIdx});
}
}
}
if(fource&&_baseRk<2&&combo.some(v=>{const s=_skOf(v.jp);return s&&!s.el;})){
const fEls=_FOURCE_EL[fource.jp]||[];
for(const t of _TENSION){
if(combo.length+t.eggs+1>4)break;
const eggPrefix=_eggPrefix(t.eggs);
const fourceEntry=_mkFourceAction(fource);
const efCombo=[...eggPrefix,fourceEntry,...combo];
const efBest=_bestAssign(efCombo,hexId,mon,killTargets,t.mul,fEls);
if(efBest.rating&&(_rankVal(efBest.rating)>_baseRk||(efBest.rating==='orange'&&_baseRk===1))){
if(!_hasChipMiss(efCombo,hexId,efBest.assign,efBest.finIdx,fEls)){
const efReq=_solverMinStat(combo,hexId,t.mul,fource);
filtered.push({combo:efCombo,kill:efBest.rating,req:efReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2,eggAssign:efBest.eggAssign,round1Removed:efBest.round1Removed,assign:efBest.assign,defend:efBest.defend,finIdx:efBest.finIdx});
break;
}
}
}
}
}else if(mon&&T===1&&!isMetal){
const req=_solverMinStat(combo,hexId);
if(!req||req.min<=999){
filtered.push({combo,kill:null,req,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo)});
}
if(planType!=='kill_mercy_clear'&&combo.length<4){
for(const t of _TENSION){
if(combo.length+t.eggs>4)break;
const eggReq=_solverMinStat(combo,hexId,t.mul);
if(eggReq&&eggReq.min<=999&&(!req||eggReq.min<req.min)){
const prefix=_eggPrefix(t.eggs);
filtered.push({combo:[...prefix,...combo],kill:null,req:eggReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2});
break;
}
}
}
if(fource&&combo.length<4&&combo.some(v=>!_SOLVER_SKILL_DATA[v.jp]?.el)){
const fReq=_solverMinStat(combo,hexId,1,fource);
if(fReq&&fReq.min<=999&&(!req||fReq.min<req.min)){
const fCombo=[_mkFourceAction(fource),...combo];
filtered.push({combo:fCombo,kill:null,req:fReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo)});
}
}
if(fource&&combo.some(v=>!_SOLVER_SKILL_DATA[v.jp]?.el)){
for(const t of _TENSION){
if(combo.length+t.eggs+1>4)break;
const efReq=_solverMinStat(combo,hexId,t.mul,fource);
if(efReq&&efReq.min<=999&&(!req||efReq.min<req.min)){
const eggPrefix=_eggPrefix(t.eggs);
const fourceEntry=_mkFourceAction(fource);
filtered.push({combo:[...eggPrefix,fourceEntry,...combo],kill:null,req:efReq,dmgSkills:dmgParts.length,canAntiBlk:_comboCanAntiBlk(combo),multiOnly:t.eggs>=2});
break;
}
}
}
}else{
if(isMetal&&killTargets&&killTargets.length&&T>1){
let validCombo=true;
const _currentChars=_charsSafe();
for(const g of killTargets){
const isGrpMetal=typeof _METAL_MONSTERS!=='undefined'&&_METAL_MONSTERS.has(_monHex(g.hex));
if(isGrpMetal)continue;
const m=(typeof MONSTER_DB!=='undefined')?MONSTER_DB[g.hex]:null;
if(!m)continue;
const hp100=m.s[0];
const hp80=Math.floor(hp100*0.8);
let hpMaxWorld=hp100;
let hpMinWorld=hp80;
for(const v of combo){
if(v.jp==='みのがす'){
if(g.death>0){hpMaxWorld=0;hpMinWorld=0;}
continue;
}
if(v.at===0)continue;
const sk=_skOf(v.jp);
if(!sk||sk.target==='S'||sk.target==='G')continue;
const span=_charDmgSpan(sk,_monHex(g.hex),v.equip,v.hits||1,_currentChars);
hpMaxWorld-=span.min;
hpMinWorld-=span.max;
if(hpMinWorld<=0&&hpMaxWorld>0){
validCombo=false;break;
}
}
if(!validCombo)break;
if(hpMaxWorld>0&&g.death===0){
validCombo=false;break;
}
}
if(!validCombo)continue;
}
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
const _pri=(x)=>_PRIORITY[x.v.jp]||(x.v.equip==='風林火山'?1:0);
if(entry.assign){
const _cmp=(a,b)=>{
const dp=_pri(b)-_pri(a);
if(dp!==0)return dp;
return(entry.assign[a.i]!==undefined?entry.assign[a.i]:99)
-(entry.assign[b.i]!==undefined?entry.assign[b.i]:99);
};
support.sort(_cmp);
damage.sort(_cmp);
}else{
damage.sort((a,b)=>{
const dp=_pri(b)-_pri(a);
if(dp!==0)return dp;
return _maxSkillDmg(a.v.jp,hexId)-_maxSkillDmg(b.v.jp,hexId);
});
}
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
let perms=dmgSk.length>1?_perms(dmgSk):[dmgSk];
if(_metalSupNeed>0){
const _isExecP=(v)=>v.jp==='一閃づき'||v.jp==='魔神斬り';
perms=perms.filter(p=>{let seen=false;for(const v of p){if(_isExecP(v))seen=true;else if(seen)return false;}return true;});
if(!perms.length)continue;
}
let bestCombo=entry.combo,bestRating=entry.kill,bestEgg=entry.eggAssign,bestRound1=entry.round1Removed,bestCharAssign=entry.assign,bestDefend=entry.defend;
const evalCombo=(perm,tgs)=>{
const testCombo=entry.combo.slice();
for(let j=0;j<perm.length;j++){
const tg=tgs?tgs[j]:undefined;
testCombo[dmgIdx[j]]=tg===undefined?perm[j]:Object.assign({},perm[j],{tgtGroup:tg});
}
const pBest=_bestAssign(testCombo,hexId,mon,killTargets,1,null);
if(_rankVal(pBest.rating)>_rankVal(bestRating)){
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
const sk=_skOf(v.jp);
if(!sk||sk.target!=='S'||v.soloGroup||v.tgtGroup!==undefined)return[undefined];
if(v.jp==='一閃づき'||v.jp==='魔神斬り')return[undefined];
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
const plan=_planAFinisher(entry.combo,hexId,mon,killTargets,entry.combo.length<=4?4:8);
if(plan){bestCombo=plan.combo;bestRating='gold';bestEgg=plan.eggAssign;bestRound1=plan.round1Removed;bestCharAssign=plan.assign;bestDefend=plan.defend;if(plan.multiOnly)entry.multiOnly=true;}
}
if(bestRating!=='gold'&&bestCombo.length<=4){
const _mercyIdx35=bestCombo.findIndex(v=>v.jp==='みのがす');
if(_mercyIdx35>=0&&killTargets&&killTargets.length>=2){
const _dmgOnly35=bestCombo.filter(v=>v.at>0);
if(_dmgOnly35.length>=2){
const _lastDmg35=_dmgOnly35[_dmgOnly35.length-1];
const _lastSk35=_skOf(_lastDmg35.jp);
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
_swap35[_mercyIdx35]=_ACT_EGG;
const _swBest35=_bestAssign(_swap35,hexId,mon,killTargets,1,null);
if(_rankVal(_swBest35.rating)>_rankVal(bestRating)){
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
const sk=_skOf(c[ci].jp);
if(!sk)continue;
const hits=c[ci].hits||1;
const alive=sim.filter(i=>i.alive);
if(alive.length===0)break;
const tgt=(sk.target==='A'||sk.target==='RA')?'A':(sk.target==='G'||sk.target==='RG')?'G':'S';
const hitList=tgt==='A'?alive:tgt==='S'?(()=>{
if(_isMetalActionSk(c[ci],sk)){
const mt=_findMetalInst(alive);
if(mt)return[mt];
}
const t=(c[ci].tgtGroup!==undefined&&!c[ci].soloGroup)
?alive.filter(i=>i.gi===c[ci].tgtGroup).sort((a,b)=>b.hp-a.hp)[0]
:alive.sort((a,b)=>b.hp-a.hp)[0];
return t?[t]:[];})():
(()=>{if(c[ci].tgtGroup!==undefined)return alive.filter(i=>i.gi===c[ci].tgtGroup);
return _largestGroupOf(alive,'gi');})();
for(const inst of hitList){
const exec=_checkMetalExecution(c[ci].jp,inst.hex);
if(exec){
if(exec.isValid){inst.hp=0;inst.alive=false;if(inst.gi===0)r1mk=true;}
continue;
}
let rMin,rMax;
if((typeof _METAL_MONSTERS!=='undefined')&&_METAL_MONSTERS.has(_monHex(inst.hex))){
const _elem=!!(sk.el&&sk.el>0);
const _me=_metalEffect(sk.metal||0,_weaponMetalFlag(c[ci].equip));
rMin=(!_elem&&_me)?1:0;rMax=(!_elem&&_me)?2:0;
}else{
const r=calcSkillDamage(sk,_EXT_STATS,inst.hex,null);
rMin=r?r.min:0;rMax=r?r.max:0;
}
if(Math.floor(rMax*hits)>=inst.hp){overkill=true;break;}
inst.hp-=Math.floor(rMin*hits);
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
const seenSig=new Map();
for(let i=0;i<filtered.length;i++){
const sig=_sigOf(filtered[i]);
if(seenSig.has(sig)){
const j=seenSig.get(sig);
if(_rankVal(filtered[i].kill)>_rankVal(filtered[j].kill))filtered[j]=filtered[i];
filtered.splice(i,1);i--;
}else seenSig.set(sig,i);
}
}
const _isAUnifiedFinish=(e)=>{
const fi=(e.finIdx!=null)?e.finIdx:e.combo.length-1;
const fs=e.combo[fi];if(!fs)return false;
const sk=_skOf(fs.jp);
if(!sk||sk.target!=='A')return false;
return e.combo.some((v,i)=>i!==fi&&v.at>0);
};
filtered.sort((a,b)=>{
if(a.combo.length===1&&b.combo.length===1&&a.req&&b.req&&a.req.stat===b.req.stat){
if(a.req.min!==b.req.min)return a.req.min-b.req.min;
}
const ka=2-_rankVal(a.kill);
const kb=2-_rankVal(b.kill);
if(ka!==kb)return ka-kb;
const oa=a.chipOverkill?1:0;
const ob=b.chipOverkill?1:0;
if(oa!==ob)return oa-ob;
if(a.combo.length!==b.combo.length)return a.combo.length-b.combo.length;
const ua=_isAUnifiedFinish(a)?0:1;
const ub=_isAUnifiedFinish(b)?0:1;
if(ua!==ub)return ua-ub;
if(monBlock>0){
const ba=a.canAntiBlk?0:1;
const bb=b.canAntiBlk?0:1;
if(ba!==bb)return ba-bb;
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
return(a.req?.min||0)-(b.req?.min||0);
});
if(filtered.length===0)return'<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const SHOW_INIT=5,SHOW_MAX=30;
const shownList=filtered.slice(0,SHOW_MAX);
const bucketId='sb'+(window._solverBucketId++);
window._solverBuckets=window._solverBuckets||{};
const renderOne=(e,hidden)=>{
const{combo,kill,req,eggAssign,round1Removed,assign,defend}=e;
const cid=window._solverComboId++;
const _simTargets=killTargets?killTargets:((T===1&&monGroups)?monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)})):null);
window._solverComboMap[cid]={combo,killTargets:_simTargets,eggAssign,assign,defend};
const parts=combo.map((v,ci)=>{
const name=useJP?v.jp:v.en;
let s='<span style="color:#ccc;">'+name+'</span>';
if(v.note)s+='<span style="font-size:9px;">'+v.note+'</span>';
if(eggAssign&&eggAssign[ci]){
const tLv=_tensionLvOf(eggAssign[ci]);
s+='<span style="color:#ff0;font-size:8px;">⊕T'+tLv+'</span>';
}
if(monBlock>0&&v.at>0&&!v.equip){
const sd=_sdOf(v.jp);
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
if(req&&(req.posLabel||req.label)){
const reqColor=kill?'#666':'#0ff';
tag+=' <span style="color:'+reqColor+';font-size:9px;">'+(req.posLabel||req.label)+'</span>';
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
const disp=hidden?'display:none;':'';
return'<div class="'+bucketId+'_row" style="'+disp+'font-size:10px;margin-left:16px;color:#aaa;cursor:pointer;" onclick="_expandCombo('+cid+')">'
+comboHtml+tag+' <span style="color:#555;font-size:8px;">▶詳</span></div>'
+'<div id="combo_detail_'+cid+'" style="display:none;"></div>';
};
const lines=shownList.map((e,i)=>renderOne(e,i>=SHOW_INIT));
window._solverBuckets[bucketId]={shown:Math.min(SHOW_INIT,shownList.length),total:shownList.length};
if(shownList.length>SHOW_INIT){
const remain=shownList.length-SHOW_INIT;
lines.push('<div id="'+bucketId+'_more" style="font-size:9px;margin-left:16px;color:#39C5BB;cursor:pointer;text-decoration:underline;" onclick="_showMoreCombos(\''+bucketId+'\')">+'+remain+' more ▾</div>');
}
const shownRound2=shownList.slice(0,SHOW_INIT).some(e=>e.combo.length>4);
if(shownRound2)lines.unshift('<div style="font-size:9px;margin-left:16px;color:#f80;">⚠ 2T (5~8 moves)｜⮕2回目 標各組合 AT 追加(+n/2 或 +0)</div>');
return lines.join('');
}catch(e){console.error('[Solver]',e);return'<div style="color:#f44;font-size:9px;">⚠ solver error</div>';}
}
