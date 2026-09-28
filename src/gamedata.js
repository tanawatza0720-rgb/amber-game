/* ================= ข้อมูลเกมที่ใช้ร่วมกัน (ฟาร์ม + สนามรบ) =================
   ธาตุ 6 ธาตุ + ตารางแพ้ทาง และสกิลของทุกสายพันธุ์ (แก้ที่นี่ที่เดียว)
   ระดับ: ทั่วไป 2 สกิล · หายาก 3 สกิล · ตำนาน/เทพเจ้า 3 สกิล + สกิลติดตัว (type:'passive') */
const ELEM={
  'ดิน':{c:'#c8a26a',i:'🪨'}, 'น้ำ':{c:'#5fb3ff',i:'💧'}, 'ลม':{c:'#6fe0b0',i:'🌪️'},
  'ไฟ':{c:'#ff8a3a',i:'🔥'}, 'แสง':{c:'#ffd36a',i:'☀️'}, 'มืด':{c:'#b48cff',i:'🌙'}};
// วงจรธาตุพื้นฐาน: น้ำ > ไฟ > ลม > ดิน > น้ำ (ตัวหน้าชนะตัวถัดไป)
const EL_CYCLE=['น้ำ','ไฟ','ลม','ดิน'];
const EL_ADV=1.3, EL_WEAK=.8, EL_LD=1.5, EL_LD_OVER=1.15, EL_LD_UNDER=.9;
function elMul(a,d){
  if(!a||!d||a===d)return 1;
  const ia=EL_CYCLE.indexOf(a), id=EL_CYCLE.indexOf(d);
  if(ia>=0&&id>=0){if((ia+1)%4===id)return EL_ADV;if((id+1)%4===ia)return EL_WEAK;return 1;}
  if(ia<0&&id<0)return EL_LD;          // แสง ↔ มืด แพ้ทางกันเอง แรงทั้งสองฝั่ง
  return ia<0?EL_LD_OVER:EL_LD_UNDER;  // แสง/มืด ได้เปรียบธาตุพื้นฐานทุกธาตุเล็กน้อย
}
// ข้อความอธิบายธาตุ (ใช้ในคลังมอนสเตอร์)
function elInfo(e){
  const all=Object.keys(ELEM), strong=all.filter(d=>elMul(e,d)>1), weak=all.filter(d=>elMul(d,e)>1&&elMul(e,d)<=1);
  return {strong,weak};
}
const EL_OF={kazemaru:'ลม',kazekiri:'ลม',yorugumo:'มืด',morihime:'ดิน',kuroga:'มืด',hakuneko:'แสง',amateru:'ไฟ'};

/* สกิล: mult = คูณพลังโจมตี · cd = คูลดาวน์ (เทิร์น; เรียลไทม์ ×2.3 วินาที) · stun = โอกาสทำให้มึน
   passive: dmgLow (แรงขึ้นใส่ศัตรูเลือด<50%) · crit (เพิ่มโอกาสคริ) · revive (รอดตาย 1 ครั้ง คืนเลือด %) · teamAtk (ทั้งทีมแรงขึ้น) · dr (รับดาเมจลดลง) */
const SKILLS={
  // ---------- ทั่วไป ----------
  kazemaru:[
    {id:'s1',name:'ฟันดาบไม้',desc:'ฟันศัตรู 1 ตัว 100%',cd:0,type:'melee',mult:1,target:'one'},
    {id:'s2',name:'ดาวกระจายจิ๋ว',desc:'ขว้างดาวกระจายใส่ศัตรูรอบตัว 50% · คูลดาวน์ 3',cd:3,type:'ranged',mult:.5,target:'all'}],
  // ---------- หายาก ----------
  kazekiri:[
    {id:'s1',name:'ฟันเงา',desc:'ฟันศัตรู 1 ตัว 105%',cd:0,type:'melee',mult:1.05,target:'one'},
    {id:'s2',name:'สามดาบวายุ',desc:'ฟัน 3 ครั้ง ครั้งละ 62% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.62,target:'one'},
    {id:'s3',name:'กระโดดฟัน',desc:'ฟาดพื้นใส่ศัตรูรอบจุดตก 80% โอกาส 25% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:.8,target:'all',stun:.25}],
  yorugumo:[
    {id:'s1',name:'เขี้ยวพิษ',desc:'ยกขาหน้าแทงศัตรู 1 ตัว 105%',cd:0,type:'melee',mult:1.05,target:'one'},
    {id:'s2',name:'ลูกแก้วมนตร์ม่วง',desc:'ร่ายลูกแก้วเวทใส่ศัตรูรอบเป้าหมาย 58% · คูลดาวน์ 3',cd:3,type:'ranged',mult:.58,target:'all'},
    {id:'s3',name:'กระโจนใยมรณะ',desc:'กระโจนลงกลางศัตรู 78% โอกาส 30% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:.78,target:'all',stun:.3}],
  morihime:[
    {id:'s1',name:'แทงหอกพงไพร',desc:'แทงศัตรู 1 ตัว 105%',cd:0,type:'melee',mult:1.05,target:'one'},
    {id:'s2',name:'หอกพายุใบไม้',desc:'แทง 3 ครั้ง ครั้งละ 60% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.6,target:'one'},
    {id:'s3',name:'หอกดิ่งฟ้า',desc:'กระโดดปักหอกใส่ศัตรูรอบจุดตก 80% โอกาส 30% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:.8,target:'all',stun:.3}],
  // ---------- ตำนาน ----------
  kuroga:[
    {id:'s1',name:'ฟันเงาจันทร์',desc:'ฟันศัตรู 1 ตัว 120%',cd:0,type:'melee',mult:1.2,target:'one'},
    {id:'s2',name:'คมดาบราตรี',desc:'ฟัน 3 ครั้ง ครั้งละ 82% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.82,target:'one'},
    {id:'s3',name:'ดิ่งฟันสังหาร',desc:'กระโดดฟาดศัตรูรอบจุดตก 105% โอกาส 35% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:1.05,target:'all',stun:.35},
    {id:'s4',name:'สัญชาตญาณนักล่า',desc:'ติดตัว: โจมตีศัตรูที่เลือดต่ำกว่า 50% แรงขึ้น 35%',type:'passive',passive:{dmgLow:.35}}],
  hakuneko:[
    {id:'s1',name:'ฟันตะวันทอง',desc:'ฟันศัตรู 1 ตัว 125%',cd:0,type:'melee',mult:1.25,target:'one'},
    {id:'s2',name:'กรงเล็บเก้าชีวิต',desc:'ฟัน 3 ครั้ง ครั้งละ 80% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.8,target:'one'},
    {id:'s3',name:'ดาบจันทร์เสี้ยว',desc:'กระโดดฟันศัตรูรอบจุดตก 110% โอกาส 30% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:1.1,target:'all',stun:.3},
    {id:'s4',name:'เก้าชีวิต',desc:'ติดตัว: เมื่อเลือดหมดครั้งแรกจะรอดและฟื้นเลือด 35% (1 ครั้งต่อการต่อสู้) · โอกาสคริ +10%',type:'passive',passive:{revive:.35,crit:.1}}],
  // ---------- เทพเจ้า ----------
  amateru:[
    {id:'s1',name:'กรงเล็บเพลิง',desc:'บินโฉบเข้าไปงับศัตรู 1 ตัว 140%',cd:0,type:'melee',mult:1.4,target:'one'},
    {id:'s2',name:'ลมหายใจอัมพร',desc:'พ่นไฟใส่ศัตรูรอบเป้าหมาย 100% · คูลดาวน์ 3',cd:3,type:'ranged',mult:1,target:'all'},
    {id:'s3',name:'ดิ่งฟ้าถล่ม',desc:'บินขึ้นฟ้าแล้วดิ่งลงกระแทกศัตรูรอบจุดตก 150% โอกาส 45% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:1.5,target:'all',stun:.45},
    {id:'s4',name:'หัวใจมังกรอัมพร',desc:'ติดตัว: ทั้งทีมโจมตีแรงขึ้น 15% · อามาเทรุรับดาเมจลดลง 25% · โอกาสคริ +10%',type:'passive',passive:{teamAtk:.15,dr:.25,crit:.1}}]
};
const passiveOf=sp=>{const s=(SKILLS[sp]||[]).find(x=>x.type==='passive');return s?s.passive:null;};
