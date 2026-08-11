const TILE_SIZE=22;
const COLORS={
0:'#f5f0e0',
1:'#000',
2:'#e8e0c8',
3:'#000',
4:'#4c4',
5:'#f44',
6:'#ffd700',
8:'#ccd8c0',
};
const WALL_COLOR='#000';
let mapData=null;
let activeFloor=0;
function calculate(){
const safeZone=document.getElementById('controls_container');
const controlsDiv=document.getElementById('single_map_controls');
if(safeZone&&controlsDiv){safeZone.appendChild(controlsDiv);}
const seedStr=document.getElementById('seed').value.trim();
const seed=parseInt(seedStr,16);
const rank=parseInt(document.getElementById('rank').value);
if(isNaN(seed)||seed<0||seed>0x7FFF||!/^[0-9a-fA-F]{1,4}$/.test(seedStr)){
document.getElementById('result').innerHTML='<div class="error">'+C17+'</div>';
return;
}
mapData=new GrottoDetail();
mapData.MapSeed=seed;
mapData.MapRank=rank;
mapData.calculateDetail();
activeFloor=0;
renderResult();
}
function calcR2N2(seed){
const threshR=Math.floor(32768/256);
const threshN=Math.floor(32768/128);
const MAX=400;
let rng=seed>>>0;
const v=[];
for(let i=0;i<MAX+4;i++){rng=lcg(rng);v.push((rng>>>16)&0x7FFF);}
let r2=-1,r2_3=-1,n2=-1;
for(let i=0;i<MAX;i++){
if(r2===-1&&v[i]<threshR&&v[i+1]<threshR)r2=i+1;
if(r2_3===-1&&v[i]<threshR&&i+3<v.length&&v[i+3]<threshR)r2_3=i+1;
if(n2===-1&&i+3<v.length&&v[i]>=threshR&&v[i+1]<threshN&&v[i+2]>=threshR&&v[i+3]<threshN)n2=i+1;
}
return{r2,r2_3,n2};
}
function classifyElistState(st){
st=''+st;
if(st.includes(''+EL_0)&&!st.includes(''+EL_P))return{kind:'none'};
if(st.includes('only')||st.includes('オンリー'))return{kind:'only'};
if(st.includes(''+EL_4))return{kind:'reduced',count:4};
if(st.includes(''+EL_3))return{kind:'reduced',count:3};
if(st.includes(''+EL_2))return{kind:'reduced',count:2};
if(st.includes(''+EL_P))return{kind:'partial'};
return{kind:'normal'};
}
function renderResult(){
const el=document.getElementById('result');
if(!mapData||mapData.floorCount===0){
el.innerHTML='<div class="error">'+C18+'</div>';
return;
}
const seedHex=hex4(mapData.MapSeed);
const rStr=hex2(mapData.MapRank);
const locData=calcLocations(mapData.MapSeed,rStr);
let locHtmlString='';
if(locData.outputOrder.length>0){
const locStrings=locData.outputOrder.map(item=>{
if(item.timer===QUEST015)return`<span style="color:#F88;">${hex2(item.location)} (Quest)</span>`;
const bqs=Array.from(locData.seenLocations[item.location]);
return`${hex2(item.location)} (${formatRanges(bqs)})`;
});
locHtmlString=locStrings.join('<br>');
}else{
locHtmlString=C19;
}
let currentSeed=mapData.MapSeed;
const atValues=[];
for(let i=1;i<=37;i++){
currentSeed=lcg(currentSeed);
if(i>=35&&i<=37){
atValues.push((currentSeed>>>16)&0x7FFF);
}
}
const atHtmlString=`[35] ${atValues[0]}<br>[36] ${atValues[1]}<br>[37] ${atValues[2]}`;
const rn=calcR2N2(mapData.MapSeed);
const fmtRN=v=>v===-1?`<span style="color:#555;">—</span>`:`<span style="color:#0f0;">${v}</span>`;
const rnHtml=`<span style="color:#f88;">[R2] ${fmtRN(rn.r2)}</span><br><span style="color:#f88;">[+3] ${fmtRN(rn.r2_3)}</span><br><span style="color:#8cf;">[N2] ${fmtRN(rn.n2)}</span>`;
const wSum=calcWalkCostUpToFloor(mapData,mapData.floorCount);
const wHtml=wSum!==null?`<span style="color:#ffc90e;">${fmtStep(wSum)}</span>`:`<span style="color:#555;">—</span>`;
const boxData=mapData.getMapBoxCounts();
const boxCounts=boxData.counts;
const totalBoxes=boxData.total;
let boxCountHtmlArr=[];
for(let r=10;r>=1;r--){
if(boxCounts[r]>0){
let color="#aaa";
if(r===10)color="#ffd700";
else if(r>=8)color="#f44";
else if(r>=4)color="#4c4";
else if(r===3)color="#62a1ff";
boxCountHtmlArr.push(`<span style="margin-right:6px;display:inline-block;background:#000;padding:2px 6px;border-radius:4px;border:1px solid #333;"><strong style="color:${color};font-size:14px;text-shadow: 1px 1px 1px #000;">${CHEST_RANK[r]}</strong> <span style="color:#fff;font-weight:bold;">${boxCounts[r]}</span></span>`);
}
}
let boxString=boxCountHtmlArr.length>0?boxCountHtmlArr.join(''):'<span style="color:#888;">'+C09+'</span>';
let html=`<div class="info-bar">
    <span>Rank: <strong>${rStr}</strong></span>
    <span>Seed: <strong>${seedHex}</strong></span>
    <span style="display:inline-flex;align-items:flex-start;"><span>${C01}:&nbsp;</span><strong style="line-height:1.4;"><span style="display:block;color:#ffd700">${mapData.mapName}</span><span style="display:block;color:#ffd700">${mapData.mapNameJP}</span></strong></span>
    <span style="display:inline-flex;align-items:flex-start;"><span>${C02}:&nbsp;</span><strong style="line-height:1.4;"><span style="display:block;color:#ffd700">${mapData.mapTypeName}</span><span style="display:block;color:#ffd700">${mapData.mapTypeNameJP}</span></strong></span>
    <span>${C03}: <strong>${mapData.monsterRank}</strong></span>
    <span>${C04}: <strong>${mapData.floorCount}</strong></span>
    <span style="display:inline-flex;align-items:flex-start;"><span>Boss:&nbsp;</span><strong style="line-height:1.4;"><span style="display:block;color:#ffd700">${mapData.bossName}</span><span style="display:block;color:#ffd700">${mapData.bossNameJP}</span></strong></span>

    <span style="display:inline-block;vertical-align:top;border-left:1px dashed #4a4a8a;padding-left:10px;margin-left:4px;">${C05}:
    <strong style="display:block;color:#0ff;font-family:monospace;font-size:12px;margin-top:2px;">${locHtmlString}</strong>
    </span>
    <span style="display:inline-block;vertical-align:top;border-left:1px dashed #4a4a8a;padding-left:10px;margin-left:4px;">${C06}:
    <strong style="display:block;color:#4c4;font-family:monospace;font-size:12px;margin-top:2px;text-align:left;">${atHtmlString}</strong>
    </span>
    <span style="display:inline-block;vertical-align:top;border-left:1px dashed #4a4a8a;padding-left:10px;margin-left:4px;">${C07}:
    <strong style="display:block;font-family:monospace;font-size:12px;margin-top:2px;text-align:left;">${rnHtml}</strong>
    </span>
    <span style="display:inline-block;vertical-align:top;border-left:1px dashed #4a4a8a;padding-left:10px;margin-left:4px;" title="${T('Sum of per-floor shortest walking cost (Dijkstra, same rule as Fastest Map Search)','全樓層最短步數之和（Dijkstra，與最短地圖搜尋同規則）','全フロア最短歩数の合計（Dijkstra、最短地図検索と同ルール）')}">A*:
    <strong style="display:block;font-family:monospace;font-size:12px;margin-top:2px;text-align:left;">${wHtml}</strong>
    </span>
    </div>

    <div class="info-bar" style="align-items:center;background:#16162a;border-bottom:1px solid #4a4a8a;padding:8px 14px;gap:6px;">
    <span style="color:#88b;font-weight:bold;white-space:nowrap;">${C08}</span>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;flex:1;min-width:0;">
    ${boxString}
    </div>
    <span style="white-space:nowrap;padding-left:8px;border-left:2px solid #4a4a8a;color:#8cc8ff;font-weight:bold;">📦 ${totalBoxes}</span>
    <div id="controls_target_area" style="display:flex;align-items:center;"></div>
    </div>`;
setTimeout(()=>{
const target=document.getElementById('controls_target_area');
const controls=document.getElementById('single_map_controls');
if(target&&controls){
target.appendChild(controls);
}
},0);
html+='<div class="floor-tabs">';
const ELIST_TAB_COLORS={none:'#c0c0c0',only:'#FFC90E',reduced:'#B5E61D',partial:'#00A2E8'};
for(let i=0;i<mapData.floorCount;i++){
let tabStyle='';
const einfo=getFloorElistInfo(mapData,i);
if(einfo.state){
const c=ELIST_TAB_COLORS[classifyElistState(einfo.state).kind]||null;
if(c)tabStyle=` style="background:${c};color:#000;border-color:${c}"`;
}
html+=`<div class="floor-tab${i===activeFloor?' active':''}"${tabStyle} onclick="switchFloor(${i})">B${i+1}F</div>`;
}
html+='</div>';
html+='<div class="floor-content" id="floor-content"></div>';
el.innerHTML=html;
renderFloor(activeFloor);
}
function switchFloor(f){
activeFloor=f;
document.querySelectorAll('.floor-tab').forEach((t,i)=>t.classList.toggle('active',i===f));
renderFloor(f);
}
function getCanvasTilePoint(canvas,event){
const rect=canvas.getBoundingClientRect();
return{
x:Math.floor((event.clientX-rect.left)/TILE_SIZE),
y:Math.floor((event.clientY-rect.top)/TILE_SIZE),
};
}
function renderFloor(f){
const container=document.getElementById('floor-content');
const w=mapData.getFloorWidth(f);
const h=mapData.getFloorHeight(f);
const map=mapData.getFloorMap(f);
const up=mapData.getUpStair(f);
const down=mapData.getDownStair(f);
const boxCount=mapData.getBoxCount(f);
const canvasW=w*TILE_SIZE;
const canvasH=h*TILE_SIZE;
let infoHtml='<div class="floor-info">';
infoHtml+=`<h3>B${f+1}F</h3>`;
infoHtml+='<table>';
infoHtml+=`<tr><td>${C10}</td><td>${w} × ${h}</td></tr>`;
if(f<mapData.floorCount-1)
infoHtml+=`<tr><td>${C11}</td><td>▲ (${up.x}, ${up.y})　▼ (${down.x}, ${down.y})</td></tr>`;
else
infoHtml+=`<tr><td>${C11}</td><td>▲ (${up.x}, ${up.y})　Boss (${down.x}, ${down.y})</td></tr>`;
const elistInfo=getFloorElistInfo(mapData,f);
let stateHtml=elistInfo.state?` <span style="background:#f4c;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;margin-left:6px;white-space:nowrap;">${elistInfo.state}</span>`:'';
let dHtml=elistInfo.dValue>0?` <span style="background:#fa0;color:#000;padding:1px 5px;border-radius:3px;font-size:10px;margin-left:4px;white-space:nowrap;">${elistInfo.dValue}</span>`:'';
infoHtml+=`<tr><td>ElistOfs</td><td style="font-family:monospace;color:#4c4;">${elistInfo.hex}${stateHtml}${dHtml}</td></tr>`;
const envType=mapData._details[3];
let floorMR=floorMRAt(mapData._details[2],f);
const spawnList=getSpawnList(envType,floorMR);
const normals=spawnList.filter(e=>e.length===3);
const isJP=(DISPLAY_LANG!=='EN');
const stCls=classifyElistState(elistInfo.state||'');
let grayFrom=normals.length;
if(stCls.kind==='reduced')grayFrom=stCls.count;
else if(stCls.kind==='none')grayFrom=0;
else if(stCls.kind==='only')grayFrom=0;
const onlyMonId=(ONLY_MONSTERS[envType]&&ONLY_MONSTERS[envType][floorMR])||'';
const isOnlyMode=(stCls.kind==='only');
let monsterSpans=normals.map((entry,i)=>{
const md=MONSTER_DB[entry[0]];
if(!md)return'';
const name=isJP?md.jp:md.en;
let isGray;
if(isOnlyMode){
isGray=(entry[0]!==onlyMonId);
}else{
isGray=(i>=grayFrom);
}
const bg=isGray?'#1a1a2e':'#2a2a4a';
const fg=isGray?'#555':'#ddd';
return`<span class="mon-pill" style="color:${fg};background:${bg};">${name}</span>`;
}).filter(Boolean);
if(monsterSpans.length>0){
infoHtml+=`<tr><td>${C12}</td><td class="mon-td">${monsterSpans.join('')}</td></tr>`;
}
if(boxCount>0){
infoHtml+=`<tr><td>${C13}</td><td>${boxCount} <font color=#666>${C14}</font></td></tr>`;
for(let i=0;i<boxCount;i++){
const box=mapData.getBoxInfo(f,i);
const rn=CHEST_RANK[box.rank]||box.rank;
const[soloEN,soloJP]=mapData.getBoxItem(f,i,1).map(v=>v||'?');
const[partyEN,partyJP]=mapData.getBoxItem(f,i,2).map(v=>v||'?');
const[ppapEN,ppapJP]=mapData.getBoxItem(f,i,4).map(v=>v||'?');
const dispSolo=DISPLAY_LANG!=='EN'?soloJP:soloEN;
const dispParty=DISPLAY_LANG!=='EN'?partyJP:partyEN;
const dispPpap=DISPLAY_LANG!=='EN'?ppapJP:ppapEN;
infoHtml+=`<tr><td>${C15} ${i+1}</td><td>
        <div class="chest-row"><span class="chest-rank rank-${rn}">Rank ${rn}</span> (${box.x}, ${box.y})</div>
        <div class="chest-item"><span class="chest-item-solo">Item (${STR_SOLO}): ${dispSolo}</span></div>
        <div class="chest-item"><span class="chest-item-party">Item (${STR_PARTY}): ${dispParty}</span></div>
        <div class="chest-item"><span class="chest-item-ppap">Item (PPAP): ${dispPpap}</span></div>
      </td></tr>`;
}
}else{
infoHtml+=`<tr><td>${C15}</td><td>${C16}</td></tr>`;
}
infoHtml+='</table>';
infoHtml+='<div class="legend" style="margin-top:20px">';
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#f5f0e0"></div>${D01}</div>`;
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#000"></div>${D02}</div>`;
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#e8e0c8"></div>${D03}</div>`;
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#ccd8c0"></div>${D04}</div>`;
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#4c4"></div>${D05}</div>`;
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#f44"></div>${D06}</div>`;
infoHtml+=`<div class="legend-item"><div class="legend-swatch" style="background:#ffd700"></div>${D07}</div>`;
infoHtml+='</div></div>';
container.innerHTML=`<div class="map-container"><canvas id="mapCanvas" width="${canvasW}" height="${canvasH}" title=""></canvas><div id="coordDisplay" style="position:absolute;bottom:4px;right:8px;font-size:11px;color:#aaa;font-family:monospace;pointer-events:none"></div></div>${infoHtml}`;
document.querySelector('.map-container').style.position='relative';
const mapCanvas=document.getElementById('mapCanvas');
mapCanvas.addEventListener('mousemove',(e)=>{
const{x:mx,y:my}=getCanvasTilePoint(mapCanvas,e);
const coordEl=document.getElementById('coordDisplay');
if(mx>=0&&mx<w&&my>=0&&my<h){
const tNames={0:D01,1:D02,2:D03,3:D02,4:C11,5:C11,6:D07,8:D04};
const tile=map[my][mx];
let label=tNames[tile]||`tile:${tile}`;
if(mx===up.x&&my===up.y)label=D05+'▲';
if(mx===down.x&&my===down.y)label=(f<mapData.floorCount-1)?D06+'▼':'Boss▼';
coordEl.textContent=`(${mx},${my}) ${label}`;
mapCanvas.style.cursor=boxPositions.has(mx+','+my)?'pointer':'default';
}else{
coordEl.textContent='';
mapCanvas.style.cursor='default';
}
});
const boxPositions=new Map();
for(let i=0;i<boxCount;i++){
const b=mapData.getBoxInfo(f,i);
boxPositions.set(b.x+','+b.y,{num:i+1,rank:b.rank});
}
mapCanvas.addEventListener('click',(e)=>{
const{x:mx,y:my}=getCanvasTilePoint(mapCanvas,e);
if(boxPositions&&boxPositions.has(mx+','+my)){
const boxObj=boxPositions.get(mx+','+my);
showChestTimer(f,boxObj.num-1,mx,my);
}
});
const canvas=document.getElementById('mapCanvas');
const ctx=canvas.getContext('2d');
ctx.fillStyle='#000';
ctx.fillRect(0,0,canvasW,canvasH);
for(let y=0;y<h;y++){
for(let x=0;x<w;x++){
let tile=map[y][x];
const px=x*TILE_SIZE;
const py=y*TILE_SIZE;
const isUpStair=(x===up.x&&y===up.y);
const isDownStair=(x===down.x&&y===down.y);
const boxObj=boxPositions.get(x+','+y)||null;
const isBox=!!boxObj;
let displayTile=tile;
if(isUpStair)displayTile=4;
else if(isDownStair)displayTile=5;
else if(isBox)displayTile=6;
else if(tile===4||tile===5||tile===6)displayTile=0;
if(displayTile===1||displayTile===3){
ctx.fillStyle=WALL_COLOR;
ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);
}else{
ctx.fillStyle=COLORS[displayTile]||COLORS[0];
ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);
ctx.strokeStyle='rgba(0,0,0,0.08)';
ctx.strokeRect(px+0.5,py+0.5,TILE_SIZE-1,TILE_SIZE-1);
}
ctx.textAlign='center';
ctx.textBaseline='middle';
if(isUpStair){
ctx.fillStyle='#000';
ctx.font='bold 12px sans-serif';
ctx.fillText('▲',px+TILE_SIZE/2,py+TILE_SIZE/2);
}else if(isDownStair){
ctx.fillStyle='#000';
ctx.font='bold 12px sans-serif';
ctx.fillText('▼',px+TILE_SIZE/2,py+TILE_SIZE/2);
}else if(isBox){
const chestLabel=(CHEST_RANK[boxObj.rank]||'?')+boxObj.num;
ctx.save();
ctx.fillStyle='#000';
ctx.font='11px sans-serif';
ctx.translate(px+TILE_SIZE/2,py+TILE_SIZE/2);
ctx.scale(1,1.35);
ctx.fillText(chestLabel,0,0);
ctx.restore();
}
}
}
ctx.fillStyle='rgba(0,0,0,0.3)';
ctx.font='9px monospace';
ctx.textAlign='center';
ctx.textBaseline='top';
for(let x=0;x<w;x++)ctx.fillText(x,x*TILE_SIZE+TILE_SIZE/2,2);
ctx.textBaseline='middle';
ctx.textAlign='left';
for(let y=0;y<h;y++)ctx.fillText(y,2,y*TILE_SIZE+TILE_SIZE/2);
}
function showChestTimer(floorIndex,boxIndex,x,y){
const modal=document.getElementById('chestModal');
const title=document.getElementById('chestModalTitle');
const body=document.getElementById('chestModalBody');
const boxInfo=mapData.getBoxInfo(floorIndex,boxIndex);
const rn=CHEST_RANK[boxInfo.rank]||boxInfo.rank;
title.textContent=`B${floorIndex+1}F ${C15} ${boxIndex+1} (Rank ${rn}) @ (${x}, ${y})`;
let results=[];
let currentStart=0;
let[currentItemEN,currentItemJP]=mapData.getBoxItem(floorIndex,boxIndex,0);
for(let s=1;s<=255;s++){
let[itemEN,itemJP]=mapData.getBoxItem(floorIndex,boxIndex,s);
if(itemEN!==currentItemEN){
results.push({start:currentStart,end:s-1,itemEN:currentItemEN,itemJP:currentItemJP});
currentStart=s;
currentItemEN=itemEN;
currentItemJP=itemJP;
}
}
results.push({start:currentStart,end:255,itemEN:currentItemEN,itemJP:currentItemJP});
let htmlEN='';
let htmlJP='';
results.forEach(res=>{
const rangeStr=res.start===res.end?(res.start+5).toString().padStart(3,'0'):`${(res.start + 5).toString().padStart(3, '0')} ~ ${(res.end + 5).toString().padStart(3, '0')}`;
const isHighlight=(res.start<=2&&res.end>=1);
const rowStyle=isHighlight?'background: rgba(255, 215, 0, 0.15);border-left: 3px solid #ffd700;padding-left: 8px;':'';
const textStyle=isHighlight?'color: #ffd700;font-weight: bold;':'';
htmlEN+=`<div class="timer-row" style="${rowStyle}">
    <span class="timer-range" style="${textStyle}">${rangeStr}</span>
    <span class="timer-item" style="${textStyle}">${res.itemEN}</span>
    </div>`;
htmlJP+=`<div class="timer-row" style="${rowStyle}">
    <span class="timer-range" style="${textStyle}">${rangeStr}</span>
    <span class="timer-item" style="${textStyle}">${res.itemJP}</span>
    </div>`;
});
body.style.padding='0';
body.style.overflowY='hidden';
body.style.display='flex';
body.style.flexDirection='column';
body.innerHTML=`<div class="modal-tabs">
  <div id="ctTabEN" class="modal-lang-tab modal-lang-tab-bordered modal-lang-tab-animated" style="background:#1a1a3a;color:#ffd700;border-color:#4a4a8a" onclick="switchCtTab('EN')">English</div>
  <div id="ctTabJP" class="modal-lang-tab modal-lang-tab-bordered modal-lang-tab-animated" style="background:#224;color:#888;border-color:#333" onclick="switchCtTab('JP')">日本語</div>
  </div>
  <div style="padding: 12px 16px;overflow-y: auto;flex: 1;">
  <div id="ctListEN" style="display: block;">${htmlEN}</div>
  <div id="ctListJP" style="display: none;">${htmlJP}</div>
  </div>
  `;
modal.style.display='flex';
switchCtTab(DISPLAY_LANG!=='EN'?'JP':'EN');
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
const spawnList=getSpawnList(envType,floorMR);
if(spawnList.length)appendSpawnMonsterOptions(monSel,spawnList,X.mainFmt);
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
const MODAL_TAB_KEYS=['TW','EN','JP','SP'];
const MODAL_THEMES={
gold:['#ffd700','#4a4a8a','#224','#888','#333'],
cyan:['#0ff','#4a4a8a','#224','#888','#333'],
teal:['#0ca','#055','#001a1a','#598','#033'],
};
const MODAL_CONFIGS={
chest:{id:'chestModal',prefix:'ct',theme:MODAL_THEMES.gold},
disclaimer:{id:'disclaimerModal',prefix:'disc',theme:MODAL_THEMES.gold},
h1:{id:'h1Modal',prefix:'h1',theme:MODAL_THEMES.cyan},
h2:{id:'h2Modal',prefix:'h2',theme:MODAL_THEMES.cyan},
h3:{id:'h3Modal',prefix:'h3',theme:MODAL_THEMES.teal},
};
function switchTab(prefix,lang,activeColor,activeBorder,inactiveBg,inactiveColor,inactiveBorder){
MODAL_TAB_KEYS.forEach(key=>{
let tab=document.getElementById(prefix+'Tab'+key);
let list=document.getElementById(prefix+'List'+key);
if(!tab||!list)return;
if(key===lang){
tab.style.background='#1a1a3a';tab.style.color=activeColor;tab.style.borderColor=activeBorder;list.style.display='block';
}else{
tab.style.background=inactiveBg;tab.style.color=inactiveColor;tab.style.borderColor=inactiveBorder;list.style.display='none';
}
});
}
function openModal(modalId,tabPrefix,activeColor,activeBorder,inactiveBg,inactiveColor,inactiveBorder){
const modal=document.getElementById(modalId);
if(modal){
modal.style.display='flex';
const targetLang=['TW','EN','JP'].includes(DISPLAY_LANG)?DISPLAY_LANG:'TW';
switchTab(tabPrefix,targetLang,activeColor,activeBorder,inactiveBg,inactiveColor,inactiveBorder);
}
}
function switchConfiguredModalTab(configKey,lang){
const config=MODAL_CONFIGS[configKey];
switchTab(config.prefix,lang,...config.theme);
}
function openConfiguredModal(configKey){
const config=MODAL_CONFIGS[configKey];
openModal(config.id,config.prefix,...config.theme);
}
function closeConfiguredModal(configKey){
document.getElementById(MODAL_CONFIGS[configKey].id).style.display='none';
}
function closeChestModal(){closeConfiguredModal('chest');}
function switchCtTab(lang){switchConfiguredModalTab('chest',lang);}
function openDisclaimerModal(){openConfiguredModal('disclaimer');}
function closeDisclaimerModal(){closeConfiguredModal('disclaimer');}
function switchDisclaimerTab(lang){switchConfiguredModalTab('disclaimer',lang);}
function openh1Modal(){openConfiguredModal('h1');}
function closeh1Modal(){closeConfiguredModal('h1');}
function switchH1Tab(lang){switchConfiguredModalTab('h1',lang);}
function openh2Modal(){openConfiguredModal('h2');}
function closeh2Modal(){closeConfiguredModal('h2');}
function switchH2Tab(lang){switchConfiguredModalTab('h2',lang);}
function openh3Modal(){openConfiguredModal('h3');}
function closeh3Modal(){closeConfiguredModal('h3');}
function switchH3Tab(lang){switchConfiguredModalTab('h3',lang);}
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
window.addEventListener('DOMContentLoaded',()=>{
if(typeof advanceBqCountFeasibility!=='function')return;
const schedule=window.requestIdleCallback
?(fn)=>window.requestIdleCallback(fn,{timeout:200})
:(fn)=>setTimeout(fn,1);
let next=2048;
const step=()=>{
if(advanceBqCountFeasibility(next))return;
next+=2048;
schedule(step);
};
schedule(step);
});
window.addEventListener('DOMContentLoaded',()=>{
function populateDropdownObj(selectId,dataObj,nameIdx1,nameIdx2){
let selectElement=document.getElementById(selectId);
if(!selectElement)return;
Object.keys(dataObj).forEach(key=>{
let item=dataObj[key];
let option=document.createElement("option");
option.value=key;
option.text=`${item[nameIdx1]} ${item[nameIdx2]}`;
selectElement.appendChild(option);
});
}
if(typeof PREFIX_NAMES!=='undefined')populateDropdownObj('cond_prefix',PREFIX_NAMES,0,1);
if(typeof SUFFIX_NAMES!=='undefined')populateDropdownObj('cond_suffix',SUFFIX_NAMES,0,1);
if(typeof LOCALE_NAMES!=='undefined')populateDropdownObj('cond_locale',LOCALE_NAMES,0,1);
if(typeof ENV_NAMES!=='undefined')populateDropdownObj('cond_env',ENV_NAMES,0,1);
if(typeof BOSS_NAMES!=='undefined')populateDropdownObj('cond_boss',BOSS_NAMES,0,2);
const atCountSel=document.getElementById('atConsecutiveCount');
if(atCountSel&&typeof AT_O!=='undefined'){
AT_O.forEach(pair=>{
let opt=document.createElement('option');
opt.value=pair[0];
opt.textContent=pair[1];
atCountSel.appendChild(opt);
});
}
let topIds=["0B5","01B","0B9"];
let seenIds=new Set(topIds);
let envOrder=[1,2,3,4,5];
let sel=document.getElementById('cond_only_mon');
if(sel){
const createOpt=(id)=>{
let opt=document.createElement('option');
let data=MONSTER_DB[id];
opt.value=data.en;
opt.textContent=`${data.en} ${data.jp}`;
return opt;
};
const addSep=()=>{
let s=document.createElement('option');
s.disabled=true;
s.textContent="──────────";
sel.appendChild(s);
};
topIds.forEach(id=>sel.appendChild(createOpt(id)));
addSep();
envOrder.forEach((env,idx)=>{
if(ONLY_MONSTERS[env]){
let added=false;
ONLY_MONSTERS[env].forEach(id=>{
if(id&&!seenIds.has(id)){
seenIds.add(id);
sel.appendChild(createOpt(id));
added=true;
}
});
if(added&&idx<envOrder.length-1)addSep();
}
});
}
initItemI18n();
refreshI18n();
document.querySelectorAll('.lang-sw').forEach(b=>{
if(b.dataset.lang===DISPLAY_LANG){b.style.background='#00A2E8';b.style.color='#fff';b.style.borderColor='#00A2E8';}
});
const srDiv=document.getElementById('searchResults');
if(srDiv&&srDiv.children.length<=1)srDiv.innerHTML='<div style="color:#666;font-size:13px;text-align:center;margin-top:20px;">'+J02+'</div>';
const prefixEl=document.getElementById('cond_prefix');
const suffixEl=document.getElementById('cond_suffix');
const elistEl=document.getElementById('cond_elist');
const onlyMonEl=document.getElementById('cond_only_mon');
const seedInput=document.getElementById('seed');
const rankSelect=document.getElementById('rank');
if(seedInput){
seedInput.addEventListener('keydown',(e)=>{
if(e.key==='Enter')calculate();
});
}
if(rankSelect){
rankSelect.addEventListener('change',()=>{
if(mapData)calculate();
});
}
function initFreeSearchUI(){
const container=document.getElementById('fs_container');
if(!container)return;
let floorOpts=`<option value="0">---</option>`;
for(let i=3;i<=16;i++)floorOpts+=`<option value="${i}">B${i}F</option>`;
let boxOpts=`
    <option value="-1">---</option>
    <option value="0">1</option>
    <option value="1">2</option>
    <option value="2">3${T('rd','(整列)','(整列)')}</option>
    <option value="3">${T('Non-3','非整列','非整列')}</option>
    `;
let rankOpts=`<option value="0">---</option>`;
['S','A','B','C','D','E','F','G','H','I'].forEach((r,idx)=>{rankOpts+=`<option value="${10-idx}">${r}</option>`;});
window.updateFSItems=function(groupId){
let rankSelect=document.getElementById(`fs_r_${groupId}`);
let itemSelect=document.getElementById(`fs_i_${groupId}`);
if(!rankSelect||!itemSelect)return;
let currentVal=itemSelect.value;
let r=parseInt(rankSelect.value);
let itemOpts=`<option value="ANY">---</option>`;
let seen=new Set();
let hasSpecial=false;
if(r===0||r===10){
itemOpts+=`<option value="Sainted soma">${getDispItem("Sainted soma")}</option>`;
seen.add("Sainted soma");
hasSpecial=true;
}
if(r===0||r===9){
itemOpts+=`<option value="Ethereal stone">${getDispItem("Ethereal stone")}</option>`;
seen.add("Ethereal stone");
hasSpecial=true;
}
if(r===0||r===9||r===8){
itemOpts+=`<option value="Rich">${T('Millionaire','大富豪','大富豪')}</option>`;
hasSpecial=true;
}
if(r===0||r===8){
itemOpts+=`<option value="Attribeauty">${getDispItem("Attribeauty")}</option>`;
seen.add("Attribeauty");
hasSpecial=true;
}
if(r===0||r===9){
itemOpts+=`<option value="Metasla">${T('Metal Slime Equips','金屬史萊姆裝備','メタスラ装備')}</option>`;
hasSpecial=true;
}
if(r===0||r===10){
itemOpts+=`<option value="S_wpn">${T('S Weapon','S武器','S武器')}</option>`;
hasSpecial=true;
}
if(hasSpecial){
itemOpts+=`<option disabled>──────</option>`;
}
let validItems=[];
if(typeof TableR!=='undefined'&&typeof TableO!=='undefined'&&typeof TableQ!=='undefined'){
if(r===0){
TableR.forEach(p=>{if(!seen.has(p[0])){seen.add(p[0]);validItems.push(p[0]);}});
}else{
let startIdx=TableO[r-1];
let endIdx=(TableO[r]!==undefined)?TableO[r]:TableQ.length;
for(let i=startIdx;i<endIdx;i++){
let itemName=TableR[TableQ[i]][0];
if(!seen.has(itemName)){seen.add(itemName);validItems.push(itemName);}
}
}
validItems.forEach(en=>{itemOpts+=`<option value="${en}">${getDispItem(en)}</option>`;});
}
itemSelect.innerHTML=itemOpts;
if(itemSelect.querySelector(`option[value="${currentVal}"]`)){
itemSelect.value=currentVal;
}else{
itemSelect.value="ANY";
}
};
for(let i=1;i<=3;i++){
container.innerHTML+=`
      <div style="display:flex;gap:2px;align-items:center;">
      <span style="color:#0ff;font-size:10px;width:10px;text-align:center;">${i}</span>
      <select id="fs_f_${i}" style="width:45px;padding:0;font-size:11px;height:24px;background:#000;color:#0f0;border:1px solid #555;">${floorOpts}</select>
      <select id="fs_b_${i}" style="width:50px;padding:0;font-size:11px;height:24px;background:#000;color:#0f0;border:1px solid #555;">${boxOpts}</select>
      <select id="fs_r_${i}" onchange="updateFSItems(${i})" style="width:40px;padding:0;font-size:11px;height:24px;background:#000;color:#0f0;border:1px solid #555;">${rankOpts}</select>
      <select id="fs_i_${i}" style="flex:1;width:50px;padding:0;font-size:11px;height:24px;background:#000;color:#0f0;border:1px solid #555;text-overflow:ellipsis;"></select>
      <input type="number" id="fs_t_${i}" value="7" min="5" placeholder="sec" style="width:35px;padding:0;font-size:11px;height:24px;background:#000;color:#0f0;border:1px solid #555;text-align:center;">
      </div>`;
}
for(let i=1;i<=3;i++){
updateFSItems(i);
}
}
initFreeSearchUI();
if(typeof initSeedInspectorUI==='function'){initSeedInspectorUI();}
if(typeof initCPUBenchmark==='function'){initCPUBenchmark();}
const urlParams=new URLSearchParams(window.location.search);
const urlId=urlParams.get('id');
if(urlId&&/^[0-9A-Fa-f]{6}$/.test(urlId)){
const urlRank=urlId.substring(0,2).toUpperCase();
const urlSeed=urlId.substring(2,6).toUpperCase();
const rankEl=document.getElementById('rank');
const seedEl=document.getElementById('seed');
const rankVal='0x'+urlRank;
if([...rankEl.options].some(o=>o.value===rankVal)){
rankEl.value=rankVal;
seedEl.value=urlSeed;
}
}
calculate();
});
let isModalDragging=false;
const allModalIds=Object.values(MODAL_CONFIGS).map(config=>config.id);
window.addEventListener('mousedown',(e)=>{
if(allModalIds.includes(e.target.id)){isModalDragging=false;}
else{isModalDragging=true;}
});
window.addEventListener('mouseup',(e)=>{
if(!isModalDragging&&allModalIds.includes(e.target.id)){e.target.style.display='none';}
isModalDragging=false;
});
function exportSearchResults(){
try{
const items=document.querySelectorAll('#searchGrid .search-result-item, #atSearchGrid .search-result-item');
if(items.length===0){
alert(A06);
return;
}
let txtContent="RANK,SEED,"+T('Result','搜尋結果','検索結果')+"\n";
items.forEach(item=>{
let lines=item.innerText.split('\n').map(s=>s.trim()).filter(s=>s!=="");
if(lines.length===0)return;
let firstLine=lines[0];
let seed="";
let rank="--";
let seedMatch=firstLine.match(/^([0-9A-F]{4})/i);
if(seedMatch)seed=seedMatch[1].toUpperCase();
let rankMatch=firstLine.match(/\(Rank\s*([0-9A-F]{2})\)/i);
if(rankMatch)rank=rankMatch[1].toUpperCase();
let resultLines=lines.slice(1).filter(line=>{
if(/Lv\.?\s*\d+/i.test(line))return false;
if(/^(Caves|Ruins|Ice|Water|Fire|洞窟|遺跡|氷|水|火山)$/i.test(line))return false;
return true;
});
let resultText=resultLines.join(" / ");
if(/^(B3F|B4F|B9F|B10F)\s+(Solo|Party|一人旅|即開)/i.test(resultText)||/^B\d+F\s+[⑤⑨]\s*x/.test(resultText)){
const itemName=document.getElementById('searchItem').value;
resultText=`${getDispItem(itemName)} ${resultText}`;
}
let hasD=item.dataset.hasD==="true";
if(hasD){
txtContent+=`${rank},${seed},${resultText},D\n`;
}else{
txtContent+=`${rank},${seed},${resultText}\n`;
}
});
const blob=new Blob([txtContent],{type:'text/plain;charset=utf-8'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
a.download=`DQ9_Search_Results_${new Date().getTime()}.txt`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}catch(error){
alert(A07+error.message);
console.error("匯出錯誤詳細資訊：",error);
}
}
