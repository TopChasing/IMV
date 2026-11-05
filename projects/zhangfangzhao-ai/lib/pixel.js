/* lib/pixel.js：《唉》像素风的共用画法。镜头页、角色（character.js）、设定图都用它。
   PIX.create(LW, LH) → G：一块调色板索引缓冲 + 画法
     G.px(x, y, c)  G.get(x, y)  G.fill(c)  G.rect(x, y, w, h, c)  G.line(x0, y0, x1, y1, c)
     G.dith(ramp, v, x, y)                            在 ramp（调色板序号数组）里按 v 取色，小数部分用 4×4 Bayer 抖动
     G.shape(bb, inside, colorFn, outline)            光栅化：inside(x+.5, y+.5) 为真的格子填 colorFn(x, y)，外面描 1 像素 outline（null 不描）
     G.poly(pts, colorFn, outline)  G.ellipse(cx, cy, rx, ry, colorFn, outline)  G.limb(a, b, r0, r1, colorFn, outline)
     G.text(glyphs, str, x, y, c, shadow)             画像素字（glyphs 来自 PIX.glyphs）
     G.flush(canvas, scale)                           按调色板转 RGB，整数倍放大画到 canvas
   PIX.glyphs(family, chars) → 字形表（12px 原尺寸画、alpha 二值化）；PIX.loadFont(url) → family
   颜色常量 PIX.C，色阶 PIX.RAMP。画面只由参数决定：随机数用字符串种子（PIX.rnd）。 */
(function () {
  'use strict';
  const PAL = [
    '#0b0d1a', '#151a33', '#1f2747', '#2c365e', '#3e4a78', '#5a6796', '#8b95bd', '#c9d0e6', '#f1f3fa', // 0-8 墨蓝 → 冷白
    '#221c2c', '#30283c', '#43384d', '#6b55a6',                                                     // 9-11 墙，12 紫（他的拖鞋）
    '#2e211d', '#4a3429', '#6e4d35', '#9a6e46', '#c4955f',                                          // 13-17 木（13-15 也是她的头发）
    '#2b3d66', '#3f5d96', '#6c8cc2',                                                                // 18-20 牛仔蓝（两个人的牛仔裤）
    '#9c6a55', '#d39a78',                                                                           // 21-22 皮肤
    '#ffd36b', '#fff2c4', '#e0973e',                                                                // 23-25 暖黄（灯 + 他的黄 T 恤，全片唯一强调色）、灯芯、琥珀
    '#bfe2ee',                                                                                      // 26 手机屏冷光
    '#2f6f8a', '#d8692e',                                                                           // 27 海，28 橙（她的头发）
    '#eee5cf',                                                                                      // 29 米白（米饭、她的毛衣）
    '#8a3320',                                                                                      // 30 铁锈红（她的发根）
    '#c8433f',                                                                                      // 31 红（血条心、脸红）
    // 32-39 只给第 1 镜的聊天界面用（暗色模式）：屏幕底、标题栏/输入栏、灰气泡、灰字/时间、浅灰图标、绿气泡、绿气泡里的字、机身
    '#191919', '#232323', '#2e2e2e', '#6f6f6f', '#b5b5b5', '#3cc27c', '#17663e', '#34343c',
    '#58c7d6', '#2a6f86', '#ff6f91', '#b4234b', '#070a17', '#f3e4c6', '#3d2a20', '#c9a67a',                  // 40-47 播放器和标题：青、深青、粉、深红、墨、奶油、棕墨、棕
  ];
  const C = { ink: 0, night: 1, white: 8, skin: 22, skinDk: 21, lamp: 23, bulb: 24, amber: 25, phone: 26, sea: 27, orange: 28, cream: 29, rust: 30, red: 31, blush: 31, slipper: 12,
    chatBg: 32, chatBar: 33, chatGray: 34, chatDim: 35, chatIcon: 36, chatGreen: 37, chatGreenTx: 38, phoneBody: 39 };
  const RAMP = {
    sky: [1, 2, 3, 4], cold: [4, 5, 6, 7, 8], wall: [9, 10, 11], wood: [13, 14, 15, 16, 17], floor: [13, 14, 15, 16],
    tee: [25, 23, 24], jeans: [18, 19, 20], skin: [21, 22], hairHim: [0, 1, 2], hairHer: [30, 28, 25],
    cami: [6, 7, 8], slide: [11, 12], shoeHer: [6, 7, 8], porcelain: [5, 6, 7, 8], sea: [27, 6],
  };
  const RGB = PAL.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bt = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  function hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; }
  const rnd = (k) => hash(k) / 4294967296;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }

  function create(LW, LH) {
    const B = new Uint8Array(LW * LH);
    const G = { LW, LH, B };
    G.px = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < LW && y < LH) B[y * LW + x] = c; };
    G.get = (x, y) => (x >= 0 && y >= 0 && x < LW && y < LH ? B[y * LW + x] : -1);
    G.fill = (c) => B.fill(c);
    G.rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.px(x + i, y + j, c); };
    G.line = (x0, y0, x1, y1, c) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { G.px(x0, y0, typeof c === 'function' ? c(x0, y0) : c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
    G.dith = (ramp, v, x, y) => { const f = clamp(v, 0, ramp.length - 1.0001), k = Math.floor(f); return (f - k) > bt(x, y) ? ramp[k + 1] : ramp[k]; };
    G.shape = (bb, inside, colorFn, outline = 0) => {
      const cells = [];
      const x0 = Math.max(-1, Math.floor(bb[0])), y0 = Math.max(-1, Math.floor(bb[1])), x1 = Math.min(LW, Math.ceil(bb[2])), y1 = Math.min(LH, Math.ceil(bb[3]));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x + 0.5, y + 0.5)) cells.push([x, y]);
      if (outline !== null && outline !== undefined) {
        const set = new Set(cells.map(([x, y]) => (y + 8) * 4096 + x + 8));
        for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!set.has((y + dy + 8) * 4096 + x + dx + 8)) G.px(x + dx, y + dy, outline);
      }
      const cf = typeof colorFn === 'function' ? colorFn : () => colorFn;
      for (const [x, y] of cells) G.px(x, y, cf(x, y));
      return cells.length;
    };
    const bbox = (pts, m = 1) => [Math.min(...pts.map((p) => p[0])) - m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.max(...pts.map((p) => p[1])) + m];
    G.poly = (pts, colorFn, outline = 0) => G.shape(bbox(pts), (x, y) => inPoly(pts, x, y), colorFn, outline);
    G.ellipse = (cx, cy, rx, ry, colorFn, outline = 0) => { rx = Math.max(0.6, rx); ry = Math.max(0.6, ry); return G.shape([cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1], (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, colorFn, outline); };
    G.limb = (a, b, r0, r1, colorFn, outline = 0) => {
      r1 = r1 ?? r0; const [ax, ay] = a, [bx, by] = b, L2 = Math.max(1e-6, (bx - ax) ** 2 + (by - ay) ** 2), R = Math.max(r0, r1);
      return G.shape(bbox([a, b], R + 1), (x, y) => { const u = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2); return Math.hypot(x - ax - u * (bx - ax), y - ay - u * (by - ay)) <= lerp(r0, r1, u); }, colorFn, outline);
    };
    G.text = (glyphs, str, x, y, c, shadow) => { let cx = Math.round(x); for (const ch of str) { const gl = glyphs[ch]; if (!gl) { cx += 4; continue; } if (shadow !== undefined) for (const [gx, gy] of gl.bits) G.px(cx + gx + 1, y + gy + 1, shadow); for (const [gx, gy] of gl.bits) G.px(cx + gx, y + gy, c); cx += gl.adv; } return cx - x; };
    G.textW = (glyphs, str) => { let w = 0; for (const ch of str) w += glyphs[ch] ? glyphs[ch].adv : 4; return w; };
    let small, sctx, IMG;
    G.flush = (canvas, scale) => {
      if (!small) { small = document.createElement('canvas'); small.width = LW; small.height = LH; sctx = small.getContext('2d'); IMG = sctx.createImageData(LW, LH); }
      const d = IMG.data; for (let i = 0; i < LW * LH; i++) { const c = RGB[B[i]] || RGB[0]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
      sctx.putImageData(IMG, 0, 0); const o = canvas.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(small, 0, 0, LW * scale, LH * scale);
    };
    return G;
  }
  async function loadFont(url) {
    try { const ff = new FontFace('FusionPixelZH', `url(${url})`); await ff.load(); document.fonts.add(ff); return '"FusionPixelZH"'; }
    catch (e) { console.warn('像素字体没加载上，退回系统字体', e); return '"Microsoft YaHei",sans-serif'; }
  }
  function glyphs(family, chars) {
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const g = cv.getContext('2d', { willReadFrequently: true }); const out = {};
    for (const ch of new Set(chars)) {
      if (ch === ' ') { out[ch] = { adv: 4, bits: [] }; continue; }
      g.clearRect(0, 0, 32, 32); g.fillStyle = '#fff'; g.textBaseline = 'top'; g.font = `12px ${family}`; g.fillText(ch, 2, 2);
      const d = g.getImageData(0, 0, 32, 32).data, bits = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (d[(y * 32 + x) * 4 + 3] > 127) bits.push([x - 2, y - 2]);
      out[ch] = { adv: Math.max(4, Math.round(g.measureText(ch).width)), bits };
    }
    return out;
  }
  window.PIX = { PAL, RGB, C, RAMP, BAYER, bt, hash, rnd, clamp, lerp, smooth, inPoly, create, loadFont, glyphs };
})();
