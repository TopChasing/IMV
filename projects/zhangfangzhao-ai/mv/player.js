/* 《唉》歌词播放器（画在 UI 层，最上层、不跟镜头动，老电影效果也不影响它）。
   学参考片：框随歌词长短变宽窄、青色细边 + 粉色小角、左边一个粉色音符、暖色画面里换成奶油底。
   比参考片多的：逐字高亮（AUDIO.chars 的时间，正在唱的字跳一下）、关键词上色、真实频谱、全曲进度条和时间、
   音符跟着底鼓跳并飘出小音符、边框上一个亮点一小节绕一圈、底鼓时四个角闪白、换句时框的宽度分三档变。 */
(function () {
  'use strict';
  const TH = {
    cold: { bg: 44, bd: 40, in: 41, cr: 42, on: 8, off: 5, note: 41, cur: 23, ic: 42, eq: [40, 26, 42], pf: 42, tr: 3, dg: 6, run: 8, key: null },
    warm: { bg: 45, bd: 46, in: 47, cr: 43, on: 46, off: 47, note: 47, cur: 43, ic: 43, eq: [15, 25, 43], pf: 43, tr: 47, dg: 46, run: 8, key: 43 },
  };
  const KEYS = [['唉', 42], ['永远', 23], ['眼泪', 40], ['失败', 42], ['碗筷', 23], ['海', 40], ['安全感', 23], ['safe', 23], ['爱', 42], ['自卑', 42], ['亏欠', 42], ['但', 42], ['pill', 40], ['药', 40], ['24岁', 23]];
  const IDLE = '张方钊 - 唉（u say）';
  window.PLAYER_CHARS = IDLE;
  const NOTE = ['...###', '...#.#', '...#.#', '.###.#', '####.#', '.##.##', '....##'];   // 7×6 的音符
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', ':': '000010000010000' };
  function digits(G, str, x, y, c) { for (const ch of str) { const b = DIG[ch]; if (b) for (let i = 0; i < 15; i++) if (b[i] === '1') G.px(x + i % 3, y + Math.floor(i / 3), c); x += ch === ':' ? 3 : 4; } }
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  function wrap(txt) {   // 一行放不下就在最接近中间的空格处折成两行（没有空格就从中间折），返回每行的字符下标范围
    const chars = [...txt], tot = chars.reduce((a, c) => a + (GL[c] ? GL[c].adv : 4), 0);
    if (tot <= 246) return [[0, chars.length]];
    let acc = 0, best = Math.floor(chars.length / 2), bd = 1e9;
    chars.forEach((c, i) => { acc += GL[c] ? GL[c].adv : 4; if (c === ' ' || /[，。）]/.test(c)) { const d = Math.abs(acc - tot / 2); if (d < bd) { bd = d; best = i + 1; } } });
    return [[0, best], [best, chars.length]];
  }
  const lineW = (chars, a, b) => { let w = 0; for (let i = a; i < b; i++) w += GL[chars[i]] ? GL[chars[i]].adv : 4; return w; };
  function boxW(txt) { const ch = [...txt]; return clamp(Math.max(...wrap(txt).map(([a, b]) => lineW(ch, a, b))) + 58, 150, 312); }
  function hitBar(tf, len = 0.12) { return (window.BOOK ? BOOK.BARS : []).some((b) => tf >= b && tf < b + len); }

  function draw(G, s) {
    const tf = q(s), T = (window.BOOK && BOOK.warm(tf)) || memAt(tf) > 0.5 ? TH.warm : TH.cold;
    const cur = lyricAt(s), txt = cur ? cur.txt : IDLE, lines = wrap(txt), chars = [...txt];
    let W = boxW(txt);
    const H = lines.length * 13 + 13;
    if (cur) { const k = Math.floor((tf - cur.a) * 12), prev = cur.i > 0 ? boxW(window.LYRICS[cur.i - 1][2]) : boxW(IDLE); if (k < 3) W = Math.round(lerp(prev, W, (k + 1) / 3)); }
    const hit = hitBar(tf), X = Math.round((LW - W) / 2), Y = 236 - H - (hit ? 1 : 0);
    // 框
    for (let j = -1; j <= H; j++) for (let i = -1; i <= W; i++) {
      const e = Math.min(i, j, W - 1 - i, H - 1 - j);
      G.px(X + i, Y + j, e < 0 ? 0 : e === 0 ? T.bd : T.bg);
    }
    for (const [cx, cy] of [[X, Y], [X + W - 2, Y], [X, Y + H - 2], [X + W - 2, Y + H - 2]]) G.rect(cx, cy, 2, 2, hit ? 8 : T.cr);
    // 边框上的亮点：一小节绕一圈
    { const per = 2 * (W + H - 2), bar = window.BOOK ? BOOK.barFloor(tf) : 0, p = Math.floor(((tf - bar) / 4.085) * per);
      for (let k = 0; k < 5; k++) { let d = (p - k + per * 2) % per, x, y; if (d < W) { x = d; y = 0; } else if (d < W + H - 1) { x = W - 1; y = d - W + 1; } else if (d < 2 * W + H - 2) { x = 2 * W + H - 3 - d; y = H - 1; } else { x = 0; y = per - d; } if (k < 3) G.px(X + x, Y + y, T === TH.warm ? 43 : T.run); } }
    // 音符：底鼓时跳一下
    const eq = window.AUDIO ? AUDIO.eq[clamp(Math.floor(tf * 12), 0, AUDIO.eq.length - 1)] : '0000000';
    const nd = +eq[0] >= 7 ? -1 : 0, nx = X + 6, ny = Y + 4 + nd;
    NOTE.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') G.px(nx + i, ny + j, T.ic); }));
    // 飘出来的小音符：每小节放 3 个
    if (window.BOOK) { const bar = BOOK.barFloor(tf); for (const prevBar of [bar, bar - 4.085]) for (let i = 0; i < 3; i++) { const t0 = prevBar + i * 1.36, u = (tf - t0) / 1.25; if (u < 0 || u >= 1) continue;
      const x = nx + 2 + Math.round(Math.sin(u * 7 + i) * 3) + i * 3, y = Y - 2 - Math.round(u * 15); if (PIX.bt(x, y) < 1 - u * u) { G.px(x, y, T.cr); G.px(x + 1, y, T.cr); G.px(x + 1, y - 1, T.cr); G.px(x + 1, y - 2, T.cr); } } }
    // 频谱 + 峰值点
    const ex = X + W - 26, eh = lines.length * 13 - 2, eb = Y + 3 + eh;
    for (let b = 0; b < 7; b++) {
      const lv = +eq[b], h = Math.round(lv / 9 * eh);
      for (let k = 0; k < h; k++) { const c = T.eq[k < eh * 0.5 ? 0 : k < eh * 0.8 ? 1 : 2]; G.rect(ex + b * 3, eb - 1 - k, 2, 1, c); }
      let pk = 0; if (window.AUDIO) for (let f = 0; f < 8; f++) { const i = Math.floor(tf * 12) - f; if (i >= 0 && AUDIO.eq[i]) pk = Math.max(pk, (+AUDIO.eq[i][b]) - f * 0.8); }
      const py = eb - 1 - Math.round(pk / 9 * eh); if (pk > 0) G.rect(ex + b * 3, py, 2, 1, T.on);
    }
    // 歌词
    const times = cur && window.AUDIO ? AUDIO.chars[cur.i] : null;
    const keyAt = {}; if (cur) for (const [w, c] of KEYS) { let i = txt.indexOf(w); while (i >= 0) { const prefix = [...txt.slice(0, i)].length; for (let k = 0; k < [...w].length; k++) keyAt[prefix + k] = T.key || c; i = txt.indexOf(w, i + 1); } }
    const slide = cur ? Math.max(0, 2 - Math.floor((tf - cur.a) * 12)) : 0;
    lines.forEach(([a, b], li) => {
      let cx = X + 16 + Math.round((W - 58 - lineW(chars, a, b)) / 2), y = Y + 3 + li * 13 + slide;
      for (let i = a; i < b; i++) {
        const ch = chars[i], t = times ? times[i] : 0, note = cur && times && t < 0, sung = !cur || note || tf >= t, age = tf - t;   // note：括号里的翻译，没人唱
        let c = note ? T.note : sung ? (keyAt[i] ?? T.on) : T.off, dy = 0, dx = 0;
        if (cur && !note && sung && age < 0.17) { dy = -1; if (keyAt[i] === undefined) c = T.cur; }
        if (ch === '唉' && cur && !note && sung && age < 0.5) dx = Math.floor(tf * 12) % 2 ? 1 : -1;
        if (!cur) c = T.on;
        G.text(GL, ch, cx + dx, y + dy, c);
        cx += GL[ch] ? GL[ch].adv : 4;
      }
    });
    // 全曲进度条和时间
    const py = Y + H - 5, px0 = X + 6, px1 = X + W - 26, pf = clamp(tf / 158) * (px1 - px0);
    G.rect(px0, py + 1, px1 - px0, 1, T.tr); G.rect(px0, py + 1, Math.round(pf), 1, T.pf); G.rect(px0 + Math.round(pf) - 1, py, 3, 3, hit ? 8 : T.pf);
    digits(G, fmt(clamp(tf, 0, 158)), X + W - 22, py - 1, T.dg);
  }
  window.PLAYER = { draw };
})();
