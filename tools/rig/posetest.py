# ทดสอบน้ำหนักผิว: หมุนกระดูกบางท่อนแล้ว skin แบบ LBS วาดภาพหน้า/ข้าง (ใช้กับ *_rig.json จาก selfrig2.py)
import sys,json,base64,numpy as np
from PIL import Image,ImageDraw
from scipy.spatial.transform import Rotation as R
f,tex,out=sys.argv[1:4]
g=json.load(open(f));buf=base64.b64decode(g['buffers'][0]['uri'].split(',',1)[1])
CT={5126:np.float32,5123:np.uint16,5125:np.uint32};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(i):
    a=g['accessors'][i];bv=g['bufferViews'][a['bufferView']];return np.frombuffer(buf,CT[a['componentType']],a['count']*NC[a['type']],bv['byteOffset']).reshape(a['count'],-1)
pr=g['meshes'][0]['primitives'][0]['attributes'];V=acc(pr['POSITION']).astype(float);UV=acc(pr['TEXCOORD_0']);JI=acc(pr['JOINTS_0']).astype(int);JW=acc(pr['WEIGHTS_0'])
sk=g['skins'][0];jn=sk['joints'];names=[g['nodes'][i]['name'].split(':')[1] for i in jn]
par={};[par.update({c:i for c in n.get('children',[])}) for i,n in enumerate(g['nodes'])]
rest={};
def wpos(i):
    p=np.array(g['nodes'][i].get('translation',[0,0,0]),float)
    while i in par and par[i] in jn:i=par[i];p=p+np.array(g['nodes'][i].get('translation',[0,0,0]))
    return p
P0={n:wpos(i) for n,i in zip(names,jn)}
ROT=json.loads(sys.argv[4]) if len(sys.argv)>4 else {'LeftArm':[0,0,-65],'RightArm':[0,0,65],'LeftForeArm':[0,-60,0],'RightUpLeg':[-50,0,0],'RightLeg':[70,0,0],'Spine1':[0,25,0],'Head':[15,0,0]}
# FK: world transform ของแต่ละกระดูก (หมุนรอบข้อตัวเอง สะสมจากพ่อ)
M={}
order=names
for n,i in zip(names,jn):
    pi=par.get(i);pn=names[jn.index(pi)] if pi in jn else None
    Rl=R.from_euler('xyz',ROT.get(n,[0,0,0]),degrees=True).as_matrix()
    if pn is None:Rw=Rl;T=P0[n]
    else:
        Rp,Tp=M[pn];Rw=Rp@Rl;T=Tp+Rp@(P0[n]-P0[pn])
    M[n]=(Rw,T)
Vs=np.zeros_like(V)
for k in range(4):
    for bi,n in enumerate(names):
        s=JI[:,k]==bi
        if not s.any():continue
        Rw,T=M[n];Vs[s]+=JW[s,k,None]*((V[s]-P0[n])@Rw.T+T)
img=np.asarray(Image.open(tex).convert('RGB'));h,w,_=img.shape
C=img[np.clip((UV[:,1]%1)*h,0,h-1).astype(int),np.clip((UV[:,0]%1)*w,0,w-1).astype(int)]
S=520;W=Image.new('RGB',(S*2,S),(40,40,48));d=ImageDraw.Draw(W);sc=S/1.9
F=acc(g['meshes'][0]['primitives'][0]['indices']).reshape(-1,3).astype(int)
L=np.array([.3,.8,.5]);L/=np.linalg.norm(L)
for view,ox in ((0,0),(2,S)):
    T=Vs[F];nrm=np.cross(T[:,1]-T[:,0],T[:,2]-T[:,0]);nrm/=np.maximum(np.linalg.norm(nrm,axis=1,keepdims=True),1e-9)
    Lv=L if view==0 else np.array([-L[2],L[1],L[0]])
    sh=.45+.55*np.abs(nrm@Lv);col=(C[F].mean(1)*sh[:,None]).clip(0,255).astype(int)
    dep=T[:,:,2].mean(1) if view==0 else -T[:,:,0].mean(1);o=np.argsort(dep)
    for i in o:
        pts=[(T[i,k,view]*sc+S/2+ox,S-40-T[i,k,1]*sc) for k in range(3)];d.polygon(pts,fill=tuple(col[i]))
W.save(out)
