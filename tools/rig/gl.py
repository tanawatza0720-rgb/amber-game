import json,base64,numpy as np
from scipy.spatial.transform import Rotation as Rr
CT={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
class G:
    def __init__(s,f):
        s.f=f;g=s.g=json.load(open(f));s.buf=base64.b64decode(g['buffers'][0]['uri'].split(',',1)[1])
        s.N=g['nodes'];s.par={}
        for i,n in enumerate(s.N):
            for c in n.get('children',[]):s.par[c]=i
    def acc(s,i):
        a=s.g['accessors'][i];bv=s.g['bufferViews'][a['bufferView']];dt=CT[a['componentType']];nc=NC[a['type']]
        off=bv.get('byteOffset',0)+a.get('byteOffset',0);st=bv.get('byteStride',0)
        isz=np.dtype(dt).itemsize*nc
        if st and st!=isz:
            raw=np.frombuffer(s.buf,np.uint8,a['count']*st,off).reshape(a['count'],st)[:,:isz].copy()
            return raw.view(dt).reshape(a['count'],nc)
        return np.frombuffer(s.buf,dt,a['count']*nc,off).reshape(a['count'],nc).astype(np.float64 if dt==np.float32 else np.int64)
    def M(s,i):
        n=s.N[i];m=np.eye(4)
        if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
        m[:3,:3]=Rr.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
    def W(s,i):
        m=s.M(i)
        while i in s.par:i=s.par[i];m=s.M(i)@m
        return m
    def skinned(s):
        mi=[i for i,n in enumerate(s.N) if 'skin' in n][0]
        p=s.g['meshes'][s.N[mi]['mesh']]['primitives'][0]['attributes']
        V=s.acc(p['POSITION']);Jn=s.acc(p['JOINTS_0']);Wt=s.acc(p['WEIGHTS_0'])
        sk=s.g['skins'][s.N[mi]['skin']];joints=sk['joints']
        # rest world positions of verts: mesh node world * V  (bind pose assumed = rest)
        MW=s.W(mi);Vw=(MW[:3,:3]@V.T).T+MW[:3,3]
        return Vw,Jn,Wt,joints,mi
