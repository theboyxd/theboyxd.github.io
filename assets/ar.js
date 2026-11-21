/* Cardápio 3D · AR com a marca do restaurante.
 *
 *   iPhone  (Safari)                             -> AR Quick Look (ARKit) com banner "Adicionar ao pedido"
 *   Android (Chrome / Samsung Internet + ARCore) -> Google Scene Viewer (intent aberto NO MESMO toque; sem esperar modelo nenhum)
 *   Android, opcional (?ar=webxr)                -> WebXR dentro do site: o Chrome só abre AR com um toque recente e o modelo
 *                                                   precisa baixar antes, por isso pode pedir um segundo toque ("Abrir AR")
 *   Resto (desktop, navegadores embutidos)       -> folha de ajuda
 *
 * Depende de window.CardapioBridge (definido em index.html) e do <model-viewer id="heroModelViewer">.
 * Teste de interface sem celular: ?ar=webxr | quicklook | sceneviewer | none   (window.__c3dNav = (url) => ... captura a navegação do intent)
 */
(() => {
  'use strict';

  const BUILD = '1110f';
  // O Chrome volta para esta página com este hash quando o intent do Scene Viewer não pode abrir (sem app Google / sem ARCore).
  const NO_AR_SIGIL = '#c3d-no-ar';
  const UA = navigator.userAgent || '';
  const Q = new URLSearchParams(location.search);
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_ANDROID = /Android/i.test(UA);
  // Navegadores embutidos (Instagram, WhatsApp, Facebook, TikTok, WebView do Android) bloqueiam AR.
  const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|BytedanceWebview|Snapchat|Twitter|LinkedInApp|; wv\)/i.test(UA);

  const $ = (s, r = document) => r.querySelector(s);
  const bridge = () => window.CardapioBridge;
  const shortName = (n) => String(n || 'Prato').replace(/\s*(4K|8K)\b/gi, '').trim();
  const fmtCm = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  let support = { mode: 'none', reason: 'init' };
  let ready = null; // promessa da detecção (um toque logo ao abrir a página espera por ela)
  let coachTimer = null;
  let scanSince = 0;
  let publicOrigin = null; // https que o celular pode usar (ex.: túnel), descoberto via /api/public-url

  // Link para compartilhar/abrir no celular: prefere https (WebXR e câmera exigem contexto seguro).
  function shareUrl() {
    if (location.protocol !== 'https:' && publicOrigin) return publicOrigin + location.pathname + location.search;
    return location.href;
  }

  const SVG_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/><path d="M3 9c-1 2-1 4 0 6M21 9c1 2 1 4 0 6" opacity=".7"/></svg>';
  const SVG_TAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6.4"/><circle cx="12" cy="12" r="10" opacity=".45"/></svg>';
  const SVG_HAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l-2 2 2 2M19 12l2 2-2 2M12 5l-2-2M12 5l2-2"/><circle cx="12" cy="14" r="3.2"/></svg>';

  // ------------------------------------------------------------------ detecção
  async function detect() {
    const forced = Q.get('ar');
    if (forced && ['webxr', 'quicklook', 'sceneviewer', 'none'].includes(forced)) {
      return { mode: forced, reason: forced === 'none' ? 'desktop' : 'forced' };
    }
    if (IS_IOS) {
      const a = document.createElement('a');
      const ok = !!(a.relList && a.relList.supports && a.relList.supports('ar'));
      if (ok && !IN_APP) return { mode: 'quicklook', reason: 'ios' };
      return { mode: 'none', reason: IN_APP ? 'in-app' : 'ios-unsupported' };
    }
    if (IN_APP) return { mode: 'none', reason: 'in-app' };
    let xr = false;
    if (navigator.xr && window.isSecureContext) {
      try { xr = !!(await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { /* sem WebXR */ }
    }
    if (IS_ANDROID) {
      // Padrão no Android: Scene Viewer. Ele abre no mesmo toque (o Chrome só deixa abrir o app com um toque recente) e baixa o
      // modelo sozinho. O WebXR esperava o modelo baixar antes de pedir o AR, o toque já tinha vencido e nada acontecia.
      return window.isSecureContext ? { mode: 'sceneviewer', reason: 'android', xr } : { mode: 'none', reason: 'insecure' };
    }
    if (xr) return { mode: 'webxr', reason: 'webxr', xr };
    return { mode: 'none', reason: 'desktop' };
  }

  // Telemetria do lançamento do AR (texto curto: modo, motivo, erro; vai para data/ar_telemetry.jsonl). Desligue com ?telemetry=0.
  function track(kind, extra) {
    if (Q.get('telemetry') === '0') return;
    try {
      const body = JSON.stringify({
        kind: 'ar-' + kind, build: BUILD, mode: support.mode, reason: support.reason, xr: !!support.xr,
        secure: !!window.isSecureContext, vis: document.visibilityState, ...extra,
      });
      if (navigator.sendBeacon && navigator.sendBeacon('/api/ar-log', new Blob([body], { type: 'application/json' }))) return;
      fetch('/api/ar-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (_) { /* a telemetria nunca atrapalha */ }
  }
  const errText = (e) => String((e && e.message) || e).slice(0, 140);

  // ------------------------------------------------------------------ iPhone: banner do Quick Look
  function quickLookUrl(item) {
    const u = new URL(item.usdz, location.href);
    const portion = item.dish_diameter_cm ? `Tamanho real · Ø ${fmtCm(item.dish_diameter_cm)} cm` : (item.portion_label || '');
    const pairs = [
      ['callToAction', 'Adicionar ao pedido'],
      ['checkoutTitle', shortName(item.name)],
      ['checkoutSubtitle', portion],
      ['price', bridge().brl(item.price_brl)],
      ['canonicalWebPageURL', shareUrl()],
    ];
    // model-viewer acrescenta "&allowsContentScaling=0" (ar-scale="fixed") a este hash.
    u.hash = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return u.toString();
  }

  // ------------------------------------------------------------------ Android: Google Scene Viewer (ARCore)
  function sceneViewerUrl(item) {
    const page = shareUrl();
    const file = new URL(item.android_glb || item.glb, page).toString();
    const back = new URL(page);
    back.hash = NO_AR_SIGIL; // sem app Google / ARCore o Chrome abre esta página de volta e mostramos a folha de ajuda
    const params = new URLSearchParams({
      file,
      mode: 'ar_preferred',
      title: shortName(item.name),
      resizable: 'false', // tamanho real 1:1
      disable_occlusion: 'true', // a oclusão falha em vários aparelhos (o prato some atrás da mesa); o model-viewer também desliga
    });
    return (
      `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;` +
      `action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(back.toString())};end;`
    );
  }

  let svTimer = 0;
  let svLeft = false; // a página saiu da tela depois do toque = o Scene Viewer abriu
  // Abre o Scene Viewer NO MESMO toque (link clicado dentro do clique: gesto do usuário válido). Se a página continuar na tela depois
  // de uns segundos, o Chrome bloqueou ou não há app para abrir: aparece a folha com um botão para tentar de novo (um toque novo = gesto novo).
  function launchSceneViewer(item) {
    const href = sceneViewerUrl(item);
    track('sv-launch', { item: item.slug });
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    if (typeof window.__c3dNav === 'function') window.__c3dNav(href); else a.click();
    setTimeout(() => a.remove(), 1500);
    svLeft = false;
    clearTimeout(svTimer);
    svTimer = setTimeout(() => {
      svTimer = 0;
      if (svLeft || document.visibilityState !== 'visible') return;
      track('sv-stayed', { item: item.slug });
      showSheet('android-fail', {
        go: { label: 'Abrir no AR do Google', run: () => launchSceneViewer(item) },
        alt: support.xr ? { label: 'Tentar o AR no navegador', run: () => launchWebXR(item) } : null,
      });
    }, 2600);
  }

  // iPhone: o AR Quick Look abre por um link rel="ar" clicado NO MESMO toque (sem esperar nenhum script: confiável e instantâneo)
  function launchQuickLook(item) {
    const b = bridge();
    const a = document.createElement('a');
    a.setAttribute('rel', 'ar');
    a.appendChild(document.createElement('img'));
    a.setAttribute('href', quickLookUrl(item) + '&allowsContentScaling=0'); // tamanho real 1:1: a pinça não muda o tamanho
    a.addEventListener('message', (ev) => { // botão "Adicionar ao pedido" do banner
      if (ev.data === '_apple_ar_quicklook_button_tapped') { b.addToCart(); b.toast('✓ Adicionado ao pedido'); }
    });
    window.__qlAnchor = a; // mantém o link vivo até o iPhone devolver o toque do banner
    a.click();
  }

  // WebXR (opcional no Android): precisa do <model-viewer> (escondido) com o modelo carregado. O Chrome só inicia a sessão de AR com um
  // gesto recente (~5 s), e baixar o modelo costuma passar disso: nesse caso a folha pede um toque novo em vez de falhar calada.
  const userActive = () => !navigator.userActivation || navigator.userActivation.isActive;

  async function activateWebXR(mv) {
    try {
      if (!mv.canActivateAR) await mv.updateComplete;
      if (!mv.canActivateAR) throw new Error('canActivateAR=false');
      // o model-viewer engole o erro do requestSession: a única prova de que abriu é o ar-status
      const outcome = new Promise((resolve) => {
        const on = (e) => {
          const s = e.detail && e.detail.status;
          if (s === 'session-started' || s === 'failed') { mv.removeEventListener('ar-status', on); resolve(s); }
        };
        mv.addEventListener('ar-status', on);
        setTimeout(() => { mv.removeEventListener('ar-status', on); resolve('timeout'); }, 4500);
      });
      await mv.activateAR();
      const s = await outcome;
      if (s !== 'session-started') throw new Error('ar-status=' + s);
      hideSheet();
    } catch (err) {
      console.warn('[AR] não foi possível iniciar:', err);
      track('webxr-fail', { err: errText(err) });
      showSheet('failed');
    }
  }

  async function launchWebXR(item) {
    const b = bridge(), mv = $('#heroModelViewer');
    prepare(item);
    if (typeof b.ensureViewer === 'function') b.ensureViewer();
    await customElements.whenDefined('model-viewer');
    const url = (IS_ANDROID && item.mobile_glb) ? item.mobile_glb : b.pickGlb(item);
    if (mv.getAttribute('src') !== url || !mv.loaded) {
      b.toast('Preparando o prato…');
      await new Promise((resolve) => {
        const done = () => { mv.removeEventListener('load', done); resolve(); };
        mv.addEventListener('load', done);
        if (mv.getAttribute('src') !== url) mv.setAttribute('src', url);
        setTimeout(done, 12000);
      });
    }
    if (!userActive()) {
      track('webxr-regesture', { item: item.slug });
      showSheet('ready', { go: { label: 'Abrir o AR', run: () => activateWebXR(mv) } });
      return;
    }
    return activateWebXR(mv);
  }

  // Botão 3D do cardápio: abre o AR do aparelho direto (sem página de visualização). Tudo que roda antes do primeiro await
  // acontece dentro do toque: é lá que o Scene Viewer e o Quick Look precisam abrir.
  async function open(item) {
    try {
      const b = bridge();
      if (!item) return;
      if (b.setItem) b.setItem(item);
      if (support.reason === 'init' && ready) await ready; // toque logo ao abrir a página: espera a detecção (milissegundos)
      track('open', { item: item.slug });
      if (instantOK()) return window.InstantAR.start(item); // modo experimental (?iar=on)
      if (support.mode === 'quicklook') { prepare(item); return launchQuickLook(item); }
      if (support.mode === 'sceneviewer') return launchSceneViewer(item);
      if (support.mode === 'webxr') return await launchWebXR(item);
      showSheet(support.reason);
    } catch (err) {
      console.warn('[AR] falha ao abrir:', err);
      track('open-error', { err: errText(err) });
      showSheet('failed');
    }
  }

  // ------------------------------------------------------------------ preparo por prato
  function prepare(item) {
    const mv = $('#heroModelViewer');
    if (!mv || !item) return;
    const b = bridge();
    if (item.usdz) mv.setAttribute('ios-src', quickLookUrl(item));

    const brand = b.brand();
    const initial = (String(brand.nome || 'A').trim()[0] || 'A').toUpperCase();
    const set = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    set('#arLogo', initial);
    set('#arBrandName', brand.nome);
    set('#arDishName', shortName(item.name));
    set('#arDishMeta', `${b.brl(item.price_brl)} · ${item.portion_label || ''}`.replace(/ · $/, ''));
    set('#arSizeChipText', item.dish_diameter_cm ? `Tamanho real · Ø ${fmtCm(item.dish_diameter_cm)} cm` : 'Tamanho real');
  }

  // ------------------------------------------------------------------ CTA
  function paintCta() {
    const title = $('#arCtaTitle'), sub = $('#arCtaSub'), chip = $('#arCtaChip');
    if (!title) return;
    const instant = instantOK(), native = support.mode !== 'none';
    title.textContent = 'Ver na minha mesa';
    sub.textContent = instant ? 'Toque onde o prato vai ficar · sem escanear' : native ? 'Realidade aumentada · tamanho real' : 'Abra no celular para usar a câmera';
    chip.textContent = instant || native ? 'AR' : '📱';
    document.documentElement.dataset.arMode = instant ? 'instant' : support.mode;
  }

  // AR próprio (câmera + giroscópio, sem escanear a mesa): experimental, DESLIGADO por padrão. O padrão é o AR nativo do aparelho
  // (Quick Look no iPhone, WebXR/ARCore no Android). Para testar o próprio: ?iar=on (celular) ou ?iar=sim (simulador no computador).
  function instantOK() {
    if (!window.InstantAR) return false;
    const m = Q.get('iar');
    if (m === 'sim') return true;
    if (m !== 'on') return false;
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
      'DeviceOrientationEvent' in window && (IS_IOS || IS_ANDROID));
  }

  async function launch() {
    const b = bridge();
    const item = b && b.item();
    if (!item) return;
    if (instantOK()) return window.InstantAR.start(item);
    return launchNative();
  }

  // AR nativo (WebXR no Android / Quick Look no iPhone): mais preciso, mas lê a mesa antes de colocar.
  async function launchNative() {
    const b = bridge();
    const item = b && b.item();
    if (!item) return;

    if (support.mode === 'webxr' || support.mode === 'quicklook') {
      const mv = $('#heroModelViewer');
      prepare(item); // refaz o link do banner com a origem https mais recente
      if (typeof b.ensureViewer === 'function') b.ensureViewer();
      await customElements.whenDefined('model-viewer');
      try {
        if (!mv.canActivateAR) await mv.updateComplete;
        if (!mv.canActivateAR) throw new Error('canActivateAR=false');
        await mv.activateAR();
      } catch (err) {
        console.warn('[AR] não foi possível iniciar:', err);
        showSheet(support.mode === 'webxr' ? 'failed' : 'ios-unsupported');
      }
      return;
    }
    if (support.mode === 'sceneviewer') return launchSceneViewer(item);
    showSheet(support.reason);
  }

  // ------------------------------------------------------------------ folha de ajuda
  const SHEETS = {
    desktop: ['📱', 'Abra no seu celular', 'A realidade aumentada usa a câmera do celular. Abra este link no seu iPhone ou Android para ver o prato na sua mesa, em tamanho real.'],
    insecure: ['🔒', 'Precisa de conexão segura', 'A câmera e o AR só funcionam em páginas https. Abra o link seguro do cardápio (começa com https://) no celular.'],
    'in-app': ['🌐', 'Abra no navegador', 'Este navegador embutido (Instagram, WhatsApp…) bloqueia o AR. Toque em ⋯ e escolha “Abrir no navegador”, ou copie o link abaixo.'],
    'ios-unsupported': ['🍎', 'Abra no Safari', 'O AR do iPhone funciona no Safari. Copie o link abaixo e abra por lá.'],
    'android-unsupported': ['🤖', 'Use o Chrome atualizado', 'O AR precisa do Chrome (ou Samsung Internet) com o app “Serviços do Google Play para RA” instalado.'],
    'android-fail': ['🤖', 'O AR não abriu?', 'Toque em “Abrir no AR do Google”. Se continuar sem abrir, atualize o Chrome e o app Google e confira se o aparelho é compatível com ARCore.'],
    'android-nosv': ['🤖', 'Este aparelho não abriu o AR do Google', 'O AR precisa do app Google e do ARCore. Atualize o Chrome e o app Google, ou abra o cardápio em outro celular.'],
    ready: ['✨', 'Pronto para abrir', 'Toque para ver o prato na sua mesa, em tamanho real.'],
    failed: ['⚠️', 'Não foi possível iniciar o AR', 'Confira a permissão da câmera e se o app “Serviços do Google Play para RA” está instalado e atualizado.'],
  };

  // Botão de ação da folha (principal ou secundário): label + o que fazer no toque. O toque na folha é um gesto novo e válido para abrir o AR.
  function setSheetAction(btn, act) {
    if (!btn) return;
    btn.hidden = !act;
    btn.onclick = act ? () => act.run() : null;
    if (act) btn.textContent = act.label;
  }

  function showSheet(reason, opts = {}) {
    const [ico, title, text] = SHEETS[reason] || SHEETS.desktop;
    const sheet = $('#arSheet');
    if (!sheet) return;
    $('#arSheetIco').textContent = ico;
    $('#arSheetTitle').textContent = title;
    $('#arSheetText').textContent = text;
    $('#arSheetUrl').value = shareUrl();
    if (location.protocol === 'http:' && !publicOrigin && (reason === 'desktop' || reason === 'insecure')) {
      $('#arSheetText').textContent += ' No Android, o link precisa começar com https://.';
    }
    setSheetAction($('#arSheetGo'), opts.go);
    setSheetAction($('#arSheetAlt'), opts.alt);
    $('#arSheetShare').hidden = !navigator.share;
    sheet.hidden = false;
  }
  const hideSheet = () => { const s = $('#arSheet'); if (s) s.hidden = true; };

  async function copyLink() {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); } catch (e) {
      const i = $('#arSheetUrl'); i.select(); try { document.execCommand('copy'); } catch (_) {}
    }
    bridge().toast('Link copiado!');
  }

  // ------------------------------------------------------------------ overlay dentro do AR
  function phaseOf(status, tracking) {
    if (status === 'object-placed') return 'placed';
    if (status === 'session-started') return tracking === 'not-tracking' ? 'scan' : 'place';
    return 'idle';
  }

  function paintCoach(phase) {
    const hud = $('#arHud');
    if (!hud) return;
    hud.dataset.phase = phase;
    const coach = $('#arCoach');
    const ico = $('#arCoachIco'), t = $('#arCoachTitle'), s = $('#arCoachText');
    clearTimeout(coachTimer);
    if (phase === 'scan') {
      ico.innerHTML = SVG_PHONE;
      t.textContent = 'Aponte para a mesa';
      s.textContent = 'Mova o celular devagar para reconhecer a superfície.';
      coach.classList.remove('hide');
    } else if (phase === 'place') {
      ico.innerHTML = SVG_TAP;
      t.textContent = 'Toque para colocar o prato';
      s.textContent = 'Ele aparece em tamanho real, exatamente onde você tocar.';
      coach.classList.remove('hide');
    } else if (phase === 'placed') {
      ico.innerHTML = SVG_HAND;
      t.textContent = 'Prato na sua mesa';
      s.textContent = 'Arraste para mover · gire com dois dedos · ande ao redor.';
      coach.classList.remove('hide');
      coachTimer = setTimeout(() => coach.classList.add('hide'), 5200);
    }
  }

  function onArState() {
    const mv = $('#heroModelViewer');
    const status = mv.getAttribute('ar-status');
    const tracking = mv.getAttribute('ar-tracking');
    let phase = phaseOf(status, tracking);
    // evita piscar "toque para colocar" antes de o ARCore ter tido tempo de achar a mesa
    if (phase === 'place' && performance.now() - scanSince < 2200) {
      phase = 'scan';
      setTimeout(onArState, 2300 - (performance.now() - scanSince));
    }
    paintCoach(phase);
  }

  function hudToast(msg) {
    const t = $('#arToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function addFromAr() {
    const b = bridge();
    b.addToCart();
    hudToast('✓ Adicionado ao pedido');
  }

  // ------------------------------------------------------------------ init
  async function init() {
    const b = bridge();
    if (!b) return console.warn('[AR] CardapioBridge ausente');
    ready = detect().then((s) => { support = s; return s; });
    await ready;
    paintCta();
    track('init', { ua: UA.slice(0, 160) });

    // Voltou do Scene Viewer (a página saiu da tela e voltou): fecha a folha de "não abriu?". E o Chrome traz o hash NO_AR_SIGIL
    // quando o intent não tinha app para abrir: explica em vez de ficar calado.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (svTimer) { clearTimeout(svTimer); svTimer = 0; svLeft = true; }
      } else if (svLeft) {
        svLeft = false;
        hideSheet();
        track('sv-back');
      }
    });
    if (location.hash === NO_AR_SIGIL) {
      history.replaceState(null, '', location.pathname + location.search);
      track('sv-fallback');
      showSheet('android-nosv', { alt: support.xr && b.item() ? { label: 'Tentar o AR no navegador', run: () => launchWebXR(b.item()) } : null });
    }
    // Aberto por http (ex.: IP da rede local)? Descobre o link https público para o celular.
    if (location.protocol === 'http:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname)) {
      fetch('/api/public-url').then((r) => r.json()).then((d) => {
        if (d && d.https_origin) publicOrigin = d.https_origin;
      }).catch(() => {});
    }

    const mv = $('#heroModelViewer');
    $('#arCtaBtn').addEventListener('click', launch);

    mv.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'session-started') scanSince = performance.now();
      if (e.detail.status === 'failed') { showSheet('failed'); return; }
      onArState();
    });
    mv.addEventListener('ar-tracking', onArState);
    // Botão do banner do AR Quick Look (iPhone) -> adiciona ao pedido ao voltar para o site
    mv.addEventListener('quick-look-button-tapped', () => {
      b.addToCart();
      b.toast('✓ Adicionado ao pedido');
    });

    // Botões dentro do overlay do WebXR não podem disparar "select" (que colocaria o prato de novo).
    document.querySelectorAll('#arHud button, #arHud .ar-bottom, .ar-exit').forEach((el) => {
      el.addEventListener('beforexrselect', (ev) => ev.preventDefault());
    });
    $('#arAddBtn').addEventListener('click', addFromAr);

    $('#arSheetClose').addEventListener('click', hideSheet);
    $('#arSheet').addEventListener('click', (e) => { if (e.target.id === 'arSheet') hideSheet(); });
    $('#arSheetCopy').addEventListener('click', copyLink);
    $('#arSheetShare').addEventListener('click', () => {
      navigator.share({ title: bridge().brand().nome, url: shareUrl() }).catch(() => {});
    });
    if (b.item()) prepare(b.item());
  }

  window.Cardapio3DAR = {
    prepare, open, launch, launchNative, detect, instantOK, quickLookUrl, sceneViewerUrl, launchSceneViewer, shareUrl, track, BUILD,
    get support() { return support; },
    _paintCoach: paintCoach, // só para teste visual
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
