#!/usr/bin/env python3
"""网易云 .lrc -> music-mv 要的 lyrics.srt。

    python tools/lrc2srt.py "songs/xxx.lrc" -o projects/xxx/lyrics.srt [--audio song.mp3] [--tail 4]

- 跳过网易云的 JSON 署名行（{"t":..,"c":[..]}）和 [ar:]/[ti:] 这类标签
- 每句结束 = 下一句开始 - 0.05s；空时间行当作这一句的终止点
- 最后一句：给了 --audio 就用音频时长封顶，否则开始 + --tail 秒
- 只打印统计，不打印歌词（版权）
"""
import argparse
import json
import re
import subprocess
import sys

TS = re.compile(r"\[(\d+):(\d+)(?:[.:](\d{1,3}))?\]")


def to_sec(m):
    mm, ss, frac = m.group(1), m.group(2), m.group(3) or "0"
    return int(mm) * 60 + int(ss) + int(frac) / (10 ** len(frac))


def fmt(t):
    t = max(t, 0)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def audio_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True).stdout.strip()
    return float(out) if out else None


def parse(path):
    events = []  # (t, text)；text == "" 表示终止点
    credits = 0
    for raw in open(path, encoding="utf-8-sig").read().splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("{"):
            try:
                json.loads(line)
                credits += 1
                continue
            except ValueError:
                pass
        stamps = list(TS.finditer(line))
        if not stamps:
            continue  # [ar:] [ti:] 等标签
        text = TS.sub("", line).strip()
        for m in stamps:  # 一行多时间戳（副歌复用）各算一句
            events.append((to_sec(m), text))
    events.sort(key=lambda e: e[0])
    return events, credits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lrc")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--audio", help="用音频时长给最后一句封顶")
    ap.add_argument("--tail", type=float, default=4.0, help="没给音频时最后一句持续几秒")
    ap.add_argument("--gap", type=float, default=0.05, help="句与句之间留的空隙")
    a = ap.parse_args()

    events, credits = parse(a.lrc)
    end_cap = audio_duration(a.audio) if a.audio else None
    cues = []
    for i, (t, text) in enumerate(events):
        if not text:
            continue
        if i + 1 < len(events):
            end = events[i + 1][0] - a.gap
        else:
            end = t + a.tail
            if end_cap:
                end = min(end, end_cap)
        if end <= t:
            end = t + 0.3
        cues.append((t, end, text))

    with open(a.out, "w", encoding="utf-8") as f:
        for n, (s, e, text) in enumerate(cues, 1):
            f.write(f"{n}\n{fmt(s)} --> {fmt(e)}\n{text}\n\n")

    longest = max((e - s for s, e, _ in cues), default=0)
    print(f"写出 {len(cues)} 句 -> {a.out}；跳过署名行 {credits}；"
          f"{fmt(cues[0][0]) if cues else '-'} ~ {fmt(cues[-1][1]) if cues else '-'}；最长一句 {longest:.1f}s")
    if longest > 12:
        print("注意：有一句超过 12 秒，多半是间奏前最后一句被拉长了，做分镜时按实际演唱结束点截断", file=sys.stderr)


if __name__ == "__main__":
    main()
