/* ================= รางวัลทุก 5 ด่าน (อัมพร + ไข่เทพ) =================
   server/migrate_stage_rewards.sql · ป้ายแจ้งบนปุ่มผจญภัย · ป๊อปอัปรับรางวัลเมื่อมีค้าง · ไข่เทพฟักที่ศาลฟักไข่ */
var STG=null;
function stageApply(st){STG=st;const b=$('#bStage');if(!b)return;const n=st?st.pending.length:0;b.hidden=!n;b.textContent=n;}
async function loadStage(){if(NET.mode!=='online')return;try{stageApply(await api('stage_state'));}catch(e){console.warn('stage',e);}}
const stLb=n=>Math.ceil(n/10)+'-'+(((n-1)%10)+1);
function stageRewardRow(){if(!STG)return ['รางวัลทุก 5 ด่าน','อัมพร + ไข่เทพ','#c9b8ff'];
  const nx=STG.next;return ['รางวัลขั้นถัดไป','ด่าน '+stLb(nx.n)+' · 🔶'+nx.amber+' + '+(nx.sure?'ไข่เทพการันตี':'ไข่เทพ'),'#c9b8ff'];}
function godEggAct(){if(!STG)return [];const n=(STG.god_eggs||0)+(STG.god_eggs_sure||0);if(!n)return [];
  return [['🥚 ฟักไข่เทพ ('+n+(STG.god_eggs_sure?' · การันตี '+STG.god_eggs_sure:'')+')',()=>hatch('god',STG.god_eggs_sure?'ไข่เทพการันตี':'ไข่เทพ'),'god']];}
function openStageRewards(){
  if(!STG||!STG.pending.length){toast('ยังไม่มีรางวัลด่านค้างรับ');return;}
  const d=el('div','stRw'),P=STG.pending,amber=P.reduce((a,r)=>a+r.amber,0),sure=P.filter(r=>r.sure).length,eggs=P.length-sure;
  d.append(para('ผ่านทุก 5 ด่านได้รับอัมพรและไข่เทพ · ด่านบอสได้อัมพร ×2 · ทุก 50 ด่านได้ไข่เทพการันตี'));
  const L=el('div','stList');P.slice(0,30).forEach(r=>{const row=el('div','stRow'+(r.boss?' boss':''));row.append(el('b',null,'ด่าน '+stLb(r.n)+(r.boss?' 👑':'')));row.append(el('span',null,'🔶 '+r.amber+' · 🥚 '+(r.sure?'ไข่เทพการันตี':'ไข่เทพ')));L.append(row);});
  if(P.length>30)L.append(el('small',null,'และอีก '+(P.length-30)+' ขั้น'));d.append(L);
  d.append(rows([['รวมอัมพร','+'+fmt(amber),'#ffb347'],['ไข่เทพ',eggs+' ใบ','#e6c8ff'],...(sure?[['ไข่เทพการันตี',sure+' ใบ','#ff8ac4']]:[])]));
  d.append(el('p','frNote','ไข่เทพ: เทพเจ้า 0.8% · ตำนาน 15% · หายาก 84.2% · ฟักได้ที่ศาลฟักไข่'));
  openSheet('รางวัลผ่านด่าน',P.length+' ขั้นรอรับ',d,[['🎁 รับทั้งหมด',async()=>{const r=await act('claim_stage_rewards',{});if(!r)return;stageApply(r.stage);bumpRes('amber');
    toast('ได้รับอัมพร '+fmt(r.amber)+' และไข่เทพ '+(r.eggs+r.sure)+' ใบ! ไปฟักที่ศาลฟักไข่ได้เลย');
    openSheet('รับรางวัลแล้ว!','',(()=>{const x=el('div');x.append(rows([['อัมพร','+'+fmt(r.amber),'#ffb347'],['ไข่เทพ','+'+(r.eggs+r.sure)+' ใบ','#e6c8ff']]));return x;})(),[['🥚 ไปฟักไข่เทพ',()=>{closeSheet();focusBuilding('hatch');},'god'],['ปิด',()=>closeSheet(),'ghost']]);},'gold']]);
}
{let asked=false,shown=false,tries=0;const free=()=>!$('#raidPop')&&$('#sheet').hidden&&!(typeof VISIT!=='undefined'&&VISIT.on)&&!(typeof GD!=='undefined'&&GD.on)&&!document.body.classList.contains('raceOpen')&&!$('#evo:not([hidden])');
  const t=setInterval(()=>{if(typeof entered==='undefined'||!entered||NET.mode!=='online')return;
    if(!asked){asked=true;loadStage();return;}
    if(!STG||shown)return;if(!STG.pending.length||++tries>60){clearInterval(t);return;}
    if(tries>2&&free()){shown=true;clearInterval(t);openStageRewards();}},1500);}
// ดันด่านได้ขณะเปิดเกม: เช็กใหม่ทุก 2 นาที
setInterval(()=>{if(typeof entered!=='undefined'&&entered&&NET.mode==='online'&&document.visibilityState==='visible')loadStage();},120000);
if(/[?&]dbg=1/.test(location.search))window.__stg={get STG(){return STG},get VISIT(){return VISIT},get GD(){return typeof GD!=='undefined'?GD:null},get entered(){return entered},NET};
