// Star-net.pro · painel admin.
// Página estática. O login é o código de 6 dígitos do Google Authenticator, conferido pelo "servidor do painel":
// um Google Apps Script na sua conta Google, que também guarda os projetos e os PDFs numa pasta do seu Google Drive.
// Esta página não guarda dados nem segredos; ela só conversa com o servidor do painel.
const SERVIDOR = 'https://api.star-net.pro/exec'; // servidor próprio na VPS da Star-net (o código do Authenticator é conferido lá)
const LOCAL = ['127.0.0.1', 'localhost'].includes(location.hostname);
const QS = new URLSearchParams(location.search);
const MAX_PDF = 30 * 1024 * 1024;
const K_SERVIDOR = 'sn-admin-servidor'; const K_SESSAO = 'sn-admin-sessao';

const STATUS = [['andamento', 'Em andamento'], ['proposta', 'Proposta'], ['no-ar', 'No ar'], ['demonstracao', 'Demonstração'],
  ['pronto', 'Pronto'], ['pausado', 'Pausado'], ['concluido', 'Concluído'], ['sem', 'Sem status']];
const STATUS_TXT = Object.fromEntries(STATUS);
const TIPOS = [['site', 'Site no ar'], ['demo', 'Demonstração'], ['versao', 'Versão'], ['repo', 'Código'], ['outro', 'Outro']];
const TIPO_TXT = Object.fromEntries(TIPOS);

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
let sessao = null;      // ficha de acesso deste aparelho (vem do servidor depois do código certo)
let data = null;        // conteúdo de projetos.json
let revisao = 0;        // versão de projetos.json que está na tela
let pastaUrl = '';
const filtro = { q: '', status: '' };

// ---------------------------------------------------------------- utilidades
function h(tag, props, ...kids) { // monta o HTML sempre com textContent: nada vindo dos dados vira HTML
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else if (k === 'checked') e.checked = Boolean(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
const ICONS = {
  ext: 'M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5',
  pdf: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  down: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  out: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  sync: 'M20 11a8 8 0 0 0-14.3-4.3L4 9M4 4v5h5M4 13a8 8 0 0 0 14.3 4.3L20 15M20 20v-5h-5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  back: 'M15 5l-7 7 7 7',
  minus: 'M5 12h14',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
};
function ic(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICONS[name]); s.append(p);
  return s;
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const hoje = () => new Date().toISOString().slice(0, 10);
const dataBR = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
function hostOf(url) { try { const u = new URL(url); return (u.host + u.pathname).replace(/\/$/, ''); } catch (e) { return url; } }

function toast(msg, kind = 'info', ms = kind === 'ok' ? 2600 : 3500) {
  const t = h('div', { class: 't ' + kind, text: msg });
  $toast.replaceChildren(t);
  if (ms) setTimeout(() => { if (t.isConnected) t.remove(); }, ms);
}
let busyEl = null;
function busy(msg) { if (!busyEl) { busyEl = h('div', { class: 'busy' }, h('div', {}, h('span', { class: 'spin' }), h('span', { class: 'bm' }))); document.body.append(busyEl); } busyEl.querySelector('.bm').textContent = msg; }
function idle() { if (busyEl) { busyEl.remove(); busyEl = null; } }

// ---------------------------------------------------------------- guardado neste aparelho
const store = {
  get(k) { for (const s of ['localStorage', 'sessionStorage']) { try { const v = window[s].getItem(k); if (v) return v; } catch (e) { /* bloqueado */ } } return null; },
  set(k, v, s = 'localStorage') { try { window[s].setItem(k, v); } catch (e) { /* bloqueado */ } },
  del(k) { for (const s of ['localStorage', 'sessionStorage']) { try { window[s].removeItem(k); } catch (e) { /* ok */ } } },
};
const servidor = () => SERVIDOR || store.get(K_SERVIDOR) || (LOCAL && QS.get('servidor')) || '';
function lerSessao() { try { const s = JSON.parse(store.get(K_SESSAO) || 'null'); if (s && s.sessao && s.expira > Date.now()) return s.sessao; } catch (e) { /* ok */ } store.del(K_SESSAO); return null; }

// ---------------------------------------------------------------- conversa com o servidor do painel
class SessaoError extends Error {}
async function call(acao, extra = {}) {
  let res;
  try {
    // text/plain evita a pergunta prévia (CORS) que o Apps Script não responde
    res = await fetch(servidor(), { method: 'POST', redirect: 'follow', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ acao, sessao, ...extra }) });
  } catch (e) { throw new Error('Sem conexão com o servidor do painel. Confira a internet e tente de novo.'); }
  if (!res.ok) throw new Error('O servidor do painel respondeu com erro ' + res.status + '.');
  let j; try { j = await res.json(); } catch (e) { throw new Error('O servidor do painel não respondeu como esperado. Confira se o URL é o do app da Web (termina em /exec) e se o acesso está em “Qualquer pessoa”.'); }
  if (j && j.erro === 'sessao') { sessao = null; store.del(K_SESSAO); throw new SessaoError('A entrada deste aparelho venceu. Digite o código do Authenticator de novo.'); }
  if (j && j.erro === 'falha') throw new Error('O servidor do painel teve um problema: ' + (j.mensagem || 'sem detalhe') + '.');
  return j;
}
const horaBR = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function msgCodigo(r) {
  if (r.erro === 'codigo') return 'Código errado.' + (r.restam > 0 ? ' Mais ' + r.restam + (r.restam === 1 ? ' tentativa' : ' tentativas') + ' antes de esperar 15 minutos.' : '');
  if (r.erro === 'travado') return 'Muitos códigos errados. O painel destrava às ' + horaBR(r.ate) + '.';
  if (r.erro === 'codigo_usado') return 'Esse código já foi usado. Espere o próximo aparecer no Authenticator.';
  return 'Não deu para entrar (' + (r.erro || 'erro') + ').';
}
function guardaSessao(r, lembrar) { sessao = r.sessao; store.del(K_SESSAO); store.set(K_SESSAO, JSON.stringify({ sessao: r.sessao, expira: r.expira }), lembrar ? 'localStorage' : 'sessionStorage'); }

async function loadData() {
  const r = await call('listar');
  data = r.dados || null; revisao = Number(r.revisao || 0); pastaUrl = r.pasta || '';
  if (data && !Array.isArray(data.projetos)) data.projetos = [];
}
async function salvarDados(nd, remover = []) {
  const r = await call('salvar', { dados: nd, revisao, remover });
  if (r.erro === 'conflito') { const err = new Error('Os dados mudaram em outro aparelho. Recarreguei a lista: confira e faça a mudança de novo.'); err.conflict = true; throw err; }
  if (r.erro) throw new Error('O servidor não salvou (' + r.erro + ').');
  nd.revisao = r.revisao; nd.atualizado = r.atualizado; data = nd; revisao = r.revisao;
}
function fileB64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('Não consegui ler o arquivo.')); r.readAsDataURL(file); }); }
async function enviarPdf(file, nome) {
  const r = await call('enviarPdf', { nome, base64: await fileB64(file) });
  if (r.erro || !r.id) throw new Error('O servidor não guardou o PDF (' + (r.erro || 'sem resposta') + ').');
  return r;
}
const driveUrl = (d) => 'https://drive.google.com/file/d/' + encodeURIComponent(d.id) + '/view';
async function abrirPdf(d, modo) {
  const w = modo === 'abrir' ? window.open('', '_blank') : null; // abre a aba já no toque, senão o navegador bloqueia
  if (w) { try { w.document.title = d.nome; w.document.body.textContent = 'Abrindo o PDF…'; } catch (e) { /* ok */ } }
  toast('Buscando “' + d.nome + '”…', 'info', 0);
  try {
    const r = await call('baixarPdf', { id: d.id });
    if (r.erro || !r.base64) throw Object.assign(new Error('O servidor não achou esse PDF na pasta do painel.'), { drive: true });
    const bin = atob(r.base64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
    if (modo === 'baixar') { const a = h('a', { href: url, download: r.nome || d.arquivo || slug(d.nome) + '.pdf' }); document.body.append(a); a.click(); a.remove(); }
    else if (w && !w.closed) w.location.href = url; else location.href = url;
    toast('Pronto.', 'ok', 2000);
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  } catch (e) {
    if (e instanceof SessaoError) { if (w) w.close(); fail(e); return; }
    // plano B: abre direto no Google Drive (funciona com a sua conta Google aberta no aparelho)
    if (w && !w.closed) { w.location.href = driveUrl(d); toast('Abri pelo Google Drive.', 'info'); } else fail(e);
  }
}

async function fail(e) {
  idle();
  if (e instanceof SessaoError) { closeDrawer(); loginView(e.message); return; }
  if (e && e.conflict) { try { await loadData(); } catch (x) { /* fica com o que tinha */ } closeDrawer(); if (data) appView(); toast(e.message, 'err', 7000); return; }
  toast((e && e.message) || 'Algo deu errado.', 'err', 7000);
}


// ---------------------------------------------------------------- leitor dentro do painel: PDFs (PDF.js) e sites (moldura)
const pdfCache = new Map(); // id → bytes do PDF, só enquanto esta aba estiver aberta
let viewerEl = null;
function closeViewer(fromHistory) {
  if (!viewerEl) return;
  const v = viewerEl; viewerEl = null;
  try { if (v._cleanup) v._cleanup(); } catch (e) { /* ok */ }
  v.remove(); document.body.classList.remove('has-viewer');
  document.removeEventListener('keydown', viewerKey, true);
  if (!fromHistory && history.state && history.state.snViewer) history.back();
}
function viewerKey(ev) { if (ev.key === 'Escape') { ev.stopImmediatePropagation(); closeViewer(); } }
window.addEventListener('popstate', () => { if (viewerEl) closeViewer(true); }); // o "voltar" do celular fecha o leitor, não o painel
function openViewer(title, sub, actions, body) {
  const had = Boolean(viewerEl);
  if (had) closeViewer(true);
  const bar = h('header', { class: 'vw-bar' },
    h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Voltar', title: 'Voltar', onclick: () => closeViewer() }, ic('back')),
    h('div', { class: 'vw-tt' }, h('b', { text: title }), sub ? h('small', { class: 'vw-sub', text: sub }) : null),
    h('div', { class: 'vw-acts' }, actions));
  viewerEl = h('div', { class: 'viewer', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, bar, body);
  document.body.append(viewerEl); document.body.classList.add('has-viewer');
  document.addEventListener('keydown', viewerKey, true);
  if (!had) { try { history.pushState({ snViewer: 1 }, ''); } catch (e) { /* ok */ } }
  bar.querySelector('button').focus();
  return viewerEl;
}

let pdfjsP = null;
function loadPdfjs() {
  if (!pdfjsP) {
    pdfjsP = (async () => {
      if (!Promise.withResolvers) Promise.withResolvers = function () { let a; let b; const p = new Promise((x, y) => { a = x; b = y; }); return { promise: p, resolve: a, reject: b }; };
      const m = await import('./pdfjs/pdf.min.js');
      m.GlobalWorkerOptions.workerSrc = new URL('./pdfjs/pdf.worker.min.js', import.meta.url).href;
      return m;
    })().catch((e) => { pdfjsP = null; throw e; });
  }
  return pdfjsP;
}
async function pdfBytes(d) {
  if (pdfCache.has(d.id)) return pdfCache.get(d.id);
  const r = await call('baixarPdf', { id: d.id });
  if (r.erro || !r.base64) throw new Error('o servidor não achou esse PDF na pasta do painel');
  const bin = atob(r.base64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  pdfCache.set(d.id, u8);
  return u8;
}
async function viewPdf(d) {
  const pages = h('div', { class: 'pdf-pages' });
  const status = h('div', { class: 'pdf-status' }, h('span', { class: 'spin' }), h('span', { text: 'Buscando o PDF…' }));
  const scroller = h('div', { class: 'vw-body pdf-scroll' }, status, pages);
  const pageInfo = h('span', { class: 'vw-page', 'aria-live': 'polite' });
  let zoom = 1; let doc = null; let io = null; let gone = false; let setZoom = () => {};
  const zoomOut = h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Diminuir', title: 'Diminuir', onclick: () => setZoom(zoom / 1.25) }, ic('minus'));
  const zoomIn = h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Aumentar', title: 'Aumentar', onclick: () => setZoom(zoom * 1.25) }, ic('plus'));
  const baixar = h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Baixar', title: 'Baixar', onclick: () => abrirPdf(d, 'baixar') }, ic('down'));
  const v = openViewer(d.nome, [dataBR(d.data), d.tamanho ? mb(d.tamanho) : ''].filter(Boolean).join(' · '), [pageInfo, zoomOut, zoomIn, baixar], scroller);
  v._cleanup = () => { gone = true; if (io) io.disconnect(); if (doc) doc.destroy(); };
  try {
    const [pdfjs, bytes] = await Promise.all([loadPdfjs(), pdfBytes(d)]);
    if (gone) return;
    status.lastChild.textContent = 'Abrindo…';
    doc = await pdfjs.getDocument({ data: bytes.slice(0), isEvalSupported: false }).promise; // cópia: o PDF.js entrega os bytes ao leitor em segundo plano
    if (gone) return;
    const p1 = (await doc.getPage(1)).getViewport({ scale: 1 });
    status.remove();
    const base = () => Math.min(scroller.clientWidth - 20, 1100);
    const slots = [];
    for (let i = 1; i <= doc.numPages; i++) { const sl = h('div', { class: 'pdf-page', 'data-n': String(i) }); sl.style.aspectRatio = p1.width + ' / ' + p1.height; pages.append(sl); slots.push(sl); }
    pages.style.width = base() + 'px';
    pageInfo.textContent = '1 / ' + doc.numPages;
    const drawn = new Map(); // página → zoom com que foi desenhada
    async function draw(sl) {
      const n = Number(sl.dataset.n); const z = zoom;
      if (drawn.get(n) === z) return;
      drawn.set(n, z);
      const page = await doc.getPage(n); if (gone || drawn.get(n) !== z) return;
      const vp0 = page.getViewport({ scale: 1 });
      sl.style.aspectRatio = vp0.width + ' / ' + vp0.height;
      const cssW = sl.clientWidth || base();
      const px = Math.min(cssW * Math.min(window.devicePixelRatio || 1, 2), 2400); // nítido sem gastar memória demais
      const vp = page.getViewport({ scale: px / vp0.width });
      const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      c.setAttribute('aria-label', 'Página ' + n);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      if (gone || drawn.get(n) !== z) return;
      sl.replaceChildren(c);
    }
    io = new IntersectionObserver((ents) => {
      for (const e of ents) {
        if (e.isIntersecting) draw(e.target).catch(() => {});
        else if (e.target.firstChild) { e.target.replaceChildren(); drawn.delete(Number(e.target.dataset.n)); } // solta a memória das páginas longe da tela
      }
    }, { root: scroller, rootMargin: '900px 0px' });
    slots.forEach((sl) => io.observe(sl));
    scroller.addEventListener('scroll', () => {
      const mid = scroller.scrollTop + scroller.clientHeight / 3; let cur = 1;
      for (const sl of slots) { if (sl.offsetTop <= mid) cur = Number(sl.dataset.n); else break; }
      pageInfo.textContent = cur + ' / ' + doc.numPages;
    }, { passive: true });
    setZoom = (z) => {
      const nz = Math.max(0.5, Math.min(3, z)); if (nz === zoom) return;
      const frac = scroller.scrollTop / Math.max(1, scroller.scrollHeight);
      zoom = nz; pages.style.width = Math.round(base() * zoom) + 'px';
      drawn.clear(); slots.forEach((sl) => { sl.replaceChildren(); io.unobserve(sl); io.observe(sl); });
      scroller.scrollTop = frac * scroller.scrollHeight;
    };
  } catch (e) {
    if (gone) return;
    if (e instanceof SessaoError) { closeViewer(); fail(e); return; }
    status.replaceChildren(h('p', { class: 'err', text: 'Não consegui mostrar o PDF aqui (' + (e.message || 'erro') + ').' }),
      h('div', { class: 'pdf-alt' }, h('button', { class: 'btn sm', type: 'button', onclick: () => abrirPdf(d, 'abrir') }, 'Abrir em outra aba'), h('a', { class: 'btn sm', href: driveUrl(d), target: '_blank', rel: 'noopener noreferrer' }, 'Abrir no Google Drive')));
  }
}

// Sites que não deixam ser abertos dentro de outro site (abrem numa aba nova)
const NO_FRAME = /(^|\.)(github\.com|google\.com|googleusercontent\.com|instagram\.com|facebook\.com|whatsapp\.com|wa\.me|x\.com|twitter\.com|linkedin\.com|youtube\.com|tiktok\.com)$/i;
function canFrame(url) { try { const u = new URL(url); return (u.protocol === 'https:' || (LOCAL && u.protocol === 'http:')) && !NO_FRAME.test(u.hostname); } catch (e) { return false; } }
function openLink(l) { if (canFrame(l.url)) viewSite(l); else window.open(l.url, '_blank', 'noopener'); }
function viewSite(l) {
  const u = new URL(l.url);
  const frame = h('iframe', { class: 'site-frame', src: l.url, title: l.rotulo || u.host, referrerpolicy: 'no-referrer', allow: 'fullscreen; clipboard-write; xr-spatial-tracking; camera; gyroscope; accelerometer; magnetometer' });
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads'); // o site não consegue tirar você do painel
  const wrap = h('div', { class: 'site-wrap' }, frame);
  const body = h('div', { class: 'vw-body site-body' }, wrap, h('p', { class: 'site-hint', text: 'Página em branco? Esse site não deixa ser aberto dentro de outro: use o botão de abrir em nova aba.' }));
  let cel = false;
  const dev = h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Ver como no celular', title: 'Ver como no celular' }, ic('phone'));
  dev.addEventListener('click', () => { cel = !cel; wrap.classList.toggle('as-phone', cel); dev.replaceChildren(ic(cel ? 'monitor' : 'phone')); dev.setAttribute('aria-label', cel ? 'Ver como no computador' : 'Ver como no celular'); dev.title = dev.getAttribute('aria-label'); });
  const reload = h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Recarregar', title: 'Recarregar', onclick: () => { frame.src = l.url; } }, ic('sync'));
  const ext = h('a', { class: 'btn ghost icon-btn', href: l.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Abrir em nova aba', title: 'Abrir em nova aba' }, ic('ext'));
  openViewer(l.rotulo || u.host, hostOf(l.url), [dev, reload, ext], body);
}

// ---------------------------------------------------------------- telas
function brand(sub) {
  return h('div', { class: 'brand' }, h('img', { src: 'simbolo.png', alt: '', width: 34, height: 43 }),
    h('div', {}, h('b', {}, 'Star-net', h('em', { text: '.pro' })), sub ? h('small', { text: sub }) : null));
}
function codeInput(onFull) {
  return h('input', {
    class: 'input code', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', enterkeyhint: 'go',
    pattern: '[0-9]{6}', maxlength: 6, placeholder: '000000', 'aria-label': 'Código de 6 dígitos',
    oninput: (ev) => {
      const v = ev.target.value.replace(/\D/g, '').slice(0, 6);
      ev.target.value = v;
      if (v.length === 6 && onFull) onFull();
    }
  });
}

function urlServidorValida(v) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(v) || v === 'https://api.star-net.pro/exec' || (LOCAL && /^http:\/\/127\.0\.0\.1:\d+\//.test(v));
}

// Primeira vez: instalar o servidor do painel (Apps Script) e colar o URL dele aqui.
function setupView(msg = '') {
  closeDrawer();
  const url = h('input', { class: 'input', type: 'url', id: 'srv', placeholder: 'https://script.google.com/macros/s/…/exec', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', value: store.get(K_SERVIDOR) || '' });
  const err = h('p', { class: 'err', role: 'alert', text: msg });
  const copiar = h('button', { class: 'btn sm', type: 'button', onclick: async () => {
    try { const t = await (await fetch('servidor.gs.txt', { cache: 'no-store' })).text(); await navigator.clipboard.writeText(t); toast('Código do servidor copiado. Cole no script.google.com.', 'ok', 4000); }
    catch (e) { window.open('servidor.gs.txt', '_blank'); }
  } }, 'Copiar o código do servidor');
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Conectar' });
  const form = h('form', { class: 'login', onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const v = url.value.trim();
    if (!urlServidorValida(v)) { err.textContent = 'Cole o URL do app da Web inteiro: começa com https://script.google.com/macros/s/ e termina em /exec.'; return; }
    store.set(K_SERVIDOR, v); btn.disabled = true; btn.textContent = 'Conectando…';
    try { await start(); } catch (e) { btn.disabled = false; btn.textContent = 'Conectar'; err.textContent = e.message; }
  } },
  brand(), h('h1', { text: 'Instalar o servidor do painel' }),
  h('p', { class: 'muted', text: 'Uma vez só, no computador, com a sua conta Google. É grátis e fica na sua conta: o script confere o código do Google Authenticator e guarda os projetos e os PDFs no seu Google Drive.' }),
  h('ol', { class: 'steps' },
    h('li', {}, copiar, ' e abra ', h('a', { href: 'https://script.google.com/home/projects/create', target: '_blank', rel: 'noopener noreferrer', text: 'script.google.com' }), ' (Novo projeto). Apague o que estiver lá, cole e salve.'),
    h('li', {}, 'Toque em ', h('b', { text: 'Implantar → Nova implantação' }), ', escolha ', h('b', { text: 'App da Web' }), ', com ', h('b', { text: 'Executar como: Eu' }), ' e ', h('b', { text: 'Quem pode acessar: Qualquer pessoa' }), '.'),
    h('li', {}, 'Autorize o acesso. O Google avisa que o app não é verificado porque é o seu próprio script: toque em ', h('b', { text: 'Avançado → Acessar' }), '.'),
    h('li', {}, 'Copie o ', h('b', { text: 'URL do app da Web' }), ' (termina em /exec) e cole aqui.')),
  h('label', { class: 'field' }, h('span', { text: 'URL do servidor do painel' }), url), err, btn);
  $app.replaceChildren(h('main', { class: 'center' }, form));
}

// O servidor ainda não tem o Google Authenticator: mostra o QR Code, a chave e confere o primeiro código.
async function authenticatorView(msg = '') {
  closeDrawer();
  busy('Gerando o QR Code…');
  let r;
  try { r = await call('configurar'); } catch (e) { idle(); setupView(e.message); return; }
  idle();
  if (r.erro === 'ja_configurado') { loginView(); return; }
  if (!r.otpauth) { setupView('O servidor não gerou o QR Code (' + (r.erro || 'sem resposta') + ').'); return; }
  const img = h('img', { class: 'qr', alt: 'QR Code para o Google Authenticator', width: 220, height: 220 });
  try { img.src = await window.QRLib.toDataURL(r.otpauth, { margin: 1, width: 440, color: { dark: '#0b1f4b', light: '#ffffff' } }); } catch (e) { img.alt = 'Não consegui desenhar o QR Code: use a chave abaixo.'; }
  const rawSecret = String(r.segredo || '').replace(/\s+/g, '');
  const secretEl = h('code', { class: 'secret', text: rawSecret.replace(/(.{4})/g, '$1 ').trim() });
  const copyKeyBtn = h('button', {
    class: 'btn',
    type: 'button',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(rawSecret);
        toast('Chave copiada.', 'ok');
      } catch (e) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(secretEl);
        sel.removeAllRanges();
        sel.addRange(range);
        toast('Não consegui copiar sozinho. A chave foi selecionada: copie manualmente.', 'info', 5000);
      }
    }
  }, 'Copiar chave');
  const openAppLink = h('a', { class: 'btn', href: r.otpauth, text: 'Abrir no app do celular' });
  const lembrar = h('input', { type: 'checkbox', checked: true });
  const err = h('p', { class: 'err', role: 'alert', text: msg });
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Confirmar' });
  let busySub = false;
  async function enviar() {
    if (busySub) return;
    err.textContent = '';
    if (!/^\d{6}$/.test(code.value)) { err.textContent = 'Digite os 6 números que aparecem no Authenticator.'; return; }
    busySub = true; btn.disabled = true; btn.textContent = 'Conferindo…';
    try {
      const x = await call('confirmar', { codigo: code.value, lembrar: lembrar.checked });
      if (x.sessao) { guardaSessao(x, lembrar.checked); toast('Google Authenticator ligado.', 'ok'); await openPanel(); return; }
      if (x.erro === 'configuracao_vencida') { await authenticatorView('A chave venceu. Leia o QR de novo.'); return; }
      if (x.erro === 'ja_configurado') { loginView(); return; }
      err.textContent = msgCodigo(x);
    } catch (e) { err.textContent = e.message; }
    busySub = false; btn.disabled = false; btn.textContent = 'Confirmar'; code.value = ''; code.focus();
  }
  const code = codeInput(enviar);
  const form = h('form', { class: 'login', onsubmit: (ev) => { ev.preventDefault(); enviar(); } },
    brand(), h('h1', { text: 'Ligar o Google Authenticator' }),
    h('ol', { class: 'steps' },
      h('li', {}, h('b', { text: 'No celular:' }), ' Copiar chave → abra o ', h('b', { text: 'Google Authenticator' }), ' → ', h('b', { text: '+' }), ' → ', h('b', { text: 'Inserir chave' }), ' → cole.'),
      h('li', {}, h('b', { text: 'No computador:' }), ' aponte o celular para o QR.'),
      h('li', {}, 'Digite o código de 6 números que apareceu.')),
    h('div', { class: 'qrbox' }, img, secretEl, h('div', { class: 'qr-acts' }, copyKeyBtn, openAppLink)),
    h('label', { class: 'field' }, h('span', { text: 'Código do Authenticator' }), code),
    h('label', { class: 'check' }, lembrar, 'Lembrar este aparelho por 30 dias'), err, btn);
  $app.replaceChildren(h('main', { class: 'center' }, form));
  code.focus();
}

function loginView(msg = '', info = false) {
  closeDrawer();
  const lembrar = h('input', { type: 'checkbox', checked: true });
  const err = h('p', { class: info ? 'err info' : 'err', role: 'alert', text: msg });
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Entrar' });
  let busySub = false;
  async function enviar() {
    if (busySub) return;
    err.textContent = '';
    if (!/^\d{6}$/.test(code.value)) { err.textContent = 'Digite os 6 números que aparecem no Authenticator.'; return; }
    busySub = true; btn.disabled = true; btn.textContent = 'Entrando…';
    err.className = 'err';
    try {
      const r = await call('entrar', { codigo: code.value, lembrar: lembrar.checked });
      if (r.sessao) { guardaSessao(r, lembrar.checked); await openPanel(); return; }
      if (r.erro === 'nao_configurado') { authenticatorView(); return; }
      err.textContent = msgCodigo(r);
    } catch (e) { err.textContent = e.message; }
    busySub = false; btn.disabled = false; btn.textContent = 'Entrar'; code.value = ''; code.focus();
  }
  const code = codeInput(enviar);
  const form = h('form', { class: 'login', onsubmit: (ev) => { ev.preventDefault(); enviar(); } },
    brand(), h('h1', { text: 'Painel de projetos' }),
    h('p', { class: 'muted', text: 'Abra o Google Authenticator no celular e digite o código de 6 números da Star-net.pro.' }),
    h('label', { class: 'field' }, h('span', { text: 'Código do Authenticator' }), code),
    h('label', { class: 'check' }, lembrar, 'Lembrar este aparelho por 30 dias'), err, btn,
    h('p', { class: 'small muted', text: 'Errou 5 vezes, o painel espera 15 minutos. Os projetos e os PDFs ficam no seu Google Drive.' }));
  $app.replaceChildren(h('main', { class: 'center' }, form));
  code.focus();
}

async function openPanel() {
  busy('Abrindo os projetos…');
  try { await loadData(); idle(); if (data) appView(); else emptyView(); }
  catch (e) { fail(e); }
}

// Primeira vez: o Drive ainda não tem os projetos. Importa a pasta que já existe no computador, ou começa do zero.
function emptyView() {
  closeDrawer();
  const mk = (id, dir) => {
    const inp = h('input', { type: 'file', id, multiple: true, accept: dir ? null : '.json,.pdf,application/json,application/pdf', class: 'sr', tabindex: '-1', 'aria-hidden': 'true' });
    if (dir) { inp.setAttribute('webkitdirectory', ''); inp.setAttribute('directory', ''); }
    inp.addEventListener('change', () => { const fs = [...inp.files]; inp.value = ''; if (fs.length) importFiles(fs); });
    return inp;
  };
  const inPasta = mk('imp-pasta-input', true); const inArq = mk('imp-arq-input', false);
  const pick = (dir) => (dir ? inPasta : inArq).click();
  $app.replaceChildren(h('main', { class: 'center' }, h('div', { class: 'login' }, brand(), h('h1', { text: 'O painel ainda está vazio' }),
    h('p', { class: 'muted', text: 'Para trazer os projetos e os PDFs que já existem, escolha a pasta star-net-admin-dados (no computador, em Documentos/claude). Tudo vai para a pasta “Star-net · Painel” do seu Google Drive.' }),
    h('button', { class: 'btn primary', type: 'button', id: 'imp-pasta', onclick: () => pick(true) }, 'Importar a pasta do computador'),
    h('button', { class: 'btn', type: 'button', id: 'imp-arq', onclick: () => pick(false) }, 'Importar arquivos soltos (projetos.json e PDFs)'),
    h('button', { class: 'btn ghost', type: 'button', onclick: async () => { busy('Criando…'); try { await salvarDados({ versao: 1, projetos: [] }); idle(); appView(); } catch (e) { fail(e); } } }, 'Começar do zero'),
    inPasta, inArq)));
}

async function importFiles(files) {
  try {
    const jf = files.find((f) => (f.webkitRelativePath || '').split('/').length === 2 && f.name === 'projetos.json') || files.find((f) => f.name === 'projetos.json');
    if (!jf) { toast('Não achei o projetos.json nos arquivos escolhidos.', 'err', 6000); return; }
    const nd = JSON.parse(await jf.text());
    if (!Array.isArray(nd.projetos)) throw new Error('O projetos.json escolhido não tem a lista de projetos.');
    const byPath = new Map(); const byName = new Map();
    for (const f of files) { const rp = (f.webkitRelativePath || '').split('/').slice(1).join('/'); if (rp) byPath.set(rp, f); byName.set(f.name, f); }
    const todo = []; for (const p of nd.projetos) for (const d of p.pdfs || []) if (!d.id && d.arquivo) todo.push(d);
    const faltam = []; let i = 0;
    for (const d of todo) {
      i++;
      const f = byPath.get(d.arquivo) || byName.get(d.arquivo.split('/').pop());
      if (!f) { faltam.push(d.nome); continue; }
      if (f.size > MAX_PDF) { faltam.push(d.nome + ' (grande demais)'); continue; }
      const nome = d.arquivo.split('/').pop();
      busy(`Enviando ${i} de ${todo.length}: “${d.nome}” (${mb(f.size)})…`);
      const up = await enviarPdf(f, nome);
      d.id = up.id; d.arquivo = nome; d.tamanho = f.size;
    }
    nd.projetos.forEach((p) => { p.pdfs = (p.pdfs || []).filter((d) => d.id); });
    busy('Salvando a lista de projetos…');
    await salvarDados(nd);
    idle(); appView();
    toast(faltam.length ? 'Importado. Faltaram ' + faltam.length + ' PDF(s): ' + faltam.join(', ') : 'Tudo importado para o seu Google Drive.', faltam.length ? 'err' : 'ok', faltam.length ? 9000 : 3000);
  } catch (e) { fail(e); }
}

function statusPill(st) { const k = STATUS_TXT[st] ? st : 'sem'; return h('span', { class: 'pill st-' + k, text: STATUS_TXT[k] }); }


function appView() {
  const lista = data.projetos;
  const counts = {}; for (const p of lista) counts[p.status || 'sem'] = (counts[p.status || 'sem'] || 0) + 1;
  const search = h('input', { class: 'input search', type: 'search', placeholder: 'Buscar projeto, cliente, link ou PDF', value: filtro.q, 'aria-label': 'Buscar', oninput: (ev) => { filtro.q = ev.target.value; renderGrid(); } });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por status' },
    h('button', { class: 'chip', type: 'button', 'aria-pressed': filtro.status === '' ? 'true' : 'false', onclick: () => { filtro.status = ''; appView(); } }, 'Todos', h('b', { text: String(lista.length) })),
    STATUS.filter(([k]) => counts[k]).map(([k, t]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': filtro.status === k ? 'true' : 'false', onclick: () => { filtro.status = filtro.status === k ? '' : k; appView(); } }, t, h('b', { text: String(counts[k]) }))));
  const grid = h('div', { class: 'grid' });
  function renderGrid() {
    const q2 = norm(filtro.q);
    const vis = lista.filter((p) => (!filtro.status || (p.status || 'sem') === filtro.status) && (!q2 || norm([p.nome, p.cliente, p.resumo, p.notas, ...(p.links || []).map((l) => l.rotulo + ' ' + l.url), ...(p.pdfs || []).map((d) => d.nome)].join(' ')).includes(q2)));
    grid.replaceChildren(...(vis.length ? vis.map(card) : [h('div', { class: 'empty', text: lista.length ? 'Nenhum projeto com esse filtro.' : 'Nenhum projeto ainda. Toque em “Novo projeto”.' })]));
  }
  $app.replaceChildren(
    h('header', { class: 'top' }, brand('Painel de projetos'),
      h('button', { class: 'btn ghost icon-btn', type: 'button', title: 'Recarregar', 'aria-label': 'Recarregar', onclick: async () => { busy('Recarregando…'); try { await loadData(); idle(); if (data) { appView(); toast('Atualizado.', 'ok', 1500); } else emptyView(); } catch (e) { fail(e); } } }, ic('sync')),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: connectDrawer }, ic('phone'), 'Conectar outro aparelho'),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: sairView }, ic('out'), 'Sair')),
    h('main', { class: 'wrap' },
      h('div', { class: 'tools apps' },
        [['amazon', 'Painel Amazon'], ['radar', 'Radar de Clientes']].map(([id, nome]) => h('button', { class: 'btn ghost', type: 'button', onclick: () => abrirApp(id) }, nome + ' ↗'))),
      h('div', { class: 'tools' }, search, h('button', { class: 'btn primary', type: 'button', onclick: () => editDrawer(null) }, ic('plus'), 'Novo projeto')),
      chips, grid,
      h('p', { class: 'foot' }, 'Dados no seu Google Drive, pasta ', pastaUrl ? h('a', { href: pastaUrl, target: '_blank', rel: 'noopener noreferrer', text: 'Star-net · Painel' }) : 'Star-net · Painel', data.atualizado ? ' · atualizado em ' + dataBR(data.atualizado) : '', '.')));
  renderGrid();
}

// Apps na VPS (Amazon, Radar): o servidor dá um passe de uso único e a aba abre já liberada.
async function abrirApp(id) {
  const aba = window.open('about:blank', '_blank');
  try {
    const r = await call('abrirApp', { app: id });
    if (!r.url) throw new Error('sem endereço');
    if (aba) { aba.opener = null; aba.location.href = r.url; } else location.href = r.url;
  } catch (e) { if (aba) aba.close(); fail(e); }
}

async function connectDrawer() {
  const srv = servidor();
  const link = location.origin + '/admin/#s=' + encodeURIComponent(srv);
  const img = h('img', { class: 'qr', alt: 'QR Code com o link privado do painel', width: 220, height: 220 });
  try { img.src = await window.QRLib.toDataURL(link, { margin: 1, width: 440, color: { dark: '#0b1f4b', light: '#ffffff' } }); }
  catch (e) { img.alt = 'Não consegui desenhar o QR Code: copie o link abaixo.'; }
  const inp = h('input', { class: 'input', type: 'text', readonly: true, value: link, 'aria-label': 'Link privado do painel', onclick: () => inp.select(), onfocus: () => inp.select() });
  const copyBtn = h('button', {
    class: 'btn primary',
    type: 'button',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(link);
        toast('Link privado copiado.', 'ok');
      } catch (e) {
        inp.focus(); inp.select();
        toast('Não consegui copiar sozinho. O link está selecionado: copie manualmente.', 'info', 5000);
      }
    }
  }, 'Copiar link');
  openDrawer('ap-title',
    h('header', {}, h('div', { class: 'tt' }, h('h2', { id: 'ap-title', text: 'Conectar outro aparelho' })),
      h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: closeDrawer }, ic('x'))),
    [
      h('p', { class: 'lead muted', text: 'Leia o QR Code com a câmera do outro aparelho ou abra o link privado abaixo. Depois, entre com o código do Google Authenticator.' }),
      h('div', { class: 'qrbox' }, img),
      h('label', { class: 'field' }, h('span', { text: 'Link privado' }), inp),
      h('div', { class: 'qr-acts' }, copyBtn),
      h('p', { class: 'warnbox', text: 'Não compartilhe este link. Sem o código do seu celular ninguém entra, mas quem tem o link pode travar o painel errando o código.' }),
    ],
    h('footer', {}, h('span', { class: 'sp' }), h('button', { class: 'btn', type: 'button', onclick: closeDrawer }, 'Fechar')));
}

function sairView() {
  const todos = confirm('Sair também de todos os outros aparelhos?\n\nOK: sai de todos. Cancelar: sai só deste.');
  const s = sessao;
  call('sair', { todos }).catch(() => { /* sai daqui de qualquer jeito */ });
  sessao = null; data = null; store.del(K_SESSAO); void s;
  loginView(todos ? 'Saiu de todos os aparelhos.' : 'Saiu deste aparelho.', true);
}

function card(p) {
  const links = (p.links || []).slice().sort((a, b) => ['site', 'demo', 'versao', 'outro', 'repo'].indexOf(a.tipo) - ['site', 'demo', 'versao', 'outro', 'repo'].indexOf(b.tipo)).filter((l) => l.tipo !== 'repo').slice(0, 2);
  const nP = (p.pdfs || []).length; const nL = (p.links || []).length;
  return h('article', { class: 'proj', tabindex: '0', role: 'button', 'aria-label': 'Abrir ' + p.nome, onclick: () => detailDrawer(p), onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); detailDrawer(p); } } },
    h('div', { class: 'hd' }, h('h3', { text: p.nome }), statusPill(p.status)),
    p.cliente ? h('p', { class: 'cli', text: p.cliente }) : null,
    p.resumo ? h('p', { class: 'res', text: p.resumo }) : null,
    links.length ? h('div', { class: 'acts' }, links.map((l) => h('a', { class: 'btn sm', href: l.url, target: '_blank', rel: 'noopener noreferrer', onclick: (ev) => { ev.stopPropagation(); if (canFrame(l.url)) { ev.preventDefault(); viewSite(l); } } }, l.rotulo || hostOf(l.url), ic(canFrame(l.url) ? 'eye' : 'ext')))) : null,
    h('p', { class: 'meta', text: [nL ? nL + (nL === 1 ? ' link' : ' links') : '', nP ? nP + ' PDF' + (nP === 1 ? '' : 's') : ''].filter(Boolean).join(' · ') || 'Sem links nem PDFs' }));
}

// ---------------------------------------------------------------- gaveta (detalhe e edição)
let drawerEl = null; let lastFocus = null;
function closeDrawer() { if (typeof closeViewer === 'function' && viewerEl) closeViewer(); document.body.classList.remove('has-drawer'); if (drawerEl) { drawerEl.remove(); drawerEl = null; document.removeEventListener('keydown', escClose); if (lastFocus && lastFocus.isConnected) lastFocus.focus(); } }
function escClose(ev) { if (ev.key === 'Escape') closeDrawer(); }
function openDrawer(titleId, header, body, footer) {
  closeDrawer(); lastFocus = document.activeElement;
  const dr = h('section', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, header, h('div', { class: 'body' }, body), footer);
  drawerEl = h('div', { class: 'overlay', onclick: (ev) => { if (ev.target === drawerEl) closeDrawer(); } }, dr);
  document.body.append(drawerEl); document.body.classList.add('has-drawer'); document.addEventListener('keydown', escClose);
  const f = dr.querySelector('input, textarea, select, button'); if (f) f.focus();
}

function detailDrawer(p) {
  const groups = TIPOS.map(([k, t]) => [t, (p.links || []).filter((l) => (TIPO_TXT[l.tipo] ? l.tipo : 'outro') === k)]).filter(([, ls]) => ls.length);
  const pdfs = p.pdfs || [];
  openDrawer('dt-title',
    h('header', {}, h('div', { class: 'tt' }, h('h2', { id: 'dt-title', text: p.nome }), h('div', {}, statusPill(p.status))),
      h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: closeDrawer }, ic('x'))),
    [
      p.cliente || p.resumo ? h('div', { class: 'sec' }, p.cliente ? h('p', { class: 'lead', text: p.cliente }) : null, p.resumo ? h('p', { class: 'lead', text: p.resumo }) : null) : null,
      h('div', { class: 'sec' }, h('h4', { text: 'Sites e versões' }),
        groups.length ? groups.map(([t, ls]) => h('div', { class: 'grp' }, h('small', { text: t }),
          ls.map((l) => h('a', { class: 'row', href: l.url, target: '_blank', rel: 'noopener noreferrer', onclick: (ev) => { if (canFrame(l.url)) { ev.preventDefault(); viewSite(l); } } }, h('span', { class: 'tx' }, h('b', { text: l.rotulo || hostOf(l.url) }), h('small', { text: canFrame(l.url) ? hostOf(l.url) : hostOf(l.url) + ' · abre numa aba nova' })), ic(canFrame(l.url) ? 'eye' : 'ext')))))
          : h('p', { class: 'lead', text: 'Nenhum link ainda.' })),
      h('div', { class: 'sec' }, h('h4', { text: 'PDFs' }),
        pdfs.length ? pdfs.map((d) => h('div', { class: 'row' }, ic('pdf'), h('span', { class: 'tx' }, h('b', { text: d.nome }), h('small', { text: [dataBR(d.data), d.tamanho ? mb(d.tamanho) : ''].filter(Boolean).join(' · ') || (d.id ? 'no seu Drive' : 'arquivo ainda não enviado') })),
          d.id ? h('span', { class: 'btns' }, h('button', { class: 'btn sm', type: 'button', onclick: () => viewPdf(d) }, 'Ver'), h('button', { class: 'btn sm icon-btn', type: 'button', 'aria-label': 'Baixar ' + d.nome, title: 'Baixar', onclick: () => abrirPdf(d, 'baixar') }, ic('down'))) : null))
          : h('p', { class: 'lead', text: 'Nenhum PDF ainda.' })),
      p.notas ? h('div', { class: 'sec' }, h('h4', { text: 'Notas' }), h('p', { class: 'notes', text: p.notas })) : null,
    ],
    h('footer', {}, h('button', { class: 'btn primary', type: 'button', onclick: () => editDrawer(p) }, ic('edit'), 'Editar'), h('span', { class: 'sp' }), h('button', { class: 'btn', type: 'button', onclick: closeDrawer }, 'Fechar')));
}

function editDrawer(orig) {
  const isNew = !orig;
  const p = orig ? JSON.parse(JSON.stringify(orig)) : { id: '', nome: '', cliente: '', status: 'andamento', resumo: '', links: [], pdfs: [], notas: '' };
  const nome = h('input', { class: 'input', value: p.nome, required: true, maxlength: 120 });
  const cliente = h('input', { class: 'input', value: p.cliente || '', maxlength: 160 });
  const status = h('select', { class: 'input' }, STATUS.map(([k, t]) => h('option', { value: k, text: t })));
  status.value = STATUS_TXT[p.status] ? p.status : 'sem';
  const resumo = h('textarea', { class: 'input', rows: 3, maxlength: 600 }); resumo.value = p.resumo || '';
  const notas = h('textarea', { class: 'input', rows: 5, maxlength: 6000 }); notas.value = p.notas || '';

  const linksBox = h('div', { class: 'grp' });
  function linkRow(l = { tipo: 'site', rotulo: '', url: '' }) {
    const tipo = h('select', { class: 'input tipo', 'aria-label': 'Tipo do link' }, TIPOS.map(([k, t]) => h('option', { value: k, text: t }))); tipo.value = TIPO_TXT[l.tipo] ? l.tipo : 'outro';
    const rot = h('input', { class: 'input', placeholder: 'Nome (ex.: Versão de março)', value: l.rotulo || '', 'aria-label': 'Nome do link', maxlength: 120 });
    const url = h('input', { class: 'input full', type: 'url', placeholder: 'https://…', value: l.url || '', 'aria-label': 'Endereço', inputmode: 'url', autocapitalize: 'none', spellcheck: 'false' });
    const row = h('div', { class: 'erow link' }, tipo, rot, h('button', { class: 'btn sm icon-btn', type: 'button', 'aria-label': 'Remover link', onclick: () => row.remove() }, ic('x')), url);
    row._get = () => ({ tipo: tipo.value, rotulo: rot.value.trim(), url: url.value.trim() });
    return row;
  }
  for (const l of p.links || []) linksBox.append(linkRow(l));

  const pdfBox = h('div', { class: 'grp' });
  for (const d of p.pdfs || []) {
    const nm = h('input', { class: 'input', value: d.nome, 'aria-label': 'Nome do PDF', maxlength: 160 });
    let gone = false;
    const rm = h('button', { class: 'btn sm', type: 'button', onclick: () => { gone = !gone; row.classList.toggle('gone', gone); rm.textContent = gone ? 'Desfazer' : 'Remover'; } }, 'Remover');
    const row = h('div', { class: 'erow pdf' }, nm, rm, h('small', { class: 'full muted', text: [dataBR(d.data), d.tamanho ? mb(d.tamanho) : '', d.arquivo].filter(Boolean).join(' · ') }));
    row._get = () => (gone ? { remove: d } : { keep: { ...d, nome: nm.value.trim() || d.nome } });
    pdfBox.append(row);
  }
  const fileIn = h('input', { type: 'file', accept: 'application/pdf,.pdf', multiple: true, 'aria-label': 'Escolher PDF' });
  fileIn.addEventListener('change', () => {
    for (const file of fileIn.files) {
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { toast('“' + file.name + '” não é PDF.', 'err'); continue; }
      if (file.size > MAX_PDF) { toast('“' + file.name + '” tem ' + mb(file.size) + '. O limite aqui é ' + mb(MAX_PDF) + '.', 'err', 6000); continue; }
      const nm = h('input', { class: 'input', value: file.name.replace(/\.pdf$/i, ''), 'aria-label': 'Nome do PDF', maxlength: 160 });
      const row = h('div', { class: 'erow pdf' }, nm, h('button', { class: 'btn sm', type: 'button', onclick: () => row.remove() }, 'Tirar'), h('small', { class: 'full muted', text: 'Novo · ' + mb(file.size) + ' · ' + file.name }));
      row._get = () => ({ add: { file, nome: nm.value.trim() || file.name.replace(/\.pdf$/i, '') } });
      pdfBox.append(row);
    }
    fileIn.value = '';
  });

  const err = h('p', { class: 'err', role: 'alert' });
  async function save() {
    err.textContent = '';
    const n = nome.value.trim(); if (!n) { err.textContent = 'Dê um nome ao projeto.'; nome.focus(); return; }
    const links = [];
    for (const row of linksBox.children) {
      const l = row._get(); if (!l.url && !l.rotulo) continue;
      if (!/^https?:\/\/[^\s]+$/i.test(l.url)) { err.textContent = 'O link “' + (l.rotulo || l.url || 'sem nome') + '” precisa começar com https://'; return; }
      links.push({ tipo: l.tipo, rotulo: l.rotulo || hostOf(l.url), url: l.url });
    }
    const nd = JSON.parse(JSON.stringify(data));
    let id = p.id;
    if (isNew) { const base = slug(n); id = base; let i = 2; while (nd.projetos.some((x) => x.id === id)) id = base + '-' + i++; }
    const keep = []; const remove = []; const adds = [];
    for (const row of pdfBox.children) { const gg = row._get(); if (gg.keep) keep.push(gg.keep); else if (gg.remove) remove.push(gg.remove); else if (gg.add) adds.push(gg.add); }
    try {
      let i = 0;
      for (const a of adds) {
        i++;
        const fname = slug(a.nome) + '-' + hoje() + '.pdf';
        busy(`Enviando “${a.nome}” (${mb(a.file.size)})` + (adds.length > 1 ? ` · ${i} de ${adds.length}` : '') + '…');
        const up = await enviarPdf(a.file, fname);
        keep.push({ nome: a.nome, id: up.id, arquivo: fname, data: hoje(), tamanho: a.file.size });
      }
      const np = { ...p, id, nome: n, cliente: cliente.value.trim(), status: status.value, resumo: resumo.value.trim(), links, pdfs: keep, notas: notas.value.replace(/\s+$/, '') };
      const k = nd.projetos.findIndex((x) => x.id === p.id);
      if (isNew || k < 0) nd.projetos.push(np); else nd.projetos[k] = np;
      busy('Salvando…');
      await salvarDados(nd, remove.map((d) => d.id).filter(Boolean));
      idle(); toast('Salvo no seu Google Drive.', 'ok');
      appView(); detailDrawer(np);
    } catch (e) { fail(e); }
  }
  async function del() {
    const n = (p.pdfs || []).length;
    if (!confirm('Apagar “' + p.nome + '”' + (n ? ' e ' + (n === 1 ? 'o PDF dele' : 'os ' + n + ' PDFs dele') : '') + '? Os PDFs vão para a lixeira do seu Drive, de onde dá para recuperar por 30 dias.')) return;
    const nd = JSON.parse(JSON.stringify(data)); nd.projetos = nd.projetos.filter((x) => x.id !== p.id);
    try {
      busy('Apagando…');
      await salvarDados(nd, (orig.pdfs || []).map((d) => d.id).filter(Boolean));
      idle(); closeDrawer(); appView(); toast('Projeto apagado.', 'ok');
    } catch (e) { fail(e); }
  }

  openDrawer('ed-title',
    h('header', {}, h('div', { class: 'tt' }, h('h2', { id: 'ed-title', text: isNew ? 'Novo projeto' : 'Editar projeto' })),
      h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: () => (isNew ? closeDrawer() : detailDrawer(orig)) }, ic('x'))),
    h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', { text: 'Nome' }), nome),
      h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { text: 'Cliente' }), cliente), h('label', { class: 'field' }, h('span', { text: 'Status' }), status)),
      h('label', { class: 'field' }, h('span', { text: 'Resumo' }), resumo),
      h('div', { class: 'sec' }, h('h4', { text: 'Sites e versões' }), linksBox, h('div', {}, h('button', { class: 'btn sm', type: 'button', onclick: () => { const r = linkRow(); linksBox.append(r); r.querySelector('input').focus(); } }, ic('plus'), 'Adicionar link'))),
      h('div', { class: 'sec' }, h('h4', { text: 'PDFs' }), pdfBox, h('label', { class: 'file btn sm' }, ic('plus'), 'Adicionar PDF', h('span', { class: 'sr' }, fileIn))),
      h('label', { class: 'field' }, h('span', { text: 'Notas' }), notas),
      err),
    h('footer', {}, h('button', { class: 'btn primary', type: 'button', onclick: save }, 'Salvar'), h('button', { class: 'btn', type: 'button', onclick: () => (isNew ? closeDrawer() : detailDrawer(orig)) }, 'Cancelar'),
      h('span', { class: 'sp' }), isNew ? null : h('button', { class: 'btn danger', type: 'button', onclick: del }, ic('trash'), 'Apagar')));
}

// ---------------------------------------------------------------- início
async function start() {
  if (window.top !== window.self) { $app.replaceChildren(h('main', { class: 'center' }, h('p', { class: 'muted', text: 'Abra o painel direto em star-net.pro/admin.' }))); return; } // não roda dentro de outro site
  if (location.hash && location.hash !== '#') {
    const raw = location.hash;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ok */ }
    let u = '';
    if (raw.startsWith('#s=')) {
      try { u = decodeURIComponent(raw.slice(3)).trim(); } catch (e) { u = ''; }
    }
    if (!urlServidorValida(u)) { setupView('Esse link não é de um servidor do painel.'); return; }
    const prev = store.get(K_SERVIDOR);
    if (!prev || prev === u || confirm('Este link troca o servidor do painel deste aparelho por outro.\n\nSó continue se foi você que gerou o link no painel.\n\nOK: trocar. Cancelar: manter o atual.')) {
      if (prev && prev !== u) store.del(K_SESSAO);
      store.set(K_SERVIDOR, u);
    }
  }
  if (!servidor()) { setupView(); return; }
  sessao = lerSessao();
  if (sessao) { await openPanel(); return; }
  const r = await call('estado');
  if (!r || typeof r.configurado !== 'boolean') throw new Error('Esse endereço não parece ser o servidor do painel.');
  if (!r.configurado) { await authenticatorView(); return; }
  loginView(r.travado ? 'Muitos códigos errados. O painel destrava às ' + horaBR(r.travado) + '.' : '');
}
start().catch((e) => setupView(e.message));
