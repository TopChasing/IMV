/* lib/paper.js：纸艺立体书的共用画法。角色（character.js）和每个镜头都用它，保证纸片做法一致。
   PAPER.sprite(key, bounds, draw, opts)：做一张纸片（同 key 只做一次）。bounds = [x0,y0,x1,y1]（以锚点为原点），draw(a) 以锚点为原点平涂。
     opts.border 白边宽（默认 10）、opts.thick 纸厚（默认 3.5）、opts.tex 纸纹浓度（默认 1）
   PAPER.place(ctx, s, x, y, o)：摆一张纸片。o.rot / o.sx / o.sy / o.alpha / o.bright，o.id + o.pose 决定手摆抖动（o.jit 倍数，0 不抖）
   画面只由参数决定：随机数都用字符串做种子。 */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const P = (window.PAPER = {});
  P.TAU = TAU;
  P.C = { cream: '#FFF7EA', edge: '#A2947F', cut: '#2B2430' };
  P.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  P.lerp = (a, b, k) => a + (b - a) * k;
  P.smooth = (u) => { u = P.clamp(u); return u * u * (3 - 2 * u); };
  P.hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  P.rng = (key) => { let a = P.hash(key); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  P.rnd = (key) => P.rng(key)();
  P.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  P.g2 = (c) => c.getContext('2d');
  P.reset = (x) => { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.shadowColor = 'rgba(0,0,0,0)'; x.shadowBlur = 0; x.shadowOffsetX = 0; x.shadowOffsetY = 0; return x; };
  P.rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // 路径
  P.ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); return p; };
  P.poly = (pts) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  P.rrect = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };
  P.capsule = (x1, y1, x2, y2, r1, r2 = r1) => { const a = Math.atan2(y2 - y1, x2 - x1), p = new Path2D(); p.arc(x1, y1, r1, a + Math.PI / 2, a - Math.PI / 2); p.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2); p.closePath(); return p; };
  // 立体的东西分亮暗两面：整片涂暗面，再把往左上错开的同一形状涂亮面（灯在左上）
  P.twoTone = (a, path, lit, dark, dx = -12, dy = -10) => { a.fillStyle = dark; a.fill(path); a.save(); a.clip(path); a.translate(dx, dy); a.fillStyle = lit; a.fill(path); a.restore(); };
  // 一小片纸贴上去：下面垫一点小影子
  P.glue = (a, path, fill, o = {}) => { a.save(); if (o.clip) a.clip(o.clip); a.shadowColor = o.sc || 'rgba(24,18,34,.34)'; a.shadowBlur = o.sb ?? 4; a.shadowOffsetX = o.sx ?? 1.5; a.shadowOffsetY = o.sy ?? 2.5; a.fillStyle = fill; a.fill(path); a.restore(); a.fillStyle = fill; a.fill(path); };

  // 纸纹
  let TEX = null;
  function makeTex() {
    const s = 512, c = P.canvas(s, s), x = P.g2(c), r = P.rng('paper-tex');
    for (let i = 0; i < 70; i++) { const px = r() * s, py = r() * s, rad = 30 + r() * 90, g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, r() < .5 ? 'rgba(60,50,45,.06)' : 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
    for (let i = 0; i < 8000; i++) { x.fillStyle = r() < .55 ? `rgba(55,45,40,${.05 + r() * .08})` : `rgba(255,255,255,${.07 + r() * .1})`; x.fillRect(r() * s, r() * s, 1 + r() * 1.6, 1 + r() * 1.2); }
    x.lineCap = 'round';
    for (let i = 0; i < 260; i++) { const px = r() * s, py = r() * s, an = r() * TAU, l = 6 + r() * 20; x.strokeStyle = r() < .5 ? `rgba(90,75,65,${.07 + r() * .07})` : `rgba(255,255,255,${.09 + r() * .09})`; x.lineWidth = .6 + r() * .6; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(an) * l * .5, py + Math.sin(an) * l * .5, px + Math.cos(an) * l, py + Math.sin(an) * l); x.stroke(); }
    return c;
  }
  P.tex = () => TEX || (TEX = makeTex());
  P.texFill = (x, w, h, key, alpha = 1) => { const p = x.createPattern(P.tex(), 'repeat'); p.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(P.rnd(key + 'x') * 512), Math.floor(P.rnd(key + 'y') * 512)])); x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha; x.fillStyle = p; x.fillRect(0, 0, w, h); x.restore(); };
  // 透明度往外扩 r 像素，填一种颜色（白边、刀口、纸厚）
  P.grow = (src, r, col) => { const c = P.canvas(src.width, src.height), x = P.g2(c), n = Math.max(24, Math.round(r * 3)); for (let i = 0; i < n; i++) { const t = i / n * TAU; x.drawImage(src, Math.cos(t) * r, Math.sin(t) * r); } for (let i = 0; i < 12; i++) { const t = i / 12 * TAU + .26; x.drawImage(src, Math.cos(t) * r * .55, Math.sin(t) * r * .55); } x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; };

  const CACHE = new Map();
  P.sprite = (key, bounds, draw, o = {}) => {
    if (CACHE.has(key)) return CACHE.get(key);
    const r = o.border ?? 10, th = o.thick ?? 3.5, pad = Math.ceil(r + th + 8);
    const [x0, y0, x1, y1] = bounds, w = Math.ceil(x1 - x0) + 2 * pad, h = Math.ceil(y1 - y0) + 2 * pad, ox = pad - x0, oy = pad - y0;
    const art = P.canvas(w, h), a = P.g2(art); a.translate(ox, oy); draw(a); P.reset(a); P.texFill(a, w, h, key, o.tex ?? 1);
    const img = P.canvas(w, h), x = P.g2(img);
    if (r > 0) { const edge = P.grow(art, r + 1, o.edge || P.C.edge), rim = P.grow(art, r + (o.cut ?? 2.2), P.C.cut), card = P.grow(art, r, o.cream || P.C.cream); P.texFill(P.g2(card), w, h, key + 'card', .9); x.drawImage(edge, th * .75, th); x.drawImage(rim, 0, 0); x.drawImage(card, 0, 0); }
    x.drawImage(art, 0, 0);
    const s = { img, ox, oy, w, h };
    CACHE.set(key, s); return s;
  };
  P.place = (x, s, wx, wy, o = {}) => {
    const id = o.id ?? 'x', j = o.jit ?? 1, pose = o.pose ?? 0;
    const jx = j ? (P.rnd('jx' + id + ':' + pose) - .5) * 1.6 * j : 0, jy = j ? (P.rnd('jy' + id + ':' + pose) - .5) * 1.1 * j : 0, jr = j ? (P.rnd('jr' + id + ':' + pose) - .5) * .006 * j : 0;
    x.save(); x.translate(wx + jx, wy + jy); x.rotate((o.rot || 0) + jr); x.scale(o.sx ?? 1, o.sy ?? 1);
    if (o.alpha != null) x.globalAlpha = o.alpha;
    if (o.bright != null && Math.abs(o.bright - 1) > .004) x.filter = `brightness(${o.bright.toFixed(3)})`;
    x.drawImage(s.img, -s.ox, -s.oy); x.restore();
  };
})();
