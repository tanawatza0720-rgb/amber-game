import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,weld,dedup,compactPrimitive,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
const [src,dst,tris]=process.argv.slice(2);
await MeshoptSimplifier.ready;
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(src);
await doc.transform(weld());
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const pos=p.getAttribute('POSITION').getArray(), idx=p.getIndices().getArray();
  const target=Math.min(idx.length,Number(tris)*3);
  const uv=new Float32Array(p.getAttribute('TEXCOORD_0').getArray());
  let [out,err]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(idx),new Float32Array(pos),3,uv,2,[1,1],null,target,0.08,['Permissive']);
  console.log('simplify',idx.length/3,'->',out.length/3,err);
  if(out.length>target*1.3){out=MeshoptSimplifier.simplifySloppy(new Uint32Array(idx),new Float32Array(pos),3,null,target,0.05)[0]||out;console.log('sloppy ->',out.length/3);}
  p.getIndices().setArray(out);
  compactPrimitive(p);
}
for(const m of doc.getRoot().listMaterials()){m.setNormalTexture(null);m.setMetallicRoughnessTexture(null);m.setOcclusionTexture(null);m.setMetallicFactor(0);m.setRoughnessFactor(.8);}
await doc.transform(prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[+process.env.TEX||512,+process.env.TEX||512]}));
doc.getRoot().listExtensionsUsed().forEach(e=>e.dispose());
await io.write(dst,doc);
