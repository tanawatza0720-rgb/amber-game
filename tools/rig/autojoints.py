# ประมาณตำแหน่งข้อต่อ Mixamo จากโมเดล T-pose (หันหน้า +z, สูง 1.7 หลังปรับขนาด) → joints.json
# ใช้เป็นจุดเริ่ม แล้วตรวจด้วย preview.py และแก้ค่าด้วย OVR (json) ได้
import sys,json,numpy as np,glbmini
path,out=sys.argv[1:3]; OVR=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
m=glbmini.load(path);V=m.vertices*(1.7/m.vertices[:,1].max());H=1.7
x,y,z=V[:,0],V[:,1],V[:,2]
g=lambda k,d:OVR.get(k,d)
# แขน: ปลายนิ้วคือ |x| สูงสุดของจุดที่สูงกว่า 0.6H
up=y>g('armMinY',.6)*H
xt=np.abs(x[up]).max()
band=up&(np.abs(x)>xt*.55)
ys=np.median(y[band]); zs=np.median(z[band])       # ความสูง/ความลึกแนวแขน
# ครึ่งความกว้างลำตัวใต้รักแร้
chest=(np.abs(y-(ys-.09*H))<.02*H)&(np.abs(x)<xt*.5)
tw=np.percentile(np.abs(x[chest]),92) if chest.sum()>20 else .12*H
shx=g('shoulderX',tw*.8); hand=g('handLen',.095*H*(xt/(.5*H)))
wx=xt-hand; ex=shx+(wx-shx)*g('elbowT',.5)
# แกนแขน: เดินจากปลายนิ้วเข้าหาลำตัว เก็บเฉพาะจุดใกล้ความสูงช่วงก่อนหน้า (ไม่หลงไปที่เกราะไหล่)
def armline(sg):
    xs=np.arange(xt-.01*H,shx-.03*H,-.01*H);py=None;pz=None;L=[]
    for xx in xs:
        s=(np.abs(sg*x-xx)<.012*H)&up
        if py is not None:s&=(np.abs(y-py)<.06*H)
        if s.sum()<4:L.append((xx,py,pz));continue
        py=float(np.median(y[s]));pz=float(np.median(z[s]));L.append((xx,py,pz))
    L=[(a,b,c) for a,b,c in L if b is not None];A=np.array(L)
    # แขนตรง: ฟิตเส้นตรงจากช่วงปลายแขน (ไม่รวมเกราะไหล่) แล้วต่อเข้าหาไหล่
    f=A[A[:,0]>shx+(xt-shx)*.35];py=np.polyfit(f[:,0],f[:,1],1);pz=np.polyfit(f[:,0],f[:,2],1)
    return lambda xx:(float(np.polyval(py,xx)),float(np.polyval(pz,xx)))
J={}
for sd,sg in (('Left',1),('Right',-1)):
    # Mixamo: Left = ฝั่ง +x ของตัวละครเมื่อหันหน้า +z
    al=armline(sg)
    for n,xx in (('Arm',shx),('ForeArm',ex),('Hand',wx),('HandMiddle4',xt-.01*H)):
        yy,zz=al(xx);yy=g('armY',yy);J[sd+n]=[sg*xx,yy,zz]
    ys,zs=J[sd+'Arm'][1],J[sd+'Arm'][2]
    J[sd+'Shoulder']=[sg*shx*.35,ys+.01*H,zs-.01*H]
# ลำตัว
hy=g('hipsY',ys*.64); ny=g('neckY',ys+g('neckUp',.035)*H)
def cz(yy,wid=.06):
    s=(np.abs(y-yy)<.02*H)&(np.abs(x)<wid*H)
    if s.sum()<6:return 0.
    lo,hi=np.percentile(z[s],[5,95]);return float(lo+(hi-lo)*g('spineZ',.45))
J['Hips']=[0,hy,cz(hy)]
for i,n in enumerate(['Spine','Spine1','Spine2']):
    yy=hy+(ny-hy)*(i+1)/4.2;J[n]=[0,yy,cz(yy)]
J['Neck']=[0,ny,cz(ny)]
top=y.max();hd=g('headY',ny+g('headUp',.05)*H);J['Head']=[0,hd,cz(hd)];J['HeadTop_End']=[0,top,J['Head'][2]]
# ขา
lx=g('legX',None)
if lx is None:
    s=(y<.25*H)&(y>.08*H);lx=float(np.median(np.abs(x[s])))
ay=g('ankleY',.055*H); uy=hy-g('upLegDown',.04)*H
def legz(yy):
    s=(np.abs(y-yy)<.03*H)&(np.abs(np.abs(x)-lx)<.06*H)
    if s.sum()<6:return 0.
    lo,hi=np.percentile(z[s],[8,92]);return float((lo+hi)/2)
for sd,sg in (('Left',1),('Right',-1)):
    J[sd+'UpLeg']=[sg*lx*.9,uy,cz(uy)]
    ky=(uy+ay)/2;J[sd+'Leg']=[sg*lx,ky,legz(ky)+.01*H]
    J[sd+'Foot']=[sg*lx,ay,legz(ay+.03*H)-.01*H]
    s=(y<.05*H)&(np.abs(np.abs(x)-lx)<.08*H);fz=np.percentile(z[s],97) if s.sum()>5 else .1
    J[sd+'ToeBase']=[sg*lx,.02*H,J[sd+'Foot'][2]+(fz-J[sd+'Foot'][2])*.6]
    J[sd+'Toe_End']=[sg*lx,.02*H,fz]
for k,v in OVR.get('set',{}).items():J[k]=v
json.dump({k:[round(float(a),4) for a in v] for k,v in J.items()},open(out,'w'),indent=0)
print('xt',round(xt,3),'ys',round(ys,3),'tw',round(tw,3),'legX',round(lx,3))
