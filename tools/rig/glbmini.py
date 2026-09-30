# อ่าน .glb แบบง่าย (ใช้แทน trimesh เมื่อติดตั้งไม่ได้): รวมทุก primitive เป็นก้อนเดียว ใช้ transform ของ node
import json,struct,io,numpy as np
from PIL import Image
CT={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def _q2m(q):
    x,y,z,w=q;return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
class _Vis:
    def __init__(s,uv,img):s.uv=uv;s.image=img
class Mesh:
    def __init__(s,V,F,UV,N,img):s.vertices=V;s.faces=F;s.vertex_normals=N;s.visual=_Vis(UV,img)
def load(path,force=None):
    b=open(path,'rb').read();assert b[:4]==b'glTF'
    o=12;js=None;bin_=b''
    while o<len(b):
        ln,ty=struct.unpack('<II',b[o:o+8]);ch=b[o+8:o+8+ln];o+=8+ln
        if ty==0x4E4F534A:js=json.loads(ch)
        else:bin_=ch
    def acc(i):
        a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];dt=CT[a['componentType']];nc=NC[a['type']]
        off=bv.get('byteOffset',0)+a.get('byteOffset',0);st=bv.get('byteStride',0);isz=np.dtype(dt).itemsize*nc
        if st and st!=isz:
            raw=np.frombuffer(bin_,np.uint8,a['count']*st,off).reshape(a['count'],st)[:,:isz].copy();r=raw.view(dt).reshape(a['count'],nc)
        else:r=np.frombuffer(bin_,dt,a['count']*nc,off).reshape(a['count'],nc)
        r=r.astype(np.float64 if dt==np.float32 else np.int64)
        if a.get('normalized') and dt!=np.float32:r=r/np.iinfo(dt).max
        return r
    def local(n):
        M=np.eye(4)
        if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
        M[:3,:3]=_q2m(n.get('rotation',[0,0,0,1]))@np.diag(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
    Vs,Fs,UVs,Ns=[],[],[],[];img=None;base=0
    def walk(i,P):
        nonlocal base,img
        n=js['nodes'][i];W=P@local(n)
        if 'mesh' in n:
            for p in js['meshes'][n['mesh']]['primitives']:
                at=p['attributes'];V=acc(at['POSITION']);V=(W[:3,:3]@V.T).T+W[:3,3]
                N=acc(at['NORMAL']) if 'NORMAL' in at else np.zeros_like(V);N=(np.linalg.inv(W[:3,:3]).T@N.T).T
                N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-9)
                UV=acc(at['TEXCOORD_0']) if 'TEXCOORD_0' in at else np.zeros((len(V),2))
                F=acc(p['indices']).reshape(-1,3) if 'indices' in p else np.arange(len(V)).reshape(-1,3)
                Vs.append(V);Ns.append(N);UVs.append(UV);Fs.append(F+base);base+=len(V)
                if img is None and 'material' in p:
                    t=js['materials'][p['material']].get('pbrMetallicRoughness',{}).get('baseColorTexture')
                    if t:
                        im=js['images'][js['textures'][t['index']]['source']];bv=js['bufferViews'][im['bufferView']]
                        img=Image.open(io.BytesIO(bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB')
        for c in n.get('children',[]):walk(c,W)
    for r in js['scenes'][js.get('scene',0)]['nodes']:walk(r,np.eye(4))
    # glTF uv (v ลงล่าง) → แบบ trimesh (v ขึ้นบน) ให้เหมือน trimesh
    UV=np.concatenate(UVs);UV=np.c_[UV[:,0],1-UV[:,1]]
    return Mesh(np.concatenate(Vs),np.concatenate(Fs),UV,np.concatenate(Ns),img)
