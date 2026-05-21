let isSearching=false;
let searchCancel=false;
function getDispItem(enName){let trans=i18nDict['I_'+enName];return trans?trans.split('(')[0]:enName;}
function executeItemSearch(config){
executeSharedSearch({
btnId:config.btnId,
btnText:config.btnText,
btnBg:config.btnBg,
btnColor:config.btnColor||'#fff',
stopText:'STOP',
emptyRankMsg:B08,
filterRanks:config.filterRanks,
processSeed:(searchEngine,seed,rStr,targetRankKey,conds,searchFilterLoc)=>{
searchEngine.calculateDetail(true);
if(config.checkBasicReq&&!config.checkBasicReq(searchEngine,conds))return null;
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,searchFilterLoc))return null;
searchEngine.createDungeonDetail();
let chestResult=ChestHtml(searchEngine,conds);
if(!chestResult.isMatch)return null;
let boxHtml=chestResult.html;
let hitResult=config.checkDungeon(searchEngine);
if(hitResult&&hitResult.isHit){
let locHtml=getLocHtmlCached(seed,targetRankKey,conds);
let itemNode=document.createElement('div');
itemNode.className='search-result-item';
if(hitResult.specialStyle)itemNode.style.border=hitResult.specialStyle;
let mapNameDisp=DISPLAY_LANG!=='EN'?searchEngine.mapNameJP:searchEngine.mapName;
itemNode.innerHTML=`
<span style="color:#ffd700;font-weight:bold">${seed.toString(16).toUpperCase().padStart(4,'0')}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<span style="color:#0ff;font-size:11px;margin-bottom:2px;display:inline-block;">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div>
<div style="margin-top:4px;">${hitResult.displayHtml}</div>
`;
itemNode.title=J01;
itemNode.onclick=makeResultClickHandler(seed, rStr, hitResult.jumpFloor||0);
return itemNode;
}
return null;
}
});
}
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
const info=getRankSMRInfo(rank, conds);
if(!info)return false;
const {minSMR, maxSMR, maxFloorCount}=info;
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
let maxPossibleNum=Math.min(12, maxSMR+maxOffset);
return chestRankGroups.every(group=>{
return group.some(r=>{
for(let num=minPossibleNum;num<=maxPossibleNum;num++){
let cMin=TableF[(num-1)*4+1];
let cMax=TableF[(num-1)*4+2];
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
if(b===-1&&r===0&&itm==="ANY")continue;
if(f===0){
alert(typeof T==='function'?T('Please specify a floor.','請指定目標樓層！','階層を指定してください！'):'請指定目標樓層');
return;
}
let t_val=t_str===""?-1:parseInt(t_str);
if(t_val!==-1&&t_val<5) t_val=5;
let targetItems=[];
if(itm==="Rich"){
targetItems=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
} else if(itm==="Metasla"){
targetItems=["Metal slime sword","Metal slime spear","Metal slime shield","Metal slime armour","Metal slime helm","Metal slime gauntlets","Metal slime sollerets"];
} else if(itm==="S_wpn"){
targetItems=["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
} else if(itm!=="ANY"){
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
executeItemSearch({
btnId: 'btnFreeSearch', btnText: 'Free', btnBg: 'linear-gradient(135deg,#08c,#048)',
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
if(g.boxIdx===0&&b!==0)continue;
if(g.boxIdx===1&&b!==1)continue;
if(g.boxIdx===2&&b!==2)continue;
if(g.boxIdx===3&&(b===2||b>=3))continue;
let boxInfo=eng.getBoxInfo(f, b);
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
if(checkSecStart<0) checkSecStart=0;
if(checkSecEnd<0) checkSecEnd=0;
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
return{isHit:true,jumpFloor:groups[0].floor-1,displayHtml:groupHits.join('<br>'),specialStyle:"1px solid #08c"};
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
btnConfig={id: 'searchBtn',text:H01,bg:'linear-gradient(135deg,#4c4,#080)'};
}else{
reqCount=b3fThreeItems.includes(targetItem)?3:2;
targetFloors=b3fThreeItems.includes(targetItem)?[2]:[2, 3];
checkItems=(targetItem==='Millionaire')?millionaireItems:[targetItem];
btnConfig={id:'searchBtn',text:H01,bg:'linear-gradient(135deg,#4c4,#080)'};
}
const chestRanks=getChestRanksForItems(checkItems);
const checkSet=new Set(checkItems);
executeItemSearch({
btnId:btnConfig.id,btnText:btnConfig.text, btnBg:btnConfig.bg,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checkBasicReq:(eng,conds)=>eng.floorCount>=(isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[chestRanks],isB9F?2:0).length>0,
checkDungeon:(eng)=>{
let hitTypes=[];
let firstHitFloor=-1;
for(let f of targetFloors){
if(f>=eng.floorCount)continue;
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
btnConfig={id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#fa0,#c60)'};
colorStyle='#F0F0aa';
}else{
const targetItem=document.getElementById('searchItem').value;
const millionaire2Items=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet"];
checkItems=(targetItem==='Millionaire')?millionaire2Items:[targetItem];
targetFloors=[2,3];
btnConfig={id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#fa0,#c60)'};
colorStyle='#11F514';
}
const chestRanks=isS3?[10]:getChestRanksForItems(checkItems);
executeItemSearch({
btnId: btnConfig.id, btnText: btnConfig.text, btnBg: btnConfig.bg,
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
btnId: 'BtnTK', btnText: H02, btnBg: 'linear-gradient(135deg,#f80,#c40)',
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
const soloNames=eng.getFloorItemNames(8,1);
const partyNames=eng.getFloorItemNames(8,2);
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
} else if(["Cannibox","Mimic","Pandora's box"].includes(targetItem)){
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
} else if(targetItem==='Dangerous bustier'){
wpTargets=["Dangerous bustier"];
strictMatTargets=["Aggressence"];
} else if(targetItem==='Fuddle bow'){
wpTargets=["Fuddle bow"];
strictMatTargets=["Mirrorstone"];
} else if(targetItem==='Slime shield'){
wpTargets=["Slime shield"];
strictMatTargets=["Iron ore"];
} else if(targetItem==="Sorcerer's stone"){
wpTargets=["Sorcerer's stone"];
strictMatTargets=["670G"];
}else{alert(A05);return;}
let allMatTargets=isMillionaire?broadMatTargets:strictMatTargets;
const wpSet=new Set(wpTargets);
executeItemSearch({
btnId: 'BtnTK', btnText: H02, btnBg: 'linear-gradient(135deg, #f80, #c40)',
filterRanks:(ranks, conds)=>filterMapRanksBySMRAndChest(ranks, conds, [getChestRanksForItems(wpTargets), getChestRanksForItems(allMatTargets)], 0),
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
let color="#f9b";
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
let html=`${wpHits.join('<br>')}<br><span style="color:#f66;font-size:11px;font-weight:bold;">${matDet}</span>`;
return{isHit:true, jumpFloor:2, displayHtml:html, specialStyle:"1px solid #f66" };
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
let labelText=isMillionaire?"":"(13s)";
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
return{isHit:true,jumpFloor:wpFloor,displayHtml:html,specialStyle: c2Met?"1px solid #fa0":""};
}
return{isHit:false};
}
});
}
const MRT_PREVIEW_ROWS=30;
const MRT_S_WEAPONS=['Stardust sword','Poker','Deft dagger','Bright staff','Gringham whip','Knockout rod','Dragonlord claws','Critical fan','Bad axe','Groundbreaker','Meteorang',"Angel's bow"];
const MRT_MILLIONAIRE=['Hero spear','Pruning knife','Wyrmwand','Wizardly whip','Beast claws','Attribeauty','Heavy hatchet','Megaton hammer','Pentarang','Metal slime sword','Metal slime spear'];
const MRT_HL={};
MRT_HL['Sainted soma']={bg:'#FFC90E',fg:'#000'};
MRT_S_WEAPONS.forEach(w=>MRT_HL[w]={bg:'#22B14C',fg:'#fff'});
MRT_HL['Ethereal stone']={bg:'#EF1BBA',fg:'#fff'};
['Metal slime shield','Metal slime armour','Metal slime helm','Metal slime gauntlets','Metal slime sollerets'].forEach(i=>MRT_HL[i]={bg:'#383850',fg:'#d0d8f0'});
MRT_MILLIONAIRE.forEach(i=>MRT_HL[i]={bg:'#00a2e8',fg:'#fff'});
MRT_HL['Lucida shard']={bg:'#B5E61D',fg:'#000'};
['Dangerous bustier','Fuddle bow'].forEach(i=>MRT_HL[i]={bg:'#FFAEC9',fg:'#000'});
const MRT_RK_COLORS={10:'#f4f',9:'#fa0',8:'#4cf',7:'#8f8',6:'#ff8',5:'#aaa',4:'#888',3:'#666',2:'#555',1:'#444'};
const MRT_RK_NAMES={10:'S',9:'A',8:'B',7:'C',6:'D',5:'E',4:'F',3:'G',2:'H',1:'I'};
const MRT_PRESETS={
'DD,263C':{custom:{3:[0],4:[0],7:[0],8:[1],9:[0],10:[0],11:[0],12:[0],13:[0],14:[0],15:[0],16:[0]}},
'B5,3CA2':{custom:{4:[0],5:[0],6:[0],7:[0],8:[0,2],9:[0],10:[1],13:[0],14:[0]}},
'DD,2E7A':{custom:{3:[0],4:[0],6:[0],7:[1],9:[0],10:[0],11:[0,2],12:[1]}},
'C9,7FE0':{custom:{3:[0],4:[0,2],5:[0],8:[0],9:[1],10:[0],11:[0],12:[0],13:[0]}},
'C9,2AC6':{custom:{3:[0,1]}},
'DD,32BB':{custom:{3:[0,1,2],4:[0,1]}},
'DD,47D0':{custom:{3:[0,1],4:[1],5:[0],6:[0],7:[0,1,2],8:[0]}},
};
let mrtEngine=null, mrtChests=[], mrtVisChests=[], mrtFilter='ALL', mrtCustom=null;
let mrtLang='jp', mrtRunning=false, mrtRAF=null, mrtOrigin=0, mrtRealSec=-3, mrtElapsedMs=-3000;
function mrtInternalSec(){ return mrtRealSec - 5;}
function mrtGetItem(f,b,s){ return s>=0?mrtEngine.getBoxItem(f,b,s):[null,null];}
function mrtOpen(){
const modal=document.getElementById('marathonModal');
modal.classList.add('open');
const rSel=document.getElementById('rank');
const sSel=document.getElementById('seed');
if(rSel){ const v=rSel.value.replace('0x','');document.getElementById('mrt_inRank').value=v;}
if(sSel&&sSel.value)document.getElementById('mrt_inSeed').value=sSel.value;
mrtInputChange();
mrtResizeMain();
}
function mrtClose(){ mrtResetTimer();document.getElementById('marathonModal').classList.remove('open');}
function mrtResizeMain(){
const tb=document.querySelector('#marathonModal .mrt-topbar');
const ma=document.getElementById('mrt_mainArea');
if(tb&&ma) ma.style.height=(window.innerHeight-tb.offsetHeight)+'px';
}
function mrtCompute(){
const seed=parseInt(document.getElementById('mrt_inSeed').value.trim(), 16);
if(isNaN(seed)||seed<0||seed>0x7FFF){ document.getElementById('mrt_mainArea').innerHTML='<p style="color:#f44;padding:20px">Invalid Seed</p>';return;}
mrtEngine=new GrottoDetail();
mrtEngine.MapSeed=seed;
mrtEngine.MapRank=parseInt(document.getElementById('mrt_inRank').value, 16);
mrtEngine.calculateDetail();
mrtChests=[];
for(let f=0;f<mrtEngine.floorCount;f++){
const d=mrtEngine.di[f];
for(let b=0;b<d[8];b++){
const info=mrtEngine.getBoxInfo(f,b);
mrtChests.push({floor:f,floorNum:f+1,floorLabel:'B'+(f+1)+'F',box:b,rank:info.rank,rankName:MRT_RK_NAMES[info.rank]||'?'});
}
}
mrtBuildTable();
mrtRenderRows();
}
function mrtIsVis(cd){
if(mrtFilter==='CUSTOM'&&mrtCustom){ const a=mrtCustom[cd.floorNum];return a?a.includes(cd.box):false;}
if(mrtFilter==='SA')return cd.rank>=9;
if(mrtFilter==='AB')return cd.rank===9||cd.rank===8;
return true;
}
function mrtBuildTable(){
const area=document.getElementById('mrt_mainArea');
area.scrollLeft=0;area.scrollTop=0;
mrtVisChests=mrtChests.filter(cd=>mrtIsVis(cd));
if(!mrtVisChests.length){ area.innerHTML='<p style="color:#555;padding:20px;text-align:center">No chests</p>';return;}
const cols=mrtVisChests.length;
const gridCols='42px repeat('+cols+', minmax(80px, auto))';
let hdr='<div class="mrt-vhdr-time">sec</div>';
for(const cd of mrtVisChests){
const clr=MRT_RK_COLORS[cd.rank]||'#888';
hdr+='<div class="mrt-vhdr"><span class="mrt-vhdr-floor">'+cd.floorLabel+'</span><br><span class="mrt-vhdr-rk" style="color:'+clr+'">'+cd.rankName+(cd.box+1)+'</span></div>';
}
area.innerHTML='<div class="mrt-vgrid" style="grid-template-columns:'+gridCols+'">'+hdr+'<div id="mrt_vbody" style="display:contents"></div></div>';
}
function mrtRenderRows(){
const vb=document.getElementById('mrt_vbody');
if(!vb||!mrtVisChests.length)return;
const is=mrtInternalSec();
const st=Math.max(0, is), ed=Math.max(st+MRT_PREVIEW_ROWS, is+MRT_PREVIEW_ROWS);
const isEN=mrtLang!=='jp';
const cellCls=isEN?'mrt-vcell mrt-vcell-en':'mrt-vcell';
let html='';
for(let s=st;s<=ed;s++){
const cur=(s===is), rCls=cur?' mrt-vrow-cur':'';
html+='<div class="mrt-vtime'+rCls+'">'+String(s+5).padStart(3,'0')+'</div>';
for(const cd of mrtVisChests){
const [en,jp]=(s>=0)?mrtGetItem(cd.floor,cd.box,s):[null,null];
const hl=en?MRT_HL[en]:null;
const style=hl?' style="background:'+hl.bg+';color:'+hl.fg+'"':'';
const label=mrtLang==='jp'?(jp||en||'\u2014'):(en||'\u2014');
html+='<div class="'+cellCls+rCls+'"'+style+'>'+label+'</div>';
}
}
vb.innerHTML=html;
}
function mrtTimerLoop(){
if(!mrtRunning)return;
mrtElapsedMs=Date.now()-mrtOrigin;
const ns=Math.floor(mrtElapsedMs/1000);
mrtUpdateStopwatch(mrtElapsedMs);
if(ns!==mrtRealSec){ mrtRealSec=ns;mrtRenderRows();}
mrtRAF=requestAnimationFrame(mrtTimerLoop);
}
function mrtUpdateStopwatch(ms){
const absMs=Math.abs(ms);
const s=Math.floor(absMs/1000);
const cs=Math.floor((absMs%1000)/10);
const sign=ms<0?'-':'';
document.getElementById('mrt_timerText').textContent=sign+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
document.getElementById('mrt_timerDisp').style.color=(ms<0)?'#f88':'#0f0';
}
function mrtToggleTimer(){
if(mrtRunning){
mrtRunning=false;
if(mrtRAF){cancelAnimationFrame(mrtRAF);mrtRAF=null;}
document.getElementById('mrt_btnStart').textContent='\u25B6';
document.getElementById('mrt_btnStart').classList.remove('running');
}else{
mrtOrigin=Date.now()-mrtElapsedMs;
mrtRunning=true;
document.getElementById('mrt_btnStart').textContent='\u23F8';
document.getElementById('mrt_btnStart').classList.add('running');
mrtTimerLoop();
}
}
function mrtResetTimer(){
if(mrtRunning){cancelAnimationFrame(mrtRAF);mrtRAF=null;mrtRunning=false;}
mrtRealSec=-3;mrtElapsedMs=-3000;
document.getElementById('mrt_btnStart').textContent='\u25B6';
document.getElementById('mrt_btnStart').classList.remove('running');
mrtUpdateStopwatch(-3000);
mrtRenderRows();
}
function mrtSetFilter(f){
mrtFilter=f;mrtCustom=null;
document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.toggle('active',b.dataset.f===f));
mrtBuildTable();mrtRenderRows();
}
function mrtToggleLang(){
mrtLang=mrtLang==='en'?'jp':'en';
document.getElementById('mrt_btnLang').textContent=mrtLang.toUpperCase();
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
mrtResetTimer();mrtCompute();sel.selectedIndex=0;
}
function mrtInputChange(){
mrtCustom=null;mrtFilter='ALL';
document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.toggle('active',b.dataset.f==='ALL'));
mrtResetTimer();mrtCompute();
}
window.addEventListener('resize', ()=>{ if(document.getElementById('marathonModal').classList.contains('open')) mrtResizeMain();});