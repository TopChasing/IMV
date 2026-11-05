#!/usr/bin/env python3
"""用 Demucs htdemucs 把人声单独分出来（CPU 也行，一首 2–3 分钟的歌约 1–2 分钟）。
音频用 librosa/soundfile 读写，不走 torchaudio 的 IO。
用法：python tools/separate_vocals.py song.mp3 -o review/vocals.wav
"""
import argparse, numpy as np, librosa, soundfile as sf, torch
from demucs.pretrained import get_model
from demucs.apply import apply_model
ap = argparse.ArgumentParser(); ap.add_argument("song"); ap.add_argument("-o", "--out", required=True); a = ap.parse_args()
m = get_model("htdemucs"); m.eval()
y, sr = librosa.load(a.song, sr=m.samplerate, mono=False)
if y.ndim == 1: y = np.stack([y, y])
x = torch.tensor(y, dtype=torch.float32)
ref = x.mean(0); x = (x - ref.mean()) / ref.std()
with torch.no_grad():
    out = apply_model(m, x[None], device="cpu", shifts=1, split=True, overlap=0.25, progress=True)[0]
out = out * ref.std() + ref.mean()
v = out[m.sources.index("vocals")].numpy().T
sf.write(a.out, v, sr); print("vocals ->", a.out, v.shape)
