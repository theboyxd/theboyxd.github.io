// Star-net.pro · painel admin.
// Página estática. O login é o código de 6 dígitos do Google Authenticator, conferido pelo servidor da Star-net na VPS,
// que também guarda os projetos, os PDFs e as visitas e junta os números dos apps (Amazon, Radar) para a Central.
// Esta página não guarda dados nem segredos; ela só conversa com o servidor.
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
    else if (k === 'style') e.style.cssText = v;
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
  home: 'M3 11.5 12 4l9 7.5M5.5 10v10h5v-6h3v6h5V10',
  cart: 'M3 4h2.2l2.3 10.4a1.5 1.5 0 0 0 1.5 1.1h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.3M9.5 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5 11.5V20h14v-8.5M10 20v-5h4v5',
  folder: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.9-3.8 4-6 7.5-6s6.6 2.2 7.5 6',
  box: 'M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  truck: 'M2.5 6h11v9.5h-11zM13.5 9.5h4l3 3v3h-7M6.5 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM17 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6',
  alert: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2v.3',
  go: 'M5 12h14M13 6l6 6-6 6',
  burger: 'M4 10.5C4 7 7.6 4.5 12 4.5S20 7 20 10.5zM3.5 13.5h17M4.5 16.5h15a1.5 1.5 0 0 1-1.5 2.5H6a1.5 1.5 0 0 1-1.5-2.5z',
  cube: 'M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3zM12 12l8-4.7M12 12v9.2M12 12 4 7.3',
  building: 'M4.5 20.5V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15.5M14.5 9h4a1 1 0 0 1 1 1v10.5M8 8h3M8 11.5h3M8 15h3M3 20.5h18',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c-2.4 2.6-3.6 5.6-3.6 9s1.2 6.4 3.6 9c2.4-2.6 3.6-5.6 3.6-9S14.4 5.6 12 3',
  radar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12l5.5-5.5',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM18.5 14H20M14 18.5V20h2.5M18.5 18.5H20V20',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
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
async function abrirPdf(d, modo) {
  const w = modo === 'abrir' ? window.open('', '_blank') : null; // abre a aba já no toque, senão o navegador bloqueia
  if (w) { try { w.document.title = d.nome; w.document.body.textContent = 'Abrindo o PDF…'; } catch (e) { /* ok */ } }
  toast('Buscando “' + d.nome + '”…', 'info', 0);
  try {
    const r = await call('baixarPdf', { id: d.id });
    if (r.erro || !r.base64) throw new Error('O servidor não achou esse PDF.');
    const bin = atob(r.base64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
    if (modo === 'baixar') { const a = h('a', { href: url, download: r.nome || d.arquivo || slug(d.nome) + '.pdf' }); document.body.append(a); a.click(); a.remove(); }
    else if (w && !w.closed) w.location.href = url; else location.href = url;
    toast('Pronto.', 'ok', 2000);
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  } catch (e) {
    if (w && !w.closed) w.close();
    fail(e);
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
  if (r.erro || !r.base64) throw new Error('o servidor não achou esse PDF');
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
      h('div', { class: 'pdf-alt' }, h('button', { class: 'btn sm', type: 'button', onclick: () => abrirPdf(d, 'abrir') }, 'Abrir em outra aba')));
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
    brand(), h('h1', { text: 'Central Star-net' }),
    h('p', { class: 'muted', text: 'Abra o Google Authenticator no celular e digite o código de 6 números da Star-net.pro.' }),
    h('label', { class: 'field' }, h('span', { text: 'Código do Authenticator' }), code),
    h('label', { class: 'check' }, lembrar, 'Lembrar este aparelho por 30 dias'), err, btn,
    h('p', { class: 'small muted', text: 'Errou 5 vezes, a Central espera 15 minutos antes de deixar tentar de novo.' }));
  $app.replaceChildren(h('main', { class: 'center' }, form));
  code.focus();
}

async function openPanel() {
  busy('Abrindo a Central…');
  try { await loadData(); } catch (e) { if (e instanceof SessaoError) { fail(e); return; } data = null; toast(e.message, 'err', 6000); }
  idle(); ir(rotaDoEndereco());
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
    h('p', { class: 'muted', text: 'Para trazer os projetos e os PDFs que já existem, escolha a pasta star-net-admin-dados (no computador, em Documentos/claude). Tudo fica guardado no servidor da Star-net.' }),
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
    toast(faltam.length ? 'Importado. Faltaram ' + faltam.length + ' PDF(s): ' + faltam.join(', ') : 'Tudo importado.', faltam.length ? 'err' : 'ok', faltam.length ? 9000 : 3000);
  } catch (e) { fail(e); }
}



// ---------------------------------------------------------------- Central: o que importa dos seus negócios e os seus apps num lugar só
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const mesNome = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' });
const hojeLocal = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function quando(iso) { // os apps gravam a hora de Brasília sem fuso → "hoje às 09:15"
  if (!iso) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + '-03:00');
  if (isNaN(d)) return '';
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (x) => x.toLocaleDateString('pt-BR');
  if (dia(d) === dia(new Date())) return 'hoje às ' + hora;
  if (dia(d) === dia(new Date(Date.now() - 86400000))) return 'ontem às ' + hora;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + hora;
}
const dataCurta = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '');

// Os apps. amazon e radar moram na Central (telas em apps/, ver MODS); os outros abrem numa moldura, dentro da Central.
const APPS_C = {
  amazon: { nome: 'Painel Amazon', sub: 'Dropshipping: Amazon e Shopee', ic: 'box', tom: 't-amber' },
  radar: { nome: 'Radar de Clientes', sub: 'Acha negócios para você vender', ic: 'radar', tom: 't-teal' },
  dads: { nome: 'Dad’s Burger', sub: 'Restaurante · cliente', ic: 'burger', tom: 't-red', url: 'https://dadsburguer.site/' },
  cardapio: { nome: 'Cardápio 3D', sub: 'Restaurante · demonstração', ic: 'cube', tom: 't-blue', url: 'https://star-net.pro/m/demo' },
  imob: { nome: 'PropPulse', sub: 'Imobiliária · demonstração', ic: 'building', tom: 't-sky', url: 'https://star-net.pro/imobiliaria/' },
  site: { nome: 'Site star-net.pro', sub: 'A sua vitrine', ic: 'globe', tom: 't-navy', url: 'https://star-net.pro/' },
};
const STATUS_DE = { amazon: 'amazon', radar: 'radar', dads: 'dads', cardapio: 'site', imob: 'site', site: 'site' };
// Projetos por categoria (o que você vende para cada tipo de negócio)
const CATS = [['restaurantes', 'Restaurantes'], ['imobiliarias', 'Imobiliárias'], ['clinicas', 'Clínicas'], ['outros', 'Outros']];
const CAT_TXT = Object.fromEntries(CATS);
const CAT_IC = { restaurantes: 'burger', imobiliarias: 'building', clinicas: 'globe', outros: 'folder' };
const CAT_TOM = { restaurantes: 't-red', imobiliarias: 't-sky', clinicas: 't-teal', outros: 't-navy' };
const CAT_BUSCA = { restaurantes: 'restaurante', imobiliarias: 'imobiliária', clinicas: 'clínica odontológica' };
const IC_PROJ = { 'cardapio-3d': 'cube', 'dads-burger': 'burger', proppulse: 'building' };
const catDe = (p) => (CAT_TXT[p.categoria] ? p.categoria : 'outros');
function linkPrevia(p) { const ls = p.links || []; return ls.find((l) => l.tipo === 'site') || ls.find((l) => l.tipo === 'demo') || ls.find((l) => l.tipo !== 'repo') || null; }
const DADS_ADMIN = 'https://dadsburguer.site/admin';
const DADS_SECOES = [['kanban', 'Pedidos'], ['catalog', 'Cardápio, estoque e 3D'], ['delivery', 'Entregas'], ['hours', 'Horários'], ['finance', 'Financeiro']];
const NOME_TAREFA = { listings: 'Anúncios', stock: 'Estoque', orders: 'Pedidos', fees: 'Taxas', buybox: 'Buy Box' };

function selo(a, grande) { return h('span', { class: 'selo ' + a.tom + (grande ? ' g' : '') }, ic(a.ic)); }
function ponto(st) {
  if (!st) return h('span', { class: 'st' }, h('i'), 'Conferindo');
  return st.ok ? h('span', { class: 'st st-ok' }, h('i'), 'No ar') : h('span', { class: 'st st-off' }, h('i'), 'Fora do ar');
}
const statusDe = (id) => (CEN.d && CEN.d.status ? CEN.d.status[STATUS_DE[id]] : null);

// ---- dados (o servidor junta Amazon, Radar e o status dos apps e guarda por 20 s)
let CEN = { em: 0, d: null }; let FORCAR = false;
async function pegaCentral(forcar) {
  forcar = forcar || FORCAR; FORCAR = false;
  if (!forcar && CEN.d && Date.now() - CEN.em < 20000) return CEN.d;
  const d = await call('central', { forcar });
  if (!d || d.erro) throw new Error('A Central não conseguiu falar com os apps agora.');
  CEN = { em: Date.now(), d };
  atualizaChip(d);
  return d;
}
let VIS = null;
async function pegaVisitas(forcar) {
  if (VIS && !forcar) return VIS;
  const r = await call('visitas');
  VIS = Array.isArray(r.lista) ? r.lista : [];
  return VIS;
}
let PRATOS = null;
async function pegaPratos() {
  if (!PRATOS) { try { PRATOS = (await (await fetch('cardapio-itens.json', { cache: 'no-cache' })).json()).itens || []; } catch (e) { PRATOS = []; } }
  return PRATOS;
}

// ---- casca: menu lateral (computador), barra de baixo (celular) e a área onde os apps abrem
// ---- casca (Central v3 · RED TEAM): trilho de áreas + UM painel com as páginas da área aberta + barra de cima + Ctrl K.
// Nada de sanfona. No celular: barra de baixo (as áreas) e uma folha com as páginas da área (botão da barra de cima).
const NAV = [['inicio', 'Início', 'home'], ['amazon', 'Loja', 'cart'], ['radar', 'Clientes', 'radar'], ['ia', 'IA', 'sparkles'], ['projetos', 'Projetos', 'grid']];
const NAV_BAIXO = [['acesso', 'Acesso', 'shield']];
const AREA = { inicio: ['Início', 'inicio', 'o dia em um olhar'], amazon: ['Loja Amazon', 'loja', 'vende e envia'], radar: ['Novos clientes', 'clientes', 'acha quem comprar'], ia: ['Modelos de IA', 'ia', 'cria o conteúdo'], projetos: ['Projetos', 'projetos', 'o que você vende'], acesso: ['Acesso', 'acesso', 'quem está dentro'] };
const PAGINAS_FIXAS = { acesso: [{ caminho: '/', nome: 'Aparelhos conectados', ic: 'shield' }] };
// Apps que moram na Central: as telas vêm de apps/<id>.js (montadas de Star-net/star-net-central) e falam com o app
// pela ponte (ação "app" do servidor do painel). Endereços: #/amazon/produtos, #/radar/clientes…
const VERSAO = new URL(import.meta.url).searchParams.get('v') || '';
const MODS = { amazon: { arquivo: 'apps/amazon.js', nome: 'Loja Amazon' }, radar: { arquivo: 'apps/radar.js', nome: 'Novos clientes' }, ia: { arquivo: 'apps/ia.js', nome: 'Modelos de IA' } };
const MOD_P = {}; const MOD_OBJ = {}; const MOD_MENU = {}; let MOD_ATUAL = ''; let ALERTAS_EM = 0;
function modulo(id) {
  if (!MOD_P[id]) MOD_P[id] = import('./' + MODS[id].arquivo + (VERSAO ? '?v=' + VERSAO : '')).then((m) => { MOD_OBJ[id] = m; MOD_MENU[id] = m.MENU || []; if (SH && SH.raiz.isConnected) atualizaCtx(); return m; }).catch((e) => { delete MOD_P[id]; throw e; });
  return MOD_P[id];
}
function icApp(name) { // ícones das telas dos apps (apps/icones.svg)
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use');
  s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true'); u.setAttribute('href', 'apps/icones.svg#' + name); s.append(u);
  return s;
}
let SH = null; let ROTA = 'inicio'; let VOLTAR = 'inicio';
const VISTAS = {};

function casca() {
  if (SH && SH.raiz.isConnected) return SH;
  const botaoArea = (tag) => ([id, nome, icone]) => h('button', { type: 'button', class: tag === 'rb' ? 'rb' : '', 'data-r': id, onclick: () => { fechaFolha(); ir(id, true); } }, icApp(icone), h('span', { text: nome }), h('i', { class: 'bd', hidden: true }));
  const rail = h('aside', { class: 'rl', 'aria-label': 'Áreas' },
    h('button', { type: 'button', class: 'lg', title: 'Star-net.pro', 'aria-label': 'Início', onclick: () => ir('inicio', true) }, h('img', { src: 'simbolo.png', alt: '', width: 36, height: 46 })),
    NAV.map(botaoArea('rb')), h('span', { class: 'sp' }), NAV_BAIXO.map(botaoArea('rb')));
  const cp = h('aside', { class: 'cp', 'aria-label': 'Páginas da área', hidden: true });
  const cr = h('div', { class: 'cr' });
  const pgb = h('button', { type: 'button', class: 'pgb', 'aria-label': 'Páginas desta área', hidden: true, onclick: () => document.body.classList.toggle('fl-open') }, icApp('menu'), h('span'));
  const cmd = h('button', { type: 'button', class: 'cmd', 'aria-label': 'Buscar ou executar (Ctrl K)', onclick: () => abrePaleta() }, icApp('search'), h('span', { text: 'Buscar ou executar…' }), h('kbd', { text: 'Ctrl K' }));
  const chip = h('span', { class: 'sc', hidden: true }, h('i'), h('span'));
  const gpu = h('button', { type: 'button', class: 'sc gpu', hidden: true, title: 'Máquina de vídeo (RunPod)', onclick: () => ir('ia/conexoes', true) }, h('i'), h('span'));
  const topo = h('header', { class: 'tp' }, h('div', { class: 'brand3' }, h('img', { src: 'simbolo.png', alt: '', width: 26, height: 33 }), 'Star-net', h('em', { text: '.pro' })), cr, pgb, cmd, gpu, chip);
  const vista = h('main', { class: 'cx-view', id: 'vista', tabindex: '-1' });
  const dock = h('nav', { class: 'dk', 'aria-label': 'Áreas' }, NAV.map(botaoArea('dk')));
  const folha = h('div', { class: 'fl', role: 'dialog', 'aria-label': 'Páginas desta área' });
  const raiz = h('div', { class: 'app3 sem-cp' }, rail, cp, h('div', { class: 'mn' }, topo, vista), dock, folha);
  $app.replaceChildren(raiz);
  SH = { raiz, vista, cp, cr, pgb, folha, chip, gpu, caminho: '/' };
  Promise.allSettled(Object.keys(MODS).map(modulo)); // carrega as telas em segundo plano: o Ctrl K já conhece as páginas de cada área
  pegaRunpod();
  return SH;
}
const secaoDe = (rota) => rota.split(':')[0];
const fechaFolha = () => document.body.classList.remove('fl-open');
function paginasDe(sec) {
  if (MODS[sec]) return (MOD_MENU[sec] || []).map((m) => ({ caminho: m.caminho, nome: m.nome, ic: m.ic }));
  return PAGINAS_FIXAS[sec] || [];
}
function alvoDe(sec, caminho) { return sec + (MODS[sec] ? (caminho && caminho !== '/' ? caminho : '') : ''); }
// o painel da área, a folha do celular, o caminho de pastas e as marcas de "aqui" do trilho e da barra de baixo
function atualizaCtx() {
  if (!SH || !SH.raiz.isConnected) return;
  const s = SH, sec = secaoDe(ROTA), area = AREA[sec] || AREA.inicio, pgs = paginasDe(sec), mod = MOD_OBJ[sec];
  for (const b of s.raiz.querySelectorAll('[data-r]')) {
    const on = b.dataset.r === sec; b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  const varios = pgs.length > 1;
  s.raiz.classList.toggle('sem-cp', !varios); s.cp.hidden = !varios; s.pgb.hidden = !varios;
  const atual = pgs.find((p) => p.caminho === s.caminho) || pgs[0];
  s.pgb.querySelector('span').textContent = atual ? atual.nome : area[0];
  s.cr.replaceChildren('~/', h('b', { text: area[1] }), atual && varios ? '/' + slug(atual.nome) : '');
  const item = (p) => h('button', { type: 'button', class: 'it' + (atual && p.caminho === atual.caminho ? ' on' : ''), 'data-c': p.caminho, 'aria-current': atual && p.caminho === atual.caminho ? 'page' : null, onclick: () => { fechaFolha(); ir(alvoDe(sec, p.caminho), true); } },
    icApp(p.ic), h('span', { text: p.nome }), p.caminho === '/logistica' ? h('span', { class: 'ct', hidden: true }) : null);
  const venda = () => (mod && mod.novaVenda ? h('button', { type: 'button', class: 'btn primary sm acao', onclick: () => { fechaFolha(); mod.novaVenda(); } }, icApp('plus'), h('span', { text: 'Registrar venda' })) : null);
  s.cp.replaceChildren(...[h('h3', { text: area[0] }), h('div', { class: 'sub', text: area[2] }), venda(), ...pgs.map(item)].filter(Boolean));
  s.folha.replaceChildren(...[h('h4', { text: area[0] }), venda(), ...pgs.map(item)].filter(Boolean));
  if (mod && mod.alertas && ALERTAS_N != null) pintaAlertas(ALERTAS_N);
}
let ALERTAS_N = null;
function pintaAlertas(n) {
  ALERTAS_N = n;
  for (const el of SH.raiz.querySelectorAll('[data-c="/logistica"] .ct')) { el.hidden = !n; el.textContent = n; el.title = n + (n === 1 ? ' produto para repor' : ' produtos para repor'); }
  for (const el of SH.raiz.querySelectorAll('[data-r="amazon"] .bd')) { el.hidden = !n; el.textContent = n; }
}
let RP = null; let RP_T = 0;
const usd = (v) => 'US$ ' + Number(v || 0).toFixed(2).replace('.', ',');
async function pegaRunpod() { // lê o estado da máquina de vídeo; sem chave salva a Central não chama a RunPod nem insiste
  clearTimeout(RP_T);
  if (!sessao || !SH || !SH.raiz.isConnected) return;
  try { const r = await call('iaRunpodEstado'); RP = r && r.runpod ? r.runpod : null; } catch (e) { if (e instanceof SessaoError) return; RP = null; }
  atualizaGpu();
  if (!RP || RP.estado === 'sem_chave') return;
  const rapido = ['ligando', 'preparando', 'desligando'].includes(RP.estado);
  RP_T = setTimeout(pegaRunpod, rapido ? 3000 : 20000);
}
function atualizaGpu() { // chip "GPU …": só aparece se há chave da RunPod
  if (!SH || !SH.raiz.isConnected) return;
  const c = SH.gpu, e = RP ? RP.estado : 'sem_chave';
  c.hidden = !RP || e === 'sem_chave';
  const rot = { sem_preparo: 'GPU não preparada', preparando: 'GPU preparando…', desligada: 'GPU desligada', ligando: 'GPU ligando…', ligada: 'GPU ligada' + (RP && RP.pod && RP.pod.custoHora ? ' · ' + usd(RP.pod.custoHora) + '/h' : ''), desligando: 'GPU desligando…', erro: 'GPU com problema' }[e] || 'GPU';
  c.className = 'sc gpu' + (['ligada', 'ligando', 'preparando'].includes(e) ? ' hot' : e === 'erro' ? ' warn' : '');
  c.lastChild.textContent = rot; c.title = (RP && RP.msg) || (RP && RP.aviso) || 'Máquina de vídeo (RunPod)';
}
async function ligaGpu() {
  try { const r = await call('iaRunpodLigar'); if (r.erro) throw new Error(r.mensagem || 'A RunPod não ligou a máquina.'); toast('Ligando a máquina de vídeo. Ela cobra por hora enquanto estiver ligada.', 'ok', 4500); pegaRunpod(); } catch (e) { fail(e); }
}
async function desligaGpu() {
  try {
    let r = await call('iaRunpodDesligar');
    if (r.erro === 'ocupado') { if (!(await confirma('Há um vídeo em andamento', (r.mensagem || 'Desligar agora cancela o vídeo.') + ' Desligar mesmo assim?', 'Desligar', true))) return; r = await call('iaRunpodDesligar', { forcar: true }); }
    if (r.erro) throw new Error(r.mensagem || 'A RunPod não desligou a máquina.');
    toast('Máquina de vídeo desligada.', 'ok'); pegaRunpod();
  } catch (e) { fail(e); }
}
if (LOCAL) window.__snTeste = { gpu: (rp) => { RP = rp; atualizaGpu(); } }; // só no computador de teste (127.0.0.1): deixa o teste desenhar cada estado
function atualizaChip(d) { // "tudo no ar" ou "N fora do ar", com o que o servidor já sabe dos apps
  if (!SH || !SH.raiz.isConnected || !d || !d.status) return;
  const fora = Object.values(d.status).filter((x) => x && x.ok === false).length;
  SH.chip.hidden = false; SH.chip.className = 'sc ' + (fora ? 'warn' : 'ok'); SH.chip.lastChild.textContent = fora ? fora + ' fora do ar' : 'tudo no ar';
}
// "amazon/produtos?x=1" → { secao: 'amazon', caminho: '/produtos?x=1' }
function analisa(r) {
  const m = /^([a-z]+)([/?].*)?$/.exec(String(r || ''));
  if (!m) return { secao: 'inicio' };
  let secao = m[1]; const resto = m[2] || '';
  if (secao === 'dropshipping') return { secao: 'amazon', caminho: '/' };
  if (secao === 'apps' || secao === 'visitas') return { secao: 'projetos' };
  if (secao === 'app') { const id = resto.replace(/^\//, '').split(/[/?]/)[0]; return MODS[id] ? { secao: id, caminho: '/' } : { secao: 'projetos' }; }
  if (MODS[secao]) return { secao, caminho: resto.startsWith('?') ? '/' + resto : (resto || '/') };
  if (!VISTAS[secao]) secao = 'inicio';
  return { secao };
}
function ir(r, empurra) {
  const s = casca(), a = analisa(r);
  const alvo = '#/' + (MODS[a.secao] ? a.secao + (a.caminho === '/' ? '' : a.caminho) : a.secao);
  if (location.hash !== alvo) { try { history[empurra ? 'pushState' : 'replaceState'](null, '', alvo); } catch (e) { /* ok */ } }
  if (MOD_ATUAL && a.secao !== MOD_ATUAL) { const id = MOD_ATUAL; MOD_ATUAL = ''; modulo(id).then((m) => m.sai()).catch(() => {}); } // saiu do app
  ROTA = MODS[a.secao] ? a.secao + ':' + a.caminho : a.secao;
  s.caminho = MODS[a.secao] ? menuDeLista(a.secao, a.caminho) : '/';
  VOLTAR = alvo.slice(2);
  fechaFolha(); closeDrawer(); atualizaCtx();
  if (MODS[a.secao]) mostraModulo(a.secao, a.caminho);
  else VISTAS[a.secao](s.vista);
  window.scrollTo(0, 0);
}
const rotaDoEndereco = () => (location.hash || '').replace(/^#\/?/, '') || 'inicio';
// chamado depois de salvar ou apagar um projeto: redesenha a tela atual
function appView() {
  if (!SH || !SH.raiz.isConnected) { ir(VOLTAR || 'inicio'); return; }
  if (VISTAS[ROTA]) VISTAS[ROTA](SH.vista);
}
// links dentro das telas dos apps (#/amazon/garimpo/12) e o "voltar" do navegador
window.addEventListener('hashchange', () => { if (SH && SH.raiz.isConnected && sessao) ir(rotaDoEndereco()); });

// ---- apps que moram na Central (Loja Amazon, Novos clientes, Modelos de IA)
function menuDeLista(id, caminho) {
  const p = String(caminho || '/').split('?')[0].replace(/\/+$/, '') || '/', menu = MOD_MENU[id] || [];
  const hit = menu.find((m) => (m.caminho === '/' ? p === '/' : p === m.caminho || p.startsWith(m.caminho + '/')));
  return hit ? hit.caminho : '/';
}
function atualizaAlertas(mod, forcar) { // o número em "Estoque e compras" = produtos para repor agora
  if (!mod.alertas || (!forcar && Date.now() - ALERTAS_EM < 60000)) return;
  ALERTAS_EM = Date.now();
  mod.alertas().then((n) => pintaAlertas(n)).catch(() => { ALERTAS_EM = 0; });
}
async function mostraModulo(id, caminho) {
  const s = casca(), minha = ROTA;
  let quadro = s.vista.firstElementChild;
  if (!quadro || quadro.dataset.mod !== id) {
    quadro = h('div', { class: 'pg jx-pg', 'data-mod': id }, h('div', { class: 'jx jx-raiz' }, h('div', { class: 'jx-carrega' }, carregando(MODS[id].nome))));
    s.vista.replaceChildren(quadro);
  }
  const raiz = quadro.querySelector('.jx-raiz');
  let mod;
  try { mod = await modulo(id); } catch (e) {
    if (ROTA === minha) raiz.replaceChildren(erroCard('Não consegui carregar as telas. Confira a internet e tente de novo.', () => mostraModulo(id, caminho)));
    return;
  }
  if (ROTA !== minha) return;
  MOD_ATUAL = id; s.caminho = menuDeLista(id, caminho); atualizaCtx();
  const marcado = await mod.mostra(raiz, caminho);
  if (ROTA === minha) { s.caminho = marcado || s.caminho; atualizaCtx(); }
  atualizaAlertas(mod);
}

// ---- janelas do app no lugar de confirm(): o navegador não sabe o que é a Central
function dialogo({ titulo, texto, botoes, foco }) {
  return new Promise((res) => {
    const fecha = (v) => { document.removeEventListener('keydown', tecla, true); el.remove(); res(v); };
    const tecla = (ev) => { if (ev.key === 'Escape') { ev.stopImmediatePropagation(); ev.preventDefault(); fecha(null); } };
    const el = h('div', { class: 'dg', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, onclick: (ev) => { if (ev.target === el) fecha(null); } },
      h('div', { class: 'dgb' }, h('h3', { text: titulo }), texto ? h('p', { text: texto }) : null,
        h('div', { class: 'bt3' }, botoes.map((b) => h('button', { type: 'button', class: 'btn ' + (b.tipo || ''), 'data-id': String(b.id), onclick: () => fecha(b.id) }, b.rotulo)))));
    document.addEventListener('keydown', tecla, true);
    document.body.append(el);
    const alvo = el.querySelector(foco ? '[data-id="' + foco + '"]' : '.btn'); if (alvo) alvo.focus();
  });
}
const confirma = (titulo, texto, ok = 'Confirmar', perigo = false) => dialogo({ titulo, texto, foco: 'null', botoes: [{ id: null, rotulo: 'Cancelar', tipo: 'ghost' }, { id: 'ok', rotulo: ok, tipo: perigo ? 'danger' : 'primary' }] }).then((v) => v === 'ok');

// ---- Ctrl K: pular para qualquer página ou fazer uma coisa sem procurar no menu
function acoesPaleta() {
  return [
    { t: 'Registrar venda', s: 'Loja', ic: 'plus', f: () => novaVenda() },
    { t: 'Achar produto para vender', s: 'Loja', ic: 'search', f: () => ir('amazon/garimpo', true) },
    { t: 'Atualizar as vendas da Amazon', s: 'Loja', ic: 'refresh', f: () => sincronizaAmazon() },
    { t: 'Buscar clientes no Google Maps', s: 'Clientes', ic: 'radar', f: () => ir('radar', true) },
    { t: 'Criar foto ou vídeo de modelo', s: 'IA', ic: 'sparkles', f: () => ir('ia/criar', true) },
    ...(RP && RP.estado === 'desligada' ? [{ t: 'Ligar a máquina de vídeo (RunPod)', s: 'IA', ic: 'power', f: () => ligaGpu() }] : []),
    ...(RP && ['ligada', 'ligando'].includes(RP.estado) ? [{ t: 'Desligar a máquina de vídeo (RunPod)', s: 'IA', ic: 'power', f: () => desligaGpu() }] : []),
    ...(RP && ['sem_preparo', 'erro'].includes(RP.estado) ? [{ t: 'Preparar a máquina de vídeo (RunPod)', s: 'IA', ic: 'sliders', f: () => ir('ia/conexoes', true) }] : []),
    { t: 'Nova visita (Cardápio 3D)', s: 'Projetos', ic: 'calendar', f: () => visitaDrawer(null) },
    { t: 'Aparelhos conectados', s: 'Acesso', ic: 'shield', f: () => ir('acesso', true) },
    { t: 'Sair deste aparelho', s: 'Acesso', ic: 'power', f: () => sairView() },
  ];
}
function destinosPaleta() {
  const lista = [];
  for (const [id, nome, icone] of [...NAV, ...NAV_BAIXO]) lista.push({ t: nome, s: 'Ir para', ic: icone, f: () => ir(id, true) });
  for (const id of Object.keys(MODS)) for (const m of MOD_MENU[id] || []) lista.push({ t: AREA[id][0] + ' · ' + m.nome, s: 'Ir para', ic: m.ic, f: () => ir(id + (m.caminho === '/' ? '' : m.caminho), true) });
  return lista;
}
async function sincronizaAmazon() {
  try {
    const r = await call('amazonSincronizar');
    if (r.erro) throw new Error(r.mensagem || 'O Painel Amazon não respondeu.');
    toast(r.jaRodando ? 'Já estava atualizando. Os números chegam em instantes.' : 'Pedi à Amazon. Os números novos chegam em 1 ou 2 minutos.', 'ok', 4500);
  } catch (e) { fail(e); }
}
let PAL = null;
function abrePaleta() {
  if (PAL || !SH || !SH.raiz.isConnected) return;
  const todos = [...acoesPaleta().map((x) => ({ ...x, g: 'Ações' })), ...destinosPaleta().map((x) => ({ ...x, g: 'Ir para' }))];
  let sel = 0, vis = todos;
  const inp = h('input', { type: 'text', placeholder: 'buscar ou executar…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Buscar ou executar' });
  const lista = h('div', { class: 'lista', role: 'listbox' });
  const fecha = () => { document.removeEventListener('keydown', tecla, true); el.remove(); document.body.classList.remove('pl-open'); PAL = null; };
  const roda = (x) => { fecha(); if (x) x.f(); };
  const pinta = () => {
    const q = norm(inp.value).trim();
    vis = q ? todos.filter((x) => norm(x.t + ' ' + x.s).includes(q)) : todos;
    sel = Math.min(sel, Math.max(0, vis.length - 1));
    const kids = []; let g = '';
    vis.forEach((x, i) => {
      if (x.g !== g) { g = x.g; kids.push(h('div', { class: 'gl', text: g })); }
      kids.push(h('button', { type: 'button', class: 'pi' + (i === sel ? ' on' : ''), role: 'option', onmousemove: () => { if (sel !== i) { sel = i; pinta(); } }, onclick: () => roda(x) }, icApp(x.ic), h('span', { text: x.t }), h('small', { text: x.s })));
    });
    lista.replaceChildren(...(kids.length ? kids : [h('div', { class: 'vazio', text: 'Nada com “' + inp.value + '”.' })]));
    const on = lista.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  };
  const tecla = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); fecha(); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); sel = Math.min(vis.length - 1, sel + 1); pinta(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); sel = Math.max(0, sel - 1); pinta(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); roda(vis[sel]); }
  };
  inp.addEventListener('input', () => { sel = 0; pinta(); });
  const el = h('div', { class: 'pl', onclick: (ev) => { if (ev.target === el) fecha(); } },
    h('div', { class: 'pb', role: 'dialog', 'aria-label': 'Buscar ou executar' }, h('div', { class: 'in' }, h('b', { text: '>' }), inp), lista,
      h('div', { class: 'ft' }, h('span', { text: '↑↓ escolher' }), h('span', { text: 'Enter abrir' }), h('span', { text: 'Esc fechar' }))));
  document.body.append(el); document.body.classList.add('pl-open'); PAL = el;
  document.addEventListener('keydown', tecla, true); pinta(); inp.focus();
}
addEventListener('keydown', (ev) => {
  if (!sessao || !SH || !SH.raiz.isConnected) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); if (PAL) PAL.click(); else abrePaleta(); return; }
  const t = ev.target, digitando = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if (ev.key === '/' && !digitando && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); abrePaleta(); }
});

// ---- peças das telas
function cabeca(titulo, sub, ...acoes) {
  return h('header', { class: 'pg-hd' }, h('div', {}, h('h1', { text: titulo }), sub ? h('p', { class: 'muted cap', text: sub }) : null), acoes.length ? h('div', { class: 'pg-acts' }, acoes) : null);
}
function botaoAtualizar(depois) {
  return h('button', { class: 'btn ghost icon-btn', type: 'button', title: 'Atualizar os números', 'aria-label': 'Atualizar os números', onclick: () => { FORCAR = true; depois(); } }, ic('sync'));
}
function carregando(titulo) { return h('section', { class: 'card carregando', 'aria-busy': 'true' }, h('div', { class: 'card-hd' }, h('h2', { text: titulo })), h('div', { class: 'sk' }), h('div', { class: 'sk curto' }), h('div', { class: 'sk' })); }
function erroCard(msg, tentar) {
  return h('section', { class: 'card' }, h('p', { class: 'err', text: msg }), tentar ? h('div', { class: 'prod-acts' }, h('button', { class: 'btn sm', type: 'button', onclick: tentar }, 'Tentar de novo')) : null);
}
function falhaNaTela(alvo, e, tentar) { if (e instanceof SessaoError) { fail(e); return; } alvo.replaceChildren(erroCard(e.message || 'Não deu para carregar agora.', tentar)); }

function grafico(serie, mes) {
  const max = Math.max(0, ...serie.map((x) => x.v));
  if (!serie.length || max <= 0) return null;
  const NS = 'http://www.w3.org/2000/svg', hojeK = hojeLocal();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${serie.length * 10} 50`); svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'barras'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Faturamento por dia em ' + mes + '. Maior dia: ' + brl(max) + '.');
  serie.forEach((x, i) => {
    const base = document.createElementNS(NS, 'rect');
    base.setAttribute('x', i * 10 + 1); base.setAttribute('y', 48); base.setAttribute('width', 8); base.setAttribute('height', 2); base.setAttribute('class', 'base');
    svg.append(base);
    if (x.v > 0) {
      const hh = Math.max(2, x.v / max * 46);
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', i * 10 + 1); r.setAttribute('y', 48 - hh); r.setAttribute('width', 8); r.setAttribute('height', hh); r.setAttribute('rx', 1.5);
      r.setAttribute('class', 'b' + (x.d === hojeK ? ' hoje' : ''));
      const t = document.createElementNS(NS, 'title'); t.textContent = dataBR(x.d).slice(0, 5) + ': ' + brl(x.v); r.append(t);
      svg.append(r);
    }
  });
  return h('figure', { class: 'graf' }, svg, h('figcaption', {}, h('span', { text: '1º de ' + mes }), h('span', { text: 'hoje' })));
}
function linhaSinc(A, soBotao) {
  const o = (A.tarefas || {}).orders;
  const txt = A.rodando ? 'Atualizando com a Amazon agora…' : o ? 'Pedidos conferidos ' + quando(o.em) + (o.msg ? ' · ' + o.msg : '') : 'Ainda sem atualização da Amazon';
  const rot = h('span', { text: 'Atualizar agora' });
  const btn = h('button', { class: 'btn sm', type: 'button' }, ic('sync'), rot);
  btn.addEventListener('click', async () => {
    btn.disabled = true; rot.textContent = 'Pedindo…';
    try {
      const r = await call('amazonSincronizar');
      if (r.erro) throw new Error(r.mensagem || 'O Painel Amazon não respondeu.');
      toast(r.jaRodando ? 'Já estava atualizando. Os números chegam em instantes.' : 'Pedi à Amazon. Os números novos chegam em 1 ou 2 minutos.', 'ok', 4500);
      setTimeout(() => { if (ROTA === 'inicio') { FORCAR = true; VISTAS.inicio(SH.vista); } }, 75000);
    } catch (e) { fail(e); }
    btn.disabled = false; rot.textContent = 'Atualizar agora';
  });
  return h('div', { class: 'sinc' + (soBotao ? ' so' : '') }, soBotao ? h('span', { class: 'muted', text: A.rodando ? 'Atualizando agora…' : 'Quer ver as vendas mais novas já?' }) : h('span', { class: 'muted', text: txt }), btn);
}
function ultimaTxt(u) {
  if (!u || !u.data) return '';
  const dias = Math.round((new Date(hojeLocal() + 'T12:00:00') - new Date(u.data + 'T12:00:00')) / 86400000);
  return ' · a última foi em ' + dataBR(u.data).slice(0, 5) + (dias > 1 ? ', há ' + dias + ' dias' : '');
}
function linhaVisita(v) {
  return h('div', { class: 'vl' }, h('span', { class: 'vl-cor', style: `--c1:#${v.cor};--c2:#${v.cor2}`, 'aria-hidden': 'true' }),
    h('div', { class: 'ap-tt' }, h('b', { text: v.negocio || v.nome }), h('small', { text: [dataCurta(v.quando), v.cidade, 'Cardápio 3D'].filter(Boolean).join(' · ') })),
    h('button', { class: 'btn sm', type: 'button', onclick: () => qrVisita(v) }, ic('qr'), 'Mostrar'));
}
// ---- telas
function atalho(icone, titulo, sub, fn) {
  return h('button', { type: 'button', class: 'at', onclick: fn }, h('span', { class: 'at-ic' }, icApp(icone)), h('span', { class: 'at-tx' }, h('b', { text: titulo }), h('small', { text: sub })));
}
function itemFazer(icone, texto, tipo, fn) {
  return h('li', {}, h('button', { type: 'button', class: 'al al-' + tipo, onclick: fn }, icApp(icone), h('span', { text: texto }), icApp('chevron-right')));
}
const novaVenda = () => modulo('amazon').then((m) => m.novaVenda()).catch(fail);
function blocoDinheiro(A) {
  const mes = mesNome(A.de || hojeLocal()), ant = A.anterior || {}, m = A.mes || {};
  const delta = ant.faturamento > 0 && m.faturamento > 0 ? Math.round((m.faturamento - ant.faturamento) / ant.faturamento * 100) : null;
  return h('section', { class: 'card bt bt-din' },
    h('div', { class: 'card-hd' }, h('div', {}, h('span', { class: 'bt-lab' }, icApp('cart'), 'Loja Amazon'), h('h2', { text: 'Faturamento em ' + mes })),
      h('button', { class: 'btn sm', type: 'button', onclick: () => ir('amazon', true) }, 'Abrir a loja', ic('go'))),
    A.erro ? h('p', { class: 'err', text: A.erro }) : [
      h('div', { class: 'bt-din-l' },
        h('div', {}, h('b', { class: 'num bt-big', text: brl(m.faturamento) }),
          h('p', { class: 'm-note' }, m.pedidos ? plural(m.pedidos, 'pedido', 'pedidos') + ' · ticket médio ' + brl(m.ticket) : 'Nenhuma venda em ' + mes + ' até agora' + ultimaTxt(A.ultimaVenda),
            delta !== null ? h('span', { class: 'delta ' + (delta >= 0 ? 'up' : 'down'), text: (delta >= 0 ? '+' : '') + delta + '%' }) : null),
          ant.faturamento > 0 ? h('p', { class: 'm-note fraco', text: 'Nos ' + (A.serie || []).length + ' dias anteriores: ' + brl(ant.faturamento) + ' em ' + plural(ant.pedidos, 'pedido', 'pedidos') }) : null),
        h('div', { class: 'mini' }, h('small', { text: 'Hoje' }), h('b', { class: 'num', text: brl((A.hoje || {}).faturamento) }), h('span', { text: plural((A.hoje || {}).pedidos || 0, 'pedido', 'pedidos') }))),
      grafico(A.serie || [], mes), linhaSinc(A)]);
}
function blocoFazer(c, vis) {
  const A = c.amazon || {}, R = c.radar || {}, itens = [];
  if (A.conectada === false) itens.push(itemFazer('alert', 'A Amazon não está ligada à loja', 'err', () => ir('amazon/config', true)));
  for (const [k, t] of Object.entries(A.tarefas || {})) if (!t.ok) itens.push(itemFazer('alert', (NOME_TAREFA[k] || k) + ' não atualizou: ' + t.msg, 'err', () => ir('amazon/config', true)));
  if (A.reporTotal) itens.push(itemFazer('box', plural(A.reporTotal, 'produto para repor', 'produtos para repor'), 'warn', () => ir('amazon/logistica?aba=estoque', true)));
  if (A.mes && A.mes.semCusto) itens.push(itemFazer('alert', plural(A.mes.semCusto, 'venda sem o custo do produto', 'vendas sem o custo do produto'), 'warn', () => ir('amazon/produtos', true)));
  if (A.envios) itens.push(itemFazer('truck', plural(A.envios, 'compra a caminho', 'compras a caminho'), 'info', () => ir('amazon/logistica', true)));
  const hj = hojeLocal(), prox = vis.filter((v) => v.quando && v.quando >= hj).sort((a, b) => a.quando.localeCompare(b.quando))[0];
  if (prox) itens.push(itemFazer('calendar', 'Visita ' + (prox.quando === hj ? 'hoje' : dataCurta(prox.quando)) + ': ' + (prox.negocio || prox.nome), 'info', () => qrVisita(prox)));
  if (R && !R.erro && R.novo) itens.push(itemFazer('user', plural(R.novo, 'negócio esperando a sua ligação', 'negócios esperando a sua ligação'), 'info', () => ir('radar/clientes', true)));
  return h('section', { class: 'card bt bt-faz' },
    h('div', { class: 'card-hd' }, h('div', {}, h('span', { class: 'bt-lab' }, icApp('check-circle'), 'Agora'), h('h2', { text: 'Precisa de você' }))),
    itens.length ? h('ul', { class: 'alertas' }, itens) : h('p', { class: 'bt-ok' }, icApp('check-circle'), 'Tudo em dia.'));
}
function blocoProjetosInicio() {
  const ps = (data && data.projetos) || [];
  return h('section', { class: 'card bt bt-proj' },
    h('div', { class: 'card-hd' }, h('div', {}, h('span', { class: 'bt-lab' }, icApp('grid'), 'Projetos'), h('h2', { text: 'O que você vende' })),
      h('button', { class: 'btn sm ghost', type: 'button', onclick: () => ir('projetos', true) }, 'Ver projetos', ic('go'))),
    ps.length ? h('div', { class: 'bt-pjs' }, ps.map((p) => {
      const l = linkPrevia(p), cat = CAT_TXT[catDe(p)];
      return h('button', { type: 'button', class: 'bt-pj', onclick: () => (l ? viewSite({ rotulo: p.nome, url: l.url }) : ir('projetos', true)) },
        h('span', { class: 'selo ' + CAT_TOM[catDe(p)] }, ic(IC_PROJ[p.id] || CAT_IC[catDe(p)])),
        h('span', { class: 'ap-tt' }, h('b', { text: p.nome }), h('small', { text: cat })), ic('eye'));
    })) : h('p', { class: 'muted', text: 'Nenhum projeto ainda.' }));
}
function blocoClientes(R) {
  const tot = R && !R.erro ? (R.novo || 0) + (R.contatado || 0) + (R.interessado || 0) + (R.fechado || 0) : 0;
  const parte = (n, cls, t) => (n ? h('i', { class: 'fx ' + cls, style: `flex:${n}`, title: t + ': ' + n }) : null);
  return h('section', { class: 'card bt bt-cli' },
    h('div', { class: 'card-hd' }, h('div', {}, h('span', { class: 'bt-lab' }, icApp('radar'), 'Novos clientes'), h('h2', { text: 'Quem procurar' })),
      h('button', { class: 'btn sm ghost', type: 'button', onclick: () => ir('radar/clientes', true) }, 'Lista de ligações', ic('go'))),
    !R || R.erro ? h('p', { class: 'err', text: 'O Radar não respondeu agora.' }) : [
      h('div', { class: 'funil', role: 'img', 'aria-label': `${R.novo} sem contato, ${R.contatado} contatados, ${R.interessado} interessados, ${R.fechado || 0} fechados` },
        parte(R.novo, 'f1', 'Sem contato'), parte(R.contatado, 'f2', 'Contatados'), parte(R.interessado, 'f3', 'Interessados'), parte(R.fechado, 'f4', 'Fechados')),
      h('div', { class: 'funil-leg' },
        [['f1', 'Sem contato', R.novo], ['f2', 'Contatados', R.contatado], ['f3', 'Interessados', R.interessado], ['f4', 'Fechados', R.fechado || 0]].map(([k, t, n]) => h('span', {}, h('i', { class: 'fx ' + k }), t, h('b', { class: 'num', text: String(n || 0) })))),
      h('p', { class: 'muted small', text: plural(tot, 'negócio encontrado', 'negócios encontrados') + ' no Google Maps.' }),
      h('div', { class: 'prod-acts' }, h('button', { class: 'btn sm primary', type: 'button', onclick: () => ir('radar/clientes', true) }, 'Ligar agora'), h('button', { class: 'btn sm', type: 'button', onclick: () => ir('radar', true) }, 'Buscar mais no Maps'))]);
}
function blocoVisitas(vis) {
  const hj = hojeLocal();
  const prox = vis.filter((v) => !v.quando || v.quando >= hj).sort((a, b) => String(a.quando || '9').localeCompare(String(b.quando || '9'))).slice(0, 3);
  return h('section', { class: 'card bt bt-vis' },
    h('div', { class: 'card-hd' }, h('div', {}, h('span', { class: 'bt-lab' }, icApp('calendar'), 'Visitas'), h('h2', { text: 'Próximas visitas' })),
      h('button', { class: 'btn sm', type: 'button', onclick: () => visitaDrawer(null) }, ic('plus'), 'Nova visita')),
    prox.length ? prox.map(linhaVisita) : h('p', { class: 'muted', text: 'Nenhuma visita marcada. Vai entrar num restaurante? Prepare o Cardápio 3D com o nome e as cores dele antes.' }));
}
VISTAS.inicio = (v) => {
  const hr = new Date().getHours();
  const ola = hr < 5 ? 'Boa noite' : hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const atalhos = h('div', { class: 'atalhos' },
    atalho('plus', 'Registrar venda', 'Loja Amazon', novaVenda),
    atalho('search', 'Achar produto', 'Para vender na Amazon', () => ir('amazon/garimpo', true)),
    atalho('radar', 'Buscar clientes', 'No Google Maps', () => ir('radar', true)),
    atalho('sparkles', 'Criar conteúdo', 'Fotos e vídeos das modelos', () => ir('ia/criar', true)),
    atalho('calendar', 'Nova visita', 'Cardápio 3D do negócio', () => visitaDrawer(null)));
  const corpo = h('div', { class: 'bento' }, carregando('Loja Amazon'), carregando('Precisa de você'));
  v.replaceChildren(h('div', { class: 'pg' }, cabeca(ola, dia, botaoAtualizar(() => VISTAS.inicio(v))), corpo));
  Promise.all([pegaCentral(), pegaVisitas().catch(() => [])]).then(([c, vis]) => {
    if (ROTA !== 'inicio' || !corpo.isConnected) return;
    corpo.replaceChildren(blocoDinheiro(c.amazon || {}), blocoFazer(c, vis), blocoProjetosInicio(), blocoClientes(c.radar), blocoVisitas(vis));
  }).catch((e) => falhaNaTela(corpo, e, () => VISTAS.inicio(v)));
};

// ---- visitas: a demonstração com o nome e as cores do cliente, pronta antes de entrar no negócio
function linkVisita(v) {
  const p = new URLSearchParams();
  p.set('nome', v.nome || v.negocio);
  if (v.cor) p.set('cor', v.cor);
  if (v.cor2) p.set('cor2', v.cor2);
  if (v.whats) p.set('whats', v.whats);
  if (v.end) p.set('end', v.end);
  if (v.frase) p.set('frase', v.frase);
  if (v.itens && v.itens.length) p.set('itens', v.itens.join(','));
  return 'https://star-net.pro/m/demo?' + p.toString();
}
function cardVisita(v) {
  const passou = v.quando && v.quando < hojeLocal();
  return h('article', { class: 'vis' + (passou ? ' passou' : '') },
    h('div', { class: 'vis-cor', style: `--c1:#${v.cor};--c2:#${v.cor2}`, 'aria-hidden': 'true' }),
    h('div', { class: 'vis-in' },
      h('div', { class: 'vis-hd' }, h('h3', { text: v.negocio || v.nome }), v.quando ? h('small', { class: 'vis-dia' + (passou ? ' passou' : ''), text: dataCurta(v.quando) }) : null),
      h('p', { class: 'meta', text: ['Cardápio 3D', v.cidade, v.itens && v.itens.length ? plural(v.itens.length, 'prato escolhido', 'pratos escolhidos') : 'todos os pratos'].filter(Boolean).join(' · ') }),
      v.notas ? h('p', { class: 'vis-notas', text: v.notas }) : null),
    h('div', { class: 'vis-acts' },
      h('button', { class: 'btn sm primary', type: 'button', onclick: () => qrVisita(v) }, ic('qr'), 'Mostrar'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => viewSite({ rotulo: 'Prévia · ' + (v.nome || v.negocio), url: linkVisita(v) }) }, ic('eye'), 'Prévia'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => visitaDrawer(v) }, ic('edit'), 'Editar')));
}
async function qrVisita(v) {
  const link = linkVisita(v);
  const img = h('img', { class: 'qr', alt: 'QR Code da demonstração de ' + (v.negocio || v.nome), width: 220, height: 220 });
  try { img.src = await window.QRLib.toDataURL(link, { margin: 1, width: 440, color: { dark: '#0b1f4b', light: '#ffffff' } }); } catch (e) { img.alt = 'Não consegui desenhar o QR Code: use o link.'; }
  const inp = h('input', { class: 'input', type: 'text', readonly: true, value: link, 'aria-label': 'Link da demonstração', onfocus: () => inp.select() });
  openDrawer('qv-title',
    h('header', {}, h('div', { class: 'tt' }, h('h2', { id: 'qv-title', text: v.negocio || v.nome }), h('small', { class: 'muted', text: 'Cardápio 3D com o nome e as cores do negócio' })),
      h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: closeDrawer }, ic('x'))),
    [
      h('p', { class: 'lead muted', text: 'Na visita: abra no seu celular ou peça para o dono apontar a câmera para o QR Code. Toque em 3D em qualquer prato.' }),
      h('div', { class: 'qrbox' }, img),
      h('label', { class: 'field' }, h('span', { text: 'Link da demonstração' }), inp),
      h('div', { class: 'qr-acts' },
        h('a', { class: 'btn primary', href: link, target: '_blank', rel: 'noopener' }, 'Abrir no celular', ic('ext')),
        h('button', { class: 'btn', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(link); toast('Link copiado.', 'ok'); } catch (e) { inp.focus(); inp.select(); toast('O link está selecionado: copie manualmente.', 'info'); } } }, ic('copy'), 'Copiar link')),
    ],
    h('footer', {}, h('button', { class: 'btn', type: 'button', onclick: () => visitaDrawer(v) }, ic('edit'), 'Editar'), h('span', { class: 'sp' }), h('button', { class: 'btn', type: 'button', onclick: closeDrawer }, 'Fechar')));
}
async function visitaDrawer(orig, pre) {
  const corOk = (c) => (/^#?[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).replace('#', '').toLowerCase() : '');
  const base = { id: '', produto: 'cardapio', negocio: '', nome: '', cidade: '', quando: '', cor: '2563eb', cor2: '0f172a', whats: '', end: '', frase: '', itens: [], notas: '' };
  if (pre) Object.assign(base, { negocio: String(pre.negocio || '').slice(0, 80), whats: String(pre.whats || '').replace(/\D/g, '').slice(0, 20), end: String(pre.end || '').slice(0, 120), cor: corOk(pre.cor) || base.cor, cor2: corOk(pre.cor2) || base.cor2 });
  const v = orig ? { ...orig, itens: [...(orig.itens || [])] } : base;
  const pratos = await pegaPratos();
  const negocio = h('input', { class: 'input', value: v.negocio, maxlength: 80, required: true, placeholder: 'Ex.: Pizzaria do Zé', autocomplete: 'off' });
  const nome = h('input', { class: 'input', value: v.nome, maxlength: 60, placeholder: 'Igual ao nome do negócio', autocomplete: 'off' });
  const cidade = h('input', { class: 'input', value: v.cidade, maxlength: 60, autocomplete: 'off' });
  const quandoIn = h('input', { class: 'input', type: 'date', value: v.quando });
  const cor = h('input', { class: 'input cor', type: 'color', value: '#' + v.cor, 'aria-label': 'Cor principal' });
  const cor2 = h('input', { class: 'input cor', type: 'color', value: '#' + v.cor2, 'aria-label': 'Cor escura' });
  const whats = h('input', { class: 'input', value: v.whats, inputmode: 'tel', maxlength: 20, placeholder: 'Opcional: com DDD', autocomplete: 'off' });
  const end = h('input', { class: 'input', value: v.end, maxlength: 120, placeholder: 'Opcional', autocomplete: 'off' });
  const frase = h('input', { class: 'input', value: v.frase, maxlength: 160, placeholder: 'Opcional: a frase de baixo do nome', autocomplete: 'off' });
  const notas = h('textarea', { class: 'input', rows: 3, maxlength: 1500, placeholder: 'Só você vê: com quem falar, o que ele precisa…' }); notas.value = v.notas || '';
  const marcados = new Set(v.itens);
  const grade = h('div', { class: 'pratos' }, pratos.map((p) => h('label', { class: 'prato' },
    h('input', { type: 'checkbox', checked: marcados.has(p.slug), onchange: (ev) => { if (ev.target.checked) marcados.add(p.slug); else marcados.delete(p.slug); } }),
    p.poster ? h('img', { src: p.poster, alt: '', loading: 'lazy', width: 96, height: 96 }) : null, h('span', { text: p.nome.replace(/ 4K$/, '') }))));
  const err = h('p', { class: 'err', role: 'alert' });
  const coleta = () => ({ ...v, negocio: negocio.value.trim(), nome: nome.value.trim(), cidade: cidade.value.trim(), quando: quandoIn.value, cor: cor.value.slice(1), cor2: cor2.value.slice(1),
    whats: whats.value.replace(/\D/g, ''), end: end.value.trim(), frase: frase.value.trim(), itens: pratos.filter((p) => marcados.has(p.slug)).map((p) => p.slug), notas: notas.value.trim() });
  async function salvar() {
    err.textContent = '';
    const nv = coleta();
    if (!nv.negocio) { err.textContent = 'Escreva o nome do negócio.'; negocio.focus(); return; }
    busy('Salvando…');
    try {
      const r = await call('salvarVisita', { visita: nv });
      if (r.erro) throw new Error(r.erro === 'cheio' ? 'Já tem 300 visitas guardadas: apague as antigas.' : 'O servidor não salvou (' + r.erro + ').');
      idle(); VIS = null; toast('Visita pronta.', 'ok');
      if (VISTAS[ROTA]) VISTAS[ROTA](SH.vista);
      qrVisita(r.visita);
    } catch (e) { fail(e); }
  }
  async function apagar() {
    if (!(await confirma('Apagar a visita?', '“' + (v.negocio || v.nome) + '” sai da lista de visitas.', 'Apagar', true))) return;
    busy('Apagando…');
    try { await call('apagarVisita', { id: v.id }); idle(); VIS = null; closeDrawer(); toast('Visita apagada.', 'ok'); if (VISTAS[ROTA]) VISTAS[ROTA](SH.vista); } catch (e) { fail(e); }
  }
  openDrawer('vd-title',
    h('header', {}, h('div', { class: 'tt' }, h('h2', { id: 'vd-title', text: orig ? 'Editar visita' : 'Nova visita' }), h('small', { class: 'muted', text: 'Cardápio 3D com a cara do restaurante' })),
      h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: closeDrawer }, ic('x'))),
    h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', { text: 'Negócio' }), negocio),
      h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { text: 'Cidade' }), cidade), h('label', { class: 'field' }, h('span', { text: 'Dia da visita' }), quandoIn)),
      h('div', { class: 'sec' }, h('h4', { text: 'Como aparece no cardápio' }),
        h('label', { class: 'field' }, h('span', { text: 'Nome no topo' }), nome),
        h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { text: 'Cor principal' }), cor), h('label', { class: 'field' }, h('span', { text: 'Cor escura (fundo)' }), cor2)),
        h('label', { class: 'field' }, h('span', { text: 'Frase' }), frase),
        h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { text: 'WhatsApp do negócio' }), whats), h('label', { class: 'field' }, h('span', { text: 'Endereço' }), end))),
      h('div', { class: 'sec' }, h('h4', { text: 'Pratos em 3D' }), h('p', { class: 'lead muted', text: 'Marque os que combinam com o restaurante. Sem nenhum marcado, aparecem todos.' }), grade),
      h('label', { class: 'field' }, h('span', { text: 'Anotações' }), notas),
      err),
    h('footer', {},
      h('button', { class: 'btn primary', type: 'button', onclick: salvar }, 'Salvar e mostrar'),
      h('button', { class: 'btn', type: 'button', onclick: () => viewSite({ rotulo: 'Prévia · ' + (nome.value.trim() || negocio.value.trim() || 'demonstração'), url: linkVisita(coleta()) }) }, ic('eye'), 'Prévia'),
      h('span', { class: 'sp' }), orig ? h('button', { class: 'btn danger', type: 'button', onclick: apagar }, ic('trash'), 'Apagar') : null));
}

let obsPrev = null;
function previaViva(url, titulo) {
  const box = h('div', { class: 'prev' }, h('div', { class: 'prev-tela' }),
    h('button', { type: 'button', class: 'prev-sel', 'aria-label': 'Abrir ' + titulo + ' ao vivo', onclick: () => viewSite({ rotulo: titulo, url }) }, h('span', {}, ic('eye'), 'Abrir ao vivo')));
  box.dataset.url = url; box.dataset.t = titulo;
  if (!obsPrev) {
    obsPrev = new IntersectionObserver((ents) => {
      for (const e of ents) {
        if (!e.isIntersecting) continue;
        const b = e.target; obsPrev.unobserve(b);
        const f = h('iframe', { src: b.dataset.url, title: 'Prévia de ' + b.dataset.t, tabindex: '-1', 'aria-hidden': 'true', referrerpolicy: 'no-referrer' });
        f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        f.addEventListener('load', () => b.classList.add('ok'));
        b.querySelector('.prev-tela').append(f);
      }
    }, { rootMargin: '300px' });
  }
  obsPrev.observe(box);
  return box;
}
function cardProjeto(p) {
  const l = linkPrevia(p);
  const pdfs = (p.pdfs || []).filter((d) => d.id);
  const cliente = p.cliente && !/^produto star-net/i.test(p.cliente) ? p.cliente : '';
  const acoes = [l ? h('button', { class: 'btn sm primary', type: 'button', onclick: () => viewSite({ rotulo: p.nome, url: l.url }) }, ic('eye'), 'Abrir') : null];
  if (p.id === 'cardapio-3d') acoes.push(h('button', { class: 'btn sm', type: 'button', onclick: () => visitaDrawer(null) }, icApp('calendar'), 'Preparar visita'));
  if (catDe(p) === 'clinicas') acoes.push(h('button', { class: 'btn sm', type: 'button', onclick: () => ir('radar/site-clinica', true) }, icApp('sparkles'), 'Site de clínica'));
  acoes.push(h('button', { class: 'btn sm ghost', type: 'button', onclick: () => detailDrawer(p) }, 'Links e notas'));
  acoes.push(h('button', { class: 'btn sm ghost icon-btn', type: 'button', title: 'Editar projeto', 'aria-label': 'Editar ' + p.nome, onclick: () => editDrawer(p) }, ic('edit')));
  return h('article', { class: 'pj2' },
    l ? previaViva(l.url, p.nome) : h('div', { class: 'prev sem' }, h('span', { text: 'Sem site para mostrar' })),
    h('div', { class: 'pj2-tx' },
      h('div', { class: 'pj2-hd' }, h('span', { class: 'selo ' + CAT_TOM[catDe(p)] }, ic(IC_PROJ[p.id] || CAT_IC[catDe(p)])), h('div', { class: 'ap-tt' }, h('h3', { text: p.nome }), cliente ? h('small', { text: cliente }) : null)),
      p.resumo ? h('p', { class: 'res', text: p.resumo }) : null,
      p.id === 'dads-burger' ? h('div', { class: 'pj-ed' }, h('small', { class: 'lab', text: 'Editar no admin do Dad’s (abre numa aba nova)' }),
        h('div', { class: 'chips2' }, DADS_SECOES.map(([k, t]) => h('a', { class: 'chip2', href: DADS_ADMIN + '?aba=' + k, target: '_blank', rel: 'noopener noreferrer' }, t)))) : null,
      pdfs.length ? h('div', { class: 'pj-docs' }, h('small', { class: 'lab', text: 'Documentos' }), h('div', { class: 'chips2' }, pdfs.map((d) => h('button', { class: 'chip2', type: 'button', onclick: () => viewPdf(d) }, ic('pdf'), d.nome)))) : null,
      h('div', { class: 'prod-acts' }, acoes.filter(Boolean))));
}
function blocoVisitasProj() {
  const grade = h('div', { class: 'visitas' }, carregando('Visitas'));
  const box = h('div', { class: 'cat-vis' },
    h('div', { class: 'card-hd' }, h('div', {}, h('h3', { text: 'Visitas' }), h('p', { class: 'muted small', text: 'O Cardápio 3D com o nome e as cores do restaurante, pronto antes de você entrar.' })),
      h('button', { class: 'btn sm primary', type: 'button', onclick: () => visitaDrawer(null) }, ic('plus'), 'Nova visita')),
    grade);
  pegaVisitas(true).then((vis) => {
    if (!grade.isConnected) return;
    const hj = hojeLocal();
    const ord = vis.slice().sort((a, b) => { const fa = !a.quando || a.quando >= hj, fb = !b.quando || b.quando >= hj; if (fa !== fb) return fa ? -1 : 1; return String(a.quando || '9').localeCompare(String(b.quando || '9')); });
    grade.replaceChildren(...(ord.length ? ord.map(cardVisita) : [h('div', { class: 'empty' }, h('p', { text: 'Nenhuma visita preparada ainda.' }),
      h('p', { class: 'muted', text: 'Na Lista de ligações, toque em “Preparar visita” num restaurante: o nome, as cores e o WhatsApp dele já vêm preenchidos.' }))]));
  }).catch((e) => falhaNaTela(grade, e, () => VISTAS.projetos(SH.vista)));
  return box;
}
VISTAS.projetos = (v) => {
  if (!data) {
    v.replaceChildren(h('div', { class: 'pg' }, cabeca('Projetos'),
      h('div', { class: 'empty' }, h('p', { text: 'A lista de projetos ainda está vazia.' }), h('button', { class: 'btn primary', type: 'button', onclick: emptyView }, 'Importar ou começar do zero'))));
    return;
  }
  const lista = data.projetos || [];
  const grupos = CATS.map(([k, t]) => [k, t, lista.filter((p) => catDe(p) === k)]).filter(([k, , ps]) => ps.length || k === 'restaurantes');
  const secs = grupos.map(([k, t, ps]) => h('section', { class: 'cat' },
    h('header', { class: 'cat-hd' }, h('span', { class: 'selo ' + CAT_TOM[k] }, ic(CAT_IC[k])),
      h('div', { class: 'cat-tt' }, h('h2', { text: t }), h('small', { class: 'muted', text: plural(ps.length, 'projeto', 'projetos') })),
      CAT_BUSCA[k] ? h('div', { class: 'pg-acts' }, h('button', { class: 'btn sm', type: 'button', onclick: () => ir('radar?q=' + encodeURIComponent(CAT_BUSCA[k]), true) }, icApp('radar'), 'Achar ' + t.toLowerCase() + ' no Maps')) : null),
    ps.length ? h('div', { class: 'pjs2' }, ps.map(cardProjeto)) : null,
    k === 'restaurantes' ? blocoVisitasProj() : null));
  v.replaceChildren(h('div', { class: 'pg' },
    cabeca('Projetos', 'O que você vende, com a prévia ao vivo de cada um',
      h('button', { class: 'btn ghost icon-btn', type: 'button', title: 'Recarregar', 'aria-label': 'Recarregar', onclick: async () => { busy('Recarregando…'); try { await loadData(); idle(); appView(); toast('Atualizado.', 'ok', 1500); } catch (e) { fail(e); } } }, ic('sync')),
      h('button', { class: 'btn', type: 'button', onclick: () => editDrawer(null) }, ic('plus'), 'Novo projeto')),
    ...secs));
};

// ---- sair e aparelhos conectados (no lugar do "Conectar aparelho": aparelho novo só digita o código de 6 números)
async function sairView() {
  const r = await dialogo({ titulo: 'Sair da Central?', texto: 'Você pode sair só deste aparelho ou de todos os aparelhos conectados.', foco: 'null',
    botoes: [{ id: null, rotulo: 'Cancelar', tipo: 'ghost' }, { id: 'este', rotulo: 'Sair deste' }, { id: 'todos', rotulo: 'Sair de todos', tipo: 'danger' }] });
  if (!r) return;
  const todos = r === 'todos';
  call('sair', { todos }).catch(() => { /* sai daqui de qualquer jeito */ });
  sessao = null; data = null; store.del(K_SESSAO);
  loginView(todos ? 'Saiu de todos os aparelhos.' : 'Saiu deste aparelho.', true);
}
const quandoMs = (ms) => {
  if (!ms) return '';
  const d = new Date(ms), hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? 'hoje ' + hora : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora;
};
const haQuanto = (ms) => {
  if (!ms) return 'sem registro';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 2) return 'agora';
  if (m < 60) return 'há ' + m + ' min';
  const hh = Math.round(m / 60);
  return hh < 36 ? 'há ' + hh + ' h' : 'há ' + Math.round(hh / 24) + ' dias';
};
VISTAS.acesso = (v) => {
  const corpo = h('div', { class: 'pg-body' }, carregando('Aparelhos'));
  const outros = h('button', { class: 'btn danger sm', type: 'button', disabled: true }, 'Sair de todos os outros');
  v.replaceChildren(h('div', { class: 'pg' },
    cabeca('Aparelhos conectados', 'Quem está dentro da sua Central agora. Aparelho novo? Abra star-net.pro/admin e digite o código de 6 números do Authenticator: não precisa de QR nem de link.', outros), corpo));
  const carregaLista = async () => {
    let r;
    try { r = await call('aparelhos'); } catch (e) { falhaNaTela(corpo, e, carregaLista); return; }
    if (ROTA !== 'acesso' || !corpo.isConnected) return;
    const lista = Array.isArray(r.lista) ? r.lista : [];
    outros.disabled = !lista.some((x) => !x.atual);
    corpo.replaceChildren(h('section', { class: 'card' },
      h('div', { class: 'card-hd' }, h('h2', { text: plural(lista.length, 'aparelho', 'aparelhos') })),
      ...lista.map((x) => h('div', { class: 'dev' + (x.atual ? ' atual' : '') },
        h('span', { class: 'ic2' }, ic(/iPhone|iPad|Android/i.test(x.nome) ? 'phone' : 'monitor')),
        h('div', { class: 'dev-tx' }, h('b', {}, x.nome, x.atual ? h('span', { class: 'tag', text: 'ESTE APARELHO' }) : null),
          h('small', { text: (x.criada ? 'entrou ' + quandoMs(x.criada) + ' · ' : '') + 'usado ' + haQuanto(x.ultimo) + ' · vale até ' + dataBR(new Date(x.ate).toISOString().slice(0, 10)).slice(0, 5) })),
        h('button', { class: 'btn sm ' + (x.atual ? 'ghost' : 'danger'), type: 'button', onclick: () => revoga(x) }, x.atual ? 'Sair' : 'Revogar')))));
  };
  async function revoga(x) {
    if (x.atual) { sairView(); return; }
    if (!(await confirma('Revogar este aparelho?', x.nome + ' perde o acesso agora. Para entrar de novo ele precisa de um código do Authenticator.', 'Revogar', true))) return;
    try {
      busy('Revogando…'); const r = await call('revogar', { id: x.id }); idle();
      if (r.erro) throw new Error('Não achei esse aparelho (talvez ele já tenha saído).');
      toast('Aparelho revogado.', 'ok'); carregaLista();
    } catch (e) { idle(); fail(e); }
  }
  outros.addEventListener('click', async () => {
    if (!(await confirma('Sair de todos os outros?', 'Só este aparelho continua dentro. Os outros precisam de um código do Authenticator para voltar.', 'Sair dos outros', true))) return;
    try { busy('Saindo dos outros…'); await call('revogar', { outros: true }); idle(); toast('Os outros aparelhos saíram.', 'ok'); carregaLista(); } catch (e) { idle(); fail(e); }
  });
  carregaLista();
};

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
    h('header', {}, h('div', { class: 'tt' }, h('h2', { id: 'dt-title', text: p.nome }), h('small', { class: 'muted', text: CAT_TXT[catDe(p)] })),
      h('button', { class: 'btn ghost icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: closeDrawer }, ic('x'))),
    [
      p.cliente || p.resumo ? h('div', { class: 'sec' }, p.cliente ? h('p', { class: 'lead', text: p.cliente }) : null, p.resumo ? h('p', { class: 'lead', text: p.resumo }) : null) : null,
      h('div', { class: 'sec' }, h('h4', { text: 'Sites e versões' }),
        groups.length ? groups.map(([t, ls]) => h('div', { class: 'grp' }, h('small', { text: t }),
          ls.map((l) => h('a', { class: 'row', href: l.url, target: '_blank', rel: 'noopener noreferrer', onclick: (ev) => { if (canFrame(l.url)) { ev.preventDefault(); viewSite(l); } } }, h('span', { class: 'tx' }, h('b', { text: l.rotulo || hostOf(l.url) }), h('small', { text: canFrame(l.url) ? hostOf(l.url) : hostOf(l.url) + ' · abre numa aba nova' })), ic(canFrame(l.url) ? 'eye' : 'ext')))))
          : h('p', { class: 'lead', text: 'Nenhum link ainda.' })),
      h('div', { class: 'sec' }, h('h4', { text: 'PDFs' }),
        pdfs.length ? pdfs.map((d) => h('div', { class: 'row' }, ic('pdf'), h('span', { class: 'tx' }, h('b', { text: d.nome }), h('small', { text: [dataBR(d.data), d.tamanho ? mb(d.tamanho) : ''].filter(Boolean).join(' · ') || (d.id ? 'guardado no servidor' : 'arquivo ainda não enviado') })),
          d.id ? h('span', { class: 'btns' }, h('button', { class: 'btn sm', type: 'button', onclick: () => viewPdf(d) }, 'Ver'), h('button', { class: 'btn sm icon-btn', type: 'button', 'aria-label': 'Baixar ' + d.nome, title: 'Baixar', onclick: () => abrirPdf(d, 'baixar') }, ic('down'))) : null))
          : h('p', { class: 'lead', text: 'Nenhum PDF ainda.' })),
      p.notas ? h('div', { class: 'sec' }, h('h4', { text: 'Notas' }), h('p', { class: 'notes', text: p.notas })) : null,
    ],
    h('footer', {}, h('button', { class: 'btn primary', type: 'button', onclick: () => editDrawer(p) }, ic('edit'), 'Editar'), h('span', { class: 'sp' }), h('button', { class: 'btn', type: 'button', onclick: closeDrawer }, 'Fechar')));
}

function editDrawer(orig) {
  const isNew = !orig;
  const p = orig ? JSON.parse(JSON.stringify(orig)) : { id: '', nome: '', cliente: '', categoria: 'restaurantes', resumo: '', links: [], pdfs: [], notas: '' };
  const nome = h('input', { class: 'input', value: p.nome, required: true, maxlength: 120 });
  const cliente = h('input', { class: 'input', value: p.cliente || '', maxlength: 160 });
  const categoria = h('select', { class: 'input' }, CATS.map(([k, t]) => h('option', { value: k, text: t })));
  categoria.value = catDe(p);
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
      const np = { ...p, id, nome: n, cliente: cliente.value.trim(), categoria: categoria.value, resumo: resumo.value.trim(), links, pdfs: keep, notas: notas.value.replace(/\s+$/, '') };
      const k = nd.projetos.findIndex((x) => x.id === p.id);
      if (isNew || k < 0) nd.projetos.push(np); else nd.projetos[k] = np;
      busy('Salvando…');
      await salvarDados(nd, remove.map((d) => d.id).filter(Boolean));
      idle(); toast('Salvo.', 'ok');
      appView(); detailDrawer(np);
    } catch (e) { fail(e); }
  }
  async function del() {
    const n = (p.pdfs || []).length;
    if (!(await confirma('Apagar “' + p.nome + '”?', (n ? (n === 1 ? 'O PDF dele também sai. ' : 'Os ' + n + ' PDFs dele também saem. ') : '') + 'Os PDFs ficam 30 dias na lixeira do servidor antes de sumir de vez.', 'Apagar', true))) return;
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
      h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { text: 'Cliente' }), cliente), h('label', { class: 'field' }, h('span', { text: 'Categoria' }), categoria)),
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
  if (location.hash && location.hash !== '#' && !location.hash.startsWith('#/')) {
    const raw = location.hash;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ok */ }
    let u = '';
    if (raw.startsWith('#s=')) {
      try { u = decodeURIComponent(raw.slice(3)).trim(); } catch (e) { u = ''; }
    }
    if (!urlServidorValida(u)) { setupView('Esse link não é de um servidor do painel.'); return; }
    const prev = store.get(K_SERVIDOR);
    if (!prev || prev === u || (await confirma('Trocar o servidor deste aparelho?', 'Este link troca o servidor do painel deste aparelho por outro. Só continue se foi você que gerou o link no painel.', 'Trocar'))) {
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
// Ponte para as telas dos apps que moram na Central (apps/amazon.js, apps/radar.js): o login, os avisos e a navegação são estes.
window.__snPonte = {
  call,
  sessao: () => sessao,
  servidor,
  erroSessao: () => new SessaoError('A entrada deste aparelho venceu. Digite o código do Authenticator de novo.'),
  sessaoVencida: (e) => { if (e instanceof SessaoError) fail(e); },
  toast: (msg, tipo) => toast(msg, tipo === 'ok' ? 'ok' : tipo === 'err' ? 'err' : 'info', tipo === 'err' ? 6000 : 3200),
  ir: (r) => ir(r, true),
  novaVisita: (pre) => visitaDrawer(null, pre),
  mudou: (app, what) => { CEN.em = 0; if (app === 'amazon' && what !== 'chat' && MOD_P.amazon) MOD_P.amazon.then((m) => { ALERTAS_EM = 0; atualizaAlertas(m, true); }).catch(() => {}); },
};
start().catch((e) => setupView(e.message));
