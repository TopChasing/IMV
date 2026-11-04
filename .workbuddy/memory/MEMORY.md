# IMV 项目长期笔记

## 定位
- 用 music-mv skill（~/.workbuddy/skills/music-mv，Win-Hao/music-mv@0088b14）给说唱歌曲做代码绘制 MV
- music-mv 不依赖 lemo-opuscar：底层是 HyperFrames + GSAP + p5.js/p5.brush + puppeteer + librosa + ffmpeg

## 环境约定（Windows）
- Python 一律用 `.venv/Scripts/python.exe`（skill 文档里的 `python3` 替换掉）
- 官方源慢/超时：PyPI 走 uv.toml 的腾讯镜像，npm 走 .npmrc 腾讯镜像
- puppeteer-core 装在项目根，用本机 Chrome；render_frames.mjs 在 Windows 已验证可出图
- 显卡 RTX 5070 Ti 16G，后续上 faster-whisper 可用 CUDA

## 目录
- songs/：原始 .ncm + .lrc（.ncm 是网易云版权保护格式，脚本读不了，需用户提供 mp3/flac）
- projects/<ascii-slug>/：每首歌一个工程，按 skill 的文件布局
- tools/lrc2srt.py：网易云 LRC -> lyrics.srt（行级时间，结束=下一句开始）
