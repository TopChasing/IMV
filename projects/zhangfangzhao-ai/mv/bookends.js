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
  const NEWTXT = ['上周六', '谢谢你带我去看海', '是不是花了你好多钱', '值得', '今天 21:40', '下班了吗', '还剩两单', '路上慢点，别闯红灯', '在等红灯呢',
    '你会一直对我这么好吗', '会啊，我们以后永远在一起吧', '永远！！！', '她', '发送', '活动已结束', '我以后一定要', '让你过上好日子', '明天我生日', '送你那个香奈儿的包',
    '本单收入 +￥6', '你的作品《说唱之神在哭泣》', '新增播放 1 次', '你还要坚持你那不切实际的', '理想到什么时候', '……', 'A  继续送外卖，攒钱买房', 'B  坚持说唱，出专辑',
    '一个月没抽烟啦！', '骑车慢点', '少抽点烟', '喜欢', '梦想', '害怕', '有个自己的家', '看不到未来', '出专辑', '失去你', '<', '·'];
  window.BOOK_CHARS_V6 = '这么晚了还要出去啊继续送外卖放弃说唱梦老老实实过日子，美食、看海财富自由怕黑成为 rap star孤独我才24一定要余额￥324药在第二格记得按时吃r';
  window.BOOK_CHARS = window.BOOK_CHARS_V6 + NEWTXT.join('') + '已离开队伍喜欢看海晚霞爱吃草莓想要说唱出专辑怕失去你是谁锟斤拷烫#%&@*海边双人游给你一个家一枚戒指一场婚礼一起变老余额不足LV香奈儿劳力士巴黎世家老花手袋链条包手表球鞋￥平/u say唉张方钊继续游戏读取存档新的开始和她第1024天已损坏永远眼泪失败碗筷安全感还差0123456789%爱任务叮嘱按时吃饭别熬夜出门带伞少喝点酒全部完成奖励发送给状态？?我你GAME OVER继续Lv.商店金币不足装备中紫拖鞋未答应词曲pt.1→删除这段是否G';
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
  const TINY = { R: ['110', '101', '110', '101', '101'], A: ['010', '101', '111', '101', '101'], P: ['110', '101', '110', '100', '100'], E: ['111', '100', '110', '100', '111'], C: ['011', '100', '100', '100', '011'] };
  function tiny(G, str, x, y, c) { for (const ch of str) { const g = TINY[ch]; if (g) g.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') G.px(x + i, y + j, c); })); x += 4; } }
  const CB = PIX.create(LW, LH);   // 画 UI 用的临时层
  function sayBox(G, lines, cx, by, o = {}) {   // 说话 / 想法气泡：白底黑字；o.tail = 尾巴指向的点；o.think = 一串小圆点
    const w = Math.max(...lines.map((l) => G.textW(GL, l))) + 12, h = lines.length * 13 + 6, bg = o.bg ?? 8, fg = o.fg ?? 0, pop = o.pop ? 2 : 0;
    const x0 = Math.round(clamp(cx - w / 2, 3, LW - 3 - w)) - pop, y0 = Math.round(by - h) - pop;
    G.rect(x0 + 2, y0 - 1, w - 4 + pop * 2, h + 2 + pop * 2, 0); G.rect(x0 - 1, y0 + 2, w + 2 + pop * 2, h - 4 + pop * 2, 0); G.rect(x0 + 1, y0, w - 2 + pop * 2, h + pop * 2, bg); G.rect(x0, y0 + 1, w + pop * 2, h - 2 + pop * 2, bg);
    if (o.tail && !o.think) { const tx = Math.round(clamp(o.tail[0], x0 + 8, x0 + w - 8)), n = Math.max(3, Math.min(8, o.tail[1] - (y0 + h))); for (let k = 0; k < n; k++) { const xx = Math.round(lerp(tx, o.tail[0], k / n)), ww = Math.max(1, Math.round(4 * (1 - k / n))); G.rect(xx - ww - 1, y0 + h + k, ww * 2 + 2, 1, 0); G.rect(xx - ww, y0 + h + k - 1, ww * 2, 1, bg); } }
    if (o.tail && o.think) [[0.35, 3], [0.65, 2], [0.9, 1.4]].forEach(([u, r]) => { const xx = lerp(x0 + w * 0.7, o.tail[0], u), yy = lerp(y0 + h + 2, o.tail[1], u); G.ellipse(xx, yy, r + 1, r + 1, 0, null); G.ellipse(xx, yy, r, r, bg, null); });
    lines.forEach((l, i) => G.text(GL, l, x0 + 6 + pop, y0 + 3 + pop + i * 13, fg));
    return { x0, y0, w, h };
  }
  const HEADS = {};
  function R6(G, cam, st) { ROOM6.draw(G, cam, Object.assign({ clock: clockSec(st.tf), photo: wallPhotoPixels() }, st)); }
  const HELMET = { draw(G, h) { G.shape([h.x - 8, h.y - 13, h.x + 8, h.y + 1], (x, y) => { const u = (x - h.x) / 8, v = (y - h.y) / 12; return v <= 0.05 && u * u + v * v <= 1; }, (x, y) => (y > h.y - 1 ? 13 : G.dith([25, 23, 24], 1.2 - (y - h.y + 12) / 12, x, y)), 0); G.rect(h.x - 6, h.y - 5, 5, 3, 2); } };
  const BAG = { draw(G, h) { G.rect(h.x - 5, h.y, 11, 12, 0); G.rect(h.x - 4, h.y + 1, 9, 10, 8); G.rect(h.x - 4, h.y + 4, 9, 1, 25); G.line(h.x - 2, h.y, h.x - 1, h.y - 3, 0); G.line(h.x + 2, h.y, h.x + 1, h.y - 3, 0); } };
  const CUP = { draw(G, h) { G.rect(h.x - 2, h.y - 7, 6, 8, 0); G.rect(h.x - 1, h.y - 6, 4, 6, 6); G.rect(h.x - 1, h.y - 6, 4, 2, 27); } };
  const PILLP = { draw(G, h) { G.rect(h.x - 1, h.y - 3, 3, 2, 8); G.px(h.x + 1, h.y - 3, 31); } };
  const sayAt = (li, k, d) => { const L = window.LYRICS || [], C = window.AUDIO && window.AUDIO.chars[li]; return C && C[k] >= 0 ? C[k] : d; };   // 各镜头里人物头的位置，给 UI 层的气泡用
  const MICP = { draw(G, h) { G.rect(h.x - 1, h.y - 7, 3, 8, 0); G.ellipse(h.x, h.y - 8, 2, 2, 4, 0); } };
  const CAKE = { draw(G, h, o) { const x = h.x + 2, y = h.y - 2; G.rect(x - 7, y - 6, 15, 7, 0); G.rect(x - 6, y - 5, 13, 5, 29); G.rect(x - 6, y - 3, 13, 1, 42);
    for (const dx of [-3, 0, 3]) { G.rect(x + dx, y - 9, 1, 3, 42); G.px(x + dx, y - 10 - (Math.floor((o.t || 0) * 8 + dx) % 2), 24); } } };
  function recolor(dst, src, map) { for (let i = 0; i < LW * LH; i++) { const c = src.B[i]; if (c !== 255) dst.B[i] = map[c] ?? c; } }
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

  function drawRider(G, tf, x, gy, o = {}) {   // 外卖骑手：x = 座位中心，gy = 地面；车朝右。o.phone 拿手机，o.tap 手指敲车把
    const size = o.size || 54, light = o.light || (() => 0.6), mv = o.moving ? Math.floor(tf * 12) % 2 : 0;
    const r = { who: 'him', outfit: 'rider', earbud: true, x: x + 2, y: gy - 11, seat: 12, size, facing: 'right', action: 'sit', t: tf, light, expression: o.expression || 'neutral',
      poseFix: { as: -0.8, ae: -1.3, bs: -0.8, be: -1.3, lean: 0.14 } };
    const bar = CHAR.handAt(r, 'far');
    if (o.phone) Object.assign(r.poseFix, { as: -0.25, ae: -2.4 }), r.hold = CHAR.PROPS.phone;
    if (o.tap) r.poseFix.ae += o.tap;
    const fw = bar.x + 8, rw = x - 20;
    // 车身（在人后面）
    G.poly([[x - 30, gy - 21], [x + 4, gy - 21], [x + 6, gy - 12], [x - 26, gy - 10]], (a, b) => G.dith([2, 3, 4], 1.2 - (b - gy + 21) / 10, a, b), 0);
    G.poly([[x - 4, gy - 13], [fw - 4, gy - 13], [fw - 2, gy - 9], [x - 4, gy - 9]], (a, b) => G.dith([2, 3], 0.8, a, b), 0);                       // 踏板
    G.poly([[fw - 6, gy - 10], [fw - 3, gy - 10], [bar.x + 1, bar.y + 1], [bar.x - 2, bar.y + 1]], (a, b) => G.dith([2, 3, 4], 1.2, a, b), 0);         // 前把立管
    for (const wx of [rw, fw]) { G.ellipse(wx, gy - 6, 6, 6, 0, null); G.ellipse(wx, gy - 6, 4, 4, 2, null); G.px(wx + (mv ? 1 : -1), gy - 6, 5); G.px(wx, gy - 6 + (mv ? -1 : 1), 5); }
    G.shape([fw - 7, gy - 15, fw + 7, gy - 8], (a, b) => b <= gy - 9 && Math.hypot(a - fw, b - gy + 6) <= 7.5 && Math.hypot(a - fw, b - gy + 6) >= 5.5, 3, null);   // 前挡泥板
    G.rect(x - 15, gy - 24, 19, 3, 0); G.rect(x - 14, gy - 24, 17, 2, 1);                                                                             // 座垫
    // 外卖箱：黄色，侧面贴一张手写的 RAP
    G.rect(x - 38, gy - 48, 24, 26, 0); for (let b = gy - 47; b < gy - 23; b++) for (let a = x - 37; a < x - 15; a++) G.px(a, b, G.dith([25, 23, 24], 1.5 - (b - gy + 47) / 22 + light(a, b) * 0.6, a, b));
    G.rect(x - 37, gy - 43, 22, 1, 25); G.rect(x - 34, gy - 39, 15, 9, 0); G.rect(x - 33, gy - 38, 13, 7, 8); tiny(G, 'RAP', x - 32, gy - 37, 0);
    G.rect(bar.x - 3, bar.y - 1, 6, 2, 0);                                                                                                              // 车把
    G.ellipse(bar.x + 4, bar.y + 5, 2, 2, 24, 0);                                                                                                       // 车灯
    if (o.beam) for (let b = bar.y; b < gy; b++) for (let a = bar.x + 6; a < bar.x + 70; a++) if (Math.abs(b - bar.y - 5 - (a - bar.x) * 0.25) < (a - bar.x) * 0.22 && PIX.bt(a, b) < 0.28 * (1 - (a - bar.x) / 70)) G.px(a, b, 23);
    CHAR.draw(G, r);
    return r;
  }

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
    const word = o.word || '唉', sc = o.sc ?? 6, w = bigW(word, sc), x0 = Math.round(148 - w / 2) + jx, y0 = by - Math.round(drop * 60);
    if (tf < 0.33 && !o.noDrop) return;
    big(G, word, x0, y0, sc, 8, [Math.round(sc * 0.8) + (g ? 3 : 0), Math.round(sc * 0.8), 43]);
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
    drawTitle(G, tf, { glitch: k * (hit ? 2 : 0.6), word: tf < 10.24 ? '爱' : '唉' });   // 存档坏了，「爱」碎成「唉」
    if (tf >= 2.53 && tf < 8.66) drawMenu(G, tf, 0, { slide: 2.53, press: tf >= 5.6 && Math.floor((tf - 5.6) * 12) % 2 === 0 && tf < 6.1 });
    if (tf >= 5.85 && tf < 11.77) saveCard(G, tf);
    if (tf < 0.3) { const hw = Math.round(lerp(50, 124, tf / 0.3)); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (Math.abs(y - 110) > hw) G.B[y * LW + x] = 44; if (tf < 0.09) G.rect(0, 108, LW, 4, 8); }   // 显像管打开
    if (tf >= 12.56) {   // 整个世界垮下去
      const c = (tf - 12.56) / 0.75; T1.B.set(G.B); G.fill(44);
      for (let x = 0; x < LW; x++) { const dy = Math.round(c * c * 300 * (0.5 + rnd('cl' + (x >> 3)))); for (let y = 0; y < LH - dy; y++) G.B[(y + dy) * LW + x] = T1.B[y * LW + x]; }
    }
  }
  // ============================== O2 往下掉：东西从身边飞上去 ==============================
  const MEM = [[78.2, 'room'], [84.95, 'st'], [0, 'bar'], [88.6, 'st'], [109.0, 'sea'], [111.7, 'close'], [92.0, 'st'], [79.0, 'room']];
  let MEMP = null;
  function memPhotos() {
    if (MEMP) return MEMP;
    const keep = ST; ST = ST0;
    MEMP = MEM.map(([t, k]) => { T1.fill(0); if (k === 'room') shotRoom1(T1, t); else if (k === 'st') shotStreet(T1, t); else if (k === 'sea') drawSea(T1, t, { photo: true }); else if (k === 'close') drawClose(T1, t); else if (k === 'bar') drawBar(T1, 1); else shotDoor(T1, t);
      const out = new Uint8Array(128 * 96); for (let j = 0; j < 96; j++) for (let i = 0; i < 128; i++) out[j * 128 + i] = T1.get(Math.floor(i * 2.5), Math.floor(j * 2.5)); return out; });
    ST = keep; return MEMP;
  }
  function drawBar(G, tf, o = {}) {   // 小酒吧的小舞台：他拿着麦，台下只有她一个人在鼓掌
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 9, 10], 0.4 + (y / LH) * 1.2, x, y));
    const nc = o.off ? 3 : 42; G.rect(196, 26, 98, 2, nc); G.rect(196, 70, 98, 2, nc); G.rect(196, 26, 2, 46, nc); G.rect(292, 26, 2, 46, nc); tiny(G, 'RAP', 238, 46, nc);   // 霓虹框
    if (!o.off) for (let y = 0; y < 170; y++) for (let x = 160; x < LW; x++) { const w = 8 + y * 0.34; if (Math.abs(x - 240) < w && PIX.bt(x, y) < 0.3 * (y / 170 + 0.3)) G.px(x, y, 23); }   // 聚光灯
    G.poly([[168, 170], [320, 170], [320, 184], [168, 184]], (x, y) => G.dith(RAMP.wood, 1.4 - (y - 170) / 10, x, y), 0);                               // 舞台
    for (let y = 205; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([9, 13], 0.5, x, y));
    for (const tx of [24, 116]) { G.rect(tx, 178, 30, 3, 0); G.rect(tx + 1, 178, 28, 2, 14); G.rect(tx + 13, 181, 4, 24, 0); G.rect(tx - 10, 188, 9, 2, 0); G.rect(tx - 10, 188, 2, 17, 0); G.rect(tx + 32, 188, 9, 2, 0); G.rect(tx + 39, 188, 2, 17, 0); }   // 空桌空椅
    CHAR.draw(G, { who: 'him', x: 240, y: 170 + (o.bob || 0), size: 66, facing: 'left', t: tf, light: () => (o.off ? 0.35 : 0.9), expression: o.off ? 'sad' : 'happy', poseFix: o.off ? { as: -0.1, ae: -0.6 } : { as: -0.45, ae: -2.55 }, hold: MICP });
    if (!o.empty) CHAR.draw(G, { who: 'her', x: 92, y: 214, size: 60, facing: 'right', t: tf, light: () => 0.6, expression: 'happy', poseFix: { as: -0.7, ae: -1.9, bs: -0.6, be: -1.8 } });
  }
  function drawMemPhoto(G, data, x, y, shear) {   // 4:3 的照片：白边、底边宽一点，微微歪着
    for (let row = y - 5; row < y + 110; row++) { const off = Math.round((row - y - 48) * shear); G.rect(x - 5 + off, row, 138, 1, row === y - 5 || row === y + 109 ? 0 : 8); G.px(x - 5 + off, row, 0); G.px(x + 132 + off, row, 0);
      if (row >= y && row < y + 96) for (let i = 0; i < 128; i++) G.px(x + i + off, row, data[(row - y) * 128 + i]); }
  }
  const MX = [10, 182, 24, 170, 6, 186, 30, 164], MS = [0.05, -0.04, -0.03, 0.05, 0.04, -0.05, 0.03, -0.03];
  function shotFall(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2, 3], y / LH * 2.4, x, y));
    for (let i = 0; i < 50; i++) { const x = Math.floor(rnd('fx' + i) * LW), sp = 240 + rnd('fs' + i) * 340, len = 8 + rnd('fl' + i) * 22, y = 260 - ((rnd('fy' + i) * 300 + tf * sp) % 300); for (let k = 0; k < len; k++) G.px(x, y + k, k < len / 2 ? 3 : 5); }
    const zu = seg(tf, 15.95, 16.70);
    if (zu < 0.5) { const fy = Math.round(lerp(70, 140, seg(tf, 13.0, 14.0))) + Math.round(Math.sin(tf * 5) * 3);
      CHAR.draw(G, { who: 'him', x: 160 + Math.round(Math.sin(tf * 2.3) * 8), y: fy, size: Math.round(lerp(34, 18, zu * 2)), facing: 'right', action: 'jump', u: 0.5, t: tf, expression: 'sad', light: () => 0.6 }); }
    const ph = memPhotos();
    ph.forEach((d, k) => { const t0 = 13.0 + k * 0.38, y = Math.round(250 - (tf - t0) * 240); if (y < -120 || y > 250) return; drawMemPhoto(G, d, MX[k], y, MS[k]); });
    if (zu > 0) {   // 最后一张：送外卖那天。照片升到中间，越来越大，掉进去
      shotRide(P2, 16.70);
      const e = smooth(seg(tf, 16.2, 16.70)), w = Math.round(lerp(128, 320, e * e)), h = Math.round(w * 0.75), cy = Math.round(lerp(300, 120, smooth(seg(tf, 15.95, 16.25))));
      const x0 = 160 - (w >> 1), y0 = cy - (h >> 1), bd = Math.round(6 * (1 - e));
      if (bd) { G.rect(x0 - bd - 1, y0 - bd - 1, w + bd * 2 + 2, h + bd * 3 + 2, 0); G.rect(x0 - bd, y0 - bd, w + bd * 2, h + bd * 3, 8); }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) G.px(x0 + x, y0 + y, P2.get(Math.floor(x * 320 / w), Math.floor(y * 240 / h)));
    }
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
  function streetMem(G, tf, cam, warm = 1) { const keep = ST; ST = { lamps: OLAMPS, off: () => false, closed: false }; drawStreet(G, tf, cam, { warm, rain: 0, tf }); ST = keep; }
  function trafficLight(G, x, red) {
    G.rect(x - 1, 100, 3, 99, 0); G.rect(x, 101, 1, 97, 3); G.rect(x - 5, 80, 11, 26, 0); G.rect(x - 4, 81, 9, 24, 1);
    G.ellipse(x, 86, 3, 3, red ? 31 : 44, null); G.ellipse(x, 93, 3, 3, 44, null); G.ellipse(x, 100, 3, 3, red ? 44 : 37, null);
    if (red) for (let i = 0; i < 24; i++) { const a = rnd('tl' + i) * Math.PI * 2, rr = 4 + rnd('tr' + i) * 6, px = Math.round(x + Math.cos(a) * rr), py = Math.round(86 + Math.sin(a) * rr); if (Math.hypot(px - x, py - 86) > 3.5) G.px(px, py, 43); }
  }
  const RIDE_STOP = 17.35;
  function shotRide(G, tf) {   // 回忆：没下雨，他穿外卖服骑电动车，停在红灯前，掏出手机回她消息
    const cam = 200; streetMem(G, tf, cam);
    trafficLight(G, 296, true);
    for (let x = 268; x < LW; x += 1) if ((x >> 2) % 2 === 0) G.px(x, 199, 8);                                   // 停止线
    const x = Math.round(tf < RIDE_STOP ? lerp(-60, 44, 1 - (1 - seg(tf, 16.70, RIDE_STOP)) ** 2) : 44);
    const tap = tf >= 17.45 && tf < 17.62 && Math.floor(tf * 8) % 2 ? -0.18 : 0;
    const L0 = streetLight(cam, 1), light = (a, b) => 0.4 + L0(a, b) * 0.8;
    const r = drawRider(G, tf, x, 199, { moving: tf < RIDE_STOP, phone: tf >= 17.55, tap, light, expression: tf >= 21.81 ? 'happy' : 'neutral', beam: true });
    HEADS.ride = CHAR.headAt(r);
  }
  // 聊天窗：先停在最上面（一起看海的照片），再滑到最新，新消息一条条冒出来
  const CHAT1 = [
    { sep: '上周六' }, { who: 'her', photo: true }, { who: 'her', txt: '谢谢你带我去看海' }, { who: 'her', txt: '是不是花了你好多钱' }, { who: 'him', txt: '值得' },
    { sep: '今天 21:40' }, { who: 'her', txt: '下班了吗' }, { who: 'him', txt: '还剩两单' }, { who: 'her', txt: '路上慢点，别闯红灯' }, { who: 'him', txt: '在等红灯呢' },
    { t: 19.77, who: 'her', txt: '你会一直对我这么好吗' }, { t: 20.79, who: 'him', txt: '会啊，我们以后永远在一起吧' }, { t: 21.81, who: 'her', txt: '永远！！！', big: true }];
  const CW = { x: 66, y: 4, w: 188, h: 200 }, CH_OPEN = 17.62, CH_TYPE = [20.02, 20.7];
  let SEA_THUMB = null;
  function wrapW(G, str, maxW) { const out = []; let cur = ''; for (const ch of str) { if (cur && G.textW(GL, cur + ch) > maxW) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); return out; }
  function avatar(G, x, y, who) { G.rect(x, y, 12, 12, who === 'her' ? 28 : 0); G.rect(x + 3, y + 3, 6, 7, 22); if (who === 'her') { G.rect(x + 1, y + 3, 2, 9, 28); G.rect(x + 9, y + 3, 2, 9, 28); } else G.rect(x, y + 10, 12, 2, 23); G.px(x + 4, y + 6, 0); G.px(x + 7, y + 6, 0); }
  function drawChat(G, tf) {
    const { x, y, w, h } = CW, k = Math.min(1, (tf - CH_OPEN) * 8);
    if (k < 1) { const hh = Math.round(h * (0.3 + 0.7 * k)), ww = Math.round(w * (0.5 + 0.5 * k)); G.rect(160 - (ww >> 1) - 2, 104 - (hh >> 1) - 2, ww + 4, hh + 4, 39); G.rect(160 - (ww >> 1), 104 - (hh >> 1), ww, hh, 32); return; }
    G.rect(x - 4, y - 3, w + 8, h + 6, 0); G.rect(x - 3, y - 2, w + 6, h + 4, 39); G.rect(x, y, w, h, 32);
    // 标题栏
    G.rect(x, y, w, 18, 33); G.text(GL, '<', x + 5, y + 3, 8); ctext(G, '她', x + w / 2, y + 3, 8); for (let i = 0; i < 3; i++) G.rect(x + w - 16 + i * 4, y + 9, 2, 2, 8);
    // 消息
    const top = y + 20, bot = y + h - 22, VH = bot - top;
    if (!SEA_THUMB) { const tmp = PIX.create(LW, LH); drawSea(tmp, CLICK, { photo: true }); SEA_THUMB = new Uint8Array(60 * 44); for (let j = 0; j < 44; j++) for (let i = 0; i < 60; i++) SEA_THUMB[j * 60 + i] = tmp.get(10 + Math.floor(i * 5), 10 + Math.floor(j * 4.5)); }
    const items = []; let H = 6;
    for (const m of CHAT1) { if (m.t && tf < m.t) continue;
      let ih; if (m.sep) ih = 14; else if (m.photo) ih = 50; else if (m.big) ih = 36; else { m.lines = m.lines || wrapW(G, m.txt, 128); ih = m.lines.length * 13 + 6; }
      items.push({ m, y: H, h: ih }); H += ih + 5; }
    const bottomScroll = Math.max(0, H - VH), scroll = tf < 18.3 ? 0 : tf < 18.74 ? Math.round(bottomScroll * smooth(seg(tf, 18.3, 18.74))) : bottomScroll;
    CB.B.fill(255);
    for (const it of items) { const m = it.m, yy = top + it.y - scroll, fresh = m.t && tf < m.t + 0.09 ? 3 : 0;
      if (yy + it.h < top - 2 || yy > bot + 2) continue;
      if (m.sep) { ctext(CB, m.sep, x + w / 2, yy + 1, 35); continue; }
      const her = m.who === 'her', ax = her ? x + 5 : x + w - 17; avatar(CB, ax, yy + fresh, m.who);
      if (m.photo) { const px = x + 21; CB.rect(px - 2, yy - 2 + fresh, 64, 48, 8); for (let j = 0; j < 44; j++) for (let i = 0; i < 60; i++) CB.px(px + i, yy + j + fresh, SEA_THUMB[j * 60 + i]); continue; }
      const bw = m.big ? bigW(m.txt, 2) + 12 : Math.max(...m.lines.map((l) => CB.textW(GL, l))) + 10, bx = her ? x + 21 : x + w - 21 - bw, col = her ? 34 : 37, tc = her ? 8 : 0;
      CB.rect(bx + 1, yy + fresh, bw - 2, it.h, col); CB.rect(bx, yy + 1 + fresh, bw, it.h - 2, col);
      if (her) { CB.px(bx - 1, yy + 5 + fresh, col); CB.px(bx - 2, yy + 6 + fresh, col); CB.px(bx - 1, yy + 6 + fresh, col); } else { CB.px(bx + bw, yy + 5 + fresh, col); CB.px(bx + bw + 1, yy + 6 + fresh, col); CB.px(bx + bw, yy + 6 + fresh, col); }
      if (m.big) big(CB, m.txt, bx + 6, yy + 5 + fresh, 2, tc); else m.lines.forEach((l, i) => CB.text(GL, l, bx + 5, yy + 3 + i * 13 + fresh, tc)); }
    for (let yy = top; yy < bot; yy++) for (let xx = x; xx < x + w; xx++) { const c = CB.B[yy * LW + xx]; if (c !== 255) G.px(xx, yy, c); }
    // 输入栏：他打字，出现绿色发送键
    G.rect(x, bot, w, h - (bot - y), 33); G.ellipse(x + 10, bot + 11, 5, 5, 36, null); G.ellipse(x + 10, bot + 11, 3, 3, 33, null);
    const typing = tf >= CH_TYPE[0] && tf < 20.79, fx0 = x + 19, fw = w - (typing ? 58 : 40);
    G.rect(fx0, bot + 4, fw, 15, 34);
    if (typing) { const msg = CHAT1[11].txt, n = Math.min([...msg].length, Math.floor(seg(tf, CH_TYPE[0], CH_TYPE[1]) * [...msg].length) + 1); let str = [...msg].slice(0, n).join(''); while (G.textW(GL, str) > fw - 8) str = [...str].slice(1).join('');
      G.text(GL, str, fx0 + 3, bot + 5, 8); if (Math.floor(tf * 6) % 2) G.rect(fx0 + 4 + G.textW(GL, str), bot + 6, 1, 11, 37);
      G.rect(x + w - 36, bot + 4, 32, 15, 37); ctext(G, '发送', x + w - 20, bot + 5, 0); }
    else { G.ellipse(x + w - 26, bot + 11, 5, 5, 36, null); G.ellipse(x + w - 11, bot + 11, 5, 5, 36, null); G.rect(x + w - 14, bot + 10, 7, 1, 33); G.rect(x + w - 11, bot + 7, 1, 7, 33); }
    // 22.45 起：她那句"永远"放大成整屏大字，接下一镜
    if (tf >= 22.45) { const st = Math.min(3, Math.floor((tf - 22.45) * 12)), sc = [5, 7, 9, 11][st], bw2 = bigW('永远', sc), sh = Math.round(sc * 0.55); G.rect(0, 0, LW, LH, 44); big(G, '永远', Math.round((LW - bw2) / 2), Math.round(lerp(96, 28, st / 3)), sc, 8, [sh, sh, 43]); }
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
  function shotDoorMem(G, tf) {   // 第 4 句（回忆）：夜里要出门跑夜单，她从后面拽住他的袖子
    const cam = 180, st = { tf, I: 1.0, rain: 0, clock: 22 * 3600 + 40 * 60 + (tf - 30.34) };
    R6(G, cam, st);
    const L = ROOM6.light(st), lt = (x, y) => L(x + cam, y);
    const look = tf >= 32.9 && tf < 33.9, tug = tf > 31.9 && tf < 33.4 && Math.floor(tf * 2) % 2 ? 1 : 0;
    CHAR.draw(G, { who: 'him', x: 416 - cam + tug, y: 204, size: 90, facing: look ? 'left' : 'right', action: 'idle', t: tf, light: lt, outfit: 'rider', expression: look ? 'sad' : 'neutral' });
    const her = { who: 'her', x: 386 - cam, y: 204, size: 84, facing: 'right', action: 'reach', u: 0.55 + 0.35 * smooth(seg(tf, 30.5, 31.0)), t: tf, light: lt, expression: 'sad' };
    CHAR.draw(G, her); HEADS.doorHer = CHAR.headAt(her);
    ROOM6.drawTop(G, cam, st);
  }
  function shotDoorNow(G, tf) {   // 第 5 句（现在）：同一个门口，他一个人戴上头盔，手停在门把上，身后没人拽他；门开，出去
    const cam = 180, door = smooth(seg(tf, 37.38, 37.7)) * (1 - smooth(seg(tf, 38.85, 39.15)));
    const st = { tf, I: 0.5, rain: 0.6, door, hallRain: true };
    R6(G, cam, st);
    const L = ROOM6.light(st), lt = (x, y) => L(x + cam, y), out = smooth(seg(tf, 38.2, 38.8));
    if (tf < 38.85) {
      const o = { who: 'him', x: Math.round(lerp(408, 456, out)) - cam, y: Math.round(lerp(204, 180, out)), size: Math.round(lerp(90, 70, out)), facing: 'right', t: tf, light: lt, outfit: 'rider', noHelmet: tf < 35.6, expression: 'sad',
        action: out > 0 ? 'walk' : tf >= 36.2 ? 'reach' : 'idle', u: smooth(seg(tf, 36.2, 36.7)) * 0.55 };
      if (tf < 35.25) Object.assign(o, { action: 'hold', u: 1, hold: HELMET });
      else if (tf < 35.6) Object.assign(o, { action: 'idle', poseFix: { as: -0.5, ae: -2.9 }, hold: HELMET });   // 举起来戴上
      if (tf >= 36.7 && tf < 37.38) o.blink = true;                                                                 // 手停在门把上，闭了下眼
      T1.B.fill(255); CHAR.draw(T1, o);
      const [a, dy0, b] = ROOM6.DOOR, d0 = a - cam, d1 = b - cam;
      for (let i = 0; i < LW * LH; i++) { const c = T1.B[i]; if (c === 255) continue; const px = i % LW, py = (i / LW) | 0; if (out > 0.5 && (px < d0 || px >= d1 || py < dy0)) continue; G.B[i] = c; }
    }
    ROOM6.drawTop(G, cam, st);
    cold(G);
  }
  // 第 6 句：一个人在外面，按拍快切
  const MONT = [39.22, 39.96, 40.48, 41.00, 41.52];
  function montRide(G, tf) {   // 雨里的路口，绿灯，他骑车冲过去
    streetNow(G, tf, CAM0 + 200); trafficLight(G, 60, false);
    const L0 = streetLight(CAM0 + 200, 0.75), x = Math.round(lerp(-40, 360, seg(tf, MONT[0], MONT[1])));
    drawRider(G, tf, x, 199, { moving: true, light: (a, b) => 0.35 + L0(a, b) * 0.8, expression: 'sad', beam: true });
    drawRain(G, tf, 1, tf);
  }
  function montBridge(G, tf) {   // 立交桥下：桥沿往下淌水，他小小地骑过去
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2], y / LH * 1.6, x, y));
    for (let y = 200; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, (y + (x >> 3)) % 7 === 0 ? 3 : G.dith([1, 2], 0.6, x, y));
    for (const px of [52, 250]) { G.rect(px - 1, 58, 20, 142, 0); for (let y = 58; y < 200; y++) for (let x = px; x < px + 18; x++) G.px(x, y, G.dith([2, 3, 4], 0.6 + (x - px) / 18, x, y)); }
    G.rect(0, 34, LW, 26, 0); for (let y = 36; y < 58; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([3, 4, 5], 1.4 - (y - 36) / 16, x, y));
    for (let x = 20; x < LW; x += 40) G.rect(x, 60, 6, 2, 24);                                                                          // 桥下的灯
    for (let i = 0; i < 40; i++) { const x = Math.floor(rnd('bw' + i) * LW), sp = 200 + rnd('bs' + i) * 120, y0 = 60 + ((rnd('by' + i) * 140 + tf * sp) % 140); for (let k = 0; k < 6; k++) if (y0 + k < 200) G.px(x, y0 + k, 6); }
    const L0 = () => 0.4, x = Math.round(lerp(330, -30, seg(tf, MONT[1], MONT[2])));
    const r = { who: 'him', outfit: 'rider', x, y: 198, size: 36, facing: 'left', action: 'sit', seat: 10, t: tf, light: L0, poseFix: { as: -0.8, ae: -1.3, bs: -0.8, be: -1.3, lean: 0.14 } };
    G.rect(x - 16, 186, 34, 4, 2); for (const wx of [x - 12, x + 14]) { G.ellipse(wx, 194, 4, 4, 0, null); G.ellipse(wx, 194, 2, 2, 2, null); } G.rect(x + 4, 172, 12, 12, 0); G.rect(x + 5, 173, 10, 10, 23);
    CHAR.draw(G, r);
  }
  function montDoor(G, tf) {   // 送到别人家门口：门开一条缝，接过去，门关上
    for (let y = 0; y < 196; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([9, 10], 0.6 + (y / 196) * 0.5, x, y));
    for (let y = 196; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([13, 14], 0.6, x, y));
    G.rect(178, 66, 64, 130, 0); const gap = tf < 40.56 ? 0 : tf < 40.84 ? 10 : 0;
    for (let y = 68; y < 196; y++) for (let x = 180; x < 240; x++) G.px(x, y, x < 180 + gap ? G.dith([25, 23, 24], 1.1, x, y) : G.dith(RAMP.wood, 0.7 + ((x - 180) % 15 === 0 ? -0.5 : 0), x, y));
    G.rect(178 + 52, 130, 3, 3, 23); G.rect(204, 74, 12, 8, 25);                                                                            // 门把、门牌
    if (gap) for (let y = 196; y < LH; y++) for (let x = 180; x < 180 + gap + (y - 196); x++) if (PIX.bt(x, y) < 0.5) G.px(x, y, 15);
    CHAR.draw(G, { who: 'him', outfit: 'rider', x: 130, y: 220, size: 96, facing: 'right', t: tf, light: () => 0.5, expression: 'neutral', action: tf < 40.8 ? 'hold' : 'idle', u: 1, hold: tf < 40.8 ? BAG : null });
  }
  function montCity(G, tf) {   // 城市远景：一大片亮着的楼，下面一盏小小的车灯
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2, 3], (y / LH) * 2.6, x, y));
    [[0, 70, 3, 9], [0, 110, 2, 7]].forEach(([_, base, c, step], layer) => { let x = 0, i = 0; while (x < LW) { const w = 16 + PIX.hash('cw' + layer + i) % 26, h = 40 + PIX.hash('ch' + layer + i) % 90, top = 204 - h - layer * 8;
      G.rect(x, top, w - 1, 204 - top, layer ? 1 : 2); for (let y = top + 4; y < 200; y += 6) for (let xx = x + 2; xx < x + w - 3; xx += 4) if (PIX.hash(layer + ':' + xx + ':' + y) % 9 < (layer ? 3 : 2)) G.px(xx, y, 25); x += w; i++; } });
    for (let y = 204; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1], 0.6, x, y));
    const hx = Math.round(lerp(-6, 326, seg(tf, MONT[3], MONT[4]))); G.rect(hx, 214, 3, 2, 24); for (let k = 1; k < 18; k++) if (PIX.bt(hx + 3 + k, 214) < 0.5 - k / 40) G.px(hx + 3 + k, 214 + (k % 2), 23);
    drawRain(G, tf, 0.8, tf);
  }
  function shotAlone(G, tf) {
    if (tf < MONT[1]) montRide(G, tf); else if (tf < MONT[2]) montBridge(G, tf); else if (tf < MONT[3]) montDoor(G, tf); else if (tf < MONT[4]) montCity(G, tf);
    else drawBar(G, tf, { empty: true, bob: Math.floor(tf * 2.9) % 2 });   // 小酒吧台上唱，台下一个人都没有
    if (MONT.slice(1).some((b) => tf >= b && tf < b + 1 / 12)) G.fill(8);
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
  function drawCracks(G, list, tf) {   // 屏幕裂纹：打中的地方坏一小块，几道裂纹往外爬，越砸越多
    for (const [cx, cy, t0, seed] of list) { if (tf < t0) continue; const age = tf - t0, grow = Math.min(1, age / 0.12);
      for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 14 && PIX.bt(cx + i, cy + j) < 0.8) G.px(cx + i, cy + j, (i + j) % 2 ? 44 : 2);
      for (let r = 0; r < 6; r++) { let a = (r / 6) * Math.PI * 2 + rnd('ca' + seed + r) * 0.8, x = cx, y = cy; const len = 12 + rnd('cl' + seed + r) * 20;
        for (let k = 0; k < len * grow; k++) { a += (rnd('cj' + seed + '_' + r + '_' + k) - 0.5) * 0.55; x += Math.cos(a); y += Math.sin(a);
          if (x < BD[0] || x >= BD[0] + BD[2] || y < BD[1] || y >= BD[1] + BD[3]) break; G.px(Math.round(x), Math.round(y), 0); if (k % 3 === 0) G.px(Math.round(x) + 1, Math.round(y), 8); } }
      if (age < 1 / 12) G.ellipse(cx, cy, 4, 4, 8, null);
    }
  }
  function drawBoard(G, tf, off, o = {}) {
    const [x0, y0, w, h] = BD, cx = x0 + w / 2;
    for (const px of [x0 + 28, x0 + w - 32]) { G.rect(px, y0 + h, 5, 80, 0); G.rect(px + 1, y0 + h, 3, 80, 2); }
    G.rect(x0 - 4, y0 - 4, w + 8, h + 8, 0); G.rect(x0 - 3, y0 - 3, w + 6, h + 6, 3);
    if (off) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.px(x0 + i, y0 + j, (i + j) % 7 === 0 ? 2 : 44);
      if (o.ended) { const str = '活动已结束', bw2 = bigW(str, 2); big(G, str, Math.round(x0 + (w - bw2) / 2), y0 + 34, 2, 5); const t2 = '海边双人游', tw = G.textW(GL, t2), tx = Math.round(x0 + (w - tw) / 2); G.text(GL, t2, tx, y0 + 70, 3); G.rect(tx - 2, y0 + 76, tw + 4, 1, 4); }
      return; }
    drawBeach(P1, tf, { her: false, him: false });
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.px(x0 + i, y0 + j, P1.get(Math.floor(i * 320 / w), 26 + Math.floor(j * 320 / w)));
    adText(G, x0 + 6, y0 + 6);
    for (let i = 0; i < 9; i++) if (Math.floor(tf * 3 + i) % 3) G.rect(x0 + 6 + i * 21, y0 - 3, 3, 1, 24);
    if (o.cracks) drawCracks(G, o.cracks, tf);
    if (o.collapse > 0) { const u = o.collapse, hh = Math.max(0.5, (1 - u) * h / 2), ww = u < 0.7 ? w / 2 : Math.max(1, (1 - (u - 0.7) / 0.3) * w / 2);   // 显像管关机：画面压成一条亮线，再缩成一个点
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dy = Math.abs(j - h / 2), dx = Math.abs(i - w / 2); if (dy > hh || dx > ww) G.px(x0 + i, y0 + j, 44); else if (u > 0.55) G.px(x0 + i, y0 + j, 8); } }
  }
  function thinkBeach(G, tf, H) {   // 云朵一样的想法气泡，里面是海边：条纹夕阳、海、她坐在沙滩上
    const bw = 92, bh = 62, bx = Math.round(clamp(H.x - 10, 4, LW - bw - 4)), by = Math.round(H.y - H.r - bh - 16), pop = tf < 48.74 ? 3 : 0;
    drawBeach(T2, tf, { her: true });
    const inside = (x, y, m) => { const dx = Math.max(bx + 10 - x, 0, x - (bx + bw - 10)), dy = Math.max(by + 10 - y, 0, y - (by + bh - 10)); return Math.hypot(dx, dy) <= 10 + m + 1.5 * Math.sin(Math.atan2(y - by - bh / 2, x - bx - bw / 2) * 9); };
    G.shape([bx - 8 - pop, by - 8 - pop, bx + bw + 8 + pop, by + bh + 8 + pop], (x, y) => inside(x, y, 2 + pop), 8, 0);
    for (let y = by + 4; y < by + bh - 4; y++) for (let x = bx + 4; x < bx + bw - 4; x++) if (inside(x, y, -2)) G.px(x, y, T2.get(Math.floor(28 + (x - bx - 4) * 3.1), Math.floor(30 + (y - by - 4) * 3.4)));
    [[0.3, 4], [0.62, 3], [0.88, 2]].forEach(([u, r]) => { const xx = lerp(bx + 20, H.x + 2, u), yy = lerp(by + bh + 6, H.y - H.r - 3, u); G.ellipse(xx, yy, r + 1, r + 1, 0, null); G.ellipse(xx, yy, r, r, 8, null); });
  }
  function shotRideBoard(G, tf) {   // 第 7 句（回忆，没下雨）：送外卖经过广告牌，慢下来看了一眼，想起她喜欢海
    const cam = CAM0 + 120; streetMem(G, tf, cam, 0.9); drawBoard(G, tf, false);
    for (let y = 180; y < 206; y++) for (let x = 40; x < 280; x++) if (PIX.bt(x, y) < 0.34 * (1 - Math.abs(x - 160) / 120) * (1 - (y - 180) / 30)) G.px(x, y, (y % 2 ? 25 : 42));
    const x = Math.round(tf < 48.5 ? lerp(-60, 118, 1 - (1 - seg(tf, 47.58, 48.5)) ** 2) : tf < 49.9 ? 118 : lerp(118, 330, seg(tf, 49.9, 50.43) ** 2));
    const L0 = streetLight(cam, 0.9), r = drawRider(G, tf, x, 199, { moving: tf < 48.5 || tf >= 49.9, light: (a, b) => 0.45 + L0(a, b) * 0.8, expression: tf >= 48.7 ? 'happy' : 'neutral', beam: true });
    HEADS.board = CHAR.headAt(r);
    if (tf >= 48.65 && tf < 49.85) thinkBeach(G, tf, HEADS.board);
  }
  // 第 8 句（现在，下雨）：同一块广告牌写着活动已结束，他淋着雨走过，u say 的气泡落在他身上
  const SAY8 = [50.43, 50.9, 51.3, 52.06, 52.45, 52.85, 53.23, 53.6, 54.0, 54.47, 54.85, 55.2];
  const SAYX = [40, 232, 96, 268, 18, 200, 248, 66, 288, 124, 34, 216];
  // 落在广告牌范围里的气泡砸在屏幕上，其余砸在地上
  const SAYD = [-26, 18, -8, 24, -18, 6, 28, -12, 12, -24, 2, 20];
  function shotHail(G, tf) {
    streetNow(G, tf, CAM0 + 120); drawBoard(G, tf, true, { ended: true });
    const hx = Math.round(lerp(30, 262, seg(tf, 50.43, 55.73))), hitT = SAY8.map((b) => b + 0.26), flinch = hitIn(tf, hitT, 0.17);
    const him = { who: 'him', x: hx, y: 196, size: 44, facing: 'right', action: flinch ? 'slump' : 'walk', u: 0.5, t: tf, light: () => 0.55, expression: 'sad' };
    CHAR.draw(G, him); const H = CHAR.headAt(him);
    drawRain(G, tf, 0.8, tf);
    SAY8.forEach((b, i) => { const d = tf - b; if (d < 0 || d >= 0.75) return; const bx = hx + SAYD[i], iy = Math.round(H.y - H.r - 2);
      if (d < 0.26) bubble(G, bx - 14, Math.round(-30 + d / 0.26 * (iy + 30 - 18)), 'u say', 1);
      else { const u = (d - 0.26) / 0.49; for (let k = 0; k < 18; k++) { const a = Math.PI * rnd('hs' + i + k), v = 30 + rnd('hv' + i + k) * 40, px = bx + Math.cos(a) * v * u, py = iy - Math.sin(a) * v * u + 70 * u * u; G.px(px, py, k % 3 ? 26 : 8); } } });
    if (tf >= 51.59 && tf < 52.5) { const u = seg(tf, 51.59, 52.5); T1.B.fill(255); big(T1, '唉', H.x + 8, H.y - 34 - Math.round(u * 12), 2, 8, [1, 1, 0]); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const c = T1.B[y * LW + x]; if (c !== 255 && PIX.bt(x, y) < 1.3 - u * 1.3) G.B[y * LW + x] = c; } }
  }
  function shotSurface(G, tf) {   // 第 7 句上（现在）：酒吧唱完，台下还是空的，灯啪地灭；\"失败\"砸下来
    drawBar(G, tf, { empty: true, off: tf >= 43.3, bob: tf < 43.3 ? Math.floor(tf * 2.9) % 2 : 0 });
    if (tf >= 44.19) { const k = Math.floor((tf - 44.19) * 12), sc = k < 1 ? 9 : 8, x = Math.round((LW - bigW('失败', sc)) / 2); big(G, '失败', x, k < 1 ? 2 : 10, sc, 31, [5, 5, 44]); }
    shakeAt(G, tf, [43.3], 3); shakeAt(G, tf, [44.19], 6);
  }
  function shotBowls(G, tf) {   // 第 7 句中（现在）：他习惯性摆了两副碗筷，对面凳子上闪一下她的影子，他把一副收回去
    const cam = 120, st = { tf, I: 0.5, rain: 0.6, bowls: tf < 47.05 ? 'pair' : 'one' };
    R6(G, cam, st);
    const L = ROOM6.light(st), lt = (x, y) => L(x + cam, y), S = ROOM6.SEAT;
    const reach = tf < 45.95 ? 1 - smooth(seg(tf, 45.65, 45.95)) : tf >= 46.95 ? smooth(seg(tf, 46.95, 47.2)) * (1 - smooth(seg(tf, 47.3, 47.55))) : 0;
    const look = tf >= 46.1 && tf < 47.0;
    CHAR.draw(G, Object.assign({ who: 'him', ...S.him, x: S.him.x - cam, facing: 'left', action: 'sitHunch', u: look ? 0.1 : 0.5, t: tf, light: lt, expression: look ? 'neutral' : 'sad' }, reach > 0.05 ? { arms: 'reach', armsU: reach } : {}));
    if (tf >= 46.2 && tf < 46.95 && Math.floor((tf - 46.2) * 12) % 3 !== 2) {   // 她的影子：老照片的颜色，半透明
      T1.B.fill(255); CHAR.draw(T1, { who: 'her', ...S.her, x: S.her.x - cam, action: 'sitHold', u: 1, t: tf, light: lt, expression: 'happy' });
      for (let i = 0; i < LW * LH; i++) { const c = T1.B[i]; if (c === 255) continue; const x = i % LW, y = (i / LW) | 0; if (PIX.bt(x, y) < 0.6) G.B[i] = SEPIA[c] ?? 14; }
    }
    ROOM6.drawTop(G, cam, st);
    cold(G);
  }
  // ============================== O8 心里：一颗大心里面只有那间屋、那个人 ==============================
  const HB = Array.from({ length: 12 }, (_, i) => 55.8 + i * 1.033);
  function shotRecord(G, tf, o = {}) {   // 书桌前录歌（room6 取景 cam 0）。o.her：她坐在身后床沿托腮；o.dawn：天亮；o.rec：录音红灯；o.phones：戴耳机
    const dawn = o.dawn || 0, cam = 0;
    const st = { tf, I: dawn ? 0 : 0.55, desk: dawn ? 0 : 1, rain: dawn ? 0 : 0.5, dawn, rec: o.rec, wearPhones: o.phones !== false };
    if (!dawn) st.clock = 23 * 3600 + 12 * 60 + (tf - 55.73);
    R6(G, cam, st);
    const L = ROOM6.light(st), lt = (x, y) => 0.25 + L(x + cam, y), S = ROOM6.SEAT;
    if (o.her) { const her = { who: 'her', ...S.bed, x: S.bed.x - cam, action: 'sitChin', t: tf, light: lt, expression: 'happy' }; CHAR.draw(G, her); HEADS.recHer = CHAR.headAt(her); }
    const bob = o.nod && ((tf + 10) % 1.0213) < 0.17 ? 1 : 0;
    const him = Object.assign({ who: 'him', ...S.desk, x: S.desk.x - cam, y: S.desk.y + bob, action: 'sitHold', u: 0.7, t: tf, light: lt, expression: o.expr || 'neutral' }, o.him || {});
    CHAR.draw(G, him);
    if (st.wearPhones) ROOM6.phones(G, him);
    HEADS.rec = CHAR.headAt(him);
    ROOM6.drawTop(G, cam, st);
  }
  // ============================== O9 u need safe：保险库 ==============================
  const SAFE = [60.43, 61.15, 61.71, 62.5, 63.2];
  const EST = { her: [60.15, 61.1], him: [61.1, 62.35], n1: 62.45, n2: 62.95 };
  function shotEstate(G, tf) {
    for (let y = 0; y < 200; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([44, 1, 2, 11], (y / 200) * 2.4, x, y));
    // 高楼：金色的线，窗几乎都亮着
    for (const [bx, top, bw] of [[132, 22, 54], [196, 4, 62], [268, 30, 52]]) {
      G.rect(bx - 1, top - 1, bw + 2, 200 - top, 0); for (let y = top; y < 200; y++) for (let x = bx; x < bx + bw; x++) G.px(x, y, G.dith([2, 3, 4], 0.6 + (x - bx) / bw * 0.8, x, y));
      for (let y = top + 8; y < 176; y += 9) for (let x = bx + 4; x < bx + bw - 5; x += 7) { const lit = PIX.hash(bx + ':' + x + ':' + y) % 10 < 8; G.rect(x, y, 4, 6, lit ? 25 : 1); if (lit) G.rect(x, y, 4, 2, 24); }
      for (let y = top + 24; y < 176; y += 27) G.rect(bx, y, bw, 1, 23); G.rect(bx - 2, top - 3, bw + 4, 3, 23);
      for (let i = 0; i < 4; i++) if (Math.floor(tf * 2 + i) % 2) G.px(bx + 6 + i * Math.floor(bw / 4), top - 5, 24); }
    // 院子里：喷泉、树
    for (const [tx, ty, tr] of [[150, 160, 14], [300, 158, 16], [232, 166, 10]]) G.ellipse(tx, ty, tr, tr * 0.8, (x, y) => G.dith([38, 37], 0.3 + (ty - y) / tr, x, y), 0);
    G.ellipse(262, 182, 22, 4, 6, 0); G.rect(258, 168, 8, 14, 5);
    for (let i = 0; i < 26; i++) { const u = ((tf * 1.4 + i / 26) % 1), side = i % 2 ? 1 : -1, px = 262 + side * u * 18, py = 166 - Math.sin(Math.PI * u) * 18 + u * 10; G.px(px, py, i % 3 ? 26 : 8); }
    // 门：两根石柱、门灯、拦车杆；两边是矮墙 + 栏杆
    for (let y = 178; y < 200; y++) for (let x = 120; x < LW; x++) if (x < 132 || x > 196) G.px(x, y, G.dith([5, 6], 0.6 + (y - 178) / 30, x, y));
    for (let x = 120; x < LW; x++) if (x < 132 || x > 196) { G.px(x, 177, 23); if (x % 6 === 0) G.rect(x, 152, 1, 25, 0); } for (let x = 120; x < LW; x++) if (x < 132 || x > 196) G.px(x, 152, 0);
    for (const px of [120, 196]) { G.rect(px - 1, 126, 14, 74, 0); G.rect(px, 127, 12, 72, 6); G.rect(px, 127, 12, 3, 23); G.ellipse(px + 6, 120, 4, 5, 24, 0); }
    G.rect(134, 162, 4, 37, 0); G.rect(135, 163, 2, 35, 31); for (let x = 138; x < 196; x++) { G.px(x, 166, 0); G.px(x, 169, 0); G.rect(x, 167, 1, 2, ((x - 138) >> 3) % 2 ? 31 : 8); }
    panel(G, 212, 64, 104, 22, { bd: 23, cr: 31 }); G.text(GL, '￥100000/平', 218, 68, 23); G.rect(262, 86, 3, 40, 0);
    for (let y = 200; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([1, 2], 0.5 + (PIX.bt(x, y * 3) < 0.15 ? 0.6 : 0), x, y));
    // 一对情侣：撑着伞走到门口
    const cx = Math.round(lerp(312, 226, smooth(seg(tf, 59.95, 61.3)))), walk = tf < 61.3;
    T1.B.fill(255); const man = { who: 'him', x: cx + 10, y: 198, size: 46, facing: 'left', action: walk ? 'walk' : 'idle', t: tf, light: () => 0.65, expression: 'happy', hold: CHAR.PROPS.umbrella, umbrellaW: 24, umbrellaH: 30 };
    CHAR.draw(T1, man); recolor(G, T1, { 23: 3, 24: 4, 25: 2, 18: 1, 19: 2, 20: 3, 12: 0 });
    T1.B.fill(255); const lady = { who: 'her', x: cx - 6, y: 198, size: 42, facing: 'left', action: walk ? 'walk' : 'idle', t: tf, light: () => 0.65, expression: 'happy' };
    CHAR.draw(T1, lady); recolor(G, T1, { 28: 14, 30: 13, 25: 15, 18: 1, 19: 2, 20: 3 });
    HEADS.man = CHAR.headAt(man); HEADS.lady = CHAR.headAt(lady);
    for (let x = 120; x < LW; x++) if ((x < 132 || x > 196) && x % 6 === 0) G.rect(x, 153, 1, 24, 0);   // 栏杆挡在他们前面
    // 他：骑车到门口，进不去，停在杆外面
    const x = Math.round(lerp(-50, 70, 1 - (1 - seg(tf, 59.91, 60.4)) ** 2));
    const r = drawRider(G, tf, x, 199, { moving: tf < 60.4, phone: tf >= 62.3, light: () => 0.55, expression: 'sad', beam: true });
    HEADS.est = CHAR.headAt(r);
    drawRain(G, tf, 0.6, tf);
  }
  // ============================== O10 爱：字砸下来，人越缩越小 ==============================
  function goldWord(G, str, x, y, sc, tf) {   // 金币一样的金字：深红影子 + 金色渐变 + 亮边 + 一道高光扫过去
    big(G, str, x + 6, y + 6, sc, 43);
    T1.B.fill(255); big(T1, str, x, y, sc, 1);
    const H = 13 * sc, sweep = ((tf - 63.9) * 240) % 420 - 60, inW = (a, b) => a >= 0 && a < LW && b >= 0 && b < LH && T1.B[b * LW + a] === 1;
    for (let yy = Math.max(0, y); yy < Math.min(LH, y + H + 2); yy++) for (let xx = 0; xx < LW; xx++) { if (!inW(xx, yy)) continue;
      let c = G.dith([15, 25, 23, 24], 2.6 - (yy - y) / H * 2.4, xx, yy);
      if (!inW(xx + 1, yy) || !inW(xx, yy + 1)) c = 15; if (!inW(xx - 1, yy) || !inW(xx, yy - 1)) c = 24;
      if (Math.abs((xx - x) + (yy - y) * 0.7 - sweep) < 6) c = (xx + yy) % 2 ? 24 : 8;
      G.px(xx, yy, c); }
    for (let i = 0; i < 6; i++) { if (Math.floor(tf * 4 + i) % 3) continue; const sx = x + Math.floor(rnd('gs' + i) * bigW(str, sc)), sy = y + Math.floor(rnd('gt' + i) * H); G.px(sx, sy, 8); G.px(sx - 1, sy, 24); G.px(sx + 1, sy, 24); G.px(sx, sy - 1, 24); G.px(sx, sy + 1, 24); }
  }
  function shotLove(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, y > 186 ? G.dith([1, 2], 1 - (y - 186) / 20, x, y) : 44);
    const land = 64.08, sc = 12, gx = 118, gy = 186 - 12 * sc + 4, y0 = tf < land ? Math.round(lerp(-160, gy, seg(tf, 63.86, land))) : gy;
    for (let y = 0; y < 186; y++) for (let x = 0; x < LW; x++) { const hw = 30 + y * 0.72; if (Math.abs(x - 188) < hw && PIX.bt(x, y) < 0.16) G.px(x, y, 3); }
    goldWord(G, '爱', gx, y0, sc, tf);
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
  // E1 第 23 句：坐在桌边，头上的想法气泡里两个选项，光标来回跳，一个也没选
  function shotChoice(G, tf) { const o = roomE(G, tf, { action: 'sitHunch', u: 0.45 }); HEADS.choice = CHAR.headAt(o); }
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
  const QUEST = ['按时吃饭', '别熬夜', '骑车慢点', '少抽点烟'];
  const TICKS = [121.62, 121.78, 121.94, 122.10];
  function shotQuest(G, tf) {
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([9, 10, 11], 0.4 + (y / LH) * 0.8, x, y));
    const px = 52, py = 18, pw = 216, ph = 182;
    G.rect(px + 3, py + 3, pw, ph, 9); G.rect(px - 1, py - 1, pw + 2, ph + 2, 0);
    for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) G.px(x, y, G.dith([47, 45, 29], 1.3 + (x - px) / pw * 0.6 - (y - py) / ph * 0.4, x, y));
    for (let y = py + 34; y < py + ph - 6; y += 26) G.rect(px + 10, y + 20, pw - 20, 1, 47);
    G.rect(px + pw / 2 - 16, py - 6, 32, 10, 29); G.rect(px + pw / 2 - 16, py - 6, 32, 1, 7);                                                     // 胶带
    big(G, '她的叮嘱', px + 16, py + 10, 2, 46);
    QUEST.forEach((q0, i) => { const app = 119.81 + i * 0.32; if (tf < app) return; const y = py + 54 + i * 26, dx = tf < app + 0.09 ? 4 : 0;
      big(G, q0, px + 40 + dx, y - 5, 2, 46);
      if (tf >= TICKS[i]) { const c = 43, x0 = px + 18, y0 = y; G.line(x0, y0 + 6, x0 + 4, y0 + 11, c); G.line(x0 + 4, y0 + 11, x0 + 12, y0, c); G.line(x0, y0 + 5, x0 + 4, y0 + 10, c); G.line(x0 + 4, y0 + 10, x0 + 12, y0 - 1, c); } });   // 他用笔打的勾
  }
  function shotCelebrate(G, tf) {   // 回忆：一个月没抽烟，她捧着蛋糕、举着纸牌给他庆祝
    const st = { s: tf, tf, I: 1.15, rain: 0.15, sway: 0 }; drawRoom(G, 0, st);
    const L = roomLight(st.I);
    CHAR.draw(G, { who: 'him', ...HIM_SEAT, facing: 'left', action: 'sit', t: tf, light: L, expression: 'happy' });
    const her = { who: 'her', x: 170, y: 202, size: 82, facing: 'right', t: tf, light: L, expression: 'happy', action: 'idle', poseFix: { as: -1.25, ae: -1.35, bs: -0.35, be: -3.1 }, hold: CAKE };
    CHAR.draw(G, her);
    const fh = CHAR.handAt(her, 'far'), Hh = CHAR.headAt(her), str = '一个月没抽烟啦！', tw = G.textW(GL, str), sx = Math.round(clamp(fh.x - tw / 2 - 6, 60, 250 - tw)), sy = Math.round(Hh.y - Hh.r - 30);
    G.line(fh.x, fh.y, fh.x, sy + 18, 15); G.line(fh.x + 1, fh.y, fh.x + 1, sy + 18, 14); G.rect(sx - 1, sy - 1, tw + 14, 21, 0); G.rect(sx, sy, tw + 12, 19, 29); G.text(GL, str, sx + 6, sy + 3, 43);
    drawTableTop(G, 0, st); drawLamp(G, 0, st);
    for (let i = 0; i < 30; i++) { const u = ((tf - 122.2) * 0.9 + rnd('cf' + i) * 0.4) % 1, x = Math.floor(rnd('cx' + i) * LW), y = Math.round(-10 + u * 220 + Math.sin(tf * 6 + i) * 3); G.rect(x, y, 2, 1, [42, 23, 40, 8][i % 4]); }
  }
  // E4 第 26 句：状态栏，全是问号
  const ST_HER = [['喜欢', '美食、看海'], ['梦想', '财富自由'], ['害怕', '怕黑']];
  const ST_HIM = [['喜欢', '说唱'], ['梦想', '成为 rap star'], ['害怕', '孤独']];
  const GARB = '锟斤拷烫#%&@*?';
  let ST_T = null;
  function statusTimes() {   // 乱码的节奏跟着这句的字走：\"了解你\"把她那张卡烧掉，\"了解我自己\"把他自己那张烧掉
    if (ST_T) return ST_T;
    const L = window.LYRICS || [], li = L.findIndex((l) => l[2].includes('也不了解我自己')), C = (window.AUDIO && li >= 0) ? window.AUDIO.chars[li] : null;
    const at = (k, d) => (C && C[k] >= 0 ? C[k] : d);
    ST_T = { her: [at(2, 123.75), at(4, 124.2) + 0.35], him: [at(8, 124.8), at(11, 125.6) + 0.35] };
    return ST_T;
  }
  function shotStatus(G, tf) {
    G.fill(44); for (let y = 0; y < LH; y += 4) for (let x = (y % 8 ? 2 : 0); x < LW; x += 4) G.px(x, y, 1);
    const T = statusTimes();
    const fadeCopy = (src, v, dim) => { for (let i = 0; i < LW * LH; i++) { const c = src.B[i]; if (c === 255) continue; const x = i % LW, y = (i / LW) | 0; if (PIX.bt(x, y) < v) G.B[i] = dim ? (v > 0.55 ? 5 : 4) : c; else if (v > 0.05 && PIX.bt(x + 1, y) < v * 0.6) G.px(x + 1, y, 3); } };
    [[12, 'her', '她', ST_HER, T.her], [166, 'him', '我', ST_HIM, T.him]].forEach(([x, who, name, rows, [g0, g1]]) => {
      panel(G, x, 26, 142, 170);
      const total = rows.reduce((n, r) => n + [...r[1]].length, 0), flip = (k) => g0 + (g1 - g0) * k / total;
      T1.B.fill(255); CHAR.drawHead(T1, { who, x: x + 71, y: 62, r: 22, facing: 'front', expression: who === 'her' ? 'neutral' : 'sad', t: tf });
      fadeCopy(T1, 1 - seg(tf, g0, g1 + 0.3) * 0.85, false);   // 头像跟着一点点散掉
      ctext(G, name, x + 71, 90, 8);
      let k = 0;
      rows.forEach(([lab, val], r) => { const y = 114 + r * 26; G.text(GL, lab, x + 12, y, 43); G.rect(x + 12, y + 15, 118, 1, 2);
        let cx = x + 54;
        for (const ch of val) { const age = tf - flip(k++), v = age < 0 ? 1.01 : 1 - age / 0.55; T1.B.fill(255); T1.text(GL, ch, cx, y, 8); if (v > 0) fadeCopy(T1, v, age >= 0); cx += GL[ch] ? GL[ch].adv : 12; } });
    });
  }
  // E5 第 27 句：删除这段存档？否（对话框在 ui 里，照片走老电影）
  function shotDelete(G, tf) {   // 第 27 句（现在）：他把墙上的拍立得取下来，举在垃圾桶上方停住，又钉回墙上
    const cam = 60, inHand = tf >= 126.55 && tf < 127.75, st = { tf, I: 0.5, rain: 0.6, noPhoto: inHand };
    R6(G, cam, st);
    const L = ROOM6.light(st), lt = (x, y) => L(x + cam, y);
    const bx = 164 - cam; G.rect(bx - 8, 186, 17, 18, 0); for (let y = 187; y < 204; y++) for (let x = bx - 7; x < bx + 8; x++) G.px(x, y, (y - 187) % 4 === 0 ? 4 : G.dith([5, 6, 7], 0.4 + (x - bx + 7) / 15, x, y)); G.rect(bx - 9, 185, 19, 2, 7);   // 垃圾桶
    const up = tf < 126.55 ? smooth(seg(tf, 126.08, 126.5)) : tf >= 127.75 ? smooth(seg(tf, 127.75, 127.95)) : 0;
    const shake = tf >= 127.0 && tf < 127.6 && Math.floor(tf * 10) % 2 ? 0.06 : 0;
    const him = { who: 'him', x: 194 - cam, y: 204, size: 90, facing: 'left', t: tf, light: lt, expression: 'sad', action: 'idle',
      poseFix: inHand ? { as: -1.05 + shake, ae: -0.55 } : { as: lerp(-0.1, -2.75, up), ae: lerp(-0.2, -0.15, up) } };
    CHAR.draw(G, him);
    if (inHand) { const h = CHAR.handAt(him), P = wallPhotoPixels(), x0 = h.x - 18, y0 = h.y - 7;   // 照片在手里：缩一半
      G.rect(x0 - 1, y0 - 1, 18, 14, 0); G.rect(x0, y0, 16, 12, 8); for (let j = 0; j < 10; j++) for (let i = 0; i < 15; i++) G.px(x0 + 1 + i, y0 + 1 + j, P[(j * 2) * 30 + i * 2]); }
    ROOM6.drawTop(G, cam, st);
    cold(G);
  }
  // E6 第 28 句：GAME OVER → 投币 → 继续，Lv.24
  const up = (tf) => tf >= 129.7;
  const BOOK_W = [['我才24', 34, 3, 128.20, 128.80, 46], ['我一定要成为', 96, 2, 128.92, 129.45, 46], ['rap star', 126, 3, 129.48, 129.85, 31]];
  function shotOver(G, tf) {   // 第 28 句：书桌上的歌词本，笔一笔一笔写；最后用力划一道下划线
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith(RAMP.wood, 0.9 + (x / LW) * 0.6 + ((y + (x >> 4)) % 23 === 0 ? -0.5 : 0), x, y));
    const page = (x0, x1) => { for (let y = 14; y < 226; y++) for (let x = x0; x < x1; x++) G.px(x, y, G.dith([47, 45, 29], 1.3 + (y - 14) / 400 - Math.abs(x - 160) / 600, x, y)); for (let y = 40; y < 222; y += 26) G.rect(x0 + 6, y, x1 - x0 - 12, 1, 47); };
    G.rect(9, 13, 302, 215, 0); page(10, 159); page(161, 310); G.rect(159, 14, 2, 212, 46);
    for (let r = 0; r < 7; r++) { let x = 20; while (x < 140) { const w = 4 + PIX.hash('sc' + r + x) % 9; if (PIX.hash('sk' + r + x) % 5) { G.rect(x, 30 + r * 26, w, 2, 46); G.px(x + 1, 29 + r * 26, 46); } x += w + 3; } if (r % 3 === 1) G.line(18, 31 + r * 26, 120, 31 + r * 26, 31); }   // 以前写的词，有的划掉了
    let pen = null;
    for (const [str, y, sc, t0, t1, c] of BOOK_W) { const chars = [...str], n = chars.length; let x = 164;
      chars.forEach((ch, k) => { const tk = t0 + (t1 - t0) * k / n; if (tf < tk) return; const dy = (PIX.hash(str + k) % 3) - 1; big(G, ch, x, y + dy, sc, c); pen = [x + bigW(ch, sc), y + 10 * sc]; x += bigW(ch, sc); }); }
    const ul = seg(tf, 129.9, 130.02); if (ul > 0) { const w = Math.round(130 * ul); G.rect(168, 168, w, 3, 31); G.rect(170, 172, Math.max(0, w - 10), 2, 31); pen = [168 + w, 170]; }
    if (pen) { const [x, y] = pen; G.limb([x + 3, y - 2], [x + 26, y - 40], 2.2, 2.6, 0, null); G.limb([x + 3, y - 2], [x + 25, y - 39], 1.2, 1.6, 2, null); G.px(x + 2, y - 1, 0); }   // 笔
    shakeAt(G, tf, [129.9], 4);
  }
  // E7 第 29 句：商店，全都买不起
  const SHOP_ITEMS = [[130.21, 'lv', 'LV', '老花手袋', '￥15800'], [130.72, 'cn', '香奈儿', '链条包', '￥42000'], [131.23, 'rx', '劳力士', '手表', '￥76000'], [131.74, 'bb', '巴黎世家', '球鞋', '￥8900']];
  function itemIcon(G, kind, cx, cy) {
    if (kind === 'bb') { G.poly([[cx - 22, cy - 2], [cx - 8, cy - 14], [cx + 4, cy - 12], [cx + 22, cy + 2], [cx + 24, cy + 10], [cx - 22, cy + 10]], (x, y) => (y > cy + 4 ? 2 : (x + y) % 9 < 2 ? 5 : 8), 0); G.line(cx - 6, cy - 8, cx + 4, cy - 4, 2); G.line(cx - 3, cy - 10, cx + 7, cy - 6, 2); G.rect(cx - 22, cy + 10, 46, 3, 7); }
    else if (kind === 'rx') { G.rect(cx - 8, cy - 26, 16, 52, 0); G.rect(cx - 7, cy - 26, 14, 52, 25); for (let y = cy - 26; y < cy + 26; y += 4) G.rect(cx - 7, y, 14, 1, 15); G.ellipse(cx, cy, 15, 15, 23, 0); G.ellipse(cx, cy, 11, 11, 41, 0); G.line(cx, cy, cx + 6, cy - 3, 8); G.line(cx, cy, cx - 2, cy - 8, 8); }
    else if (kind === 'cn') { G.poly([[cx - 20, cy - 8], [cx + 20, cy - 8], [cx + 22, cy + 16], [cx - 22, cy + 16]], (x, y) => ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0 ? 2 : 44), 0); G.line(cx - 14, cy - 8, cx - 6, cy - 22, 23); G.line(cx + 14, cy - 8, cx + 6, cy - 22, 23); G.line(cx - 6, cy - 22, cx + 6, cy - 22, 23); G.rect(cx - 3, cy - 3, 6, 4, 23); }
    else { G.poly([[cx - 22, cy - 6], [cx + 22, cy - 6], [cx + 26, cy + 16], [cx - 26, cy + 16]], (x, y) => ((x + y * 3) % 10 < 2 ? 17 : 14), 0); G.rect(cx - 26, cy + 4, 52, 2, 16); for (const d of [-10, 10]) { G.line(cx + d, cy - 6, cx + d, cy - 18, 15); } G.line(cx - 10, cy - 18, cx + 10, cy - 18, 15); G.rect(cx - 2, cy - 2, 4, 4, 23); }
  }
  function shotShop(G, tf) {   // 第 29 句（现在）：雨夜，他穿着外卖服站在奢侈品店橱窗外，价签一个个亮起来
    for (let y = 0; y < 200; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith([1, 2, 3], 0.5 + (y < 30 ? 0 : 0.5), x, y));
    for (let y = 200; y < LH; y++) for (let x = 0; x < LW; x++) { const refl = x > 30 && x < 290 && (y + (x >> 2)) % 5 < 2; G.px(x, y, refl ? (y < 214 ? 29 : 5) : G.dith([1, 2], 0.6, x, y)); }   // 湿地面上的橱窗倒影
    G.rect(26, 22, 268, 14, 0); G.rect(28, 24, 264, 10, 44); G.rect(28, 33, 264, 1, 23); for (let x = 120; x < 200; x += 6) G.rect(x, 27, 3, 4, 23);   // 招牌
    G.rect(26, 38, 268, 160, 23); G.rect(28, 40, 264, 156, 0);
    for (let y = 41; y < 195; y++) for (let x = 29; x < 291; x++) G.px(x, y, G.dith([6, 7, 29, 8], 2.6 - (y - 41) / 120 - Math.abs(x - 160) / 300, x, y));   // 暖白的光
    SHOP_ITEMS.forEach(([t0, kind, brand, name, price], i) => { const cx = 62 + i * 65, lit = tf >= t0;
      G.rect(cx - 22, 160, 44, 35, 0); for (let y = 161; y < 195; y++) for (let x = cx - 21; x < cx + 22; x++) G.px(x, y, G.dith([4, 5, 6], 1.4 - (y - 161) / 40, x, y));   // 展台
      if (lit) for (let y = 41; y < 160; y++) { const w = 6 + (y - 41) * 0.2; for (let x = cx - w; x < cx + w; x++) if (PIX.bt(x, y) < 0.35) G.px(x, y, 8); }
      itemIcon(G, kind, cx, 130);
      const tw = G.textW(GL, price) + 6; G.line(cx, 150, cx, 154, 4); G.rect(cx - tw / 2 - 1, 154, tw + 2, 15, 0); G.rect(cx - tw / 2, 155, tw, 13, lit ? 8 : 6); G.text(GL, price, Math.round(cx - tw / 2 + 3), 155, lit ? 31 : 4); });
    for (let i = 0; i < 6; i++) G.line(40 + i * 46, 41, 30 + i * 46, 194, 7);                                                                 // 玻璃反光
    CHAR.draw(G, { who: 'him', x: 150, y: 228, size: 70, facing: 'back', t: tf, light: () => 0.35, outfit: 'rider', expression: 'sad' });
    drawRain(G, tf, 0.9, tf);
    if (tf >= 131.74) { const dy = tf < 131.86 ? -6 : 0; panel(G, 212, 4 - dy, 100, 22, { bg: 33, bd: 35, cr: 35 }); G.text(GL, '余额 ￥324', 220, 8 - dy, 8); }
  }
  // E8 第 30–31 句：吃药。她的影子一直在后面追；吃下药，影子变蓝往回逃；追上时，碎成一颗小心，没了
  const RP = route([[1, 1], [8, 1], [8, 4], [8, 5], [12, 5]]), PILLC = [12, 5], T_EAT = 135.15, T_CATCH = 136.66;
  function pillHalf(dst, tf, memory) {
    const cam = 96, st = { tf, I: memory ? 1.0 : 0.5, rain: memory ? 0 : 0.6 };
    if (memory) st.clock = 21 * 3600 + 30 * 60;
    R6(dst, cam, st);
    const L = ROOM6.light(st), lt = (x, y) => L(x + cam, y);
    if (memory) {   // 回忆：他发烧坐在床边，额头贴着退烧贴；她递药和水
      const him = { who: 'him', x: 150 - cam, y: 204, size: 86, seat: 28, facing: 'right', action: 'sitHunch', u: 0.8, t: tf, light: lt, expression: 'sad' };
      CHAR.draw(dst, him); const H = CHAR.headAt(him); dst.rect(Math.round(H.x - 1), Math.round(H.y - H.r * 0.55), 7, 4, 8);
      CHAR.draw(dst, { who: 'her', x: 230 - cam, y: 204, size: 84, facing: 'left', action: 'hold', u: 1, t: tf, light: lt, expression: 'sad', hold: CUP });
    } else {        // 现在：一个人坐在床边，自己吃药；墙上贴着她留的便利贴
      const toMouth = smooth(seg(tf, 133.0, 133.4)) * (1 - smooth(seg(tf, 133.9, 134.2)));
      CHAR.draw(dst, { who: 'him', x: 168 - cam, y: 204, size: 86, seat: 28, facing: 'right', action: 'sitHunch', u: 0.6, t: tf, light: lt, expression: 'sad', poseFix: { as: lerp(-0.3, -0.5, toMouth), ae: lerp(-1.3, -2.7, toMouth) }, hold: toMouth > 0.3 ? PILLP : CUP });
    }
    ROOM6.drawTop(dst, cam, st);
    if (!memory) { cold(dst); const nx = 204 - cam; dst.rect(nx, 118, 12, 11, 0); dst.rect(nx + 1, 119, 10, 9, 25); dst.rect(nx + 3, 121, 6, 1, 15); dst.rect(nx + 3, 124, 5, 1, 15); }   // 便利贴（冷色之后画，保持黄色）
  }
  function shotPill(G, tf) {
    pillHalf(T1, tf, true); pillHalf(T2, tf, false);
    const li = (window.LYRICS || []).findIndex((l) => l[2].startsWith('take pill')), cure = sayAt(li, 5, 135.0);   // 第 31 句的 pill：回忆那半边褪掉
    const gone = smooth(seg(tf, cure, cure + 0.9));
    for (let y = 0; y < LH; y++) for (let x = 0; x < 160; x++) { const c = T1.get(x + 18, y); G.px(x, y, PIX.bt(x, y) < gone ? (y > 172 ? 13 : 9) : (SEPIA[c] ?? 14)); G.px(x + 160, y, T2.get(x + 18, y)); }
    G.rect(159, 0, 2, LH, 0);
    if (tf >= 134.4) { const dy = tf < 134.5 ? -4 : 0; panel(G, 206, 18 + dy, 106, 44, { bg: 25, bd: 15, cr: 15 }); G.text(GL, '药在第二格', 214, 23 + dy, 0); G.text(GL, '记得按时吃', 214, 39 + dy, 0); G.line(236, 62 + dy, 240, 116, 25); }
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
    if (false) {
      drawTitle(G, tf, { noDrop: true, y: 12 });
      const sel = tf < 151.18 ? 0 : 2, moving = tf >= 150.6 && tf < 151.18;
      drawMenu(G, tf, sel, { slide: 149.12, dim: [0, 1], selY: moving ? seg(tf, 150.6, 151.18) * 2 : sel, press: tf >= 152.7 && Math.floor(tf * 12) % 2 === 0 });
    }
  }
  function shotOutro(G, tf) {   // 天亮了：回到书桌前，戴上耳机，按下录音键（这首《唉》就是这一夜写出来的）
    const dawn = 0.6 + 0.4 * smooth(seg(tf, 147.6, 153)), put = tf >= 148.4 && tf < 148.95, press = tf >= 152.35 && tf < 152.8;
    const him = put ? { action: 'sit', poseFix: { as: -0.25, ae: -3.0 } } : press ? { action: 'sit', poseFix: { as: -0.95, ae: -0.95 } } : tf < 148.4 ? { action: 'sitHunch', u: 0.7 } : { action: 'sitHold', u: 0.6 };
    shotRecord(G, tf, { dawn, rec: tf >= 152.7, phones: tf >= 148.9, him, expr: tf >= 152.7 ? 'neutral' : 'sad', nod: tf >= 152.7 });
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
    else if (tf < 22.79) shotRide(G, tf);
    else if (tf < 26.61) shotForever(G, tf);
    else if (tf < 30.34) shotFlood(G, tf);
    else if (tf < 34.57) shotDoorMem(G, tf);
    else if (tf < 39.22) shotDoorNow(G, tf);
    else if (tf < 42.85) shotAlone(G, tf);
    else if (tf < 45.65) shotSurface(G, tf);
    else if (tf < 47.58) shotBowls(G, tf);
    else if (tf < 50.43) shotRideBoard(G, tf);
    else if (tf < 55.73) shotHail(G, tf);
    else if (tf < 59.91) shotRecord(G, tf, { her: true, rec: true, nod: true, expr: 'happy' });
    else if (tf < 63.91) shotEstate(G, tf);
    else if (tf < 66.36) shotLove(G, tf);
    else if (tf < 66.87) openRoom(G, tf);
    else if (tf < 119.81) shotChoice(G, tf);
    else if (tf < 122.20) shotQuest(G, tf);
    else if (tf < 122.92) shotCelebrate(G, tf);
    else if (tf < 123.47) roomE(G, tf);
    else if (tf < 126.08) shotStatus(G, tf);
    else if (tf < 128.14) shotDelete(G, tf);
    else if (tf < 130.21) shotOver(G, tf);
    else if (tf < 132.27) shotShop(G, tf);
    else if (tf < 137.34) shotPill(G, tf);
    else if (tf < 141.34) shotDebt(G, tf);
    else if (tf < 144.99) shotNight(G, tf);
    else if (tf < 147.6) shotDawn(G, tf);
    else if (tf < 153.25) shotOutro(G, tf);
    else shotEnd(G, tf);
  }
  function hearts(s) { if ((s >= 16.70 && s < 22.79) || (s >= 30.34 && s < 34.57) || (s >= 47.58 && s < 50.43) || (s >= 55.73 && s < 59.91) || (s >= 122.20 && s < 122.92)) return 3; if (s < 66.87) return s < 8.66 ? 3 : s < 10.24 ? 2 : 1; if (s >= 153.25) return -1; return 1; }
  function flash(s) { if (s >= 8.66 && s < 8.83) return 2; if (s >= 10.24 && s < 10.41) return 1; return -1; }
  function ui(GU, s) {
    const tf = q(s);
    if (tf >= 31.0 && tf < 33.8 && HEADS.doorHer) { const H = HEADS.doorHer; sayBox(GU, ['这么晚了', '还要出去啊'], H.x - 14, H.y - H.r - 12, { tail: [H.x, H.y - H.r - 2], pop: tf < 31.09 }); }
    if (tf >= CH_OPEN && tf < 22.79) drawChat(GU, tf);
    if (tf >= 56.75 && tf < 59.7 && HEADS.rec) { const H = HEADS.rec; sayBox(GU, ['我以后一定要', '让你过上好日子'], H.x - 40, H.y - H.r - 26, { tail: [H.x - 6, H.y - H.r - 2], pop: tf < 56.84 }); }
    if (tf >= EST.her[0] && tf < EST.her[1] && HEADS.lady) { const H = HEADS.lady; sayBox(GU, ['明天我生日'], H.x - 20, H.y - H.r - 14, { tail: [H.x, H.y - H.r - 2], pop: tf < EST.her[0] + 0.09 }); }
    if (tf >= EST.him[0] && tf < EST.him[1] && HEADS.man) { const H = HEADS.man; sayBox(GU, ['送你那个香奈儿的包'], H.x - 40, H.y - H.r - 22, { tail: [H.x, H.y - H.r - 6], pop: tf < EST.him[0] + 0.09 }); }
    if (tf >= EST.n1 && tf < 63.91) {   // 手机通知
      const note = (y, icon, lines, t0) => { const dy = tf < t0 + 0.12 ? -6 : 0; panel(GU, 34, y + dy, 252, 14 + lines.length * 13, { bg: 33, bd: 35, cr: 35 }); icon(GU, 42, y + 5 + dy); lines.forEach((l, i) => GU.text(GL, l, 60, y + 3 + i * 13 + dy, 8)); };
      note(26, (G2, x, y) => { G2.rect(x, y, 11, 11, 23); G2.rect(x + 2, y + 3, 7, 5, 0); }, ['本单收入 +￥6'], EST.n1);
      if (tf >= EST.n2) note(50, (G2, x, y) => { G2.rect(x, y, 11, 11, 40); G2.rect(x + 6, y + 1, 1, 7, 0); G2.ellipse(x + 4, y + 8, 2, 2, 0, null); }, ['你的作品《说唱之神在哭泣》', '新增播放 1 次'], EST.n2);
    }
    if (tf >= 113.55 && tf < 115.05) { const H = CHAR.headAt({ who: 'her', x: 212, y: 200, size: 78, facing: 'left' }); sayBox(GU, ['你还要坚持你那不切实际的', '理想到什么时候'], H.x - 30, H.y - H.r - 12, { tail: [H.x - 4, H.y - H.r - 2], pop: tf < 113.64 }); }
    if (tf >= 115.05 && tf < 115.5) { const H = CHAR.headAt({ who: 'him', x: 140, y: 204, size: 90, facing: 'right' }); sayBox(GU, ['……'], H.x, H.y - H.r - 12, { tail: [H.x + 4, H.y - H.r - 2] }); }
    if (tf >= 117.8 && tf < 119.75 && HEADS.choice) {   // 选项：光标来回跳，最后气泡散掉
      const H = HEADS.choice, gone = seg(tf, 119.35, 119.7), LINES = ['A  继续送外卖，放弃说唱梦，', '    老老实实过日子', 'B  坚持说唱，出专辑'];
      CB.B.fill(255); const b = sayBox(CB, LINES, 150, H.y - H.r - 22, { think: true, tail: [H.x - 2, H.y - H.r - 4], pop: tf < 117.89 });
      const sel = Math.floor((tf - 117.9) * (tf < 118.9 ? 3 : 5)) % 2;
      if (tf < 119.35) { cursor(CB, b.x0 - 6, b.y0 + 5 + (sel ? 26 : 0), 43); (sel ? [2] : [0, 1]).forEach((k) => CB.text(GL, LINES[k], b.x0 + 6, b.y0 + 3 + k * 13, 43)); }
      for (let i = 0; i < LW * LH; i++) { const c = CB.B[i]; if (c === 255) continue; const x = i % LW, y = (i / LW) | 0; if (PIX.bt(x, y) >= gone) GU.B[i] = c; }
    }
  }
  const gray = () => 0;
  const fade = (tf) => 0.9 * smooth(seg(tf, 157.4, 158));
  const warm = (tf) => tf < 8.66 || (tf >= 144.99 && tf < 153.25);
  function clock(tf) {   // 141.34 之后：钟从快 3 点越转越快，到 144.99 切走时是 5:50
    const base = 2 * 3600 + 47 * 60 + 20 + (tf - 66.87), target = 5 * 3600 + 50 * 60 - (2 * 3600 + 47 * 60 + 20 + (144.99 - 66.87));
    return base + target * Math.pow(seg(tf, 141.34, 144.99), 1.6);
  }
  window.BOOK = { frame, hearts, flash, ui, gray, fade, clock, warm, barFloor, BARS };
})();
