/* Cardápio 3D · Instant AR
 *
 * AR sem "escanear a mesa": o cliente aponta o celular, toca onde o prato vai ficar e ele aparece ali na hora,
 * em tamanho real, com sombra, preso à mesa enquanto o celular gira.
 *
 *   câmera traseira (getUserMedia)  -> fundo
 *   giroscópio (DeviceOrientation)  -> rotação 3DoF da câmera
 *   plano da mesa assumido          -> altura do celular (calibrável com pinça) — toque = raio x plano
 *   <model-viewer> (mesmo render)   -> prato; uma homografia CSS exata (iar-math.js) o posiciona como uma
 *                                      câmera virtual que olha o prato, girada para a orientação real do celular
 *
 * Teste sem celular: ?iar=sim (câmera simulada + sensores simulados, window.__iar.sim).
 */
(() => {
  'use strict';

  const M = window.IARMath;
  if (!M) return console.warn('[IAR] iar-math.js ausente');
  const TR = window.IARTrack; // opcional: sem ele o AR segue só com o giroscópio

  const Q = new URLSearchParams(location.search);
  const $ = (s, r = document) => r.querySelector(s);
  const bridge = () => window.CardapioBridge;
  const { clamp, D2R } = M;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } },
  };
  const BUILD = '1110f'; // aparece na tela de entrada e na telemetria: confirma qual versão está rodando no celular
  const UA = navigator.userAgent || '';
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_PHONE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) && Math.min(screen.width, screen.height) < 700;
  const shortName = (n) => String(n || 'Prato').replace(/\s*(4K|8K)\b/gi, '').trim();
  const fmtCm = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  const CFG = {
    longFovDeg: clamp(+Q.get('fov') || LS.get('c3d.fov', 68), 45, 90), // FOV do lado maior do vídeo
    latencyMs: Q.get('lat') != null ? +Q.get('lat') : (IS_IOS ? 95 : 125), // atraso câmera x sensor: ponto de partida; o app mede o real durante o uso
    latAuto: Q.get('lat') == null,
    maxDist: 3.5,
    sigmaSpeed: Q.get('ss') != null ? +Q.get('ss') : 1,                    // a priori da rotação mais frouxo com giro rápido (ver iar-track.js)
    learnFov: Q.get('learn') !== '0',                                     // aprende a focal real da câmera enquanto o celular se move
    defaultH: 0.45, minH: 0.18, maxH: 1.6,                                // altura assumida do celular sobre a mesa (m)
  };

  const A = {
    root: null, active: false, phase: 'idle', item: null, raf: 0,
    C: [0, 0, 0], H: clamp(LS.get('c3d.camH', CFG.defaultH), CFG.minH, CFG.maxH), planeY: 0,
    P: null, yaw: 0, dims: { x: 0.2, y: 0.05, z: 0.2 }, dishD: 0.26,
    hist: [], qs: null, hasSensor: false, basis: null,
    sw: 0, sh: 0, f: 800, cx: 0, cy: 0, S: 0, lastOrbit: null, lastFov: 0, fScale: 1, fScaleUse: 1, fsSaveT: 0, fsSaved: 1,
    aim: null, pop: 1, popT0: 0, light: { e: 0.95, t: 0 }, stream: null,
    ptr: new Map(), drag: null, two: null, modelReady: false,
    trackOn: Q.get('track') !== '0', trackT: 0, tracker: null, trackDim: '', trackCv: null, trackCtx: null, tq: null, C0: [0, 0, 0],
    trackLong: 224, trackStages: [], trackMs: 0, slowCount: 0, Rcorr: M.m3I(), basisG: null, simBasis: null, vfc: null, vfcId: 0, newFrame: false, lastVT: -1, lastOkT: 0, trackSteps: 0, okSteps: 0,
    lat: CFG.latencyMs, latSaved: CFG.latencyMs, latSaveT: 0, latBuf: [], latConf: 0, latT: 0, latScan: null, frameT: 0, frameSeq: 0, seqSeen: 0, seqNew: false, frameKind: '', lastStepT: 0,
    dtEma: 0, dtBins: [0, 0, 0, 0, 0], pLast: 0, qn: 0, qslow: 0, qWinT: 0, m: 1, m0: 1, mMax: 1, qualT: 0, sCss: 0, t0: 0, statT: 0, errs: [], sensorN: 0, sensorT0: 0, renders: 0, wake: null, statEarly: false, lastFrameEv: 0, pseudo: false, trackErr: 0, trackLastErr: '', lastSig: 0, placedT: 0,
    sim: { on: false, e: { alpha: 0, beta: 52, gamma: 0 }, C: [0, 0, 0], trueH: 0.42, canvas: null, ctx: null, img: null, truth: [], lastCam: -1e9, camDt: 33.3, latTrue: null, frameC: [0, 0, 0], frameBasis: null, gyroErr: { biasDeg: 0, jitterDeg: 0, axis: [0.6, -0.5, 0.62] } },
  };
  A.planeY = A.C[1] - A.H;
  { // escala da focal: valor aprendido em usos anteriores neste aparelho (ou ?fs= / ?fov= para forçar)
    const fs = +Q.get('fs') || (Q.get('fov') ? 1 : LS.get('c3d.fs', 1));
    A.fScale = A.fScaleUse = A.fsSaved = clamp(+fs || 1, 0.72, 1.35);
  }

  // ------------------------------------------------------------------ DOM
  const SVG_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const SVG_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
  const SVG_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.6"/></svg>';

  function mount() {
    if (A.root) return;
    const root = document.createElement('div');
    root.className = 'iar';
    root.id = 'iar';
    root.hidden = true;
    root.innerHTML = `
      <video class="iar-video" id="iarVideo" playsinline muted autoplay></video>
      <canvas class="iar-sim" id="iarSim" hidden></canvas>
      <div class="iar-shadow" id="iarShadow" hidden></div>
      <div class="iar-ring" id="iarRing" hidden>
        <svg viewBox="0 0 400 400" width="400" height="400" aria-hidden="true">
          <defs><radialGradient id="iarRg"><stop offset="0" style="stop-color:var(--brand)" stop-opacity=".30"/><stop offset=".72" style="stop-color:var(--brand)" stop-opacity=".12"/><stop offset="1" style="stop-color:var(--brand)" stop-opacity="0"/></radialGradient></defs>
          <circle cx="200" cy="200" r="198" fill="url(#iarRg)"/>
          <circle cx="200" cy="200" r="190" fill="none" stroke="#fff" stroke-width="6" opacity=".95"/>
          <circle class="iar-ring-dash" cx="200" cy="200" r="176" fill="none" style="stroke:var(--brand)" stroke-width="4" stroke-dasharray="16 14"/>
          <circle cx="200" cy="200" r="9" fill="#fff"/><circle cx="200" cy="200" r="9" fill="none" style="stroke:var(--brand)" stroke-width="4"/>
        </svg>
      </div>
      <model-viewer class="iar-model" id="iarModel" alt="Prato na sua mesa" loading="eager" reveal="auto"
        environment-image="/vendor/env/restaurant-warm-v1.hdr" tone-mapping="neutral" exposure="0.95"
        shadow-intensity="1.35" shadow-softness="1" interaction-prompt="none" interpolation-decay="1"
        min-camera-orbit="-Infinity 2deg 0.05m" max-camera-orbit="Infinity 89deg 6m"
        min-field-of-view="3deg" max-field-of-view="100deg" camera-orbit="0deg 60deg 0.6m" field-of-view="30deg"><div slot="progress-bar"></div></model-viewer>
      <div class="iar-touch" id="iarTouch"></div>
      <div class="iar-ui">
        <div class="iar-top">
          <div class="ar-brand ar-glass"><span class="ar-logo" id="iarLogo">A</span>
            <span class="ar-brand-txt"><b id="iarBrand">Restaurante</b><small>Cardápio 3D · AR</small></span></div>
          <button type="button" class="iar-btn iar-close ar-glass" id="iarClose" aria-label="Fechar AR">${SVG_CLOSE}<span>Fechar</span></button>
        </div>
        <div class="iar-off" id="iarOff" hidden><span>➜</span></div>
        <div class="iar-toast ar-glass" id="iarToast"></div>
        <div class="iar-mid">
          <div class="iar-loader ar-glass" id="iarLoader" hidden>Carregando prato…</div>
          <div class="iar-warn ar-glass" id="iarWarn" hidden>Rastreio da mesa fraco · aponte para um trecho com textura</div>
          <div class="iar-coach ar-glass" id="iarCoach"><b id="iarCoachT"></b><span id="iarCoachS"></span></div>
          <div class="iar-chip ar-glass" id="iarChip" hidden><i></i><span id="iarChipT">Tamanho real</span></div>
        </div>
        <div class="iar-bottom">
          <div class="iar-strip" id="iarStrip"></div>
          <div class="iar-bar ar-glass">
            <div class="iar-info"><b id="iarDish">Prato</b><small id="iarMeta"></small></div>
            <button type="button" class="iar-btn iar-ico" id="iarReset" aria-label="Reposicionar" hidden>${SVG_RESET}</button>
            <button type="button" class="iar-btn iar-ico" id="iarShot" aria-label="Tirar foto" hidden>${SVG_CAM}</button>
            <button type="button" class="ar-add" id="iarAdd">+ Adicionar</button>
          </div>
        </div>
      </div>
      <div class="iar-intro" id="iarIntro">
        <div class="iar-card">
          <div class="ar-logo iar-card-logo" id="iarCardLogo">A</div>
          <h2>Veja o prato na sua mesa</h2>
          <ol>
            <li><b>Permita</b> a câmera e o movimento do celular.</li>
            <li><b>Aponte</b> para a mesa onde quer o prato.</li>
            <li><b>Toque</b> no lugar — ele aparece na hora, em tamanho real.</li>
          </ol>
          <p class="iar-err" id="iarErr" hidden></p>
          <button type="button" class="iar-go" id="iarGo">Ativar câmera e começar</button>
          <button type="button" class="iar-alt" id="iarNative" hidden>Prefiro o AR que lê a mesa</button>
          <button type="button" class="iar-skip" id="iarCancel">Agora não</button>
          <p class="iar-build">build ${BUILD}</p>
        </div>
      </div>`;
    document.body.appendChild(root);
    A.root = root;
    A.video = $('#iarVideo'); A.simCv = $('#iarSim'); A.ring = $('#iarRing'); A.mv = $('#iarModel'); A.touch = $('#iarTouch'); A.shadow = $('#iarShadow');
    if (Q.get('debug')) { // painel de diagnóstico para testar no celular: ?debug=1
      const d = document.createElement('pre'); d.className = 'iar-dbg'; d.id = 'iarDbg'; root.appendChild(d); A.dbg = d;
      window.addEventListener('error', (e) => { d.textContent = 'ERRO: ' + e.message + '\n' + d.textContent; });
    }

    $('#iarClose').addEventListener('click', stop);
    $('#iarCancel').addEventListener('click', stop);
    $('#iarGo').addEventListener('click', begin);
    $('#iarReset').addEventListener('click', () => enterAim());
    $('#iarShot').addEventListener('click', takePhoto);
    $('#iarAdd').addEventListener('click', () => { bridge().addToCart(); toast('✓ Adicionado ao pedido'); });
    $('#iarNative').addEventListener('click', () => { stop(); if (window.Cardapio3DAR) window.Cardapio3DAR.launchNative(); });
    for (const b of root.querySelectorAll('button')) b.addEventListener('beforexrselect', (e) => e.preventDefault());

    const t = A.touch;
    t.addEventListener('pointerdown', onDown);
    t.addEventListener('pointermove', onMove);
    t.addEventListener('pointerup', onUp);
    t.addEventListener('pointercancel', onUp);

    A.mv.addEventListener('load', onModelLoad);
    A.mv.addEventListener('progress', (e) => {
      const p = (e.detail && e.detail.totalProgress) || 0;
      $('#iarLoader').hidden = p >= 1 || A.modelReady;
    });
    window.addEventListener('resize', updateCamera);
    window.addEventListener('orientationchange', () => setTimeout(updateCamera, 250));
    const onErr = (e) => { if (A.errs.length < 5) A.errs.push(String((e && (e.message || (e.reason && e.reason.message))) || 'erro').slice(0, 160)); };
    window.addEventListener('error', onErr); window.addEventListener('unhandledrejection', onErr);
    document.addEventListener('visibilitychange', () => { if (!A.active) return; if (document.hidden) sendStats('hidden'); else keepAwake(); });
    window.addEventListener('pagehide', () => { if (A.active) sendStats('pagehide'); });
  }

  const toast = (msg) => {
    const t = $('#iarToast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
  };

  // ------------------------------------------------------------------ entrada / saída
  function brandIt() {
    const b = bridge().brand();
    const initial = (String(b.nome || 'A').trim()[0] || 'A').toUpperCase();
    $('#iarLogo').textContent = initial; $('#iarCardLogo').textContent = initial; $('#iarBrand').textContent = b.nome;
  }

  async function start(item, opts = {}) {
    const b = bridge();
    mount();
    if (b && b.ensureViewer) b.ensureViewer();
    A.item = item || b.item();
    if (!A.item) return;
    brandIt();
    A.sim.on = !!opts.sim || Q.get('iar') === 'sim';
    A.root.hidden = false;
    document.body.classList.add('iar-open');
    A.active = true;
    setPhase('intro');
    $('#iarErr').hidden = true;
    $('#iarNative').hidden = !(window.Cardapio3DAR && window.Cardapio3DAR.support.mode !== 'none');
    A.hist = []; A.qs = null; A.hasSensor = false; A.C = [0, 0, 0]; A.planeY = -A.H; A.P = null;
    A.latBuf = []; A.latConf = 0; A.latScan = null; A.lastStepT = 0; A.frameT = 0; A.frameSeq = 0; A.seqSeen = 0; A.seqNew = false; A.basisG = null;
    A.lat = CFG.latencyMs; A.latSaved = A.lat; A.frameKind = ''; A.t0 = performance.now(); A.statT = A.t0;
    A.statEarly = false; A.sensorN = 0; A.sensorT0 = 0; A.renders = 0; A.dtEma = 0; A.dtBins = [0, 0, 0, 0, 0]; A.pLast = 0; A.qn = 0; A.qslow = 0; A.qWinT = 0; A.errs = [];
    { // resolução do sprite do prato: ~2 pixels por pixel CSS (o vídeo da câmera tem menos que isso); a 3x de densidade a GPU do celular não acompanha
      const dpr = window.devicePixelRatio || 1;
      A.m0 = Math.max(1, dpr / 2); A.m = A.m0; A.mMax = Math.max(A.m0, dpr); A.sCss = 0; A.qualT = A.t0;
    }
    if (A.sim.on) { A.sim.truth = []; A.sim.lastCam = -1e9; }
    A.video.hidden = A.sim.on; A.simCv.hidden = !A.sim.on;
    if (A.tracker) A.tracker.reset();
    A.Rcorr = M.m3I(); A.trackSteps = 0; A.okSteps = 0; A.lastOkT = performance.now(); A.vfc = null; A.newFrame = false; A.lastVT = -1;
    setDish(A.item, true);
    updateCamera();
    if (A.sim.on) { $('#iarGo').textContent = 'Iniciar simulação'; }
    cancelAnimationFrame(A.raf); A.raf = requestAnimationFrame(frame);
    if (A.sim.on && opts.autostart !== false) begin();
  }

  async function begin() {
    const err = (m) => { const e = $('#iarErr'); e.textContent = m; e.hidden = false; $('#iarGo').textContent = 'Tentar de novo'; };
    try {
      if (A.sim.on) {
        mountSim();
      } else {
        if (!window.isSecureContext) return err('A câmera só funciona em página segura (https). Abra o link https do cardápio.');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return err('Este navegador não libera a câmera. Tente o Chrome ou o Safari.');
        // 1) permissão de movimento (iOS exige gesto do usuário, por isso vem primeiro)
        const DOE = window.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === 'function') {
          const r = await DOE.requestPermission();
          if (r !== 'granted') return err(/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Sem permissão de movimento. Em Ajustes > Safari, ative “Movimento e orientação”, feche e abra o Safari e tente de novo.' : 'Sem permissão de movimento. Libere os sensores de movimento nas configurações do site e tente de novo.');
        }
        startSensors();
        // 2) câmera traseira
        A.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
        });
        A.video.srcObject = A.stream;
        await A.video.play().catch(() => {});
        if (A.video.requestVideoFrameCallback) { // cada callback = um quadro novo da câmera (o loop de 60 Hz repetiria quadros)
          const cb = (t, meta) => {
            const cap = (meta && meta.captureTime) || 0, kind = cap ? 'cap' : 'pres';
            if (A.frameKind !== kind) { setFrameKind(kind); }
            A.vfc = { present: (meta && meta.presentationTime) || t, capture: cap };
            A.lastFrameEv = performance.now(); A.pseudo = false;
            A.frameT = cap || A.vfc.present; A.frameSeq++; // hora do quadro que está na tela: o prato é desenhado com a orientação DESSE instante
            if (A.active) A.vfcId = A.video.requestVideoFrameCallback(cb);
          };
          A.vfcId = A.video.requestVideoFrameCallback(cb);
        } else setFrameKind('poll');
        await new Promise((res) => {
          if (A.video.videoWidth) return res();
          A.video.addEventListener('loadedmetadata', res, { once: true }); setTimeout(res, 1500);
        });
        // 3) sensores precisam estar entregando dados
        const t0 = performance.now();
        while (!A.hasSensor && performance.now() - t0 < 1800) await new Promise((r) => setTimeout(r, 60));
        if (!A.hasSensor) { stopMedia(); return err('Este aparelho não entregou dados do giroscópio. Use o AR que lê a mesa.'); }
      }
      updateCamera();
      $('#iarIntro').hidden = true;
      enterAim();
      keepAwake();
    } catch (e) {
      console.warn('[IAR]', e);
      stopMedia();
      err(e && e.name === 'NotAllowedError' ? 'Permissão negada. Libere a câmera nas configurações do navegador e tente de novo.' : 'Não foi possível iniciar a câmera. Tente de novo.');
    }
  }

  function stopMedia() {
    window.removeEventListener('deviceorientation', onOrient, true);
    if (A.video && A.vfcId && A.video.cancelVideoFrameCallback) { try { A.video.cancelVideoFrameCallback(A.vfcId); } catch (e) { /* ok */ } A.vfcId = 0; }
    if (A.stream) { A.stream.getTracks().forEach((t) => t.stop()); A.stream = null; }
    if (A.video) A.video.srcObject = null;
  }

  function stop() {
    if (!A.root) return;
    sendStats('stop');
    if (A.wake) { try { A.wake.release(); } catch (_) { /* ok */ } A.wake = null; }
    A.active = false;
    cancelAnimationFrame(A.raf);
    stopMedia();
    A.root.hidden = true;
    document.body.classList.remove('iar-open');
    A.ptr.clear();
    A.sim.on = false; $('#iarSim').hidden = true;
    const it = A.item, cur = bridge().item();
    if (it && cur && it.slug !== cur.slug && window.openDishViewer) window.openDishViewer(it.slug, 'camera', true);
  }

  function setPhase(p) {
    A.phase = p;
    A.root.dataset.phase = p;
    $('#iarReset').hidden = !(p === 'placed');
    $('#iarShot').hidden = !(p === 'placed');
    $('#iarChip').hidden = !(p === 'placed');
  }

  // ------------------------------------------------------------------ prato
  function setDish(item, first) {
    A.item = item;
    bridge().setItem(item);
    A.modelReady = false;
    const mv = A.mv, src = (IS_PHONE && item.mobile_glb) ? item.mobile_glb : bridge().pickGlb(item); // celular: textura 2K (a 8K estoura a memória da GPU)
    $('#iarLoader').hidden = false;
    if (mv.getAttribute('src') !== src) mv.setAttribute('src', src); else onModelLoad();
    $('#iarDish').textContent = shortName(item.name);
    $('#iarMeta').textContent = `${bridge().brl(item.price_brl)} · Ø ${fmtCm(item.dish_diameter_cm)} cm`;
    $('#iarChipT').textContent = item.dish_diameter_cm ? `Tamanho real · Ø ${fmtCm(item.dish_diameter_cm)} cm` : 'Tamanho real';
    A.dishD = (item.dish_diameter_cm || 26) / 100;
    renderStrip();
    A.lastOrbit = null; A.S = 0;
    if (!first && A.phase === 'placed') { A.pop = 0; A.popT0 = performance.now(); }
  }

  function onModelLoad() {
    const mv = A.mv;
    try { const d = mv.getDimensions(); A.dims = { x: d.x, y: d.y, z: d.z }; } catch (e) { /* mantém padrão */ }
    A.modelReady = true;
    try { const b = bridge(); if (b.boostAniso) b.boostAniso(mv); } catch (e) { /* opcional */ }
    $('#iarLoader').hidden = true;
    A.lastOrbit = null;
  }

  function renderStrip() {
    const strip = $('#iarStrip'), items = bridge().items();
    strip.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cam-dish-pill' + (A.item && it.slug === A.item.slug ? ' active' : '');
      b.innerHTML = `<img src="${it.poster || `/models/${it.slug}-poster.webp`}" alt="" width="26" height="26"><span>${shortName(it.name)}</span>`;
      b.addEventListener('click', () => { if (!A.item || it.slug !== A.item.slug) setDish(it, false); });
      b.addEventListener('beforexrselect', (e) => e.preventDefault());
      strip.appendChild(b);
    }
  }

  // ------------------------------------------------------------------ sensores
  const screenAngle = () => (screen.orientation && screen.orientation.angle != null ? screen.orientation.angle : (window.orientation || 0));

  function startSensors() {
    window.removeEventListener('deviceorientation', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
  }

  /** Guarda a amostra do sensor SEM filtro: qualquer suavização atrasa o prato em relação à imagem (o filtro antigo somava ~75 ms em movimento lento). */
  function pushQuat(q, t) {
    const h = A.hist, last = h[h.length - 1];
    if (last && t <= last.t) t = last.t + 0.25; // o relógio dos eventos pode repetir ou voltar um pouco
    h.push({ t, q });
    if (h.length > 420) h.shift(); // ~7 s a 60 Hz: o estimador de atraso usa alguns segundos de histórico
  }

  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const pn = performance.now();
    let t = e.timeStamp; // hora em que o sistema gerou a leitura (não a hora em que o JS conseguiu tratá-la)
    if (!(t > 0) || Math.abs(t - pn) > 1500) t = pn;
    if (!A.hasSensor) A.sensorT0 = pn;
    A.hasSensor = true; A.sensorN++;
    pushQuat(M.deviceQuat(e.alpha || 0, e.beta, e.gamma, screenAngle()), t);
  }

  /** Orientação (quaternion) no instante t, interpolada entre as duas leituras vizinhas. */
  function sampleQuat(t) {
    const h = A.hist, n = h.length;
    if (!n) return null;
    if (n === 1 || t >= h[n - 1].t) return h[n - 1].q;
    if (t <= h[0].t) return h[0].q;
    let lo = 0, hi = n - 1; // maior lo com h[lo].t <= t
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (h[mid].t <= t) lo = mid; else hi = mid; }
    return M.qSlerp(h[lo].q, h[hi].q, clamp((t - h[lo].t) / Math.max(1e-3, h[hi].t - h[lo].t), 0, 1));
  }

  /** Cada tipo de carimbo de tempo do vídeo tem o seu atraso típico; o último valor medido neste aparelho fica salvo. */
  function setFrameKind(kind) {
    A.frameKind = kind;
    A.lat = CFG.latAuto ? clamp(LS.get('c3d.lat.' + kind, kind === 'cap' ? 45 : CFG.latencyMs), 0, 350) : CFG.latencyMs;
    A.latSaved = A.lat; A.latBuf.length = 0; A.latScan = null;
  }

  async function keepAwake() { // a tela não pode apagar com o celular parado olhando a mesa
    try {
      if ('wakeLock' in navigator && !A.wake) { A.wake = await navigator.wakeLock.request('screen'); A.wake.addEventListener('release', () => { A.wake = null; }); }
    } catch (e) { /* sem permissão: segue sem */ }
  }

  // ------------------------------------------------------------------ câmera (pinhole)
  function updateCamera() {
    if (!A.root) return;
    const f0 = A.f, cx0 = A.cx, cy0 = A.cy, s0 = A.phase === 'placed' && A.P && A.basis ? M.worldToScreen(A.P, A.C, A.basis, f0, cx0, cy0) : null;
    A.sw = A.root.clientWidth || innerWidth; A.sh = A.root.clientHeight || innerHeight;
    const vw = A.sim.on ? A.sw : (A.video.videoWidth || A.sw), vh = A.sim.on ? A.sh : (A.video.videoHeight || A.sh);
    A.f = M.focalPx({ videoW: vw, videoH: vh, screenW: A.sw, screenH: A.sh, longFovDeg: CFG.longFovDeg }) * A.fScaleUse;
    A.cx = A.sw / 2; A.cy = A.sh / 2;
    A.lastOrbit = null;
    // focal aprendida durante o uso: o prato fica ONDE ESTÁ na tela (o ponto da mesa sob ele é refeito com a focal nova), sem "escorregar"
    if (s0 && Number.isFinite(s0.u) && A.cx === cx0 && A.cy === cy0 && Math.abs(A.f - f0) > 1e-6) {
      const hit = M.rayPlane(A.C, M.screenToRay(s0.u, s0.v, A.basis, A.f, A.cx, A.cy), A.planeY, CFG.maxDist * 2);
      if (hit) A.P = hit.P;
    }
  }

  // ------------------------------------------------------------------ fluxo: mirar -> colocar
  function enterAim() {
    setPhase('aim');
    A.aim = null;
    A.ring.hidden = false;
    A.shadow.hidden = true;
    A.C0 = A.C.slice();
    A.mv.style.visibility = 'hidden';
    $('#iarOff').hidden = true;
  }

  function placeAt(u, v) {
    if (!A.basis || !Number.isFinite(u) || !Number.isFinite(v)) return false; // ainda sem pose da câmera (primeiro quadro)
    const hit = M.rayPlane(A.C, M.screenToRay(u, v, A.basis, A.f, A.cx, A.cy), A.planeY, CFG.maxDist);
    if (!hit) { toast('Aponte mais para baixo, para a mesa'); return false; }
    A.P = hit.P;
    A.yaw = A.P ? Math.atan2(A.C[0] - A.P[0], A.C[2] - A.P[2]) : 0; // frente do prato para o cliente
    A.pop = 0; A.popT0 = performance.now(); A.placedT = A.popT0;
    A.lastOrbit = null;
    A.ring.hidden = true;
    setPhase('placed');
    if (navigator.vibrate) navigator.vibrate(18);
    coach();
    return true;
  }

  function coach() {
    const t = $('#iarCoachT'), s = $('#iarCoachS'), c = $('#iarCoach');
    clearTimeout(coach._t);
    c.classList.remove('hide');
    if (A.phase === 'aim') {
      if (A.aimHit) { t.textContent = 'Toque onde o prato vai ficar'; s.textContent = 'O anel mostra o tamanho real do prato.'; }
      else { t.textContent = 'Aponte para a mesa'; s.textContent = 'Incline o celular para baixo, olhando para a mesa.'; }
    } else if (A.phase === 'placed') {
      t.textContent = 'Prato na sua mesa';
      s.textContent = 'Arraste para mover · gire com dois dedos · pince se o tamanho não bater com a mesa.';
      coach._t = setTimeout(() => c.classList.add('hide'), 6500);
    }
  }

  // ------------------------------------------------------------------ gestos
  const ptrList = () => [...A.ptr.values()];

  function onDown(e) {
    e.preventDefault();
    if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
    try { A.touch.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
    A.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if (A.phase === 'aim') { A.aim = { u: e.clientX, v: e.clientY }; return; }
    if (A.phase !== 'placed') return;
    if (A.ptr.size === 1) beginDrag(e.clientX, e.clientY);
    else if (A.ptr.size === 2) beginTwo();
  }

  function onMove(e) {
    const p = A.ptr.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (A.phase === 'aim') { A.aim = { u: e.clientX, v: e.clientY }; return; }
    if (A.phase !== 'placed') return;
    if (A.ptr.size >= 2 && A.two) moveTwo();
    else if (A.drag) moveDrag(e.clientX, e.clientY);
  }

  function onUp(e) {
    const p = A.ptr.get(e.pointerId);
    if (!p) return;
    A.ptr.delete(e.pointerId);
    if (A.phase === 'aim') { placeAt(p.x, p.y); return; }
    if (A.phase === 'placed') {
      if (A.two && A.ptr.size < 2) { A.two = null; LS.set('c3d.camH', +A.H.toFixed(3)); }
      if (A.ptr.size === 1) { const r = ptrList()[0]; beginDrag(r.x, r.y); } else A.drag = null;
    }
  }

  const rayHit = (u, v) => (A.basis ? M.rayPlane(A.C, M.screenToRay(u, v, A.basis, A.f, A.cx, A.cy), A.planeY, CFG.maxDist * 1.5) : null);

  function beginDrag(u, v) {
    const hit = rayHit(u, v);
    A.drag = hit ? { off: M.sub(A.P, hit.P) } : null;
  }
  function moveDrag(u, v) {
    if (!A.drag) return;
    const hit = rayHit(u, v);
    if (hit) A.P = M.add(hit.P, A.drag.off);
  }

  function beginTwo() {
    const [a, b] = ptrList();
    A.drag = null;
    A.two = { ang: Math.atan2(b.y - a.y, b.x - a.x), dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, H0: A.H, P0: A.P.slice(), yaw0: A.yaw };
  }
  function moveTwo() {
    const [a, b] = ptrList(), t = A.two;
    const ang = Math.atan2(b.y - a.y, b.x - a.x), dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let d = ang - t.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
    A.yaw = t.yaw0 - d; // dedos no sentido horário => prato gira no sentido horário visto de cima
    // pinça = calibra o tamanho: muda a altura assumida do celular preservando o ponto na tela
    const k = dist / t.dist;
    const H = clamp(t.H0 / k, CFG.minH, CFG.maxH), s = H / t.H0;
    A.H = H; A.planeY = A.C[1] - H;
    A.P = M.add(A.C, M.mul(M.sub(t.P0, A.C), s));
  }

  // ------------------------------------------------------------------ loop
  const corrBasis = (bg) => M.basisFromRcv(M.m3mul(A.Rcorr, M.rotCV(bg)));

  /** Base da câmera SÓ com o giroscópio, na hora do quadro de vídeo que está na tela (quadro-travado): prato e imagem andam juntos. */
  function gyroBasis(now) {
    const q = sampleQuat((A.frameT || now) - A.lat);
    return q ? M.basisFromQuat(q) : null;
  }

  // ---- simulação: sensores a cada quadro; câmera a 30 fps mostrando a cena com o atraso `latTrue` (como um celular de verdade)
  function truthAt(t) {
    const h = A.sim.truth;
    if (t <= h[0].t) return h[0];
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= t) { const k = clamp((t - h[i - 1].t) / Math.max(1e-3, h[i].t - h[i - 1].t), 0, 1); return { q: M.qSlerp(h[i - 1].q, h[i].q, k), C: M.add(h[i - 1].C, M.mul(M.sub(h[i].C, h[i - 1].C), k)) }; }
    }
    return h[h.length - 1];
  }
  function simAdvance(now) {
    const S = A.sim, e = S.e, qT = M.deviceQuat(e.alpha, e.beta, e.gamma, 0), ge = S.gyroErr, j = ge.jitterDeg * D2R;
    const err = ge.axis.map((v) => v * ge.biasDeg * D2R).map((v) => v + (j ? (Math.random() - 0.5) * 2 * j : 0)), ang = Math.hypot(err[0], err[1], err[2]);
    pushQuat(ang > 1e-9 ? M.qMul(qT, M.qFromAxisAngle([err[0] / ang, err[1] / ang, err[2] / ang], ang)) : qT, now); // erro no referencial do aparelho
    A.hasSensor = true; A.frameKind = A.frameKind || 'pres';
    S.truth.push({ t: now, q: qT, C: S.C.slice() });
    while (S.truth.length > 2 && S.truth[0].t < now - 4000) S.truth.shift();
    if (now - S.lastCam >= S.camDt - 1e-6) {
      S.lastCam = now;
      const tr = truthAt(now - (S.latTrue == null ? A.lat : S.latTrue));
      S.frameBasis = M.basisFromQuat(tr.q); S.frameC = tr.C; A.simBasis = S.frameBasis;
      drawSim(S.frameC);
      A.frameT = now; A.frameSeq++;
    }
  }

  // ---- desempenho: quadros lentos -> o sprite do prato passa a ter menos pixels (e volta quando sobra folga)
  function perfTick(now, manual) {
    if (manual) { A.pLast = now; return; }
    if (A.pLast) {
      const dt = now - A.pLast;
      if (dt > 0 && dt < 1000) {
        A.dtEma = A.dtEma ? A.dtEma * 0.94 + dt * 0.06 : dt;
        A.dtBins[dt <= 18.5 ? 0 : dt <= 25 ? 1 : dt <= 35 ? 2 : dt <= 55 ? 3 : 4]++;
        A.qn++; if (dt > 42) A.qslow++; // 30 fps travado pelo sistema (modo de economia) dá ~33 ms estáveis: não conta como lento
      }
    }
    A.pLast = now;
    if (!A.qWinT) A.qWinT = now;
    if (now - A.qWinT > 3000) {
      const frac = A.qn ? A.qslow / A.qn : 0;
      if (A.phase === 'placed' && frac > 0.18 && A.m < A.mMax - 0.01) { A.m = Math.min(A.mMax, +(A.m * 1.25).toFixed(3)); A.S = 0; A.lastOrbit = null; A.qualT = now; }
      else if (A.phase === 'placed' && frac < 0.01 && A.m > A.m0 + 0.01 && now - A.qualT > 30000) { A.m = Math.max(A.m0, +(A.m / 1.25).toFixed(3)); A.S = 0; A.lastOrbit = null; A.qualT = now; }
      A.qn = 0; A.qslow = 0; A.qWinT = now;
    }
  }

  // ---- atraso câmera x sensor: mede em vez de supor
  const LATS = []; for (let L = -10; L <= 330; L += 10) LATS.push(L);
  /** Remove a parte lenta (média móvel de ±6 passos): o movimento lento do celular (e a translação, que também parece rotação) não diz nada sobre o atraso. */
  function highPass(series) {
    const n = series.length, out = series.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const lo = Math.max(0, i - 6), hi = Math.min(n - 1, i + 6), c = hi - lo + 1, m = [0, 0, 0];
      for (let j = lo; j <= hi; j++) { m[0] += series[j][0]; m[1] += series[j][1]; m[2] += series[j][2]; }
      out[i] = [series[i][0] - m[0] / c, series[i][1] - m[1] / c, series[i][2] - m[2] / c];
    }
    return out;
  }
  /**
   * Compara, quadro a quadro, a rotação vista na IMAGEM com a rotação do sensor deslocada por L ms (as duas sem a parte lenta).
   * O L que mais correlaciona é o atraso real deste aparelho (câmera + sistema). Roda em fatias (3 candidatos por quadro) para não travar o desenho.
   * Movimento lento e suave quase não carrega informação de atraso (e também quase não o expõe): nesse caso não mexe em nada.
   */
  function estimateLatency(now) {
    if (!CFG.latAuto) return;
    let sc = A.latScan;
    if (!sc) {
      if (now - A.latT < 2500 || A.latBuf.length < 40 || A.hist.length < 30) return;
      const buf = A.latBuf.slice();
      const hp = highPass(buf.map((s2) => s2.w));
      let ei = 0;
      for (const v of hp) ei += v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      A.latT = now;
      if (ei < 1.5e-4) return; // pouca "agitação" rápida (< ~0,7° de rotação rápida somada): não dá para medir
      sc = A.latScan = { buf, hp, ei, i: 0, cs: [] };
    }
    for (let n = 0; n < 3 && sc.i < LATS.length; n++, sc.i++) {
      const L = LATS[sc.i], gs = sc.buf.map((s2) => M.stepRotVec(sampleQuat(s2.t0 - L), sampleQuat(s2.t1 - L))), hg = highPass(gs);
      let num = 0, eg = 0;
      for (let i = 0; i < hg.length; i++) { num += hg[i][0] * sc.hp[i][0] + hg[i][1] * sc.hp[i][1] + hg[i][2] * sc.hp[i][2]; eg += hg[i][0] * hg[i][0] + hg[i][1] * hg[i][1] + hg[i][2] * hg[i][2]; }
      sc.cs.push(eg > 0 ? num / Math.sqrt(eg * sc.ei) : -1);
    }
    if (sc.i < LATS.length) return;
    A.latScan = null; A.latT = now;
    const cs = sc.cs;
    let k = 0;
    for (let i = 1; i < cs.length; i++) if (cs[i] > cs[k]) k = i;
    A.latConf = cs[k];
    const side = Math.max(cs[Math.max(0, k - 6)], cs[Math.min(cs.length - 1, k + 6)]);
    if (cs[k] < 0.5 || cs[k] - side < 0.08) return; // sem um pico bem definido: não mexe
    let L = LATS[k];
    if (k > 0 && k < cs.length - 1) { const d = cs[k - 1] - 2 * cs[k] + cs[k + 1]; if (d < -1e-9) L += (10 * 0.5 * (cs[k - 1] - cs[k + 1])) / d; } // vértice da parábola
    A.lat = clamp(A.lat + 0.6 * (L - A.lat), 0, 350);
    if (!A.sim.on && Math.abs(A.lat - A.latSaved) > 3 && now - A.latSaveT > 4000) { A.latSaveT = now; A.latSaved = A.lat; LS.set('c3d.lat.' + A.frameKind, +A.lat.toFixed(1)); }
  }

  function frame(now, manual) {
    if (!A.active) return;
    if (!manual) A.raf = requestAnimationFrame(frame);
    perfTick(now, manual);
    if (A.sim.on) { if (A.phase !== 'intro') simAdvance(now); }
    else if (!A.vfc && A.video && A.video.readyState >= 2 && A.video.currentTime !== A.lastVT) { // sem requestVideoFrameCallback: um quadro novo = currentTime mudou
      if (!A.frameKind) setFrameKind('poll');
      A.lastVT = A.video.currentTime; A.frameT = now; A.frameSeq++; A.lastFrameEv = performance.now(); A.pseudo = false;
    }
    // nenhum aviso de quadro novo (rVFC/currentTime não funcionam neste navegador, ex.: vídeo de câmera no Safari): 1 quadro a cada 40 ms;
    // os repetidos são descartados pela assinatura dos pixels no rastreio. Sem isto o prato congelava e o rastreio nunca rodava.
    if (!A.sim.on && A.phase !== 'intro' && A.video && A.video.readyState >= 2 && performance.now() - A.lastFrameEv > (A.pseudo ? 33 : 80)) {
      A.pseudo = true; A.lastFrameEv = performance.now(); A.frameT = now; A.frameSeq++;
      if (!A.frameKind) setFrameKind('tick');
    }
    A.seqNew = A.frameSeq !== A.seqSeen; A.seqSeen = A.frameSeq;
    if (A.seqNew || !A.basisG) { const g = gyroBasis(now); if (!g) return; A.basisG = g; }
    const bg = A.basisG;
    if (Math.abs(A.fScaleUse - A.fScale) > 2e-5) { A.fScaleUse += (A.fScale - A.fScaleUse) * 0.12; updateCamera(); } // focal aprendida entra suave
    if (A.phase === 'aim' || A.phase === 'placed') trackStep(now);
    A.basis = corrBasis(bg); // giroscópio (na hora do quadro) + correção visual
    if (A.phase === 'aim') updateAim();
    else if (A.phase === 'placed') updatePlaced(now);
    adaptLight(now);
    if (A.phase === 'aim' || A.phase === 'placed') estimateLatency(now);
    const warn = $('#iarWarn');
    if (warn) {
      const bad = A.phase === 'placed' && now - Math.max(A.lastOkT, A.placedT) > 2500;
      warn.hidden = !bad;
      if (bad) warn.textContent = A.trackOn ? 'Rastreio da mesa fraco · aponte para um trecho com textura' : 'Rastreio indisponível · o prato só acompanha giros';
    }
    if (!manual && !A.sim.on && !A.statEarly && now - A.t0 > 8000 && (A.phase === 'aim' || A.phase === 'placed')) { A.statEarly = true; sendStats('early'); } // chega mesmo se a pessoa fechar logo
    if (!manual && !A.sim.on && now - A.statT > 20000 && (A.phase === 'aim' || A.phase === 'placed')) { A.statT = now; sendStats('tick'); }
    if (A.dbg && now - (A.dbgT || 0) > 400) {
      A.dbgT = now;
      const q = A.tq || {}, hz = A.sensorT0 ? A.sensorN / Math.max(0.5, (performance.now() - A.sensorT0) / 1000) : 0;
      A.dbg.textContent = `fov ${CFG.longFovDeg}°×${A.fScale.toFixed(3)} f ${A.f | 0}px H ${A.H.toFixed(2)}m S ${A.S} m ${A.m.toFixed(2)}\nlat ${A.lat.toFixed(0)}ms (${A.frameKind || '-'}) c ${A.latConf.toFixed(2)} n ${A.latBuf.length}  fps ${A.dtEma ? (1000 / A.dtEma).toFixed(0) : '-'}  sens ${hz.toFixed(0)}Hz\nC ${A.C.map((v) => (v * 100).toFixed(1)).join(', ')} cm   Rcorr ${(M.rotAngle(A.Rcorr) / D2R).toFixed(2)}°\ntrack ${A.trackOn ? (q.ok ? 'OK' : 'fraco') : 'off'} pts ${q.tracked | 0} in ${q.inliers | 0} r ${(q.ratio || 0).toFixed(2)} rms ${(q.rms || 0).toFixed(2)}\nrastreio ${A.trackMs.toFixed(1)}ms @${A.trackLong}px quadros ${A.trackSteps} ok ${A.okSteps} (${A.trackSteps ? Math.round((100 * A.okSteps) / A.trackSteps) : 0}%) reloc ${A.tracker ? A.tracker.relocCount : 0} renders ${A.renders}\nfase ${A.phase} build ${BUILD} trackOn ${A.trackOn} err ${A.trackErr}${A.trackLastErr ? ' (' + A.trackLastErr + ')' : ''} ${A.errs.length ? 'ERR ' + A.errs[0] : ''}`;
    }
  }

  // ------------------------------------------------------------------ telemetria: só números de desempenho, para o servidor do próprio cardápio (desligue com ?telemetry=0)
  function stats(kind) {
    const q = A.tq || {}, now = performance.now(), v = A.video, vq = v && v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    const bins = A.dtBins, tot = bins.reduce((a, b) => a + b, 0) || 1;
    return {
      v: 5, build: BUILD, kind, dur: Math.round((now - A.t0) / 1000), phase: A.phase,
      dev: { dpr: window.devicePixelRatio, scr: [innerWidth, innerHeight], mem: navigator.deviceMemory || 0, cores: navigator.hardwareConcurrency || 0, ios: IS_IOS, phone: IS_PHONE, conn: (navigator.connection && navigator.connection.effectiveType) || '' },
      cam: { w: v ? v.videoWidth : 0, h: v ? v.videoHeight : 0, rvfc: !!A.vfc, kind: A.frameKind, frames: A.frameSeq, drop: vq ? vq.droppedVideoFrames : -1 },
      perf: { fps: A.dtEma ? +(1000 / A.dtEma).toFixed(1) : 0, bins: bins.map((b) => +(b / tot).toFixed(3)), trackMs: +A.trackMs.toFixed(1), trackLong: A.trackLong, renders: A.renders },
      track: { steps: A.trackSteps, ok: A.okSteps, pts: q.tracked | 0, inl: q.inliers | 0, ratio: +(q.ratio || 0).toFixed(2), rms: +(q.rms || 0).toFixed(2), fScale: +A.fScale.toFixed(3), lat: +A.lat.toFixed(1), latConf: +A.latConf.toFixed(2), latN: A.latBuf.length, keys: A.tracker ? A.tracker.keyCount : 0, reloc: A.tracker ? A.tracker.relocCount : 0, rc: +(M.rotAngle(A.Rcorr) / D2R).toFixed(2) },
      sensor: { hz: A.sensorT0 ? +(A.sensorN / Math.max(0.5, (now - A.sensorT0) / 1000)).toFixed(1) : 0 },
      render: { m: +A.m.toFixed(2), S: A.S, glb: ((A.mv && A.mv.getAttribute('src')) || '').split('/').pop() },
      trk: { on: A.trackOn, err: A.trackErr, lastErr: A.trackLastErr },
      errs: A.errs.slice(0, 3),
    };
  }
  function sendStats(kind) {
    if (Q.get('telemetry') === '0' || A.sim.on) return;
    try {
      const body = JSON.stringify(stats(kind));
      if (navigator.sendBeacon && navigator.sendBeacon('/api/ar-log', new Blob([body], { type: 'application/json' }))) return;
      fetch('/api/ar-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (e) { /* telemetria nunca atrapalha o AR */ }
  }

  // ------------------------------------------------------------------ rastreio da mesa (translação do celular)
  /** Reduz o quadro para o tamanho do rastreio SEM serrilhado. drawImage direto de 1280x720 para ~126x224 só amostra alguns pixels
   *  (textura fina "pisca" de um quadro para o outro e o rastreio se perde: medido, o prato deslizava ~35 px). Cada passo de 1/2
   *  é uma média exata de 2x2 pixels; sobra no máximo um passo final de menos de 2x. */
  function shrinkTo(src, sw, sh) {
    const tw = A.trackCv.width, th = A.trackCv.height;
    let cur = src, cw = sw, ch = sh, i = 0;
    while (cw >= 2 * tw && ch >= 2 * th) {
      const nw = cw >> 1, nh = ch >> 1, cv = A.trackStages[i] || (A.trackStages[i] = document.createElement('canvas'));
      if (cv.width !== nw || cv.height !== nh) { cv.width = nw; cv.height = nh; }
      const c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = true; c2.imageSmoothingQuality = 'high';
      c2.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
      cur = cv; cw = nw; ch = nh; i++;
    }
    A.trackCtx.imageSmoothingEnabled = true; A.trackCtx.imageSmoothingQuality = 'high';
    A.trackCtx.drawImage(cur, 0, 0, cw, ch, 0, 0, tw, th);
  }

  function trackStep(now) {
    if (!TR || !A.trackOn || !A.seqNew) return; // só quadros NOVOS da câmera (o loop roda a 60 Hz; repetir um quadro com a orientação já adiantada quebra a geometria)
    const src = A.sim.on ? A.simCv : A.video;
    if (!src || (!A.sim.on && (A.video.readyState < 2 || !A.video.videoWidth))) return;
    if (now - A.trackT < Math.max(12, Math.min(70, A.trackMs * 2))) return; // nunca usa mais de ~50% do tempo: adapta ao celular
    A.trackT = now;
    const vw = A.sim.on ? A.simCv.width : A.video.videoWidth, vh = A.sim.on ? A.simCv.height : A.video.videoHeight;
    const key = vw + 'x' + vh + '@' + A.trackLong;
    if (!A.tracker || A.trackDim !== key) {
      const long = A.trackLong, tw = Math.max(2, Math.round((long * vw) / Math.max(vw, vh) / 2) * 2), th = Math.max(2, Math.round((long * vh) / Math.max(vw, vh) / 2) * 2);
      const f = (Math.max(tw, th) / 2) / Math.tan((CFG.longFovDeg * D2R) / 2);
      A.tracker = TR.createTracker({ w: tw, h: th, f, fScale: A.fScale, learnFov: CFG.learnFov, sigmaSpeed: CFG.sigmaSpeed });
      A.trackDim = key;
      A.trackCv = document.createElement('canvas'); A.trackCv.width = tw; A.trackCv.height = th;
      A.trackCtx = A.trackCv.getContext('2d', { willReadFrequently: true });
      A.lastStepT = 0; A.latBuf.length = 0; A.latScan = null; // rastreador novo: sem quadro anterior (o fluxo precisa de dois quadros seguidos)
    }
    const { width: tw, height: th } = A.trackCv;
    try {
      shrinkTo(src, vw, vh);
      const img = A.trackCtx.getImageData(0, 0, tw, th);
      if (!A.sim.on) { // o mesmo quadro desenhado duas vezes não é um quadro novo: pular (não depende de rVFC nem de currentTime, que variam entre navegadores)
        let sig = 0; const px = img.data;
        for (let i = 1; i < px.length; i += 388) sig = (sig * 33 + px[i]) | 0;
        if (sig === A.lastSig) return;
        A.lastSig = sig;
      }
      const t0 = performance.now();
      const r = A.tracker.step(img.data, A.basisG, A.C, A.planeY, A.Rcorr); // orientação NA HORA DESTE QUADRO (quadro-travado)
      const dt = performance.now() - t0 + 0.6; // + leitura do quadro
      A.trackMs = A.trackMs ? A.trackMs * 0.85 + dt * 0.15 : dt;
      if (A.trackSteps > 40 && A.trackMs > 26 && A.trackLong > 144) { // celular lento (de verdade, depois do aquecimento): baixa a resolução do rastreio (224 -> 176 -> 144)
        if (++A.slowCount >= 20) { A.trackLong = A.trackLong > 190 ? 176 : 144; A.slowCount = 0; A.trackMs = 0; A.tracker = null; }
      } else if (A.trackMs <= 26) A.slowCount = 0;
      A.tq = r; A.trackSteps++; A.trackErr = 0;
      const ft = A.frameT || now;
      if (r.flow && r.flow.n >= 12 && A.lastStepT > 0 && ft > A.lastStepT) { A.latBuf.push({ t0: A.lastStepT, t1: ft, w: r.flow.w }); if (A.latBuf.length > 150) A.latBuf.shift(); }
      A.lastStepT = ft;
      const fs = A.tracker ? A.tracker.fScale : A.fScale;
      if (Math.abs(fs - A.fScale) > 1e-4) A.fScale = fs; // a focal aprendida vira a do desenho (suavizada em frame())
      if (CFG.learnFov && !A.sim.on && now - A.fsSaveT > 4000 && Math.abs(A.fScale - A.fsSaved) > 0.004) { A.fsSaveT = now; A.fsSaved = A.fScale; LS.set('c3d.fs', +A.fScale.toFixed(4)); }
      if (r.ok && Number.isFinite(r.C[0] + r.C[1] + r.C[2])) {
        const jump = Math.hypot(r.C[0] - A.C[0], r.C[1] - A.C[1], r.C[2] - A.C[2]);
        const far = Math.hypot(r.C[0] - A.C0[0], r.C[1] - A.C0[1], r.C[2] - A.C0[2]);
        if (jump < (r.reloc ? 0.6 : 0.08) && far < 1.5 && M.rotAngle(r.Rcorr) < 12 * D2R) { A.C = r.C; A.Rcorr = r.Rcorr; A.lastOkT = now; A.okSteps++; } // travas de segurança
      }
    } catch (e) { // uma falha isolada (quadro de vídeo ainda não pronto, etc.) não pode matar o rastreio pelo resto da sessão
      A.trackErr++; A.trackLastErr = String((e && e.message) || e).slice(0, 120);
      if (A.errs.length < 5) A.errs.push('rastreio: ' + A.trackLastErr);
      console.warn('[IAR] rastreio:', e);
      if (A.trackErr % 8 === 0) A.tracker = null; // recria o rastreador (estado possivelmente ruim)
      if (A.trackErr >= 40) A.trackOn = false;     // só desliga se falhar de forma repetida
    }
  }

  function updateAim() {
    const u = A.aim ? A.aim.u : A.cx, v = A.aim ? A.aim.v : A.cy * 1.08;
    const hit = rayHit(u, v);
    const had = !!A.aimHit;
    A.aimHit = hit && hit.t <= CFG.maxDist ? hit : null;
    if (!!A.aimHit !== had || !A.coached) { A.coached = true; coach(); }
    if (!A.aimHit) { A.ring.hidden = true; return; }
    A.ring.hidden = false;
    const H = M.planeHomography({ C: A.C, P: A.aimHit.P, basis: A.basis, f: A.f, cx: A.cx, cy: A.cy, E: 400, D: A.dishD / 0.95 });
    A.ring.style.transform = M.toMatrix3d(H);
  }

  function updatePlaced(now) {
    const mv = A.mv;
    if (!A.P || !A.modelReady) { mv.style.visibility = 'hidden'; return; }
    const Pc = [A.P[0], A.P[1] + A.dims.y / 2, A.P[2]];
    const rel = M.sub(Pc, A.C), dist = M.len(rel);
    const zc = M.dot(rel, A.basis.fwd);
    const offAxis = Math.acos(clamp(zc / dist, -1, 1));
    // elemento SxS que cobre o prato com folga (degraus para não redimensionar toda hora)
    const px = (A.f * Math.max(A.dims.x, A.dims.z)) / Math.max(dist, 0.05);
    // sprite SxS (px de tela) com folga de 1,6x sobre o prato. Só muda em degraus largos: redimensionar o canvas WebGL trava o quadro
    // (antes mudava a cada 5% de aproximação do celular)
    let S = A.S || 0;
    const need = px * 1.6, SIZES = [256, 320, 400, 512, 640, 800, 1000];
    if (!S || need > S) S = SIZES.find((v) => v >= need * 1.2) || SIZES[SIZES.length - 1];
    else if (need < S * 0.4) S = SIZES.find((v) => v >= need * 1.35) || SIZES[0];
    const fov = clamp(2 * Math.atan((S / 2) / A.f) / D2R, 3, 100);
    const o = M.orbitFromCamera(A.C, Pc, A.yaw);
    const phi = clamp(o.phi, 2 * D2R, 89 * D2R);
    const sCss = Math.round(S / A.m); // tamanho CSS do elemento: o canvas tem sCss x densidade pixels; a homografia devolve a escala (m)
    if (S !== A.S || sCss !== A.sCss) { mv.style.width = sCss + 'px'; mv.style.height = sCss + 'px'; A.S = S; A.sCss = sCss; A.lastOrbit = null; }
    const last = A.lastOrbit;
    // histerese de 0,3° no ponto de vista: a homografia mantém a POSIÇÃO exata a cada quadro; só a aparência (ângulo de visão) fica até 0,3° atrasada
    if (!last || Math.abs(last.theta - o.theta) > 5e-3 || Math.abs(last.phi - phi) > 5e-3 || Math.abs(last.radius - o.radius) > 0.012 * o.radius || Math.abs(A.lastFov - fov) > 0.15) {
      mv.cameraOrbit = `${o.theta.toFixed(5)}rad ${phi.toFixed(5)}rad ${o.radius.toFixed(4)}m`;
      mv.fieldOfView = `${fov.toFixed(3)}deg`;
      if (mv.jumpCameraToGoal) mv.jumpCameraToGoal();
      A.lastOrbit = { theta: o.theta, phi, radius: o.radius }; A.lastFov = fov; A.renders++;
    }
    // aparição: cresce de 62% a 100% com leve "quique"
    const k = clamp((now - A.popT0) / 380, 0, 1);
    A.pop = k;
    const ease = k >= 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    const sc = 0.62 + 0.38 * ease;
    let H = M.modelHomography({ C: A.C, Pc, basis: A.basis, f: A.f, cx: A.cx, cy: A.cy, S });
    if (k < 1) {
      const T = (x, y) => [[1, 0, x], [0, 1, y], [0, 0, 1]];
      H = M.m3mul(H, M.m3mul(T(S / 2, S / 2), M.m3mul([[sc, 0, 0], [0, sc, 0], [0, 0, 1]], T(-S / 2, -S / 2))));
    }
    H = M.m3mul(H, [[A.m, 0, 0], [0, A.m, 0], [0, 0, 1]]); // pixels do elemento -> unidades de S
    const vis = zc > 0.06 && offAxis < 75 * D2R;
    mv.style.visibility = vis ? 'visible' : 'hidden';
    mv.style.opacity = String(clamp(k * 1.6, 0, 1));
    if (vis) mv.style.transform = M.toMatrix3d(H);
    // sombra de contato sobre a mesa (em perspectiva, no plano): aterra o prato no cenário real
    const sh = A.shadow;
    sh.hidden = !vis;
    if (vis) {
      const Hs = M.planeHomography({ C: A.C, P: A.P, basis: A.basis, f: A.f, cx: A.cx, cy: A.cy, E: 400, D: A.dishD * 1.55 });
      sh.style.transform = M.toMatrix3d(Hs);
      sh.style.opacity = String(clamp(k * 1.4, 0, 1));
    }

    // seta quando o prato sai da tela
    const s = M.worldToScreen(Pc, A.C, A.basis, A.f, A.cx, A.cy);
    const m = 36, offscreen = zc <= 0.06 || s.u < m || s.u > A.sw - m || s.v < m || s.v > A.sh - m;
    const off = $('#iarOff');
    off.hidden = !offscreen;
    if (offscreen) {
      let dx = s.u - A.cx, dy = s.v - A.cy;
      if (zc <= 0.06) { dx = -dx; dy = -dy; }
      const ang = Math.atan2(dy, dx), r = Math.min(A.sw, A.sh) / 2 - 56;
      off.style.transform = `translate(${A.cx + Math.cos(ang) * r - 22}px,${A.cy + Math.sin(ang) * r - 22}px) rotate(${ang}rad)`;
    }
  }

  // ------------------------------------------------------------------ luz: ajusta o prato ao brilho da câmera
  function adaptLight(now) {
    if (now - A.light.t < 450 || !A.modelReady) return; // só depois de o <model-viewer> existir de fato
    A.light.t = now;
    const src = A.sim.on ? A.simCv : A.video;
    if (!src || (!A.sim.on && A.video.readyState < 2)) return;
    if (!adaptLight.cv) { adaptLight.cv = document.createElement('canvas'); adaptLight.cv.width = 24; adaptLight.cv.height = 24; adaptLight.g = adaptLight.cv.getContext('2d', { willReadFrequently: true }); }
    try {
      adaptLight.g.drawImage(src, 0, 0, 24, 24);
      const d = adaptLight.g.getImageData(0, 0, 24, 24).data;
      let y = 0;
      for (let i = 0; i < d.length; i += 4) y += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      y /= d.length / 4;
      const target = clamp(0.58 + 0.72 * y, 0.62, 1.22);
      A.light.e += (target - A.light.e) * 0.35;
      A.mv.exposure = +A.light.e.toFixed(3);
    } catch (e) { /* vídeo sem permissão de leitura */ }
  }

  // ------------------------------------------------------------------ foto
  async function takePhoto() {
    try {
      const mv = A.mv;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(A.sw * dpr), Hh = Math.round(A.sh * dpr);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const g = cv.getContext('2d');
      const src = A.sim.on ? A.simCv : A.video;
      const vw = src.videoWidth || src.width, vh = src.videoHeight || src.height;
      const sc = Math.max(W / vw, Hh / vh);
      g.drawImage(src, (W - vw * sc) / 2, (Hh - vh * sc) / 2, vw * sc, vh * sc);
      const blob = await mv.toBlob({ mimeType: 'image/png', idealAspect: false });
      const img = await createImageBitmap(blob);
      // aproximação afim da homografia no centro do elemento (suficiente para uma foto)
      const S = A.S || 512;
      const Hm = M.modelHomography({ C: A.C, Pc: [A.P[0], A.P[1] + A.dims.y / 2, A.P[2]], basis: A.basis, f: A.f, cx: A.cx, cy: A.cy, S });
      const p0 = M.applyH(Hm, S / 2, S / 2), p1 = M.applyH(Hm, S / 2 + 1, S / 2), p2 = M.applyH(Hm, S / 2, S / 2 + 1);
      g.save();
      g.setTransform(dpr * (p1.u - p0.u), dpr * (p1.v - p0.v), dpr * (p2.u - p0.u), dpr * (p2.v - p0.v), dpr * (p0.u - (p1.u - p0.u) * S / 2 - (p2.u - p0.u) * S / 2), dpr * (p0.v - (p1.v - p0.v) * S / 2 - (p2.v - p0.v) * S / 2));
      g.drawImage(img, 0, 0, S, S);
      g.restore();
      const b = bridge().brand();
      g.fillStyle = 'rgba(15,23,42,.62)'; g.fillRect(0, Hh - 64 * dpr, W, 64 * dpr);
      g.fillStyle = '#fff'; g.font = `800 ${16 * dpr}px system-ui,sans-serif`; g.textBaseline = 'middle';
      g.fillText(`${b.nome} · ${shortName(A.item.name)}`, 18 * dpr, Hh - 32 * dpr);
      const out = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.92));
      const file = new File([out], `${shortName(A.item.name).replace(/\W+/g, '-').toLowerCase()}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: b.nome });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(out); a.download = file.name; a.click(); toast('Foto salva'); }
    } catch (e) { console.warn('[IAR] foto', e); toast('Não foi possível tirar a foto'); }
  }

  // ------------------------------------------------------------------ simulação (desktop / testes)
  function mountSim() {
    const cv = A.simCv;
    cv.width = 260; cv.height = Math.max(160, Math.round(260 * (A.sh / A.sw)));
    cv.hidden = false;
    A.sim.canvas = cv; A.sim.ctx = cv.getContext('2d'); A.sim.img = A.sim.ctx.createImageData(cv.width, cv.height);
    A.video.hidden = true;
  }

  const hash2 = (ix, iz) => { let h = (ix * 374761393 + iz * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, s = (t) => t * t * (3 - 2 * t);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return (a * (1 - s(fx)) + b * s(fx)) * (1 - s(fz)) + (c * (1 - s(fx)) + d * s(fx)) * s(fz);
  };

  const simF = () => M.focalPx({ videoW: A.sw, videoH: A.sh, screenW: A.sw, screenH: A.sh, longFovDeg: A.sim.trueFov || CFG.longFovDeg });

  function drawSim(Cs) {
    const cv = A.sim.canvas, d = A.sim.img.data, W = cv.width, Hh = cv.height;
    const sf = simF(), sx = A.sw / W, sy = A.sh / Hh, trueY = -A.sim.trueH; // a mesa tem altura FIXA no mundo (descer o celular a aproxima)
    for (let j = 0; j < Hh; j++) {
      for (let i = 0; i < W; i++) {
        const ray = M.screenToRay((i + 0.5) * sx, (j + 0.5) * sy, A.simBasis, sf, A.cx, A.cy);
        const k = (j * W + i) * 4;
        const t = ray[1] < -0.002 ? (trueY - Cs[1]) / ray[1] : -1;
        let r, g, b;
        if (t > 0 && t < 40) {
          const x = Cs[0] + ray[0] * t, z = Cs[2] + ray[2] * t;
          const cell = (Math.floor(x / 0.1) + Math.floor(z / 0.1)) & 1;
          const line = Math.abs(((x / 0.5) % 1 + 1) % 1 - 0.5) > 0.485 || Math.abs(((z / 0.5) % 1 + 1) % 1 - 0.5) > 0.485;
          [r, g, b] = cell ? [150, 104, 66] : [128, 86, 52];
          const grain = 0.74 + 0.5 * (0.6 * vnoise(x * 32, z * 32) + 0.4 * vnoise(x * 95, z * 95)); // veio de madeira
          r *= grain; g *= grain; b *= grain;
          if (line) [r, g, b] = [240, 220, 190];
          const dr = Math.hypot(x - 0.1, z + 0.55);               // prato de referência real: Ø 26 cm em (0,10; -0,55)
          if (dr < 0.13) [r, g, b] = [226, 228, 232];
          if (dr > 0.115 && dr < 0.13) [r, g, b] = [255, 255, 255];
          const fade = clamp(1 - t / 9, 0.35, 1); r *= fade; g *= fade; b *= fade;
        } else { const w = clamp(0.5 + ray[1] * 0.8, 0, 1); [r, g, b] = [60 + 70 * w, 76 + 70 * w, 100 + 60 * w]; }
        d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
      }
    }
    A.sim.ctx.putImageData(A.sim.img, 0, 0);
  }

  // ------------------------------------------------------------------ API
  window.InstantAR = {
    start, stop, begin,
    get state() { return A; },
    sim: {
      set(e) { Object.assign(A.sim.e, e); },
      get euler() { return A.sim.e; },
      setTrueHeight(h) { A.sim.trueH = h; },
      setTrueFov(deg) { A.sim.trueFov = deg; }, // FOV (lado maior) da câmera simulada, diferente do assumido
      trueHit(u, v) { return A.simBasis ? M.rayPlane(A.sim.frameC, M.screenToRay(u, v, A.simBasis, simF(), A.cx, A.cy), -A.sim.trueH, 50) : null; }, // ponto REAL da mesa sob o pixel
      trueProject(P) { return A.simBasis ? M.worldToScreen(P, A.sim.frameC, A.simBasis, simF(), A.cx, A.cy) : { u: NaN, v: NaN, z: 0 }; }, // como a imagem que está na tela
      setTrueLatency(ms) { A.sim.latTrue = ms; },
      setCamFps(fps) { A.sim.camDt = 1000 / fps; },
      setPos(p) { A.sim.C = p.slice(); }, // posição REAL (simulada) do celular
      setGyroError(o) { Object.assign(A.sim.gyroErr, o); }, // erro do giroscópio simulado: { biasDeg, jitterDeg, axis }
      get pos() { return A.sim.C; },
    },
    tap(u, v) { // teste: simula toque
      if (!Number.isFinite(u) || !Number.isFinite(v)) return false;
      if (A.phase === 'aim') { A.aim = { u, v }; return placeAt(u, v); }
      return false;
    },
    project(P) { return A.basis ? M.worldToScreen(P, A.C, A.basis, A.f, A.cx, A.cy) : { u: NaN, v: NaN, z: 0 }; },
    calibrate(h) { // mesma conta da pinça: muda a altura assumida do celular preservando o ponto na tela
      const H = clamp(h, CFG.minH, CFG.maxH), s = H / A.H;
      if (A.P) A.P = M.add(A.C, M.mul(M.sub(A.P, A.C), s));
      A.H = H; A.planeY = A.C[1] - H;
    },
    tick(t) { frame(t == null ? performance.now() : t, true); }, // teste: avança um quadro sem depender do rAF
    config: CFG,
  };
  window.__iar = window.InstantAR;
})();
