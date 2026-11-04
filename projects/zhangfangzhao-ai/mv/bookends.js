/* 《唉》全曲的开头（00:00–01:06.87，A1–A5）和结尾（01:57.75–02:38，B1–B11）。分镜见 ../storyboard-full.md。
   和 scene.html 共用画布、调色板、角色和画法（那边的顶层常量、函数在这里直接用）。画面只由歌曲时间决定。 */
(function () {
  'use strict';
  const BARS = [0.16, 4.30, 8.43, 12.56, 16.70, 20.83, 24.98, 29.12, 33.25, 37.38, 41.52, 45.65, 49.81, 53.94, 58.07, 62.23, 66.36, 70.50, 74.63, 78.76,
    82.92, 87.05, 91.18, 95.32, 99.47, 103.61, 107.74, 111.87, 116.01, 120.14, 124.27, 128.41, 132.56, 136.70, 140.83, 144.99, 149.12, 153.25];
  const FB = 4.133 / 8;                                                   // 快拍
  function beatFloor(t) { let b = BARS[0]; for (const x of BARS) { if (x <= t) b = x; else break; } return b + Math.floor((t - b) / FB + 1e-6) * FB; }
  const beatIdx = (t) => Math.floor((t - 0.16) / FB + 1e-6);

  // 按亮度换色：倒影（暗一档）、老照片（棕）、褪色（灰）
  const lum = (c) => { const v = PIX.RGB[c] || [0, 0, 0]; return 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]; };
  const near = (ramp, L) => { let best = ramp[0], bd = 1e9; for (const k of ramp) { const d = Math.abs(lum(k) - L); if (d < bd) { bd = d; best = k; } } return best; };
  const DIM = PIX.RGB.map((_, c) => near([0, 1, 2, 3, 4, 5, 6], lum(c) * 0.55));
  const DIM2 = PIX.RGB.map((_, c) => near([1, 2, 3, 4, 5, 6, 7, 8], lum(c) * 1.0));
  const SEPIA = PIX.RGB.map((_, c) => near([13, 14, 15, 16, 17, 29], lum(c) * 1.05));
  const GRAYM = PIX.RGB.map((_, c) => near([0, 1, 2, 3, 4, 5, 6, 7, 8], lum(c)));

  const T1 = PIX.create(LW, LH), T2 = PIX.create(LW, LH), P1 = PIX.create(LW, LH), P2 = PIX.create(LW, LH);
  const ok = (c) => c >= 0 && c !== 255;
  function rainO(G, tf, amt, x0 = 0, y0 = 0, x1 = LW, y1 = LH) {   // 只画雨丝
    for (let i = 0; i < 150 * amt; i++) { const x = x0 + Math.floor(rnd('or' + i) * (x1 - x0) + tf * 20) % (x1 - x0), y = y0 + ((rnd('oy' + i) * 300 + tf * 260) % (y1 - y0 + 20)) - 10;
      for (let k = 0; k < 4; k++) if (y + k >= y0 && y + k < y1) G.px(x - Math.floor(k / 2), y + k, k < 2 ? 6 : 5); }
  }

  // ============================== 开头：他一个人走回家 ==============================
  const OV = 34, OPA = [[27.6, 28.6], [30.3, 39.22], [42.39, 43.6], [45.65, 999]];   // 走路速度、停下来的时间
  function walkedO(t) { let w = Math.max(0, t - 12.56); for (const [a, b] of OPA) w -= clamp(Math.min(t, b) - Math.max(12.56, a), 0, 999); return w; }
  const hxO = (t) => -20 + OV * walkedO(t);
  const movingO = (t) => t > 12.56 && !OPA.some(([a, b]) => t >= a && t < b);
  const camO = (t) => Math.max(0, Math.round(hxO(t) - 130));
  const OLAMPS = Array.from({ length: 16 }, (_, i) => 40 + i * 90);
  const OFF = (() => {   // 第 2 句四个"永远"：四个慢拍上，离他最近的一盏亮着的路灯灭掉
    const off = [];
    for (const b of [22.90, 23.93, 24.98, 26.01]) { const h = hxO(b); let best = null, bd = 1e9; for (const lx of OLAMPS) { if (off.some((o) => o.lx === lx)) continue; const d = Math.abs(lx - h); if (d < bd) { bd = d; best = lx; } } off.push({ lx: best, t: b }); }
    return off;
  })();
  const openST = (tf) => ({ lamps: OLAMPS, off: (lx) => OFF.some((o) => o.lx === lx && tf >= o.t), closed: true });
  const SIG_X = 578, REST = [622, 690], BUS = [705, 765], PUDDLE_X = 552, WS = 196;

  function himO(tf, cam, light) {
    const o = { who: 'him', x: Math.round(hxO(tf)) - cam, y: 194, size: 54, facing: 'right', t: tf, light, expression: 'sad', action: movingO(tf) ? 'walk' : 'idle', arms: 'idle' };
    if (tf >= 27.6 && tf < 28.6) Object.assign(o, { arms: 'shoot', armsU: Math.sin(Math.PI * seg(tf, 27.6, 28.6)) });   // 抬胳膊抹一把脸
    if ((tf >= 42.6 && tf < 43.5) || tf >= 45.85) Object.assign(o, { facing: 'back', arms: undefined });                    // 转过去看饭馆、看海报
    return o;
  }
  function drawSignal(G, tf, cam) {
    const x = SIG_X - cam; if (x < -10 || x > LW + 10) return;
    G.rect(x - 1, 104, 3, 78, 0); G.rect(x, 105, 1, 76, 3); G.rect(x - 5, 90, 11, 22, 0); G.rect(x - 4, 91, 9, 20, 1);
    const green = tf >= 39.22; G.ellipse(x, 96, 2.6, 2.6, green ? 2 : 31, null); G.ellipse(x, 105, 2.6, 2.6, green ? 37 : 2, null);
  }
  function drawRestaurant(G, tf, cam) {   // 还亮着的小饭馆：玻璃里一对情侣面对面吃饭（剪影），两碗饭
    const x0 = REST[0] - cam, x1 = REST[1] - cam; if (x1 < -4 || x0 > LW + 4) return;
    G.rect(x0 - 2, 116, x1 - x0 + 4, 64, 0);
    for (let y = 120; y < 177; y++) for (let x = x0; x < x1; x++) G.px(x, y, G.dith([25, 23, 24], 0.7 + (y - 120) / 70, x, y));
    G.rect(x0 - 4, 112, x1 - x0 + 8, 5, 31); for (let x = x0 - 2; x < x1 + 4; x += 6) G.rect(x, 113, 3, 3, 29);
    const cx = Math.round((x0 + x1) / 2), nod = Math.floor(tf * 3) % 2, nod2 = Math.floor(tf * 3 + 1) % 2;
    G.rect(cx - 13, 158, 26, 3, 14); G.rect(cx - 11, 161, 2, 15, 14); G.rect(cx + 9, 161, 2, 15, 14);
    G.ellipse(cx - 5, 156, 3, 1.6, 8, 0); G.ellipse(cx + 5, 156, 3, 1.6, 8, 0); G.line(cx - 8, 153, cx - 3, 155, 14); G.line(cx + 3, 155, cx + 8, 153, 14);
    G.ellipse(cx - 20, 137 + nod, 4.5, 5, 14, null); G.poly([[cx - 26, 145], [cx - 15, 145], [cx - 13, 170], [cx - 27, 170]], 14, null);   // 男的
    G.ellipse(cx + 20, 137 + nod2, 4.5, 5, 14, null); G.rect(cx + 15, 136 + nod2, 10, 13, 14); G.poly([[cx + 14, 146], [cx + 25, 146], [cx + 27, 170], [cx + 13, 170]], 14, null);   // 女的，长头发
    G.rect(x0, 146, x1 - x0, 1, 14);
  }
  function drawBusStop(G, tf, cam) {   // 公交站：灯箱海报是一片黄昏的海
    const x0 = BUS[0] - cam, x1 = BUS[1] - cam; if (x1 < -4 || x0 > LW + 4) return;
    G.rect(x0 - 3, 116, x1 - x0 + 6, 4, 0); G.rect(x0 - 2, 117, x1 - x0 + 4, 2, 3); G.rect(x0, 120, 2, 62, 0); G.rect(x1 - 2, 120, 2, 62, 0);
    const lx0 = x0 + 8, lx1 = x1 - 8, ly0 = 126, ly1 = 170, flick = (tf >= 46.25 && tf < 46.34) || (tf >= 46.5 && tf < 46.59);
    G.rect(lx0 - 2, ly0 - 2, lx1 - lx0 + 4, ly1 - ly0 + 4, 0);
    for (let y = ly0; y < ly1; y++) for (let x = lx0; x < lx1; x++) {
      const v = (y - ly0) / (ly1 - ly0);
      let c = flick ? 2 : v < 0.56 ? G.dith([3, 12, 31], 0.2 + v * 3.6, x, y) : G.dith([27, 4, 2], (v - 0.56) * 4.5, x, y);
      if (!flick && v >= 0.56 && Math.abs(x - (lx0 + lx1) / 2) < 6 - (v - 0.56) * 8 && (y % 3 === 0)) c = 7;
      G.px(x, y, c);
    }
    if (!flick) { G.ellipse((lx0 + lx1) / 2, ly0 + 21, 5, 4, 7, null); for (let x = lx0; x < lx1; x += 4) G.px(x + ((x >> 2) & 1), ly0 + 30, 7); }
    G.rect(x0 + 6, 168, x1 - x0 - 12, 3, 14);
  }
  function streetO(G, tf, cam) {   // 冷色的空街 + 他；返回他的参数
    const L0 = streetLight(cam, 0.75), light = (x, y) => 0.3 + L0(x, y) * 0.9;
    drawStreet(G, tf, cam, { warm: 0.75, rain: 0.9, tf });
    drawSignal(G, tf, cam); drawRestaurant(G, tf, cam); drawBusStop(G, tf, cam);
    const o = himO(tf, cam, light); CHAR.draw(G, o);
    // 第 1 句：兜里的手机每一声震一下，他没掏出来
    if ([17.73, 18.77, 19.80, 20.83, 21.86].some((b) => tf >= b && tf < b + 0.25)) { const h = CHAR.handAt(o); for (const dx of [-5, 5]) for (let k = 0; k < 4; k++) G.px(h.x + dx + (k % 2 ? 1 : 0) * Math.sign(dx), h.y - 4 + k, 8); }
    // 第 3 句：雨水顺着刘海往下滴
    if (tf >= 26.4 && tf < 31) { const H = CHAR.headAt(o), fx = H.x + H.r * 0.7; for (let i = 0; i < 2; i++) { const k = (tf * 2.2 + i * 0.5) % 1; G.px(Math.round(fx + i * 2), Math.round(H.y + H.r * 0.2 + k * 22), 26); } }
    return o;
  }
  function shotWalk(dst, tf) {   // A2–A4：空街往右卷；路口停下低头，积水倒影里她站在他旁边
    ST = openST(tf);
    const cam = camO(tf), tilt = Math.round(60 * (smooth(seg(tf, 30.0, 30.9)) - smooth(seg(tf, 40.0, 40.9))));
    T1.fill(0); streetO(T1, tf, cam); cold(T1);
    T2.fill(255);
    const herOn = tf >= 34.57 && blinkIn(tf, 34.57) && (tf < 39.22 || blinkOut(tf, 39.22));
    if (herOn) CHAR.draw(T2, { who: 'her', x: 527 - cam, y: 194, size: 50, facing: 'right', t: tf, light: () => 0.55, expression: 'sad', action: 'idle' });
    const amp = 0.6 + 2.6 * clamp(1 - Math.abs(tf - 39.6) / 0.8);   // 他一迈步，水面一晃
    for (let y = 0; y < LH; y++) { const w = y + tilt;
      for (let x = 0; x < LW; x++) { const i = y * LW + x;
        if (w < WS) { dst.B[i] = T1.get(x, w); continue; }
        const xw = x + cam, d = w - WS, inP = d < 80 && Math.abs(xw - PUDDLE_X) < 92 - d * 0.5 + 6 * Math.sin(w * 0.7 + xw * 0.05);
        if (!inP) { dst.B[i] = w < LH ? T1.get(x, w) : (PIX.bt(x, w) < 0.3 ? 2 : 1); continue; }
        if (d === 0) { dst.B[i] = 6; continue; }
        const rx = Math.round(x + Math.sin(w * 0.9 + tf * 7) * amp), ry = 2 * WS - w, hc = T2.get(rx, ry);
        dst.B[i] = ok(hc) ? SEPIA[hc] : DIM[Math.max(0, T1.get(rx, ry))];
        if ((w + Math.floor(tf * 6)) % 7 === 0 && PIX.bt(x, w) < 0.25) dst.B[i] = 5;
      } }
    rainO(dst, tf, 0.9);
    ST = ST0;
  }
  // A1 前奏：从楼顶的夜空往下卷到街面
  const TOWERS = [[-6, 40, 112], [40, 84, 150], [92, 128, 88], [136, 178, 132], [186, 228, 104], [236, 280, 160], [288, 330, 120]];
  function shotA1(dst, tf) {
    const camY = Math.round(300 * smooth(seg(tf, 0.4, 12.3)));
    if (camY >= 300) return shotWalk(dst, tf);
    ST = openST(tf); T1.fill(0); streetO(T1, tf, 0); cold(T1); ST = ST0;
    const nb = BARS.filter((b) => b <= tf && b < 16.7).length;
    for (let y = 0; y < LH; y++) { const w = y + camY;
      for (let x = 0; x < LW; x++) { const i = y * LW + x;
        if (w >= 300) { dst.B[i] = T1.get(x, w - 300); continue; }
        let c = dst.dith([1, 2, 3], 0.2 + (1 - w / 300) * 1.5, x, w);
        const mx = x - 238, my = w - 56; if (mx * mx + my * my < 170) c = (mx + 4) * (mx + 4) + (my - 3) * (my - 3) < 12 ? 6 : 7;   // 月亮
        for (let k = 0; k < TOWERS.length; k++) { const [a, b, top] = TOWERS[k]; if (x >= a && x < b && w >= top) {
          c = 1; const cx = x - a, cy = w - top, cell = k + ':' + Math.floor(cx / 5) + ':' + Math.floor(cy / 6);
          if (cx % 5 >= 1 && cx % 5 <= 2 && cy % 6 >= 2 && cy % 6 <= 3 && cx > 2 && cx < b - a - 3 && rnd('tw' + cell) < 0.4 && !(rnd('to' + cell) < nb * 0.13)) c = 23;   // 每个小节第一拍灭几扇窗
          if (cy === 0) c = 0; } }
        dst.B[i] = c;
      } }
    for (let i = 0; i < 3; i++) { const cx = Math.round(((tf * 5 + i * 140) % 460) - 70), cy = 40 + i * 26 - camY * 0; for (let y = cy - 5; y < cy + 6; y++) for (let x = cx - 40; x < cx + 40; x++) { const yy = y - camY; if (yy >= 0 && yy < LH && ((x - cx) / 40) ** 2 + ((y - cy) / 5) ** 2 < 1 && PIX.bt(x, y) < 0.7) dst.px(x, yy, 2); } }   // 云从月亮前飘过
    { const nx = 140, ny = 132 - camY; if (Math.floor(tf * 3) % 7 !== 0) { dst.rect(nx, ny, 22, 7, 0); dst.rect(nx + 1, ny + 1, 20, 5, 31); for (let k = 0; k < 4; k++) dst.rect(nx + 3 + k * 5, ny + 2, 3, 3, 8); } }   // 楼顶霓虹（只有色块）
    { const wx = 248, wy = 160 - camY; dst.rect(wx, wy - 14, 16, 10, 0); dst.rect(wx + 1, wy - 13, 14, 8, 2); dst.rect(wx + 2, wy - 4, 1, 4, 0); dst.rect(wx + 13, wy - 4, 1, 4, 0); dst.line(60, 150 - camY, 60, 128 - camY, 0); }   // 水箱、天线
    rainO(dst, tf, 0.9);
  }
  // A5：楼道，一层一层往上爬，声控灯跟着亮
  const FD = 1.927, SPA = [[55.73, 56.3], [64.0, 999]], LANDS = 7;
  const Lx = (j) => (j % 2 === 0 ? 92 : 210), Ly = (j) => -j * 52;
  function stairP(t) { let w = Math.max(0, t - 49.95); for (const [a, b] of SPA) w -= clamp(Math.min(t, b) - Math.max(49.95, a), 0, 999); return Math.min(LANDS, w / FD); }
  function feet(p) { const k = Math.min(LANDS - 1, Math.floor(p)), u = p - k; return [lerp(Lx(k), Lx(k + 1), u), lerp(Ly(k), Ly(k + 1), u), k]; }
  function shotStairs(dst, tf) {
    const p = stairP(tf), [fx0, fy, k] = feet(p), atDoor = p >= LANDS - 1e-3;
    const enter = smooth(seg(tf, 65.55, 66.2)), fx = atDoor ? lerp(Lx(LANDS), 240, enter) : fx0;
    const camY = Math.round(fy - 172);
    const pb = stairP(beatFloor(tf));
    const bulbs = []; for (let j = 0; j <= LANDS; j++) if ((pb >= j - 0.5 && pb <= j + 1.3) || (j === LANDS && pb >= LANDS - 0.5)) bulbs.push([Lx(j) + (j % 2 ? 22 : -22), Ly(j) - 62]);
    const Lt = (x, w) => { let v = 0; for (const [bx, by] of bulbs) v = Math.max(v, clamp(1 - Math.hypot(x - bx, w - by) / 80)); return v; };
    for (let y = 0; y < LH; y++) { const w = y + camY; for (let x = 0; x < LW; x++) dst.B[y * LW + x] = dst.dith([9, 10, 11], 0.15 + Lt(x, w) * 2.6, x, w); }
    for (let j = 1; j < LANDS + 2; j += 2) { const wy = Ly(j) + 26 - camY; if (wy > -30 && wy < LH) { dst.rect(144, wy - 22, 22, 18, 0); dst.rect(145, wy - 21, 20, 16, 1); dst.rect(154, wy - 21, 1, 16, 0); } }   // 楼道小窗
    for (let j = 0; j <= LANDS; j++) {   // 平台、门、灯
      const y = Ly(j) - camY; if (y < -80 || y > LH + 10) continue;
      const a = j % 2 ? 196 : 26, b = j % 2 ? 290 : 106;
      dst.rect(a, y, b - a, 6, 14); dst.rect(a, y, b - a, 1, 15); dst.rect(a, y + 6, b - a, 1, 0);
      if (j % 2) {   // 右边平台上是住户的门
        const d0 = 228, d1 = 254, dy0 = y - 46, own = j === LANDS, nb = j === 5;
        dst.rect(d0 - 2, dy0 - 2, d1 - d0 + 4, 48, 0);
        const open = own ? smooth(seg(tf, 65.25, 65.6)) : 0, leaf = Math.round((d1 - d0) * (1 - open));
        for (let yy = dy0; yy < y; yy++) for (let xx = d0; xx < d1; xx++) dst.px(xx, yy, xx - d0 < (d1 - d0) - leaf ? 0 : dst.dith([13, 14, 15], 0.5 + Lt(xx, yy + camY) * 1.8, xx, yy));
        if (leaf > 4) dst.px(d0 + 4, dy0 + 24, 23);
        if (nb) { for (let yy = dy0; yy < y; yy++) dst.px(d1 - 1, yy, 25); for (let i = 0; i < 3; i++) { const u = ((tf - 59.9) * 1.4 + i / 3) % 1; if (tf > 59.9 && tf < 62.5) dst.px(d1 + 2 + i * 3, Math.round(dy0 + 18 - u * 14), 23); } }   // 邻居家门缝里的暖光和笑声
        dst.rect(d0 + 9, dy0 - 7, 8, 4, 2);   // 门牌（色块）
      }
      const [bx, by] = [Lx(j) + (j % 2 ? 22 : -22), Ly(j) - 62 - camY], on = bulbs.some(([xx, yy]) => xx === bx && yy === by + camY);
      dst.rect(bx - 3, by - 2, 7, 2, 0); dst.ellipse(bx, by + 1, 2, 1.5, on ? 24 : 3, null);
    }
    for (let j = 0; j < LANDS; j++) {   // 楼梯：一级一级
      const ya = Ly(j) - camY; if (ya < -70 || ya > LH + 60) continue;
      for (let i = 0; i < 10; i++) { const u0 = i / 10, x = Math.round(lerp(Lx(j), Lx(j + 1), u0)), yy = Math.round(lerp(Ly(j), Ly(j + 1), (i + 1) / 10)) - camY, xs = j % 2 ? x - 12 : x;
        dst.rect(xs, yy, 12, 6, 14); dst.rect(xs, yy, 12, 1, 15); }
    }
    const moving = !atDoor && !SPA.some(([a, b]) => tf >= a && tf < b) && tf > 49.95;
    const facing = moving ? (k % 2 === 0 ? 'right' : 'left') : (Math.ceil(p - 1e-3) - 1) % 2 === 0 ? 'right' : 'left';
    const o = { who: 'him', x: Math.round(fx), y: Math.round(fy) - camY, size: 54, facing: atDoor ? 'right' : facing, t: tf, light: (x, y) => 0.3 + Lt(x, y + camY) * 0.8, expression: 'sad', action: moving || (atDoor && enter > 0 && enter < 1) ? 'walk' : 'idle' };
    if (tf >= 55.73 && tf < 56.3) Object.assign(o, { action: 'pat', u: smooth(seg(tf, 55.73, 55.85)) });   // 楼梯拐角停一下，手按在胸口
    if (tf >= 64.3 && tf < 65.2) Object.assign(o, { arms: 'reach', armsU: smooth(seg(tf, 64.3, 64.5)) });   // 掏钥匙开门，停了一下
    if (tf < 66.05) CHAR.draw(dst, o);
    for (let j = 0; j < LANDS; j++) { const ya = Ly(j) - camY - 20, yb = Ly(j + 1) - camY - 20; if (Math.max(ya, yb) < -10 || Math.min(ya, yb) > LH) continue; dst.line(Lx(j), ya, Lx(j + 1), yb, 0); for (let i = 0; i <= 5; i++) { const x = Math.round(lerp(Lx(j), Lx(j + 1), i / 5)), y = Math.round(lerp(ya, yb, i / 5)); dst.line(x, y, x, y + 18, 0); } }   // 栏杆在他前面
    cold(dst);
  }
  function openRoom(dst, tf) {   // 66.36：屋里是黑的，他坐下，吊灯啪地亮了
    const st = { s: tf, tf, I: tf < 66.45 ? 0.08 : 0.5, rain: 0.45, sway: 0 };
    drawRoom(dst, 0, st);
    CHAR.draw(dst, { who: 'him', ...HIM_SEAT, facing: 'left', action: 'sitHunch', u: 0.9, t: tf, light: roomLight(st.I), expression: 'sad', hold: CHAR.PROPS.phone });
    drawTableTop(dst, 0, st); drawLamp(dst, 0, st); cold(dst);
  }
  function pushUp(dst, A, B, u) { const o = Math.round(LH * smooth(u)); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) dst.B[y * LW + x] = y >= o ? A.B[(y - o) * LW + x] : B.B[(y - o + LH) * LW + x]; }

  // ============================== 结尾：一句一个画面，一夜过去 ==============================
  function roomE(dst, tf, himOpt = {}, opt = {}) {
    const cam = opt.cam || 0, st = Object.assign({ s: tf, tf, I: 0.5, rain: 0.6, sway: 0 }, opt);
    drawRoom(dst, cam, st);
    if (opt.wall) opt.wall(dst, cam);
    const lightR = roomLight(st.I), o = Object.assign({ who: 'him', ...HIM_SEAT, x: HIM_SEAT.x - cam, facing: 'left', action: 'sitHunch', u: 0.6, t: tf, light: (x, y) => lightR(x + cam, y), expression: 'sad' }, himOpt);
    CHAR.draw(dst, o);
    drawTableTop(dst, cam, st);
    if (opt.table) opt.table(dst, cam);
    drawLamp(dst, cam, st);
    cold(dst);
    return o;
  }
  function choiceBox(dst, tf) {   // B1 第 23 句：头上一个选项框，光标在两个选项之间来回跳
    const o = roomE(dst, tf, { u: 0.55 }), H = CHAR.headAt(o), pop = tf - 117.75 < 1 / 12 ? 0.6 : 1;
    const w = Math.round(78 * pop), h = Math.round(30 * pop), x0 = Math.round(H.x - w / 2 - 6), y0 = Math.round(H.y - H.r - h - 14);
    dst.rect(x0 - 1, y0 - 1, w + 2, h + 2, 0); dst.rect(x0, y0, w, h, 7); dst.rect(x0 + 2, y0 + 2, w - 4, h - 4, 1);
    if (pop < 1) return;
    const k = beatIdx(tf) % 2;
    dst.rect(x0 + 16, y0 + 8, 44, 3, k === 0 ? 8 : 5); dst.rect(x0 + 16, y0 + 19, 32, 3, k === 1 ? 8 : 5);
    const ay = y0 + (k === 0 ? 7 : 18); for (let j = 0; j < 5; j++) for (let i = 0; i <= 2 - Math.abs(j - 2); i++) dst.px(x0 + 7 + i, ay + j, 23);
  }
  function noteShot(dst, tf) {   // B2 第 24 句：门边挂着那把伞，旁边一张便利贴，他伸手按平
    const cam = 160, base = { x: 300 - cam, y: 204, size: 90, seat: undefined, facing: 'right', action: 'reach', expression: 'sad' };
    const h1 = CHAR.handAt(Object.assign({ who: 'him', t: tf, u: 1 }, base));
    const nx = h1.x - 1, ny = h1.y - 8;
    roomE(dst, tf, Object.assign({}, base, { u: smooth(seg(tf, 120.15, 120.6)) }), { cam, wall: (d) => {
      d.rect(nx, ny, 10, 10, 0); d.rect(nx + 1, ny + 1, 8, 8, 23); for (let k = 0; k < 3; k++) d.rect(nx + 2, ny + 3 + k * 2, 6 - (k === 2 ? 2 : 0), 1, 25);   // 便利贴（色块字）
      const ux = nx + 22; d.rect(ux - 1, ny - 4, 3, 2, 0); d.line(ux, ny - 2, ux, ny + 34, 0);   // 挂钩、伞柄
      d.poly([[ux - 4, ny + 4], [ux + 4, ny + 4], [ux + 2, ny + 30], [ux - 2, ny + 30]], (x, y) => d.dith([1, 2, 3], 1 + (x - ux) / 6, x, y), 0);   // 收起来的伞
      d.line(ux - 3, ny + 34, ux, ny + 37, 0);
      for (let i = 0; i < 2; i++) { const k = (tf * 1.8 + i * 0.5) % 1; d.px(ux + i, Math.round(ny + 38 + k * 20), 26); }   // 还在滴水
    } });
  }
  function trophyShot(dst, tf) {   // B3 第 25 句：成就达成的奖杯，彩纸落在她那碗没动的饭旁边
    const o = roomE(dst, tf, { u: 0.5 }), H = CHAR.headAt(o), t0 = 121.97;
    for (let i = 0; i < 46; i++) {
      const t = tf - 121.6 - rnd('cft' + i) * 0.8; if (t < 0) continue;
      const x = Math.round(70 + rnd('cfx' + i) * 200 + Math.sin(t * 5 + i) * 3), stop = x > 93 && x < 229 ? TABLE_Y - 1 : 196, y = Math.min(stop, Math.round(-6 + t * 70));
      const c = [31, 37, 23, 26, 28][i % 5]; dst.px(x, y, c); if (y < stop) dst.px(x + (Math.floor(t * 8) % 2), y + 1, c);
    }
    if (tf < t0) return;
    const pop = tf - t0 < 1 / 12 ? 2 : 0, x = Math.round(H.x - 4), y = Math.round(H.y - H.r - 22) - pop;
    dst.poly([[x - 6, y], [x + 7, y], [x + 5, y + 7], [x + 2, y + 9], [x - 1, y + 9], [x - 4, y + 7]], (xx, yy) => dst.dith([25, 23, 24], 1.2 - (xx - x) / 8, xx, yy), 0);
    dst.px(x - 8, y + 2, 0); dst.px(x - 8, y + 3, 0); dst.px(x - 7, y + 4, 0); dst.px(x + 9, y + 2, 0); dst.px(x + 9, y + 3, 0); dst.px(x + 8, y + 4, 0);
    dst.rect(x, y + 10, 2, 3, 25); dst.rect(x - 3, y + 13, 8, 2, 25); dst.px(x - 3, y + 2, 24);
    if (tf - t0 < 0.6) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = 8 + (tf - t0) * 40; dst.px(Math.round(x + 1 + Math.cos(a) * r), Math.round(y + 6 + Math.sin(a) * r), k % 2 ? 24 : 8); }
  }
  function windowShot(dst, tf) {   // B4 第 26 句：窗玻璃上他的倒影，一格一格错位、花掉
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) dst.B[y * LW + x] = dst.dith([1, 2, 3], 0.2 + y / 200, x, y);
    for (let i = 0; i < 9; i++) { const bx = i * 38 - 6, top = 70 + Math.floor(rnd('wbt' + i) * 70); dst.rect(bx, top, 30, LH - top, 1);
      for (let y = top + 4; y < LH; y += 7) for (let x = bx + 3; x < bx + 27; x += 6) if (rnd('wbw' + i + ':' + x + ':' + y) < 0.25) dst.rect(x, y, 2, 3, 23); }
    T1.fill(255); CHAR.drawHead(T1, { who: 'him', x: 160, y: 108, r: 52, facing: 'front', expression: 'sad', t: tf, light: () => 0.45 });
    const glitch = tf < 125.5, bi = beatIdx(tf);
    for (let y = 0; y < LH; y++) { const band = Math.floor(y / 6), sh = glitch && rnd('gl' + bi + ':' + band) < 0.4 ? Math.round((rnd('gs' + bi + ':' + band) - 0.5) * 22) : 0;
      for (let x = 0; x < LW; x++) { const c = T1.get(x - sh, y); if (ok(c) && PIX.bt(x, y) < 0.88) dst.B[y * LW + x] = glitch && sh !== 0 && (x + y) % 23 === 0 ? 26 : DIM2[c]; } }
    for (let i = 0; i < 26; i++) { const x = Math.floor(rnd('gd' + i) * LW), y0 = Math.floor(rnd('gdy' + i) * 200) + ((tf * (10 + i)) % 30); for (let k = 0; k < 4; k++) dst.px(x, Math.round(y0 + k), 6); }   // 玻璃上的雨水
    rainO(dst, tf, 0.5);
    const fr = (x, y) => dst.dith([13, 14, 15], 0.8 + (y / 240), x, y);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (x < 12 || x >= LW - 12 || y < 12 || Math.abs(x - 160) < 3 || Math.abs(y - 116) < 3) dst.B[y * LW + x] = fr(x, y);
    cold(dst);
  }
  function photoZoom(dst, tf) {   // B5 第 27 句：墙上那张海边的照片，近景
    roomE(T2, tf, { u: 0.4 });
    zoomCopy(dst, T2, WP[0] + 16, WP[1] + 12, 7);
  }
  function gameOver(dst, tf) {   // B6 第 28 句：最后一颗心碎掉，画面变灰；按下继续，心回来一颗，他抬起头
    const u = tf < 129.7 ? smooth(seg(tf, 128.2, 128.55)) : 1 - smooth(seg(tf, 129.7, 130.05));
    roomE(dst, tf, { action: 'sitSlump', u });
  }
  function shoeShot(dst, tf) {   // B7 第 29 句：楼下关了门的鞋店，橱窗里亮着一双球鞋；镜头往下，他脚上还是紫拖鞋
    if (tf < 131.27) {
      const cam = 880; ST = openST(0); ST.off = () => false;
      drawStreet(dst, tf, cam, { warm: 0.6, rain: 0.5, tf });
      const x0 = 940 - cam, x1 = 1010 - cam, cx = (x0 + x1) / 2; dst.rect(x0 - 2, 114, x1 - x0 + 4, 66, 0);
      for (let y = 116; y < 178; y++) for (let x = x0; x < x1; x++) dst.px(x, y, dst.dith([3, 5, 6, 7], 0.4 + clamp(1 - Math.abs(x - cx) / (8 + (y - 116) * 0.5)) * 3, x, y));   // 射灯
      dst.rect(cx - 14, 162, 28, 16, 3); dst.rect(cx - 14, 162, 28, 1, 5);
      for (const sx of [-9, 3]) { dst.poly([[cx + sx, 160], [cx + sx + 8, 160], [cx + sx + 8, 157], [cx + sx + 4, 154], [cx + sx + 1, 154]], 8, 0); dst.line(cx + sx + 1, 158, cx + sx + 7, 158, 31); }
      dst.rect(cx + 8, 168, 7, 5, 8); dst.rect(cx + 9, 170, 5, 1, 0);   // 价签（色块）
      CHAR.draw(dst, { who: 'him', x: Math.round(cx) - 4, y: 194, size: 54, facing: 'back', t: tf, light: () => 0.45, expression: 'sad', action: 'idle' });
      rainO(dst, tf, 0.5); ST = ST0; cold(dst); return;
    }
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) dst.B[y * LW + x] = y < 150 ? dst.dith([3, 4, 5, 6], 0.6 + clamp(1 - Math.abs(x - 160) / 140) * 2 - y / 160, x, y) : dst.dith([3, 4, 5], 0.6 + (y - 150) / 60, x, y);
    for (let x = 0; x < LW; x++) dst.px(x, 150, 0);
    const wig = Math.floor(tf * 4) % 2;
    CHAR.draw(dst, { who: 'him', x: 160, y: 176, size: 330, facing: 'front', t: tf, light: () => 0.5, action: 'idle' });
    for (const fx of [141, 179]) {   // 一双紫拖鞋，露着脚趾；脚趾在拍子上动一下
      dst.ellipse(fx, 186, 12, 6, (x, y) => dst.dith(RAMP.skin, 0.9 - (y - 182) / 10, x, y), 0);
      for (let k = -2; k <= 2; k++) dst.ellipse(fx + k * 4, 190 - (wig && k !== 0 ? 1 : 0), 1.8, 1.8, 22, 0);
      dst.rect(fx - 12, 182, 25, 6, 0); dst.rect(fx - 11, 183, 23, 4, 12); dst.rect(fx - 11, 183, 23, 1, 9);   // 拖鞋带
      dst.rect(fx - 14, 193, 29, 3, 0); dst.rect(fx - 13, 193, 27, 2, 12);                                    // 鞋底
    }
    for (let i = 0; i < 10; i++) { const x = Math.floor(rnd('fsp' + i + ':' + Math.floor(tf * 8)) * LW), y = 196 + Math.floor(rnd('fspy' + i + ':' + Math.floor(tf * 8)) * 10); dst.px(x, y, 7); dst.px(x - 1, y - 1, 6); dst.px(x + 1, y - 1, 6); }
    rainO(dst, tf, 0.4); cold(dst);
  }
  const PILL = { draw(G, h) { G.rect(h.x - 1, h.y - 2, 3, 2, 0); G.rect(h.x, h.y - 2, 1, 1, 8); } };
  const CUP = { draw(G, h) { G.rect(h.x - 3, h.y - 6, 6, 7, 0); G.rect(h.x - 2, h.y - 5, 4, 5, 6); G.rect(h.x - 2, h.y - 5, 4, 1, 26); } };
  function pillShot(dst, tf) {   // B8 第 30–31 句：淋了一夜雨，抠出一粒药，就着水吞下，咳两声
    let h = { action: 'sitHold', u: 1, hold: PILL };
    if (tf >= 133.2 && tf < 134.02) h = { action: 'sit', arms: 'shoot', armsU: 0.8 * smooth(seg(tf, 133.2, 133.55)), hold: PILL };
    else if (tf >= 134.02 && tf < 135.4) h = { action: 'sit', arms: 'shoot', armsU: 0.8 * smooth(seg(tf, 134.1, 134.45)) * (1 - smooth(seg(tf, 135.0, 135.35))), hold: CUP };
    else if (tf >= 135.4) { const cough = [135.6, 136.12, 136.64].find((b) => tf >= b && tf < b + 0.3); h = { action: 'sitHunch', u: cough ? 0.95 : 0.7, y: HIM_SEAT.y + (cough ? 1 : 0), cough }; }
    const o = roomE(dst, tf, h, { table: (d, cam) => { const bx = 214 - cam, by = TABLE_Y - 7; d.rect(bx, by, 13, 7, 0); d.rect(bx + 1, by + 1, 11, 5, 7); d.rect(bx + 1, by + 3, 11, 1, 31); d.rect(bx + 5, by + 1, 2, 2, 31);   // 一盒药
      if (tf >= 135.0) { d.rect(bx - 8, by + 1, 5, 6, 0); d.rect(bx - 7, by + 2, 3, 4, 6); } } });
    if (h.cough) { const H = CHAR.headAt(o), u = (tf - h.cough) / 0.3; for (let k = 0; k < 3; k++) dst.px(Math.round(H.x - H.r - 2 - u * (5 + k * 3)), Math.round(H.y + H.r * 0.4 + k - u * 3), 7); }
  }
  let MINI = null;
  function miniPhotos() {   // 三句承诺的那三下（拍胸口、撑伞、换到马路那边），从中段那三个画面直接缩小
    if (MINI) return MINI;
    const keep = ST; ST = ST0;
    MINI = [84.95, 88.6, 93.55].map((t) => {
      const tmp = PIX.create(LW, LH); shotStreet(tmp, t);
      const out = new Uint8Array(30 * 20), X0 = 52, Y0 = 108;
      for (let j = 0; j < 20; j++) for (let i = 0; i < 30; i++) { let r = 0, g = 0, b = 0, n = 0;
        for (let y = Y0 + j * 5; y < Y0 + j * 5 + 5; y++) for (let x = X0 + i * 5; x < X0 + i * 5 + 5; x++) { const c = PIX.RGB[tmp.get(x, y)] || [0, 0, 0]; r += c[0]; g += c[1]; b += c[2]; n++; }
        r /= n; g /= n; b /= n; let best = 0, bd = 1e9; for (let k = 0; k < 32; k++) { const c = PIX.RGB[k], d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = k; } }
        out[j * 30 + i] = SEPIA[best]; }
      return out;
    });
    ST = keep; return MINI;
  }
  function wallShot(dst, tf) {   // B9 第 32 句：拍立得旁边，三张小照片一张张钉上去，最后一起褪成灰白
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) dst.B[y * LW + x] = dst.dith(RAMP.wall, 0.4 + clamp(1 - Math.hypot(x - 60, y - 10) / 260) * 1.6, x, y);
    cold(dst);
    const P = wallPhotoPixels(), X = 24, Y = 44;   // 原来那张海边的照片，放大 3 倍
    dst.rect(X - 1, Y - 1, 98, 74, 0); for (let y = 0; y < 72; y++) for (let x = 0; x < 96; x++) dst.px(X + x, Y + y, dst.dith([7, 29, 8], 1.2, X + x, Y + y));
    for (let j = 0; j < 20; j++) for (let i = 0; i < 30; i++) dst.rect(X + 3 + i * 3, Y + 3 + j * 3, 3, 3, P[j * 30 + i]);
    dst.rect(X + 36, Y - 4, 24, 7, 29);
    const M = miniPhotos(), POS = [[140, 34], [214, 50], [166, 110]], T = [137.72, 138.74, 139.76], gr = smooth(seg(tf, 140.83, 141.3));
    M.forEach((m, k) => {
      if (tf < T[k]) return; const drop = tf - T[k] < 1 / 12 ? -5 : 0, [px, py0] = POS[k], py = py0 + drop;
      const put = (x, y, c) => dst.px(x, y, PIX.bt(x, y) < gr ? GRAYM[c] : c);
      dst.rect(px - 1, py - 1, 66, 50, 0); for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) put(px + x, py + y, 29);
      for (let j = 0; j < 20; j++) for (let i = 0; i < 30; i++) for (let b = 0; b < 4; b++) put(px + 2 + i * 2 + (b & 1), py + 2 + j * 2 + (b >> 1), m[j * 30 + i]);
      dst.rect(px + 30, py - 2, 3, 3, 0); dst.rect(px + 31, py - 1, 1, 1, 31); dst.px(px + 31, py - 2, 31);   // 图钉
    });
  }
  function nightShot(dst, tf) {   // B10–B11 尾奏：一夜过去。他趴在桌上睡着，钟越转越快，雨停了，天亮了，吊灯灭掉
    roomE(dst, tf, { action: 'sitSlump', u: 1, blink: true }, { I: tf < 153.25 ? 0.5 : 0.15, rain: 0.6 * (1 - smooth(seg(tf, 141.3, 150))), dawn: smooth(seg(tf, 144, 156.5)) });
  }

  // ============================== 分发、血条、UI、后期 ==============================
  function frame(G, s) {
    const tf = q(s);
    if (tf < 12.3) shotA1(G, tf);
    else if (tf < 49.31) shotWalk(G, tf);
    else if (tf < 49.81) { shotWalk(P1, tf); shotStairs(P2, 49.81); pushUp(G, P1, P2, seg(tf, 49.31, 49.81)); }
    else if (tf < 66.36) shotStairs(G, tf);
    else if (tf < 66.87) openRoom(G, tf);
    else if (tf < 119.81) choiceBox(G, tf);
    else if (tf < 121.59) noteShot(G, tf);
    else if (tf < 123.47) trophyShot(G, tf);
    else if (tf < 126.08) windowShot(G, tf);
    else if (tf < 128.14) photoZoom(G, tf);
    else if (tf < 130.21) gameOver(G, tf);
    else if (tf < 132.27) shoeShot(G, tf);
    else if (tf < 137.34) pillShot(G, tf);
    else if (tf < 141.34) wallShot(G, tf);
    else nightShot(G, tf);
  }
  const hearts = (s) => (s >= 128.41 && s < 129.7 ? 0 : 1);
  function flash(s) { if (s >= 128.25 && s < 128.41) return 0; if (s >= 129.7 && s < 129.95) return 0; return -1; }
  function ui(GU, s) {
    const tf = q(s);
    if (tf >= 128.41 && tf < 129.3) {   // 心碎成两半往下掉
      const u = (tf - 128.41) / 0.9, HEART = ['.kk.kk.', 'kxxkxxk', 'kxxxxxk', '.kxxxk.', '..kxk..', '...k...'];
      HEART.forEach((row, j) => [...row].forEach((ch, k) => { if (ch === '.') return; const left = k < 3 || (k === 3 && j % 2 === 0), dx = Math.round((left ? -1 : 1) * u * 6), dy = Math.round(u * u * 26);
        GU.px(8 + k + dx, 8 + j + dy, ch === 'k' ? 0 : 31); }));
    }
    if (tf >= 128.75 && tf < 129.7 && Math.floor((tf - 128.75) * 3.2) % 2 === 0) {   // 继续 ▶（只有图形，不写字）
      const cx = 160, cy = 100; GU.rect(cx - 14, cy - 10, 28, 20, 0); GU.rect(cx - 13, cy - 9, 26, 18, 7);
      for (let j = -6; j <= 6; j++) for (let i = 0; i <= 10 - Math.abs(j) * 1.6; i++) GU.px(cx - 4 + i, cy + j, 31);
    }
  }
  const gray = (tf) => (tf >= 128.41 && tf < 129.7 ? 1 : 0);
  const fade = (tf) => smooth(seg(tf, 156.8, 157.9));
  function clock(tf) {   // 141.34 之后：钟从快 3 点越转越快，到 153.25 灯灭时是 5:50，之后照常走
    const base = 2 * 3600 + 47 * 60 + 20 + (tf - 66.87), target = 5 * 3600 + 50 * 60 - (2 * 3600 + 47 * 60 + 20 + (153.25 - 66.87));
    return base + target * Math.pow(seg(tf, 141.34, 153.25), 2.2);
  }
  window.BOOK = { frame, hearts, flash, ui, gray, fade, clock };
})();
