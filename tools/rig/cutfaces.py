import sys,json,base64,numpy as np
sys.path.insert(0,'.');from gl import G
src,dst=sys.argv[1],sys.argv[2];poses=sys.argv[3:]
g=G(src);V,Jn,Wt,joints,mi=g.skinned()
prim=g.g['meshes'][g.N[mi]['mesh']]['primitives'][0];F=g.acc(prim['indices']).reshape(-1,3)
bad=np.zeros(len(F),bool)
for pf in poses:
    P=np.array(json.load(open(pf))).reshape(-1,3)
    for a,b in [(0,1),(1,2),(2,0)]:
        l0=np.linalg.norm(V[F[:,a]]-V[F[:,b]],axis=1);l1=np.linalg.norm(P[F[:,a]]-P[F[:,b]],axis=1)
        bad|=(l1-l0>.035)&(l1>2.2*l0)
from PIL import Image
UV=g.acc(prim['attributes']['TEXCOORD_0']);T=np.asarray(Image.open('mrh/baseColor.jpg').convert('RGB')).astype(float)/255;h,w,_=T.shape
C=T[np.clip((UV[:,1]%1)*h,0,h-1).astype(int),np.clip((UV[:,0]%1)*w,0,w-1).astype(int)]
wh=(C.min(1)>.5)&(C.max(1)-C.min(1)<.22); print('white faces',wh[F].all(1).sum())
bad&=~wh[F].any(1)
print('remove',bad.sum(),'of',len(F))
F2=F[~bad].astype(np.uint32).ravel()
buf=bytearray(g.buf)
while len(buf)%4:buf.append(0)
off=len(buf);buf.extend(F2.tobytes())
j=g.g;j['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':F2.nbytes,'target':34963})
j['accessors'].append({'bufferView':len(j['bufferViews'])-1,'componentType':5125,'count':int(F2.size),'type':'SCALAR'})
prim['indices']=len(j['accessors'])-1
j['buffers'][0]['byteLength']=len(buf);j['buffers'][0]['uri']='data:application/octet-stream;base64,'+base64.b64encode(bytes(buf)).decode()
json.dump(j,open(dst,'w'),separators=(',',':'))
