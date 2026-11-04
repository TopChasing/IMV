#!/usr/bin/env node
// 从 lyrics.js 里收集所有汉字，到本地 node_modules/hanzi-writer-data 取笔画中线，写成一个 window.HANZI = {字: medians} 的 js。
// 蜡笔风「一笔一笔写歌词」用；不用联网。只打印统计，不打印歌词。
//   node tools/hanzi_medians.mjs projects/xxx/lyrics.js -o projects/xxx/hanzi.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const src = args[0];
const out = args[args.indexOf('-o') + 1];
if (!src || !out || args.indexOf('-o') < 0) { console.error('用法：node tools/hanzi_medians.mjs lyrics.js -o hanzi.js'); process.exit(1); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'node_modules', 'hanzi-writer-data');
const text = fs.readFileSync(src, 'utf8');
const chars = [...new Set([...text].filter((c) => /[\u4e00-\u9fff]/.test(c)))];
const map = {}; const miss = [];
for (const ch of chars) {
  const f = path.join(dataDir, ch + '.json');
  if (fs.existsSync(f)) map[ch] = JSON.parse(fs.readFileSync(f, 'utf8')).medians;
  else miss.push(ch);
}
fs.writeFileSync(out, 'window.HANZI = ' + JSON.stringify(map) + ';\n');
console.log(`汉字 ${chars.length} 个，取到 ${Object.keys(map).length} 个，缺 ${miss.length} 个 -> ${out}`);
