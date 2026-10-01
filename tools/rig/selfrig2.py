import numpy as np,json,base64,os,sys,scipy.sparse as sp,scipy.sparse.linalg as sla
try:
    import trimesh
except ImportError:
    import glbmini as trimesh  # ไม่มี trimesh ก็ใช้ตัวอ่าน glb แบบง่าย
from PIL import Image
name,body,wpn,jfile,outdir,key=sys.argv[1:7]
J={k:np.array(v) for k,v in json.load(open(jfile)).items()}
PAR={'Hips':None,'Spine':'Hips','Spine1':'Spine','Spine2':'Spine1','Neck':'Spine2','Head':'Neck','HeadTop_End':'Head',
 'LeftShoulder':'Spine2','LeftArm':'LeftShoulder','LeftForeArm':'LeftArm','LeftHand':'LeftForeArm','LeftHandMiddle4':'LeftHand',
 'RightShoulder':'Spine2','RightArm':'RightShoulder','RightForeArm':'RightArm','RightHand':'RightForeArm','RightHandMiddle4':'RightHand',
 'LeftUpLeg':'Hips','LeftLeg':'LeftUpLeg','LeftFoot':'LeftLeg','LeftToeBase':'LeftFoot','LeftToe_End':'LeftToeBase',
 'RightUpLeg':'Hips','RightLeg':'RightUpLeg','RightFoot':'RightLeg','RightToeBase':'RightFoot','RightToe_End':'RightToeBase'}
NAMES=list(PAR.keys()); IDX={n:i for i,n in enumerate(NAMES)}
END={'HeadTop_End','LeftHandMiddle4','RightHandMiddle4','LeftToe_End','RightToe_End'}
KIDS={n:[k for k,p in PAR.items() if p==n] for n in NAMES}
SKIN=[n for n in NAMES if n not in END]
m=trimesh.load(body,force='mesh'); s=1.7/m.vertices[:,1].max()
V=m.vertices*s; F=m.faces; UV=m.visual.uv.copy(); NRM=m.vertex_normals.copy()
# merged graph
key3=np.round(V*2e4).astype(np.int64); _,grp,inv=np.unique(key3,axis=0,return_index=True,return_inverse=True); inv=inv.ravel(); G=inv.max()+1
GV=np.zeros((G,3)); GV[inv]=V
E=np.vstack([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]); E=inv[E]; E=E[E[:,0]!=E[:,1]]; E=np.unique(np.sort(E,1),axis=0)
w=1/np.maximum(np.linalg.norm(GV[E[:,0]]-GV[E[:,1]],axis=1),1e-4)
A=sp.coo_matrix((np.r_[w,w],(np.r_[E[:,0],E[:,1]],np.r_[E[:,1],E[:,0]])),shape=(G,G)).tocsr()
L=sp.diags(np.asarray(A.sum(1)).ravel())-A
# bone segments (skin bones: from joint to first child / or end)
def seg(n):
    a=J[n]; ks=[k for k in KIDS[n]]
    if n in('Hips',): b=J['Spine']
    elif n=='Spine2': b=J['Neck']
    elif ks: b=J[ks[0]]
    else: b=a
    return a,b
def segd(P,a,b):
    ab=b-a;t=np.clip(((P-a)@ab)/max(ab@ab,1e-9),0,1);return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
D=np.stack([segd(GV,*seg(n)) for n in SKIN],1)
RAD={'Spine':.21,'Spine1':.21,'Spine2':.2,'Hips':.2,'Neck':.13,'Head':.16,'LeftShoulder':.12,'RightShoulder':.12,'LeftUpLeg':.16,'RightUpLeg':.16,'LeftLeg':.13,'RightLeg':.13,'LeftFoot':.12,'RightFoot':.12}
RAD.update({'LeftArm':.075,'RightArm':.075,'LeftForeArm':.06,'RightForeArm':.06,'LeftHand':.045,'RightHand':.045,'LeftToeBase':.06,'RightToeBase':.06})
Rv=np.array([RAD.get(n,.1) for n in SKIN]); Dr=D-Rv
inside=Dr.min(1)<0
Dn=D/Rv
near=Dn.argmin(1); dmin=D[np.arange(len(D)),near]
Hd=np.where(inside,1.0/np.maximum(dmin,.01)**2,1e-3/np.maximum(dmin,.01)**2)
# ties: bones within 1.05*dmin share
dnm=Dn.min(1); Pm=(Dn<=dnm[:,None]*1.08+1e-6).astype(float); Pm/=Pm.sum(1,keepdims=True)
CLOTH=os.environ.get('CLOTH')
if CLOTH:
    tex=Image.open(CLOTH).convert('RGB'); T=np.asarray(tex).astype(float)/255; th,tw,_=T.shape
    px=np.clip((UV[:,0]%1)*tw,0,tw-1).astype(int); py=np.clip((1-UV[:,1]%1)*th,0,th-1).astype(int)
    Cc=T[py,px]; wv=(Cc.min(1)>.55)&(Cc.max(1)-Cc.min(1)<.2)
    wg=np.zeros(G); np.add.at(wg,inv,wv.astype(float)); cnt=np.bincount(inv,minlength=G); wg=wg/np.maximum(cnt,1)>.5
    cloth=wg&(Dn.min(1)>float(os.environ.get('CLOTH_K','1.0')))
    cloth|=(Dn.min(1)>float(os.environ.get('FAR_K','1.6')))&(GV[:,1]<1.25)
    if os.environ.get('NOCLOTH_X'):cloth&=np.abs(GV[:,0])<float(os.environ['NOCLOTH_X'])  # มือสีซีด ไม่ใช่ผ้า
    y=GV[:,1]; tgt=np.zeros((G,len(SKIN)))
    def put(mask,n,val): tgt[mask,SKIN.index(n)]+=val[mask] if hasattr(val,'__len__') else val
    one=np.ones(G)
    f2=np.clip((y-1.1)/.15,0,1); put(cloth,'Spine2',f2)
    f1=np.clip(1-np.abs(y-1.05)/.12,0,1)*(1-f2); put(cloth,'Spine1',f1)
    rest=1-f2-f1
    lg=np.clip((.9-y)/.7,0,.45)*rest
    legR=np.linalg.norm(GV[:,[0,2]]-J['RightUpLeg'][[0,2]],axis=1)<np.linalg.norm(GV[:,[0,2]]-J['LeftUpLeg'][[0,2]],axis=1)
    put(cloth&legR,'RightUpLeg',lg); put(cloth&~legR,'LeftUpLeg',lg)
    put(cloth,'Hips',rest-lg)
    hr=np.zeros(G); np.add.at(hr,inv,((Cc[:,0]>.5)&(Cc[:,0]-Cc[:,2]>.12)&(Cc[:,1]<Cc[:,0])).astype(float)); hair=(hr/np.maximum(cnt,1)>.5)&(Dn.min(1)>float(os.environ.get('HAIR_K','.9')))&(y>1.0)
    hair&=~cloth|(y>1.1)
    if os.environ.get('NOCLOTH_X'):hair&=np.abs(GV[:,0])<float(os.environ['NOCLOTH_X'])  # สีผิวที่มือไม่ใช่ผม
    tgt[hair]=0; fh=np.clip((y-1.2)/.2,0,1)
    put(hair,'Head',fh); put(hair,'Neck',(1-fh)*.35); put(hair,'Spine2',(1-fh)*.65)
    cloth=cloth|hair; print('hair groups',hair.sum())
    Pm[cloth]=tgt[cloth]/np.maximum(tgt[cloth].sum(1,keepdims=True),1e-9)
    Hd[cloth]=1/.05**2
    print('cloth groups',cloth.sum(),'of',G)
# BOX: บังคับน้ำหนักในกล่อง เช่น ผ้าคาดเอว/หาง ให้ตามสะโพก  [{"min":[x,y,z],"max":[x,y,z],"w":{"Hips":.7,"Spine":.3}}]
for bx in json.loads(os.environ.get('BOX','[]')):
    mk=np.all((GV>=np.array(bx['min']))&(GV<=np.array(bx['max'])),1)
    t=np.zeros(len(SKIN))
    for n,v in bx['w'].items():t[SKIN.index(n)]=v
    Pm[mk]=t/t.sum();Hd[mk]=1/.05**2;print('box',mk.sum())
M=(L+sp.diags(Hd)).tocsc(); lu=sla.splu(M)
W=np.stack([lu.solve(Hd*Pm[:,j]) for j in range(len(SKIN))],1)
W=np.clip(W,0,None); W[W<.01]=0
top=np.argsort(-W,1)[:,:4]; tw=np.take_along_axis(W,top,1); tw/=np.maximum(tw.sum(1,keepdims=True),1e-9)
JI=np.array([[IDX[SKIN[t]] for t in row] for row in top],dtype=np.uint16)[inv]; JW=tw.astype(np.float32)[inv]
if os.environ.get('CUT'):
    keep=np.ones(len(F),bool)
    for sd in ['Left','Right']:
        ids=[IDX[sd+'ForeArm'],IDX[sd+'Hand']]
        aw=(JW*np.isin(JI,ids)).sum(1); fa=aw[F]; keep&=~((fa.max(1)-fa.min(1))>float(os.environ.get('CUT')))
    print('cut faces',(~keep).sum()); F=F[keep]
# DROP: ลบหน้าที่ทุกจุดอยู่ในกล่อง (เช่น ผ้าห้อยใต้แขนที่ขยับแล้วดูแปลก)  [{"min":[..],"max":[..]}]
for bx in json.loads(os.environ.get('DROP','[]')):
    inb=np.all((V>=np.array(bx['min']))&(V<=np.array(bx['max'])),1); F=F[~inb[F].all(1)]; print('drop -> faces',len(F))
print('verts',len(V),'groups',G,'inside',inside.mean().round(2))
# ---- glTF
BIN=bytearray(); j={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[],'meshes':[],'accessors':[],'bufferViews':[],'buffers':[],'skins':[],
   'materials':[{'name':'body','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.8}},{'name':'weapon','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.55,'roughnessFactor':.35}}],
   'images':[{'uri':'baseColor.jpg','mimeType':'image/jpeg'}],'textures':[{'source':0,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987}]}
def acc(arr,typ,ct,target=None,mm=False):
    while len(BIN)%4: BIN.append(0)
    off=len(BIN); BIN.extend(arr.tobytes()); bv={'buffer':0,'byteOffset':off,'byteLength':arr.nbytes}
    if target: bv['target']=target
    j['bufferViews'].append(bv); a={'bufferView':len(j['bufferViews'])-1,'componentType':ct,'count':int(arr.shape[0]) if arr.ndim>1 else int(arr.size),'type':typ}
    if mm: a['min']=arr.min(0).tolist(); a['max']=arr.max(0).tolist()
    j['accessors'].append(a); return len(j['accessors'])-1
uvg=UV.astype(np.float32).copy(); uvg[:,1]=1-uvg[:,1]
pa=acc(V.astype(np.float32),'VEC3',5126,34962,True); na=acc(NRM.astype(np.float32),'VEC3',5126,34962); ua=acc(uvg,'VEC2',5126,34962)
ja=acc(JI,'VEC4',5123,34962); wa=acc(JW,'VEC4',5126,34962); ia=acc(F.astype(np.uint32).ravel(),'SCALAR',5125,34963)
j['meshes'].append({'name':'body','primitives':[{'attributes':{'POSITION':pa,'NORMAL':na,'TEXCOORD_0':ua,'JOINTS_0':ja,'WEIGHTS_0':wa},'indices':ia,'material':0}]})
# nodes: 0 root, 1 body mesh, then bones
j['nodes'].append({'name':'RootNode','children':[1]}); j['nodes'].append({'name':'body','mesh':0,'skin':0})
base=2; 
for n in NAMES:
    p=PAR[n]; t=(J[n]-(J[p] if p else 0)).tolist(); j['nodes'].append({'name':'mixamorig:'+n,'translation':t})
for n in NAMES:
    ch=[base+IDX[k] for k in KIDS[n]]
    if ch: j['nodes'][base+IDX[n]]['children']=ch
j['nodes'][0]['children'].append(base+IDX['Hips'])
IBM=np.stack([np.array([[1,0,0,0],[0,1,0,0],[0,0,1,0],[-J[n][0],-J[n][1],-J[n][2],1]],dtype=np.float32).ravel() for n in NAMES])
ib=acc(IBM,'MAT4',5126)
j['skins'].append({'joints':[base+IDX[n] for n in NAMES],'inverseBindMatrices':ib,'skeleton':base+IDX['Hips']})
# weapon prop
WTEX=None
if wpn!='-':
    wm=trimesh.load(wpn,force='mesh'); wv0=wm.vertices-wm.vertices.mean(0); ext=np.ptp(wm.vertices,0).max()
    wv=(wv0*(float(os.environ.get('WLEN','1.3'))/ext)+J['RightHand']).astype(np.float32); wuv=wm.visual.uv.astype(np.float32).copy(); wuv[:,1]=1-wuv[:,1]
    WTEX=getattr(wm.visual,'image',None)
    if WTEX is not None:
        j['images'].append({'uri':'weapon.jpg','mimeType':'image/jpeg'}); j['textures'].append({'source':1,'sampler':0})
        j['materials'][1]['pbrMetallicRoughness']['baseColorTexture']={'index':1}
if wpn!='-':
    wp=acc(wv,'VEC3',5126,34962,True); wn=acc(wm.vertex_normals.astype(np.float32),'VEC3',5126,34962); wu=acc(wuv,'VEC2',5126,34962); wi=acc(wm.faces.astype(np.uint32).ravel(),'SCALAR',5125,34963)
    j['meshes'].append({'name':'weapon_prop','primitives':[{'attributes':{'POSITION':wp,'NORMAL':wn,'TEXCOORD_0':wu},'indices':wi,'material':1}]})
    j['nodes'].append({'name':'weapon_prop','mesh':1}); j['nodes'][0]['children'].append(len(j['nodes'])-1)
else: j['materials'].pop()
# texture: ย่อเป็น TEX px (ค่าเริ่ม 1024) JPEG
TS=int(os.environ.get('TEX','1024'))
bi=getattr(m.visual,'image',None) or getattr(getattr(m.visual,'material',None),'baseColorTexture',None)
os.makedirs(outdir,exist_ok=True)
if bi is not None: bi.convert('RGB').resize((TS,TS),Image.LANCZOS).save(f'{outdir}/baseColor.jpg',quality=85)
if WTEX is not None: WTEX.convert('RGB').resize((TS//2,TS//2),Image.LANCZOS).save(f'{outdir}/weapon.jpg',quality=85)
while len(BIN)%4: BIN.append(0)
j['buffers']=[{'byteLength':len(BIN),'uri':'data:application/octet-stream;base64,'+base64.b64encode(bytes(BIN)).decode()}]
os.makedirs(outdir,exist_ok=True); json.dump(j,open(f'{outdir}/{key}_rig.json','w'),separators=(',',':'))
print('wrote',os.path.getsize(f'{outdir}/{key}_rig.json'))
