import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import fs from 'fs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(process.argv[2]);const p=doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P=p.getAttribute('POSITION').getArray(),I=p.getIndices().getArray(),UV=p.getAttribute('TEXCOORD_0').getArray();
fs.writeFileSync(process.argv[3],Buffer.from(new Float32Array(P).buffer));fs.writeFileSync(process.argv[3]+'.idx',Buffer.from(new Uint32Array(I).buffer));
const n=doc.getRoot().listNodes().map(n=>[n.getName(),n.getTranslation(),n.getRotation(),n.getScale()]);console.log(P.length/3,I.length/3,JSON.stringify(n));
