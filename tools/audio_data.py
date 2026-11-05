#!/usr/bin/env python3
"""从歌里算出歌词播放器要用的数据，写成 window.AUDIO = {...}（只有数字，不含歌词原文）。

  eq    每 1/12 秒一个 7 位字符串：7 个频段的电平 0-9（低频在前）
  chars 每句歌词里每个字的开唱时间（秒）。LRC 只有句级时间，这里按人声频段的起音强度累积来分配：
        唱得密的地方字走得快，没声音的地方字停住。汉字权重 1，字母 0.45，空格 0.3，标点 0。

用法：python tools/audio_data.py song.mp3 lyrics.js -o mv/audio-data.js
"""
import argparse
import json
import re

import librosa
import numpy as np

FPS = 12
BANDS = [(50, 110), (110, 220), (220, 500), (500, 1100), (1100, 2500), (2500, 5500), (5500, 12000)]


def weight(ch):
    if re.match(r"[\u4e00-\u9fff]", ch):
        return 1.0
    if re.match(r"[A-Za-z0-9]", ch):
        return 0.45
    if ch == " ":
        return 0.3
    return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("song")
    ap.add_argument("lyrics")
    ap.add_argument("-o", "--out", required=True)
    a = ap.parse_args()

    y, sr = librosa.load(a.song, sr=22050, mono=True)
    dur = len(y) / sr

    # 频谱：1/12 秒一格，每个频段按自己的 98 分位归一
    hop = int(sr / FPS)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    lv = []
    for lo, hi in BANDS:
        e = np.log1p(S[(f >= lo) & (f < hi)].mean(0) * 40)
        e = e / (np.percentile(e, 98) + 1e-9)
        lv.append(np.clip(np.round((e ** 2.2) * 9), 0, 9).astype(int))
    lv = np.array(lv).T
    eq = ["".join(str(v) for v in row) for row in lv]

    # 逐字时间：人声频段的起音强度累积
    hop2 = 256
    S2 = np.abs(librosa.stft(y, n_fft=1024, hop_length=hop2))
    f2 = librosa.fft_frequencies(sr=sr, n_fft=1024)
    band = np.log1p(S2[(f2 >= 300) & (f2 < 3500)] * 20)
    on = np.maximum(0, np.diff(band, axis=1, prepend=band[:, :1])).sum(0)
    tt = librosa.frames_to_time(np.arange(len(on)), sr=sr, hop_length=hop2)

    L = json.loads(open(a.lyrics, encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
    out = []
    for la, lb, txt in L:
        m = (tt >= la) & (tt < lb)
        cum = np.cumsum(on[m] + on[m].mean() * 0.25)
        cum = cum / max(cum[-1], 1e-9)
        ts = tt[m]
        ws = [weight(c) for c in txt]
        total = max(sum(ws), 1e-9)
        acc, times = 0.0, []
        for w in ws:
            times.append(round(float(ts[min(np.searchsorted(cum, acc / total), len(ts) - 1)]), 2))
            acc += w
        out.append(times)

    with open(a.out, "w", encoding="utf-8") as fp:
        fp.write("window.AUDIO = " + json.dumps({"fps": FPS, "dur": round(dur, 2), "eq": eq, "chars": out}, separators=(",", ":")) + ";\n")
    print(f"{a.out}: {len(eq)} 格频谱，{len(out)} 句逐字时间")


if __name__ == "__main__":
    main()
