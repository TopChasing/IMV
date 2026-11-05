#!/usr/bin/env python3
"""把 Whisper 逐词时间和歌词按拼音对齐，重写 audio-data.js 里每个字的开唱时间。
- 括号里的中文翻译（你需要安全感、怎么样呢、药、治病）没人唱：时间记 -1，播放器当注释显示
- （唉）是叹气，算唱的
- 对不上的字在相邻的对上的字之间按权重插值；整句都对不上的保留原来的估算
用法：python tools/align_lyrics.py lyrics.js review/whisper.json mv/audio-data.js
"""
import json, re, sys
from pypinyin import lazy_pinyin

lyr_p, wh_p, ad_p = sys.argv[1:4]
L = json.loads(open(lyr_p, encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
W = json.load(open(wh_p, encoding="utf-8"))
raw = open(ad_p, encoding="utf-8").read()
A = json.loads(raw.split("=", 1)[1].strip().rstrip(";"))

def py(ch):
    if re.match(r"[\u4e00-\u9fff]", ch): return lazy_pinyin(ch)[0]
    return ch.lower()

# Whisper 一个字一个 token（中文按字拆、时间在词里均分；英文按词）
wt = []
for s in W:
    for a, b, w in s["w"]:
        w = w.strip()
        if not w: continue
        if re.search(r"[\u4e00-\u9fff]", w):
            cs = [c for c in w if re.match(r"[\u4e00-\u9fff]", c)]
            for k, c in enumerate(cs): wt.append((a + (b - a) * k / len(cs), py(c)))
        else:
            for k, part in enumerate(re.findall(r"[A-Za-z]+", w)): wt.append((a, part.lower()))

# 歌词 token：中文每字一个，英文每词一个（挂在词首字母上）
lt = []   # (行, 字下标, 拼音或词, 是否要唱)
for li, (a, b, txt) in enumerate(L):
    sung = True; i = 0; chars = list(txt)
    depth = 0
    while i < len(chars):
        c = chars[i]
        if c in "（(":
            inner = re.match(r"[（(]([^）)]*)[）)]", txt[i:]); depth = 1
            sung = bool(inner and inner.group(1).strip() == "唉")
            i += 1; continue
        if c in "）)": depth = 0; sung = True; i += 1; continue
        if re.match(r"[\u4e00-\u9fff]", c): lt.append([li, i, py(c), sung]); i += 1; continue
        m = re.match(r"[A-Za-z]+", txt[i:])
        if m: lt.append([li, i, m.group(0).lower(), sung]); i += len(m.group(0)); continue
        i += 1

def sim(x, y):
    if x == y: return 2.0
    if len(x) > 1 and len(y) > 1 and (x[1:] == y[1:] or x[:2] == y[:2]): return 0.8   # 韵母或声母相近
    return -1.0

# 只对要唱的 token 做全局对齐（DP，限制在歌词时间附近的带内）
S = [t for t in lt if t[3]]
n, m = len(S), len(wt)
NEG = -1e9
import numpy as np
D = np.full((n + 1, m + 1), NEG); D[0, :] = 0; D[:, 0] = np.arange(n + 1) * -0.4
P = np.zeros((n + 1, m + 1), dtype=np.int8)
for i in range(1, n + 1):
    li = S[i - 1][0]; la, lb = L[li][0] - 1.5, L[li][1] + 1.5
    for j in range(1, m + 1):
        best, bp = D[i - 1, j] - 0.4, 1           # 歌词这个字没被识别出来
        v = D[i, j - 1] - 0.15                    # 识别多出来的字
        if v > best: best, bp = v, 2
        t = wt[j - 1][0]
        if la <= t <= lb:
            v = D[i - 1, j - 1] + sim(S[i - 1][2], wt[j - 1][1])
            if v > best: best, bp = v, 3
        D[i, j], P[i, j] = best, bp
i, j = n, int(np.argmax(D[n])); match = {}
while i > 0 and j > 0:
    if P[i, j] == 3:
        if sim(S[i - 1][2], wt[j - 1][1]) > 0: match[i - 1] = wt[j - 1][0]
        i -= 1; j -= 1
    elif P[i, j] == 1: i -= 1
    else: j -= 1
print(f"对上 {len(match)}/{n} 个要唱的字")

# 每个 token 定时间。实测：LRC 句首是准的，Whisper 每句第一个词常提前 0.7–1 秒（把句前空白算进来）。
# 所以句首钉在 LRC，句内用 Whisper 的先后；超出 [句首-0.05, 句尾+0.25] 或倒退的识别时间丢掉
times = [None] * n
for k, t in match.items():
    li = S[k][0]
    if L[li][0] - 0.05 <= t <= L[li][1] + 0.25: times[k] = t
first = {}
for k in range(n): first.setdefault(S[k][0], k)
for li, k in first.items():
    times[k] = L[li][0] if times[k] is None or times[k] < L[li][0] + 0.02 else times[k]
    times[k] = L[li][0]
lastk = {}
for k in range(n): lastk[S[k][0]] = k
for k in range(1, n):   # 去掉倒退的锚点
    if times[k] is not None and S[k][0] == S[k - 1][0]:
        prev = next((times[x] for x in range(k - 1, first[S[k][0]] - 1, -1) if times[x] is not None), None)
        if prev is not None and times[k] <= prev + 0.04 and k != first[S[k][0]]: times[k] = None
# 句尾没对上：用这句时间窗里 Whisper 最后一个词的开头（真正唱完的地方），而不是 LRC 句尾
wends = [(w[0], w[1]) for s0 in W for w in s0["w"] if w[2].strip()]
for li, k in lastk.items():
    if times[k] is not None or k == first[li]: continue
    a0, b0 = L[li][0], L[li][1]
    # 只认"大半落在这句时间里"的 Whisper 片段（避免把下一句提前识别的词算进来）
    segs = [s0 for s0 in W if s0["w"] and (min(b0, s0["b"]) - max(a0, s0["a"])) > 0.4 * max(0.2, s0["b"] - s0["a"])]
    inside = [w[0] for s0 in segs for w in s0["w"] if w[2].strip() and w[0] >= a0 + 0.2]
    times[k] = max(inside) if inside else max(b0 - 0.35, L[li][0] + 0.18 * (k - first[li]))
    times[k] = max(times[k], L[li][0] + 0.12 * (k - first[li]))
for k in range(n):
    if times[k] is not None: continue
    l = next((x for x in range(k - 1, -1, -1) if times[x] is not None and S[x][0] == S[k][0]), None)
    r = next((x for x in range(k + 1, n) if times[x] is not None and S[x][0] == S[k][0]), None)
    li, ci = S[k][0], S[k][1]; est = A["chars"][li][ci]
    if l is not None and r is not None: times[k] = times[l] + (times[r] - times[l]) * (k - l) / (r - l)
    elif l is not None: times[k] = max(times[l] + 0.18 * (k - l), est)
    elif r is not None: times[k] = min(times[r] - 0.18 * (r - k), est)
    else: times[k] = est
for k in range(1, n):   # 单调
    if S[k][0] == S[k - 1][0] and times[k] < times[k - 1]: times[k] = times[k - 1] + 0.05

chars = [[-1] * len(l[2]) for l in L]
tok = {(t[0], t[1]): k for k, t in enumerate(S)}
for li, (a, b, txt) in enumerate(L):
    last = a
    for ci, c in enumerate(txt):
        if (li, ci) in tok: last = round(times[tok[(li, ci)]], 2); chars[li][ci] = last
        elif re.match(r"[A-Za-z ]", c) and ci > 0 and chars[li][ci - 1] != -1 and not any((li, x) in tok and False for x in [ci]):
            chars[li][ci] = chars[li][ci - 1]   # 英文词里后面的字母跟词首一起亮
        elif c in "（(" and ci + 1 < len(txt) and (li, ci + 1) in tok: chars[li][ci] = round(times[tok[(li, ci + 1)]], 2)
        elif c in "）)" and chars[li][ci - 1] != -1: chars[li][ci] = chars[li][ci - 1]
        elif c in " ，," and ci > 0: chars[li][ci] = chars[li][ci - 1]
    # 英文词：后面的字母在词首到下一个 token 之间逐个亮
    for ci, c in enumerate(txt):
        if (li, ci) in tok and re.match(r"[A-Za-z]", c):
            mm = re.match(r"[A-Za-z]+", txt[ci:]); w = len(mm.group(0)); t0 = chars[li][ci]
            nxt = next((chars[li][x] for x in range(ci + w, len(txt)) if (li, x) in tok), min(t0 + 0.4, b))
            for q in range(1, w): chars[li][ci + q] = round(t0 + (nxt - t0) * q / w * 0.8, 2)
A["chars"] = chars
A["start"] = [round(min([t for t in c if t >= 0] or [L[i][0]]), 2) for i, c in enumerate(chars)]
open(ad_p, "w", encoding="utf-8").write("window.AUDIO = " + json.dumps(A, separators=(",", ":")) + ";\n")
for i, (a, b, txt) in enumerate(L, 1):
    st = A["start"][i - 1]
    print(f"{i:2d} srt {a:7.2f}  实唱 {st:7.2f} ({st - a:+.2f})  " + ("⚠" if abs(st - a) > 0.5 else ""))
