# ภาพตรวจโมเดล: ด้านหน้า (x,y) + ด้านข้าง (z,y) จุดสีจาก texture + จุดข้อต่อ (ถ้ามี)
import sys,json,numpy as np,glbmini
from PIL import Image,ImageDraw
def render(path,out,joints=None,S=520):
    m=glbmini.load(path);V=m.vertices*(1.7/m.vertices[:,1].max());img=np.asarray(m.visual.image).astype(np.uint8);h,w,_=img.shape
    uv=m.visual.uv;px=np.clip((uv[:,0]%1)*w,0,w-1).astype(int);py=np.clip((1-uv[:,1]%1)*h,0,h-1).astype(int);C=img[py,px]
    # จุดกลางหน้าสามเหลี่ยมเพิ่มความหนาแน่น
    F=m.faces;cent=V[F].mean(1);cc=C[F].mean(1).astype(np.uint8)
    P=np.r_[V,cent];CC=np.r_[C,cc]
    W=Image.new('RGB',(S*2,S),(40,40,48));d=ImageDraw.Draw(W)
    sc=S/1.9
    for view,ox in ((0,0),(2,S)):
        depth=P[:,2] if view==0 else -P[:,0]
        o=np.argsort(depth)
        X=(P[o,view]*sc+S/2+ox).astype(int);Y=(S-40-P[o,1]*sc).astype(int)
        for x,y,c in zip(X,Y,CC[o]):d.point((x,y),tuple(int(v) for v in c))
        if joints:
            for k,p in joints.items():
                x=p[view]*sc+S/2+ox;y=S-40-p[1]*sc;col=(255,40,40) if 'Left' in k else (40,160,255) if 'Right' in k else (255,230,0)
                d.ellipse((x-3,y-3,x+3,y+3),fill=col)
    W.save(out)
if __name__=='__main__':
    J=json.load(open(sys.argv[3])) if len(sys.argv)>3 else None
    render(sys.argv[1],sys.argv[2],J)
