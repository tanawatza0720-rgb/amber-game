OLD_START="function trailUpdate(){"
OLD_END="function clearTrails(){"
NEW='''function trailUpdate(){
  const a=new THREE.Vector3(), b=new THREE.Vector3(), la=new THREE.Vector3(), lb=new THREE.Vector3();
  for(const tr of TRAILS){
    if(!tr.tip.parent||!tr.m.parent)continue;
    if(!tr.root){let r=tr.tip;while(r.parent&&r.parent!==scene)r=r.parent;tr.root=r;}
    if(tr.root.parent!==scene){tr.m.visible=false;continue;} tr.m.visible=true;
    tr.base.getWorldPosition(a); tr.tip.getWorldPosition(b);
    la.copy(a); lb.copy(b); tr.root.worldToLocal(la); tr.root.worldToLocal(lb);
    const k=tr.root.scale.x||1, sp=tr.prev?lb.distanceTo(tr.prev)*k:0; tr.prev=lb.clone();
    tr.amp+=(Math.min(1,Math.max(0,(sp-.03)*10))-tr.amp)*.3; if(!tr.base.parent.visible)tr.amp=0;
    tr.pts.unshift([la.clone(),lb.clone()]); if(tr.pts.length>tr.N)tr.pts.pop();
    const P=tr.g.attributes.position.array, C=tr.g.attributes.color.array;
    for(let i=0;i<tr.N;i++){const q=tr.pts[Math.min(i,tr.pts.length-1)];const f=.55*(tr.k||1)*tr.amp*Math.pow(1-i/(tr.N-1),tr.k&&tr.k<1?3.2:2.2);
      a.copy(q[0]); b.copy(q[1]); tr.root.localToWorld(a); tr.root.localToWorld(b);
      P.set([a.x,a.y,a.z,b.x,b.y,b.z],i*6);
      C.set([tr.c.r*f*.15,tr.c.g*f*.15,tr.c.b*f*.15,tr.c.r*f,tr.c.g*f,tr.c.b*f],i*6);}
    tr.g.attributes.position.needsUpdate=true; tr.g.attributes.color.needsUpdate=true;
  }
}
'''
def patch(h):
    i=h.index(OLD_START); j=h.index(OLD_END,i)
    return h[:i]+NEW+h[j:]
