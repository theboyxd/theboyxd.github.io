/* Instant AR · rastreio da mesa (posição do celular) sem bibliotecas — fusão visão + giroscópio.
 *
 * O giroscópio dá a rotação da câmera, mas com erro (viés de décimos de grau e atraso em relação ao vídeo).
 * Aqui medimos o movimento da textura da mesa e resolvemos, ao mesmo tempo:
 *   - t  : translação do celular (metros)  — escala definida pela altura assumida d do celular sobre a mesa;
 *   - w  : pequena correção de rotação sobre o giroscópio (absorve viés/atraso e mantém o prato colado na mesa).
 * Modelo (pontos num plano horizontal, normal n e altura d conhecidas):  r1 ~ Rw (Rg r0 - t (n.r0)/d),
 * linear em (t, w) para w pequeno; RANSAC + mínimos quadrados com um a priori fraco sobre w.
 *
 * Passos: cantos Shi-Tomasi só onde a imagem olha para baixo (a mesa) -> Lucas-Kanade piramidal sem sensibilidade
 * a brilho (média removida), começando da posição prevista pelo giroscópio -> pose contra um QUADRO-CHAVE.
 *
 * Navegador: window.IARTrack. Node: require. Testes: tests/iar_track.test.cjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./iar-math.js'));
  else root.IARTrack = factory(root.IARMath);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  const mulMV = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];

  // ---------------- imagem ----------------
  function toGray(rgba, n) {
    const g = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = rgba[j] * 0.299 + rgba[j + 1] * 0.587 + rgba[j + 2] * 0.114;
    return g;
  }
  function downsample(src, w, h) {
    const w2 = w >> 1, h2 = h >> 1, out = new Float32Array(w2 * h2);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
      const i = (2 * y) * w + 2 * x;
      out[y * w2 + x] = (src[i] + src[i + 1] + src[i + w] + src[i + w + 1]) * 0.25;
    }
    return { data: out, w: w2, h: h2 };
  }
  function buildPyramid(gray, w, h, levels) {
    const pyr = [{ data: gray, w, h }];
    for (let l = 1; l < levels; l++) {
      const p = pyr[l - 1];
      if (p.w < 64 || p.h < 64) break; // níveis pequenos demais não comportam a janela do LK
      pyr.push(downsample(p.data, p.w, p.h));
    }
    return pyr;
  }
  function sample(img, x, y) {
    const { data, w, h } = img;
    if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) return NaN;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return data[i] * (1 - fx) * (1 - fy) + data[i + 1] * fx * (1 - fy) + data[i + w] * (1 - fx) * fy + data[i + w + 1] * fx * fy;
  }

  // ---------------- cantos ----------------
  function detectCorners(img, mask, maxN, cell, margin, existing, rel) {
    const { data, w, h } = img;
    const lam = new Float32Array(w * h), ix = new Float32Array(w * h), iy = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      ix[i] = (data[i + 1] - data[i - 1]) * 0.5; iy[i] = (data[i + w] - data[i - w]) * 0.5;
    }
    let any = false;
    for (let y = margin; y < h - margin; y++) for (let x = margin; x < w - margin; x++) {
      if (mask && !mask(x, y)) continue;
      let a = 0, b = 0, c = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const i = (y + dy) * w + (x + dx), gx = ix[i], gy = iy[i];
        a += gx * gx; b += gx * gy; c += gy * gy;
      }
      lam[y * w + x] = (a + c) / 2 - Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b);
      any = true;
    }
    if (!any) return [];
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const cand = new Array(cols * rows).fill(null);
    for (let y = margin; y < h - margin; y++) for (let x = margin; x < w - margin; x++) {
      const l = lam[y * w + x];
      if (l < 30) continue; // piso absoluto: ignora regiões lisas
      const k = ((y / cell) | 0) * cols + ((x / cell) | 0);
      if (!cand[k] || l > cand[k].l) cand[k] = { x, y, l };
    }
    // limiar relativo ao NÍVEL DE TEXTURA da própria mesa (mediana dos melhores cantos por célula), não ao canto mais forte
    const ls = cand.filter(Boolean).map((c) => c.l).sort((p, q) => p - q);
    if (!ls.length) return [];
    const thr = Math.max(30, (rel == null ? 0.6 : rel) * ls[ls.length >> 1]);
    const taken = new Uint8Array(cols * rows);
    for (const p of existing || []) taken[((p.y / cell) | 0) * cols + ((p.x / cell) | 0)] = 1;
    return cand.filter((c, k) => c && c.l >= thr && !taken[k]).sort((p, q) => q.l - p.l).slice(0, maxN).map((c) => ({ x: c.x, y: c.y }));
  }

  // ---------------- Lucas-Kanade (um ponto, pirâmide, média removida => tolera mudança de brilho) ----------------
  function lkTrack(prev, curr, pt, guess, win, iters) {
    const L = Math.min(prev.length, curr.length), side = win * 2 + 1, nPix = side * side;
    const v0 = new Float32Array(nPix), v1 = new Float32Array(nPix), gxs = new Float32Array(nPix), gys = new Float32Array(nPix);
    let gx = guess.x - pt.x, gy = guess.y - pt.y;
    for (let l = L - 1; l >= 0; l--) {
      const s = 1 / (1 << l), P = prev[l], C = curr[l];
      const px = pt.x * s, py = pt.y * s;
      let dx = gx * s, dy = gy * s;
      // patch de referência (e gradientes) uma vez por nível
      let m0 = 0, k = 0;
      for (let wy = -win; wy <= win; wy++) for (let wx = -win; wx <= win; wx++, k++) {
        const x = px + wx, y = py + wy, I0 = sample(P, x, y);
        const g1 = sample(P, x + 1, y), g2 = sample(P, x - 1, y), g3 = sample(P, x, y + 1), g4 = sample(P, x, y - 1);
        v0[k] = I0; gxs[k] = (g1 - g2) * 0.5; gys[k] = (g3 - g4) * 0.5;
        m0 += I0;
      }
      if (m0 !== m0) return null;
      m0 /= nPix;
      for (let it = 0; it < iters; it++) {
        let m1 = 0; k = 0;
        for (let wy = -win; wy <= win; wy++) for (let wx = -win; wx <= win; wx++, k++) {
          const I1 = sample(C, px + wx + dx, py + wy + dy);
          v1[k] = I1; m1 += I1;
        }
        if (m1 !== m1) return null;
        m1 /= nPix;
        let a = 0, b = 0, c = 0, e1 = 0, e2 = 0;
        for (k = 0; k < nPix; k++) {
          const dI = (v0[k] - m0) - (v1[k] - m1), gxx = gxs[k], gyy = gys[k];
          a += gxx * gxx; b += gxx * gyy; c += gyy * gyy; e1 += gxx * dI; e2 += gyy * dI;
        }
        const det = a * c - b * b;
        if (det < 1e-3 * nPix) return null;
        const ux = (c * e1 - b * e2) / det, uy = (a * e2 - b * e1) / det;
        dx += ux; dy += uy;
        if (Math.abs(ux) < 0.02 && Math.abs(uy) < 0.02) break;
      }
      gx = dx / s; gy = dy / s;
    }
    const out = { x: pt.x + gx, y: pt.y + gy };
    // resíduo fotométrico (sem brilho médio) no nível 0
    let err = 0, n = 0, a0 = 0, a1 = 0;
    const pairs = [];
    for (let wy = -win; wy <= win; wy++) for (let wx = -win; wx <= win; wx++) {
      const I0 = sample(prev[0], pt.x + wx, pt.y + wy), I1 = sample(curr[0], out.x + wx, out.y + wy);
      if (I0 === I0 && I1 === I1) { pairs.push(I0, I1); a0 += I0; a1 += I1; n++; }
    }
    if (n < nPix * 0.6) return null;
    a0 /= n; a1 /= n;
    for (let i = 0; i < pairs.length; i += 2) err += Math.abs((pairs[i] - a0) - (pairs[i + 1] - a1));
    return err / n > 24 ? null : out;
  }

  // ---------------- álgebra pequena ----------------
  function solveN(A, b, n) { // eliminação gaussiana com pivô; A: Float64Array n*n, b: n
    const M2 = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n + 1); for (let j = 0; j < n; j++) r[j] = A[i * n + j]; r[n] = b[i]; return r; });
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
      if (Math.abs(M2[p][c]) < 1e-14) return null;
      [M2[c], M2[p]] = [M2[p], M2[c]];
      for (let r = c + 1; r < n; r++) {
        const f = M2[r][c] / M2[c][c];
        for (let k = c; k <= n; k++) M2[r][k] -= f * M2[c][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = M2[r][n];
      for (let k = r + 1; k < n; k++) s -= M2[r][k] * x[k];
      x[r] = s / M2[r][r];
    }
    return x;
  }

  function buildObs(pairs, Rrel, n0, d0, f, cx, cy) {
    return pairs.map((p, idx) => {
      const r0 = [(p.x0 - cx) / f, (p.y0 - cy) / f, 1], r1 = [(p.x1 - cx) / f, (p.y1 - cy) / f, 1];
      return { r1, a: mulMV(Rrel, r0), beta: (n0[0] * r0[0] + n0[1] * r0[1] + n0[2] * r0[2]) / d0, x1: p.x1, y1: p.y1, idx };
    });
  }

  /** Um passo linear: r1 x (a - t beta + w x a) = 0  ->  [-beta [r1]x | (r1.a)I - a r1^T] [t; w] = -(r1 x a). */
  function linStep(list, lamW) {
    const N = new Float64Array(36), rhs = new Float64Array(6), row = new Float64Array(6);
    for (const o of list) {
      const r = o.r1, a = o.a, b = o.beta, ra = r[0] * a[0] + r[1] * a[1] + r[2] * a[2];
      const sk = [[0, -r[2], r[1]], [r[2], 0, -r[0]], [-r[1], r[0], 0]];
      const rxa = [r[1] * a[2] - r[2] * a[1], r[2] * a[0] - r[0] * a[2], r[0] * a[1] - r[1] * a[0]];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) { row[j] = -b * sk[i][j]; row[3 + j] = (i === j ? ra : 0) - a[i] * r[j]; }
        const bi = -rxa[i];
        for (let p = 0; p < 6; p++) { rhs[p] += row[p] * bi; for (let q = 0; q < 6; q++) N[p * 6 + q] += row[p] * row[q]; }
      }
    }
    for (let k = 0; k < 3; k++) { N[(3 + k) * 6 + (3 + k)] += lamW; N[k * 6 + k] += 1e-9; }
    return solveN(N, rhs, 6);
  }

  /** (t, Rw) por Gauss-Newton de 2 passos. Modelo: r1 ~ Rw (a - t beta). */
  function fit(list, lamW) {
    const u = linStep(list, lamW);
    if (!u) return null;
    const R1 = M.rodrigues([u[3], u[4], u[5]]);
    const list2 = list.map((o) => ({ r1: o.r1, beta: o.beta, a: mulMV(R1, o.a) }));
    const u2 = linStep(list2, lamW);
    if (!u2) return { t: [u[0], u[1], u[2]], Rw: R1 };
    return { t: [u2[0], u2[1], u2[2]], Rw: M.m3mul(M.rodrigues([u2[3], u2[4], u2[5]]), R1) };
  }

  function reproj(o, t, Rw, f, cx, cy) {
    const w = mulMV(Rw, [o.a[0] - t[0] * o.beta, o.a[1] - t[1] * o.beta, o.a[2] - t[2] * o.beta]);
    if (w[2] < 1e-6) return 1e9;
    return Math.hypot(cx + (f * w[0]) / w[2] - o.x1, cy + (f * w[1]) / w[2] - o.y1);
  }

  /**
   * pairs: [{x0,y0,x1,y1}] do quadro-chave para o atual; Rrel: rotação cam-chave -> cam-atual PELO GIROSCÓPIO (3x3, CV);
   * n0: normal do plano (para cima) no sistema da câmera-chave; d0: altura da câmera-chave sobre a mesa (m).
   * -> { t (m, sistema da câmera atual), Rw (correção de rotação), inliers, total, rms, inlierIdx, omegaDeg }
   */
  function estimatePose(pairs, Rrel, n0, d0, f, cx, cy, opts) {
    const o = opts || {}, tol = o.pxTol || 1.6, iters = o.iters || 70;
    // a priori sobre a correção de rotação w: começa confiando no giroscópio (translação precisa) e só afrouxa
    // quando os dados pedem uma correção grande (deriva real do giroscópio). Rotação x translação lateral são quase
    // indistinguíveis numa mesa vista de cima: sem esse freio, parte do movimento real viraria "rotação" falsa.
    const sMin = o.sigmaW || 0.006, sMax = o.sigmaMax || sMin; // medido: 0,006 equilibra posição (≈5%) e correção do giroscópio (≈0,3°)
    const lamOf = (sg) => Math.pow((1 / f) / sg, 2);
    const obs = buildObs(pairs, Rrel, n0, d0, f, cx, cy);
    if (obs.length < 8) return null;
    let best = null, bestCount = 0, seed = 987654321;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const lamRansac = lamOf(0.008);
    for (let it = 0; it < iters; it++) {
      const s = [];
      while (s.length < 4) { const c = obs[(rnd() * obs.length) | 0]; if (!s.includes(c)) s.push(c); }
      const m = fit(s, lamRansac);
      if (!m || Math.hypot(...m.t) > 0.6 || M.rotAngle(m.Rw) > 6 * M.D2R) continue;
      let c = 0;
      for (const ob of obs) if (reproj(ob, m.t, m.Rw, f, cx, cy) < tol * 2) c++;
      if (c > bestCount) { bestCount = c; best = m; }
    }
    if (!best) return null;
    let model = best, inl = obs.filter((ob) => reproj(ob, model.t, model.Rw, f, cx, cy) < tol * 2);
    const rmsOf = (m, list) => Math.sqrt(list.reduce((acc, ob) => acc + reproj(ob, m.t, m.Rw, f, cx, cy) ** 2, 0) / Math.max(1, list.length));
    // escolhe o MENOR a priori (giroscópio mais confiável) cujo resíduo ainda é praticamente o melhor possível:
    // se o giroscópio está bom, a translação sai precisa; se derivou, só o a priori frouxo explica a imagem.
    const sigs = sMax > sMin * 1.01 ? [sMin, Math.sqrt(sMin * sMax), sMax] : [sMin];
    const cand = sigs.map((sg) => { const m = fit(inl, lamOf(sg)); return m ? { sg, m, rms: rmsOf(m, inl) } : null; }).filter(Boolean);
    if (!cand.length) return null;
    const rmsBest = Math.min(...cand.map((c) => c.rms)), floor = 0.45 * (f / 130);
    const pick = cand.find((c) => c.rms <= Math.max(floor, 1.3 * rmsBest)) || cand[cand.length - 1];
    let sigma = pick.sg;
    model = pick.m;
    for (let k = 0; k < 2; k++) { // refina o conjunto de inliers com o a priori escolhido
      const nl = obs.filter((ob) => reproj(ob, model.t, model.Rw, f, cx, cy) < tol * (k === 1 ? 1 : 1.5));
      if (nl.length < 8) break;
      const m = fit(nl, lamOf(sigma));
      if (!m) break;
      inl = nl; model = m;
    }
    let rms = 0;
    for (const ob of inl) rms += reproj(ob, model.t, model.Rw, f, cx, cy) ** 2;
    rms = Math.sqrt(rms / inl.length);
    // o modelo usa Rw por fora: r1 ~ Rw (a - t beta)  =>  t verdadeiro (cam. atual) = Rw t
    return { t: mulMV(model.Rw, model.t), tm: model.t, Rw: model.Rw, inliers: inl.length, total: obs.length, rms, inlierIdx: inl.map((ob) => ob.idx), omegaDeg: (M.rotAngle(model.Rw) * 180) / Math.PI, sigma };
  }

  /**
   * Rotação câmera->câmera (vetor, rad) que melhor explica o fluxo QUADRO A QUADRO dos pontos (mínimos quadrados robustos).
   * Mesma convenção do giroscópio no rastreador: r1 = R r0 (coordenadas da câmera CV). Serve para medir o atraso câmera x giroscópio.
   * pts: [{px,py (quadro anterior), x,y (atual)}]
   */
  function rotFromFlow(pts, f, cx, cy) {
    if (pts.length < 12) return null;
    const rows = pts.map((p) => [(p.px - cx) / f, (p.py - cy) / f, (p.x - p.px) / f, (p.y - p.py) / f]);
    let w = [0, 0, 0], scale = 1, nIn = rows.length;
    const wt = new Float64Array(rows.length).fill(1);
    for (let it = 0; it < 5; it++) {
      const N = new Float64Array(9), b = new Float64Array(3);
      for (let i = 0; i < rows.length; i++) {
        const k = wt[i];
        if (k < 1e-3) continue;
        const x = rows[i][0], y = rows[i][1], dx = rows[i][2], dy = rows[i][3];
        const ax = [-x * y, 1 + x * x, -y], ay = [-(1 + y * y), x * y, x];
        for (let p = 0; p < 3; p++) {
          b[p] += k * (ax[p] * dx + ay[p] * dy);
          for (let q = 0; q < 3; q++) N[p * 3 + q] += k * (ax[p] * ax[q] + ay[p] * ay[q]);
        }
      }
      const sol = solveN(N, b, 3);
      if (!sol) return null;
      w = sol;
      const res = rows.map((r) => Math.hypot(r[2] - (w[1] * (1 + r[0] * r[0]) - w[0] * r[0] * r[1] - w[2] * r[1]), r[3] - (-w[0] * (1 + r[1] * r[1]) + w[1] * r[0] * r[1] + w[2] * r[0])));
      const med = res.slice().sort((a, c) => a - c)[res.length >> 1];
      scale = Math.max(1.4826 * med, 0.35 / f);
      nIn = 0;
      for (let i = 0; i < rows.length; i++) { const u = res[i] / (4.685 * scale); wt[i] = u < 1 ? (1 - u * u) * (1 - u * u) : 0; if (wt[i] > 0.3) nIn++; }
    }
    return { w, n: nIn, rms: scale * f };
  }

  // ---------------- rastreador com estado ----------------
  /**
   * opts: { w, h, f }  imagem de rastreio (px) e focal nessa escala.
   * step(rgba, basisGyro, C, planeY, Rcorr) -> { C, Rcorr, ok, inliers, ratio, rms, omegaDeg, tracked }
   *   basisGyro : base da câmera só com o giroscópio; Rcorr : correção atual (camera-frame) aplicada sobre ele.
   *   Quando ok, C e Rcorr novos devem substituir os atuais. Quando não, voltam iguais aos de entrada.
   */
  function createTracker(opts) {
    const w = opts.w, h = opts.h, f0 = opts.f, cx = w / 2, cy = h / 2;
    let f = f0 * (opts.fScale || 1); // focal efetiva: aprendida em movimento (ver auto-FOV)
    const st = { key: null, prevPyr: null, prevR: null, pts: [], sinceKey: 0, bad: 0, keys: 0, keyGray: null, lastRw: M.m3I(), lastTm: [0, 0, 0], hasSol: false, fScale: opts.fScale || 1, fAcc: new Float64Array(9), fW: 0, keyPts0: [], relocI: 0, relocN: 0 };
    const cell = opts.cell || 12, maxPts = opts.maxPts || 80, MAX_KEY_DIST = opts.keyDist || 0.16;
    const okRule = opts.okRule || { inliers: 8, ratio: 0.35, rms: 1.5 };
    const UP = [0, 1, 0];

    function mask(Rvis) { // só pixels cujo raio aponta para baixo (mesa); ignora paredes/teto
      const b = M.basisFromRcv(Rvis);
      return (x, y) => {
        const xn = (x - cx) / f, yn = (y - cy) / f;
        return (b.right[1] * xn - b.up[1] * yn + b.fwd[1]) / Math.hypot(xn, yn, 1) < -0.10;
      };
    }
    function newKey(gray, Rg, Rcorr, C) {
      const Rvis = M.m3mul(Rcorr, Rg);
      st.key = { Rg, Rvis, C: C.slice() };
      st.keyGray = gray; st.lastRw = M.m3I(); st.lastTm = [0, 0, 0]; st.hasSol = false;
      st.pts = detectCorners({ data: gray, w, h }, mask(Rvis), maxPts, cell, 8, [], opts.cornerRel).map((p) => ({ kx: p.x, ky: p.y, x: p.x, y: p.y }));
      st.keyPts0 = st.pts.map((p) => ({ kx: p.kx, ky: p.ky })); // cantos do quadro-chave de verdade: servem para reencontrar a mesa depois de perder o rastreio
      st.sinceKey = 0; st.bad = 0; st.keys++; st.relocI = 0;
    }

    // auto-FOV: o campo de visão real do celular raramente é o assumido (55° a 80°). Com giro, o resíduo do MESMO conjunto de pontos
    // tem mínimo na focal verdadeira; a curva de um quadro é ruidosa demais, então soma-se a curva de vários quadros e só então
    // ajusta-se uma parábola. A escala aprendida passa a valer para o rastreio e para o desenho (o prato acompanha a mesa no giro).
    const FS = [0.9, 0.925, 0.95, 0.975, 1, 1.025, 1.05, 1.075, 1.1];
    function learnFocal(pairs, Rrel, n0, d0, sigma, rot) {
      const cost = FS.map((sc) => {
        const fc = f * sc, list = buildObs(pairs, Rrel, n0, d0, fc, cx, cy), m = fit(list, Math.pow(1 / fc / sigma, 2));
        if (!m) return NaN;
        let e = 0;
        for (const o of list) e += reproj(o, m.t, m.Rw, fc, cx, cy) ** 2;
        return e;
      });
      if (cost.some((v) => !(v > 0))) return;
      const mean = cost.reduce((x, y) => x + y, 0) / cost.length, wt = Math.min(1, rot / (8 * M.D2R)) ** 2; // mais giro = mais informação
      for (let j = 0; j < 9; j++) st.fAcc[j] = st.fAcc[j] * 0.98 + (wt * cost[j]) / mean;
      st.fW = st.fW * 0.98 + wt;
      if (st.fW < 5) return;
      let sy = 0, sxy = 0, sx2y = 0; // parábola y = a x² + b x + c em x = -4..4 (passos de 2,5% na focal)
      for (let j = 0; j < 9; j++) { const x = j - 4, y = st.fAcc[j] / st.fW; sy += y; sxy += x * y; sx2y += x * x * y; }
      const qa = (sx2y - (20 / 3) * sy) / 308, qb = sxy / 60, qc = sy / 9 - (60 / 9) * qa;
      if (!(qa > 0)) return;
      const xv = -qb / (2 * qa), gain = (qb * qb) / (4 * qa) / qc;
      if (gain < 0.012 || Math.abs(xv) < 0.6) return;
      st.fScale = Math.max(0.72, Math.min(1.35, st.fScale * (1 + Math.min(1, gain / 0.1) * 0.85 * Math.max(-0.05, Math.min(0.05, 0.025 * xv)))));
      f = f0 * st.fScale;
      st.fAcc.fill(0); st.fW = 0;
    }

    // Hipóteses de deslocamento (m, eixos da câmera) testadas uma por quadro enquanto o rastreio está perdido: durante um borrão rápido o
    // celular andou, e o último deslocamento bom já não serve de ponto de partida.
    const HYPS = [[0, 0, 0], [0.1, 0, 0], [-0.1, 0, 0], [0, 0, 0.1], [0, 0, -0.1], [0, 0.1, 0], [0, -0.1, 0], [0.2, 0, 0], [-0.2, 0, 0], [0, 0, 0.2], [0, 0, -0.2], [0, 0.2, 0], [0, -0.2, 0]];
    /**
     * Rastreio perdido (borrão, mão rápida, câmera fora da mesa): reencontra a mesa contra o quadro-chave ORIGINAL. Empena o quadro-chave
     * por uma hipótese de pose, refina os cantos dele no quadro atual (LK em pirâmide) e resolve a pose de novo. Sem isto, o erro do
     * trecho perdido virava permanente (o quadro-chave era refeito na pose velha).
     */
    function relocalize(pyr, gray, RrelG, n0, d0, hyp, o) {
      const tm = [st.lastTm[0] + hyp[0], st.lastTm[1] + hyp[1], st.lastTm[2] + hyp[2]], Rw = st.hasSol ? st.lastRw : M.m3I();
      const Aw = RrelG.map((row, i) => row.map((v, j) => v - (tm[i] * n0[j]) / d0)), Hk = M.m3mul(Rw, Aw), Hinv = M.m3inv(Hk);
      const warped = new Float32Array(w * h), kg = st.keyGray;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const r0 = (x - cx) / f, r1 = (y - cy) / f, z = Hinv[2][0] * r0 + Hinv[2][1] * r1 + Hinv[2][2];
        let v = gray[y * w + x]; // buraco: usa o próprio quadro atual (sem gradiente falso)
        if (z > 0.2) {
          const kx = cx + (f * (Hinv[0][0] * r0 + Hinv[0][1] * r1 + Hinv[0][2])) / z, ky = cy + (f * (Hinv[1][0] * r0 + Hinv[1][1] * r1 + Hinv[1][2])) / z;
          if (kx >= 0 && ky >= 0 && kx <= w - 1.001 && ky <= h - 1.001) {
            const x0 = kx | 0, y0 = ky | 0, fx = kx - x0, fy = ky - y0, i = y0 * w + x0;
            v = kg[i] * (1 - fx) * (1 - fy) + kg[i + 1] * fx * (1 - fy) + kg[i + w] * (1 - fx) * fy + kg[i + w + 1] * fx * fy;
          }
        }
        warped[y * w + x] = v;
      }
      const wp = buildPyramid(warped, w, h, 3), tracked = [];
      // o casamento tem de ser PROVADO pela imagem (correlação do recorte 9x9): sem isso, um LK que não encontra nada devolve o ponto previsto,
      // e a pose "confirma" a própria hipótese com erro zero
      const ncc = (qx, qy, px, py) => {
        let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const a = sample(wp[0], px + dx, py + dy), b = sample(pyr[0], qx + dx, qy + dy);
          if (a !== a || b !== b) continue;
          sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b; n++;
        }
        if (n < 40) return -1;
        const va = saa / n - (sa / n) * (sa / n), vb = sbb / n - (sb / n) * (sb / n);
        if (va < 20 || vb < 20) return -1; // sem textura em um dos lados
        return (sab / n - (sa / n) * (sb / n)) / Math.sqrt(va * vb);
      };
      for (const k of st.keyPts0) {
        const a = mulMV(Hk, [(k.kx - cx) / f, (k.ky - cy) / f, 1]);
        if (a[2] < 0.2) continue;
        const px = cx + (f * a[0]) / a[2], py = cy + (f * a[1]) / a[2];
        if (px < 9 || py < 9 || px > w - 10 || py > h - 10) continue;
        const q = lkTrack(wp, pyr, { x: px, y: py }, { x: px, y: py }, 7, 12);
        if (!q || q.x < 9 || q.y < 9 || q.x > w - 10 || q.y > h - 10 || Math.hypot(q.x - px, q.y - py) > 45) continue;
        if (ncc(q.x, q.y, px, py) < 0.8) continue;
        tracked.push({ kx: k.kx, ky: k.ky, x: q.x, y: q.y, px: q.x, py: q.y });
      }
      if (tracked.length < 12) return null;
      const est = estimatePose(tracked.map((p) => ({ x0: p.kx, y0: p.ky, x1: p.x, y1: p.y })), RrelG, n0, d0, f, cx, cy, o);
      return est && est.inliers >= 12 && est.inliers / est.total >= 0.5 && est.rms < 1.3 ? { est, tracked } : null;
    }

    function step(rgba, basisG, C, planeY, Rcorr) {
      Rcorr = Rcorr || M.m3I();
      const gray = toGray(rgba, w * h), pyr = buildPyramid(gray, w, h, 3), Rg = M.rotCV(basisG);
      const res = { C: C.slice(), Rcorr, ok: false, inliers: 0, ratio: 0, rms: 0, omegaDeg: 0, tracked: 0 };
      if (!st.key) { newKey(gray, Rg, Rcorr, C); st.prevPyr = pyr; st.prevR = Rg; return res; }

      // 1) segue os pontos do quadro anterior para o atual (chute: rotação do giroscópio)
      const Rstep = M.m3mul(Rg, M.m3T(st.prevR));
      // a priori da correção de rotação mais frouxo quando o celular gira rápido: ali o giro é bem medido pela imagem, e um erro de tempo
      // câmera x sensor (proporcional à velocidade) viraria translação falsa se o a priori fosse apertado demais
      const spd = M.rotAngle(Rstep), optsS = opts.sigmaSpeed === 0 ? opts : Object.assign({}, opts, { sigmaW: (opts.sigmaW || 0.006) + (opts.sigmaSpeed == null ? 1 : opts.sigmaSpeed) * spd });
      let tracked = [];
      for (const p of st.pts) {
        const r0 = [(p.x - cx) / f, (p.y - cy) / f, 1], a = mulMV(Rstep, r0);
        if (a[2] < 0.2) continue;
        const q = lkTrack(st.prevPyr, pyr, p, { x: cx + (f * a[0]) / a[2], y: cy + (f * a[1]) / a[2] }, 7, 12); // janela 15x15: medido, janela 11x11 deixava ~10% de casamentos errados
        if (!q || q.x < 9 || q.y < 9 || q.x > w - 10 || q.y > h - 10) continue;
        tracked.push({ kx: p.kx, ky: p.ky, x: q.x, y: q.y, px: p.x, py: p.y });
      }
      res.tracked = tracked.length;
      res.flow = rotFromFlow(tracked, f, cx, cy); // rotação medida só pela imagem (calibra o atraso câmera x giroscópio)

      // 2) pose contra o quadro-chave
      const RrelG = M.m3mul(Rg, M.m3T(st.key.Rg));
      const n0 = mulMV(st.key.Rvis, UP), d0 = st.key.C[1] - planeY;

      // 2a) re-mede cada ponto contra o QUADRO-CHAVE empenado para a vista atual (homografia da última solução + giroscópio de agora):
      //     o passo quadro-a-quadro acumula um viés de décimos de pixel; contra o quadro-chave esse erro não se acumula.
      if (st.hasSol && d0 > 0.05 && tracked.length >= 8) { // só com uma pose anterior para empenar o quadro-chave
        const Aw = RrelG.map((row, i) => row.map((v, j) => v - (st.lastTm[i] * n0[j]) / d0));
        const Hinv = M.m3inv(M.m3mul(st.lastRw, Aw)), warped = new Float32Array(w * h), kg = st.keyGray;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const r0 = (x - cx) / f, r1 = (y - cy) / f;
          const z = Hinv[2][0] * r0 + Hinv[2][1] * r1 + Hinv[2][2];
          let v = NaN;
          if (z > 0.2) {
            const kx = cx + (f * (Hinv[0][0] * r0 + Hinv[0][1] * r1 + Hinv[0][2])) / z, ky = cy + (f * (Hinv[1][0] * r0 + Hinv[1][1] * r1 + Hinv[1][2])) / z;
            if (kx >= 0 && ky >= 0 && kx <= w - 1.001 && ky <= h - 1.001) {
              const x0 = kx | 0, y0 = ky | 0, fx = kx - x0, fy = ky - y0, i = y0 * w + x0;
              v = kg[i] * (1 - fx) * (1 - fy) + kg[i + 1] * fx * (1 - fy) + kg[i + w] * (1 - fx) * fy + kg[i + w + 1] * fx * fy;
            }
          }
          warped[y * w + x] = v;
        }
        const wImg = [{ data: warped, w, h }], cImg = [pyr[0]];
        for (const p of tracked) {
          const q = lkTrack(wImg, cImg, { x: p.x, y: p.y }, { x: p.x, y: p.y }, 7, 6);
          if (q && Math.hypot(q.x - p.x, q.y - p.y) < 3) { p.x = q.x; p.y = q.y; }
        }
      }
      let est = d0 > 0.05 ? estimatePose(tracked.map((p) => ({ x0: p.kx, y0: p.ky, x1: p.x, y1: p.y })), RrelG, n0, d0, f, cx, cy, optsS) : null;
      const okOf = (e) => !!e && e.inliers >= okRule.inliers && e.inliers / e.total >= okRule.ratio && e.rms < okRule.rms;
      if (!okOf(est) && d0 > 0.05 && st.keyPts0.length >= 12 && (st.bad >= 2 || tracked.length < 16) && opts.reloc !== false) {
        const rl = relocalize(pyr, gray, RrelG, n0, d0, HYPS[st.relocI++ % HYPS.length], optsS);
        if (rl) { est = rl.est; tracked = rl.tracked; res.reloc = true; res.tracked = tracked.length; st.relocN++; }
      }
      if (est) {
        res.inliers = est.inliers; res.ratio = est.inliers / est.total; res.rms = est.rms; res.omegaDeg = est.omegaDeg;
        res.ok = est.inliers >= okRule.inliers && res.ratio >= okRule.ratio && est.rms < okRule.rms;
        if (res.ok) {
          const RvisCur = M.orthonormalize(M.m3mul(M.m3mul(est.Rw, RrelG), st.key.Rvis));
          res.Rcorr = M.orthonormalize(M.m3mul(RvisCur, M.m3T(Rg)));
          const dd = mulMV(M.m3T(RvisCur), est.t);
          res.C = [st.key.C[0] - dd[0], st.key.C[1] - dd[1], st.key.C[2] - dd[2]];
          const rotG = M.rotAngle(RrelG);
          if (opts.learnFov !== false && est.inliers >= 20 && res.ratio >= 0.6 && rotG > 3 * M.D2R) {
            learnFocal(est.inlierIdx.map((i) => ({ x0: tracked[i].kx, y0: tracked[i].ky, x1: tracked[i].x, y1: tracked[i].y })), RrelG, n0, d0, est.sigma, rotG);
          }
          st.pts = est.inlierIdx.map((i) => tracked[i]); st.bad = 0;
          st.lastRw = est.Rw; st.lastTm = est.tm; st.hasSol = true;
          // repõe pontos sem trocar de quadro-chave: onde cada canto novo estaria no quadro-chave segundo o plano da mesa
          // (homografia chave->atual = Rw (RrelG - tm n0^T / d0); invertida leva pixels atuais de volta ao quadro-chave)
          if (st.pts.length < maxPts * 0.55) {
            const A = RrelG.map((row, i) => row.map((v, j) => v - (est.tm[i] * n0[j]) / d0));
            const Hck = M.m3mul(est.Rw, A), Hkc = M.m3inv(Hck);
            for (const c of detectCorners({ data: gray, w, h }, mask(RvisCur), maxPts - st.pts.length, cell, 8, st.pts, opts.cornerRel)) {
              const r0 = mulMV(Hkc, [(c.x - cx) / f, (c.y - cy) / f, 1]);
              if (r0[2] < 0.2) continue;
              const kx = cx + (f * r0[0]) / r0[2], ky = cy + (f * r0[1]) / r0[2];
              if (kx > -w && kx < 2 * w && ky > -h && ky < 2 * h) st.pts.push({ kx, ky, x: c.x, y: c.y });
            }
          }
        } else { st.pts = tracked; st.bad++; }
      } else { st.pts = tracked; st.bad++; }
      st.sinceKey++;

      // 3) novo quadro-chave: faltam pontos, o movimento cresceu, ou o rastreio ficou ruim
      const far = res.ok && Math.hypot(res.C[0] - st.key.C[0], res.C[1] - st.key.C[1], res.C[2] - st.key.C[2]) > MAX_KEY_DIST;
      // com pose válida: renova quando faltam pontos/moveu muito. PERDIDO: espera (3 s) a relocalização em vez de refazer o quadro-chave na pose velha
      if (res.ok ? (st.pts.length < 14 || far || st.sinceKey > 600) : (st.hasSol ? st.bad >= 90 : st.bad >= 12)) newKey(gray, Rg, res.ok ? res.Rcorr : Rcorr, res.ok ? res.C : C);
      st.prevPyr = pyr; st.prevR = Rg;
      return res;
    }
    return { step, reset() { st.key = null; st.prevPyr = null; st.prevR = null; st.pts = []; }, get points() { return st.pts; }, get keyCount() { return st.keys; }, get fScale() { return st.fScale; }, get relocCount() { return st.relocN; } };
  }

  return { createTracker, estimatePose, detectCorners, lkTrack, buildPyramid, toGray, rotFromFlow };
});
