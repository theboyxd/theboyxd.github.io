/* Painel do Dad's Burger, versão "só para ver" (GitHub Pages, sem servidor).
   O painel de verdade fala com um servidor por /api/*. Aqui essas chamadas são respondidas no próprio navegador, com pedidos
   de exemplo gravados de um sistema de demonstração (Pix e Lalamove simulados). Aceitar pedido, chamar motoboy, andamento ao vivo
   e cancelar funcionam na memória da página; nada é enviado nem gravado, e recarregar recomeça. Tudo o que grava dados de verdade
   (configurações, chaves, cardápio, Authenticator) recusa com um aviso. Os cálculos de Início e Financeiro são os do servidor. */
(function () {
  'use strict';
  const HERE = document.currentScript && document.currentScript.src ? new URL('.', document.currentScript.src).href : location.href;
  const realFetch = window.fetch.bind(window);
  const now = () => Date.now() / 1000;
  const T0 = now();
  const BRT = 3 * 3600; // Brasília = UTC-3, sem horário de verão
  const ACTIVE = new Set(['procurando', 'a_caminho', 'coletado']);
  const RAW = { procurando: 'ASSIGNING_DRIVER', a_caminho: 'ON_GOING', coletado: 'PICKED_UP', entregue: 'COMPLETED', cancelado: 'CANCELED' };
  const ENV_TEXT = 'ambiente de testes da Lalamove';
  const STATUS_TEXT = {
    procurando: ['info', 'procurando motoboy', 'A Lalamove está chamando os motoboys da região.'],
    a_caminho: ['ok', 'motoboy a caminho da loja', ''],
    coletado: ['ok', 'motoboy pegou o pedido', 'Está indo até o cliente. Toque em "Enviar para rota" se ainda não tocou.'],
    entregue: ['ok', 'motoboy entregou', 'Corrida concluída. Toque em "Concluir pedido" se ainda não tocou.'],
    cancelado: ['warn', 'chamada do motoboy cancelada', 'Você pode chamar de novo ou usar outra opção.']
  };
  const BLOCKER_TEXT = { aceite_antes: 'Aceite o pedido antes de chamar o motoboy.' };
  const STATUS_EV = {
    novo: ['info', 'voltou para Novos', ''],
    preparando: ['info', 'foi aceito', 'A cozinha começou o preparo.'],
    entrega: ['info', 'saiu para entrega', 'O cliente vê o andamento na página de acompanhamento.'],
    concluido: ['ok', 'foi entregue', 'Pedido concluído.'],
    cancelado: ['warn', 'foi cancelado', 'O restaurante cancelou o pedido.']
  };
  const MANUAL_VIA = { '99': 'pela 99', uber: 'pelo Uber', whatsapp: 'pelo WhatsApp' };
  const DRIVER = { name: 'Marcos (simulação)', phone: '+5551900000000', plate: 'SIM1A23' };
  // quando cada pedido de exemplo chegou (minutos atrás) e quanto levou cada passo
  const STORY = {
    Mariana: { age: 2 }, Rafael: { age: 6 },
    Carlos: { age: 19, accept: 3 },
    Fernanda: { age: 34, accept: 3, call: 6 },
    Bruno: { age: 41, accept: 3, call: 8 },
    Juliana: { age: 58, accept: 3, call: 6, out: 29 },
    Pedro: { age: 84, accept: 3, call: 6, out: 31, done: 53 },
    Camila: { age: 102, accept: 3, call: 9, out: 33, done: 61 },
    Henrique: { age: 125, accept: 4, cancel: 9 }
  };

  const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  const refuse = () => json({ success: false, error: 'sem_servidor' }, 503);
  const r2 = (n) => Math.round(n * 100) / 100;
  const moneyBR = (n) => `R$ ${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',')}`;
  const kmText = (m) => `${(Math.round((Number(m) || 0) / 100) / 10).toFixed(1).replace('.', ',')} km`;
  const dayOf = (sec) => new Date((sec - BRT) * 1000).toISOString().slice(0, 10);
  const hourOf = (sec) => new Date((sec - BRT) * 1000).getUTCHours();
  const dayStart = (sec) => Math.floor((sec - BRT) / 86400) * 86400 + BRT;
  const isReal = (o) => Boolean(o && o.paymentConfirmed === true);
  const shortName = (c) => { const w = String((c && c.name) || 'Cliente').trim().split(/\s+/); return w.length > 1 ? `${w[0]} ${w[w.length - 1][0]}.` : w[0]; };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const rnd32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const S = { snap: null, orders: [], past: [], events: [], seq: 0, quotes: new Map(), finUntil: 0 };

  // ---------------------------------------------------------------- estado inicial
  function addEvent(kind, level, title, detail, orderId, at) {
    const e = { id: ++S.seq, at: at || now(), kind, level, title: String(title).slice(0, 140), detail: String(detail || '').slice(0, 280) };
    if (orderId) e.orderId = orderId;
    S.events.push(e);
    return e;
  }

  function retime(o) {
    const first = String((o.customer && o.customer.name) || '').split(' ')[0];
    const st = STORY[first] || { age: 60, accept: 3 };
    const accept = st.accept || 3, call = st.call || accept + 2, out = st.out || accept + 18, done = st.done || out + 14, cancel = st.cancel || accept + 5;
    const created = T0 - st.age * 60;
    const t = { created, paid: created + 25, accept: created + accept * 60, call: created + call * 60, out: created + out * 60, done: created + done * 60, cancel: created + cancel * 60 };
    o._t = t;
    o.created_at = created; o.paid_at = t.paid;
    o.expires_at = new Date((created + 30 * 60) * 1000).toISOString();
    const h = [{ status: 'aguardando_pagamento', at: created }, { status: 'novo', at: t.paid }];
    if (o.status !== 'novo') h.push({ status: 'preparando', at: t.accept });
    if (o.status === 'entrega' || o.status === 'concluido') h.push({ status: 'entrega', at: t.out });
    if (o.status === 'concluido') h.push({ status: 'concluido', at: t.done });
    if (o.status === 'cancelado') h.push({ status: 'cancelado', at: t.cancel });
    o.history = h; o.updated_at = h[h.length - 1].at;
    o.etaAt = o.status === 'preparando' || o.status === 'entrega' ? created + 50 * 60 : 0;
    const c = o.courier;
    if (c) {
      c.acceptedAt = t.accept;
      if (c.calledAt) c.calledAt = t.call;
      c.updatedAt = c.status === 'a_caminho' ? t.call + 40 : c.status === 'coletado' ? t.out - 90 : c.status === 'entregue' ? t.done - 120 : (c.calledAt || t.accept);
      if (c.api && c.api.driver) Object.assign(c.api.driver, { plate: DRIVER.plate });
    }
    return o;
  }

  function evAt(e, o) {
    const t = o._t;
    switch (e.kind) {
      case 'order.created': return t.created;
      case 'payment.confirmed': return t.paid;
      case 'order.status': return /aceito/.test(e.title) ? t.accept : /saiu/.test(e.title) ? t.out : /entregue/.test(e.title) ? t.done : /cancelado/.test(e.title) ? t.cancel : t.accept;
      case 'courier.requested': return t.accept + 1;
      case 'courier.quote': return t.call - 6;
      case 'courier.called': return t.call;
      case 'courier.status': return /a caminho/.test(e.title) ? t.call + 40 : /pegou/.test(e.title) ? t.out - 90 : /entregou/.test(e.title) ? t.done - 120 : t.call + 60;
      case 'refund.done': return t.cancel + 2;
      default: return t.created;
    }
  }

  // alguns dias de pedidos já concluídos, para o gráfico da semana, o Histórico e o Financeiro não ficarem vazios
  function pastOrders(templates) {
    const rnd = rnd32(20261121);
    const names = ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elisa Prado', 'Fábio Torres', 'Gabriela Reis', 'Hugo Pinto', 'Isabela Nunes', 'João Pedro', 'Karina Dias', 'Lucas Ferraz', 'Marina Alves', 'Nicolas Prates', 'Olívia Costa', 'Paulo Vieira', 'Renata Silva', 'Sérgio Matos', 'Tatiana Gomes', 'Vitor Hugo'];
    const kinds = [['pix', 'Pix'], ['pix', 'Pix'], ['pix', 'Pix'], ['card', 'Cartão de crédito'], ['card', 'Cartão de crédito'], ['wallet', 'Saldo Mercado Pago']];
    const used = new Set(S.orders.map((o) => o.orderId));
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const out = [];
    [12, 15, 10, 18, 14, 13].forEach((n, i) => {
      const base = dayStart(T0 - (i + 1) * 86400);
      for (let k = 0; k < n; k++) {
        const tpl = templates[Math.floor(rnd() * templates.length)];
        let id; do { id = `DAD-${1000 + Math.floor(rnd() * 8999)}`; } while (used.has(id)); used.add(id);
        const at = base + 18 * 3600 + Math.floor(rnd() * 5.5 * 3600);
        const [kind, label] = kinds[Math.floor(rnd() * kinds.length)];
        const o = clone(tpl);
        for (const f of ['courier', 'paymentId', 'mpOrderId', 'refundId', '_t', '_sim']) delete o[f];
        const nm = names[Math.floor(rnd() * names.length)];
        Object.assign(o, {
          orderId: id, id, status: 'concluido', paymentConfirmed: true, refunded: false, paymentKind: kind, paymentMethod: label, isNew: false,
          created_at: at, paid_at: at + 25, updated_at: at + 55 * 60, etaAt: 0,
          customer: { name: nm, phone: `5190${String(1000000 + Math.floor(rnd() * 8999999))}`, address: (tpl.customer && tpl.customer.address) || '' },
          trackToken: Array.from({ length: 22 }, () => alpha[Math.floor(rnd() * alpha.length)]).join(''),
          history: [{ status: 'aguardando_pagamento', at }, { status: 'novo', at: at + 25 }, { status: 'preparando', at: at + 200 }, { status: 'entrega', at: at + 20 * 60 }, { status: 'concluido', at: at + 55 * 60 }]
        });
        out.push(o);
      }
    });
    return out;
  }

  function init(snap) {
    S.snap = snap;
    S.orders = clone(snap.orders).map(retime);
    const byId = Object.fromEntries(S.orders.map((o) => [o.orderId, o]));
    // acontecimentos do terminal: os gravados, no horário de cada pedido (sem os do Authenticator)
    const evs = [];
    for (const e of snap.events) {
      if (/^finance\./.test(e.kind)) continue;
      const o = e.orderId && byId[e.orderId];
      if (e.kind === 'admin.login') { if (evs.some((x) => x.kind === 'admin.login')) continue; evs.push({ ...e, at: T0 - 3 * 3600 + 120 }); continue; }
      if (e.kind === 'system.start') { evs.push({ ...e, at: T0 - 3 * 3600 }); continue; }
      if (o) evs.push({ ...e, at: evAt(e, o) });
    }
    evs.sort((a, b) => a.at - b.at);
    for (const e of evs) { const x = addEvent(e.kind, e.level, e.title, e.detail, e.orderId, e.at); void x; }
    // andamento ao vivo dos motoboys que já estão a caminho quando a página abre
    for (const o of S.orders) {
      const c = o.courier;
      if (c && c.api && c.status === 'a_caminho') o._sim = { aCaminho: T0 - 5, coletado: T0 + 35, entregue: T0 + 80 };
      if (c && c.api && c.status === 'coletado') o._sim = { aCaminho: T0 - 600, coletado: T0 - 300, entregue: T0 + 150 };
    }
    const templates = S.orders.filter((o) => o.status !== 'cancelado' && o.order && o.order.mode === 'entrega');
    S.past = pastOrders(templates); // só contam no Início e no Financeiro; o quadro de pedidos mostra os do dia
  }

  const ready = realFetch(HERE + 'snap.json', { cache: 'no-cache' }).then((r) => r.json()).then(init);

  // ---------------------------------------------------------------- motoboy (simulação do que a Lalamove faria)
  function setCourier(o, status, at) {
    const c = o.courier; if (!c) return;
    c.status = status; c.raw = RAW[status]; c.updatedAt = at || now();
    if (status === 'a_caminho' && c.api) { c.api.driverId = c.api.driverId || 'sim-driver'; c.api.driver = { ...DRIVER, lat: -30.0236, lon: -51.1771 }; }
    const t = STATUS_TEXT[status];
    const who = c.api && c.api.driver && c.api.driver.name ? `${c.api.driver.name}${c.api.driver.plate ? ` · placa ${c.api.driver.plate}` : ''}` : '';
    if (t) addEvent('courier.status', t[0], `Pedido ${o.orderId}: ${t[1]}`, status === 'a_caminho' && who ? who : t[2], o.orderId, at);
  }
  function tick(o) {
    const c = o.courier, s = o._sim;
    if (!c || !s || !ACTIVE.has(c.status)) return;
    const n = now();
    const steps = [['a_caminho', s.aCaminho], ['coletado', s.coletado], ['entregue', s.entregue]];
    const order = ['procurando', 'a_caminho', 'coletado', 'entregue'];
    for (const [st, at] of steps) if (n >= at && order.indexOf(c.status) < order.indexOf(st)) setCourier(o, st, at);
  }
  const tickAll = () => S.orders.forEach(tick);
  const find = (id) => { const k = String(id || '').trim().replace(/^#/, ''); return S.orders.find((o) => o.orderId === k || o.id === k) || null; };
  const blockers = (o) => (o.status === 'novo' ? ['aceite_antes'] : []);
  const pubQuote = (q) => ({ id: q.id, total: q.total, currency: q.currency, distanceM: q.distanceM, expiresAt: q.expiresAt });

  function courierGet(o) {
    const base = S.snap.courier[o.orderId];
    if (!base) return json({ success: false, error: 'so_entrega' }, 409);
    tick(o);
    const b = blockers(o);
    const q = S.quotes.get(o.orderId);
    return json({ ...base, status: o.status, courier: o.courier || null,
      lalamove: { ...base.lalamove, blockers: b, blockerText: b.map((x) => BLOCKER_TEXT[x]), quote: q && q.q.expiresAt > Date.now() ? pubQuote(q.q) : null } });
  }
  function courierQuote(o) {
    const base = S.snap.courier[o.orderId];
    if (!base) return json({ success: false, ok: false, error: 'so_entrega' }, 409);
    const b = blockers(o);
    if (b.length) return json({ success: false, ok: false, error: 'bloqueado', blockers: b, message: b.map((x) => BLOCKER_TEXT[x]).join(' ') }, 409);
    const p = base.kit.pickup, d = base.kit.dropoff;
    const rad = (x) => (x * Math.PI) / 180;
    const a = Math.sin(rad(d.lat - p.lat) / 2) ** 2 + Math.cos(rad(p.lat)) * Math.cos(rad(d.lat)) * Math.sin(rad(d.lon - p.lon) / 2) ** 2;
    const distanceM = Math.round(2 * 6371 * Math.asin(Math.sqrt(a)) * 1300);
    const total = Math.round((8 + (distanceM / 1000) * 2.2) * 100) / 100;
    const q = { id: String(Math.floor(2e11 + Math.random() * 1e11)), total, currency: 'BRL', distanceM, expiresAt: Date.now() + 5 * 60000 };
    S.quotes.set(o.orderId, { q, at: Date.now() });
    addEvent('courier.quote', 'info', `Cotação do motoboy do pedido ${o.orderId}: ${moneyBR(total)}`, `${kmText(distanceM)} · vale 5 minutos · ${ENV_TEXT}`, o.orderId);
    return json({ success: true, ok: true, quote: pubQuote(q) });
  }
  function courierDispatch(o, b) {
    const prev = o.courier || {};
    if (prev.api && prev.api.id && ACTIVE.has(prev.status)) return json({ success: false, ok: false, error: 'ja_chamado', message: 'Este pedido já tem um motoboy chamado pela Lalamove.' }, 409);
    if (prev.status === 'entregue') return json({ success: false, ok: false, error: 'ja_entregue', message: 'O motoboy deste pedido já entregou.' }, 409);
    const saved = S.quotes.get(o.orderId);
    if (!saved || saved.q.id !== String((b && b.quotationId) || '') || Date.now() >= saved.q.expiresAt - 5000) return json({ success: false, ok: false, error: 'cotacao_expirada', message: 'A cotação expirou (ela vale 5 minutos). Faça uma nova.' }, 409);
    if (Math.round(Number(b.total) * 100) !== Math.round(saved.q.total * 100)) return json({ success: false, ok: false, error: 'preco_mudou', message: 'O preço mudou. Confira o novo valor.', quote: pubQuote(saved.q) }, 409);
    const bl = blockers(o);
    if (bl.length) return json({ success: false, ok: false, error: 'bloqueado', blockers: bl, message: bl.map((x) => BLOCKER_TEXT[x]).join(' ') }, 409);
    S.quotes.delete(o.orderId);
    const n = now(), id = String(Math.floor(4e11 + Math.random() * 1e11));
    o.courier = { provider: 'lalamove', status: 'procurando', raw: RAW.procurando, acceptedAt: prev.acceptedAt || n, calledAt: n, updatedAt: n,
      api: { id, quotationId: saved.q.id, env: 'sandbox', price: saved.q.total, currency: 'BRL', distanceM: saved.q.distanceM, shareLink: `https://example.com/lalamove-simulado/${id}`, driverId: '', driver: null, auto: false } };
    o._sim = { aCaminho: n + 9, coletado: n + 24, entregue: n + 45 };
    addEvent('courier.called', 'ok', `Motoboy chamado pela Lalamove: pedido ${o.orderId}`, `${moneyBR(saved.q.total)} · ${kmText(saved.q.distanceM)} · ${ENV_TEXT}`, o.orderId);
    return json({ success: true, ok: true, courier: o.courier });
  }
  function courierCancel(o) {
    tick(o);
    const c = o.courier;
    if (!c || !c.api || !c.api.id) return json({ success: false, ok: false, error: 'sem_chamada', message: 'Este pedido não tem motoboy chamado pela Lalamove.' }, 409);
    if (!ACTIVE.has(c.status)) return json({ success: false, ok: false, error: 'nao_ativa', message: 'Esta chamada já terminou.' }, 409);
    if (c.status === 'coletado') return json({ success: false, ok: false, error: 'lalamove', code: 'ERR_CANCELLATION_FORBIDDEN', message: 'A Lalamove não deixa mais cancelar: o motoboy aceitou há mais de 5 minutos ou já pegou o pedido.' }, 502);
    setCourier(o, 'cancelado'); delete o._sim;
    return json({ success: true, ok: true, courier: o.courier });
  }
  function courierManual(o, via) {
    if (!MANUAL_VIA[via]) return json({ success: false, error: 'canal_invalido' }, 400);
    if (['cancelado', 'concluido'].includes(String(o.status))) return json({ success: false, error: 'pedido_encerrado' }, 409);
    tick(o);
    const prev = o.courier || {};
    if (prev.api && prev.api.id && ACTIVE.has(prev.status)) return json({ success: false, error: 'ja_chamado' }, 409);
    const n = now();
    o.courier = { provider: via, status: 'chamado_manual', acceptedAt: prev.acceptedAt || n, calledAt: n, updatedAt: n };
    addEvent('courier.called', 'info', `Motoboy do pedido ${o.orderId} chamado ${MANUAL_VIA[via]}`, 'Marcado no painel. O sistema não tem como confirmar que o motoboy aceitou: confira no aplicativo ou com ele.', o.orderId);
    return json({ success: true, courier: o.courier });
  }

  // ---------------------------------------------------------------- pedidos
  function patchOrder(o, status) {
    if (!['novo', 'preparando', 'entrega', 'concluido', 'cancelado'].includes(status)) return json({ success: false, error: 'status_invalido' }, 400);
    const wasNew = o.status === 'novo', prev = o.status, n = now();
    o.status = status; o.updated_at = n;
    if (!o.history.length || o.history[o.history.length - 1].status !== status) o.history.push({ status, at: n });
    if (prev !== status) { const t = STATUS_EV[status]; if (t) addEvent('order.status', t[0], `Pedido ${o.orderId} ${t[1]}`, t[2], o.orderId); }
    if (wasNew && status === 'preparando') {
      o.courier = { provider: null, status: 'falta_chamar', acceptedAt: n };
      addEvent('courier.requested', 'warn', `Chame o motoboy do pedido ${o.orderId}`, 'Abra o pedido e toque em "Chamar motoboy": a Lalamove mostra o preço antes de você confirmar.', o.orderId);
    }
    let refund;
    if (status === 'cancelado' && o.paymentConfirmed) {
      o.refunded = true; o.refundedAmount = o.total;
      addEvent('refund.done', 'ok', `Devolução feita · ${o.orderId}`, `${moneyBR(o.total)} voltou para o cliente pelo Mercado Pago.`, o.orderId);
      refund = { ok: true, amount: o.total };
    }
    return json({ success: true, order: o, ...(refund ? { refund } : {}) });
  }

  // ---------------------------------------------------------------- Início e Financeiro (mesma conta do servidor)
  function dashboard() {
    const nowS = now();
    const ts = (o) => Number(o.paid_at) || Number(o.created_at) || 0;
    const real = [...S.orders, ...S.past].filter(isReal);
    const live = real.filter((o) => o.status !== 'cancelado' && !o.refunded);
    const today = dayOf(nowS);
    const todays = real.filter((o) => dayOf(ts(o)) === today);
    const todaysLive = todays.filter((o) => o.status !== 'cancelado' && !o.refunded);
    const hourly = Array(24).fill(0);
    for (const o of todaysLive) hourly[hourOf(ts(o))] += 1;
    const days = Array.from({ length: 7 }, (_, i) => dayOf(nowS - (6 - i) * 86400));
    const week = days.map((d) => ({ day: d, orders: live.filter((o) => dayOf(ts(o)) === d).length }));
    const week7 = live.filter((o) => days.includes(dayOf(ts(o))));
    const payKind = (o) => (o && o.paymentKind === 'pix' ? 'pix' : o && o.paymentKind === 'wallet' ? 'saldo' : 'cartao');
    const channels = { pix: 0, cartao: 0, saldo: 0 };
    for (const o of week7) channels[payKind(o)] += 1;
    const items = new Map();
    for (const o of week7) for (const it of (o.order && o.order.items) || []) {
      const name = String(it.name || ''); if (!name || name.startsWith('🎁')) continue;
      items.set(name, (items.get(name) || 0) + (Number(it.q) || 0));
    }
    const at = (o, s) => { const h = (Array.isArray(o.history) ? o.history : []).find((x) => x.status === s); return h ? Number(h.at) : 0; };
    const mins = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length / 60) : null);
    const ok = (x) => x > 0 && x < 6 * 3600;
    const accept = todaysLive.map((o) => at(o, 'preparando') - (Number(o.paid_at) || at(o, 'novo'))).filter(ok);
    const prep = todaysLive.map((o) => (at(o, 'entrega') || at(o, 'concluido')) - at(o, 'preparando')).filter(ok);
    const open = (s) => real.filter((o) => o.status === s).length;
    const yesterday = dayOf(nowS - 86400);
    return {
      success: true, generatedAt: nowS,
      today: { orders: todaysLive.length, cancelled: todays.length - todaysLive.length, waitingPayment: 0, avgAcceptMin: mins(accept), avgPrepMin: mins(prep) },
      open: { novo: open('novo'), preparando: open('preparando'), entrega: open('entrega') },
      yesterdayOrders: live.filter((o) => dayOf(ts(o)) === yesterday).length,
      hourly, week, channels,
      topItems: [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }))
    };
  }
  function financeReport() {
    const nowS = now();
    const ts = (o) => Number(o.paid_at) || Number(o.created_at) || 0;
    const paid = [...S.orders, ...S.past].filter(isReal);
    const days = Array.from({ length: 30 }, (_, i) => dayOf(nowS - (29 - i) * 86400));
    const idx = Object.fromEntries(days.map((d, i) => [d, i]));
    const live = paid.filter((o) => o.status !== 'cancelado' && !o.refunded);
    const gone = paid.filter((o) => o.status === 'cancelado' || o.refunded);
    const sum = (arr, f) => r2(arr.reduce((t, o) => t + (Number(f(o)) || 0), 0));
    const within = (arr, n) => arr.filter((o) => (idx[dayOf(ts(o))] ?? -1) >= 30 - n);
    const block = (arr) => ({ orders: arr.length, gross: sum(arr, (o) => o.total), avgTicket: arr.length ? r2(sum(arr, (o) => o.total) / arr.length) : 0, deliveryFees: sum(arr, (o) => o.deliveryFee), discounts: sum(arr, (o) => o.discount) });
    const group = (arr, keyOf) => {
      const m = new Map();
      for (const o of arr) { const k = keyOf(o); const g = m.get(k) || { name: k, orders: 0, gross: 0 }; g.orders += 1; g.gross = r2(g.gross + (Number(o.total) || 0)); m.set(k, g); }
      return [...m.values()].sort((a, b) => b.gross - a.gross);
    };
    const methodKey = (m) => { const t = String(m || ''); if (/pix/i.test(t)) return 'Pix'; if (/d[eé]bito/i.test(t)) return 'Cartão de débito'; if (/cart/i.test(t)) return 'Cartão de crédito'; return 'Saldo Mercado Pago'; };
    const items = new Map();
    for (const o of live) for (const it of (o.order && o.order.items) || []) {
      const name = String(it.name || ''); if (!name || name.startsWith('🎁')) continue;
      const g = items.get(name) || { name, qty: 0, gross: 0 }; g.qty += Number(it.q) || 0; g.gross = r2(g.gross + (Number(it.price) || 0) * (Number(it.q) || 0)); items.set(name, g);
    }
    return {
      success: true, generatedAt: nowS,
      periods: { today: block(within(live, 1)), last7: block(within(live, 7)), last30: block(within(live, 30)), all: block(live) },
      daily: days.slice(-14).map((d) => { const a = live.filter((o) => dayOf(ts(o)) === d); return { day: d, orders: a.length, gross: sum(a, (o) => o.total) }; }),
      byMethod: group(live, (o) => methodKey(o.paymentMethod)),
      byUnit: group(live, (o) => o.unitName || o.unitId || 'Loja'),
      topItems: [...items.values()].sort((a, b) => b.gross - a.gross).slice(0, 6),
      recent: [...live].sort((a, b) => ts(b) - ts(a)).slice(0, 8).map((o) => ({ orderId: o.orderId, at: ts(o), customer: shortName(o.customer), total: r2(o.total), method: methodKey(o.paymentMethod), status: o.status })),
      refunds: { orders: gone.length, amount: sum(gone, (o) => o.total) }
    };
  }

  // ---------------------------------------------------------------- as rotas
  async function route(method, url, body) {
    await ready;
    tickAll();
    const p = url.pathname.replace(/\/+$/, '');
    const g = S.snap.get;
    let m;
    if (method === 'GET') {
      if (p === '/api/admin/session') return json({ success: true, authenticated: true, defaultPassword: false });
      if (p === '/api/orders') {
        let list = S.orders.filter(isReal);
        const unit = url.searchParams.get('unitId'), st = url.searchParams.get('status');
        if (unit && unit !== 'todas') list = list.filter((o) => o.unitId === unit || (o.order && o.order.unitId === unit));
        if (st && st !== 'todos') list = list.filter((o) => String(o.status || '').toLowerCase() === st.toLowerCase());
        list = [...list].sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
        return json({ success: true, count: list.length, orders: list });
      }
      if (p === '/api/admin/dashboard') return json(dashboard());
      if (p === '/api/admin/events') {
        const after = Number(url.searchParams.get('after')) || 0, limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 80));
        return json({ success: true, events: S.events.filter((e) => e.id > after).slice(-limit), serverTime: now() });
      }
      if (p === '/api/admin/system') {
        const sys = clone(g['/api/admin/system']);
        sys.server.uptimeSec = 3 * 3600 + Math.round(now() - T0); sys.orders.paid = [...S.orders, ...S.past].filter(isReal).length;
        return json(sys);
      }
      if (p === '/api/admin/finance/status') {
        const open = now() < S.finUntil;
        return json({ ...g['/api/admin/finance/status'], unlocked: open, minutes: 10, expiresInSec: open ? Math.max(0, Math.round(S.finUntil - now())) : 0 });
      }
      if (p === '/api/admin/finance') return now() < S.finUntil ? json(financeReport()) : json({ success: false, error: 'bloqueado' }, 423);
      if ((m = /^\/api\/admin\/orders\/([^/]+)\/courier$/.exec(p))) { const o = find(decodeURIComponent(m[1])); return o ? courierGet(o) : json({ success: false, error: 'pedido_nao_encontrado' }, 404); }
      if (g[p]) return json(clone(g[p]));
      return json({ success: false, error: 'nao_existe_na_demonstracao' }, 404);
    }
    // gravações
    if (p === '/api/admin/login') return json({ success: true });
    if (p === '/api/admin/logout') return json({ success: true });
    if (p === '/api/admin/finance/lock') { S.finUntil = 0; return json({ success: true }); }
    if (p === '/api/admin/finance/verify') {
      if (/^\d{6}$/.test(String((body && body.code) || '').replace(/\s/g, ''))) {
        S.finUntil = now() + 600;
        addEvent('finance.unlocked', 'ok', 'Financeiro aberto', 'Aberto com o código do Google Authenticator. Fecha sozinho em 10 minutos.');
        return json({ success: true, minutes: 10, how: 'codigo' });
      }
      return json({ success: false, error: 'codigo_incorreto', left: 4 }, 403);
    }
    if ((m = /^\/api\/orders\/([^/]+)$/.exec(p)) && method === 'PATCH') { const o = find(decodeURIComponent(m[1])); return o && isReal(o) ? patchOrder(o, String((body && body.status) || '').toLowerCase()) : json({ success: false, error: 'Pedido não encontrado' }, 404); }
    if ((m = /^\/api\/orders\/([^/]+)\/eta$/.exec(p))) {
      const o = find(decodeURIComponent(m[1])), min = Number(body && body.minutes);
      if (!(min >= 0 && min <= 300)) return json({ success: false, error: 'minutos_invalidos' }, 400);
      if (!o) return json({ success: false, error: 'Pedido não encontrado' }, 404);
      o.etaAt = now() + Math.round(min) * 60; o.updated_at = now();
      return json({ success: true, order: o });
    }
    if ((m = /^\/api\/admin\/orders\/([^/]+)\/courier(?:\/(quote|dispatch|cancel|refresh))?$/.exec(p))) {
      const o = find(decodeURIComponent(m[1]));
      if (!o) return json({ success: false, error: 'pedido_nao_encontrado' }, 404);
      if (!(o.order && o.order.mode === 'entrega')) return json({ success: false, error: 'so_entrega' }, 409);
      if (m[2] === 'quote') return courierQuote(o);
      if (m[2] === 'dispatch') return courierDispatch(o, body || {});
      if (m[2] === 'cancel') return courierCancel(o);
      if (m[2] === 'refresh') { tick(o); return json({ success: true, courier: o.courier || null }); }
      return courierManual(o, String((body && body.via) || ''));
    }
    if (p === '/api/admin/connections/lalamove/test') {
      const view = clone(g['/api/admin/connections']);
      const result = { ok: true, city: 'Porto Alegre', service: 'MOTORCYCLE', services: ['MOTORCYCLE', 'CAR'], checkedAt: now() };
      view.lalamove.test = result; view.lalamove.city = 'BR POA';
      addEvent('keys.tested', 'ok', 'Teste da conexão com a Lalamove: tudo certo', 'Cidade Porto Alegre, tipo de veículo MOTORCYCLE.');
      return json({ ...view, result });
    }
    if (p === '/api/admin/connections/mp/test') {
      const view = clone(g['/api/admin/connections']);
      const result = { ok: true, nickname: 'LOJA_TESTE', siteId: 'MLB', test: true, checkedAt: now() };
      view.mp.account = result;
      addEvent('keys.tested', 'ok', 'Teste da conexão com o Mercado Pago: tudo certo', 'A chave é aceita e a conta foi encontrada.');
      return json({ ...view, result });
    }
    return refuse();
  }

  window.fetch = function (input, init) {
    let url, method, body;
    try {
      const req = typeof input === 'string' || input instanceof URL ? null : input;
      url = new URL(req ? req.url : String(input), location.href);
      method = String((init && init.method) || (req && req.method) || 'GET').toUpperCase();
      const raw = init && init.body !== undefined ? init.body : null;
      body = typeof raw === 'string' ? JSON.parse(raw) : null;
    } catch (e) { return realFetch(input, init); }
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);
    return route(method, url, body).catch((e) => json({ success: false, error: 'erro_na_demonstracao', message: String(e && e.message || e) }, 500));
  };

  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('previewBanner');
    if (!b) return;
    b.innerHTML = '<b>Demonstração só para ver.</b> Os pedidos, o motoboy e o Pix são de exemplo e nada é gravado. Aceite um pedido novo e chame o motoboy para ver o passo a passo. No Financeiro, digite qualquer código de 6 dígitos. Recarregue a página para recomeçar.';
    b.hidden = false;
  });
})();
