// Star-net.pro · painel admin.
// Página estática. O login é o código de 6 dígitos do Google Authenticator, conferido pelo "servidor do painel":
// um Google Apps Script na sua conta Google, que também guarda os projetos e os PDFs numa pasta do seu Google Drive.
// Esta página não guarda dados nem segredos; ela só conversa com o servidor do painel.
const SERVIDOR = ''; // URL do app da Web do Apps Script (termina em /exec). Não é segredo: sem o código do celular ninguém entra.
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

// ---------------------------------------------------------------- telas
function brand(sub) {
  return h('div', { class: 'brand' }, h('img', { src: 'simbolo.png', alt: '', width: 34, height: 43 }),
    h('div', {}, h('b', {}, 'Star-net', h('em', { text: '.pro' })), sub ? h('small', { text: sub }) : null));
}
function codeInput() {
  return h('input', { class: 'input code', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}', maxlength: 6, placeholder: '000000', 'aria-label': 'Código de 6 dígitos', oninput: (ev) => { ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 6); } });
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
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(v) && !(LOCAL && /^http:\/\/127\.0\.0\.1:\d+\//.test(v))) { err.textContent = 'Cole o URL do app da Web inteiro: começa com https://script.google.com/macros/s/ e termina em /exec.'; return; }
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

// O servidor ainda não tem o Google Authenticator: mostra o QR Code e confere o primeiro código.
async function authenticatorView() {
  closeDrawer();
  busy('Gerando o QR Code…');
  let r;
  try { r = await call('configurar'); } catch (e) { idle(); setupView(e.message); return; }
  idle();
  if (r.erro === 'ja_configurado') { loginView(); return; }
  if (!r.otpauth) { setupView('O servidor não gerou o QR Code (' + (r.erro || 'sem resposta') + ').'); return; }
  const img = h('img', { class: 'qr', alt: 'QR Code para o Google Authenticator', width: 220, height: 220 });
  try { img.src = await window.QRLib.toDataURL(r.otpauth, { margin: 1, width: 440, color: { dark: '#0b1f4b', light: '#ffffff' } }); } catch (e) { img.alt = 'Não consegui desenhar o QR Code: use a chave abaixo.'; }
  const code = codeInput(); const lembrar = h('input', { type: 'checkbox', checked: true });
  const err = h('p', { class: 'err', role: 'alert' });
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Confirmar' });
  const form = h('form', { class: 'login', onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = '';
    if (!/^\d{6}$/.test(code.value)) { err.textContent = 'Digite os 6 números que aparecem no Authenticator.'; return; }
    btn.disabled = true; btn.textContent = 'Conferindo…';
    try { const x = await call('confirmar', { codigo: code.value, lembrar: lembrar.checked }); if (x.sessao) { guardaSessao(x, lembrar.checked); toast('Google Authenticator ligado.', 'ok'); await openPanel(); return; } err.textContent = msgCodigo(x); }
    catch (e) { err.textContent = e.message; }
    btn.disabled = false; btn.textContent = 'Confirmar'; code.value = ''; code.focus();
  } },
  brand(), h('h1', { text: 'Ligar o Google Authenticator' }),
  h('ol', { class: 'steps' },
    h('li', {}, 'No celular, abra o ', h('b', { text: 'Google Authenticator' }), ' (ou o Authy), toque em ', h('b', { text: '+' }), ' e em ', h('b', { text: 'Ler código QR' }), '.'),
    h('li', {}, 'Aponte para o QR Code abaixo. Se não der, escolha ', h('b', { text: 'Inserir chave' }), ' e digite a chave.'),
    h('li', {}, 'Digite o código de 6 números que apareceu.')),
  h('div', { class: 'qrbox' }, img, h('code', { class: 'secret', text: r.segredo.replace(/(.{4})/g, '$1 ').trim() })),
  h('label', { class: 'field' }, h('span', { text: 'Código do Authenticator' }), code),
  h('label', { class: 'check' }, lembrar, 'Lembrar este aparelho por 30 dias'), err, btn);
  $app.replaceChildren(h('main', { class: 'center' }, form));
  code.focus();
}

function loginView(msg = '', info = false) {
  closeDrawer();
  const code = codeInput(); const lembrar = h('input', { type: 'checkbox', checked: true });
  const err = h('p', { class: info ? 'err info' : 'err', role: 'alert', text: msg });
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Entrar' });
  const form = h('form', { class: 'login', onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = '';
    if (!/^\d{6}$/.test(code.value)) { err.textContent = 'Digite os 6 números que aparecem no Authenticator.'; return; }
    btn.disabled = true; btn.textContent = 'Entrando…';
    err.className = 'err';
    try {
      const r = await call('entrar', { codigo: code.value, lembrar: lembrar.checked });
      if (r.sessao) { guardaSessao(r, lembrar.checked); await openPanel(); return; }
      if (r.erro === 'nao_configurado') { authenticatorView(); return; }
      err.textContent = msgCodigo(r);
    } catch (e) { err.textContent = e.message; }
    btn.disabled = false; btn.textContent = 'Entrar'; code.value = ''; code.focus();
  } },
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
      h('button', { class: 'btn ghost sm', type: 'button', onclick: sairView }, ic('out'), 'Sair')),
    h('main', { class: 'wrap' },
      h('div', { class: 'tools' }, search, h('button', { class: 'btn primary', type: 'button', onclick: () => editDrawer(null) }, ic('plus'), 'Novo projeto')),
      chips, grid,
      h('p', { class: 'foot' }, 'Dados no seu Google Drive, pasta ', pastaUrl ? h('a', { href: pastaUrl, target: '_blank', rel: 'noopener noreferrer', text: 'Star-net · Painel' }) : 'Star-net · Painel', data.atualizado ? ' · atualizado em ' + dataBR(data.atualizado) : '', '.')));
  renderGrid();
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
        pdfs.length ? pdfs.map((d) => h('div', { class: 'row' }, ic('pdf'), h('span', { class: 'tx' }, h('b', { text: d.nome }), h('small', { text: [dataBR(d.data), d.tamanho ? mb(d.tamanho) : ''].filter(Boolean).join(' · ') || (d.id ? 'no seu Drive' : 'arquivo ainda não enviado') })),
          d.id ? h('span', { class: 'btns' }, h('button', { class: 'btn sm', type: 'button', onclick: () => abrirPdf(d, 'abrir') }, 'Abrir'), h('button', { class: 'btn sm icon-btn', type: 'button', 'aria-label': 'Baixar ' + d.nome, title: 'Baixar', onclick: () => abrirPdf(d, 'baixar') }, ic('down'))) : null))
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
  if (!servidor()) { setupView(); return; }
  sessao = lerSessao();
  if (sessao) { await openPanel(); return; }
  const r = await call('estado');
  if (!r || typeof r.configurado !== 'boolean') throw new Error('Esse endereço não parece ser o servidor do painel.');
  if (!r.configurado) { await authenticatorView(); return; }
  loginView(r.travado ? 'Muitos códigos errados. O painel destrava às ' + horaBR(r.travado) + '.' : '');
}
start().catch((e) => setupView(e.message));
