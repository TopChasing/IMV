/* 出租屋 v6：一张固定的平面图，所有房间镜头都从这里取景（世界宽 500，画面宽 320）。
   从左到右：[窗 + 书桌（麦克风、电脑、歌词本、台灯）] [书桌椅] [床（床头靠右，枕头）+ 墙上拍立得]
             [吊灯 + 小餐桌、两张凳] [钟] [门]
   取景：录歌 cam 0；吃饭 cam 120；门口 cam 180。
   依赖全局：PIX、RAMP、clamp、lerp、rnd、LW、LH、CHAR。 */
window.ROOM6 = (() => {
  const W = 500, FLOOR = 172, TABLE_Y = 158;
  const WIN = [24, 40, 84, 98];                 // 窗：x0 y0 x1 y1
  const DESK = { x0: 4, x1: 80, top: 148 };
  const CHAIR = { x0: 92, x1: 116 };
  const BED = { x0: 128, x1: 220, top: 176 };
  const WP = [158, 90];                         // 墙上拍立得左上角（外框 32×24）
  const LAMP = [300, 47];
  const TABLE = [262, 338];
  const STOOL_HER = [230, 256], STOOL_HIM = [344, 370];
  const CLOCK = [396, 66, 13];
  const DOOR = [436, 92, 476, 172];
  const SEAT = {                                // 人坐的位置（世界坐标，脚底 y = 204）
    desk: { x: 104, y: 204, size: 90, seat: 28, facing: 'left' },
    bed: { x: 152, y: 204, size: 84, seat: 28, facing: 'left' },
    her: { x: 243, y: 204, size: 84, seat: 28, facing: 'right' },
    him: { x: 357, y: 204, size: 90, seat: 28, facing: 'left' },
  };

  function light(st) {   // 世界坐标的光：吊灯 I、书桌台灯 st.desk、天亮 st.dawn
    const I = st.I ?? 0.5, D = st.desk || 0, sw = st.sway || 0, dawn = st.dawn || 0;
    return (x, y) => {
      const dx = x - LAMP[0] - sw, dy = y - LAMP[1];
      let v = clamp(1 - Math.hypot(dx, dy * 1.15) / 120) * 0.9;
      if (dy > 0) { const w = 12 + dy * 0.9; v = Math.max(v, clamp(1 - Math.abs(dx) / w) * clamp(1.25 - dy / 170)); }
      v *= I;
      if (D) v = Math.max(v, D * clamp(1 - Math.hypot(x - 22, (y - 128) * 1.3) / 110));
      if (dawn) v = Math.max(v, dawn * 0.8 * clamp(1 - Math.hypot(x - 54, y - 70) / 260));
      return v;
    };
  }

  function draw(G, cam, st) {   // 背景：墙、地板、窗、照片、钟、门、挂钩、床、书桌、椅子、凳子、桌腿
    const Lw = light(st), L = (x, y) => Lw(x + cam, y), X = (v) => v - cam, tf = st.tf || 0;
    // 墙、踢脚线、地板
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < LW; x++) G.px(x, y, G.dith(RAMP.wall, 0.35 + L(x, y) * 3.0 - (y < 6 ? 0.4 : 0), x + cam, y));
    for (let x = 0; x < LW; x++) { G.px(x, FLOOR - 3, 9); G.px(x, FLOOR - 2, G.dith([13, 14], 0.3 + L(x, FLOOR) * 1.5, x + cam, 0)); G.px(x, FLOOR - 1, 13); }
    for (let y = FLOOR; y < LH; y++) { const row = Math.floor((y - FLOOR) / 9); for (let x = 0; x < LW; x++) { const wx = x + cam, sm = (y - FLOOR) % 9 === 0, joint = (wx + row * 37) % 71 === 0; G.px(x, y, sm || joint ? 13 : G.dith(RAMP.floor, 0.35 + L(x, y) * 2.2 + (y - FLOOR) / 160, wx, y)); } }
    // 窗：城市 + 雨 / 天亮
    { const [a, Y0, b, Y1] = WIN, X0 = X(a), X1 = X(b), dawn = st.dawn || 0;
      if (X1 > -6 && X0 < LW + 6) {
        for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) G.px(x, y, G.dith(dawn ? [2, 3, 4, 12, 5, 42, 25] : [1, 2, 3, 4], ((y - Y0) / (Y1 - Y0)) * (dawn ? 5.5 * dawn : 2.2), x + cam, y));
        [[24, 72, 10], [34, 62, 9], [44, 80, 12], [57, 56, 9], [66, 70, 10], [76, 84, 9]].forEach(([bx, by, bw], i) => {
          for (let y = by; y <= Y1; y++) for (let x = bx; x < Math.min(bx + bw, b + 1); x++) G.px(X(x), y, dawn > 0.5 ? 3 : 1);
          if (dawn < 0.5) for (let y = by + 3; y < Y1 - 2; y += 4) for (let x = bx + 2; x < Math.min(bx + bw - 1, b); x += 3) if (rnd('w6' + i + ':' + x + ':' + y) < 0.22) G.px(X(x), y, 25); });
        if (st.rain > 0) for (let i = 0; i < 40 * st.rain; i++) { const x = X0 + Math.floor(rnd('r6' + i) * (X1 - X0 + 1)), y0 = Y0 + ((rnd('q6' + i) * 120 + tf * 150) % (Y1 - Y0 + 16)); for (let k = 0; k < 3; k++) if (y0 + k <= Y1) G.px(x, y0 + k, 6); }
        G.shape([X0 - 4, Y0 - 4, X1 + 4, Y1 + 4], (x, y) => x < X0 || x > X1 + 1 || y < Y0 || y > Y1 + 1 || Math.abs(x - (X0 + X1 + 1) / 2) < 1.5 || Math.abs(y - (Y0 + Y1) / 2) < 1.5, (x, y) => G.dith([13, 14, 15], 0.6 + L(x, y) * 1.4, x, y), 0);
        G.poly([[X0 - 7, Y1 + 4], [X1 + 7, Y1 + 4], [X1 + 5, Y1 + 8], [X0 - 5, Y1 + 8]], (x, y) => G.dith(RAMP.wood, 1.1 + L(x, y) * 2, x, y), 0);
      } }
    // 墙上：拍立得、钟、挂钩（外卖头盔、伞）
    if (!st.noPhoto) drawPhoto(G, cam, L, st); else { const nx = X(WP[0] + 16); G.px(nx, WP[1] - 1, 0); G.px(nx, WP[1], 3); }   // 照片取下来时只剩一颗钉子
    drawClock(G, cam, L, st);
    drawDoor(G, cam, L, st);
    // 地上的影子：桌下、床下
    for (let y = FLOOR + 24; y < FLOOR + 34; y++) for (let x = 0; x < LW; x++) { const wx = x + cam; if ((((wx - 300) / 54) ** 2 + ((y - FLOOR - 30) / 4.5) ** 2 < 1 || ((wx - 174) / 52) ** 2 + ((y - FLOOR - 30) / 4) ** 2 < 1) && PIX.bt(x, y) < 0.6) G.px(x, y, 13); }
    drawBed(G, cam, L, st);
    drawDesk(G, cam, L, st);
    drawChair(G, cam, L);
    // 凳子、桌腿
    const stool = ([x0, x1]) => { G.poly([[X(x0), 176], [X(x1), 176], [X(x1), 180], [X(x0), 180]], (x, y) => G.dith(RAMP.wood, 0.8 + L(x, y) * 2.4, x, y), 0);
      [[x0 + 3, x0 + 6], [x1 - 6, x1 - 3]].forEach(([a, b]) => G.poly([[X(a), 180], [X(b), 180], [X(b), 203], [X(a), 203]], (x, y) => G.dith(RAMP.wood, 0.4 + L(x, y) * 1.4, x, y), 0)); };
    stool(STOOL_HER); stool(STOOL_HIM);
    for (const lx of [TABLE[0] + 4, TABLE[1] - 7]) G.poly([[X(lx), TABLE_Y + 4], [X(lx + 3), TABLE_Y + 4], [X(lx + 4), 203], [X(lx - 1), 203]], (x, y) => G.dith(RAMP.wood, 0.5 + L(x, y) * 1.6, x, y), 0);
  }

  function drawBed(G, cam, L, st) {   // 侧面的单人床：床头在右，枕头，被子在床尾叠着垂下来
    const X = (v) => v - cam, { x0, x1, top } = BED; if (X(x1) < -4 || X(x0) > LW + 4) return;
    G.poly([[X(x1 - 10), 146], [X(x1), 146], [X(x1), 203], [X(x1 - 10), 203]], (x, y) => G.dith(RAMP.wood, 0.5 + L(x, y) * 1.8 + (y < 150 ? 0.6 : 0), x, y), 0);   // 床头板
    for (const lx of [x0 + 2]) G.poly([[X(lx), 188], [X(lx + 4), 188], [X(lx + 4), 203], [X(lx), 203]], (x, y) => G.dith(RAMP.wood, 0.4 + L(x, y) * 1.4, x, y), 0);       // 床尾腿
    G.poly([[X(x0), 184], [X(x1 - 10), 184], [X(x1 - 10), 190], [X(x0), 190]], (x, y) => G.dith(RAMP.wood, 0.7 + L(x, y) * 2, x, y), 0);                         // 床架
    G.poly([[X(x0 + 1), top], [X(x1 - 10), top], [X(x1 - 10), 184], [X(x0 + 1), 184]], (x, y) => G.dith([6, 7, 29, 8], 0.6 + L(x, y) * 2.4 + (y === top ? 0.8 : 0), x, y), 0);   // 床垫
    G.ellipse(X(x1 - 22), top - 3, 10, 4, (x, y) => G.dith([7, 29, 8], 0.9 + L(x, y) * 2, x, y), 0);                                                            // 枕头
    G.shape([X(x0 - 2), top - 3, X(x0 + 52), 194], (x, y) => { const wx = x + cam; return (wx <= x0 + 50 && y >= top - 2 && y <= 186) || (wx <= x0 + 6 && wx >= x0 - 2 && y <= 194 && y >= top); },
      (x, y) => G.dith([18, 19, 20], 0.4 + L(x, y) * 2.2 + (y < top + 1 ? 0.6 : 0) - (((x + cam) % 9) === 0 ? 0.5 : 0), x, y), 0);                               // 被子：叠在床尾、垂下来
  }

  function drawChair(G, cam, L) {   // 书桌椅：靠背在右（他朝左坐）
    const X = (v) => v - cam, { x0, x1 } = CHAIR; if (X(x1) < -4 || X(x0) > LW + 4) return;
    G.poly([[X(x0), 176], [X(x1), 176], [X(x1), 180], [X(x0), 180]], (x, y) => G.dith(RAMP.wood, 0.8 + L(x, y) * 2.4, x, y), 0);
    for (const a of [x0 + 3, x1 - 6]) G.poly([[X(a), 180], [X(a + 3), 180], [X(a + 3), 203], [X(a), 203]], (x, y) => G.dith(RAMP.wood, 0.4 + L(x, y) * 1.4, x, y), 0);
    G.poly([[X(x1 - 4), 142], [X(x1), 142], [X(x1), 176], [X(x1 - 4), 176]], (x, y) => G.dith(RAMP.wood, 0.6 + L(x, y) * 1.8, x, y), 0);
    G.poly([[X(x1 - 6), 142], [X(x1 + 1), 142], [X(x1 + 1), 146], [X(x1 - 6), 146]], (x, y) => G.dith(RAMP.wood, 1.0 + L(x, y) * 2, x, y), 0);
  }

  function drawDesk(G, cam, L, st) {   // 书桌：台灯、电脑（录音软件）、歌词本、耳机（没戴时放桌上）
    const X = (v) => v - cam, { x0, x1, top } = DESK; if (X(x1) < -4) return;
    for (const lx of [x0 + 2, x1 - 6]) G.poly([[X(lx), top + 6], [X(lx + 3), top + 6], [X(lx + 3), 203], [X(lx), 203]], (x, y) => G.dith(RAMP.wood, 0.5 + L(x, y) * 1.4, x, y), 0);
    G.poly([[X(x0 + 4), 182], [X(x1 - 4), 182], [X(x1 - 4), 184], [X(x0 + 4), 184]], (x, y) => G.dith(RAMP.wood, 0.4 + L(x, y), x, y), 0);
    G.poly([[X(x0), top], [X(x1), top], [X(x1), top + 3], [X(x0), top + 3]], (x, y) => G.dith(RAMP.wood, 1.3 + L(x, y) * 2.2, x, y), 0);
    G.poly([[X(x0 + 2), top + 3], [X(x1 - 2), top + 3], [X(x1 - 2), top + 7], [X(x0 + 2), top + 7]], (x, y) => G.dith(RAMP.wood, 0.6 + L(x, y) * 1.6, x, y), 0);
    // 台灯
    G.rect(X(8), top - 3, 10, 3, 0); G.line(X(13), top - 3, X(16), 116, 0); G.line(X(14), top - 3, X(17), 116, 3);
    G.poly([[X(12), 110], [X(26), 110], [X(30), 120], [X(8), 120]], (x, y) => G.dith([2, 3, 4], 0.5 + (y - 110) / 6, x, y), 0); if (st.desk) G.rect(X(10), 120, 18, 1, 24);
    // 电脑：录音软件的波形；录音时 REC 红点
    G.poly([[X(30), top - 1], [X(56), top - 1], [X(58), top], [X(28), top]], 4, 0); G.poly([[X(33), top - 1], [X(35), top - 20], [X(57), top - 20], [X(55), top - 1]], 2, 0);
    for (let i = 0; i < 18; i++) { const hh = st.rec ? 1 + Math.floor(Math.abs(Math.sin(i * 1.7 + (st.tf || 0) * 9)) * 6) : 1; G.rect(X(37 + i), top - 10 - (hh >> 1), 1, hh, 37); }
    if (st.rec && Math.floor((st.tf || 0) * 2) % 2 === 0) G.ellipse(X(39), top - 16, 1, 1, 31, null);
    // 歌词本：摊开，写满字
    G.rect(X(58), top - 3, 18, 3, 0); G.rect(X(59), top - 3, 8, 2, 7); G.rect(X(67), top - 3, 8, 2, 8);
    for (let i = 0; i < 7; i++) if (i % 3 !== 2) { G.px(X(60 + i), top - 3, 4); G.px(X(68 + i), top - 2, 4); }
    if (!st.wearPhones) { G.line(X(64), top - 4, X(66), top - 9, 0); G.line(X(66), top - 9, X(70), top - 9, 0); G.line(X(70), top - 9, X(72), top - 4, 0); G.rect(X(62), top - 6, 3, 3, 2); G.rect(X(71), top - 6, 3, 3, 2); }
  }

  // 麦克风：竖杆夹在桌子右端，麦头和防喷罩对着坐在书桌前的他的嘴（不管他在不在）
  let MIC = null;
  function micPos() {
    if (MIC) return MIC;
    const H = CHAR.headAt(Object.assign({ who: 'him', action: 'sitHold', u: 0.7, t: 0 }, SEAT.desk));
    return (MIC = { x: Math.round(H.x - H.r - 13), y: Math.round(H.y + 3), pf: Math.round(H.x - H.r - 5) });
  }
  function drawMic(G, cam, st) {   // 画在人前面
    const X = (v) => v - cam, m = micPos(), top = DESK.top; if (X(m.x) < -10) return;
    G.rect(X(m.x - 4), top - 3, 9, 3, 0); G.line(X(m.x), top - 3, X(m.x), m.y + 7, 0); G.line(X(m.x + 1), top - 3, X(m.x + 1), m.y + 7, 3);
    G.ellipse(X(m.x), m.y, 3, 6, (x, y) => ((x + y) % 2 ? 4 : 6), 0);
    if (st.rec) G.px(X(m.x), m.y + 9, Math.floor((st.tf || 0) * 2) % 2 ? 31 : 43);
    G.line(X(m.x + 1), m.y + 9, X(m.pf), m.y + 8, 0);                                                                                                    // 防喷罩的鹅颈
    G.shape([X(m.pf) - 4, m.y - 8, X(m.pf) + 4, m.y + 8], (x, y) => ((x - X(m.pf)) / 3) ** 2 + ((y - m.y) / 7.5) ** 2 <= 1, (x, y) => ((x + y) % 2 ? 2 : 255), 0);
  }

  function drawPhoto(G, cam, L, st) {   // 拍立得：内容由 st.photo（30×20 色号）给；没有就画一片抽象的海边
    const X0 = WP[0] - cam, Y0 = WP[1]; if (X0 > LW || X0 + 33 < 0) return;
    G.rect(X0 + 1, Y0 + 1, 32, 24, 9); G.rect(X0 - 1, Y0 - 1, 34, 26, 0);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) G.px(X0 + x, Y0 + y, G.dith([7, 29, 8], 0.8 + L(X0 + x, Y0 + y) * 1.4, X0 + x, Y0 + y));
    for (let j = 0; j < 20; j++) for (let i = 0; i < 30; i++) G.px(X0 + 1 + i, Y0 + 1 + j, st.photo ? st.photo[j * 30 + i] : (j < 6 ? (j % 2 ? 42 : 25) : j < 13 ? (j === 6 ? 8 : 27) : 16));
    G.rect(X0 + 12, Y0 - 2, 8, 3, 29);
  }
  function drawClock(G, cam, L, st) {
    const [wx, cy, R] = CLOCK, cx = wx - cam; if (cx < -R - 2 || cx > LW + R + 2) return;
    G.ellipse(cx + 1, cy + 1, R + 1, R + 1, 9, null);
    G.ellipse(cx, cy, R + 1, R + 1, (x, y) => G.dith([13, 14, 15], 0.5 + L(x, y) * 1.6, x, y), 0);
    G.ellipse(cx, cy, R - 1, R - 1, (x, y) => G.dith([7, 29, 8], 0.4 + L(x, y) * 1.8 - (y - cy) / 14, x, y), null);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; G.px(cx + Math.round(Math.sin(a) * (R - 2)), cy - Math.round(Math.cos(a) * (R - 2)), k % 3 ? 6 : 1); }
    const sec = st.clock ?? (2 * 3600 + 47 * 60), hand = (a, len, c) => G.line(cx, cy, cx + Math.round(Math.sin(a) * len), cy - Math.round(Math.cos(a) * len), c);
    hand(((sec / 3600) % 12) / 12 * Math.PI * 2, 6, 0); hand(((sec / 60) % 60) / 60 * Math.PI * 2, 10, 0); hand((Math.floor(sec % 60)) / 60 * Math.PI * 2, 11, 31); G.px(cx, cy, 0);
  }
  function drawDoor(G, cam, L, st) {   // st.door 0 关 → 1 开（开着露出楼道的光）
    const door = st.door ?? 0, [a, dy0, b, dy1] = DOOR, d0 = a - cam, d1 = b - cam; if (d1 < -4 || d0 > LW + 4) return;
    G.rect(d0 - 3, dy0 - 3, d1 - d0 + 6, dy1 - dy0 + 3, 0); G.rect(d0 - 2, dy0 - 2, d1 - d0 + 4, dy1 - dy0 + 2, 14);
    const leafW = Math.round((d1 - d0) * (1 - door)), hall = st.hallRain ? [1, 2, 3] : [25, 23, 24];
    for (let y = dy0; y < dy1; y++) for (let x = d0; x < d1; x++) {
      if (x - d0 < (d1 - d0) - leafW) G.px(x, y, G.dith(hall, 1.1 + (y - dy0) / 90, x, y));
      else G.px(x, y, G.dith(RAMP.wood, 0.6 + L(x, y) * 1.6 + ((x - d0) % 13 === 0 ? -0.6 : 0), x, y));
    }
    if (leafW > 4) G.px(d1 - leafW + 4, dy0 + 44, 23);
    for (let x = d0 - 4; x < d1 + 4; x++) G.px(x, 205, 14); for (let x = d0 - 2; x < d1 + 2; x++) { G.px(x, 204, 15); G.px(x, 206, 13); }   // 门口的脚垫
  }

  function drawTop(G, cam, st) {   // 前景：餐桌桌面 + 碗筷、吊灯、麦克风
    const Lw = light(st), L = (x, y) => Lw(x + cam, y), X = (v) => v - cam, [t0, t1] = TABLE;
    G.poly([[X(t0), TABLE_Y], [X(t1), TABLE_Y], [X(t1), TABLE_Y + 3], [X(t0), TABLE_Y + 3]], (x, y) => G.dith(RAMP.wood, 1.4 + L(x, y) * 2.6, x, y), 0);
    G.poly([[X(t0 + 2), TABLE_Y + 3], [X(t1 - 2), TABLE_Y + 3], [X(t1 - 2), TABLE_Y + 7], [X(t0 + 2), TABLE_Y + 7]], (x, y) => G.dith(RAMP.wood, 0.6 + L(x, y) * 1.8, x, y), 0);
    const bowl = (cx, full) => { cx = X(cx); const y = TABLE_Y - 5;
      G.poly([[cx - 6, y], [cx + 6, y], [cx + 5, y + 3], [cx + 2, y + 5], [cx - 2, y + 5], [cx - 5, y + 3]], (x, yy) => (yy === y + 1 ? 4 : G.dith(RAMP.porcelain, 1.2 + L(x, yy) * 2 - (x - cx) / 10, x, yy)), 0);
      if (full) G.ellipse(cx, y - 1, 5, 2.2, (x, yy) => G.dith([6, 29, 8], 0.8 + L(x, yy) * 1.6 - (yy - y + 3) / 4, x, yy), 0); };
    const bw = st.bowls || 'both';   // both：她那碗满的没动；pair：两副空碗筷；one：只有他的
    if (bw === 'both' || bw === 'pair') { bowl(280, bw === 'both'); G.line(X(272), TABLE_Y - 8, X(290), TABLE_Y - 8, 16); }
    if (bw !== 'none') { bowl(320, false); G.line(X(312), TABLE_Y - 1, X(330), TABLE_Y - 1, 16); }
    if (st.phoneDown) { G.rect(X(331), TABLE_Y - 2, 6, 2, 0); }
    // 吊灯
    const lx = LAMP[0] - cam + (st.sway || 0); if (lx > -20 && lx < LW + 20) { G.line(LAMP[0] - cam, 0, lx, 36, 0);
      G.poly([[lx - 6, 36], [lx + 6, 36], [lx + 17, 46], [lx - 17, 46]], (x, y) => G.dith([2, 3, 4], 0.4 + (y - 36) / 8 + (x < lx ? 0.6 : 0), x, y), 0);
      const on = (st.I ?? 0.5) > 0.2; for (let x = lx - 15; x <= lx + 15; x++) G.px(x, 46, on ? 23 : 3);
      G.ellipse(lx, 48, 3, 2, (x, y) => (on ? (Math.hypot(x - lx, y - 48) < 1.6 ? 24 : 23) : 4), null); }
    drawMic(G, cam, st);
  }

  // 头戴耳机（他在书桌前录歌时戴）
  function phones(G, o) { const H = CHAR.headAt(o);
    G.shape([H.x - H.r * 1.2, H.y - H.r * 1.45, H.x + H.r * 1.2, H.y + 2], (x, y) => { const d = ((x - H.x) / (H.r * 1.08)) ** 2 + ((y - H.y + H.r * 0.05) / (H.r * 1.25)) ** 2; return y < H.y && d <= 1 && d >= 0.72; }, 1, null);
    G.ellipse(H.x + H.flip * H.r * 0.15, H.y + H.r * 0.12, H.r * 0.34, H.r * 0.42, 2, 0); }

  return { W, FLOOR, TABLE_Y, WIN, DESK, BED, WP, LAMP, TABLE, CLOCK, DOOR, SEAT, light, draw, drawTop, drawMic, phones };
})();
