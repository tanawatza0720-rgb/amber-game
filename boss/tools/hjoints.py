import numpy as np, scipy.sparse as sp, scipy.sparse.csgraph as cg, json
W=np.load('hyd_W.npy'); G=sp.load_npz('hyd_G.npz')
nv=lambda p:int(np.argmin(np.linalg.norm(W-np.array(p),axis=1)))
def centerline(a,b,n,rad=0.05):
    """geodesic path from surface near a to near b, n+1 points, each replaced by centroid of geodesic patch"""
    s,t=nv(a),nv(b); D,pr=cg.dijkstra(G,indices=s,return_predecessors=True)
    path=[t]
    while path[-1]!=s: path.append(pr[path[-1]])
    path=path[::-1]; L=np.r_[0,np.cumsum(np.linalg.norm(np.diff(W[path],axis=0),axis=1))]
    out=[]
    for k in range(n+1):
        i=int(np.searchsorted(L,L[-1]*k/n)); i=min(i,len(path)-1)
        d=cg.dijkstra(G,indices=path[i],limit=rad); m=np.isfinite(d)
        out.append(W[m].mean(0))
    return np.array(out),L[-1]
def body(xs):
    out=[]
    for x0 in xs:
        m=(np.abs(W[:,0]-x0)<.03)&(W[:,1]>-.32)&(W[:,1]<.02)&(np.abs(W[:,2])<.14)
        out.append(W[m].mean(0))
    return np.array(out)
J={}
J['spine']=body([-0.24,-0.12,0.0,0.12,0.22]).tolist()
heads={'black':[0.172,0.142,0.319],'gold':[0.289,0.002,0.272],'red':[0.44,0.11,0.07],'white':[0.384,-0.01,-0.168],'blue':[0.265,0.185,-0.225]}
for k,h in heads.items():
    base=[0.24,-0.04,np.clip(h[2]*0.35,-.08,.1)]
    c,L=centerline(base,h,4,0.045); J['neck_'+k]=c.tolist(); print(k,'len',round(L,3))
c,L=centerline([-0.22,-0.1,0.0],[-0.48,-0.406,-0.019],6,0.05); J['tail']=c.tolist(); print('tail',round(L,3))
for s,tip,low in [(1,[0.112,0.427,0.254],[-0.2,-0.2,0.45]),(-1,[0.173,0.422,-0.282],[-0.17,-0.16,-0.46])]:
    c,L=centerline([0.08,0.02,0.1*s],tip,3,0.04); J['wing%+d'%s]=c.tolist()
for s in [1,-1]:
    c,_=centerline([0.22,-0.14,0.1*s],[0.343,-0.434,0.17*s],3,0.05); J['armF%+d'%s]=c.tolist()
    c,_=centerline([-0.14,-0.14,0.1*s],[-0.159,-0.438,0.18*s],3,0.05); J['legH%+d'%s]=c.tolist()
for s,low in [(1,[0.021,-0.289,0.401]),(-1,[-0.16,-0.3,-0.399])]:
    c,L=centerline(J['wing%+d'%s][1],low,3,0.035); J['memb%+d'%s]=c.tolist(); print('memb',s,round(L,3))
json.dump(J,open('hyd_joints.json','w'))
for k,v in J.items(): print(k,np.round(v,2).tolist())
