#!/usr/bin/env python3
"""เพิ่มกระดูกปีกแบบโซ่ให้ rig ที่มีกระดูกปีกข้างละ 1 ชิ้น (WingL / WingR) เพื่อให้ปีกพลิ้วเป็นคลื่น
ใช้:  python3 tools/rig/wingchain.py srl/sarael_rig.json            (แก้ไฟล์เดิม รันซ้ำไม่ได้ — ถ้ามี WingL2 แล้วจะหยุด)

โครงต่อข้าง (ซ้าย; ขวากลับเครื่องหมาย x):
  Wing ─ Wing2 ─ Wing3 ─ Wing4            โซ่ตามแนวกางปีก (แกนปีก)
   │a1    │a2     │a3     │a4             เส้นเปลวช่วงกลาง (ลูกของแกนปีกแต่ละท่อน)
   │b1    │b2     │b3     │b4             ปลายเส้นเปลว (ลูกของ a)
          └ t                             ยอดปีกที่ชี้ขึ้น
น้ำหนักเดิมของ Wing ถูกแบ่งให้กระดูกใหม่ตามตำแหน่ง (ไล่นุ่มระหว่างท่อนข้างเคียง) น้ำหนักกระดูกลำตัวไม่ถูกแตะ
ท่า Mixamo ไม่ขยับกระดูกเหล่านี้ — โค้ดเกม (meshy_rig.js) ขยับเอง
"""
import sys, os, json, base64, numpy as np
path = sys.argv[1]
X0, SEG = 0.14, 0.22                       # โคนปีก (|x|) และความกว้างของแต่ละท่อน
SPAN = [(0.14, 1.17, -0.12), (0.36, 1.15, -0.17), (0.58, 1.10, -0.24), (0.80, 1.02, -0.32)]
FA = [(0.25, 0.90, -0.14), (0.47, 0.90, -0.20), (0.69, 0.90, -0.28), (0.91, 0.90, -0.37)]
FB = [(0.25, 0.60, -0.18), (0.47, 0.60, -0.24), (0.69, 0.60, -0.31), (0.91, 0.62, -0.39)]
TOP = (0.36, 1.26, -0.13)
YA = (0.95, 0.78)   # เหนือค่าแรก = แกนปีกล้วน · ใต้ค่าหลัง = เส้นเปลว a ล้วน
YB = (0.66, 0.50)   # a → b
YT = (1.22, 1.34)   # แกนปีก → ยอดปีก

g = json.load(open(path))
buf = bytearray(base64.b64decode(g['buffers'][0]['uri'].split(',', 1)[1]))
nodes, skin = g['nodes'], g['skins'][0]
name = lambda i: nodes[i].get('name', '')
if any(name(j).endswith('WingL2') for j in skin['joints']): sys.exit('มีกระดูกโซ่ปีกอยู่แล้ว')
def view(ai, dt, n):
    a = g['accessors'][ai]; bv = g['bufferViews'][a['bufferView']]
    return np.frombuffer(buf, dtype=dt, count=a['count'] * n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], n)
prim = g['meshes'][nodes[[i for i, n in enumerate(nodes) if 'skin' in n][0]]['mesh']]['primitives'][0]['attributes']
P = view(prim['POSITION'], np.float32, 3).copy(); J = view(prim['JOINTS_0'], np.uint16, 4).copy(); W = view(prim['WEIGHTS_0'], np.float32, 4).copy()
nj = len(skin['joints'])
ibm = view(skin['inverseBindMatrices'], np.float32, 16).copy()
world = {skin['joints'][k]: -ibm[k, 12:15] for k in range(nj)}   # rig นี้ไม่มีการหมุนในท่าตั้งต้น: IBM = เลื่อนอย่างเดียว
assert np.allclose(ibm[:, :12].reshape(nj, 3, 4)[:, :, :3], np.eye(3), atol=1e-5), 'rig มีการหมุนในท่าตั้งต้น สคริปต์นี้ไม่รองรับ'

def add(nm, parent, pos):
    i = len(nodes); pos = np.array(pos, np.float32)
    nodes.append({'name': nm, 'translation': [float(v) for v in pos - world[parent]]})
    nodes[parent].setdefault('children', []).append(i)
    world[i] = pos; skin['joints'].append(i); return len(skin['joints']) - 1

sm = lambda e0, e1, v: (lambda t: t * t * (3 - 2 * t))(np.clip((v - e0) / (e1 - e0), 0, 1))
out = {}
for side, sx in (('L', 1), ('R', -1)):
    root = [k for k in range(nj) if name(skin['joints'][k]).endswith('Wing' + side)]
    assert len(root) == 1, 'ไม่พบกระดูก Wing' + side
    rj = root[0]; rn = skin['joints'][rj]; pre = name(rn)
    m = lambda p: (sx * p[0], p[1], p[2])
    span = [rj]; sn = [rn]
    for k in (1, 2, 3):
        span.append(add(pre + str(k + 1), sn[-1], m(SPAN[k]))); sn.append(len(nodes) - 1)
    fa, fb = [], []
    for k in range(4):
        fa.append(add('%sa%d' % (pre, k + 1), sn[k], m(FA[k]))); an = len(nodes) - 1
        fb.append(add('%sb%d' % (pre, k + 1), an, m(FB[k])))
    top = add(pre + 't', sn[1], m(TOP))
    out[side] = dict(rj=rj, span=span, fa=fa, fb=fb, top=top)

nJ = len(skin['joints'])
D = np.zeros((len(P), nJ), np.float32)                 # น้ำหนักแบบตารางเต็ม แล้วค่อยตัดเหลือ 4
for c in range(4): np.add.at(D, (np.arange(len(P)), J[:, c]), W[:, c])
for side, sx in (('L', 1), ('R', -1)):
    o = out[side]; w = D[:, o['rj']].copy(); idx = np.where(w > 0)[0]; D[idx, o['rj']] = 0
    x = sx * P[idx, 0]; y = P[idx, 1]; w = w[idx]
    u = np.clip((x - X0) / SEG - .5, 0, 3); c0 = np.floor(u).astype(int); c1 = np.minimum(c0 + 1, 3); t = sm(0, 1, u - c0)
    a = sm(YA[0], YA[1], y); b = sm(YB[0], YB[1], y); tp = sm(YT[0], YT[1], y)
    lv = [(np.array(o['span']), (1 - a) * (1 - tp)), (np.array(o['fa']), a * (1 - b)), (np.array(o['fb']), a * b)]
    for arr, lw in lv:
        np.add.at(D, (idx, arr[c0]), w * lw * (1 - t)); np.add.at(D, (idx, arr[c1]), w * lw * t)
    D[idx, o['top']] += w * tp
# ---- เกลี่ยน้ำหนักตรงรอยต่อปีก–ลำตัว ----
# โมเดล Tripo เป็นผิวก้อนเดียว เส้นเปลวปีกเชื่อมกับผ้า/ลำตัวหลายจุด ถ้าน้ำหนักเปลี่ยนกะทันหัน หน้าตรงรอยต่อจะยืดเป็นแผ่นตอนปีกขยับ
# → รวมจุดที่ตำแหน่งซ้ำ (ตะเข็บ UV) แล้วเฉลี่ยน้ำหนักกับจุดข้างเคียงซ้ำๆ เฉพาะบริเวณใกล้รอยต่อ
HOPS, ITER, LAM = int(os.environ.get('HOPS', 14)), int(os.environ.get('ITER', 120)), 0.5
Fc = view(g['meshes'][nodes[[i for i, n in enumerate(nodes) if 'skin' in n][0]]['mesh']]['primitives'][0]['indices'], np.uint32, 1).reshape(-1, 3).copy()
_, inv, cnt = np.unique(np.round(P, 5), axis=0, return_inverse=True, return_counts=True); inv = inv.ravel(); nw = len(cnt)
Dw = np.zeros((nw, nJ), np.float32); np.add.at(Dw, inv, D); Dw /= cnt[:, None]
Fw = inv[Fc]; ea = np.r_[Fw[:, 0], Fw[:, 1], Fw[:, 2], Fw[:, 1], Fw[:, 2], Fw[:, 0]]; eb = np.r_[Fw[:, 1], Fw[:, 2], Fw[:, 0], Fw[:, 0], Fw[:, 1], Fw[:, 2]]
e = np.unique(np.stack([ea, eb], 1), axis=0); ea, eb = e[:, 0], e[:, 1]; deg = np.bincount(ea, minlength=nw).astype(np.float32)
wingJ = sorted(set(sum([[o['rj']] + o['span'] + o['fa'] + o['fb'] + [o['top']] for o in out.values()], [])))
f = Dw[:, wingJ].sum(1); mask = (f > .02) & (f < .98)
edge = np.abs(f[ea] - f[eb]) > .25; mask[ea[edge]] = True; mask[eb[edge]] = True
for _ in range(HOPS):
    nb = np.zeros(nw, bool); nb[eb[mask[ea]]] = True; mask |= nb
for _ in range(ITER):
    S = np.zeros_like(Dw); np.add.at(S, ea, Dw[eb]); S /= np.maximum(deg, 1)[:, None]
    Dw[mask] = (1 - LAM) * Dw[mask] + LAM * S[mask]
D = Dw[inv]
# ตัดเหลือ 4 กระดูกต่อจุด (ข้อจำกัดของ three r128): น้ำหนักที่ถูกตัดไม่ทิ้ง แต่โอนให้กระดูกที่เหลือ "กลุ่มเดียวกัน" (ลำตัว / ปีกซ้าย / ปีกขวา)
# เพื่อให้สัดส่วนปีก:ลำตัวต่อเนื่องระหว่างจุดข้างเคียง (ถ้าเฉลี่ยคืนทุกกระดูก รอยต่อจะกระโดดแล้วหน้ายืด)
order = np.argsort(-D, axis=1)[:, :4]
W2 = np.take_along_axis(D, order, 1)
grp = np.zeros(nJ, int)
for gi, o in enumerate(out.values()): grp[[o['rj']] + o['span'] + o['fa'] + o['fb'] + [o['top']]] = gi + 1
og = grp[order]
for gi in range(3):
    lost = D[:, grp == gi].sum(1) - np.where(og == gi, W2, 0).sum(1)
    has = (og == gi).any(1); first = (og == gi).argmax(1); r = np.where(has)[0]
    W2[r, first[r]] += lost[r]
W2[W2 < 1e-4] = 0; W2 /= W2.sum(1, keepdims=True)
J2 = np.where(W2 > 0, order, 0).astype(np.uint16)

def put(ai, arr):
    a = g['accessors'][ai]; bv = g['bufferViews'][a['bufferView']]; o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    b = arr.tobytes(); buf[o:o + len(b)] = b
put(prim['JOINTS_0'], J2); put(prim['WEIGHTS_0'], W2.astype(np.float32))
M = np.tile(np.eye(4, dtype=np.float32).reshape(16), (nJ, 1))
for k, n in enumerate(skin['joints']): M[k, 12:15] = -np.array(world[n], np.float32)
while len(buf) % 4: buf.append(0)
g['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': M.nbytes}); buf += M.tobytes()
g['accessors'].append({'bufferView': len(g['bufferViews']) - 1, 'componentType': 5126, 'count': nJ, 'type': 'MAT4'})
skin['inverseBindMatrices'] = len(g['accessors']) - 1
g['buffers'][0] = {'byteLength': len(buf), 'uri': 'data:application/octet-stream;base64,' + base64.b64encode(bytes(buf)).decode()}
json.dump(g, open(path, 'w'), separators=(',', ':'))
print('กระดูก', nj, '→', nJ, '· จุดที่ใช้กระดูกปีก', int((D[:, nj:] > 0).any(1).sum()), '· อิทธิพลสูงสุดก่อนตัด', int((D > 1e-4).sum(1).max()))
