#!/usr/bin/env python3
"""用 faster-whisper 把歌的人声逐词打时间，存 JSON，给对歌词用。
用法：HF_ENDPOINT=https://hf-mirror.com python tools/whisper_words.py song.mp3 -o review/whisper.json
"""
import argparse
import json
import sys

import os, site
for sp in site.getsitepackages():   # Windows：pip 装的 cuBLAS / cuDNN 要手动加进 DLL 搜索路径
    for sub in ("nvidia/cublas/bin", "nvidia/cudnn/bin", "nvidia/cuda_nvrtc/bin"):
        d = os.path.join(sp, "Lib", "site-packages", sub) if not sp.endswith("site-packages") else os.path.join(sp, sub)
        if os.path.isdir(d): os.add_dll_directory(d); os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("song")
ap.add_argument("-o", "--out", required=True)
ap.add_argument("--model", default="large-v3")
ap.add_argument("--device", default="cuda")
ap.add_argument("--prompt", default="")
a = ap.parse_args()

m = WhisperModel(a.model, device=a.device, compute_type="float16" if a.device == "cuda" else "int8")
import librosa
audio, _ = librosa.load(a.song, sr=16000, mono=True)
segs, info = m.transcribe(audio, language="zh", word_timestamps=True, vad_filter=False, beam_size=5,
                          condition_on_previous_text=False, initial_prompt=a.prompt or None, no_speech_threshold=0.2)
out = []
for s in segs:
    out.append({"a": round(s.start, 2), "b": round(s.end, 2), "t": s.text, "w": [[round(w.start, 2), round(w.end, 2), w.word] for w in (s.words or [])]})
    print(f"{s.start:7.2f} {s.end:7.2f} {s.text}", flush=True)
json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False)
print("done", len(out), file=sys.stderr)
