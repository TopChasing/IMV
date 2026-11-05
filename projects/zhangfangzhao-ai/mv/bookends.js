/* 《唉》全曲的开头（00:00–01:06.87）和结尾（01:57.75–02:38）。分镜见 ../storyboard-full.md。
   设定：这段感情是一个游戏存档。开头读档失败，她从存档里碎掉，他掉进现实，世界被眼泪淹没；
   结尾用游戏界面一句一个画面地清算，最后回到标题画面，只剩"新的开始"。
   和 scene.html 共用画布、调色板、角色和画法。画面只由歌曲时间决定。 */
(function () {
  'use strict';
  const BARS = [0.16, 4.30, 8.43, 12.56, 16.70, 20.83, 24.98, 29.12, 33.25, 37.38, 41.52, 45.65, 49.81, 53.94, 58.07, 62.23, 66.36, 70.50, 74.63, 78.76,
    82.92, 87.05, 91.18, 95.32, 99.47, 103.61, 107.74, 111.87, 116.01, 120.14, 124.27, 128.41, 132.56, 136.70, 140.83, 144.99, 149.12, 153.25, 157.38];
  const barFloor = (t) => { let b = BARS[0]; for (const x of BARS) { if (x <= t) b = x; else break; } return b; };
  const lum = (c) => { const v = PIX.RGB[c] || [0, 0, 0]; return 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]; };
  const near = (ramp, L) => { let best = ramp[0], bd = 1e9; for (const k of ramp) { const d = Math.abs(lum(k) - L); if (d < bd) { bd = d; best = k; } } return best; };
  const CM = PIX.RGB.map((_, c) => near([0, 1, 2, 3, 4, 5, 6, 7, 8], lum(c) * 0.8));              // 变冷
  const WM = PIX.RGB.map((_, c) => near([44, 1, 18, 41, 27, 40, 26], lum(c) * 0.85 + 14));        // 水下
  const SEPIA = PIX.RGB.map((_, c) => near([13, 14, 15, 16, 17, 29], lum(c) * 1.05));
  const WARMER = PIX.RGB.map((_, c) => near([13, 14, 15, 25, 23, 24], lum(c) * 1.2));
  const T1 = PIX.create(LW, LH), T2 = PIX.create(LW, LH), P1 = PIX.create(LW, LH), P2 = PIX.create(LW, LH);
  const hitIn = (tf, list, len = 0.17) => list.some((b) => tf >= b && tf < b + len);
  const after = (tf, list) => list.filter((b) => tf >= b).length;

  // ---------- 字 ----------
  window.BOOK_CHARS = '海边双人游给你一个家一枚戒指一场婚礼一起变老余额不足LV香奈儿劳力士巴黎世家老花手袋链条包手表球鞋￥平/u say唉张方钊继续游戏读取存档新的开始和她第1024天已损坏永远眼泪失败碗筷安全感还差0123456789%爱任务叮嘱按时吃饭别熬夜出门带伞少喝点酒全部完成奖励发送给状态？?我你GAME OVER继续Lv.商店金币不足装备中紫拖鞋未答应词曲pt.1→删除这段是否G';
  function big(G, str, x, y, sc, c, sh) {   // 像素字整数倍放大。sh = [dx, dy, 颜色]：错开的影子
    const draw = (ox, oy, col) => { let cx = ox; for (const ch of str) { const g = GL[ch]; if (!g) { cx += 4 * sc; continue; } for (const [gx, gy] of g.bits) G.rect(cx + gx * sc, oy + gy * sc, sc, sc, col); cx += g.adv * sc; } };
    if (sh) draw(x + sh[0], y + sh[1], sh[2]);
    draw(x, y, c);
  }
  const bigW = (str, sc) => { let w = 0; for (const ch of str) w += (GL[ch] ? GL[ch].adv : 4) * sc; return w; };
  const ctext = (G, str, cx, y, c, sh) => G.text(GL, str, Math.round(cx - G.textW(GL, str) / 2), y, c, sh);
  function panel(G, x, y, w, h, o = {}) {
    const bg = o.bg ?? 44, bd = o.bd ?? 40, cr = o.cr ?? 42;
    G.rect(x - 1, y - 1, w + 2, h + 2, 0); G.rect(x, y, w, h, bd); G.rect(x + 1, y + 1, w - 2, h - 2, bg);
    for (const [cx, cy] of [[x, y], [x + w - 2, y], [x, y + h - 2], [x + w - 2, y + h - 2]]) G.rect(cx, cy, 2, 2, cr);
  }
  function cursor(G, x, y, c = 42) { for (let k = 0; k < 4; k++) G.line(x + k, y + k, x + k, y + 8 - k, c); }
  function shake(G, dx, dy) { T2.B.set(G.B); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.B[y * LW + x] = T2.get(clamp(x - dx, 0, LW - 1), clamp(y - dy, 0, LH - 1)); }
  function shakeAt(G, tf, list, amp = 4) { for (const b of list) { const k = Math.floor((tf - b) * 12); if (k >= 0 && k < 4) { const a = Math.round(amp * (1 - k / 4)) * (k % 2 ? -1 : 1); shake(G, a, Math.round(a / 2)); } } }
  function glitchRows(G, tf, amt) {
    const f = Math.floor(tf * 12); let y = 0, band = 0;
    while (y < LH) { const h = 3 + Math.floor(rnd('gh' + f + band) * 14); if (rnd('ga' + f + band) < amt) { const d = Math.round((rnd('gd' + f + band) - 0.5) * 60); for (let j = y; j < Math.min(LH, y + h); j++) { const row = G.B.slice(j * LW, (j + 1) * LW); for (let x = 0; x < LW; x++) G.B[j * LW + x] = row[(x - d + LW * 2) % LW]; } } y += h; band++; }
  }

  // ---------- 小道具 ----------
  function bowl(G, cx, cy, w, full, light = 1) {   // cy = 碗口
    const r = w / 2, h = w * 0.42;
    G.shape([cx - r - 1, cy - 1, cx + r + 1, cy + h + 1], (x, y) => y >= cy && ((x - cx) / r) ** 2 + ((y - cy) / h) ** 2 <= 1,
      (x, y) => (Math.abs(y - cy - h * 0.34) < Math.max(0.6, w / 60) ? 27 : G.dith([4, 5, 6, 7, 8], (2.6 + light - (x - cx) / r * 1.5 - (y - cy) / h), x, y)), 0);
    G.rect(Math.round(cx - r * 0.26), Math.round(cy + h - 1), Math.round(r * 0.52), Math.max(1, Math.round(w / 30)), 5);
    G.rect(Math.round(cx - r), Math.round(cy), Math.round(w), 1, 8);
    if (full) G.ellipse(cx, cy, r * 0.84, h * 0.34, (x, y) => (y >= cy ? 7 : G.dith([7, 8], 1 - (y - cy) / 3, x, y)), 0);
  }
  function umbrellaP(G, x, y) { G.shape([x - 24, y - 14, x + 24, y + 2], (a, b) => b <= y && ((a - x) / 22) ** 2 + ((b - y) / 13) ** 2 <= 1, (a) => (Math.floor((a - x + 40) / 11) % 2 ? 31 : 43), 0); G.line(x, y - 14, x, y + 20, 7); G.line(x, y + 20, x + 4, y + 23, 7); }
  function photoP(G, x, y) { G.rect(x - 1, y - 1, 34, 30, 0); G.rect(x, y, 32, 28, 8); for (let j = 0; j < 18; j++) for (let i = 0; i < 28; i++) G.px(x + 2 + i, y + 2 + j, G.dith([12, 43, 42, 25, 23], j / 3.8, i, j)); G.ellipse(x + 20, y + 13, 3, 3, 24, null); }
  function phoneP(G, x, y) { G.rect(x - 1, y - 1, 16, 28, 0); G.rect(x, y, 14, 26, 39); G.rect(x + 1, y + 2, 12, 21, 32); G.rect(x + 3, y + 5, 7, 3, 34); G.rect(x + 5, y + 10, 7, 3, 37); G.rect(x + 3, y + 15, 7, 3, 34); }
  function bubble(G, x, y, str, sc, c = 34) {   // 灰色聊天气泡，带小尾巴
    const w = bigW(str, sc) + 10 * sc, h = 13 * sc + 5 * sc;
    G.rect(x + 2, y - 1, w - 4, h + 2, 0); G.rect(x - 1, y + 2, w + 2, h - 4, 0); G.rect(x + 1, y, w - 2, h, c); G.rect(x, y + 1, w, h - 2, c);
    for (let k = 0; k < 3 * sc; k++) G.rect(x - k - 1, y + h - 5 * sc + k, 1, Math.max(1, 3 * sc - k), c);
    big(G, str, x + 5 * sc, y + 2 * sc, sc, 8);
  }
  function teardrop(G, x, y, r) { G.shape([x - r - 1, y - r * 2, x + r + 1, y + r + 1], (a, b) => (b > y ? Math.hypot(a - x, b - y) <= r : Math.abs(a - x) <= r * (1 - (y - b) / (r * 2))), (a, b) => (a < x - r * 0.2 && b > y - r * 0.2 && b < y + r * 0.4 ? 8 : G.dith([41, 27, 40, 26], 2.2 - (b - y) / r, a, b)), 0); }

  // ============================== O1 标题画面：黄昏的海边，存档读取失败 ==============================
  function beachSky(G, tf, dawn) {
    const SKY = dawn ? [3, 4, 12, 5, 42, 25, 23, 24] : [12, 43, 42, 25, 23, 24];
    for (let y = 0; y < 118; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith(SKY, (y / 118) ** 1.2 * (SKY.length - 1), x, y));
    for (let i = 0; i < 5; i++) { const cw = 26 + i * 11, cy = 14 + i * 15, cx = Math.round(((i * 83 + tf * (2 + i)) % (LW + cw * 2)) - cw);
      G.shape([cx - cw, cy - 4, cx + cw, cy + 4], (x, y) => ((x - cx) / cw) ** 2 + ((y - cy) / 3.6) ** 2 <= 1, (x, y) => G.dith(dawn ? [5, 6, 7] : [43, 42, 24], 0.4 + i * 0.35 + (y - cy) / 6, x, y), null); }
    // 复古的条纹太阳
    const sy = dawn ? 118 - 8 * smooth(seg(tf, 145, 153)) : 112, SR = 26;
    G.shape([210 - SR, sy - SR, 210 + SR, 119], (x, y) => y < 118 && Math.hypot(x - 210, y - sy) <= SR && !(y > sy - 6 && ((y + Math.floor(tf * 6)) % 5) < 1 + (y - sy + 6) / 10), (x, y) => G.dith([25, 23, 24], 2.2 - (y - sy + SR) / (SR * 1.1), x, y), null);
  }
  function drawBeach(G, tf, opt = {}) {
    beachSky(G, tf, opt.dawn);
    for (let y = 118; y < 170; y++) for (let x = 0; x < LW; x++) { const v = (y - 118) / 52; let c = G.dith(opt.dawn ? [12, 4, 27, 41] : [43, 12, 27, 41], v * 3, x, y); if (Math.abs(x - 210) < 26 - v * 8 && (y + Math.floor(tf * 6) + (x >> 3)) % 3 === 0 && PIX.bt(x, y) < 0.65) c = 23; G.px(x, y, c); }
    for (let y = 168; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([14, 15, 16, 17], 2.6 - (y - 168) / 26 + 0.3 * Math.sin(x * 0.05), x, y));
    { const u = (tf * 0.49) % 1, up = Math.sin(Math.PI * u), yl = Math.round(158 + up * 16);   // 一拍一道浪
      for (let x = 0; x < LW; x++) { const yy = yl + Math.round(Math.sin(x * 0.12 + tf) * 1.5); for (let y = 160; y < yy; y++) G.px(x, y, G.dith([27, 40, 26], (y - 160) / 7, x, y)); G.px(x, yy, 8); if (x % 3 === 0) G.px(x, yy - 1, 26); } }
    for (let i = 0; i < 2; i++) { const u = ((tf * 0.11 + i * 0.4) % 1), bx = Math.round(-10 + u * (LW + 20)), by = 36 + i * 15 + Math.round(Math.sin(u * 20) * 2), up = Math.floor(tf * 6 + i) % 2; G.px(bx, by, 0); G.px(bx - 1, by - up, 0); G.px(bx - 2, by - up, 0); G.px(bx + 1, by - up, 0); G.px(bx + 2, by - up, 0); }
    const light = (x, y) => 0.55 + 0.35 * clamp(1 - Math.abs(x - 210) / 160);
    if (opt.him !== false) CHAR.draw(G, { who: 'him', x: 146, y: 222, size: 80, facing: 'back', t: tf, light });
    if (opt.her) CHAR.draw(G, { who: 'her', x: 165, y: 222, size: 74, facing: 'back', t: tf, light, action: 'slump', u: 0.25 });
    for (let y = 186; y < LH; y++) for (let x = 0; x < LW; x++) if (y > 190 + 6 * Math.sin(x * 0.03) - (x > 100 && x < 220 ? 4 : 0)) G.px(x, y, G.dith([14, 15, 16], 1.2 - (y - 186) / 40, x, y));
  }
  function drawTitle(G, tf, o = {}) {   // 大白字 + 错开的深红影子（学参考片）
    const drop = o.noDrop ? 0 : Math.max(0, 1 - (tf - 0.33) * 5), by = o.y ?? 12, g = o.glitch || 0;
    const jx = g ? Math.round((rnd('tj' + Math.floor(tf * 12)) - 0.5) * 8 * g) : 0;
    const sc = o.sc ?? 6, w = bigW('唉', sc), x0 = Math.round(148 - w / 2) + jx, y0 = by - Math.round(drop * 60);
    if (tf < 0.33 && !o.noDrop) return;
    big(G, '唉', x0, y0, sc, 8, [Math.round(sc * 0.8) + (g ? 3 : 0), Math.round(sc * 0.8), 43]);
    big(G, 'u say', x0 + w + 10, y0 + 40, 2, 8, [2, 2, 43]);
    if (tf >= 0.7 || o.noDrop) ctext(G, '张方钊', 160 - jx, by + w + 8, 8, 0);
  }
  const MENU = ['继续游戏', '读取存档', '新的开始'];
  function drawMenu(G, tf, sel, o = {}) {
    const x = o.x ?? 228, y = o.y ?? 130, off = o.slide ? Math.max(0, Math.round((1 - (tf - o.slide) * 4) * 90)) : 0;
    panel(G, x + off, y, 82, 52);
    MENU.forEach((m, i) => { const yy = y + 5 + i * 15, dim = o.dim && o.dim.includes(i); G.text(GL, m, x + off + 16, yy, dim ? 4 : (i === sel && o.press ? 23 : 8)); if (dim) G.line(x + off + 15, yy + 6, x + off + 66, yy + 6, 43); });
    if (Math.floor(tf * 4) % 2 === 0 || o.press) cursor(G, x + off + 6, y + 7 + Math.round((o.selY ?? sel) * 15));
  }
  function saveCard(G, tf) {
    const x = 64, y = 92, w = 192, h = 44, pop = tf < 5.95 ? 0.6 : 1, bad = tf >= 8.66;
    panel(G, x + Math.round((1 - pop) * w / 2), y + Math.round((1 - pop) * h / 2), Math.round(w * pop), Math.round(h * pop), bad ? { bd: 43, cr: 31 } : {});
    if (pop < 1) return;
    G.text(GL, '存档 01', x + 8, y + 5, 8);
    const hearts = bad ? (tf >= 10.24 ? 1 : 2) : 3;
    for (let i = 0; i < 3; i++) HEART.forEach((row, j) => [...row].forEach((ch, k) => { if (ch !== '.') G.px(x + w - 36 + i * 9 + k, y + 8 + j, ch === 'k' ? 0 : i < hearts ? 31 : 2); }));
    if (!bad) G.text(GL, '和她 第 999 天', x + 8, y + 18, 26);
    else if (Math.floor(tf * 6) % 2) G.text(GL, '存档已损坏', x + 8, y + 18, 31);
    const p = bad ? 0.99 : smooth(seg(tf, 6.1, 8.6)) * 0.99;
    G.rect(x + 8, y + 34, w - 16, 4, 2); G.rect(x + 8, y + 34, Math.round((w - 16) * p), 4, bad ? 31 : 40);
  }
  function shotBoot(G, tf) {
    drawBeach(P1, tf, { her: true });
    const u = seg(tf, 8.66, 12.1);
    if (u > 0) {   // 她一格一格碎掉，往上飘
      drawBeach(P2, tf, { her: false });
      G.B.set(P2.B);
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const a = P1.B[y * LW + x]; if (a === P2.B[y * LW + x]) continue;
        const r = PIX.rnd('hp' + x + '_' + y); if (r > u * 1.15) G.B[y * LW + x] = a;
        else if (r > 0.45) { const age = (u * 1.15 - r), nx = x + Math.round(Math.sin(age * 12 + r * 9) * 4), ny = y - Math.round(age * 90 * (0.5 + r)); if (ny > 0 && PIX.bt(nx, ny) < 1.1 - age) G.px(nx, ny, a); } }
    } else G.B.set(P1.B);
    const k = smooth(seg(tf, 8.66, 12.3));
    if (k > 0) for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (PIX.bt(x, y) < k) G.B[y * LW + x] = CM[G.B[y * LW + x]];
    const hit = hitIn(tf, [8.66, 10.24, 11.77], 0.34);
    if (k > 0) glitchRows(G, tf, hit ? 0.55 : 0.1 * k);
    drawTitle(G, tf, { glitch: k * (hit ? 2 : 0.6) });
    if (tf >= 2.53 && tf < 8.66) drawMenu(G, tf, 0, { slide: 2.53, press: tf >= 5.6 && Math.floor((tf - 5.6) * 12) % 2 === 0 && tf < 6.1 });
    if (tf >= 5.85 && tf < 11.77) saveCard(G, tf);
    if (tf < 0.3) { const hw = Math.round(lerp(50, 124, tf / 0.3)); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (Math.abs(y - 110) > hw) G.B[y * LW + x] = 44; if (tf < 0.09) G.rect(0, 108, LW, 4, 8); }   // 显像管打开
    if (tf >= 12.56) {   // 整个世界垮下去
      const c = (tf - 12.56) / 0.75; T1.B.set(G.B); G.fill(44);
      for (let x = 0; x < LW; x++) { const dy = Math.round(c * c * 300 * (0.5 + rnd('cl' + (x >> 3)))); for (let y = 0; y < LH - dy; y++) G.B[(y + dy) * LW + x] = T1.B[y * LW + x]; }
    }
  }
  // ============================== O2 往下掉：东西从身边飞上去 ==============================
  const MEM = [[78.2, 'room'], [79.0, 'room'], [84.95, 'st'], [88.6, 'st'], [92.0, 'st'], [109.0, 'sea'], [111.7, 'close'], [114.6, 'door']];
  let MEMP = null;
  function memPhotos() {
    if (MEMP) return MEMP;
    const keep = ST; ST = ST0;
    MEMP = MEM.map(([t, k]) => { T1.fill(0); if (k === 'room') shotRoom1(T1, t); else if (k === 'st') shotStreet(T1, t); else if (k === 'sea') drawSea(T1, t, { photo: true }); else if (k === 'close') drawClose(T1, t); else shotDoor(T1, t);
      const out = new Uint8Array(128 * 96); for (let j = 0; j < 96; j++) for (let i = 0; i < 128; i++) out[j * 128 + i] = T1.get(Math.floor(i * 2.5), Math.floor(j * 2.5)); return out; });
    ST = keep; return MEMP;
  }
  function drawMemPhoto(G, data, x, y, shear) {   // 4:3 的照片：白边、底边宽一点，微微歪着
    for (let row = y - 5; row < y + 110; row++) { const off = Math.round((row - y - 48) * shear); G.rect(x - 5 + off, row, 138, 1, row === y - 5 || row === y + 109 ? 0 : 8); G.px(x - 5 + off, row, 0); G.px(x + 132 + off, row, 0);
      if (row >= y && row < y + 96) for (let i = 0; i < 128; i++) G.px(x + i + off, row, data[(row - y) * 128 + i]); }
  }
  const MX = [10, 182, 24, 170, 6, 186, 30, 164], MS = [0.05, -0.04, -0.03, 0.05, 0.04, -0.05, 0.03, -0.03];
  function shotFall(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2, 3], y / LH * 2.4, x, y));
    for (let i = 0; i < 50; i++) { const x = Math.floor(rnd('fx' + i) * LW), sp = 240 + rnd('fs' + i) * 340, len = 8 + rnd('fl' + i) * 22, y = 260 - ((rnd('fy' + i) * 300 + tf * sp) % 300); for (let k = 0; k < len; k++) G.px(x, y + k, k < len / 2 ? 3 : 5); }
    const gu = seg(tf, 16.25, 16.7), by = Math.round(lerp(300, 196, gu * gu));
    if (gu > 0) { for (let y = by; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([1, 2, 3], 2 - (y - by) / 20, x, y)); for (let i = 0; i < 8; i++) G.rect(20 + i * 40, by + 6, 20, 1, 5); }
    const fy = Math.round(lerp(lerp(70, 140, seg(tf, 13.0, 14.0)), 194, gu * gu)) + Math.round(Math.sin(tf * 5) * 3);
    CHAR.draw(G, { who: 'him', x: 160 + Math.round(Math.sin(tf * 2.3) * 8), y: fy, size: Math.round(lerp(34, 54, gu)), facing: 'right', action: 'jump', u: 0.5, t: tf, expression: 'sad', light: () => 0.6 });
    const ph = memPhotos();
    ph.forEach((d, k) => { const t0 = 13.0 + k * 0.42, y = Math.round(250 - (tf - t0) * 240); if (y < -120 || y > 250) return; drawMemPhoto(G, d, MX[k], y, MS[k]); });
  }
  // ============================== O3 落地：雨夜空街，u say 的气泡砸过来 ==============================
  const OLAMPS = Array.from({ length: 16 }, (_, i) => 40 + i * 90);
  const CAM0 = 330;
  function streetNow(G, tf, cam) { const keep = ST; ST = { lamps: OLAMPS, off: () => false, closed: true }; drawStreet(G, tf, cam, { warm: 0.75, rain: 0.9, tf }); ST = keep; }
  function shotLand(G, tf) {
    const cam = CAM0 + Math.round(Math.max(0, tf - 18.9) * 16); streetNow(G, tf, cam);
    const L0 = streetLight(cam, 0.75), light = (x, y) => 0.3 + L0(x, y) * 0.9;
    const up = smooth(seg(tf, 18.0, 18.5)), flinch = hitIn(tf, [18.30, 19.66, 21.08], 0.3);
    const o = { who: 'him', x: 150, y: 194, size: 54, facing: 'right', t: tf, light, expression: 'sad', action: tf < 18.9 ? 'kneel' : 'walk', u: tf < 18.9 ? 1 - up : 1 };
    if (tf >= 18.9 && flinch) Object.assign(o, { action: 'slump', u: 0.7 });
    CHAR.draw(G, o);
    const sp = (tf - 16.70) / 0.7; if (sp > 0 && sp < 1) for (let i = 0; i < 70; i++) { const a = Math.PI * rnd('la' + i), v = 60 + rnd('lv' + i) * 90, x = 150 + Math.cos(a) * v * sp, y = 194 - Math.sin(a) * v * sp * 1.1 + 130 * sp * sp; if (y < 198) G.px(x, y, i % 3 ? 26 : 8); }
    drawRain(G, tf, 0.9, tf);
    if (tf >= 17.75 && tf < 18.7) { const a = seg(tf, 17.75, 18.7), y0 = 96 - Math.round(a * 22); T1.B.fill(255); big(T1, '唉', 170, y0, 4, 8, [3, 3, 0]); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const c = T1.B[y * LW + x]; if (c !== 255 && PIX.bt(x, y) < 1.3 - a * 1.3) G.B[y * LW + x] = c; } }
    for (const [t0, x, y, sc] of [[18.30, 22, 22, 1], [19.66, 128, 34, 2], [21.08, 12, 64, 3]]) if (tf >= t0) { const k = Math.floor((tf - t0) * 12); bubble(G, x - (k === 0 ? 6 : 0), y - (k === 0 ? 4 : 0), 'u say', sc + (k === 0 ? 1 : 0)); }
    shakeAt(G, tf, [16.70], 6); shakeAt(G, tf, [18.30, 19.66, 21.08], 2);
    if (tf >= 16.70 && tf < 16.79) G.fill(8);
  }
  // ============================== O4 永远 ×4：整屏大字，一次比一次满，最后裂开 ==============================
  const YY = [22.79, 23.74, 24.70, 25.67];
  function tile(G, word, sc, c, tf, sp) { const w = bigW(word, sc) + 4 * sc, h = 13 * sc; let row = 0; for (let y = -h; y < LH; y += h) { const o = Math.floor(((row % 2 ? 1 : -1) * tf * sp) % w); for (let x = -w * 2 + o; x < LW + w; x += w) big(G, word, x, y, sc, c); row++; } }
  function shotForever(G, tf) {
    const n = after(tf, YY);
    if (n === 1) { G.fill(44); const sc = 11, x = Math.round((LW - bigW('永远', sc)) / 2); big(G, '永远', x, 28, sc, 8, [6, 6, 43]); shakeAt(G, tf, [YY[0]], 5); }
    else if (n === 2) { G.fill(43); tile(G, '永远', 5, 42, tf, 60); const sc = 8, x = Math.round((LW - bigW('永远', sc)) / 2); big(G, '永远', x, 50, sc, 8, [4, 4, 44]); shakeAt(G, tf, [YY[1]], 4); }
    else if (n === 3) { G.fill(44); tile(G, '永远', 2, 41, tf, 90); const sc = 6, x = Math.round((LW - bigW('永远', sc)) / 2); big(G, '永远', x, 66, sc, 23, [3, 3, 43]); shakeAt(G, tf, [YY[2]], 4); }
    else { // 裂开：后面露出雨里的他
      const u = seg(tf, 26.05, 26.6), sc = 11, x0 = Math.round((LW - bigW('永远', sc)) / 2);
      if (u <= 0) G.fill(44); else { streetNow(G, tf, CAM0 + 60); CHAR.draw(G, { who: 'him', x: 160, y: 194, size: 54, facing: 'front', t: tf, light: () => 0.6, expression: 'sad' }); drawRain(G, tf, 0.9, tf); }
      T1.B.fill(255); big(T1, '永远', x0, 28, sc, 8, [6, 6, 43]);
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const c = T1.B[y * LW + x]; if (c === 255) continue; const zig = 160 + Math.sin(y * 0.3) * 8 + ((y >> 2) % 3) * 3, left = x < zig, dx = Math.round((left ? -1 : 1) * u * 18), dy = Math.round(u * u * (left ? 170 : 240)); G.px(x + dx, y + dy, u > 0.5 && PIX.bt(x, y) < 0.3 ? 40 : c); }
      if (tf < 26.05) { for (let k = 0; k < 150; k++) { const y = 20 + k, x = Math.round(160 + Math.sin(y * 0.3) * 8 + ((y >> 2) % 3) * 3); if ((tf - 25.67) * 400 > k) { G.px(x, y, 44); G.px(x + 1, y, 44); } } }
      shakeAt(G, tf, [YY[3], 26.05], 4);
    }
  }
  // ============================== O5 眼泪 ×4：一滴一滴，把街淹了 ==============================
  const TEARS = [26.95, 27.90, 28.79, 29.82], LEVELS = [194, 182, 164, 146, 118];
  function waterLevel(tf) { const n = after(tf, TEARS); let lv = LEVELS[n]; if (n > 0) { const k = clamp((tf - TEARS[n - 1]) * 3); lv = Math.round(lerp(LEVELS[n - 1], LEVELS[n], smooth(k))); } if (tf > 30.1) lv = Math.round(lerp(118, -6, smooth(seg(tf, 30.1, 30.34)))); return lv; }
  function shotFlood(G, tf) {
    streetNow(G, tf, CAM0 + 60);
    const L0 = streetLight(CAM0 + 60, 0.75);
    CHAR.draw(G, { who: 'him', x: 160, y: 194, size: 54, facing: 'front', t: tf, light: (x, y) => 0.3 + L0(x, y) * 0.9, expression: 'cry', blink: true });
    drawRain(G, tf, 0.9, tf);
    const lv = waterLevel(tf);
    for (let x = 0; x < LW; x++) { const yy = lv + Math.round(Math.sin(x * 0.09 + tf * 5) * 2 + Math.sin(x * 0.23 - tf * 3)); for (let y = Math.max(0, yy); y < LH; y++) G.B[y * LW + x] = WM[G.B[y * LW + x]]; G.px(x, yy, 8); if (x % 2) G.px(x, yy + 1, 26); }
    TEARS.forEach((b, i) => { const d = tf - b; if (d > -0.35 && d < 0) { const r = 7 + i * 3; teardrop(G, 160 + [-40, 46, -66, 70][i], Math.round(lerp(-20, LEVELS[i], (d + 0.35) / 0.35)), r); }
      if (d >= 0 && d < 0.5) for (let k = 0; k < 40; k++) { const a = Math.PI * rnd('ts' + i + k), v = 40 + rnd('tv' + i + k) * 70, x = 160 + [-40, 46, -66, 70][i] + Math.cos(a) * v * d * 2, y = LEVELS[i] - Math.sin(a) * v * d * 2 + 120 * d * d; G.px(x, y, k % 3 ? 26 : 8); } });
    { const n = after(tf, TEARS); if (n > 0) { const [x, y] = [[20, 14], [176, 30], [24, 44], [150, 12]][n - 1], d = tf - TEARS[n - 1], sc = d < 0.09 ? 6 : 5; T1.B.fill(255); big(T1, '眼泪', x - (d < 0.09 ? 6 : 0), y, sc, 26, [3, 3, 18]);
      const drip = Math.max(0, d - 0.55); for (let yy = 0; yy < LH; yy++) for (let xx = 0; xx < LW; xx++) { const c = T1.B[yy * LW + xx]; if (c !== 255) G.px(xx, yy + Math.round(drip * 22 * rnd('dr' + (xx >> 2))), c); } } }
    shakeAt(G, tf, TEARS, 2);
  }
  // ============================== O6 水下：沉下去，门口的她没有拦 ==============================
  const SURF = 44, BED = 460;
  function camW(tf) { if (tf < 34.57) return 260 * smooth(seg(tf, 30.34, 34.57)); if (tf < 38.9) return 260; return 260 * (1 - smooth(seg(tf, 38.9, 42.75))); }
  function shotUnder(G, tf) {
    const cy = Math.round(camW(tf));
    for (let y = 0; y < LH; y++) { const wy = y + cy, v = clamp((wy - SURF) / (BED - SURF));
      for (let x = 0; x < LW; x++) { let c = wy < SURF ? G.dith([44, 1, 2], wy / SURF * 2, x, y) : G.dith([44, 1, 18, 41, 27, 40], (1 - v) * 4.8, x, y);
        if (wy >= SURF && ((x + y * 0.5 + Math.sin(y * 0.03 + tf) * 12) % 64) < 12 && PIX.bt(x, y) < 0.35 * (1 - v)) c = 26; G.px(x, y, c); } }
    const sy = SURF - cy; if (sy > -4 && sy < LH) for (let x = 0; x < LW; x++) { const yy = sy + Math.round(Math.sin(x * 0.1 + tf * 3) * 2); G.px(x, yy, 8); if (x % 2) G.px(x, yy + 1, 26); }
    // 沉在水底的城市
    for (const [bx, bh, bw] of [[0, 90, 42], [46, 130, 34], [84, 70, 44], [132, 110, 30], [168, 60, 26], [262, 120, 58], [204, 84, 40]]) { const top = BED - bh - cy; if (top > LH) continue; for (let y = Math.max(0, top); y < Math.min(LH, BED + 40 - cy); y++) for (let x = bx; x < bx + bw && x < LW; x++) { let c = G.dith([44, 1], 0.5 + (y - top) / 90, x, y); if (y > top + 4 && (x - bx) % 6 < 3 && (y - top) % 8 < 4 && PIX.hash(bx + '_' + ((x - bx) >> 2) + '_' + ((y - top) >> 3)) % 5 === 0) c = Math.floor(tf * 2 + bx) % 7 ? 25 : 1; G.px(x, y, c); } }
    const by = BED - cy; for (let y = Math.max(0, by); y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2], 1.6 - (y - by) / 16 + 0.3 * Math.sin(x * 0.2), x, y));
    // 门：她就站在门里，不拦
    const DX = 208, DW = 40, DH = 74, dtop = by - DH;
    if (dtop < LH) {
      const open = smooth(seg(tf, 34.57, 35.0)) * (1 - smooth(seg(tf, 39.8, 41.4)));   // 他游走时，门慢慢关上
      if (open > 0) for (let y = Math.max(0, dtop - 60); y < Math.min(LH, by); y++) for (let x = Math.max(0, DX - 70); x < DX + DW / 2; x++) { const d = Math.hypot(x - DX, (y - (by - 34)) * 0.9); if (PIX.bt(x, y) < open * 0.55 * (1 - d / 84)) G.px(x, y, d < 40 ? 23 : 25); }
      G.rect(DX - 3, dtop - 3, DW + 6, DH + 3, 0); G.rect(DX - 2, dtop - 2, DW + 4, DH + 2, 14);
      for (let y = dtop; y < by; y++) for (let x = DX; x < DX + DW; x++) G.px(x, y, G.dith([25, 23, 24], 0.8 + (y - dtop) / 40, x, y));
      if (open > 0.2) CHAR.draw(G, { who: 'her', x: DX + 18, y: by, size: 56, facing: 'left', t: tf, expression: tf < 37.38 ? 'neutral' : 'sad', light: () => 1 });
      const pw = Math.round(DW * (1 - open)); if (pw > 0) { G.rect(DX, dtop, pw, DH, 15); G.rect(DX + 2, dtop + 4, Math.max(0, pw - 4), 26, 14); G.rect(DX + 2, dtop + 36, Math.max(0, pw - 4), 30, 14); if (pw > 8) G.ellipse(DX + pw - 5, dtop + 38, 1.6, 1.6, 23, null); }
      if (open <= 0) { const glow = Math.floor(tf * 6) % 2; for (let x = DX - 18; x < DX; x++) if (PIX.bt(x, by - 1) < 0.5 + glow * 0.2) G.px(x, by - 1, 25); }
    }
    // 他
    const sink = seg(tf, 30.34, 33.8), rise = smooth(seg(tf, 38.9, 42.2));
    const hx = Math.round(lerp(lerp(120, 134, sink), 165, rise)), hy = Math.round(lerp(lerp(70, 188, sink * sink * (3 - 2 * sink)), 96, rise)) + Math.round(Math.sin(tf * 1.6) * 3);
    const o = { who: 'him', x: hx, y: hy, size: 50, t: tf, expression: 'sad', light: () => 0.5, facing: 'right' };
    if (tf < 33.0) Object.assign(o, { action: 'jump', u: 0.5 });
    else if (tf < 38.9) Object.assign(o, { action: 'reach', u: smooth(seg(tf, 33.0, 34.3)) * (tf > 37.4 ? 1 - seg(tf, 37.4, 38.6) : 1) });
    else Object.assign(o, { action: 'jump', u: 0.55, facing: 'left' });
    CHAR.draw(G, o);
    { const H = CHAR.headAt(o); for (let i = 0; i < 3; i++) { const k = ((tf * 0.8 + i * 0.33) % 1), x = H.x + 6 * o.size / 54 + Math.round(Math.sin(k * 8 + i) * 2), y = H.y - Math.round(k * 36); G.px(x, y, 26); G.px(x + 1, y - 1, 8); } }
    for (let i = 0; i < 46; i++) { const wx = rnd('bbx' + i) * LW + Math.sin(tf * 1.3 + i) * 3, wy = BED - ((rnd('bby' + i) * 460 + tf * (16 + rnd('bbs' + i) * 26)) % (BED - SURF)), y = wy - cy, r = i % 5 === 0 ? 2 : 1; if (y < 0 || y >= LH) continue; if (r > 1) { G.px(wx - 1, y, 26); G.px(wx + 1, y, 26); G.px(wx, y - 1, 8); G.px(wx, y + 1, 26); } else G.px(wx, y, 26); }
  }
  // ============================== O7 冒出水面：失败；碗筷；一个人的海 ==============================
  function seaNight(G, tf, o = {}) {
    const hz = o.hz ?? 112, mx = o.mx ?? 232, my = o.my ?? 44, mr = o.mr ?? 26;
    for (let y = 0; y < hz; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2, 3], (y / hz) * 2.8, x, y));
    for (let i = 0; i < 90; i++) { const x = Math.floor(rnd('sx' + i) * LW), y = Math.floor(rnd('sy' + i) * (hz - 8)); if (Math.hypot(x - mx, y - my) > mr + 4 && (Math.floor(tf * 3 + i) % 6 !== 0)) G.px(x, y, i % 9 === 0 ? 42 : i % 4 === 0 ? 40 : 6); }
    for (let y = my - mr * 2; y < my + mr * 2; y++) for (let x = mx - mr * 2; x < mx + mr * 2; x++) { const d = Math.hypot(x - mx, y - my); if (d > mr && d < mr * 1.9 && y < hz && PIX.bt(x, y) < 0.3 * (1 - (d - mr) / (mr * 0.9))) G.px(x, y, 7); }
    G.shape([mx - mr, my - mr, mx + mr, my + mr], (x, y) => Math.hypot(x - mx, y - my) <= mr && y < hz, (x, y) => (Math.hypot(x - mx + mr * 0.34, y - my - mr * 0.3) < mr * 0.22 ? 7 : G.dith([7, 24, 8], 1.4 - (y - my) / mr, x, y)), null);
    for (let y = hz; y < LH; y++) for (let x = 0; x < LW; x++) { const v = (y - hz) / (LH - hz); let c = G.dith([1, 18, 41, 27], 0.6 + v * 2.2 + Math.sin(x * 0.07 + y * 0.5 + tf * 1.5) * 0.35, x, y); if (Math.abs(x - mx - Math.sin(y * 0.6 + tf * 3) * 3) < mr * (0.55 + v * 0.7) && (y + Math.floor(tf * 6)) % 3 === 0 && PIX.bt(x, y) < 0.7) c = 24; G.px(x, y, c); }
  }
  function frontWave(G, tf, y0, amp = 3) { for (let x = 0; x < LW; x++) { const yy = y0 + Math.round(Math.sin(x * 0.06 + tf * 1.8) * amp + Math.sin(x * 0.17 - tf * 2.4) * 1.5); for (let y = yy; y < LH; y++) G.px(x, y, G.dith([18, 41, 27, 40], 2.6 - (y - yy) / 14, x, y)); G.px(x, yy, 8); if ((x >> 1) % 2) G.px(x, yy + 1, 26); } }
  const BD = [64, 8, 192, 106];   // 广告牌：x, y, 宽, 高
  function adText(G, x, y) { big(G, '海边双人游', x, y, 2, 8, [1, 1, 43]); G.text(GL, '￥1999', x, y + 26, 23, 0); }
  function drawBoard(G, tf, off) {
    const [x0, y0, w, h] = BD, cx = x0 + w / 2;
    for (const px of [x0 + 28, x0 + w - 32]) { G.rect(px, y0 + h, 5, 80, 0); G.rect(px + 1, y0 + h, 3, 80, 2); }
    G.rect(x0 - 4, y0 - 4, w + 8, h + 8, 0); G.rect(x0 - 3, y0 - 3, w + 6, h + 6, 3);
    if (off) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.px(x0 + i, y0 + j, (i + j) % 7 === 0 ? 2 : 44); return; }
    drawBeach(P1, tf, { her: false });
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.px(x0 + i, y0 + j, P1.get(Math.floor(i * 320 / w), 26 + Math.floor(j * 320 / w)));
    adText(G, x0 + 6, y0 + 6);
    for (let i = 0; i < 9; i++) if (Math.floor(tf * 3 + i) % 3) G.rect(x0 + 6 + i * 21, y0 - 3, 3, 1, 24);
  }
  function shotCity(G, tf, o = {}) {
    streetNow(G, tf, CAM0 + 120);
    drawBoard(G, tf, o.off);
    if (!o.off) for (let y = 180; y < 206; y++) for (let x = 40; x < 280; x++) if (PIX.bt(x, y) < 0.34 * (1 - Math.abs(x - 160) / 120) * (1 - (y - 180) / 30)) G.px(x, y, (y % 2 ? 25 : 42));
    const w = seg(tf, 47.58, 48.4), him = { who: 'him', x: Math.round(lerp(96, 160, w)), y: 196, size: 40, facing: tf < 48.4 ? 'right' : 'back', action: tf < 48.4 ? 'walk' : (o.hit ? 'slump' : 'idle'), u: 0.6, t: tf, light: () => 0.6, expression: 'sad' };
    CHAR.draw(G, him);
    drawRain(G, tf, 0.8, tf);
    return him;
  }
  function shotAdFull(G, tf) {   // 广告牌里的海：满屏，沙滩上只有他一个人。屏幕的颗粒和边框还在
    drawBeach(G, tf, { her: false });
    for (let y = 0; y < LH; y += 3) for (let x = 0; x < LW; x++) { const c = G.B[y * LW + x]; if (PIX.bt(x, y) < 0.5) G.B[y * LW + x] = CM[c]; }
    adText(G, 18, 16);
    for (let k = 0; k < 6; k++) { G.rect(0, k, LW, 1, 0); G.rect(0, LH - 1 - k, LW, 1, 0); G.rect(k, 0, 1, LH, 0); G.rect(LW - 1 - k, 0, 1, LH, 0); }
  }
  // 第 8 句：气泡像冰雹一样砸在街上，广告牌一下一下闪，最后灭了
  const SAY8 = [50.43, 50.9, 51.3, 52.06, 52.45, 52.85, 53.23, 53.6, 54.0, 54.47, 54.85, 55.2];
  const SAYX = [40, 232, 96, 268, 18, 200, 248, 66, 288, 124, 34, 216];
  function shotHail(G, tf) {
    const hit = hitIn(tf, SAY8.map((b) => b + 0.26), 0.2);
    const him = shotCity(G, tf, { off: tf >= 55.2 || hit, hit });
    SAY8.forEach((b, i) => { const d = tf - b; if (d < 0 || d >= 0.75) return; const x = SAYX[i], sc = 1 + (i % 3 === 2 ? 1 : 0), yy = -30 + d / 0.26 * 214;
      if (d < 0.26) bubble(G, x - 14, Math.round(yy), 'u say', sc);
      else { const u = (d - 0.26) / 0.49; for (let k = 0; k < 18; k++) { const a = Math.PI * rnd('hs' + i + k), v = 30 + rnd('hv' + i + k) * 50, px = x + Math.cos(a) * v * u, py = 190 - Math.sin(a) * v * u + 60 * u * u; G.px(px, py, k % 3 ? 26 : 8); } } });
    if (tf >= 51.59 && tf < 52.5) { const u = seg(tf, 51.59, 52.5), H = CHAR.headAt(him); T1.B.fill(255); big(T1, '唉', H.x + 8, H.y - 34 - Math.round(u * 12), 2, 8, [1, 1, 0]); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const c = T1.B[y * LW + x]; if (c !== 255 && PIX.bt(x, y) < 1.3 - u * 1.3) G.B[y * LW + x] = c; } }
    shakeAt(G, tf, SAY8.map((b) => b + 0.26), 1);
  }
  function shotSurface(G, tf) {
    seaNight(G, tf, { mx: 284, my: 58, mr: 24 });
    const up = smooth(seg(tf, 42.75, 43.1)), o = { who: 'him', x: 160, y: Math.round(lerp(290, 226, up)) + Math.round(Math.sin(tf * 1.8) * 3), size: 76, facing: 'front', t: tf, light: () => 0.7, expression: tf >= 44.19 ? 'cry' : 'sad', blink: tf >= 44.19 && tf < 44.8 };
    CHAR.draw(G, o);
    frontWave(G, tf, 168);
    const sp = (tf - 42.85) / 0.8; if (sp > 0 && sp < 1) for (let i = 0; i < 110; i++) { const a = Math.PI * (0.1 + rnd('wa' + i) * 0.8), v = 70 + rnd('wv' + i) * 170, x = 160 + Math.cos(a) * v * sp, y = 170 - Math.sin(a) * v * sp + 190 * sp * sp; G.px(x, y, i % 3 ? 26 : 8); if (i % 4 === 0) G.px(x, y + 1, 8); }
    if (tf >= 44.19) { const k = Math.floor((tf - 44.19) * 12), sc = k < 1 ? 9 : 8, x = Math.round((250 - bigW('失败', sc)) / 2) + 2; big(G, '失败', x, k < 1 ? 2 : 10, sc, 31, [5, 5, 44]); }
    shakeAt(G, tf, [42.85], 4); shakeAt(G, tf, [44.19], 6);
  }
  function shotBowls(G, tf) {   // 第 7 句中：房间里吃饭的那段回忆；唱到碗筷时推近桌上的两副碗筷
    shotRoom1(T1, 77.6 + (tf - 45.65));
    if (tf < 46.85) G.B.set(T1.B); else zoomCopy(G, T1, 160, 140, 2);
  }
  // ============================== O8 心里：一颗大心里面只有那间屋、那个人 ==============================
  const HB = Array.from({ length: 12 }, (_, i) => 55.8 + i * 1.033);
  function shotHeart(G, tf) {
    const st = { s: tf, tf, I: 1.15, rain: 0.2, sway: Math.round(Math.sin(tf * 1.5) * 2) };
    drawRoom(P1, 0, st);
    const L = roomLight(st.I, st.sway);
    CHAR.draw(P1, { who: 'her', ...HER_SEAT, facing: 'right', action: 'sitHold', u: Math.floor(tf * 2) % 2 ? 1 : 0.55, t: tf, expression: tf >= 58.8 || Math.floor(tf * 4) % 2 ? 'happy' : 'neutral', light: L, hold: CHAR.PROPS.bowl });
    drawTableTop(P1, 0, st); drawLamp(P1, 0, st);
    const d = HB.map((b) => tf - b).filter((v) => v >= 0).pop() ?? 9, beat = d < 0.08 ? 1.1 : d < 0.25 ? 1.05 : 1, sz = 92 * beat, cx = 160, cy = 96;
    const inH = (x, y, s) => { const X = (x - cx) / (s * 0.82), Y = -(y - cy + 6) / (s * 0.82); const v = X * X + Y * Y - 1; return v * v * v - X * X * Y * Y * Y <= 0; };
    const OX = 96 - cx, OY = 146 - cy;   // 屋里取她和桌边这一块
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      if (inH(x + 0.5, y + 0.5, sz * 0.88)) { const c0 = P1.get(x + OX, y + OY); const isHer = c0 === 28 || c0 === 30 || c0 === 8 || c0 === 7 || c0 === 22 || c0 === 21; G.px(x, y, isHer || PIX.bt(x, y) > 0.8 ? c0 : WARMER[c0]); }
      else if (inH(x + 0.5, y + 0.5, sz)) G.px(x, y, inH(x + 0.5, y + 0.5, sz * 0.93) ? 31 : G.dith([43, 31, 42], 1 + (cy - y) / 70, x, y));
      else if (inH(x + 0.5, y + 0.5, sz * 1.03)) G.px(x, y, 0);
      else { const dist = Math.hypot(x - cx, y - cy) / 170; G.px(x, y, PIX.bt(x, y) < 0.8 - dist ? (PIX.bt(x + 1, y) < 0.35 ? 43 : 44) : 44); }
    }
    for (let i = 0; i < 14; i++) { const u = ((tf * 0.2 + rnd('hhu' + i)) % 1), x = Math.floor(rnd('hhx' + i) * LW), y = Math.round(LH - u * 260); if (inH(x, y, sz * 1.05)) continue; if (PIX.bt(x, y) < 1 - u) { G.px(x, y, 42); G.px(x + 2, y, 42); G.rect(x, y + 1, 3, 1, 42); G.px(x + 1, y + 2, 42); } }
  }
  // ============================== O9 u need safe：保险库 ==============================
  const SAFE = [60.43, 61.15, 61.71, 62.5, 63.2];
  function shotSafe(G, tf) {
    for (let y = 0; y < 188; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2], (y / 188) * 1.8, x, y));
    for (let y = 188; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([1, 2, 3], 1.4 - (y - 188) / 26, x, y));
    const n = after(tf, SAFE);
    for (const [bx, top, bw] of [[-6, 62, 98], [100, 46, 112], [220, 74, 106]]) {
      G.rect(bx - 1, top - 1, bw + 2, 190 - top, 0); G.rect(bx, top, bw, 190 - top, 3); G.rect(bx, top, bw, 2, 4);
      for (let r = 0; (top + 8 + r * 13) < 176; r++) for (let c = 0; (bx + 6 + c * 12) < bx + bw - 8; c++) { const wx = bx + 6 + c * 12, wy = top + 8 + r * 13, h = PIX.hash(bx + '_' + r + '_' + c) % 17;
        const lit = h < 3 + n * 2; G.rect(wx, wy, 8, 9, lit ? 25 : 1); if (lit) { G.rect(wx, wy, 8, 4, 23); if (h % 3 === 0) G.rect(wx + 1, wy + 4, 3, 5, 14); if (h === 3 + (n - 1) * 2 || h === 2 + n * 2) G.rect(wx, wy, 8, 9, hitIn(tf, SAFE, 0.17) ? 24 : 23); } } }
    panel(G, 196, 150, 112, 24, { bd: 23, cr: 31 }); G.text(GL, '￥38000/平', 206, 156, 23);
    G.rect(208, 174, 3, 14, 0); G.rect(292, 174, 3, 14, 0);
    CHAR.draw(G, { who: 'him', x: 74, y: 196, size: 36, facing: 'right', t: tf, light: () => 0.55, expression: 'sad' });
    drawRain(G, tf, 0.7, tf);
    const pct = 12 + n; panel(G, 64, 6, 214, 34);
    G.text(GL, '安全感', 70, 10, 8); G.rect(110, 14, 120, 6, 2); G.rect(110, 14, Math.round(120 * pct / 100), 6, hitIn(tf, SAFE, 0.17) ? 8 : 43);
    G.text(GL, pct + '%', 236, 10, 23);
    if (Math.floor(tf * 4) % 2) G.text(GL, '还差 ' + (100 - pct) + '%', 110, 23, 31);
  }
  // ============================== O10 爱：字砸下来，人越缩越小 ==============================
  function shotLove(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, y > 186 ? G.dith([1, 2], 1 - (y - 186) / 20, x, y) : 44);
    const land = 64.08, sc = 12, gx = 118, gy = 186 - 12 * sc + 4, y0 = tf < land ? Math.round(lerp(-160, gy, seg(tf, 63.86, land))) : gy;
    for (let y = 0; y < 186; y++) for (let x = 0; x < LW; x++) { const hw = 30 + y * 0.72; if (Math.abs(x - 188) < hw && PIX.bt(x, y) < 0.16) G.px(x, y, 3); }
    big(G, '爱', gx, y0, sc, 8, [6, 6, 43]);
    const sizes = [[63, 54], [64.76, 36], [65.31, 24], [65.82, 14], [66.2, 8]]; let size = 54; for (const [t, z] of sizes) if (tf >= t) size = z;
    CHAR.draw(G, { who: 'him', x: 70, y: 186, size, facing: 'right', t: tf, light: () => 0.6, expression: 'sad', action: size > 20 ? 'slump' : 'idle', u: 0.4 });
    if (tf >= land && tf < land + 0.5) for (let i = 0; i < 40; i++) { const u = (tf - land) / 0.5, a = rnd('ld' + i) > 0.5 ? 1 : -1, x = (a > 0 ? 270 : 120) + a * u * 60 * rnd('lv' + i), y = 186 - Math.sin(u * 3) * 14 * rnd('lh' + i); G.px(x, y, 5); }
    shakeAt(G, tf, [land], 6); shakeAt(G, tf, [64.76, 65.31, 65.82], 2);
  }
  function openRoom(dst, tf) {   // 66.36：屋里是黑的，吊灯啪地亮了——原来一直坐在这儿
    const st = { s: tf, tf, I: tf < 66.45 ? 0.08 : 0.5, rain: 0.45, sway: 0 };
    drawRoom(dst, 0, st);
    CHAR.draw(dst, { who: 'him', ...HIM_SEAT, facing: 'left', action: 'sitHunch', u: 0.9, t: tf, light: roomLight(st.I), expression: 'sad', hold: CHAR.PROPS.phone });
    drawTableTop(dst, 0, st); drawLamp(dst, 0, st); cold(dst);
  }

  // ============================== 结尾 ==============================
  const MAZE = ['####################', '#........#.........#', '#.##.###.#.###.###.#', '#.##.....#.....###.#', '#....###.#.###.....#', '####.#.......#.#####', '####.#.##.##.#.#####', '#......#...#.......#', '#.####.#.#.#.#####.#', '#.#......#......#..#', '#...####.#.####...##', '####################'];
  const CELL = 16, MY = 6, cellXY = ([c, r]) => [c * CELL + 8, r * CELL + 8 + MY], isWall = (c, r) => !MAZE[r] || MAZE[r][c] !== '.';
  function bfs(a, b) { const key = (p) => p[0] + ',' + p[1], prev = { [key(a)]: null }, Q = [a]; while (Q.length) { const p = Q.shift(); if (p[0] === b[0] && p[1] === b[1]) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [p[0] + dx, p[1] + dy]; if (!isWall(n[0], n[1]) && !(key(n) in prev)) { prev[key(n)] = p; Q.push(n); } } } const out = []; let cur = b; while (cur) { out.unshift(cur); cur = prev[key(cur)]; } return out; }
  function route(pts) { let r = [pts[0]]; for (let i = 1; i < pts.length; i++) r = r.concat(bfs(pts[i - 1], pts[i]).slice(1)); return r; }
  const alongR = (r, u) => { const f = clamp(u) * (r.length - 1), i = Math.min(r.length - 2, Math.floor(f)), k = f - i, a = cellXY(r[i]), b = cellXY(r[i + 1]); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), b[0] - a[0], b[1] - a[1], f]; };
  function drawMaze(G, wall, dim) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, (x + y) % 8 === 0 ? 3 : 2);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 20; c++) { if (!isWall(c, r)) continue; const x = c * CELL, y = r * CELL + MY;
      G.rect(x, y, CELL, CELL, dim);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { if (c + dx < 0 || c + dx >= 20 || r + dy < 0 || r + dy >= 12 || isWall(c + dx, r + dy)) continue; if (dx) G.rect(x + (dx > 0 ? CELL - 2 : 0), y, 2, CELL, wall); else G.rect(x, y + (dy > 0 ? CELL - 2 : 0), CELL, 2, wall); } }
  }
  function topHim(G, x, y, f) { x = Math.round(x); y = Math.round(y); const sw = f % 2 ? 1 : -1; G.ellipse(x - 7, y + sw, 2, 2, 22, 0); G.ellipse(x + 7, y - sw, 2, 2, 22, 0); G.ellipse(x, y + 1, 7, 5, (a, b) => G.dith([25, 23, 24], 1.4 - (b - y) / 3, a, b), 0); G.ellipse(x, y - 1, 4.6, 4.6, (a, b) => (a + b - x - y < -3 ? 3 : 0), 8); }
  function ghost(G, x, y, f, scared) { x = Math.round(x); y = Math.round(y); const hair = scared ? 18 : 28, skirt = scared ? 4 : 8; G.shape([x - 7, y - 7, x + 7, y + 7], (a, b) => (b < y ? Math.hypot(a - x, b - y) <= 6.5 : Math.abs(a - x) <= 6.5 && b < y + 6 - ((Math.floor(a + f) % 4 < 2) ? 2 : 0)), (a, b) => (b < y + 1 ? hair : skirt), 0); G.rect(x - 3, y - 2, 2, 2, 8); G.rect(x + 2, y - 2, 2, 2, 8); G.px(x - 2, y - 1, 0); G.px(x + 3, y - 1, 0); }
  function capsule(G, x, y, pulse) { const r = 4 + pulse; G.limb([x - r, y + r / 2], [x + r, y - r / 2], r, r, (a, b) => ((a - x) + (b - y) * 0.5 > 0 ? 8 : 31), 0); }
  function bigX(G, x, y, r, c = 31) { for (let k = -r; k <= r; k++) for (const d of [-1, 0, 1]) { G.px(x + k + d, y + k, c); G.px(x + k + d, y - k, c); } }
  // E1 第 23 句：迷宫，走哪边都是死路
  const R1 = route([[9, 7], [9, 5], [6, 5], [6, 7]]), R2 = route([[6, 7], [6, 5], [12, 5], [12, 7]]);
  function shotMaze(G, tf) {
    const f = Math.floor(tf * 12); drawMaze(G, 40, 41);
    const T1a = 118.75, T2a = 119.68; let p;
    if (tf < T1a) p = alongR(R1, seg(tf, 117.75, T1a - 0.08)); else p = alongR(R2, seg(tf, T1a + 0.12, T2a));
    if (tf >= T1a) { const [x, y] = cellXY([6, 7]); bigX(G, x, y, 6); }
    if (tf >= T2a) { const [x, y] = cellXY([12, 7]); bigX(G, x, y, 6); }
    topHim(G, p[0], p[1], f);
    shakeAt(G, tf, [T1a, T2a], 2);
  }
  // E2、E3 第 24–25 句：她发布的任务；全部做到了，奖励却发不出去
  const QUEST = ['按时吃饭', '别熬夜', '出门带伞', '少喝点酒'];
  const TICKS = [121.62, 121.92, 122.2, 122.48];
  function shotQuest(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2], (y / LH) * 1.5, x, y));
    panel(G, 40, 18, 240, 176, { bg: 45, bd: 46, cr: 43 });
    CHAR.drawHead(G, { who: 'her', x: 70, y: 48, r: 18, facing: 'front', expression: 'neutral', t: tf });
    G.text(GL, '任务', 100, 28, 43); big(G, '她的叮嘱', 100, 42, 2, 46);
    QUEST.forEach((q0, i) => { const app = 119.81 + i * 0.32; if (tf < app) return; const y = 78 + i * 26, dx = tf < app + 0.09 ? 6 : 0;
      G.rect(62 + dx, y, 14, 14, 46); G.rect(63 + dx, y + 1, 12, 12, 45);
      if (tf >= TICKS[i]) { const c = 37; G.line(65, y + 7, 68, y + 11, c); G.line(68, y + 11, 74, y + 2, c); G.line(65, y + 6, 68, y + 10, c); G.line(68, y + 10, 74, y + 1, c); }
      big(G, q0, 84 + dx, y - 5, 2, tf >= TICKS[i] ? 47 : 46); if (tf >= TICKS[i]) G.rect(83, y + 6, bigW(q0, 2) + 2, 2, 43); });
    if (tf >= 122.72) {   // 全做到了，灯却暗下去：屏幕一点点黑掉，只剩一个没人理的弹窗
      const k = smooth(seg(tf, 122.72, 123.3)) * 0.8;
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (PIX.bt(x, y) < k) G.B[y * LW + x] = 44;
      panel(G, 70, 88, 180, 60, { bg: 44, bd: 4, cr: 5 });
      big(G, '全部完成', 112, 92, 2, 6);
      if (tf >= 123.05) { G.text(GL, '奖励发送给 她', 88, 124, 8); if (Math.floor((tf - 123.05) * 6) % 3 !== 1) { G.ellipse(226, 130, 6, 6, 31, 0); G.rect(225, 126, 2, 5, 8); G.rect(225, 132, 2, 2, 8); } }
    }
  }
  // E4 第 26 句：状态栏，全是问号
  function shotStatus(G, tf) {
    G.fill(44); for (let y = 0; y < LH; y += 4) for (let x = (y % 8 ? 2 : 0); x < LW; x += 4) G.px(x, y, 1);
    const herQ = tf >= 123.9, himQ = tf >= 124.85, f = Math.floor(tf * 12);
    [[12, 'her', '她', herQ], [166, 'him', '我', himQ]].forEach(([x, who, name, Q]) => {
      panel(G, x, 26, 142, 170);
      if (!Q) CHAR.drawHead(G, { who, x: x + 71, y: 66, r: 24, facing: 'front', expression: who === 'her' ? 'neutral' : 'sad', t: tf });
      else { for (let j = 40; j < 94; j += 2) { const d = (rnd('qg' + f + j) - 0.5) * 8; if (rnd('qh' + f + j) < 0.3) G.rect(Math.round(x + 40 + d), j, 60, 2, [3, 4, 42][j % 3]); } big(G, '?', x + 56, 42, 4, 8, [2, 2, 43]); }
      G.text(GL, Q ? '???' : name, x + 62, 100, 8);
      for (let i = 0; i < 4; i++) { const y = 120 + i * 17; G.rect(x + 10, y, 122, 8, 2); const v = Q ? rnd('qv' + who + i + f) : [0.7, 0.45, 0.85, 0.3][i]; G.rect(x + 10, y, Math.round(122 * v), 8, Q ? 42 : 40); if (Q) G.text(GL, '?', x + 66, y - 3, 8); }
    });
    shakeAt(G, tf, [123.9, 124.85], 3);
  }
  // E5 第 27 句：删除这段存档？否（对话框在 ui 里，照片走老电影）
  function shotDelete(G) { drawSea(G, 109.25, { photo: true }); drawPhotoFrame(G); }
  // E6 第 28 句：GAME OVER → 投币 → 继续，Lv.24
  const up = (tf) => tf >= 129.7;
  function shotOver(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, y > 186 ? G.dith([1, 2], 1 - (y - 186) / 20, x, y) : 44);
    CHAR.draw(G, { who: 'him', x: 160, y: 186, size: 60, facing: 'right', t: tf, light: () => (up(tf) ? 0.8 : 0.65), expression: 'sad', action: up(tf) ? 'idle' : 'kneel', u: 1 });
    if (tf >= 129.1 && tf < 129.7) { const u = seg(tf, 129.1, 129.68), y = Math.round(lerp(-10, 150, u * u)); G.ellipse(160, y, 5 - (Math.floor(tf * 12) % 2) * 3, 5, 23, 0); }
    if (up(tf) && tf < 130.1) for (let i = 0; i < 24; i++) { const u = (tf - 129.7) / 0.4, a = i / 24 * Math.PI * 2; G.px(160 + Math.cos(a) * u * 50, 150 + Math.sin(a) * u * 50, 23); }
  }
  // E7 第 29 句：商店，全都买不起
  const SHOP_ITEMS = [[130.21, 'lv', 'LV', '老花手袋', '￥15800'], [130.72, 'cn', '香奈儿', '链条包', '￥42000'], [131.23, 'rx', '劳力士', '手表', '￥76000'], [131.74, 'bb', '巴黎世家', '球鞋', '￥8900']];
  function itemIcon(G, kind, cx, cy) {
    if (kind === 'bb') { G.poly([[cx - 22, cy - 2], [cx - 8, cy - 14], [cx + 4, cy - 12], [cx + 22, cy + 2], [cx + 24, cy + 10], [cx - 22, cy + 10]], (x, y) => (y > cy + 4 ? 2 : (x + y) % 9 < 2 ? 5 : 8), 0); G.line(cx - 6, cy - 8, cx + 4, cy - 4, 2); G.line(cx - 3, cy - 10, cx + 7, cy - 6, 2); G.rect(cx - 22, cy + 10, 46, 3, 7); }
    else if (kind === 'rx') { G.rect(cx - 8, cy - 26, 16, 52, 0); G.rect(cx - 7, cy - 26, 14, 52, 25); for (let y = cy - 26; y < cy + 26; y += 4) G.rect(cx - 7, y, 14, 1, 15); G.ellipse(cx, cy, 15, 15, 23, 0); G.ellipse(cx, cy, 11, 11, 41, 0); G.line(cx, cy, cx + 6, cy - 3, 8); G.line(cx, cy, cx - 2, cy - 8, 8); }
    else if (kind === 'cn') { G.poly([[cx - 20, cy - 8], [cx + 20, cy - 8], [cx + 22, cy + 16], [cx - 22, cy + 16]], (x, y) => ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0 ? 2 : 44), 0); G.line(cx - 14, cy - 8, cx - 6, cy - 22, 23); G.line(cx + 14, cy - 8, cx + 6, cy - 22, 23); G.line(cx - 6, cy - 22, cx + 6, cy - 22, 23); G.rect(cx - 3, cy - 3, 6, 4, 23); }
    else { G.poly([[cx - 22, cy - 6], [cx + 22, cy - 6], [cx + 26, cy + 16], [cx - 26, cy + 16]], (x, y) => ((x + y * 3) % 10 < 2 ? 17 : 14), 0); G.rect(cx - 26, cy + 4, 52, 2, 16); for (const d of [-10, 10]) { G.line(cx + d, cy - 6, cx + d, cy - 18, 15); } G.line(cx - 10, cy - 18, cx + 10, cy - 18, 15); G.rect(cx - 2, cy - 2, 4, 4, 23); }
  }
  function shotShop(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([1, 2], (y % 16 < 1 ? 1 : 0.3), x, y));
    panel(G, 62, 6, 248, 20); G.text(GL, '商店', 72, 10, 8); G.text(GL, '余额 ￥324', 238, 10, 23);
    SHOP_ITEMS.forEach(([t0, kind, brand, name, price], i) => { const x = 10 + (i % 2) * 152, y = 32 + (i >> 1) * 88, sel = tf >= t0 && (i === 3 || tf < SHOP_ITEMS[i + 1][0]);
      panel(G, x, y, 148, 82, sel ? { bd: 23, cr: 31, bg: 1 } : { bg: 44 }); itemIcon(G, kind, x + 36, y + 42);
      G.text(GL, brand, x + 72, y + 12, 8); G.text(GL, name, x + 72, y + 28, 6); G.text(GL, price, x + 72, y + 50, tf >= t0 ? 31 : 6);
      if (sel) { cursor(G, x + 64, y + 52, 23); if (tf < t0 + 0.36) { panel(G, x + 66, y + 62, 76, 16, { bd: 43, cr: 31 }); ctext(G, '余额不足', x + 104, y + 63, 31); } } });
  }
  // E8 第 30–31 句：吃药。她的影子一直在后面追；吃下药，影子变蓝往回逃；追上时，碎成一颗小心，没了
  const RP = route([[1, 1], [8, 1], [8, 4], [8, 5], [12, 5]]), PILLC = [12, 5], T_EAT = 135.15, T_CATCH = 136.66;
  function shotPill(G, tf) {
    const f = Math.floor(tf * 12), pow = tf >= T_EAT && tf < T_CATCH, caught = tf >= T_CATCH;
    drawMaze(G, caught ? 4 : pow ? 42 : 40, caught ? 2 : pow ? 43 : 41);
    const u = seg(tf, 132.27, T_EAT), p = tf < T_EAT ? alongR(RP, u) : alongR(RP, 1 - seg(tf, T_EAT, T_CATCH + 0.3) * 0.8);
    const fi = alongR(RP, u)[4];
    for (let r = 0; r < 12; r++) for (let c = 0; c < 20; c++) { if (isWall(c, r)) continue; const idx = RP.findIndex((q0) => q0[0] === c && q0[1] === r); if ((idx >= 0 && idx <= fi) || idx === RP.length - 1) continue; const [x, y] = cellXY([c, r]); G.rect(x - 1, y - 1, 2, 2, caught ? 4 : 24); }   // 豆子
    if (tf < T_EAT) { const [x, y] = cellXY(PILLC); capsule(G, x, y, Math.floor(tf * 4) % 2 + (tf >= 134.03 ? 2 : 0)); }
    if (tf < T_EAT) { const g = alongR(RP, Math.max(0, u - 0.2)); if (tf > 132.7) ghost(G, g[0], g[1], f, false); }
    else if (!caught) { const lead = 0.2 * (1 - seg(tf, T_EAT, T_CATCH)); const g = alongR(RP, Math.max(0, 1 - seg(tf, T_EAT, T_CATCH + 0.3) * 0.8 - lead)); ghost(G, g[0], g[1], f, true); }
    else if (tf < 137.3) { const k = (tf - T_CATCH) / 0.64; if (k < 0.9) HEART.forEach((row, j) => [...row].forEach((ch, c) => { if (ch !== '.') G.px(Math.round(p[0]) - 3 + c, Math.round(p[1] - 14 - k * 24) + j, ch === 'k' ? 0 : 42); })); }
    topHim(G, p[0], p[1], caught ? 0 : f);
    if (tf >= T_EAT && tf < T_EAT + 0.09) G.fill(8);
    shakeAt(G, tf, [T_EAT], 3);
  }
  // E9 第 32 句：答应你的事，一张一张盖上"未完成"
  let DREAM = null;
  const DREAMS = ['给你一个家', '一枚戒指', '一场婚礼', '一起变老'];
  function dreamScene(i) {   // 没发生过的事：都是想象出来的，所以画得淡、像褪了色的旧画
    const G = T1, tf = 1; G.fill(13);
    const sky = (ramp) => { for (let y = 0; y < 72; y++) for (let x = 0; x < 120; x++) G.px(x, y, G.dith(ramp, y / 72 * (ramp.length - 1), x, y)); };
    const ground = (y0, ramp) => { for (let y = y0; y < 72; y++) for (let x = 0; x < 120; x++) G.px(x, y, G.dith(ramp, (y - y0) / 8, x, y)); };
    const L = () => 0.7, P = (who, x, y, size, facing, extra = {}) => CHAR.draw(G, Object.assign({ who, x, y, size, facing, t: tf, light: L, blink: false, expression: 'happy' }, extra));
    if (i === 0) { sky([3, 12, 42, 25]); ground(58, [15, 14]); G.poly([[22, 34], [56, 12], [90, 34]], 43, 0); G.rect(28, 34, 56, 26, 0); G.rect(29, 34, 54, 25, 17); G.rect(36, 40, 12, 10, 0); G.rect(37, 41, 10, 8, 24); G.rect(62, 42, 12, 17, 14); P('him', 98, 64, 26, 'front'); P('her', 110, 64, 24, 'front'); }
    else if (i === 1) { G.fill(14); for (let y = 0; y < 72; y++) for (let x = 0; x < 120; x++) if (Math.hypot(x - 60, y - 34) < 34 && PIX.bt(x, y) < 0.5 * (1 - Math.hypot(x - 60, y - 34) / 34)) G.px(x, y, 25); G.rect(36, 44, 48, 22, 0); G.rect(37, 45, 46, 20, 43); G.rect(37, 45, 46, 3, 31); G.rect(44, 48, 32, 12, 44);
      G.shape([44, 18, 76, 50], (x, y) => { const d = Math.hypot(x - 60, y - 36); return d <= 12 && d >= 8.5; }, 23, 0); G.poly([[54, 22], [60, 14], [66, 22], [60, 30]], (x, y) => (x < 60 ? 26 : 8), 0); G.rect(70, 12, 1, 5, 8); G.rect(68, 14, 5, 1, 8); }
    else if (i === 2) { sky([5, 42, 25, 24]); ground(60, [16, 15]); G.limb([26, 62], [26, 22], 2, 2, 8, 0); G.limb([94, 62], [94, 22], 2, 2, 8, 0); for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16, x = 60 - Math.cos(a) * 34, y = 24 - Math.sin(a) * 18; G.ellipse(x, y, 3, 3, k % 2 ? 42 : 8, 0); } P('him', 50, 66, 34, 'front'); P('her', 70, 66, 32, 'front'); G.poly([[62, 36], [78, 36], [84, 66], [56, 66]], (x, y) => (PIX.bt(x, y) < 0.7 ? 8 : 7), null); for (let k = 0; k < 14; k++) G.rect(Math.floor(rnd('wd' + k) * 120), Math.floor(rnd('we' + k) * 50), 2, 2, k % 2 ? 42 : 8); }
    else { sky([12, 42, 25, 23]); G.ellipse(84, 44, 12, 12, 24, null); ground(56, [14, 13]); G.limb([12, 60], [14, 24], 3, 3, 14, 0); G.ellipse(16, 18, 16, 12, 15, 0); G.rect(36, 50, 56, 3, 14); G.rect(40, 53, 3, 9, 14); G.rect(84, 53, 3, 9, 14); P('him', 54, 60, 26, 'back'); P('her', 72, 60, 24, 'back'); }
    const out = new Uint8Array(120 * 72); for (let j = 0; j < 72; j++) for (let k = 0; k < 120; k++) { const c = SEPIA[G.get(k, j)] ?? 13; out[j * 120 + k] = PIX.bt(k, j) < 0.28 ? 29 : c; } return out;
  }
  const STAMPS = [138.07, 139.08, 140.06, 140.83];
  function shotDebt(G, tf) {
    if (!DREAM) DREAM = DREAMS.map((_, i) => dreamScene(i));
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 9, 10], 0.6 + (x % 24 < 1 ? 0.4 : 0) + (y / LH), x, y));
    ctext(G, '答应你的', 160, 6, 8, 0);
    const pos = [[26, 26], [174, 26], [26, 116], [174, 116]];
    DREAM.forEach((data, i) => { const [x, y] = pos[i]; if (tf < 137.4 + i * 0.1) return; G.rect(x - 4, y - 4, 128, 88, 0); G.rect(x - 3, y - 3, 126, 86, 8);
      for (let j = 0; j < 72; j++) for (let k = 0; k < 120; k++) G.px(x + k, y + j, data[j * 120 + k]);
      ctext(G, DREAMS[i], x + 60, y + 72, 46); G.rect(x + 56, y - 7, 8, 6, 31);
      const st = STAMPS[i]; if (tf >= st) { const d = Math.floor((tf - st) * 12), sc = 2 + (d < 1 ? 1 : 0), str = '未完成', w = bigW(str, sc), sx = x + 60 - Math.round(w / 2), sy = y + 36 - 7 * sc; G.rect(sx - 3, sy - 2, w + 6, 13 * sc + 4, 8);
        G.rect(sx - 3, sy - 2, w + 6, 2, 31); G.rect(sx - 3, sy + 13 * sc, w + 6, 2, 31); G.rect(sx - 3, sy - 2, 2, 13 * sc + 4, 31); G.rect(sx + w + 1, sy - 2, 2, 13 * sc + 4, 31); big(G, str, sx, sy, sc, 31); } });
    shakeAt(G, tf, STAMPS.slice(0, 3), 3); shakeAt(G, tf, [STAMPS[3]], 6);
  }
  // E10 一夜过去
  function roomE(dst, tf, himOpt = {}, opt = {}) {
    const cam = opt.cam || 0, st = Object.assign({ s: tf, tf, I: 0.5, rain: 0.6, sway: 0 }, opt);
    drawRoom(dst, cam, st);
    const lightR = roomLight(st.I), o = Object.assign({ who: 'him', ...HIM_SEAT, x: HIM_SEAT.x - cam, facing: 'left', action: 'sitHunch', u: 0.6, t: tf, light: (x, y) => lightR(x + cam, y), expression: 'sad' }, himOpt);
    CHAR.draw(dst, o); drawTableTop(dst, cam, st); drawLamp(dst, cam, st); cold(dst); return o;
  }
  function shotNight(G, tf) {
    if (tf < 142.0) { roomE(G, tf, { action: 'sitSlump', u: 1, blink: true }, { I: 0.5, rain: 0.6, dawn: 0 }); return; }
    // 整屏的钟越转越快：背景从夜色亮到天蒙蒙亮，雨停
    const k = seg(tf, 142.0, 144.9), cx = 160, cy = 100, R = 78, t = clock(tf);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2, 3, 12, 5, 42], k * 5.6 + (y / LH) * 0.9, x, y));
    if (k < 0.7) drawRain(G, tf, 0.7 * (1 - k / 0.7), tf);
    G.ellipse(cx, cy, R + 7, R + 7, (x, y) => G.dith([14, 15, 16], 1.2 - (x - cx + y - cy) / 90, x, y), 0);
    G.ellipse(cx, cy, R, R, (x, y) => G.dith([7, 8], 1.4 - Math.hypot(x - cx, y - cy) / R, x, y), 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = R - (i % 3 ? 7 : 12); G.line(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * (R - 3), cy - Math.cos(a) * (R - 3), 1); if (i % 3 === 0) G.line(cx + Math.sin(a) * r0 + 1, cy - Math.cos(a) * r0, cx + Math.sin(a) * (R - 3) + 1, cy - Math.cos(a) * (R - 3), 1); }
    const ha = t / 43200 * Math.PI * 2, ma = t / 3600 * Math.PI * 2;
    G.limb([cx, cy], [cx + Math.sin(ha) * 40, cy - Math.cos(ha) * 40], 3, 2.2, 0, null);
    G.limb([cx, cy], [cx + Math.sin(ma) * 66, cy - Math.cos(ma) * 66], 2, 1.2, 0, null);
    G.ellipse(cx, cy, 4, 4, 31, 0);
  }
  // E11 天亮的海：只有他一个人。和照片同一个构图，她的位置空着
  function shotDawn(G, tf) {
    drawBeach(G, tf, { dawn: true, her: false });
    if (tf >= 149.12) {
      drawTitle(G, tf, { noDrop: true, y: 12 });
      const sel = tf < 151.18 ? 0 : 2, moving = tf >= 150.6 && tf < 151.18;
      drawMenu(G, tf, sel, { slide: 149.12, dim: [0, 1], selY: moving ? seg(tf, 150.6, 151.18) * 2 : sel, press: tf >= 152.7 && Math.floor(tf * 12) % 2 === 0 });
    }
  }
  // E12 片尾
  function shotEnd(G, tf) {
    G.fill(44);
    for (let y = 2; y < LH; y += 6) for (let x = (y % 12 === 2 ? 3 : 0); x < LW; x += 6) if (PIX.bt(x, y) < 0.6) G.px(x, y, 2);
    for (let i = 0; i < 24; i++) { const x = Math.floor(rnd('es' + i) * LW), y = Math.floor(rnd('et' + i) * 190); if (Math.floor(tf * 3 + i) % 5) G.px(x, y, i % 3 ? 5 : 40); }
    const sc = 8, w = bigW('唉', sc); big(G, '唉', Math.round(160 - w / 2 - 22), 34, sc, 8, [6, 6, 43]);
    big(G, 'u say', Math.round(160 + w / 2 - 12), 92, 2, 8, [2, 2, 43]);
    ctext(G, '张方钊', 160, 140, 8); ctext(G, '词曲 张方钊', 160, 156, 6);
    const b = Math.floor((tf - 153.25) * 1.94) % 2 === 0 ? 2 : 1; HEART.forEach((row, j) => [...row].forEach((ch, k) => { if (ch !== '.') G.rect(153 + (k * b) - (b - 1) * 3, 176 + j * b, b, b, ch === 'k' ? 0 : 31); }));
    if (tf >= 154.8) G.text(GL, 'pt.1 →', 276, 8, 6);
    if (tf < 153.34) G.fill(8);
  }

  // ============================== 分发 ==============================
  function frame(G, s) {
    const tf = q(s);
    if (tf < 13.31) shotBoot(G, tf);
    else if (tf < 16.70) shotFall(G, tf);
    else if (tf < 22.79) shotLand(G, tf);
    else if (tf < 26.61) shotForever(G, tf);
    else if (tf < 30.34) shotFlood(G, tf);
    else if (tf < 42.85) shotUnder(G, tf);
    else if (tf < 45.65) shotSurface(G, tf);
    else if (tf < 47.58) shotBowls(G, tf);
    else if (tf < 48.67) shotCity(G, tf);
    else if (tf < 50.43) shotAdFull(G, tf);
    else if (tf < 55.73) shotHail(G, tf);
    else if (tf < 59.91) shotHeart(G, tf);
    else if (tf < 63.91) shotSafe(G, tf);
    else if (tf < 66.36) shotLove(G, tf);
    else if (tf < 66.87) openRoom(G, tf);
    else if (tf < 119.81) shotMaze(G, tf);
    else if (tf < 123.47) shotQuest(G, tf);
    else if (tf < 126.08) shotStatus(G, tf);
    else if (tf < 128.14) shotDelete(G);
    else if (tf < 130.21) shotOver(G, tf);
    else if (tf < 132.27) shotShop(G, tf);
    else if (tf < 137.34) shotPill(G, tf);
    else if (tf < 141.34) shotDebt(G, tf);
    else if (tf < 144.99) shotNight(G, tf);
    else if (tf < 153.25) shotDawn(G, tf);
    else shotEnd(G, tf);
  }
  function hearts(s) { if (s >= 45.65 && s < 47.58) return 3; if (s < 66.87) return s < 8.66 ? 3 : s < 10.24 ? 2 : 1; if (s >= 153.25) return -1; return s >= 128.41 && s < 129.7 ? 0 : 1; }
  function flash(s) { if (s >= 8.66 && s < 8.83) return 2; if (s >= 10.24 && s < 10.41) return 1; if (s >= 128.25 && s < 128.41) return 0; if (s >= 129.7 && s < 129.95) return 0; return -1; }
  function ui(GU, s) {
    const tf = q(s);
    if (tf >= 126.08 && tf < 128.14) {   // 删除存档？照片留在老电影效果里，对话框是清楚的
      panel(GU, 70, 74, 180, 62, { bd: 43, cr: 31 }); ctext(GU, '删除这段存档？', 160, 82, 8);
      const sel = tf < 127.15 ? 0 : 1, press = tf >= 127.6;
      GU.text(GL, '是', 112, 106, sel === 0 ? 8 : 5); GU.text(GL, '否', 190, 106, sel === 1 ? (press ? 23 : 8) : 5);
      if (Math.floor(tf * 4) % 2 === 0 || press) cursor(GU, sel === 0 ? 100 : 178, 108);
    }
    if (tf >= 128.14 && tf < 130.21) {   // GAME OVER 用清楚的红字
      const k = Math.floor((tf - 128.41) * 12);
      if (tf >= 128.41) { const sc = k < 1 ? 4 : 3, str = 'GAME OVER', w = bigW(str, sc); big(GU, str, Math.round((LW - w) / 2), 36, sc, up(tf) ? 4 : 31, [2, 2, 44]); }
      if (tf >= 128.41 && tf < 129.3) { const u = (tf - 128.41) / 0.9; HEART.forEach((row, j) => [...row].forEach((ch, c) => { if (ch === '.') return; const left = c < 3 || (c === 3 && j % 2 === 0), dx = Math.round((left ? -1 : 1) * u * 8), dy = Math.round(u * u * 30); GU.rect(8 + c * 2 + dx, 7 + j * 2 + dy, 2, 2, ch === 'k' ? 0 : 31); })); }
      if (tf >= 128.91 && !up(tf)) { ctext(GU, '继续？', 160, 82, 8); big(GU, '24', 136, 96, 2, 23, [1, 1, 43]); }
      if (up(tf)) { const sc = 2, str = 'Lv.24', w = bigW(str, sc); big(GU, str, Math.round((LW - w) / 2), 84, sc, 23, [2, 2, 43]); }
    }
  }
  const gray = (tf) => (tf >= 128.41 && tf < 129.7 ? 1 : 0);
  const fade = (tf) => 0.9 * smooth(seg(tf, 157.4, 158));
  const warm = (tf) => tf < 8.66 || (tf >= 48.67 && tf < 50.43) || (tf >= 144.99 && tf < 153.25);
  function clock(tf) {   // 141.34 之后：钟从快 3 点越转越快，到 144.99 切走时是 5:50
    const base = 2 * 3600 + 47 * 60 + 20 + (tf - 66.87), target = 5 * 3600 + 50 * 60 - (2 * 3600 + 47 * 60 + 20 + (144.99 - 66.87));
    return base + target * Math.pow(seg(tf, 141.34, 144.99), 1.6);
  }
  window.BOOK = { frame, hearts, flash, ui, gray, fade, clock, warm, barFloor, BARS };
})();
