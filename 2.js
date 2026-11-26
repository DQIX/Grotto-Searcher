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
const LOCATION_SEED_MAX=0x7FFF;
const LOCATION_FQ_BANDS=[
{fqMin:2,fqMax:50,locationMax:47},
{fqMin:51,fqMax:80,locationMax:131},
{fqMin:81,fqMax:248,locationMax:150}
];
const QUEST015="Quest 015";
const QUEST015_EXC={seed:0x0032,fq:0x02,loc:5,bqFill:2};
const isQuest015InFQRange=(seed,fqMin,fqMax)=>seed===QUEST015_EXC.seed&&QUEST015_EXC.fq>=fqMin&&QUEST015_EXC.fq<=fqMax;
function hasConditionValue(raw){return raw!=null&&String(raw).trim()!=="";}
function parseBaseQuality(raw){
if(!hasConditionValue(raw))return null;
const value=Number(String(raw).trim());
return Number.isInteger(value)&&value>=BQ_MIN&&value<=BQ_MAX?value:NaN;
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
function locationFromR3(r3,finalQuality){return(r3%getLocationMax(finalQuality))+1;}
function calcFinalQuality(baseQ,r1){
const final=baseQ+Math.trunc(r1%BQ_MODULO[baseQ]-BQ_TENTH[baseQ]);
return final<BQ_MIN?BQ_MIN:final>BQ_MAX?BQ_MAX:final;
}
const BQ_MODULO=new Int32Array(256),BQ_TENTH=new Float64Array(256);
const BQ_FQ_LO=new Int32Array(256),BQ_FQ_HI=new Int32Array(256);
let BQ_D_FQ=BQ_MAX;
for(let b=BQ_MIN;b<=BQ_MAX;b++){
const m=Math.floor(b/10)*2+1;
BQ_MODULO[b]=m;
BQ_TENTH[b]=b/10;
let lo=BQ_MAX,hi=BQ_MIN;
for(let r=0;r<m;r++){
const f=calcFinalQuality(b,r);
if(f<lo)lo=f;
if(f>hi)hi=f;
}
BQ_FQ_LO[b]=lo;
BQ_FQ_HI[b]=hi;
if(b>=BQ_D_MIN&&lo<BQ_D_FQ)BQ_D_FQ=lo;
}
const bqScanRangeCache={};
function getBaseQScanRange(fqMin,fqMax){
const key=fqMin+':'+fqMax;
let r=bqScanRangeCache[key];
if(!r){
let lo=BQ_MIN,hi=BQ_MAX;
while(lo<=BQ_MAX&&BQ_FQ_HI[lo]<fqMin)lo++;
while(hi>=BQ_MIN&&BQ_FQ_LO[hi]>fqMax)hi--;
r=bqScanRangeCache[key]={lo,hi};
}
return r;
}
const BQ_FEAS_R1_END=0x8000;
let bqCountFeasibility=null,bqFeasWork=null;
function advanceBqCountFeasibility(untilR1){
if(bqCountFeasibility)return true;
if(!bqFeasWork){
const keys=Object.keys(RANKS),acc={};
for(const k of keys)acc[k]={minTotal:Infinity,minGroup:Infinity};
bqFeasWork={keys,acc,pre:new Int32Array(BQ_MAX+2),r1:0};
}
const w=bqFeasWork,pre=w.pre;
const cnt=(lo,hi)=>hi<lo?0:pre[hi]-pre[lo-1];
const end=untilR1<BQ_FEAS_R1_END?untilR1:BQ_FEAS_R1_END;
for(;w.r1<end;w.r1++){
pre.fill(0);
for(let bq=BQ_MIN;bq<=BQ_MAX;bq++)pre[calcFinalQuality(bq,w.r1)]++;
for(let q=1;q<pre.length;q++)pre[q]+=pre[q-1];
for(const k of w.keys){
const{fqMin,fqMax}=RANKS[k],tot=cnt(fqMin,fqMax);
if(tot===0)continue;
const a=w.acc[k];
if(tot<a.minTotal)a.minTotal=tot;
for(const band of LOCATION_FQ_BANDS){
const n=cnt(Math.max(fqMin,band.fqMin),Math.min(fqMax,band.fqMax));
if(n>0&&n<a.minGroup)a.minGroup=n;
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
const key=hex2(rank),info=RANKS[key];
if(!info)return true;
if(mode==='D'||mode==='Dp')return info.fqMax>=BQ_D_FQ;
if(mode==='1p'&&isQuest015InFQRange(QUEST015_EXC.seed,info.fqMin,info.fqMax))return true;
const f=getBqCountFeasibility()[key];
return(mode==='1'?f.minTotal:f.minGroup)===1;
}
function formatRanges(nums){
if(nums.length===0)return C16;
const s=[...nums].sort((a,b)=>a-b),ranges=[];
for(let i=0,j;i<s.length;i=j){
for(j=i+1;j<s.length&&s[j]===s[j-1]+1;j++);
ranges.push(j-1>i?`${s[i]}-${s[j-1]}`:`${s[i]}`);
}
return ranges.join(',');
}
let SEED_TO_TIMERS_CACHE=null;
function ensureSeedTimerCache(){
if(SEED_TO_TIMERS_CACHE)return;
SEED_TO_TIMERS_CACHE={};
for(let t=0;t<65536;t++){
const s=atFromRng(lcg(lcg(t)));
(SEED_TO_TIMERS_CACHE[s]||(SEED_TO_TIMERS_CACHE[s]=[])).push(t);
}
}
function timerToR1R3(timer){
const x1=lcg(timer);
return{r1:atFromRng(x1),r3:atFromRng(lcg(lcg(x1)))};
}
function calcLocations(seed,rStr){
const{fqMin,fqMax}=RANKS[rStr]||{fqMin:BQ_MIN,fqMax:BQ_MAX};
const seenLocations={},outputOrder=[];
const addLoc=(timer,loc,bqs)=>{
let set=seenLocations[loc];
if(!set){
set=seenLocations[loc]=new Set();
outputOrder.push({timer,location:loc,minBq:bqs[0]});
}
for(const bq of bqs)set.add(bq);
};
ensureSeedTimerCache();
const scan=getBaseQScanRange(fqMin,fqMax);
for(const timer of SEED_TO_TIMERS_CACHE[seed]||[]){
const{r1,r3}=timerToR1R3(timer);
const locToBq={};
for(let baseQ=scan.lo;baseQ<=scan.hi;baseQ++){
const finalQ=calcFinalQuality(baseQ,r1);
if(finalQ<fqMin||finalQ>fqMax)continue;
const calcLoc=locationFromR3(r3,finalQ);
(locToBq[calcLoc]||(locToBq[calcLoc]=[])).push(baseQ);
}
for(const loc in locToBq)addLoc(timer,+loc,locToBq[loc]);
}
if(isQuest015InFQRange(seed,fqMin,fqMax))addLoc(QUEST015,QUEST015_EXC.loc,[QUEST015_EXC.bqFill]);
outputOrder.sort((a,b)=>{
if(a.timer===QUEST015)return 1;
if(b.timer===QUEST015)return-1;
return a.timer!==b.timer?a.timer-b.timer:a.minBq-b.minBq;
});
return{outputOrder,seenLocations};
}
let _cachedLocData=null,_cachedLocSeed=null,_cachedLocRankKey=null;
function resetLocationCache(){_cachedLocData=_cachedLocSeed=_cachedLocRankKey=null;}
function getLocDataCached(seed,targetRankKey){
if(!Number.isInteger(seed)||seed<0||seed>LOCATION_SEED_MAX||targetRankKey==null)return null;
if(!peekLocDataCached(seed,targetRankKey)){
_cachedLocData=calcLocations(seed,targetRankKey);
_cachedLocSeed=seed;
_cachedLocRankKey=targetRankKey;
}
return _cachedLocData;
}
function peekLocDataCached(seed,targetRankKey){
return _cachedLocData&&_cachedLocSeed===seed&&_cachedLocRankKey===targetRankKey?_cachedLocData:null;
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
if(!(conds&&conds.onlyMon))return'';
let name=conds.onlyMon;
if(DISPLAY_LANG!=='EN')for(const id in MONSTER_DB)if(MONSTER_DB[id].en===conds.onlyMon){name=MONSTER_DB[id].jp;break;}
return name+EL_ONLY;
}
function resolveRankKey(rStr,rankNum){
return RANKS[rStr]?rStr:rankNum!==undefined&&RANKS[rankNum]?rankNum:null;
}
const rankInfoList=ranks=>ranks.map(rank=>{const rStr=hex2(rank);return{rank,rStr,targetRankKey:resolveRankKey(rStr,rank)};});
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
return!!(conds&&conds.onlyMon)&&['2','3','4','PARTIAL_NONE'].includes(conds.elist);
}
function checkOnlyMonPossible(searchEngine,conds){
if(!(conds&&conds.onlyMon))return true;
const baseMR=searchEngine.monsterRank,maxFloorMR=floorMRAt(baseMR,searchEngine.floorCount-1);
for(let fMR=baseMR;fMR<=maxFloorMR;fMR++)if(matchesOnlyMonFloor(searchEngine._details[3],fMR,conds.onlyMon))return true;
return false;
}
function allBqsD(bqs){
for(const bq of bqs)if(bq<BQ_D_MIN)return false;
return true;
}
function checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey){
const{location,baseQ,valid}=getLocationBQFilters(conds);
if(!valid)return false;
const bqCount=conds.bqCount||"";
if(location===null&&baseQ===null&&!searchFilterLoc&&!bqCount)return true;
if(seed>LOCATION_SEED_MAX||targetRankKey==null)return false;
const locData=getLocDataCached(seed,targetRankKey);
if(!locData||locData.outputOrder.length===0)return false;
if(location!==null||baseQ!==null){
let found=false;
for(const o of locData.outputOrder)if(matchesLocationBQ(locData,o.location,location,baseQ)){found=true;break;}
if(!found)return false;
}
const sets=locData.seenLocations;
switch(bqCount){
case"1":{
const all=new Set();
for(const loc in sets)for(const bq of sets[loc])all.add(bq);
return all.size===1;
}
case"D":for(const loc in sets)if(!allBqsD(sets[loc]))return false;return true;
case"Dp":for(const loc in sets)if(allBqsD(sets[loc]))return true;return false;
case"1p":for(const loc in sets)if(sets[loc].size===1)return true;return false;
}
return true;
}
function checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc){
resetLocationCache();
return checkBasicConds(engine,conds)&&checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey);
}
function makeDBadge(dValue){
return dValue>0?` <span style="background:#fa0;color:#000;padding:1px 4px;border-radius:3px;font-size:10px;">${dValue}</span>`:'';
}
function getElistMonsterBadge(envType,floorMR,targetCount,onlyMonNameStr){
const result={badge:'',isCombinedHit:false};
const spawnDb=getSpawnList(envType,floorMR);
if(!spawnDb.length)return result;
result.isCombinedHit=matchesOnlyMonFloor(envType,floorMR,onlyMonNameStr);
if(targetCount>0){
const names=[];
for(const e of spawnDb){
if(e.length<2)continue;
if(MONSTER_DB[e[0]])names.push(getMonsterDisplayName(e[0]));
if(names.length===targetCount)break;
}
if(names.length>0)result.badge=`<br><span style="display:inline-block;color:#aaa;font-size:11px;">${names.join(' + ')}</span>`;
}
return result;
}
function evalElistFloorHit(searchEngine,f,info,elistCond){
const{kind,count}=classifyElistState(info.state);
const targetCount=kind==='reduced'?count:0;
const isElistHit=targetCount>0&&elistCond===String(targetCount)
||elistCond==='PARTIAL_NONE'&&kind==='partial'
||elistCond==='ONLY'&&kind==='only'
||elistCond==='NONE'&&kind==='none'
||elistCond==='SIZE_15'&&searchEngine.di[f][2]===15;
return{targetCount,isElistHit};
}
function noteElistHit(result,info,text,f,done){
if(info.dValue>0)result.hasMatchedD=true;
if(done)return false;
if(!result.specialHitDetails.includes(text))result.specialHitDetails.push(text);
if(result.jumpToFloor===-1)result.jumpToFloor=f;
return true;
}
function checkElistAndD(searchEngine,conds,searchOnlyWithD,_onlyMonExpectedStr){
const result={match:true,specialHitDetails:[],jumpToFloor:-1,hasMatchedD:false};
const elist=conds.elist,multi=elist==='MULTI_SPECIAL';
if(!(elist||conds.onlyMon||searchOnlyWithD))return result;
const isCombinedSearch=isCombinedElistMonsterSearch(conds);
let hasAnyD=false;
let elistMatched=!isCombinedSearch&&!elist;
let onlyMatched=!isCombinedSearch&&!conds.onlyMon;
const specials=[];
const envType=searchEngine._details[3],baseMR=searchEngine._details[2];
for(let f=0;f<searchEngine.floorCount;f++){
const info=getFloorElistInfo(searchEngine,f);
if(!info.state)continue;
if(info.dValue>0)hasAnyD=true;
const{targetCount,isElistHit}=evalElistFloorHit(searchEngine,f,info,elist);
let monBadge='',isCombinedMatchedThisFloor=false;
if((targetCount>0&&(elist===String(targetCount)||(elist==='SIZE_15'&&isElistHit)))||(isCombinedSearch&&isElistHit)){
const badgeData=getElistMonsterBadge(envType,floorMRAt(baseMR,f),targetCount,isCombinedSearch?conds.onlyMon:null);
monBadge=badgeData.badge;
isCombinedMatchedThisFloor=badgeData.isCombinedHit;
}
const text=`B${f+1}F: ${info.state}${makeDBadge(info.dValue)}${monBadge}`;
specials.push({f,dValue:info.dValue,text});
if(isCombinedSearch){
if(isCombinedMatchedThisFloor&&noteElistHit(result,info,text,f,elistMatched))elistMatched=onlyMatched=true;
}else{
if(elist&&!multi&&isElistHit&&noteElistHit(result,info,text,f,elistMatched))elistMatched=true;
if(conds.onlyMon&&info.state.includes(_onlyMonExpectedStr)&&noteElistHit(result,info,text,f,onlyMatched))onlyMatched=true;
}
}
if(multi){
elistMatched=specials.length>=2;
if(elistMatched){
for(const s of specials){
if(!result.specialHitDetails.includes(s.text))result.specialHitDetails.push(s.text);
if(s.dValue>0)result.hasMatchedD=true;
}
if(result.jumpToFloor===-1)result.jumpToFloor=specials[0].f;
}
}
if((searchOnlyWithD&&!hasAnyD)||!elistMatched||!onlyMatched)result.match=false;
else if(searchOnlyWithD&&(elist||conds.onlyMon)&&!multi&&!result.hasMatchedD)result.match=false;
return result;
}
const ANOM_RULE={
tkb:{i18n:'TKB1_1',test:s=>[s.first.tkb!==-1,s.first.tkb]},
chamber:{i18n:'TKB2_1',iso:true,test:s=>[s.first.chamber!==-1,s.first.chamber]},
multi_chamber:{i18n:'TKB2_2',iso:true,test:s=>[s.chamberFloors>=2,s.first.chamber]},
multi_region:{i18n:'TKB2_3',iso:true,test:s=>[s.first.multiRegion!==-1,s.first.multiRegion]},
tkb_chamber:{i18n:'TKB1_2',iso:true,test:s=>[s.combo,s.first.tkb!==-1?s.first.tkb:s.first.chamber]},
nochest:{i18n:'TKB1_3',test:s=>[s.first.nochest!==-1,s.first.nochest]},
stair:{i18n:'TKB3_0',test:s=>[s.first.stair!==-1,s.first.stair]},
ghost:{i18n:'TKB3_1',test:s=>[s.first.ghost!==-1,s.first.ghost]},
softlock:{i18n:'TKB3_2',test:s=>[s.first.softlock!==-1,s.first.softlock]}
};
function anomRule(key){
switch(key){
case'tkb':return ANOM_RULE.tkb;
case'nochest':return ANOM_RULE.nochest;
case'chamber':return ANOM_RULE.chamber;
case'stair':return ANOM_RULE.stair;
case'ghost':return ANOM_RULE.ghost;
case'softlock':return ANOM_RULE.softlock;
case'multi_region':return ANOM_RULE.multi_region;
case'multi_chamber':return ANOM_RULE.multi_chamber;
case'tkb_chamber':return ANOM_RULE.tkb_chamber;
}
return null;
}
const ghostLineHtml=(f,at)=>`<span class="an-ghost" data-f="${f}">B${f+1}F ${TKB3_1}: ${at}</span>`;
function checkAnomalies(searchEngine,conds){
const result={match:true,anomalyDetails:[],jumpToFloor:-1};
const key=conds.anomaly;
if(key==="")return result;
const rule=anomRule(key),skipIso=!(rule&&rule.iso),det=result.anomalyDetails;
const first={tkb:-1,nochest:-1,chamber:-1,stair:-1,ghost:-1,softlock:-1,multiRegion:-1};
const mark=(k,f)=>{if(first[k]===-1)first[k]=f;};
let combo=false,chamberFloors=0;
for(let f=0;f<searchEngine.floorCount;f++){
const fl=`B${f+1}F `;
if(key==='softlock'){
if(searchEngine.isStairOverflow[f]){
det.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#c00;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${fl}${TKB3_2}</span>`);
mark('softlock',f);
}
continue;
}
if(key==='ghost'){
const gs=[];
scanGhostStairs(searchEngine.di[f],gs);
if(gs.length>0){
const at=gs.join(', ');
det.push(ghostLineHtml(f,at));
(result.ghost||(result.ghost=[])).push([f,at]);
mark('ghost',f);
}
continue;
}
const anom=getFloorAnomalies(searchEngine,f,skipIso);
if(anom.hasInaccessibleStair){
det.push(`<span style="color:#ff0000;font-size:11px;font-weight:bold;background:#550000;padding:1px 4px;border-radius:3px;">${fl}${TKB3_0}</span>`);
mark('stair',f);
}
if(anom.hasInaccessibleChest){
if(anom.totalChests===1){
det.push(`<span style="color:#0ff;font-size:11px;font-weight:bold;background:#004466;padding:1px 4px;border-radius:3px;border:1px solid #08a;">${fl}${TKB1_3}</span>`);
mark('nochest',f);
}else{
det.push(`<span style="color:#ff69b4;font-size:11px;font-weight:bold;">${fl}${TKB1_1}</span>`);
}
mark('tkb',f);
}
if(anom.hasChamber){
chamberFloors++;
if(anom.isolatedRegions.length>=2)mark('multiRegion',f);
const countBadges=anom.isolatedRegions.map(size=>`<span style="background:#ff6ec7;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;margin-left:4px;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${size}</span>`).join('');
det.push(`<span style="color:#fa0;font-size:11px;">${fl}${TKB2_1} ${countBadges}</span>`);
mark('chamber',f);
if(anom.hasInaccessibleChest)combo=true;
}
}
if(rule){
const[ok,jump]=rule.test({first,chamberFloors,combo});
if(ok)result.jumpToFloor=jump;
else result.match=false;
}
return result;
}
function rankCanDropInMRRange(r,numMin,numMax){
for(let num=numMin;num<=numMax;num++){
if(r>=TableF[(num-1)*4+1]&&r<=TableF[(num-1)*4+2])return true;
}
return false;
}
function getRankSMRInfo(rank,conds){
const c=conds||{},outside=(v,lo,hi)=>v<lo||v>hi;
if(hasConditionValue(c.bq)){
const bq=parseBaseQuality(c.bq),rankInfo=RANKS[hex2(rank)];
if(Number.isNaN(bq)||rankInfo&&(BQ_FQ_HI[bq]<rankInfo.fqMin||BQ_FQ_LO[bq]>rankInfo.fqMax))return null;
}
const[minSMR,maxSMR]=row4(TableC,8,rank,[1,9]);
if(c.monster&&outside(parseInt(c.monster),minSMR,maxSMR))return null;
const[floorLo,floorHi]=row4(TableB,9,rank,[2,16]);
if(c.depth&&outside(parseInt(c.depth),floorLo,floorHi))return null;
if(c.depth2&&parseInt(c.depth2)>floorHi)return null;
const[minBoss,maxBoss]=row4(TableD,9,rank,[1,12]);
if(c.boss&&outside(parseInt(c.boss),minBoss,maxBoss))return null;
if(c.lv){
const pick=(v,dft)=>v?parseInt(v):dft,clampLv=v=>v<1?1:v>99?99:v;
const base=(b,d,s)=>(b+d+s-4)*3;
const lvLo=clampLv(base(pick(c.boss,minBoss),pick(c.depth,floorLo),pick(c.monster,minSMR))-5);
const lvHi=clampLv(base(pick(c.boss,maxBoss),pick(c.depth,floorHi),pick(c.monster,maxSMR))+5);
if(outside(parseInt(c.lv),lvLo,lvHi))return null;
}
return{minSMR,maxSMR,maxFloorCount:c.depth?parseInt(c.depth):floorHi,minBoss,maxBoss};
}
function sharedRankFilter(ranksToSearch,conds,isBugSearch=false){
if(!getLocationBQFilters(conds).valid)return[];
if(conds.bqCount)ranksToSearch=ranksToSearch.filter(rank=>isBqCountRankPossible(rank,conds.bqCount));
if(!conds.onlyMon&&!conds.monster&&!hasConditionValue(conds.bq)&&!conds.hasBoxCond&&!conds.prefix&&!conds.suffix&&!conds.lv&&!conds.depth&&!conds.depth2&&!conds.boss)return ranksToSearch;
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
const{minSMR,maxSMR,maxFloorCount,minBoss,maxBoss}=info;
if(conds.prefix&&!rowsHit(TableH,5,minSMR,maxSMR,parseInt(conds.prefix)))return false;
if(conds.suffix&&!rowsHit(TableI,4,minBoss,maxBoss,parseInt(conds.suffix)))return false;
const maxFloor=isBugSearch?15:maxFloorCount-1;
if(conds.hasBoxCond){
const maxPossibleNum=floorMRAt(maxSMR,maxFloor);
for(let r=10;r>=1;r--)if(conds.reqBox[r]>0&&!rankCanDropInMRRange(r,minSMR,maxPossibleNum))return false;
}
if(!conds.onlyMon)return true;
const targetEnv=conds.env?parseInt(conds.env):0;
const smrStart=conds.monster?parseInt(conds.monster):minSMR,smrEnd=conds.monster?parseInt(conds.monster):maxSMR;
for(let env=1;env<=5;env++){
if(targetEnv&&env!==targetEnv)continue;
for(let fMR=1;fMR<=12;fMR++){
if(!matchesOnlyMonFloor(env,fMR,conds.onlyMon))continue;
for(let smr=smrStart;smr<=smrEnd;smr++)if(fMR>=smr&&fMR<=floorMRAt(smr,maxFloor))return true;
}
}
return false;
});
}
function getDispItem(enName){let trans=i18nDict['I_'+enName];return trans?String(trans).split('(')[0]:enName;}
const ITEMS_MILLIONAIRE=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
const ITEMS_MILLIONAIRE_BOX3=ITEMS_MILLIONAIRE.slice(0,7);
const ITEMS_S_WEAPONS=["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
const ITEMS_METAL_SLIME=["Metal slime sword","Metal slime spear","Metal slime shield","Metal slime armour","Metal slime helm","Metal slime gauntlets","Metal slime sollerets"];
const ITEM_GROUPS=new Map([['Millionaire',ITEMS_MILLIONAIRE],['S weapon',ITEMS_S_WEAPONS],['Metasla',ITEMS_METAL_SLIME]]);
function expandItemGroup(v){return ITEM_GROUPS.get(v)||[v];}
function getChestRanksForItems(itemNames){
const ranks=[];
for(let r=1;r<=10;r++){
for(let i=TableO[r-1];i<TableO[r];i++)if(itemNames.includes(TableR[TableQ[i]][0])){ranks.push(r);break;}
}
return ranks;
}
const chestRankFilter=(chestRanks,off)=>(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],off);
function filterMapRanksBySMRAndChest(ranksToSearch,conds,chestRankGroups,targetFloorOffset){
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
if(!chestRankGroups||chestRankGroups.length===0)return true;
let minFloor=0,maxFloor=info.maxFloorCount-1;
if(targetFloorOffset!=null){
minFloor=maxFloor=targetFloorOffset*4;
if(info.maxFloorCount<=minFloor)return false;
}
const minNum=floorMRAt(info.minSMR,minFloor),maxNum=floorMRAt(info.maxSMR,maxFloor);
return chestRankGroups.every(group=>group.some(r=>rankCanDropInMRRange(r,minNum,maxNum)));
});
}
const DEFAULT_USER_DEFT=999;
function calcDeftness(at){
const raw=Math.ceil(at/32768*100-2)*20;
return raw<=0?0:raw>999?1000:raw;
}
function formatDeftness(at){
const deft=calcDeftness(at);
const color=deft>=1000?'#f44':deft<=1?'#888':'#39C5BB';
const label=deft>=1000?'1000':deft<=0?'1':deft.toString();
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
const s=advanceATRng(seed,N);
return{atN:atFromRng(s),atN1:atFromRng(lcg(s))};
}
function battleATContext(N,mapDeft,userDeft){
const canRound2=userDeft>=mapDeft,first=N+(canRound2?3:4);
return{canRound2,firstUnused:[first,first+1,first+2]};
}
function battleATBudgets(context,target){
const u=context.firstUnused;
return{d1:target-u[0],d2:target-u[1],d4:target-u[2]};
}
function battleATBudgetsForRun(context,runStart,runEnd){
const last=Math.max(runStart,runEnd);
const pick=(k)=>Math.min(Math.max(context.firstUnused[k],runStart),last)-context.firstUnused[k];
return{d1:pick(0),d2:pick(1),d4:pick(2)};
}
const battleATForCount=(budget,count)=>count===1?budget.d1:count<=3?budget.d2:budget.d4;
const DEFAULT_RARE_RATE=256,DEFAULT_NORMAL_RATE=128;
function dropATThreshold(inverseRate){return inverseRate>0?Math.floor(32768/inverseRate):-1;}
function thiefATThreshold(inverseRate,level){if(!(inverseRate>0)||!(level>0))return-1;return Math.floor(32767/Math.floor(inverseRate*100/level))+1;}
function passesATThreshold(at,threshold){return at<=threshold;}
function formatATPtnHTML(extractLen,step,valsBuffer,hb){
const out=[];
for(let i=extractLen-1;i>=0;i--){
const v=valsBuffer[(step-i)%10];
out.push((hb&(1<<i))!==0?`<strong style="color:#f44;">${v}</strong>`:`<span style="color:#666;">${v}</span>`);
}
return out.join(', ');
}
function scanSeedForAtPattern(seed,maxSteps,threshold,pType,minStart){
const valsBuffer=new Int32Array(10),rows=AT_PATTERN_TABLES[pType]||[],foundByStart=new Map();
const noLowerBound=maxSteps<=50,effMinStart=noLowerBound?1:minStart;
let rng=seed,historyBits=0,validCount=0;
for(let step=1;step<=maxSteps;step++){
rng=lcg(rng);
const val=atFromRng(rng);
if(!noLowerBound&&step<38)continue;
historyBits=((historyBits<<1)|(passesATThreshold(val,threshold)?1:0))&1023;
valsBuffer[step%10]=val;
validCount++;
for(const row of rows){
if(validCount<row.length||!row.accept[historyBits&row.mask])continue;
const startStep=step-row.length+1;
if(startStep>=effMinStart&&!foundByStart.has(startStep)){
foundByStart.set(startStep,{start:startStep,valsHtml:formatATPtnHTML(row.length,step,valsBuffer,historyBits)});
}
}
}
return{foundOffsets:[...foundByStart.values()].sort((a,b)=>a.start-b.start)};
}
function LocaHtmlFromData(locData,conds){
if(!locData||locData.outputOrder.length===0)return"";
const{location,baseQ,valid}=getLocationBQFilters(conds);
if(!valid)return"";
const matchedLocs=[];
for(const o of locData.outputOrder)if(matchesLocationBQ(locData,o.location,location,baseQ))matchedLocs.push(hex2(o.location));
return matchedLocs.length>0
?`<span style="margin-left:4px;color:#ccc;font-size:10px;background:#222;padding:1px 4px;border-radius:3px;">${matchedLocs.join(' / ')}</span>`:"";
}
function getLocHtmlCached(seed,targetRankKey,conds){
const locData=getLocDataCached(seed,targetRankKey);
return locData?LocaHtmlFromData(locData,conds):"";
}
function matchReqBoxes(counts,reqBox){
const boxStr=[];
for(let r=10;r>=1;r--){
if(reqBox[r]>0){
if(counts[r-1]!==reqBox[r])return null;
boxStr.push(`${CHEST_RANK[r]}${reqBox[r]}`);
}
}
return boxStr.join(' ');
}
function ChestHtml(engine,conds){
if(!conds.hasBoxCond)return"";
const boxText=matchReqBoxes(engine._details2,conds.reqBox);
return boxText===null?null:`<span style="color:#fc0;font-size:11px;background:#420;padding:2px 4px;border-radius:3px;">${boxText}</span>`;
}
const fmtStep=v=>Number.isInteger(v)?''+v:v.toFixed(1);
const fmtStepD=v=>v==null?'—':fmtStep(v);
const minAstar=arr=>{const m=Math.min(...arr.map(v=>v==null?Infinity:v));return m===Infinity?null:m;};
const specialTagHtml=s=>`<span class="sp-tag">${s}</span>`;
const seedTagHtml=(seed,size)=>`<span style="color:#ffd700;font-weight:bold${size?`;font-size:${size}px;`:''}">${hex4(seed)}</span>`;
const rankTagHtml=rStr=>`<span style="color:#888">(Rank ${rStr})</span>`;
function buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,specialHitDetails,anomalyDetails,mid='',tail=''}){
const locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const specialHtml=specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(specialTagHtml).join('<br>')}</div>`:'';
const anomalyHtml=anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html=>html.replace('<span style="','<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'';
return`${seedTagHtml(seed)}${rankTagHtml(rStr)}<br>
<span style="color:#0ff;font-size:11px">${dispName(searchEngine)}</span>${locHtml}${mid}
<div style="margin-top:4px;">${boxHtml}</div>${specialHtml}${anomalyHtml}${tail}`;
}
const matchJumpFloor=(elistResult,anomResult)=>elistResult.jumpToFloor!==-1?elistResult.jumpToFloor:anomResult.jumpToFloor;
function buildAtOffsetsHtml(foundOffsets){
return foundOffsets.map(o=>`<span style="color:#0ff;font-size:12px;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`).join('<br>');
}
function buildBattleAtDiffsHtml(foundOffsets,N,deft,userDeft=DEFAULT_USER_DEFT){
const context=battleATContext(N,deft,userDeft);
const lines=foundOffsets.map(o=>{
const{d1,d2,d4}=battleATBudgets(context,o.start);
return`<span class="at-dynamic-battle" data-target="${o.start}" style="font-size:11px;text-shadow:0 0 2px rgba(255,170,0,0.5);">${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}</span>`;
}).join(`<br><span style="color:transparent;font-size:11px;">${H06} </span>`);
return`<span style="color:#fa0;margin-left:12px;font-size:11px;">${H06} ${lines}</span>`;
}
function buildAtInfoCardHtml(seed,N,atN,atN1,diffsHtml){
const{color:deftColor,label:deftLabel}=formatDeftness(atN1);
return`<div class="at-m-card" data-seed="${seed}" style="margin-top:4px;padding:5px 8px;background:#0a1a1a;border:1px solid #055;border-radius:3px;">
<span style="color:#4c4;font-size:11px;"><span class="at-m-atn-label">AT[${N}]: </span><span class="at-m-atval">${atN}</span></span>
<strong class="at-dynamic-mon" data-at="${atN}" style="color:#f8f;margin-left:8px;font-size:11px;text-shadow:0 0 2px rgba(255,136,255,0.5);"></strong>
<br><span class="at-m-deft" style="color:${deftColor};display:inline-block;margin-top:4px;font-size:11px;">${G18} ${deftLabel}</span>${diffsHtml}</div>`;
}
function buildAtPatternBoxHtml(patternName,probText,offsetsHtml){return`<div style="margin-top:4px;padding:4px 8px;background:#111;border:1px solid #333;border-radius:4px;"><span style="color:#fa0;font-size:11px;font-weight:bold;">${patternName} (${probText})</span><br>${offsetsHtml}</div>`;}
const SI_PATTERN_INDICES=Object.fromEntries(AT_O.map(([k,,p])=>[k,p]));
const isNormalDropPattern=key=>AT_O.some(o=>o[0]===key&&o[3]);
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
const threshold=(rates,m,bk)=>bk?thiefATThreshold(rate(rates,m),tLevels[bk-1]):dropATThreshold(rate(rates,m));
const slots=[];
forEachDropSlot(gSize,tLevels,(m,bk)=>{
slots.push({gIdx:m,bk,rareThreshold:threshold(rRarity,m,bk),normalThreshold:threshold(nRarity,m,bk)});
});
return slots;
}
function simulateDropSlots(startRng,slots,recordSeq){
let rng=startRng>>>0,rngCount=0;
const seq=[],rareHits=[],normHits=[];
const nextAT=()=>{rng=lcg(rng);rngCount++;return atFromRng(rng);};
for(const slot of slots){
const first=rngCount+1,{gIdx,bk}=slot;
const draw=rollDropSlot(nextAT,slot.rareThreshold,slot.normalThreshold);
if(draw.rareHit)rareHits.push(first);
if(draw.normalHit)normHits.push(first+1);
if(recordSeq){
const row=(isR,val,red)=>({val,red,gIdx,isR,bk,
type:bk?`Book${bk} Group${gIdx+1} (${isR?'R':'N'})`:`Group${gIdx+1} Drop (${isR?'R':'N'})`});
seq.push(row(true,draw.rareVal,draw.rareHit));
if(draw.normalVal!==null)seq.push(row(false,draw.normalVal,draw.normalHit));
}
}
return{seq,rareHits,normHits};
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
const AT_PATTERN_TABLES=Object.fromEntries(Object.entries(SI_PATTERN_INDICES).map(([key,patterns])=>[AT_PAT[key],compileATPattern(patterns,isNormalDropPattern(key))]));
function scanDropPatternStarts(seed,key,slots,firstStart,lastStart,limit=Infinity){
const patterns=SI_PATTERN_INDICES[key];
if(!patterns||firstStart>lastStart||limit<1)return[];
const normal=isNormalDropPattern(key),out=[];
let rng=advanceATRng(seed,firstStart-1);
for(let start=firstStart;start<=lastStart;start++){
const sim=simulateDropSlots(rng,slots,false);
if(siMatchesPattern(normal?sim.normHits:sim.rareHits,patterns)){
out.push({start,simulation:simulateDropSlots(rng,slots,true)});
if(out.length>=limit)break;
}
rng=lcg(rng);
}
return out;
}
function siMatchesPattern(hits,patterns){
if(!patterns)return false;
next:for(const p of patterns){
if(hits.length<p.length)continue;
for(let i=0;i<p.length;i++)if(hits[i]!==p[i])continue next;
return true;
}
return false;
}
function initItemI18n(){
TableR.forEach(pair=>{i18nDict['I_'+pair[0]]=T(pair[0],pair[1]);});
Object.assign(i18nDict,{"I_Millionaire":T("Millionaire","大富豪"),"I_S weapon":T("S weapon","S武器")});
}
const SEED_SETUP={
ultimate:(engine,job)=>{
engine.trackOverflow=(job.conds.anomaly==='softlock'||job.conds.anomaly==='ghost');
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
},
item:null,
multibug:(engine,job)=>{job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);},
fastest:(engine,job)=>{
SEED_SETUP.ultimate(engine,job);
engine.force_16_floors=(job.params.fastestMode==='maxtile');
}
};
const CHEST_TIMER_OFFSET=5;
const meetsQuickloadBasicReq=(eng,p,conds)=>eng.floorCount>=(p.isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isB9F?2:0).length>0;
const ITEM_BASIC_REQS={
free:(eng,p)=>eng.floorCount>=p.reqFloorCount,
quickload:meetsQuickloadBasicReq,
quickload9:meetsQuickloadBasicReq,
quickload9all:(eng,p,conds)=>eng.floorCount>=2&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],null).length>0,
third:(eng,p,conds)=>eng.floorCount>=(p.isS3?14:4)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isS3?3:0).length>0,
jfire:eng=>eng.monsterRank===9&&eng.floorCount>=9,
tk:eng=>eng.floorCount>=3,
};
const QL_MARK_5={sec:0,mk:'⑤',mkColor:'#7fd4ff'},QL_MARK_9={sec:4,mk:'⑨',mkColor:'#b19cd9'};
const getQuickloadMark=(p)=>(p.qlSec===0?QL_MARK_5:QL_MARK_9);
const QL_SOLO={sec:1,mk:STR_SOLO,mkColor:'#f9b'},QL_PARTY={sec:2,mk:STR_PARTY,mkColor:'#ffd700'};
function scanQuickloadFloors(eng,p,modeA,modeB){
const checkSet=new Set(p.checkItems),hitTypes=[],multi=[];
const useB10=!!(p.checkB10&&p.isB9F);
let firstHitFloor=-1,astarBoxes=null,astarFloor=-1;
for(const f of useB10?[8,9]:p.targetFloors){
if(f>=eng.floorCount)continue;
const prefixStr=(p.isB9F&&!useB10)?'B9F ':`B${f+1}F `;
let boxes=null,fHtml='';
for(let i=0;i<2;i++){
const mode=i===0?modeA:modeB;
if(!mode)break;
const names=eng.getFloorItemNames(f,mode.sec),hitIdx=[];
for(let b=0;b<names.length;b++)if(checkSet.has(names[b]))hitIdx.push(b);
if(hitIdx.length<p.reqCount)continue;
const line=`<span style="color:${mode.mkColor};font-size:11px">${prefixStr}${mode.mk} x${hitIdx.length}</span>`;
hitTypes.push(line);
fHtml=fHtml?fHtml+'<br>'+line:line;
if(boxes===null)boxes=hitIdx;
}
if(boxes===null)continue;
if(firstHitFloor===-1){
firstHitFloor=f;
if(p.wantAstar){astarFloor=f;astarBoxes=boxes;}
}
if(useB10)multi.push({floor:f,displayHtml:fHtml,astar:calcSameFloorChestChainCost(eng,f,boxes),isB10:f===9,isX3:boxes.length>p.reqCount});
}
if(useB10)return multi.length>0?{isHit:true,multi}:{isHit:false};
if(hitTypes.length===0)return{isHit:false};
const res={isHit:true,jumpFloor:firstHitFloor,displayHtml:hitTypes.join('<br>')};
if(astarBoxes){
res.astar=calcSameFloorChestChainCost(eng,astarFloor,astarBoxes);
if(astarBoxes.length>p.reqCount)res.astarX3=true;
}
return res;
}
function scanWpFirstTwo(eng,p,fIdx,uniSec,wpSet,soloColor,hits,soloIdx,partyIdx){
const soloNames=eng.getFloorItemNames(fIdx,uniSec==null?1:uniSec);
const partyNames=uniSec==null?eng.getFloorItemNames(fIdx,2):soloNames;
let found=false;
const limit=Math.min(2,soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b],pp=partyNames[b];
const sHit=wpSet.has(s),pHit=wpSet.has(pp);
if(!sHit&&!pHit)continue;
const t=uniSec!=null?`${uniSec+CHEST_TIMER_OFFSET}s`:(sHit&&pHit)?STR_BOTH:(pHit?STR_PARTY:STR_SOLO);
const color=uniSec!=null?getQuickloadMark(p).mkColor:t===STR_PARTY?"#ffd700":soloColor;
const rName=CHEST_RANK[eng.getBoxInfo(fIdx,b).rank]||'?';
hits.push(`<span style="color:${color};font-size:11px">B${fIdx+1}F ${rName}${b+1}: ${getDispItem(pHit?pp:s)} (${t})</span>`);
if(sHit)soloIdx.push(b);
if(pHit)partyIdx.push(b);
found=true;
}
return found;
}
const JFIRE_WP_SET=new Set(["Sainted soma"]);
function getWpChestCases(wpPartyIdx,wpSoloIdx){
const same=wpPartyIdx.length===wpSoloIdx.length&&wpPartyIdx.every((v,i)=>v===wpSoloIdx[i]);
if(same)return wpPartyIdx.length?[wpPartyIdx]:[];
const cs=[];
if(wpPartyIdx.length)cs.push(wpPartyIdx);
if(wpSoloIdx.length)cs.push(wpSoloIdx);
return cs;
}
function setWpTargetAstar(eng,o,wpFloor,fIdx,wpPartyIdx,wpSoloIdx){
const d=eng.di[fIdx],tgt=[{g:fIdx,gx:d[17],gy:d[18]}];
const vals=getWpChestCases(wpPartyIdx,wpSoloIdx).map(bx=>calcCrossFloorChestRouteCost(eng,wpFloor,bx,tgt));
o.astar=minAstar(vals);
if(vals.length===2)o.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
function checkTKThirdChest(eng,floor,checkSec,laterSec,targets,laterTargets){
let valid=false,item="",rank="";
if(eng.floorCount>floor&&eng.getBoxCount(floor)>=3){
item=eng.getBoxItem(floor,2,checkSec)[0];
rank=CHEST_RANK[eng.getBoxInfo(floor,2).rank]||'?';
valid=targets.includes(item)&&!laterTargets.includes(eng.getBoxItem(floor,2,laterSec)[0]);
}
return{valid,item,rank};
}
const DUNGEON_CHECKERS={
free:(eng,p)=>{
const groupHits=[],used=new Map();
for(const g of p.groups){
const f=g.floor-1;
if(f>=eng.floorCount)return{isHit:false};
const bCount=eng.getBoxCount(f);
let gHtmlStr=null;
for(let b=0;b<bCount&&gHtmlStr===null;b++){
if((g.boxIdx===0||g.boxIdx===1||g.boxIdx===2)?b!==g.boxIdx:g.boxIdx===3&&b>=2)continue;
const rank=eng.getBoxInfo(f,b).rank;
if(g.rank>0&&rank!==g.rank)continue;
const key=f+'_'+b,u=used.get(key);
const head=`<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[rank]}${b+1} `;
if(!g.items&&g.timerVal===-1){
if(u)continue;
used.set(key,true);
gHtmlStr=head+'(Any)</span>';
continue;
}
if(u===true)continue;
const s0=g.timerVal===-1?0:Math.max(0,g.timerVal-CHEST_TIMER_OFFSET),s1=g.timerVal===-1?255:s0;
for(let s=s0;s<=s1;s++){
if(u&&u.has(s))continue;
const itemEN=eng.getBoxItem(f,b,s)[0];
if(g.items===null||g.items.includes(itemEN)){
if(u)u.add(s);else used.set(key,new Set([s]));
gHtmlStr=head+`(${s+CHEST_TIMER_OFFSET}s): ${getDispItem(itemEN)}</span>`;
break;
}
}
}
if(gHtmlStr===null)return{isHit:false};
groupHits.push(gHtmlStr);
}
return{isHit:true,jumpFloor:p.groups[0].floor-1,displayHtml:groupHits.join('<br>'),specialStyle:"1px solid #08c"};
},
quickload:(eng,p)=>scanQuickloadFloors(eng,p,QL_SOLO,QL_PARTY),
quickload9:(eng,p)=>scanQuickloadFloors(eng,p,getQuickloadMark(p)),
quickload9all:(eng,p)=>{
const{sec,mk,mkColor}=getQuickloadMark(p);
const checkSet=new Set(p.checkItems),anchorSet=new Set(p.anchorFloors||[]),hitFloors=[];
let anchorHit=false;
for(let f=0;f<eng.floorCount;f++){
const names=eng.getFloorItemNames(f,sec);
let cnt=0;
for(let b=0;b<names.length;b++)if(checkSet.has(names[b]))cnt++;
const isAnchor=anchorSet.has(f);
if(cnt>=(isAnchor?p.anchorThreshold:p.otherThreshold)){
hitFloors.push({f,cnt});
if(isAnchor)anchorHit=true;
}
}
const oneOK=!p.needOneWith||hitFloors.some(h=>h.cnt>=p.needOneWith);
if(hitFloors.length<2||(anchorSet.size>0&&!anchorHit)||!oneOK)return{isHit:false};
const parts=hitFloors.map(h=>`<span style="color:${mkColor};font-size:11px">B${h.f+1}F ${mk} x${h.cnt}</span>`);
return{isHit:true,jumpFloor:hitFloors[0].f,displayHtml:parts.join('<br>')};
},
third:(eng,p)=>{
const[f1,f2]=p.targetFloors;
if(eng.getBoxCount(f1)<3||eng.getBoxCount(f2)<3)return{isHit:false};
if(p.isS3&&(eng.getBoxInfo(f1,2).rank!==10||eng.getBoxInfo(f2,2).rank!==10))return{isHit:false};
const p1=eng.getBoxItem(f1,2,2)[0],p2=eng.getBoxItem(f2,2,2)[0];
const r1=CHEST_RANK[eng.getBoxInfo(f1,2).rank]||'?',r2=CHEST_RANK[eng.getBoxInfo(f2,2).rank]||'?';
if(!p.checkItems.includes(p1)||!p.checkItems.includes(p2))return{isHit:false};
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
},
jfire:(eng,p)=>{
const uniSec=p.qlSec;
const shift=uniSec==null?0:uniSec-2;
const SOMA="Sainted soma",ELIXIR="Sage's elixir";
const scanWp=(wpFloor,thirdFloors,chooseShortest)=>{
if(wpFloor>=eng.floorCount)return null;
const wpBoxCount=eng.getBoxCount(wpFloor);
const wpHits=[],wpSoloIdx=[],wpPartyIdx=[];
const wpMet=scanWpFirstTwo(eng,p,wpFloor,uniSec,JFIRE_WP_SET,"#f9d",wpHits,wpSoloIdx,wpPartyIdx);
if(!wpMet||(wpBoxCount>=3&&eng.getBoxItem(wpFloor,2,2+shift)[0]===SOMA))return null;
const targets=[];
for(const fIdx of thirdFloors){
if(fIdx>=eng.floorCount||eng.getBoxCount(fIdx)<3||eng.getBoxInfo(fIdx,2).rank!==10)continue;
const pItem=eng.getBoxItem(fIdx,2,2+shift)[0];
if(pItem!==SOMA&&pItem!==ELIXIR)continue;
const target={floor:fIdx,det:`B${fIdx+1}F S3: ${getDispItem(pItem)}`};
if(p.wantAstar)setWpTargetAstar(eng,target,wpFloor,fIdx,wpPartyIdx,wpSoloIdx);
targets.push(target);
}
if(targets.length===0)return null;
let best=targets[0];
if(chooseShortest&&p.wantAstar){
const cost=t=>t.astar==null?Infinity:t.astar;
for(let i=1;i<targets.length;i++)if(cost(targets[i])<cost(best))best=targets[i];
}
const res={isHit:true,jumpFloor:wpFloor,displayHtml:`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${best.det}</span>`};
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
const wpSet=new Set(p.wpTargets),wpHits=[],wpSoloIdx=[],wpPartyIdx=[];
const uniSec=p.qlSec;
const shift=uniSec==null?0:uniSec-2;
const checkWp=(fIdx)=>fIdx<eng.floorCount&&scanWpFirstTwo(eng,p,fIdx,uniSec,wpSet,"#f9b",wpHits,wpSoloIdx,wpPartyIdx);
if(p.isMonsterBox){
if(!checkWp(2)||!(eng.floorCount>2&&eng.getBoxCount(2)>=3))return{isHit:false};
const b3Rank=CHEST_RANK[eng.getBoxInfo(2,2).rank]||'?';
for(let s=p.minSec+shift;s<=p.maxSec+shift;s++){
if(eng.getBoxItem(2,2,s)[0]!==p.targetItem)continue;
const matDet=`B3F ${b3Rank}3 (${s+CHEST_TIMER_OFFSET}s): ${getDispItem(p.targetItem)}`;
const res={isHit:true,jumpFloor:2,displayHtml:`${wpHits.join('<br>')}<br><span style="color:#f66;font-size:11px;font-weight:bold;">${matDet}</span>`,specialStyle:"1px solid #f66"};
if(p.wantAstar)setWpTargetAstar(eng,res,2,2,wpPartyIdx,wpSoloIdx);
return res;
}
return{isHit:false};
}
const wpFloor=checkWp(2)?2:checkWp(3)?3:-1;
if(wpFloor===-1)return{isHit:false};
const strict=p.strictMatTargets,targetsFor=fl=>p.isMillionaire&&wpFloor!==fl?p.broadMatTargets:strict;
const checkSec=(p.isMillionaire?2:8)+shift;
const labelText=p.isMillionaire?"":`(${checkSec+CHEST_TIMER_OFFSET}s)`;
const b3=checkTKThirdChest(eng,2,checkSec,20+shift,targetsFor(2),strict);
const b4=checkTKThirdChest(eng,3,checkSec,20+shift,targetsFor(3),strict);
if(!b3.valid&&!b4.valid)return{isHit:false};
const c2Met=b3.valid&&b4.valid;
const det=(name,c)=>`${name} ${c.rank}3 ${labelText}: ${getDispItem(c.item)}`;
const matDet=c2Met?det('B3F',b3)+'<br>'+det('B4F',b4):b3.valid?det('B3F',b3):det('B4F',b4);
const res={isHit:true,jumpFloor:wpFloor,displayHtml:`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${matDet}</span>`,specialStyle:c2Met?"1px solid #fa0":""};
if(p.wantAstar){
const t3=b3.valid?{g:2,gx:eng.di[2][17],gy:eng.di[2][18]}:null;
const t4=b4.valid?{g:3,gx:eng.di[3][17],gy:eng.di[3][18]}:null;
const cost=(bx,tgts)=>calcCrossFloorChestRouteCost(eng,wpFloor,bx,tgts);
const cases=getWpChestCases(wpPartyIdx,wpSoloIdx);
if(cases.length===1){
if(c2Met){
const a3=cost(cases[0],[t3]),a4=cost(cases[0],[t4]),ab=cost(cases[0],[t3,t4]);
res.astar=minAstar([a3,a4,ab]);
res.astarText=`${fmtStepD(a3)} / ${fmtStepD(a4)} / ${fmtStepD(ab)}`;
}else{
res.astar=cost(cases[0],[t3||t4]);
}
}else if(cases.length===2){
const vals=cases.map(bx=>c2Met?minAstar([cost(bx,[t3]),cost(bx,[t4]),cost(bx,[t3,t4])]):cost(bx,[t3||t4]));
res.astar=minAstar(vals);
res.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
}
return res;
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
const MAXTILE_DIMS=[16,15,14,13,12,11,10];
const MAXTILE_REP_FLOORS=[0,4,8,12];
const MAXTILE_CHEST_VARIANT_FLOORS=[2,3];
const MAXTILE_EDGE_SEED=0x7FFF;
const MAXTILE_EDGE_FLOORS=[1,2,3,5,6,7,9,10,11,13,14,15];
function listMetricSampleFloors(eng,includeChestVariants=false,edgeSeed=MAXTILE_EDGE_SEED){
const floors=MAXTILE_REP_FLOORS.slice();
if(includeChestVariants)floors.push(...MAXTILE_CHEST_VARIANT_FLOORS);
if(eng.MapSeed===edgeSeed)floors.push(...MAXTILE_EDGE_FLOORS);
return[...new Set(floors)];
}
function findFloorMaxChamberArea(eng,f){
const a=getFloorAnomalies(eng,f);
let mx=0;for(const s of a.isolatedRegions)if(s>mx)mx=s;
return mx>=3?mx:null;
}
function countFloorGhostStairs(eng,f){
const c=scanGhostStairs(eng.di[f]);
return c>0?c:null;
}
function collectMetricPerFloor(eng,metricFn,includeChestVariants=false,edgeSeed=MAXTILE_EDGE_SEED){
const out=[],fc=eng.floorCount;
for(const f of listMetricSampleFloors(eng,includeChestVariants,edgeSeed)){
if(f>=fc)continue;
const di=eng.di[f];const W=di[2],H=di[3];
if(W<=0||H<=0||W!==H||!MAXTILE_DIMS.includes(W))continue;
const val=metricFn(eng,f);
if(val!==null&&val!==undefined)out.push({f,val,dim:W+'x'+H});
}
return out;
}
function buildFastestMapHtml(eng,hideFloors,upToFloor){
const fcAll=eng.floorCount;if(fcAll<=0)return null;
const hasLimit=upToFloor>=0;
const limit=hasLimit?Math.min(upToFloor,fcAll):fcAll;
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
const searchYieldStride=needMap=>needMap?250:1000;
function evaluateMapSearchConditions(engine,seed,targetRankKey,conds,searchFilterLoc,searchOnlyWithD,onlyMonExpectedStr){
engine.calculateDetail(true);
if(!checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc))return null;
if(!checkOnlyMonPossible(engine,conds))return null;
if(needsMapGeneration(conds,searchOnlyWithD))engine.createDungeonDetail();
const boxHtml=ChestHtml(engine,conds);
if(boxHtml===null)return null;
const elistResult=checkElistAndD(engine,conds,searchOnlyWithD,onlyMonExpectedStr);
if(!elistResult.match)return null;
const anomResult=checkAnomalies(engine,conds);
if(!anomResult.match)return null;
return{boxHtml,elistResult,anomResult};
}
const SEED_PROCESSORS={
ultimate:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const match=evaluateMapSearchConditions(searchEngine,seed,targetRankKey,conds,
job.searchFilterLoc,job.params.searchOnlyWithD,job._onlyMonExpectedStr);
if(!match)return null;
const{boxHtml,elistResult,anomResult}=match;
const jumpFloor=matchJumpFloor(elistResult,anomResult);
if(job.bySeed)return{seed,rStr,hasD:elistResult.hasMatchedD,jumpFloor,
fc:searchEngine.floorCount,name:dispName(searchEngine),ghost:anomResult.ghost,box:boxHtml,sp:elistResult.specialHitDetails};
const html=buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,
specialHitDetails:elistResult.specialHitDetails,anomalyDetails:anomResult.anomalyDetails});
return{seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor};
},
multibug:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const cond_elist=conds.elist;
const cond_only_mon=conds.onlyMon;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const{requireFloorIncrease,requireBugFloorHit,searchOnlyWithD,effectiveElistCond,isCombinedSearch}=job.params;
searchEngine.multibug_offset=0;
searchEngine.force_16_floors=false;
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
const origFloors=searchEngine.floorCount,origBoss=dispBoss(searchEngine),origName=dispName(searchEngine);
searchEngine.multibug_offset=1;
searchEngine.calculateDetail();
const bugFloors=searchEngine.floorCount,bugBoss=dispBoss(searchEngine),bugName=dispName(searchEngine);
const isFloorIncreased=bugFloors>origFloors;
if(requireFloorIncrease&&!isFloorIncreased)return null;
searchEngine.multibug_offset=0;
searchEngine.force_16_floors=true;
searchEngine.calculateDetail();
try{
let boxHtml="";
if(conds.hasBoxCond){
const actualBoxCounts=[0,0,0,0,0,0,0,0,0,0];
for(let f=2;f<bugFloors;f++){
const d=searchEngine.di[f];
for(let b=0;b<d[8];b++)actualBoxCounts[d[9+b]-1]++;
}
const boxText=matchReqBoxes(actualBoxCounts,conds.reqBox);
if(boxText===null)return null;
boxHtml=`<div style="margin-top:4px;"><span style="color:#fc0;font-size:10px;background:#420;padding:2px 4px;border-radius:3px;">${boxText}</span></div>`;
}
const envType=searchEngine._details[3],baseMR=searchEngine._details[2];
let foundSpecialFloors=[];
let specialHitCount=0;
let hasAnyD=false;
for(let f=4;f<16;f++){
const elistInfo=getFloorElistInfo(searchEngine,f);
if(elistInfo.dValue>0)hasAnyD=true;
let isElistHit=false,isOnlyHit=false;
if(elistInfo.state){
let floorHit=null;
if(!effectiveElistCond||effectiveElistCond==='MULTI_SPECIAL')isElistHit=true;
else{
floorHit=evalElistFloorHit(searchEngine,f,elistInfo,effectiveElistCond);
isElistHit=floorHit.isElistHit;
}
if(isCombinedSearch){
isOnlyHit=isElistHit&&!!floorHit&&getElistMonsterBadge(envType,floorMRAt(baseMR,f),floorHit.targetCount,cond_only_mon).isCombinedHit;
}else isOnlyHit=!cond_only_mon||elistInfo.state.includes(_onlyMonExpectedStr);
}
const isSpecialMatch=isElistHit&&isOnlyHit;
if(isSpecialMatch)specialHitCount++;
if(elistInfo.state||(searchOnlyWithD&&elistInfo.dValue>0)){
foundSpecialFloors.push({
floor:f+1,
isElistHit,
hex:elistInfo.hex,
state:elistInfo.state||EL_NORMAL,
dValue:elistInfo.dValue,
envType,
floorMR:floorMRAt(baseMR,f),
isSpecialMatch
});
}
}
if(requireBugFloorHit){
foundSpecialFloors=foundSpecialFloors.filter(info=>info.floor>origFloors&&info.floor<=bugFloors);
hasAnyD=foundSpecialFloors.some(info=>info.dValue>0);
specialHitCount=foundSpecialFloors.filter(info=>info.state!==EL_NORMAL).length;
if(foundSpecialFloors.length===0)return null;
}
const wantsSpecial=effectiveElistCond||cond_only_mon;
if(searchOnlyWithD&&!hasAnyD)return null;
if(searchOnlyWithD&&wantsSpecial&&effectiveElistCond!=='MULTI_SPECIAL'&&!foundSpecialFloors.some(info=>info.dValue>0&&info.isSpecialMatch))return null;
if(effectiveElistCond==='MULTI_SPECIAL'&&specialHitCount<2)return null;
if(wantsSpecial&&specialHitCount===0)return null;
const lowFloors=Math.min(origFloors,bugFloors);
const elistHtmlStr=foundSpecialFloors.map(info=>{
const stateColor=info.state===EL_NORMAL?"#888"
:info.floor<=lowFloors?"#4f4":info.floor<=origFloors?"#00a2e8":info.floor<=bugFloors?"#fa0":"#f7f";
let line=`<span style="color:#0ff;font-size:12px;">B${info.floor}F: [${info.hex}] <strong style="color:${stateColor};">${info.state}</strong>${makeDBadge(info.dValue)}</span>`;
const cls=classifyElistState(info.state);
const surviveCount=cls.kind==='reduced'?cls.count:0;
if(surviveCount>0&&(cond_elist===surviveCount.toString()||isCombinedSearch||(cond_elist==='SIZE_15'&&info.isElistHit))){
line+=getElistMonsterBadge(info.envType,info.floorMR,surviveCount,null).badge;
}
return line;
}).join('<br>');
const cachedLocData=peekLocDataCached(seed,targetRankKey);
const locHtml=cachedLocData?LocaHtmlFromData(cachedLocData,conds):"";
const bugIcon=isFloorIncreased?'📈':'';
let fastHtml='',fastCost;
if(job.params.fastFloor){
const hit=foundSpecialFloors.find(info=>info.isSpecialMatch);
if(!hit)return null;
const fastRes=buildFastestMapHtml(searchEngine,!job.params.fastFloor.showFloors,hit.floor-1);
if(fastRes===null)return null;
fastHtml=fastRes.html;
fastCost=fastRes.cost;
}
const html=`${seedTagHtml(seed,15)}${rankTagHtml(rStr)}<br>
<div style="background:#111;padding:4px 8px;border-radius:4px;margin:4px 0;border:1px solid #333;">
<span style="color:#aaa;font-size:11px">[Source] ${origName} | B${origFloors}F | ${origBoss}</span><br>
<span style="color:#f8f;font-size:11px">[Bug] ${bugName} | B${bugFloors}F | ${bugBoss} ${bugIcon}</span>
</div>${locHtml}${boxHtml}<div style="padding-top:2px;">${elistHtmlStr}</div>${fastHtml}`;
return fastCost===undefined?{seed,rStr,html,hasD:hasAnyD}:{seed,rStr,html,hasD:hasAnyD,sortCost:fastCost};
}finally{searchEngine.force_16_floors=false;}
},
item:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const p=job.params;
searchEngine.calculateDetail(true);
const basicReq=ITEM_BASIC_REQS[p.checker];
if(basicReq&&!basicReq(searchEngine,p,conds))return null;
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
searchEngine.createDungeonDetail();
const boxHtml=ChestHtml(searchEngine,conds);
if(boxHtml===null)return null;
const hitResult=DUNGEON_CHECKERS[p.checker](searchEngine,p);
if(!hitResult||!hitResult.isHit)return null;
const locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const mapNameDisp=dispName(searchEngine);
const astarSpan=(text,attr='')=>` <span${attr} style="color:#ffc90e;font-size:11px;font-family:monospace;">${text}</span>`;
const buildHtml=(astarHtml,displayHtml)=>`${seedTagHtml(seed)}${rankTagHtml(rStr)}${astarHtml}<br>
<span style="color:#0ff;font-size:11px;margin-bottom:2px;display:inline-block;">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div><div style="margin-top:4px;">${displayHtml}</div>`;
if(hitResult.multi){
return hitResult.multi.map((row)=>({seed,rStr,html:buildHtml(astarSpan(row.astarText!==undefined?row.astarText:fmtStepD(row.astar)),row.displayHtml),jumpFloor:row.floor,specialStyle:'',title:''+J01,sortCost:row.astar==null?1e9:row.astar,isB10:row.isB10,isJfireB10:!!row.isJfireB10,isX3:!!row.isX3}));
}
const astarHtml=hitResult.astarText!==undefined
?astarSpan(hitResult.astarText,hitResult.astarTitle?` title="${hitResult.astarTitle}"`:'')
:(hitResult.astar!==undefined?astarSpan(fmtStepD(hitResult.astar)):'');
const ret={seed,rStr,html:buildHtml(astarHtml,hitResult.displayHtml),jumpFloor:hitResult.jumpFloor||0,specialStyle:hitResult.specialStyle||'',title:''+J01};
if(hitResult.astar!==undefined)ret.sortCost=hitResult.astar==null?1e9:hitResult.astar;
if(hitResult.astarX3)ret.isX3=true;
return ret;
},
fastest:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const params=job.params;
const benchmarkMode=!!params.benchmarkMode;
const _fastMode=params.fastestMode;
searchEngine.calculateDetail(true);
if(_fastMode!=='maxtile'&&!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
if(!benchmarkMode&&_fastMode==='map'&&!params.slowest&&searchEngine._details[0]===12&&parseInt(conds.boss)!==12)return null;
if(_fastMode!=='maxtile'&&!checkOnlyMonPossible(searchEngine,conds))return null;
searchEngine.createDungeonDetail();
if(_fastMode==='maxtile'){
const _metric=params.metricType||'maxtile';
const _edgeSeed=(params.metricEdgeSeed===undefined)?job.endSeed:params.metricEdgeSeed;
const metricFn=_metric==='maxiso'?findFloorMaxChamberArea:_metric==='maxghost'?countFloorGhostStairs
:_metric==='maxwalk'?calcFloorWalkCost:countFloorTiles;
const showDim=_metric==='maxiso'||_metric==='maxghost';
const rows=collectMetricPerFloor(searchEngine,metricFn,_metric!=='maxghost',_edgeSeed);
const results=rows.map(r=>{
const valHtml=_metric==='maxwalk'?fmtStep(r.val):r.val;
let at='';
if(_metric==='maxghost'){const gs=[];scanGhostStairs(searchEngine.di[r.f],gs);at=`<br>${ghostLineHtml(r.f,gs.join(', '))}`;}
const cardHtml=`${seedTagHtml(seed)}<br>`
+`<span style="color:#ffc90e;font-weight:bold;font-size:13px">${valHtml}</span> `
+`<span style="color:#9ab;font-size:11px">B${r.f+1}F</span>`
+(showDim?` <span style="color:#678;font-size:10px">${r.dim}</span>`:'')+at;
return{seed,rStr:'DD',html:cardHtml,jumpFloor:r.f,sortCost:r.val,fc:searchEngine.floorCount,_dimLabel:r.dim};
});
return results.length>0?results:null;
}
const boxHtml=ChestHtml(searchEngine,conds);
if(boxHtml===null)return null;
const elistResult=checkElistAndD(searchEngine,conds,params.searchOnlyWithD,job._onlyMonExpectedStr);
if(!elistResult.match)return null;
const anomResult=checkAnomalies(searchEngine,conds);
if(!anomResult.match)return null;
let jumpToFloor=matchJumpFloor(elistResult,anomResult);
let upToFloor=-1;
if(!benchmarkMode&&_fastMode!=='map'){
if((conds.elist||conds.onlyMon)&&elistResult.jumpToFloor!==-1){
upToFloor=elistResult.jumpToFloor;
}else if(_fastMode==='floor'&&conds.depth2){
const _d2=parseInt(conds.depth2);
if(searchEngine.floorCount<_d2)return null;
upToFloor=_d2;
if(jumpToFloor===-1)jumpToFloor=_d2-1;
}
}
const fastestRes=benchmarkMode?buildFastestMapHtml(searchEngine,false,-1):buildFastestMapHtml(searchEngine,!params.showFloors,upToFloor);
if(fastestRes===null)return null;
const html=buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,specialHitDetails:elistResult.specialHitDetails,anomalyDetails:anomResult.anomalyDetails,mid:fastestRes.html});
return{seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor:jumpToFloor,sortCost:fastestRes.cost,fc:searchEngine.floorCount};
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
const totalCombos=job.ranks.length*(job.endSeed-job.startSeed+1);
let processed=0,hitCount=0;
const searchEngine=new GrottoDetail();
const entry=getProcessorEntry(job.processor);
if(!entry)throw new Error('unknown processor: '+job.processor);
const proc=entry.proc;
if(entry.setup)entry.setup(searchEngine,job);
const yieldStride=searchYieldStride(job.processor!=='ultimate'
||needsMapGeneration(job.conds,job.params&&job.params.searchOnlyWithD));
const allRanks=job.allRanks||job.ranks;
const tagOrder=!!job.tagOrder;
let rankOrder;
const tag=(it,rank,seed,k)=>{
if(tagOrder){
if(!rankOrder){
rankOrder=new Map();
for(let i=0;i<allRanks.length;i++){
const value=allRanks[i];
if(i in allRanks&&value===value&&!rankOrder.has(value))rankOrder.set(value,i);
}
}
const order=rankOrder.get(rank);
it._ord=((order===undefined?-1:order)*0x10000+seed)*4096+k;
}
return it;
};
const runSeed=(rank,rStr,targetRankKey,seed,list)=>{
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
const item=proc(searchEngine,seed,rStr,targetRankKey,job);
if(item){
hitCount++;
if(Array.isArray(item))item.forEach((it,k)=>list.push(tag(it,rank,seed,k)));
else list.push(tag(item,rank,seed,0));
}
processed++;
};
if(job.seedMajor||job.bySeed){
const rankInfo=rankInfoList(job.ranks);
const byRank=rankInfo.map(()=>[]),bySeed=!!job.bySeed;
const seedStride=Math.max(1,Math.round(yieldStride/rankInfo.length));
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(seed%seedStride===0){
io.progress({processed,total:totalCombos,hits:hitCount,seedHex:hex4(seed)});
if(bySeed&&byRank[0].length>0){io.batch(byRank[0]);byRank[0]=[];}
await io.yield();
}
for(let ri=0;ri<rankInfo.length;ri++){
const{rank,rStr,targetRankKey}=rankInfo[ri];
runSeed(rank,rStr,targetRankKey,seed,byRank[bySeed?0:ri]);
}
}
for(const list of byRank)if(list.length>0)io.batch(list);
return hitCount;
}
let batch=[];
for(const rank of job.ranks){
if(io.cancelled())break;
const rStr=hex2(rank),targetRankKey=resolveRankKey(rStr,rank);
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(seed%yieldStride===0){
io.progress({processed,total:totalCombos,hits:hitCount,rStr,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
runSeed(rank,rStr,targetRankKey,seed,batch);
}
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
async function coreRunATMonsterJob(job,io){
const conds=job.conds;
const{N,atmin,atmax,deftMax,pType,atThreshold,atMaxSteps,searchOnlyWithD,searchFilterLoc}=job;
const userDeft=job.userDeft==null?DEFAULT_USER_DEFT:job.userDeft;
const atMchSeeds=new Map();
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if((seed&8191)===0){if(io.cancelled())return 0;await io.yield();}
const pair=getATPair(seed,N);
if(pair.atN<atmin||pair.atN>atmax)continue;
if(deftMax>=0&&calcDeftness(pair.atN1)>deftMax)continue;
atMchSeeds.set(seed,pair);
}
const atPtnOffsets=new Map();
if(pType>0){
let scanned=0;
for(const[seed,pair]of atMchSeeds){
if((++scanned&255)===0){if(io.cancelled())return 0;await io.yield();}
const frame=battleATContext(N,calcDeftness(pair.atN1),userDeft);
const{foundOffsets}=scanSeedForAtPattern(seed,atMaxSteps,atThreshold,pType,frame.firstUnused[0]);
if(foundOffsets.length>0)atPtnOffsets.set(seed,foundOffsets);
else atMchSeeds.delete(seed);
}
}
const yieldStride=searchYieldStride(needsMapGeneration(conds,searchOnlyWithD));
const searchEngine=new GrottoDetail();
SEED_SETUP.ultimate(searchEngine,job);
const rankInfo=rankInfoList(job.ranks);
const totalCombos=atMchSeeds.size*rankInfo.length;
let processed=0,hitCount=0,batch=[],tailSeed=-1,tail='';
seeds:for(const[seed,atinfo]of atMchSeeds)for(const{rank,rStr,targetRankKey}of rankInfo){
if(io.cancelled())break seeds;
if(processed%yieldStride===0){
io.progress({processed,total:totalCombos,hits:hitCount});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
processed++;
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
const match=evaluateMapSearchConditions(searchEngine,seed,targetRankKey,conds,
searchFilterLoc,searchOnlyWithD,job._onlyMonExpectedStr);
if(!match)continue;
const{boxHtml,elistResult,anomResult}=match;
hitCount++;
if(tailSeed!==seed){
tailSeed=seed;
const offsets=atPtnOffsets.get(seed);
let diffsHtml='',patHtml='';
if(offsets){
patHtml=buildAtPatternBoxHtml(job.patternName,job.probText,buildAtOffsetsHtml(offsets));
diffsHtml=buildBattleAtDiffsHtml(offsets,N,calcDeftness(atinfo.atN1),userDeft);
}
tail=buildAtInfoCardHtml(seed,N,atinfo.atN,atinfo.atN1,diffsHtml)+patHtml;
}
const html=buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,
specialHitDetails:elistResult.specialHitDetails,anomalyDetails:anomResult.anomalyDetails,tail});
batch.push({seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor:matchJumpFloor(elistResult,anomResult),pop:atinfo.atN});
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
async function coreRunATPatternJob(job,io){
const totalSeeds=job.endSeed-job.startSeed+1,N=job.POPIndex;
const userDeft=job.userDeft==null?DEFAULT_USER_DEFT:job.userDeft;
let hitCount=0,processed=0,batch=[];
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(job.searchFilterLoc&&calcLocations(seed,job.targetRankKey).outputOrder.length===0){processed++;continue;}
if(processed%1000===0){
io.progress({processed,total:totalSeeds,hits:hitCount,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
processed++;
const{atN,atN1}=getATPair(seed,N),deft=calcDeftness(atN1);
const{foundOffsets}=scanSeedForAtPattern(seed,job.maxSteps,job.threshold,job.pType,battleATContext(N,deft,userDeft).firstUnused[0]);
if(foundOffsets.length===0)continue;
hitCount++;
const html=`${seedTagHtml(seed,13)}<br>
${buildAtPatternBoxHtml(job.patternName,job.probText,buildAtOffsetsHtml(foundOffsets))}
${buildAtInfoCardHtml(seed,N,atN,atN1,buildBattleAtDiffsHtml(foundOffsets,N,deft,userDeft))}
`;
batch.push({seed,rStr:null,html,pop:atN});
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
function getCoreSearchRunner(kind){
if(kind==='scan')return coreRunScanJob;
if(kind==='atMonster')return coreRunATMonsterJob;
if(kind==='atPattern')return coreRunATPatternJob;
return()=>0;
}
const SKILL_DB=[
{id:9,cat:"skill",weapon:"Minstrel",jp:"火ふき芸",en:"Hot Lick",target:"S",at:[128,0],miss:120,ev:0,blk:0,el:5,metal:0,dmg:{s:3,b:20}},
{id:10,cat:"skill",weapon:"Hammer",jp:"ビッグバン",en:"Big Banga",target:"A",at:[74,0],miss:74,ev:0,blk:1,el:10,metal:0,dmg:{s:60,b:300},hiden:1},
{id:11,cat:"spell",jp:"ドルマドン",en:"Kazammle",target:"S",at:[67,0],miss:59,ev:0,blk:1,el:10,metal:0,cls:[10],dmg:{s:30,b:285,m:615,st:"might",lo:480,hi:999}},
{id:12,cat:"spell",jp:"メラガイアー",en:"Kafrizzle",target:"S",at:[55,0],miss:41,ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:23,b:292,m:600,st:"might",lo:480,hi:999}},
{id:33,cat:"spell",jp:"バギムーチョ",en:"Kaswooshle",target:"G",at:[46,1],ev:0,blk:0,el:7,metal:0,cls:[11],dmg:{s:50,b:200,m:500,st:"might",lo:550,hi:999}},
{id:26,cat:"skill",weapon:"Boomerang",jp:"ギガスロー",en:"Gigathrow",target:"S",at:[39,0],miss:29,ev:1,blk:1,el:8,metal:0,hiden:1},
{id:24,cat:"skill",weapon:"Whip",jp:"双竜打ち (単体)",en:"Twin Dragon Lash (Single)",target:"S",at:[30,12],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:2,max:2},mul:1.25,aimGroup:n=>n===1},
{id:31,cat:"spell",jp:"マヒャド",en:"Kacrack",target:"A",at:[29,1],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:12,b:92,m:216,st:"might",lo:200,hi:999}},
{id:25,cat:"skill",weapon:"Whip",jp:"地這い大蛇",en:"Serpent's Bite",target:"G",at:[29,1],ev:1,blk:1,el:9,metal:0,hiden:1,mul:2},
{id:27,cat:"skill",weapon:"Hammer",jp:"ランドインパクト",en:"Crackerwhack",target:"A",at:[29,1],ev:0,blk:1,el:9,metal:0,dmg:{s:15,b:175}},
{id:28,cat:"skill",weapon:"Bow",jp:"シャイニングボウ",en:"Shining Shot",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:5,b:150},hiden:1},
{id:42,cat:"skill",weapon:"Boomerang",jp:"シャインスコール",en:"Starburst Throw",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:10,b:105}},
{id:43,cat:"spell",jp:"イオグランデ",en:"Kaboomle",target:"A",at:[29,1],ev:0,blk:0,el:8,metal:0,cls:[10],dmg:{s:10,b:210,m:480,st:"might",lo:550,hi:999}},
{id:44,cat:"item",jp:"ばくだん石",en:"Rockbomb shard",target:"A",at:[29,1],ev:0,blk:0,el:0,metal:0,dmg:{s:5,b:25}},
{id:40,cat:"item",jp:"マグマの杖",en:"Magma Staff",target:"A",at:[28,1],miss:20,ev:0,blk:0,el:8,metal:0,dmg:{s:5,b:25}},
{id:21,cat:"skill",weapon:"Sword",jp:"ギガブレイク",en:"Gigagash",target:"G",at:[23,1],miss:0,ev:0,blk:1,el:11,metal:0,dmg:{s:75,b:260,m:520,st:"str+might",lo:500,hi:1998},hiden:1},
{id:23,cat:"skill",weapon:"Whip",jp:"らせん打ち",en:"Hypnowhip",target:"S",at:[22,0],miss:14,ev:1,blk:1,el:0,metal:0},
{id:22,cat:"skill",weapon:"Spear",jp:"ジゴスパーク",en:"Lightning Storm",target:"A",at:[20,1],ev:0,blk:1,antiBlk:false,el:8,metal:0,dmg:{s:15,b:205,m:405,st:"str+might",lo:500,hi:1998},hiden:1},
{id:45,cat:"skill",weapon:"Fisticuffs",jp:"ばくれつけん",en:"Multifists",target:"RA",at:[20,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{id:46,cat:"skill",weapon:"Fisticuffs",jp:"岩石おとし",en:"Boulder Toss",target:"A",at:[20,1],ev:1,blk:1,el:9,metal:0,dmg:{s:10,b:110,m:300,st:"str+deft",lo:500,hi:1998}},
{id:30,cat:"spell",jp:"マヒャデドス",en:"Kacrackle",target:"A",at:[17,1],ev:0,blk:0,el:6,metal:0,cls:[2],dmg:{s:20,b:185,m:510,st:"might",lo:550,hi:999}},
{id:47,cat:"spell",jp:"バギクロス",en:"Kaswoosh",target:"G",at:[17,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:50,b:130,m:205,st:"might",lo:200,hi:999}},
{id:48,cat:"skill",weapon:"Spear",jp:"一閃づき",en:"Thunder Thrust",target:"S",at:[14,0],miss:0,ev:1,blk:1,el:0,metal:0},
{id:35,cat:"skill",weapon:"Whip",jp:"愛のムチ",en:"Lashings of Love",target:"G",at:[14,5],ev:1,blk:1,el:0,metal:0,tmul:{12:1.5}},
{id:36,cat:"skill",weapon:"Claws",jp:"ゴッドスマッシュ",en:"Hand of God",target:"S",at:[14,0],ev:0,blk:1,el:11,metal:0,dmg:{s:40,b:220,m:440,st:"str",lo:300,hi:999},hiden:1},
{id:37,cat:"skill",weapon:"Fan",jp:"波紋演舞",en:"Water Slaughterer",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{10:1.5}},
{id:49,cat:"skill",weapon:"Axe",jp:"たいぼく斬",en:"Poplar Toppler",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{4:1.5}},
{id:50,cat:"skill",weapon:"Axe",jp:"蒼天魔斬",en:"Parallax",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,mul:1.25},
{id:38,cat:"skill",weapon:"Axe",jp:"オノむそう",en:"Axes of Evil",target:"G",at:[14,4],ev:1,blk:1,el:0,metal:0},
{id:15,cat:"skill",weapon:"Axe",jp:"森羅万象斬",en:"Whopper Chop",target:"S",at:[14,0],ev:0,blk:1,el:0,metal:0,dmg:{s:20,b:200,m:480,st:"str",lo:250,hi:600},hiden:1},
{id:51,cat:"skill",weapon:"Bow",jp:"さみだれうち",en:"Rain of Pain",target:"RA",at:[14,10],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{id:52,cat:"skill",weapon:"Fisticuffs",jp:"せいけんづき",en:"Knuckle Sandwich",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{id:4,cat:"skill",weapon:"Gladiator",jp:"とうこん討ち",en:"Clap Trap",target:"S",at:[14,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.2},
{id:5,cat:"skill",weapon:"Gladiator",jp:"とうこん討ち(毒針)",baseSkillId:4,en:"Clap Trap (Poison Needle)",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,equip:"どくばり"},
{id:29,cat:"skill",weapon:"Paladin",jp:"グランドネビュラ",en:"Solar Flair",target:"G",at:[14,1],ev:0,blk:1,el:11,metal:0,dmg:{s:15,b:195,m:390,st:"mending",lo:200,hi:849},hiden:1},
{id:53,cat:"spell",jp:"ドルモーア",en:"Kazam",target:"S",at:[14,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:30,b:150,m:345,st:"might",lo:225,hi:999}},
{id:54,cat:"spell",jp:"バギマ",en:"Swoosh",target:"G",at:[14,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:15,b:40,m:138,st:"might",lo:100,hi:999}},
{id:13,cat:"spell",jp:"メラゾーマ",en:"Kafrizz",target:"S",at:[11,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:12,b:190,m:319,st:"might",lo:220,hi:999}},
{id:55,cat:"spell",jp:"バギ",en:"Woosh",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:8,b:16,m:69,st:"might",lo:50,hi:999}},
{id:16,cat:"item",jp:"さばきの杖",en:"Staff of Sentencing",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:8,b:16}},
{id:56,cat:"item",jp:"れっぷうのおうぎ",en:"Foehn Fan",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:8,b:16}},
{id:1,cat:"skill",weapon:"Other",jp:"攻撃",en:"Attack",target:"S",at:[8,8],miss:0,ev:1,blk:1,el:0,metal:0,fh:2},
{id:3,cat:"skill",weapon:"Other",jp:"攻撃(毒針)",baseSkillId:1,en:"Attack (Poison Needle)",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,equip:"どくばり"},
{id:57,cat:"skill",weapon:"Whip",jp:"攻撃(ｸﾞﾙｰﾌﾟ)",en:"Attack(Group)",target:"G",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{id:2,cat:"skill",weapon:"Boomerang",jp:"攻撃(全体)",en:"Attack(All)",target:"A",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{id:58,cat:"skill",weapon:"Sword",jp:"ドラゴン斬り",en:"Dragon Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,tmul:{1:1.5}},
{id:7,cat:"skill",weapon:"Sword",jp:"メタル斬り",en:"Metal Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:1,fh:2},
{id:6,cat:"skill",weapon:"Sword",jp:"はやぶさ斬り",en:"Falcon Slash",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,fh:4,mul:0.75},
{id:59,cat:"skill",weapon:"Sword",jp:"ギガスラッシュ",en:"Gigaslash",target:"G",at:[8,4],ev:0,blk:1,el:11,metal:0,dmg:{s:20,b:160,m:360,st:"str+might",lo:500,hi:1998}},
{id:8,cat:"skill",weapon:"Spear",jp:"しっぷうづき",en:"Mercurial Thrust",target:"S",at:[8,0],pri:2,ev:1,blk:1,el:0,metal:0},
{id:60,cat:"skill",weapon:"Spear",jp:"けものづき",en:"Cattle Prod",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{2:1.5}},
{id:61,cat:"skill",weapon:"Knife",jp:"キラーブーン",en:"Fly Swat",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2,tmul:{5:1.5}},
{id:62,cat:"skill",weapon:"Wand",jp:"悪魔ばらい",en:"Beelzefreeze",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{id:63,cat:"skill",weapon:"Staff",jp:"黄泉送り",en:"Deliverance",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{7:1.5}},
{id:64,cat:"skill",weapon:"Claws",jp:"ウィングブロウ",en:"Propeller Blade",target:"S",at:[8,8],ev:1,blk:1,el:7,metal:0,hit:2},
{id:65,cat:"skill",weapon:"Claws",jp:"裂鋼拳",en:"Can Opener",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{6:1.5}},
{id:66,cat:"skill",weapon:"Claws",jp:"タイガークロー",en:"Hardclaw",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,mul:0.75},
{id:67,cat:"skill",weapon:"Hammer",jp:"ドラムクラッシュ",en:"Monster Masher",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{11:1.5}},
{id:68,cat:"skill",weapon:"Bow",jp:"バードシュート",en:"Flutter Disaster",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{3:1.5}},
{id:69,cat:"skill",weapon:"Boomerang",jp:"クロスカッター",en:"Crosscutter Throw",target:"A",at:[8,4],ev:1,blk:1,el:0,metal:0,mul:0.75},
{id:39,cat:"skill",weapon:"Boomerang",jp:"パワフルスロー",en:"Power Throw",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,mul:0.75},
{id:70,cat:"skill",weapon:"Boomerang",jp:"スライムブロウ",en:"Ooze Bruiser",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,tmul:{0:1.5}},
{id:71,cat:"skill",weapon:"Boomerang",jp:"バーニングバード",en:"Firebird Throw",target:"RA",at:[8,8],ev:1,blk:1,el:5,metal:0,hitRange:{normalMin:7,max:7},mul:0.3},
{id:72,cat:"skill",weapon:"Boomerang",jp:"メタルウィング",en:"Metalicker",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:1},
{id:73,cat:"skill",weapon:"Fisticuffs",jp:"石つぶて",en:"Stone's Throw",target:"G",at:[8,8],ev:1,blk:1,el:9,metal:0,dmg:{s:7,b:17}},
{id:74,cat:"skill",weapon:"Fisticuffs",jp:"かまいたち",en:"Wind Sickles",target:"G",at:[8,5],ev:1,blk:1,el:0,metal:0},
{id:75,cat:"skill",weapon:"Gladiator",jp:"もろば斬り",en:"Double-Edged Slash",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,mul:1.5},
{id:34,cat:"skill",weapon:"Gladiator",jp:"無心こうげき",en:"Blind Man's Biff",target:"RS",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.5},
{id:41,cat:"skill",weapon:"Luminary",jp:"バックダンサー呼び",en:"Disco Stew",target:"A",at:[8,1],ev:1,blk:1,el:0,metal:0,dmg:{s:25,b:210}},
{id:14,cat:"spell",jp:"メラ",en:"Frizz",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:2,b:14,m:99,st:"might",lo:50,hi:999}},
{id:76,cat:"spell",jp:"メラミ",en:"Frizzle",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:10,b:80,m:199,st:"might",lo:100,hi:999}},
{id:77,cat:"spell",jp:"ヒャド",en:"Crack",target:"S",at:[8,0],ev:0,blk:1,el:6,metal:0,cls:[2,5],dmg:{s:5,b:30,m:119,st:"might",lo:50,hi:999}},
{id:32,cat:"spell",jp:"ヒャダルコ",en:"Crackle",target:"G",at:[8,8],ev:0,blk:1,el:6,metal:0,cls:[2,5],dmg:{s:8,b:50,m:150,st:"might",lo:100,hi:999}},
{id:78,cat:"spell",jp:"ドルマ",en:"Zam",target:"S",at:[8,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:8,b:24,m:139,st:"might",lo:62,hi:999}},
{id:79,cat:"spell",jp:"ドルクマ",en:"Zammle",target:"S",at:[8,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:15,b:65,m:228,st:"might",lo:125,hi:999}},
{id:80,cat:"item",jp:"はじゃのつるぎ",en:"Cautery Sword",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:2,b:8}},
{id:81,cat:"item",jp:"ひかりのつるぎ",en:"Aurora Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:2,b:8}},
{id:82,cat:"item",jp:"ほのおのつるぎ",en:"Fire Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:83,cat:"item",jp:"インフェルノソード",en:"Inferno Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:84,cat:"item",jp:"こおりのやいば",en:"Icicle Dirk",target:"G",at:[8,8],ev:0,blk:0,el:6,metal:0,dmg:{s:5,b:30}},
{id:85,cat:"item",jp:"フェンリルのキバ",en:"Fenrir Fang",target:"G",at:[8,8],ev:0,blk:0,el:6,metal:0,dmg:{s:5,b:30}},
{id:86,cat:"item",jp:"まどうしの杖",en:"Wizard's Staff",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,dmg:{s:2,b:14}},
{id:87,cat:"item",jp:"ドラゴンの杖",en:"Wyrmwand",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:88,cat:"item",jp:"ほのおのツメ",en:"Fire Claws",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:89,cat:"item",jp:"しゃくねつのツメ",en:"Combusticlaws",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:17,cat:"skill",weapon:"Staff",jp:"なぎはらい",en:"Party Pooper",target:"G",at:[6,6],ev:1,blk:1,el:0,metal:0},
{id:19,cat:"skill",weapon:"Ranger",jp:"みのがす",en:"Mercy",target:"A",at:[0,0],miss:0,ev:0,blk:0,el:12,metal:0},
{id:18,cat:"spell",jp:"ザラキーマ",en:"Kathwack",target:"A",at:[0,0],ev:0,blk:0,el:12,metal:0,cls:[1]},
{id:90,cat:"skill",weapon:"Armamentalist",jp:"ファイアフォース",en:"Fire Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[5]},
{id:91,cat:"skill",weapon:"Armamentalist",jp:"アイスフォース",en:"Frost Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[6]},
{id:92,cat:"skill",weapon:"Armamentalist",jp:"ストームフォース",en:"Gale Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[7,8]},
{id:93,cat:"skill",weapon:"Armamentalist",jp:"ダークフォース",en:"Funereal Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[9,10]},
{id:94,cat:"skill",weapon:"Armamentalist",jp:"ライトフォース",en:"Life Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[11]},
{id:20,cat:"skill",weapon:"Other",jp:"おうえん",en:"Egg On",target:"O",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0,hiden:1},
{id:95,cat:"skill",weapon:"Other",jp:"ためる",en:"Psyche Up",target:"U",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0}
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
const WEAPON_CAT_META={
"Sword":{"skl_a":60,"wmul":{"1":1.1}},
"Spear":{"skl_a":60,"wmul":{"2":1.1}},
"Bow":{"skl_a":60,"wmul":{"3":1.1}},
"Axe":{"skl_a":60,"wmul":{"4":1.1}},
"Knife":{"skl_a":60,"wmul":{"5":1.1}},
"Claws":{"skl_a":60,"wmul":{"6":1.1}},
"Staff":{"skl_a":60,"wmul":{"7":1.1}},
"Wand":{"skl_a":0,"wmul":{"8":1.1}},
"Fan":{"skl_a":60,"wmul":{"10":1.1}},
"Hammer":{"skl_a":60,"wmul":{"11":1.1}},
"Whip":{"skl_a":60,"wmul":{"12":1.1}},
"Boomerang":{"skl_a":60}
};
const WEAPON_META={
"はやぶさの剣":{"cat":"Sword","en":"Falcon blade","falcon":true,"a":26,"note":"⚔"},
"メタスラの剣":{"cat":"Sword","en":"Metal slime sword","metal":1,"a":110,"note":"🗡"},
"メタスラのやり":{"cat":"Spear","en":"Metal slime spear","metal":1,"a":115,"note":"🗡"},
"風林火山":{"cat":"Fan","en":"Attribeauty","metal":1,"antiBlk":true,"pri":1,"a":123,"note":"🌀"},
"きしんのまそう":{"cat":"Spear","en":"Poker","antiBlk":true,"a":144,"note":"🔱"},
"キラーピアス":{"cat":"Knife","en":"Falcon knife earrings","falcon":true,"a":1,"note":"💍","needDeath0":true},
"どくばり":{"cat":"Knife","en":"Poison needle","fixedDmg":1,"hits":1,"note":"🪡","needDeath0":true},
"剣":{"cat":"Sword","generic":true,"a":180},
"ヤリ":{"cat":"Spear","generic":true,"a":176},
"弓":{"cat":"Bow","generic":true,"a":178},
"オノ":{"cat":"Axe","generic":true,"a":178},
"短剣":{"cat":"Knife","generic":true,"a":155},
"ツメ":{"cat":"Claws","generic":true,"a":173},
"棍":{"cat":"Staff","generic":true,"a":170},
"杖":{"cat":"Wand","generic":true,"a":98},
"扇":{"cat":"Fan","generic":true,"a":164},
"ハンマー":{"cat":"Hammer","generic":true,"a":174},
"ムチ":{"cat":"Whip","generic":true,"a":140},
"ブーメラン":{"a":138,"cat":"Boomerang","generic":true},
"ドラゴンキラー":{"a":73,"cat":"Sword","wmul":{"1":1.2}},
"ホーリーランス":{"a":39,"cat":"Spear","wmul":{"7":1.2}},
"バトルフォーク":{"a":47,"cat":"Spear","wmul":{"10":1.2}},
"聖なるナイフ":{"a":18,"cat":"Knife","wmul":{"7":1.2}},
"バタフライダガー":{"a":38,"cat":"Knife","wmul":{"5":1.2}},
"うみなりの杖":{"a":25,"cat":"Wand","wmul":{"10":1.2}},
"女王のムチ":{"a":80,"cat":"Whip","wmul":{"12":1.2}},
"しゅらのこん":{"a":142,"cat":"Staff","wmul":{"9":1.2}},
"まよけのツメ":{"a":43,"cat":"Claws","wmul":{"9":1.2}},
"ドリルナックル":{"a":61,"cat":"Claws","wmul":{"6":1.2}},
"まじゅうのツメ":{"a":114,"cat":"Claws","wmul":{"2":1.2}},
"竜王のツメ":{"a":143,"cat":"Claws","wmul":{"1":1.2}},
"たつじんのオノ":{"a":87,"cat":"Axe","wmul":{"4":1.2}},
"ふんさいのおおなた":{"a":134,"cat":"Axe","wmul":{"11":1.2}},
"きょだいスパナ":{"a":64,"cat":"Hammer","wmul":{"6":1.2}},
"きょじんのハンマー":{"a":109,"cat":"Hammer","wmul":{"11":1.2}},
"ペンタグラム":{"a":89,"cat":"Boomerang","wmul":{"8":1.2}},
"かりうどの弓":{"a":70,"cat":"Bow","wmul":{"3":1.2}},
"天使の弓":{"a":142,"cat":"Bow","wmul":{"8":1.2}},
"最小攻撃力":{"a":3}
};
const SOLVER_WEAPON_INFO=Object.fromEntries(Object.entries(WEAPON_META).map(([eq,wm])=>{
const cat=WEAPON_CAT_META[wm.cat],info={cat:wm.cat,wmul:wm.wmul,types:Object.assign({},cat&&cat.wmul)};
for(const type in wm.wmul)info.types[type]=Math.max(info.types[type]||1,wm.wmul[type]);
for(const key of['antiBlk','falcon','fixedDmg','metal','pri','en'])info[key]=wm[key]===undefined&&cat?cat[key]:wm[key];
if(info.en===undefined&&wm.generic)info.en=wm.cat;
info.bonus=cat&&wm.a+cat.skl_a;
info.ready=!!wm.cat&&(info.fixedDmg?Number.isInteger(info.fixedDmg)&&info.fixedDmg>0&&Number.isInteger(wm.hits)&&wm.hits>0:!!cat&&Number.isInteger(wm.a)&&wm.a>=0&&Number.isInteger(cat.skl_a)&&cat.skl_a>=0&&info.bonus>=WEAPON_META['最小攻撃力'].a);
return[eq,info];
}));
const SOLVER_ENTRIES=[
{jp:'攻撃'},
{jp:'攻撃(全体)'},
{jp:'攻撃(毒針)',needle:true},
{jp:'とうこん討ち'},
{jp:'とうこん討ち(毒針)',needle:true},
{jp:'はやぶさ斬り'},
{jp:'メタル斬り'},
{jp:'しっぷうづき'},
{jp:'火ふき芸'},
{jp:'ビッグバン'},
{jp:'ドルマドン'},
{jp:'メラガイアー'},
{jp:'メラゾーマ'},
{jp:'メラ'},
{jp:'森羅万象斬'},
{jp:'さばきの杖'},
{jp:'なぎはらい'},
{jp:'ザラキーマ'},
{jp:'みのがす'},
{jp:'おうえん'},
{jp:'ギガブレイク'},
{jp:'ジゴスパーク'},
{jp:'らせん打ち'},
{jp:'双竜打ち',alias:'双竜打ち (単体)'},
{jp:'地這い大蛇'},
{jp:'ギガスロー'},
{jp:'ランドインパクト'},
{jp:'シャイニングボウ'},
{jp:'グランドネビュラ'},
{jp:'マヒャデドス'},
{jp:'マヒャド'},
{jp:'ヒャダルコ'},
{jp:'イオグランデ'},
{jp:'バギムーチョ'},
{jp:'無心こうげき'},
{jp:'愛のムチ'},
{jp:'ゴッドスマッシュ'},
{jp:'波紋演舞'},
{jp:'オノむそう'},
{jp:'パワフルスロー'},
{jp:'マグマの杖'},
{jp:'バックダンサー呼び'},
];
const TENSION=[
{eggs:1,lv:5,mul:1.5},
{eggs:2,lv:20,mul:2.5},
{eggs:3,lv:50,mul:4.0},
];
function getTensionTier(eggs){return TENSION[Math.max(1,Math.min(eggs,TENSION.length))-1];}
function tensionStage(mul){for(let i=TENSION.length-1;i>=0;i--)if(i?mul>=TENSION[i].mul:mul>1)return TENSION[i].eggs;return 0;}
function tensionFlat(mul,lv){return tensionStage(mul)*(Math.floor((lv>0?lv:99)/10)+1);}
const SOLVER_STAT_FIELDS=[
{key:'atk',label:'ATK',min:7,solverOnly:true},
{key:'str',dom:'str',label:'STR',preset:0,min:4},
{key:'might',dom:'might',label:L02,preset:1,min:0},
{key:'agi',dom:'agi',label:'AGI',preset:2,min:4,actor:true},
{key:'mending',dom:'mend',label:L04,preset:3,min:0},
{key:'deft',dom:'deft',label:'Deftness',preset:4,min:1},
];
const VOC_STATS=[
{jp:'戦士',en:'Warrior',s:[504,300,278,300,421]},
{jp:'僧侶',en:'Priest',s:[301,300,512,700,416]},
{jp:'魔法使い',en:'Mage',s:[196,700,601,300,514]},
{jp:'武闘家',en:'Martial Artist',s:[499,300,700,300,465]},
{jp:'盗賊',en:'Thief',s:[399,300,610,381,612]},
{jp:'旅芸人',en:'Minstrel',s:[346,461,559,495,514]},
{jp:'ﾊﾞﾄﾙﾏｽﾀｰ',en:'Gladiator',s:[600,300,224,300,466]},
{jp:'ﾊﾟﾗﾃﾞｨﾝ',en:'Paladin',s:[454,300,173,464,219]},
{jp:'魔法戦士',en:'Armamentalist',s:[451,582,273,300,320]},
{jp:'ﾚﾝｼﾞｬｰ',en:'Ranger',s:[405,300,364,500,710]},
{jp:'賢者',en:'Sage',s:[302,537,318,508,267]},
{jp:'ｽｰﾊﾟｰｽﾀｰ',en:'Luminary',s:[248,377,561,618,469]},
{jp:'種ﾄﾞｰﾋﾟﾝｸﾞ',en:'Boosted',s:[999,999,999,999,999]},
];
function lookupSkill(key){return typeof key==='number'?SKILL_BY_ID[key]:SKILL_IDX[key];}
const SKILL_IDX={},SKILL_BY_ID=[];
const FOURCE_EL={};
const FOURCE_EN={};
const WEAPON_SKILLS={};
for(const wm of Object.values(WEAPON_META)){if(!WEAPON_SKILLS[wm.cat])WEAPON_SKILLS[wm.cat]=new Set();}
for(const s of SKILL_DB){
SKILL_IDX[s.jp]=s;
SKILL_BY_ID[s.id]=s;
if(s.addsEl)FOURCE_EL[s.jp]=s.addsEl;
if(s.weapon==='Armamentalist'&&s.en)FOURCE_EN[s.jp]=s.en;
if(s.cat!=='spell'&&s.cat!=='item'){
const isGlad=s.weapon==='Gladiator';
const isAtkS=s.jp==='攻撃'&&s.target==='S';
for(const cat of Object.keys(WEAPON_SKILLS))if(s.weapon===cat||isGlad||isAtkS)WEAPON_SKILLS[cat].add(s.jp);
}
}
for(const e of SOLVER_ENTRIES)if(e.alias&&SKILL_IDX[e.alias])SKILL_IDX[e.jp]=SKILL_IDX[e.alias];
function weaponMetaValue(eq,key){const w=SOLVER_WEAPON_INFO[eq];return w&&w[key];}
const SOLVER_ROUND_SIZE=4;
const SOLVER_MAX_ACTIONS=SOLVER_ROUND_SIZE*2;
function solverATForCount(first,diff,n){return first+diff*Math.max(n-1,0);}
const SOLVER_DECAY_RATES=[1,0.8,0.6,0.4,0.2].map(Math.fround);
function makeSolverAction({jp,en,at},hits=0){return{jp,en:en||jp,at:at?at[0]:0,equip:'',note:'',hits};}
const ACT_MERCY=makeSolverAction(lookupSkill('みのがす'));
const ACT_EGG=makeSolverAction(lookupSkill('おうえん'));
const ACT_ISSEN=makeSolverAction(lookupSkill('一閃づき'),1);
const DMG_STAT={
might:[['might'],s=>s.might||0],
str:[['str'],s=>s.str||0],
'str+might':[['str','might'],s=>(s.str||0)+(s.might||0)],
'str+deft':[['str','deft'],s=>(s.str||0)+(s.deft||0)],
mending:[['mending'],s=>s.mending||0],
stat:[['might','mending'],s=>s.might||s.mending||0]
};
function getDamageStat(key,stats){const read=DMG_STAT[key];return read?read[1](stats):0;}
function monHpMin(hp){return Math.floor(hp*0.8);}
function isHitBased({target:t}){return t==='S'||t==='RS'||t==='RG'||t==='RA';}
function getHits(skill,hasDoubling){
if(!isHitBased(skill))return 1;
const doubled=skill.fh||skill.kph,range=skill.hitRange,fixed=range&&range.normalMin===range.max?range.max:0;
return hasDoubling&&!fixed&&doubled?doubled:skill.hit||fixed||(doubled?doubled/2:1);
}
function getEquipHitCount(sk,eq){
const w=SOLVER_WEAPON_INFO[eq];
return w&&w.fixedDmg?WEAPON_META[eq].hits:getHits(sk,!!(w&&w.falcon&&solverWeaponCompatible(sk,eq)));
}
function isSolverRandomTargetSkill(sk){return!!sk&&sk.target!=='S'&&isHitBased(sk);}
const SOLVER_PRI_WEAPONS=Object.keys(WEAPON_META).filter(eq=>weaponMetaValue(eq,'pri'));
const SOLVER_BASIC_SKILLS=['攻撃','とうこん討ち'];
function solverWeaponCompatible(sk,eq){
const w=SOLVER_WEAPON_INFO[eq];
if(!sk||!w||!w.ready)return false;
if(sk.equip)return eq===sk.equip;
const skills=WEAPON_SKILLS[w.cat];
return!w.fixedDmg&&!!skills&&skills.has(sk.jp);
}
const METAL_MONSTERS=new Set(['01B','04C','04D','0B5','0B9','0F2']);
const METAL_ONLY_WEAPONS=new Set(Object.keys(WEAPON_META).filter(eq=>weaponMetaValue(eq,'metal')&&!weaponMetaValue(eq,'falcon')&&!weaponMetaValue(eq,'antiBlk')&&!weaponMetaValue(eq,'pri')&&!weaponMetaValue(eq,'fixedDmg')&&!weaponMetaValue(eq,'wmul')));
const METAL_PADDING=[
['攻撃','メタスラの剣'],
['攻撃','風林火山'],
['しっぷうづき','メタスラのやり'],
['はやぶさ斬り','メタスラの剣'],
['メタル斬り',''],
['メタル斬り','はやぶさの剣'],
['とうこん討ち','メタスラの剣'],
['とうこん討ち','風林火山'],
['無心こうげき','メタスラの剣'],
['無心こうげき','風林火山'],
['火ふき芸','miss','💨'],
['ビッグバン','miss','💨'],
['ドルマドン','miss','💨'],
['メラガイアー','miss','💨'],
['マグマの杖','miss','💨'],
['おうえん',''],
].map(([jp,eq,note])=>{const sk=lookupSkill(jp);return[jp,sk.en,eq==='miss'?sk.miss:solverATForCount(sk.at[0],sk.at[1],getEquipHitCount(sk,eq)),eq,WEAPON_META[eq]?WEAPON_META[eq].note:(note||'')];});
const METAL_ACTION_KEYS=new Set(METAL_PADDING.filter(row=>row[2]>0).map(row=>row[0]+'\x1f'+row[2]+'\x1f'+row[3]));
const isMetalHex=(hex)=>METAL_MONSTERS.has(hex);
function isMetalExecutionAction(action){return!!action&&action.jp==='一閃づき';}
function isMetalActionSkill(action){
if(!action||action.supTarget||!(action.at>0))return false;
if(isMetalExecutionAction(action))return action.at===ACT_ISSEN.at;
return METAL_ACTION_KEYS.has(action.jp+'\x1f'+action.at+'\x1f'+(action.equip||''));
}
function isSolverNonDamageRemoval(action){return action.jp==='ザラキーマ'||action.jp==='みのがす'||solverFieldMetal&&isMetalExecutionAction(action);}
function solverDeathRes(hex,fallback){const mon=MONSTER_DB[hex];return mon?mon.s[12]:fallback;}
function solverNeedleTargetOK(hex){return solverDeathRes(hex)===0;}
const SolverActionGate=Object.freeze({
ally:['U','P','O'],
hits(action){return action&&action.hits>0?Math.floor(action.hits):1;},
targetKind(sk){
if(!sk)return null;
const t=sk.target;
if(t==='RS'||t==='RA'||t==='RG')return t;
else if(t==='A'||t==='G'||t==='S')return t;
else if(this.ally.includes(t))return t;
throw new Error('Unknown skill target kind: '+t);
},
targets(alive,action,{sk,tgt,random,metalAction,execute},positional=false){
if(random&&(alive.length!==1||action.tgtGroup!==undefined||sk.aimGroup||action.supTarget))return{targets:[],reason:'randomTarget'};
if(this.ally.includes(tgt))return{targets:[],reason:'noTarget'};
const mainMetalAlive=solverFieldMetal&&alive.some(x=>x.groupIdx===0&&isMetalHex(x.hex));
if(action.supTarget&&(!mainMetalAlive||tgt!=='S'||!(action.tgtGroup>0)||action.at===sk.miss||!METAL_ACTION_KEYS.has(sk.jp+'\x1f'+sk.miss+'\x1fmiss')))return{targets:[],reason:'retarget'};
const finish=(targets)=>{
if(!targets.length)return{targets:[],reason:'tgtdead'};
if(action.needDeath0&&targets.some(t=>!solverNeedleTargetOK(t.hex)))
return{targets:[],reason:'death_not_zero'};
let hitsMetal=false,hitsNonMetal=false;
for(const t of targets){if(solverFieldMetal&&isMetalHex(t.hex))hitsMetal=true;else hitsNonMetal=true;}
if(hitsMetal&&!hitsNonMetal&&!metalAction)
return{targets:[],reason:'metalRule'};
if(action.supTarget&&hitsMetal)return{targets:[],reason:'retarget'};
if(mainMetalAlive&&hitsNonMetal&&!metalAction&&!action.supTarget&&!(tgt==='A'&&hitsMetal))
return{targets:[],reason:'metalAim'};
return{targets,reason:null};
};
if(random||tgt==='A')return finish(alive.slice());
const group=tgt==='G',metals=metalAction&&alive.filter(x=>isMetalHex(x.hex));
let candidates=metals&&metals.length?metals:alive,aim=action.tgtGroup;
if(!group&&mainMetalAlive&&execute&&metals&&metals.length)candidates=metals.filter(x=>x.groupIdx===0);
if(group?aim===undefined:!!sk&&!!sk.aimGroup){
const counts=[];
for(const t of group?candidates:alive)counts[t.groupIdx]=(counts[t.groupIdx]||0)+1;
if(group){
aim=-1;
for(let g=0;g<counts.length;g++)if(counts[g]>(counts[aim]||0))aim=g;
}else{
candidates=candidates.filter(t=>sk.aimGroup(counts[t.groupIdx]));
if(!candidates.length)return{targets:[],reason:'soloGroup'};
aim=undefined;
}
}
if(aim!==undefined)candidates=candidates.filter(t=>t.groupIdx===aim);
if(group||candidates.length<2)return finish(candidates);
const options=[];let failed=null;
for(let i=0;i<candidates.length;i++){
const candidate=candidates[i];
const previous=candidates[i-1];
if(!positional&&previous&&previous.groupIdx===candidate.groupIdx&&previous.hex===candidate.hex&&previous.death===candidate.death
&&previous.hist===candidate.hist&&previous.killFloor===candidate.killFloor)continue;
const r=finish([candidate]);
if(r.reason){if(!failed)failed=r;}else options.push(r.targets);
}
if(!options.length)return failed||finish([]);
return{targets:options[0],options,reason:null};
},
survivesBeforeHit(hits,head,hpLow){hits=Math.max(1,Math.floor(hits||1));return hits<=1||Math.floor(head||0)<hpLow;},
step(target,hits,dMin,dMax,head){
const hp=target.hp-Math.floor(dMin||0);
const hpLow=target.hpLow-Math.floor(dMax||0);
return{hp,hpLow,fullHits:this.survivesBeforeHit(hits,head,target.hpLow),uncertain:hpLow<=0&&hp>0,dead:hp<=0};
},
hitRejectReason(target,damage,action,sd,step,mainKilled){
if(step){
if(!step.fullHits||action.earlyKill&&!step.dead||sd.random&&!step.dead&&!step.uncertain)return'at_hit_count';
if(solverFieldMetal&&isMetalHex(target.hex)&&(step.dead||step.uncertain))return'metal_chip';
if(action.supTarget&&(step.dead||step.uncertain))return'retarget_kill';
if(!step.dead)return null;
}
if((!action||step&&sd.numeric)&&damage<target.killFloor)return'kill_damage';
return action&&target.groupIdx!==0&&!mainKilled?'main_first':null;
},
commit(target,step){target.hp=step.hp;target.hpLow=step.hpLow;if(step.dead)target.alive=false;}
});
SKILL_DB.forEach(s=>SolverActionGate.targetKind(s));
function buildSimInstances(targets,details=false){
const fields=_solverGoldState&&(_solverGoldState.simFields||(_solverGoldState.simFields=new WeakMap()));
let field=fields&&fields.get(targets);
if(!field){
const instances=[];
targets.forEach((t,groupIdx)=>{
const m=MONSTER_DB[t.hex],hp=m?m.s[0]:9999,hpLow=monHpMin(hp),killFloor=hp-hpLow+1,death=t.death!==undefined?t.death:m?m.s[12]:100;
for(let k=0;k<(t.count||1);k++)instances.push({hex:t.hex,hp,hpLow,killFloor,alive:true,death,groupIdx});
});
if(!fields&&!details)return instances;
field={instances,metalMainBattle:solverFieldMetal&&instances.some(t=>t.groupIdx===0&&isMetalHex(t.hex)),uniqueHexes:[...new Set(targets.map(t=>t.hex))]};
if(fields)fields.set(targets,field);
}
return details?field:field.instances;
}
const _solverStatDomains=new Map();
for(const field of SOLVER_STAT_FIELDS)_solverStatDomains.set(field.key,field);
const SOLVER_STAT_KEYS=SOLVER_STAT_FIELDS.filter(f=>!f.actor).map(f=>f.key);
const SOLVER_INPUT_FIELDS=SOLVER_STAT_FIELDS.filter(f=>!f.solverOnly);
const EXT_STATS=Object.fromEntries(SOLVER_STAT_KEYS.map(key=>[key,999]));
const MIN_STATS=Object.fromEntries(SOLVER_STAT_KEYS.map(key=>[key,solverStatMin(key)]));
function solverStatMin(key,equip,prio){
const domain=_solverStatDomains.get(key),w=key==='atk'&&WEAPON_META[equip],str=key==='atk'&&(prio?solverStatMin('str',0,prio):_solverStatDomains.get('str').min);
const floor=!prio?domain.min:domain.sum?domain.sum.reduce((n,k)=>n+solverStatMin(k,0,prio),0):key==='atk'?domain.min+str-_solverStatDomains.get('str').min:Math.min(...VOC_STATS.slice(0,12).map(v=>v.s[domain.preset]));
return w&&!w.generic&&w.a>=0?Math.max(floor,Math.min(999,str+w.a)):floor;
}
function forEachPoolEntry(rawPool,fn){
for(const e of rawPool)if(Array.isArray(e)){
if(typeof e[0]==='string')fn(e);
for(const x of e)if(Array.isArray(x)&&typeof x[0]==='string')fn(x);
}
}
function getEncounterSupportPool(env,mr){
const supportPool=[],seen=new Set(),byEnv=GROTTO_SUPPORT[env];
let denominator=0;
forEachPoolEntry(byEnv&&byEnv[mr]||[],e=>{
if(seen.has(e[0]))return;
seen.add(e[0]);
denominator=denominator||e[4]||0;
supportPool.push({hex:e[0],min:e[1],max:e[2],weight:e[3]||0,index:supportPool.length});
});
return{supportPool,denominator};
}
function getEncounterModel(env,mr,hex){
const byEnv=GROTTO_BATTLE[env],info=byEnv&&byEnv[mr],entry=info&&info.m.find(e=>e[0]===hex);
if(!entry)return null;
const isAlone=entry[3]===1,ratio=(a,b)=>!isAlone&&entry[b]>0?entry[a]/entry[b]:0,p1=ratio(4,5),p2=ratio(6,7);
const{supportPool,denominator}=isAlone?{supportPool:[],denominator:0}:getEncounterSupportPool(env,mr);
return{hex,isAlone,max:info.x,mainMin:entry[1],mainMax:entry[2],supportPool,denominator,branches:[Math.max(0,1-p1-p2),p1,p2],metal:[...METAL_MONSTERS].some(id=>id===hex||supportPool.some(p=>p.hex===id))};
}
function solverRoundStart(index){return index-index%SOLVER_ROUND_SIZE;}
function solverRound2RemovalCost(total){return Math.floor(total/2);}
function solverRoundCost(combo,total,r1Removal){return r1Removal&&combo.length>SOLVER_ROUND_SIZE?solverRound2RemovalCost(total):0;}
function solverAllowsRound2(mapDeft,canRound2){return canRound2===undefined?mapDeft<1000:!!canRound2;}
function solverRoundSpaces(bat,round2Cost,canRound2,stage,space){
const out=[];
if(stage!=='r2')out.push(space('r1',bat,1,1,SOLVER_ROUND_SIZE));
if(stage!=='r1'&&canRound2){
const min=SOLVER_ROUND_SIZE+1;
out.push(space('r2a',bat,2,min,SOLVER_MAX_ACTIONS));
if(round2Cost>0)out.push(space('r2b',bat-round2Cost,2,min,SOLVER_MAX_ACTIONS));
}
return out;
}
function buildSolverExactHitVariants(base,firstAT,diffAT,maxHits,minEarlyHits){
const H=Math.max(1,Math.floor(maxHits||1)),out=[{...base,at:solverATForCount(firstAT,diffAT,H),hits:H}];
for(let h=Math.max(1,Math.floor(minEarlyHits||1));h<H;h++)out.push({...base,at:solverATForCount(firstAT,diffAT,h),hits:h,earlyKill:true,note:(base.note||'')+'⚡'+h+'hit'});
return out;
}
const _solverBatTables=new Map();
const _solverBatFeasible=new WeakMap();
const _solverBatReach=new Map();
function solverBatTable(T,round2){
const key=T+':'+(round2?2:1),saved=_solverBatTables.get(key);
if(saved)return saved;
const forms=new Map(),add=(at,sk,miss)=>solverMapEntry(forms,at,()=>[]).push({sk,miss});
for(const sk of SKILL_DB){
if(!sk.at)continue;
const count=!isHitBased(sk)?T:isSolverRandomTargetSkill(sk)&&sk.hitRange?sk.hitRange.max:Math.max(getHits(sk,false),getHits(sk,true),sk.hitRange?sk.hitRange.max:1,sk.hit||1);
for(let n=1;n<=count;n++)add(solverATForCount(sk.at[0],sk.at[1]||0,n),sk,false);
if(Number.isFinite(sk.miss))add(sk.miss,sk,true);
}
const slots=round2?SOLVER_MAX_ACTIONS:SOLVER_ROUND_SIZE,ats=[...forms.keys()].filter(at=>at>0);
const single=new Set(ats.filter(at=>forms.get(at).every(f=>SolverActionGate.targetKind(f.sk)==='S'&&f.sk.dmg&&solverConditionStatKeys(f.sk).length<=1)));
const size=Math.max(...ats)*slots+1,free=new Uint8Array(size);
let sums=new Uint8Array(size),other=new Uint8Array(size);
sums[0]=1;
for(let k=1;k<=slots;k++){
for(let v=0;v<size;v++)if(sums[v])free[v]=1;
const next=new Uint8Array(size),mixed=new Uint8Array(size);
for(let v=0;v<size;v++){
if(!sums[v])continue;
for(const at of ats)if(v+at<size){next[v+at]=1;if(other[v]||!single.has(at))mixed[v+at]=1;}
}
sums=next;other=mixed;
}
const table={forms,slots,size,free,other,full:sums,singles:[...single].sort(solverOrder.numberDesc)};
_solverBatTables.set(key,table);
return table;
}
function solverBatStructureFeasible(table,sum,monsters){
const actors=solverUseStatsEnabled()?readCharStatsFromDom():null,party=actors?JSON.stringify(actors.map(c=>[c.stats,c.lv,c.job])):'';
const known=solverMapEntry(_solverBatFeasible,table),key=sum+'|'+monsters.join(',')+'|'+party;
if(known.has(key))return known.get(key);
const reach=(sk,hex)=>{
const id=sk.jp+'|'+hex+'|'+party;
let r=_solverBatReach.get(id);
if(r)return r;
r={zero:false,hit:false};
const stat=solverConditionStatKeys(sk)[0],action={jp:sk.jp,at:sk.at[0],equip:'',hits:0};
const points=actors?actors.map(c=>c.stats):null;
for(let v=points?0:stat?solverStatMin(stat):0,last=points?points.length-1:stat?999:0;v<=last&&!(r.zero&&r.hit);v++){
const d=skillDamagePerHit(sk,action,hex,points?points[v]:stat?{...EXT_STATS,[stat]:v}:EXT_STATS,null);
if(d.none||!Number.isFinite(d.min)||!Number.isFinite(d.max))r.zero=r.hit=true;
else if(d.max===0)r.zero=true;
else if(d.min>0)r.hit=true;
}
_solverBatReach.set(id,r);
return r;
};
const feasible=acts=>{
if(acts.some(f=>!monsters.some(hex=>reach(f.sk,hex)[f.miss?'zero':'hit'])))return false;
const hits=acts.filter(f=>!f.miss),owner=hits.map(()=>-1);
const match=(m,seen)=>hits.some((f,i)=>{
if(seen[i]||!reach(f.sk,monsters[m]).hit)return false;
seen[i]=true;
if(owner[i]>=0&&!match(owner[i],seen))return false;
owner[i]=m;
return true;
});
return monsters.every((_,m)=>match(m,[]));
};
const pick=[];
const choose=(i,acts)=>i===pick.length?feasible(acts):table.forms.get(pick[i]).some(f=>{acts.push(f);const ok=choose(i+1,acts);acts.pop();return ok;});
const walk=(start,rem)=>{
if(pick.length===table.slots)return rem===0&&choose(0,[]);
for(let i=start;i<table.singles.length;i++){
const at=table.singles[i];
if(at>rem)continue;
pick.push(at);
const ok=walk(i,rem-at);
pick.pop();
if(ok)return true;
}
return false;
};
const result=walk(0,sum);
known.set(key,result);
return result;
}
function solverBatUnreachable(render){
const bat=render&&render.bat,groups=render&&render.monGroups||[];
if(!Number.isInteger(bat)||!(bat>0)||!groups.length)return false;
if(groups.some(g=>!g||!g.hex||!MONSTER_DB[g.hex]||g.count!==undefined&&(!Number.isInteger(g.count)||g.count<=0)))return false;
if(solverUseStatsEnabled()&&!readCharStatsFromDom().length)return false;
const T=groupTotal(groups),round2=solverAllowsRound2(render.mapDeft,render.canRound2),table=solverBatTable(T,round2);
const sums=[0,...(round2?[solverRound2RemovalCost(T)]:[])].map(c=>bat-c).filter(v=>v>=0&&v<table.size);
if(sums.some(v=>table.free[v]||table.other[v]))return false;
const monsters=groups.flatMap(g=>Array(g.count||1).fill(g.hex));
return sums.every(v=>!table.full[v]||!solverBatStructureFeasible(table,v,monsters));
}
function expandSolverCombos(monCount,fieldShape){
const groupCounts=fieldShape&&Object.prototype.hasOwnProperty.call(fieldShape,'groupCounts')?fieldShape.groupCounts:_solverGroupCounts;
const fieldTotal=fieldShape&&Object.prototype.hasOwnProperty.call(fieldShape,'fieldTotal')?fieldShape.fieldTotal:_solverFieldTotal;
const maxMonCount=fieldShape&&fieldShape.maxMonCount!==undefined?fieldShape.maxMonCount:monCount;
const fieldHexes=_solverFieldHexes||[],activeHexes=fieldHexes.filter((hex,gi)=>!groupCounts||groupCounts[gi]>0),variants=[],late=[];
for(const entry of SOLVER_ENTRIES){
const sk=lookupSkill(entry.alias||entry.jp);
if(!sk)continue;
const first=sk.at[0],diff=sk.at[1],en=sk.en;
const unknownZero=solverElementMayZero(sk);
if(unknownZero&&!(sk.target==='G'&&groupCounts)&&activeHexes.length&&activeHexes.every(hex=>solverTargetImmuneToElement(sk.el,hex)))continue;
const out=monCount>1&&isSolverRandomTargetSkill(sk)?late:variants;
if(entry.jp==='攻撃(全体)'&&maxMonCount<=1)continue;
if(sk.target==='A'||sk.target==='G'){
const groups=sk.target==='G'&&groupCounts;
for(let gi=0;gi<(groups?groups.length:1);gi++){
if(groups&&(!(groups[gi]>0)||unknownZero&&solverTargetImmuneToElement(sk.el,fieldHexes[gi])))continue;
const start=!groups&&diff!==0&&entry.jp==='攻撃(全体)'?2:1;
const end=diff===0?1:groups?groups[gi]:typeof fieldTotal==='number'&&fieldTotal>0?fieldTotal:monCount;
for(let count=start;count<=end;count++){
const action={jp:entry.jp,en,at:diff===0?first:solverATForCount(first,diff,count),equip:'',note:'',hits:0};
if(diff!==0)action.aoeK=count;
if(groups)action.tgtGroup=gi;
variants.push(action);
}
}
continue;
}
const hitBased=isHitBased(sk),hits=hitBased?getHits(sk,false):(sk.hit||1);
const base={jp:entry.jp,en,equip:entry.needle?sk.equip:'',note:entry.needle?WEAPON_META[sk.equip].note:'',needle:entry.needle,needDeath0:entry.needle&&WEAPON_META[sk.equip].needDeath0};
if(hitBased)out.push(...buildSolverExactHitVariants(base,first,diff,hits));
else variants.push(Object.assign({},base,{at:solverATForCount(first,diff,hits),hits:0}));
if(hitBased)for(const equip in WEAPON_META){
if(!weaponMetaValue(equip,'falcon')||!solverWeaponCompatible(sk,equip))continue;
const extraHits=getEquipHitCount(sk,equip);
if(extraHits<=hits)continue;
out.push(...buildSolverExactHitVariants({jp:entry.jp,en,equip,note:WEAPON_META[equip].note,...(WEAPON_META[equip].needDeath0?{needDeath0:true}:{})},first,diff,extraHits,hits+1));
}
}
if(solverFieldMetal&&!isMetalHex((_solverFieldHexes||[])[0])&&solverMetalCompanionCount()>0)variants.unshift(ACT_ISSEN);
return variants.concat(fieldShape&&fieldShape.plain?[]:late).filter(v=>!(v.earlyKill&&solverBasicSkillForAT(v.at)));
}
function walkSolverATCombos(search,target,depth,visit,stop,rootIdx,opts={},plain){
const{variants,late,sequence,canReach,index,once}=search,{removal,chips,needs,structure}=opts,combo=[];
const blocked=(removed,sum,largest)=>removal&&removed>removal.capacity||chips&&sum-largest>=chips.limit;
const short=(sums,i,slots)=>!!needs&&needs.some((c,k)=>c.exact&&sums[k]>c.need||sums[k]+slots*c.most[i]<c.need);
const walk=(start,remaining,slots,removed,chipSum,chipMax,sums,state)=>{
if(stop())return;
if(slots===0){visit(combo,state);return;}
const at=slots===1?index.get(remaining):null,n=at?at.length:late;
let k=0;
if(at)while(k<n&&at[k]<start)k++;
else if(!sequence)k=start;
for(;k<n;k++){
if(stop())return;
const i=at?at[k]:sequence?sequence[k]:k;
if(i<start)continue;
const v=variants[i],rest=remaining-v.at;
if(!(v.at>0)||rest<0||solverOnceClash(once,v,combo)||slots>1&&!canReach(i,slots-1,rest))continue;
const r=removed+(removal?removal.values[i]||0:0),c=chips?chips.values[i]||0:0,sum=chipSum+c,largest=Math.max(chipMax,c);
if(blocked(r,sum,largest))continue;
const reached=needs&&needs.map((x,j)=>sums[j]+x.values[i]);
if(short(reached,i,slots-1))continue;
const next=state&&{...state};
if(next&&!solverStructureStep(next,v))continue;
combo.push(v);
walk(i,rest,slots-1,r,sum,largest,reached,next);
combo.pop();
}
};
if(plain!=='late'){
if(rootIdx===undefined){
const sums=needs&&needs.map(()=>0);
if(canReach(0,depth,target)&&!short(sums,0,depth))walk(0,target,depth,0,0,0,sums,structure);
}else{
const root=variants[rootIdx];
if(root&&rootIdx<late&&root.at>0&&depth>0&&canReach(rootIdx,depth-1,target-root.at)){
const r=removal?removal.values[rootIdx]||0:0,chip=chips?chips.values[rootIdx]||0:0,sums=needs&&needs.map(c=>c.values[rootIdx]);
const startState=structure&&{...structure};
if(!short(sums,rootIdx,depth-1)&&!blocked(r,chip,chip)&&(!startState||solverStructureStep(startState,root))){
combo.push(root);
walk(rootIdx,target-root.at,depth-1,r,chip,chip,sums,startState);
}
}
}
}
if(plain!==true&&depth>1)for(let k=late;k<variants.length;k++){
if(stop())return;
const i=sequence?sequence[k]:k,tail=variants[i];
if(!(tail.at>0))continue;
const inner=needs?{...opts,needs:needs.map(c=>({...c,need:c.need-c.values[i]}))}:opts;
walkSolverATCombos(search,target-tail.at,depth-1,(c,at)=>{
if(!solverOnceClash(once,tail,c)&&(!at||solverStructureStep({...at},tail)))visit([...c,tail]);
},stop,rootIdx,inner,true);
}
}
function solveBattleCombo(bat,monCount,maxSlots,hexId,fieldShape){
if(bat<=0)return[];
const shape=fieldShape||{},least=shape.least||1;
const limits=shape.atLimits||{bat,slots:maxSlots};
let search=limits.search;
if(!search){
const variants=expandSolverCombos(monCount,shape.plain?{...shape,plain:false}:fieldShape);
const order=solverATOrder(variants,limits.bat,monCount>1,hexId||shape.hex);
search=limits.search=buildSolverATSearch(order,limits.bat,limits.slots);
search.once=solverOnceMap(search.variants);
}
const{variants}=search,depths=[];
for(let depth=least;depth<=maxSlots;depth++){
if(search.reachesDepth(0,bat,depth,depth,!shape.plain&&depth>1,!shape.lateOnly))depths.push(depth);
}
if(!depths.length)return[];
const results=[],mon=hexId?MONSTER_DB[hexId]:null,useScreen=!!(mon&&monCount<=1),scoreCandidates=useScreen&&!_solverUseStats,field=[{hex:hexId,count:1}];
const fource=scoreCandidates?pickBestFource(hexId):null,fEls=getFourceEls(fource);
const scores=(_solverGoldState&&_solverGoldState.estimates||_solverDmgCache.search).scores,scoreContext=scoreCandidates?JSON.stringify([hexId,solverApplyBuildContext(),solverBlockRuleEnabled(),solverMultiPlayerEnabled()]):null;
const basis=useScreen?solverSingleRemovalCapacity(variants,hexId):null,pruning=shape.walk?solverWalkPruning(variants,shape.walk,!shape.keep):{};
let raw=0;
for(const depth of depths){
const sink=[];
walkSolverATCombos(search,bat,depth,combo=>{
raw++;
const kept=shape.keep?shape.keep(combo):combo.slice();
if(!kept)return;
let sc=0;
if(scoreCandidates){
const equipped=combo.map(v=>{
if(v.at===0||v.equip||v.needle)return v;
const eq=getSkillEquipOpts(v.jp,hexId,'first')[0];
return eq?Object.assign({},v,eq):v;
});
for(const candidate of equipped.some((v,i)=>v!==combo[i])?[combo,equipped]:[combo]){
const sig=solverComboActionSignature(candidate,true),signature=scoreContext+'|'+sig;
let value=scores.get(signature);
if(value===undefined){
const prepared={sig},ok=solverCandidateStructureOK(candidate,{targets:field});
const rate=(mul,els)=>ok&&(mul===1||!(solverPaperDamageUpperBound(candidate,hexId,mul,els,prepared.ids||(prepared.ids=sig.split('\x1e')))<monHpMin(mon.s[0])))?checkSolverDamage(candidate,hexId,mon,null,mul,els,{},undefined):null;
const r1=getRankOrderValue(rate(1,null));
const useFource=r1!==2&&fource&&(prepared.skills=candidate.map(v=>lookupSkill(v.jp))).some(sk=>!sk||!sk.el&&!sk.fixedDmg);
const rf=useFource?getRankOrderValue(rate(1,fEls)):0;
if(r1===2)value=90000;
else if(rf===2)value=70000;
else{
const q1=calcSolverMinStat(candidate,hexId,1,null,true,prepared);
if(q1)value=50000-Math.min(q1.min,9999);
else if(r1===1)value=45000;
else{
const qf=useFource?calcSolverMinStat(candidate,hexId,1,fource,true,prepared):null;
if(qf)value=40000-Math.min(qf.min,9999);
else if(rf===1)value=35000;
else{
value=0;
for(const{mul}of TENSION){
if(rate(mul,null)||(useFource&&rate(mul,fEls))){value=30000;break;}
const qt=calcSolverMinStat(candidate,hexId,mul,null,true,prepared);
if(qt){value=20000-Math.min(qt.min,9999);break;}
const qtf=useFource?calcSolverMinStat(candidate,hexId,mul,fource,true,prepared):null;
if(qtf){value=10000-Math.min(qtf.min,9999);break;}
}
}
}
}
scores.set(signature,value);
}
sc=Math.max(sc,value);if(sc>=90000)break;
}
}
sink.push({c:kept,sc,ord:sink.length});
},()=>solverSearchCapped((!useScreen&&sink.length>=30)||raw>=6000),undefined,basis||pruning,shape.lateOnly?'late':shape.plain||undefined);
if(scoreCandidates)sink.sort(solverOrder.score);
for(const item of sink)results.push(item.c);
}
return results;
}
function deriveSolverAtk(str,equip,override,skill){
const w=SOLVER_WEAPON_INFO[equip];
if(!w||!w.ready||w.fixedDmg)return null;
if(override!==undefined&&(!skill||solverConditionStatKeys(skill,true).includes('atk')))return Number.isInteger(override)&&override>=0&&override<=999?override:null;
return Number.isInteger(str)&&str>=_solverStatDomains.get('str').min&&str<=999?Math.min(999,str+w.bonus):null;
}
function calcPhysicalDamageRange(x,y,mul){
const ratio=x>0?y/x:999;
if(ratio>=2)return{min:0,max:1};
if(ratio>=1.75)return{min:0,max:Math.floor(x/16)};
const z=Math.floor(Math.max(Math.floor(x/2)-Math.floor(y/4),0)*(mul||1)),eps=Math.floor(z/16)+1;
return{min:Math.max(0,z-eps),max:z+eps};
}
function atkDecay(sk,r,n){
const on=(sk.target==='A'||sk.target==='G')&&!sk.dmg&&!sk.fixedDmg&&sk.el!==12&&sk.jp!=='パワフルスロー';
if(!r)return on;
if(!on||!(n>1))return r;
const k=SOLVER_DECAY_RATES[Math.min(n-1,4)];
return{min:Math.trunc(Math.fround(r.min*k)),max:Math.trunc(Math.fround(r.max*k))||1};
}
function applyElementAndFource(d,skill,hex,fEls){
if(skill.fixedDmg)return d;
const mon=MONSTER_DB[hex];
if(!mon)return d;
if(skill.el)return Math.floor(d*mon.s[skill.el]/100);
if(!fEls)return d;
let best=d;
for(const el of fEls){const v=Math.floor(Math.floor(d*mon.s[el]/100)*1.1);if(v>best)best=v;}
return best;
}
function getFourceEls(source,fallback=null){
const s=Array.isArray(source)?findInlineFource(source):source;
return s&&FOURCE_EL[s.jp||s]||fallback;
}
function findInlineFource(combo){return combo.find(v=>v.at===0&&v.jp&&FOURCE_EL[v.jp])||null;}
function pickBestFource(hexId){
const mon=MONSTER_DB[hexId];
if(!mon)return null;
let best=null,bestMod=0;
for(const jp in FOURCE_EL)for(const el of FOURCE_EL[jp]){const mod=mon.s[el]||100;if(mod>bestMod){best=jp;bestMod=mod;}}
return bestMod>100?{jp:best,en:FOURCE_EN[best]||best}:null;
}
function solverTargetImmuneToElement(el,hex){const m=el>0&&hex&&!(solverFieldMetal&&isMetalHex(hex))&&MONSTER_DB[hex];return!!m&&m.s[el]===0;}
function solverTypeMul(sk,equip,mon,weaponOnly=false){
if(!mon)return 1;
const tmul=sk&&sk.tmul&&sk.tmul[mon.t]||1;
const w=!(sk&&sk.dmg)&&SOLVER_WEAPON_INFO[equip||(sk&&WEAPON_SKILLS[sk.weapon]?solverDefaultEquip(sk):'')];
const wmul=w&&w.types[mon.t]||1;
return wmul>tmul?wmul:weaponOnly?1:tmul;
}
function solverUsesWeaponMultiplier(combo,hexId){const mon=MONSTER_DB[hexId];return combo.some(v=>!v.defend&&solverTypeMul(lookupSkill(v.jp),v.equip,mon,true)>1);}
function solverRaceMulIndex(combo,check=false){
let found=-1;
for(let i=0;i<combo.length;i++){
if(!weaponMetaValue(combo[i].equip,'wmul'))continue;
if(!check)return i;
if(found>=0||i!==combo.length-1&&combo[combo.length-1].jp!=='みのがす')return null;
found=i;
}
return found;
}
function solverRaceMulAdd(c,{T,hexId,assignmentSearch,raceMulQueue},kills){
if(solverRaceMulIndex(c)>=0)return;
const dmg=solverIndicesOf(c,v=>v.at>0);
for(const i of T===1?dmg.filter(makeFinisherGate(c)):c[c.length-1].jp==='みのがす'?kills||dmg:dmg.slice(-1)){
const v=c[i];
if(!(v.at>0)||v.needle||solverFieldMetal&&isMetalExecutionAction(v)||v.equip&&!(WEAPON_META[v.equip]&&WEAPON_META[v.equip].generic))continue;
for(const o of getSkillEquipOpts(v.jp,hexId,'multiplier')){
const n=c.slice();n[i]={...v,...o};
const k=solverComboFacts(n,assignmentSearch.forms).sig;
if(!raceMulQueue.seen.has(k)){raceMulQueue.seen.add(k);raceMulQueue.queue.push(n);}
}
}
}
for(const skill of SKILL_DB){
const key=skill.dmg&&skill.dmg.st,reads=key&&key.includes('+')&&DMG_STAT[key]&&DMG_STAT[key][0];
if(reads&&!_solverStatDomains.has(key))_solverStatDomains.set(key,{key,min:reads.reduce((n,field)=>n+_solverStatDomains.get(field).min,0),max:reads.length*999,sum:reads});
}
function calcSkillDamage(skill,stats,monId,fourceEls,plus1Eff,equip,n,input){
const mon=MONSTER_DB[monId];
if(!mon)return null;
const d=skill.dmg;
let lo,hi;
if(skill.fixedDmg)lo=hi=skill.fixedDmg;
else if(d){
if(input===undefined)input=solverDamageInput(skill,stats);
lo=!d.m||d.b===d.m?d.b:d.b+Math.floor((input-d.lo)*(d.m-d.b)/(d.hi-d.lo));
hi=lo+d.s;lo-=d.s;
}else{
const weapon=equip||solverDefaultEquip(skill),w=SOLVER_WEAPON_INFO[weapon];
if(!w||!w.ready)return null;
if(w.fixedDmg)return{min:w.fixedDmg,max:w.fixedDmg,pre:null,plus1Eff:0};
const atk=stats&&stats.atk!==undefined?Number.isInteger(stats.atk)&&stats.atk>=solverStatMin('atk',weapon)&&stats.atk<=999?stats.atk:null:deriveSolverAtk(stats&&stats.str,weapon,stats&&stats.atkOverride,skill);
if(atk===null)return null;
const r=atkDecay(skill,calcPhysicalDamageRange(atk,mon.s[2],skill.mul),n);
lo=r.min;hi=r.max;
}
const typeMul=solverTypeMul(skill,equip,mon);
if(typeMul!==1){lo=Math.floor(lo*typeMul);hi=Math.floor(hi*typeMul);}
const pre=skill.fixedDmg?null:{min:lo,max:hi};
lo=applyElementAndFource(lo,skill,monId,fourceEls);hi=applyElementAndFource(hi,skill,monId,fourceEls);
if(lo>0&&METAL_ONLY_WEAPONS.has(equip)&&!isMetalHex(monId))return null;
return{min:lo+plus1Eff,max:hi+plus1Eff,pre,plus1Eff:plus1Eff||0};
}
function solverActionDamage(sk,hex,fEls,r,hits,mul,lv){
const min=r.min*hits,max=r.max*hits,head=(hits-1)*Math.floor(r.max*mul);
if(!(mul>1))return{min,max,head};
const metal=solverFieldMetal&&isMetalHex(hex),flat=metal?0:tensionFlat(mul,lv);
if(!metal&&r.pre){
const pre=r.pre,eff=r.plus1Eff||0,el=x=>applyElementAndFource(x,sk,hex,fEls);
return{min:el(Math.floor(pre.min*hits*mul)+flat)+eff*hits,max:el(Math.floor(pre.max*hits*mul)+flat)+eff*hits,head:hits>1?el(Math.floor(pre.max*(hits-1)*mul)+flat)+eff*(hits-1):0};
}
return{min:min>0?Math.floor(min*mul)+flat:min,max:max>0?Math.floor(max*mul)+flat:max,head:head+flat};
}
function skillDamagePerHit(sk,action,hex,stats,fourceEls,n){
if(solverFieldMetal&&isMetalHex(hex)){const chip=metalChipPerHit(sk,action.equip);return{min:chip.min,max:chip.max,metal:true};}
const r=calcSkillDamageCache(sk,stats,hex,fourceEls||null,actionPlus1(sk,action.equip),action.equip,n);
return r?{min:r.min,max:r.max,metal:false,pre:r.pre,plus1Eff:r.plus1Eff}:{min:0,max:0,metal:false,none:true};
}
function solverActionDamageOrders(action,sk,hits,actor,hexes,total,fEls){
const last=atkDecay(sk)?Math.min(total,5):1;
const pool=_solverGoldState&&(_solverGoldState.damageOrders||(_solverGoldState.damageOrders=new Map()));
const forms=pool&&solverMapEntry(solverMapEntry(pool,sk),JSON.stringify([action.equip||'',hits,hexes,last,fEls]));
const input=forms&&actor?solverDamageInput(sk,actor.stats):undefined;
const saved=forms&&forms.get(input);
if(saved)return saved;
const orders=[],eff=actionPlus1(sk,action.equip);
for(let n=1;n<=last;n++){
const dmg={},dmgF={};
for(const hex of hexes){
if(!MONSTER_DB[hex]||!actor&&!(solverFieldMetal&&isMetalHex(hex)))dmg[hex]=dmgF[hex]={min:0,max:0};
else if(solverFieldMetal&&isMetalHex(hex)){const hit=skillDamagePerHit(sk,action,hex,null,null);dmg[hex]=dmgF[hex]={min:hit.min*hits,max:hit.max*hits,hit};}
else{
const hit=skillDamagePerHit(sk,action,hex,actor.stats,null,n);
dmg[hex]=hit.none?{min:0,max:0}:{min:hit.min*hits,max:hit.max*hits,hit};
const lit=fEls&&calcSkillDamageCache(sk,actor.stats,hex,fEls,eff,action.equip,n);
dmgF[hex]=lit?{min:lit.min*hits,max:lit.max*hits,hit:lit}:dmg[hex];
}
}
orders.push({dmg,dmgF});
}
if(forms)forms.set(input,orders);
return orders;
}
function solverDamageInput(sk,st){
const d=sk.dmg;
return sk.fixedDmg?0:d?(!d.m||d.b===d.m?0:Math.max(d.lo,Math.min(getDamageStat(d.st,st),d.hi))):st.atk!==undefined?st.atk:(st.str||0)+'|'+(st.atkOverride===undefined?'':st.atkOverride);
}
function solverMinimumDamageBound(action,hexId,chars,fource,priority){
const sk=lookupSkill(action.jp),dm=sk&&sk.dmg;
if(!sk||!(action.at>0)||action.equip==='miss'||isSolverNonDamageRemoval(action)||dm&&dm.m&&dm.m!==dm.b&&(!(dm.m>=dm.b)||!(dm.hi>dm.lo)||!DMG_STAT[dm.st]))return{chip:0,removal:0};
const mon=MONSTER_DB[hexId],hp=mon&&mon.s[0],limit=hp&&monHpMin(hp),known=solverMapEntry(_solverMinimumDamageBasis,sk);
const statsKey=chars?solverMapEntry(_solverPartyKeys,chars,()=>JSON.stringify(chars.map(c=>c.stats))):priority||null;
const lows=solverMapEntry(_solverDmgCache.search.guaranteed,statsKey),lowKey=sk.id+'|'+hexId+'|'+(action.equip||'')+'|'+(action.needle?1:0)+'|'+(fource===undefined?'*':fource||'')+(priority===undefined?'':'|fixed');
let low=lows.get(lowKey);
if(low===undefined){
const party=chars&&chars.map(c=>c.stats);
const forms=priority!==undefined||action.equip||action.needle?[action]:[action,...getSkillEquipOpts(action.jp,hexId).map(o=>({...action,...o}))];
const forces=fource===undefined?[null,...Object.values(FOURCE_EL)]:fource?[null,fource]:[null];
const points=equip=>{
if(party)return party;
if(sk.dmg||sk.fixedDmg)return[MIN_STATS];
const lo=solverStatMin('atk',equip,priority),def=mon.s[2];
return[...new Set([lo,Math.floor(def/2)+1,Math.floor(def/1.75)+1].map(atk=>Math.max(lo,Math.min(999,atk))))].map(atk=>({...MIN_STATS,atk}));
};
low=Infinity;
for(const form of forms)for(const force of forces){
const eff=actionPlus1(sk,form.equip),key=JSON.stringify([hexId,form.equip||'',eff,force,statsKey]);
let value=known.get(key);
if(value===undefined){
value=Infinity;
for(const st of points(form.equip)){
const d=calcSkillDamageCache(sk,st,hexId,force,eff,form.equip);
if(!d||!Number.isFinite(d.min)||!Number.isFinite(d.max)||d.max<0){value=0;break;}
if(d.max<value)value=d.max;
}
if(!Number.isFinite(value))value=0;
known.set(key,value);
}
if(value<low)low=value;
}
lows.set(lowKey,low);
}
const hits=SolverActionGate.hits(action),chip=low*hits,head=low*Math.max(0,hits-1);
return Object.freeze({chip,removal:head>=limit?2:chip>=limit?1:0});
}
function NEUTRAL_PARTY(){const agi=solverStatMin('agi');return[0,1,2,3].map(i=>({stats:{...EXT_STATS},agi:agi+3-i,lv:99,job:12,slot:i+1}));}
function solverConditionPartyDomainOK(party){
const statsOn=solverUseStatsEnabled(),inRange=(v,lo)=>Number.isInteger(v)&&v>=lo&&v<=999;
return party.every(c=>c.stats&&SOLVER_STAT_FIELDS.every(f=>f.solverOnly&&statsOn?c.stats[f.key]===undefined:inRange(f.actor?c[f.key]:c.stats[f.key],f.min))&&(c.stats.atkOverride===undefined||inRange(c.stats.atkOverride,0)));
}
function maxCharLv(chars){return chars&&chars.length?Math.max(...chars.map(c=>c&&c.lv||99)):99;}
function actorAt(chars,assign,ci){return chars?chars[assign?assign[ci]:chars.length?ci%chars.length:ci]:undefined;}
function actorLv(chars,assign,ci){const c=actorAt(chars,assign,ci);return c&&c.lv?c.lv:maxCharLv(chars);}
function readCharStatsFromDom(){
if(!solverUseStatsEnabled())return NEUTRAL_PARTY();
const v=id=>{const el=byId(id);return el?(el.validity&&el.validity.badInput?'NaN':el.value):undefined;};
const chars=[1,2,3,4].map(i=>{
const{agi,...stats}=Object.fromEntries(SOLVER_INPUT_FIELDS.map(f=>[f.key,Number(v('si_'+f.dom+i))]));
const atk=v('si_atk'+i),job=v('si_job'+i);
if(atk!==undefined&&atk.trim()!=='')stats.atkOverride=Number(atk);
return{stats,agi,lv:parseInt(v('si_t'+i))||99,job:job===undefined||job===''?null:parseInt(job),slot:i};
});
if(!solverConditionPartyDomainOK(chars))throw new RangeError(T('Invalid character stats.','角色能力不合法。','能力値が不正です。'));
return chars.sort(solverOrder.agi);
}
function solverUseStatsEnabled(){return solverFlag('si_useStats');}
function getSkillClassLock(action){const sk=lookupSkill(action.jp);return sk&&sk.cat==='spell'&&Array.isArray(sk.cls)?sk.cls:null;}
function solverActorSlotOK(k,actor,job,locks,pri,state){
const sameRound=k%SOLVER_ROUND_SIZE,used=sameRound?state&15:0,bit=1<<actor,lock=locks[k];
if(used&bit||sameRound&&pri[k]===pri[k-1]&&actor<(state>>4&3))return-1;
const shift=6+actor*3;
let history=state&~63;
if(lock){
if(job===12){
if(k<SOLVER_ROUND_SIZE)history|=(k+1)<<shift;
else{
const previous=(state>>shift&7)-1;
if(previous>=0&&!locks[previous].some(job=>lock.includes(job)))return-1;
}
}else if(job===null||!lock.includes(job))return-1;
}
return history|actor<<4|used|bit;
}
function forEachSolverAssignment(combo,chars,visitor){
const N=chars.length,n=combo.length,locks=combo.map(getSkillClassLock),pri=combo.map(_actionPri),swap=combo.findIndex(v=>v.priSwap);
const fixed=!combo.some(v=>v.jp==='おうえん'),lead=combo.some(v=>v.priSwap||weaponMetaValue(v.equip,'pri')),pick=[];
let stopped=false,cut=n;
const walk=state=>{
const k=pick.length;
if(k===n){
if(swap>=0&&!solverWeaponPurposeOK(combo[swap],null,[],null,pick,swap))return;
const last=visitor(pick.slice());
if(last===true)stopped=true;
else if(fixed&&Number.isInteger(last)&&last>=0)cut=lead?solverRoundStart(last)+SOLVER_ROUND_SIZE-1:last;
return;
}
for(let i=0;i<N&&!stopped;i++){
const next=solverActorSlotOK(k,i,chars[i].job,locks,pri,state);
if(next<0)continue;
pick.push(i);walk(next);pick.pop();
if(cut<k)break;
cut=n;
}
};
walk(0);
return stopped;
}
function searchSolverAssignments(search,combo,sig,tensionMul,fourceEls,accept){
const entry={best:null,last:-1,kills:accept?null:new Set()};
const state=_solverGoldState;
{
const{hexId,mon,targets,chars,bat}=search;
const n=combo.length,shared=tensionMul===1&&!combo.some(v=>v.jp==='おうえん');
let find=()=>null,note=()=>{},inputs=()=>null;
if(shared){
const segs=sig.split('\x1e'),pri=combo.map(v=>!!(v.priSwap||weaponMetaValue(v.equip,'pri')));
const fEls=getFourceEls(combo,fourceEls),lit=fEls&&fEls.length?fEls:null;
const actions=solverMapEntry(search.actorInputs||(search.actorInputs=new Map()),lit),classes=combo.map((v,ci)=>solverMapEntry(actions,segs[ci],()=>{
const sk=lookupSkill(v.jp),hexes=buildSimInstances(targets,true).uniqueHexes,first=new Map();
return chars.map((c,i)=>solverMapEntry(first,JSON.stringify([sk&&solverActionDamageOrders(v,sk,SolverActionGate.hits(v),c,hexes,5,lit),v.jp==='みのがす'?actorLv(chars,[i],0):0,hexes.map(hex=>solverKillerFormOK(v,hex,c&&c.stats))]),()=>i));
})),whole=new Map();
inputs=assign=>{
let code=0;
return assign.map((a,ci)=>code=code*(3*chars.length)+3*classes[ci][a]+(pri[ci]?solverOutrunsLater(assign,ci)?1:2:0));
};
const memo=solverMapEntry(solverMapEntry(search.prefixFails||(search.prefixFails=new Map()),fourceEls),combo[n-1].jp==='みのがす');
const spans=[],prefixes=[],lengths=[];
for(let ci=0,lead=false;ci<n-1;ci++){
lead=pri[ci]||ci%SOLVER_ROUND_SIZE!==0&&lead;
const len=spans[ci]=lead?Math.min(solverRoundStart(ci)+SOLVER_ROUND_SIZE,n):ci+1;
if(len<n&&!prefixes[len]){lengths.push(len);prefixes[len]=segs.slice(0,len).join('\x1e')+'\x1d';}
}
find=ids=>{for(const len of lengths){const hit=memo.get(prefixes[len]+ids[len-1]);if(hit)return hit;}return whole.get(ids[n-1])||null;};
note=(ids,L,kills,failed)=>{
const len=spans[L];
if(len<n){const key=prefixes[len]+ids[len-1];if(!memo.has(key))memo.set(key,{last:L,kills:[...kills]});}
else if(failed)whole.set(ids[n-1],{last:Number.isInteger(L)?L:Infinity,kills:[...kills]});
};
}
const proofOf=(value,out,assign)=>accept?value:verifySolverConditionParty(combo,targets,hexId,bat,chars,assign,tensionMul,fourceEls,out.eggAssign,true,out,value);
let resumes;
forEachSolverAssignment(combo,chars,assign=>{
const ids=inputs(assign),known=find(ids);
if(known){
if(entry.kills)for(const i of known.kills)entry.kills.add(i);
entry.last=Math.max(entry.last,known.last);
return known.last;
}
const out=accept?{accept}:{},seen=new Set(),previous=raceMulKills;
raceMulKills={c:combo,k:seen};
let result;
try{
result=accept?verifySolverConditionParty(combo,targets,hexId,bat,chars,assign,tensionMul,fourceEls,undefined,true,out)
:checkSolverDamage(combo,hexId,mon,targets,tensionMul,fourceEls,out,assign,undefined,chars,{bat,captureActions:true});
}finally{raceMulKills=previous;}
note(ids,out.rejectLast,seen,!result&&!out.resume);
if(entry.kills)for(const i of seen)entry.kills.add(i);
let last=out.rejectLast;
if(out.resume){
const resume=out.resume;
(resumes||(resumes=[])).push(()=>{
const value=resume();
if(!value)return null;
const battleProof=proofOf(value,out,assign);
return battleProof&&{rating:battleProof.rating,assign:battleProof.assign,eggAssign:battleProof.eggAssign,battleProof};
});
if(!accept)last=Infinity;
}else if(result){
const rating=accept?result.rating:result;
if(accept)solverNoteGold(rating);
if(!entry.best||getRankOrderValue(rating)>getRankOrderValue(entry.best.rating)){
entry.best={rating,assign:accept?result.assign:assign,eggAssign:out.eggAssign||null,battleProof:proofOf(result,out,assign)};
}
}
entry.last=Math.max(entry.last,last==null?Infinity:last);
return entry.best&&entry.best.rating==='gold'||last;
});
if(!resumes||solverGoldFound()||accept&&entry.best)return entry;
state.maybeOrange=true;
(state.fixedOrange||(state.fixedOrange=new Map())).set(entry,resumes);
}
entry.resume=()=>{
const jobs=state.fixedOrange,list=jobs&&jobs.get(entry);
if(list){
jobs.delete(entry);
for(const job of list){entry.best=job();if(entry.best)break;}
}
return entry.best;
};
return entry;
}
function findBestAssignment(combo,search,tensionMul=1,fourceEls=null){
const{forms,byTension}=search;
const results=solverMapEntry(solverMapEntry(byTension,tensionMul),fourceEls);
const sig=solverComboFacts(combo,forms,false).sig;
const goldOnly=solverGoldFound(),noProof=search.noProof||(search.noProof={rating:null,assign:null,eggAssign:null});
let row=results.get(sig);
if(row===undefined){
const gate={};
let last=-1,kills,pruned=!solverCandidateStructureOK(combo,{targets:search.targets},gate);
if(pruned){
last=gate.rejectLast;
if(gate.blockLast!==undefined){
const block=search.blocked||(search.blocked=[new Map(),new Map()]);
let node=block[+(combo[combo.length-1].jp==='みのがす')];
for(let ci=0;node!==true&&ci<gate.blockLast;ci++)node=solverMapEntry(node,solverBlockForm(combo[ci]).key);
if(node!==true)node.set(solverBlockForm(combo[gate.blockLast]).key,true);
}
}else{
last=solverGenericCounterpartKeys(combo,solverComboFacts(combo,forms),results,goldOnly);
pruned=last!==Infinity;
}
if(!pruned){
const result=searchSolverAssignments(search,combo,sig,tensionMul,fourceEls);
if(result.best||result.resume)row=result;
else{last=result.last;kills=result.kills;}
}
if(!row){
row=(Number.isFinite(last)?last+1:15)+(pruned?0:16);
let place=32;
if(kills)for(const i of kills){row+=(i+1)*place;place*=16;}
}
results.set(sig,row);
}
if(typeof row==='number'){
if(raceMulKills&&raceMulKills.c===combo)for(let k=Math.floor(row/32);k;k=Math.floor(k/16))raceMulKills.k.add(k%16-1);
return noProof;
}
if(raceMulKills&&raceMulKills.c===combo)for(const i of row.kills)raceMulKills.k.add(i);
if(row.best&&(!goldOnly||row.best.rating==='gold'))return row.best;
if(row.resume&&!goldOnly&&_solverGoldState&&_solverGoldState.orange){
const best=row.resume();
if(best)return best;
}
return row.resume&&!goldOnly?{...noProof,resume:row.resume}:noProof;
}
function findBestOrderedAssignment(combo,search,tensionMul=1,fourceEls=null,floor=null,visit=null){
const metal=solverFieldMetal&&isMetalHex(search.hexId);
let pending,originalOrder;
const keyOf=metal?v=>v.jp+'|'+(v.equip||'')+'|'+(v.hits||0)+'|'+v.at+'|'+(v.tgtGroup!==undefined?v.tgtGroup:''):v=>solverComboActionSignature([v],true);
const metalCompanions=!metal&&solverFieldMetal&&solverMetalCompanionCount()>0,execLast=c=>!metalCompanions||solverMetalExecutionsLast(c,true);
const hasPriority=combo.some(_actionPri);
const fin=solverFinalActionIndex(combo,true),clear=new Set(visit&&!metal&&search.targets&&groupTotal(search.targets)===1?combo.filter((v,i)=>{if(!(v.at>0))return false;const t=combo.slice();t[i]=combo[fin];t[fin]=v;return!solverCandidateStructureOK(t,{targets:search.targets});}):[]);
const r=permuteComboSlots(combo,metal?v=>v.at>0&&!isMetalExecutionAction(v):v=>v.at>0,keyOf,(nc,prev)=>{
if(metal&&visit)return visit(nc)?{done:true}:prev;
if(clear.has(nc[fin])||hasPriority&&!priOrderOK(nc))return prev;
if(!metal&&!execLast(nc))return visit?{done:false}:prev;
if(visit)return{done:visit(nc)};
const best=metal?findBestAssignment(nc,search):findBestAssignment(nc,search,tensionMul,fourceEls);
if(!metal&&!originalOrder&&nc.every((v,i)=>v===combo[i]))originalOrder=nc;
if(best.resume&&(!floor||floor(nc)<2))(pending||(pending=[])).push({combo:nc,resume:best.resume});
return!best.rating||floor&&getRankOrderValue(best.rating)<=floor(nc)||prev&&getRankOrderValue(best.rating)<=getRankOrderValue(prev.best.rating)?prev:{combo:nc,best,done:best.rating==='gold'};
},visit?null:search.chars,visit?null:search.frontiers||(search.frontiers=new Map()),!metal&&!visit&&search.blocked&&search.blocked[+(combo[combo.length-1].jp==='みのがす')],visit&&!metal&&!search.chars&&search.targets?groupTotal(search.targets)-combo.some(isSolverNonDamageRemoval):-1);
if(visit){if(!metal&&!r&&execLast(combo))visit(combo);return r;}
if(r)return metal?r:{combo:r.combo,best:r.best};
const best=metal?null:findBestAssignment(originalOrder||combo,search,tensionMul,fourceEls);
if(!pending)return metal?null:{combo,best};
return{combo,best:best||{rating:null},pending,resume:()=>{
for(const job of pending){
if(floor&&floor(job.combo)>=1)continue;
const proof=job.resume();
if(proof)return{combo:job.combo,best:proof};
}
return null;
}};
}
function solverMercyLvReached(mon,casterLv){const need=mon.s[13]+7;return!(need>casterLv);}
function solverInsertMercy(c,k){return[...c.slice(0,k),ACT_MERCY,...c.slice(k)];}
function solverMercyChipPrefixOK(actionResults){
const mercy=actionResults&&actionResults.find(r=>r.kind==='mercy');
return!!mercy&&mercy.targets.length>0&&mercy.remaining.length>0&&actionResults.every(r=>r.ci>=mercy.ci||r.targets.every(t=>t.outcome==='alive'));
}
function solverMercyIndex(combo,alternativesFor){
if(alternativesFor&&(alternativesFor.planType!=='mercy_first'||combo.some(v=>v.metalFirst)))return-1;
return combo.findIndex(v=>v.jp==='みのがす');
}
function solverMercyPlacements(combo,walk,round){
const initial=round!==undefined,old=solverMercyIndex(combo,initial?null:walk);
if(!initial&&(!walk||old<0))return[];
const c=initial?combo:combo.filter(v=>v.jp!=='みのがす');
if(!initial)round=old<SOLVER_ROUND_SIZE?1:2;
const metalFirst=initial&&c.some(v=>v.metalFirst),targets=!initial&&walk.killTargets;
let canonical=round===2?SOLVER_ROUND_SIZE:c[0]&&c[0].supTarget?1:0;
if(metalFirst){canonical=0;while(canonical<c.length&&isMetalExecutionAction(c[canonical]))canonical++;}
const out=[];
if(c.length<SOLVER_MAX_ACTIONS&&(initial?old<0:!(walk.postAlive<=0||targets&&targets[0]&&targets[0].death>0))){
const execution=c.findIndex(v=>solverFieldMetal&&isMetalExecutionAction(v)||v.jp==='ザラキーマ');
const lo=round===2&&!metalFirst?SOLVER_ROUND_SIZE:0;
const hi=Math.min(c.length-1,round===2||metalFirst?SOLVER_MAX_ACTIONS-1:SOLVER_ROUND_SIZE-1,!metalFirst&&execution>=0?execution:c.length-1);
const slots=[canonical];
if(!metalFirst)for(let slot=lo;slot<=hi;slot++)if(slot!==canonical)slots.push(slot);
for(const slot of slots){
if(slot<lo||slot>hi||!initial&&slot===old)continue;
const trial=solverInsertMercy(c,slot);
if(targets&&trial.some((v,i)=>v.tgtGroup!==undefined&&(!targets[v.tgtGroup]||i>slot&&walk.mercyCertain&&walk.mercyCertain[v.tgtGroup])))continue;
if(!priOrderOK(trial)||targets&&!solverCandidateStructureOK(trial,walk))continue;
out.push(trial);
if(initial)break;
}
}
if(!initial)return out;
if(!out.length)out.push(solverInsertMercy(c,canonical));
return solverCandidateStructureOK(out[0],walk)?out:solverMercyPlacements(out[0],walk);
}
function solverMercyCanRemove(inst,casterLv){
const mon=inst.alive&&!(inst.death<=0)&&MONSTER_DB[inst.hex];
return!!mon&&!(mon.s[12]<=0)&&solverMercyLvReached(mon,casterLv);
}
function solverRecoverMercy({walk,mercyTrials,assignmentSearch},combo,walkOrders,prove){
if(solverMercyIndex(combo,walk)<0)return null;
const{killTargets}=walk;
const seen=new Set();let budget=216,best=null,pending;
const visit=order=>{
for(const trial of solverMercyPlacements(order,walk)){
const key=solverComboActionSignature(trial,true);
if(seen.has(key))continue;seen.add(key);
if(budget--<=0)return solverSearchCapped(true);
if(prove){if(prove(trial,solverMercyChipPrefixOK))return true;continue;}
let found=mercyTrials.get(key);
if(found===undefined){
const ordinary=assignmentSearch.byTension.get(1),plain=ordinary&&ordinary.get(null),known=plain&&plain.get(key);
if(typeof known==='number'&&(known&16))continue;
const gold=known&&known.best&&known.best.rating==='gold'&&known.best.battleProof&&solverMercyChipPrefixOK(known.best.battleProof.actionResults)?known.best:null;
found=gold;
if(!gold&&solverCandidateStructureOK(trial,{targets:killTargets})){
const result=searchSolverAssignments(assignmentSearch,trial,key,1,null,solverMercyChipPrefixOK);
found=result.best||(result.resume?result:null);
}
mercyTrials.set(key,found);
}
if(found&&found.resume){
(pending||(pending=[])).push({combo:trial,resume:found.resume});
continue;
}
if(found&&(found.rating==='gold'||!solverGoldFound())&&(!best||getRankOrderValue(found.rating)>getRankOrderValue(best.best.rating)))best={combo:trial,assign:found.assign,best:found};
if(best&&best.best.rating==='gold')return true;
}
return false;
};
if(!visit(combo)){
if(walkOrders)walkOrders(visit);
else findBestOrderedAssignment(combo,assignmentSearch,1,null,null,visit);
}
if(best||!pending)return best;
return{resume:()=>{
for(const job of pending){
const proof=job.resume();
if(proof)return{combo:job.combo,assign:proof.assign,best:proof};
}
return null;
}};
}
function buildKmcRootSpace(spec,space,rootIdx,once,headSearch){
const combos=[],finishers=[],sSkills=spec.order.variants,root=sSkills[rootIdx];
if(!solverRootInSpace(root,space,rootIdx))return{root:rootIdx,combos,finishers};
const targets=spec.fieldHexes||(spec.hexId?[spec.hexId]:null),fource=spec.kmcFourceAction,multi=solverMultiPlayerEnabled();
const full=out=>solverSearchCapped(out.length>=space.cap),done=()=>full(combos)&&(!space.random||full(finishers));
const ok=c=>c.length>=space.loLen&&c.length<=space.hiLen&&(multi||!isMultiTargetOnly(c))&&(spec.walk.isMetal||!solverFieldMetal||solverMetalSupOK(c))&&solverCandidateStructureOK(c,spec.walk);
const push=(out,c)=>{if(ok(c)&&!full(out))out.push(c);},extra=[];
const benefits=new Map();
const bestBenefit=list=>{
let best=0;
for(const action of list){
let benefit=benefits.get(action);
if(benefit===undefined){
benefit=solverEggCanBenefit(action,targets)?fource&&solverEggCanBenefit(action,targets,null,1)?2:1:0;
benefits.set(action,benefit);
}
if(benefit===2||benefit===1&&!fource)return benefit;
if(benefit>best)best=benefit;
}
return best;
};
let tails=null,tailShape=null;
if(spec.maxPostAlive>0){
const state=_solverDmgCache.search,context=JSON.stringify([spec.bat,spec.T,spec.postAlive,spec.maxPostAlive,spec.round2Cost,spec.canRound2,spec.hexId,solverApplyBuildContext(),solverBlockRuleEnabled(),solverMultiPlayerEnabled(),DISPLAY_LANG]);
if(state.kmcTailContext!==context){
state.kmcTails.clear();state.kmcTailContext=context;
state.kmcTailShape={maxMonCount:spec.maxPostAlive,hex:spec.hexId,atLimits:{bat:spec.bat,slots:(spec.canRound2?SOLVER_MAX_ACTIONS:SOLVER_ROUND_SIZE)-2}};
}
tails=state.kmcTails;tailShape=state.kmcTailShape;
}
const tailCombos=(target,maxLen,lateOnly)=>{
const key=target+':'+maxLen+':'+lateOnly,known=tails.get(key);
if(known){if(known.incomplete)_solverSearchIncomplete=true;if(known.limited)_solverSearchLimited=true;return known.combos;}
const incomplete=_solverSearchIncomplete,limited=_solverSearchLimited;
_solverSearchIncomplete=false;_solverSearchLimited=false;
try{
const combos=solveBattleCombo(target,spec.postAlive,maxLen,null,{...tailShape,plain:!lateOnly,lateOnly});
tails.set(key,{combos,incomplete:_solverSearchIncomplete,limited:_solverSearchLimited});
return combos;
}finally{_solverSearchIncomplete=incomplete||_solverSearchIncomplete;_solverSearchLimited=limited||_solverSearchLimited;}
};
const append=(out,head,remaining,free,lateOnly,buffs)=>{
if(full(out))return buffs;
const parts=remaining===0?null:tailCombos(remaining,free,lateOnly);
if(parts&&!parts.length)return buffs;
const headMercy=[...head,ACT_MERCY];
for(let i=0,n=parts?parts.length:1;i<n;i++){
const b=parts&&parts[i],bare=b?headMercy.concat(b):headMercy;
push(out,bare);
if(bare.length<space.hiLen){
if(buffs===undefined)buffs=bestBenefit(head);
const tail=b?bestBenefit(b):0,benefit=Math.max(buffs,tail);
const placed=benefit>0?makeEggOnPrefix(1,bare,tail>0?headMercy.length-1:-1):[];
if(benefit>0)push(out,placed[0]);
if(tail>0)push(out,placed[1]);
if(benefit===2)push(out,[fource,...bare]);
if(tail===2)push(out,[...headMercy,fource,...b]);
for(let k=tail>0?2:1;k<placed.length;k++)if(ok(placed[k]))extra.push(placed[k]);
}
if(parts&&full(out))break;
}
return buffs;
};
const visit=(start,head,sum)=>{
if(done())return;
const remaining=space.target-sum,free=space.hiLen-head.length-1;
if(headSearch&&!headSearch.reachesDepth(spec.maxPostAlive>0?0:start,remaining,Math.max(0,space.loLen-head.length-2),free))return;
const headOnly=spec.postAlive===0&&remaining===0;
if(headOnly||spec.maxPostAlive>0&&remaining>0&&free>=1){
const buffs=append(combos,head,remaining,free,false);
if(!headOnly&&space.random&&free>=2)append(finishers,head,remaining,free,true,buffs);
}
if(free<1)return;
for(let k=spec.order.sequence?0:start;k<sSkills.length;k++){
const i=spec.order.sequence?spec.order.sequence[k]:k;
if(i<start||sum+sSkills[i].at>space.target||solverOnceClash(once,sSkills[i],head))continue;
head.push(sSkills[i]);visit(i,head,sum+sSkills[i].at);head.pop();
if(done())return;
}
};
visit(rootIdx,[root],root.at);
return{root:rootIdx,combos,finishers,extra};
}
function renderKathwackPlan(monId,monGroups,chars){
const groups=monGroups&&monGroups.length?monGroups:monId?[{hex:monId,count:1}]:[];
const might=Math.max(...chars.map(c=>c.stats.might||0)),full=799,baseAcc=Math.min(100,75+Math.max(0,might-200)*25/(full-200));
const shown=mergeSameSpeciesGroups(groups).merged,multi=shown.length>1||shown[0]&&shown[0].count>1;
let html='<div style="font-size:10px;margin-left:16px;"><span style="color:#ccc;">'+solverDisplayName(lookupSkill(18))+'</span> '
+'<span style="color:'+(baseAcc>=100?'#4f4':'#0ff')+';font-size:9px;">'+getStatLabel('might')+'='+might+' → '+solverPercent(baseAcc)+'</span>';
let wipe=1,anyRes=false;
for(const g of shown){
const res=MONSTER_DB[g.hex].s[12],eff=baseAcc*res/100;
wipe*=Math.pow(eff/100,g.count||1);
if(res<100)anyRes=true;
if(res<100||multi)html+=' <span style="color:#f80;font-size:9px;">'+(multi?mergedSpeciesLabel(g)+' ':'')+'×d='+res+' → '+solverPercent(eff)+'</span>';
}
if(multi)html+=' <span style="color:#ff0;font-size:9px;">'+L12+'≈'+solverPercent(wipe*100)+'</span>';
if(baseAcc<100)html+=' <span style="color:#888;font-size:9px;">('+(anyRes?L18:'100%')+': '+getStatLabel('might')+'≥'+full+')</span>';
return html+'</div>';
}
function makeEggOnPrefix(n,combo,mercyAt,limit,multiPlayer){
if(n===null){
const tiers=[];
for(const tier of TENSION){
if(combo.length+tier.eggs>limit)break;
const multiOnly=isMultiTargetOnly(combo,ACT_EGG,tier.eggs);
if(!multiPlayer&&multiOnly)break;
tiers.push({...tier,multiOnly});
}
return tiers;
}
const eggs=Array(n).fill(ACT_EGG);
if(!combo)return eggs;
const out=[[...eggs,...combo]];
if(mercyAt>=0&&mercyAt<combo.length-1)out.push([...combo.slice(0,mercyAt+1),...eggs,...combo.slice(mercyAt+1)]);
if(n>0&&combo.length>SOLVER_ROUND_SIZE&&mercyAt!==SOLVER_ROUND_SIZE-1)out.push([...combo.slice(0,SOLVER_ROUND_SIZE),...eggs,...combo.slice(SOLVER_ROUND_SIZE)]);
return out;
}
function solverEggCanBenefit(action,targets,damage,fource,mainOnly){
const sk=action&&action.at>0&&lookupSkill(action.jp);
if(!solverEggDamageAction(action,sk)||fource&&sk.el)return false;
if(!targets)return true;
const kind=SolverActionGate.targetKind(sk),anyGroup=kind!=='S'&&kind!=='G'||action.tgtGroup===undefined;
return targets.some((t,i)=>{
if(!t||t.count===0||mainOnly&&t.groupIdx!==0)return false;
const hex=t.hex||t;
return!(solverFieldMetal&&isMetalHex(hex))&&(anyGroup||action.tgtGroup===(t.groupIdx===undefined?i:t.groupIdx))&&(!damage||!!damage[hex]&&damage[hex].min>0);
});
}
function solverEggDamageAction(action,sk=action&&action.at>0&&lookupSkill(action.jp)){return!!sk&&!(solverFieldMetal&&isMetalExecutionAction(action))&&sk.el!==12&&!sk.fixedDmg&&!weaponMetaValue(action.equip,'fixedDmg');}
function solverEggPass(v){return v.jp==='おうえん'||v.jp==='ザラキーマ'||findInlineFource([v]);}
function solverEggCanReach(combo,eggCI,targetCI,assign,chars){
const egg=combo[eggCI];
if(!egg||egg.jp!=='おうえん'||targetCI<=eggCI||!solverEggDamageAction(combo[targetCI]))return false;
const who=actorAt(chars,assign,targetCI);
if(who===actorAt(chars,assign,eggCI))return false;
for(let ci=eggCI+1;ci<targetCI;ci++)if(actorAt(chars,assign,ci)===who&&!solverEggPass(combo[ci]))return false;
return true;
}
function buildSolverEggAssignments(eggCIs,dmgCIs,canReach,forcedAssign){
if(!eggCIs.length)return[{eggAssign:null,eggTargets:{}}];
const forced=forcedAssign!==undefined;
if(forced&&(!forcedAssign||Object.keys(forcedAssign).some(ci=>!dmgCIs.includes(+ci)||!TENSION.some(t=>t.mul===forcedAssign[ci]))))return[];
const results=[],seen=new Set(),counts={},targets={},reach=eggCIs.map(egg=>dmgCIs.filter(ci=>canReach(egg,ci)));
const matches=assign=>{const keys=Object.keys(forcedAssign);return keys.length===Object.keys(assign).length&&keys.every(ci=>forcedAssign[ci]===assign[ci]);};
const recurse=idx=>{
const key=idx+':'+dmgCIs.map(ci=>counts[ci]||0).join(',');
if(seen.has(key))return false;
seen.add(key);
if(idx===eggCIs.length){
const eggAssign={};
for(const ci in counts)eggAssign[ci]=getTensionTier(counts[ci]).mul;
if(forced&&!matches(eggAssign))return false;
results.push({eggAssign,eggTargets:{...targets}});
return forced;
}
const egg=eggCIs[idx];
for(const ci of reach[idx]){
const count=(counts[ci]||0)+1;
if(forced&&getTensionTier(count).mul>(forcedAssign[ci]||1))continue;
counts[ci]=count;targets[egg]=ci;
if(recurse(idx+1))return true;
if(--counts[ci]===0)delete counts[ci];
delete targets[egg];
}
return false;
};
recurse(0);
const compare=solverOrder.egg(dmgCIs[dmgCIs.length-1],dmgCIs);
return results.sort((a,b)=>compare(a.eggAssign,b.eggAssign));
}
function solverFlag(id){const el=byId(id);return!!(el&&el.checked);}
function solverMultiPlayerEnabled(){return solverFlag('si_multiPlayer');}
function isMultiTargetOnly(combo,action,count=1){
const counts=new Map(),over=(sk,n)=>{if(!sk||!sk.hiden)return false;const c=(counts.get(sk.id)||0)+n;counts.set(sk.id,c);return c>1;};
if(action&&over(lookupSkill(action.jp),count))return true;
for(let ci=0;ci<combo.length;ci++)if(over(lookupSkill(combo[ci].jp),1))return true;
return false;
}
function solverOnceMap(variants){
if(solverMultiPlayerEnabled())return null;
const once=new Map();
for(const v of variants){const sk=lookupSkill(v.jp);if(sk&&sk.hiden)once.set(v,sk.id);}
return once.size?once:null;
}
function solverOnceClash(once,v,list){const id=once?once.get(v):undefined;return id!==undefined&&list.some(u=>once.get(u)===id);}
const solverOrder={
numberDesc:(a,b)=>b-a,
at:(a,b)=>b.at-a.at,
length:(a,b)=>a.length-b.length,
index:(a,b)=>a.index-b.index,
low:(a,b)=>a.lo-b.lo,
agi:(a,b)=>b.agi-a.agi,
prioritySwap:(a,b)=>b.rep-a.rep||b.mul-a.mul,
encounter:(a,b)=>{
const x=a.supports,y=b.supports;
return x.length-y.length||x.length&&(x[0].index-y[0].index||x.length>1&&x[1].index-y[1].index)||0;
},
egg:(fin,slots)=>{
const chips=x=>Object.keys(x).filter(ci=>+ci!==fin).length;
return(a,b)=>{
const diff=chips(a)-chips(b);
if(diff||!slots)return diff||(b[fin]||1)-(a[fin]||1);
for(let i=slots.length-1;i>=0;i--){
const ci=slots[i],mul=(b[ci]||1)-(a[ci]||1);
if(mul)return mul;
}
return 0;
};
},
score:(a,b)=>b.sc-a.sc||a.ord-b.ord,
slots:facts=>(a,b)=>facts.get(a).slots.length-facts.get(b).slots.length,
swap:(a,b)=>a.genericSwap.parts.length-b.genericSwap.parts.length,
proof:rows=>(a,b)=>rows[a].buffCount-rows[b].buffCount||solverOrder.swap(rows[a],rows[b])||b-a,
axis:first=>(a,b)=>first[a]-first[b],
result:useStats=>(a,b)=>{
const fallback=!!a.fallbackKind-!!b.fallbackKind;
if(fallback)return fallback;
if(!useStats){
const rank=getRankOrderValue(b.conditionProof&&b.conditionProof.rating)-getRankOrderValue(a.conditionProof&&a.conditionProof.rating);
if(rank)return rank;
}
const x=a.req,y=b.req;
if(a.combo.length===1&&b.combo.length===1&&x&&y&&x.stat===y.stat&&x.min!==y.min)return x.min-y.min;
return getRankOrderValue(b.kill)-getRankOrderValue(a.kill)||a.moves-b.moves||a.combo.length-b.combo.length
||(b.mainKillCI>=0?b.combo[b.mainKillCI].at:0)-(a.mainKillCI>=0?a.combo[a.mainKillCI].at:0)
||!!a.multiOnly-!!b.multiOnly||(x&&x.min||0)-(y&&y.min||0);
}
};
function solverATOrder(forms,bat,split,hexId,open=false){
const variants=open?forms:expandComboEquipVariants(forms,hexId,true);
let late=variants.length;
while(split&&late>0&&isSolverRandomTargetSkill(lookupSkill(variants[late-1].jp)))late--;
if(variants.some(v=>v.at>=bat))return{variants,late};
const sequence=variants.map((_,i)=>i).sort((a,b)=>(a>=late)-(b>=late)||solverOrder.at(variants[a],variants[b])||a-b);
return{variants,late,sequence};
}
const _actionPri=v=>{const sk=lookupSkill(v.jp);return sk&&sk.pri||v.equip&&weaponMetaValue(v.equip,'pri')||0;};
function priOrderOK(combo){
let prev=combo.length?_actionPri(combo[0]):0;
for(let i=1;i<combo.length;i++){const pri=_actionPri(combo[i]);if(i%SOLVER_ROUND_SIZE&&pri>prev)return false;prev=pri;}
return true;
}
function getRankOrderValue(r){return r==='gold'?2:r==='orange'?1:0;}
function solverFinalActionIndex(combo,damageOnly=false){
if(damageOnly){for(let ci=combo.length-1;ci>=0;ci--)if(combo[ci].at>0)return ci;return undefined;}
const ci=combo.length-1,v=combo[ci];
return v&&(v.at>0||v.jp==='みのがす')?ci:undefined;
}
function solverMainKillCI(actionResults){
let possible=-1;
for(const ar of actionResults||[])if(ar.kind==='damage')for(const t of ar.targets)if(t.groupIdx===0){
if(t.outcome==='ko')return ar.ci;
if(t.outcome==='possible'&&possible<0)possible=ar.ci;
}
return possible;
}
function sortComboByPriority(combo){
if(!combo.some(v=>_actionPri(v)!==0))return combo;
const pri=combo.map(_actionPri);
return combo.map((_,i)=>i).sort((a,b)=>solverRoundStart(a)-solverRoundStart(b)||pri[b]-pri[a]||a-b).map(i=>combo[i]);
}
function finisherLastOrder(arr,fi){return fi==null||fi<0||fi>=arr.length-1?arr:[...arr.slice(0,fi),...arr.slice(fi+1),arr[fi]];}
function makeFinisherGate(combo){
const pri=combo.map(_actionPri),minPri=Math.min(...pri),early=combo.filter(v=>v.earlyKill).length,fin=solverRaceMulIndex(combo);
return fi=>pri[fi]===minPri&&early===(combo[fi].earlyKill?1:0)&&(fin<0||fi===fin);
}
function solverOutrunsLater(assign,ci){return assign.some((a,j)=>j>ci&&j<solverRoundStart(ci)+SOLVER_ROUND_SIZE&&a<assign[ci]);}
function solverPriSwapCombos(combo,hexId,pool,ordered){
const mon=MONSTER_DB[hexId];
if(!mon||solverFieldMetal&&[hexId,...(_solverFieldHexes||[])].some(isMetalHex))return[];
const key=c=>{const s=c.map(v=>solverComboActionSignature([v],true));return(ordered?s:s.filter((x,i)=>c[i].at>0).sort().concat(s.map((x,i)=>c[i].at>0?'':x))).join('\x1d');};
const seen=solverMapEntry(solverPriSwapSeen,pool,()=>new Set(pool.map(key)));
const fast=lookupSkill('しっぷうづき'),fan=[],spear=[],out=[];
combo.forEach((v,i)=>{
const sk=lookupSkill(v.jp);
if(!sk||!(v.at>0)||v.equip||v.needle||v.earlyKill||_actionPri(v))return;
const rep=SOLVER_BASIC_SKILLS.includes(v.jp)?1:0;
for(const eq of SOLVER_PRI_WEAPONS)if(solverWeaponCompatible(sk,eq))fan.push({i,a:{...v,equip:eq,note:WEAPON_META[eq].note,priSwap:true},rep,mul:(sk.mul||1)*solverTypeMul(sk,eq,mon)});
if(v.at===fast.at[0]&&v.jp!==fast.jp)spear.push({i,a:{jp:fast.jp,en:fast.en,at:v.at,equip:'',note:'',hits:1,...(v.tgtGroup!==undefined?{tgtGroup:v.tgtGroup}:{})}});
});
fan.sort(solverOrder.prioritySwap);
for(const{i,a}of[...fan,...spear]){
const c=sortComboByPriority(combo.map((v,j)=>j===i?a:v)),k=key(c);
if(!seen.has(k)){seen.add(k);out.push({combo:c,swapped:a,original:combo[i]});}
}
return out;
}
function permuteComboSlots(combo,slotFilter,keyFn,evalFn,chars,frontiers,blocked,free){
const slots=solverIndicesOf(combo,slotFilter);
if(slots.length<2)return null;
const keys=combo.map(keyFn),duplicates=slots.map((s,i)=>{
let mask=0;
for(let j=0;j<i;j++)if(keys[slots[j]]===keys[s])mask|=1<<j;
return mask;
});
const cur=[],long=slots.length>5,random=(long||chars)&&combo.map(solverRandomLast);
const pri=(long||chars)&&combo.map(_actionPri),fixed=long&&new Set(slots);
const locks=chars&&combo.map(getSkillClassLock),track=chars&&locks.some(Boolean)&&chars.some(c=>c.job!==12),lockAt=track&&locks.slice(),priAt=track&&pri.slice();
const fronts=track&&[[0]],seen=track&&new Set(),jobs=track&&chars.map(c=>c.job),dryCounts=long&&(chars||blocked)&&new Map();
const independent=track&&!jobs.includes(12),words=track&&frontiers&&combo.map((_,i)=>String.fromCharCode((locks[i]?1+locks[i].reduce((mask,job)=>mask|1<<job,0):0)*4+pri[i])),trail=words&&words.slice(),paths=words&&[];
let result=null,left=120,truncated=false;
const rise=free>=0&&[];
const blockPath=blocked&&[blocked],blockKeys=blocked&&combo.map(v=>solverBlockForm(v).key);
const walk=(rest,dry)=>{
const chosen=cur.length-1,start=chosen>=0?slots[chosen]:0;
for(let p=start,end=cur.length<slots.length?slots[cur.length]:combo.length;(track||blocked)&&!dry&&p<end;p++){
if(blocked){
const node=blockPath[p];
const known=node&&node.get(blockKeys[p===start&&chosen>=0?cur[chosen]:p]);
if(known===true){dry=true;break;}
blockPath[p+1]=known;
}
if(!track)continue;
const key=words&&(independent||p<SOLVER_ROUND_SIZE)&&(paths[p+1]=(p%SOLVER_ROUND_SIZE?paths[p]:'')+trail[p]);
let to=key&&frontiers.get(key);
if(!to){
to=[];
seen.clear();
for(const code of fronts[p])for(let i=0;i<jobs.length;i++){
let next=solverActorSlotOK(p,i,jobs[i],lockAt,priAt,code);
if(next<0)continue;
if((p+1)%SOLVER_ROUND_SIZE===0)next&=~63;
if(!seen.has(next)){seen.add(next);to.push(next);}
}
if(key)frontiers.set(key,to);
}
fronts[p+1]=to;
dry=!to.length;
}
if(dry&&!long)return;
if(!rest){
if(rise){
let kept=0;
for(let k=0;k<cur.length;k++){
let len=1;
for(let j=0;j<k;j++)if(cur[j]<cur[k]&&rise[j]>=len)len=rise[j]+1;
rise[k]=len;
if(len>kept)kept=len;
}
if(cur.length-kept>free)return;
}
if(--left<0){truncated=true;solverSearchCapped(true);return;}
if(dry)return;
const nc=combo.slice();
for(let k=0;k<slots.length;k++)nc[slots[k]]=combo[cur[k]];
result=evalFn(nc,result);
return;
}
const pos=slots[cur.length],prev=slots[cur.length-1],next=pos+1;
const before=left,dryKey=dry&&rest*4+(prev===pos-1?pri[cur[cur.length-1]]:0),saved=dry&&dryCounts.get(dryKey);
if(typeof saved==='number'){if((left-=saved)<0){truncated=true;solverSearchCapped(true);}return;}
for(let todo=rest;todo&&!truncated&&!(result&&result.done);){
const bit=todo&-todo,i=31-Math.clz32(bit),source=slots[i];
todo^=bit;
if(rest&duplicates[i])continue;
if(long){
if(pos<combo.length-1&&random[source])continue;
if(pos%SOLVER_ROUND_SIZE&&pri[prev===pos-1?cur[cur.length-1]:pos-1]<pri[source])continue;
if(next<combo.length&&next%SOLVER_ROUND_SIZE&&!fixed.has(next)&&pri[next]>pri[source])continue;
}
cur.push(source);
if(track){lockAt[pos]=locks[source];priAt[pos]=pri[source];if(trail)trail[pos]=words[source];}
walk(rest^bit,dry||chars&&pos<combo.length-1&&random[source]);
cur.pop();
}
if(dry&&!truncated)dryCounts.set(dryKey,before-left);
};
walk((1<<slots.length)-1,false);
return result;
}
function orderSolverEntries(args){
const{useStats,metalFallback,planType,filtered,stop,bat,hexId,_offTargets}=args;
if(!args.flagged){
const seenSig=new Set();
let next=0;
for(const entry of filtered){
const{combo,battleProof}=entry;
entry.actionSig=solverComboActionSignature(combo);
const sig=JSON.stringify(battleProof?[solverComboActionSignature(combo.map(v=>v.tgtGroup===undefined&&!v.priSwap?v:{...v,tgtGroup:undefined,priSwap:undefined})),battleProof]
:[entry.actionSig,entry.eggAssign||{},entry.fallbackKind||'']);
if(seenSig.has(sig))continue;
seenSig.add(sig);
entry.moves=entry.combo.filter(v=>v.at>0||isSolverNonDamageRemoval(v)).length;
if(entry.fallbackKind||window._solverFallback||planType!=='kill_all'&&solverMercyIndex(entry.combo)<0||metalFallback)entry.fallback=true;
filtered[next++]=entry;
}
filtered.length=next;
if(filtered.length)window._solverFallback=filtered.every(e=>e.fallback&&!e.fallbackKind);
args.flagged=true;
if(stop&&stop.on&&filtered.length){stop.late=true;return true;}
}
for(const e of filtered){
if(e.lazyBounds){e.mainKillCI=e.conditionProof.finIdx;continue;}
if(!useStats&&!(solverFieldMetal&&isMetalHex(hexId)))finalizeSolverConditionProof(e,_offTargets,hexId,bat,true);
e.mainKillCI=solverMainKillCI((useStats?e.battleProof:e.conditionProof).actionResults);
}
if(filtered.length>1&&!(solverFieldMetal&&isMetalHex(hexId))){
const mon=MONSTER_DB[hexId],preferred=new Map(),alternatives=new Map();
for(const entry of filtered){
const proof=useStats?entry.battleProof:entry.conditionProof;
if(!proof||!proof.actionResults||!mon)continue;
let parts,context;
for(const result of proof.actionResults){
if(result.kind!=='damage'||!result.targets.some(target=>target.groupIdx===0&&target.outcome==='ko'))continue;
const ci=result.ci,action=entry.combo[ci];
if(!solverPlainForm(action)||weaponMetaValue(action.equip,'fixedDmg'))continue;
const basic=SOLVER_BASIC_SKILLS.includes(action.jp),base=basic?action.jp:solverBasicSkillOf(action),sk=base&&lookupSkill(action.jp);
if(!sk||!isHitBased(sk))continue;
if(!parts){
parts=entry.actionSig.split('');
context=JSON.stringify([proof.rating,proof.assign,proof.eggAssign,proof.eggTargets,proof.roundCost,proof.fallbackKind,
proof.actionResults.map(row=>[row.ci,row.targets.map(target=>target.index)])]);
}
const own=parts[ci];
parts[ci]=base;
const key=context+''+parts.join('');
parts[ci]=own;
const mul=basic?Infinity:(sk.el?mon.s[sk.el]:100)*solverTypeMul(sk,action.equip,mon);
const prior=preferred.get(key);
if(!prior||mul>prior.mul||mul===prior.mul&&sk.id<prior.id)preferred.set(key,{id:sk.id,mul});
if(!basic)solverMapEntry(alternatives,entry,()=>[]).push({id:sk.id,key});
}
}
if(alternatives.size){
let next=0;
for(const entry of filtered){
const ranks=alternatives.get(entry);
if(!ranks||ranks.every(rank=>rank.id===preferred.get(rank.key).id))filtered[next++]=entry;
}
filtered.length=next;
}
}
filtered.sort(solverOrder.result(useStats));
return false;
}
function solverBasicSkillForAT(at){return SOLVER_BASIC_SKILLS.find(jp=>{const sk=lookupSkill(jp);return sk&&sk.at[0]===at;})||null;}
function solverBasicSkillOf(action){
if(!action||!solverPlainForm(action)||SOLVER_BASIC_SKILLS.includes(action.jp))return null;
const sk=lookupSkill(action.jp);
return sk&&!sk.dmg&&!sk.fixedDmg?solverBasicSkillForAT(action.at):null;
}
function solverPlainForm(a){return a.at>0&&!a.needle&&!a.earlyKill&&a.equip!=='miss'&&!(solverFieldMetal&&isMetalExecutionAction(a));}
function solverPlanHeadTier(e,hexId){return(e.fixedForm?4:0)+(e.combo.some(v=>solverBasicSkillOf(v))?2:0)+(solverUsesWeaponMultiplier(e.combo,hexId)?1:0);}
function solverKillerFormOK(action,hex,stats){
const sk=lookupSkill(action.jp),rep=!!sk&&isHitBased(sk)&&solverBasicSkillOf(action);
if(!rep)return true;
const statsOn=solverUseStatsEnabled();
if(statsOn&&!stats)return true;
const known=_solverDmgCache.search.killer,key=JSON.stringify(statsOn?['on',action.jp,action.at,action.equip||'',hex,stats]:[action.jp,action.at,action.equip||'',hex]);
if(known.has(key))return known.get(key);
const basic={jp:rep,at:action.at,equip:action.equip||solverDefaultEquip(sk)},repSk=lookupSkill(rep);
const ok=st=>skillDamagePerHit(sk,action,hex,st,null).min>skillDamagePerHit(repSk,basic,hex,st,null).min;
let found=statsOn&&ok(stats);
if(!statsOn)for(let m=solverStatMin('atk',action.equip);m<=999&&!found;m++)found=ok({...MIN_STATS,atk:m});
known.set(key,found);
return found;
}
const _solverDefaultEquips=new WeakMap();
function solverDefaultEquip(sk){
if(!sk)return'';
let result=_solverDefaultEquips.get(sk);
if(result!==undefined)return result;
result=sk.equip||'';
if(!result&&sk.at[0]!==0&&!((sk.dmg||sk.fixedDmg||sk.el===12)&&!WEAPON_SKILLS[sk.weapon])){
const compatible=Object.keys(WEAPON_META).filter(eq=>solverWeaponCompatible(sk,eq));
result=compatible.find(eq=>WEAPON_META[eq].generic)||compatible[0]||'';
}
_solverDefaultEquips.set(sk,result);
return result;
}
function solverWeaponPurposeOK(action,sk,targets,tables,assign,ci,requirements,sd,on){
const eq=action.equip,fixed=weaponMetaValue(eq,'fixedDmg'),effect=sk&&!fixed?actionPlus1(sk,eq):0;
const basic=!eq||eq==='miss'||weaponMetaValue(eq,'falcon')||fixed;
if(basic&&!(effect&&sk.metal))return true;
let memo,key;
if(sd){
memo=sd.purposes||(sd.purposes=new Map());key=on?'F':'N';
for(const t of targets)key+=','+t.hex;
const row=memo.get(key);
if(row&&(!requirements||row.complete)){if(requirements&&row.terms)requirements.push(row.terms);return row.ok;}
if(effect){const table=tables;tables=targets.map((t,i)=>table(sd,i,on));}
}
const plusTerms=effect&&requirements?[]:null,seen=plusTerms&&new Set();
let plusNeeded=false,metalNeeded=false,valid,requiresPlus=!!(effect&&sk.metal);
if(effect){
for(let i=0;i<targets.length;i++){
const t=targets[i];
if(solverFieldMetal&&isMetalHex(t.hex)){plusNeeded=true;metalNeeded=true;break;}
const row=tables&&tables[i][t.hex],hit=row&&row.hit;
if(!hit||!(hit.plus1Eff>0))continue;
if(hit.min>0&&hit.min<=hit.plus1Eff)plusNeeded=true;
if(requirements&&!seen.has(row)){seen.add(row);plusTerms.push({hex:t.hex,order:i+1,part:'hitmin',op:'le',rhs:hit.plus1Eff});}
else if(!requirements&&plusNeeded)break;
}
if(requiresPlus&&!plusNeeded)return false;
}
if(METAL_ONLY_WEAPONS.has(eq)){
valid=plusNeeded&&targets.length>0&&targets.every((t,i)=>solverFieldMetal&&isMetalHex(t.hex)||!!(tables&&tables[i][t.hex]&&tables[i][t.hex].hit));
requiresPlus=true;
}
else if(basic)valid=true;
else{
if(action.priSwap||weaponMetaValue(eq,'pri')&&!(sk&&sk.pri)){
const moved=!!assign&&solverUseStatsEnabled()&&!(_solverFieldHexes&&solverFieldMetal)&&solverOutrunsLater(assign,ci);
if(action.priSwap||moved)valid=moved;
}
if(valid===undefined){
if(sk&&sk.blk!==0&&solverActionAntiBlock(action)&&targets.some(t=>solverHexBlock(t.hex)>0))valid=true;
else if(targets.some(t=>!(solverFieldMetal&&isMetalHex(t.hex))&&solverTypeMul(sk,eq,MONSTER_DB[t.hex],true)>1))valid=true;
else{valid=solverWeaponAddsPlus1(sk,eq)&&!(solverFieldMetal&&isMetalExecutionAction(action))&&plusNeeded;requiresPlus=true;}
}
}
const terms=valid&&requiresPlus&&!metalNeeded&&plusTerms;
if(terms)requirements.push(terms);
if(memo)memo.set(key,{ok:valid,complete:!!requirements,terms});
return valid;
}
function getSkillEquipOpts(jp,hexId,kind){
const state=_solverDmgCache.search,block=solverBlockRuleEnabled(),key=JSON.stringify([jp,hexId,_solverFieldHexes,block]);
let options=state.equipOptions.get(key);
if(options===undefined){
const sk=lookupSkill(jp),opts=[],field=[hexId,...(_solverFieldHexes||[])],add=(equip,note)=>opts.push({equip,note});
if(sk&&!sk.dmg&&!sk.fixedDmg)for(const hex of field){
const mon=hex&&!(solverFieldMetal&&isMetalHex(hex))&&MONSTER_DB[hex];
if(!mon||mon.s[4]>0&&block)continue;
let generic;
for(const jp in WEAPON_META){const wm=WEAPON_META[jp],cat=WEAPON_CAT_META[wm.cat];if(wm.generic&&cat&&mon.t in(cat.wmul||{}))generic=jp;}
if(generic&&solverWeaponCompatible(sk,generic)&&solverTypeMul(sk,generic,mon,true)>1)add(generic,'('+generic+')');
for(const equip in WEAPON_META)if(weaponMetaValue(equip,'wmul')&&WEAPON_META[equip].wmul[mon.t]&&solverWeaponCompatible(sk,equip)&&solverTypeMul(sk,equip,mon,true)>1)add(equip,'('+equip+')');
}
if(sk&&sk.blk===1&&sk.antiBlk!==false&&solverFieldBlock(field)>0)for(const equip in WEAPON_META)if(weaponMetaValue(equip,'antiBlk')&&solverWeaponCompatible(sk,equip))add(equip,WEAPON_META[equip].note);
if(sk&&sk.blk===1&&solverFieldMetal&&Object.keys(WEAPON_META).some(equip=>weaponMetaValue(equip,'metal')&&solverWeaponAddsPlus1(sk,equip))&&field.some(hex=>hex&&isMetalHex(hex))){
if(SolverActionGate.targetKind(sk)!=='S'){
for(const equip in WEAPON_META)if(weaponMetaValue(equip,'metal')&&!(METAL_ONLY_WEAPONS.has(equip)&&opts.some(o=>METAL_ONLY_WEAPONS.has(o.equip)))&&solverWeaponCompatible(sk,equip))add(equip,WEAPON_META[equip].note);
}else if(!isMetalHex(hexId))for(const row of METAL_PADDING)if(row[0]===jp&&weaponMetaValue(row[3],'metal'))add(row[3],row[4]);
}
const seen=new Set();
options={all:opts.filter(o=>{if(seen.has(o.equip))return false;seen.add(o.equip);const w=WEAPON_META[o.equip];return!(w.generic&&w.cat===sk.weapon);})};
state.equipOptions.set(key,options);
}
let result=options.all;
if(kind==='first')result=options.first||(options.first=result.slice(0,1));
else if(kind==='plain'||kind==='multiplier')result=options[kind]||(options[kind]=result.filter(o=>!!weaponMetaValue(o.equip,'wmul')===(kind==='multiplier')));
return result;
}
function expandComboEquipVariants(combos,hexId,checkOnly=false){
if(!hexId||!MONSTER_DB[hexId])return combos;
const metal=solverFieldMetal&&isMetalHex(hexId),result=[],prepared=new WeakMap();
const targets=(_solverFieldHexes||[hexId]).map((hex,gi)=>({hex,count:_solverGroupCounts?_solverGroupCounts[gi]:1}));
const blockOnly={targets,blockOnly:true},blocked=action=>!solverCandidateStructureOK([action],blockOnly);
const prepare=(action,shut=blocked(action))=>{
const plain=shut?[]:[{action,kind:0}];
const opts=action.at===0||action.equip||action.needle||solverFieldMetal&&isMetalExecutionAction(action)?[]:getSkillEquipOpts(action.jp,hexId,'plain');
const hasGeneric=opts.some(option=>WEAPON_META[option.equip].generic),all=hasGeneric?[]:plain;
for(const option of opts){
const equipped={...action,...option};
if(shut&&blocked(equipped))continue;
if(action.tgtGroup!==undefined&&!action.supTarget&&targets[action.tgtGroup]&&!weaponMetaValue(option.equip,'pri')){
const sk=lookupSkill(action.jp);
if(sk&&!actionPlus1(sk,option.equip)&&!solverWeaponPurposeOK(equipped,sk,[targets[action.tgtGroup]],null,null,0))continue;
}
const generic=!!WEAPON_META[option.equip].generic,choice={action:equipped,kind:generic?2:1};
if(!generic)plain.push(choice);
if(hasGeneric)all.push(choice);
}
return{shut,plain,all,hasGeneric};
};
const formsOf=action=>solverMapEntry(prepared,action,()=>prepare(action));
if(checkOnly)return combos.filter(action=>!blocked(action)||prepare(action,true).all.length>0);
for(const combo of combos){
const forms=combo.map(formsOf);
if(forms.every(form=>!form.shut))result.push(combo);
const hasGeneric=forms.some(form=>form.hasGeneric);
let seen;
for(let mode=1;mode<=(hasGeneric?2:1);mode++){
const slots=forms.map(form=>mode===2?form.all:form.plain),picked=[];
if(slots.some(choices=>choices.length===0))continue;
const last=slots.reduce((index,choices,i)=>choices.some(choice=>choice.kind>=mode)?i:index,-1);
if(last<0)continue;
const enumerate=(slot,matched)=>{
if(slot===combo.length){
const equipped=picked.slice(),sorted=sortComboByPriority(equipped);
if(sorted.some((action,i)=>action!==equipped[i])&&(metal||solverFieldMetal&&equipped.some(isMetalExecutionAction)))return;
if(sorted!==equipped){
const key=solverComboActionSignature(sorted,true);
seen||(seen=new Set());
if(seen.has(key))return;
seen.add(key);
}
result.push(sorted);
return;
}
for(const choice of slots[slot]){
const hasMatch=matched||choice.kind>=mode;
if(!hasMatch&&slot>=last)continue;
picked[slot]=choice.action;
enumerate(slot+1,hasMatch);
}
};
enumerate(0,false);
}
}
return result;
}
function actionPlus1(sk,eq){
if(sk&&sk.dmg)return 0;
if(sk&&sk.metal)return 1;
const w=SOLVER_WEAPON_INFO[eq];
return w&&w.metal?1:0;
}
function metalChipPerHit(sk,equip){return sk.el>0?{min:0,max:0}:actionPlus1(sk,equip)?{min:1,max:2}:{min:0,max:!sk.dmg&&!sk.fixedDmg?1:0};}
const solverWeaponAddsPlus1=(sk,eq)=>!!sk&&!!actionPlus1(sk,eq)&&!actionPlus1(sk,'');
function solverMetalExecutionsLast(combo,check){
if(check){let seen=false;for(const v of combo)if(v.at>0){if(isMetalExecutionAction(v))seen=true;else if(seen)return false;}return true;}
return[...combo.filter(v=>!isMetalExecutionAction(v)),...combo.filter(isMetalExecutionAction)];
}
function canMetalChipsKill(comboPads,metalHPs){
if(!metalHPs||!metalHPs.length)return true;
const chips=comboPads.map(c=>c.mdmg||0).filter(d=>d>0);
if(!chips.length)return true;
const bins=metalHPs.map(h=>monHpMin(h)-1);
return!(chips.reduce((a,b)=>a+b,0)>bins.reduce((s,b)=>s+Math.max(0,b),0))&&!(Math.max(...chips)>Math.max(...bins));
}
function solverMetalCompanionCount(hexes=_solverFieldHexes,counts=_solverGroupCounts){
let n=0;
if(hexes&&counts)for(let i=1;i<hexes.length;i++)if(counts[i]>0&&isMetalHex(hexes[i]))n+=counts[i];
return n;
}
function solverMetalCompanionGated(monGroups,monId,chars){
const groups=monGroups||[];
if(!isMetalHex(monId))return solverMetalCompanionCount(groups.map(g=>g.hex),groups.map(g=>g.count))>0;
return deriveSolverBattlePlan(groups,monId,maxCharLv(chars)).metalFallback;
}
function solverMetalPadForms(excl,allowEgg){
return METAL_PADDING.map(([jp,en,at,eq,note])=>{
const sk=lookupSkill(jp),hits=sk?getEquipHitCount(sk,eq):1;
return{jp,en,at,equip:eq,note,hits,mdmg:eq==='miss'||!sk?0:metalChipPerHit(sk,eq).max*hits};
})
.filter(p=>p.equip==='miss'||p.at===0||p.mdmg>0)
.filter(p=>allowEgg||p.jp!=='おうえん')
.filter(p=>!excl||!excl.has(p.jp))
.sort(solverOrder.at);
}
function solverMetalSupportPads(monGroups,nonMetalSups,effDeath,chars){
const reaches=(sk,hex,eq,all)=>{const hits=getEquipHitCount(sk,eq),eff=actionPlus1(sk,eq),need=monHpMin(MONSTER_DB[hex].s[0]),hit=c=>{const r=calcSkillDamageCache(sk,c.stats,hex,null,eff,eq);return!!r&&r.max*hits>=need;};return need<=0||(all?(solverUseStatsEnabled()?chars:[{stats:MIN_STATS}]).every(hit):chars.some(hit));};
const excluded=(list,all)=>{
const set=new Set(),seen=new Set();
for(const row of METAL_PADDING){
const jp=row[0];
if(seen.has(jp))continue;
seen.add(jp);
const sk=lookupSkill(jp);
if(!sk||sk.target==='S'||sk.target==='G')continue;
if(list.some(g=>MONSTER_DB[g.hex]&&reaches(sk,g.hex,row[3],all)))set.add(jp);
}
return set;
};
const excludedPads=excluded(nonMetalSups),stay=nonMetalSups.filter(g=>effDeath(g)===0);
const excludedPadsAfterMercy=stay.length===nonMetalSups.length?excludedPads:excluded(stay);
excludedPads.soft=excluded(nonMetalSups,true);excludedPadsAfterMercy.soft=excluded(stay,true);
const live=monGroups.map((g,gi)=>g.count>0&&g.hex&&!isMetalHex(g.hex)&&MONSTER_DB[g.hex]?gi:-1).filter(gi=>gi>=0);
const supPads=[];supPads.soft=[];
for(const row of METAL_PADDING){
const sk=lookupSkill(row[0]);
if(row[3]!=='miss'||!sk||sk.target!=='S'||sk.ev!==0||!(sk.el>0)||!(sk.at[0]>0)||sk.at[0]===sk.miss)continue;
for(const gi of live){
const hex=monGroups[gi].hex;
if(solverTargetImmuneToElement(sk.el,hex)||reaches(sk,hex,'',true))continue;
(reaches(sk,hex,'')?supPads.soft:supPads).push({jp:row[0],en:row[1],at:sk.at[0],equip:'',note:'👉',hits:1,mdmg:0,tgtGroup:gi,supTarget:true});
}
}
supPads.sort(solverOrder.at);supPads.soft.sort(solverOrder.at);
return{excludedPads,excludedPadsAfterMercy,supPads};
}
function solveMetalComboOrders(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads,phaseBGroupCounts,minCount=monCount){
if(hexId&&!isMetalHex(hexId))return[];
metalCount=metalCount||monCount;
const remaining=bat-ACT_ISSEN.at*metalCount;
if(remaining<0||metalCount>maxSlots)return[];
const tail=Array(metalCount).fill(ACT_ISSEN);
if(remaining===0)return[tail];
const withSups=monCount>metalCount,relax=relaxPads&&relaxPads!==excludedPads?relaxPads:null;
const pads=solverMetalPadForms(excludedPads,withSups),padsRelax=relax&&solverMetalPadForms(relax,withSups);
const unlocked=relax&&excludedPads?new Set([...excludedPads].filter(jp=>!relax.has(jp))):null;
const MAX=3,padSlots=maxSlots-metalCount;
const searches=new Map();
const search=(pool,rem,slots,head,needUnlocked,out)=>{
const at=solverMapEntry(searches,pool,()=>buildSolverATSearch({variants:pool,late:pool.length},remaining,padSlots)),full=()=>solverSearchCapped(out.length>=MAX);
for(let depth=1;depth<=slots&&!full();depth++)walkSolverATCombos(at,rem,depth,combo=>{
if((!needUnlocked||combo.some(p=>needUnlocked.has(p.jp)))&&canMetalChipsKill([...head,...combo],metalHPs))out.push([...head,...combo,...tail]);
},full);
return out;
};
const results=search(pads,remaining,padSlots,[],false,[]);
const relaxRes=padsRelax?search(padsRelax,remaining,padSlots,[],unlocked,[]):[];
const strict=relax||excludedPads,soft=strict&&strict.soft,open=soft&&new Set([...strict].filter(jp=>!soft.has(jp)));
const softRes=open&&open.size?search(solverMetalPadForms(soft,withSups),remaining,padSlots,[],open,[]):[];
const supRes=[],softSup=[];
if(supPads&&padSlots>=1)for(const[list,out]of[[supPads,supRes],[supPads.soft||[],softSup]]){
for(const sp of list){
if(sp.at>remaining)continue;
search(padsRelax||pads,remaining-sp.at,padSlots-1,[sp],false,out);
if(solverSearchCapped(out.length>=MAX))break;
}
out.sort(solverOrder.length);
}
const orders=results.concat(relaxRes,supRes,softRes,softSup);
if(isMetalHex(hexId)&&withSups&&remaining>0&&padSlots>=1){
const head=Array(metalCount).fill({...ACT_ISSEN,metalFirst:true}),others=monCount-metalCount;
const groupCounts=Array.isArray(phaseBGroupCounts)?phaseBGroupCounts:_solverGroupCounts&&_solverGroupCounts.map((n,gi)=>gi===0?0:n);
for(const combo of solveBattleCombo(remaining,Math.max(1,minCount-metalCount),padSlots,null,{groupCounts,fieldTotal:others,maxMonCount:others})){
if(combo.every(v=>!(_actionPri(v)>0)&&!isMetalExecutionAction(v)))orders.push([...head,...combo]);
}
}
return orders;
}
const _solverElementMayZero=new WeakMap();
function solverElementMayZero(sk){return solverMapEntry(_solverElementMayZero,sk,()=>sk.el>=5&&sk.el<=11&&!sk.fixedDmg&&!Number.isFinite(sk.miss)&&(!!sk.dmg||!Object.keys(WEAPON_META).some(eq=>solverWeaponCompatible(sk,eq)&&(weaponMetaValue(eq,'fixedDmg')||actionPlus1(sk,eq)))));}
function solverMetalSupOK(combo){
const metals=solverMetalCompanionCount();
return!metals||combo.filter(isMetalExecutionAction).length===metals;
}
function metalExecuteInst(inst){
inst.hp=0;
if('hpLow'in inst)inst.hpLow=0;
inst.alive=false;
return inst.groupIdx===0;
}
function solverBlockRuleEnabled(){return!solverFlag('si_blockFallback');}
function solverFieldBlock(hexes){
let block=0;
for(const hex of hexes){const b=solverHexBlock(hex);if(b>block)block=b;}
return block;
}
function solverHexBlock(hex){const m=hex&&MONSTER_DB[hex];return m&&m.s[4]||0;}
function solverActionAntiBlock(action,sk=lookupSkill(action.jp)){
return!!sk&&sk.blk===0||!!action.equip&&!!weaponMetaValue(action.equip,'antiBlk')&&!(sk&&sk.antiBlk===false);
}
function solverBlockForm(action){
const pool=_solverGoldState&&(_solverGoldState.blockForms||(_solverGoldState.blockForms=new WeakMap()));
let form=pool&&pool.get(action);
if(form)return form;
const sk=lookupSkill(action.jp),kind=SolverActionGate.targetKind(sk),attack=action.at>0,anti=attack&&solverActionAntiBlock(action,sk);
const remove=isSolverNonDamageRemoval(action),execute=remove&&solverFieldMetal&&isMetalExecutionAction(action);
const at=kind==='A',group=action.tgtGroup,locked=kind==='G'||kind==='S'&&!(sk&&sk.aimGroup);
const cover=action.jp==='みのがす'||!['S','G','RS','RG'].includes(kind)?Infinity:kind==='S'||kind==='RS'?1:0;
form={attack,anti,remove,execute,at,group,locked,cover,key:JSON.stringify([attack,anti,remove,execute,at,group,locked,cover])};
if(pool)pool.set(action,form);
return form;
}
function actionAtUnstable(action,minDmg,maxDmg){
if(!action)return false;
if(minDmg!==0||maxDmg!==0)return action.at>0&&!(minDmg>0)&&maxDmg>0;
const sk=lookupSkill(action.jp);
if(!sk)return true;
if(isSolverNonDamageRemoval(action)||SolverActionGate.ally.includes(SolverActionGate.targetKind(sk)))return false;
return!Number.isFinite(sk.miss)||sk.miss!==action.at;
}
function solverSingleRemovalCapacity(variants,hexId){
const mon=MONSTER_DB[hexId],hp=mon&&mon.s[0];
if(!(hp>0)||!Number.isFinite(hp)||solverFieldMetal&&isMetalHex(hexId)||mon.s[4]>0)return null;
const chars=solverUseStatsEnabled()?readCharStatsFromDom():null,key=JSON.stringify([hexId,chars&&chars.map(c=>c.stats)]);
const known=solverMapEntry(_solverSingleRemovalBasis,variants);
let result=known.get(key);
if(!result){
const rows=variants.map(v=>solverMinimumDamageBound(v,hexId,chars));
result=Object.freeze({removal:Object.freeze({capacity:1,values:Object.freeze(rows.map(r=>r.removal))}),chips:Object.freeze({limit:monHpMin(hp),values:Object.freeze(rows.map(r=>r.chip))})});
known.set(key,result);
}
return result;
}
function solverEarlyStopStructureOK(combo){const i=combo.findIndex(v=>v.earlyKill);return i<0||i===combo.length-1;}
function solverCertainEarlyClear(combo,targets,start=0,priority){
if(groupTotal(targets)!==1)return-1;
const hexId=targets[0].hex,mon=MONSTER_DB[hexId];
if(!mon||solverFieldMetal&&isMetalHex(hexId))return-1;
const fource=getFourceEls(combo),chars=solverUseStatsEnabled()?readCharStatsFromDom():null,limit=monHpMin(mon.s[0]),fin=solverFinalActionIndex(combo,true);
let chip=0;
for(let ci=start;ci<fin;ci++){
chip+=solverMinimumDamageBound(combo[ci],hexId,chars,fource,priority).chip;
if(chip>=limit)return ci;
}
return-1;
}
function solverRandomLast(v){return v.at>0&&!isSolverNonDamageRemoval(v)&&isSolverRandomTargetSkill(lookupSkill(v.jp));}
function solverCandidateStructureOK(rawCombo,walk,out={}){
const{isMetal,killTargets,T,effMon:K,targets,blockOnly,start,priority}=walk;
if(start)return solverCertainEarlyClear(rawCombo,targets,start,priority)<0;
if(targets){
if(!blockOnly){
const random=rawCombo.findIndex((v,ci)=>ci<rawCombo.length-1&&solverRandomLast(v));
if(random>=0){out.rejectLast=random+1;return false;}
}
if(solverBlockRuleEnabled()){
const{openOther,openMetal,guardedOther,guardedMetal,largest,groupBlocks}=solverStructureStep(targets);
const checkCap=!blockOnly&&rawCombo[rawCombo.length-1].jp!=='みのがす';
let executed=0,cap=0,remover=false;
for(let ci=0;ci<rawCombo.length&&(openMetal||guardedMetal||guardedOther||!openOther);ci++){
if(!openMetal&&!guardedMetal&&remover&&cap>=guardedOther&&openOther)break;
const{attack,anti,at,group,locked,execute,remove,cover}=solverBlockForm(rawCombo[ci]);
const guarded=guardedOther+Math.max(0,guardedMetal-executed),covered=checkCap&&cap<guarded;
if(attack&&!anti&&(!openOther&&openMetal<=Math.max(0,executed-guardedMetal)||
covered&&!remove&&(at||locked&&groupBlocks[group]&&targets[group].count>cap))){
out.rejectLast=out.blockLast=ci;return false;
}
if(execute){executed++;remover=remover||anti;continue;}
if(anti||remove){
remover=true;
if(covered)cap+=cover||(group!==undefined&&targets[group]?targets[group].count:largest);
}
}
if(!blockOnly&&!remover&&(guardedOther||guardedMetal&&!executed)){out.rejectLast=Infinity;return false;}
}
if(blockOnly)return true;
const early=solverCertainEarlyClear(rawCombo,targets);
if(early>=0){out.rejectLast=early;return false;}
if(solverRaceMulIndex(rawCombo,true)===null){out.rejectLast=Infinity;return false;}
if(priority)out.priority=solverCertainEarlyClear(rawCombo,targets,0,true)>=0;
}
if(isMetal||!killTargets||T<=1)return true;
const state=solverStructureStep(walk);
let reach=0;
for(const v of rawCombo)if(v.at>0)reach+=solverActionReach(v,K,state.largest);
if(reach<K)return false;
for(const v of rawCombo)if(!solverStructureStep(state,v))return false;
return true;
}
const SOLVER_CONDITION_BOUNDS_REPLAY_LIMIT=4000,SOLVER_CONDITION_BOUNDS_FIND_LIMIT=40000,SOLVER_CONDITION_BOUNDS_REJECT_STREAK=256,SOLVER_CONDITION_BOUNDS_DIVE=100;
function solverSearchCapped(stop){if(stop){_solverSearchIncomplete=true;_solverSearchLimited=true;}return stop;}
function trimGroups(groups,max){
const out=groups.slice();
let total=out.reduce((s,v)=>s+v,0),changed=true;
while(total>max&&changed){
changed=false;
for(let g=0;g<out.length&&total>max;g++){
const excess=total-max,remove=Math.min(excess>=12?4:excess>=9?3:excess>=6?2:1,out[g]-(g===0?1:0));
if(remove>0){out[g]-=remove;total-=remove;changed=true;}
}
}
return out;
}
function mergeSameSpeciesGroups(groups,keyOf){
const key=keyOf||(g=>g.hex),merged=[],offset=[],byKey=new Map();
(groups||[]).forEach((g,gi)=>{
const count=g.count||1,k=key(g),same=byKey.get(k);
if(same){offset.push(same.count);same.count+=count;same.groupIdxs.push(gi);return;}
offset.push(0);
const entry={...g,count,groupIdxs:[gi]};
byKey.set(k,entry);
merged.push(entry);
});
return{merged,offset,of:hex=>merged.find(m=>m.hex===hex)||{count:1,groupIdxs:[]}};
}
function enumerateEncounterOutcomes(model){
if(!model)return[];
const{hex,max,mainMin,mainMax,supportPool,denominator,branches}=model;
const outcomes=new Map(),pMain=1/(mainMax-mainMin+1);
const add=(mainRaw,supports,counts,probability)=>{
if(!(probability>0))return;
const[M,...remaining]=trimGroups([mainRaw,...counts],max);
const survivors=supports.map((s,i)=>({...s,count:remaining[i]})).filter(s=>s.count>0).sort(solverOrder.index);
const kind=['A','B','C'][survivors.length];
const key=kind==='A'?'A_'+M:kind==='B'?'B_'+survivors[0].hex+'_'+M+'_'+survivors[0].count:'C_'+survivors[0].hex+'_'+survivors[0].count+'_'+survivors[1].hex+'_'+survivors[1].count+'_'+M;
const existing=outcomes.get(key);
if(existing){existing.probability+=probability;return;}
const group=(id,count,isMain)=>({hex:id,count,death:solverDeathRes(id,100),isMain});
const monGroups=[group(hex,M,true),...survivors.map(s=>group(s.hex,s.count,false))];
outcomes.set(key,{supports:survivors,monGroups,total:groupTotal(monGroups),probability});
};
for(let m=mainMin;m<=mainMax;m++){
add(m,[],[],pMain*branches[0]);
if(!(denominator>0))continue;
if(branches[1]>0)for(const a of supportPool){
const p=pMain*branches[1]*a.weight/denominator/(a.max-a.min+1);
for(let n=a.min;n<=a.max;n++)add(m,[a],[n],p);
}
if(branches[2]>0)for(const a of supportPool)for(const b of supportPool){
const p=pMain*branches[2]*(a.weight/denominator)*(b.weight/denominator)/((a.max-a.min+1)*(b.max-b.min+1));
for(let na=a.min;na<=a.max;na++)for(let nb=b.min;nb<=b.max;nb++)add(m,[a,b],[na,nb],p);
}
}
return[...outcomes.values()].sort(solverOrder.encounter);
}
let _solverFieldHexes=null;
let solverFieldMetal=true;
let _solverGroupCounts=null;
let _solverFieldTotal=null;
let _solverUseStats=true;
let _solverSearchIncomplete=false,_solverSearchLimited=false,_solverRenderDepth=0,raceMulKills=null;
let solverProofReach=-1;
let _solverGoldState=null,_solverVerdictMode=false,_solverResume=null;
const solverGoldFound=()=>{const g=_solverGoldState;return!!(g&&g.gold);};
const solverNoteGold=rating=>{if(rating==='gold'&&_solverGoldState&&!_solverGoldState.gold){_solverGoldState.gold=true;_solverGoldState.packs=null;_solverGoldState.fixedOrange=null;const work=_solverGoldState.orangeWork;if(work)for(const[s,w]of work)if(!_solverGoldState.below||w.low)work.delete(s);else w.deferred.length=0;}};
function solverApplyBuildContext(spec,run){
if(!spec)return{groupCounts:_solverGroupCounts?_solverGroupCounts.slice():null,fieldTotal:_solverFieldTotal,fieldHexes:_solverFieldHexes,useStats:_solverUseStats,fieldMetal:solverFieldMetal};
const prev=run&&solverApplyBuildContext();
_solverGroupCounts=spec.groupCounts?spec.groupCounts.slice():null;
_solverFieldTotal=spec.fieldTotal;
_solverUseStats=spec.useStats!==false;
_solverFieldHexes=spec.fieldHexes||null;
solverFieldMetal=spec.fieldMetal!==undefined?spec.fieldMetal:!_solverFieldHexes||_solverFieldHexes.some(isMetalHex);
if(run)try{return run();}finally{solverApplyBuildContext(prev);}
}
function deriveSolverBattlePlan(monGroups,monId,mercyLv,forceKillAll,mercyLevels,metal=true){
const groups=monGroups||[],T=groupTotal(groups),mainGroup=monGroups&&monGroups[0],sups=groups.filter(g=>!g.isMain),nonMetalSups=sups.filter(g=>g.count>0&&g.hex&&!(metal&&isMetalHex(g.hex)));
mercyLv=mercyLv>0?mercyLv:99;
const effectiveDeath=(g,lv=mercyLv)=>g&&solverMercyCanRemove({hex:g.hex,death:g.death,alive:true},lv)?g.death:0;
const metalFallback=metal&&isMetalHex(monId)&&nonMetalSups.some(g=>effectiveDeath(g)===0);
let planType='kill_all',postAlive=T;
if(T>1&&mainGroup){
let stay=0,leave=0,mixed=false;
for(const g of sups){const d=effectiveDeath(g);if(d===0){stay+=g.count;mixed=mixed||g.count>0&&metal&&isMetalHex(g.hex)!==isMetalHex(monId);}else if(d>0)leave+=g.count;}
const main=effectiveDeath(mainGroup);
if(main===0&&leave>0&&mixed){planType='kill_mercy_clear';postAlive=mainGroup.count-1+stay;}
else if(main===0&&leave>0){planType='mercy_first';postAlive=mainGroup.count+stay;}
else if(main>0&&(mainGroup.count>=2||leave>0)){planType='kill_mercy_clear';postAlive=stay;}
}
const naturalPlanType=planType;
if(forceKillAll){planType='kill_all';postAlive=0;}
let maxPostAlive=postAlive,mercyCertain=null;
if(planType!=='kill_all'){
const afterMain=planType==='kill_mercy_clear'?1:0,left=(g,i)=>(g.count||1)-(i===0?afterMain:0);
let minLv=mercyLv;
for(const lv of mercyLevels||[])if(lv<minLv&&monGroups.some((g,i)=>left(g,i)>0&&effectiveDeath(g,lv)>0))minLv=lv;
mercyCertain=monGroups.map(g=>effectiveDeath(g,minLv)>0);
maxPostAlive=monGroups.reduce((sum,g,i)=>sum+(mercyCertain[i]?0:left(g,i)),0);
}
const effMon=planType==='kill_all'?T:planType==='kill_mercy_clear'?1+postAlive:postAlive;
return{T,round2Cost:solverRound2RemovalCost(T),hexId:monId,isMetal:metal&&isMetalHex(monId),nonMetalSups,metalFallback,planType,naturalPlanType,postAlive,effMon,maxPostAlive,mercyCertain,effectiveDeath};
}
function buildSolverPlanCombos(options){
const{bat,canRound2,_forceKillAll,_prebuiltKmc,_prebuiltKillAll,_deferKillAll,round2Cost,hexId,maxPostAlive,excludedPads,excludedPadsAfterMercy,supPads,_phaseBCountsAll,_phaseBCountsAfterMercy,walk,_metalHPs,_metalCount,_round2}=options;
const{T,isMetal,planType,postAlive}=walk;
let combos;
if(planType==='mercy_first'||isMetal&&planType!=='kill_all'){
const lead=planType==='mercy_first'?0:1;
const phase=(target,slots,least,round,relax)=>{
const place=c=>solverMercyPlacements(c,walk,round)[0];
return isMetal?solveMetalComboOrders(target,maxPostAlive+lead,slots,_metalCount,_metalHPs,excludedPads,hexId,supPads,relax,_phaseBCountsAfterMercy,postAlive+lead).filter(c=>c.length>=least&&(!lead||c.some(v=>v.metalFirst))).map(place).filter(Boolean)
:solveBattleCombo(target,postAlive,slots,null,{maxMonCount:maxPostAlive,hex:hexId,least,walk,keep:place});
};
combos=!_round2?phase(bat,SOLVER_ROUND_SIZE-1,1,1,excludedPadsAfterMercy)
:(round2Cost>0?phase(bat-round2Cost,SOLVER_MAX_ACTIONS-1,SOLVER_ROUND_SIZE,1,excludedPadsAfterMercy):[]).concat(phase(bat,SOLVER_MAX_ACTIONS-1,SOLVER_ROUND_SIZE+1,2,undefined));
}else{
const killAll=planType==='kill_all',stage=_round2?'r2':'r1';
let prepared=killAll?_prebuiltKillAll:_prebuiltKmc;
const has=key=>prepared&&Object.prototype.hasOwnProperty.call(prepared,key);
if(killAll&&_deferKillAll&&!prepared&&!_forceKillAll){window._solverFallback=true;window._solverNeedsKillAll='r1';return null;}
if(_round2&&_deferKillAll&&prepared&&!has('r2a')){window._solverNeedsKillAll='r2';return null;}
if(!killAll){
if(!has(_round2?'r2a':'r1'))prepared=buildKmcSerialPayload(buildSolverShardSpec(options,stage,!solverBlockRuleEnabled()));
_solverSearchIncomplete=_solverSearchIncomplete||!!prepared.incomplete;
_solverSearchLimited=_solverSearchLimited||!!prepared.limited;
}
const rounds=solverRoundSpaces(bat,round2Cost,_round2,stage,(key,target,round,least,slots)=>{
if(!killAll||has(key))return prepared[key]||[];
return isMetal?solveMetalComboOrders(target,T,slots,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll).filter(c=>c.length>=least)
:solveBattleCombo(target,T,slots,hexId,{walk,least});
});
combos=rounds.length===1?rounds[0]:rounds[0].concat(rounds[1]);
}
if(solverFieldMetal&&!isMetal&&solverMetalCompanionCount()>0&&combos.length){
const _seenN=new Set(),_normN=[];
for(const c of combos){
const nc=solverMetalExecutionsLast(c),key=solverComboActionSignature(nc,true);
if(!_seenN.has(key)){_seenN.add(key);_normN.push(nc);}
}
combos=_normN;
}
combos=combos.map(sortComboByPriority);
return{combos,isRound2:!!_round2&&combos.length>0,deferredRound2:!_round2&&canRound2};
}
function solverEmptyResult({bat,monGroups,hexId,mapDeft,canRound2,_prebuiltKillAll,_deferKillAll,walk},anyRated,beforeOrange){
if(walk.planType!=='kill_all'){
window._solverFallback=true;
if(_deferKillAll&&!_prebuiltKillAll){window._solverNeedsKillAll='r1';return'';}
return renderSolverResult(bat,monGroups,hexId,mapDeft,canRound2,true,null,_prebuiltKillAll,_deferKillAll,false,_solverSearchLimited,beforeOrange,solverFieldMetal);
}
window._solverSolvable=anyRated?true:_solverSearchIncomplete?null:false;
return SOLVER_DASH;
}
const SOLVER_STEP_FATES=[{fullHits:true},{fullHits:true,uncertain:true},{fullHits:true,dead:true,damage:Infinity},{fullHits:true,dead:true,damage:-Infinity},{}];
function checkSolverDamage(combo,hexId,mon,killTargets,tensionMul,fourceEls,outInfo,assign,forcedEggAssign,evaluationChars,evaluation){
const battle=evaluation&&evaluation.battle;
let work=battle&&battle.work;
if(!work){
const early=(incomplete=false)=>{
if(incomplete)_solverSearchIncomplete=true;
if(outInfo)outInfo.actualAT=undefined;
return null;
};
if(!solverMultiPlayerEnabled()&&isMultiTargetOnly(combo))return early();
const chars=evaluationChars||readCharStatsFromDom();
if(!mon)return null;
tensionMul=tensionMul||1;
if(!killTargets||!killTargets.length)killTargets=[{hex:hexId,count:1,death:MONSTER_DB[hexId].s[12]}];
const{instances,metalMainBattle,uniqueHexes}=buildSimInstances(killTargets,true),total=instances.length;
if(!total)return null;
const inlineFource=findInlineFource(combo),fourceCI=inlineFource?combo.indexOf(inlineFource):-1;
const effectiveFEls=getFourceEls(inlineFource,fourceEls),hasFource=effectiveFEls&&effectiveFEls.length>0;
const skillDmg=[],eggCIs=[];
let finIdx=-1;
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci],sk=lookupSkill(action.jp);
if(!sk||!Array.isArray(sk.at)||sk.at.length!==2||!sk.at.every(n=>Number.isInteger(n)&&n>=0))return early(true);
if(!Number.isInteger(action.at)||action.at<0)return early();
const hits=SolverActionGate.hits(action),tgt=SolverActionGate.targetKind(sk);
const hitBased=isHitBased(sk),fullHits=hitBased?sk.hitRange?sk.hitRange.normalMin:getEquipHitCount(sk,action.equip||solverDefaultEquip(sk)):1;
if(!Number.isInteger(fullHits)||fullHits<1||action.hits!=null&&(!Number.isInteger(action.hits)||action.hits<0)||(action.earlyKill?hits>=fullHits:hits!==fullHits))return early();
if(action.at>0)finIdx=ci;
if(action.jp==='おうえん')eggCIs.push(ci);
const actor=actorAt(chars,assign,ci);
skillDmg.push({sk,tgt,hits,hitBased,actor,execute:solverFieldMetal&&isMetalExecutionAction(action),numeric:!isSolverNonDamageRemoval(action),random:isSolverRandomTargetSkill(sk),metalAction:solverFieldMetal&&isMetalActionSkill(action),antiBlock:solverActionAntiBlock(action,sk),orders:null});
}
const ordersOf=(ci,sd=skillDmg[ci])=>sd.orders||(sd.orders=solverActionDamageOrders(combo[ci],sd.sk,sd.hits,sd.actor,uniqueHexes,total,hasFource?effectiveFEls:null));
for(let ci=skillDmg.length-1,positional=false;ci>=0;ci--){const sd=skillDmg[ci];sd.positional=positional;sd.decay=!!atkDecay(sd.sk);positional=positional||sd.decay;}
const raceMul=solverRaceMulIndex(combo,true);
if(raceMul===null)return null;
const blockRule=solverBlockRuleEnabled(),lastCI=skillDmg.length-1,mercyFinal=lastCI>=0&&combo[lastCI].jp==='みのがす';
const eggEligibleCIs=eggCIs.length||tensionMul>1?solverIndicesOf(combo,(v,ci)=>v.at>0&&(ci===lastCI||total>1)&&solverEggCanBenefit(v,instances,ordersOf(ci)[0][hasFource&&(!inlineFource||ci>fourceCI)?'dmgF':'dmg'],null,ci!==lastCI)):[];
const externalAssign=!eggCIs.length&&tensionMul>1&&eggEligibleCIs.includes(lastCI)?{[lastCI]:tensionMul}:null;
const cost=run=>solverRoundCost(combo,total,run.r1Removal);
const orangeStart=run=>run.reason==='uncertain'&&run.rejectAt===lastCI&&!mercyFinal&&!solverGoldFound()&&!run.multi;
const targetKey=inst=>(inst.groupIdx===0?'M':'S')+':'+inst.hex+':'+inst.death+':'+inst.hp+':'+inst.hpLow;
const raceMulBars=(ci,kills,alone)=>mercyFinal&&raceMul>=0&&(kills?ci>raceMul:alone&&ci===raceMul);
const tableOf=(sd,i,on)=>sd.orders[Math.min(i,sd.orders.length-1)][on?'dmgF':'dmg'];
const stepOf=(target,sd,ci,i,on,mul,lv,mode,benefited,index)=>{
const table=tableOf(sd,i,on);
const row=table[target.hex];
const damage=(r,els)=>solverActionDamage(sd.sk,target.hex,els,r&&r.hit||{min:0,max:0},sd.hits,mul,lv);
const t=mul===1&&row?(row.total||(row.total=damage(row,on?effectiveFEls:null))):damage(row,on?effectiveFEls:null);
if(benefited&&inlineFource&&on&&solverEggCanBenefit(combo[ci],[target],table,1)){
const base=tableOf(sd,i,false)[target.hex];
const off=mul===1&&base?(base.total||(base.total=damage(base,null))):damage(base,null);
if(t.min>off.min||t.max>off.max)benefited.push(index);
}
const step=SolverActionGate.step(target,sd.hits,t[mode],t.max,t.head);
step.damage=t[mode];
return step;
};
const stepReason=(ci,target,step,mainKilled,ahead)=>{
const reason=SolverActionGate.hitRejectReason(target,step&&step.damage,combo[ci],skillDmg[ci],step,mainKilled);
if(reason)return reason;
if(step&&step.uncertain&&!(ahead&&orangeStart({reason:'uncertain',rejectAt:ci})))return'uncertain';
if(ahead&&raceMulBars(ci,!!step.dead&&target.groupIdx===0,ahead.solo))return'race_mul_kill';
if(ahead&&step.dead&&ahead.left===1&&ci<lastCI)return'earlyclear';
return null;
};
const rejectedAtOnce=(targets,ci,sd,on,mul,lv,mode,mainKilled)=>{
if(!solverWeaponPurposeOK(combo[ci],sd.sk,targets,tableOf,assign,ci,null,sd,on))return true;
const target=targets[0];
if(!sd.numeric)return false;
const step=stepOf(target,sd,ci,0,on,mul,lv,mode);
return step.dead&&!!stepReason(ci,target,null,mainKilled);
};
const captureActions=!!(battle||evaluation&&evaluation.captureActions),traced=!!(battle||evaluation&&evaluation.trace);
const shaky=battle||evaluation&&evaluation.runs?skillDmg.map((sd,ci)=>sd.numeric&&actionAtUnstable(combo[ci],0,1)):null;
const snapshot=s=>({...s,sim:s.sim.map(o=>({...o})),path:s.path.slice(),aim:s.aim.slice(),numericKills:s.numericKills.slice(),eggBenefited:s.eggBenefited.map(a=>a.slice()),fourceBenefited:s.fourceBenefited.slice(),actionResults:s.actionResults&&s.actionResults.slice(),trace:s.trace&&s.trace.slice()});
const neutral=evaluation&&evaluation.neutral,common=neutral&&!eggCIs.length&&tensionMul===1&&!hasFource&&traced&&captureActions;
const play=(mode,eggAssign,fork,forks)=>{
let cursor=common&&neutral.prefix&&!fork&&solverMapEntry(neutral.prefix,[mode,lastCI,mercyFinal?(raceMul<0?'':raceMul):-1,!!shaky].join('|'));
const frame=cursor&&(ci=>solverMapEntry(solverMapEntry(cursor,combo[ci]),skillDmg[ci].positional,()=>({next:new Map()})));
let ci=fork?fork.ci:0,saved,checkpoint,oldForks,oldKills;
for(;cursor&&ci<lastCI;ci++){
const row=frame(ci);
if(!row.state&&!row.failed)break;
forks.push(...row.forks);forks.kills.push(...row.kills);
if(row.failed)return row.failed;
saved=row.state;cursor=row.next;
}
const s=saved?snapshot(saved):fork?(common?snapshot(fork.st):fork.st):{sim:instances.map(inst=>({hex:inst.hex,groupIdx:inst.groupIdx,death:inst.death,hp:mode==='min'?inst.hp:inst.hpLow,hpLow:inst.hpLow,killFloor:inst.killFloor,alive:true,hist:''})),path:[],aim:[],numericKills:[],eggBenefited:[],fourceBenefited:[],actionResults:captureActions?[]:null,trace:traced?[]:null,r1Removal:false,actualAT:0,fourceOn:!inlineFource&&hasFource,
mainKilled:false,lastMainKill:-1,weakKill:-1,companionKilled:false,fallbackKind:undefined};
const{sim,path,aim,numericKills,eggBenefited,fourceBenefited,actionResults,trace}=s;
const keep=cursor&&(()=>{checkpoint.forks=forks.slice(oldForks);checkpoint.kills=forks.kills.slice(oldKills);});
const done=(allDead,rejectAt,reason)=>{
const run={allDead,rejectAt,reason,path,aim,actionResults,actualAT:s.actualAT,trace,r1Removal:s.r1Removal,lastMainKill:s.lastMainKill,fallbackKind:s.fallbackKind};
if(checkpoint&&reason!=='at_unknown'){checkpoint.failed=run;keep();}
return run;
};
const stop=(ci,reason)=>{path.push(ci+':!'+reason);return done(false,ci,reason);};
const resultTarget=(index,target,outcome,step)=>({index,groupIdx:target.groupIdx,hex:target.hex,outcome,hpBefore:target.hp,hpLowBefore:target.hpLow,hp:outcome==='ko'?0:step?step.hp:target.hp,hpLow:outcome==='ko'?0:step?step.hpLow:target.hpLow});
const recordAction=(ci,kind,targets,at,missCount=0)=>{
const changed=[],remaining=[];
for(const t of targets)changed[t.index]=t;
sim.forEach((t,index)=>{
const c=changed[index];
if(!t.alive||c&&(c.outcome==='ko'||c.outcome==='removed'))return;
remaining.push({index,hex:t.hex,groupIdx:t.groupIdx,hp:c?c.hp:t.hp,hpLow:c?c.hpLow:t.hpLow,alive:t.alive});
});
actionResults.push({ci,kind,at,targets,remaining,...(kind==='damage'?{hitCount:targets.length-missCount}:{}),...(missCount>0?{miss:missCount===targets.length?'all':'partial'}:{})});
};
for(;ci<skillDmg.length;ci++){
if(checkpoint){checkpoint.state=snapshot(s);keep();}
checkpoint=cursor&&ci<lastCI?frame(ci):null;
if(checkpoint){cursor=checkpoint.next;oldForks=forks.length;oldKills=forks.kills.length;}
const sd=skillDmg[ci],sk=sd.sk,action=combo[ci];
const alive=sim.filter(i=>i.alive);
if(!alive.length)return stop(ci,'earlyclear');
if(action.jp==='みのがす'||SolverActionGate.ally.includes(sd.tgt)){
if(sk.at[1]!==0){_solverSearchIncomplete=true;return done(false,ci,'at_unknown');}
if(action.at!==sk.at[0])return done(false,ci,'at_mismatch');
s.actualAT+=sk.at[0];
}
if(action.jp==='みのがす'){
if(!s.mainKilled&&solverMercyCanRemove(instances[0],maxCharLv(chars)))return stop(ci,'mercymain');
const removed=[],removedTargets=[],casterLv=actorLv(chars,assign,ci);
let companionRemoved=false;
for(const inst of alive){
if(!solverMercyCanRemove(inst,casterLv))continue;
removed.push(targetKey(inst));
if(inst.groupIdx>0)companionRemoved=true;
if(actionResults)removedTargets.push(resultTarget(sim.indexOf(inst),inst,'removed'));
inst.alive=false;
}
if(!removed.length){path.push(ci+':m?');return done(false,ci,'mercy_lv');}
if(ci===combo.length-1&&s.companionKilled&&companionRemoved)s.fallbackKind='partial-mercy';
path.push(ci+':m:'+removed.sort().join(','));
if(ci<SOLVER_ROUND_SIZE)s.r1Removal=true;
if(actionResults)recordAction(ci,'mercy',removedTargets,sk.at[0]);
continue;
}
if(action.jp==='おうえん'){path.push(ci+':e');continue;}
if(inlineFource&&action.jp===inlineFource.jp&&!s.fourceOn){s.fourceOn=true;path.push(ci+':f');continue;}
if(!sd.orders)ordersOf(ci,sd);
const on=s.fourceOn,mul=eggAssign&&eggAssign[ci]||1,lv=mul>1?actorLv(chars,assign,ci):99;
const numericAction=sd.numeric;
let picked;
if(fork&&ci===fork.ci)picked={targets:fork.option.map(i=>sim[i]),reason:null};
else{
picked=SolverActionGate.targets(alive,action,sd,sd.positional);
if(!picked.reason&&picked.options)for(let k=picked.options.length-1;k>0;k--){
if(!trace&&rejectedAtOnce(picked.options[k],ci,sd,on,mul,lv,mode,s.mainKilled)){if(s.lastMainKill>=0)forks.kills.push(s.lastMainKill);continue;}
forks.push({ci,option:picked.options[k].map(t=>sim.indexOf(t)),st:snapshot(s)});
}
}
if(picked.reason)return stop(ci,picked.reason);
const targets=picked.targets,indices=targets.map(t=>sim.indexOf(t));
aim.push(ci+':'+indices.join(','));
if(metalMainBattle&&action.tgtGroup!==undefined&&sd.tgt==='S'&&!action.supTarget)return stop(ci,'retarget');
const blocked=blockRule&&!sd.antiBlock&&targets.some(t=>solverHexBlock(t.hex)>0)?sd.tgt!=='A'?'blocked_target':'blocked_at':null;
if(blocked)return stop(ci,blocked);
if(trace&&shaky)trace.push({ci,mode,fourceOn:on,targets:indices,steps:[],pre:shaky[ci]?2:1});
const weaponRequirements=trace?[]:null;
if(!solverWeaponPurposeOK(combo[ci],sd.sk,targets,tableOf,assign,ci,weaponRequirements,sd,on))return stop(ci,'weapon_idle');
let misses=0;
if(numericAction)for(let i=0;i<targets.length;i++){
const row=tableOf(sd,i,on)[targets[i].hex];
if(!row||!row.hit||!Number.isFinite(row.min)||!Number.isFinite(row.max)||row.min<0||row.max<row.min){_solverSearchIncomplete=true;return done(false,ci,'at_unknown');}
if(row.min===0&&row.max===0)misses++;
else if(actionAtUnstable(action,row.min,row.max))return stop(ci,'at_unstable');
}
let actionAT;
if(!numericAction||misses===0)actionAT=solverATForCount(sk.at[0],sk.at[1],sd.hitBased?sd.hits:targets.length);
else if(Number.isFinite(sk.miss)&&(misses===targets.length||sk.at[1]===0&&sk.miss===sk.at[0]))actionAT=sk.miss;
else{_solverSearchIncomplete=true;return done(false,ci,'at_unknown');}
if(actionAT!==action.at)return stop(ci,'at_mismatch');
s.actualAT+=actionAT;
if(action.aoeK!==undefined&&action.aoeK!==targets.length)return stop(ci,'aoeK');
if(mul>1){
const benefited=indices.filter((index,i)=>solverEggCanBenefit(action,[sim[index]],tableOf(sd,i,on)));
if(!benefited.length)return stop(ci,'no_egg_damage');
eggBenefited.push(benefited);
}
const keys=targets.map(targetKey);
path.push(ci+':d:'+(sd.decay?keys:keys.sort()).join(','));
const steps=targets.map(()=>null);
if(actionResults){
recordAction(ci,'damage',targets.map((target,i)=>{
if(sd.execute)return resultTarget(indices[i],target,isMetalHex(target.hex)?'ko':'alive');
const step=steps[i]=stepOf(target,sd,ci,i,on,mul,lv,mode,fourceBenefited,indices[i]);
const row=tableOf(sd,i,on)[target.hex];
return{...resultTarget(indices[i],target,step.dead?'ko':step.uncertain?'possible':'alive',step),...(numericAction&&row.min===0&&row.max===0?{miss:true}:{})};
}),actionAT,misses);
}
const traceRow=trace?{ci,mode,fourceOn:on,targets:indices,steps:[],...(weaponRequirements.length?{weaponRequirements}:{})}:null;
const ahead=traceRow&&shaky&&{solo:targets.length===1,left:alive.length};
if(traceRow)trace.push(traceRow);
for(let i=0;i<targets.length;i++){
const target=targets[i],index=indices[i];
let down;
if(sd.execute){
if(!isMetalHex(target.hex))return done(false,ci,'non_metal_issen');
if(traceRow)traceRow.steps.push({index,execute:true});
const reason=stepReason(ci,target,null,s.mainKilled);
if(reason)return done(false,ci,reason);
if(ci<SOLVER_ROUND_SIZE)s.r1Removal=true;
down=metalExecuteInst(target);
}else{
const step=steps[i]||stepOf(target,sd,ci,i,on,mul,lv,mode,fourceBenefited,index);
if(traceRow)traceRow.steps.push({index,dead:step.dead,live:((tableOf(sd,i,on)[target.hex]||{}).hit||{}).min>0,...(step.dead&&numericAction?{killFloor:target.killFloor}:{}),
...(ahead&&{fate:SOLVER_STEP_FATES.map(fate=>!!stepReason(ci,target,fate,s.mainKilled,ahead))})});
const reason=stepReason(ci,target,step,s.mainKilled);
if(reason){
if(reason==='uncertain'&&target.groupIdx===0)s.lastMainKill=ci;
const run=done(false,ci,reason);
run.multi=orangeStart(run)&&targets.some((t,j)=>j>i&&(steps[j]||stepOf(t,sd,ci,j,on,mul,lv,mode)).uncertain);
return run;
}
if(step.dead&&target.groupIdx===0&&s.weakKill<0&&!solverKillerFormOK(action,target.hex,sd.actor&&sd.actor.stats))s.weakKill=ci;
SolverActionGate.commit(target,step);target.hist+=ci+':'+Math.min(i,sd.orders.length-1)+',';
if(step.dead&&numericAction)numericKills.push(index);
if(ci<SOLVER_ROUND_SIZE&&step.dead)s.r1Removal=true;
down=step.dead&&target.groupIdx===0;
}
if(!target.alive&&target.groupIdx>0)s.companionKilled=true;
if(down){if(raceMulBars(ci,true))return done(false,ci,'race_mul_kill');s.mainKilled=true;s.lastMainKill=ci;}
}
if(s.lastMainKill!==ci){
if(mul>1&&ci!==lastCI)return stop(ci,'egg_chip');
if(raceMulBars(ci,false,true))return done(false,ci,'race_mul_kill');
}
}
if(s.weakKill>=0)return done(false,s.weakKill,'weak_killer');
for(const list of eggBenefited)if(!list.some(t=>numericKills.includes(t)))return done(false,combo.length-1,'no_egg_damage_goal');
if(inlineFource&&!fourceBenefited.some(t=>numericKills.includes(t)))return done(false,combo.length-1,'no_fource_damage_goal');
return done(sim.every(i=>!i.alive),-1,null);
};
const worlds=battle&&new Map();
const worldRuns=(mode,eggAssign)=>{
const key=worlds&&JSON.stringify([mode,eggAssign||null]);
if(worlds&&worlds.has(key))return worlds.get(key);
const pending=[];pending.kills=[];
const list=[play(mode,eggAssign,null,pending)];
list.kills=pending.kills;
list.more=()=>pending.length>0&&list.push(play(mode,eggAssign,pending.pop(),pending))>0;
if(worlds)worlds.set(key,list);
return list;
};
work={chars,eggCIs,finIdx,eggEligibleCIs,externalAssign,mercyFinal,cost,orangeStart,worldRuns,shaky,captureActions};
if(battle)battle.work=work;
}
const{chars,eggCIs,finIdx,eggEligibleCIs,externalAssign,mercyFinal,cost,orangeStart,worldRuns,shaky,captureActions}=work;
const runs=evaluation&&evaluation.runs,trace=evaluation&&evaluation.trace;
if(runs)runs.shaky=shaky;
const allocations=evaluation&&evaluation.eggTargets!==undefined?[{eggAssign:forcedEggAssign,eggTargets:evaluation.eggTargets}]:eggCIs.length?buildSolverEggAssignments(eggCIs,eggEligibleCIs,(egg,ci)=>solverEggCanReach(combo,egg,ci,assign,chars),forcedEggAssign)
:[{eggAssign:forcedEggAssign!==undefined?forcedEggAssign:externalAssign,eggTargets:{}}];
const assigns=allocations.map(row=>row.eggAssign);
const fits=run=>!evaluation||(evaluation.bat===undefined||run.actualAT+cost(run)===evaluation.bat)&&(!evaluation.accept||evaluation.accept(run));
const sameAim=(x,y)=>x.length===y.length&&x.every((v,k)=>v===y[k]);
const paired=(low,high,gold)=>sameAim(low.aim,high.aim)&&low.actualAT===high.actualAT&&cost(low)===cost(high)&&(!gold||low.fallbackKind===high.fallbackKind);
const minRuns=[],maxRuns=[],minOf=i=>minRuns[i]||(minRuns[i]=worldRuns('min',assigns[i]));
let best=null,rejectedRun=null;
const maxOf=(i,low,gold)=>{
if(low&&!fits(low))return;
const highs=maxRuns[i]||(maxRuns[i]=worldRuns('max',assigns[i]));
if(!low)return highs;
for(let c=0;c<highs.length||highs.more();c++){
const high=highs[c];
if(!high.allDead||high.rejectAt>=0){if(!rejectedRun&&(gold||high.reason==='kill_damage'))rejectedRun=high;continue;}
if(paired(low,high,gold))return best={rating:gold?'gold':'orange',index:i,low,high};
}
};
goldSearch:for(let i=0;i<assigns.length;i++){
const assign=assigns[i],lows=minOf(i);
const triedKills=mercyFinal&&assign&&new Set();
for(let a=0;a<lows.length||lows.more();a++){
const r=lows[a];
if(!r.allDead||r.rejectAt>=0)continue;
const k=r.lastMainKill;
if(triedKills&&k>=0&&!triedKills.has(k)){
triedKills.add(k);
const cmp=solverOrder.egg(k),preferred=[];
for(let j=i+1;j<assigns.length;j++)if(assigns[j]&&cmp(assigns[j],assign)<0)preferred.push(j);
for(const index of preferred.sort((x,y)=>cmp(assigns[x],assigns[y]))){
const others=minOf(index);
for(let b=0;b<others.length||others.more();b++){
const low=others[b];
if(low.allDead&&low.rejectAt<0&&low.lastMainKill===k&&maxOf(index,low,true))break goldSearch;
}
}
}
if(maxOf(i,r,true))break goldSearch;
}
}
const visitedRuns=minRuns.length===1?minRuns[0]:minRuns.flat();
if(raceMulKills&&raceMulKills.c===combo){
for(const r of visitedRuns)if(r.lastMainKill>=0)raceMulKills.k.add(r.lastMainKill);
for(const list of minRuns)if(list)for(const k of list.kills)raceMulKills.k.add(k);
}
const finish=(orange,offsets)=>{
if(orange&&!best&&!mercyFinal&&!solverGoldFound()){
orangeSearch:for(let i=0;i<assigns.length;i++){
const lows=minRuns[i];
for(let a=0;a<lows.length||lows.more();a++){
const low=lows[a];
if(orangeStart(low)&&maxOf(i,low,false))break orangeSearch;
}
}
}
const rating=best?best.rating:null,rejected=rejectedRun||visitedRuns[0];
if(best&&evaluation&&evaluation.pairs)for(let i=0;i<assigns.length;i++){
const lows=minOf(i),highs=maxOf(i);
while(lows.more());
while(highs.more());
for(const low of lows){
if(!fits(low)||(rating==='gold'?!low.allDead||low.rejectAt>=0:!orangeStart(low)))continue;
for(const high of highs)if(high.allDead&&high.rejectAt<0&&paired(low,high,rating==='gold'))
evaluation.pairs.push([...low.trace,...high.trace].filter(row=>!row.pre));
}
}
if(runs){
const traceRows=battle&&new WeakMap();
for(const[mode,all]of offsets?[['max',maxRuns]]:[['min',minRuns],['max',maxRuns]]){
all.forEach((list,alloc)=>{
for(let i=offsets&&offsets[alloc]||0;i<list.length;i++){
const r=list[i];
runs.push({mode,alloc,egg:assigns[alloc],trace:traceRows?r.trace.map(row=>solverMapEntry(traceRows,row,()=>({...row}))):r.trace,aim:r.aim,rejectAt:r.rejectAt,fource:r.reason==='no_fource_damage_goal',open:!fits(r)?0:r.rejectAt<0?r.allDead?2:0:orangeStart(r)?1:0});
}
});
}
}
if(trace){
trace.length=0;
for(const run of best?[best.low,best.high]:[rejected])if(run&&run.trace)for(const row of run.trace)if(!row.pre)trace.push(row);
}
if(outInfo){
const sigOf=run=>run.path.join(';');
if(best&&assigns[best.index])outInfo.eggAssign=assigns[best.index];
if(best&&allocations[best.index].eggTargets)outInfo.eggTargets=allocations[best.index].eggTargets;
outInfo.pathSig=best?sigOf(best.low)+'>'+sigOf(best.high):rejectedRun?sigOf(rejectedRun):'';
if(captureActions)outInfo.actionResults=best?best.low.actionResults:(rejected&&rejected.actionResults)||[];
outInfo.r1Removal=best?best.low.r1Removal:false;
outInfo.actualAT=best?best.low.actualAT:rejected?rejected.actualAT:undefined;
outInfo.fallbackKind=best&&best.rating==='gold'?best.low.fallbackKind:undefined;
outInfo.finIdx=finIdx;
outInfo.rejectLast=best?Infinity:visitedRuns.reduce((last,r)=>Math.max(last,r.rejectAt<0?Infinity:r.rejectAt),-1);
outInfo.reachLast=best?Infinity:visitedRuns.reduce((last,r)=>Math.max(last,r.rejectAt<0?Infinity:r.rejectAt-(r.reason==='earlyclear'&&r.path[r.path.length-1]===r.rejectAt+':!earlyclear'?1:0)),-1);
}
return rating;
};
const orange=!evaluation||!_solverGoldState||_solverGoldState.orange;
const rating=finish(orange);
if(!best&&!mercyFinal&&!orange&&!solverGoldFound()&&outInfo&&visitedRuns.some(r=>orangeStart(r)&&fits(r))){
outInfo.resume=()=>{
outInfo.resume=null;
return finish(true,runs&&maxRuns.map(list=>list.length));
};
}
return rating;
}
const _solverVariantSegs=new WeakMap(),_solverVariantIds=new Map();
const solverGenericEquips=new WeakMap(),solverCounterpartIds=new WeakMap();
const solverPriSwapSeen=new WeakMap();
function solverComboActionSignature(combo,intern=false,slot,equip){
let sig='';
for(let i=0;combo&&i<combo.length;i++){
const v=combo[i],own=i!==slot;
let saved=own&&_solverVariantSegs.get(v);
if(!saved){
const ref=v.id===undefined?v.jp:v.id,sk=lookupSkill(ref);
const key=[sk?sk.id:ref,v.at||0,own?v.equip||'':equip,SolverActionGate.hits(v),v.earlyKill?1:0,v.aoeK!==undefined?v.aoeK:'',v.tgtGroup!==undefined?v.tgtGroup:'',v.needle?1:0,v.needDeath0?1:0,v.supTarget?1:0,v.metalFirst?1:0,v.priSwap?1:0].join('\x1f');
let id=_solverVariantIds.get(key);
if(id===undefined)_solverVariantIds.set(key,id=_solverVariantIds.size.toString(36));
saved={key,id};
if(own)_solverVariantSegs.set(v,saved);
}
if(i)sig+='\x1e';
sig+=intern?saved.id:saved.key;
}
return sig;
}
function solverComboFacts(combo,forms,withSlots=true){
let facts=forms.get(combo);
if(!facts)forms.set(combo,facts={sig:solverComboActionSignature(combo,true)});
if(withSlots&&!facts.slots)facts.slots=solverIndicesOf(combo,v=>{const w=WEAPON_META[v.equip];return!!w&&!w.generic;});
return facts;
}
function solverGenericCounterpartKeys(combo,{sig,slots},results,goldOnly){
const parts=results?null:[];
let last=Infinity,start=0,ci=0;
for(const slot of slots){
const v=combo[slot];
let ids=solverCounterpartIds.get(v);
if(!ids){
const sk=lookupSkill(v.jp),eqs=solverMapEntry(solverGenericEquips,sk,()=>['',...Object.keys(WEAPON_META).filter(eq=>WEAPON_META[eq].generic&&solverWeaponCompatible(sk,eq))]);
solverCounterpartIds.set(v,ids=eqs.map(eq=>solverComboActionSignature([v],true,0,eq)));
}
if(results&&(last!==Infinity||weaponMetaValue(v.equip,'pri')))continue;
for(;ci<slot;ci++)start=sig.indexOf('\x1e',start)+1;
const end=sig.indexOf('\x1e',start),prefix=sig.slice(0,start),suffix=end<0?'':sig.slice(end),keys=parts&&[];
for(const id of ids){
const key=prefix+id+suffix;
if(keys)keys.push(key);
else{
const row=results.get(key);
const before=typeof row==='number'?row%16-1:row&&(!row.best||goldOnly&&row.best.rating==='orange')?row.last:Infinity;
if(before<slot){last=before;break;}
}
}
if(keys)parts.push(keys);
}
return parts||last;
}
function solverGenericSwapKey({assignmentSearch,T,genericSwapOf},combo){
let key=genericSwapOf.get(combo);
if(!key){
const facts=solverComboFacts(combo,assignmentSearch.forms),sig=facts.sig,parts=solverGenericCounterpartKeys(combo,facts);
const normalize=s=>s.split('\x1e').sort().join('\x1e');
key=T===1?{key:normalize(sig),parts:parts.map(keys=>keys.map(normalize))}:{key:sig,parts};
genericSwapOf.set(combo,key);
}
return key;
}
function solverGenericSwapRank(swap,ranks,rank,best){
if(best===undefined){
best=swap.parts.length?0:-1;
for(const keys of swap.parts)for(const key of keys)best=Math.max(best,ranks.get(key)||0);
}
if(rank!==undefined)ranks.set(swap.key,Math.max(ranks.get(swap.key)||0,best,rank));
return best;
}
function solverConditionStatKeys(sk,atkOnly=false){
if(!sk||sk.fixedDmg||atkOnly&&(sk.dmg||sk.el===12||solverFieldMetal&&isMetalExecutionAction(sk)||sk.at&&sk.at[0]===0))return[];
return sk.dmg?(DMG_STAT[sk.dmg.st]||[[]])[0].slice():['atk'];
}
function solverVarReads(v,actor,keys){return v.index===actor&&(v.keys||[v.key]).some(key=>keys.includes(key));}
function cloneSolverConditionParty(party,vars,values,minimum=false){
const out=party.map(c=>({...c,stats:minimum?{...c.stats,...MIN_STATS}:{...c.stats}}));
if(vars)vars.forEach((v,i)=>{
const stats=out[v.index].stats,fields=_solverStatDomains.get(v.key).sum,prio=v.floor>v.legal;
if(!fields){stats[v.key]=values[i];return;}
let extra=values[i]-solverStatMin(v.key,0,prio);
for(const key of fields){const floor=solverStatMin(key,0,prio),share=Math.min(999-floor,extra);stats[key]=floor+share;extra-=share;}
});
return out;
}
function solverConditionStatUsage(combo,proof,targets,visit){
const byActor=visit?null:new Map(),assign=proof&&proof.assign,results=proof&&proof.actionResults||[],pathRows=proof&&proof.pathSig?proof.pathSig.split(';'):null;
const nonMetal=(targets||[]).some(g=>!solverFieldMetal||!isMetalHex(g.hex));
combo.forEach((action,ci)=>{
const index=assign?assign[ci]:undefined;
if(index===undefined)return;
const sk=lookupSkill(action.jp),equip=action.equip||solverDefaultEquip(sk),result=results.find(r=>r.ci===ci);
const path=pathRows&&pathRows.find(v=>v.startsWith(ci+':d:'));
const silent=!sk||!(action.at>0)||solverFieldMetal&&isMetalExecutionAction(action)||!sk.dmg&&weaponMetaValue(equip,'fixedDmg')
||!(path?(path.match(/\b[0-9A-F]{3}\b/g)||[]).some(hex=>!solverFieldMetal||!isMetalHex(hex)):nonMetal)
||result&&Array.isArray(result.targets)&&!result.targets.some(t=>!solverFieldMetal||!isMetalHex(t.hex));
let stats=silent?[]:solverConditionStatKeys(sk);
const combined=stats.length&&proof&&proof.statBounds&&proof.statBounds.find(b=>b.index===index&&b.keys&&sk.dmg&&b.key===sk.dmg.st);
if(combined)stats=[combined.key];
if(visit){visit(ci,index,stats,sk);return;}
let entry=byActor.get(index);
if(!entry)byActor.set(index,entry={index,stats:[],actions:[]});
entry.actions.push({ci,stats,equip});
for(const key of stats)if(!entry.stats.includes(key))entry.stats.push(key);
});
if(byActor)return[...byActor.values()].sort(solverOrder.index);
}
function calcSolverMinStat(combo,hexId,tensionMul,fource,scoreMemo=false,prepared={}){
const state=_solverDmgCache.search,memo=_solverGoldState&&_solverGoldState.estimates||state,mul=tensionMul||1;
const chars=mul>1&&_solverUseStats?readCharStatsFromDom():null;
const levels=chars?combo.map((_,ci)=>actorLv(chars,null,ci)):prepared.levels||(prepared.levels=combo.map(()=>99));
const fEls=getFourceEls(fource);
const ids=prepared.ids||(prepared.ids=(prepared.sig||solverComboActionSignature(combo,true)).split('\x1e'));
const reqKey=scoreMemo?null:(prepared.idKey||(prepared.idKey=JSON.stringify(ids)))+'|'+JSON.stringify([hexId,mul,fEls,!!fource,levels]);
if(!scoreMemo&&memo.requirements.has(reqKey))return memo.requirements.get(reqKey);
const mon=MONSTER_DB[hexId],skills=prepared.skills||(prepared.skills=combo.map(v=>lookupSkill(v.jp)));
let result=null;
if(mon&&combo.length){
const hp=mon.s[0],hpLow=monHpMin(hp),hits=prepared.hits||(prepared.hits=combo.map(SolverActionGate.hits));
const single=combo.length===1,rows=scoreMemo&&!single?solverMapEntry(prepared.rows||(prepared.rows=new Map()),fEls,()=>[]):[];
const reads=!single&&(prepared.reads||(prepared.reads=skills.map(sk=>solverConditionStatKeys(sk))));
const damageAt=(ci,key,value,sum)=>{
const sk=skills[ci],action=combo[ci];
if(!single&&(!sk||action.at===0||solverFieldMetal&&isMetalExecutionAction(action)))return{min:0,max:0};
if(!single&&key&&!reads[ci].includes(key)){key=null;value=0;}
const slot=key||'';
let table=rows[ci]&&rows[ci][slot];
if(!table){
const rowKey=ids[ci]+'|'+JSON.stringify(single?[hexId,fEls,'single',slot,mul,levels[ci]]:[hexId,fEls,slot]);
table=solverMapEntry(state.damage,rowKey);
if(!rows[ci])rows[ci]={};rows[ci][slot]=table;
}
const known=table.get(value);if(known!==undefined)return known;
const stats=sum?cloneSolverConditionParty([{stats:MIN_STATS}],[{index:0,key}],[value])[0].stats:{...(single?MIN_STATS:EXT_STATS)};
if(key&&!sum)stats[key]=value;
const range=calcSkillDamageCache(sk,stats,hexId,fEls,actionPlus1(sk,action.equip),action.equip);
let damage;
if(single)damage=range?solverActionDamage(sk,hexId,fEls,range,hits[ci],mul,levels[ci]):null;
else damage=range?{min:range.min*hits[ci],max:range.max*hits[ci],hit:range}:{min:0,max:0};
table.set(value,damage);return damage;
};
if(single){
const action=combo[0],sk=skills[0];
if(sk&&!(solverFieldMetal&&isMetalExecutionAction(action))&&!(fource&&sk.el)&&!(!sk.dmg&&sk.el)){
if(sk.el&&solverTargetImmuneToElement(sk.el,hexId))result={stat:null,min:Infinity};
else{
const keys=solverConditionStatKeys(sk),sum=!_solverUseStats&&sk.dmg&&_solverStatDomains.get(sk.dmg.st)&&_solverStatDomains.get(sk.dmg.st).sum;
const key=sum?sk.dmg.st:keys[0],scaling=!!key,ceiling=sum?sum.length*999:999;
const kill=value=>{const damage=damageAt(0,key,value,sum);return!!damage&&damage.min>=hp;};
const safe=value=>{const damage=damageAt(0,key,value,sum);return!!damage&&SolverActionGate.survivesBeforeHit(hits[0],damage.head,hpLow);};
if(!scaling){if(kill(0)&&safe(0))result={stat:null,min:0};}
else if(kill(ceiling)){
const minimum=binarySearchTrue(solverStatMin(key),ceiling,kill,'min');
if(hits[0]<=1||safe(minimum))result={stat:key,min:minimum};
}
}
}
}else{
const paper=solverPaperDamageUpperBound(combo,hexId,mul,fEls,ids);
if(!(Number.isFinite(paper)&&paper<hpLow)){
const all=prepared.all||(prepared.all=ids.slice().sort().join('\x1d'));
const boosted=(damage,ci)=>{
const hit=damage.hit,lv=levels[ci];
const saved=lv===99&&hit&&(damage.byTension||(damage.byTension={}));
const known=saved&&saved[mul];
if(known)return known;
const result=solverActionDamage(skills[ci],hexId,fEls,hit||{min:0,max:0},hits[ci],mul,lv);
if(saved)saved[mul]=result;
return result;
};
const gate=prepared.gate||(prepared.gate=makeFinisherGate(combo));
let best=null;
for(let fi=0;fi<combo.length;fi++){
if(!gate(fi))continue;
const driveKeys=reads[fi],key=driveKeys.length===1?driveKeys[0]:null;
let candidate;
if(!key){
if(!_solverUseStats&&!scoreMemo&&driveKeys.length===0){
const finKey='fixed|'+ids[fi]+'|'+JSON.stringify([hexId,mul,fEls,levels[fi],hits[fi]]);
let saved=memo.finisher.get(finKey);
if(saved===undefined){
const damage=boosted(damageAt(fi,null,0),fi);
saved=damage.min>=hp&&SolverActionGate.survivesBeforeHit(hits[fi],damage.head,hpLow)?{minS:0,capS:999,fixed:true}:null;
memo.finisher.set(finKey,saved);
}
if(saved)candidate={key:null,fi,...saved};
}
}else{
const finKey=all+'|'+ids[fi]+'|'+JSON.stringify([hexId,mul,fEls,key,levels[fi]]);
let saved=memo.finisher.get(finKey);
if(saved===undefined||!scoreMemo&&saved&&saved.capS===undefined){
const sumKey=all+'|'+JSON.stringify([hexId,fEls,key]);
const sums=solverMapEntry(memo.aggregate,sumKey);
const evaluate=value=>{
let sum=sums.get(value);
if(sum===undefined){
sum={min:0,max:0};
for(let ci=0;ci<combo.length;ci++){const damage=damageAt(ci,key,value);sum.min+=damage.min;sum.max+=damage.max;}
sums.set(value,sum);
}
const fin=damageAt(fi,key,value);
return{min:sum.min-fin.min,max:sum.max-fin.max,fin};
};
const gold=value=>{const e=evaluate(value);return e.max+e.fin.max>=hpLow&&e.min+boosted(e.fin,fi).min>=hp;};
const safe=value=>{const e=evaluate(value);return e.max<hpLow&&SolverActionGate.survivesBeforeHit(hits[fi],boosted(e.fin,fi).head,hpLow-e.max);};
if(saved===undefined){
saved=null;
if(gold(999)){
const minimum=binarySearchTrue(solverStatMin(key),999,gold,'min');
if(safe(minimum))saved={minS:minimum};
}
memo.finisher.set(finKey,saved);
}
if(!scoreMemo&&saved&&saved.capS===undefined&&(!best||saved.minS<=best.minS))saved.capS=binarySearchTrue(saved.minS,999,safe,'max');
}
if(saved)candidate={key,fi,minS:saved.minS,capS:saved.capS===undefined?999:saved.capS};
}
if(!candidate)continue;
if(!best||candidate.minS<best.minS||(candidate.minS===best.minS&&candidate.capS>best.capS))best=candidate;
if(!key&&best.minS===0&&best.capS===999)break;
}
if(best)result=scoreMemo?{min:best.minS}:best.fixed?{stat:null,min:0,finIdx:best.fi,fixedFinisher:true}:{stat:best.key,min:best.minS,finIdx:best.fi};
}
}
}
if(!scoreMemo)memo.requirements.set(reqKey,result);
return result;
}
function verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tensionMul,fourceEls,forcedEggAssign,captureActions,diagnostic,evaluatedRating,eggTargets){
if(!combo.length||combo.length>SOLVER_MAX_ACTIONS||!priOrderOK(combo)||!solverMultiPlayerEnabled()&&isMultiTargetOnly(combo))return null;
if(!assign||assign.length!==combo.length||!party||party.length!==SOLVER_ROUND_SIZE)return null;
if(!solverConditionPartyDomainOK(party))return null;
const locks=combo.map(getSkillClassLock),pri=combo.map(_actionPri);
let state=0;
for(let ci=0;ci<combo.length;ci++){
const actor=assign[ci];
if(!Number.isInteger(actor)||actor<0||actor>=party.length)return null;
state=solverActorSlotOK(ci,actor,party[actor].job,locks,pri,state);
if(state<0)return null;
}
if(!solverEarlyStopStructureOK(combo))return null;
if(solverFinalActionIndex(combo)===undefined)return null;
const mon=MONSTER_DB[hexId],out=diagnostic||{};
const total=targets&&targets.length?groupTotal(targets):1;
const parties=out.battles&&solverMapEntry(out.battles,assign.join(',')),partyKey=parties&&JSON.stringify(party);
const compact=parties&&(total>1||solverGoldFound())&&!('kind'in out);
let battle;
if(parties&&!compact){
battle=parties.get(partyKey);
if(!battle||battle===true)parties.set(partyKey,battle={});
}
const trace=out.trace||(out.runs||parties?[]:null);
const rating=evaluatedRating===undefined?checkSolverDamage(combo,hexId,mon,targets,
tensionMul,fourceEls,out,assign,forcedEggAssign,party,
{captureActions:captureActions||!!(out.accept||parties),eggTargets,bat,runs:out.runs,trace,pairs:out.pairs,battle,neutral:out.neutral,
accept:run=>(!out.accept||out.accept(run.actionResults))&&(!('kind'in out)||run.fallbackKind===out.kind)}):evaluatedRating;
const finish=rating=>{
if(compact)parties.set(partyKey,rating==='gold'?true:null);
if(!rating)return null;
const r1Removal=combo.length>SOLVER_ROUND_SIZE&&!!out.r1Removal;
const cost=solverRoundCost(combo,total,r1Removal);
if(!Number.isInteger(out.actualAT))return null;
if(evaluatedRating!==undefined)solverNoteGold(rating);
return{rating,party,assign:assign.slice(),eggAssign:out.eggAssign||forcedEggAssign||null,eggTargets:out.eggTargets||eggTargets||{},
finIdx:out.finIdx,actualAT:out.actualAT,roundCost:cost,pathSig:out.pathSig||'',
...(out.fallbackKind?{fallbackKind:out.fallbackKind}:{}),
...(out.actionResults?{actionResults:out.actionResults}:{}),...(parties?{trace}:{})};
};
if(!rating&&out.resume){
const resume=out.resume;
let result;
out.resume=()=>{
if(result===undefined)result=finish(resume());
return result;
};
if(out.runs)out.runs.resume=out.resume;
}
return finish(rating);
}
function solverConditionVariables(combo,assign,targets,pathSig){
const state=_solverDmgCache.search,rows=[];
solverConditionStatUsage(combo,{assign,pathSig},targets,(ci,index,stats,sk)=>{
if(!stats.length)return;
const domain=sk.dmg&&_solverStatDomains.get(sk.dmg.st);
rows.push({ci,index,fields:stats.map(key=>[key,solverStatMin(key,combo[ci].equip)]),driver:domain&&domain.sum?sk.dmg.st:null});
});
const below=!!_solverGoldState&&!!_solverGoldState.below,signature=+below+rows.map(r=>r.ci+':'+r.index+':'+r.fields.map(f=>f.join(':')).join(',')+(r.driver?':'+r.driver:'')).join('|');
let vars=state.variables.get(signature);
if(vars!==undefined)return vars;
vars=[];
const seen=new Map();
for(const{ci,index,fields,driver}of rows){
const domain=driver&&_solverStatDomains.get(driver);
const combined=domain&&!rows.some(o=>o.index===index&&o.driver!==driver&&o.fields.some(([key])=>domain.sum.includes(key)));
for(const[key,legal]of combined?[[driver,domain.min]]:fields){
const id=index+':'+key,known=seen.get(id),prio=solverStatMin(key,combo[ci].equip,true);
if(known){known.legal=Math.max(known.legal,legal);known.prio=Math.max(known.prio,prio);known.floor=below?known.legal:known.prio;continue;}
const value={index,key,first:ci,legal,prio,floor:below?legal:prio,...(combined?{keys:domain.sum,ceiling:domain.max}:{})};
seen.set(id,value);
vars.push(value);
}
}
state.variables.set(signature,vars);
return vars;
}
function solverConditionRegionKey(instances,decays,trace){
const hits={min:instances.map(()=>[]),max:instances.map(()=>[])},needs=[];
for(const row of trace){
if(row.weaponRequirements)needs.push([row.ci,row.mode,row.fourceOn,row.weaponRequirements]);
const decay=decays[row.ci];
row.steps.forEach((step,i)=>hits[row.mode][step.index].push([row.ci,row.fourceOn,decay?Math.min(i+1,5):1,step.execute,step.dead,step.killFloor,step.live]));
}
return JSON.stringify([needs,...['min','max'].map(mode=>instances.map((inst,i)=>inst.hex+'|'+inst.hp+'|'+inst.hpLow+'|'+JSON.stringify(hits[mode][i])).sort())]);
}
function findVariableConditionProof(combo,targets,hexId,bat,assign,tensionMul,fourceEls,accept,runs,vars,goldOnly,battles,defer,region){
const party=NEUTRAL_PARTY(),sample=region&&region.proof,regions=sample&&new Map();
const verify=(values,list)=>{
const candidate=values?cloneSolverConditionParty(party,vars,values):party,pairs=sample&&[];
const diagnostic=sample?{accept,kind:sample.fallbackKind,runs:list,pairs}:{accept,runs:list,battles};
const proof=verifySolverConditionParty(combo,targets,hexId,bat,candidate,assign,tensionMul,fourceEls,sample?sample.eggAssign:undefined,!sample&&!!accept,diagnostic,undefined,sample?sample.eggTargets:undefined);
solverProofReach=Math.max(solverProofReach,diagnostic.reachLast>=0?diagnostic.reachLast:Infinity);
if(!sample)return proof;
if(proof&&proof.rating===sample.rating&&proof.fallbackKind===sample.fallbackKind)for(const trace of pairs){
const key=solverConditionRegionKey(region.instances,region.decays,trace);
if(!regions.has(key))regions.set(key,{party:candidate,trace});
}
return null;
};
if(sample)verify(null,runs=[]);
const seek={runs,goldOnly:goldOnly||!sample&&solverGoldFound(),defer,verify};
const root={assign,party,seek,vars};
if(sample)root.eggAssign=sample.eggAssign;
const result=solveSolverConditionBounds(combo,targets,hexId,bat,root,tensionMul,fourceEls);
return sample?regions:result;
}
function solveSolverConditionBounds(combo,targets,hexId,bat,proof,tensionMul,fourceEls,accept,battles,defer){
const vars=proof.vars||solverConditionVariables(combo,proof.assign,targets,proof.regions?undefined:proof.pathSig);
const wide=()=>vars.map(v=>({lo:v.floor,hi:v.ceiling||999})),tag=x=>x.t+x.part+x.sign;
const seek=proof.seek,below=!!_solverGoldState&&_solverGoldState.below&&(seek?seek.goldOnly:proof.rating==='gold')&&vars.map(v=>v.prio);
const{instances,uniqueHexes}=buildSimInstances(targets,true),constraints=[],terms=[],termRows=combo.map(()=>Object.create(null)),termInputs=[];
const skills=combo.map(v=>lookupSkill(v.jp)),decays=skills.map(sk=>!!sk&&atkDecay(sk));
const fource=findInlineFource(combo),fEls=getFourceEls(fource,fourceEls);
const valuesOf=party=>vars.map(v=>v.keys?getDamageStat(v.key,party[v.index].stats):party[v.index].stats[v.key]);
let reference=valuesOf(proof.party);
const term=(ci,hex,on,mul=(proof.eggAssign||{})[ci]||1,order)=>{
const n=decays[ci]?Math.min(order||1,5):1;
const row=termRows[ci],slots=row[hex]||(row[hex]=[]);
const key=mul===1?n+(on?5:0):mul+'|'+!!on+'|'+n,saved=slots[key];
if(saved!==undefined)return saved;
const action=combo[ci],sk=skills[ci],ai=proof.assign[ci],metal=solverFieldMetal&&isMetalHex(hex);
let input=termInputs[ci];
if(!input){
const keys=solverConditionStatKeys(sk);
const depends=solverIndicesOf(vars,v=>solverVarReads(v,ai,keys));
input=termInputs[ci]={keys,depends,hits:SolverActionGate.hits(action)};
}
const keys=metal?[]:input.keys,depends=metal?[]:input.depends,hits=input.hits;
const lv=proof.party[ai].lv,single=depends.length===1?depends[0]:-1;
const sumVar=single>=0&&vars[single].keys?[{index:0,key:vars[single].key}]:null,actor=sumVar?[proof.party[ai]]:null;
const total=depends.length>1&&!!sk.dmg&&!!(_solverStatDomains.get(sk.dmg.st)||{}).sum;
let shared=seek&&(total||single>=0&&(sumVar||keys.length===1))&&JSON.stringify([sk.id,action.equip,hits,hex,on&&fEls,mul,depends.map(i=>[vars[i].key,vars[i].legal]),total&&keys.map(key=>proof.party[ai].stats[key]),n]);
if(shared){const pool=_solverDmgCache.search.terms;shared=pool.get(shared)||pool.set(shared,{cache:[],dips:{}}).get(shared);}
const cache=depends.length>1?new Map():shared?shared.cache:[],line=total&&shared?shared.cache:[];
const t={depends,single,total,cache,dips:{},span(box){
if(single>=0)return box[single];
let lo=0,hi=0;
for(const i of depends){lo+=box[i].lo;hi+=box[i].hi;}
return{lo,hi};
},at(value){
const probe=[];
if(single>=0){
if(cache[value]!==undefined)return cache[value];
probe[single]=value;
return this.read(probe);
}
if(line[value])return line[value];
let extra=value;
for(const i of depends)extra-=vars[i].floor;
for(const i of depends){const share=Math.min((vars[i].ceiling||999)-vars[i].floor,extra);probe[i]=vars[i].floor+share;extra-=share;}
return line[value]=this.read(probe);
},read(values,box,upper){
const key=single>=0?(values?values[single]:upper?box[single].hi:box[single].lo):depends.length?depends.map(i=>values?values[i]:upper?box[i].hi:box[i].lo).join(','):0;
const known=depends.length>1?cache.get(key):cache[key];
if(known!==undefined)return known;
const stats=sumVar?cloneSolverConditionParty(actor,sumVar,[key])[0].stats:{...proof.party[ai].stats};
if(single>=0&&!sumVar)stats[vars[single].key]=key;
else if(single<0)for(const i of depends)stats[vars[i].key]=values?values[i]:upper?box[i].hi:box[i].lo;
const d=skillDamagePerHit(sk,action,hex,stats,on?fEls:null,n);
const t=solverActionDamage(sk,hex,on?fEls:null,d,hits,mul,lv);
const off=on&&!sk.el&&solverActionDamage(sk,hex,null,skillDamagePerHit(sk,action,hex,stats,null,n),hits,mul,lv);
const result={min:t.min,max:t.max,head:t.head,hitmin:d.min,hitmax:d.max,none:d.none?1:0,plus:d.plus1Eff||0,gain:off&&(t.min>off.min||t.max>off.max)?1:0};
if(depends.length>1)cache.set(key,result);else cache[key]=result;
return result;
},dip(part,b){
let list=this.dips[part];
if(!list){
list=this.dips[part]=[];
const whole=this.span(wide());
for(let value=whole.lo,last=-Infinity;value<=whole.hi;value++){
const now=this.at(value)[part];
if(now<last)list.push(value);
last=now;
}
}
for(let i=0;i<list.length;i++)if(list[i]>b.lo&&list[i]<=b.hi)return true;
return false;
}};
if(shared){const w=t.span(wide()),id=w.lo+':'+w.hi;t.dips=shared.dips[id]||(shared.dips[id]={});}
const index=terms.length;
terms.push(t);slots[key]=index;return index;
};
const shapes=new Map(),shape=new Int8Array(vars.length);
const ready=c=>{
shape.fill(0);
let fixed=0,key=0;
for(let xi=c.expr.length-1;xi>=0;xi--){
const x=c.expr[xi],t=terms[x.t];x.term=t;
for(const vi of t.depends){
const prior=shape[vi];
if(prior!==2)shape[vi]=prior&&prior!==x.sign?2:x.sign;
}
if(!t.depends.length){fixed+=x.sign*t.read(reference)[x.part];c.expr.splice(xi,1);}
}
for(let vi=0;vi<shape.length;vi++)key=key*4+shape[vi]+1;
c.directions=shapes.get(key)||shapes.set(key,shape.slice()).get(key);
c.rhs-=fixed;
return c;
};
const fin=solverFinalActionIndex(combo,true),finSk=skills[fin];
const finKeys=finSk&&['A','G'].includes(SolverActionGate.targetKind(finSk))&&!isSolverNonDamageRemoval(combo[fin])&&solverConditionStatKeys(finSk),lead=finKeys?vars.findIndex(v=>solverVarReads(v,proof.assign[fin],finKeys)):-1;
const limits=(c,box,point)=>{
if(c.any)return c.any.some(x=>limits(x,box,point));
let value=0;
for(const x of c.expr){
const t=x.term,upper=(c.op==='ge')===(x.sign>0),key=t.single>=0?(point?point[t.single]:upper?box[t.single].hi:box[t.single].lo):undefined;
if(seek&&!point){
if(t.single<0&&!t.total){if(t.depends.some(vi=>box[vi].lo<box[vi].hi))return true;}
else{
const b=t.span(box);
if(b.lo<b.hi&&t.dip(x.part,b)){
const memo=x.part+(upper?'+':'-')+b.lo+','+b.hi;
let far=t.dips[memo];
if(far===undefined){
far=upper?-Infinity:Infinity;
for(let at=b.lo;at<=b.hi;at++)far=Math[upper?'max':'min'](far,t.at(at)[x.part]);
t.dips[memo]=far;
}
value+=x.sign*far;continue;
}
}
}
const d=key===undefined?t.read(point,box,upper):t.cache[key]===undefined?t.read(point,box,upper):t.cache[key];
value+=x.sign*d[x.part];
}
return c.op==='ge'?value>=c.rhs:value<=c.rhs;
};
const propagate=box=>{
let changed=true;
while(changed){
changed=false;
constraint:for(const original of constraints){
let c=original;
if(original.any){
c=null;
for(const option of original.any){
if(!limits(option,box))continue;
if(c)continue constraint;
c=option;
}
if(!c)return null;
}else if(!limits(c,box))return null;
for(let vi=0;vi<vars.length;vi++){
const direction=c.directions[vi];
if(!direction||direction===2)continue;
const lower=(c.op==='ge')===(direction>0),b=box[vi];
if(b.lo===b.hi||seek&&c.expr.some(x=>x.term.single<0&&!x.term.total&&x.term.depends.includes(vi)))continue;
const possible=value=>{
const lo=b.lo,hi=b.hi;b.lo=value;b.hi=value;
const ok=limits(c,box);b.lo=lo;b.hi=hi;return ok;
};
if(seek&&c.expr.some(x=>x.term.depends.includes(vi)&&x.term.dip(x.part,x.term.span(box)))){
let lo=b.lo,hi=b.hi;
while(lo<=hi&&!possible(lo))lo++;
while(hi>lo&&!possible(hi))hi--;
if(lo>hi)return null;
if(lo>b.lo||hi<b.hi){b.lo=lo;b.hi=hi;changed=true;}
continue;
}
if(lower&&!possible(b.lo)){
const value=binarySearchTrue(b.lo,b.hi,possible,'min');
if(!possible(value))return null;
b.lo=value;changed=true;
}else if(!lower&&!possible(b.hi)){
const value=binarySearchTrue(b.lo,b.hi,possible,'max');
if(value<b.lo)return null;
b.hi=value;changed=true;
}
}
}
}
return box;
};
let boundsReplays=0,boundsExhausted=false,boundsRejectStreak=0,boundsSlicing=false,findBudget=SOLVER_CONDITION_BOUNDS_FIND_LIMIT;
const checked=(values,verify=true)=>{
if(below&&constraints.length&&values.every((x,i)=>x>=below[i]))return null;
return seek?constraints.every(c=>limits(c,null,values)):checkBoundsPoint(values,verify);
};
let layout=null;
const tables=new Map();
const feasible=box=>{
if(!layout||layout.list.length!==constraints.length||constraints.some((c,i)=>layout.list[i]!==c)){
const extra=[],slots=new Map();
for(const c of constraints)if(!c.any)for(const x of c.expr){
const t=x.term,id=t.depends.join();
if(t.single<0&&t.total&&!slots.has(id)){slots.set(id,vars.length+extra.length);extra.push(t);}
t.slot=t.single>=0?t.single:t.total?slots.get(id):-1;
}
const axes=wide();axes.push(...extra.map(t=>t.span(axes)));
const unary=axes.map(()=>[]),multi=axes.map(()=>[]),rows=[],first=axes.map(()=>Infinity);let broken=false;
for(const c of constraints){
if(c.any||c.expr.some(x=>x.term.slot<0))continue;
const own=[...new Set(c.expr.map(x=>x.term.slot))];
if(!own.length){if(c.op==='ge'?0<c.rhs:0>c.rhs)broken=true;continue;}
if(own.length===1){unary[own[0]].push(c);continue;}
for(const vi of own){multi[vi].push({k:rows.length,expr:c.expr.filter(x=>x.term.slot===vi)});for(const x of c.expr)if(x.term.slot===vi)first[vi]=Math.min(first[vi],x.t);}
rows.push({c,own,ge:c.op==='ge',sign:c.op==='ge'?-1:1});
}
const at=axes.map((v,vi)=>rows.map((r,k)=>multi[vi].findIndex(m=>m.k===k)));
const kinds=axes.map(()=>null),label=axes.map(()=>null);
axes.forEach((v,vi)=>{
if(!unary[vi].length&&!multi[vi].length)return;
const shape=c=>c.expr.map(tag).join()+(c.op||'')+(c.op?c.rhs:''),amount=(expr,x)=>{let n=0;for(const y of expr)n+=y.sign*y.term.at(x)[y.part];return n;};
const sign=unary[vi].map(shape).join(';')+'|'+multi[vi].map(shape).join(';'),table=tables.get(sign);
if(table){kinds[vi]=table.list;label[vi]=table.label;return;}
const seen=new Map(),list=[],lo=v.lo,size=multi[vi].length;
label[vi]=new Int32Array(v.hi-lo+1).fill(-1);
let last=null,k=-1;
for(let x=lo;x<=v.hi;x++){
if(!unary[vi].every(c=>c.op==='ge'?amount(c.expr,x)>=c.rhs:amount(c.expr,x)<=c.rhs))continue;
const vec=multi[vi].map(m=>amount(m.expr,x));
let same=!!last;
for(let j=0;j<size&&same;j++)same=vec[j]===last[j];
if(!same){
const id=vec.join();
k=seen.get(id);
if(k===undefined){seen.set(id,k=list.length);list.push(vec);}
last=vec;
}
label[vi][x-lo]=k;
}
kinds[vi]=list;
tables.set(sign,{list,label:label[vi]});
});
const live=rows.map(()=>true);
const covers=(a,b)=>rows[b].sign*rows[b].c.rhs<=rows[a].sign*rows[a].c.rhs&&[...new Set([...rows[a].own,...rows[b].own])].every(vi=>{
const i=at[vi][a],j=at[vi][b];
return kinds[vi].every(vec=>(i<0?0:rows[a].sign*vec[i])<=(j<0?0:rows[b].sign*vec[j]));
});
rows.forEach((r,a)=>{live[a]=!rows.some((q,b)=>b!==a&&live[b]&&covers(a,b));});
const used=axes.map((v,vi)=>vi).filter(vi=>multi[vi].some(m=>live[m.k])).sort(solverOrder.axis(first)),bit=axes.map(()=>0);
used.forEach((vi,i)=>bit[vi]=1<<i);
const span=1<<used.length,cover=rows.map(r=>r.own.reduce((m,vi)=>m|bit[vi],0)),size=vi=>Math.max(2,kinds[vi].length),cost=new Float64Array(span);
for(let mask=1;mask<span;mask++){
const sets=new Map();
rows.forEach((r,k)=>{
if(!live[k]||!(cover[k]&mask)||!(cover[k]&~mask))return;
const items=r.c.expr.filter(x=>bit[x.term.slot]&mask),id=items.map(tag).sort().join();
const q=sets.get(id)||sets.set(id,{set:items.reduce((m,x)=>m|bit[x.term.slot],0),ge:false,le:false}).get(id);
q[r.ge?'ge':'le']=true;
});
let joint=0,all=0,top=-1,pivot=null;
const reach=q=>used.reduce((n,vi)=>bit[vi]&q.set?n+size(vi):n,0);
for(const q of sets.values()){all|=q.set;if(q.ge!==q.le&&reach(q)>top){top=reach(q);pivot=q;}}
for(const q of sets.values())if(q!==pivot)joint+=Math.log(reach(q));
cost[mask]=Math.min(joint,used.reduce((n,vi)=>bit[vi]&all?n+Math.log(size(vi)):n,0));
}
const worst=new Float64Array(span).fill(Infinity),total=new Float64Array(span).fill(Infinity),pick=new Int32Array(span).fill(-1);
worst[0]=0;total[0]=0;
for(let mask=0;mask<span;mask++)if(worst[mask]<Infinity)for(const vi of used){
if(bit[vi]&mask)continue;
const next=mask|bit[vi],w=Math.max(worst[mask],cost[next]),t=total[mask]+cost[next];
if(w<worst[next]||w===worst[next]&&t<total[next]){worst[next]=w;total[next]=t;pick[next]=vi;}
}
const order=[];
for(let mask=span-1;mask;mask^=bit[pick[mask]])order.unshift(pick[mask]);
const stage=axes.map(()=>-1);
order.forEach((vi,s)=>stage[vi]=s);
const from=rows.map(r=>Math.min(...r.own.map(vi=>stage[vi]))),to=rows.map(r=>Math.max(...r.own.map(vi=>stage[vi])));
let prior=null;
const stages=order.map((vi,s)=>{
const groups=[],ids=new Map(),of=new Map(),closing=[];
rows.forEach((r,k)=>{
if(!live[k]||from[k]>s||to[k]<s)return;
const parent=from[k]<s?prior.get(k):-1;
if(to[k]===s){closing.push({r,parent,pos:at[vi][k]});return;}
const picked=r.c.expr.filter(x=>stage[x.term.slot]<=s),id=picked.map(tag).sort().join();
let g=ids.get(id);
if(g===undefined){ids.set(id,g=groups.length);groups.push({parent,pos:at[vi][k],ge:[],le:[],reach:[...new Set(picked.map(x=>x.term.slot))].reduce((n,u)=>n+kinds[u].length,0)});}
groups[g][r.ge?'ge':'le'].push(k);of.set(k,g);
});
prior=of;
let pivot=-1;const exact=[];
groups.forEach((q,g)=>{if(!q.ge.length!==!q.le.length&&(pivot<0||q.reach>groups[pivot].reach))pivot=g;});
groups.forEach((q,g)=>{if(g!==pivot)exact.push(g);});
return{vi,groups,closing,pivot,exact,better:pivot<0?0:groups[pivot].ge.length?1:-1};
});
layout={extra,axes,list:constraints.slice(),broken,multi,rows,at,kinds,label,stage,stages,memo:new Map(),seen:new Map(),points:[]};
}
if(layout.broken)return false;
if(layout.extra.length)box=box.concat(layout.extra.map(t=>t.span(box)));
const known=box.map(b=>b.lo+','+b.hi).join(),answer=layout.seen.get(known);
if(answer!==undefined)return answer;
if(layout.points.some(p=>p.every((x,i)=>x<box[i].lo||x>box[i].hi?!layout.kinds[i]:true)))return true;
const{multi,rows,at,kinds,label,stage,stages,memo}=layout,span=[],result=(()=>{
for(let vi=0;vi<box.length;vi++){
if(!kinds[vi])continue;
const b=box[vi],key=vi+':'+b.lo+':'+b.hi;
let hit=memo.get(key);
if(!hit){
const marks=new Uint8Array(kinds[vi].length),list=[],xs=[],lo=layout.axes[vi].lo;
for(let x=b.lo;x<=b.hi;x++){const k=label[vi][x-lo];if(k>=0&&!marks[k]){marks[k]=1;list.push(kinds[vi][k]);xs.push(x);}}
const size=multi[vi].length,min=new Array(size).fill(Infinity),max=new Array(size).fill(-Infinity),dir=new Array(size).fill(1),down=new Array(size).fill(true);
for(let c=0;c<list.length;c++)for(let j=0;j<size;j++){
const now=list[c][j];
if(now<min[j])min[j]=now;
if(now>max[j])max[j]=now;
if(c&&now<list[c-1][j])dir[j]=0;
if(c&&now>list[c-1][j])down[j]=false;
}
for(let j=0;j<size;j++)if(!dir[j]&&down[j])dir[j]=-1;
hit={list,xs,dir,min,max};
memo.set(key,hit);
}
if(!hit.list.length)return false;
span[vi]=hit;
}
const rest=(k,s,side)=>{let n=0;for(const vi of rows[k].own)if(stage[vi]>s)n+=span[vi][side][at[vi][k]];return n;};
const plan=stages.map(({vi,groups,closing},s)=>{
const low=[],high=[];
groups.forEach((q,g)=>{
low[g]=-Infinity;high[g]=Infinity;
for(const k of q.ge)low[g]=Math.max(low[g],rows[k].c.rhs-rest(k,s,'max'));
for(const k of q.le)high[g]=Math.min(high[g],rows[k].c.rhs-rest(k,s,'min'));
});
return{low,high,pool:span[vi].list,dir:span[vi].dir,endPos:closing.map(z=>z.pos),endGe:closing.map(z=>z.r.ge),endRhs:closing.map(z=>z.r.c.rhs),endBase:new Array(closing.length),pos:groups.map(q=>q.pos),base:new Array(groups.length),vals:new Array(groups.length+2)};
});
let c1,c2;
const cut=(pool,way,j,need,atLeast)=>{
if(!way)return;
if(atLeast===way>0){let lo=c1,hi=c2+1;while(lo<hi){const mid=(lo+hi)>>1;if(atLeast?pool[mid][j]>=need:pool[mid][j]<=need)hi=mid;else lo=mid+1;}c1=lo;}
else{let lo=c1-1,hi=c2;while(lo<hi){const mid=(lo+hi+1)>>1;if(atLeast?pool[mid][j]>=need:pool[mid][j]<=need)lo=mid;else hi=mid-1;}c2=lo;}
};
const sweep=(s,prev,visit)=>{
const{groups,closing}=stages[s],{low,high,pool,dir,endPos,endGe,endRhs,endBase,pos,base,vals}=plan[s],G=groups.length,Z=closing.length;
c1=0;c2=pool.length-1;
for(let i=0;i<Z;i++){
endBase[i]=closing[i].parent<0?0:prev[closing[i].parent];
cut(pool,dir[endPos[i]],endPos[i],endRhs[i]-endBase[i],endGe[i]);
}
for(let g=0;g<G;g++){
base[g]=groups[g].parent<0?0:prev[groups[g].parent];
if(pos[g]<0)continue;
if(low[g]>-Infinity)cut(pool,dir[pos[g]],pos[g],low[g]-base[g],true);
if(high[g]<Infinity)cut(pool,dir[pos[g]],pos[g],high[g]-base[g],false);
}
for(let ci=c1,end=c2;ci<=end;ci++){
const vec=pool[ci];
let ok=true;
for(let i=0;i<Z;i++){const v=endBase[i]+vec[endPos[i]];if(endGe[i]?v<endRhs[i]:v>endRhs[i]){ok=false;break;}}
if(!ok)continue;
for(let g=0;g<G;g++){const v=base[g]+(pos[g]<0?0:vec[pos[g]]);if(v<low[g]||v>high[g]){ok=false;break;}vals[g]=v;}
if(!ok)continue;
if(visit(vals,ci))return true;
}
return false;
};
const point=box.map(b=>b.lo),path=[];
for(let vi=0;vi<box.length;vi++)if(span[vi])point[vi]=span[vi].xs[0];
let fuel=SOLVER_CONDITION_BOUNDS_DIVE;
const dive=(s,prev)=>s===stages.length||sweep(s,prev,(vals,ci)=>{
path[s]=ci;
return--fuel<0||dive(s+1,vals);
});
if(!dive(0,[]))return false;
if(fuel<0){
let states=[[]],pi;const trail=[];
for(let s=0;s<stages.length;s++){
const{pivot,exact,better}=stages[s],G=stages[s].groups.length,next=new Map(),only=exact.length===1?exact[0]:-1,last=s===stages.length-1;
const keep=(vals,ci)=>{
let id=only>=0?vals[only]:'';
if(exact.length>1){id=String(vals[exact[0]]);for(let i=1;i<exact.length;i++)id+=','+vals[exact[i]];}
const kept=next.get(id);
if(!kept){vals[G]=pi;vals[G+1]=ci;next.set(id,vals.slice());}
else if(better*(vals[pivot]-kept[pivot])>0){
for(let g=0;g<G;g++)kept[g]=vals[g];
kept[G]=pi;kept[G+1]=ci;
}
return last;
};
for(pi=0;pi<states.length;pi++)if(sweep(s,states[pi],keep))break;
states=[...next.values()];
if(!states.length)return false;
const links=new Uint32Array(states.length*2);
for(let i=0;i<states.length;i++){links[2*i]=states[i][G];links[2*i+1]=states[i][G+1];states[i].length=G;}
trail.push(links);
}
for(let s=stages.length-1,back=0;s>=0;s--){const links=trail[s];path[s]=links[2*back+1];back=links[2*back];}
}
stages.forEach(({vi},s)=>{point[vi]=span[vi].xs[path[s]];});
layout.points.push(point);
return true;
})();
layout.seen.set(known,result);
return result;
};
const copyBox=(box,axis,lo,hi)=>box.map((b,i)=>i===axis?{lo,hi}:{...b});
const find=(input,preferred,run={nodes:0,path:[],cut:-1})=>{
if(boundsExhausted)return null;
if(--findBudget<0){boundsExhausted=true;return null;}
run.nodes++;
const box=propagate(input);if(!box)return null;
if(below&&constraints.length&&box.every((b,i)=>b.lo>=below[i]))return null;
const candidate=box.map((b,i)=>Math.max(b.lo,Math.min(b.hi,preferred[i])));
if(seek&&below&&constraints.length&&candidate.every((x,i)=>x>=below[i])){const free=box.findIndex((b,i)=>b.lo<below[i]&&!constraints.some(c=>c.directions[i]));if(free>=0)candidate[free]=box[free].lo;}
if(checked(candidate))return candidate;
const low=box.map((b,i)=>seek&&!constraints.some(c=>c.directions[i])?candidate[i]:b.lo);if(checked(low))return low;
let vi=-1,width=0;
box.forEach((b,i)=>{if(b.hi-b.lo>width&&(!seek||constraints.some(c=>c.directions[i]))){vi=i;width=b.hi-b.lo;}});
if(vi<0)return null;
if(run.reach===undefined)run.reach=box.reduce((n,b)=>n+Math.ceil(Math.log2(b.hi-b.lo+1)),0);
if(run.nodes>run.reach&&!feasible(box)){run.cut=run.path.findIndex(b=>!feasible(b));return null;}
const mid=(box[vi].lo+box[vi].hi)>>1;
run.path.push(box);
const found=find(copyBox(box,vi,box[vi].lo,mid),preferred,run);
if(found||run.cut>=0&&run.cut<run.path.length){run.path.pop();return found;}
run.cut=-1;
const result=find(copyBox(box,vi,mid+1,box[vi].hi),preferred,run);
run.path.pop();
return result;
};
if(seek){
let lastNode=0;
const span=wide(),rules=[],heads=new Map(),links=[0],through=[],hexes=uniqueHexes.filter(hex=>!(solverFieldMetal&&isMetalHex(hex))&&MONSTER_DB[hex]);
const fourceAt=fource?combo.indexOf(fource):-1,lit=ci=>!!fEls&&fEls.length>0&&ci>fourceAt;
const not=rule=>rule.no||(rule.no={expr:rule.expr,op:'le',rhs:rule.rhs-1,directions:rule.directions});
const child=(node,label)=>{
const key=node+'|'+label;
let id=heads.get(key);
if(id===undefined){heads.set(key,id=++lastNode);links[id]=through[node]?node:links[node];}
return id;
};
let values,found=null,spare=null,pointId=0;
const parents=[0],sumTerms=[],sumNext=[],hits=combo.map(SolverActionGate.hits),removal=combo.map(isSolverNonDamageRemoval);
const damageParts={min:0,max:1,head:2,hitmin:3,hitmax:4,none:5,gain:6};
const verified=new Set([reference.join()]);
const orangeJobs=seek.defer&&new Map(),orangeHigh=seek.defer&&new Map();
const test=(list,termId,part,rhs,sum=0,sign=1,last=part)=>{
const row=rules[sum]||(rules[sum]=new Map());
const id=termId*128+(sum?damageParts[part]*16:0)+damageParts[last]*2+(sign>0?1:0);
const first=row.get(id);
let rule=first;
while(rule&&rule.rawRhs!==rhs)rule=rule.nextRhs;
if(!rule){
const expr=[];
for(let at=sum;at;at=parents[at]){
const t=sumTerms[at];
expr.push({t,part,sign});
}
expr.reverse();
expr.push({t:termId,part:last,sign});
row.set(id,rule=ready({expr,op:'ge',rhs,rawRhs:rhs,nextRhs:first}));
}
if(rule.point!==pointId){
rule.point=pointId;
rule.held=limits(rule,null,values);
}
const d={rule,held:rule.held};
if(list&&rule.expr.length){
for(const row of list)if(row.rule===rule)return d;
list.push(d);
}
return d;
};
const kind=(list,t,fatal)=>{
if(!terms[t].depends.length)return;
const hit=test(list,t,'hitmin',1),any=test(hit.held?null:list,t,'hitmax',1),plus=terms[t].read(values).plus;
if(hit.held&&plus)test(list,t,'hitmin',-plus,null,-1);
if(fatal&&hit.held)hit.also=[not(any.rule)];
else if(fatal&&!any.held)any.skip=true;
test(list,t,'none',1);
};
let parts=new WeakMap();
const stepsOf=run=>{
const saved=parts.get(run);if(saved)return saved;
const sums=instances.map(()=>0),part=run.mode,steps=[];
parts.set(run,steps);
for(const row of run.trace){
const ci=row.ci,action=combo[ci],step=steps[steps.length-1];
if(row.pre){
let before=parts.get(row);
if(!before){
before={ci,head:ci+':'+row.targets,list:[],gains:fource?[]:null};
row.targets.forEach((i,k)=>kind(before.list,term(ci,instances[i].hex,row.fourceOn,1,k+1),row.pre>1));
parts.set(row,before);
}
steps.push(before);
continue;
}
let adds=parts.get(row);
if(!adds){
parts.set(row,adds=[]);
for(let k=0;k<row.steps.length;k++){
const s=row.steps[k];
if(s.execute)continue;
const inst=instances[s.index],t=term(ci,inst.hex,row.fourceOn,run.egg&&run.egg[ci]||1,k+1),sum=sums[s.index],[A,V,D,K,F]=s.fate,U=V||seek.goldOnly;
if(fource&&row.fourceOn&&terms[t].read(values).hitmin>0&&solverEggCanBenefit(action,[inst],null,1))test(step.gains,t,'gain',1);
const full=hits[ci]>1&&test(step.list,t,'max',1-inst.hpLow,sum,-1,'head');
if(full&&F){if(!full.held)break;full.skip=true;}
const dead=test(step.list,t,part,run.mode==='min'?inst.hp:inst.hpLow,sum);
const loose=run.mode==='min'&&test(dead.held?null:step.list,t,'max',inst.hpLow,sum);
const kill=!removal[ci]&&test(dead.held?step.list:null,t,part,inst.killFloor);
if(dead.held){
if(loose?U&&A:A)dead.skip=true;
else if(loose&&(U||A))dead.also=[U?not(loose.rule):loose.rule];
if(loose&&orangeJobs&&seek.goldOnly&&!V)dead.orange=[loose.rule];
if(kill&&(kill.held?K:D))kill.skip=true;
}else{
if(kill?D&&K:D)dead.skip=true;
else if(kill&&(D||K))dead.also=[K?kill.rule:not(kill.rule)];
if(loose&&(loose.held?A:U))loose.skip=true;
if(loose&&orangeJobs&&seek.goldOnly&&!loose.held&&!V)loose.orange=[];
}
adds.push(s.index,t);
}
}
for(let k=0;k<adds.length;k+=2){
const i=adds[k],t=adds[k+1],sum=sums[i],next=sumNext[sum]||(sumNext[sum]=[]);
let id=next[t];
if(id===undefined){next[t]=id=parents.length;parents.push(sum);sumTerms[id]=t;}
sums[i]=id;
}
}
return steps;
};
const walk=(list,state,todo,grow)=>{
const known=state.known;
for(const d of list){
const rule=d.rule;
if(known&&known.has(rule))continue;
const parent=state.node,trail=through[parent]?parent:links[parent];
let edge=rule.from===parent?rule.edge:rule.edges&&rule.edges.get(parent);
const fresh=edge===undefined;
if(fresh){edge=lastNode+1;lastNode+=2;if(rule.from===undefined){rule.from=parent;rule.edge=edge;}else(rule.edges||(rule.edges=new Map())).set(parent,edge);}
const held=+d.held,node=edge+1-held,gold=fresh&&!d.skip,orange=d.orange&&seek.goldOnly&&!orangeJobs.has(node),opposite=not(rule),turn=held?opposite:rule;
if(gold&&(turn.open===undefined?turn.open=limits(turn,span):turn.open))todo.push({trail,turn,also:d.also,node});
if(orange&&turn.open!==false)orangeJobs.set(node,{trail,turn,also:d.orange,node});
through[state.node=edge+held]=held?rule:opposite;
links[state.node]=trail;
if(grow)known.add(rule);
}
};
const walkHigh=(high,same,state,todo,runs,low)=>{
if(runs){
same=-1;
for(const run of runs){
if(run.mode!=='max'||run.alloc!==low.alloc)continue;
let shared=0;
while(shared<run.aim.length&&run.aim[shared]===low.aim[shared])shared++;
if(shared>same){same=shared;high=run;}
}
}
if(!high||same<=0)return;
if(low&&low.open===1&&seek.goldOnly){
const key=state.node+'|'+high.aim.join(';')+'|'+same;
if(!orangeHigh.has(key))orangeHigh.set(key,{high,same,state,values});
return;
}
state.node=child(state.node,'H');
const steps=stepsOf(high),end=Math.min(same,steps.length);
for(let k=0;k<end;k++){state.node=child(state.node,steps[k].head);walk(steps[k].list,state,todo);}
if(high.fource)for(let k=0;k<end;k++)walk(steps[k].gains,state,todo);
};
const explore=job=>{
if(found||boundsExhausted)return;
constraints.length=0;
for(let link=job.trail;link;link=links[link])constraints.push(through[link]);
if(job.turn)constraints.push(job.turn,...(job.also||[]));
values=find(copyBox(span),reference);
if(!values)return;
pointId++;
let runs=seek.runs,got=null;
if(job.turn){
const key=values.join();
if(verified.has(key))return;
verified.add(key);
runs=[];got=seek.verify(values,runs);
}
const todo=[];
if(got&&(!seek.goldOnly||got.rating==='gold')){found=got;return;}
spare=spare||got;
for(const low of runs){
if(low.mode!=='min')continue;
const egg=low.egg,state={node:child(0,egg?JSON.stringify(egg):'0'),known:egg?new Set():null};
if(egg){
const lead=[];
for(const ci in egg)for(const hex of hexes)kind(lead,term(+ci,hex,lit(+ci),1),runs.shaky[ci]&&targets.every(t=>t.hex===hex));
walk(lead,state,todo,true);
}
const steps=stepsOf(low);
for(const step of steps){
if(low.rejectAt>=0&&step.ci>low.rejectAt)break;
if(!step.end){state.node=child(state.node,step.head);walk(step.list,state,todo);step.end=state.node;}
state.node=step.end;
}
if(low.fource)for(const step of steps)walk(step.gains,state,todo);
if(low.open<1||low.open===1&&seek.goldOnly&&!orangeHigh)continue;
if(low.open===1&&seek.goldOnly&&runs.resume){
const key=state.node+'|'+low.alloc+'|'+low.aim.join(';');
if(!orangeHigh.has(key))orangeHigh.set(key,{runs,low,state,values});
continue;
}
walkHigh(null,-1,state,todo,runs,low);
}
for(let k=todo.length-1;k>=0;k--)if(!through[todo[k].node])explore(todo[k]);
};
explore({});
if(!found&&!spare&&!boundsExhausted&&orangeJobs&&(orangeJobs.size||orangeHigh.size)){
const keep=new WeakMap();
for(const{high}of orangeHigh.values()){
if(!high)continue;
if(parts.has(high))keep.set(high,parts.get(high));
for(const row of high.trace)if(parts.has(row))keep.set(row,parts.get(row));
}
parts=keep;seek.runs=null;constraints.length=0;
seek.defer.push(()=>{
seek.goldOnly=false;
const pending=[];
for(const{state,runs,low,high,same,values:at}of orangeHigh.values()){
values=at;pointId++;
if(runs&&runs.resume){found=runs.resume();if(found)return found;}
pending.length=0;
walkHigh(high,same,state,pending,runs,low);
for(let i=pending.length-1;i>=0;i--)if(!through[pending[i].node])explore(pending[i]);
if(found||boundsExhausted)break;
}
for(const job of orangeJobs.values()){
if(found||boundsExhausted)break;
const{turn}=job;
if(turn.open===undefined?turn.open=limits(turn,span):turn.open)explore(job);
}
solverSearchCapped(boundsExhausted);
return found;
});
}
solverSearchCapped(boundsExhausted);
return found||spare;
}
const trace=proof.trace||[],cumulative=instances.map(()=>[]);
const expression=(ids,part)=>ids.map(t=>({t,part,sign:1}));
const knownConstraints=new Set();
const add=(expr,op,rhs)=>{
const key=JSON.stringify(op===undefined?expr:[expr,op,rhs]);
if(!knownConstraints.has(key)){knownConstraints.add(key);constraints.push(op===undefined?expr:{expr,op,rhs});}
};
const compile=trace=>{
constraints.length=0;knownConstraints.clear();
const orange=[];let mode;
for(const row of trace){
if(mode!==row.mode){for(const list of cumulative)list.length=0;mode=row.mode;}
const part=mode;
const ci=row.ci,action=combo[ci];
for(const alternatives of row.weaponRequirements||[])add({any:alternatives.map(c=>({expr:[{t:term(ci,c.hex,row.fourceOn,undefined,c.order),part:c.part,sign:1}],op:c.op,rhs:c.rhs}))});
for(let k=0;k<row.steps.length;k++){
const step=row.steps[k];
if(step.execute)continue;
const i=step.index,inst=instances[i],t=term(ci,inst.hex,row.fourceOn,undefined,k+1);
const d=terms[t].read(reference);
if(step.killFloor!==undefined)add([{t,part,sign:1}],'ge',step.killFloor);
add([{t,part:d.hitmin>0?'hitmin':'hitmax',sign:1}],d.hitmin>0?'ge':'le',d.hitmin>0?1:0);
if(SolverActionGate.hits(action)>1)add([...expression(cumulative[i],'max'),{t,part:'head',sign:1}],'le',inst.hpLow-1);
cumulative[i].push(t);
if(proof.rating==='orange'&&mode==='min'&&ci===combo.length-1){
add(expression(cumulative[i],'max'),'ge',inst.hpLow);
orange.push({expr:expression(cumulative[i],'min'),op:'le',rhs:inst.hp-1});
}else if(step.dead)add(expression(cumulative[i],part),'ge',mode==='min'?inst.hp:inst.hpLow);
else add(expression(cumulative[i],'max'),'le',inst.hpLow-1);
}
}
if(orange.length)add({any:orange});
if(fource)for(const m of proof.rating==='orange'?['max']:['min','max']){
const rows=trace.filter(row=>row.mode===m),killed=new Set(),gains=[];
for(const row of rows)for(const step of row.steps)if(!step.execute&&step.dead)killed.add(step.index);
for(const row of rows)if(row.fourceOn)row.steps.forEach((step,k)=>{if(!step.execute&&killed.has(step.index))gains.push({expr:[{t:term(row.ci,instances[step.index].hex,true,undefined,k+1),part:'gain',sign:1}],op:'ge',rhs:1});});
if(gains.length)add({any:gains});
}
};
const enlist=r=>{
reference=valuesOf(r.party);
compile(r.trace);
for(const original of constraints)for(const c of original.any||[original])ready(c);
return{list:constraints.slice(),reference,points:new Map(),fan:r.trace.reduce((n,row)=>row.ci===fin?Math.max(n,row.targets.length):n,0)};
};
const regs=[enlist({party:proof.party,trace})];
const partyAt=values=>cloneSolverConditionParty(proof.party,vars,values,true);
const verdicts=new Map(),weights=[];let space=1,points;
const use=r=>{constraints.length=0;constraints.push(...r.list);reference=r.reference;points=r.points;};
use(regs[0]);
for(const v of vars){weights.push(space);space*=(v.ceiling||999)+1;}
const numericKeys=Number.isSafeInteger(space);
const checkBoundsPoint=(values,verify)=>{
let key;
if(numericKeys){key=0;for(let vi=0;vi<values.length;vi++)key+=values[vi]*weights[vi];}
else key=values.join(',');
let point=points.get(key);
if(point===undefined){point=constraints.every(c=>limits(c,null,values));points.set(key,point);}
if(!verify)return point!==false;
if(point===false||point===null)return null;
if(point!==true)return point;
if(verdicts.has(key)){point=verdicts.get(key);points.set(key,point);return point;}
if(boundsReplays>=SOLVER_CONDITION_BOUNDS_REPLAY_LIMIT){boundsExhausted=true;return null;}
boundsReplays++;
const party=partyAt(values),parties=battles&&battles.get(proof.assign.join(','));
const retained=parties?parties.get(JSON.stringify(party)):undefined;
const p=proof.rating==='gold'&&(retained===true||retained===null)?(retained===true?proof:null):verifySolverConditionParty(combo,targets,hexId,bat,party,proof.assign,tensionMul,fourceEls,proof.eggAssign,true,{accept,kind:proof.fallbackKind,battles},undefined,proof.eggTargets);
point=p&&p.rating===proof.rating&&p.fallbackKind===proof.fallbackKind?p:null;points.set(key,point);verdicts.set(key,point);
if(point)boundsRejectStreak=0;
else if(!boundsSlicing&&++boundsRejectStreak>SOLVER_CONDITION_BOUNDS_REJECT_STREAK)boundsExhausted=true;
return point;
};
const whole=()=>propagate(wide());
regs[0].root=whole();
if(!regs[0].root)return null;
const bounds=[],witnesses=[],spans=vars.map(()=>[]);
const unite=(list,points=false)=>{
const ranges=[];
for(const item of points?list:list.slice().sort(solverOrder.low)){
const lo=points?item:item.lo,hi=points?item:item.hi,last=ranges[ranges.length-1];
if(last&&lo<=last.hi+1)last.hi=Math.max(last.hi,hi);
else ranges.push({lo,hi});
}
return ranges;
};
const extend=(vi,region)=>{
const root=region.root;
use(region);
if(region!==regs[0]){
const free=[];let at=root[vi].lo;
for(const s of spans[vi]){if(s.lo>at)free.push({lo:at,hi:Math.min(s.lo-1,root[vi].hi)});at=Math.max(at,s.hi+1);}
if(at<=root[vi].hi)free.push({lo:at,hi:root[vi].hi});
if(!free.some(f=>f.lo<=f.hi&&find(copyBox(root,vi,f.lo,f.hi),reference)))return true;
}
const extreme=upper=>{
let lo=root[vi].lo,hi=root[vi].hi,witness=reference;
while(lo<hi){
const mid=upper?Math.ceil((lo+hi)/2):(lo+hi)>>1;
const box=copyBox(root,vi,upper?mid:root[vi].lo,upper?root[vi].hi:mid);
const found=find(box,reference);
if(found){witness=found;if(upper)lo=mid;else hi=mid;}
else if(upper)hi=mid-1;else lo=mid+1;
}
witness=find(copyBox(root,vi,lo,lo),witness);
return witness?{value:lo,witness}:null;
};
const lower=extreme(false),upper=extreme(true);
if(!lower||!upper)return false;
const b=bounds[vi]||(bounds[vi]={...vars[vi],lo:lower.value,hi:upper.value}),w=witnesses[vi]||(witnesses[vi]={lo:lower.witness,hi:upper.witness,low:region});
if(lower.value<b.lo){b.lo=lower.value;w.lo=lower.witness;w.low=region;}
if(upper.value>b.hi){b.hi=upper.value;w.hi=upper.witness;}
spans[vi]=unite([...spans[vi],{lo:lower.value,hi:upper.value}]);
if(spans[vi].length>1)b.ranges=spans[vi];else delete b.ranges;
return true;
};
for(let vi=0;vi<vars.length;vi++)if(!extend(vi,regs[0]))return null;
if(!boundsExhausted&&bounds.some(b=>b.lo>b.floor||b.hi<(b.ceiling||999))){
const onePath=proof.rating==='gold'&&instances.length===1&&!(solverFieldMetal&&isMetalHex(hexId))&&
combo.every((v,ci)=>v.at===0||!isSolverNonDamageRemoval(v)&&!actionPlus1(skills[ci],v.equip)&&
(skills[ci].miss!==v.at||solverATForCount(skills[ci].at[0],skills[ci].at[1],isHitBased(skills[ci])?SolverActionGate.hits(v):1)!==v.at));
const regions=proof.regions||(onePath?[]:findVariableConditionProof(combo,targets,hexId,bat,proof.assign,tensionMul,fourceEls,accept,null,solverConditionVariables(combo,proof.assign,targets),proof.rating==='gold',null,null,{proof,instances,decays})),own=onePath&&!proof.regions?'':solverConditionRegionKey(instances,decays,trace);
if(!proof.regions&&regions.size>1&&vars!==solverConditionVariables(combo,proof.assign,targets))return solveSolverConditionBounds(combo,targets,hexId,bat,{...proof,regions},tensionMul,fourceEls,accept,battles,defer);
const saved=bounds.map(b=>({...b})),ends=witnesses.map(w=>({...w}));
boundsReplays=0;boundsRejectStreak=0;findBudget=SOLVER_CONDITION_BOUNDS_FIND_LIMIT;
for(const[key,r]of regions){
if(key===own)continue;
const region=enlist(r);
use(region);
region.root=whole();
if(!region.root)continue;
regs.push(region);
for(let vi=0;vi<vars.length;vi++)extend(vi,region);
}
if(boundsExhausted){
solverSearchCapped(true);
boundsExhausted=false;regs.length=1;
saved.forEach((b,vi)=>{bounds[vi]=b;witnesses[vi]=ends[vi];});
}
boundsReplays=0;boundsRejectStreak=0;findBudget=SOLVER_CONDITION_BOUNDS_FIND_LIMIT;
}
const low=lead>=0?witnesses[lead].low:null;
let chosen=null;
if(low&&low.fan>1){use(low);chosen=find(copyBox(low.root,lead,bounds[lead].lo,bounds[lead].lo),low.root.map(b=>b.lo));}
if(!chosen){use(regs[0]);chosen=find(regs[0].root,regs[0].root.map(b=>b.lo));}
if(!chosen)return null;
const verified=checked(chosen);
const slices=()=>{
const conditionalBounds=[],sliceCache=new Set();
if(regs.length===1)use(regs[0]);
const holds=regs.length===1?checked:(values,verify)=>regs.some(r=>(r===regs[0]||values.every((x,i)=>x>=r.root[i].lo&&x<=r.root[i].hi))&&(use(r),checked(values,verify)));
const addSlice=(anchor,side)=>{
const values=witnesses[anchor][side].slice();
const target=vars.length===1?0:(anchor+1)%vars.length;
const fixed=vars.map((v,i)=>({variable:i,value:values[i]})).filter(v=>v.variable!==target);
const cacheKey=JSON.stringify([target,fixed]);
if(sliceCache.has(cacheKey))return;
const allowed=[];
for(let value=bounds[target].lo;value<=bounds[target].hi;value++){values[target]=value;if(holds(values,false))allowed.push(value);}
const verified=value=>{values[target]=value;return holds(values,true);};
let ranges=unite(allowed,true);
if(ranges.some(r=>!verified(r.lo)||!verified(r.hi)))ranges=unite(allowed.filter(verified),true);
sliceCache.add(cacheKey);conditionalBounds.push({fixed,target,ranges});
};
boundsSlicing=true;
for(let vi=0;vi<vars.length;vi++)for(const side of['lo','hi'])addSlice(vi,side);
return conditionalBounds;
};
if(defer&&verified&&!boundsExhausted&&boundsReplays+2*bounds.reduce((count,b)=>count+b.hi-b.lo+1,0)<=SOLVER_CONDITION_BOUNDS_REPLAY_LIMIT){defer.slices=slices;return{...verified,statBounds:bounds};}
const conditionalBounds=slices();
if(boundsExhausted)return null;
return{...verified,statBounds:bounds,conditionalBounds};
}
function findSolverConditionProof(combo,targets,hexId,bat,acceptActions,goldOnly,state,neutralMemo){
if(solverGoldFound())goldOnly=true;
const below=!!(_solverGoldState&&_solverGoldState.below),work=_solverGoldState&&_solverGoldState.orangeWork||state.orangeWork;
const saved=state.done&&work&&work.get(state),low=!!saved&&goldOnly&&!saved.low&&below;
if(!below&&state.priorityBlocked)return null;
if(state.done&&!low){
if(!goldOnly&&!state.raw&&saved){
work.delete(state);
for(const resume of saved.deferred){
const proof=resume();
if(!proof)continue;
state.raw=proof;state.battles=new Map([[proof.assign.join(','),saved.battles.get(proof.assign.join(','))]]);
solverNoteGold(proof.rating);
return proof;
}
}
return!state.raw||goldOnly&&state.raw.rating!=='gold'?null:state.raw;
}
const gate={};
if(low)saved.low=true;
else if(!targets||!targets.length||!priOrderOK(combo)||combo.length>SOLVER_MAX_ACTIONS||!solverCandidateStructureOK(combo,{targets,priority:!below},gate)){state.done=true;state.tailRank=0;return null;}
const total=groupTotal(targets),single=total===1;
const mon=MONSTER_DB[hexId];
if(!mon)return null;
const fource=findInlineFource(combo),fEls=getFourceEls(fource);
if(solverFieldMetal&&isMetalHex(hexId)&&combo.some(v=>v.metalFirst)&&!solverMetalFirstTailOK(combo,targets,state,goldOnly,fEls)){
if(_solverGoldState&&state.tailRank===1)_solverGoldState.maybeOrange=true;
return null;
}
let blocked=gate.priority;
const mercyAt=!single&&combo.length>SOLVER_ROUND_SIZE&&!(raceMulKills&&raceMulKills.c===combo)?solverMercyIndex(combo):-1;
if(mercyAt>=0){
const{field,survivors,metal}=solverMapEntry(_solverDmgCache.search.mercyFields,targets,()=>{
const field=buildSimInstances(targets);
return{field,survivors:field.filter(t=>!(t.death>0)),metal:solverFieldMetal&&field.some(t=>isMetalHex(t.hex))};
});
if(mercyAt<combo.length-1){
blocked=!survivors.length||survivors.length===1&&!solverCandidateStructureOK(combo,{targets:survivors,start:mercyAt+1,priority:!below},gate);
}else if(total<=4&&(targets[0].count||1)===1&&!metal&&
combo.every((v,i)=>i===mercyAt||v.jp==='おうえん'||v===fource||v.at>0&&!isSolverNonDamageRemoval(v)&&SolverActionGate.targetKind(lookupSkill(v.jp))==='S')){
const slots=solverIndicesOf(combo,v=>v.at>0),cost=bat-combo.reduce((sum,v)=>sum+v.at,0);
const damage=slots.map(i=>field.map(t=>solverMinimumDamageBound(combo[i],t.hex,null,fEls,!below).chip));
const spent=field.map(()=>0),path=slots.map(()=>-1);
let depth=slots.length?0:-1;
while(depth>=0){
if(depth===slots.length){
const mainHit=path.lastIndexOf(0);
if(mainHit>=0&&cost===solverRoundCost(combo,total,slots[mainHit]<SOLVER_ROUND_SIZE)){
let survivor=false,valid=true;
for(let t=1;t<field.length;t++){
if(spent[t]<field[t].hpLow&&field[t].death>0)survivor=true;
else if(path.lastIndexOf(t)<mainHit){valid=false;break;}
}
if(valid&&survivor)break;
}
depth--;
}
const previous=path[depth],row=damage[depth];
if(previous>=0)spent[previous]-=row[previous];
let target=previous+1;
while(target<field.length&&spent[target]>=field[target].hpLow)target++;
if(target===field.length){path[depth--]=-1;continue;}
path[depth]=target;spent[target]+=row[target];depth++;
}
blocked=depth<0;
}
}
if(blocked){
if(!below)state.priorityBlocked=true;
else{state.done=true;if(low)work.delete(state);}
return null;
}
const eggs=combo.filter(v=>v.jp==='おうえん').length;
const tension=single&&eggs?getTensionTier(eggs).mul:1;
let best=low?state.raw:null;const battles=low&&saved.battles||new Map(),deferred=low?(solverGoldFound()?null:saved.deferred):goldOnly&&!solverGoldFound()?[]:null;
let reach=low?Infinity:-1,sure=false;
const finish=()=>{
const fresh=best!==state.raw;
state.done=true;state.raw=best;state.tension=tension;state.fEls=fEls;state.accept=acceptActions;
if(best&&fresh){
const key=best.assign.join(',');
const parties=battles.get(key);
if(best.rating==='gold'){
const winner=JSON.stringify(best.party);
for(const id of parties.keys())parties.set(id,id===winner?true:null);
}
state.battles=new Map([[key,parties]]);
}
if(low){
saved.pack=null;
if(solverGoldFound())work.delete(state);
else if(deferred.length){battles.clear();saved.battles=battles;}
}else if((!best||best.rating!=='gold')&&deferred&&!solverGoldFound()){
const holder=_solverGoldState||state,work=holder.orangeWork||(holder.orangeWork=new Map()),packs=holder.packs||(holder.packs=new Map()),pack=JSON.stringify({f:first&&first.runs&&[first.runs,first.runs.shaky],l:[...layouts].map(([k,v])=>[k,v.assign,v.diagnostic!==first&&v.diagnostic&&v.diagnostic.runs?[v.diagnostic.runs,v.diagnostic.runs.shaky]:null])});
battles.clear();
work.set(state,{deferred,battles:deferred.length?battles:null,pack:solverMapEntry(packs,pack,()=>pack)});
}
if(_solverGoldState&&deferred&&deferred.length)_solverGoldState.maybeOrange=true;
return!best||goldOnly&&best.rating!=='gold'?null:best;
};
const accept=(party,assign,diagnostic)=>{
diagnostic.accept=acceptActions;
diagnostic.battles=battles;
diagnostic.neutral=neutralMemo;
const proof=verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tension,fEls,undefined,!!acceptActions,diagnostic);
reach=Math.max(reach,diagnostic.reachLast>=0?diagnostic.reachLast:Infinity);
if(proof){solverNoteGold(proof.rating);if(!best||getRankOrderValue(proof.rating)>getRankOrderValue(best.rating))best=proof;}
else if(deferred&&diagnostic.resume)deferred.push(diagnostic.resume);
};
const pack=low&&JSON.parse(saved.pack);
const layouts=low?new Map(pack.l.map(([k,a,d])=>[k,{assign:a,diagnostic:d&&{runs:Object.assign(d[0],{shaky:d[1]})}}])):new Map(),neutral=neutralMemo?neutralMemo.party:NEUTRAL_PARTY(),hasEgg=eggs>0;
const failed=solverGoldFound()&&!acceptActions&&single&&!(solverFieldMetal&&isMetalHex(hexId))&&_solverGoldState&&combo.every(v=>v.at>0&&!isSolverNonDamageRemoval(v)&&!v.priSwap&&!weaponMetaValue(v.equip,'pri')||v.jp==='おうえん')&&_solverGoldState.layouts;
const desc=failed&&combo.map((v,ci)=>(ci===combo.length-1?'F':'')+(ci<SOLVER_ROUND_SIZE?1:2)+solverComboActionSignature([v],true)+'^'+combo.slice(0,ci).filter(x=>x.jp==='おうえん').length);
let first=low?pack.f&&{runs:Object.assign(pack.f[0],{shaky:pack.f[1]})}:null;
if(!low){
const reached=hasEgg&&new Map();
solverNeutralLayouts(combo,neutral,neutralMemo,layouts,(assign,pattern)=>{
const bundle=failed&&assign.reduce((p,a,ci)=>(p[a]+=desc[ci]+',',p),neutral.map(()=>'')).sort().join('|');
let diagnostic=null,vars;
if(hasEgg&&bundle&&failed.has(bundle)){layouts.set(pattern,{assign,diagnostic,bundle});return false;}
if(hasEgg||!first){
vars=solverConditionVariables(combo,assign,targets);
let ways=hasEgg?+!!vars.length+solverEggReachKey(combo,assign,neutral):'';
diagnostic=hasEgg&&reached.get(ways);
if(!diagnostic){
diagnostic=vars.length?{runs:[]}:{};
accept(neutral,assign,diagnostic);
if(hasEgg)reached.set(ways,diagnostic);
}
if(!first)first=diagnostic;
}
layouts.set(pattern,{assign,diagnostic,bundle,vars});
return best&&best.rating==='gold';
});
}
if(!best||goldOnly&&best.rating!=='gold'){
const scanned=new Set(),skillStats=combo.map(action=>solverConditionStatKeys(lookupSkill(action.jp)));
for(const[,{assign,diagnostic,bundle,vars:knownVars}]of layouts){
if(bundle&&failed.has(bundle))continue;
const vars=knownVars||solverConditionVariables(combo,assign,targets);
if(!vars.length){if(bundle)failed.add(bundle);continue;}
const slots=skillStats.map((keys,ci)=>solverIndicesOf(vars,v=>solverVarReads(v,assign[ci],keys)).join('.'));
let ways=hasEgg?solverEggReachKey(combo,assign,neutral):'';
const order=JSON.stringify([ways,vars.map(v=>[v.key,v.floor,v.ceiling,v.keys]),slots]);
if(scanned.has(order))continue;
scanned.add(order);
const runs=(diagnostic||first).runs,limited=_solverSearchLimited;
_solverSearchLimited=false;
solverProofReach=-1;
const proof=findVariableConditionProof(combo,targets,hexId,bat,assign,tension,fEls,acceptActions,runs,vars,goldOnly,battles,deferred);
if(bundle&&!proof&&!_solverSearchLimited)failed.add(bundle);
reach=Math.max(reach,proof||_solverSearchLimited?Infinity:solverProofReach);
if(!proof&&!_solverSearchLimited&&!sure){
sure=true;
for(let ci=0;sure&&ci<SOLVER_ROUND_SIZE&&ci<combo.length;ci++)for(const v of vars)if(solverVarReads(v,assign[ci],skillStats[ci])&&v.floor!==solverStatMin(v.key,combo[ci].equip,!below))sure=false;
}
_solverSearchLimited=_solverSearchLimited||limited;
if(!proof)continue;
if(!best||proof.rating==='gold')best=proof;
solverNoteGold(proof.rating);
if(proof.rating==='gold')break;
}
}
if(sure&&!best&&reach>=0&&reach<SOLVER_ROUND_SIZE&&reach<combo.length-1)state.shut=reach+1;
else if(!best&&reach>=SOLVER_ROUND_SIZE&&reach<combo.length-1&&!combo.some((v,ci)=>ci>=SOLVER_ROUND_SIZE&&v.jp==='おうえん')){
const stats=combo.map(action=>solverConditionStatKeys(lookupSkill(action.jp))),cover=new Set();
for(const{assign,vars:known}of layouts.values()){
const vars=known||solverConditionVariables(combo,assign,targets);
let ok=true;
for(let ci=0;ok&&ci<=reach;ci++)for(const v of vars)if(solverVarReads(v,assign[ci],stats[ci])){
let top=0;
for(let cj=0;cj<=reach;cj++)if(solverVarReads(v,assign[cj],stats[cj]))top=Math.max(top,solverStatMin(v.key,combo[cj].equip,true));
if(v.floor!==top){ok=false;break;}
}
if(ok)cover.add(assign.slice(0,reach+1).map(a=>assign.indexOf(a)).join());
}
state.shut=reach+1;state.cover=cover;
}
return finish();
}
function finalizeSolverConditionProof(entry,targets,hexId,bat,forOrder=false){
const state=entry.conditionState;
if(!state)return;
if(!Object.prototype.hasOwnProperty.call(state,'proof')){
const{raw,tension,fEls,accept,battles}=state,proof={...raw,party:cloneSolverConditionParty(raw.party)};
state.proof=solveSolverConditionBounds(entry.combo,targets,hexId,bat,proof,tension,fEls,accept,battles,forOrder?state:null)||proof;
}
if(state.slices&&!forOrder){
state.proof={...state.proof,conditionalBounds:state.slices()};
delete state.slices;
}
entry.conditionProof=state.proof;
if(!state.slices){state.battles.clear();delete entry.conditionState;}
}
function solverOffProve(context,e,orangeKinds){
const{bat,hexId,isMetal,mon,T,_offTargets,singleNonMetal,_offProofs}=context;
const key=e.offKey||(e.offKey=JSON.stringify(e.combo));
if(_solverGoldState)_solverGoldState.layouts=new Set();
let windowRows=null;
const windowOK=c=>{
if(!windowRows){
const ids=solverComboActionSignature(e.combo,true).split('\x1e'),eggs=e.combo.filter(v=>v.jp==='おうえん'||v.jp==='ためる').length,boost=eggs?getTensionTier(eggs).mul:1,fEls=getFourceEls(e.combo),cut=x=>Math.max(0,Math.floor(x-1e-6)),mercy=e.combo.some(v=>v.jp==='みのがす');
windowRows=_offTargets.map((g,i)=>{
const mon=MONSTER_DB[g.hex],H=mon.s[0],single=(g.count||1)===1,row=new Map();
e.combo.forEach((v,ci)=>{
if(!(v.at>0)||row.has(v))return;
const sk=lookupSkill(v.jp),kind=SolverActionGate.targetKind(sk);
if(!sk){row.set(v,{min:Infinity,spread:0,last:false,must:false});return;}
if(SolverActionGate.ally.includes(kind)||v.tgtGroup!==undefined&&v.tgtGroup!==i&&kind!=='A'&&kind!=='RA')return;
let spread=0;
if(sk.dmg&&!sk.fixedDmg&&!weaponMetaValue(v.equip,'fixedDmg')&&!METAL_ONLY_WEAPONS.has(v.equip)&&!isSolverRandomTargetSkill(sk)&&!(sk.dmg.m&&sk.dmg.m<sk.dmg.b)){
const t=solverTypeMul(sk,v.equip,mon);
spread=t===1?2*sk.dmg.s:cut(2*sk.dmg.s*t);
if(sk.el)spread=Math.floor(spread*mon.s[sk.el]/100);
else if(fEls)spread=fEls.reduce((low,el)=>Math.min(low,cut(Math.floor(spread*mon.s[el]/100)*1.1)),spread);
spread*=SolverActionGate.hits(v);
}
const aimed=v.tgtGroup===i&&!sk.aimGroup;
row.set(v,{min:solverPaperDamageUpperBound(e.combo,g.hex,boost,fEls,ids,ci).min,spread,last:single&&aimed&&(kind==='G'||kind==='S'),must:kind==='A'||aimed&&(kind==='G'||single&&kind==='S')});
});
return{H,floor:H-monHpMin(H)+1,row,need:!mercy||!(g.death>0)||!i};
});
}
const fits=(X,k,mand,opt)=>{
let need=X.floor,sum=k.min;
for(const x of mand){need+=x.spread;sum+=x.min;}
if(k.min<need)return false;
const extra=[];
for(const x of opt)if(x.spread)extra.push(x);else sum+=x.min;
for(let mask=0;mask<1<<extra.length;mask++){
let total=sum,floor=need;
extra.forEach((x,b)=>{if(mask>>b&1){total+=x.min;floor+=x.spread;}});
if(total>=X.H&&k.min>=floor)return true;
}
return false;
};
if(!c)return windowRows.every(X=>!X.need||e.combo.some((v,k)=>{
const K=X.row.get(v),mand=[],opt=[];
if(!K)return false;
e.combo.forEach((w,p)=>{const x=p!==k&&X.row.get(w);if(x)(x.last?mand:opt).push(x);});
return fits(X,K,mand,opt);
}));
if(c.some(v=>v.at>0&&!e.combo.includes(v)))return true;
const spots=windowRows.map(X=>{
if(!X.need)return null;
let after=-1;
c.forEach((v,p)=>{const x=X.row.get(v);if(x&&x.last)after=p;});
const out=[];
for(let k=Math.max(0,after);k<c.length;k++){
const K=X.row.get(c[k]),mand=[],opt=[];
if(!K)continue;
for(let p=0;p<k;p++){const x=X.row.get(c[p]);if(x)(x.must?mand:opt).push(x);}
if(fits(X,K,mand,opt))out.push(k);
}
return out;
});
return spots.every((P,i)=>!P||P.length&&(!i||P[P.length-1]>=spots[0][0]))&&(!(c[c.length-1].at>0)||spots.some(P=>P&&P[P.length-1]===c.length-1));
};
if(!_offProofs.has(key)){
const exec=isMetal?e.combo.findIndex(isMetalExecutionAction):-1;
let impossible=e.combo.length>SOLVER_ROUND_SIZE&&e.combo.reduce((sum,v)=>sum+v.at,solverRoundCost(e.combo,T,true))!==bat&&(exec>=0&&exec<SOLVER_ROUND_SIZE&&(e.combo[exec].metalFirst||solverMercyIndex(e.combo)<0)||
!isMetal&&e.combo[0].jp==='おうえん'&&!e.combo.some((v,ci)=>v.jp==='ザラキーマ'||ci&&ci<SOLVER_ROUND_SIZE&&(v.jp==='みのがす'||solverEggPass(v))));
const metalTail=e.combo[0].metalFirst&&e.combo.length<=SOLVER_MAX_ACTIONS&&e.combo.every(v=>v.at>0);
if(!impossible&&(metalTail||!isMetal&&T>1&&(e.combo.length<=SOLVER_ROUND_SIZE||solverMercyIndex(e.combo)<0)&&
(e.combo[e.combo.length-1].jp!=='みのがす'||solverRaceMulIndex(e.combo)>=0)&&
!e.combo.some(v=>isSolverNonDamageRemoval(v)&&v.jp!=='みのがす')&&!solverFieldMetal)){
const mercy=!metalTail&&e.combo.some(v=>v.jp==='みのがす');
const living=_offTargets.map((g,i)=>({g,i,count:mercy&&g.death>0?(i===0?1:0):g.count})).filter(({g,count})=>count>0&&!(solverFieldMetal&&isMetalHex(g.hex)));
const need=living.map(({g,count})=>{
const target=MONSTER_DB[g.hex];
return target?count*monHpMin(target.s[0]):NaN;
});
if(need.length>0&&need.length<=(metalTail?2:3)&&need.every(Number.isFinite)){
const ids=solverComboActionSignature(e.combo,true).split('\x1e'),groups=need.length;
const hp=living.map(({g})=>MONSTER_DB[g.hex].s[0]);
const minNeed=living.map(({count},i)=>metalTail?0:hp[i]*count);
const optionMax=[],optionMin=[];
const buffs=metalTail?0:e.combo.filter(v=>v.jp==='おうえん'||v.jp==='ためる').length,boost=buffs?getTensionTier(buffs).mul:1;
const fEls=metalTail?null:getFourceEls(e.combo),block=solverBlockRuleEnabled();
let known=true,choices=0;
for(let ci=0;ci<e.combo.length;ci++){
const action=e.combo[ci];
if(!(action.at>0)||solverFieldMetal&&isMetalExecutionAction(action))continue;
const sk=lookupSkill(action.jp),kind=SolverActionGate.targetKind(sk);
if(!kind){known=false;break;}
const antiBlock=metalTail||!block||solverActionAntiBlock(action);
for(let target=0;target<groups;target++){
const{g,i,count}=living[target];
let high=0,low=0;
if((antiBlock||!solverHexBlock(g.hex))&&
!(action.tgtGroup!==undefined&&action.tgtGroup!==i&&(kind==='G'||kind==='S'&&!sk.aimGroup))){
const hits=kind==='A'||kind==='G'?count:1;
const damage=solverPaperDamageUpperBound(e.combo,g.hex,boost,fEls,ids,ci);
high=damage.max*hits;
low=metalTail?0:damage.min*hits;
}
if(!Number.isFinite(high)||!Number.isFinite(low)){known=false;break;}
need[target]-=high;minNeed[target]-=low;
if(kind!=='A'){const slot=choices*groups+target;optionMax[slot]=high;optionMin[slot]=low;}
}
if(!known)break;
if(kind!=='A')choices++;
}
if(known){
const fits=left=>{
let uncertain=0;
for(let g=0;g<groups;g++)if(need[g]>0||!metalTail&&(minNeed[g]>hp[g]||minNeed[g]>0&&++uncertain>+!solverGoldFound()))return false;
if(!left)return true;
const slot=(left-1)*groups;
for(let g=0;g<groups;g++){need[g]+=optionMax[slot+g];minNeed[g]+=optionMin[slot+g];}
for(let g=0;g<groups;g++){
need[g]-=optionMax[slot+g];minNeed[g]-=optionMin[slot+g];
if(fits(left-1))return true;
need[g]+=optionMax[slot+g];minNeed[g]+=optionMin[slot+g];
}
for(let g=0;g<groups;g++){need[g]-=optionMax[slot+g];minNeed[g]-=optionMin[slot+g];}
return false;
};
impossible=!fits(choices);
if(!impossible&&!metalTail&&solverGoldFound())impossible=!windowOK(null);
}
}
}
if(impossible){
const failed={combo:e.combo,proof:null,kills:new Set()};
_offProofs.set(key,{gold:failed,orange:failed,trials:[]});
return failed;
}
const one=singleNonMetal,safe=c=>{const fi=solverFinalActionIndex(c,true);return!one||fi===undefined||solverKillerFormOK(c[fi],hexId,null);};
const trials=[],orders=singleNonMetal?null:[];
const neutralMemo=T>1&&!isMetal&&e.combo.length>SOLVER_ROUND_SIZE?{party:NEUTRAL_PARTY(),layouts:new Map(),prefix:new Map()}:null;
const shut=!isMetal&&!solverFieldMetal&&!e.combo.some(v=>v.jp==='ためる'||FOURCE_EL[v.jp]||v.priSwap||weaponMetaValue(v.equip,'pri'))&&(context.offShut||(context.offShut=new Map()));
let found={combo:e.combo,proof:null,state:{}};
const prove=(c,acceptActions,initial=false)=>{
if(!initial&&!isMetal&&!c.some(_actionPri)){
let cut=0,top=-1,used=0;
for(let ci=0;ci<c.length;ci++){
const v=c[ci];let o=-1;
for(let j=0;j<e.combo.length&&o<0;j++)if(e.combo[j]===v&&!(used>>j&1))o=j;
used|=1<<o;
const hit=o>=0&&actionAtUnstable(v,0,0);
if(isSolverNonDamageRemoval(v))top=-1;
else if(ci===c.length-1)cut++;
else if(hit&&o>top)top=o;
else if(hit){cut++;top=-1;}
}
if(cut>T||cut>context.walk.effMon&&context.walk.planType==='mercy_first'&&c.some(v=>v.jp==='みのがす'))return false;
}
if(!acceptActions){
if(!initial&&JSON.stringify(c)===key)return false;
if(!safe(c))return false;
if(!initial&&(!solverEarlyStopStructureOK(c)||solverRaceMulIndex(c,true)===null))return false;
}
const end=acceptActions===solverMercyChipPrefixOK?solverMercyIndex(c):-1;
if(end>=SOLVER_ROUND_SIZE-1&&c[0].jp==='おうえん'&&c.slice(1,SOLVER_ROUND_SIZE).every((v,q)=>q+1===end||!solverEggPass(v)))return false;
if(T>1&&!isMetal&&solverGoldFound()&&!c.some(v=>isSolverNonDamageRemoval(v)&&v.jp!=='みのがす')&&!solverFieldMetal){
for(let p=0;p<end;p++){
const v=c[p],sk=v.at>0&&lookupSkill(v.jp),kind=sk&&!isHitBased(sk)&&sk.at[1]>0&&SolverActionGate.targetKind(sk);
const n=kind==='A'?groupTotal(_offTargets):kind==='G'?v.tgtGroup===undefined?Math.max(..._offTargets.map(g=>g.count||1)):_offTargets[v.tgtGroup].count||1:0;
if(n&&v.at!==solverATForCount(sk.at[0],sk.at[1],n)&&v.at!==sk.miss)return false;
}
if(!initial&&!windowOK(c))return false;
}
const state=initial?found.state:{};
const settled=!!_solverGoldState&&!_solverGoldState.below,lead=shut&&settled&&solverIndicesOf(c,v=>v.jp==='おうえん').filter(i=>i<SOLVER_ROUND_SIZE);
const race=lead&&solverRaceMulIndex(c,true),flag=lead&&(!lead.length||lead.length===1&&!lead[0]&&c.length>SOLVER_ROUND_SIZE&&!c.slice(1,SOLVER_ROUND_SIZE).some(v=>v.jp==='ザラキーマ'))&&(c.length>SOLVER_ROUND_SIZE?0:c.length)+'|'+(c[c.length-1].jp==='みのがす')+'|'+(race>=0&&race<SOLVER_ROUND_SIZE?race:-1);
let decay=0,node=flag&&!initial&&shut.get(flag);
if(flag){solverComboActionSignature(c,true);for(let i=0;i<c.length;i++)if(atkDecay(lookupSkill(c[i].jp)))decay|=1<<i;}
let known;
for(let i=0;node&&i<c.length-1;i++){
node=node.get(_solverVariantSegs.get(c[i]).id);
if(node&&i<SOLVER_ROUND_SIZE&&node.shut&(decay>>i+1?2:1)){if(!solverGoldFound())trials.push({combo:c,state,acceptActions,flag,decay,lead:lead.length,shut:i+1});return found.proof&&found.proof.rating==='gold';}
const leaf=node&&i>=SOLVER_ROUND_SIZE&&neutralMemo&&node.get(decay>>i+1?'D':'N');
if(!leaf)continue;
known=known||solverNeutralLayouts(c,neutralMemo.party,neutralMemo);
if(known.every(assign=>leaf.cover.has(assign.slice(0,i+1).map(a=>assign.indexOf(a)).join()))){if(!solverGoldFound())trials.push({combo:c,state,acceptActions});return found.proof&&found.proof.rating==='gold';}
}
const p=findSolverConditionProof(c,_offTargets,hexId,bat,acceptActions,true,state,neutralMemo);
if(flag&&!p&&state.shut){
const end=lead.length&&state.shut<SOLVER_ROUND_SIZE?SOLVER_ROUND_SIZE:state.shut;
node=solverMapEntry(shut,flag);
for(let i=0;i<end;i++)node=solverMapEntry(node,_solverVariantSegs.get(c[i]).id);
if(!state.cover)node.shut|=decay>>end?2:1;
else{const leaf=solverMapEntry(node,decay>>end?'D':'N');if(leaf.cover)for(const key of state.cover)leaf.cover.add(key);else leaf.cover=state.cover;}
}
if(state.tailRank!==0)trials.push({combo:c,state,acceptActions});
if(p&&(!found.proof||getRankOrderValue(p.rating)>getRankOrderValue(found.proof.rating)))found={combo:c,proof:p,state};
return found.proof&&found.proof.rating==='gold';
};
raceMulKills={c:e.combo,k:new Set()};
prove(e.combo,undefined,true);
const kills=raceMulKills.k;raceMulKills=null;
if((!found.proof||found.proof.rating!=='gold')&&(isMetal?T>1:mon))findBestOrderedAssignment(e.combo,{hexId,targets:_offTargets},1,null,null,c=>(orders&&orders.push(c),prove(c)));
if(orders&&(!found.proof||found.proof.rating!=='gold'))solverRecoverMercy(context,e.combo,visit=>orders.some(visit),prove);
if(neutralMemo){neutralMemo.prefix=null;neutralMemo.layouts=null;}
found.kills=kills;_offProofs.set(key,{gold:found,trials});
}
const work=_offProofs.get(key),low=!orangeKinds&&!work.below&&!work.gold.proof&&!!_solverGoldState&&!!_solverGoldState.below;
if(low||orangeKinds&&!work.gold.proof&&!Object.prototype.hasOwnProperty.call(work,'orange')){
if(low)work.below=true;else work.orange={combo:e.combo,proof:null,kills:work.gold.kills};
for(const trial of work.trials){
const raw=trial.state.raw;
if(!low&&raw&&!orangeKinds.has(!!raw.fallbackKind))continue;
let node=trial.flag&&context.offShut.get((low?'B':'O')+trial.flag),hit=false;
if(node)solverComboActionSignature(trial.combo,true);
for(let i=0;node&&!hit&&i<SOLVER_ROUND_SIZE&&i<trial.combo.length-1;i++){node=node.get(_solverVariantSegs.get(trial.combo[i]).id);hit=!!node&&!!(node.shut&(trial.decay>>i+1?2:1));}
if(hit)continue;
const fresh=!trial.state.done;
const p=findSolverConditionProof(trial.combo,_offTargets,hexId,bat,trial.acceptActions,low,trial.state);
if(fresh&&trial.flag&&!p&&trial.state.shut&&!trial.state.cover){
const end=Math.max(low?trial.shut:0,trial.lead&&trial.state.shut<SOLVER_ROUND_SIZE?SOLVER_ROUND_SIZE:trial.state.shut);
if(end<=SOLVER_ROUND_SIZE&&end<trial.combo.length){
solverComboActionSignature(trial.combo,true);
node=solverMapEntry(context.offShut,(low?'B':'O')+trial.flag);
for(let i=0;i<end;i++)node=solverMapEntry(node,_solverVariantSegs.get(trial.combo[i]).id);
node.shut|=trial.decay>>end?2:1;
}
}
if(p&&(low||orangeKinds.has(!!p.fallbackKind))){work[low?'gold':'orange']={combo:trial.combo,proof:p,kills:work.gold.kills,state:trial.state};break;}
}
}
if(solverGoldFound()&&(work.below||work.gold.proof||!_solverGoldState.below))work.trials=[];
return low||!orangeKinds||work.gold.proof?work.gold:work.orange;
}
function planAFinisher(combo,search,maxSlots){
const{killTargets,chars,mercyLv}=search;
if(!killTargets||killTargets.length<2||!combo.every(v=>v.at>0))return null;
const aIdx=solverIndicesOf(combo,v=>{const sk=lookupSkill(v.jp);return!!sk&&sk.target==='A';});
if(aIdx.length!==1)return null;
const fin=combo[aIdx[0]];
if(SolverActionGate.hits(fin)>1)return null;
const chips=combo.filter((_,i)=>i!==aIdx[0]),freeCI=[];
for(let ci=0;ci<chips.length;ci++){
const c=chips[ci],sk=lookupSkill(c.jp);
if(sk&&sk.target==='S'&&!sk.aimGroup&&c.tgtGroup===undefined)freeCI.push(ci);
else if(!sk||sk.target!=='G'||c.tgtGroup===undefined)return null;
}
const dmgOf=v=>{
const sk=lookupSkill(v.jp),hits=SolverActionGate.hits(v),plus1Eff=actionPlus1(sk,v.equip),out={};
for(const t of killTargets){
let mn=0,mx=0,pre=null;
for(const c of chars){
const r=calcSkillDamageCache(sk,c.stats,t.hex,null,plus1Eff,v.equip);
if(!r)continue;
if(r.min>mn)mn=r.min;
if(r.max>mx)mx=r.max;
if(r.pre)pre={min:Math.max(pre?pre.min:0,r.pre.min),max:Math.max(pre?pre.max:0,r.pre.max)};
}
out[t.hex]={min:mn*hits,max:mx*hits,hit:{min:mn,max:mx,pre,plus1Eff},hits};
}
return out;
};
const nG=killTargets.length,finSk=lookupSkill(fin.jp),finD=dmgOf(fin),chipD=chips.map(dmgOf);
const multiPlayer=solverMultiPlayerEnabled(),bareOnly=isMultiTargetOnly(combo,ACT_EGG,0);
const tiers=!multiPlayer&&bareOnly?[]:[{eggs:0,mul:1,multiOnly:bareOnly}].concat(solverEggCanBenefit(fin,killTargets)?makeEggOnPrefix(null,combo,-1,maxSlots,multiPlayer):[]);
let budget=48;
for(const tier of tiers){
const multiOnly=tier.multiOnly;
const need=[],cap=[];
const feasible=killTargets.every((t,g)=>{
const m=MONSTER_DB[t.hex];
if(!m)return false;
const H=m.s[0],fd=finD[t.hex];
need[g]=Math.max(0,H-solverActionDamage(finSk,t.hex,null,fd.hit,fd.hits,tier.mul,mercyLv).min);
cap[g]=monHpMin(H)-1;
return!(need[g]>0&&(t.count||1)>1)&&!(need[g]>cap[g]);
});
if(!feasible)continue;
const baseMin=Array(nG).fill(0),baseMax=Array(nG).fill(0);
chips.forEach((c,ci)=>{
if(freeCI.includes(ci))return;
const g=c.tgtGroup,d=chipD[ci][killTargets[g].hex];
baseMin[g]+=d.min;baseMax[g]+=d.max;
});
const idxs=freeCI.map(()=>0);
for(;;){
const minS=baseMin.slice(),maxS=baseMax.slice();
freeCI.forEach((ci,k)=>{const g=idxs[k],d=chipD[ci][killTargets[g].hex];minS[g]+=d.min;maxS[g]+=d.max;});
if(minS.every((v,g)=>!(v<need[g])&&!(maxS[g]>cap[g]))){
if(solverSearchCapped(--budget<0))return null;
for(const planned of makeEggOnPrefix(tier.eggs,[...chips.map((c,ci)=>{const k=freeCI.indexOf(ci);return k>=0?{...c,tgtGroup:idxs[k]}:c;}),fin])){
const pb=findBestAssignment(planned,search);
if(pb.rating==='gold')return{combo:planned,best:pb,multiOnly};
}
}
let j=0;
while(j<idxs.length&&++idxs[j]>=nG){idxs[j]=0;j++;}
if(j>=idxs.length)break;
}
}
return null;
}
function applySolverOrder(entry,order,readReq){
if(!order)return;
const{combo,best,resume}=order;
if(best){
Object.assign(entry,{combo,kill:best.rating,assign:best.assign,eggAssign:best.eggAssign,battleProof:best.battleProof});
if(readReq)entry.req=readReq(combo);
}else if(resume){
const previous=entry.resume;
entry.resume=()=>{
if(previous)previous();
if(!entry.battleProof)applySolverOrder(entry,resume(),readReq);
delete entry.resume;
};
}
}
function improveSolverEntry(entry,context){
const{T,assignmentSearch,killTargets}=context;
if(entry.kill==='gold')return;
const dmg=entry.combo.filter(v=>v.at>0).length;
if(dmg===0||dmg<=1&&(!killTargets||killTargets.length<2))return;
if(T>1&&!(solverFieldMetal&&solverMetalCompanionCount())){
const orders=entry.pendingOrders?[...entry.pendingOrders,entry]:[entry];
const plans=entry.pendingOrders&&(assignmentSearch.finisherPlans||(assignmentSearch.finisherPlans=new Map()));
for(const{combo}of orders){
const slots=combo.length<=SOLVER_ROUND_SIZE?SOLVER_ROUND_SIZE:SOLVER_MAX_ACTIONS;
const plan=plans?solverMapEntry(plans,solverComboFacts(combo,assignmentSearch.forms).sig,()=>planAFinisher(combo,assignmentSearch,slots)):planAFinisher(combo,assignmentSearch,slots);
if(!plan)continue;
applySolverOrder(entry,plan);
if(plan.multiOnly)entry.multiOnly=true;
return;
}
}
if(getRankOrderValue(entry.kill))return;
applySolverOrder(entry,solverRecoverMercy(context,entry.combo));
}
function improveSolverEntries(context){
const{canFilter,hexId,killTargets,T,filtered,stop}=context;
if(!canFilter||!hexId||!killTargets&&T!==1)return false;
while(context.improveIndex<filtered.length){
const entry=filtered[context.improveIndex++];
improveSolverEntry(entry,context);
if(!stop||!stop.on||!stop.early||entry.kill!=='gold')continue;
if(entry.battleProof&&entry.battleProof.rating==='gold'&&(!stop.main||entry.fallbackKind||solverMercyIndex(entry.combo)>=0))return true;
}
return false;
}
const SOLVER_ROW_FALLBACK_TAG={
'':' <span style="color:#fa0;font-size:9px;" title="mercy/KMC → kill all">⚡</span>',
'partial-mercy':' <span style="color:#fa0;font-size:9px;" title="Fallback: defeat some companions, then Mercy">⚡</span>'
};
const SOLVER_MISS_LABEL={all:'💨',partial:T('💨 (partial)','💨（部分）','💨（一部）')};
const SOLVER_HIT_LABEL={hit:T('Enemies hit: ','命中 ','命中 '),target:T('Targets: ','目標 ','対象 '),unit:T('',' 隻','体')};
const SOLVER_VARIANT_MAX=12;
const SOLVER_DASH='<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const SOLVER_BLOCK_PROMPT_HTML='<div id="$bucket_blk" style="font-size:10px;margin-left:16px;color:#08c;cursor:pointer;" onclick="showBlockFallback(\'$bucket\')">$label</div>';
const SOLVER_METAL_GATE_LABEL=T('Metal+Non-Metal: players usually flee instead of fighting. Click to calculate anyway.','金屬+非金屬：實務上多半逃跑不打，想打再點擊計算。','メタル+非メタル：普通で逃げる。戦うならクリックで計算開始。');
const solverMetalGatePromptHTML=(elementId,index)=>'<div id="'+elementId+'_mg" style="font-size:10px;margin-left:16px;color:#08c;cursor:pointer;" onclick="_solverRunMetalGate('+index+')">'+SOLVER_METAL_GATE_LABEL+'</div>';
const SOLVER_HTML_ESCAPES={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function solverDisplayName(v,proof,ci,format){
const name=DISPLAY_LANG==='EN'?v.en||v.jp||weaponMetaValue(v,'en')||v:v.jp||v;
if(!format)return name;
const result=proof&&(proof.actionResults||[]).find(row=>row.ci===ci),note=(v.note||'').replace(/💨/g,'')+(result&&SOLVER_MISS_LABEL[result.miss]||'');
if(format==='variant')return solverConditionText(name+note+(v.tgtGroup!==undefined?'→'+(v.tgtGroup+1):''));
return'<span style="color:#ccc;">'+name+'</span>'+(note?'<span style="font-size:9px;">'+note+'</span>':'');
}
function solverDashResult(solvable,extra){return{html:SOLVER_DASH,comboMap:{},buckets:{},fallback:false,solvable,incomplete:false,needsKillAll:null,...extra};}
function getMonsterShieldName(hx){return getMonsterDisplayName(hx)+(solverHexBlock(hx)>0?'🛡️':'');}
function mergedSpeciesLabel(group,name){return(name!==undefined?name:getMonsterShieldName(group.hex))+((group.count||1)>1?'×'+group.count:'');}
function solverTraceInstanceNames(targets,same=mergeSameSpeciesGroups(targets)){
return targets.flatMap((t,i)=>{
const idxs=same.of(t.hex).groupIdxs,count=t.count||1;
const label=(t.name||getMonsterShieldName(t.hex))+(idxs.length>1?' '+String.fromCharCode(65+idxs.indexOf(i)):'');
return Array.from({length:count},(_,n)=>count>1?label+(n+1):label);
});
}
function getStatLabel(st){const domain=_solverStatDomains.get(st);return!domain?'ATK':domain.sum?domain.sum.map(key=>getStatLabel(key)).join('＋'):domain.label;}
function solverActorMark(index){return['①','②','③','④'][index]||(index+1)+'.';}
function solverPercent(value){return value%1===0?value+'%':value.toFixed(1)+'%';}
function solverConditionText(value){return String(value).replace(/[&<>"']/g,c=>SOLVER_HTML_ESCAPES[c]);}
function solverBoundText(lo,hi,key,floor){
const domain=key&&_solverStatDomains.get(key),ceiling=domain&&domain.max||999;
return lo===floor&&hi===ceiling?' '+L78:lo===hi?'='+lo:hi===ceiling?'≥'+lo:' '+lo+'–'+hi;
}
function solverConditionValue(proof,index,key,summary=false){
const bounds=proof.statBounds,bound=bounds&&bounds.find(b=>b.index===index&&b.key===key);
const domain=_solverStatDomains.get(key),sum=domain&&domain.sum,stats=proof.party[index].stats,label=getStatLabel(key);
if(summary||sum){
if(!summary&&bound&&bound.lo===domain.min&&bound.hi===domain.max)return'';
return label+(bound?(bound.ranges||[bound]).map(r=>solverBoundText(r.lo,r.hi,key,bound.legal)).join(T(' or ',' 或 ',' または ')):'='+(sum?getDamageStat(key,stats):stats[key]));
}
if(bound&&bound.ranges)return label+' '+bound.ranges.map(r=>r.lo===r.hi?r.lo:r.lo+'–'+r.hi).join(T(' or ',' 或 ',' または '));
const lo=bounds?bound?bound.lo:solverStatMin(key):stats[key],hi=bounds?bound?bound.hi:999:stats[key];
return label+' '+(lo===hi?lo:lo+'–'+hi);
}
function renderSolverConditionalBounds(proof,compact=false){
if(!proof||!proof.statBounds||!proof.conditionalBounds)return'';
const usage=new Map((proof.usage||[]).map(row=>[row.index,row.stats]));
const used=bound=>(usage.get(bound.index)||[]).includes(bound.key),label=bound=>solverActorMark(bound.index)+' '+getStatLabel(bound.key);
const rows=proof.conditionalBounds.filter(c=>c.ranges.length&&c.fixed.every(f=>f.variable<c.target)).map(c=>{
const bound=proof.statBounds[c.target];
if(!used(bound))return'';
const premise=c.fixed.filter(f=>used(proof.statBounds[f.variable])).map(f=>label(proof.statBounds[f.variable])+'='+f.value).join(' ＋ ');
const range=label(bound)+c.ranges.map((v,i)=>{const text=solverBoundText(v.lo,v.hi,bound.key,bound.legal);return i?text.trimStart():text;}).join(T(' or ',' 或 ',' または '));
return premise?(compact?premise+' → ':T('When ','當 ','')+premise+T(', then ',' 時，',' のとき、'))+range:range;
}).filter(Boolean);
if(!rows.length)return'';
return'<span style="white-space:nowrap;">'+rows.map(row=>solverConditionText(row)).join('；')+'</span>';
}
function solverActionStatText(proof,index,row){
if(!row)return'';
const stats=proof.party[index].stats;
return row.stats.map(key=>{
const domain=_solverStatDomains.get(key);
return getStatLabel(key)+' '+(key==='atk'&&proof.useStats?deriveSolverAtk(stats.str,row.equip,stats.atkOverride):domain&&domain.sum?getDamageStat(key,stats):stats[key]);
}).join(' · ');
}
function solverTraceConditionHeader(conditions,proof,combo,targetBatch,usages){
const escape=solverConditionText,seat=index=>L20+(index+1);
const lines=['<div style="color:#0ff;">'+L60+'</div>','<div style="color:#888;">'+L19+'</div>'];
if(conditions.targets.length)lines.push('<div>'+L21+targetBatch.merged.map(g=>mergedSpeciesLabel(g,escape(g.name))+(g.hp===null?'':' HP '+g.hpLow+'–'+g.hp)).join(' / ')+'</div>');
lines.push('<div style="color:#0ff;">'+L71+' · '+L73+': '+escape(proof.rating)+'</div>');
lines.push('<div style="color:#789;">'+(proof.statBounds
?T('Each stat range below shows its individual limits; values from different ranges cannot be freely combined. Verified pairings are examples with the stated values fixed, not the complete conditions for intermediate values.',
'下列範圍是各能力分別可達的上下界，不能任意配對。搭配例須固定所列數値；它們不是中間數値的完整成立條件。',
'以下は各能力それぞれの上下限で、自由に組み合わせることはできません。組合せ例は記載値を固定した場合の例であり、中間値の全条件ではありません。')
:L72)+'</div>');
for(const index of[0,1,2,3]){
const usage=usages.get(index),stats=usage?usage.stats.map(key=>solverConditionValue(proof,index,key)).filter(Boolean):[];
lines.push('<div>'+seat(index)+' · Lv'+proof.party[index].lv+' · '+L75+' '+(index+1)+(stats.length?' · '+stats.join(' · '):'')+'</div>');
}
const conditional=renderSolverConditionalBounds(proof);
if(conditional)lines.push('<div style="color:#0cc;">'+((proof.conditionalBounds||[]).some(c=>c.fixed.length)?T('Verified pairings (examples): ','已驗證的搭配例：','検証済みの組合せ例：'):'')+conditional+'</div>');
if(proof.statBounds&&proof.statBounds.length>1)lines.push('<div style="color:#789;">'+T('Verified example: ','成立數値例：','成立例：')
+proof.statBounds.filter(b=>(proof.usage||[]).some(row=>row.index===b.index&&row.stats.includes(b.key)))
.map(b=>escape(seat(b.index)+' '+getStatLabel(b.key)+' '+(b.keys?getDamageStat(b.key,proof.party[b.index].stats):proof.party[b.index].stats[b.key]))).join(' · ')+'</div>');
lines.push('<div>AT '+combo.reduce((n,v)=>n+(v.at||0),0)+(conditions.turn2Cost===null?'':' + '+conditions.turn2Cost+' ('+L06+')')+'=Bat. '+conditions.bat+'</div>');
if(conditions.multiOnly)lines.push('<div style="color:#ff0;">'+L68+'</div>');
lines.push('<div style="color:#789;">'+L69+'</div>');
return lines.join('');
}
function renderSolverSimTrace(data){
const conditions=data.neutralConditions,{combo=[],killTargets,defend}=data;
if(!conditions&&!(killTargets&&killTargets.length))return'<div style="color:#666;font-size:9px;margin-left:24px;">—</div>';
let proof=conditions?conditions.proof:data.battleProof;
if(!proof)return'<div style="color:#888;font-size:9px;margin-left:24px;">'+L19+'</div>';
if(!conditions)proof={...proof,useStats:true,usage:solverConditionStatUsage(combo,proof,killTargets)};
const chars=proof.party,assign=proof.assign,escape=solverConditionText;
const eggAssign=conditions?data.eggAssign:proof.eggAssign||data.eggAssign,eggTargets=proof.eggTargets||{};
const rows=new Map((proof.actionResults||[]).map(r=>[r.ci,r])),usages=new Map((proof.usage||[]).map(r=>[r.index,r]));
const targetBatch=conditions?mergeSameSpeciesGroups(conditions.targets):null;
const names=solverTraceInstanceNames(conditions?conditions.targets:killTargets,targetBatch||undefined);
const allies=T('All allies','全員','味方全員'),seat=index=>L20+(index+1);
const charLabel=c=>c?L20+(c.slot||chars.indexOf(c)+1)+(c.job!=null&&VOC_STATS[c.job]?' '+(DISPLAY_LANG==='EN'?VOC_STATS[c.job].en:VOC_STATS[c.job].jp):''):'?';
const hpRange=i=>'HP '+Math.max(0,i.hpLow)+'–'+Math.max(0,i.hp);
const remainingText=(left,empty=L28)=>left.length?left.map((i,n)=>'<b>'+names[i.index===undefined?n:i.index]+'</b> '+hpRange(i)).join(' / '):empty;
const damageDetail=row=>row&&row.kind==='damage'?row.targets.map(t=>{
const ko=t.outcome==='ko',possible=t.outcome==='possible';
return names[t.index]+(t.miss?' '+SOLVER_MISS_LABEL.all:'')+': '+hpRange({hp:t.hpBefore,hpLow:t.hpLowBefore})+'→<span style="color:'+(ko?'#f44':possible?'#f80':'#8f8')+';">'
+Math.max(0,t.hpLow)+'–'+Math.max(0,t.hp)+'</span>'+(ko?L32:possible?L33:'');
}).join(' / '):'';
const hitText=(v,kind,row)=>{
const area=kind==='G'||kind==='A';
let text=' · '+(area?T('Hits per enemy','每隻擊數','1体あたりの攻撃回数'):L65)+' '+SolverActionGate.hits(v);
if(area&&row){
text+=' · '+SOLVER_HIT_LABEL.hit+row.hitCount+SOLVER_HIT_LABEL.unit;
if(row.hitCount!==row.targets.length)text+=' / '+SOLVER_HIT_LABEL.target+row.targets.length+SOLVER_HIT_LABEL.unit;
}
return text;
};
const mercyTargets=row=>{
const hit=new Map(),groups=new Map(),parts=[];
for(const t of row.targets){
hit.set(t.hex,(hit.get(t.hex)||0)+1);
solverMapEntry(groups,t.groupIdx,()=>({hex:t.hex,indices:[]})).indices.push(t.index);
}
for(const[i,{hex,indices}]of groups){
const group=conditions.targets[i];
let base=escape(group&&group.hex===hex?group.name:getMonsterShieldName(hex));
if(group&&hit.get(hex)<targetBatch.of(hex).count){
const rebase=(targetBatch.offset[i]||0)-conditions.targets.slice(0,i).reduce((sum,g)=>sum+g.count,0);
base+=' '+indices.map(index=>index+rebase+1).join(',');
}
parts.push({hex,count:indices.length,base});
}
return mergeSameSpeciesGroups(parts,p=>p.base).merged.map(p=>mergedSpeciesLabel(p,p.base)+' '+L24).join(' / ');
};
let html=conditions
?'<div style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:6px;margin-top:2px;">'+solverTraceConditionHeader(conditions,proof,combo,targetBatch,usages)
:'<div style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:4px;margin-top:1px;"><div style="color:#888;">'+L21+remainingText(buildSimInstances(killTargets),'')+'</div>';
for(let ci=0;ci<combo.length;ci++){
if(ci%SOLVER_ROUND_SIZE===0){
const acting=assign.slice(ci,ci+SOLVER_ROUND_SIZE),defenders=[0,1,2,3].filter(index=>!acting.includes(index));
html+='<div style="color:#789;">'+(ci?L06:L05)
+(defenders.length?' · '+L34+defenders.map(index=>conditions?seat(index):charLabel(chars[index])).join(', '):'')+'</div>';
}
const v=combo[ci],sk=lookupSkill(v.jp),row=rows.get(ci),name=solverDisplayName(v),usage=usages.get(assign[ci]);
const actionUsage=usage&&usage.actions.find(r=>r.ci===ci),statText=solverActionStatText(proof,assign[ci],actionUsage);
const equipment=actionUsage&&WEAPON_META[actionUsage.equip]?' · '+L64+' '+escape(solverDisplayName(actionUsage.equip)):'';
const stats=statText?' · '+escape(statText):'',miss=row&&SOLVER_MISS_LABEL[row.miss];
const target=eggTargets[ci],egg=v.jp==='おうえん',fource=!!findInlineFource([v]);
const beneficiary=egg&&target!==undefined?seat(assign[target])+' '+(conditions?escape(solverDisplayName(combo[target])):solverDisplayName(combo[target])):'';
const kind=sk&&SolverActionGate.targetKind(sk);
if(!conditions){
const char=actorAt(chars,assign,ci),lead='<div>'+L22+(ci+1)+L23+'<span style="color:#6cf;font-size:8px;">'+charLabel(char)+'</span> ',atStr=' · AT '+(v.at||0)+equipment+stats;
if(egg)html+=lead+'<span style="color:#ff0;">'+name+'</span> → '+(beneficiary||'?')+atStr+'</div>';
else if(fource)html+=lead+'<span style="color:#f80;">'+name+'</span> → '+allies+' '+L30+atStr+'</div>';
else if(!row)html+=lead+name+atStr+'</div>';
else if(v.jp==='みのがす'){
const removed=row.targets.map(t=>names[t.index]);
html+=lead+'<span style="color:#0ff;">'+name+'</span>'+atStr+' → '+(removed.length?removed.join(',')+L24:L25)+L27+remainingText(row.remaining)+'</div>';
}else{
const mul=eggAssign&&eggAssign[ci]||1,metalOnly=row.targets.every(t=>solverFieldMetal&&isMetalHex(t.hex));
const mulStr=mul>1?'<span style="color:#ff0;">×'+mul+(metalOnly?'':'＋'+tensionFlat(mul,char&&char.lv||99))+'</span>':'';
html+=lead+'<span style="color:#ccc;">'+name+(miss?' '+miss:'')+'</span>'+mulStr+' ['+kind+']'+atStr+hitText(v,kind,row)+' → '+damageDetail(row)+L27+remainingText(row.remaining)+'</div>';
}
continue;
}
let text=L22+(ci+1)+L23+escape(name)+(miss?' '+miss:'')+' · AT '+(v.at||0)+' · '+seat(assign[ci]);
if(egg&&beneficiary)text+=' → '+beneficiary;
if(fource)text+=' → '+allies;
text+=(v.at>0?hitText(v,kind,row):'')+equipment+stats;
if(eggAssign&&eggAssign[ci])text+=' · ⊕T'+getTensionTier(tensionStage(eggAssign[ci])).lv;
if(v.earlyKill)text+=' · '+L66;
if(isSolverRandomTargetSkill(sk))text+=' · '+L67;
const detail=damageDetail(row);
if(detail)text+=' → '+detail+L27+remainingText(row.remaining);
else if(row&&row.kind==='mercy'&&row.targets.length)text+=' → '+mercyTargets(row);
else if(v.tgtGroup!==undefined&&conditions.targets[v.tgtGroup])text+=' → '+escape(conditions.targets[v.tgtGroup].name);
html+='<div>'+text+'</div>';
}
if(!conditions&&defend&&defend.length)html+='<div style="color:#789;margin-top:1px;">'+L34+defend.map(i=>charLabel(chars[i])).join(', ')+'</div>';
return html+renderSolverPlanVariantRows(data)+'</div>';
}
function solverPlanIdentityKey(combo){
const ids=[];
let fixedForm=false;
const plan=combo.filter(v=>v.at>0).map(v=>{
const sk=lookupSkill(v.id===undefined?v.jp:v.id),fixed=weaponMetaValue(v.equip||sk.equip,'fixedDmg');
const baseSkillId=fixed&&sk.baseSkillId!==undefined?sk.baseSkillId:sk.id,baseSkill=fixed&&lookupSkill(baseSkillId);
ids.push(baseSkillId);
if(fixed)fixedForm=true;
const representative=solverBasicSkillOf(baseSkill?{...v,id:baseSkillId,jp:baseSkill.jp,needle:false}:v);
return[representative?lookupSkill(representative).id:baseSkillId,v.at,SolverActionGate.hits(v),v.earlyKill?1:0,fixed?0:v.needle?1:0].join('|');
}).sort().join('+');
return[plan,ids.sort().join('+'),fixedForm];
}
function mergeSolverPlanVariants(entries,hexId){
const byKey=new Map(),rating=e=>e.kill||e.conditionProof&&e.conditionProof.rating;
for(const entry of entries){
const[plan,skillKey,fixedForm]=solverPlanIdentityKey(entry.combo);
entry.skillKey=skillKey;entry.fixedForm=fixedForm;
solverMapEntry(byKey,plan+'|'+(entry.fallbackKind||''),()=>[]).push(entry);
}
return[...byKey.values()].map(group=>{
let head=group[0],tier;
for(const e of group){
if(e===head||rating(e)!==rating(group[0]))continue;
const bare=rating(e)==='gold'&&e.buffCount!==undefined&&head.buffCount!==undefined?+(e.buffCount>0)-+(head.buffCount>0):0;
if(bare<0){head=e;tier=null;}
else if(!bare){
const t=solverPlanHeadTier(e,hexId);
if(tier==null)tier=solverPlanHeadTier(head,hexId);
if(t<tier){head=e;tier=t;}
}
}
if(group.length>1)head.planVariants=group.filter(e=>e!==head);
return head;
});
}
function renderSolverPlanVariantRows(data){
const rows=data.planVariants||[],skillRows=data.skillVariants||[];
if(!rows.length&&!skillRows.length)return'';
const line=(v,kind,index)=>{
const proof=v.neutralConditions?v.neutralConditions.proof:v.battleProof;
const note=v.neutralConditions?renderSolverConditionSummary(v.neutralConditions):proof?solverConditionText(proof.rating):'';
const text=v.combo.map((action,ci)=>solverDisplayName(action,proof,ci,'variant')).join(' + ')+(v.fallback?SOLVER_ROW_FALLBACK_TAG[v.fallbackKind||'']:'')
+(v.sameCount>1?' <span style="color:#888;">×'+v.sameCount+'</span>':'')
+(note?' <span style="color:#39C5BB;">'+note+'</span>':'');
if(!(v.neutralConditions&&v.neutralConditions.proof)&&!v.battleProof)return'<div style="color:#aaa;">· '+text+'</div>';
return'<details data-solver-variant-kind="'+kind+'" data-solver-variant-index="'+index
+'" ontoggle="expandCombo(this)" style="color:#aaa;">'
+'<summary style="cursor:pointer;">'+text+' <span style="color:#8cf;">'+L07+'</span></summary>'
+'<div></div></details>';
};
const expander=(count,show)=>'<div style="color:#39C5BB;cursor:pointer;" onclick="'+show+';this.remove()">· +'
+count+T(' more variants (click to show)',' 個變體（點擊展開）',' 件の変種（クリックで表示）')+'</div>';
const out=[];
if(rows.length){
out.push('<div style="color:#0ff;margin-top:2px;">'
+T('Merged variants — same skills, different gear / target / buff placement',
'已合併的變體 —— 同一組招式，武器／攻擊目標／增益位置不同',
'統合した変種 —— 同じ技構成、武器・指定・補助の位置違い')+'</div>');
const lines=rows.map((v,i)=>line(v,'planVariants',i));
out.push(...lines.slice(0,SOLVER_VARIANT_MAX));
if(lines.length>SOLVER_VARIANT_MAX)out.push(expander(lines.length-SOLVER_VARIANT_MAX,'this.nextElementSibling.style.display=\'\'')
+'<div style="display:none;">'+lines.slice(SOLVER_VARIANT_MAX).join('')+'</div>');
}
if(skillRows.length){
out.push('<div data-skill-variants="1" style="color:#0ff;margin-top:2px;">'
+T('Same-AT skills — different skill, same AT; each with its own variants and conditions',
'同 AT 招 —— 招式不同、AT 相同，各自的變體與條件',
'同じ AT の技 —— 技は違うが AT は同じ、各自の変種と条件')+'</div>');
const groups=new Map();
skillRows.forEach((v,i)=>solverMapEntry(groups,v.skillKey,()=>[]).push([v,i]));
const shown=(i,row)=>i<SOLVER_VARIANT_MAX?row:'<div style="display:none;">'+row+'</div>';
for(const group of groups.values()){
out.push(shown(group[0][1],'<div style="color:#8cf;">'+group[0][0].combo.filter(a=>a.at>0).map(a=>solverConditionText(solverDisplayName(a))).join(' + ')+'</div>'));
for(const[v,i]of group)out.push(shown(i,line(v,'skillVariants',i)));
}
if(skillRows.length>SOLVER_VARIANT_MAX)out.push(expander(skillRows.length-SOLVER_VARIANT_MAX,
'for(let e=this.previousElementSibling;e&&!e.dataset.skillVariants;e=e.previousElementSibling)e.style.display=\'\''));
}
return out.join('');
}
function buildSolverNeutralConditions(entry,targets,bat){
const proof=entry.conditionProof;
return{
bat,turn2Cost:entry.combo.length>SOLVER_ROUND_SIZE?proof.roundCost:null,multiOnly:!!entry.multiOnly,
proof:{rating:proof.rating,party:proof.party,assign:proof.assign,eggAssign:proof.eggAssign||null,eggTargets:proof.eggTargets||{},actualAT:proof.actualAT,roundCost:proof.roundCost,
...(proof.fallbackKind?{fallbackKind:proof.fallbackKind}:{}),
pathSig:proof.pathSig||'',actionResults:proof.actionResults||null,
statBounds:proof.statBounds||null,conditionalBounds:proof.conditionalBounds||null,
usage:solverConditionStatUsage(entry.combo,proof,targets)},
targets:(targets||[]).map(g=>{
const mon=MONSTER_DB[g.hex],hp=mon?mon.s[0]:null;
return{hex:g.hex,name:getMonsterShieldName(g.hex),count:g.count||1,
hp,hpLow:hp===null?null:monHpMin(hp)};
})
};
}
function renderSolverConditionSummary(conditions){
const proof=conditions&&conditions.proof;
if(!proof)return'';
const conditional=renderSolverConditionalBounds(proof,true);
if(conditional)return(proof.statBounds.some(b=>b.keys)&&proof.statBounds.some(b=>b.lo!==b.hi)&&(proof.conditionalBounds||[]).some(c=>c.fixed.length)?T('Example pairing: ','搭配例：','組合せ例：'):'')+conditional;
return(proof.usage||[]).map(row=>{
const values=row.stats.map(key=>solverConditionValue(proof,row.index,key,true)).filter(Boolean);
return values.length?solverActorMark(row.index)+' '+solverConditionText(values.join(' + ')):'';
}).filter(Boolean).join(' · ');
}
function pickSolverPlanVariants(list,useStats,own){
const seen=new Map(),plan=[],skills=[];
for(const v of list){
const key=useStats?v.skillKey+'|'+v.battleProof.pathSig+(v.fallback?'|fallback':'')+'|'+(v.fallbackKind||'')+(v.fixedForm?'|'+v.actionSig:''):v.conditionProof;
const row=seen.get(key);
if(row){row.sameCount++;continue;}
const fresh={entry:v,sameCount:1};
seen.set(key,fresh);
(v.skillKey===own?plan:skills).push(fresh);
}
return{plan,skills};
}
function renderSolverRows({bat,useStats,chars,hexId,isMetal,_offTargets,_simTargets,isRound2,filtered,monBlock,blockRule}){
const SHOW_INIT=5,SHOW_MAX=30;
const displayList=mergeSolverPlanVariants(filtered,hexId);
const shownList=displayList.slice(0,SHOW_MAX);
const bucketId='sb'+(window._solverBucketId++);
window._solverBuckets=window._solverBuckets||{};
const actors=Array.from(chars.keys());
const rowOf=({entry:v,sameCount})=>{
finalizeSolverConditionProof(v,_offTargets,hexId,bat);
return{
combo:v.combo,killTargets:_simTargets,
eggAssign:v.eggAssign,assign:v.assign,
defend:useStats&&isMetal&&!v.mercyRecovered?undefined:actors.filter(i=>!v.assign.includes(i)),
...(v.fallback?{fallback:true}:{}),
...(v.fallbackKind?{fallbackKind:v.fallbackKind}:{}),
...(sameCount===undefined?{}:{sameCount,skillKey:v.skillKey}),
battleProof:useStats?v.battleProof:null,
neutralConditions:useStats?null:buildSolverNeutralConditions(v,_simTargets,bat)};
};
const renderOne=(e,hidden)=>{
const{combo,kill,eggAssign}=e;
const cid=window._solverComboId++;
const row=window._solverComboMap[cid]=rowOf({entry:e});
if(e.planVariants){
const{plan,skills}=pickSolverPlanVariants(e.planVariants,useStats,e.skillKey);
row.planVariants=plan.map(rowOf);
row.skillVariants=skills.map(rowOf);
}
const proof=useStats?e.battleProof:e.conditionProof;
const parts=combo.map((v,ci)=>{
let s=solverDisplayName(v,proof,ci,'summary');
if(eggAssign&&eggAssign[ci]){
const tLv=getTensionTier(tensionStage(eggAssign[ci])).lv;
s+='<span style="color:#ff0;font-size:8px;">⊕T'+tLv+'</span>';
}
return s;
});
let tag='';
if(kill==='gold')tag=' <span style="color:#ffd700;font-size:9px;">★</span>';
else if(kill==='orange')tag=' <span style="color:#f80;font-size:9px;">☆</span>';
if(e.fallback)tag+=SOLVER_ROW_FALLBACK_TAG[e.fallbackKind||''];
let comboHtml;
if(isRound2&&parts.length>SOLVER_ROUND_SIZE){
const transSkill=' <span style="color:#f80;font-weight:bold;font-size:9px;">⮕'+L06+'(+'+proof.roundCost+')</span> ';
comboHtml=parts.slice(0,SOLVER_ROUND_SIZE).join(' + ')+transSkill+parts.slice(SOLVER_ROUND_SIZE).join(' + ');
}else{
comboHtml=parts.join(' + ');
}
const disp=hidden?'display:none;':'';
if(!useStats){
const summary=renderSolverConditionSummary(row.neutralConditions);
if(summary)tag+=' <span style="color:#39C5BB;font-size:9px;">'+summary+'</span>';
}
return'<div class="'+bucketId+'_row" style="'+disp+(!useStats?'white-space:nowrap;':'')+'font-size:10px;margin-left:16px;color:#aaa;cursor:pointer;" onclick="expandCombo('+cid+')">'
+comboHtml+tag+' <span style="color:#555;font-size:8px;">▶'+L07+'</span></div>'
+'<div id="combo_detail_'+cid+'" style="display:none;"></div>';
};
const blkGate=monBlock>0&&shownList.length>0&&!blockRule;
const lines=shownList.map((e,i)=>renderOne(e,blkGate||i>=SHOW_INIT));
const init=Math.min(SHOW_INIT,shownList.length);
window._solverBuckets[bucketId]={shown:blkGate?0:init,total:shownList.length,init,blocked:blkGate};
if(shownList.length>SHOW_INIT){
const remain=shownList.length-SHOW_INIT;
lines.push('<div id="'+bucketId+'_more" style="'+(blkGate?'display:none;':'')+'font-size:9px;margin-left:16px;color:#39C5BB;cursor:pointer;text-decoration:underline;" onclick="showMoreCombos(\''+bucketId+'\')">+'+remain+L09+'</div>');
}
if(blkGate)lines.unshift(SOLVER_BLOCK_PROMPT_HTML.replace(/\$bucket/g,bucketId).replace('$label',L17));
const shownRound2=shownList.slice(0,SHOW_INIT).some(e=>e.combo.length>SOLVER_ROUND_SIZE);
if(shownRound2)lines.unshift('<div style="font-size:9px;margin-left:16px;color:#f80;">'+L08+'</div>');
return lines.join('');
}
function evaluateSolverCandidate(combo,context){
const{multiPlayer,mon,hexId,isMetal,canFilter,genericSwapRanks,monGroups,assignmentSearch,genericSwapOf,filtered,T,walk,combos,killTargets,singleNonMetal,useStats,_offRanks,planType,fource,preferredFourceEls,stop}=context;
if(mon&&combo.some(v=>v.needDeath0)&&!solverNeedleTargetOK(hexId)||isMetal&&combo.some(v=>v.needle))return;
const genericSwap=canFilter?solverGenericSwapKey(context,combo):null,genericSwapBest=genericSwap?solverGenericSwapRank(genericSwap,genericSwapRanks):-1;
if(genericSwapBest===2){solverGenericSwapRank(genericSwap,genericSwapRanks,2,genericSwapBest);return;}
let req,baseRank=0;
const add=(entry,resume,readReq,pending)=>{
if(pending&&canFilter)entry.pendingOrders=pending;
if(resume)applySolverOrder(entry,{resume},readReq);
filtered.push(entry);
};
if(canFilter){
raceMulKills={c:combo,k:new Set()};
const _ord=findBestOrderedAssignment(combo,assignmentSearch);
const orderedCombo=_ord.combo,baseBest=_ord.best,_kills=raceMulKills.k;raceMulKills=null;
const kill=baseBest.rating;
baseRank=getRankOrderValue(kill);
solverGenericSwapRank(genericSwap,genericSwapRanks,baseRank,genericSwapBest);genericSwapOf.set(orderedCombo,genericSwap);
if(baseRank<2)solverRaceMulAdd(combo,context,_kills);
const readReq=c=>calcSolverMinStat(c,hexId);
const addOrder=({combo,best,resume,pending})=>add({combo,kill:best.rating,req:readReq(combo),eggAssign:best.eggAssign||null,assign:best.assign,battleProof:best.battleProof},resume,readReq,pending);
if(kill||_ord.resume||solverMercyPlacements(orderedCombo,walk).length)addOrder(_ord);
const ordered=!!killTargets,plainRank=seq=>priOrderOK(seq)?getRankOrderValue(findBestAssignment(seq,assignmentSearch).rating):0;
if(ordered||baseRank<2)for(const{combo:sw,swapped,original}of solverPriSwapCombos(combo,hexId,combos,ordered)){
const floor=ordered?nc=>plainRank(nc.map(v=>v===swapped?original:v)):()=>baseRank;
const o=findBestOrderedAssignment(sw,assignmentSearch,1,null,ordered?floor:null),b=o.best;
if(o.resume||getRankOrderValue(b.rating)>floor(o.combo))addOrder(o);
}
}else if(singleNonMetal){
req=calcSolverMinStat(combo,hexId);
solverRaceMulAdd(combo,context);
filtered.push({combo:finisherLastOrder(combo,req?req.finIdx:solverRaceMulIndex(combo)),kill:null,req});
}else{
let _mCombo=combo,_mBest=useStats&&isMetal?findBestAssignment(combo,assignmentSearch):null,_mercyRecovered=false,resumeEntry;
if(_mBest&&_mBest.rating!=='gold'&&killTargets&&killTargets.length&&T>1){
let _alt=findBestOrderedAssignment(combo,assignmentSearch,1,null,()=>getRankOrderValue(_mBest.rating));
const base=_mBest,ordered=_alt&&_alt.resume;
let mercy;
if((!_alt||ordered)&&!base.rating){
const recovered=solverRecoverMercy(context,combo);
if(recovered&&recovered.best){_alt=recovered;_mercyRecovered=true;}
else mercy=recovered&&recovered.resume;
}
if(_alt&&_alt.best&&_alt.best.rating){_mCombo=_alt.combo;_mBest=_alt.best;}
else if(base.resume||ordered||mercy)resumeEntry=()=>{
const best=base.resume&&base.resume();
return best?{combo,best}:ordered&&ordered()||mercy&&mercy();
};
else if(!base.rating)_mCombo=null;
}else if(_mBest&&_mBest.resume)resumeEntry=()=>{const best=_mBest.resume();return best&&{combo,best};};
if(_mCombo){
const _kill=_mBest&&_mBest.rating||(isMetal?'metal':null);
const _mAssign=_mBest&&_mBest.assign||undefined;
const _entry={combo:_mCombo,kill:_kill,req:null,
assign:_mAssign,battleProof:_mBest&&_mBest.battleProof,...(_mercyRecovered?{eggAssign:_mBest.eggAssign,mercyRecovered:true}:{})};
add(_entry,resumeEntry);
let offFound;
if(!useStats){
const genericSwap=solverGenericSwapKey(context,_mCombo),cp=solverGenericSwapRank(genericSwap,_offRanks);
baseRank=2;
if(cp<2){offFound=solverOffProve(context,_entry);const p=offFound.proof;baseRank=Math.max(cp,p?getRankOrderValue(p.rating):0);if(stop&&p&&p.rating==='gold'&&(!stop.main||p.fallbackKind||solverMercyIndex(_mCombo)>=0))stop.gold=true;}
solverGenericSwapRank(genericSwap,_offRanks,baseRank,cp);
}else baseRank=getRankOrderValue(_kill);
if(baseRank<2)solverRaceMulAdd(combo,context,useStats?new Set():offFound.kills);
}
}
const twoRounds=combo.length>SOLVER_ROUND_SIZE;
if(mon&&(!isMetal||combo.some(v=>v.metalFirst))&&baseRank<2&&(combo.length<SOLVER_ROUND_SIZE||twoRounds&&combo.length<SOLVER_MAX_ACTIONS)&&!combo.some(v=>v.at>0&&_actionPri(v)>0)){
const withFource=(canFilter||singleNonMetal)&&fource&&combo.some(v=>solverEggCanBenefit(v,monGroups,null,1));
const eggOnly=(isMetal||planType!=='kill_mercy_clear')&&combo.some(v=>solverEggCanBenefit(v,monGroups));
const eggTiers=withFource||eggOnly?makeEggOnPrefix(null,combo,-1,twoRounds?SOLVER_MAX_ACTIONS:SOLVER_ROUND_SIZE,multiPlayer):[];
for(const buff of withFource?[null,fource]:[null]){
if(!buff&&!eggOnly)continue;
for(const tier of buff?[{eggs:0,mul:1},...eggTiers]:eggTiers){
if(buff&&combo.length+tier.eggs>=SOLVER_ROUND_SIZE)break;
let boostReq=null;
if(!canFilter&&singleNonMetal){
boostReq=calcSolverMinStat(combo,hexId,tier.mul,buff);
if(!boostReq||!(boostReq.min<=999)||buff&&!tier.eggs&&req&&!req.fixedFinisher&&!(boostReq.min<req.min))continue;
}
const bare=boostReq?finisherLastOrder(combo,boostReq.finIdx):combo;
const options=tier.eggs?{multiOnly:tier.multiOnly}:{};
for(const placed of buff?[[...makeEggOnPrefix(tier.eggs),makeSolverAction(buff),...bare]]:makeEggOnPrefix(tier.eggs,bare,isMetal?solverMercyIndex(bare):-1)){
const boosted=sortComboByPriority(placed);
if(useStats){
let order=findBestOrderedAssignment(boosted,assignmentSearch,tier.mul,buff?preferredFourceEls:null);
if(!order){
const best=findBestAssignment(boosted,assignmentSearch);
order={combo:boosted,best,...(best.resume?{resume:()=>{const proof=best.resume();return proof&&{combo:boosted,best:proof};}}:{})};
}
const best=order.best;
if(order.resume||getRankOrderValue(best.rating)>=Math.max(1,baseRank))
add({combo:order.combo,kill:best.rating,req:canFilter?calcSolverMinStat(combo,hexId,tier.mul,buff):null,...options,
eggAssign:best.eggAssign,assign:best.assign,battleProof:best.battleProof},order.resume,null,order.pending);
}else{
filtered.push({combo:boosted,kill:null,req:boostReq,...options});
}
}
}
}
}
}
function evaluateSolverCandidates(context){
const{useStats,multiPlayer,filtered,raceMulQueue,stop,hexId,assignmentSearch}=context;
if(context.done)return false;
if(!context.queues){
const combos=context.combos=expandComboEquipVariants(multiPlayer?context.combos:context.combos.filter(c=>!isMultiTargetOnly(c)),hexId),facts=assignmentSearch.forms;
for(const c of combos)solverComboFacts(c,facts);
combos.sort(solverOrder.slots(facts));
context.queues=useStats?[combos]:[[],[]];
if(!useStats)for(const combo of combos)context.queues[+combo.some(v=>v.at===0&&!isSolverNonDamageRemoval(v))].push(combo);
context.qi=0;context.ci=0;
}
for(const queues=context.queues;context.qi<queues.length;context.qi++,context.ci=0){
const queue=queues[context.qi];
raceMulQueue.queue=queue;
while(context.ci<queue.length){
const before=filtered.length;
evaluateSolverCandidate(queue[context.ci++],context);
if(stop&&stop.on&&stop.early&&useStats)for(let i=before;i<filtered.length&&!stop.gold;i++){
const e=filtered[i];
if(e.kill!=='gold'||!multiPlayer&&(e.multiOnly||isMultiTargetOnly(e.combo)))continue;
if(e.battleProof&&e.battleProof.rating==='gold'&&(!stop.main||e.fallbackKind||solverMercyIndex(e.combo)>=0))stop.gold=true;
}
if(stop&&stop.on&&stop.early&&stop.gold)return true;
}
}
context.done=true;
let next=0;
for(const entry of filtered){
if(!entry.multiOnly)entry.multiOnly=isMultiTargetOnly(entry.combo);
if(!multiPlayer&&entry.multiOnly)continue;
if(!useStats)entry.buffCount=entry.combo.filter(action=>action.at===0&&!isSolverNonDamageRemoval(action)).length;
filtered[next++]=entry;
}
filtered.length=next;
const estimates=_solverGoldState&&_solverGoldState.estimates;
if(estimates){
const{aggregate,finisher,requirements,scores}=estimates;
aggregate.clear();finisher.clear();requirements.clear();scores.clear();
context.queues=context.combos=raceMulQueue.queue=null;
raceMulQueue.seen.clear();
}
return false;
}
function proveSolverEntries(args,context){
const{useStats,genericSwapRanks,stop,singleNonMetal}=context,{filtered}=args;
if(!useStats){
if(!args.order){
args.ranks=new Map();args.selected=new Map();args.pending=[];args.goldKinds=new Set();args.next=0;
for(const e of filtered)e.genericSwap=solverGenericSwapKey(context,e.combo);
args.order=filtered.map((e,i)=>i).sort(solverOrder.proof(filtered));
}
const{ranks,selected,goldKinds}=args;
let orangeKinds;
for(;;){
const order=orangeKinds?args.pending:args.order;
for(let next=orangeKinds?0:args.next;next<order.length;){
const i=order[next++],e=filtered[i],cp=solverGenericSwapRank(e.genericSwap,ranks);
if(!orangeKinds)args.next=next;
if(cp===2){if(!orangeKinds)solverGenericSwapRank(e.genericSwap,ranks,2,cp);continue;}
const found=solverOffProve(context,e,orangeKinds),proof=found.proof,rank=proof?getRankOrderValue(proof.rating):0;
solverGenericSwapRank(e.genericSwap,ranks,rank,cp);
if(proof&&rank>cp)selected.set(e,found);
if(orangeKinds){if(rank===2)break;}
else if(!proof)args.pending.push(i);
else if(rank>cp){
goldKinds.add(!!proof.fallbackKind);
if(stop&&stop.on&&stop.early&&rank===2&&(!stop.main||proof.fallbackKind||solverMercyIndex(e.combo)>=0))return true;
}
}
if(orangeKinds)break;
if(!args.hold&&!solverGoldFound())_solverGoldState.below=true;
if(!args.below&&_solverGoldState.below){
Object.assign(args,{below:true,order:args.pending,pending:[],next:0});
continue;
}
if(args.hold)return false;
if(solverGoldFound())break;
orangeKinds=new Set([false,true].filter(kind=>!goldKinds.has(kind)));
if(!orangeKinds.size)break;
}
let next=0;
for(const e of filtered){
const found=selected.get(e);
if(!found)continue;
const proof=found.proof;
e.lazyBounds=singleNonMetal&&!e.combo.some(isSolverNonDamageRemoval);
e.combo=found.combo;
e.conditionProof=proof;
e.conditionState=found.state;
e.fallbackKind=proof.fallbackKind;
e.assign=proof.assign;e.eggAssign=proof.eggAssign;
e.kill=null;
filtered[next++]=e;
}
filtered.length=next;
}else{
if(args.hold)return false;
if(_solverGoldState.orange)for(const entry of filtered)if(entry.resume)entry.resume();
for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i],p=e.battleProof;
if(!p){filtered.splice(i,1);continue;}
e.kill=p.rating;e.eggAssign=p.eggAssign;
e.fallbackKind=p.fallbackKind;
delete e.resume;
delete e.pendingOrders;
solverNoteGold(p.rating);
}
const ranks=new Map(genericSwapRanks),drop=new Set();
for(const e of filtered)e.genericSwap=solverGenericSwapKey(context,e.combo);
for(const e of filtered.slice().sort(solverOrder.swap)){
const rank=getRankOrderValue(e.kill),cp=solverGenericSwapRank(e.genericSwap,ranks,rank);
if(rank<=cp)drop.add(e);
}
for(let i=filtered.length-1;i>=0;i--)if(drop.has(filtered[i]))filtered.splice(i,1);
}
return false;
}
function renderSolverResult(bat,monGroups,monId,mapDeft,canRound2,_forceKillAll,_prebuiltKmc,_prebuiltKillAll,_deferKillAll,_incomplete,_limited,beforeOrange,fieldMetal){
canRound2=solverAllowsRound2(mapDeft,canRound2);
if(_solverRenderDepth++===0){_solverSearchIncomplete=false;_solverSearchLimited=false;window._solverRenderError=null;_solverGoldState={gold:false};}else{_solverGoldState.below=false;_solverGoldState.orange=false;}
_solverSearchIncomplete=_solverSearchIncomplete||!!(_incomplete||_prebuiltKmc&&_prebuiltKmc.incomplete||_prebuiltKillAll&&_prebuiltKillAll.incomplete);
_solverSearchLimited=_solverSearchLimited||!!(_limited||_prebuiltKmc&&_prebuiltKmc.limited||_prebuiltKillAll&&_prebuiltKillAll.limited);
try{
window._solverSolvable=null;
if(bat<0)return'';
const useStats=solverUseStatsEnabled(),multiPlayer=solverMultiPlayerEnabled(),chars=readCharStatsFromDom(),blockRule=solverBlockRuleEnabled();
_solverUseStats=useStats;
resetSolverDamageCache(useStats,chars,(monGroups[0]||{}).hex);
if(bat===0){
const casters=monGroups.every(g=>solverDeathRes(g.hex)>0)?chars.filter(c=>!useStats||solverActorSlotOK(0,0,c.job,[getSkillClassLock({jp:18})],[],0)>=0):[];
if(casters.length){window._solverSolvable=true;return renderKathwackPlan(monId,monGroups,casters);}
window._solverSolvable=false;
return SOLVER_DASH;
}
const _mercyLv=maxCharLv(chars),levels=chars.map(c=>c.lv||99);
const _planMeta=deriveSolverBattlePlan(monGroups,monId,_mercyLv,_forceKillAll,levels,fieldMetal);
const{T,round2Cost,hexId,isMetal,nonMetalSups:_nonMetalSups,metalFallback}=_planMeta;
const mon=hexId?MONSTER_DB[hexId]:null;
const _effDeath=_planMeta.effectiveDeath;
let{planType,postAlive,maxPostAlive,mercyCertain,effMon}=_planMeta;
if(_forceKillAll)window._solverFallback=window._solverFallback||_planMeta.naturalPlanType!=='kill_all';
const _offTargets=monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)})),killTargets=T>1?_offTargets:null,_simTargets=T?_offTargets:null;
solverApplyBuildContext({groupCounts:killTargets&&killTargets.map(t=>t.count),fieldTotal:killTargets?T:null,useStats,fieldHexes:monGroups.map(g=>g.hex),fieldMetal});
const assignmentSearch=_solverGoldState.assignment||(_solverGoldState.assignment={
hexId,mon,killTargets,targets:_offTargets,chars,bat,mercyLv:_mercyLv,forms:new WeakMap(),byTension:new Map()});
let excludedPads=null,excludedPadsAfterMercy=null,supPads=null;
if(isMetal&&_nonMetalSups.length>0){
({excludedPads,excludedPadsAfterMercy,supPads}=
solverMetalSupportPads(monGroups,_nonMetalSups,_effDeath,chars));
}
const _phaseBCountsAll=killTargets?killTargets.map(t=>
solverFieldMetal&&isMetalHex(t.hex)?0:(t.count||0)):null;
const _phaseBCountsAfterMercy=killTargets?killTargets.map((t,i)=>
(solverFieldMetal&&isMetalHex(t.hex)||mercyCertain&&mercyCertain[i])?0:(t.count||0)):null;
const _metalHPs=[];
for(const g of monGroups)if(solverFieldMetal&&isMetalHex(g.hex)){
const s=(MONSTER_DB[g.hex]||{}).s;
const h=(s&&s[0])?s[0]:999;
for(let i=0;i<(g.count||1);i++)_metalHPs.push(h);
}
const _metalCount=_metalHPs.length||(isMetal?T:0);
if(_metalCount===0){
const variants=expandSolverCombos(T),search=buildSolverATSearch({variants,late:variants.length},bat,canRound2?SOLVER_MAX_ACTIONS:SOLVER_ROUND_SIZE);
const spaces=solverRoundSpaces(bat,round2Cost,canRound2,null,(key,target,round,min,max)=>({target,round,min,max}))
.filter(s=>search.reachesDepth(0,s.target,s.min,s.max));
if(!spaces.length){window._solverSolvable=_solverSearchIncomplete?null:false;return SOLVER_DASH;}
if(planType!=='kill_all'&&spaces.every(s=>s.round===2&&!search.reachesDepth(0,s.target,s.min,s.max-1))){
({planType,postAlive,maxPostAlive,mercyCertain,effMon}=deriveSolverBattlePlan(monGroups,monId,_mercyLv,true,levels,fieldMetal));
window._solverFallback=true;
}
}
const walk={isMetal,killTargets,T,planType,postAlive,effMon,mercyCertain};
const buildOptions={bat,monGroups,mapDeft,canRound2,_forceKillAll,_prebuiltKmc,_prebuiltKillAll,_deferKillAll,round2Cost,hexId,maxPostAlive,excludedPads,excludedPadsAfterMercy,supPads,_phaseBCountsAll,_phaseBCountsAfterMercy,walk,_metalHPs,_metalCount};
if(!useStats&&mon&&T===1&&!isMetal)_solverGoldState.estimates={aggregate:new Map(),finisher:new Map(),requirements:new Map(),scores:new Map()};
const planned=buildSolverPlanCombos(buildOptions);
if(!planned)return'';
let{combos,isRound2}=planned;
if(combos.length===0&&!planned.deferredRound2)return solverEmptyResult(buildOptions,false);
window._solverSolvable=true;
let filtered=[],firstRound=null;
const fource=(!isMetal&&hexId)?pickBestFource(hexId):null;
const preferredFourceEls=fource&&getFourceEls(fource,[]);
const canFilter=mon&&!isMetal&&useStats,singleNonMetal=mon&&T===1&&!isMetal;
const monBlock=solverFieldBlock(monGroups.filter(g=>g.count>0).map(g=>g.hex));
const _allFallback=!!window._solverFallback||metalFallback;
const stop=_solverVerdictMode?{on:true,early:_allFallback?planType==='kill_all'||_offTargets.every((t,gi)=>!gi||!(t.death>0)):true,main:!_allFallback&&planType!=='kill_all',gold:false}:null;
const evaluation={bat,chars,monGroups,useStats,multiPlayer,T,hexId,isMetal,mon,planType,killTargets,walk,assignmentSearch,combos,filtered,fource,preferredFourceEls,canFilter,singleNonMetal,metalFallback,_offTargets,stop,
mercyTrials:new Map(),genericSwapRanks:new Map(),genericSwapOf:new WeakMap(),_offProofs:new Map(),_offRanks:new Map(),raceMulQueue:{queue:null,seen:new Set()},improveIndex:0};
const proving={filtered,hold:true};
let proved=false,_anyRated,round2=planned.deferredRound2,ready=false;
const pause=()=>{_solverResume={finish,stop,options:buildOptions,depth:_solverRenderDepth,gold:_solverGoldState,flags:[_solverSearchIncomplete,_solverSearchLimited],cache:_solverDmgCache,build:solverApplyBuildContext(),fallback:window._solverFallback,needsKillAll:window._solverNeedsKillAll};return null;};
const finish=(primaryOrange=false)=>{
while(!proved){
if(!ready&&(evaluateSolverCandidates(evaluation)||improveSolverEntries(evaluation)||proveSolverEntries(proving,evaluation)))return pause();
ready=true;
if(round2&&!solverGoldFound()){
const next=buildSolverPlanCombos({...buildOptions,_round2:true});
if(!next)return pause();
round2=false;
if(next.combos.length){
isRound2=true;firstRound={...proving};filtered=[];ready=false;
Object.assign(evaluation,{combos:next.combos,filtered,queues:null,done:false,improveIndex:0});
Object.assign(proving,{filtered,order:null,hold:true});
continue;
}
}
round2=false;
if(!useStats&&proving.hold&&(_solverGoldState.below||!solverGoldFound())){_solverGoldState.below=true;if(firstRound&&proveSolverEntries(firstRound,evaluation)||proveSolverEntries(proving,evaluation))return pause();}
if(proving.hold){
if(!primaryOrange&&!solverGoldFound()){
if(beforeOrange){
const result=beforeOrange();
if(result!==null||_solverResume)return result;
}else if(planType!=='kill_all'&&_solverGoldState.maybeOrange){
if(buildOptions._deferKillAll&&!buildOptions._prebuiltKillAll){window._solverNeedsKillAll='r1';return pause();}
const build=solverApplyBuildContext(),fallback=window._solverFallback,below=_solverGoldState.below;
let resumed=false;
const resume=()=>{
resumed=true;
const nextBelow=_solverGoldState.below,nextFallback=window._solverFallback,nextSolvable=window._solverSolvable;
_solverGoldState.below=below;window._solverFallback=fallback;window._solverSolvable=true;
try{
const html=solverApplyBuildContext(build,()=>finish(true));
if(html===null&&!_solverResume){
window._solverFallback=nextFallback;window._solverSolvable=nextSolvable;
}
return html;
}finally{_solverGoldState.below=nextBelow;}
};
const html=solverEmptyResult(buildOptions,false,resume);
if(!resumed&&!solverGoldFound()&&!_solverResume&&!window._solverRenderError){
const result=resume();
if(result!==null)return result;
}
return html;
}
}
proving.hold=false;
_solverGoldState.orange=!solverGoldFound();
if(proveSolverEntries(proving,evaluation))return pause();
}
if(firstRound){
if(firstRound.hold){firstRound.hold=false;if(proveSolverEntries(firstRound,evaluation))return pause();}
filtered=firstRound.filtered.concat(filtered);firstRound=null;
}
evaluation.filtered=filtered;
_anyRated=filtered.length>0;
if(solverGoldFound())for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i],rating=useStats?e.kill:e.conditionProof&&e.conditionProof.rating;
if(rating!=='gold')filtered.splice(i,1);
}
evaluation._offProofs.clear();
proving.pending=proving.selected=null;
proved=true;
}
if(orderSolverEntries(evaluation))return pause();
if(filtered.length===0)return primaryOrange?null:solverEmptyResult(buildOptions,_anyRated);
return renderSolverRows({bat,useStats,chars,hexId,isMetal,_offTargets,_simTargets,isRound2,filtered,monBlock,blockRule});
};
const html=finish();
if(html!==null)return html;
if(stop&&!stop.late)window._solverFallback=_allFallback;
return'';
}catch(e){console.error('[Solver]',e);window._solverRenderError=e;window._solverSolvable=null;return'<div style="color:#f44;font-size:9px;">⚠ Solver error</div>';}
finally{if(--_solverRenderDepth===0)_solverGoldState=null;}
}
function solverMapEntry(store,key,make){let value=store.get(key);if(value===undefined)store.set(key,value=make?make():new Map());return value;}
function solverTrimCache(map,max){while(map.size>max)map.delete(map.keys().next().value);}
function solverIndicesOf(list,pred){const out=[];list.forEach((v,i)=>{if(pred(v,i))out.push(i);});return out;}
function solverNeutralLayouts(combo,party,memo,seen=new Map(),visit){
const shape=memo&&JSON.stringify(combo.map(v=>[getSkillClassLock(v),_actionPri(v),v.priSwap?v.equip||'':null])),known=shape&&memo.layouts.get(shape);
if(known){if(visit)known.some(assign=>visit(assign,assign.map(a=>assign.indexOf(a)).join()));return known;}
const list=shape&&[];
if(!forEachSolverAssignment(combo,party,assign=>{const pattern=assign.map(a=>assign.indexOf(a)).join();if(seen.has(pattern))return false;seen.set(pattern,assign);if(list)list.push(assign);return!!visit&&visit(assign,pattern);})&&list)memo.layouts.set(shape,list);
return list;
}
function solverEggReachKey(combo,assign,chars){let ways='';for(let egg=0;egg<combo.length;egg++)if(combo[egg].jp==='おうえん')for(let ci=egg+1;ci<combo.length;ci++)ways+=+solverEggCanReach(combo,egg,ci,assign,chars);return ways;}
function binarySearchTrue(lo,hi,pred,mode){
if(mode==='min'){while(lo<hi){const m=(lo+hi)>>1;if(pred(m))hi=m;else lo=m+1;}return lo;}
let cap=lo-1;
while(lo<=hi){const m=(lo+hi)>>1;if(pred(m)){cap=m;lo=m+1;}else hi=m-1;}
return cap;
}
function solverActionReach(action,K,largest){
const sk=lookupSkill(action.jp),tgt=sk?sk.target:'S';
return tgt==='A'?K:tgt==='G'||tgt==='RG'?largest:tgt==='RA'||tgt==='RS'?Math.max(action.hits||0,(sk&&sk.hitRange&&sk.hitRange.max)||1):1;
}
function solverStructureStep(s,v){
if(!v){
const groups=s.killTargets||s,fields=_solverDmgCache.search.blockFields;
let field=fields.get(groups);
if(!field){
const metalGroup=[],groupMax=[],groupBlocks=[];
let openOther=0,openMetal=0,guardedOther=0,guardedMetal=0,largest=0,metalAlive=0;
for(const t of groups){
const metal=solverFieldMetal&&isMetalHex(t.hex),blocked=solverHexBlock(t.hex)>0,count=t.count||0;
metalGroup.push(metal);groupMax.push(count);groupBlocks.push(blocked&&!metal);
if(metal)metalAlive+=count;
if(count<=0)continue;
largest=Math.max(largest,count);
if(blocked){if(metal)guardedMetal+=count;else guardedOther+=count;}
else if(metal)openMetal+=count;else openOther+=count;
}
fields.set(groups,field={metalGroup,groupMax,groupBlocks,metalAlive,openOther,openMetal,guardedOther,guardedMetal,largest});
}
if(groups===s)return field;
const{metalGroup,groupMax,metalAlive,largest}=field,other=s.T-metalAlive;
return{walk:s,metalGroup,groupMax,metalAlive,largest:Math.max(1,largest),metalSups:solverFieldMetal?solverMetalCompanionCount():0,execs:0,otherMax:other,otherMin:other,hitCap:0};
}
const{killTargets,planType,mercyCertain}=s.walk,{metalGroup,metalAlive}=s;
if(v.jp==='みのがす'){
const groupMax=s.groupMax=s.groupMax.slice();
for(let gi=planType==='kill_mercy_clear'?0:1;gi<killTargets.length;gi++){
const g=killTargets[gi],killed=gi===0?1:0,drop=(mercyCertain?mercyCertain[gi]:g.death>0)?g.count:killed;
s.otherMin-=g.death>0?g.count:killed;s.otherMax-=drop;groupMax[gi]=Math.max(0,groupMax[gi]-drop);
}
return true;
}
if(!(v.at>0))return true;
if(s.metalSups&&isMetalExecutionAction(v))return++s.execs<=metalAlive;
const sk=lookupSkill(v.jp),g=v.tgtGroup,tgt=sk?sk.target:'S',groupMax=s.groupMax,hitCap=s.hitCap;
if(g!==undefined&&metalGroup[g]&&!isMetalActionSkill(v))return false;
const aliveMax=s.otherMax+metalAlive,aliveLow=Math.max(1,Math.max(0,s.otherMin-hitCap)+metalAlive);
if(aliveMax<1||g!==undefined&&(groupMax[g]||0)<1)return false;
if(sk&&sk.aimGroup&&!groupMax.some((n,gi)=>n>=1&&sk.aimGroup(metalGroup[gi]?n:Math.max(1,n-hitCap))))return false;
if(v.aoeK!==undefined){
if(g!==undefined){const n=groupMax[g]!==undefined?groupMax[g]:0;if(metalGroup[g]?v.aoeK!==n:v.aoeK>n||v.aoeK<Math.max(1,n-hitCap))return false;}
else if(v.aoeK>aliveMax||v.aoeK<aliveLow)return false;
}else if(isSolverRandomTargetSkill(sk)&&aliveLow>1)return false;
s.hitCap+=v.aoeK!==undefined?v.aoeK:tgt==='A'?s.otherMax:tgt==='G'||tgt==='RG'?(g!==undefined&&groupMax[g]!==undefined?groupMax[g]:Math.max(...groupMax)):tgt==='RA'||tgt==='RS'?Math.max(v.hits||0,1):1;
return true;
}
function solverWalkPruning(variants,walk,ordered){
if(walk.isMetal||!walk.killTargets||walk.T<=1)return{};
const state=solverStructureStep(walk),metals=state.metalSups,K=walk.effMon;
const need=(need,exact,value)=>{
const n=variants.length,values=new Int32Array(n),most=new Int32Array(n+1);
for(let i=n-1;i>=0;i--){values[i]=variants[i].at>0?value(variants[i]):0;most[i]=Math.max(most[i+1],values[i]);}
return{values,most,need,exact};
};
return{needs:[need(K,false,v=>solverActionReach(v,K,state.largest)),...(metals?[need(metals,true,v=>isMetalExecutionAction(v)?1:0)]:[])],structure:ordered?state:null};
}
function solverPaperDamageUpperBound(combo,hexId,tensionMul,fEls,ids,actionIndex=-1,position=1){
const state=_solverDmgCache.search,mul=tensionMul>1?tensionMul:1;
const suffix='|'+JSON.stringify([hexId,mul,fEls,position]);
let total=0;
for(let ci=actionIndex<0?0:actionIndex,end=actionIndex<0?combo.length:actionIndex+1;ci<end;ci++){
const action=combo[ci];
if(isSolverNonDamageRemoval(action))return actionIndex<0?Infinity:{min:Infinity,max:Infinity};
if(!(action.at>0))continue;
const key=ids[ci]+suffix;
let best=state.paper.get(key);
if(best===undefined){
const sk=lookupSkill(action.jp);
let high=0;
if(!sk||!MONSTER_DB[hexId]||sk.dmg&&sk.dmg.m&&sk.dmg.m<sk.dmg.b){best=high=Infinity;}
else{
best=0;
const hits=SolverActionGate.hits(action),boost=solverEggDamageAction(action,sk)?mul:1;
const def=MONSTER_DB[hexId].s[2],stats=[EXT_STATS];
if(!sk.dmg&&!sk.fixedDmg)for(const edge of[Math.floor(def/2),Math.floor(def/1.75)]){
if(edge>=solverStatMin('atk',action.equip||solverDefaultEquip(sk))&&edge<999)stats.push({...EXT_STATS,atk:edge});
}
for(const st of stats)for(const els of fEls?[null,fEls]:[null]){
const range=calcSkillDamageCache(sk,st,hexId,els,actionPlus1(sk,action.equip),action.equip,position);
if(!range||!Number.isFinite(range.min)||!Number.isFinite(range.max)){best=high=Infinity;break;}
const damage=solverActionDamage(sk,hexId,els,range,hits,boost,99);
best=Math.max(best,damage.min);high=Math.max(high,damage.max);
}
}
best={min:best,max:high};
state.paper.set(key,best);
}
if(actionIndex>=0)return best;
total+=best.max;
}
return total;
}
function solverMetalFirstTailOK(combo,targets,state,goldOnly,fource){
if(state.tailRank!==undefined)return state.tailRank>=(goldOnly?2:1);
if(!(combo[combo.length-1].at>0)||combo.some(v=>v.at>0?isSolverNonDamageRemoval(v)&&!isMetalExecutionAction(v):v.jp!=='おうえん'&&!FOURCE_EL[v.jp]))return true;
const basis=solverMapEntry(_solverDmgCache.search.metalTails,targets,()=>{
const field=buildSimInstances(targets),living=field.filter(t=>!isMetalHex(t.hex)),masks=[];
if(living.length<=2)for(let mask=1;mask<(1<<living.length);mask++)masks[mask]=living.filter((t,i)=>mask&(1<<i));
return{living,masks,metals:field.length-living.length,rows:new Map()};
});
const{living,masks,rows}=basis;
if(!living.length||living.length>2)return true;
let start=0,executed=0;
while(start<combo.length&&executed<basis.metals){
const v=combo[start++];
if(isMetalExecutionAction(v))executed++;
else if(v.at>0)return true;
}
if(executed!==basis.metals)return true;
const slots=solverIndicesOf(combo,(v,i)=>i>=start&&v.at>0),eggs=solverIndicesOf(combo,v=>v.jp==='おうえん');
const ids=solverComboActionSignature(combo,true).split('\x1e'),full=(1<<living.length)-1,last=slots.length-1;
const allocations=buildSolverEggAssignments(eggs,slots.filter(ci=>ci===combo.length-1&&solverEggDamageAction(combo[ci])),(egg,ci)=>egg<ci);
const attacks=[],options=[],low=[0,0],high=[0,0],chip=[0,0];
let rank=0;
for(const{eggAssign}of allocations){
for(let j=0;j<slots.length;j++){
const ci=slots[j],v=combo[ci],boost=eggAssign&&eggAssign[ci]||1,id=ids[ci],key=id+'|'+boost+'|'+(fource||'');
let row=rows.get(key);
if(!row){
row=[];rows.set(key,row);
const sk=lookupSkill(v.jp),tgt=SolverActionGate.targetKind(sk),hits=SolverActionGate.hits(v);
const info={sk,tgt,random:isSolverRandomTargetSkill(sk),metalAction:solverFieldMetal&&isMetalActionSkill(v),execute:false};
for(let mask=1;mask<=full;mask++){
const pick=SolverActionGate.targets(masks[mask],v,info,true),choices=row[mask]=[];
for(const hit of pick.reason?[]:pick.options||[pick.targets]){
if(v.aoeK!==undefined&&v.aoeK!==hit.length||v.at!==sk.miss&&v.at!==solverATForCount(sk.at[0],sk.at[1],isHitBased(sk)?hits:hit.length))continue;
const min=[0,0],max=[0,0],floor=[0,0];let bits=0;
for(let h=0;h<hit.length;h++){
const t=living.indexOf(hit[h]);bits|=1<<t;
const bounds=solverPaperDamageUpperBound(combo,hit[h].hex,boost,fource,ids,ci,h+1);
min[t]=bounds.min;max[t]=bounds.max;
if(h===0||!atkDecay(sk))floor[t]=solverMinimumDamageBound(v,hit[h].hex,null,fource,false).chip;
}
choices.push({bits,min,max,floor});
}
}
}
attacks[j]=row;
}
for(let first=0;first<living.length&&rank<2;first++)for(let k=living.length===1?last:0;k<=last&&rank<2;k++){
if(k<0)break;
let ways=1;
for(let i=0;i<=last;i++){options[i]=attacks[i][i<=k?full:full^(1<<first)];ways*=options[i].length;}
for(let order=0;order<ways&&rank<2;order++){
low.fill(0);high.fill(0);chip.fill(0);
let rating=2,pick=order;
for(let i=0;i<=last&&rating;i++){
const choices=options[i],hit=choices.length===1?choices[0]:choices[pick&1];
if(choices.length>1)pick>>=1;
for(let t=0;t<living.length;t++){
const end=t===first?k:last,m=living[t];
if(i>end)continue;
low[t]+=hit.min[t];high[t]+=hit.max[t];chip[t]+=hit.floor[t];
if(i<end){if(chip[t]>=m.hpLow){rating=0;break;}continue;}
if(!(hit.bits&(1<<t))||high[t]<m.hpLow||SolverActionGate.hitRejectReason(m,hit.max[t])){rating=0;break;}
if(low[t]<m.hp||SolverActionGate.hitRejectReason(m,hit.min[t])){
if(i!==last||rating===1){rating=0;break;}
rating=1;
}
}
}
if(rating>rank)rank=rating;
}
}
if(rank===2)break;
}
state.tailRank=rank;
return rank>=(goldOnly?2:1);
}
const _solverATTables=new Map();
function buildSolverATSearch(order,target,maxSlots,table){
const{variants,late,sequence}=order;
if(!table){
const costs=variants.slice(0,late).map(v=>v.at),key=costs.join(',');
let saved=_solverATTables.get(key);
if(!saved||saved.target<target||saved.maxSlots<maxSlots){
target=Math.max(target,saved?saved.target:0);
maxSlots=Math.max(maxSlots,saved?saved.maxSlots:0);
const index=new Map();
costs.forEach((at,i)=>{if(at>0)solverMapEntry(index,at,()=>[]).push(i);});
const words=(target>>>5)+1,rows=new Array(late+1),single=new Uint32Array(words);
rows[late]=new Uint32Array(Math.max(0,maxSlots-1)*words);
for(let i=late-1;i>=0;i--){
const at=costs[i],suffix=rows[i+1];
const offset=at>>>5,bits=at&31,bit=1<<bits;
if(maxSlots<2||!(at>0)||at>target||single[offset]&bit){rows[i]=suffix;continue;}
single[offset]|=bit;
const row=rows[i]=suffix.slice();
for(let slots=2;slots<=maxSlots;slots++){
const source=slots===2?single:row,previous=Math.max(0,slots-3)*words,current=(slots-2)*words;
for(let word=offset;word<words;word++){
const from=previous+word-offset;
row[current+word]|=source[from]<<bits;
if(bits&&word>offset)row[current+word]|=source[from-1]>>>(32-bits);
}
}
}
saved={index,words,rows,target,maxSlots};
}
_solverATTables.delete(key);
_solverATTables.set(key,saved);
solverTrimCache(_solverATTables,32);
table=saved;
}
const{index,words,rows}=table;
const canReach=(start,slots,at)=>{
if(slots===0)return at===0;
if(at<=0||at>table.target)return false;
if(slots===1){const hits=index.get(at);return!!hits&&hits[hits.length-1]>=start;}
return!!(rows[start][(slots-2)*words+(at>>>5)]&(1<<(at&31)));
};
const reachesDepth=(start,at,min,max,withFinisher=false,plain=true)=>{
for(let slots=min;slots<=max;slots++){
if(plain&&canReach(start,slots,at))return true;
if(withFinisher&&slots>0)for(let i=late;i<variants.length;i++){
const cost=variants[i].at;
if(cost>0&&canReach(start,slots-1,at-cost))return true;
}
}
return false;
};
return{variants,late,sequence,canReach,reachesDepth,index,table};
}
function solverRootInSpace(v,space,i){return!!v&&v.at>0&&v.at<=space.target&&(!space.depths||space.depths.length>0)&&(!space.roots||space.roots[i]);}
function partitionSolverRoots(spec){
const{variants,sequence}=spec.order,roots=[];
for(let k=0;k<(sequence||variants).length;k++){
const i=sequence?sequence[k]:k,v=variants[i];
if(spec.spaces.some(sp=>solverRootInSpace(v,sp,i)))roots.push(i);
}
return roots;
}
function buildSolverShardPayload(spec,roots){
return solverApplyBuildContext(spec,()=>{
const{kmc,table}=spec,buckets={},search=solverMapEntry(_solverDmgCache.search.shards,spec,()=>{
const s=buildSolverATSearch(spec.order,spec.bat,table.maxSlots,table);
s.once=solverOnceMap(s.variants);
if(!kmc)s.pruning=solverWalkPruning(s.variants,spec.walk,true);
return s;
});
for(const space of spec.spaces){
const rows=buckets[space.key]=[];
for(const root of roots){
if(kmc)rows.push(buildKmcRootSpace(spec,space,root,search.once,search));
else if(solverRootInSpace(search.variants[root],space,root))for(const depth of space.depths){
const combos=[];
walkSolverATCombos(search,space.target,depth,combo=>combos.push(combo.slice()),()=>solverSearchCapped(combos.length>=space.cap),root,search.pruning);
rows.push({depth,root,combos});
}
}
}
return{buckets,incomplete:_solverSearchIncomplete,limited:_solverSearchLimited};
});
}
function mergeSolverShardPayloads(spec,payloads,progress){
const state=progress||{},list=payloads||[],roots=spec.order.variants;
if(!state.spaces){
state.unfilled=0;state.incomplete=false;state.limited=false;
state.spaces=spec.spaces.map(space=>{
const byDepth=new Map((space.depths||[null]).map(depth=>[depth,[]]));
state.unfilled+=byDepth.size+ +!!space.random;
return{space,byDepth,late:new Map(),extra:[],missing:new Set(solverIndicesOf(roots,(v,i)=>solverRootInSpace(v,space,i)))};
});
}
for(const p of list){
if(!p||p.incomplete)state.incomplete=true;
if(p&&p.limited)state.limited=true;
}
for(const p of list)for(const{space,byDepth,late,extra,missing}of state.spaces){
const rows=p&&p.buckets&&p.buckets[space.key];
if(!rows){state.incomplete=true;continue;}
for(const row of rows){
missing.delete(row.root);
if(row.extra)extra.push(...row.extra);
const out=byDepth.get(space.depths?row.depth:null);
if(!out)continue;
const all=row.combos||[],cut=space.depths?all.findIndex(c=>isSolverRandomTargetSkill(lookupSkill(c[c.length-1].jp))):-1,combos=cut<0?all:all.slice(0,cut);
const finishers=row.finishers||(cut>=0?all.slice(cut):[]);
if(finishers.length){
const more=solverMapEntry(late,row.depth,()=>[]);
if(more.length<space.cap){
more.push(...finishers.slice(0,space.cap-more.length));
if(more.length===space.cap){if(space.random)state.unfilled--;state.incomplete=state.limited=true;}
}
}
if(out.length>=space.cap)continue;
const take=Math.min(space.cap-out.length,combos.length);
for(let i=0;i<take;i++)out.push(combos[i]);
if(out.length===space.cap){state.unfilled--;state.incomplete=state.limited=true;}
}
}
if(progress&&payloads)return state.unfilled===0;
const merged={incomplete:state.incomplete||state.spaces.some(s=>s.missing.size>0),limited:state.limited};
for(const{space,byDepth,late,extra}of state.spaces)merged[space.key]=[...byDepth.values(),...late.values(),extra].flat();
return merged;
}
function buildKmcSerialPayload(spec){
const progress={};
for(const root of partitionSolverRoots(spec))if(mergeSolverShardPayloads(spec,[buildSolverShardPayload(spec,[root])],progress))break;
return mergeSolverShardPayloads(spec,null,progress);
}
function buildSolverShardSpec({bat,round2Cost,canRound2,hexId,maxPostAlive,walk},stage,open){
const{T,postAlive,planType}=walk,kmc=planType==='kill_mercy_clear',forms=expandSolverCombos(T);
const gated=kmc&&!walk.isMetal&&solverFieldMetal&&solverMetalCompanionCount()>0;
const eligible=kmc?forms.filter(v=>{
if(gated&&isMetalExecutionAction(v))return false;
const sk=lookupSkill(v.jp);
return!!sk&&sk.target==='S'&&v.at>0&&v.at<=bat;
}):forms;
const order=solverATOrder(eligible,bat,!kmc&&T>1,hexId,open);
if(kmc){
const sSkills=order.variants,fource=!walk.isMetal&&hexId?pickBestFource(hexId):null;
const spaces=solverRoundSpaces(bat,round2Cost,canRound2,stage,(key,target,round,loLen,hiLen)=>({key,target,loLen,hiLen,cap:round===1?30:14}));
const headSlots=Math.max(1,...spaces.map(sp=>sp.hiLen-1)),tail=maxPostAlive>0;
const search=tail?buildSolverATSearch({variants:forms,late:forms.length},bat,headSlots-1):buildSolverATSearch(order,bat,headSlots);
const random=postAlive>1?forms.filter(v=>isSolverRandomTargetSkill(lookupSkill(v.jp))).map(v=>v.at):[];
for(const sp of spaces){
sp.roots=sSkills.map((v,i)=>search.reachesDepth(tail?0:i,sp.target-v.at,Math.max(0,sp.loLen-3),sp.hiLen-2));
sp.random=sp.hiLen>=4&&random.length>0&&sSkills.some((v,i)=>sp.roots[i]&&random.some(at=>search.reachesDepth(0,sp.target-v.at-at,Math.max(1,sp.loLen-4),sp.hiLen-3)));
}
return{bat,T,postAlive,maxPostAlive,round2Cost,canRound2:!!canRound2,hexId,kmc,order,table:search.table,walk,kmcFourceAction:fource?makeSolverAction(fource):null,...solverApplyBuildContext(),spaces};
}
const{variants,late}=order,search=buildSolverATSearch(order,bat,stage==='r1'||!canRound2?SOLVER_ROUND_SIZE:SOLVER_MAX_ACTIONS);
const spaces=solverRoundSpaces(bat,round2Cost,canRound2,stage,(key,target,round,min,max)=>{
const roots=variants.map(()=>false);
const depths=Array.from({length:max-min+1},(_,i)=>min+i).filter(depth=>{
let reachable=false;
for(let i=0;i<late;i++){
const rest=target-variants[i].at;
if(search.reachesDepth(i,rest,depth-1,depth-1,true))roots[i]=reachable=true;
}
return reachable;
});
return{key,target,depths,roots,cap:30};
});
return{bat,order,table:search.table,walk,...solverApplyBuildContext(),spaces};
}
function prepareParallelSolverSpec(render,options,kind,stage){
const monGroups=render&&render.bat>0&&render.monGroups;
if(!monGroups||!monGroups.length)return null;
const canRound2=solverAllowsRound2(render.mapDeft,render.canRound2),chars=options&&options.chars||[];
const plan=deriveSolverBattlePlan(monGroups,render.monId,maxCharLv(chars),kind==='killAll',chars.map(c=>c.lv||99),render.metal);
const{T,isMetal,planType,postAlive,effMon,mercyCertain}=plan;
if(kind!=='kmc'&&kind!=='killAll')return{plan};
if(isMetal||(kind==='kmc'?planType!=='kill_mercy_clear':T<=1))return null;
const killTargets=monGroups.map(g=>({hex:g.hex,count:g.count,death:plan.effectiveDeath(g)}));
const walk={isMetal,killTargets,T,planType,postAlive,effMon,mercyCertain};
const field={groupCounts:monGroups.map(g=>g.count||1),fieldTotal:T,fieldHexes:monGroups.map(g=>g.hex),useStats:!(options&&options.useStats===false),fieldMetal:render.metal};
return solverApplyBuildContext(field,()=>buildSolverShardSpec({bat:render.bat,round2Cost:plan.round2Cost,hexId:plan.hexId,maxPostAlive:plan.maxPostAlive,canRound2,walk},stage,!!(options&&options.blockFallback)));
}
const _solverMinimumDamageBasis=new WeakMap();
const _solverPartyKeys=new WeakMap();
const _solverSingleRemovalBasis=new WeakMap();
let _solverDmgCache=new WeakMap();
function resetSolverDamageCache(useStats,chars,hex){
const context=JSON.stringify([useStats,useStats?chars:null,hex]);
if(_solverDmgCache.context===context)return;
_solverDmgCache=new WeakMap();
_solverDmgCache.context=context;
_solverDmgCache.search={paper:new Map(),damage:new Map(),aggregate:new Map(),finisher:new Map(),requirements:new Map(),scores:new Map(),variables:new Map(),terms:new Map(),kmcTails:new Map(),kmcTailContext:null,equipOptions:new Map(),killer:new Map(),guaranteed:new Map(),mercyFields:new WeakMap(),metalTails:new WeakMap(),blockFields:new WeakMap(),shards:new WeakMap()};
}
function calcSkillDamageCache(sk,st,hexId,fEls,plus1Eff,equip,n){
if(sk.el||sk.fixedDmg)fEls=null;
const contextKey=(equip||'')+'|'+hexId+'|'+(fEls?fEls.join(','):'')+'|'+(plus1Eff||0)+(n>1&&atkDecay(sk)?'|'+Math.min(n,5):'');
const byStats=solverMapEntry(solverMapEntry(_solverDmgCache,sk),contextKey);
const statsKey=solverDamageInput(sk,st);
let result=byStats.get(statsKey);
if(result===undefined)byStats.set(statsKey,result=calcSkillDamage(sk,st,hexId,fEls,plus1Eff,equip,n,statsKey));
return result;
}
resetSolverDamageCache();
