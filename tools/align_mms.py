#!/usr/bin/env python3
"""逐字对齐：分离出来的干净人声 + 每句歌词的拼音，用 torchaudio MMS_FA 做强制对齐，
得到每个字开唱的时间（20 ms 一格），写回 audio-data.js 的 chars / start。

- 一句一句对：窗口 = [这句 LRC 开始 - 0.35, 下一句 LRC 开始 + 0.25]，不会串到别的句子
- 括号里的中文翻译（没人唱）时间记 -1，播放器当淡色注释；（唉）是叹气，算唱的
- 英文词挂在首字母上，后面的字母在这个词的时长里依次亮
- 对齐分数太低的句子保留原来的时间，并打印出来
用法：HTTPS_PROXY=... python tools/align_mms.py lyrics.js review/vocals.wav mv/audio-data.js
"""
import json, re, sys
import numpy as np, librosa, torch, torchaudio
from pypinyin import lazy_pinyin

lyr_p, voc_p, ad_p = sys.argv[1:4]
SHIFT = 0.04  # 实测：MMS 的字起点比人声起音早约 0.04 s（扫偏移，起音强度在 +0.04 处最高）
L = json.loads(open(lyr_p, encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
A = json.loads(open(ad_p, encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
SR = 16000
y, _ = librosa.load(voc_p, sr=SR, mono=True)
OE = librosa.onset.onset_strength(y=y, sr=SR, hop_length=64, n_mels=64, fmax=8000); OE = OE / np.percentile(OE, 99)
fr = lambda t: max(0, int(t * SR / 64))

bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False).eval()
tokenizer, aligner = bundle.get_tokenizer(), bundle.get_aligner()
ROMAN = {"u": "yu"}   # 歌里 u say 唱的是 you say


def roman(w):
    p = lazy_pinyin(w)[0] if re.match(r"[\u4e00-\u9fff]", w) else ROMAN.get(w.lower(), w.lower())
    p = re.sub(r"[^a-z']", "", p.replace("ü", "u"))
    return p or "a"


def tokens(txt):
    """[(字下标, 词, 要唱?)]：中文一字一个，英文一词一个"""
    out, i, sung = [], 0, True
    while i < len(txt):
        c = txt[i]
        if c in "（(":
            m = re.match(r"[（(]([^）)]*)[）)]", txt[i:]); sung = bool(m and m.group(1).strip() == "唉"); i += 1; continue
        if c in "）)": sung = True; i += 1; continue
        if re.match(r"[\u4e00-\u9fff]", c): out.append((i, c, sung)); i += 1; continue
        m = re.match(r"[A-Za-z]+", txt[i:])
        if m: out.append((i, m.group(0), sung)); i += len(m.group(0)); continue
        i += 1
    return out


old = A["chars"]; chars = []; low = []
for li, (a, b, txt) in enumerate(L):
    T = tokens(txt); S = [t for t in T if t[2]]
    ch = [-1.0] * len(txt)
    if not S: chars.append(ch); continue
    nxt = L[li + 1][0] if li + 1 < len(L) else b + 1.5
    a0, b0 = max(0.0, a - 0.35), min(nxt + 0.05, a + 30)   # 窗口不伸进下一句
    wav = torch.tensor(y[int(a0 * SR):int(b0 * SR)], dtype=torch.float32)[None]
    with torch.inference_mode():
        em, _ = model(wav)
    ratio = wav.shape[1] / SR / em.shape[1]
    try:
        spans = aligner(em[0], tokenizer([roman(w) for _, w, _ in S]))
        score = float(np.mean([s.score for sp in spans for s in sp]))
    except Exception as e:
        spans, score = None, 0.0
    if spans is None:
        low.append((li + 1, 0)); chars.append(old[li]); continue
    st = {S[k][0]: a0 + sp[0].start * ratio + SHIFT for k, sp in enumerate(spans)}
    en = {S[k][0]: a0 + sp[-1].end * ratio for k, sp in enumerate(spans)}
    for ci, w, sung in S:
        ch[ci] = st[ci]
        if len(w) > 1:   # 英文词：后面的字母在词的时长里依次亮
            for q in range(1, len(w)): ch[ci + q] = st[ci] + (en[ci] - st[ci]) * q / len(w)
    for ci, c in enumerate(txt):   # 空格、逗号、（唉）的括号跟着前后的字
        if ch[ci] >= 0: continue
        if c in "（(" and ci + 1 < len(txt) and ch[ci + 1] >= 0 and any(t[0] == ci + 1 and t[2] for t in T): ch[ci] = ch[ci + 1]
        elif c in "）)" and ci > 0 and ch[ci - 1] >= 0 and any(t[0] == ci - 1 and t[2] for t in T): ch[ci] = ch[ci - 1]
        elif c in " ，,。" and ci > 0 and ch[ci - 1] >= 0: ch[ci] = ch[ci - 1]
    new = [round(t, 2) if t >= 0 else -1 for t in ch]
    # 这句用哪个版本：看哪个的字更多落在人声起音上（对齐分数低的句子尤其要看）
    zh = [k for k, c in enumerate(txt) if re.match(r"[\u4e00-\u9fff]", c)]
    on = lambda arr: np.mean([OE[fr(arr[k]):fr(arr[k] + 0.03) + 1].max() for k in zh if arr[k] >= 0]) if any(arr[k] >= 0 for k in zh) else 0
    sn, so = on(new), on(old[li])
    if score < 0.15 and so > sn: low.append((li + 1, round(score, 2))); chars.append(old[li]); continue
    chars.append(new); ch = new
    first = min(t for t in ch if t >= 0)
    olds = [t for t in old[li] if t >= 0]
    d = np.mean([abs(x - o) for x, o in zip([t for t in ch if t >= 0], olds)]) if len(olds) == len([t for t in ch if t >= 0]) else float("nan")
    print(f"{li + 1:2d} LRC {a:7.2f}  首字 {first:7.2f} ({first - a:+.2f})  分数 {score:.2f}  起音 新 {sn:.2f} / 旧 {so:.2f}")

# 副歌 "u say （唉）u say u say u say"：四个一样的 u say，对齐模型容易整体错一格（把第 2 个当成第 1 个）。
# 实测结构：第 1 个 u say → 叹气（约 +0.86 s）→ 约 2.06 s 后连着三个 u say。
# 如果首字比 LRC 晚了 0.6 s 以上：第 1 个 u say 取句首附近人声能量的起势，模型找到的往后挪一格。
HOOK = "u say （唉）u say u say u say"
y22 = librosa.resample(y, orig_sr=SR, target_sr=22050)
rms = librosa.feature.rms(y=y22, frame_length=882, hop_length=220)[0]
DB = np.convolve(20 * np.log10(rms / rms.max() + 1e-9), np.ones(3) / 3, "same"); DT = 220 / 22050
def rises(a, b, th=12):
    i0, i1 = int(a / DT), int(b / DT); seg = DB[i0:i1]; res = []
    for k in range(6, len(seg) - 6):
        lo, hi = seg[k - 6:k + 1].min(), seg[k:k + 7].max()
        if hi - lo >= th and hi > -30 and seg[k] - seg[k - 1] >= 1.0:
            t = (i0 + k) * DT
            if res and t - res[-1] < 0.12: continue
            res.append(t)
    return res
for li, (a, b, txt) in enumerate(L):
    if txt != HOOK: continue
    c = chars[li]; first = min(t for t in c if t >= 0)
    if first - a < 0.6: continue
    r = rises(a - 0.2, a + 1.2)
    if not r: continue
    u1 = r[0]; s1 = next((t for t in r[1:] if 0.2 <= t - u1 <= 0.5), u1 + 0.3)
    units = [k for k in range(len(txt)) if txt.startswith("u say", k)]
    olds = [[c[k + q] for q in range(5)] for k in units]
    news = [[u1, u1, s1, s1 + 0.07, s1 + 0.14]] + olds[:3]
    for k, v in zip(units, news):
        for q in range(5): c[k + q] = round(v[q], 2)
    si = txt.index("唉"); c[si - 1] = c[si] = c[si + 1] = round(u1 + 0.86, 2)
    print(f"副歌第 {li + 1} 句错了一格，已修：第 1 个 u say {u1:.2f}")
# 句子之间撞车（多见于只有一个字的句子，被下一句更响的起音吸过去）：首字改取本句范围里第一个人声起势，整句平移
for li in range(len(L) - 1):
    c, cn = chars[li], chars[li + 1]
    if not any(t >= 0 for t in c) or not any(t >= 0 for t in cn): continue
    f0, f1 = min(t for t in c if t >= 0), min(t for t in cn if t >= 0)
    if f0 < f1 - 0.1: continue
    r = rises(L[li][0] - 0.2, f1 - 0.1, th=5)
    if not r: continue
    d = r[0] + SHIFT * 0 - f0
    chars[li] = [round(t + d, 2) if t >= 0 else -1 for t in c]
    print(f"第 {li + 1} 句和下一句撞车，首字挪到 {r[0]:.2f}")
A["chars"] = chars
A["start"] = [round(min([t for t in c if t >= 0] or [L[i][0]]), 2) for i, c in enumerate(chars)]
open(ad_p, "w", encoding="utf-8").write("window.AUDIO = " + json.dumps(A, separators=(",", ":")) + ";\n")
print("保留旧时间的句子：", low or "无")
