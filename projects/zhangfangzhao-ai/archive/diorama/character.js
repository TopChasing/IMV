/* character.js：《唉》的两个主角，纸艺立体书里的关节纸偶（依赖 lib/paper.js）。
   他 'him'：24 岁，灰蓝卫衣（背后搭着帽子）、深色裤子、白球鞋，短黑发。
   她 'her'：只在回忆里出现，齐肩长发、右边一枚红发夹，米白毛衣、豆沙粉半身裙、深色袜裤、棕色小皮鞋。
   身体每一段是一张纸片（白边 + 刀口 + 纸厚），肩、肘、髋、膝钉一颗铜脚钉；只画平涂底色，光由镜头那层打。

   CHAR.draw(ctx, o)        画一个人
     o.who        'him' | 'her'
     o.x, o.y     脚底中点（世界坐标）
     o.size       身高（像素）
     o.facing     'left' | 'right' | 'front' | 'back'
     o.expression 'neutral' | 'happy' | 'shy' | 'sad' | 'cry'
     o.action     'idle' | 'walk' | 'jump' | 'slump' | 'reach' | 'hug' | 'hold' | 'holdHigh' | 'sit' | 'sitHunch'
                  （侧面全支持；正面/背面支持 idle、walk、jump、slump，其余退回 idle）
     o.u          动作进行到哪 0→1（walk 用 o.t 走步，u 不用）
     o.t          全片时间（呼吸、眨眼、走路步频）
     o.seat       坐的高度（像素，默认身高的 0.33）
     o.hold       道具：CHAR.PROPS.phone / bowl / umbrella，或任何 { draw(ctx, hand, scale) }
     o.pose       定格张号（纸片手摆抖动用，一秒 12 张：Math.floor(t * 12)）
   CHAR.handAt(o, 'near' | 'far') → { x, y, angle }   手在哪（世界坐标），angle 是小臂方向（0 = 朝下）
   CHAR.drawHead(ctx, o)    只画头（表情表用），o.x, o.y 为头中心，o.size 为头直径
   纯函数：只看参数，不存状态。 */
(function () {
  'use strict';
  const { TAU, clamp, lerp, smooth, rnd, ell, poly, rrect, capsule, twoTone, glue, sprite, place } = window.PAPER;
  const REF = 600;   // 纸片按 600 px 身高做，画的时候再缩放

  const SPEC = {
    him: {
      headR: 66, sw: 60, hw: 34, upper: 108, fore: 92, thigh: 140, shin: 132,
      armR: [27, 22, 21, 18], legR: [31, 26, 25, 21],
      skin: '#E8B48F', skinDk: '#C98B6A', hair: '#2A2433', hairLt: '#4A4058',
      top: ['#8D96AE', '#6A7290'], topDk: '#5A6280', bottom: ['#4A5070', '#353A52'], shoe: ['#F4F1EA', '#C9C4BA'], sole: '#9C968C',
    },
    her: {
      headR: 64, sw: 50, hw: 30, upper: 100, fore: 88, thigh: 140, shin: 132,
      armR: [22, 19, 18, 15], legR: [22, 19, 18, 15],
      skin: '#F0C29E', skinDk: '#D29A7A', hair: '#4A3026', hairLt: '#6E4A3A', clip: '#D9534F',
      top: ['#EEDFC6', '#CBB797'], topDk: '#B9A584', bottom: ['#4A3F4C', '#382F3A'], skirt: ['#CF8F94', '#A96B71'], shoe: ['#86553F', '#62402F'], sole: '#4A3024',
    },
  };
  const HIP_Y = -280, TORSO = 175, NECK = 24;
  const BRASS = '#C2A25E', BRASS_DK = '#8F7440';
  const dir = (a) => [Math.sin(a), Math.cos(a)];
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

  // ---------------- 纸片 ----------------
  function partSprites(who, view) {
    const S = SPEC[who], k = who + ':' + view, side = view === 'side';
    const R = S.headR;
    const out = {};
    // 身子（锚点 = 骨盆中心，朝上画）
    out.torso = sprite(k + ':torso', [-90, -TORSO - 60, 90, 30], (a) => {
      const sw = side ? 40 : S.sw + 8, hw = side ? 34 : S.hw + 12;
      const body = poly([[-hw, 18], [hw, 18], [hw + 4, -40], [sw, -TORSO + 20], [sw - 16, -TORSO - 4], [-sw + 16, -TORSO - 4], [-sw, -TORSO + 20], [-hw - 4, -40]]);
      if (who === 'him') {
        if (view !== 'front') twoTone(a, ell(side ? 30 : 0, -TORSO + (side ? 2 : 30), side ? 30 : 56, side ? 46 : 42), S.top[0], S.topDk, -6, -6);   // 帽子：侧面在背后鼓一块，背面整个搭在背上
        twoTone(a, body, S.top[0], S.top[1], -14, -8);
        if (view === 'front') {
          glue(a, poly([[-44, -20], [44, -20], [34, -72], [-34, -72]]), S.top[1], { clip: body });     // 袋鼠兜
          twoTone(a, ell(0, -TORSO + 4, 44, 20), S.topDk, S.topDk);                                      // 领口后面的帽子边
          a.strokeStyle = '#E9E4DA'; a.lineWidth = 4; a.lineCap = 'round';
          [-14, 14].forEach((x) => { a.beginPath(); a.moveTo(x, -TORSO + 14); a.lineTo(x + (x < 0 ? -3 : 3), -TORSO + 70); a.stroke(); });
        } else if (side) glue(a, poly([[-34, -20], [-6, -20], [-4, -70], [-36, -70]]), S.top[1], { clip: body });
        a.fillStyle = S.top[1]; a.fillRect(-hw, 6, hw * 2, 12);                                           // 下摆罗纹
      } else {
        twoTone(a, body, S.top[0], S.top[1], -14, -8);
        a.strokeStyle = 'rgba(150,128,96,.45)'; a.lineWidth = 3;                                         // 毛衣的竖纹
        for (let x = -sw + 12; x < sw - 6; x += 14) { a.beginPath(); a.moveTo(x, -TORSO + 14); a.lineTo(x * 0.85, 4); a.stroke(); }
        if (view === 'front') { a.fillStyle = S.top[1]; a.fill(ell(0, -TORSO + 2, 26, 12)); }
      }
    }, { border: 10, thick: 4 });
    if (who === 'her') out.skirt = sprite(k + ':skirt', [-90, -30, 90, 160], (a) => {
      const t = side ? 34 : 44, b = side ? 62 : 84;
      twoTone(a, poly([[-t, -24], [t, -24], [b, 140], [-b, 140]]), S.skirt[0], S.skirt[1], -12, 0);
      a.strokeStyle = 'rgba(120,60,66,.35)'; a.lineWidth = 3; for (let i = -2; i <= 2; i++) { a.beginPath(); a.moveTo(i * t * 0.4, -18); a.lineTo(i * b * 0.4, 136); a.stroke(); }
    }, { border: 9, thick: 3.5 });
    // 手臂：上臂（锚点肩）、小臂带手（锚点肘），都朝下画
    const [r0, r1, r2, r3] = S.armR;
    out.upper = sprite(k + ':upper', [-r0 - 4, -r0 - 4, r0 + 4, S.upper + r1 + 4], (a) => twoTone(a, capsule(0, 0, 0, S.upper, r0, r1), S.top[0], S.top[1], -8, 0), { border: 8, thick: 3 });
    out.fore = sprite(k + ':fore', [-r2 - 6, -r2 - 4, r2 + 6, S.fore + 24], (a) => {
      twoTone(a, capsule(0, 0, 0, S.fore - 6, r2, r3), S.top[0], S.top[1], -7, 0);
      a.fillStyle = S.top[1]; a.fillRect(-r3 - 1, S.fore - 16, 2 * r3 + 2, 10);                       // 袖口
      twoTone(a, ell(0, S.fore + 6, r3 + 2, r3 + 5), S.skin, S.skinDk, -4, -3);                      // 手
    }, { border: 7, thick: 3 });
    // 腿：大腿（锚点髋）、小腿（锚点膝），鞋另一张
    const [l0, l1, l2, l3] = S.legR;
    out.thigh = sprite(k + ':thigh', [-l0 - 4, -l0 - 4, l0 + 4, S.thigh + l1 + 4], (a) => twoTone(a, capsule(0, 0, 0, S.thigh, l0, l1), S.bottom[0], S.bottom[1], -8, 0), { border: 8, thick: 3 });
    out.shin = sprite(k + ':shin', [-l2 - 4, -l2 - 4, l2 + 4, S.shin + l3 + 4], (a) => twoTone(a, capsule(0, 0, 0, S.shin, l2, l3), S.bottom[0], S.bottom[1], -7, 0), { border: 8, thick: 3 });
    out.shoe = sprite(k + ':shoe', side ? [-62, -16, 26, 26] : [-30, -14, 30, 24], (a) => {
      const p = side ? rrect(-60, -12, 82, 34, 14) : rrect(-28, -10, 56, 30, 12);
      twoTone(a, p, S.shoe[0], S.shoe[1], -6, -5);
      a.fillStyle = S.sole; a.fillRect(side ? -60 : -28, 16, side ? 82 : 56, 6);
    }, { border: 7, thick: 3 });
    return out;
  }
  function headSprite(who, view, expr, blink) {
    const S = SPEC[who], R = S.headR, key = `${who}:head:${view}:${expr}:${blink ? 1 : 0}`;
    return sprite(key, [-R - 26, -R - 30, R + 26, R + 30], (a) => {
      const side = view === 'side';
      if (view === 'back') {
        twoTone(a, ell(-R * 0.98, 6, 12, 18), S.skin, S.skinDk, -3, -3); twoTone(a, ell(R * 0.98, 6, 12, 18), S.skin, S.skinDk, -3, -3);
        twoTone(a, ell(0, 0, R, R * 1.02), S.hairLt, S.hair, -14, -14);
        if (who === 'her') glue(a, rrect(R * 0.28, -R * 0.62, 30, 11, 4), S.clip);
        return;
      }
      if (!side) { twoTone(a, ell(-R * 0.98, 8, 12, 18), S.skin, S.skinDk, -3, -3); twoTone(a, ell(R * 0.98, 8, 12, 18), S.skin, S.skinDk, -3, -3); }
      const face = side ? (() => { const p = new Path2D(); p.ellipse(0, 0, R * 0.96, R, 0, 0, TAU); p.moveTo(-R * 0.86, 4); p.lineTo(-R * 1.08, R * 0.2); p.lineTo(-R * 0.88, R * 0.3); p.closePath(); return p; })() : ell(0, 0, R, R * 1.02);
      twoTone(a, face, S.skin, S.skinDk, -10, -10);
      // 头发
      a.save(); a.clip(face);
      if (who === 'him') {
        const hair = side ? poly([[-R * 1.1, -R * 0.15], [-R * 0.6, -R * 0.45], [-R * 0.2, -R * 0.2], [R * 0.05, -R * 0.35], [R * 0.2, R * 0.15], [R * 0.55, R * 0.4], [R * 1.2, R * 0.6], [R * 1.2, -R * 1.2], [-R * 1.2, -R * 1.2]])
          : poly([[-R * 1.2, -R * 0.05], [-R * 0.95, -R * 0.1], [-R * 0.7, -R * 0.38], [-R * 0.45, -R * 0.22], [-R * 0.2, -R * 0.42], [R * 0.05, -R * 0.24], [R * 0.32, -R * 0.44], [R * 0.6, -R * 0.24], [R * 0.95, -R * 0.12], [R * 1.2, 0], [R * 1.2, -R * 1.2], [-R * 1.2, -R * 1.2]]);
        twoTone(a, hair, S.hairLt, S.hair, -10, -10);
      } else {
        const hair = side ? poly([[-R * 1.1, -R * 0.3], [-R * 0.5, -R * 0.52], [-R * 0.05, -R * 0.4], [R * 0.1, R * 0.2], [R * 0.4, R * 1.2], [R * 1.2, R * 1.2], [R * 1.2, -R * 1.2], [-R * 1.2, -R * 1.2]])
          : poly([[-R * 1.2, R * 1.2], [-R * 0.8, R * 0.9], [-R * 0.82, -R * 0.1], [-R * 0.5, -R * 0.5], [-R * 0.04, -R * 0.62], [R * 0.04, -R * 0.62], [R * 0.5, -R * 0.5], [R * 0.82, -R * 0.1], [R * 0.8, R * 0.9], [R * 1.2, R * 1.2], [R * 1.2, -R * 1.2], [-R * 1.2, -R * 1.2]]);
        twoTone(a, hair, S.hairLt, S.hair, -10, -10);
      }
      a.restore();
      if (side) twoTone(a, ell(R * 0.16, R * 0.12, 11, 16), S.skin, S.skinDk, -3, -3);              // 侧面的耳朵
      if (who === 'her') glue(a, rrect(side ? -R * 0.1 : R * 0.3, -R * 0.6, 30, 11, 4), S.clip);     // 红发夹
      drawFace(a, who, side, expr, blink, R);
    }, { border: 9, thick: 3.5 });
  }
  function drawFace(a, who, side, expr, blink, R) {
    const ink = '#2A1E24', eyes = side ? [[-R * 0.5, R * 0.1]] : [[-R * 0.34, R * 0.12], [R * 0.34, R * 0.12]];
    const mouth = side ? [-R * 0.68, R * 0.52] : [0, R * 0.5];
    a.fillStyle = ink; a.strokeStyle = ink; a.lineCap = 'round'; a.lineWidth = R * 0.055;
    const blushOn = expr === 'happy' || expr === 'shy';
    if (blushOn) { a.fillStyle = expr === 'shy' ? 'rgba(232,120,120,.75)' : 'rgba(240,140,130,.55)'; eyes.forEach(([x, y]) => a.fill(ell(x + (side ? -2 : x < 0 ? -6 : 6), y + R * 0.3, R * (expr === 'shy' ? 0.2 : 0.15), R * 0.1))); a.fillStyle = ink; }
    eyes.forEach(([x, y]) => {
      const sgn = side ? -1 : Math.sign(x);   // 眉毛内侧在哪边
      if (expr === 'happy') { a.beginPath(); a.arc(x, y + R * 0.06, R * 0.11, Math.PI * 1.1, Math.PI * 1.9); a.stroke(); }
      else if (blink) { a.beginPath(); a.moveTo(x - R * 0.1, y + R * 0.04); a.lineTo(x + R * 0.1, y + R * 0.04); a.stroke(); }
      else if (expr === 'shy') a.fill(ell(x - (side ? 2 : 0), y + R * 0.08, R * 0.065, R * 0.06));
      else a.fill(ell(x, y, R * 0.075, R * 0.1));
      if (!blink && expr !== 'happy' && expr !== 'shy') { a.fillStyle = '#FFFFFF'; a.fill(ell(x - R * 0.025, y - R * 0.035, R * 0.025, R * 0.025)); a.fillStyle = ink; }
      if (expr === 'sad' || expr === 'cry') { a.lineWidth = R * 0.045; a.beginPath(); a.moveTo(x + sgn * R * 0.16, y - R * 0.2); a.lineTo(x - sgn * R * 0.04, y - R * 0.3); a.stroke(); a.lineWidth = R * 0.055; }
      if (expr === 'cry') { const d = new Path2D(); const tx = x + (side ? -R * 0.02 : 0), ty = y + R * 0.22; d.moveTo(tx, ty - R * 0.08); d.quadraticCurveTo(tx + R * 0.08, ty + R * 0.06, tx, ty + R * 0.1); d.quadraticCurveTo(tx - R * 0.08, ty + R * 0.06, tx, ty - R * 0.08); glue(a, d, '#9FD3E8'); a.fillStyle = ink; }
    });
    const [mx, my] = mouth; a.beginPath();
    if (expr === 'happy') { a.fillStyle = '#7A3A3E'; a.moveTo(mx - R * 0.16, my - R * 0.04); a.quadraticCurveTo(mx, my + R * 0.2, mx + R * 0.16 * (side ? 0.4 : 1), my - R * 0.04); a.closePath(); a.fill(); }
    else if (expr === 'shy') { a.moveTo(mx - R * 0.1, my); a.quadraticCurveTo(mx - R * 0.05, my - R * 0.05, mx, my); a.quadraticCurveTo(mx + R * 0.05, my + R * 0.05, mx + R * 0.1 * (side ? 0.5 : 1), my); a.stroke(); }
    else if (expr === 'sad' || expr === 'cry') { a.moveTo(mx - R * 0.12, my + R * 0.06); a.quadraticCurveTo(mx, my - R * 0.06, mx + R * 0.12 * (side ? 0.4 : 1), my + R * 0.06); a.stroke(); }
    else { a.moveTo(mx - R * 0.09, my); a.lineTo(mx + R * 0.09 * (side ? 0.4 : 1), my); a.stroke(); }
  }
  function hairBack(who, view) {
    if (who !== 'her') return null;
    const S = SPEC.her, R = S.headR;
    return sprite('her:hairback:' + view, [-R * 1.2, -R * 1.1, R * 1.4, R * 2.2], (a) => {
      const p = view === 'side' ? rrect(-R * 0.2, -R * 0.9, R * 1.3, R * 2.9, R * 0.6) : rrect(-R * 1.08, -R * 1.0, R * 2.16, R * 2.95, R * 0.7);
      twoTone(a, p, S.hairLt, S.hair, -10, -6);
    }, { border: 9, thick: 3.5 });
  }

  // ---------------- 姿势 ----------------
  // 侧面（朝左）为基准：角度 0 = 朝下，负 = 往前（朝左）。lean 正 = 往前倾。knee 正 = 小腿往后折。
  const SIDE_IDLE = { lean: 0.02, bodyY: 0, tilt: 0.04, as: 0.06, ae: -0.12, bs: -0.06, be: -0.2, ah: -0.03, ak: 0.04, bh: 0.05, bk: 0.03, sx: 1, sy: 1 };
  const FRONT_IDLE = { lean: 0, bodyY: 0, tilt: 0, as: -0.13, ae: 0.06, bs: 0.13, be: -0.06, ah: -0.04, ak: 0, bh: 0.04, bk: 0, sx: 1, sy: 1 };
  const mix = (A, B, u) => { const o = {}; for (const k in A) o[k] = typeof A[k] === 'number' ? lerp(A[k], B[k] ?? A[k], u) : A[k]; for (const k in B) if (!(k in o)) o[k] = B[k]; return o; };
  const over = (A, B) => Object.assign({}, A, B);
  function keys(list, u) {   // 关键帧之间缓动插值
    if (u <= list[0][0]) return list[0][1];
    for (let i = 1; i < list.length; i++) if (u <= list[i][0]) { const [u0, A] = list[i - 1], [u1, B] = list[i]; return mix(A, B, smooth((u - u0) / (u1 - u0))); }
    return list[list.length - 1][1];
  }
  function poseFor(o, view) {
    const u = clamp(o.u ?? 1), t = o.t ?? 0, act = o.action || 'idle';
    const side = view === 'side', base = side ? SIDE_IDLE : FRONT_IDLE;
    const seat = (o.seat ?? o.size * 0.33) * REF / o.size;
    if (act === 'walk') {
      const ph = t * 1.7 * TAU + (o.who === 'her' ? 1.3 : 0), s = Math.sin(ph);
      if (!side) return over(base, { bodyY: -8 * Math.abs(Math.cos(ph)), as: -0.13 - 0.12 * s, bs: 0.13 - 0.12 * s, ak: 0.35 * Math.max(0, s), bk: 0.35 * Math.max(0, -s), ah: -0.04, bh: 0.04, liftA: 18 * Math.max(0, s), liftB: 18 * Math.max(0, -s) });
      return over(base, { lean: 0.07, bodyY: -10 * (1 - Math.abs(s)), ah: -0.42 * s, bh: 0.42 * s, ak: 0.12 + 0.5 * Math.max(0, Math.sin(ph + 1.3)), bk: 0.12 + 0.5 * Math.max(0, Math.sin(ph + 1.3 + Math.PI)), as: 0.36 * s, ae: -0.28, bs: -0.36 * s, be: -0.28 });
    }
    if (act === 'jump') {
      const A = side ? {} : { as: -0.5, bs: 0.5 };
      const crouch = over(base, { bodyY: 46, lean: side ? 0.28 : 0, as: side ? 0.55 : -0.5, ae: -0.3, bs: side ? 0.5 : 0.5, be: -0.3, plant: true, sx: 1.04, sy: 0.95 });
      const launch = over(base, { bodyY: -150, lean: 0.04, ah: 0.06, ak: 0.18, bh: 0.12, bk: 0.3, as: side ? -2.6 : -2.55, ae: -0.1, bs: side ? -2.4 : 2.55, be: side ? -0.1 : 0.1, sx: 0.97, sy: 1.06 });
      const apex = over(launch, { bodyY: -200, ah: side ? -0.4 : -0.35, ak: side ? 0.9 : 0.5, bh: side ? -0.15 : 0.35, bk: side ? 1.1 : 0.5, sx: 1, sy: 1 });
      const land = over(crouch, { bodyY: 40, as: side ? -0.9 : -0.9, bs: side ? -0.8 : 0.9, sx: 1.06, sy: 0.93 });
      return keys([[0, over(base, A)], [0.18, crouch], [0.34, launch], [0.55, apex], [0.8, land], [1, base]], u);
    }
    if (act === 'slump') return mix(base, over(base, side ? { lean: 0.34, tilt: 0.5, bodyY: 20, as: 0.14, ae: 0.02, bs: 0.04, be: -0.04, plant: true, sy: 0.97 } : { tilt: 0.5, bodyY: 18, as: -0.06, bs: 0.06, ae: 0.02, be: -0.02, plant: true, sy: 0.96 }), smooth(u));
    if (!side) return base;
    if (act === 'reach') return mix(base, over(base, { lean: 0.2, tilt: -0.12, as: -1.5, ae: -0.1, bs: -0.25, be: -0.3, plantA: -95, plantB: 45 }), smooth(u));
    if (act === 'hug') return mix(base, over(base, { lean: 0.12, tilt: 0.16, as: -1.3, ae: -1.2, bs: -1.18, be: -1.3 }), smooth(u));
    if (act === 'hold') return mix(base, over(base, { as: -0.38, ae: -1.55, bs: -0.28, be: -1.5, tilt: 0.18 }), smooth(u));
    if (act === 'holdHigh') return mix(base, over(base, { as: -0.75, ae: -1.85, bs: 0.0, be: -0.25, tilt: -0.05 }), smooth(u));
    if (act === 'sit' || act === 'sitHunch') {
      const sit = over(base, { bodyY: -(seat + 18) - HIP_Y, plantA: -150, plantB: -128, as: -0.45, ae: -0.55, bs: -0.4, be: -0.6, lean: 0.06, tilt: 0.1 });
      if (act === 'sit') return sit;
      return mix(sit, over(sit, { lean: 0.62, tilt: 0.42, as: -0.72, ae: -1.12, bs: -0.62, be: -1.22 }), smooth(u));
    }
    return base;
  }
  // 两节骨头的 IK：髋 H、脚 F，膝盖往前（朝左）
  function ik(H, F, L1, L2) {
    const dx = F[0] - H[0], dy = F[1] - H[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
    const base = Math.atan2(dx, dy), al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const h = base - al, K = add(H, dir(h), L1), shinAbs = Math.atan2(F[0] - K[0], F[1] - K[1]);
    return [h, shinAbs - h];
  }

  // ---------------- 骨架 ----------------
  function viewOf(o) { const f = o.facing || 'left'; return f === 'front' ? 'front' : f === 'back' ? 'back' : 'side'; }
  function solve(o) {
    const S = SPEC[o.who || 'him'], view = viewOf(o), side = view === 'side';
    const P = poseFor(o, view);
    const breath = 1 + 0.012 * Math.sin((o.t ?? 0) * TAU / 3.6 + (o.who === 'her' ? 1 : 0));
    const hip = [0, HIP_Y + P.bodyY];
    const up = [-Math.sin(P.lean), -Math.cos(P.lean)], perp = [Math.cos(P.lean), -Math.sin(P.lean)];
    const shC = add(hip, up, TORSO * breath), neck = add(shC, up, NECK);
    const hl = P.lean + (side ? P.tilt : 0), headUp = [-Math.sin(hl), -Math.cos(hl)];
    const head = add(add(neck, headUp, S.headR * 0.92), [0, side ? 0 : P.tilt * 26]);
    const shA = side ? add(shC, perp, -6) : add(shC, perp, -S.sw), shB = side ? add(add(shC, perp, 8), up, -4) : add(shC, perp, S.sw);
    const hipA = side ? [hip[0] - 6, hip[1]] : [hip[0] - S.hw, hip[1]], hipB = side ? [hip[0] + 6, hip[1]] : [hip[0] + S.hw, hip[1]];
    const arm = (sh, s, e) => { const el = add(sh, dir(s), S.upper); const wr = add(el, dir(s + e), S.fore); return { sh, el, wr, s, f: s + e, hand: add(wr, dir(s + e), 6) }; };
    const footY = -10;
    let [ah, ak, bh, bk] = [P.ah, P.ak, P.bh, P.bk];
    const plant = P.plant || P.plantA != null;
    if (plant) {
      const fa = [P.plantA ?? (side ? -4 : -S.hw - 4), footY], fb = [P.plantB ?? (side ? 10 : S.hw + 4), footY];
      if (side) { [ah, ak] = ik(hipA, fa, S.thigh, S.shin); [bh, bk] = ik(hipB, fb, S.thigh, S.shin); }
      else {   // 正面蹲：膝盖往两边分一点
        const m = (H, F, sgn) => { const [h, k] = ik([H[0] * sgn, H[1]], [F[0] * sgn, F[1]], S.thigh, S.shin); return [h * sgn, k * sgn]; };
        [ah, ak] = m(hipA, fa, 1); [bh, bk] = m(hipB, fb, -1);
      }
    }
    const leg = (hp, h, k, lift = 0) => { const kn = add(add(hp, dir(h), S.thigh), [0, -lift]); const an = add(kn, dir(h + k), S.shin); return { hp, kn, an, h, f: h + k }; };
    return { S, view, side, P, hip, up, shC, neck, head, headTilt: side ? hl : 0, armA: arm(shA, P.as, P.ae), armB: arm(shB, P.bs, P.be), legA: leg(hipA, ah, ak, P.liftA || 0), legB: leg(hipB, bh, bk, P.liftB || 0) };
  }
  const scaleOf = (o) => o.size / REF;
  const mirror = (o) => (o.facing === 'right' ? -1 : 1);

  function blinkAt(o) { const per = o.who === 'her' ? 4.3 : 3.7, ph = ((o.t ?? 0) + rnd('blink' + o.who) * per) % per; return ph < 0.13; }

  // ---------------- 画 ----------------
  function draw(g, o) {
    o = Object.assign({ who: 'him', size: 400, facing: 'left', expression: 'neutral', action: 'idle', u: 1, t: 0, pose: 0 }, o);
    const J = solve(o), S = J.S, parts = partSprites(o.who, J.view), sc = scaleOf(o), mx = mirror(o);
    const id = o.who + ':', pz = o.pose;
    const dark = 0.8;
    g.save(); g.translate(o.x, o.y); g.scale(sc * mx * J.P.sx, sc * J.P.sy);
    const pin = (p) => { g.fillStyle = BRASS_DK; g.beginPath(); g.arc(p[0] + 1.5, p[1] + 1.5, 7, 0, TAU); g.fill(); g.fillStyle = BRASS; g.beginPath(); g.arc(p[0], p[1], 6.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.8)'; g.beginPath(); g.arc(p[0] - 2, p[1] - 2, 2.2, 0, TAU); g.fill(); };
    const drawArm = (A, k, br) => { place(g, parts.upper, A.sh[0], A.sh[1], { id: id + 'up' + k, pose: pz, rot: -A.s, bright: br }); place(g, parts.fore, A.el[0], A.el[1], { id: id + 'fo' + k, pose: pz, rot: -A.f, bright: br }); pin(A.el); };
    const drawLeg = (L, k, br) => {
      place(g, parts.shin, L.kn[0], L.kn[1], { id: id + 'sh' + k, pose: pz, rot: -L.f, bright: br });
      place(g, parts.shoe, L.an[0], L.an[1] + 6, { id: id + 'so' + k, pose: pz, rot: J.side ? clamp(-L.f * 0.3, -0.5, 0.5) : 0, bright: br });
      place(g, parts.thigh, L.hp[0], L.hp[1], { id: id + 'th' + k, pose: pz, rot: -L.h, bright: br }); pin(L.kn);
    };
    const drawTorso = () => { place(g, parts.torso, J.hip[0], J.hip[1], { id: id + 'torso', pose: pz, rot: -J.P.lean }); if (parts.skirt) place(g, parts.skirt, J.hip[0], J.hip[1], { id: id + 'skirt', pose: pz, rot: -J.P.lean * 0.4 }); };
    const hb = hairBack(o.who, J.view);
    const drawHairBack = () => { if (hb) place(g, hb, J.head[0], J.head[1], { id: id + 'hb', pose: pz, rot: -J.headTilt * 0.5 }); };
    const drawHead = () => place(g, headSprite(o.who, J.view, o.expression, blinkAt(o)), J.head[0], J.head[1], { id: id + 'head', pose: pz, rot: -J.headTilt });
    if (J.view === 'side') {
      drawArm(J.armB, 'b', dark); drawLeg(J.legB, 'b', dark); drawHairBack();
      drawLeg(J.legA, 'a', 1); drawTorso(); drawHead(); pin(J.armA.sh); drawArm(J.armA, 'a', 1);
    } else if (J.view === 'front') {
      drawHairBack(); drawLeg(J.legA, 'a', 1); drawLeg(J.legB, 'b', 1); drawTorso();
      drawArm(J.armA, 'a', 1); drawArm(J.armB, 'b', 1); pin(J.armA.sh); pin(J.armB.sh); drawHead();
    } else {
      drawLeg(J.legA, 'a', 1); drawLeg(J.legB, 'b', 1); drawTorso(); drawArm(J.armA, 'a', 1); drawArm(J.armB, 'b', 1); drawHead(); drawHairBack();
    }
    g.restore();
    if (o.hold && o.hold.draw) o.hold.draw(g, handAt(o, o.holdHand || 'near'), sc);
  }
  function handAt(o, which = 'near') {
    o = Object.assign({ who: 'him', size: 400, facing: 'left', action: 'idle', u: 1, t: 0 }, o);
    const J = solve(o), A = which === 'far' || which === 'right' ? J.armB : J.armA, sc = scaleOf(o), mx = mirror(o);
    const p = add(A.wr, dir(A.f), 8);
    return { x: o.x + p[0] * sc * mx * J.P.sx, y: o.y + p[1] * sc * J.P.sy, angle: A.f * mx };
  }
  function drawHead(g, o) {
    o = Object.assign({ who: 'him', size: 200, facing: 'front', expression: 'neutral', t: 0, pose: 0 }, o);
    const view = viewOf(o), R = SPEC[o.who].headR, sc = o.size / (2 * R);
    g.save(); g.translate(o.x, o.y); g.scale(sc * mirror(o), sc);
    // 表情头像不画背后的长发（会盖住下面的字），头发两侧已经垂到脸颊
    place(g, headSprite(o.who, view, o.expression, !!o.blink), 0, 0, { id: o.who + 'headH', pose: o.pose });
    g.restore();
  }

  // ---------------- 道具（跟着手画） ----------------
  const PROPS = {
    phone: { draw(g, h, sc) { const s = sprite('prop:phone', [-20, -34, 20, 34], (a) => { a.fillStyle = '#20232E'; a.fill(rrect(-20, -34, 40, 68, 7)); a.fillStyle = '#CFEFFA'; a.fill(rrect(-15, -27, 30, 52, 3)); }, { border: 5, thick: 2 }); place(g, s, h.x, h.y - 22 * sc, { sx: sc, sy: sc, rot: -0.2 }); } },
    bowl: { draw(g, h, sc) { const s = sprite('prop:bowl', [-60, -36, 60, 46], (a) => { twoTone(a, ell(0, -12, 46, 22), '#FFF8EA', '#EADCBD', -6, -6); twoTone(a, poly([[-58, -2], [58, -2], [44, 32], [18, 44], [-18, 44], [-44, 32]]), '#F2F2F4', '#C9CFDD', -14, -4); a.fillStyle = '#5C77B8'; a.fillRect(-54, 6, 108, 6); }, { border: 7, thick: 3 }); place(g, s, h.x - 6 * sc, h.y - 30 * sc, { sx: sc, sy: sc }); } },
    umbrella: { draw(g, h, sc) {   // 伞杆永远竖直：手握在杆上，伞面在头顶上方
      const s = sprite('prop:umbrella', [-250, -420, 250, 40], (a) => {
        a.fillStyle = '#3A3340'; a.fillRect(-5, -380, 10, 400); a.strokeStyle = '#3A3340'; a.lineWidth = 10; a.lineCap = 'round'; a.beginPath(); a.arc(-18, 20, 18, 0, Math.PI); a.stroke();
        const c = new Path2D(); c.moveTo(-240, -300); for (let i = 0; i <= 6; i++) { const x = -240 + i * 80; c.quadraticCurveTo(x - 40, -320, x, -300); } c.quadraticCurveTo(0, -470, -240, -300); c.closePath();
        twoTone(a, c, '#3E5A78', '#2C4560', -20, -12);
      }, { border: 10, thick: 4 });
      place(g, s, h.x, h.y + 6 * sc, { sx: sc, sy: sc });
    } },
  };

  window.CHAR = { draw, handAt, drawHead, PROPS, SPEC, REF };
})();
