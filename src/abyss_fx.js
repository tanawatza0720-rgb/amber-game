/* ================= ของใช้ร่วมของขุมนรก (ฟาร์ม farm_portal.js + สนามรบ battle_abyss.js) =================
   shader หลุมดำหมุนวน / ออร่าดำพวยพุ่ง / ควันดำ + มือดำ (geometry รวมชิ้นเดียว สร้างครั้งเดียวแล้วใช้ซ้ำ)
   uniforms ที่ต้องส่ง: {t (เวลา), R (รัศมีวง), ps (ขนาดจุดควัน = ความสูงจอ/2/tan(fov/2))} */
const ABYSS_FX=(()=>{
  const NZ=`float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1.,0.)),f.x),mix(h1(i+vec2(0.,1.)),h1(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}`;
  const VS=`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  // ออร่าดำพวยพุ่ง (วงแหวนรอบนอก เปลวยาวขึ้นด้าน +y ของวง)
  const auraMat=U=>new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:VS,
    fragmentShader:`uniform float t,R;varying vec2 vP;${NZ}
void main(){vec2 p=vP/R;float r=length(p),d=r-1.;float up=max(0.,p.y/r);
  float fl=fbm(vec2(p.x*4.2,p.y*1.3-t*1.8))*.75+fbm(vec2(atan(p.y,p.x)*4.,d*3.-t*1.1))*.45;
  float ext=.16+1.25*pow(up,1.5)+.3*fl;float m=smoothstep(ext,0.,d)*smoothstep(.3,.7,fl+.45*(1.-d/ext));
  vec3 c=mix(vec3(.32,.06,.5),vec3(.015,0.,.03),smoothstep(.0,.45,m));
  gl_FragColor=vec4(c,clamp(m*1.15,0.,.93)*smoothstep(-.1,.02,d));}`});
  // หลุมดำหมุนวน (ตรงกลางทึบ ใช้ซ่อนส่วนของมือที่ยังอยู่ "ในหลุม")
  const discMat=U=>new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:VS,
    fragmentShader:`uniform float t,R;varying vec2 vP;${NZ}
void main(){vec2 p=vP/R;float r=length(p),a=atan(p.y,p.x);
  float sw=a+2.4/(r+.22)-t*.8;vec2 q=vec2(cos(sw),sin(sw))*r*3.;
  float f=fbm(q+vec2(t*.12,0.));float arms=.5+.5*sin(sw*3.+f*5.);
  float st=smoothstep(.42,.95,f*arms+.3*f);float dep=smoothstep(.08,.98,r);
  vec3 c=vec3(.32,.07,.5)*st*dep*.9+vec3(.8,.25,.95)*pow(st,3.)*dep*.55;
  vec2 sq=floor(q*5.);float sp=step(.988,h1(sq))*(.5+.5*sin(t*3.+h1(sq+3.)*20.))*dep;c+=vec3(.75,.55,1.)*sp*.7;
  float rim=exp(-pow((r-1.)*7.,2.));c+=vec3(.55,.14,.85)*rim*(.55+.6*fbm(vec2(a*3.,t*.8)));
  float al=r<1.?1.:(1.-smoothstep(1.,1.12,r))*(.55+.45*f);gl_FragColor=vec4(c,al);}`});
  // ควันดำลอยขึ้นจากขอบวง (points: attribute sd = มุม, เฟส, ความเร็ว)
  const smokeMat=U=>new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,
    vertexShader:`attribute vec3 sd;uniform float t,R,ps;varying float vA;
void main(){float L=fract(t*sd.z+sd.y),a=sd.x;vec3 p=vec3(cos(a)*R,sin(a)*R,.1);
  p.y+=L*R*(.6+.9*max(0.,sin(a))+.3*sin(a*5.));p.x+=sin(L*6.+a*5.)*.5+cos(a)*L*R*.2;
  vA=(1.-L)*smoothstep(0.,.12,L);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(.9+1.8*L)*(R/6.)*ps/-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);float al=smoothstep(.5,.05,d)*vA*.8;if(al<.01)discard;
  gl_FragColor=vec4(mix(vec3(.3,.07,.45),vec3(.01,0.,.02),smoothstep(.45,.12,d)),al);}`});
  function smokePts(U,N){const sd=new Float32Array(N*3);for(let i=0;i<N;i++){sd[i*3]=Math.random()*6.283;sd[i*3+1]=Math.random();sd[i*3+2]=.18+Math.random()*.22;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('sd',new THREE.BufferAttribute(sd,3));
    const p=new THREE.Points(g,smokeMat(U));p.frustumCulled=false;return p;}
  // มือดำ: แขนยาวตามแกน +y (โคนที่ y=0 ปลายเล็บ ~y=2.8) นิ้วเรียวงอ มีเล็บ
  let HG=null;
  function handGeo(){if(HG)return HG;const tmp=new THREE.Group(),parts=[];
    const add=(geo,pos,rot,par)=>{const m=new THREE.Mesh(geo);m.position.set(...pos);if(rot)m.rotation.set(...rot);(par||tmp).add(m);parts.push(m);return m;};
    add(new THREE.CylinderGeometry(.11,.16,1.7,7),[0,.85,0]);
    const palm=add(new THREE.SphereGeometry(.24,8,6),[0,1.9,0]);palm.scale.set(1,1.15,.45);
    [-.15,-.05,.05,.15].forEach((x,i)=>{const len=i===1||i===2?.4:.33;
      const f1=new THREE.Group();f1.position.set(x,2.1,0);f1.rotation.set(.35,0,-x*1.6);tmp.add(f1);
      add(new THREE.CylinderGeometry(.035,.045,len,5),[0,len/2,0],null,f1);
      const f2=new THREE.Group();f2.position.set(0,len,0);f2.rotation.set(.55,0,0);f1.add(f2);
      add(new THREE.CylinderGeometry(.022,.035,len*.85,5),[0,len*.42,0],null,f2);
      add(new THREE.ConeGeometry(.024,.14,4),[0,len*.85+.06,0],null,f2);});
    const th=new THREE.Group();th.position.set(.2,1.82,.02);th.rotation.set(.3,0,-1.0);tmp.add(th);
    add(new THREE.CylinderGeometry(.03,.045,.32,5),[0,.16,0],null,th);add(new THREE.ConeGeometry(.026,.13,4),[0,.38,0],null,th);
    tmp.updateMatrixWorld(true);const P=[],N=[];
    parts.forEach(m=>{const gg=m.geometry.clone().applyMatrix4(m.matrixWorld).toNonIndexed();P.push(...gg.attributes.position.array);N.push(...gg.attributes.normal.array);});
    HG=new THREE.BufferGeometry();HG.setAttribute('position',new THREE.Float32BufferAttribute(P,3));HG.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));HG.computeBoundingSphere();return HG;}
  // วัสดุมือ: ดำ ขอบเรืองม่วง (fresnel) ไม่ต้องใช้ไฟ
  const handMat=U=>new THREE.ShaderMaterial({uniforms:U,
    vertexShader:`varying vec3 vN,vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float t;varying vec3 vN,vV;void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
  gl_FragColor=vec4(vec3(.05,.01,.08)+vec3(.75,.25,1.)*fr*(1.+.3*sin(t*2.)),1.);}`});
  const pointScale=(renderer,camera)=>renderer.domElement.height*.5/Math.tan(camera.fov*Math.PI/360);
  return {NZ,VS,auraMat,discMat,smokeMat,smokePts,handGeo,handMat,pointScale};
})();
