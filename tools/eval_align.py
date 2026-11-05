#!/usr/bin/env python3
"""给逐字时间打分（不用耳朵）：干净人声上，字的开唱时间应该落在音节起音上。
- 起音强度：字时间后 0–40 ms 内人声起音强度的平均（越高越好），和整体往后挪 ±0.12 s 的对照比
- 落在静音：字时间后 120 ms 内人声都很轻（< -32 dB）的比例（越低越好）
用法：python tools/eval_align.py review/vocals.wav lyrics.js a.js [b.js ...]
"""
import json, sys, re, numpy as np, librosa
voc, lyr, *files = sys.argv[1:]
y, sr = librosa.load(voc, sr=22050, mono=True); hop = 128
oe = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, n_mels=64, fmax=8000); oe /= np.percentile(oe, 99)
rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop)[0]; rdb = 20 * np.log10(rms / rms.max() + 1e-9)
fr = lambda t: int(t * sr / hop)
L = json.loads(open(lyr, encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
def score(ts):
    st = np.mean([oe[fr(t):fr(t + 0.04) + 1].max() for t in ts]); sil = np.mean([rdb[fr(t):fr(t + 0.12) + 1].max() < -32 for t in ts]); return st, sil
for f in files:
    A = json.loads(open(f, encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
    ts = [t for li, c in enumerate(A["chars"]) for k, t in enumerate(c) if t >= 0 and re.match(r"[\u4e00-\u9fff]", L[li][2][k])]
    s0, q0 = score(ts); sm, _ = score([t - 0.12 for t in ts]); sp, _ = score([t + 0.12 for t in ts])
    print(f"{f:32s} 起音强度 {s0:.3f}（挪 -0.12s: {sm:.3f}，+0.12s: {sp:.3f}）  落在静音 {q0*100:4.1f}%   字数 {len(ts)}")
