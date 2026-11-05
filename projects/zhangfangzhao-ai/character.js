/* character.js：《唉》的两个主角，像素风（依赖 lib/pixel.js）。
   造型按专辑封面（衣着、发色）和用户给的参考照（他的发型）：
   他 'him'：24 岁，蓬松凌乱的黑发、刘海盖到眉上；黄色短袖 T 恤、牛仔裤、紫色拖鞋。SPEC.him.sleeve = 0 即换成黄背心。
   她 'her'：只在回忆里出现，中等长度的橙红头发，自然垂下、发尾落在肩上（发根深、发尾亮）；白色吊带背心、牛仔裤、白色帆布鞋。
   整个人直接光栅化在 320×240 的逻辑画布上：每段身体一个形状，自动描 1 像素墨蓝轮廓，按光抖动上色。
   骨架算姿势，但时间按一秒 12 张取整、走路固定 4 帧、位置取整 —— 看起来是逐帧换画，不是补间。

   CHAR.draw(G, o)          G = PIX.create() 的缓冲
     o.who        'him' | 'her'
     o.x, o.y     脚底中点（逻辑像素）
     o.size       身高（逻辑像素，中景 ≈ 56，近景可到 120+）
     o.facing     'left' | 'right' | 'front' | 'back'
     o.expression 'neutral' | 'happy' | 'shy' | 'sad' | 'cry'
     o.action     'idle' | 'walk' | 'jump' | 'slump' | 'reach' | 'hug' | 'hold' | 'holdHigh' | 'pat'
                  | 'sit' | 'sitHunch' | 'sitHold' | 'sitSlump' | 'shrug'（只有正面）
                  （侧面全支持；正面/背面支持 idle、walk、jump、slump，正面另有 shrug）
     o.who        'him' | 'her' | 'cam'（海边的路人摄影师）
     动作另有 'kneel'（双膝跪地，侧面）、'shoot'（端相机，侧面）、'wipe'（抬手到对方脸颊，侧面）
     o.u          动作进行到哪 0→1      o.t  全片时间（呼吸、眨眼、走路）
     o.arms, o.armsU  手臂另用一个动作的姿势（比如 action:'walk' + arms:'holdHigh' 边走边撑伞）
     o.seat       坐高（逻辑像素，默认 0.33 × size）
     o.light      (x, y) → 0..1 这一格被照得多亮（镜头给；默认 0.55）
     o.hold       道具 CHAR.PROPS.phone / bowl / umbrella，或任何 { draw(G, hand, o) }
                  伞另有 o.umbrellaW（伞面半宽）、o.umbrellaDX（伞面相对手的偏移）、o.umbrellaH（伞杆长，按 56 身高计）
   CHAR.handAt(o, 'near' | 'far') → { x, y, angle }
   CHAR.drawHead(G, o)      只画头（近景、表情表）：o.x, o.y 头中心，o.r 头半径（≥10 时画细节版五官）
   纯函数：只看参数，不存状态。 */
(function () {
  'use strict';
  const { RAMP, C, clamp, lerp, smooth, rnd } = window.PIX;
  const TAU = Math.PI * 2, REF = 600;
  const SPEC = {
    him: { headR: 66, sw: 60, hw: 34, upper: 108, fore: 92, thigh: 140, shin: 132, armR: [25, 21, 20, 17], legR: [32, 28, 27, 24],
      top: RAMP.tee, sleeve: 0.5, bottom: RAMP.jeans, hair: RAMP.hairHim, shoe: 'slide' },
    her: { headR: 64, sw: 50, hw: 30, upper: 100, fore: 88, thigh: 140, shin: 132, armR: [19, 17, 16, 14], legR: [25, 22, 21, 18],
      top: RAMP.cami, sleeve: 0, bottom: RAMP.jeans, hair: RAMP.hairHer, shoe: RAMP.shoeHer },
    // 路人摄影师：只在海边出现。青灰外套、棕裤、红色棒球帽
    cam: { headR: 64, sw: 58, hw: 34, upper: 106, fore: 90, thigh: 140, shin: 132, armR: [26, 22, 21, 17], legR: [31, 27, 26, 23],
      top: [27, 5, 6], sleeve: 0.95, bottom: [13, 14, 15], hair: [13, 14, 15], shoe: [5, 6, 7] },
  };
  const HIP_Y = -280, TORSO = 175, NECK = 24;
  const dir = (a) => [Math.sin(a), Math.cos(a)];
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const q12 = (t) => Math.floor((t ?? 0) * 12 + 1e-6) / 12;   // 一秒 12 张

  // ---------------- 姿势（侧面朝左为基准；角度 0 = 朝下，负 = 朝前） ----------------
  const SIDE_IDLE = { lean: 0.02, bodyY: 0, tilt: 0.04, as: 0.06, ae: -0.12, bs: -0.06, be: -0.2, ah: -0.03, ak: 0.04, bh: 0.05, bk: 0.03, sx: 1, sy: 1 };
  const FRONT_IDLE = { lean: 0, bodyY: 0, tilt: 0, as: -0.13, ae: 0.06, bs: 0.13, be: -0.06, ah: -0.04, ak: 0, bh: 0.04, bk: 0, sx: 1, sy: 1 };
  const mix = (A, B, u) => { const o = {}; for (const k in A) o[k] = typeof A[k] === 'number' ? lerp(A[k], B[k] ?? A[k], u) : A[k]; for (const k in B) if (!(k in o)) o[k] = B[k]; return o; };
  const over = (A, B) => Object.assign({}, A, B);
  function keys(list, u) { if (u <= list[0][0]) return list[0][1]; for (let i = 1; i < list.length; i++) if (u <= list[i][0]) { const [u0, A] = list[i - 1], [u1, B] = list[i]; return mix(A, B, smooth((u - u0) / (u1 - u0))); } return list[list.length - 1][1]; }
  function poseFor(o, view) {
    const u = clamp(o.u ?? 1), t = q12(o.t), act = o.action || 'idle', side = view === 'side', base = side ? SIDE_IDLE : FRONT_IDLE;
    const seat = (o.seat ?? o.size * 0.33) * REF / o.size;
    if (act === 'walk') {   // 4 帧一循环，一秒 6 帧
      const f = Math.floor(t * 6 + (o.who === 'her' ? 2 : 0)) % 4, s = [1, 0, -1, 0][f], up = [0, 1, 0, 1][f];
      if (!side) return over(base, { bodyY: -14 * up, as: -0.13 - 0.14 * s, bs: 0.13 - 0.14 * s, ak: 0.4 * Math.max(0, s), bk: 0.4 * Math.max(0, -s), liftA: 22 * Math.max(0, s), liftB: 22 * Math.max(0, -s) });
      return over(base, { lean: 0.07, bodyY: -14 * up, ah: -0.45 * s, bh: 0.45 * s, ak: s > 0 ? 0.15 : s < 0 ? 0.6 : 0.35, bk: s < 0 ? 0.15 : s > 0 ? 0.6 : 0.35, as: 0.4 * s, ae: -0.3, bs: -0.4 * s, be: -0.3 });
    }
    if (act === 'jump') {   // 预备 → 腾空 → 落地，各自停几张
      const crouch = over(base, { bodyY: 50, lean: side ? 0.28 : 0, as: side ? 0.55 : -0.5, ae: -0.3, bs: 0.5, be: -0.3, plant: true, sx: 1.05, sy: 0.93 });
      const air = over(base, { bodyY: -190, lean: 0.04, ah: side ? -0.4 : -0.35, ak: side ? 0.9 : 0.5, bh: side ? -0.15 : 0.35, bk: side ? 1.1 : 0.5, as: -2.6, ae: -0.1, bs: side ? -2.4 : 2.6, be: side ? -0.1 : 0.1, sx: 0.97, sy: 1.05 });
      const land = over(crouch, { bodyY: 44, as: -0.9, bs: side ? -0.8 : 0.9, sx: 1.07, sy: 0.92 });
      const st = u < 0.15 ? base : u < 0.32 ? crouch : u < 0.72 ? air : u < 0.88 ? land : base;
      return u >= 0.32 && u < 0.72 ? over(st, { bodyY: -120 - 70 * Math.sin(Math.PI * (u - 0.32) / 0.4) }) : st;
    }
    if (act === 'shrug' && !side) return mix(base, over(base, { as: -0.95, ae: -1.55, bs: 0.95, be: 1.55, tilt: 0.12 }), smooth(u));   // 正面摊手：两只小臂朝上
    if (act === 'slump') return mix(base, over(base, side ? { lean: 0.34, tilt: 0.5, bodyY: 22, as: 0.14, ae: 0.02, bs: 0.04, be: -0.04, plant: true, sy: 0.97 } : { tilt: 0.5, bodyY: 20, as: -0.06, bs: 0.06, ae: 0.02, be: -0.02, plant: true, sy: 0.96 }), smooth(u));
    if (!side) return base;
    if (act === 'kneel') return mix(base, over(base, { lean: 0.3, tilt: 0.55, bodyY: 116, ah: -0.15, ak: 1.6, bh: -0.05, bk: 1.5, as: 0.25, ae: 0, bs: 0.15, be: 0, sy: 0.98 }), smooth(u));   // 双膝跪地，头垂下，手垂着
    if (act === 'shoot') {   // 端相机：u=0 相机在胸前，u=1 举到眼前
      const hold = over(base, { as: -0.38, ae: -1.55, bs: -0.28, be: -1.5 });
      return mix(hold, over(base, { as: -1.6, ae: -2.18, bs: -1.5, be: -2.25, lean: 0.06, tilt: 0.04 }), smooth(u));
    }
    if (act === 'wipe') return mix(base, over(base, { as: -1.4, ae: -1.2, lean: 0.1, tilt: 0.1 }), smooth(u));   // 手抬到对方脸颊的高度
    if (act === 'pat') return mix(base, over(base, { as: -0.42, ae: -2.05, tilt: -0.06 }), smooth(u));     // 手按在胸口
    if (act === 'reach') return mix(base, over(base, { lean: 0.2, tilt: -0.12, as: -1.5, ae: -0.1, bs: -0.25, be: -0.3, plantA: -95, plantB: 45 }), smooth(u));
    if (act === 'hug') return mix(base, over(base, { lean: 0.12, tilt: 0.16, as: -1.3, ae: -1.2, bs: -1.18, be: -1.3 }), smooth(u));
    if (act === 'hold') return mix(base, over(base, { as: -0.38, ae: -1.55, bs: -0.28, be: -1.5, tilt: 0.18 }), smooth(u));
    if (act === 'holdHigh') return mix(base, over(base, { as: -0.75, ae: -1.85, bs: 0.0, be: -0.25, tilt: -0.05 }), smooth(u));
    if (act === 'sit' || act === 'sitHunch' || act === 'sitHold' || act === 'sitSlump' || act === 'sitChin') {
      const sit = over(base, { bodyY: -(seat + 18) - HIP_Y, plantA: -150, plantB: -128, as: -0.45, ae: -0.55, bs: -0.4, be: -0.6, lean: 0.06, tilt: 0.1 });
      if (act === 'sit') return sit;
      if (act === 'sitChin') return mix(sit, over(sit, Object.assign({ lean: 0.35, tilt: 0.02, as: -0.7, ae: -2.5, bs: -0.65, be: -2.45 }, o.chin || {})), smooth(u));   // 坐着，手肘撑在膝盖上托着下巴
      if (act === 'sitHold') return mix(sit, over(sit, { as: -0.38, ae: -1.55, bs: -0.28, be: -1.5, tilt: 0.12 }), smooth(u));
      if (act === 'sitSlump') return mix(sit, over(sit, { lean: 0.95, tilt: 0.75, as: -1.25, ae: -0.55, bs: -1.15, be: -0.6 }), smooth(u));   // 趴在桌上，额头抵着胳膊
      return mix(sit, over(sit, { lean: 0.62, tilt: 0.42, as: -0.72, ae: -1.12, bs: -0.62, be: -1.22 }), smooth(u));
    }
    return base;
  }
  function ik(H, F, L1, L2) {
    const dx = F[0] - H[0], dy = F[1] - H[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
    const b = Math.atan2(dx, dy), al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), h = b - al, K = add(H, dir(h), L1);
    return [h, Math.atan2(F[0] - K[0], F[1] - K[1]) - h];
  }
  const viewOf = (o) => (o.facing === 'front' ? 'front' : o.facing === 'back' ? 'back' : 'side');
  function solve(o) {
    const S = SPEC[o.who], view = viewOf(o), side = view === 'side';
    let P = poseFor(o, view);
    if (o.arms) { const A = poseFor(Object.assign({}, o, { action: o.arms, u: o.armsU ?? 1 }), view); P = Object.assign({}, P, { as: A.as, ae: A.ae, bs: A.bs, be: A.be }); }   // 腿照 action，手照 arms（边走边撑伞）
    if (o.poseFix) P = Object.assign({}, P, o.poseFix);   // 单独覆盖某几个角度（比如只把举伞那只手抬起来）
    const breath = 1 + 0.015 * Math.sin(q12(o.t) * TAU / 3.6 + (o.who === 'her' ? 1 : 0));
    const hip = [0, HIP_Y + P.bodyY], up = [-Math.sin(P.lean), -Math.cos(P.lean)], perp = [Math.cos(P.lean), -Math.sin(P.lean)];
    const shC = add(hip, up, TORSO * breath), neck = add(shC, up, NECK);
    const hl = P.lean + (side ? P.tilt : 0), headUp = [-Math.sin(hl), -Math.cos(hl)];
    const head = add(add(neck, headUp, S.headR * 0.92), [0, side ? 0 : P.tilt * 26]);
    const shA = side ? add(shC, perp, -6) : add(shC, perp, -S.sw), shB = side ? add(add(shC, perp, 8), up, -4) : add(shC, perp, S.sw);
    const hipA = side ? [hip[0] - 6, hip[1]] : [hip[0] - S.hw, hip[1]], hipB = side ? [hip[0] + 6, hip[1]] : [hip[0] + S.hw, hip[1]];
    const arm = (sh, s, e) => { const el = add(sh, dir(s), S.upper), wr = add(el, dir(s + e), S.fore); return { sh, el, wr, s, f: s + e }; };
    let [ah, ak, bh, bk] = [P.ah, P.ak, P.bh, P.bk];
    if (P.plant || P.plantA != null) {
      const fa = [P.plantA ?? (side ? -4 : -S.hw - 4), -10], fb = [P.plantB ?? (side ? 10 : S.hw + 4), -10];
      if (side) { [ah, ak] = ik(hipA, fa, S.thigh, S.shin); [bh, bk] = ik(hipB, fb, S.thigh, S.shin); }
      else { const m = (H, F, g) => { const [h, k] = ik([H[0] * g, H[1]], [F[0] * g, F[1]], S.thigh, S.shin); return [h * g, k * g]; }; [ah, ak] = m(hipA, fa, 1); [bh, bk] = m(hipB, fb, -1); }
    }
    const leg = (hp, h, k, lift = 0) => { const kn = add(add(hp, dir(h), S.thigh), [0, -lift]); return { hp, kn, an: add(kn, dir(h + k), S.shin), h, f: h + k }; };
    return { S, view, side, P, hip, shC, neck, head, hl: side ? hl : 0, armA: arm(shA, P.as, P.ae), armB: arm(shB, P.bs, P.be), legA: leg(hipA, ah, ak, P.liftA || 0), legB: leg(hipB, bh, bk, P.liftB || 0) };
  }
  const blinkAt = (who, t) => { const per = who === 'her' ? 4.3 : 3.7; return ((q12(t) + rnd('blink' + who) * per) % per) < 0.17; };

  // ---------------- 头 ----------------
  // 本地坐标：u 朝"后脑勺"为正（侧面朝左时 u = x - cx），v 朝下为正，单位像素
  function drawHeadAt(G, cx, cy, R, o, view, flip, light) {
    const who = o.who, S = SPEC[who];
    const L = (x, y) => light(x, y);
    const toU = (x) => (x - cx) * flip, toV = (y) => y - cy;
    const big = R >= 10;
    const skinC = (x, y) => G.dith(RAMP.skin, 0.55 + L(x, y) * 0.9 - (toU(x) > 0.3 * R && view !== 'side' ? 0.3 : 0), x, y);
    const hairC = who === 'her' ? (x, y) => G.dith(S.hair, 0.3 + L(x, y) * 1.3 + toV(y) / (R * 3.2), x, y)   // 发根深、发尾亮
      : (x, y) => G.dith(S.hair, 0.3 + L(x, y) * 0.9 - toV(y) / (R * 3), x, y);
    // 她：披散长直发。头发和脸画成同一个剪影（只有外面一圈轮廓，看不到圆脑袋），头发从头顶垂直落到肩上
    let herHair = null;
    const herFront = (v) => v > -0.05 * R ? -0.24 * R : lerp(-0.66 * R, -0.24 * R, smooth((v + 0.6 * R) / (0.55 * R)));   // 侧面头发前沿
    if (who === 'her') {
      const END = 1.85 * R, jag = (u) => (Math.floor((u + 3 * R) / Math.max(2, R * 0.4)) % 2 ? 0.05 * R : 0);
      const cap = (u, v) => v <= 0.2 * R && (u / (1.06 * R)) ** 2 + (v / (1.06 * R)) ** 2 <= 1;                     // 头顶的头发比脑袋大一圈
      herHair = view === 'side'
        ? (u, v) => cap(u, v) || (u > -0.24 * R && u < 0.98 * R && v > -0.2 * R && v < END - jag(u))                 // 侧面：前沿、后沿都是竖直的，一整片垂到肩上，只露出前面一条脸
        : view === 'back'
          ? (u, v) => cap(u, v) || (Math.abs(u) < 1.04 * R && v > -0.2 * R && v < END + 0.05 * R - jag(u))
          : (u, v) => cap(u, v) || (Math.abs(u) > 0.7 * R && Math.abs(u) < 1.06 * R && v > -0.4 * R && v < END - jag(u));   // 正面：两片贴着脸颊竖直垂到肩上
    }
    // 耳朵（正面、背面两边各一个）
    if (view !== 'side' && who !== 'her') [-1, 1].forEach((s) => G.ellipse(cx + s * R * 0.98, cy + R * 0.1, Math.max(0.8, R * 0.16), Math.max(1, R * 0.24), skinC, 0));
    // 脸 + 头发（一个形状里分区上色，外面一圈轮廓）
    const face = view === 'side' ? (u, v) => (u / (0.95 * R)) ** 2 + (v / R) ** 2 <= 1 || (u < -0.8 * R && u > -1.08 * R && v > -0.05 * R && v < 0.3 * R && u > -0.8 * R - (v + 0.05 * R) * 0.9)
      : (u, v) => (u / R) ** 2 + (v / (1.02 * R)) ** 2 <= 1;
    let hair;
    if (view === 'back') hair = () => true;
    else if (who === 'him') {
      const zig = (u) => (Math.floor((u + 3 * R) / Math.max(1.5, R * 0.28)) % 3) * 0.09 * R;
      hair = view === 'side'
        ? (u, v) => v < -0.3 * R || (u > 0.05 * R && v < 0.5 * R - Math.max(0, 0.5 * R - u) * 0.3) || (u < -0.3 * R && v < -0.02 * R - zig(u))
        : (u, v) => v < -0.06 * R - zig(u) || (Math.abs(u) > 0.8 * R && v < 0.2 * R);
    }
    else hair = view === 'side'
      ? (u, v) => v < -0.6 * R || u > herFront(v)                                                                     // 侧面：发际线从额头往后弯到脸颊，再竖直往下
      : (u, v) => v < -0.6 * R + Math.abs(u) * 0.55 || Math.abs(u) > 0.7 * R;   // 中分，没有刘海，两边的头发贴着脸颊
    // 他的蓬发：比头大一圈、边上一簇一簇翘起来；先垫在脸后面，画完脸再把脸上沿的轮廓线盖掉
    const blob = (u, v) => { const yy = v + 0.16 * R, a = Math.atan2(yy, u), b = 1 + 0.09 * Math.sin(a * 9 + 0.7) + 0.05 * Math.sin(a * 14);
      const lim = view === 'side' ? (v < -0.05 * R || (u > 0 && v < 0.45 * R)) : v < 0.12 * R;
      return lim && (u / (1.1 * R)) ** 2 + (yy / (1.0 * R)) ** 2 <= b * b; };
    const hb = [cx - 1.4 * R, cy - 1.4 * R, cx + 1.4 * R, cy + 1.2 * R];
    if (who === 'him') G.shape(hb, (x, y) => blob(toU(x), toV(y)), hairC, 0);
    if (herHair) G.shape([cx - 1.3 * R, cy - 1.2 * R, cx + 1.3 * R, cy + 2.0 * R], (x, y) => { const u = toU(x), v = toV(y); return face(u, v) || herHair(u, v); },
      (x, y) => { const u = toU(x), v = toV(y); if (face(u, v) && !hair(u, v)) return skinC(x, y);
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const u2 = toU(x + dx), v2 = toV(y + dy); return face(u2, v2) && !hair(u2, v2); });
        if (edge && R >= 8) return S.hair[0];
        if (R >= 10 && v > -0.3 * R && ((x + 1000) % Math.max(3, Math.round(R * 0.32))) === 0 && (y + x) % 5 !== 0) return S.hair[0];   // 竖着的发丝
        return hairC(x, y); }, 0);
    else G.shape([cx - 1.2 * R, cy - 1.1 * R, cx + 1.2 * R, cy + 1.1 * R], (x, y) => face(toU(x), toV(y)), (x, y) => (hair(toU(x), toV(y)) ? hairC(x, y) : skinC(x, y)), 0);
    if (who === 'him') G.shape(hb, (x, y) => { const u = toU(x), v = toV(y); return blob(u, v) && (hair(u, v) || !face(u, v)); }, hairC, null);
    if (who === 'cam') G.shape([cx - 1.6 * R, cy - 1.3 * R, cx + 1.6 * R, cy], (x, y) => { const u = toU(x), v = toV(y);
      return (v < -0.26 * R && (u / (1.06 * R)) ** 2 + ((v + 0.05 * R) / (1.08 * R)) ** 2 <= 1) || (view === 'side' && v >= -0.44 * R && v < -0.24 * R && u < -0.3 * R && u > -1.55 * R) || (view === 'front' && v >= -0.42 * R && v < -0.24 * R && Math.abs(u) < 1.2 * R); },
      (x, y) => G.dith([30, 31], 0.5 + L(x, y), x, y), 0);   // 红色棒球帽，帽檐朝前
    if (who === 'her' && view === 'front' && R >= 6) G.line(cx, cy - Math.round(R * 1.0), cx, cy - Math.round(R * 0.6), S.hair[0]);   // 中分的分线
    if (view === 'side' && who !== 'her') G.ellipse(cx + flip * R * 0.16, cy + R * 0.12, Math.max(0.8, R * 0.13), Math.max(1, R * 0.2), (x, y) => G.dith(RAMP.skin, 0.3 + L(x, y) * 0.6, x, y), 0);   // 侧面的耳朵
    if (view === 'back') return;
    // 五官
    const ex = view === 'side' ? [-0.5 * R] : [-0.36 * R, 0.36 * R], ey = cy + Math.round(0.12 * R);
    const mU = view === 'side' ? -0.66 * R : 0, my = cy + Math.round(0.52 * R);
    const X = (u) => Math.round(cx + flip * u);
    const e = o.expression || 'neutral', blink = o.blink ?? blinkAt(who, o.t);
    ex.forEach((eu) => {
      const x = X(eu), inner = view === 'side' ? -flip : (eu < 0 ? 1 : -1);   // 眉毛内侧方向
      if (!big) {
        if (e === 'happy') { G.px(x - 1, ey, 0); G.px(x, ey - 1, 0); G.px(x + 1, ey, 0); }
        else if (blink || e === 'shy') { G.px(x, ey, 0); G.px(x + (view === 'side' ? -flip : 1), ey, 0); }
        else { G.px(x, ey, 0); if (R >= 7) G.px(x, ey - 1, 0); }
        if (e === 'sad' || e === 'cry') { G.px(x + inner, ey - 3, 0); G.px(x, ey - 2, 0); }
        if (e === 'cry') { G.px(x, ey + 2, C.phone); G.px(x, ey + 3, C.phone); }
        if (e === 'shy' || e === 'happy') G.px(x - inner * (view === 'side' ? 0 : 1), ey + 2, C.blush);
        return;
      }
      const s = R / 14;   // 细节版：头半径 14 时的像素尺寸
      if (e === 'happy') { for (let k = -2; k <= 2; k++) G.px(x + Math.round(k * s), ey - Math.round((2 - Math.abs(k) * 0.9) * s * 0.7), 0); }
      else if (blink || e === 'shy') { G.line(x - Math.round(1.6 * s), ey + 1, x + Math.round(1.6 * s), ey + 1, 0); }
      else { G.ellipse(x, ey, Math.max(1, 1.2 * s), Math.max(1.4, 1.9 * s), 0, null); G.px(x - Math.round(0.5 * s), ey - Math.round(0.9 * s), C.white); }
      if (e === 'sad' || e === 'cry') G.line(x + inner * Math.round(2 * s), ey - Math.round(3.2 * s), x - inner * Math.round(1.6 * s), ey - Math.round(4.4 * s), 0);
      if (e === 'cry') { G.ellipse(x - inner * Math.round(0.4 * s), ey + Math.round(3.6 * s), Math.max(1, 0.9 * s), Math.max(1.2, 1.4 * s), C.phone, 0); }
      if (e === 'shy' || e === 'happy') G.ellipse(x - inner * Math.round(1.2 * s) * (view === 'side' ? 0 : 1), ey + Math.round(2.8 * s), 2.2 * s, 1 * s, (xx, yy) => G.dith([C.skin, C.blush], e === 'shy' ? 1.1 : 0.7, xx, yy), null);
    });
    const mx = X(mU), w = big ? Math.max(1, Math.round(R * 0.14)) : 1;
    if (e === 'happy') { G.line(mx - w, my - 1, mx, my + (big ? 1 : 0), C.skinDk); G.line(mx, my + (big ? 1 : 0), mx + w, my - 1, C.skinDk); if (big) G.px(mx, my, 31); }
    else if (e === 'sad' || e === 'cry') { G.line(mx - w, my + 1, mx, my, C.skinDk); G.line(mx, my, mx + w, my + 1, C.skinDk); }
    else if (e === 'shy') { G.px(mx - 1, my, C.skinDk); G.px(mx + 1, my, C.skinDk); if (big) G.px(mx, my - 1, C.skinDk); }
    else G.line(mx - (big ? w : 0), my, mx + w * (view === 'side' ? 0 : 1), my, C.skinDk);
  }

  // ---------------- 画一个人 ----------------
  function draw(G, o) {
    o = Object.assign({ who: 'him', size: 56, facing: 'left', expression: 'neutral', action: 'idle', u: 1, t: 0 }, o);
    const light = o.light || (() => 0.55);
    const J = solve(o), S = o.outfit === 'rider' ? Object.assign({}, J.S, { sleeve: 0.98 }) : J.S, k = o.size / REF, mx = o.facing === 'right' ? -1 : 1, ox = Math.round(o.x), oy = Math.round(o.y);
    const W = (p) => [ox + p[0] * k * mx * J.P.sx, oy + p[1] * k * J.P.sy];
    const shade = (ramp, base, gain = 1.4) => (x, y) => G.dith(ramp, base + light(x, y) * gain, x, y);
    const r = (v) => Math.max(1, v * k);
    const drawArm = (A, far) => {
      const sk = shade(RAMP.skin, far ? 0.1 : 0.5, 0.9);
      G.limb(W(A.sh), W(A.el), r(S.armR[0]), r(S.armR[1]), sk);
      G.limb(W(A.el), W(A.wr), r(S.armR[2]), r(S.armR[3]), sk);
      const hd = W(add(A.wr, dir(A.f), 6)); G.ellipse(hd[0], hd[1], r(S.armR[3] + 2), r(S.armR[3] + 3), sk, 0);
      if (S.sleeve > 0) { const m = add(A.sh, dir(A.s), S.upper * S.sleeve); G.limb(W(A.sh), W(m), r(S.armR[0] + 6), r(S.armR[0] + 4), shade(S.top, far ? 0.2 : 0.75, 1.3)); }
    };
    const drawLeg = (Lg, far) => {
      const b = shade(S.bottom, far ? 0 : 0.35, 1.0);
      const an = W(Lg.an);
      const toe = mx, sk = shade(RAMP.skin, far ? 0.1 : 0.45, 0.8);
      if (S.shoe === 'slide') {
        if (J.side) {
          G.poly([[an[0] - toe * r(54), an[1] - r(4)], [an[0] + toe * r(16), an[1] - r(10)], [an[0] + toe * r(18), an[1] + r(10)], [an[0] - toe * r(58), an[1] + r(10)]], sk, 0);
          G.poly([[an[0] - toe * r(46), an[1] - r(8)], [an[0] - toe * r(6), an[1] - r(12)], [an[0] - toe * r(4), an[1] + r(6)], [an[0] - toe * r(48), an[1] + r(6)]], shade(RAMP.slide, far ? 0.2 : 0.8, 0.6), 0);
          G.line(an[0] - toe * r(62), an[1] + r(14), an[0] + toe * r(22), an[1] + r(14), C.slipper);
        } else { G.ellipse(an[0], an[1] + r(4), r(24), r(12), sk, 0); G.rect(Math.round(an[0] - r(22)), Math.round(an[1] - r(2)), Math.round(r(44)), Math.max(1, Math.round(r(9))), C.slipper); G.line(an[0] - r(26), an[1] + r(16), an[0] + r(26), an[1] + r(16), C.slipper); }
      } else if (J.side) G.poly([[an[0] - toe * r(56), an[1] - r(10)], [an[0] + toe * r(20), an[1] - r(12)], [an[0] + toe * r(22), an[1] + r(14)], [an[0] - toe * r(60), an[1] + r(14)]], shade(S.shoe, far ? 0.2 : 0.6, 1.2), 0);
      else G.ellipse(an[0], an[1] + r(4), r(28), r(14), shade(S.shoe, 0.6, 1.2), 0);
      G.limb(W(Lg.kn), W(Lg.an), r(S.legR[2]), r(S.legR[3]), b);
      G.limb(W(Lg.hp), W(Lg.kn), r(S.legR[0]), r(S.legR[1]), b);
    };
    const rot = (p) => { const th = -J.P.lean, c = Math.cos(th), s = Math.sin(th); return W([J.hip[0] + p[0] * c - p[1] * s, J.hip[1] + p[0] * s + p[1] * c]); };
    const toLocal = (x, y) => { const dx = (x - ox) / (k * mx * J.P.sx) - J.hip[0], dy = (y - oy) / (k * J.P.sy) - J.hip[1], c = Math.cos(J.P.lean), s = Math.sin(J.P.lean); return [dx * c - dy * s, dx * s + dy * c]; };
    const drawTorso = () => {
      const side = J.side, sw = side ? 40 : S.sw + 8, hw = side ? 34 : S.hw + 12;
      const body = [[-hw, 18], [hw, 18], [hw + 4, -40], [sw, -TORSO + 20], [sw - 16, -TORSO - 4], [-sw + 16, -TORSO - 4], [-sw, -TORSO + 20], [-hw - 4, -40]].map(rot);
      const top = shade(S.top, o.who !== 'her' ? 0.6 : 0.5, 1.5), skin = shade(RAMP.skin, 0.45, 0.9), jeans = shade(S.bottom, 0.35, 1.0);
      let col;
      if (o.who !== 'her') col = (x, y) => {
        const [lx, ly] = toLocal(x, y);
        if (!side && J.view === 'front' && Math.abs(lx) < 24 && ly < -TORSO + 2 + 16 * (1 - (lx / 24) ** 2)) return skin(x, y);           // 圆领
        if (S.sleeve === 0 && !side && Math.abs(lx) > sw - 18 && ly < -TORSO + 70) return skin(x, y);                                      // 背心的袖窿
        return top(x, y);
      };
      else col = (x, y) => {
        const [lx, ly] = toLocal(x, y);
        if (ly > 4) return jeans(x, y);                                                                                                     // 吊带塞进牛仔裤
        const strap = side ? Math.abs(lx) < 7 : Math.abs(Math.abs(lx) - S.sw * 0.55) < 7;
        if (ly < -TORSO + 42 && !strap) return skin(x, y);                                                                                  // 露肩
        return top(x, y);
      };
      G.poly(body, col, 0);
      if (o.who !== 'her') { const h0 = rot([-hw, 12]), h1 = rot([hw, 12]); G.line(h0[0], h0[1], h1[0], h1[1], S.top[0]); }               // 下摆
    };
    const drawHead = () => { const h = W(J.head); drawHeadAt(G, h[0], h[1] - (J.P.tilt > 0.3 && J.side ? 0 : 0), S.headR * k, o, J.view, mx, light); };
    const neck = () => { const a = W(J.neck), b = W(add(J.neck, [0, 20])); G.limb(a, b, r(16), r(16), shade(RAMP.skin, 0.2, 0.8), null); };
    if (J.view === 'side' && o.who === 'her') { drawArm(J.armB, true); drawLeg(J.legB, true); drawLeg(J.legA, false); neck(); drawTorso(); drawArm(J.armA, false); drawHead(); }
    else if (J.view === 'side') { drawArm(J.armB, true); drawLeg(J.legB, true); drawLeg(J.legA, false); neck(); drawTorso(); drawHead(); drawArm(J.armA, false); }
    else if (J.view === 'front') { drawLeg(J.legA, false); drawLeg(J.legB, false); neck(); drawTorso(); drawArm(J.armA, false); drawArm(J.armB, false); drawHead(); }
    else { drawLeg(J.legA, false); drawLeg(J.legB, false); drawTorso(); drawArm(J.armA, false); drawArm(J.armB, false); drawHead(); }
    if (o.outfit === 'rider') {   // 外卖头盔：黄色半圆壳，下沿一圈深色，侧面前面一块深色护目
      const h = W(J.head), R = S.headR * k, cx = h[0], cy = h[1], fx = J.view === 'side' ? -mx : 0;
      G.shape([cx - 1.4 * R, cy - 1.5 * R, cx + 1.4 * R, cy + 0.3 * R], (x, y) => { const u = (x - cx) / (1.16 * R), v = (y - cy + 0.14 * R) / (1.12 * R); return v <= 0.2 && u * u + v * v <= 1; },
        (x, y) => { const u = (x - cx) / (1.16 * R), v = (y - cy + 0.14 * R) / (1.12 * R); if (v > 0.06) return 13; if (fx && u * fx > 0.55 && v > -0.45) return 2; return G.dith([25, 23, 24], 1.0 + light(x, y) * 1.3 - v * 0.8, x, y); }, 0);
    }
    if (o.earbud && J.view === 'side') { const h = W(J.head), R = S.headR * k; G.px(Math.round(h[0] + mx * R * 0.16), Math.round(h[1] + R * 0.3), 8); }   // 一只耳机
    if (o.hold && o.hold.draw) o.hold.draw(G, handAt(o, o.holdHand || 'near'), o);
  }
  function handAt(o, which = 'near') {
    o = Object.assign({ who: 'him', size: 56, facing: 'left', action: 'idle', u: 1, t: 0 }, o);
    const J = solve(o), A = which === 'far' ? J.armB : J.armA, k = o.size / REF, mx = o.facing === 'right' ? -1 : 1;
    const p = add(A.wr, dir(A.f), 8);
    return { x: Math.round(o.x + p[0] * k * mx * J.P.sx), y: Math.round(o.y + p[1] * k * J.P.sy), angle: A.f * mx };
  }
  function drawHead(G, o) {
    o = Object.assign({ who: 'him', r: 14, facing: 'front', expression: 'neutral', t: 0 }, o);
    drawHeadAt(G, Math.round(o.x), Math.round(o.y), o.r, o, viewOf(o), o.facing === 'right' ? -1 : 1, o.light || (() => 0.6));
  }

  // ---------------- 道具 ----------------
  const PROPS = {
    phone: { draw(G, h, o) { const s = Math.max(1, Math.round(o.size / 56)); G.rect(h.x - 2 * s, h.y - 5 * s, 4 * s, 6 * s, C.ink); G.rect(h.x - s, h.y - 4 * s, 2 * s, 4 * s, C.phone); } },
    bowl: { draw(G, h, o) { const k = o.size / 56, y = h.y - Math.round(3 * k); G.poly([[h.x - 5 * k, y - 2 * k], [h.x + 5 * k, y - 2 * k], [h.x + 3 * k, y + 2 * k], [h.x - 3 * k, y + 2 * k]], (x, yy) => G.dith(RAMP.porcelain, 2.2, x, yy), 0); G.ellipse(h.x, y - 2.6 * k, 4 * k, 1.6 * k, C.cream, 0); } },
    umbrella: { draw(G, h, o) {   // 伞杆竖直，手握在杆上
      const k = o.size / 56, top = h.y - Math.round((o.umbrellaH ?? 30) * k), w = Math.round(o.umbrellaW ?? 22 * k), cx = h.x + Math.round(o.umbrellaDX || 0), dh = Math.max(11 * k, w * 0.42);
      G.line(h.x, h.y + 2, cx, top, C.ink); G.px(h.x - 1, h.y + 3, C.ink); G.px(h.x - 2, h.y + 2, C.ink);   // 伞杆（伞面偏过去时斜着）
      G.shape([cx - w - 1, top - dh - 1, cx + w + 1, top + 3], (x, y) => { const dx = (x - cx) / w, dy = (y - top) / dh; return dx * dx + dy * dy <= 1 && y <= top + 1 - Math.abs(Math.sin((x - cx) / w * Math.PI * 4)) * 2 * Math.max(1, k); }, (x, y) => G.dith([2, 3, 4], 1.2 - (y - top) / dh - (x - cx) / (w * 2), x, y), 0);
      for (const f of [-0.5, 0, 0.5]) G.line(cx, top - dh + 1, cx + Math.round(f * w), top, (x, y) => G.dith([1, 2], 1.2, x, y));   // 伞骨
      G.px(cx, top - dh - 1, C.ink);
    } },
  };
  function headAt(o) {   // 头的中心和半径（画眼泪、头顶冒字用）
    o = Object.assign({ who: 'him', size: 56, facing: 'left', action: 'idle', u: 1, t: 0 }, o);
    const J = solve(o), k = o.size / REF, mx = o.facing === 'right' ? -1 : 1;
    return { x: Math.round(o.x + J.head[0] * k * mx * J.P.sx), y: Math.round(o.y + J.head[1] * k * J.P.sy), r: SPEC[o.who].headR * k, flip: mx };
  }
  window.CHAR = { draw, handAt, headAt, drawHead, PROPS, SPEC, REF };
})();
