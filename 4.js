function getChestRanksForItems(itemNames) {
const ranks = [];
for (let r = 1; r <= 10; r++) {
let startIdx = TableO[r - 1], endIdx = TableO[r];
for (let i = startIdx; i < endIdx; i++) {
if (itemNames.includes(TableR[TableQ[i]][0]) && !ranks.includes(r)) ranks.push(r);
}
}
return ranks;
}
function filterMapRanksBySMRAndChest(ranksToSearch,conds,chestRankGroups,targetFloorOffset) {
return ranksToSearch.filter(rank=>{
if (conds && conds.bq) {
let baseQ=parseInt(conds.bq);
let modulo=Math.floor(baseQ/10)*2+1;
let minOffset=Math.trunc(0-baseQ/10);
let maxOffset=Math.trunc((modulo-1)-baseQ/10);
let minFinalQ=Math.max(2,baseQ+minOffset);
let maxFinalQ=Math.min(248,baseQ+maxOffset);
let rStr=rank.toString(16).toUpperCase().padStart(2,'0');
let rankInfo=RANKS[rStr];
if (rankInfo && (maxFinalQ<rankInfo.fqMin||minFinalQ>rankInfo.fqMax)) {return false;}
}
let minSMR=1, maxSMR=9;
for (let i=0;i<8;i++) {
if (rank>=TableC[i*4] && rank<=TableC[i*4+1]) {minSMR=TableC[i*4+2];maxSMR=TableC[i*4+3];break;}
}
if (conds && conds.monster) {
let targetSMR=parseInt(conds.monster);
if (targetSMR<minSMR||targetSMR>maxSMR)return false;
}
if (!chestRankGroups||chestRankGroups.length===0)return true;
let maxFloorCount=16;
for (let i=0;i<9;i++) {
if (rank>=TableB[i*4] && rank<=TableB[i*4+1]) {maxFloorCount=TableB[i*4+3];break;}
}
if (conds && conds.depth)maxFloorCount=parseInt(conds.depth);
let minOffset=0;
let maxOffset=Math.floor((maxFloorCount-1)/4);
if (targetFloorOffset !== undefined && targetFloorOffset !== null) {
let requiredFloors=(targetFloorOffset*4)+1;
if (maxFloorCount<requiredFloors)return false;
minOffset=targetFloorOffset;
maxOffset=targetFloorOffset;
}
let minPossibleNum=minSMR+minOffset;
let maxPossibleNum=Math.min(12,maxSMR+maxOffset);
return chestRankGroups.every(group=>{
return group.some(r=>{
for (let num=minPossibleNum;num<=maxPossibleNum;num++) {
let cMin=TableN[(num-1)*4+1];
let cMax=TableN[(num-1)*4+2];
if (r>=cMin && r<=cMax)return true;
}
return false;
});
});
});
}
function FreeSearch() {
let groups = [];
let reqFloorCount = 0;
for (let i=1; i<=3; i++) {
let f = parseInt(document.getElementById(`fs_f_${i}`).value);
let b = parseInt(document.getElementById(`fs_b_${i}`).value);
let r = parseInt(document.getElementById(`fs_r_${i}`).value);
let itm = document.getElementById(`fs_i_${i}`).value;
let t_str = document.getElementById(`fs_t_${i}`).value.trim();
if (b === -1 && r === 0 && itm === "ANY") continue;
if (f === 0) {
alert(typeof T === 'function' ? T('Please specify a floor.','請指定目標樓層！','階層を指定してください！') : '請指定目標樓層');
return;
}
let t_val = t_str === "" ? -1 : parseInt(t_str);
if (t_val !== -1 && t_val < 5) t_val = 5;
let targetItems = [];
if (itm === "Rich") {
targetItems = ["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
} else if (itm === "Metasla") {
targetItems = ["Metal slime sword","Metal slime spear","Metal slime shield","Metal slime armour","Metal slime helm","Metal slime gauntlets","Metal slime sollerets"];
} else if (itm === "S_wpn") {
targetItems = ["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
} else if (itm !== "ANY") {
targetItems = [itm];
}
let allowedRanks = new Set();
if (r>0) allowedRanks.add(r);
if (targetItems.length>0) {
let itemRanks = getChestRanksForItems(targetItems);
if (r>0) {
let intersection = itemRanks.filter(rank => rank === r);
intersection.forEach(rank => allowedRanks.add(rank));
} else {
itemRanks.forEach(rank => allowedRanks.add(rank));
}
}
reqFloorCount = Math.max(reqFloorCount,f);
groups.push({
id: i, floor: f, boxIdx: b, rank: r,
items: targetItems.length > 0 ? targetItems : null,
timeStr: t_str, timerVal: t_val,
allowedRanks: allowedRanks
});
}
if (groups.length === 0) { alert(typeof A01 !== 'undefined' ? A01 : 'A01'); return; }
executeCustomSearch({
btnId: 'btnFreeSearch', btnText: 'Free', btnBg: 'linear-gradient(135deg, #0088cc, #004488)',
filterRanks: (ranks, conds) => {
let validRanks = ranks;
for (let g of groups) {
if (g.allowedRanks.size > 0) {
let offset = 0;
if (g.floor >= 13) offset = 3;
else if (g.floor >= 9) offset = 2;
else if (g.floor >= 5) offset = 1;
validRanks = filterMapRanksBySMRAndChest(validRanks, conds, [Array.from(g.allowedRanks)], offset);
}
}
return validRanks;
},
checkBasicReq: (eng, conds) => eng.floorCount >= reqFloorCount,
checkDungeon: (eng) => {
let groupHits = [];
let usedHits = new Set();
for (let g of groups) {
let hitFoundForGroup = false;
let gHtmlStr = "";
let f = g.floor - 1;
if (f >= eng.floorCount) return {isHit:false};
let bCount = eng.getBoxCount(f);
boxLoop:
for (let b=0; b<bCount; b++) {
if (g.boxIdx === 0 && b !== 0) continue;
if (g.boxIdx === 1 && b !== 1) continue;
if (g.boxIdx === 2 && b !== 2) continue;
if (g.boxIdx === 3 && (b === 2 || b >= 3)) continue;
let boxInfo = eng.getBoxInfo(f, b);
if (g.rank > 0 && boxInfo.rank !== g.rank) continue;
if (!g.items && g.timerVal === -1) {
let boxKey = `${f}_${b}_ANY`;
let isBoxUsed = false;
for (let k of usedHits) {
if (k.startsWith(`${f}_${b}_`)) {isBoxUsed=true;break;}
}
if (isBoxUsed) continue;
hitFoundForGroup = true;
usedHits.add(boxKey);
gHtmlStr = `<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[boxInfo.rank]}${b+1} (Any)</span>`;
break boxLoop;
}
let checkSecStart = g.timerVal === -1 ? 0 : g.timerVal - 5;
let checkSecEnd = g.timerVal === -1 ? 255 : g.timerVal - 5;
if (checkSecStart<0) checkSecStart = 0;
if (checkSecEnd<0) checkSecEnd = 0;
for (let s=checkSecStart; s<=checkSecEnd; s++) {
let hitKey = `${f}_${b}_${s}`;
let boxKey = `${f}_${b}_ANY`;
if (usedHits.has(hitKey) || usedHits.has(boxKey)) continue;
let itemEN = eng.getBoxItem(f,b,s)[0];
if (g.items === null || g.items.includes(itemEN)) {
hitFoundForGroup = true;
usedHits.add(hitKey);
let tDisp = s+5;
let itemDisp = getDispItem(itemEN);
gHtmlStr = `<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[boxInfo.rank]}${b+1} (${tDisp}s): ${itemDisp}</span>`;
break boxLoop;
}
}
}
if (!hitFoundForGroup) return {isHit:false};
groupHits.push(gHtmlStr);
}
return {isHit: true, jumpFloor: groups[0].floor - 1, displayHtml: groupHits.join('<br>'), specialStyle: "1px solid #0088cc"};
}
});
}
function QuickloadSearch() {
const targetItem = document.getElementById('searchItem').value;
const b9fItems = ["Sainted soma","Yggdrasil leaf","Reset stone","S weapon"];
const isB9F = b9fItems.includes(targetItem);
if (["Cannibox","Mimic","Pandora's box"].includes(targetItem)) {alert(A04);return;}
const millionaireItems = ["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
const sWeapons = ["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
let reqCount, targetFloors, checkItems, btnConfig;
if (isB9F) {
reqCount = 2;
targetFloors = [8];
checkItems = (targetItem === 'S weapon') ? sWeapons : [targetItem];
btnConfig = { id: 'searchBtn', text: H01, bg: 'linear-gradient(135deg,#4c4,#080)' };
} else {
reqCount = b3fThreeItems.includes(targetItem) ? 3 : 2;
targetFloors = b3fThreeItems.includes(targetItem) ? [2] : [2, 3];
checkItems = (targetItem === 'Millionaire') ? millionaireItems : [targetItem];
btnConfig = { id: 'searchBtn', text: H01, bg: 'linear-gradient(135deg,#4c4,#080)' };
}
const chestRanks = getChestRanksForItems(checkItems);
const checkSet = new Set(checkItems);
executeCustomSearch({
btnId:btnConfig.id, btnText:btnConfig.text, btnBg:btnConfig.bg,
filterRanks: (ranks,conds) => filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],isB9F?2:0),
checkBasicReq: (eng,conds) => eng.floorCount >= (isB9F?9:3) && filterMapRanksBySMRAndChest([eng.MapRank],conds,[chestRanks],isB9F?2:0).length>0,
checkDungeon: (eng) => {
let hitTypes = [];
let firstHitFloor = -1;
for (let f of targetFloors) {
if (f >= eng.floorCount) continue;
const soloNames = eng.getFloorItemNames(f,1);
const partyNames = eng.getFloorItemNames(f,2);
let soloC = 0, partyC = 0;
for (let b=0; b<soloNames.length; b++) {
if (checkSet.has(soloNames[b])) soloC++;
if (checkSet.has(partyNames[b])) partyC++;
}
if (soloC >= reqCount || partyC >= reqCount) { if (firstHitFloor === -1) firstHitFloor = f; }
let prefixStr = isB9F ? 'B9F ' : `B${f+1}F `;
if (soloC >= reqCount) {
hitTypes.push(`<span style="color:#ff99bb; font-size:11px">${prefixStr}${STR_SOLO} x${soloC}</span>`);
}
if (partyC >= reqCount) {
hitTypes.push(`<span style="color:#ffd700; font-size:11px">${prefixStr}${STR_PARTY} x${partyC}</span>`);
}
}
if (hitTypes.length > 0) {
return {isHit: true, jumpFloor: firstHitFloor, displayHtml: hitTypes.join('<br>')};
}
return {isHit:false};
}
});
}
function startSearch() {QuickloadSearch();}
function ThirdChestSearch(isS3) {
let checkItems,btnConfig,targetFloors,colorStyle;
if (isS3) {
checkItems = ["Sage's elixir","Sainted soma"];
targetFloors = [12,13];
btnConfig = {id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#ffaa00,#cc6600)'};
colorStyle = '#F0F0aa';
} else {
const targetItem = document.getElementById('searchItem').value;
const millionaire2Items = ["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet"];
checkItems = (targetItem === 'Millionaire') ? millionaire2Items : [targetItem];
targetFloors = [2,3];
btnConfig = {id:'searchBtnBox3',text:H03,bg:'linear-gradient(135deg,#ffaa00,#cc6600)'};
colorStyle = '#11F514';
}
const chestRanks = isS3 ? [10] : getChestRanksForItems(checkItems);
executeCustomSearch({
btnId: btnConfig.id, btnText: btnConfig.text, btnBg: btnConfig.bg,
filterRanks: (ranks, conds) => filterMapRanksBySMRAndChest(ranks, conds, [chestRanks], isS3 ? 3 : 0),
checkBasicReq: (eng, conds) => eng.floorCount >= (isS3 ? 14 : 4) && filterMapRanksBySMRAndChest([eng.MapRank], conds, [chestRanks], isS3 ? 3 : 0).length > 0,
checkDungeon: (eng) => {
let f1 = targetFloors[0], f2 = targetFloors[1];
if (eng.getBoxCount(f1) >= 3 && eng.getBoxCount(f2) >= 3) {
if (isS3 && (eng.getBoxInfo(f1,2).rank !== 10 || eng.getBoxInfo(f2,2).rank !== 10)) {
return {isHit:false};
}
let p1 = eng.getBoxItem(f1,2,2)[0];
let p2 = eng.getBoxItem(f2,2,2)[0];
let r1 = CHEST_RANK[eng.getBoxInfo(f1,2).rank] || '?';
let r2 = CHEST_RANK[eng.getBoxInfo(f2,2).rank] || '?';
if (checkItems.includes(p1) && checkItems.includes(p2)) {
return {
isHit: true, jumpFloor: f1,
displayHtml: `<span style="color:${colorStyle};font-size:11px">B${f1+1}F ${r1}3: ${getDispItem(p1)}<br>B${f2+1}F ${r2}3: ${getDispItem(p2)}</span>`
};
}
}
return {isHit:false};
}
});
}
function Box3Search() {
const targetValue = document.getElementById('searchItem').value;
const supportedForBox3 = ['Ethereal stone', 'Lucida shard', 'Sainted soma', 'Millionaire'];
if (!supportedForBox3.includes(targetValue)) {
alert(typeof A05 !== 'undefined' ? A05 : 'A05');
return;
}
if (targetValue === 'Sainted soma') {
ThirdChestSearch(true);
} else {
ThirdChestSearch(false);
}
}
function TKSearch() {
const targetItem = document.getElementById('searchItem').value;
if (targetItem==='Sainted soma') {JFireSearch();return;}
let wpTargets = [];
let strictMatTargets = [];
let broadMatTargets = [];
let isMillionaire = false;
let isMonsterBox = false;
let minSec = 0, maxSec = 0;
if (targetItem === 'Millionaire') {
isMillionaire = true;
wpTargets = ["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
strictMatTargets = ["Gold bar","Orichalcum"];
broadMatTargets = ["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Gold bar","Orichalcum"];
} else if (["Cannibox","Mimic","Pandora's box"].includes(targetItem)) {
isMonsterBox = true;
wpTargets = [targetItem];
strictMatTargets = [targetItem];
if (targetItem === "Pandora's box") {
minSec = 25;
maxSec = 35;
} else {
minSec = 20;
maxSec = 30;
}
} else if (targetItem === 'Dangerous bustier') {
wpTargets = ["Dangerous bustier"];
strictMatTargets = ["Aggressence"];
} else if (targetItem === 'Fuddle bow') {
wpTargets = ["Fuddle bow"];
strictMatTargets = ["Mirrorstone"];
} else if (targetItem === 'Slime shield') {
wpTargets = ["Slime shield"];
strictMatTargets = ["Iron ore"];
} else if (targetItem === "Sorcerer's stone") {
wpTargets = ["Sorcerer's stone"];
strictMatTargets = ["670G"];
} else {alert(A05);return;}
let allMatTargets = isMillionaire ? broadMatTargets : strictMatTargets;
const wpSet = new Set(wpTargets);
executeCustomSearch({
btnId: 'BtnTK', btnText: H02, btnBg: 'linear-gradient(135deg, #ff8800, #cc4400)',
filterRanks: (ranks, conds) => filterMapRanksBySMRAndChest(ranks, conds, [getChestRanksForItems(wpTargets), getChestRanksForItems(allMatTargets)], 0),
checkBasicReq: (eng, conds) => eng.floorCount >= 3,
checkDungeon: (eng) => {
let wpMet = false, wpFloor = 2;
let wpHits = [];
let checkWp = (fIdx) => {
if (fIdx >= eng.floorCount) return false;
const soloNames = eng.getFloorItemNames(fIdx, 1);
const partyNames = eng.getFloorItemNames(fIdx, 2);
let foundAny = false;
const limit = Math.min(2, soloNames.length);
for (let b = 0; b < limit; b++) {
const s = soloNames[b], p = partyNames[b];
if (wpSet.has(s) || wpSet.has(p)) {
let t = (wpSet.has(s) && wpSet.has(p)) ? STR_BOTH : (wpSet.has(p) ? STR_PARTY : STR_SOLO);
let hitItem = wpSet.has(p) ? p : s;
let hitItemStr = getDispItem(hitItem);
let rName = CHEST_RANK[eng.getBoxInfo(fIdx,b).rank] || '?';
let color = "#ff99bb";
if (t === STR_PARTY) color = "#ffd700";
wpHits.push(`<span style="color:${color}; font-size:11px">B${fIdx+1}F ${rName}${b+1}: ${hitItemStr} (${t})</span>`);
wpMet = true;
wpFloor = fIdx;
foundAny = true;
}
}
return foundAny;
};
if (isMonsterBox) {
if (!checkWp(2)) return {isHit:false};
let c1Met = false, matDet = "", b3Rank = "";
if (eng.floorCount > 2 && eng.getBoxCount(2) >= 3) {
b3Rank = CHEST_RANK[eng.getBoxInfo(2, 2).rank] || '?';
let foundSec = -1;
for (let s = minSec; s <= maxSec; s++) {
if (eng.getBoxItem(2,2,s)[0] === targetItem) {foundSec=s;break;}
}
if (foundSec !== -1) {
c1Met = true;
matDet = `B3F ${b3Rank}3 (${foundSec + 5}s): ${getDispItem(targetItem)}`;
}
}
if (c1Met) {
let html = `${wpHits.join('<br>')}<br><span style="color:#ff6666; font-size:11px; font-weight:bold;">${matDet}</span>`;
return { isHit:true, jumpFloor:2, displayHtml:html, specialStyle:"1px solid #ff6666" };
}
return {isHit:false};
}
if (!checkWp(2)) checkWp(3);
if (!wpMet) return {isHit: false};
let c1Met = false, c2Met = false, matDet = "";
let b3V = false, pB3 = "", b3Rank = "";
let b4V = false, pB4 = "", b4Rank = "";
let currentB3Targets = isMillionaire ? (wpFloor === 2 ? strictMatTargets : broadMatTargets) : strictMatTargets;
let currentB4Targets = isMillionaire ? (wpFloor === 3 ? strictMatTargets : broadMatTargets) : strictMatTargets;
let checkSec = isMillionaire ? 2 : 8;
let labelText = isMillionaire ? "" : "(13s)";
if (eng.floorCount > 2 && eng.getBoxCount(2) >= 3) {
pB3 = eng.getBoxItem(2,2,checkSec)[0];
b3Rank = CHEST_RANK[eng.getBoxInfo(2,2).rank] || '?';
if (currentB3Targets.includes(pB3)) {
let pB3_25s = eng.getBoxItem(2,2,20)[0];
if (!isMillionaire) {
if (!currentB3Targets.includes(pB3_25s)) b3V = true;
} else {
if (!strictMatTargets.includes(pB3_25s)) b3V = true;
}
}
}
if (eng.floorCount > 3 && eng.getBoxCount(3) >= 3) {
pB4 = eng.getBoxItem(3,2,checkSec)[0];
b4Rank = CHEST_RANK[eng.getBoxInfo(3,2).rank] || '?';
if (currentB4Targets.includes(pB4)) {
let pB4_25s = eng.getBoxItem(3,2,20)[0];
if (!isMillionaire) {
if (!currentB4Targets.includes(pB4_25s)) b4V = true;
} else {
if (!strictMatTargets.includes(pB4_25s)) b4V = true;
}
}
}
if (b3V && b4V) { c2Met = true; matDet = `B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}<br>B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`; }
else if (b3V) { c1Met = true; matDet = `B3F ${b3Rank}3 ${labelText}: ${getDispItem(pB3)}`; }
else if (b4V) { c1Met = true; matDet = `B4F ${b4Rank}3 ${labelText}: ${getDispItem(pB4)}`; }
if (c1Met || c2Met) {
let html = `${wpHits.join('<br>')}<br><span style="color:#11F514; font-size:11px">${matDet}</span>`;
return { isHit: true, jumpFloor: wpFloor, displayHtml: html, specialStyle: c2Met ? "1px solid #ffaa00" : "" };
}
return {isHit: false};
}
});
}
function JFireSearch() {
executeCustomSearch({
btnId: 'BtnTK', btnText: H02, btnBg: 'linear-gradient(135deg, #ff8800, #cc4400)',
filterRanks: (ranks) => ranks.filter(rank => {
for (let i = 0; i < 8; i++) {
if (rank >= TableC[i*4] && rank <= TableC[i*4+1]) return TableC[i*4+3] >= 9;
}
return false;
}),
checkBasicReq: (eng) => eng.monsterRank === 9 && eng.floorCount >= 9,
checkDungeon: (eng) => {
let b9Boxes = eng.getBoxCount(8);
let c1Met = false;
let c1Hits = [];
const soloNames = eng.getFloorItemNames(8, 1);
const partyNames = eng.getFloorItemNames(8, 2);
const limit = Math.min(2, soloNames.length);
for (let b = 0; b < limit; b++) {
const s = soloNames[b], p = partyNames[b];
if (s === "Sainted soma" || p === "Sainted soma") {
c1Met = true;
let t = (s === p) ? STR_BOTH : (p === "Sainted soma" ? STR_PARTY : STR_SOLO);
let color = "#ff99d7";
if (t === STR_PARTY) color = "#ffd700";
c1Hits.push(`<span style="color:${color}; font-size:11px">B9F S${b+1}: ${getDispItem("Sainted soma")} (${t})</span>`);
}
}
if (!c1Met || (b9Boxes >= 3 && partyNames[2] === "Sainted soma")) return {isHit: false};
let c2Met = false, c2Det = "";
const chk3 = (fIdx, n) => {
if (eng.getBoxCount(fIdx) >= 3 && eng.getBoxInfo(fIdx, 2).rank === 10) {
let pItem = eng.getBoxItem(fIdx,2,2)[0];
if (pItem === "Sainted soma" || pItem === "Sage's elixir") {
let dispItem = pItem === "Sainted soma" ? getDispItem("Sainted soma") : getDispItem("Sage's elixir");
return {met:true, det:`${n} S3: ${dispItem}`};
}
}
return {met:false};
};
let b9Res = chk3(8, "B9F");
if (b9Res.met) { c2Met = true; c2Det = b9Res.det; }
else if (eng.floorCount >= 10) {
let b10Res = chk3(9, "B10F");
if (b10Res.met) { c2Met = true; c2Det = b10Res.det; }
}
if (c1Met && c2Met) {
let html = `${c1Hits.join('<br>')}<br><span style="color:#11F514; font-size:11px">${c2Det}</span>`;
return {isHit: true, jumpFloor: 8, displayHtml: html};
}
return {isHit:false};
}
});
}
async function startSearchATBug() {
if (isSearching) {searchCancel = true; return;}
isSearching = true; searchCancel = false;
const btn = document.getElementById('searchBtnBug');
if(btn) { btn.textContent = 'STOP'; btn.style.background = '#f44'; btn.style.color = '#fff'; }
const searchAllRanks = document.getElementById('searchAllRanks').checked;
const baseRankStr = document.getElementById('rank').value;
const searchFilterLoc = true;
const searchOnlyWithD = document.getElementById('searchOnlyWithD') ? document.getElementById('searchOnlyWithD').checked : false;
const requireFloorIncrease = document.getElementById('requireFloorIncrease').checked;
const requireBugFloorHit = document.getElementById('requireBugFloorHit') ? document.getElementById('requireBugFloorHit').checked : false;
const conds = getUltimateConds();
const cond_elist = conds.elist;
const cond_only_mon = conds.onlyMon;
const _onlyMonExpectedStr = buildOnlyMonExpectedStr(conds);
let effectiveElistCond = cond_elist;
if (!cond_elist && !cond_only_mon && !searchOnlyWithD && !conds.hasBoxCond) {effectiveElistCond='ONLY';}
const resultDiv = document.getElementById('searchResults');
resultDiv.innerHTML = '<div style="color:#aaa; font-size:13px; margin-bottom:8px">' + B01 + ' <span id="searchProgress" style="color:#fff; font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>';
const grid = document.getElementById('searchGrid');
const progressSpan = document.getElementById('searchProgress');
let ranksToSearch=searchAllRanks?MAP_RANK:[parseInt(baseRankStr)];
if(cond_only_mon || conds.monster || conds.bq || conds.hasBoxCond){
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
for(let r=10; r>=1; r--){
if(conds.reqBox[r] > 0){
let canDrop = false;
for(let num = minSMR; num <= maxPossibleNum; num++){
let cMin = TableN[(num-1)*4+1];
let cMax = TableN[(num-1)*4+2];
if(r >= cMin && r <= cMax) {canDrop=true; break;}
}
if(!canDrop) return false;
}
}
}
if(!cond_only_mon && !conds.monster) return true;
if (conds.monster) {
let tgt = parseInt(conds.monster);
if (tgt < minSMR || tgt > maxSMR) return false;
}
if (cond_only_mon) {
let isPossible = false;
let targetEnv = conds.env ? parseInt(conds.env) : 0;
let maxOffset = 3;
for (let env = 1; env <= 5; env++) {
if (targetEnv && env !== targetEnv) continue;
for (let fMR = 1; fMR <= 12; fMR++) {
let mId = ONLY_MONSTERS[env][fMR];
if (mId && MONSTER_DATA[mId] && MONSTER_DATA[mId].en === cond_only_mon) {
let smrStart = conds.monster ? parseInt(conds.monster) : minSMR;
let smrEnd = conds.monster ? parseInt(conds.monster) : maxSMR;
for (let smr = smrStart; smr <= smrEnd; smr++) {
if (fMR >= smr && fMR <= smr + maxOffset) {isPossible=true;break;}
}
}
if (isPossible) break;
}
if (isPossible) break;
}
if (!isPossible) return false;
}
return true;
});
if (ranksToSearch.length === 0) {
progressSpan.textContent = "100% ("+B07+")";
isSearching = false;
if(btn) {btn.textContent=H05; btn.style.background='linear-gradient(135deg,#cc00cc,#660066)'; btn.style.color='#fff';}
return;
}
}
const rangeData = getValidatedSeedRange();
if (rangeData.error) {
alert(rangeData.error);
isSearching = false;
if(btn) {btn.textContent=H05; btn.style.background='linear-gradient(135deg,#cc00cc,#660066)'; btn.style.color='#fff';}
return;
}
const {startSeed,endSeed}=rangeData;
let totalCombos = ranksToSearch.length*(endSeed-startSeed+1);
let processed = 0;
let hitCount = 0;
let searchEngine = new GrottoDetail();
let fragment = document.createDocumentFragment();
for (let rank of ranksToSearch) {
if (searchCancel) break;
let rStr = rank.toString(16).toUpperCase().padStart(2, '0');
let targetRankKey = RANKS[rStr] ? rStr : (RANKS["0x"+rStr] ? "0x"+rStr : null);
for (let seed=startSeed; seed<=endSeed; seed++) {
if (searchCancel) break;
if (processed % 200 === 0) {
progressSpan.textContent = Math.floor((processed/totalCombos)*100)+'% ('+B02+' '+rStr+', Seed '+seed.toString(16).toUpperCase().padStart(4,'0')+') ['+B04+''+hitCount+' '+B03+']';
if (fragment.children.length > 0) grid.appendChild(fragment);
await new Promise(r => setTimeout(r, 0));
}
searchEngine.MapSeed = seed;
searchEngine.MapRank = rank;
searchEngine._at_offset = 0;
searchEngine._force_16_floors = false;
searchEngine.calculateDetail(true);
if (!checkUltimateCondsMatch(searchEngine, seed, targetRankKey, conds, searchFilterLoc)) {processed++; continue;}
let origFloors = searchEngine.floorCount;
let origBoss = DISPLAY_LANG !== 'EN' ? searchEngine.bossNameJP : searchEngine.bossName;
let origName = DISPLAY_LANG !== 'EN' ? searchEngine.mapNameJP : searchEngine.mapName;
let origLevel = searchEngine.mapLevel;
searchEngine._at_offset=1;
searchEngine._force_16_floors=false;
searchEngine.calculateDetail();
let bugFloors=searchEngine.floorCount;
let bugBoss=DISPLAY_LANG!=='EN'?searchEngine.bossNameJP:searchEngine.bossName;
let bugName=DISPLAY_LANG!=='EN'?searchEngine.mapNameJP:searchEngine.mapName;
let bugLevel=searchEngine.mapLevel;
let isFloorIncreased=bugFloors>origFloors;
if(requireFloorIncrease && !isFloorIncreased) {processed++; continue;}
searchEngine._at_offset=0;
searchEngine._force_16_floors=true;
searchEngine.calculateDetail();
let boxHtml="";
if (conds.hasBoxCond) {
let actualBoxCounts={10:0,9:0,8:0,7:0,6:0,5:0,4:0,3:0,2:0,1:0};
for (let f=2; f<bugFloors; f++) {
let boxes=searchEngine.di[f][8];
for (let b=0; b<boxes; b++) {
actualBoxCounts[searchEngine.di[f][9+b]]++;
}
}
let boxMatch=true;
let boxStr=[];
for (let r=10; r>=1; r--) {
if (conds.reqBox[r]>0) {
if (actualBoxCounts[r] !== conds.reqBox[r]) {boxMatch=false; break;}
boxStr.push(`${CHEST_RANK[r]}${conds.reqBox[r]}`);
}
}
if (!boxMatch) {processed++; continue;}
boxHtml=`<div style="margin-top:4px;"><span style="color:#ffcc00;font-size:11px;background:#420;padding:2px 4px;border-radius:3px;">${boxStr.join(' ')}</span></div>`;
}
let foundSpecialFloors = [];
let specialHitCount = 0;
let hasAnyD = false;
for (let f = 2; f < 16; f++) {
let elistInfo = getFloorElistInfo(searchEngine, f);
let val = parseInt(elistInfo.hex, 16);
if (elistInfo.dValue > 0) hasAnyD = true;
let isElistHit = false;
let isOnlyHit = false;
if (val >= 0x2B00 && elistInfo.state) {
if (!effectiveElistCond) {isElistHit=true;}
else if (effectiveElistCond === 'PARTIAL_NONE' && elistInfo.state.includes(EL_P)) isElistHit = true;
else if (effectiveElistCond === '4' && elistInfo.state.includes(EL_4)) isElistHit = true;
else if (effectiveElistCond === '3' && elistInfo.state.includes(EL_3)) isElistHit = true;
else if (effectiveElistCond === '2' && elistInfo.state.includes(EL_2)) isElistHit = true;
else if (effectiveElistCond === 'ONLY' && (elistInfo.state.includes('only') || elistInfo.state.includes('オンリー'))) isElistHit = true;
else if (effectiveElistCond === 'NONE' && elistInfo.state.includes(EL_0) && !elistInfo.state.includes(EL_P)) isElistHit = true;
else if (effectiveElistCond === 'MULTI_SPECIAL') isElistHit = true;
if (!cond_only_mon) {
isOnlyHit = true;
} else if (elistInfo.state.includes(_onlyMonExpectedStr)) {
isOnlyHit = true;
}
}
let isSpecialMatch = (isElistHit && isOnlyHit && val >= 0x2B00 && val <= 0x2BBC && elistInfo.state);
if (isSpecialMatch) {specialHitCount++;}
if ((val >= 0x2B00 && elistInfo.state) || (searchOnlyWithD && elistInfo.dValue > 0)) {
if (!foundSpecialFloors.some(x => x.floor === f + 1)) {
let fMR = searchEngine._details[2] + (f >> 2);
if (fMR > 12) fMR = 12;
foundSpecialFloors.push({
floor: f + 1,
hex: elistInfo.hex,
state: elistInfo.state || EL_NORMAL,
dValue: elistInfo.dValue,
envType: searchEngine._details[3],
floorMR: fMR,
isSpecialMatch: !!isSpecialMatch
});
}
}
}
if (requireBugFloorHit) {
foundSpecialFloors = foundSpecialFloors.filter(info => info.floor > origFloors && info.floor <= bugFloors);
hasAnyD = foundSpecialFloors.some(info => info.dValue > 0);
specialHitCount = foundSpecialFloors.filter(info => info.state !== EL_NORMAL).length;
if (foundSpecialFloors.length === 0) {
processed++;
continue;
}
}
if (searchOnlyWithD && !hasAnyD) {processed++; continue;}
if (searchOnlyWithD && (effectiveElistCond || cond_only_mon) && effectiveElistCond !== 'MULTI_SPECIAL') {
let hasMatchedD_mb = foundSpecialFloors.some(info => info.dValue > 0 && info.isSpecialMatch);
if (!hasMatchedD_mb) {processed++; continue;}
}
if (effectiveElistCond === 'MULTI_SPECIAL' && specialHitCount < 2) {processed++; continue;}
if ((effectiveElistCond || cond_only_mon) && specialHitCount === 0) {processed++; continue;}
hitCount++;
const isJP_mb = (DISPLAY_LANG !== 'EN');
let elistHtmlStr = foundSpecialFloors.map(info => {
let stateColor = "#888";
if (info.state!==EL_NORMAL) {
if (info.floor <= origFloors) {
stateColor = "#44ff44";
} else if (info.floor <= bugFloors) {
stateColor = "#ffaa00";
} else {
stateColor = "#ff88ff";
}
}
let dHtml = info.dValue > 0 ? ` <span style="background:#ffaa00; color:#000; padding:1px 5px; border-radius:3px; font-size:10px; margin-left:4px; white-space:nowrap;">${info.dValue}</span>` : '';
let line = `<span style="color:#0ff; font-size:12px;">B${info.floor}F: [${info.hex}] <strong style="color:${stateColor};">${info.state}</strong>${dHtml}</span>`;
const st = info.state;
let surviveCount=0;
if(st.includes(EL_4))surviveCount=4;
else if(st.includes(EL_3))surviveCount=3;
else if(st.includes(EL_2))surviveCount=2;
if (surviveCount > 0) {
const spList = (SPAWN_DB[info.envType] && SPAWN_DB[info.envType][info.floorMR]) || [];
const norms = spList.filter(e => e.length === 3);
const names = norms.slice(0, surviveCount).map(e => {
const md = MONSTER_DATA[e[0]];
return md ? (isJP_mb ? md.jp : md.en) : '?';
});
line += `<br><span style="color:#aaa; font-size:10px;">${names.join(' + ')}</span>`;
}
return line;
}).join('<br>');
let itemNode = document.createElement('div');
itemNode.className = 'search-result-item';
if (hasAnyD) itemNode.dataset.hasD = "true";
let bugIcon = isFloorIncreased ? '📈' : '';
itemNode.innerHTML = `
<span style="color:#ffd700; font-weight:bold; font-size:15px;">${seed.toString(16).toUpperCase().padStart(4,'0')}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<div style="background:#111; padding:4px 8px; border-radius:4px; margin:4px 0; border:1px solid #333;">
<span style="color:#aaa; font-size:11px">[Source] ${origName} | B${origFloors}F | ${origBoss}</span><br>
<span style="color:#ff88ff; font-size:12px">[Bug] ${bugName} | B${bugFloors}F | ${bugBoss} ${bugIcon}</span>
</div>${boxHtml}
<div style="padding-top:2px;">${elistHtmlStr}</div>
`;
itemNode.onclick = () => {
document.getElementById('seed').value = seed.toString(16).toUpperCase().padStart(4,'0');
document.getElementById('rank').value = "0x" + rStr;
calculate();
document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
};
fragment.appendChild(itemNode);
searchEngine._force_16_floors = false;
processed++;
}
}
if (fragment.children.length > 0) grid.appendChild(fragment);
isSearching = false;
if(btn) {btn.textContent=H05; btn.style.background='linear-gradient(135deg,#cc00cc,#660066)'; btn.style.color='#fff';}
progressSpan.textContent = searchCancel ? `${B05} (${B04}${hitCount} ${B03})` : `100% (${B06?B06+' ':''}${hitCount} ${B03})`;
}
function atUpd() {
const envType = parseInt(document.getElementById('at_env').value);
const floorMR = parseInt(document.getElementById('at_mr').value);
const sel = document.getElementById('at_mon');
sel.innerHTML = '';
const spawnList = SPAWN_DB[envType] && SPAWN_DB[envType][floorMR];
if (!spawnList) return;
for (const entry of spawnList) {
if (entry.length < 3) continue;
const md = MONSTER_DATA[entry[0]];
if (!md) continue;
const opt = document.createElement('option');
opt.value = entry[0];
opt.textContent = `${md.jp} (${md.en})`;
sel.appendChild(opt);
}
if (typeof updateATOnlyMonsters === 'function') updateATOnlyMonsters();
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', atInit);
} else {
setTimeout(atInit, 0);
}
function atInit() {
atUpd();
const patSel = document.getElementById('at_pattern');
if (patSel && typeof AT_O !== 'undefined') {
AT_O.forEach(pair => {
const opt = document.createElement('option');
opt.value = pair[0];
opt.textContent = pair[1];
patSel.appendChild(opt);
});
}
const lbl = document.getElementById('at_lblSteps');
if (lbl) lbl.textContent = T('Steps','步數','歩数');
}
function getMonsterNameByAT(atVal, envType, floorMR) {
const spawnList = SPAWN_DB[envType] && SPAWN_DB[envType][floorMR];
if (!spawnList) return "?";
for (const entry of spawnList) {
if (entry.length >= 3 && atVal >= entry[1] && atVal <= entry[2]) {
const md = MONSTER_DATA[entry[0]];
return md ? (DISPLAY_LANG !== 'EN' ? md.jp : md.en) : "?";
}
}
return "?";
}
function updateATOnlyMonsters() {
const envType = parseInt(document.getElementById('at_env').value);
const floorMR = parseInt(document.getElementById('at_mr').value);
document.querySelectorAll('.at-dynamic-mon').forEach(el => {
const atVal = parseInt(el.getAttribute('data-at'));
if (!isNaN(atVal)) {
el.textContent = getMonsterNameByAT(atVal, envType, floorMR);
}
});
}
function updateBattleAT() {
let deftInput = document.getElementById('at_deft');
let userDeft = (deftInput && deftInput.value !== '') ? parseInt(deftInput.value) : 999;
let nInput = document.getElementById('at_n_input');
let n = (nInput && nInput.value !== '') ? parseInt(nInput.value) : 0;
document.querySelectorAll('.at-m-card').forEach(card => {
let seed = parseInt(card.getAttribute('data-seed'));
let cN = 35 + (29 * n);
let s = seed >>> 0;
for (let i = 0; i < cN; i++) s = lcg(s);
let atN = (s >>> 16) & 0x7FFF;
s = lcg(s);
let atN1 = (s >>> 16) & 0x7FFF;
let deft = typeof calcDeftness === 'function' ? calcDeftness(atN1) : 0;
let deftColor = deft >= 1000 ? '#f44' : deft <= 1 ? '#888' : '#39C5BB';
let deftLabel = deft >= 1000 ? '1000' : (deft <= 0 ? '1' : deft.toString());
let atnLabel = card.querySelector('.at-m-atn-label');
if (atnLabel) {
if (atnLabel.textContent.includes('AT[')) atnLabel.textContent = `AT[${cN}]: `;
else atnLabel.textContent = `AT +${cN}: `;
}
let atnVal = card.querySelector('.at-m-atval');
if (atnVal) atnVal.textContent = atN;
let monStrong = card.querySelector('.at-dynamic-mon');
if (monStrong) {
monStrong.setAttribute('data-at', atN);
let envType = parseInt(document.getElementById('at_env').value);
let floorMR = parseInt(document.getElementById('at_mr').value);
if (typeof getMonsterNameByAT === 'function') {
monStrong.textContent = getMonsterNameByAT(atN, envType, floorMR);
}
}
let deftSpan = card.querySelector('.at-m-deft');
if (deftSpan) {
deftSpan.style.color = deftColor;
deftSpan.textContent = `${G21} ${deftLabel}`;
}
card.querySelectorAll('.at-dynamic-battle').forEach(el => {
el.setAttribute('data-req', deft);
el.setAttribute('data-current-n', cN);
});
});
let formatAT=(val)=>{if(val<-2)return '⊖';if(val>458)return '⊕';return val;};
document.querySelectorAll('.at-dynamic-battle').forEach(el => {
let target = parseInt(el.getAttribute('data-target'));
let req = parseInt(el.getAttribute('data-req'));
let pop = el.hasAttribute('data-current-n') ? parseInt(el.getAttribute('data-current-n')) : parseInt(el.getAttribute('data-n'));
let d1, d2, d4;
if (userDeft < req) {
d1 = target - (pop + 4);
d2 = target - (pop + 5);
d4 = target - (pop + 6);
} else {
d1 = target - (pop + 3);
d2 = target - (pop + 4);
d4 = target - (pop + 5);
}
el.textContent = `${formatAT(d1)} / ${formatAT(d2)} / ${formatAT(d4)}`;
});
}
function calcDeftness(at) {
const raw = Math.ceil(at / 32768 * 100 - 2) * 20;
if (raw <= 0) return 0;
if (raw > 999) return 1000;
return raw;
}
function evaluateATPattern(pType, validCount, hb) {
let matched = false, extractLen = 0;
switch (pType) {
case 1: if (validCount >= 2 && (hb & 3) === 3) {matched=true;extractLen=2;} break;
case 2: if (validCount >= 3 && (hb & 15) === 5) {matched=true;extractLen=4;} break;
case 3: if (validCount >= 4 && (hb & 9) === 9) {matched=true;extractLen=4;} break;
case 4: if (validCount >= 3 && (hb & 7) === 7) {matched=true;extractLen=3;} break;
case 5: if (validCount >= 4 && (hb & 15) === 15) {matched=true;extractLen=4;} break;
case 6: if (validCount >= 5 && (hb & 31) === 31) {matched=true;extractLen=5;} break;
case 7: if (validCount >= 6){let v=hb&63;if(v===57||v===51||v===39){matched=true;extractLen=6;}} break;
case 8: if (validCount >= 7){let v=hb&127;if(v===97||v===100||v===76||v===73||v===67){matched=true;extractLen=7;}} break;
case 9: if (validCount >= 6 && (hb & 63) === 21) {matched=true;extractLen=6;} break;
case 10: if (validCount >= 8 && (hb & 255) === 85) {matched=true;extractLen=8;} break;
case 11: if (validCount >= 10 && (hb & 1023) === 341) {matched=true;extractLen=10;} break;
case 12: if (validCount >= 10){let v=hb&1023;if(v===337||v===325||v===277){matched=true;extractLen=10;}} break;
case 13: if (validCount >= 10){let v=hb&1023;if(v===321||v===324||v===276||v===273||v===261){matched=true;extractLen=10;}} break;
}
return { matched, extractLen };
}
function formatATPatternHTML(extractLen, step, valsBuffer, hb) {
let formattedVals = [];
for (let i = extractLen - 1; i >= 0; i--) {
let sv = step - i;
let v = valsBuffer[sv % 10];
let m = (hb & (1 << i)) !== 0;
if (m) formattedVals.push(`<strong style="color:#f44;">${v}</strong>`);
else formattedVals.push(`<span style="color:#666;">${v}</span>`);
}
return formattedVals.join(', ');
}
async function atSearch() {
if (isSearching) { searchCancel = true; return; }
isSearching = true; searchCancel = false;
const btn = document.getElementById('atSearchBtn');
btn.textContent = 'STOP'; btn.style.background = '#f44'; btn.style.color = '#fff';
const monEnvType = parseInt(document.getElementById('at_env').value);
const monFloorMR = parseInt(document.getElementById('at_mr').value);
const monId = document.getElementById('at_mon').value;
const nVal = parseInt(document.getElementById('at_n_input').value);
if (isNaN(nVal) || nVal < 0) { isSearching = false; btn.textContent='M';btn.style.background = 'linear-gradient(135deg,#0ca,#006655)'; btn.style.color = '#fff'; return; }
const N = 35 + 29 * nVal;
const spawnList = SPAWN_DB[monEnvType] && SPAWN_DB[monEnvType][monFloorMR];
let atin = -1, atax = -1;
for (const entry of spawnList) {
if (entry[0] === monId && entry.length >= 3) {
atin = entry[1]; atax = entry[2]; break;
}
}
if (atin < 0) { isSearching = false; btn.textContent = 'M'; btn.style.background = 'linear-gradient(135deg,#0ca,#006655)'; btn.style.color = '#fff'; return; }
const md = MONSTER_DATA[monId];
const envNames = {1:'洞窟',2:'遺跡',3:'氷',4:'水',5:'火山'};
const conds = getUltimateConds();
const hasBoxCond = conds.hasBoxCond;
const searchFilterLoc = true;
const searchOnlyWithD = document.getElementById('searchOnlyWithD').checked;
const baseRankStr = document.getElementById('rank').value;
const maxSeed = 0x7FFF;
const rangeData = getValidatedSeedRange();
if (rangeData.error) { alert(rangeData.error); isSearching = false; btn.textContent = 'M'; btn.style.background = 'linear-gradient(135deg,#0ca,#006655)'; btn.style.color = '#fff'; return; }
const {startSeed, endSeed} = rangeData;
const rank = parseInt(baseRankStr);
const rStr = rank.toString(16).toUpperCase().padStart(2, '0');
const targetRankKey = RANKS[rStr] ? rStr : (RANKS["0x"+rStr] ? "0x"+rStr : null);
const deftInput = document.getElementById('at_deft').value.trim();
const deftMax = deftInput !== '' ? parseInt(deftInput) : -1;
const atThreshold = parseInt(document.getElementById('at_threshold').value);
let pType = AT_PAT[document.getElementById('at_pattern').value]||0;
let atMaxSteps = parseInt(document.getElementById('at_maxSteps').value);
if (isNaN(atMaxSteps) || atMaxSteps < 38) atMaxSteps = 400;
if (atMaxSteps < N) atMaxSteps = N;
let headerExtra = '';
if (deftMax >= 0) headerExtra += ` ｜ ${G21} ${deftMax}`;
if (pType > 0) {
const patSel = document.getElementById('at_pattern');
const probSel = document.getElementById('at_threshold');
headerExtra += ` ｜ ${patSel.options[patSel.selectedIndex].text} (${probSel.options[probSel.selectedIndex].text})`;
}
const resultDiv = document.getElementById('searchResults');
resultDiv.innerHTML = `<div style="color:#aaa; font-size:13px; margin-bottom:8px;">
<div style="color:#0ca; font-size:12px; margin-bottom:6px;">${envNames[monEnvType]} Rank ${monFloorMR} ｜ ${md.jp} (${md.en}) ｜ POP=${N} (Zoom=${nVal}) ｜ AT: ${atin}～${atax} ${headerExtra}</div>
${B01} <span id="searchProgress" style="color:#fff; font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>`;
const grid = document.getElementById('searchGrid');
const progressSpan = document.getElementById('searchProgress');
const atatchSeeds = new Map();
for (let seed = startSeed; seed <= Math.min(endSeed, maxSeed); seed++) {
let s = seed;
let atN = 0, atN1 = 0;
for (let j = 1; j <= N + 1; j++) {
s = lcg(s);
if (j === N) atN = (s >>> 16) & 0x7FFF;
if (j === N + 1) atN1 = (s >>> 16) & 0x7FFF;
}
if (atN < atin || atN > atax) continue;
if (deftMax >= 0) {
if (calcDeftness(atN1) > deftMax) continue;
}
atatchSeeds.set(seed, { atN, atN1 });
}
const atPatternDetails = new Map();
if (pType > 0) {
const valsBuffer = new Int32Array(10);
for (const [seed] of [...atatchSeeds]) {
let rng = seed;
let historyBits = 0, validCount = 0;
let foundOffsets = [];
for (let step = 1; step <= atMaxSteps; step++) {
rng = lcg(rng);
let val = (rng >>> 16) & 0x7FFF;
if (step < 38) continue;
let isMatch = (val <= atThreshold) ? 1 : 0;
historyBits = ((historyBits << 1) | isMatch) & 1023;
valsBuffer[step % 10] = val;
validCount++;
let { matched, extractLen } = evaluateATPattern(pType, validCount, historyBits);
if (matched) {
let startStep = step - extractLen + 1;
if (startStep >= N+3) {
let valsHtml = formatATPatternHTML(extractLen, step, valsBuffer, historyBits);
foundOffsets.push({ start: startStep, valsHtml: valsHtml });
}
historyBits = 0; validCount = 0;
}
}
if (foundOffsets.length > 0) {
atPatternDetails.set(seed, { foundOffsets });
} else {
atatchSeeds.delete(seed);
}
}
}
const needMapGeneration = hasBoxCond || conds.elist || conds.onlyMon || searchOnlyWithD || conds.anomaly !== "";
let _onlyMonExpectedStr = buildOnlyMonExpectedStr(conds);
let searchEngine = new GrottoDetail();
searchEngine.trackOverflow = (conds.anomaly === 'all_invalid' || conds.anomaly === 'ghost');
let totalCombos = atatchSeeds.size;
let processed = 0;
let hitCount = 0;
let fragment = document.createDocumentFragment();
let allResults = [];
const patSel2 = document.getElementById('at_pattern');
const probSel2 = document.getElementById('at_threshold');
const patternName2 = patSel2 ? patSel2.options[patSel2.selectedIndex].text : '';
const probText2 = probSel2 ? probSel2.options[probSel2.selectedIndex].text : '';
try {
for (const [seed, atInfo] of atatchSeeds) {
if (searchCancel) break;
if (processed % 50 === 0) {
progressSpan.textContent = Math.floor((processed/totalCombos)*100)+'% ['+B04+''+hitCount+' '+B03+']';
await new Promise(r => setTimeout(r, 0));
}
searchEngine.MapSeed = seed;
searchEngine.MapRank = rank;
_cachedLocData = null;
searchEngine.calculateDetail(true);
if (!checkBasicConds(searchEngine, conds)) { processed++; continue; }
if (!checkOnlyMonPossible(searchEngine, conds)) { processed++; continue; }
if (needMapGeneration) searchEngine.createDungeonDetail();
let boxHtml = "";
if (hasBoxCond) {
let chestResult = ChestHtml(searchEngine, conds);
if (!chestResult.isMatch) { processed++; continue; }
boxHtml = chestResult.html;
}
let elistResult = checkElistAndD(searchEngine, conds, searchOnlyWithD, _onlyMonExpectedStr);
if (!elistResult.match) { processed++; continue; }
let locResult = checkLocationBQ(seed, conds, searchFilterLoc, targetRankKey);
if (!locResult.match) { processed++; continue; }
let anomResult = checkAnomalies(searchEngine, conds);
if (!anomResult.match) { processed++; continue; }
let jumpToFloor = elistResult.jumpToFloor !== -1 ? elistResult.jumpToFloor : anomResult.jumpToFloor;
hitCount++;
let itemNode = document.createElement('div');
itemNode.className = 'search-result-item';
if (elistResult.hasMatchedD) itemNode.dataset.hasD = "true";
if (!_cachedLocData && seed <= 0x7FFF && targetRankKey !== null) {
_cachedLocData = calcLocations(seed, targetRankKey);
}
let locHtml = _cachedLocData ? LocaHtmlFromData(_cachedLocData, conds) : "";
let specialHtml = elistResult.specialHitDetails.length > 0 ? `<div style="margin-top:4px;">${elistResult.specialHitDetails.map(s=>`<span style="color:#ffccff;font-size:11px">${s}</span>`).join('<br>')}</div>` : '';
let anomalyHtml = anomResult.anomalyDetails.length > 0 ? `<div style="margin-top:6px; display:flex; flex-direction:column; align-items:flex-start;">${anomResult.anomalyDetails.map(h=>h.replace('<span style="','<span style="display:inline-block; line-height:1.4; margin-top:4px; ')).join('')}</div>` : '';
let mapNameDisp = DISPLAY_LANG !== 'EN' ? searchEngine.mapNameJP : searchEngine.mapName;
const deft = calcDeftness(atInfo.atN1);
const deftColor = deft >= 1000 ? '#f44' : deft <= 1 ? '#888' : '#39C5BB';
const deftLabel = deft >= 1000 ? '1000' : (deft <= 0 ? '1' : deft.toString());
const battleLabel = DISPLAY_LANG === 'JP' ? '戦' : (DISPLAY_LANG === 'EN' ? 'Bat.' : '戰');
let diffsHtml = '';
let patHtml = '';
const patData = atPatternDetails.get(seed);
if (pType > 0 && patData) {
let offsetsHtml = patData.foundOffsets.map(o =>
`<span style="color:#0ff; font-size:12px;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`
).join('<br>');
patHtml = `<div style="margin-top:4px; padding:4px 8px; background:#111; border:1px solid #333; border-radius:4px;">
<span style="color:#ffaa00; font-size:11px; font-weight:bold;">${patternName2} (${probText2})</span><br>
${offsetsHtml}</div>`;
diffsHtml = patData.foundOffsets.map(o => {
const d1 = o.start - (N + 3);
const d2 = o.start - (N + 4);
const d4 = o.start - (N + 5);
return `<span class="at-dynamic-battle" data-target="${o.start}" data-n="${N}" data-req="${deft}" style="font-size:11px; text-shadow:0 0 2px rgba(255,170,0,0.5);">${d1} / ${d2} / ${d4}</span>`;
}).join(`<br><span style="color:transparent; font-size:11px;">${battleLabel} </span>`);
diffsHtml = `<span style="color:#ffaa00; margin-left:12px; font-size:11px;">${battleLabel} ${diffsHtml}</span>`;
}
let atHtml = `<div class="at-m-card" data-seed="${seed}" style="margin-top:4px; padding:5px 8px; background:#0a1a1a; border:1px solid #055; border-radius:3px;">
<span style="color:#4c4; font-size:11px;"><span class="at-m-atn-label">AT[${N}]: </span><span class="at-m-atval">${atInfo.atN}</span></span>
<strong class="at-dynamic-mon" data-at="${atInfo.atN}" style="color:#ff88ff; margin-left:8px; font-size:11px; text-shadow:0 0 2px rgba(255,136,255,0.5);"></strong>
<br>
<span class="at-m-deft" style="color:${deftColor}; display:inline-block; margin-top:4px; font-size:11px;">${G21} ${deftLabel}</span>
${diffsHtml}
</div>`;
const capturedJumpToFloor = jumpToFloor;
itemNode.innerHTML = `
<span style="color:#ffd700; font-weight:bold">${seed.toString(16).toUpperCase().padStart(4,'0')}</span>
<span style="color:#888">(Rank ${rStr})</span><br>
<span style="color:#0ff; font-size:11px">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div>
${specialHtml}
${anomalyHtml}
${atHtml}
${patHtml}
`;
itemNode.onclick = ((s,r,jtf) => () => {
document.getElementById('seed').value = s.toString(16).toUpperCase().padStart(4,'0');
document.getElementById('rank').value = "0x" + r;
calculate();
document.getElementById('result').scrollIntoView({behavior:'smooth'});
if (jtf !== -1) { setTimeout(() => { const tab = document.querySelectorAll('.floor-tab')[jtf]; if(tab) tab.click(); }, 50); }
})(seed, rStr, capturedJumpToFloor);
allResults.push({ node: itemNode, pop: atInfo.atN });
processed++;
}
const atSortPOP = document.getElementById('at_sortPOP').checked;
if (atSortPOP) {
allResults.sort((a, b) => a.pop - b.pop);
}
for (let res of allResults) fragment.appendChild(res.node);
if (fragment.children.length > 0) grid.appendChild(fragment);
if (typeof updateATOnlyMonsters === 'function') updateATOnlyMonsters();
if (typeof updateBattleAT === 'function') updateBattleAT();
} catch (error) {
console.error("AT Monster Search error:", error);
alert(A03);
searchCancel = true;
} finally {
isSearching = false;
btn.textContent = 'M'; btn.style.background = 'linear-gradient(135deg,#0ca,#006655)'; btn.style.color = '#fff';
progressSpan.textContent = searchCancel ? `${B05} (${B04}${hitCount} ${B03})` : `100% (${B06?B06+' ':''}${hitCount} ${B03})`;
}
}
async function atSearchATOnly() {
if (isSearching) { searchCancel = true; return; }
isSearching = true; searchCancel = false;
const btn = document.getElementById('atSearchATBtn');
btn.textContent = 'STOP'; btn.style.background = '#f44';
const threshold = parseInt(document.getElementById('at_threshold').value);
let pType = AT_PAT[document.getElementById('at_pattern').value]||0;
if (pType === 0) {alert(A01);isSearching=false;btn.textContent='AT';btn.style.background='linear-gradient(135deg,#ff8800,#aa3300)';return;}
let maxSteps = parseInt(document.getElementById('at_maxSteps').value);
if (isNaN(maxSteps) || maxSteps < 38) maxSteps = 400;
const nVal = parseInt(document.getElementById('at_n_input').value);
const POPIndex = (isNaN(nVal) || nVal < 0) ? 35 : 35 + 29 * nVal;
if (maxSteps < POPIndex) maxSteps = POPIndex+1;
const searchFilterLoc = true;
const baseRankStr = document.getElementById('rank').value;
const rStr = parseInt(baseRankStr).toString(16).toUpperCase().padStart(2, '0');
const targetRankKey = RANKS[rStr] ? rStr : (RANKS["0x"+rStr] ? "0x"+rStr : null);
const rangeData = getValidatedSeedRange();
if (rangeData.error) {alert(rangeData.error);isSearching=false;btn.textContent='AT';btn.style.background='linear-gradient(135deg,#ff8800,#aa3300)';return;}
const startSeed = rangeData.startSeed;
const endSeed = searchFilterLoc ? Math.min(rangeData.endSeed, 0x7FFF) : rangeData.endSeed;
if (startSeed > endSeed) {alert(A09);isSearching=false;btn.textContent='AT';btn.style.background='linear-gradient(135deg,#ff8800,#aa3300)';return;}
const patSel = document.getElementById('at_pattern');
const patternName = patSel.options[patSel.selectedIndex].text;
const probSel = document.getElementById('at_threshold');
const probText = probSel.options[probSel.selectedIndex].text;
const resultDiv = document.getElementById('searchResults');
resultDiv.innerHTML = `<div style="color:#aaa; font-size:13px; margin-bottom:8px;">
<div style="color:#ff8800; font-size:12px; margin-bottom:6px;">${patternName} ｜ ${probText} ｜ N=${POPIndex} (n=${nVal||0}) ｜ Rank ${rStr}</div>
${B01} <span id="searchProgress" style="color:#fff; font-weight:bold">0%</span></div><div id="searchGrid" class="search-grid"></div>`;
const grid = document.getElementById('searchGrid');
const progressSpan = document.getElementById('searchProgress');
let hitCount = 0;
let processed = 0;
let totalSeeds = endSeed - startSeed + 1;
let fragment = document.createDocumentFragment();
let allATResults = [];
const valsBuffer = new Int32Array(10);
try {
for (let seed=startSeed; seed<=endSeed; seed++) {
if (searchCancel) break;
if (searchFilterLoc) {
let locData = calcLocations(seed, targetRankKey);
if (locData.outputOrder.length === 0) { processed++; continue; }
}
if (processed % 1000 === 0) {
progressSpan.textContent = Math.floor((processed/totalSeeds)*100)+'% (Seed '+seed.toString(16).toUpperCase().padStart(4,'0')+') ['+B04+''+hitCount+' '+B03+']';
await new Promise(r => setTimeout(r, 0));
}
processed++;
let rng = seed;
let historyBits = 0;
let validCount = 0;
let foundOffsets = [];
let POPValue = null;
let DefValue = null;
for (let step = 1; step <= maxSteps; step++) {
rng = lcg(rng);
let val = (rng >>> 16) & 0x7FFF;
if (step === POPIndex) POPValue = val;
if (step === POPIndex + 1) DefValue = val;
if (step < 38) continue;
let isMatch = (val <= threshold) ? 1 : 0;
historyBits = ((historyBits << 1) | isMatch) & 1023;
valsBuffer[step % 10] = val;
validCount++;
let { matched, extractLen } = evaluateATPattern(pType, validCount, historyBits);
if (matched) {
let startStep = step - extractLen + 1;
if (startStep >= POPIndex + 3) {
let valsHtml = formatATPatternHTML(extractLen, step, valsBuffer, historyBits);
foundOffsets.push({ start: startStep, valsHtml: valsHtml });
}
historyBits = 0; validCount = 0;
}
}
if (foundOffsets.length > 0) {
hitCount++;
let seedHex = seed.toString(16).toUpperCase().padStart(4, '0');
let offsetsHtml = foundOffsets.map(o =>
`<span style="color:#0ff;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`
).join('<br>');
let specificAtHtml = '';
if (POPValue !== null && DefValue !== null) {
const deft = calcDeftness(DefValue);
const deftColor = deft >= 1000 ? '#f44' : deft <= 1 ? '#888' : '#39C5BB';
const deftLabel = deft >= 1000 ? '1000' : (deft <= 0 ? '1' : deft.toString());
const battleLabel = DISPLAY_LANG === 'JP' ? '戦' : (DISPLAY_LANG === 'EN' ? 'Bat.' : '戰');
const diffsHtml = foundOffsets.map(o => {
const d1 = o.start-(POPIndex+3);
const d2 = o.start-(POPIndex+4);
const d4 = o.start-(POPIndex+5);
return `<span class="at-dynamic-battle" data-target="${o.start}" data-n="${POPIndex}" data-req="${deft}" style="font-size:13px; text-shadow:0 0 2px rgba(255,170,0,0.5);">${d1} / ${d2} / ${d4}</span>`;
}).join(`<br><span style="color:transparent; font-size:11px;">${battleLabel} </span>`);
specificAtHtml = `<div class="at-m-card" data-seed="${seed}" style="margin-top:6px; padding-top:4px; border-top:1px dashed #443322;">
<span class="at-m-atn-label" style="color:#aaa;">AT +${POPIndex}: </span>
<strong class="at-m-atval" style="color:#39C5BB; text-shadow:0 0 2px rgba(57,197,187,0.5);">${POPValue}</strong>
<strong class="at-dynamic-mon" data-at="${POPValue}" style="color:#ff88ff; margin-left:8px; text-shadow:0 0 2px rgba(255,136,255,0.5);"></strong>
<br>
<span class="at-m-deft" style="color:${deftColor}; display:inline-block; margin-top:4px;">${G21} ${deftLabel}</span>
<span style="color:#ffaa00; margin-left:12px; font-size:11px;">${battleLabel} ${diffsHtml}</span>
</div>`;
}
let itemNode = document.createElement('div');
itemNode.className = 'search-result-item';
itemNode.innerHTML = `
<span style="color:#ffd700; font-weight:bold; font-size:13px;">${seedHex}</span><br>
<div style="background:#111; padding:4px 8px; border-radius:4px; margin:4px 0; border:1px solid #333;">
<span style="color:#ffaa00; font-weight:bold;">${patternName} (${probText})</span>
</div>
<div style="padding-top:2px;">
${offsetsHtml}
</div>
${specificAtHtml}
`;
itemNode.onclick = () => {
document.getElementById('seed').value = seedHex;
calculate();
document.getElementById('result').scrollIntoView({behavior:'smooth'});
};
allATResults.push({ node: itemNode, pop: POPValue !== null ? POPValue : 99999 });
}
}
const atSortPOP = document.getElementById('at_sortPOP').checked;
if (atSortPOP) {
allATResults.sort((a, b) => a.pop - b.pop);
}
for (let res of allATResults) fragment.appendChild(res.node);
if (fragment.children.length > 0) grid.appendChild(fragment);
updateATOnlyMonsters();
updateBattleAT();
} catch (error) {
console.error("AT Pattern Search error:", error);
alert(A03);
searchCancel = true;
} finally {
isSearching = false;
btn.textContent='AT';btn.style.background='linear-gradient(135deg,#ff8800,#aa3300)';
progressSpan.textContent = searchCancel ? `${B05} (${B04}${hitCount} ${B03})` : `100% (${B06?B06+' ':''}${hitCount} ${B03})`;
}
}