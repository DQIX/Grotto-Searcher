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
if(mId&&MONSTER_DATA[mId]&&MONSTER_DATA[mId].en===conds.onlyMon)return true;
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
let mData=MONSTER_DATA[spawnDb[i][0]];
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
if(searchEngine.isStairOverflow[f]){hasAnyAllInvalidAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#c00;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_2}</span>`);if(firstAllInvalidFloor===-1)firstAllInvalidFloor=f;}
continue;
}
if(conds.anomaly==='ghost'){
const di=searchEngine.di[f];const W=di[2],H=di[3];
const upX=di[4],upY=di[5],downX=di[6],downY=di[7];
const gs=[];
for(let y=0;y<H;y++){const yOfs=(y<<4)+792;for(let x=0;x<W;x++){const t=di[yOfs+x];if(t===4||t===5){if(!((x===upX&&y===upY)||(x===downX&&y===downY)))gs.push(`(${x},${y})`);}}}
if(gs.length>0){hasAnyGhostAnomaly=true;result.anomalyDetails.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#557;padding:1px 4px;border-radius:3px;border:1px solid #88a;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">B${f+1}F ${TKB3_1}: ${gs.join(', ')}</span>`);if(firstGhostFloor===-1)firstGhostFloor=f;}
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
for(let id in MONSTER_DATA){
if(MONSTER_DATA[id].en===conds.onlyMon){targetJpName=MONSTER_DATA[id].jp;break;}
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
if(mId&&MONSTER_DATA[mId]&&MONSTER_DATA[mId].en===conds.onlyMon){
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
return foundOffsets.map(o=>
`<span style="color:#0ff;font-size:12px;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`
).join('<br>');
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
for(let f of p.targetFloors){
if(f>=eng.floorCount)continue;
const soloNames=eng.getFloorItemNames(f,1);
const partyNames=eng.getFloorItemNames(f,2);
let soloC=0,partyC=0;
for(let b=0;b<soloNames.length;b++){
if(checkSet.has(soloNames[b]))soloC++;
if(checkSet.has(partyNames[b]))partyC++;
}
if(soloC>=p.reqCount||partyC>=p.reqCount){if(firstHitFloor===-1)firstHitFloor=f;}
let prefixStr=p.isB9F?'B9F ':`B${f+1}F `;
if(soloC>=p.reqCount){
hitTypes.push(`<span style="color:#ff99bb;font-size:11px">${prefixStr}${STR_SOLO} x${soloC}</span>`);
}
if(partyC>=p.reqCount){
hitTypes.push(`<span style="color:#ffd700;font-size:11px">${prefixStr}${STR_PARTY} x${partyC}</span>`);
}
}
if(hitTypes.length>0){
return{isHit:true,jumpFloor:firstHitFloor,displayHtml:hitTypes.join('<br>')};
}
return{isHit:false};
},
quickload9:(eng,p)=>{
const checkSet=new Set(p.checkItems);
let hitTypes=[];
let firstHitFloor=-1;
for(let f of p.targetFloors){
if(f>=eng.floorCount)continue;
const names=eng.getFloorItemNames(f,4);
let cnt=0;
for(let b=0;b<names.length;b++){
if(checkSet.has(names[b]))cnt++;
}
if(cnt>=p.reqCount){if(firstHitFloor===-1)firstHitFloor=f;}
let prefixStr=p.isB9F?'B9F ':`B${f+1}F `;
if(cnt>=p.reqCount){
hitTypes.push(`<span style="color:#b19cd9;font-size:11px">${prefixStr}⑨ x${cnt}</span>`);
}
}
if(hitTypes.length>0){
return{isHit:true,jumpFloor:firstHitFloor,displayHtml:hitTypes.join('<br>')};
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
return{
isHit:true,jumpFloor:f1,
displayHtml:`<span style="color:${p.colorStyle};font-size:11px">B${f1+1}F ${r1}3: ${getDispItem(p1)}<br>B${f2+1}F ${r2}3: ${getDispItem(p2)}</span>`
};
}
}
return{isHit:false};
},
jfire:(eng,p)=>{
let b9Boxes=eng.getBoxCount(8);
let c1Met=false;
let c1Hits=[];
const soloNames=eng.getFloorItemNames(8,1);
const partyNames=eng.getFloorItemNames(8,2);
const limit=Math.min(2,soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b],pp=partyNames[b];
if(s==="Sainted soma"||pp==="Sainted soma"){
c1Met=true;
let t=(s===pp)?STR_BOTH:(pp==="Sainted soma"?STR_PARTY:STR_SOLO);
let color="#ff99d7";
if(t===STR_PARTY)color="#ffd700";
c1Hits.push(`<span style="color:${color};font-size:11px">B9F S${b+1}: ${getDispItem("Sainted soma")} (${t})</span>`);
}
}
if(!c1Met||(b9Boxes>=3&&partyNames[2]==="Sainted soma"))return{isHit:false};
let c2Met=false,c2Det="";
const chk3=(fIdx,n)=>{
if(eng.getBoxCount(fIdx)>=3&&eng.getBoxInfo(fIdx,2).rank===10){
let pItem=eng.getBoxItem(fIdx,2,2)[0];
if(pItem==="Sainted soma"||pItem==="Sage's elixir"){
let dispItem=pItem==="Sainted soma"?getDispItem("Sainted soma"):getDispItem("Sage's elixir");
return{met:true,det:`${n} S3: ${dispItem}`};
}
}
return{met:false};
};
let b9Res=chk3(8,"B9F");
if(b9Res.met){c2Met=true;c2Det=b9Res.det;}
else if(eng.floorCount>=10){
let b10Res=chk3(9,"B10F");
if(b10Res.met){c2Met=true;c2Det=b10Res.det;}
}
if(c1Met&&c2Met){
let html=`${c1Hits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${c2Det}</span>`;
return{isHit:true,jumpFloor:8,displayHtml:html};
}
return{isHit:false};
},
tk:(eng,p)=>{
let wpSet=new Set(p.wpTargets);
let wpMet=false,wpFloor=2;
let wpHits=[];
let checkWp=(fIdx)=>{
if(fIdx>=eng.floorCount)return false;
const soloNames=eng.getFloorItemNames(fIdx,1);
const partyNames=eng.getFloorItemNames(fIdx,2);
let foundAny=false;
const limit=Math.min(2,soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b],pp=partyNames[b];
if(wpSet.has(s)||wpSet.has(pp)){
let t=(wpSet.has(s)&&wpSet.has(pp))?STR_BOTH:(wpSet.has(pp)?STR_PARTY:STR_SOLO);
let hitItem=wpSet.has(pp)?pp:s;
let hitItemStr=getDispItem(hitItem);
let rName=CHEST_RANK[eng.getBoxInfo(fIdx,b).rank]||'?';
let color="#ff99bb";
if(t===STR_PARTY)color="#ffd700";
wpHits.push(`<span style="color:${color};font-size:11px">B${fIdx+1}F ${rName}${b+1}: ${hitItemStr} (${t})</span>`);
wpMet=true;
wpFloor=fIdx;
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
for(let s=p.minSec;s<=p.maxSec;s++){
if(eng.getBoxItem(2,2,s)[0]===p.targetItem){foundSec=s;break;}
}
if(foundSec!==-1){
c1Met=true;
matDet=`B3F ${b3Rank}3 (${foundSec + 5}s): ${getDispItem(p.targetItem)}`;
}
}
if(c1Met){
let html=`${wpHits.join('<br>')}<br><span style="color:#f66;font-size:11px;font-weight:bold;">${matDet}</span>`;
return{isHit:true,jumpFloor:2,displayHtml:html,specialStyle:"1px solid #f66"};
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
let checkSec=p.isMillionaire?2:8;
let labelText=p.isMillionaire?"":"(13s)";
if(eng.floorCount>2&&eng.getBoxCount(2)>=3){
pB3=eng.getBoxItem(2,2,checkSec)[0];
b3Rank=CHEST_RANK[eng.getBoxInfo(2,2).rank]||'?';
if(currentB3Targets.includes(pB3)){
let pB3_25s=eng.getBoxItem(2,2,20)[0];
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
let pB4_25s=eng.getBoxItem(3,2,20)[0];
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
return{isHit:true,jumpFloor:wpFloor,displayHtml:html,specialStyle:c2Met?"1px solid #fa0":""};
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
let specialHtml=specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(s => `<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>`:'';
let anomalyHtml=anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html => html.replace('<span style="', '<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'';
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
const html=`
<span style="color:#ffd700;font-weight:bold">${hex4(seed)}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<span style="color:#0ff;font-size:11px;margin-bottom:2px;display:inline-block;">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div>
<div style="margin-top:4px;">${hitResult.displayHtml}</div>
`;
return{seed,rStr,html,jumpFloor:hitResult.jumpFloor||0,specialStyle:hitResult.specialStyle||'',title:''+J01};
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
function _uspFloorCost(eng,f){
const di=eng.di[f];
const W=di[2],H=di[3];
if(W<=0||H<=0)return null;
const sx=di[4],sy=di[5],gx=di[6],gy=di[7];
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
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
};
SEED_PROCESSORS.fastest=(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const searchOnlyWithD=job.params.searchOnlyWithD;
const benchmarkMode=!!job.params.benchmarkMode;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
if(!benchmarkMode&&searchEngine._details[0]===12){
const allowGrey=(parseInt(conds.boss)===12||conds.elist||conds.onlyMon||job.params.slowest||conds.depth2);
if(!allowGrey)return null;
}
if(conds.onlyMon){
let isCombinedSearch=['2','3','4','PARTIAL_NONE'].includes(conds.elist);
if(!isCombinedSearch&&!checkOnlyMonPossible(searchEngine,conds))return null;
}
searchEngine.createDungeonDetail();
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
const _fastMode=job.params.fastestMode;
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
let specialHtml=specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(s=>`<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>`:'';
let anomalyHtml=anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html=>html.replace('<span style="','<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'';
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
batch.push(item);
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
let specialHtml=elistResult.specialHitDetails.length>0?`<div style="margin-top:4px;">${elistResult.specialHitDetails.map(s=>`<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>`:'';
let anomalyHtml=anomResult.anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomResult.anomalyDetails.map(h=>h.replace('<span style="','<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'';
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
