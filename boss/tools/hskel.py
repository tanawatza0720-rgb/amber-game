import numpy as np, scipy.sparse as sp, scipy.sparse.csgraph as cg
P=np.fromfile('hyd_pos.bin',dtype=np.float32).reshape(-1,3).astype(np.float64)
I=np.fromfile('hyd_pos.bin.idx',dtype=np.uint32).reshape(-1,3)
# weld by position
key=np.round(P/2e-4).astype(np.int64); _,wid,inv=np.unique(key,axis=0,return_index=True,return_inverse=True); inv=inv.ravel()
W=P[wid]; T=inv[I]; n=len(W)
e=np.vstack([T[:,[0,1]],T[:,[1,2]],T[:,[2,0]]]); L=np.linalg.norm(W[e[:,0]]-W[e[:,1]],axis=1)
G=sp.coo_matrix((np.r_[L,L],(np.r_[e[:,0],e[:,1]],np.r_[e[:,1],e[:,0]])),shape=(n,n)).tocsr()
nc,lab=cg.connected_components(G); print('welded',n,'components',nc,np.bincount(lab)[:10])
np.save('hyd_W.npy',W); np.save('hyd_inv.npy',inv); sp.save_npz('hyd_G.npz',G)
