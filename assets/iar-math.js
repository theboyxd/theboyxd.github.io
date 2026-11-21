/* Instant AR · geometria (sem dependências).
 *
 * Mundo: Y para cima, câmera em C. A orientação do celular vem do DeviceOrientation (convenção do three.js:
 * a câmera olha para -Z local, "cima" é +Y local). Pontos na mesa ficam no plano y = planeY.
 *
 * Funciona no navegador (window.IARMath) e no Node (require) — os testes ficam em tests/iar_math.test.cjs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IARMath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const D2R = Math.PI / 180;

  // ---------- vetores ([x,y,z]) ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const normalize = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // ---------- quaternions ([x,y,z,w]) ----------
  function qMul(a, b) {
    const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
    return [
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz,
    ];
  }
  function qFromAxisAngle(axis, angle) {
    const h = angle / 2, s = Math.sin(h);
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
  }
  // Euler 'YXZ' (mesma fórmula do three.js Quaternion.setFromEuler)
  function qFromEulerYXZ(x, y, z) {
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    return [
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 - s1 * s2 * c3,
      c1 * c2 * c3 + s1 * s2 * s3,
    ];
  }
  function qRotate(q, v) {
    const [x, y, z, w] = q;
    const ix = w * v[0] + y * v[2] - z * v[1];
    const iy = w * v[1] + z * v[0] - x * v[2];
    const iz = w * v[2] + x * v[1] - y * v[0];
    const iw = -x * v[0] - y * v[1] - z * v[2];
    return [
      ix * w + iw * -x + iy * -z - iz * -y,
      iy * w + iw * -y + iz * -x - ix * -z,
      iz * w + iw * -z + ix * -y - iy * -x,
    ];
  }
  function qSlerp(a, b, t) {
    let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    let bb = b;
    if (cos < 0) { cos = -cos; bb = [-b[0], -b[1], -b[2], -b[3]]; }
    if (cos > 0.9995) {
      const r = [a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, a[3] + (bb[3] - a[3]) * t];
      const l = Math.hypot(r[0], r[1], r[2], r[3]);
      return [r[0] / l, r[1] / l, r[2] / l, r[3] / l];
    }
    const th = Math.acos(cos), sin = Math.sin(th);
    const wa = Math.sin((1 - t) * th) / sin, wb = Math.sin(t * th) / sin;
    return [a[0] * wa + bb[0] * wb, a[1] * wa + bb[1] * wb, a[2] * wa + bb[2] * wb, a[3] * wa + bb[3] * wb];
  }

  /** DeviceOrientation (graus) -> quaternion da câmera traseira (Y para cima). */
  function deviceQuat(alphaDeg, betaDeg, gammaDeg, screenAngleDeg) {
    let q = qFromEulerYXZ(betaDeg * D2R, alphaDeg * D2R, -gammaDeg * D2R);
    q = qMul(q, [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]); // câmera olha pelo verso do aparelho
    q = qMul(q, qFromAxisAngle([0, 0, 1], -(screenAngleDeg || 0) * D2R)); // tela girada
    return q;
  }
  function basisFromQuat(q) {
    return { right: qRotate(q, [1, 0, 0]), up: qRotate(q, [0, 1, 0]), fwd: qRotate(q, [0, 0, -1]) };
  }

  // ---------- câmera pinhole ----------
  /** Distância focal (px da tela) a partir do FOV do lado maior do vídeo e do recorte "cover". */
  function focalPx({ videoW, videoH, screenW, screenH, longFovDeg }) {
    const long = Math.max(videoW, videoH);
    const fVideo = (long / 2) / Math.tan((longFovDeg * D2R) / 2);
    const scale = Math.max(screenW / videoW, screenH / videoH); // object-fit: cover
    return fVideo * scale;
  }
  function worldToScreen(P, C, basis, f, cx, cy) {
    const v = sub(P, C);
    const x = dot(v, basis.right), y = dot(v, basis.up), z = dot(v, basis.fwd);
    return { u: cx + (f * x) / z, v: cy - (f * y) / z, z };
  }
  function screenToRay(u, v, basis, f, cx, cy) {
    const x = (u - cx) / f, y = -(v - cy) / f;
    return normalize(add(add(mul(basis.right, x), mul(basis.up, y)), basis.fwd));
  }
  /** Raio C + t*dir contra o plano y = planeY. Retorna null se apontar para cima/horizonte. */
  function rayPlane(C, dir, planeY, maxDist) {
    if (dir[1] > -0.02) return null;
    const t = (planeY - C[1]) / dir[1];
    if (!(t > 0) || (maxDist && t > maxDist)) return null;
    return { t, P: add(C, mul(dir, t)) };
  }

  // ---------- matrizes 3x3 (linhas) ----------
  const m3mul = (A, B) => A.map((r, i) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const m3T = (A) => [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]];
  function m3inv(m) {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
      [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
      [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
      [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
    ];
  }
  const K = (f, cx, cy) => [[f, 0, cx], [0, f, cy], [0, 0, 1]];
  const applyH = (H, x, y) => {
    const w = H[2][0] * x + H[2][1] * y + H[2][2];
    return { u: (H[0][0] * x + H[0][1] * y + H[0][2]) / w, v: (H[1][0] * x + H[1][1] * y + H[1][2]) / w };
  };
  // linhas da matriz de rotação mundo->câmera na convenção CV (x direita, y baixo, z à frente)
  const rotCV = (b) => [b.right, mul(b.up, -1), b.fwd];

  /**
   * Homografia (pixels do elemento <model-viewer> SxS, origem no canto) -> pixels da tela.
   * O elemento mostra o prato visto por uma câmera virtual que fica em C e olha para o centro do prato;
   * a câmera real tem a orientação do celular. Mesmo centro => só rotação => homografia exata.
   */
  function modelHomography({ C, Pc, basis, f, cx, cy, S }) {
    const fv = normalize(sub(Pc, C));
    let rv = cross(fv, [0, 1, 0]);
    if (len(rv) < 1e-4) rv = sub(basis.right, mul(fv, dot(basis.right, fv))); // olhando reto para baixo
    rv = normalize(rv);
    const uv = cross(rv, fv);
    const Rv = rotCV({ right: rv, up: uv, fwd: fv });
    const Rr = rotCV(basis);
    const M = m3mul(Rr, m3T(Rv));
    return m3mul(m3mul(K(f, cx, cy), M), m3inv(K(f, S / 2, S / 2)));
  }

  /** Homografia (px de um elemento ExE que representa um quadrado de D metros na mesa) -> tela. */
  function planeHomography({ C, P, basis, f, cx, cy, E, D }) {
    const R = rotCV(basis);
    const rot = (v) => [dot(R[0], v), dot(R[1], v), dot(R[2], v)];
    const ex = rot([1, 0, 0]), ez = rot([0, 0, 1]), o = rot(sub(P, C));
    const Mp = [[ex[0], ez[0], o[0]], [ex[1], ez[1], o[1]], [ex[2], ez[2], o[2]]];
    const Q = [[D / E, 0, -D / 2], [0, D / E, -D / 2], [0, 0, 1]];
    return m3mul(m3mul(K(f, cx, cy), Mp), Q);
  }

  /** Matriz 3x3 -> string CSS matrix3d (transform-origin: 0 0). */
  function toMatrix3d(H) {
    const n = H[2][2] || 1;
    const h = H.map((r) => r.map((x) => x / n));
    const v = [h[0][0], h[1][0], 0, h[2][0], h[0][1], h[1][1], 0, h[2][1], 0, 0, 1, 0, h[0][2], h[1][2], 0, 1];
    return 'matrix3d(' + v.map((x) => (Math.abs(x) < 1e-9 ? 0 : +x.toFixed(7))).join(',') + ')';
  }

  // ---------- <model-viewer camera-orbit> ----------
  /** Câmera em C olhando para Pc, com o prato girado em yawRad -> (theta, phi, raio) do model-viewer. */
  function orbitFromCamera(C, Pc, yawRad) {
    const w = sub(C, Pc), r = len(w);
    return { theta: Math.atan2(w[0], w[2]) - (yawRad || 0), phi: Math.acos(Math.max(-1, Math.min(1, w[1] / r))), radius: r };
  }

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const SX = -1, SY = 1, SZ = 1; // sinais da conversão local(three.js) -> CV, conferidos em tests/iar_math.test.cjs


  // ---------- rotações pequenas / correção visual do giroscópio ----------
  const m3I = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const m3Add = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));
  const m3Scale = (A, s) => A.map((r) => r.map((v) => v * s));
  const skew = (w) => [[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]];
  /** Rodrigues: vetor de rotação (rad) -> matriz 3x3. */
  function rodrigues(w) {
    const th = Math.hypot(w[0], w[1], w[2]);
    if (th < 1e-12) return m3I();
    const K = skew([w[0] / th, w[1] / th, w[2] / th]);
    return m3Add(m3Add(m3I(), m3Scale(K, Math.sin(th))), m3Scale(m3mul(K, K), 1 - Math.cos(th)));
  }
  /** Ângulo (rad) da rotação R. */
  const rotAngle = (R) => Math.acos(clamp((R[0][0] + R[1][1] + R[2][2] - 1) / 2, -1, 1));
  /** Vetor de rotação (rad) de uma matriz de rotação: inverso de rodrigues(). */
  function rotVec(R) {
    const th = Math.acos(clamp((R[0][0] + R[1][1] + R[2][2] - 1) / 2, -1, 1));
    const v = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]];
    if (th < 1e-6) return [v[0] / 2, v[1] / 2, v[2] / 2];
    const s = Math.sin(th);
    if (s < 1e-6) return [0, 0, 0]; // ~180°: não acontece entre dois quadros
    const k = th / (2 * s);
    return [v[0] * k, v[1] * k, v[2] * k];
  }
  /**
   * Vetor de rotação (rad, coordenadas CV da câmera) que leva as coordenadas de um ponto fixo no instante de q0 às do instante de q1
   * (mesma convenção de R1 R0^T com rotCV). Só quaternions: usado em laço quente, sem montar matrizes.
   */
  function stepRotVec(q0, q1) {
    const r = qMul([-q0[0], -q0[1], -q0[2], q0[3]], q1); // movimento da câmera no referencial local (eixos do three.js)
    let x = r[0], y = r[1], z = r[2], w = r[3];
    if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
    const s = Math.hypot(x, y, z);
    if (s < 1e-12) return [0, 0, 0];
    const k = (2 * Math.atan2(s, w)) / s;
    return [SX * x * k, SY * y * k, SZ * z * k];
  }
  /** Base da câmera (right, up, fwd) a partir das linhas CV [right; -up; fwd]. */
  const basisFromRcv = (R) => ({ right: R[0].slice(), up: [-R[1][0], -R[1][1], -R[1][2]], fwd: R[2].slice() });
  /** Gram-Schmidt nas linhas: mantém a matriz uma rotação depois de várias multiplicações. */
  function orthonormalize(R) {
    const r0 = normalize(R[0]);
    const r1 = normalize(sub(R[1], mul(r0, dot(R[1], r0))));
    return [r0, r1, cross(r0, r1)];
  }

  return {
    D2R, add, sub, mul, dot, cross, len, normalize, clamp,
    qMul, qFromAxisAngle, qFromEulerYXZ, qRotate, qSlerp,
    deviceQuat, basisFromQuat,
    focalPx, worldToScreen, screenToRay, rayPlane,
    m3mul, m3T, m3inv, K, applyH, rotCV,
    modelHomography, planeHomography, toMatrix3d, orbitFromCamera,
    m3I, m3Add, m3Scale, skew, rodrigues, rotAngle, rotVec, stepRotVec, basisFromRcv, orthonormalize,
  };
});
