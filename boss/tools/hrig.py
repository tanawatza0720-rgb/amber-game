import numpy as np, scipy.sparse as sp, scipy.sparse.csgraph as cg, json, base64
W=np.load('hyd_W.npy'); G=sp.load_npz('hyd_G.npz'); inv=np.load('hyd_inv.npy')
J={k:np.array(v) for k,v in json.load(open('hyd_joints.json')).items()}
bones=[]  # name,parent,pos, seg(a,b)
def add(n,par,pos,a,b): bones.append(dict(n=n,p=par,pos=np.array(pos,float),a=np.array(a,float),b=np.array(b,float))); return n
s=J['spine']
add('root',None,s[2],s[1],s[3])
add('hips','root',s[1],s[0],s[1])
add('chest','root',s[3],s[3],s[4])
def chain(pre,par,pts,tipExt=0.0):
    prev=par
    for i in range(len(pts)-1):
        prev=add(f'{pre}{i}',prev,pts[i],pts[i],pts[i+1])
    end=pts[-1]; d=pts[-1]-pts[-2]; d/=np.linalg.norm(d)
    add(f'{pre}{len(pts)-1}',prev,end,end,end+d*tipExt)
chain('tail','hips',J['tail'],0.02)
chain('tailB','hips',J['tail2'],0.02)
for k in ['black','gold','red','white','blue','grey']:
    chain('n_'+k,'chest',J['neck_'+k],0.0 if k=='grey' else 0.07)
for sgn,nm in [(1,'L'),(-1,'R')]:
    w=J['wing%+d'%sgn]; chain('w'+nm,'chest',w,0.0)
    chain('m'+nm,'w'+nm+'0',J['memb%+d'%sgn],0.0)
    chain('a'+nm,'chest',J['armF%+d'%sgn],0.03)
    chain('l'+nm,'hips',J['legH%+d'%sgn],0.03)
N=len(bones); print('bones',N)
A=np.array([b['a'] for b in bones]); B=np.array([b['b'] for b in bones])
AB=B-A; L2=np.maximum((AB**2).sum(1),1e-12)
t=np.clip(((W[:,None,:]-A[None])*AB[None]).sum(2)/L2[None],0,1)
Dseg=np.linalg.norm(W[:,None,:]-(A[None]+t[...,None]*AB[None]),axis=2)  # n x N
def rad(n):
    if n in('root','hips','chest'): return 0.11
    if n.startswith('tail'): return max(0.07-0.012*int(n[-1]),0.01)
    if n[0] in 'al' and n[1] in 'LR': return 0.045 if n[2] in '01' else 0.02
    if n.startswith('n_'): return 0.04 if n.endswith('4') else 0.025
    return 0.01
R=np.array([rad(b['n']) for b in bones]); Dseg=np.maximum(Dseg-R[None],0)
near=Dseg.argmin(1)
S=np.full((len(W),N),np.inf)
for b in range(N):
    seeds=np.where((near==b)&(Dseg[:,b]<0.07))[0]
    if len(seeds)==0: seeds=np.array([Dseg[:,b].argmin()])
    g=cg.dijkstra(G,indices=seeds,min_only=True,limit=0.2)
    S[:,b]=g+0.3*Dseg[:,b]
bad=~np.isfinite(S).any(1); S[bad]=Dseg[bad]*3; print('fallback',bad.sum())
idx=np.argsort(S,1)[:,:4]; sv=np.take_along_axis(S,idx,1)
w=1/(sv+0.006)**4; w[~np.isfinite(sv)]=0; w/=w.sum(1,keepdims=True)
# smooth a bit over mesh neighbours (dense per-bone weights)
Wd=np.zeros((len(W),N)); np.put_along_axis(Wd,idx,w,1)
Adj=(G>0).astype(float); deg=np.asarray(Adj.sum(1)).ravel()
for _ in range(3): Wd=0.5*Wd+0.5*(Adj@Wd)/deg[:,None]
idx=np.argsort(-Wd,1)[:,:4]; w=np.take_along_axis(Wd,idx,1); w/=w.sum(1,keepdims=True)
# per original (unwelded) vertex
I4=idx[inv].astype(np.uint8); W4=np.round(w[inv]*255).astype(np.int32)
W4[:,0]+=255-W4.sum(1); W4=W4.astype(np.uint8)
print('dominant bone counts',{bones[b]['n']:int(c) for b,c in zip(*np.unique(idx[:,0],return_counts=True))})
out=dict(bones=[dict(n=b['n'],p=b['p'],x=np.round(b['pos'],4).tolist()) for b in bones],
         skin=base64.b64encode(np.hstack([I4,W4]).tobytes()).decode())
json.dump(out,open('race/hydra_rig.json','w'))
np.save('hyd_dom.npy',idx[:,0])
import os;print('json KB',os.path.getsize('race/hydra_rig.json')//1024)
