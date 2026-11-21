// Star-net.pro · painel admin.
// Página estática: os dados (projetos.json e os PDFs) ficam num repositório PRIVADO do GitHub e são lidos e gravados
// pela API do GitHub com a chave (token) que você cola no login. Nenhum dado nem chave fica no código desta página.
const DEFAULT_REPO = 'theboyxd/star-net-admin';
const DATA_FILE = 'projetos.json';
const KEY = 'sn-admin';
const LOCAL = ['127.0.0.1', 'localhost'].includes(location.hostname);
const API = (LOCAL && new URLSearchParams(location.search).get('api')) || 'https://api.github.com'; // só em teste local
const MAX_PDF = 45 * 1024 * 1024;

const STATUS = [['andamento', 'Em andamento'], ['proposta', 'Proposta'], ['no-ar', 'No ar'], ['demonstracao', 'Demonstração'],
  ['pronto', 'Pronto'], ['pausado', 'Pausado'], ['concluido', 'Concluído'], ['sem', 'Sem status']];
const STATUS_TXT = Object.fromEntries(STATUS);
const TIPOS = [['site', 'Site no ar'], ['demo', 'Demonstração'], ['versao', 'Versão'], ['repo', 'Código'], ['outro', 'Outro']];
const TIPO_TXT = Object.fromEntries(TIPOS);

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
let auth = null;        // { token, repo, remember }
let branch = 'main';
let data = null;        // conteúdo de projetos.json
let dataSha = null;     // versão de projetos.json que está na tela
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
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
function b64utf8(str) { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); }
function utf8b64(b64) { const s = atob(String(b64).replace(/\s/g, '')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); }
function fileB64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('Não consegui ler o arquivo.')); r.readAsDataURL(file); }); }

function toast(msg, kind = 'info', ms = kind === 'ok' ? 2600 : 3500) {
  const t = h('div', { class: 't ' + kind, text: msg });
  $toast.replaceChildren(t);
  if (ms) setTimeout(() => { if (t.isConnected) t.remove(); }, ms);
}
let busyEl = null;
function busy(msg) { if (!busyEl) { busyEl = h('div', { class: 'busy' }, h('div', {}, h('span', { class: 'spin' }), h('span', { class: 'bm' }))); document.body.append(busyEl); } busyEl.querySelector('.bm').textContent = msg; }
function idle() { if (busyEl) { busyEl.remove(); busyEl = null; } }

// ---------------------------------------------------------------- chave guardada neste aparelho
function readAuth() { for (const s of ['localStorage', 'sessionStorage']) { try { const v = JSON.parse(window[s].getItem(KEY) || 'null'); if (v && v.token && v.repo) return v; } catch (e) { /* armazenamento bloqueado */ } } return null; }
function forgetAuth() { for (const s of ['localStorage', 'sessionStorage']) { try { window[s].removeItem(KEY); } catch (e) { /* ok */ } } }
function writeAuth(a) { forgetAuth(); try { (a.remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(a)); } catch (e) { /* sem armazenamento: vale só nesta aba */ } }

// ---------------------------------------------------------------- API do GitHub
async function gh(path, opt = {}) {
  const { method = 'GET', body, accept = 'application/vnd.github+json', as = 'json' } = opt;
  let res;
  try {
    res = await fetch(API + path, { method, cache: 'no-store', headers: { Accept: accept, Authorization: 'Bearer ' + auth.token, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { const err = new Error('Sem conexão com o GitHub. Confira a internet e tente de novo.'); err.status = 0; throw err; }
  if (!res.ok) {
    let m = ''; try { m = (await res.json()).message || ''; } catch (e) { /* sem corpo */ }
    const err = new Error(m || 'Erro ' + res.status); err.status = res.status; throw err;
  }
  if (as === 'blob') return res.blob();
  if (res.status === 204) return null;
  return res.json();
}
const R = () => '/repos/' + auth.repo.split('/').map(encodeURIComponent).join('/');

async function loadData() {
  let f = null;
  try { f = await gh(`${R()}/contents/${DATA_FILE}?ref=${encodeURIComponent(branch)}`); }
  catch (e) { if (e.status !== 404) throw e; }
  if (!f) { data = { versao: 1, projetos: [] }; dataSha = null; return; }
  const txt = f.content ? utf8b64(f.content) : await (await gh(`${R()}/contents/${DATA_FILE}?ref=${encodeURIComponent(branch)}`, { accept: 'application/vnd.github.raw', as: 'blob' })).text();
  data = JSON.parse(txt); dataSha = f.sha;
  if (!Array.isArray(data.projetos)) data.projetos = [];
}
async function connect() {
  const repo = await gh(R());
  branch = repo.default_branch || 'main';
  await loadData();
}

// Grava projetos.json (e PDFs novos ou apagados) num commit só, pela API de baixo nível do Git.
async function commit(message, newData, { add = [], remove = [] } = {}) {
  busy('Conferindo os dados…');
  const cur = await gh(`${R()}/contents/${DATA_FILE}?ref=${encodeURIComponent(branch)}`).catch((e) => { if (e.status === 404) return null; throw e; });
  if ((cur ? cur.sha : null) !== dataSha) { const err = new Error('Os dados mudaram em outro aparelho. Recarreguei a lista: confira e faça a mudança de novo.'); err.conflict = true; throw err; }
  const ref = await gh(`${R()}/git/ref/heads/${encodeURIComponent(branch)}`);
  const base = await gh(`${R()}/git/commits/${ref.object.sha}`);
  const tree = [];
  for (const f of add) {
    busy(`Enviando ${f.label}…`);
    const b = await gh(`${R()}/git/blobs`, { method: 'POST', body: { content: f.base64, encoding: 'base64' } });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha });
  }
  busy('Salvando…');
  newData.atualizado = hoje();
  const jb = await gh(`${R()}/git/blobs`, { method: 'POST', body: { content: b64utf8(JSON.stringify(newData, null, 2) + '\n'), encoding: 'base64' } });
  tree.push({ path: DATA_FILE, mode: '100644', type: 'blob', sha: jb.sha });
  for (const p of remove) tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
  const t = await gh(`${R()}/git/trees`, { method: 'POST', body: { base_tree: base.tree.sha, tree } });
  const c = await gh(`${R()}/git/commits`, { method: 'POST', body: { message, tree: t.sha, parents: [ref.object.sha] } });
  await gh(`${R()}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: { sha: c.sha } });
  data = newData; dataSha = jb.sha; // o "sha" de um arquivo na API de conteúdo é o do blob dele
}

async function fail(e, ctx = '') {
  idle();
  if (e && e.status === 401) { forgetAuth(); auth = null; data = null; closeDrawer(); loginView('A chave não vale mais (expirou ou foi apagada). Entre de novo com uma chave nova.'); return; }
  if (e && e.conflict) { try { await loadData(); } catch (x) { /* fica com o que tinha */ } closeDrawer(); appView(); toast(e.message, 'err', 7000); return; }
  let msg = (e && e.message) || 'Algo deu errado.';
  if (e && e.status === 403) msg = 'A chave não tem permissão para isso. Na chave, deixe “Contents” em “Read and write”.';
  if (e && e.status === 404 && ctx === 'pdf') msg = 'Não achei esse PDF no repositório.';
  if (e && e.status === 422) msg = 'O GitHub recusou a gravação (' + (e.message || 'dados inválidos') + ').';
  toast(msg, 'err', 7000);
}

// ---------------------------------------------------------------- PDFs
async function openPdf(p, mode) {
  const w = mode === 'abrir' ? window.open('', '_blank') : null; // abre a aba já no toque, senão o navegador bloqueia
  if (w) { try { w.document.title = p.nome; w.document.body.textContent = 'Abrindo o PDF…'; } catch (e) { /* ok */ } }
  toast('Baixando “' + p.nome + '”…', 'info', 0);
  try {
    const blob = await gh(`${R()}/contents/${encPath(p.arquivo)}?ref=${encodeURIComponent(branch)}`, { accept: 'application/vnd.github.raw', as: 'blob' });
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    if (mode === 'baixar') { const a = h('a', { href: url, download: p.arquivo.split('/').pop() }); document.body.append(a); a.click(); a.remove(); }
    else if (w && !w.closed) w.location.href = url;
    else location.href = url;
    toast('Pronto.', 'ok', 2000);
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  } catch (e) { if (w) w.close(); fail(e, 'pdf'); }
}

// ---------------------------------------------------------------- telas
function brand(sub) {
  return h('div', { class: 'brand' }, h('img', { src: 'simbolo.png', alt: '', width: 34, height: 43 }),
    h('div', {}, h('b', {}, 'Star-net', h('em', { text: '.pro' })), sub ? h('small', { text: sub }) : null));
}

function loginView(msg = '') {
  closeDrawer();
  const token = h('input', { class: 'input', type: 'password', id: 'tk', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…', required: true });
  const repo = h('input', { class: 'input', type: 'text', id: 'rp', value: (readAuth() || {}).repo || DEFAULT_REPO, autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', required: true });
  const remember = h('input', { type: 'checkbox', id: 'rm', checked: true });
  const err = h('p', { class: 'err', role: 'alert', text: msg });
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Entrar' });
  const form = h('form', { class: 'login', onsubmit: async (ev) => {
    ev.preventDefault();
    const tk = token.value.trim(); const rp = repo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(rp)) { err.textContent = 'Escreva o repositório no formato dono/nome, por exemplo theboyxd/star-net-admin.'; return; }
    auth = { token: tk, repo: rp, remember: remember.checked };
    btn.disabled = true; btn.textContent = 'Entrando…'; err.textContent = '';
    try { await connect(); writeAuth(auth); appView(); toast('Conectado ao repositório privado.', 'ok'); }
    catch (e) {
      auth = null; btn.disabled = false; btn.textContent = 'Entrar';
      err.textContent = e.status === 401 ? 'O GitHub não aceitou a chave. Confira se copiou inteira e se ela não expirou.'
        : e.status === 404 ? 'Não achei o repositório, ou a chave não tem acesso a ele. Na chave, escolha “Only select repositories” e marque este repositório.'
          : e.status === 403 ? 'A chave não tem permissão de leitura. Na chave, deixe “Contents” em “Read and write”.'
            : e.message;
    }
  } },
  brand(),
  h('h1', { text: 'Painel de projetos' }),
  h('p', { class: 'muted', text: 'Os projetos e os PDFs ficam no seu repositório privado do GitHub. Entre com a chave (token) desse repositório.' }),
  h('label', { class: 'field' }, h('span', { text: 'Chave do GitHub' }), token),
  h('label', { class: 'field' }, h('span', {}, 'Repositório ', h('small', { text: '(dono/nome)' })), repo),
  h('label', { class: 'check' }, remember, 'Lembrar neste aparelho'),
  err, btn,
  h('details', { class: 'help' }, h('summary', { text: 'Como criar a chave (uma vez, 2 minutos)' }),
    h('ol', {},
      h('li', {}, 'No GitHub, abra ', h('b', { text: 'Settings → Developer settings → Personal access tokens → Fine-grained tokens' }), ' e toque em ', h('b', { text: 'Generate new token' }), '.'),
      h('li', {}, 'Dê um nome (ex.: painel star-net) e escolha a validade.'),
      h('li', {}, 'Em ', h('b', { text: 'Repository access' }), ', escolha ', h('b', { text: 'Only select repositories' }), ' e marque ', h('b', { text: DEFAULT_REPO.split('/')[1] }), '.'),
      h('li', {}, 'Em ', h('b', { text: 'Permissions → Repository permissions' }), ', deixe ', h('b', { text: 'Contents' }), ' em ', h('b', { text: 'Read and write' }), '.'),
      h('li', {}, 'Gere a chave, copie e cole aqui. Ela só dá acesso a esse repositório.'))));
  $app.replaceChildren(h('main', { class: 'center' }, form));
  token.focus();
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
    const v2 = lista.filter((p) => (!filtro.status || (p.status || 'sem') === filtro.status) && (!q2 || norm([p.nome, p.cliente, p.resumo, p.notas, ...(p.links || []).map((l) => l.rotulo + ' ' + l.url), ...(p.pdfs || []).map((d) => d.nome)].join(' ')).includes(q2)));
    grid.replaceChildren(...(v2.length ? v2.map(card) : [h('div', { class: 'empty', text: lista.length ? 'Nenhum projeto com esse filtro.' : 'Nenhum projeto ainda. Toque em “Novo projeto”.' })]));
  }

  $app.replaceChildren(
    h('header', { class: 'top' }, brand('Painel de projetos'),
      h('button', { class: 'btn ghost icon-btn', type: 'button', title: 'Recarregar', 'aria-label': 'Recarregar', onclick: async () => { busy('Recarregando…'); try { await loadData(); idle(); appView(); toast('Atualizado.', 'ok', 1500); } catch (e) { fail(e); } } }, ic('sync')),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { if (confirm('Sair e esquecer a chave neste aparelho?')) { forgetAuth(); auth = null; data = null; loginView(); } } }, ic('out'), 'Sair')),
    h('main', { class: 'wrap' },
      h('div', { class: 'tools' }, search, h('button', { class: 'btn primary', type: 'button', onclick: () => editDrawer(null) }, ic('plus'), 'Novo projeto')),
      chips, grid,
      h('p', { class: 'foot' }, 'Dados no repositório privado ', h('a', { href: 'https://github.com/' + auth.repo, target: '_blank', rel: 'noopener noreferrer', text: auth.repo }), data.atualizado ? ' · atualizado em ' + dataBR(data.atualizado) : '', '.')));
  renderGrid();
}

function card(p) {
  const links = (p.links || []).slice().sort((a, b) => ['site', 'demo', 'versao', 'outro', 'repo'].indexOf(a.tipo) - ['site', 'demo', 'versao', 'outro', 'repo'].indexOf(b.tipo)).filter((l) => l.tipo !== 'repo').slice(0, 2);
  const nP = (p.pdfs || []).length; const nL = (p.links || []).length;
  return h('article', { class: 'proj', tabindex: '0', role: 'button', 'aria-label': 'Abrir ' + p.nome, onclick: () => detailDrawer(p), onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); detailDrawer(p); } } },
    h('div', { class: 'hd' }, h('h3', { text: p.nome }), statusPill(p.status)),
    p.cliente ? h('p', { class: 'cli', text: p.cliente }) : null,
    p.resumo ? h('p', { class: 'res', text: p.resumo }) : null,
    links.length ? h('div', { class: 'acts' }, links.map((l) => h('a', { class: 'btn sm', href: l.url, target: '_blank', rel: 'noopener noreferrer', onclick: (ev) => ev.stopPropagation() }, l.rotulo || hostOf(l.url), ic('ext')))) : null,
    h('p', { class: 'meta', text: [nL ? nL + (nL === 1 ? ' link' : ' links') : '', nP ? nP + ' PDF' + (nP === 1 ? '' : 's') : ''].filter(Boolean).join(' · ') || 'Sem links nem PDFs' }));
}

// ---------------------------------------------------------------- gaveta (detalhe e edição)
let drawerEl = null; let lastFocus = null;
function closeDrawer() { document.body.classList.remove('has-drawer'); if (drawerEl) { drawerEl.remove(); drawerEl = null; document.removeEventListener('keydown', escClose); if (lastFocus && lastFocus.isConnected) lastFocus.focus(); } }
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
          ls.map((l) => h('a', { class: 'row', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, h('span', { class: 'tx' }, h('b', { text: l.rotulo || hostOf(l.url) }), h('small', { text: hostOf(l.url) })), ic('ext')))))
          : h('p', { class: 'lead', text: 'Nenhum link ainda.' })),
      h('div', { class: 'sec' }, h('h4', { text: 'PDFs' }),
        pdfs.length ? pdfs.map((d) => h('div', { class: 'row' }, ic('pdf'), h('span', { class: 'tx' }, h('b', { text: d.nome }), h('small', { text: [dataBR(d.data), d.tamanho ? mb(d.tamanho) : ''].filter(Boolean).join(' · ') || d.arquivo })),
          h('span', { class: 'btns' }, h('button', { class: 'btn sm', type: 'button', onclick: () => openPdf(d, 'abrir') }, 'Abrir'), h('button', { class: 'btn sm icon-btn', type: 'button', 'aria-label': 'Baixar ' + d.nome, title: 'Baixar', onclick: () => openPdf(d, 'baixar') }, ic('down')))))
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
    row._get = () => (gone ? { remove: d.arquivo } : { keep: { ...d, nome: nm.value.trim() || d.nome } });
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
    for (const row of pdfBox.children) { const g = row._get(); if (g.keep) keep.push(g.keep); else if (g.remove) remove.push(g.remove); else if (g.add) adds.push(g.add); }
    const used = new Set(nd.projetos.flatMap((x) => (x.pdfs || []).map((d) => d.arquivo)));
    const add = [];
    try {
      for (const a of adds) {
        busy('Lendo “' + a.nome + '”…');
        let path = `pdfs/${id}/${slug(a.nome)}-${hoje()}.pdf`; let i = 2;
        while (used.has(path)) path = `pdfs/${id}/${slug(a.nome)}-${hoje()}-${i++}.pdf`;
        used.add(path);
        add.push({ path, base64: await fileB64(a.file), label: '“' + a.nome + '” (' + mb(a.file.size) + ')' });
        keep.push({ nome: a.nome, arquivo: path, data: hoje(), tamanho: a.file.size });
      }
      const np = { ...p, id, nome: n, cliente: cliente.value.trim(), status: status.value, resumo: resumo.value.trim(), links, pdfs: keep, notas: notas.value.replace(/\s+$/, '') };
      const i = nd.projetos.findIndex((x) => x.id === p.id);
      if (isNew || i < 0) nd.projetos.push(np); else nd.projetos[i] = np;
      await commit((isNew ? 'Painel: novo projeto ' : 'Painel: atualiza ') + n, nd, { add, remove });
      idle(); toast('Salvo no repositório privado.', 'ok');
      appView(); detailDrawer(np);
    } catch (e) { fail(e); }
  }
  async function del() {
    const n = (p.pdfs || []).length;
    if (!confirm('Apagar “' + p.nome + '”' + (n ? ' e ' + (n === 1 ? 'o PDF dele' : 'os ' + n + ' PDFs dele') : '') + '? Dá para recuperar pelo histórico do repositório no GitHub.')) return;
    const nd = JSON.parse(JSON.stringify(data)); nd.projetos = nd.projetos.filter((x) => x.id !== p.id);
    try { await commit('Painel: apaga ' + p.nome, nd, { remove: (orig.pdfs || []).map((d) => d.arquivo) }); idle(); closeDrawer(); appView(); toast('Projeto apagado.', 'ok'); }
    catch (e) { fail(e); }
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
(async function start() {
  const saved = readAuth();
  if (!saved) { loginView(); return; }
  auth = saved;
  $app.replaceChildren(h('main', { class: 'center' }, h('p', { class: 'muted', text: 'Abrindo os projetos…' })));
  try { await connect(); appView(); }
  catch (e) {
    if (e.status === 401 || e.status === 404) { forgetAuth(); auth = null; loginView(e.status === 401 ? 'A chave guardada não vale mais. Entre com uma chave nova.' : 'Não consegui abrir o repositório com a chave guardada. Entre de novo.'); }
    else { $app.replaceChildren(h('main', { class: 'center' }, h('div', { class: 'login' }, brand(), h('p', { class: 'err', text: e.message }), h('button', { class: 'btn primary', type: 'button', onclick: () => location.reload() }, 'Tentar de novo')))); }
  }
})();
