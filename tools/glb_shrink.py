# ย่อไฟล์ GLB จาก Tripo ให้มือถือไหว: เก็บแค่ texture สี (baseColor) ย่อเป็น JPEG ขนาด SIZE px · ตัด normal/metallicRoughness
# ใช้: python3 tools/glb_shrink.py in.glb out.glb [SIZE=1024] [QUALITY=82]
import sys, json, struct, io
from PIL import Image
src, dst = sys.argv[1:3]; SIZE = int(sys.argv[3]) if len(sys.argv) > 3 else 1024; Q = int(sys.argv[4]) if len(sys.argv) > 4 else 82
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
o = 20 + jl; bl = struct.unpack('<I', b[o:o + 4])[0]; bin_ = b[o + 8:o + 8 + bl]
view = lambda i: bin_[j['bufferViews'][i].get('byteOffset', 0):j['bufferViews'][i].get('byteOffset', 0) + j['bufferViews'][i]['byteLength']]
# texture สีที่ใช้จริง
keep_tex = set()
for m in j['materials']:
    pb = m.setdefault('pbrMetallicRoughness', {})
    if 'baseColorTexture' in pb: keep_tex.add(pb['baseColorTexture']['index'])
    pb.pop('metallicRoughnessTexture', None); pb['metallicFactor'] = 0; pb['roughnessFactor'] = .9
    for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture'): m.pop(k, None)
tex_map = {}; new_tex = []; img_map = {}; new_img = []
for ti in sorted(keep_tex):
    t = j['textures'][ti]; ii = t['source']
    if ii not in img_map:
        im = Image.open(io.BytesIO(view(j['images'][ii]['bufferView']))).convert('RGB')
        if max(im.size) > SIZE: im = im.resize((SIZE, SIZE), Image.LANCZOS)
        bio = io.BytesIO(); im.save(bio, 'JPEG', quality=Q, optimize=True)
        img_map[ii] = len(new_img); new_img.append(bio.getvalue())
    t2 = dict(t); t2['source'] = img_map[ii]; tex_map[ti] = len(new_tex); new_tex.append(t2)
for m in j['materials']:
    pb = m['pbrMetallicRoughness']
    if 'baseColorTexture' in pb: pb['baseColorTexture']['index'] = tex_map[pb['baseColorTexture']['index']]
# สร้าง buffer ใหม่: bufferView ของ accessor + รูปใหม่
used = sorted({a['bufferView'] for a in j['accessors'] if 'bufferView' in a})
out = bytearray(); bv_new = []; remap = {}
def push(data, extra):
    global out
    while len(out) % 4: out += b'\0'
    bv = dict(extra); bv['buffer'] = 0; bv['byteOffset'] = len(out); bv['byteLength'] = len(data); out += data; bv_new.append(bv); return len(bv_new) - 1
for vi in used:
    v = j['bufferViews'][vi]; remap[vi] = push(view(vi), {k: v[k] for k in ('byteStride', 'target') if k in v})
for a in j['accessors']:
    if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
j['images'] = [{'mimeType': 'image/jpeg', 'bufferView': push(d, {})} for d in new_img]
j['textures'] = new_tex
if not new_tex: j.pop('textures', None); j.pop('images', None); j.pop('samplers', None)
while len(out) % 4: out += b'\0'
j['bufferViews'] = bv_new; j['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(dst, 'wb').write(glb)
print(dst, len(b), '->', len(glb))
