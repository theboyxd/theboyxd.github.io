var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};const n=()=>{let e=window.__snPonte;if(!e)throw Error(`Abra pela Central star-net.pro/admin.`);return e},r={amazon:`o Painel Amazon`,radar:`o Radar`};async function i(e,t,{method:i=`GET`,body:a}={}){let o=n(),s;try{s=await o.call(`app`,{app:e,metodo:i,caminho:`/api`+t,corpo:a})}catch(e){throw o.sessaoVencida(e),e}if(!s||s.erro)throw s&&s.erro===`fora`?Error(s.mensagem||`Não consegui falar com ${r[e]||`o app`} agora.`):Error(`A Central recusou o pedido (`+(s&&s.erro||`sem resposta`)+`).`);if(s.status>=400)throw Error(s.json&&s.json.error||`Erro ${s.status}`);return s.json===void 0?s.base64===void 0?s.texto??null:{base64:s.base64,tipo:s.tipo,nome:s.nome}:s.json}let a=null;async function o(){if(a&&a.ate>Date.now())return a.base;let e=n(),t=await e.call(`previa`);if(!t||!t.ficha)throw Error(`A Central não liberou a prévia do site exemplo.`);return a={base:e.servidor().replace(/\/exec\/?$/,`/previa/`+t.ficha+`/`),ate:Date.now()+396e5},a.base}const s=()=>a?a.base:``,c=(e,t)=>{try{n().toast(e,t)}catch{}},l={app:`amazon`,prefixo:`pj.`};function u(e){Object.assign(l,e)}const d=()=>s(),f=(e,t=document)=>t.querySelector(e),p=(e,t=document)=>[...t.querySelectorAll(e)];var m=class{constructor(e){this.s=e}toString(){return this.s}};const h=e=>new m(String(e??``));function g(e){return String(e??``).replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function _(e){return e==null||e===!1?``:e instanceof m?e.s:Array.isArray(e)?e.map(_).join(``):g(e)}function v(e,...t){let n=``;return e.forEach((e,r)=>{n+=e,r<t.length&&(n+=_(t[r]))}),new m(n)}const y=(e,t=``)=>h(`<svg class="i ${t}" aria-hidden="true"><use href="apps/icones.svg#${e}"></use></svg>`);function b(e,t){return e.innerHTML=String(t),e}async function x(e,{method:t=`GET`,body:n}={}){return i(l.app,e,{method:t,body:n})}const S={settings:null,products:null};async function C(e=!1){return(!S.settings||e)&&(S.settings=await x(`/settings`)),S.settings}const w=/* @__PURE__ */ new Set;function T(e){return w.add(e),()=>w.delete(e)}function E(e=`all`){(e===`all`||e===`products`)&&(S.products=null),e===`settings`&&(S.settings=null),w.forEach(t=>{try{t(e)}catch(e){console.error(e)}})}const D=new Intl.NumberFormat(`pt-BR`,{style:`currency`,currency:`BRL`});new Intl.NumberFormat(`pt-BR`,{style:`currency`,currency:`BRL`,notation:`compact`,maximumFractionDigits:1});const O=e=>e==null||!isFinite(e)?`—`:D.format(e);function k(e,t=0){return e==null||!isFinite(e)?`—`:Number(e).toLocaleString(`pt-BR`,{minimumFractionDigits:t,maximumFractionDigits:t})}const A=e=>String(e).padStart(2,`0`);function j(e){return`${e.getFullYear()}-${A(e.getMonth()+1)}-${A(e.getDate())}`}const M=()=>j(/* @__PURE__ */ new Date);function N(e,t=`info`){c(String(e??``),t===`success`?`ok`:t===`error`?`err`:`info`)}let P=0;const F=/* @__PURE__ */ new Set;function ee(){[...F].forEach(e=>e())}function I({title:e,icon:t,size:n=``,body:r=``,actions:i=[],onClose:a}={}){let o=document.createElement(`div`);o.className=`backdrop jx`,b(o,v`<div class="dialog ${n}" role="dialog" aria-modal="true">
    <button class="dialog-close" type="button" aria-label="Fechar">${y(`x`)}</button>
    <div class="dialog-title">${t?y(t):``}<span></span></div>
    <div class="dialog-body"></div>
    <div class="dialog-actions"></div></div>`);let s=o.firstElementChild;s.querySelector(`.dialog-title span`).textContent=e||``;let c=s.querySelector(`.dialog-body`);r instanceof Node?c.appendChild(r):b(c,r);let l=s.querySelector(`.dialog-actions`),u=!1,d=()=>{u||(u=!0,F.delete(d),o.remove(),--P,P||(document.body.classList.remove(`modal-open`),document.documentElement.classList.remove(`modal-open`)),document.removeEventListener(`keydown`,f),a&&a())},f=e=>{e.key===`Escape`&&o===p(`.backdrop`).pop()&&d()};i.forEach(e=>{let t=document.createElement(`button`);t.type=`button`,t.className=`btn ${e.cls||`btn-secondary`} ${e.left?`left`:``}`,b(t,v`${e.icon?y(e.icon):``}<span></span>`),t.querySelector(`span`).textContent=e.label,t.addEventListener(`click`,async()=>{if(!e.onClick)return d();t.disabled=!0;try{await e.onClick({close:d,body:c,button:t})!==!1&&d()}catch(e){N(e.message||String(e),`error`)}finally{t.disabled=!1}}),l.appendChild(t)}),i.length||l.remove(),s.querySelector(`.dialog-close`).addEventListener(`click`,d);let m=!1;return o.addEventListener(`mousedown`,e=>{m=e.target===o}),o.addEventListener(`click`,e=>{e.target===o&&m&&d()}),document.addEventListener(`keydown`,f),F.add(d),document.body.appendChild(o),document.body.classList.add(`modal-open`),document.documentElement.classList.add(`modal-open`),P+=1,setTimeout(()=>{let e=c.querySelector(`input:not([type=hidden]):not([readonly]), select, textarea`);e&&e.focus()},30),{body:c,dialog:s,close:d,actions:l}}function te(e,{title:t=`Confirmar`,okLabel:n=`Confirmar`,danger:r=!1}={}){return new Promise(i=>{let a=!1;I({title:t,icon:r?`alert`:`help`,body:v`<p>${e}</p>`,actions:[{label:`Cancelar`},{label:n,cls:r?`btn-danger`:`btn-primary`,onClick:()=>{a=!0}}],onClose:()=>i(a)})})}async function L(e,t=`Copiado!`){try{await navigator.clipboard.writeText(e)}catch{let t=document.createElement(`textarea`);t.value=e,document.body.appendChild(t),t.select();try{document.execCommand(`copy`)}catch{}t.remove()}N(t,`success`)}function ne(e,t,n=`text/csv;charset=utf-8`){let r=new Blob([t],{type:n}),i=document.createElement(`a`);i.href=URL.createObjectURL(r),i.download=e,document.body.appendChild(i),i.click(),i.remove(),setTimeout(()=>URL.revokeObjectURL(i.href),2e3)}function re(e){let t=e=>{let t=e==null?``:String(e);return/[";\n]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t};return`﻿`+e.map(e=>e.map(t).join(`;`)).join(`
`)}u({app:`radar`,prefixo:`rd.`});var ie=/* @__PURE__ */ t({bySite:()=>H,contact:()=>W,nota:()=>V,render:()=>be,siteBadge:()=>pe,siteChips:()=>de,siteLink:()=>U,waLink:()=>fe});const R=[`restaurante`,`pizzaria`,`hamburgueria`,`padaria`,`barbearia`,`salão de beleza`,`manicure`,`pet shop`,`oficina mecânica`,`academia`,`loja de roupas`],ae=[`Dra Harmonização`,`Dra Dentista`,`Dra Odontologia`,`Dr Dentista`,`Consultório Dra`,`Dra Dermatologista`,`Doutora Odontologia`,`Dr Cirurgião`],oe=[[`todos`,`Todos`],[`sem`,`Sem site`],[`com`,`Com site`]],se=`radar_active_search_job`;function ce(){try{let e=localStorage.getItem(se);if(!e)return null;let t=JSON.parse(e);if(t&&Array.isArray(t.results))return t}catch{}return null}function le(e){try{e&&Array.isArray(e.results)&&(e.results.length>0||e.blocked&&e.blocked.length>0)?localStorage.setItem(se,JSON.stringify(e)):localStorage.removeItem(se)}catch{}}let z=ce(),B=null,ue=`todos`;const V=e=>e==null?`—`:Number(e).toFixed(1).replace(`.`,`,`),H=e=>t=>e===`todos`||(e===`sem`?!!t.site_kind:!t.site_kind);function de(e,t){return v`${oe.map(([n,r])=>v`<button class="chip ${t===n?`active`:``}" type="button"
    data-site="${n}">${r} (${e.filter(H(n)).length})</button>`)}`}const U=(e,t)=>e&&e.demo&&e.demo.slug&&t.demo_base?`${t.demo_base.replace(/\/?$/,`/`)}${e.demo.slug}/`:``;function fe(e,t){if(!e.whatsapp)return``;let n=String((e.site_kind?t.message:t.message_site)||``).replace(/\{nome\}/g,e.name).replace(/\{nota\}/g,V(e.rating)).replace(/\{avaliacoes\}/g,k(e.reviews||0)).replace(/\{categoria\}/g,(e.category||``).toLowerCase()).replace(/\{link\}/g,U(e,t));return`${e.whatsapp}?text=${encodeURIComponent(n)}`}function pe(e){return e===`?`?v`<span class="badge"><i class="dot"></i>Conferir site</span>`:e?v`<span class="badge warning">${e===`Sem site`?`Sem site`:`Só ${e}`}</span>`:v`<span class="badge good">Tem site</span>`}function W(e,t){let n=/^https?:\/\//i.test(e.site||``)?e.site:``;return v`${e.phone?v`<button class="btn btn-secondary btn-sm" type="button" data-copy="${e.phone}" title="Copiar telefone">${y(`copy`)}${e.phone}</button>`:v`<span class="muted" style="font-size:13px">sem telefone no Google</span>`}
    ${e.whatsapp?v`<a class="btn btn-primary btn-sm" href="${fe(e,t)}" target="_blank" rel="noopener noreferrer">${y(`send`)}WhatsApp</a>`:``}
    ${n?v`<a class="btn btn-ghost btn-sm" href="${n}" target="_blank" rel="noopener noreferrer">${y(`link`)}${e.site_kind||`Site`}</a>`:``}
    <a class="btn btn-ghost btn-sm" href="${e.maps}" target="_blank" rel="noopener noreferrer">${y(`external`)}Google Maps</a>`}const me=(e,t)=>v`<div class="li"><div class="grow" style="min-width:0">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${e.name}</b>${pe(e.site_kind)}
    ${e.caller?v`<span class="badge" style="font-size:11.5px">👤 ${e.caller}</span>`:``}
    <span class="muted" style="font-size:13px">★ ${V(e.rating)} · ${k(e.reviews)} avaliações</span></div>
  <div class="dim" style="font-size:13px;margin:4px 0 8px;line-height:1.5">${e.summary}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${W(e,t)}
    <span class="badge good">${y(`check`)}Salvo na lista de ${e.caller||`Meus clientes`}</span></div></div></div>`,he=`A extensão foi atualizada e esta página ficou com a versão antiga: aperte F5 aqui e busque de novo.`,ge=`A extensão não respondeu. Aperte F5 nesta página e busque de novo. Se continuar, recarregue a extensão (↻ em chrome://extensions) e aperte F5 de novo.`;function _e(){if(z.error)return z.error;if(z.running)return z.status;if(z.pending)return`Salvando e verificando duplicidade entre ligadores…`;let e=z.target||500,t=(z.blocked||[]).length,n=t?` · 🛡️ ${k(t)} ignorados pois já estão na lista de outro ligador`:``;return`${z.stopped?`Parou`:`Pronto`}: ${k(z.results.length)} novos salvos para ${z.caller||`Lista Geral`} (meta ${e}) (${k(z.results.filter(H(`sem`)).length)} sem site)${n}.`+(z.stopped&&z.status?` ${z.status}`:``)}function G(){if(!B)return;if(!z)return b(B.box,``);let e=z.results.filter(H(ue)),t=z.target||500,n=z.blocked||[];b(B.box,v`<div class="card">
    <div class="card-head">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h3>${y(`target`)}${k(z.results.length)} / ${t} leads salvos para <b>${z.caller||`Lista Geral`}</b> · ${k(z.results.filter(H(`sem`)).length)} sem site</h3>
        ${n.length?v`<span class="badge warning" title="Estabelecimentos bloqueados automaticamente porque já estão na lista de outro ligador">🛡️ ${k(n.length)} repetidos bloqueados</span>`:``}
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        ${z.results.length?v`<button class="btn btn-ghost btn-sm" type="button" data-reset-job title="Zerar lista e começar uma nova busca do zero">${y(`trash`)}Reiniciar contador</button>`:``}
        ${z.results.length?v`<a class="btn btn-secondary btn-sm" href="#/radar/clientes">${y(`user`)}Ver Lista em Meus Clientes</a>`:``}
      </div>
    </div>
    <div class="status-line">${y(z.running||z.pending?`loader`:`info`)}<span>${_e()}</span></div>
    ${n.length?v`
      <div style="margin:10px 0;padding:10px 12px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);font-size:12.5px">
        <b style="color:#f59e0b">🛡️ Proteção Anti-Duplicidade Ativa:</b> ${k(n.length)} estabelecimento(s) foram ignorados nesta extração porque já pertencem à lista de outra pessoa:
        <span class="dim">${n.slice(-6).map(e=>`${e.name} (${e.already_owner})`).join(` · `)}${n.length>6?`…`:``}</span>
      </div>
    `:``}
    ${z.results.length?v`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 4px">${de(z.results,ue)}</div>
      <div class="list">${e.map(e=>me(e,B.s))}</div>`:``}
  </div>`)}async function ve(e,t){if(t.length){z.pending+=1,G();try{let n=await x(`/maps`,{method:`POST`,body:{mode:`place`,items:t,query:e,caller:z.caller||``}}),r=new Set(z.results.map(e=>e.place_id)),i=new Set((z.blocked||[]).map(e=>e.place_id));z.blocked||(z.blocked=[]),n.results.forEach(e=>{e.open&&(e.skipped_duplicate?i.has(e.place_id)||z.blocked.push(e):r.has(e.place_id)||z.results.push(e))}),z.checked+=n.results.length,le(z),E(`all`)}catch(e){N(e.message,`error`)}finally{--z.pending,G()}}}window.addEventListener(`message`,e=>{if(e.source!==window||e.origin!==location.origin||!e.data||e.data.radar!==`progress`||!z)return;let t=e.data;if([`stale`,`progress`,`items`,`done`].includes(t.kind)){if(t.kind===`stale`)return Object.assign(z,{running:!1,error:he}),N(he,`error`),G();z.heard=!0,z.error===ge&&Object.assign(z,{error:``,running:!0}),t.kind===`progress`?z.status=String(t.text||``):t.kind===`items`?ve(String(t.term||``),Array.isArray(t.items)?t.items:[]):t.kind===`done`&&(Object.assign(z,{running:!1,stopped:!!t.stopped}),le(z)),G()}});function ye(e){return v`<div class="card">
    <div class="card-head"><h3>${y(`download`)}Instale a extensão do Radar no Chrome (uma vez só)</h3></div>
    <ol class="steps">
      <li>No Chrome, abra <b>chrome://extensions</b> e ligue o <b>Modo do desenvolvedor</b> (canto de cima, à direita).</li>
      <li>Clique em <b>Carregar sem compactação</b> e escolha esta pasta:
        <div class="codebox" style="margin-top:6px"><code>${e}</code><button class="btn-icon sm" type="button" data-copy="${e}" title="Copiar">${y(`copy`)}</button></div></li>
      <li>Abra a Central no Chrome (<b>star-net.pro/admin</b>) e recarregue esta página.</li>
    </ol></div>`}async function be(e,t={}){let n=await C(!0),r=document.documentElement.dataset.radarExt,i=Array.isArray(n.callers)?n.callers:[];b(e,v`
    <div class="page-head"><div><h1>${y(`radar`)}Buscar no Google Maps</h1>
      <p class="sub">Extraia listas separadas por ligador/vendedor. O Radar verifica automaticamente se o estabelecimento já está na lista de outra pessoa.</p></div>
      ${r?v`<span class="badge good">${y(`check-circle`)}Extensão conectada (v${r})</span>`:``}</div>
    ${r?v`<form class="card" data-form>
      <div style="padding:12px 14px;margin-bottom:14px;border-radius:10px;background:rgba(215,156,69,0.07);border:1px solid rgba(215,156,69,0.28)">
        <div class="field full" style="margin:0">
          <span style="font-weight:700;color:var(--brand)">👤 Nome do Ligador / Vendedor (Lista Exclusiva)</span>
          <input name="caller" value="${n.active_caller||``}" placeholder="Ex: João, Lucas, Maria (quem vai ligar para esta lista)" style="font-weight:600">
          <small class="dim" style="display:block;margin-top:4px">
            🛡️ <b>Anti-Repetição Ativo:</b> Qualquer estabelecimento que já esteja na lista de outro ligador será ignorado automaticamente durante a extração.
          </small>
        </div>
        ${i.length?v`
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
            <span class="dim" style="font-size:12px">Ligadores salvos:</span>
            ${i.map(e=>v`<button type="button" class="chip" data-caller-chip="${e}">👤 ${e}</button>`)}
          </div>
        `:``}
      </div>
      <div style="padding:10px 14px;margin:10px 0;border-radius:10px;background:rgba(225,29,72,0.08);border:1px solid rgba(225,29,72,0.28);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:700;font-size:13.5px;color:#fff">
          <input type="checkbox" name="doctor_only" ${n.doctor_only?`checked`:``} style="width:18px;height:18px;accent-color:#e11d48;cursor:pointer">
          <span>🩺 <b>Foco em Doutores e Doutoras (Dr. / Dra. / Consultório)</b></span>
        </label>
        <span class="dim" style="font-size:12px">Ignora clínicas genéricas, franquias e redes corporativas (ex: OdontoCompany, Sorridents, hospitais).</span>
      </div>
      <div class="form-grid">
        <div class="field full"><span>O que procurar <em>(separe por vírgula, até 5)</em></span><input name="terms" placeholder="Dra Harmonização, Dr Dentista, Consultório Dra" required></div>
        <div class="field"><span>Cidade ou bairro</span><input name="city" value="${n.city||`Porto Alegre, RS`}" placeholder="Porto Alegre, RS"></div>
        <div class="field"><span>Meta de leads por busca</span><input name="target" type="number" min="50" max="2000" step="50" value="${n.target_leads||500}"></div>
        <div class="field"><span>Nota mínima</span><input name="min_rating" type="number" min="0" max="5" step="0.1" value="${n.min_rating}"></div>
        <div class="field"><span>Mínimo de avaliações</span><input name="min_reviews" type="number" min="0" step="1" value="${n.min_reviews}"></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px">
        <span class="dim" style="font-size:12px;align-self:center">🩺 Doutores(as):</span>
        ${ae.map(e=>v`<button type="button" class="chip" data-chip="${e}" style="border-color:rgba(225,29,72,0.35);color:#fda4af">${e}</button>`)}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px">
        <span class="dim" style="font-size:12px;align-self:center">Outros nichos:</span>
        ${R.map(e=>v`<button type="button" class="chip" data-chip="${e}">${e}</button>`)}
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" type="submit">${y(`radar`)}Buscar leads no Google Maps</button>
        <span class="muted" style="font-size:13px">Extrai estabelecimentos inéditos direto para a lista da pessoa escolhida.</span>
      </div>
    </form>
    <div data-results style="margin-top:16px"></div>`:ye(`~/Documents/claude/john-sites/extensao`)}`);let a=t.query&&t.query.get(`q`),o=e.querySelector(`[data-form]`);if(a&&o&&o.terms&&!o.terms.value&&(o.terms.value=a.slice(0,120)),e.addEventListener(`click`,t=>{let n=t.target.closest(`[data-caller-chip]`);if(n){let t=e.querySelector(`[data-form]`);t&&t.caller&&(t.caller.value=n.dataset.callerChip);return}let r=t.target.closest(`[data-chip]`);if(r){let t=e.querySelector(`[data-form]`).terms,n=t.value.split(`,`).map(e=>e.trim()).filter(Boolean);n.includes(r.dataset.chip)||(t.value=[...n,r.dataset.chip].slice(0,5).join(`, `));return}let i=t.target.closest(`[data-site]`);if(i){ue=i.dataset.site,G();return}if(t.target.closest(`[data-reset-job]`)){if(z&&z.running)return N(`Há uma busca rodando. Aguarde terminar ou feche a aba do Google Maps.`,`warning`);z=null,le(null),G(),N(`Contador reiniciado. A próxima busca começará do zero.`,`info`);return}let a=t.target.closest(`[data-copy]`);a&&L(a.dataset.copy,a.dataset.copy.startsWith(`/`)?`Pasta copiada`:`Telefone copiado`)}),!r)return{};let s=e.querySelector(`[data-form]`);return B={box:e.querySelector(`[data-results]`),s:n},G(),s.addEventListener(`submit`,async e=>{if(e.preventDefault(),z&&z.running)return N(`Já tem uma busca rodando na aba do Google Maps.`,`info`);let t=s.terms.value.split(/[,;\n]/).map(e=>e.trim()).filter(Boolean).slice(0,5);if(!t.length)return;let n=s.caller?s.caller.value.trim():``,r=Math.max(10,Math.min(5e3,parseInt(s.target.value||`500`,10))),a=n&&!i.some(e=>e.toLowerCase()===n.toLowerCase())?[...i,n]:i,o=s.doctor_only?s.doctor_only.checked:!1,c={city:s.city.value.trim(),min_rating:s.min_rating.value,min_reviews:s.min_reviews.value,target_leads:r,doctor_only:o,active_caller:n,callers:a};try{await x(`/settings`,{method:`PUT`,body:c})}catch{}let l=z&&Array.isArray(z.results)&&z.results.length>0&&z.results.length<r,u=l?z.results:[],d=l&&z.blocked||[],f=l?u.map(e=>e.place_id).concat(d.map(e=>e.place_id)):[],p=u.length,m={running:!0,pending:0,stopped:!1,results:u,blocked:d,checked:p,target:r,caller:n,doctor_only:o,status:p>0?`Continuando busca (${p}/${r} leads já salvos). Abrindo o Google Maps para buscar mais ${r-p}…`:`Abrindo o Google Maps para buscar ${r} leads${o?` (foco em Dr./Dra.)`:``}${n?` para a lista de ${n}`:``}…`};z=m,le(z),G(),window.postMessage({radar:`search`,job:{terms:t,...c,target:r,caller:n,doctor_only:o,start_count:p,done_pids:f}},location.origin),setTimeout(()=>{z===m&&m.running&&!m.heard&&!m.error&&(Object.assign(m,{running:!1,error:ge}),G())},15e3)}),{unmount(){B=null}}}var xe=/* @__PURE__ */ t({clinicPreviewUrl:()=>X,isClinicLead:()=>ke,render:()=>Ie});const Se=[[`novo`,`Novo`],[`contatado`,`Contatado`],[`interessado`,`Interessado`],[`fechado`,`Fechado`],[`perdido`,`Perdido`]],Ce=[[`nao_atendeu`,`Não atendeu`],[`ligar_depois`,`Ligar depois`],[`link_enviado`,`Link enviado`],[`interessado`,`Interessado`],[`nao_quer`,`Não quer`]],we=[[`ja_tem_site`,`Já tem site`],[`sem_dinheiro`,`Sem dinheiro`],[`nao_precisa`,`Não precisa`],[`ja_tem_quem_faz`,`Já tem quem faz`],[`outro`,`Outro motivo`]],Te=Object.fromEntries([...Ce,...we]),K=/* @__PURE__ */ new Set,Ee=/* @__PURE__ */ new Set;let q=`todos`,De=`todos`,J=`todos`,Y=`todos`,Oe=``;function ke(e){return e?!!(e.is_clinic||e.modelo===`clinica`||e.category&&/doutor|doutora|\bdra?\b|cl[ií]nica|odonto|dentist|m[eé]dic|est[eé]tic|harmoniza/i.test(e.category)||e.name&&/doutor|doutora|\bdra?\b|cl[ií]nica|odonto|dentist|m[eé]dic|est[eé]tic|harmoniza/i.test(e.name)||e.query&&/doutor|doutora|\bdra?\b|cl[ií]nica|odonto|dentist|m[eé]dic|est[eé]tic|harmoniza/i.test(e.query)):!1}function X(e,t,n=!0){let r=n?d()+`clinica/`:`https://theboyxd.github.io/starnet-clinicas/`,i=new URLSearchParams,a=e.demo||{};i.set(`nome`,a.nome||e.name||`Clínica & Odontologia`),i.set(`sub`,a.sub||e.category||`Harmonização Orofacial & Lentes VIP`),i.set(`doutora`,a.doutora||e.name||`Dra. Responsável`);let o=(e.whatsapp||e.whats||e.phone||a.whats||``).replace(/\D/g,``);return o&&i.set(`whats`,o),(e.address||a.end)&&i.set(`end`,a.end||e.address),(e.rating||a.nota)&&i.set(`nota`,a.nota||(e.rating?String(e.rating).replace(`.`,`,`):`5,0`)),(e.reviews||a.aval)&&i.set(`aval`,a.aval||(e.reviews?k(e.reviews):`2.840`)),(e.insta||a.instagram)&&i.set(`instagram`,a.instagram||e.insta),i.set(`por`,t&&t.owner_name||`John`),`${r}?${i}`}function Ae(e){let t=new Date(e),n=/* @__PURE__ */ new Date;n.setDate(n.getDate()-1);let r=t.toTimeString().slice(0,5);return t.toDateString()===(/* @__PURE__ */ new Date()).toDateString()?`hoje ${r}`:t.toDateString()===n.toDateString()?`ontem ${r}`:`${String(t.getDate()).padStart(2,`0`)}/${String(t.getMonth()+1).padStart(2,`0`)} ${r}`}function je(e){let t=(e||``).split(`|`)[(/* @__PURE__ */ new Date()).getDay()];if(!t||t===`?`)return``;if(t===`-`)return`Hoje fechado`;if(t===`0000-2400`)return`Hoje 24 horas`;let n=e=>`${Number(e.slice(0,2))%24}h${e.slice(2)===`00`?``:e.slice(2)}`;return`Hoje ${t.split(`,`).map(e=>e.split(`-`).map(n).join(`–`)).join(` e `)}`}function Me(e){let t=e.calls[e.calls.length-1];return t?v`<span class="muted" style="font-size:12.5px;white-space:nowrap">Última: <b>${Te[t.r]}${t.why?` (${Te[t.why]})`:``}</b> · ${Ae(t.t)}${e.calls.length>1?` · ${e.calls.length} ligações`:``}</span>
    <button class="btn btn-ghost btn-sm" type="button" data-undo title="Apertou errado? Desfaz o último">Desfazer</button>`:``}function Ne(e){return v`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
      <span class="muted" style="font-size:13px">Ligação:</span>
      ${Ce.map(([e,t])=>v`<button class="chip" type="button" data-call="${e}">${t}</button>`)}
      ${Me(e)}</div>
    ${Ee.has(e.place_id)?v`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">
      <span class="muted" style="font-size:13px">Por quê?</span>
      ${we.map(([e,t])=>v`<button class="chip" type="button" data-reason="${e}">${t}</button>`)}</div>`:``}`}function Pe(e){return K.has(e.place_id)?v`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
    <span class="dim" style="font-size:13px">Peça o WhatsApp no começo da ligação: o site dele passa a mandar o pedido de teste para lá.</span>
    <input class="input" data-wa-input placeholder="(51) 99999-8888" inputmode="tel" style="max-width:170px;height:32px">
    <button class="btn btn-primary btn-sm" type="button" data-wa-save>${y(`check`)}Salvar</button>
    <button class="btn btn-ghost btn-sm" type="button" data-wa-same title="Tem restaurante que usa WhatsApp Business no próprio fixo">O fixo é WhatsApp</button></div>`:``}function Fe(e,t,n){let r=ke(e),i=r?X(e,t,!1):U(e,t),a=r?X(e,t,!0):i||`${d()}?lead=${encodeURIComponent(e.place_id)}`,o=je(e.hours),s=e.caller||``,c=(e.name||`C`).trim().charAt(0).toUpperCase(),l=(e.query||``).trim();return v`<div class="li" data-id="${e.place_id}">
    <div class="grow" style="min-width:0">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${e.logo_local?v`<img src="${d().replace(/\/$/,``)+e.logo_local}" alt="${e.name}" referrerpolicy="no-referrer" data-some-se-falhar style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:1.5px solid ${r?`rgba(212,175,55,0.45)`:`rgba(215,156,69,0.35)`};flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.25)">`:v`<div style="width:30px;height:30px;border-radius:50%;background:${r?`rgba(212,175,55,0.15)`:`rgba(215,156,69,0.15)`};border:1px solid ${r?`rgba(212,175,55,0.4)`:`rgba(215,156,69,0.3)`};color:${r?`#D4AF37`:`var(--brand)`};font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${c}</div>`}
        <b>${e.name}</b>${pe(e.site_kind)}
        ${r?v`<span class="badge" style="background:#fbf3d9;color:#7a5c00;font-size:11px">★ Clínica / Doutora</span>`:``}
        ${l?v`<span class="badge" style="font-size:11px;background:var(--field);color:var(--muted)" title="Busca realizada no Google Maps">🔍 ${l}</span>`:``}
        <span class="badge" style="font-size:11.5px;border-color:rgba(215,156,69,0.4);color:var(--brand)">👤 ${s||`Sem ligador`}</span>
        ${e.insta?v`<span class="badge" style="font-size:11.5px">@${e.insta}</span>`:``}
        <span class="muted" style="font-size:13px">★ ${V(e.rating)} · ${k(e.reviews)} avaliações${o?` · ${o}`:``}</span></div>
      <div class="dim" style="font-size:13px;margin:4px 0 8px;line-height:1.5">${e.summary}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${W(e,t)}
        ${e.whatsapp?``:v`<button class="badge warning" type="button" data-wa-ask title="O pedido de teste não chega num telefone fixo">${y(`alert`)}Fixo: peça o WhatsApp</button>`}
        ${r?v`
          <button class="btn btn-secondary btn-sm" type="button" data-link="${i}" title="Copiar link oficial da clínica (GitHub Pages)">${y(`copy`)}Copiar link da clínica</button>
          <a class="btn-icon sm" href="${a}" target="_blank" rel="noopener noreferrer" title="Abrir prévia da clínica">${y(`external`)}</a>
          <a class="btn btn-ghost btn-sm" href="#/radar/site-clinica?lead=${encodeURIComponent(e.place_id)}" style="color:#7a5c00">${y(`sparkles`)}Site de clínica ✓</a>
        `:v`
          ${i?v`<button class="btn btn-secondary btn-sm" type="button" data-link="${i}" title="${i}">${y(`copy`)}Copiar link do site</button>
            <a class="btn-icon sm" href="${i}" target="_blank" rel="noopener noreferrer" title="Abrir o site dele">${y(`external`)}</a>`:``}
          <a class="btn btn-ghost btn-sm" href="#/radar/site?lead=${encodeURIComponent(e.place_id)}">${y(`image`)}${i?`Editar site`:`Site de exemplo${e.demo&&Object.keys(e.demo).length?` ✓`:``}`}</a>
          <button class="btn btn-ghost btn-sm" type="button" data-visita title="Cardápio 3D com o nome, as cores e o WhatsApp deste negócio, pronto para mostrar na visita">${y(`calendar`)}Preparar visita</button>
        `}
      </div>
      ${Pe(e)}
      ${Ne(e)}
      <textarea class="input" data-notes rows="2" placeholder="Anotações: com quem falou, valor, retorno…" style="margin-top:8px;width:100%">${e.notes}</textarea>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <select class="input" data-caller title="Ligador responsável por este cliente" style="font-size:12px;padding:4px 8px">
        <option value="" ${s?``:h(`selected`)}>👤 Sem ligador</option>
        ${n.map(e=>v`<option value="${e}" ${s.toLowerCase()===e.toLowerCase()?h(`selected`):``}>👤 ${e}</option>`)}
      </select>
      <select class="input" data-status>${Se.map(([t,n])=>v`<option value="${t}" ${e.status===t?h(`selected`):``}>${n}</option>`)}</select>
      <button class="btn-icon sm" type="button" data-del title="Remover">${y(`trash`)}</button>
    </div></div>`}async function Ie(e){let t=await C(!0),n=[],r={},i=async()=>{[t,n]=await Promise.all([C(!0),x(`/leads`)]),r=Object.fromEntries(n.map(e=>[e.place_id,e]))};await i();let a=()=>{let e=/* @__PURE__ */ new Set;return n.forEach(t=>{let n=(t.query||``).trim();n&&e.add(n)}),[...e].sort((e,t)=>e.localeCompare(t))},o=e=>Y===`todos`?!0:Y===`__sem__`?!(e.query||``).trim():(e.query||``).trim().toLowerCase()===Y.toLowerCase(),s=()=>{let e=new Set(Array.isArray(t.callers)?t.callers:[]);return n.forEach(t=>{t.caller&&e.add(t.caller)}),[...e]},c=e=>J===`todos`?!0:J===`__sem__`?!e.caller:(e.caller||``).toLowerCase()===J.toLowerCase(),l=()=>{let e=Oe.toLowerCase();return n.filter(t=>c(t)&&o(t)&&(q===`todos`||t.status===q)&&H(De)(t)&&(!e||`${t.name} ${t.category} ${t.address} ${t.notes} ${t.query||``} ${t.caller||``}`.toLowerCase().includes(e)))};function u(){let r=a(),i=s(),u=n.filter(c),d=u.filter(o),f=l(),p=e=>d.filter(t=>t.status===e).length,m=e=>n.filter(t=>(t.caller||``).toLowerCase()===e.toLowerCase()).length,h=n.filter(e=>!e.caller).length,g=e=>u.filter(t=>(t.query||``).trim().toLowerCase()===e.toLowerCase()).length,_=u.filter(e=>!(e.query||``).trim()).length;b(e,v`
      <div class="page-head"><div><h1>${y(`user`)}Lista de ligações</h1>
        <p class="sub">Clientes separados por busca realizada e por ligador/vendedor. Sites e links exclusivos para cada lead.</p></div>
        ${n.length?v`<div class="head-actions">
          <button class="btn btn-primary" type="button" data-gen title="Cria e publica o site de cada restaurante, lancheria e pizzaria que ainda não tem, com o modelo certo pelo nome">${y(`upload`)}Gerar sites e links</button>
          <button class="btn btn-secondary" type="button" data-auto-insta title="Busca automaticamente o 1º logo e as cores do Instagram para todos os seus clientes">${y(`sparkles`)}Buscar Logos do Instagram</button>
          <button class="btn btn-secondary" type="button" data-csv>${y(`download`)}Planilha ${Y!==`todos`&&Y!==`__sem__`?`(${Y})`:J!==`todos`&&J!==`__sem__`?`(${J})`:`(CSV)`}</button></div>`:``}</div>

      <!-- Barra de Separação por Busca Realizada -->
      <div class="card" style="margin-bottom:14px;border:1px solid rgba(59,130,246,0.28);background:rgba(59,130,246,0.04)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <b style="font-size:14px;color:#60a5fa">🔍 Separar por Busca Realizada (Segmentos)</b>
            <span class="dim" style="font-size:12.5px;margin-left:8px">Filtre seus clientes de acordo com o termo pesquisado no Google Maps:</span>
          </div>
          ${Y===`todos`?``:v`
            <button class="btn btn-ghost btn-sm" type="button" data-query-f="todos" style="font-size:12px">
              ${y(`x`)}Ver todas as buscas
            </button>
          `}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="chip ${Y===`todos`?`active`:``}" type="button" data-query-f="todos">
            Todas as buscas (${u.length})
          </button>
          ${r.map(e=>v`
            <button class="chip ${Y.toLowerCase()===e.toLowerCase()?`active`:``}" type="button" data-query-f="${e}">
              🔍 ${e} (${g(e)})
            </button>
          `)}
          ${_?v`
            <button class="chip ${Y===`__sem__`?`active`:``}" type="button" data-query-f="__sem__">
              Sem termo registrado (${_})
            </button>
          `:``}
        </div>
      </div>

      <!-- Barra de Separação por Ligador / Vendedor -->
      <div class="card" style="margin-bottom:14px;border:1px solid rgba(215,156,69,0.28);background:rgba(215,156,69,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <b style="font-size:14px;color:var(--brand)">👤 Listas por Ligador (Vendedor)</b>
            <span class="dim" style="font-size:12.5px;margin-left:8px">Clique no nome da pessoa para ver e exportar apenas a planilha dela:</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" type="button" data-add-caller>${y(`plus`)}Novo Ligador</button>
            ${n.length?v`<button class="btn btn-primary btn-sm" type="button" data-distribute-callers>${y(`layers`)}Atribuir / Dividir Lista</button>`:``}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="chip ${J===`todos`?`active`:``}" type="button" data-caller-f="todos">Todos (${n.length})</button>
          ${i.map(e=>v`
            <button class="chip ${J.toLowerCase()===e.toLowerCase()?`active`:``}" type="button" data-caller-f="${e}">
              👤 ${e} (${m(e)})
            </button>
          `)}
          ${h?v`
            <button class="chip ${J===`__sem__`?`active`:``}" type="button" data-caller-f="__sem__">
              Sem ligador (${h})
            </button>
          `:``}
        </div>
      </div>

      ${n.length?v`<div class="card">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <button class="chip ${q===`todos`?`active`:``}" type="button" data-filter="todos">Todos (${d.length})</button>
          ${Se.map(([e,t])=>v`<button class="chip ${q===e?`active`:``}" type="button" data-filter="${e}">${t} (${p(e)})</button>`)}
          <input class="input" data-search placeholder="Procurar…" value="${Oe}" style="margin-left:auto;max-width:220px">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><span class="muted" style="font-size:13px">Site:</span>${de(d,De)}</div>
        ${f.length?v`<div class="list">${f.map(e=>Fe(e,t,i))}</div>`:v`<p class="muted">Nada com esse filtro.</p>`}</div>`:v`<div class="card"><div class="empty"><span class="ic">${y(`radar`)}</span><h3>Nenhum cliente salvo ainda</h3>
          <p>Faça uma busca: os negócios que a extensão conferir aparecem aqui.</p><a class="btn btn-primary" href="#/radar/">${y(`radar`)}Buscar negócios</a></div></div>`}`)}u();function d(){let e=document.createElement(`div`);b(e,v`
      <div class="field full">
        <span>Nome do Ligador / Vendedor</span>
        <input class="input" id="new-caller-name" placeholder="Ex: João, Lucas, Maria…" style="width:100%">
        <small class="dim" style="display:block;margin-top:4px">
          Ao extrair novos leads no Google Maps, você poderá selecionar este nome para criar a lista exclusiva dele.
        </small>
      </div>
    `),I({title:`Adicionar Novo Ligador`,icon:`user`,body:e,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Salvar Ligador`,cls:`btn-primary`,icon:`check`,onClick:async()=>{let t=e.querySelector(`#new-caller-name`).value.trim();if(!t)return N(`Digite o nome do ligador.`,`error`),!1;try{return await x(`/leads/assign-caller`,{method:`POST`,body:{action:`add_caller`,caller:t}}),await i(),J=t,u(),N(`Lista do ligador "${t}" criada!`,`success`),!0}catch(e){return N(e.message,`error`),!1}}}]})}function f(){let e=s(),t=l(),r=n.filter(e=>!e.caller),a=document.createElement(`div`);b(a,v`
      <div class="form-grid" style="display:flex;flex-direction:column;gap:14px">
        <div class="field full">
          <span>Quais estabelecimentos você quer atribuir/dividir?</span>
          <select class="input" id="dist-scope" style="width:100%">
            <option value="unassigned">Apenas os clientes sem ligador (${r.length} clientes)</option>
            <option value="visible">Os clientes filtrados na tela agora (${t.length} clientes)</option>
          </select>
        </div>
        <div class="field full">
          <span>Digite o nome de 1 ligador (ou vários separados por vírgula para dividir igualmente)</span>
          <input class="input" id="dist-callers" value="${e.join(`, `)}" placeholder="Ex: João, Lucas, Maria" style="width:100%">
          <small class="dim" style="display:block;margin-top:4px">
            Se você colocar mais de um nome (ex: <code>João, Lucas</code>), o sistema divide os estabelecimentos igualmente entre eles sem repetir nenhum!
          </small>
        </div>
      </div>
    `),I({title:`Atribuir ou Dividir Clientes entre Ligadores`,icon:`layers`,body:a,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Confirmar Divisão`,cls:`btn-primary`,icon:`check`,onClick:async()=>{let e=a.querySelector(`#dist-scope`).value,n=a.querySelector(`#dist-callers`).value.split(`,`).map(e=>e.trim()).filter(Boolean);if(!n.length)return N(`Informe pelo menos um nome de ligador.`,`error`),!1;let o=(e===`unassigned`?r:t).map(e=>e.place_id);if(!o.length)return N(`Nenhum cliente nesse filtro para atribuir.`,`error`),!1;try{let e=await x(`/leads/assign-caller`,{method:`POST`,body:{action:n.length>1?`distribute`:`assign`,caller:n[0],callers:n,place_ids:o}});return await i(),u(),N(`${e.updated} clientes atribuídos com sucesso entre ${n.join(`, `)}!`,`success`),!0}catch(e){return N(e.message,`error`),!1}}}]})}async function p(e){if(!t.has_github||!t.demo_base)N(`Primeiro ligue a publicação automática (chave do GitHub) em Site exemplo.`,`error`),location.hash=`#/radar/site`;else{e.disabled=!0,b(e,v`${y(`loader`)}Aplicando 1º do Instagram e gerando sites…`);try{let e=await x(`/github/publish-all`,{method:`POST`,body:{}});Object.assign(t,e),await i(),N(e.created?`${k(e.created)} sites novos com logo e cores do Instagram (${k(e.clients)} no total). Em 1 a 2 minutos os links estão no ar.`:`Sites e logos do Instagram atualizados (${k(e.clients)} sites publicados).`,`success`)}catch(e){N(e.message,`error`)}u()}}let m=(e,t)=>{n[n.indexOf(r[e])]=t,r[e]=t};async function h(e,t){try{m(e,await x(`/leads/${encodeURIComponent(e)}/call`,{method:`POST`,body:t}))}catch(e){N(e.message,`error`)}u()}async function g(e){try{m(e,await x(`/leads/${encodeURIComponent(e)}/call`,{method:`DELETE`})),N(`Desfeito: voltou como estava.`,`success`)}catch(e){N(e.message,`error`)}u()}async function _(e,n,r){r.disabled=!0,b(r,v`${y(`loader`)}Salvando…`);try{let r=await x(`/leads/${encodeURIComponent(e)}/whats`,{method:`PUT`,body:{whats:n}});m(e,r.lead),K.delete(e),r.publish_error?N(`WhatsApp salvo, mas o site dele não atualizou: ${r.publish_error}`,`error`):N(U(r.lead,t)?`WhatsApp salvo. O site dele atualiza em 1 a 2 minutos.`:`WhatsApp salvo.`,`success`)}catch(e){N(e.message,`error`)}u()}async function S(e,t){try{Object.assign(r[e],await x(`/leads/${encodeURIComponent(e)}`,{method:`PUT`,body:t}))}catch(e){N(e.message,`error`)}}return e.addEventListener(`click`,async a=>{let o=a.target.closest(`[data-query-f]`);if(o)return Y=o.dataset.queryF,u();let s=a.target.closest(`[data-caller-f]`);if(s)return J=s.dataset.callerF,u();if(a.target.closest(`[data-add-caller]`))return d();if(a.target.closest(`[data-distribute-callers]`))return f();let c=a.target.closest(`[data-filter]`);if(c)return q=c.dataset.filter,u();let m=a.target.closest(`[data-site]`);if(m)return De=m.dataset.site,u();let S=a.target.closest(`[data-copy]`);if(S)return L(S.dataset.copy,`Telefone copiado`);let C=a.target.closest(`[data-link]`);if(C)return L(C.dataset.link,`Link do site copiado: cole no WhatsApp do cliente`);let w=a.target.closest(`[data-visita]`);if(w){let e=w.closest(`[data-id]`),t=e&&n.find(t=>t.place_id===e.dataset.id);if(t&&window.__snPonte&&window.__snPonte.novaVisita){let e=t.demo||{};window.__snPonte.novaVisita({negocio:t.name||``,whats:t.whatsapp||``,end:t.address||``,cor:e.cor||``,cor2:e.cor2||``})}return}let T=a.target.closest(`[data-gen]`);if(T)return p(T);let D=a.target.closest(`[data-auto-insta]`);if(D){D.disabled=!0,b(D,v`${y(`loader`)}Buscando…`),N(`Buscando logos e cores no Instagram para seus clientes…`,`info`);try{let e=await x(`/leads/auto-insta-all`,{method:`POST`,body:{}});N(`${e.updated} clientes atualizados com logo e cores! (${e.already_had} já tinham, ${e.not_found} não achados)`,`success`),await i(),u()}catch(e){N(e.message,`error`)}finally{D.disabled=!1,b(D,v`${y(`sparkles`)}Buscar Logos do Instagram`)}return}let O=a.target.closest(`[data-id]`),k=O&&O.dataset.id,A=a.target.closest(`[data-call]`);if(A&&A.dataset.call===`nao_quer`)return Ee.add(k),u();if(A)return h(k,{result:A.dataset.call});let j=a.target.closest(`[data-reason]`);if(j)return Ee.delete(k),h(k,{result:`nao_quer`,reason:j.dataset.reason});if(a.target.closest(`[data-undo]`))return g(k);if(a.target.closest(`[data-wa-ask]`)){K.has(k)?K.delete(k):K.add(k),u();let t=e.querySelector(`[data-id="${CSS.escape(k)}"] [data-wa-input]`);t&&t.focus();return}let P=a.target.closest(`[data-wa-save], [data-wa-same]`);if(P)return _(k,P.matches(`[data-wa-same]`)?r[k].phone:O.querySelector(`[data-wa-input]`).value,P);if(a.target.closest(`[data-csv]`)){let e=e=>(Se.find(([t])=>t===e)||[])[1]||e,n=[[`Busca Realizada`,`Tipo / Modelo`,`Ligador`,`Nome`,`Telefone (Ligar)`,`WhatsApp`,`Situação do Site`,`Site`,`Site exemplo`,`Localização no Maps`,`Enviar no WhatsApp (Mensagem + Link)`,`Instagram`,`Horário de Hoje`,`Status`,`Nota Google`,`Avaliações`,`Categoria`]];return l().forEach(r=>{let i=ke(r),a=i?X(r,t,!1):U(r,t)||``,o=fe(r,t)||``,s=r.insta?r.insta.startsWith(`http`)?r.insta:`https://instagram.com/${r.insta.replace(/^@/,``)}`:``,c=r.site_kind?r.site_kind===`Sem site`?`Não tem site`:`Só ${r.site_kind}`:`Tem site próprio`;n.push([r.query||``,i?`Clínica / Doutora`:r.modelo||`Restaurante`,r.caller||`Geral`,r.name||``,r.phone||``,r.whatsapp||``,c,r.site||``,a,r.maps||``,o,s,je(r.hours)||`Não informado`,e(r.status),V(r.rating),r.reviews??``,r.category||``])}),ne(`clientes${Y!==`todos`&&Y!==`__sem__`&&Y?`-${Y.toLowerCase().replace(/[^a-z0-9]+/g,`-`)}`:``}${J!==`todos`&&J!==`__sem__`&&J?`-${J.toLowerCase().replace(/[^a-z0-9]+/g,`-`)}`:``}-${M()}.csv`,re(n))}if(O&&a.target.closest(`[data-del]`)&&await te(`Remover ${r[k].name} dos seus clientes?`,{title:`Remover cliente`,okLabel:`Remover`,danger:!0}))try{await x(`/leads/${encodeURIComponent(k)}`,{method:`DELETE`}),n.splice(n.indexOf(r[k]),1),delete r[k],u(),E(`settings`)}catch(e){N(e.message,`error`)}}),e.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-id]`);t&&(e.target.matches(`[data-status]`)?(await S(t.dataset.id,{status:e.target.value}),u()):e.target.matches(`[data-caller]`)?(await S(t.dataset.id,{caller:e.target.value}),u()):e.target.matches(`[data-notes]`)&&await S(t.dataset.id,{notes:e.target.value}))}),e.addEventListener(`input`,t=>{if(!t.target.matches(`[data-search]`))return;Oe=t.target.value;let n=t.target.selectionStart;u();let r=e.querySelector(`[data-search]`);r.focus(),r.setSelectionRange(n,n)}),{}}var Le=/* @__PURE__ */ t({render:()=>Re});async function Re(e){let t=await C(!0);return b(e,v`
    <div class="page-head"><div><h1>${y(`sliders`)}Ajustes</h1>
      <p class="sub">Fica guardado no servidor da Star-net.</p></div></div>
    <form class="card" data-form style="max-width:760px">
      <div class="card-head"><h3>${y(`sliders`)}Busca e mensagem</h3></div>
      <div class="form-grid">
        <div class="field"><span>Nota mínima padrão</span><input name="min_rating" type="number" min="0" max="5" step="0.1" value="${t.min_rating}"></div>
        <div class="field"><span>Mínimo de avaliações</span><input name="min_reviews" type="number" min="0" step="1" value="${t.min_reviews}"></div>
        <div class="field full"><span>WhatsApp para quem não tem site <em>({nome}, {nota}, {avaliacoes}, {categoria}, {link})</em></span><textarea name="message" rows="4" class="input">${t.message}</textarea></div>
        <div class="field full"><span>WhatsApp para quem já tem site</span><textarea name="message_site" rows="4" class="input">${t.message_site}</textarea></div>
        <div class="field full"><span>Seu nome</span><input name="owner_name" value="${t.owner_name}"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="margin-top:12px">${y(`check`)}Salvar</button>
    </form>`),e.querySelector(`[data-form]`).addEventListener(`submit`,async e=>{e.preventDefault();let t=e.currentTarget;try{await x(`/settings`,{method:`PUT`,body:{min_rating:t.min_rating.value,min_reviews:t.min_reviews.value,message:t.message.value,message_site:t.message_site.value,owner_name:t.owner_name.value}}),N(`Salvo.`,`success`),E(`settings`)}catch(e){N(e.message,`error`)}}),{}}var ze=/* @__PURE__ */ t({render:()=>Ke});const Be=`radar.maps`,Ve=()=>{try{return JSON.parse(localStorage.getItem(Be)||`null`)}catch{return null}},He=e=>{try{localStorage.setItem(Be,JSON.stringify(e))}catch{}};function Ue(){let e=location.hash.split(`?`)[1];if(!e)return null;history.replaceState(null,``,`#/radar/importar`);try{return JSON.parse(new URLSearchParams(e).get(`d`)||`null`)}catch{return null}}const We=(e,t)=>v`<div class="li"><div class="grow" style="min-width:0">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${e.name}</b>${pe(e.site_kind)}
    <span class="muted" style="font-size:13px">★ ${V(e.rating)} · ${k(e.reviews)} avaliações</span>
    ${e.saved?v`<span class="badge good">${y(`check`)}Em Meus clientes</span>`:``}</div>
  <div class="dim" style="font-size:13px;margin:4px 0 8px;line-height:1.5">${e.summary}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${t}</div></div></div>`,Ge=e=>v`<a class="btn btn-secondary btn-sm" href="${e.maps}" target="_blank" rel="noopener noreferrer">${y(`external`)}Abrir no Maps</a>`;async function Ke(e){let t=await C(!0),n=Ue(),r=Ve(),i=null,a=null;if(n)try{let e=await x(`/maps`,{method:`POST`,body:n});e.mode===`list`?r={results:e.results,found:e.found}:e.results.length>1?a=e.results:(i=e.results[0]||null)&&r&&r.results.forEach(e=>{e.place_id===i.place_id&&Object.assign(e,i)}),He(r),e.results.some(e=>e.saved)&&E(`settings`)}catch(e){N(e.message,`error`)}let o=a?a.filter(e=>e.open):[],s=i?i.open?`Salvo em Meus clientes`:`Este negócio está fechado: não salvei.`:``;return b(e,v`
    <div class="page-head"><div><h1>${y(`download`)}Importar do Google Maps</h1>
      <p class="sub">Grátis: o favorito "Enviar ao Radar" lê a página do Google Maps que você abriu.</p></div></div>
    ${i?v`<div class="card" style="margin-bottom:16px">
      <div class="card-head"><h3>${y(i.open?`check-circle`:`info`)}${s}</h3></div>
      <div class="list">${We(i,W(i,t))}</div></div>`:``}
    ${a?v`<div class="card" style="margin-bottom:16px">
      <div class="card-head"><h3>${y(`check-circle`)}${k(o.length)} salvos em Meus clientes (${k(o.filter(e=>e.site_kind).length)} sem site)</h3>
        <a class="btn btn-secondary btn-sm" href="#/radar/clientes">${y(`user`)}Meus clientes</a></div>
      <p class="dim" style="font-size:13px;margin-bottom:10px">Conferidos no Google Maps: ${k(a.length)}.
        Em Meus clientes você filtra por quem tem e quem não tem site.</p>
      <div class="list">${o.map(e=>We(e,W(e,t)))}</div></div>`:``}
    ${r&&r.results.length?v`<div class="card">
      <div class="card-head"><h3>${y(`target`)}${k(r.results.length)} bem avaliados de ${k(r.found)} na lista do Maps</h3></div>
      <p class="dim" style="font-size:13px;margin-bottom:10px;line-height:1.5">A lista do Maps não mostra telefone nem site. Clique em cada
        negócio no Google Maps e no favorito de novo: ele pega o telefone e o site, e quem não tem site vai sozinho para Meus clientes.</p>
      <div class="list">${r.results.map(e=>We(e,e.phone?W(e,t):Ge(e)))}</div></div>`:i||a?``:v`<div class="card"><div class="empty"><span class="ic">${y(`radar`)}</span><h3>Nada importado ainda</h3>
          <p>Instale o favorito "Enviar ao Radar" na tela Buscar negócios e use no Google Maps.</p>
          <a class="btn btn-primary" href="#/radar/">${y(`radar`)}Ver como</a></div></div>`}`),e.addEventListener(`click`,e=>{let t=e.target.closest(`[data-copy]`);t&&L(t.dataset.copy,`Telefone copiado`)}),{}}const qe=([e,t,n])=>{let[r,i,a]=[e/255,t/255,n/255],o=Math.max(r,i,a),s=Math.min(r,i,a),c=(o+s)/2,l=o-s,u=l?l/(1-Math.abs(2*c-1)):0,d=0;return l&&(d=o===r?(i-a)/l%6:o===i?(a-r)/l+2:(r-i)/l+4),[(d*60+360)%360,u,c]},Je=e=>`#${e.map(e=>Math.round(Math.max(0,Math.min(255,e))).toString(16).padStart(2,`0`)).join(``)}`;function Ye(e,t,n){let r=(1-Math.abs(2*n-1))*t,i=r*(1-Math.abs(e/60%2-1)),a=n-r/2,[o,s,c]=e<60?[r,i,0]:e<120?[i,r,0]:e<180?[0,r,i]:e<240?[0,i,r]:e<300?[i,0,r]:[r,0,i];return Je([(o+a)*255,(s+a)*255,(c+a)*255])}function Xe(e){let t=[];for(let n of e){let e=t.find(e=>Math.hypot(e.c[0]-n[0],e.c[1]-n[1],e.c[2]-n[2])<48);e?(e.n+=1,e.c=e.c.map((t,r)=>t+(n[r]-t)/e.n)):t.push({n:1,c:n})}return t.map(e=>({...e,hsl:qe(e.c)}))}function Ze(e){let t=document.createElement(`canvas`);t.width=128,t.height=128;let n=t.getContext(`2d`,{willReadFrequently:!0});n.imageSmoothingEnabled=!1,n.drawImage(e,0,0,128,128);let r=n.getImageData(0,0,128,128).data,i=[],a=[],o=0;for(let e=0;e<r.length;e+=4){if(r[e+3]<200)continue;o+=1;let t=[r[e],r[e+1],r[e+2]],[,n,s]=qe(t);n>=.3&&s>=.18&&s<=.82?i.push(t):s<.18&&a.push(t)}let s=e=>e.n*(.5+e.hsl[1])*(1-Math.abs(e.hsl[2]-.5)),c=Xe(i).filter(e=>e.n>=o*.008).sort((e,t)=>s(t)-s(e))[0],l=Xe(a).filter(e=>e.n>=o*.03).sort((e,t)=>t.n-e.n)[0];return{cor:c?Je(c.c):``,cor2:l?Je(l.c):c?Ye(c.hsl[0],Math.min(c.hsl[1],.55),.13):``}}var Qe=/* @__PURE__ */ t({render:()=>ut});const $e={restaurante:{label:`Restaurante`,nome:`Casa Bella`,cor:`#d79c45`,cor2:`#0b0705`},pizzaria:{label:`Pizzaria`,nome:`Pizzaria Bella Napoli`,cor:`#c0392b`,cor2:`#14301f`},lanches:{label:`Lanches e hamburgueria`,nome:`Burger House`,cor:`#f59e0b`,cor2:`#1c1917`},sushi:{label:`Sushi e japonês`,nome:`Sushi Kaze`,cor:`#b91c1c`,cor2:`#111111`}};function et(e){let[t,n]=e.split(`,`),r=atob(n),i=new Uint8Array(r.length);for(let e=0;e<r.length;e+=1)i[e]=r.charCodeAt(e);return new Blob([i],{type:t.slice(5).split(`;`)[0]})}const tt={tipo:`restaurante`,nome:`Casa Bella`,cor:`#d79c45`,cor2:`#0b0705`,logo:``,whats:``,end:``,nota:`4,8`,aval:`1.250`},nt=/* @__PURE__ */ new Set;function rt(e){if(!e)return{...tt};let t=e.demo&&e.demo.tipo||e.modelo||`restaurante`,n=$e[t]||$e.restaurante,r={...tt,tipo:t,cor:n.cor,cor2:n.cor2,nome:e.name,whats:(e.whatsapp||``).replace(/\D/g,``),end:e.address||``,nota:V(e.rating),aval:k(e.reviews||0)},i=e.demo||{};return i.cor&&=`#${i.cor.replace(`#`,``)}`,i.cor2&&=`#${i.cor2.replace(`#`,``)}`,{...r,...i}}function it(e,t,n){let r=new URLSearchParams;return Object.entries(t).forEach(([e,t])=>{String(t||``).trim()&&r.set(e,String(t).replace(/^#/,``).trim())}),r.set(`por`,n||`John`),`${e.endsWith(`/`)?e:`${e}/`}?${r}`}function at(e,t,n){if(e.demo_base){let t=U(n,e);return v`<div class="card" style="margin-top:16px">
      <div class="card-head"><h3>${y(`link`)}Link para mandar ao cliente</h3><span class="badge good">${y(`check-circle`)}Endereço salvo</span></div>
      <p class="dim" style="font-size:13px;margin-bottom:10px">${t?v`Link deste cliente: <b>${t}</b>. Ele não muda quando você edita o site: o link já mandado continua valendo.`:v`Endereço do site: <b>${e.demo_base}</b>. Cada cliente ganha o link com o nome e as cores dele, e funciona mesmo com este PC desligado.`}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" type="button" data-copy-public>${y(`copy`)}${n&&e.has_github&&!t?`Publicar e copiar link`:n?`Copiar link deste cliente`:`Copiar link`}</button>
        <a class="btn btn-secondary" data-open-public target="_blank" rel="noopener noreferrer">${y(`external`)}Abrir link</a>
        <button class="btn btn-ghost" type="button" data-base-edit>Trocar endereço</button>
      </div>
      <div data-base-form hidden style="margin-top:12px">${lt(e)}</div>
      ${ot(e)}</div>`}return v`<div class="card" style="margin-top:16px">
    <div class="card-head"><h3>${y(`link`)}Link para mandar ao cliente</h3><span class="badge"><i class="dot"></i>Falta hospedar</span></div>
    <p class="dim" style="font-size:13px;line-height:1.55">Para o cliente abrir no celular dele, o site precisa estar na internet. Grátis e uma vez só, pelo GitHub Pages:</p>
    <ol class="steps" style="margin-top:8px">
      <li>Crie uma conta grátis em <a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">github.com</a>.</li>
      <li>Crie um repositório <b>público</b> chamado, por exemplo, <b>cardapio</b> (botão <b>New</b>).</li>
      <li>Nele, <b>Add file › Upload files</b> e arraste este arquivo:
        <div class="codebox" style="margin-top:6px"><code>${t}/demo/index.html</code><button class="btn-icon sm" type="button" data-copy-path="${t}/demo/index.html" title="Copiar">${y(`copy`)}</button></div>
        Depois clique em <b>Commit changes</b>.</li>
      <li>Em <b>Settings › Pages</b>, escolha a branch <b>main</b> e clique em <b>Save</b>. Em 1 a 2 minutos aparece o endereço, tipo <b>https://seunome.github.io/cardapio/</b>.</li>
      <li>Cole o endereço aqui embaixo e salve. A partir daí, o painel gera o link de cada cliente.</li>
    </ol>
    <div style="margin-top:10px">${lt(e)}</div></div>`}function ot(e){return e.has_github?v`<div class="form-section" style="margin-top:14px"><h4>${y(`upload`)}Publicação automática</h4>
      <div class="status-line ${e.demo_outdated?``:`good`}" data-gh-status>${y(e.demo_outdated?`loader`:`check-circle`)}<span>${e.demo_outdated?`O visual do site mudou: publicando no GitHub…`:`Site publicado no GitHub. Quando o visual mudar, o Radar publica sozinho.`}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-secondary btn-sm" type="button" data-gh-publish>${y(`upload`)}Publicar agora</button>
        <button class="btn btn-ghost btn-sm" type="button" data-gh-forget>Remover chave</button></div></div>`:v`<div class="form-section" style="margin-top:14px"><h4>${y(`upload`)}Publicar sozinho (opcional)</h4>
    <p class="dim" style="font-size:13px;line-height:1.55">Com uma chave do GitHub, o Radar sobe o site para você e atualiza sozinho quando o visual mudar. Uma vez só:</p>
    <ol class="steps" style="margin-top:8px">
      <li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">github.com › Settings › Developer settings › Fine-grained tokens › Generate new token</a>.</li>
      <li>Nome: <b>Radar</b>. Em <b>Repository access</b>, escolha <b>Only select repositories</b> e marque só o repositório do site.</li>
      <li>Em <b>Permissions › Repository permissions</b>, mude <b>Contents</b> para <b>Read and write</b>. Se quiser que o Radar também ligue o Pages, mude <b>Pages</b> para <b>Read and write</b>.</li>
      <li>Clique em <b>Generate token</b>, copie a chave (começa com <b>github_pat_</b>) e cole aqui. Não mande a chave para ninguém.</li>
    </ol>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:10px">
      <div class="field" style="flex:1;min-width:220px"><span>Chave do GitHub</span><input type="password" data-gh-token autocomplete="new-password" placeholder="github_pat_…"></div>
      <button class="btn btn-primary" type="button" data-gh-save>${y(`check`)}Salvar chave</button></div></div>`}async function st(e,t){let n=e.querySelector(`[data-gh-status]`);try{let e=await x(`/github/publish`,{method:`POST`,body:{}});Object.assign(t,e),N(e.pages_on?`Site publicado no GitHub. Em 1 a 2 minutos o link mostra a versão nova.`:`Arquivo enviado. Falta ligar o Pages: Settings › Pages › Branch main › Save (uma vez).`,`success`)}catch(e){N(e.message,`error`)}n&&b(n,v`${y(t.demo_outdated?`alert`:`check-circle`)}<span>${t.demo_outdated?`Não consegui publicar agora. Tente o botão Publicar agora.`:`Site publicado no GitHub. Quando o visual mudar, o Radar publica sozinho.`}</span>`)}function ct(e,t){let n=encodeURIComponent(e?e.name:``),r=e&&e.insta?`https://www.instagram.com/${e.insta}/`:`https://www.google.com/search?q=${n}+instagram`;return v`<div class="field full"><span>Logo e Cores</span>
    <div class="logo-drop" data-logo-drop>
      <span class="logo-prev" data-logo-prev></span>
      <div style="flex:1;min-width:0">
        <b style="font-size:13.5px">${e?`Cole o logo aqui (Ctrl+V) ou busque pelo Instagram`:`Escolha um cliente para colar o logo dele`}</b>
        <small style="display:block;margin-top:2px">No Instagram ou no Google: botão direito no logo › <b>Copiar imagem</b> › volte aqui e aperte Ctrl+V. Ou use o botão abaixo para escolher o perfil conferindo a foto e os seguidores.</small>
        ${e?v`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <input class="input" data-insta placeholder="@instagram do restaurante" value="${e.insta?`@${e.insta}`:``}" style="flex:1;min-width:140px;height:32px">
          <button class="btn btn-primary btn-sm" type="button" data-insta-auto title="Acha o Instagram automaticamente e já aplica o primeiro logo e cores">${y(`sparkles`)}Auto-aplicar 1º do Instagram</button>
          <button class="btn btn-secondary btn-sm" type="button" data-insta-choose title="Procura perfis no Google e Instagram para você conferir a foto e os seguidores antes de aplicar">${y(`radar`)}Escolher perfil</button></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <a class="btn btn-ghost btn-sm" href="${r}" target="_blank" rel="noopener noreferrer">${y(`external`)}Instagram</a>
          <a class="btn btn-ghost btn-sm" href="https://www.google.com/search?tbm=isch&q=${n}+logo" target="_blank" rel="noopener noreferrer">${y(`external`)}Google Imagens</a>
          <a class="btn btn-ghost btn-sm" href="${e.maps}" target="_blank" rel="noopener noreferrer">${y(`external`)}Fotos no Maps</a>
          <button class="btn btn-ghost btn-sm" type="button" data-logo-remove>${y(`x`)}Tirar logo</button></div>`:``}
      </div></div>
    <input type="hidden" data-k="logo" value="${t.logo}">
    <input class="input" data-logo-url placeholder="ou cole o endereço de uma imagem (https://…)" value="${/^https?:/i.test(t.logo)?t.logo:``}"></div>`}function lt(e){return v`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
    <div class="field" style="flex:1;min-width:220px"><span>Endereço público do site</span><input data-base value="${e.demo_base}" placeholder="https://seunome.github.io/cardapio/"></div>
    <button class="btn btn-primary" type="button" data-base-save>${y(`check`)}Salvar endereço</button></div>`}async function ut(e){let t=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`lead`)||``,[n,r,i]=await Promise.all([C(!0),x(`/leads`),x(`/health`)]),a=r.find(e=>e.place_id===t)||null;if(a&&(a.is_clinic||a.modelo===`clinica`||a.category&&/doutor|doutora|\bdra?\b|cl[ií]nica|odonto|dentist|m[eé]dic|est[eé]tic|harmoniza/i.test(a.category))){location.hash=`#/radar/site-clinica?lead=${encodeURIComponent(a.place_id)}`;return}let o=rt(a),s=(e,t,n=``)=>v`<div class="field full"><span>${t}</span><input data-k="${e}" value="${o[e]}" ${h(n)}></div>`;b(e,v`
    <div class="page-head"><div><h1>${y(`image`)}Site de exemplo</h1>
      <p class="sub">Configure antes da ligação. A prévia ao lado muda enquanto você digita.</p></div></div>
    <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      <div>
        <div class="card">
          <div class="form-grid">
            <div class="field full"><span>Cliente</span><select class="input" data-lead>
              <option value="">— Exemplo sem cliente —</option>
              ${r.slice().sort((e,t)=>e.name.localeCompare(t.name)).map(e=>v`<option value="${e.place_id}" ${e.place_id===t?h(`selected`):``}>${e.name}${e.demo&&Object.keys(e.demo).length?` ✓`:``}</option>`)}
            </select></div>
            <div class="field full"><span>Modelo</span><select class="input" data-k="tipo">
              ${Object.entries($e).map(([e,t])=>v`<option value="${e}" ${o.tipo===e?h(`selected`):``}>${t.label}</option>`)}
            </select></div>
            ${s(`nome`,`Nome do restaurante`)}
            <div class="field"><span>Cor principal <em>(botões coloridos)</em></span><input type="color" data-k="cor" value="${o.cor}"></div>
            <div class="field"><span>Cor dos botões escuros</span><input type="color" data-k="cor2" value="${o.cor2}"></div>
            ${ct(a,o)}
            ${s(`whats`,`WhatsApp do restaurante`,`placeholder="5511999998888"`)}
            ${a&&!a.whatsapp?v`<p class="badge warning" style="grid-column:1/-1;height:auto;padding:6px 10px;white-space:normal">${y(`alert`)}Telefone fixo no Google: peça o WhatsApp do restaurante antes de mostrar o pedido de teste.</p>`:``}
            <p class="muted" style="grid-column:1/-1;font-size:12.5px;margin-top:-4px">Na demonstração os botões abrem esse WhatsApp: não envie nada. Vazio, eles só mostram um aviso de exemplo.</p>
            ${s(`end`,`Endereço`)}
            <div class="field"><span>Nota no Google</span><input data-k="nota" value="${o.nota}"></div>
            <div class="field"><span>Avaliações</span><input data-k="aval" value="${o.aval}"></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
            ${a?v`<button class="btn btn-primary" type="button" data-save>${y(`check`)}${n.has_github&&n.demo_base?`Salvar e publicar`:`Salvar neste cliente`}</button>`:``}
            <a class="btn btn-secondary" data-open target="_blank" rel="noopener noreferrer">${y(`external`)}Abrir para mostrar</a>
          </div>
          <p class="muted" style="font-size:12.5px;margin-top:10px">"Abrir para mostrar" abre o site limpo numa aba nova, para compartilhar a tela na ligação.</p>
        </div>
        ${at(n,i.app_dir,a)}
      </div>
      <div style="display:flex;justify-content:center">
        <div style="width:360px;height:740px;border-radius:44px;border:10px solid #0b0705;overflow:hidden;background:#0b0705;box-shadow:0 20px 50px rgba(0,0,0,.35)">
          <iframe data-preview title="Prévia do site exemplo" style="width:100%;height:100%;border:0;background:#fff"></iframe>
        </div>
      </div>
    </div>`);let c=()=>{ie();let t=e.cloneNode(!1);e.replaceWith(t),ut(t)},l=()=>Object.fromEntries([...e.querySelectorAll(`[data-k]`)].map(e=>[e.dataset.k,e.value.trim()])),u=()=>{let e=l();return e.cor=e.cor.replace(`#`,``),e.cor2=e.cor2.replace(`#`,``),e},f=e=>{let t=l();return t.logo===`logo.png`&&(t.logo=e&&a&&a.logo_local?d().replace(/\/$/,``)+a.logo_local:``),a&&a.hours&&(t.hor=a.hours),t},p=e.querySelector(`[data-preview]`),m=null;function g(t){let r=it(d(),f(!0),n.owner_name);e.querySelector(`[data-open]`).href=r;let i=e.querySelector(`[data-open-public]`);i&&(i.href=U(a,n)||it(n.demo_base,f(!1),n.owner_name)),clearTimeout(m),m=setTimeout(()=>{p.src=r},t?0:400)}g(!0),n.demo_base&&n.has_github&&n.demo_outdated&&st(e,n);let _=e.querySelector(`[data-k="logo"]`),S=e.querySelector(`[data-logo-url]`);function w(){let t=_.value,n=t===`logo.png`?a&&a.logo_local?d().replace(/\/$/,``)+a.logo_local:``:/^https?:\/\//i.test(t)?t:``,r=e.querySelector(`[data-logo-prev]`);r.style.backgroundImage=n?`url("${n.replace(/"/g,`%22`)}")`:``,r.textContent=n?``:`logo`;let i=e.querySelector(`[data-logo-remove]`);i&&(i.hidden=!t)}w();async function T(t,r=`Logo e cores`){if(!a)return N(`Escolha o cliente primeiro.`,`error`);if(!t||!/^image\//.test(t.type))return N(`Isso não é uma imagem. No Instagram ou no Google: botão direito no logo › Copiar imagem.`,`error`);try{let i=await createImageBitmap(t),o=Math.min(1,256/Math.max(i.width,i.height)),s=document.createElement(`canvas`);s.width=Math.max(1,Math.round(i.width*o)),s.height=Math.max(1,Math.round(i.height*o)),s.getContext(`2d`).drawImage(i,0,0,s.width,s.height);let c=Ze(i);c.cor&&(e.querySelector(`[data-k="cor"]`).value=c.cor),c.cor2&&(e.querySelector(`[data-k="cor2"]`).value=c.cor2);let l=await x(`/leads/${encodeURIComponent(a.place_id)}/logo`,{method:`PUT`,body:{image:s.toDataURL(`image/png`),publish:!1}});if(Object.assign(a,l.lead),_.value=`logo.png`,S.value=``,w(),g(!0),n.has_github&&U(a,n))return oe(!1,`${r} aplicados e publicados: o link dele mostra em 1 a 2 minutos.`);Object.assign(a,await x(`/leads/${encodeURIComponent(a.place_id)}`,{method:`PUT`,body:{demo:u()}})),N(`${r} aplicados neste cliente.`,`success`)}catch(e){N(e.message||`Não consegui ler essa imagem.`,`error`)}}let D=0,O=!1,k=!1,A=e.querySelector(`[data-insta-import]`),j=e.querySelector(`[data-insta-auto]`),M=()=>{clearTimeout(D),D=0,O=!1,A&&(A.disabled=!1,b(A,v`${y(`download`)}Importar @`)),j&&(j.disabled=!1,b(j,v`${y(`sparkles`)}Auto-aplicar 1º do Instagram`))};async function P(t=!1){if(!a){t&&N(`Escolha um cliente primeiro.`,`error`);return}j&&(j.disabled=!0,b(j,v`${y(`loader`)}Aplicando 1º do Instagram…`));let r=e.querySelector(`[data-insta]`),i=r?r.value.replace(/^@/,``).trim():``;if(i&&i!==(a.insta||``))try{Object.assign(a,await x(`/leads/${encodeURIComponent(a.place_id)}`,{method:`PUT`,body:{insta:i}}))}catch{}t&&N(`Localizando 1º perfil do Instagram e extraindo cores…`,`info`);try{let t=await x(`/leads/${encodeURIComponent(a.place_id)}/auto-insta`,{method:`POST`,body:{}});if(Object.assign(a,t.lead),a.insta&&r&&(r.value=`@${a.insta}`),a.demo&&a.demo.cor){let t=e.querySelector(`[data-k="cor"]`);t&&(t.value=`#${a.demo.cor.replace(`#`,``)}`)}if(a.demo&&a.demo.cor2){let t=e.querySelector(`[data-k="cor2"]`);t&&(t.value=`#${a.demo.cor2.replace(`#`,``)}`)}_.value=`logo.png`,S.value=``,w(),g(!0),M(),N(`Logo e cores de @${t.result.handle||a.insta||a.name} aplicados automaticamente!`,`success`);return}catch(e){let r=(document.documentElement.dataset.radarExt||`0`).split(`.`).map(Number);if(r[0]>1||r[0]===1&&(r[1]||0)>=5){O=!0,k=t,window.postMessage({radar:`insta-search`,job:{name:a.name,city:n.city||``,place_id:a.place_id,handle:i||a.insta||``}},location.origin),clearTimeout(D),D=setTimeout(()=>{let e=k;M(),e&&N(`O Instagram não respondeu a tempo.`,`error`)},3e4);return}M(),t&&N(e.message,`error`)}}async function F(){let t=(document.documentElement.dataset.radarExt||`0`).split(`.`).map(Number);if(t[0]<1||t[0]===1&&(t[1]||0)<5)return N(`Atualize a extensão do Radar: ↻ em chrome://extensions e depois F5 aqui.`,`error`);try{Object.assign(a,await x(`/leads/${encodeURIComponent(a.place_id)}`,{method:`PUT`,body:{insta:e.querySelector(`[data-insta]`).value}}))}catch(e){return N(e.message,`error`)}if(!a.insta)return N(`Digite o Instagram dele (@usuario) ou use "Escolher no Instagram".`,`error`);A&&(A.disabled=!0,b(A,v`${y(`loader`)}Buscando…`)),window.postMessage({radar:`instagram`,job:{handle:a.insta,place_id:a.place_id}},location.origin),D=setTimeout(()=>{M(),N(`O Instagram não respondeu. Tente de novo.`,`error`)},45e3)}let ee=[];function te(t=``){let r=(document.documentElement.dataset.radarExt||`0`).split(`.`).map(Number);if(r[0]<1||r[0]===1&&(r[1]||0)<5)return N(`Atualize a extensão do Radar: ↻ em chrome://extensions e depois F5 aqui.`,`error`);if(!a)return N(`Escolha um cliente primeiro.`,`error`);let i=null,o=document.createElement(`div`);o.className=`insta-chooser`,b(o,v`
      <p class="dim" style="font-size:13px;margin-bottom:12px;line-height:1.5">
        O Radar procura perfis no Google e confere a foto e seguidores no Instagram para você escolher com garantia antes de aplicar no site.
      </p>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
        <input class="input" data-ic-search placeholder="Nome ou @ do restaurante" value="${t||a.name}" style="flex:1">
        <button class="btn btn-primary" type="button" data-ic-find>${y(`radar`)}Buscar</button>
      </div>
      <div data-ic-status style="margin-bottom:12px"></div>
      <div data-ic-list class="list" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>
      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:14px">
        <span class="dim" style="font-size:12.5px;display:block;margin-bottom:6px">Quer digitar ou testar outro @ diretamente?</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="input" data-ic-manual placeholder="@usuario_exato" style="flex:1;height:32px">
          <button class="btn btn-secondary btn-sm" type="button" data-ic-check-manual>${y(`check`)}Verificar @</button>
        </div>
      </div>
    `);let s=o.querySelector(`[data-ic-status]`),c=o.querySelector(`[data-ic-list]`),l=o.querySelector(`[data-ic-search]`),u=o.querySelector(`[data-ic-manual]`);function d(e,t=!1){e?b(s,v`<div class="badge ${t?``:`warning`}" style="width:100%;padding:8px 12px;display:flex;align-items:center;gap:8px">
        ${y(t?`loader`:`alert`)}<span>${e}</span>
      </div>`):s.innerHTML=``}function f(e){ee=e,e.length?b(c,v`
        ${e.length>1?v`<div style="margin-bottom:8px">
          <button class="btn btn-primary btn-sm" type="button" data-ic-select="${e[0].handle}" style="width:100%">
            ${y(`sparkles`)}Auto-aplicar 1º perfil achado (@${e[0].handle})
          </button>
        </div>`:``}
        ${e.map(e=>v`
        <div class="li" style="display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--card-bg)">
          <img src="${e.image||``}" alt="@${e.handle}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#222;flex-shrink:0;border:2px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <b style="font-size:14px">${e.name||e.handle}</b>
              <span class="badge" style="font-size:11.5px">@${e.handle}</span>
            </div>
            <div class="dim" style="font-size:12.5px;margin-top:2px">${e.fans?`${e.fans} seguidores`:`Instagram`}</div>
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-ic-select="${e.handle}">${y(`check`)}Usar este</button>
        </div>
      `)}`):b(c,v`<p class="muted" style="text-align:center;padding:16px 0;font-size:13px">Nenhum perfil encontrado para esta busca. Digite o @ exato embaixo.</p>`)}function p(e){let t=String(e||l.value||``).trim();t&&(d(`Buscando perfis no Google e Instagram…`,!0),c.innerHTML=``,window.postMessage({radar:`insta-search`,job:{name:t,city:n.city||``,place_id:a.place_id,handle:t.startsWith(`@`)?t.slice(1):``}},location.origin))}o.addEventListener(`click`,async t=>{if(t.target.closest(`[data-ic-find]`))return p(l.value);if(t.target.closest(`[data-ic-check-manual]`)){let e=u.value.replace(/^@/,``).trim();if(!e)return N(`Digite o @ que quer testar.`,`error`);d(`Conferindo @${e} no Instagram…`,!0),window.postMessage({radar:`insta-search`,job:{handle:e,place_id:a.place_id}},location.origin);return}let n=t.target.closest(`[data-ic-select]`);if(n){let t=n.dataset.icSelect,r=ee.find(e=>e.handle===t);if(!r||!r.image)return N(`Foto do perfil não disponível.`,`error`);i&&i.close();let o=e.querySelector(`[data-insta]`);o&&(o.value=`@${r.handle}`);try{Object.assign(a,await x(`/leads/${encodeURIComponent(a.place_id)}`,{method:`PUT`,body:{insta:r.handle}}))}catch{}T(et(r.image),`Logo e cores de @${r.handle}`)}}),l.addEventListener(`keydown`,e=>{e.key===`Enter`&&p(l.value)}),u.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=o.querySelector(`[data-ic-check-manual]`);e&&e.click()}});let m=e=>{if(e.source!==window||e.origin!==location.origin||!e.data||e.data.radar!==`progress`)return;let t=e.data;t.kind===`insta-candidates`&&t.place_id===a.place_id&&(t.error&&(!t.list||!t.list.length)?(d(t.error,!1),f([])):(d(``),f(t.list||[])))};window.addEventListener(`message`,m),i=I({title:`Instagram · ${a.name}`,icon:`radar`,size:`md`,body:o,actions:[{label:`Fechar`,cls:`btn-ghost`,onClick:()=>!0}],onClose:()=>{window.removeEventListener(`message`,m)}});let h=a.insta||(l.value.startsWith(`@`)?l.value.slice(1):``);h?(u.value=`@${h}`,p(h)):p(a.name)}let ne=async t=>{if(t.source!==window||t.origin!==location.origin||!t.data||t.data.radar!==`progress`)return;let n=t.data;if(n.kind===`stale`&&D)return M(),N(`A extensão foi atualizada: aperte F5 aqui e clique de novo.`,`error`);if(n.kind===`insta-candidates`&&a&&n.place_id===a.place_id&&O){let t=k;M();let r=Array.isArray(n.list)&&n.list.find(e=>e&&e.image&&/^data:image\//.test(e.image));if(!r){t&&N(n.error||`Nenhum perfil encontrado no Instagram.`,`error`);return}let i=e.querySelector(`[data-insta]`);if(i&&r.handle&&(i.value=`@${r.handle}`),r.handle)try{Object.assign(a,await x(`/leads/${encodeURIComponent(a.place_id)}`,{method:`PUT`,body:{insta:r.handle}}))}catch{}T(et(r.image),`Logo e cores de @${r.handle||a.name}`)}else if(n.kind===`instagram`&&a&&n.place_id===a.place_id){if(M(),n.error||!/^data:image\//.test(n.image||``))return N(n.error||`Não veio a foto do perfil.`,`error`);T(et(n.image),`Logo e cores do Instagram`)}};window.addEventListener(`message`,ne);let re=e=>{let t=[...e.clipboardData&&e.clipboardData.files||[]].find(e=>/^image\//.test(e.type));t&&(e.preventDefault(),T(t))};document.addEventListener(`paste`,re);let ie=()=>{document.removeEventListener(`paste`,re),window.removeEventListener(`message`,ne),clearTimeout(D)},R=e.querySelector(`[data-logo-drop]`);R.addEventListener(`dragover`,e=>{e.preventDefault(),R.classList.add(`over`)}),R.addEventListener(`dragleave`,()=>R.classList.remove(`over`)),R.addEventListener(`drop`,e=>{e.preventDefault(),R.classList.remove(`over`),e.dataTransfer.files[0]?T(e.dataTransfer.files[0]):N(`Arraste o arquivo da imagem, ou copie a imagem e aperte Ctrl+V aqui.`,`error`)}),S.addEventListener(`input`,()=>{let e=S.value.trim();(/^https?:\/\//i.test(e)||!e)&&(_.value=e||(a&&a.logo_local?`logo.png`:``)),w(),g(!1)}),a&&!a.logo_local&&!nt.has(a.place_id)&&(nt.add(a.place_id),P(!1)),e.addEventListener(`input`,e=>{e.target.matches(`[data-k]`)&&g(!1)}),e.querySelector(`[data-k="tipo"]`).addEventListener(`change`,t=>{let n=$e[t.target.value];e.querySelector(`[data-k="cor"]`).value=n.cor,e.querySelector(`[data-k="cor2"]`).value=n.cor2,a||(e.querySelector(`[data-k="nome"]`).value=n.nome),g(!0)}),e.querySelector(`[data-lead]`).addEventListener(`change`,e=>{location.hash=e.target.value?`#/radar/site?lead=${encodeURIComponent(e.target.value)}`:`#/radar/site`}),e.addEventListener(`click`,async t=>{if(t.target.closest(`[data-copy-public]`))return a&&n.has_github&&!U(a,n)?oe(!0):L(U(a,n)||it(n.demo_base,f(!1),n.owner_name),`Link copiado: cole no WhatsApp do cliente`);let r=t.target.closest(`[data-copy-path]`);if(r)return L(r.dataset.copyPath,`Caminho do arquivo copiado`);if(t.target.closest(`[data-base-edit]`))e.querySelector(`[data-base-form]`).hidden=!1;else{if(t.target.closest(`[data-insta-auto]`))return P(!0);if(t.target.closest(`[data-insta-choose]`))return te(a.insta?`@${a.insta}`:a.name);if(t.target.closest(`[data-insta-import]`))return e.querySelector(`[data-insta]`).value.trim()?F():te(a.name);if(t.target.closest(`[data-logo-remove]`)){let e=a&&a.logo_local;if(e)try{Object.assign(a,(await x(`/leads/${encodeURIComponent(a.place_id)}/logo`,{method:`DELETE`})).lead)}catch(e){return N(e.message,`error`)}return _.value=``,S.value=``,w(),g(!0),N(e?`Logo tirado do site dele.`:`Logo tirado. Clique em Salvar para valer no site.`,`success`)}if(t.target.closest(`[data-gh-publish]`))return st(e,n);if(t.target.closest(`[data-gh-save]`))try{await x(`/github`,{method:`PUT`,body:{token:e.querySelector(`[data-gh-token]`).value.trim()}}),N(`Chave salva. Publicando o site…`,`success`),c()}catch(e){N(e.message,`error`)}else if(t.target.closest(`[data-gh-forget]`))await x(`/github`,{method:`DELETE`}),N(`Chave removida deste PC.`,`success`),c();else if(t.target.closest(`[data-base-save]`))try{await x(`/settings`,{method:`PUT`,body:{demo_base:e.querySelector(`[data-base]`).value.trim()}}),E(`settings`),N(`Endereço salvo. Agora o painel gera o link de cada cliente.`,`success`),c()}catch(e){N(e.message,`error`)}else if(t.target.closest(`[data-save]`)&&a){if(n.has_github&&n.demo_base)return oe(!1);try{Object.assign(a,await x(`/leads/${encodeURIComponent(a.place_id)}`,{method:`PUT`,body:{demo:u()}})),N(`Site exemplo salvo em ${a.name}.`,`success`)}catch(e){N(e.message,`error`)}}}});let ae=!1;async function oe(e,t){if(!ae){ae=!0;try{let n=await x(`/github/publish-lead`,{method:`POST`,body:{place_id:a.place_id,demo:u()}});e?await L(n.url,`Publicado e copiado: o link entra no ar em 1 a 2 minutos`):N(t||`Salvo e publicado. A versão nova entra no ar em 1 a 2 minutos: ${n.url}`,`success`),c()}catch(e){N(e.message,`error`)}ae=!1}}return{unmount(){clearTimeout(m),ie()}}}var dt=/* @__PURE__ */ t({render:()=>ht});const ft=()=>d()+`clinica/`,Z={nome:`Clínica & Odontologia`,sub:`Harmonização Orofacial & Lentes VIP`,doutora:`Dra. Responsável`,cor:`#D4AF37`,cor2:`#070709`,logo:``,whats:`5511998760001`,end:`Av. Pres. Juscelino Kubitschek, 1455 · Itaim Bibi, São Paulo`,nota:`5,0`,aval:`2.840`,instagram:`clinicaviotto`};function pt(e){if(!e)return{...Z};let t=e.demo||{},n=e.whatsapp||e.whats||e.phone||t.whats||Z.whats;return{nome:t.nome||e.name||Z.nome,sub:t.sub||(e.category?`${e.category}`:Z.sub),doutora:t.doutora||e.doutora||e.name,cor:t.cor?t.cor.startsWith(`#`)?t.cor:`#`+t.cor:Z.cor,cor2:t.cor2?t.cor2.startsWith(`#`)?t.cor2:`#`+t.cor2:Z.cor2,logo:t.logo||e.logo||``,whats:String(n).replace(/\D/g,``),end:t.end||e.address||Z.end,nota:e.rating?String(e.rating).replace(`.`,`,`):t.nota||Z.nota,aval:e.reviews?k(e.reviews):t.aval||Z.aval,instagram:t.instagram||e.insta||e.instagram||``}}function mt(e,t,n){let r=new URLSearchParams;return Object.entries(t).forEach(([e,t])=>{String(t||``).trim()&&r.set(e,String(t).replace(/^#/,``).trim())}),r.set(`por`,n||`John`),`${e.replace(/\/+$/,``)+`/`}?${r}`}async function ht(e){let[t,n,r]=await Promise.all([C(!0),x(`/clinic/leads`).catch(()=>[]),x(`/leads`).catch(()=>[])]),i=Array.isArray(n)?n:[],a=Array.isArray(r)?r:[],o=a.filter(e=>e.is_clinic||e.modelo===`clinica`),s=[...o,...i.filter(e=>!o.some(t=>t.name===e.name))],c=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`lead`)||``,l=null;c&&(l=s.find(e=>e.place_id&&e.place_id===c||String(e.id)===c)||a.find(e=>e.place_id===c)),l||=s[0]||a[0]||null;let u=pt(l),f=(e,t,n=``,r=``)=>v`
    <div class="field full">
      <span>${t}</span>
      <input class="input" data-k="${e}" value="${u[e]}" ${h(n)}>
      ${r?v`<small class="dim" style="font-size:11.5px;margin-top:2px">${r}</small>`:``}
    </div>
  `;b(e,v`
    <div class="page-head">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span class="badge" style="background:rgba(212,175,55,0.15);color:#D4AF37;border:1px solid rgba(212,175,55,0.3)">
            ★ Estilo Clínica Viotto
          </span>
          <span class="badge good">Expo Glass Nav</span>
        </div>
        <h1>${y(`sparkles`)}Site de clínica</h1>
        <p class="sub">
          Editor e visualizador de alta conversão para Doutoras e Clínicas de Harmonização e Lentes. A prévia ao lado atualiza em tempo real.
        </p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-secondary" type="button" data-new-lead>
          ${y(`plus`)}Novo Lead de Clínica
        </button>
      </div>
    </div>

    <div style="display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));align-items:start">
      <!-- Coluna da Esquerda: Formulário e Seletor de Leads -->
      <div>
        <div class="card">
          <div class="card-head" style="margin-bottom:14px">
            <h3>${y(`user`)}Lead da Clínica Selecionado</h3>
            ${l?v`<button class="btn btn-ghost btn-sm" type="button" data-delete-lead title="Excluir este lead da clínica">${y(`trash`)}Remover lead</button>`:``}
          </div>

          <div class="form-grid">
            <div class="field full">
              <span>Selecione a Doutora ou Clínica</span>
              <select class="input" data-clinic-select style="font-weight:600">
                ${s.map(e=>v`
                  <option value="${e.place_id||e.id}" ${l&&(l.place_id?l.place_id===e.place_id:l.id===e.id)?h(`selected`):``}>
                    ${e.name} · ${e.category||(e.query?`Busca: ${e.query}`:`Clínica`)} ${e.demo&&Object.keys(e.demo).length?`✓`:``}
                  </option>
                `)}
              </select>
            </div>

            ${f(`nome`,`Nome da Clínica ou Consultório`,``,`Nome exibido no topo e rodapé do site.`)}
            ${f(`sub`,`Especialidade / Subtítulo`,``,`Ex.: Harmonização Orofacial & Lentes VIP`)}
            ${f(`doutora`,`Dra. Responsável / Especialista`,``,`Nome do profissional para o cartão de apresentação.`)}

            <div class="field">
              <span>Cor Dourada / Champagne <em>(Destaques & Botões)</em></span>
              <input type="color" data-k="cor" value="${u.cor}">
            </div>
            <div class="field">
              <span>Fundo Obsidian / Escuro</span>
              <input type="color" data-k="cor2" value="${u.cor2}">
            </div>

            <!-- Logo e Cores -->
            <div class="field full">
              <span>Logo da Clínica / Monograma</span>
              <div class="logo-drop" data-logo-drop style="background:rgba(212,175,55,0.03);border:1.5px dashed rgba(212,175,55,0.3);border-radius:16px;padding:14px">
                <span class="logo-prev" data-logo-prev style="width:52px;height:52px;border-radius:50%;border:1.5px solid rgba(212,175,55,0.4);background-size:cover;background-position:center;background-color:#111"></span>
                <div style="flex:1;min-width:0">
                  <b style="font-size:13.5px;color:#FBFBFC">${l?`Cole o logo aqui (Ctrl+V) ou copie do Instagram`:`Selecione um lead`}</b>
                  <small style="display:block;margin-top:2px;color:#A09E98">
                    No Instagram ou Google Imagens: clique com botão direito na foto/logo › <b>Copiar imagem</b> › volte aqui e aperte <b>Ctrl+V</b>.
                  </small>
                  ${l?v`
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                      <a class="btn btn-ghost btn-sm" href="https://www.instagram.com/${l.instagram||``}" target="_blank" rel="noopener noreferrer">${y(`external`)}Instagram</a>
                      <a class="btn btn-ghost btn-sm" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(l.name)}+logo" target="_blank" rel="noopener noreferrer">${y(`external`)}Google Imagens</a>
                      <button class="btn btn-ghost btn-sm" type="button" data-logo-remove>${y(`x`)}Tirar logo</button>
                    </div>
                  `:``}
                </div>
              </div>
              <input type="hidden" data-k="logo" value="${u.logo}">
              <input class="input" data-logo-url placeholder="ou cole o link direto da imagem (https://…)" value="${/^https?:/i.test(u.logo)?u.logo:``}" style="margin-top:6px">
            </div>

            ${f(`whats`,`WhatsApp da Concierge / Clínica`,`placeholder="5511998760001"`,`Número que recebe as solicitações com procedimentos formatados.`)}
            ${f(`end`,`Endereço Completo`,`placeholder="Av. Pres. Juscelino Kubitschek, 1455 · Itaim Bibi"`,`Localização que abre no GPS e no Google Maps.`)}

            <div class="field">
              <span>Nota no Google</span>
              <input class="input" data-k="nota" value="${u.nota}">
            </div>
            <div class="field">
              <span>Avaliações Google</span>
              <input class="input" data-k="aval" value="${u.aval}">
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
            ${l?v`
              <button class="btn btn-primary" type="button" data-save-lead>
                ${y(`check`)}Salvar neste Lead
              </button>
            `:``}
            <a class="btn btn-secondary" data-open-clinic target="_blank" rel="noopener noreferrer">
              ${y(`external`)}Abrir para mostrar
            </a>
            <button class="btn btn-ghost" type="button" data-copy-clinic>
              ${y(`copy`)}Copiar link deste cliente
            </button>
          </div>
          <p class="dim" style="font-size:12px;margin-top:10px">
            "Abrir para mostrar" abre o site boutique em tela cheia numa aba nova para você compartilhar a tela durante ligações ou reuniões.
          </p>
        </div>
      </div>

      <!-- Coluna da Direita: iPhone Mockup com Live Preview -->
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="position:relative;width:375px;height:780px;border-radius:50px;border:12px solid #141416;background:#070709;box-shadow:0 24px 60px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,255,255,0.15);overflow:hidden">
          <!-- Dynamic Island / Notch -->
          <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:115px;height:26px;background:#000;border-radius:20px;z-index:20;display:flex;align-items:center;justify-content:center">
            <div style="width:10px;height:10px;border-radius:50%;background:#111;margin-right:6px"></div>
            <div style="width:7px;height:7px;border-radius:50%;background:#090930"></div>
          </div>
          <!-- Live Iframe -->
          <iframe data-clinic-preview title="Prévia do Site Clínica Viotto" style="width:100%;height:100%;border:0;background:#070709"></iframe>
        </div>
        <p class="dim" style="font-size:12px;margin-top:10px;text-align:center">
          📱 <b>Prévia ao Vivo</b> · Simulação exata de navegação no iPhone com botões liquid glass.
        </p>
      </div>
    </div>
  `);let p=()=>Object.fromEntries([...e.querySelectorAll(`[data-k]`)].map(e=>[e.dataset.k,e.value.trim()])),m=()=>{let e=p();return e.logo===`logo.png`&&(e.logo=l&&l.logo_local?`${d().replace(/\/$/,``)}${l.logo_local}`:``),e},g=e.querySelector(`[data-clinic-preview]`),_=null;function S(n){let r=mt(ft(),m(),t.owner_name);e.querySelector(`[data-open-clinic]`).href=r,clearTimeout(_),_=setTimeout(()=>{g.src=r},n?0:350)}S(!0);let w=e.querySelector(`[data-k="logo"]`),T=e.querySelector(`[data-logo-url]`);function E(){let t=w.value,n=t===`logo.png`?l&&l.logo_local?`${d().replace(/\/$/,``)}${l.logo_local}`:``:/^https?:\/\//i.test(t)?t:``,r=e.querySelector(`[data-logo-prev]`);r.style.backgroundImage=n?`url("${n.replace(/"/g,`%22`)}")`:``,r.textContent=n?``:l?l.name.slice(0,2).toUpperCase():`CV`;let i=e.querySelector(`[data-logo-remove]`);i&&(i.hidden=!t)}E();async function D(t){if(!l)return N(`Selecione um lead primeiro.`,`error`);if(!t||!/^image\//.test(t.type))return N(`Isso não é uma imagem válida.`,`error`);try{let n=await createImageBitmap(t),r=Math.min(1,256/Math.max(n.width,n.height)),i=document.createElement(`canvas`);i.width=Math.max(1,Math.round(n.width*r)),i.height=Math.max(1,Math.round(n.height*r)),i.getContext(`2d`).drawImage(n,0,0,i.width,i.height);let a=Ze(n);if(a.cor&&(e.querySelector(`[data-k="cor"]`).value=a.cor),l.place_id)await x(`/leads/${encodeURIComponent(l.place_id)}/logo`,{method:`PUT`,body:{image:i.toDataURL(`image/png`)}}),l.logo_local=`/logos/${l.place_id}.png?v=${Date.now()}`,w.value=`logo.png`;else{let e=await x(`/clinic/leads/${l.id}/logo`,{method:`PUT`,body:{image:i.toDataURL(`image/png`)}});Object.assign(l,e.lead),w.value=`logo.png`}T.value=``,E(),S(!0),N(`Logo boutique aplicado na clínica com sucesso!`,`ok`)}catch(e){N(e.message||`Erro ao processar imagem do logo.`,`error`)}}e.addEventListener(`input`,e=>{e.target.dataset.k&&S(!1),e.target===T&&(w.value=T.value.trim(),E(),S(!1))});let O=e.querySelector(`[data-clinic-select]`);O.addEventListener(`change`,()=>{let e=O.value;location.hash=`#/radar/site-clinica?lead=${e}`});function k(){let e=I(v`
      <div style="padding:4px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span class="badge good">Novo Lead</span>
          <h2 style="font-size:18px">Cadastrar Clínica ou Doutora</h2>
        </div>
        <p class="dim" style="font-size:13px;margin-bottom:14px">
          Cadastre os dados de contato da clínica para criar uma demonstração VIP personalizada no estilo Viotto.
        </p>
        <div class="form-grid">
          <div class="field full">
            <span>Nome da Clínica ou Consultório *</span>
            <input class="input" id="nlName" placeholder="Ex.: Dra. Gabriela Fontana · Harmonização" required>
          </div>
          <div class="field full">
            <span>Doutora Responsável</span>
            <input class="input" id="nlDoc" placeholder="Ex.: Dra. Gabriela Fontana">
          </div>
          <div class="field full">
            <span>Especialidade Principal</span>
            <input class="input" id="nlCat" value="Harmonização Orofacial & Lentes de Contato">
          </div>
          <div class="field full">
            <span>WhatsApp da Concierge</span>
            <input class="input" id="nlWa" placeholder="5511999998888">
          </div>
          <div class="field full">
            <span>Endereço Completo</span>
            <input class="input" id="nlEnd" placeholder="Rua Oscar Freire, 1200 · Jardins, São Paulo">
          </div>
          <div class="field full">
            <span>Instagram (@)</span>
            <input class="input" id="nlIg" placeholder="dragabriela.hof">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-ghost" type="button" data-close>Cancelar</button>
          <button class="btn btn-primary" type="button" id="btnSaveNewLead">${y(`check`)}Salvar Lead</button>
        </div>
      </div>
    `);e.querySelector(`#btnSaveNewLead`).onclick=async()=>{let t=e.querySelector(`#nlName`).value.trim();if(!t)return N(`Digite o nome da clínica ou doutora.`,`error`);let n=e.querySelector(`#nlDoc`).value.trim(),r=e.querySelector(`#nlCat`).value.trim(),i=e.querySelector(`#nlWa`).value.trim(),a=e.querySelector(`#nlEnd`).value.trim(),o=e.querySelector(`#nlIg`).value.trim();try{let s=await x(`/clinic/leads`,{method:`POST`,body:{name:t,doutora:n,category:r,whatsapp:i,address:a,instagram:o,demo:{sub:r,doutora:n||t,cor:`D4AF37`,cor2:`070709`}}});e.close(),N(`Lead "${s.name}" cadastrado com sucesso!`,`success`),location.hash=`#/radar/site-clinica?lead=${s.id}`}catch(e){N(e.message,`error`)}}}let A=e=>{let t=[...e.clipboardData?.items||[]].find(e=>e.type.startsWith(`image/`));t&&(e.preventDefault(),D(t.getAsFile()))};return window.addEventListener(`paste`,A),e.addEventListener(`click`,async e=>{if(e.target.closest(`[data-new-lead]`))return k();if(e.target.closest(`[data-copy-clinic]`))return L(mt(`https://theboyxd.github.io/starnet-clinicas/`,m(),t.owner_name),`Link oficial da clínica copiado (GitHub Pages): pronto para enviar no WhatsApp`);if(e.target.closest(`[data-logo-remove]`)&&l){w.value=``,T.value=``,E(),S(!0);try{l.place_id?(await x(`/leads/${encodeURIComponent(l.place_id)}/logo`,{method:`DELETE`}),l.demo&&(l.demo.logo=``),l.logo_local=``):await x(`/clinic/leads/${l.id}`,{method:`PUT`,body:{logo:``,demo:{...l.demo,logo:``}}}),N(`Logo removido deste lead.`,`ok`)}catch(e){N(e.message,`err`)}}if(e.target.closest(`[data-save-lead]`)&&l)try{let e=p(),t={nome:e.nome,sub:e.sub,doutora:e.doutora,cor:e.cor.replace(`#`,``),cor2:e.cor2.replace(`#`,``),logo:e.logo,whats:e.whats,end:e.end,nota:e.nota,aval:e.aval,tipo:`clinica`};if(l.place_id)await x(`/leads/${encodeURIComponent(l.place_id)}`,{method:`PUT`,body:{whats:e.whats,demo:t}}),l.demo=t,N(`Configurações salvas no lead "${l.name}".`,`ok`);else{let n=await x(`/clinic/leads/${l.id}`,{method:`PUT`,body:{name:e.nome,doutora:e.doutora,whatsapp:e.whats,address:e.end,rating:parseFloat(e.nota.replace(`,`,`.`))||5,demo:t}});Object.assign(l,n),N(`Configurações salvas no lead "${l.name}".`,`ok`)}}catch(e){N(e.message,`err`)}if(e.target.closest(`[data-delete-lead]`)&&l){if(!confirm(`Tem certeza que deseja remover o lead "${l.name}"?`))return;try{l.place_id?await x(`/leads/${encodeURIComponent(l.place_id)}`,{method:`DELETE`}):await x(`/clinic/leads/${l.id}`,{method:`DELETE`}),N(`Lead "${l.name}" removido.`,`ok`),location.hash=`#/radar/site-clinica`}catch(e){N(e.message,`err`)}}}),{unmount(){clearTimeout(_),window.removeEventListener(`paste`,A)}}}var gt=/* @__PURE__ */ t({render:()=>_t});async function _t(e){b(e,v`
    <div class="page-head">
      <div>
        <h1 class="page-title">Página de pagamento</h1>
        <p class="page-sub">Personalize seu checkout inspirado na YuvexPay, integre sua API Key e hospede no GitHub Pages.</p>
      </div>
      <div class="btn-row">
        <a class="btn btn-ghost" id="btn-open-gh" href="https://theboyxd.github.io/cardapio/checkout/" target="_blank" rel="noopener">
          ${y(`external`)}Abrir no GitHub Pages
        </a>
        <button class="btn btn-primary" id="btn-publish-checkout" type="button">
          ${y(`upload`)}Publicar Checkout no GitHub
        </button>
      </div>
    </div>

    <div class="grid-2" style="display:grid;grid-template-columns:1.05fr 1fr;gap:18px;align-items:start">
      <div style="display:flex;flex-direction:column;gap:18px">
        <!-- Card 1: Chave API YuvexPay -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h3 style="margin:0;display:flex;align-items:center;gap:8px">
              ${y(`wallet`)}Conexão API YuvexPay
            </h3>
            <span class="badge" id="yvx-status-badge">Verificando...</span>
          </div>
          <p class="muted" style="font-size:13px;margin-bottom:12px">
            Cole sua chave da YuvexPay (<code>ypk_live_...</code> para produção ou <code>ypk_test_...</code> para sandbox).
            Crie em <a href="https://app.yuvexpay.com" target="_blank" rel="noopener">app.yuvexpay.com › Configurações › Chaves de API</a>.
          </p>
          <div style="display:flex;gap:8px">
            <input type="password" class="input" id="inp-yvx-key" placeholder="ypk_live_... ou ypk_test_..." style="flex:1;font-family:monospace">
            <button class="btn btn-primary" id="btn-save-yvx-key" type="button">Salvar Chave</button>
          </div>
          <div id="yvx-account-info" style="margin-top:10px;font-size:12.5px;color:var(--muted)"></div>
        </div>

        <!-- Card 2: Personalização do Produto & Aparência -->
        <div class="card">
          <h3 style="margin:0 0 12px">${y(`sliders`)}Produto e Visual do Checkout</h3>
          <form id="form-checkout-cfg" style="display:flex;flex-direction:column;gap:12px">
            <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:10px">
              <label class="field">
                <span class="field-label">Título do Produto</span>
                <input type="text" class="input" id="cfg-product-name" placeholder="Site Profissional Completo">
              </label>
              <label class="field">
                <span class="field-label">Valor Padrão (R$)</span>
                <input type="number" step="0.01" min="0.01" class="input" id="cfg-amount" placeholder="597.00">
              </label>
            </div>

            <label class="field">
              <span class="field-label">Descrição abaixo do preço</span>
              <input type="text" class="input" id="cfg-product-sub" placeholder="Site no ar, cardápio digital, botão direto do WhatsApp e destaque no Google">
            </label>

            <label class="field">
              <span class="field-label">URL de Sucesso (completionUrl opcional)</span>
              <input type="url" class="input" id="cfg-completion-url" placeholder="https://...">
            </label>

            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:4px">
              <input type="checkbox" id="cfg-embed-key">
              <span>Incluir chave restrita no checkout do GitHub Pages (permite criar cobranças direto pelo link público)</span>
            </label>

            <div style="display:flex;gap:10px;margin-top:6px">
              <button type="submit" class="btn btn-primary" style="flex:1">
                ${y(`check`)}Salvar Configurações
              </button>
              <button type="button" class="btn btn-ghost" id="btn-refresh-preview">
                ${y(`refresh`)}Atualizar Prévia
              </button>
            </div>
          </form>
        </div>

        <!-- Card 3: Gerador de Link Personalizado para Cliente -->
        <div class="card">
          <h3 style="margin:0 0 8px">${y(`link`)}Gerador de Link de Checkout para Cliente</h3>
          <p class="muted" style="font-size:12.5px;margin-bottom:12px">
            Crie um link personalizado do seu checkout no GitHub Pages com o nome da empresa e valor sob medida:
          </p>
          <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:8px;margin-bottom:10px">
            <input type="text" class="input" id="lnk-empresa" placeholder="Nome da Empresa (ex: Pizzaria Bella)">
            <input type="number" step="0.01" class="input" id="lnk-valor" placeholder="Valor (ex: 597.00)">
          </div>
          <div style="display:flex;gap:8px">
            <input type="text" class="input" id="lnk-result" readonly style="flex:1;font-family:monospace;font-size:12px">
            <button type="button" class="btn btn-primary" id="btn-copy-link">${y(`copy`)}Copiar Link</button>
          </div>
        </div>
      </div>

      <!-- Coluna Direita: Prévia Ao Vivo + Últimos Pagamentos -->
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <strong style="font-size:14px">Prévia Ao Vivo do Checkout</strong>
            <a id="lnk-local-preview" href="${d()}checkout.html?v=${Date.now()}" target="_blank" rel="noopener" style="font-size:12.5px">
              Abrir em nova aba ↗
            </a>
          </div>
          <iframe
            id="checkout-preview-frame"
            src="${d()}checkout.html?v=${Date.now()}"
            style="width:100%;height:680px;border:1px solid var(--border);border-radius:14px;background:#f2f9f7"
            title="Prévia do Checkout YuvexPay"
          ></iframe>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h3 style="margin:0">${y(`wallet`)}Pagamentos Recentes (YuvexPay)</h3>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-reload-payments">${y(`refresh`)}</button>
          </div>
          <div id="yvx-payments-list" style="font-size:13px;color:var(--muted)">
            Carregando pagamentos...
          </div>
        </div>
      </div>
    </div>
  `);let t=`https://theboyxd.github.io/cardapio/checkout/`;function n(){let n=new URL(t),r=(f(`#lnk-empresa`,e).value||``).trim(),i=(f(`#lnk-valor`,e).value||``).trim();r&&n.searchParams.set(`empresa`,r),i&&n.searchParams.set(`valor`,i),f(`#lnk-result`,e).value=n.toString()}async function r(){try{let r=await x(`/yuvexpay/account`);if(r.github_checkout_url){t=r.github_checkout_url;let n=r.github_checkout_url.includes(`?`)?`&`:`?`;f(`#btn-open-gh`,e).href=`${r.github_checkout_url}${n}v=${Date.now()}`}if(r.local_checkout_url){let t=r.local_checkout_url.includes(`?`)?`&`:`?`;f(`#lnk-local-preview`,e).href=`${r.local_checkout_url}${t}v=${Date.now()}`}let i=f(`#yvx-status-badge`,e),a=f(`#yvx-account-info`,e);r.connected?(i.textContent=r.environment===`sandbox`?`Conectado (Sandbox)`:`Conectado (Produção)`,i.style.background=`#10b98122`,i.style.color=`#34d399`,a.textContent=`Chave ativa: ${r.masked_key}`):r.has_key?(i.textContent=`Chave salva (Verifique)`,i.style.background=`#f59e0b22`,i.style.color=`#fbbf24`,a.textContent=r.error?`Aviso: ${r.error}`:`Chave salva: ${r.masked_key}`):(i.textContent=`Modo Demonstração`,i.style.background=`#64748b22`,i.style.color=`#94a3b8`,a.textContent=`Nenhuma chave configurada ainda. O checkout funciona em modo demonstração interativo até você colar sua chave ypk_.`);let o=r.checkout||{};f(`#cfg-product-name`,e).value=o.product_name||`Site Profissional Completo`,f(`#cfg-product-sub`,e).value=o.product_sub||``,f(`#cfg-amount`,e).value=o.amount==null?597:o.amount,f(`#cfg-completion-url`,e).value=o.completion_url||``,f(`#cfg-embed-key`,e).checked=o.embed_key!==!1,f(`#lnk-valor`,e).placeholder=`Valor (padrão ${o.amount||597})`,n()}catch(e){N(e.message,`err`)}}async function i(){let t=f(`#yvx-payments-list`,e);try{let e=await x(`/yuvexpay/payments`);if(!e.has_key){t.innerHTML=`Cole sua chave de API YuvexPay acima para listar suas vendas em tempo real.`;return}let n=e.payments||[];if(!n.length){t.innerHTML=`Nenhum pagamento registrado ainda neste ambiente.`;return}b(t,v`
        <div style="display:flex;flex-direction:column;gap:8px">
          ${n.slice(0,10).map(e=>v`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--border);border-radius:8px">
              <div>
                <div style="font-weight:700;color:var(--fg)">${e.description||e.txId||e.id}</div>
                <div style="font-size:11.5px;color:var(--muted)">${e.paymentMethod||`PIX`} • ${e.status}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;color:#34d399">${O(e.amount)}</div>
              </div>
            </div>
          `)}
        </div>
      `)}catch(e){t.textContent=e.message}}f(`#btn-save-yvx-key`,e).addEventListener(`click`,async()=>{let t=(f(`#inp-yvx-key`,e).value||``).trim();try{await x(`/yuvexpay/key`,{method:`POST`,body:{api_key:t}}),f(`#inp-yvx-key`,e).value=``,N(t?`Chave YuvexPay salva!`:`Chave removida.`,`ok`),await r(),await i(),f(`#checkout-preview-frame`,e).src=`${d()}checkout.html?v=${Date.now()}`}catch(e){N(e.message,`err`)}});function a(){return{product_name:f(`#cfg-product-name`,e).value,product_sub:f(`#cfg-product-sub`,e).value,amount:parseFloat(f(`#cfg-amount`,e).value||`597`),methods:[`PIX`],completion_url:f(`#cfg-completion-url`,e).value,embed_key:f(`#cfg-embed-key`,e).checked}}f(`#form-checkout-cfg`,e).addEventListener(`submit`,async t=>{t.preventDefault();try{await x(`/yuvexpay/checkout`,{method:`PUT`,body:a()}),N(`Configurações do checkout salvas!`,`ok`),f(`#checkout-preview-frame`,e).src=`${d()}checkout.html?t=${Date.now()}`,n()}catch(e){N(e.message,`err`)}}),f(`#btn-refresh-preview`,e).addEventListener(`click`,()=>{f(`#checkout-preview-frame`,e).src=`${d()}checkout.html?t=${Date.now()}`}),f(`#btn-publish-checkout`,e).addEventListener(`click`,async()=>{let r=f(`#btn-publish-checkout`,e);r.disabled=!0;try{let r=await x(`/yuvexpay/publish`,{method:`POST`,body:{checkout:a()}});N(`Checkout publicado no GitHub Pages: ${r.url}`,`ok`),r.url&&(t=r.url,f(`#btn-open-gh`,e).href=r.url,n())}catch(e){N(e.message,`err`)}finally{r.disabled=!1}}),[`#lnk-empresa`,`#lnk-valor`].forEach(t=>{f(t,e).addEventListener(`input`,n),f(t,e).addEventListener(`change`,n)}),f(`#btn-copy-link`,e).addEventListener(`click`,async()=>{let t=f(`#lnk-result`,e).value;try{await navigator.clipboard.writeText(t),N(`Link do checkout copiado!`,`ok`)}catch{f(`#lnk-result`,e).select(),document.execCommand(`copy`),N(`Link copiado!`,`ok`)}}),f(`#btn-reload-payments`,e).addEventListener(`click`,i),await r(),await i()}var vt=/* @__PURE__ */ t({render:()=>yt});async function yt(e){let t=[],n=[],r=[],i={connected:!1,account:null,runs:[]},a={accounts:[],total:0,active_count:0,exhausted_count:0},o={running:!1,status:`idle`,message:``},s={running:!1,status:`idle`,message:``},c=`Geral`,l=`todos`,u=``,f=null,p=`restaurante, pizzaria`,m=`Porto Alegre, RS`,h=100,g=`auto`,_=`todos`,S=`todos`,C=!0,w=1,T=async()=>{try{let e=S===`todos`?``:`&has_website=${encodeURIComponent(S)}`,[i,a,u,d,f]=await Promise.all([x(`/email/leads?list_name=${encodeURIComponent(c)}&status=${l}${e}`),x(`/email/lists`),x(`/email/templates`),x(`/email/apify/extract-status`),x(`/email/campaigns/status`)]);t=i,n=a,r=u,o=d,s=f,r.length&&!r.some(e=>e.id===w)&&(w=r[0].id)}catch(e){N(e.message,`error`)}},E=async()=>{try{let[e,t]=await Promise.all([x(`/email/apify/accounts`),x(`/email/apify/account`)]);a=e||{accounts:[],total:0,active_count:0,exhausted_count:0},i=t||{connected:!1,account:null,runs:[]}}catch{}};await Promise.all([T(),E()]);function D(){let f=u.toLowerCase().trim(),x=t.filter(e=>!f||e.email&&e.email.toLowerCase().includes(f)||e.username&&e.username.toLowerCase().includes(f)||e.full_name&&e.full_name.toLowerCase().includes(f)||e.category&&e.category.toLowerCase().includes(f)||e.city&&e.city.toLowerCase().includes(f)),T=n.reduce((e,t)=>e+(t.total||0),0),E=n.find(e=>e.name.toLowerCase()===c.toLowerCase())||{name:c,total:t.length,novo:t.filter(e=>e.status===`novo`).length,enviado:t.filter(e=>e.status===`enviado`).length,sem_site:t.filter(e=>!e.has_website).length,com_site:t.filter(e=>!!e.has_website).length,sem_site_novos:t.filter(e=>!e.has_website&&e.status===`novo`).length},D=s.status===`running`,A=s.status===`paused`,j=(a.active_count||0)>0,M=a.total||0,N=`Conectar Contas Apify`,P=`btn-primary`;j?(N=`Contas Apify (${a.active_count}/${M} ativas)`,P=`btn-secondary`):M>0&&(N=`⚠️ Contas Apify (${M} sem créditos)`,P=`btn-danger`),b(e,v`
      <div class="page-head">
        <div>
          <h1>${y(`user`)}Contatos do Instagram</h1>
          <p class="sub">Extraia e-mails direto do seu App, separe em listas e inicie o disparo sem enviar 2x para a mesma empresa.</p>
        </div>
        <div class="head-actions">
          <button class="btn ${P}" id="btn-apify-key" title="Gerenciar Pool de Contas Apify">
            ${y(`key`)}${N}
          </button>
          ${M>0?v`
            <button class="btn btn-secondary" id="btn-apify-runs">${y(`download`)}Minhas Extrações Apify (${(i.runs||[]).length})</button>
          `:``}
          <button class="btn btn-ghost" id="btn-import-file">${y(`upload`)}Importar CSV/JSON</button>
          <input type="file" id="file-input" accept=".csv,.json" style="display:none">
        </div>
      </div>

      <!-- 1. BARRA DE LISTAS DE E-MAIL SEPARADAS (ANTI-DUPLICIDADE) -->
      <div class="card" style="margin-bottom:16px;border:1px solid rgba(215,156,69,0.3);background:rgba(215,156,69,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <b style="font-size:14.5px;color:var(--brand)">📂 Listas de E-mail Separadas</b>
            <span class="badge good" style="margin-left:8px;font-size:11.5px">🛡️ Proteção Ativa: Mesma empresa nunca repete entre listas</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" id="btn-new-list">${y(`plus`)}Nova Lista de E-mail</button>
            ${c!==`todas`&&c!==`Geral`?v`
              <button class="btn btn-ghost btn-sm" id="btn-del-list" title="Excluir esta lista">${y(`trash`)}Excluir Lista</button>
            `:``}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="chip ${c===`todas`?`active`:``}" data-list-tab="todas">
            Todas as Listas (${T})
          </button>
          ${n.map(e=>v`
            <button class="chip ${c.toLowerCase()===e.name.toLowerCase()?`active`:``}" data-list-tab="${e.name}">
              📂 ${e.name} (${e.total||0} · ${e.novo||0} novos)
            </button>
          `)}
        </div>
      </div>

      <!-- 2. GRADE DE CONTROLE DIRETO: EXTRAÇÃO APIFY + DISPARO IMEDIATO DA LISTA -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:16px">
        <!-- Card Esquerdo: Extrair E-mails Direto pelo App -->
        <div class="card" style="border:1px solid ${o.running?`#10b981`:`var(--border)`}">
          <div class="card-head" style="margin-bottom:10px">
            <div>
              <h3>${y(`radar`)}1. Extrair Novos E-mails Direto no App</h3>
              <small class="dim" style="font-size:11.5px;display:block;margin-top:2px">
                🛡️ <b>Anti-Desperdício:</b> Não repete estabelecimentos que você já tem na lista (poupa créditos da Apify).
              </small>
            </div>
            <span class="badge ${j?`good`:M>0?`danger`:`warning`}">
              ${j?`Via Apify API (${a.active_count} ativas)`:M>0?`⚠️ Todas contas sem créditos ($5)`:`Busca Direta (ou conecte Apify)`}
            </span>
          </div>

          <div class="form-grid" style="display:flex;flex-direction:column;gap:10px">
            <div class="field full">
              <span>Ferramenta de Extração (Salvas na sua Conta Apify)</span>
              <select class="input" id="ext-actor" style="width:100%">
                <option value="auto" ${g===`auto`?`selected`:``}>⚡ Modo Combinado Automático (Recomendado: Google Sniper + Instagram Email Scraper + Sites)</option>
                <option value="apify~google-search-scraper" ${g===`apify~google-search-scraper`?`selected`:``}>1. Instagram & Facebook Email Sniper (apify/google-search-scraper)</option>
                <option value="bhansalisoft~instagram-email-scraper" ${g===`bhansalisoft~instagram-email-scraper`?`selected`:``}>2. Instagram Email Scraper Direto (bhansalisoft/instagram-email-scraper)</option>
                <option value="easy_scraper~mass-instagram-email-scraper" ${g===`easy_scraper~mass-instagram-email-scraper`?`selected`:``}>3. Mass Instagram Email Scraper (easy_scraper/mass-instagram-email-scraper)</option>
                <option value="apify~instagram-scraper" ${g===`apify~instagram-scraper`?`selected`:``}>4. Instagram Scraper Oficial - Perfis & Bios (apify/instagram-scraper)</option>
                <option value="lukaskrivka~google-maps-with-contact-details" ${g===`lukaskrivka~google-maps-with-contact-details`?`selected`:``}>5. Google Maps Email & Contact Extractor (lukaskrivka/google-maps)</option>
                <option value="afanasenko~instagram-profile-scraper" ${g===`afanasenko~instagram-profile-scraper`?`selected`:``}>6. Instagram Profile & Email Scraper (afanasenko/instagram-profile-scraper)</option>
                <option value="memo23~instagram-email-phone-scraper" ${g===`memo23~instagram-email-phone-scraper`?`selected`:``}>7. Instagram Phone and Email Scraper (memo23/instagram-email-phone-scraper)</option>
                <option value="apify~instagram-profile-scraper" ${g===`apify~instagram-profile-scraper`?`selected`:``}>8. Instagram Profile Scraper Oficial (apify/instagram-profile-scraper)</option>
                <option value="local~leads-website-scraper" ${g===`local~leads-website-scraper`?`selected`:``}>9. Extrair E-mails dos Sites dos Meus Clientes (Grátis / Local)</option>
              </select>
            </div>

            <div class="field full">
              <span>Filtro de Site na Extração</span>
              <select class="input" id="ext-filter-web" style="width:100%">
                <option value="todos" ${_===`todos`?`selected`:``}>Salvar todos (classificar quem tem e quem não tem site)</option>
                <option value="sem_site" ${_===`sem_site`?`selected`:``}>🎯 Salvar APENAS empresas SEM site próprio (Alvo ideal)</option>
              </select>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="field">
                <span>Nicho / Segmento</span>
                <input class="input" id="ext-terms" value="${p}" placeholder="restaurante, pizzaria" style="width:100%">
              </div>
              <div class="field">
                <span>Cidade / Região</span>
                <input class="input" id="ext-city" value="${m}" placeholder="Porto Alegre, RS" style="width:100%">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end">
              <div class="field">
                <span>Salvar na Lista</span>
                <input class="input" id="ext-list-target" value="${c===`todas`?`Geral`:c}" style="width:100%;font-weight:600">
              </div>
              <div class="field">
                <span>Meta de Novos E-mails</span>
                <input class="input" id="ext-limit" type="number" min="10" max="1000" step="10" value="${h}" style="width:100%">
                <small class="dim" style="font-size:11px;display:block;margin-top:2px">Meta de e-mails inéditos (empresas já salvas são ignoradas e poupam créditos).</small>
              </div>
            </div>

            <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
              ${o.running?v`
                <button class="btn btn-ghost" id="btn-stop-extract" style="width:100%;justify-content:center;border-color:#ef4444;color:#ef4444">
                  ${y(`stop`)}Parar Extração em Andamento
                </button>
              `:v`
                <button class="btn btn-primary" id="btn-start-extract" style="width:100%;justify-content:center">
                  ${y(`radar`)}Extrair E-mails Agora para "${c===`todas`?`Geral`:c}"
                </button>
              `}
            </div>

            ${o.message&&o.status!==`idle`?v`
              <div id="ext-status-box" style="padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);font-size:12.5px">
                <div style="display:flex;align-items:center;gap:6px;font-weight:600;color:${o.running?`#10b981`:`var(--ez-tx)`}">
                  <span id="ext-spinner" style="display:inline-flex;animation:${o.running?`spin 1.5s linear infinite`:`none`}">${y(o.running?`loader`:`info`)}</span>
                  <span id="ext-status-msg">${o.message}</span>
                </div>
                <div id="ext-progress-wrap" style="margin-top:8px;${o.running?``:`display:none`}">
                  <div style="height:7px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden">
                    <div id="ext-progress-bar" style="height:100%;background:linear-gradient(90deg,#10b981,#34d399);width:${o.progress_percent||0}%;transition:width 0.3s ease"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:11px" class="dim">
                    <span>⚡ Progresso em tempo real (Nunca trava)</span>
                    <span id="ext-live-count" style="font-weight:700;color:var(--brand)">${o.found||0} / ${o.target_limit||h} e-mails</span>
                  </div>
                </div>
                ${o.conflicts&&o.conflicts.length?v`
                  <div class="dim" style="margin-top:6px;font-size:11.5px">
                    🛡️ <b>Empresas bloqueadas por já estarem em outra lista:</b>
                    ${o.conflicts.slice(0,4).map(e=>`${e.company} (${e.owner_list})`).join(` · `)}
                  </div>
                `:``}
              </div>
            `:``}
          </div>
        </div>

        <!-- Card Direito: Iniciar Disparo Direto da Lista Selecionada -->
        <div class="card" style="border:1px solid ${D?`#10b981`:A?`#f59e0b`:`var(--border)`}">
          <div class="card-head" style="margin-bottom:10px">
            <h3>${y(`send`)}2. Disparar E-mails desta Lista</h3>
            <span class="badge ${D?`good`:A?`warning`:``}">
              <i class="dot"></i>${D?`Disparando agora`:A?`Pausado`:`Pronto para disparar`}
            </span>
          </div>

          <div class="form-grid" style="display:flex;flex-direction:column;gap:10px">
            <div class="field full">
              <span>Lista Selecionada para Disparo</span>
              <div style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);font-size:13px;display:flex;justify-content:space-between;align-items:center">
                <b>📂 ${c===`todas`?`Todas as Listas`:c}</b>
                <span class="badge good">${C?E.sem_site_novos||0:E.novo||0} novos na fila</span>
              </div>
            </div>

            <div class="field full">
              <span>Modelo de E-mail (João Pedro Culau)</span>
              <select class="input" id="quick-tpl-select" style="width:100%">
                ${r.map(e=>v`<option value="${e.id}" ${e.id===w?`selected`:``}>${e.title}</option>`)}
              </select>
            </div>

            <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;cursor:pointer;background:rgba(16,185,129,0.08);padding:9px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.25);margin-top:2px">
              <input type="checkbox" id="quick-only-no-site" ${C?`checked`:``} style="width:17px;height:17px;accent-color:#10b981;cursor:pointer">
              <span>🎯 Enviar SOMENTE para quem NÃO tem site próprio (${E.sem_site_novos||0} na fila)</span>
            </label>
            <small class="dim" style="font-size:11.5px;line-height:1.4">
              🛡️ Protege sua credibilidade: o e-mail <i>"Vi que a empresa ainda não tem um site..."</i> nunca será enviado para quem já tem site institucional.
            </small>

            ${!D&&!A?v`
              <button class="btn btn-primary" id="btn-quick-dispatch" style="width:100%;justify-content:center;margin-top:4px">
                ${y(`send`)}Iniciar Disparo para "${c===`todas`?`Todas as Listas`:c}"
              </button>
            `:v`
              <div style="padding:10px 12px;border-radius:8px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.25);font-size:12.5px">
                <div style="margin-bottom:6px"><b>Status:</b> ${s.message}</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px" class="dim">
                  <span>Enviados: <b style="color:#10b981">${s.sent||0}</b> / <b>${s.total||0}</b></span>
                  <span>Atual: <b>${s.current_lead||`-`}</b></span>
                </div>
                <div style="display:flex;gap:8px">
                  ${D?v`<button class="btn btn-secondary btn-sm" id="btn-quick-pause">${y(`pause`)}Pausar</button>`:``}
                  ${A?v`<button class="btn btn-primary btn-sm" id="btn-quick-resume">${y(`send`)}Retomar</button>`:``}
                  <button class="btn btn-ghost btn-sm" id="btn-quick-stop">${y(`stop`)}Parar</button>
                </div>
              </div>
            `}
            <small class="dim" style="font-size:11.5px">
              🛡️ O sistema bloqueia automaticamente qualquer envio repetido para a mesma empresa, mesmo que ela tenha mais de um e-mail.
            </small>
          </div>
        </div>
      </div>

      <!-- 3. TABELA DE LEADS DA LISTA SELECIONADA -->
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
          <button class="chip ${l===`todos`?`active`:``}" data-f="todos">Todos (${t.length})</button>
          <button class="chip ${l===`novo`?`active`:``}" data-f="novo">Novos (${t.filter(e=>e.status===`novo`).length})</button>
          <button class="chip ${l===`enviado`?`active`:``}" data-f="enviado">Enviados (${t.filter(e=>e.status===`enviado`).length})</button>
          <button class="chip ${l===`duplicado`?`active`:``}" data-f="duplicado">Duplicados (${t.filter(e=>e.status===`duplicado`).length})</button>
          <button class="chip ${l===`erro`?`active`:``}" data-f="erro">Erros (${t.filter(e=>e.status===`erro`).length})</button>

          <div style="display:inline-flex;gap:4px;padding:3px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid var(--border)">
            <button class="chip ${S===`todos`?`active`:``}" data-web="todos" style="font-size:11.5px">Todos Sites</button>
            <button class="chip ${S===`sem_site`?`active`:``}" data-web="sem_site" style="font-size:11.5px;${S===`sem_site`?`background:rgba(16,185,129,0.2);border-color:#10b981;color:#10b981;font-weight:700`:``}">🎯 Sem Site Próprio (${E.sem_site||0})</button>
            <button class="chip ${S===`com_site`?`active`:``}" data-web="com_site" style="font-size:11.5px">🌐 Com Site (${E.com_site||0})</button>
          </div>

          <input class="input" id="input-search" placeholder="Buscar empresa, e-mail, @instagram…" value="${u}" style="margin-left:auto;max-width:250px">
          ${t.length?v`<button class="btn btn-ghost btn-sm" id="btn-clear-leads" title="Limpar leads desta lista">${y(`trash`)}Limpar Lista</button>`:``}
        </div>

        ${x.length?v`
          <div class="list" style="display:flex;flex-direction:column;gap:8px">
            ${x.map(e=>v`
              <div class="li" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg)">
                ${e.profile_pic?v`<img src="${String(e.profile_pic).startsWith(`/logos/`)?d().replace(/\/$/,``)+e.profile_pic:e.profile_pic}" alt="@${e.username}" referrerpolicy="no-referrer" data-some-se-falhar style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(215,156,69,0.35);flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.25)">`:v`<div style="width:40px;height:40px;border-radius:50%;background:rgba(215,156,69,0.15);border:1px solid rgba(215,156,69,0.3);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--brand);flex-shrink:0;font-size:15px">${(e.full_name||e.username||`@`).charAt(0).toUpperCase()}</div>`}
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <b style="font-size:14px;color:var(--ez-tx)">${e.full_name||e.username||`Empresa`}</b>
                    <span style="font-size:13px;color:var(--brand);font-weight:600">${e.email}</span>
                    ${e.username?v`<a class="badge" href="https://instagram.com/${e.username}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">@${e.username} ${y(`external`)}</a>`:``}
                    <span class="badge" style="font-size:11px">📂 ${e.list_name||`Geral`}</span>
                    <span class="badge ${e.status===`enviado`?`good`:e.status===`erro`||e.status===`duplicado`?`warning`:``}">${e.status}</span>
                    ${e.has_website?v`
                      <span class="badge warning" style="font-size:11px;background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid rgba(245,158,11,0.25)">
                        🌐 Tem site: <a href="${e.website}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">${(e.website||``).replace(/^https?:\/\/(www\.)?/,``).slice(0,24)}</a>
                      </span>
                    `:v`
                      <span class="badge good" style="font-size:11px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)">
                        🎯 Sem site próprio (${e.website_kind||`Sem site`})
                      </span>
                    `}
                  </div>
                  <div class="dim" style="font-size:12.5px;margin-top:3px;display:flex;gap:10px;flex-wrap:wrap">
                    <span>[Nome]: <b>${e.first_name||`-`}</b></span>
                    ${e.followers?v`<span>· <b>${k(e.followers)}</b> seguidores</span>`:``}
                    ${e.category?v`<span>· ${e.category}</span>`:``}
                    ${e.city?v`<span>· ${e.city}</span>`:``}
                  </div>
                  ${e.error_message?v`<div style="color:#ef4444;font-size:12px;margin-top:2px">${e.error_message}</div>`:``}
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn-icon sm" data-copy-email="${e.email}" title="Copiar e-mail">${y(`copy`)}</button>
                  <button class="btn-icon sm" data-del-lead="${e.id}" title="Excluir">${y(`trash`)}</button>
                </div>
              </div>
            `)}
          </div>
        `:v`
          <div class="empty" style="text-align:center;padding:36px 10px">
            <span class="ic">${y(`radar`)}</span>
            <h3>Esta lista ainda está vazia</h3>
            <p class="dim" style="font-size:13px;max-width:480px;margin:8px auto">
              Use o painel <b>"1. Extrair Novos E-mails Direto no App"</b> acima (ou clique em <b>Minhas Extrações Apify</b>) para preencher a lista <b>${c}</b> automaticamente.
            </p>
          </div>
        `}
      </div>
    `),O()}function O(){let t=e.querySelector(`#file-input`);t&&(t.onchange=()=>{t.files[0]&&A(t.files[0])});let n=e.querySelector(`#input-search`);n&&(n.oninput=t=>{u=t.target.value;let n=t.target.selectionStart;D();let r=e.querySelector(`#input-search`);r&&(r.focus(),r.setSelectionRange(n,n))});let r=e.querySelector(`#ext-terms`);r&&(r.oninput=e=>{p=e.target.value});let i=e.querySelector(`#ext-city`);i&&(i.oninput=e=>{m=e.target.value});let a=e.querySelector(`#ext-limit`);a&&(a.oninput=e=>{h=parseInt(e.target.value||`100`,10)});let o=e.querySelector(`#ext-actor`);o&&(o.onchange=e=>{g=e.target.value});let s=e.querySelector(`#ext-filter-web`);s&&(s.onchange=e=>{_=e.target.value});let c=e.querySelector(`#quick-only-no-site`);c&&(c.onchange=e=>{C=e.target.checked,D()});let l=e.querySelector(`#quick-tpl-select`);l&&(l.onchange=e=>{w=parseInt(e.target.value,10)})}e.addEventListener(`click`,async t=>{let n=t.target.closest(`[data-list-tab]`);if(n)return c=n.dataset.listTab,await T(),D();let r=t.target.closest(`[data-f]`);if(r)return l=r.dataset.f,await T(),D();let i=t.target.closest(`[data-web]`);if(i)return S=i.dataset.web,await T(),D();if(t.target.closest(`#btn-new-list`))return j();if(t.target.closest(`#btn-del-list`)){if(!confirm(`Deseja excluir a lista "${c}" e os leads dela?`))return;try{await x(`/email/lists`,{method:`POST`,body:{action:`delete`,name:c,delete_leads:!0}}),c=`Geral`,await T(),D(),N(`Lista removida.`,`info`)}catch(e){N(e.message,`error`)}return}if(t.target.closest(`#btn-apify-key`))return P();if(t.target.closest(`#btn-apify-runs`))return F();if(t.target.closest(`#btn-import-file`)){let t=e.querySelector(`#file-input`);t&&t.click();return}if(t.target.closest(`#btn-start-extract`)){let t=(e.querySelector(`#ext-terms`)?.value||p).trim(),n=(e.querySelector(`#ext-city`)?.value||m).trim(),r=parseInt(e.querySelector(`#ext-limit`)?.value||`100`,10),i=e.querySelector(`#ext-actor`)?.value||g||`auto`,a=e.querySelector(`#ext-filter-web`)?.value||_||`todos`,s=(e.querySelector(`#ext-list-target`)?.value||(c===`todas`?`Geral`:c)).trim()||`Geral`;if(!t&&i!==`local~leads-website-scraper`)return N(`Digite o nicho para buscar (ex: restaurante, pizzaria).`,`error`);try{let e=await x(`/email/apify/extract`,{method:`POST`,body:{terms:t,city:n,limit:r,list_name:s,actor_id:i,filter_website:a}});c=s,o=e.state,N(e.message,`success`),await T(),D()}catch(e){N(e.message,`error`)}return}if(t.target.closest(`#btn-stop-extract`)){try{o=await x(`/email/apify/stop`,{method:`POST`,body:{}}),N(`Extração interrompida.`,`info`),D()}catch(e){N(e.message,`error`)}return}if(t.target.closest(`#btn-quick-dispatch`)){let t=parseInt(e.querySelector(`#quick-tpl-select`)?.value||String(w),10),n=e.querySelector(`#quick-only-no-site`)?e.querySelector(`#quick-only-no-site`).checked:C;try{let e=await x(`/email/campaigns/quick-start`,{method:`POST`,body:{target_list:c,template_id:t,only_no_website:n}});s=e.state,N(e.message,`success`),await T(),D()}catch(e){N(e.message,`error`)}return}if(t.target.closest(`#btn-quick-pause`)){s=await x(`/email/campaigns/pause`,{method:`POST`,body:{}}),D();return}if(t.target.closest(`#btn-quick-resume`)){s=await x(`/email/campaigns/resume`,{method:`POST`,body:{}}),D();return}if(t.target.closest(`#btn-quick-stop`)){if(!confirm(`Parar o disparo atual?`))return;s=await x(`/email/campaigns/stop`,{method:`POST`,body:{}}),D();return}let a=t.target.closest(`[data-copy-email]`);if(a)return L(a.dataset.copyEmail,`E-mail copiado!`);let u=t.target.closest(`[data-del-lead]`);if(u)try{await x(`/email/leads/${u.dataset.delLead}`,{method:`DELETE`}),N(`Lead excluído.`,`info`),await T(),D()}catch(e){N(e.message,`error`)}else if(t.target.closest(`#btn-clear-leads`)){let e=c===`todas`?`TODAS as listas`:`a lista "${c}"`;if(!confirm(`Deseja realmente limpar os leads de ${e}?`))return;try{await x(`/email/leads?list_name=${encodeURIComponent(c)}`,{method:`DELETE`}),N(`Lista limpa.`,`info`),await T(),D()}catch(e){N(e.message,`error`)}}});async function A(e){let t=c===`todas`?`Geral`:c;N(`Importando ${e.name} para a lista "${t}"…`,`info`);let n=new FileReader;n.onload=async()=>{try{let r=await x(`/email/leads/import-file`,{method:`POST`,body:{filename:e.name,content:n.result,list_name:t}});N(`${r.total_imported} novos leads salvos em "${t}" (${r.skipped_duplicates||0} ignorados por já existirem em outra lista/empresa)!`,`success`),await T(),D()}catch(e){N(`Erro ao importar: `+e.message,`error`)}},n.readAsText(e)}function j(){let e=document.createElement(`div`);b(e,v`
      <div class="field full">
        <span>Nome da Nova Lista de E-mail</span>
        <input class="input" id="modal-list-name" placeholder="Ex: Restaurantes Porto Alegre, Pizzarias RS, Lista Semana 1…" style="width:100%">
        <small class="dim" style="display:block;margin-top:6px">
          🛡️ Ao importar ou extrair leads para esta lista, o sistema verificará automaticamente todas as outras listas para garantir que a mesma empresa nunca seja adicionada duas vezes.
        </small>
      </div>
    `),I({title:`Criar Nova Lista de E-mail`,icon:`plus`,body:e,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Criar Lista`,cls:`btn-primary`,icon:`check`,onClick:async()=>{let t=e.querySelector(`#modal-list-name`).value.trim();if(!t)return N(`Digite o nome da lista.`,`error`),!1;try{return await x(`/email/lists`,{method:`POST`,body:{action:`create`,name:t}}),c=t,await T(),D(),N(`Lista "${t}" criada!`,`success`),!0}catch(e){return N(e.message,`error`),!1}}}]})}function M(){let e=document.createElement(`div`),t=()=>{let n=a.accounts||[],r=a.total||0,i=a.active_count||0;b(e,v`
        <div style="background:rgba(215,156,69,0.08);border:1px solid rgba(215,156,69,0.3);border-radius:8px;padding:12px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;color:var(--brand);margin-bottom:4px;font-size:13.5px">
            ${y(`radar`)} Pool Inteligente: Rotação Automática de Contas Apify
          </div>
          <p class="dim" style="font-size:12px;line-height:1.5;margin:0">
            Cada conta gratuita da Apify oferece <b>$5 USD/mês</b>. Conecte múltiplas contas aqui. Quando os créditos de uma esgotarem, o extrator <b>passa automaticamente para a próxima conta</b>, garantindo extração contínua e sem interrupções!
          </p>
        </div>

        <!-- ADICIONAR NOVA CONTA -->
        <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:16px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;border:1px solid var(--border)">
          <div style="flex:1">
            <span style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Adicionar Token de Outra Conta Apify:</span>
            <input class="input" id="pool-new-token" type="password" placeholder="apify_api_xxxxxxxxxxxxxxxxxxxx" style="width:100%;font-size:12.5px">
            <small class="dim" style="font-size:11px;display:block;margin-top:4px">
              Gere em: <i>console.apify.com › Settings › Integrations › Personal API tokens</i>
            </small>
          </div>
          <button class="btn btn-primary" id="btn-add-account" style="white-space:nowrap;margin-bottom:18px">
            ${y(`plus`)} Conectar Conta
          </button>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <b style="font-size:13px">
            Contas Conectadas (${i} ativas de ${r})
          </b>
          <button class="btn btn-ghost btn-sm" id="btn-refresh-all-accounts" style="font-size:11.5px">
            ${y(`refresh`)} Atualizar Saldos Live
          </button>
        </div>

        ${n.length===0?v`
          <div style="text-align:center;padding:24px;border:1px dashed var(--border);border-radius:8px">
            <p class="dim" style="font-size:12.5px">Nenhuma conta conectada ainda. Cole um token acima para adicionar ao pool.</p>
          </div>
        `:v`
          <div style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;padding-right:4px">
            ${n.map(e=>{let t=e.status===`active`,n=e.status===`exhausted`,r=Number(e.usage_usd||0).toFixed(2),i=Number(e.limit_usd||5).toFixed(2),a=Math.max(0,i-r).toFixed(2),o=Math.min(100,Math.round(r/(i||5)*100)),s=v`<span class="badge warning" style="font-size:11px">⚠️ Inválida</span>`;return t?s=v`<span class="badge good" style="font-size:11px;font-weight:600">🟢 Ativa · $${a} disp.</span>`:n&&(s=v`<span class="badge danger" style="font-size:11px;font-weight:600">🔴 Créditos Esgotados ($5)</span>`),v`
                <div style="background:rgba(255,255,255,0.02);border:1px solid ${t?`rgba(46,204,113,0.35)`:n?`rgba(231,76,60,0.35)`:`var(--border)`};border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                    <div style="display:flex;align-items:center;gap:8px">
                      <b style="font-size:13.5px">@${e.username||`Conta Apify`}</b>
                      ${s}
                    </div>
                    <div style="display:flex;gap:6px">
                      ${n?v`
                        <button class="btn btn-ghost btn-sm btn-reactivate-acc" data-id="${e.id}" title="Reativar para testar novamente" style="font-size:11px;padding:3px 8px">
                          🔁 Reativar
                        </button>
                      `:``}
                      <button class="btn btn-ghost btn-sm btn-del-acc" data-id="${e.id}" title="Remover conta do pool" style="font-size:11px;padding:3px 8px;color:var(--danger)">
                        ${y(`trash`)}
                      </button>
                    </div>
                  </div>

                  <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--dim)">
                    <span>${e.email?`✉️ ${e.email}`:`Plano: ${e.plan||`FREE`}`}</span>
                    <span><b>$${r}</b> / $${i} USD (${o}%)</span>
                  </div>

                  <div style="background:rgba(255,255,255,0.08);height:5px;border-radius:3px;overflow:hidden">
                    <div style="background:${t?`#2ecc71`:`#e74c3c`};width:${o}%;height:100%;transition:width 0.3s"></div>
                  </div>

                  ${e.last_error?v`
                    <small style="color:var(--danger);font-size:10.5px;line-height:1.3;display:block">
                      ⚠️ ${e.last_error}
                    </small>
                  `:``}
                </div>
              `}).join(``)}
          </div>
        `}
      `);let o=e.querySelector(`#btn-add-account`);o&&(o.onclick=async()=>{let n=(e.querySelector(`#pool-new-token`)?.value||``).trim();if(!n)return N(`Cole o token da Apify.`,`error`);N(`Verificando conta na Apify…`,`info`);try{N(`Conta @${(await x(`/email/apify/account/add`,{method:`POST`,body:{token:n}})).account.username||`Apify`} conectada ao pool!`,`success`),await E(),t(),D()}catch(e){N(e.message,`error`)}});let s=e.querySelector(`#btn-refresh-all-accounts`);s&&(s.onclick=async()=>{N(`Consultando saldo de todas as contas na Apify…`,`info`);try{a=await x(`/email/apify/account/check-all`,{method:`POST`,body:{}}),N(`Contas e saldos atualizados com sucesso!`,`success`),t(),D()}catch(e){N(e.message,`error`)}}),e.querySelectorAll(`.btn-del-acc`).forEach(e=>{e.onclick=async()=>{let n=e.dataset.id;if(confirm(`Deseja remover esta conta Apify do pool?`))try{await x(`/email/apify/account/delete`,{method:`POST`,body:{id:n}}),N(`Conta removida do pool.`,`info`),await E(),t(),D()}catch(e){N(e.message,`error`)}}}),e.querySelectorAll(`.btn-reactivate-acc`).forEach(e=>{e.onclick=async()=>{let n=e.dataset.id;try{await x(`/email/apify/account/reset`,{method:`POST`,body:{id:n}}),N(`Conta reativada!`,`success`),await E(),t(),D()}catch(e){N(e.message,`error`)}}})};t(),I({title:`Pool de Contas Apify (Rotação Automática)`,icon:`key`,body:e,actions:[{label:`Concluído`,cls:`btn-secondary`}]})}let P=M;function F(){let e=i.runs||[],t=c===`todas`?`Geral`:c,n=document.createElement(`div`);b(n,v`
      <p class="dim" style="font-size:13px;margin-bottom:12px">
        Importe com 1 clique qualquer extração recente da sua conta Apify direto para a lista <b>${t}</b> (ou cole um Dataset ID abaixo):
      </p>
      ${e.length?v`
        <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;margin-bottom:14px">
          ${e.map(e=>v`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,0.02)">
              <div style="font-size:12.5px">
                <b>Extração ${(e.started_at||``).slice(0,10)} ${(e.started_at||``).slice(11,16)}</b>
                <span class="badge ${e.status===`SUCCEEDED`?`good`:``}" style="margin-left:6px">${e.status}</span>
                <div class="dim" style="font-size:11.5px">Dataset: <code>${e.dataset_id}</code></div>
              </div>
              <button class="btn btn-primary btn-sm" data-pick-ds="${e.dataset_id}">${y(`download`)}Importar</button>
            </div>
          `)}
        </div>
      `:v`<p class="dim" style="font-size:12.5px;margin-bottom:12px">Nenhuma execução recente listada.</p>`}
      <div class="field full">
        <span>Ou digite um Dataset ID específico</span>
        <input class="input" id="modal-dataset-id" placeholder="Ex: 8xG7kQpL9m2..." style="width:100%">
      </div>
    `),n.addEventListener(`click`,e=>{let t=e.target.closest(`[data-pick-ds]`);t&&(n.querySelector(`#modal-dataset-id`).value=t.dataset.pickDs)}),I({title:`Importar da Apify para "${t}"`,icon:`download`,body:n,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Importar Dataset`,cls:`btn-primary`,icon:`check`,onClick:async()=>{let e=n.querySelector(`#modal-dataset-id`).value.trim();if(!e)return N(`Selecione uma extração ou digite o Dataset ID.`,`error`),!1;N(`Puxando leads da Apify e verificando empresas duplicadas…`,`info`);try{let n=await x(`/email/leads/import-apify-dataset`,{method:`POST`,body:{dataset_id:e,list_name:t}});return N(`${n.total_imported} novos leads salvos em "${t}" (${n.skipped_duplicates||0} repetidos bloqueados)!`,`success`),await T(),D(),!0}catch(e){return N(e.message,`error`),!1}}}]})}return D(),f=setInterval(async()=>{try{let[t,n]=await Promise.all([x(`/email/apify/extract-status`),x(`/email/campaigns/status`)]),r=!!t.running,i=!!o.running;if(r){o=t;let n=e.querySelector(`#ext-status-msg`);n&&(n.textContent=t.message);let r=e.querySelector(`#ext-progress-bar`),i=t.progress_percent??(t.target_limit?Math.min(100,Math.round(t.found/t.target_limit*100)):0);r&&(r.style.width=`${i}%`);let a=e.querySelector(`#ext-live-count`);a&&(a.textContent=`${t.found||0} / ${t.target_limit||h} e-mails`);let s=e.querySelector(`#ext-progress-wrap`);s&&(s.style.display=`block`);let c=e.querySelector(`#ext-spinner`);c&&(c.style.animation=`spin 1.5s linear infinite`)}else if(i&&!r)o=t,await T(),D(),N(t.message||`Extração de e-mails concluída!`,`success`);else{let e=t.message!==o.message||t.imported!==o.imported,r=n.status!==s.status||n.sent!==s.sent;(e||r)&&(o=t,s=n,await T(),D())}}catch{}},1500),{unmount(){f&&clearInterval(f)}}}var bt=/* @__PURE__ */ t({render:()=>xt});async function xt(e){let t=window.location.hash||``,n=window.location.search||``,r=t.includes(`?`)?t.split(`?`)[1]:n?n.slice(1):``;if(r){let e=new URLSearchParams(r);e.get(`oauth_success`)?(N(`Conta Microsoft (${e.get(`email`)||`sua conta`}) conectada com sucesso!`,`success`),window.history.replaceState({},document.title,window.location.pathname+`#/radar/contas`)):e.get(`oauth_error`)&&(N(`Falha na autorização Microsoft: ${e.get(`oauth_error`)}`,`error`),window.history.replaceState({},document.title,window.location.pathname+`#/radar/contas`))}let i=[],a=async()=>{try{i=await x(`/email/accounts`)}catch(e){N(e.message,`error`)}};await a();function o(){b(e,v`
      <div class="page-head">
        <div>
          <h1>${y(`layers`)}Contas de e-mail</h1>
          <p class="sub">Todas as suas caixas de e-mail conectadas. O Radar rotaciona entre elas para multiplicar os disparos diários com segurança anti-spam.</p>
        </div>
        <div class="head-actions" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btn-add-starnet" style="background:#10b981;border-color:#10b981;color:#fff;display:inline-flex;align-items:center;gap:6px">
            ${y(`plus`)}Adicionar Caixa Própria
          </button>
          <a href="https://webmail.web-starnet.tech" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px">
            ${y(`external`)}Abrir Webmail
          </a>
          <button class="btn btn-secondary" id="btn-add-account">${y(`plus`)}Adicionar Gmail / SMTP</button>
          <button class="btn btn-ghost" id="btn-ms-oauth" style="color:#38bdf8;border-color:rgba(56,189,248,0.3);display:inline-flex;align-items:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 23 23" fill="none"><rect width="11" height="11" fill="#f35325"/><rect x="12" width="11" height="11" fill="#81bc06"/><rect y="12" width="11" height="11" fill="#05a6f0"/><rect x="12" y="12" width="11" height="11" fill="#ffba08"/></svg>
            Conectar Microsoft
          </button>
        </div>
      </div>

      <!-- Card da Infraestrutura Própria -->
      <div class="card" style="margin-bottom:16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.35)">
        <div class="card-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:rgba(16,185,129,0.2);color:#10b981">
              ${y(`shield`)}
            </span>
            <div>
              <h3 style="color:#10b981;margin:0">Infraestrutura Própria: 5 Domínios Ativos</h3>
              <small class="dim">100% no seu servidor VPS próprio. SPF, DKIM 2048-bit, DMARC e PTR ativos em todos os domínios.</small>
            </div>
          </div>
          <a href="https://webmail.web-starnet.tech" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:6px;border-color:#10b981;color:#10b981">
            ${y(`external`)}Acessar Webmail (Roundcube)
          </a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:12px;font-size:13px;color:var(--ez-tx2)">
          <div>🌐 <b>Servidor SMTP:</b> <code>mail.web-starnet.tech:465 (SSL)</code></div>
          <div>📬 <b>Servidor IMAP:</b> <code>mail.web-starnet.tech:993 (SSL)</code></div>
          <div>🛡️ <b>Autenticação:</b> SPF + DKIM + DMARC + PTR (10/10)</div>
          <div>💻 <b>Domínios Próprios:</b> <code>@web-starnet.tech</code>, <code>@star-net.pro</code>, <code>@odacefirm.com</code>, <code>@easyjump.online</code>, <code>@star-web.sbs</code></div>
        </div>
      </div>

      <!-- Lista de Inboxes Conectadas -->
      <div class="card">
        <div class="card-head">
          <h3>${y(`check-circle`)}Inboxes Conectadas no Radar (${i.length})</h3>
        </div>

        ${i.length?v`
          <div class="list" style="display:flex;flex-direction:column;gap:12px">
            ${i.map(e=>{let t=e.provider===`microsoft_graph`||e.provider===`microsoft_oauth`,n=e.provider===`hostinger`,r=e.provider===`starnet`||e.email&&[`web-starnet.tech`,`star-net.pro`,`odacefirm.com`,`easyjump.online`,`star-web.sbs`].some(t=>e.email.endsWith(`@`+t)),i=r?`INFRA PRÓPRIA`:t?`Microsoft OAuth`:n?`Hostinger`:e.provider.toUpperCase(),a=r?`background:rgba(16,185,129,0.18);border:1px solid rgba(16,185,129,0.4);color:#10b981`:t?`background:rgba(0,120,212,0.18);border:1px solid rgba(0,120,212,0.4);color:#38bdf8`:n?`background:rgba(103,58,183,0.18);border:1px solid rgba(103,58,183,0.4);color:#a78bfa`:`background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);color:#f87171`,o=e.daily_limit?Math.min(100,Math.round(e.sent_today/e.daily_limit*100)):0,s=e.sent_today>=e.daily_limit;return v`
              <div class="li" style="display:flex;align-items:center;gap:14px;padding:14px 18px;border:1px solid var(--border);border-radius:12px;background:var(--card-bg)">
                <span style="padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:600;${a}">
                  ${i}
                </span>

                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <b style="font-size:15px;color:var(--ez-tx)">${e.email}</b>
                    <span class="badge ${e.status===`active`?s?`warning`:`good`:`warning`}">
                      <i class="dot" style="background:${e.status===`active`?s?`#f59e0b`:`#10b981`:`#ef4444`}"></i>
                      ${e.status===`active`?s?`Limite (24h) atingido`:`Ativa / Pronta`:`Pausada / Erro`}
                    </span>
                  </div>

                  <div style="margin-top:6px;max-width:320px">
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ez-tx2);margin-bottom:3px">
                      <span>Envios (24h): <b>${e.sent_today}</b> / ${e.daily_limit}</span>
                      <span><b>${o}%</b></span>
                    </div>
                    <div style="background:var(--border);height:6px;border-radius:3px;overflow:hidden">
                      <div style="background:${s?`#f59e0b`:`#10b981`};height:100%;width:${o}%"></div>
                    </div>
                  </div>

                  <div class="dim" style="font-size:12px;margin-top:6px">
                    Método: <code>${t?`Microsoft Graph API (HTTPS)`:`${e.smtp_host}:${e.smtp_port} (${e.use_ssl?`SSL`:`TLS`})`}</code>
                    ${e.last_sent_at?v`· Último envio: <b>${e.last_sent_at.slice(11,19)}</b>`:``}
                  </div>
                  ${e.last_error?v`<div style="color:#ef4444;font-size:12px;margin-top:4px">${e.last_error}</div>`:``}
                </div>

                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <button class="btn btn-secondary btn-sm" data-edit-limit="${e.id}" data-current-limit="${e.daily_limit}" title="Alterar limite diário de envios">
                    ${y(`edit`)}Limite: ${e.daily_limit}
                  </button>
                  <button class="btn ${e.status===`active`?`btn-ghost`:`btn-primary`} btn-sm" data-toggle-status="${e.id}" data-new-status="${e.status===`active`?`paused`:`active`}" title="${e.status===`active`?`Pausar conta (não enviará mais)`:`Ativar conta para envios`}">
                    ${e.status===`active`?`Pausar`:`Ativar`}
                  </button>
                  <button class="btn btn-secondary btn-sm" data-test-acc="${e.id}">${y(`send`)}Testar</button>
                  <button class="btn-icon sm" data-del-acc="${e.id}" title="Excluir">${y(`trash`)}</button>
                </div>
              </div>
            `})}
          </div>
        `:v`
          <div class="empty" style="text-align:center;padding:40px 10px">
            <span class="ic">${y(`layers`)}</span>
            <h3>Nenhuma inbox conectada ainda</h3>
            <p class="dim" style="font-size:13px;max-width:440px;margin:8px auto">
              Adicione a sua caixa própria @web-starnet.tech ou conecte uma conta Google/Microsoft para iniciar os disparos.
            </p>
          </div>
        `}
      </div>
    `)}function s(){e.addEventListener(`click`,async e=>{if(e.target.closest(`#btn-add-starnet`)){l(`starnet`);return}if(e.target.closest(`#btn-add-hostinger`)){l(`hostinger`);return}if(e.target.closest(`#btn-add-account`)||e.target.closest(`#btn-add-account-empty`)){l(`starnet`);return}if(e.target.closest(`#btn-ms-oauth`)||e.target.closest(`#btn-ms-oauth-empty`)){c();return}let t=e.target.closest(`[data-test-acc]`);if(t){let e=t.dataset.testAcc;t.disabled=!0,b(t,v`${y(`loader`)}Testando…`);try{N((await x(`/email/accounts/${e}/test`,{method:`POST`,body:{}})).message,`success`),await a(),o()}catch(e){N(e.message,`error`),await a(),o()}return}let n=e.target.closest(`[data-edit-limit]`);if(n){let e=n.dataset.editLimit,t=n.dataset.currentLimit||`35`,r=prompt(`Novo limite diário de envios para esta conta (recomendado 30 a 50 para novos domínios):`,t);if(r!==null){let t=parseInt(r,10);if(isNaN(t)||t<5||t>1e3){N(`Limite inválido. Digite um número entre 5 e 1000.`,`error`);return}try{await x(`/email/accounts/${e}`,{method:`PUT`,body:{daily_limit:t}}),N(`Limite atualizado para ${t} envios/dia.`,`success`),await a(),o()}catch(e){N(e.message,`error`)}}return}let r=e.target.closest(`[data-toggle-status]`);if(r){let e=r.dataset.toggleStatus,t=r.dataset.newStatus;try{await x(`/email/accounts/${e}`,{method:`PUT`,body:{status:t}}),N(t===`active`?`Conta ativada para envios!`:`Conta pausada. Não enviará mais e-mails.`,`info`),await a(),o()}catch(e){N(e.message,`error`)}return}let i=e.target.closest(`[data-del-acc]`);if(i){if(!confirm(`Remover esta conta de envio do Radar?`))return;let e=i.dataset.delAcc;try{await x(`/email/accounts/${e}`,{method:`DELETE`}),N(`Conta removida com sucesso.`,`info`),await a(),o()}catch(e){N(e.message,`error`)}}})}function c(){let e=document.createElement(`div`);b(e,v`
      <div style="font-size:13.5px;color:var(--ez-tx);line-height:1.6">
        <p style="margin-bottom:12px">
          Conecte sua conta pessoal <b>@outlook.com</b> ou <b>@hotmail.com</b> diretamente pelos servidores oficiais da Microsoft com autorização OAuth 2.0.
        </p>
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:12px;margin-bottom:14px;color:#10b981">
          ✓ <b>100% Grátis:</b> Não exige Azure nem cartão.<br>
          ✓ <b>Sem bloqueio de SMTP:</b> Usa a Graph API oficial da Microsoft.<br>
          ✓ <b>Zero configuração:</b> Basta fazer login e clicar em "Sim".
        </div>
      </div>
    `),I({title:`Conectar Microsoft (Outlook / Hotmail)`,icon:`wallet`,body:e,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Iniciar Login Microsoft`,cls:`btn-primary`,icon:`external`,onClick:async()=>{try{let e=await x(`/email/oauth/microsoft/start`);return e.auth_url?(window.open(e.auth_url,`_blank`,`noopener`),!0):(N(`URL de autenticação não recebida.`,`error`),!1)}catch(e){return N(e.message,`error`),!1}}}]})}function l(e=`starnet`){let t=document.createElement(`div`),n=e===`starnet`,r=e===`hostinger`;b(t,v`
      <div class="form-grid" style="display:flex;flex-direction:column;gap:14px">
        <div class="field full">
          <span>Provedor de E-mail</span>
          <select class="input" id="acc-provider" style="width:100%">
            <option value="starnet" ${n?`selected`:``}>Infra Própria (5 Domínios - SSL 465)</option>
            <option value="hostinger" ${r?`selected`:``}>Hostinger E-mail (smtp.hostinger.com)</option>
            <option value="gmail" ${!n&&!r?`selected`:``}>Google / Gmail (smtp.gmail.com)</option>
            <option value="outlook">Microsoft / Outlook / Hotmail (SMTP Clássico)</option>
            <option value="custom">Outro SMTP Personalizado</option>
          </select>
        </div>

        <div class="field full">
          <span>Seu Nome de Remetente</span>
          <input class="input" id="acc-name" placeholder="ex: Comercial | StarNet" style="width:100%">
        </div>

        <div class="field full">
          <span>Endereço de E-mail</span>
          <input class="input" id="acc-email" type="email" placeholder="${n?`contato@web-starnet.tech`:r?`comercial@star-net.pro`:`seuemail@gmail.com`}" style="width:100%">
        </div>

        <div class="field full">
          <span id="acc-pwd-label">Senha do E-mail</span>
          <input class="input" id="acc-password" type="password" placeholder="Sua senha da caixa de e-mail" style="width:100%">
          <small class="dim" id="acc-pwd-help" style="display:block;margin-top:4px">
            ${n?`Digite a senha da caixa criada no seu servidor próprio.`:r?`Digite a senha da caixa de e-mail criada na Hostinger.`:`Acesse sua Conta Google › Segurança › Senhas de app.`}
          </small>
        </div>

        <div class="field full">
          <span>Limite Diário de Envios Seguros</span>
          <input class="input" id="acc-limit" type="number" value="${n?`35`:r?`150`:`50`}" min="5" max="500" style="width:100%">
          <small class="dim" style="display:block;margin-top:2px">Recomendamos 30 a 40 disparos/dia por caixa para aquecimento seguro dos domínios próprios.</small>
        </div>

        <div id="outlook-smtp-tip" style="display:none;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:8px;padding:10px;font-size:12.5px;color:#fde047;line-height:1.5">
          ⚠️ <b>Atenção:</b> A Microsoft desativou senhas normais para o Outlook/Hotmail (erro 535). Use o botão <b>Conectar Microsoft</b> via OAuth!
        </div>

        <div id="custom-smtp-fields" style="display:none;flex-direction:column;gap:10px;border-top:1px solid var(--border);padding-top:10px">
          <div class="field full">
            <span>Servidor SMTP</span>
            <input class="input" id="acc-host" placeholder="mail.seusite.com" style="width:100%">
          </div>
          <div class="field full">
            <span>Porta SMTP</span>
            <input class="input" id="acc-port" type="number" value="587" style="width:100%">
          </div>
        </div>
      </div>
    `);let i=t.querySelector(`#acc-provider`),s=t.querySelector(`#custom-smtp-fields`),c=t.querySelector(`#outlook-smtp-tip`),l=t.querySelector(`#acc-pwd-help`),u=t.querySelector(`#acc-email`);i.addEventListener(`change`,()=>{let e=i.value;s.style.display=e===`custom`?`flex`:`none`,c&&(c.style.display=e===`outlook`?`block`:`none`),e===`starnet`?(l.innerHTML=`Digite a senha da caixa criada no servidor web-starnet.tech.`,u.placeholder=`contato@web-starnet.tech`):e===`hostinger`?(l.innerHTML=`Digite a senha da caixa de e-mail criada na Hostinger.`,u.placeholder=`comercial@star-net.pro`):e===`gmail`?(l.innerHTML=`Acesse sua Conta Google › Segurança › Verificação em duas etapas › <b>Senhas de app</b>.`,u.placeholder=`seuemail@gmail.com`):e===`outlook`?(l.innerHTML=`Digite a senha da sua conta Microsoft.`,u.placeholder=`seuemail@outlook.com`):(l.innerHTML=`Digite a senha do seu servidor SMTP.`,u.placeholder=`contato@seusite.com`)}),I({title:n?`Adicionar Caixa Própria (@web-starnet.tech)`:r?`Adicionar Caixa Hostinger`:`Adicionar Conta de E-mail / SMTP`,icon:`wallet`,body:t,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Testar e Salvar`,cls:`btn-primary`,icon:`check`,onClick:async()=>{let e=i.value,n=t.querySelector(`#acc-name`).value.trim(),r=u.value.trim(),s=t.querySelector(`#acc-password`).value.trim(),c=parseInt(t.querySelector(`#acc-limit`).value||`50`,10),l=t.querySelector(`#acc-host`).value.trim(),d=parseInt(t.querySelector(`#acc-port`).value||`587`,10);if(!r||!r.includes(`@`))return N(`Digite um e-mail válido.`,`error`),!1;if(!s)return N(`Digite a senha da conta.`,`error`),!1;try{return N(`Validando e salvando conta…`,`info`),await x(`/email/accounts`,{method:`POST`,body:{provider:e,email:r,password:s,name:n,daily_limit:c,smtp_host:l,smtp_port:d}}),N(`Conta configurada com sucesso!`,`success`),await a(),o(),!0}catch(e){return N(e.message,`error`),!1}}}]})}s(),o()}var St=/* @__PURE__ */ t({render:()=>Ct});async function Ct(e){let t=[],n=null,r=async()=>{try{t=await x(`/email/templates`),!n&&t.length&&(n=t[0].id)}catch(e){N(e.message,`error`)}};await r();let i=t.find(e=>e.id===n)||t[0]||{id:0,title:`Novo Modelo`,subject:``,body_html:``,body_text:``};function a(){b(e,v`
      <div class="page-head">
        <div>
          <h1>${y(`edit`)}Modelos de e-mail</h1>
          <p class="sub">Mensagens personalizadas com variações automáticas para que cada e-mail saia único e caia direto na caixa de entrada principal.</p>
        </div>
        <div class="head-actions">
          <button class="btn btn-secondary" id="btn-new-tpl">${y(`plus`)}Novo Modelo</button>
          <button class="btn btn-primary" id="btn-save-tpl">${y(`check`)}Salvar Alterações</button>
        </div>
      </div>

      <!-- Banner Explicativo Descomplicado -->
      <div class="card" style="margin-bottom:16px;background:rgba(215,156,69,0.06);border:1px solid rgba(215,156,69,0.25);padding:16px 20px">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="font-size:24px;line-height:1">💡</span>
          <div>
            <b style="color:var(--brand);font-size:14.5px">Como funciona o Spintax de forma simples:</b>
            <p style="margin:4px 0 0;font-size:13px;line-height:1.55;color:var(--ez-tx)">
              Se você enviar 100 e-mails com as mesmas palavras, o Gmail e o Outlook bloqueiam por suspeita de robô/spam.<br>
              Com o <b>Spintax</b>, você coloca alternativas entre chaves com barra: <code>{Olá|Oi|Tudo bem}</code>. A cada e-mail disparado, o sistema sorteia uma das palavras. Assim, <b>nenhum e-mail sai igual ao outro</b> e todos parecem 100% digitados à mão!
            </p>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:20px;align-items:start">
        <!-- Coluna da Esquerda: Editor -->
        <div>
          <div class="card">
            <div class="form-grid" style="display:flex;flex-direction:column;gap:14px">
              <div class="field full">
                <span>Escolha o Modelo de Abordagem</span>
                <select class="input" id="sel-template" style="width:100%;font-weight:600">
                  ${t.map(e=>v`<option value="${e.id}" ${e.id===i.id?`selected`:``}>${e.title}</option>`)}
                </select>
              </div>

              <div class="field full">
                <span>Título Interno (apenas para você identificar)</span>
                <input class="input" id="tpl-title" value="${i.title}" style="width:100%">
              </div>

              <div class="field full">
                <span>Assunto do E-mail</span>
                <input class="input" id="tpl-subject" value="${i.subject}" style="width:100%;font-weight:600">
                <small class="dim" style="display:block;margin-top:3px">ex: <code>Uma dúvida sobre a sua empresa, [nome]</code></small>
              </div>

              <!-- Pílulas de Variáveis Rápidas -->
              <div>
                <span class="dim" style="font-size:12.5px;display:block;margin-bottom:6px">Clique para inserir dados automáticos do cliente:</span>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <button class="chip" type="button" data-var="[Tratamento]" style="border-color:rgba(225,29,72,0.35);color:#fda4af">🩺 [Tratamento] (Dr./Dra.)</button>
                  <button class="chip" type="button" data-var="[Nome]">👤 [Nome]</button>
                  <button class="chip" type="button" data-var="[Nome da Empresa]">🏢 [Nome da Empresa]</button>
                  <button class="chip" type="button" data-var="@{username}">📸 @{username}</button>
                  <button class="chip" type="button" data-var="[cidade]">📍 [cidade]</button>
                  <button class="chip" type="button" data-var="[categoria]">🩺 [categoria]</button>
                </div>
              </div>

              <div class="field full">
                <span>Corpo da Mensagem (Texto simples — parágrafos são formatados automaticamente)</span>
                <textarea class="input" id="tpl-body" rows="12" style="width:100%;font-family:inherit;font-size:13.5px;line-height:1.6">${i.body_html}</textarea>
              </div>

              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" id="btn-test-preview">${y(`sparkles`)}Sortear Novas Variações</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna da Direita: Prévia Real & Variações -->
        <div>
          <div class="card" id="box-preview-results">
            <div class="card-head" style="display:flex;justify-content:space-between;align-items:center">
              <h3>${y(`sparkles`)}Como os Clientes Vão Receber</h3>
              <span class="badge good"><i class="dot"></i>3 Variações Geradas</span>
            </div>
            <p class="dim" style="font-size:12px;margin:2px 0 12px">
              Veja abaixo como o mesmo modelo vira 3 e-mails com frases e palavras completamente diferentes:
            </p>
            <div id="preview-list" style="display:flex;flex-direction:column;gap:14px"></div>
          </div>
        </div>
      </div>
    `),s(),o()}async function o(){let t=e.querySelector(`#tpl-subject`)?.value||i.subject,n=e.querySelector(`#tpl-body`)?.value||i.body_html;if(t&&n)try{let e=await x(`/email/templates/preview`,{method:`POST`,body:{subject:t,body_html:n}});c(e.variations,e.sample)}catch{}}function s(){let s=e.querySelector(`#sel-template`);s&&s.addEventListener(`change`,e=>{n=parseInt(e.target.value,10),a()});let c=e.querySelector(`#tpl-body`);e.querySelectorAll(`[data-var]`).forEach(e=>{e.addEventListener(`click`,()=>{if(!c)return;let t=e.dataset.var,n=c.selectionStart,r=c.selectionEnd,i=c.value;c.value=i.slice(0,n)+t+i.slice(r),c.focus(),c.selectionStart=c.selectionEnd=n+t.length,o()})});let l=e.querySelector(`#btn-test-preview`);l&&l.addEventListener(`click`,o);let u=e.querySelector(`#btn-save-tpl`);u&&u.addEventListener(`click`,async()=>{let t=e.querySelector(`#tpl-title`).value.trim(),o=e.querySelector(`#tpl-subject`).value.trim(),s=e.querySelector(`#tpl-body`).value.trim();if(!t||!o||!s)return N(`Preencha título, assunto e corpo.`,`error`);try{N(`Salvando modelo…`,`info`),i.id?(await x(`/email/templates/${i.id}`,{method:`PUT`,body:{title:t,subject:o,body_html:s,body_text:s}}),N(`Modelo atualizado com sucesso!`,`success`)):(n=(await x(`/email/templates`,{method:`POST`,body:{title:t,subject:o,body_html:s,body_text:s}})).id,N(`Novo modelo criado!`,`success`)),await r(),a()}catch(e){N(e.message,`error`)}});let d=e.querySelector(`#btn-new-tpl`);d&&d.addEventListener(`click`,()=>{let e=`Oi, [Tratamento] [Nome], tudo bem?

Uma dúvida rápida sobre o consultório: hoje você tem alguém cuidando da captação de pacientes particulares?

Vi que vocês têm excelentes avaliações no Google mas estão sem uma página profissional no ar. Se for você quem cuida ou se ninguém estiver olhando pra isso, tem 10 min essa semana pra gente conversar?

João Pedro`;t.unshift({id:0,title:`Novo Modelo - Consultórios (Dra./Dr.)`,subject:`Dúvida rápida sobre o consultório, [Nome]`,body_html:e,body_text:e}),n=0,a()})}function c(t,n){let r=e.querySelector(`#preview-list`);r&&b(r,v`
      ${t.map((e,t)=>v`
        <div style="border:1px solid var(--border);border-radius:10px;background:var(--card-bg);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <div style="background:rgba(255,255,255,0.03);padding:8px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:11.5px">
            <span style="font-weight:700;color:var(--brand)">EXEMPLO ENVIADO #${t+1}</span>
            <span class="dim">Para: ${n.email}</span>
          </div>
          <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:13px">
            <b style="color:var(--ez-tx)">Assunto:</b> <span style="color:var(--ez-tx-strong)">${e.subject}</span>
          </div>
          <div style="padding:14px;font-size:13px;line-height:1.6;color:var(--ez-tx)">
            ${h(e.body_html)}
          </div>
        </div>
      `)}
    `)}a()}var wt=/* @__PURE__ */ t({render:()=>Tt});async function Tt(e){let t=[],n=[],r=[],i=[],a={},o=null,s=!0,c=async()=>{try{let[e,o,s,c,l]=await Promise.all([x(`/email/campaigns`),x(`/email/templates`),x(`/email/campaigns/status`),x(`/email/logs`),x(`/email/lists`)]);t=e||[],n=o||[],a=s||{},i=c||[],r=l||[]}catch(e){N(e.message,`error`)}};await c();function l(){if(!s)return;let n=a.status===`running`,r=a.status===`paused`;b(e,v`
      <div class="page-head">
        <div>
          <h1>${y(`send`)}Enviar e-mails</h1>
          <p class="sub">Envie e-mails em segundo plano com pausas humanas e proteção anti-repetição de empresas.</p>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary" id="btn-new-camp">${y(`plus`)}Criar Nova Campanha</button>
        </div>
      </div>

      <!-- Caixa de Controle em Tempo Real -->
      <div class="card" style="margin-bottom:20px;border:1px solid ${n?`#10b981`:r?`#f59e0b`:`var(--border)`}">
        <div class="card-head">
          <h3>${y(`target`)}Status do Disparo Atual</h3>
          <span class="badge ${n?`good`:r?`warning`:``}">
            <i class="dot"></i>${n?`Disparando agora`:r?`Pausado`:`Parado`}
          </span>
        </div>

        <div style="padding:6px 0">
          <div style="font-size:14px;color:var(--ez-tx);margin-bottom:6px">
            <b>Andamento:</b> ${a.message||`Pronto para iniciar.`}
          </div>

          <div style="background:var(--border);height:10px;border-radius:5px;overflow:hidden;margin:12px 0">
            <div style="background:var(--brand);height:100%;transition:width .3s;width:${a.total?Math.min(100,Math.round(((a.sent||0)+(a.failed||0))/a.total*100)):0}%"></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;font-size:13px;color:var(--ez-tx2);margin-bottom:14px">
            <div>Enviados com sucesso: <b style="color:#10b981">${a.sent||0}</b> / <b>${a.total||0}</b></div>
            <div>Falhas de envio: <b style="color:#ef4444">${a.failed||0}</b></div>
            <div>Lead em processo: <b>${a.current_lead||`-`}</b></div>
            <div>Conta remetente: <b>${a.current_account||`-`}</b></div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${n?v`
              <button class="btn btn-secondary" id="btn-pause-camp">${y(`pause`)}Pausar Disparo</button>
              <button class="btn btn-ghost" id="btn-stop-camp">${y(`stop`)}Parar</button>
            `:``}
            ${r?v`
              <button class="btn btn-primary" id="btn-resume-camp">${y(`send`)}Retomar Disparo</button>
              <button class="btn btn-ghost" id="btn-stop-camp">${y(`stop`)}Parar</button>
            `:``}
          </div>
        </div>
      </div>

      <!-- Lista de Campanhas Criadas -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-head">
          <h3>${y(`layers`)}Campanhas Criadas (${t.length})</h3>
        </div>

        ${t.length?v`
          <div class="list" style="display:flex;flex-direction:column;gap:10px">
            ${t.map(e=>v`
              <div class="li" style="display:flex;align-items:center;gap:14px;padding:12px 16px;border:1px solid var(--border);border-radius:12px;background:var(--card-bg)">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <b style="font-size:14.5px;color:var(--ez-tx)">${e.name}</b>
                    <span class="badge">📂 ${e.target_list||`Todas as Listas`}</span>
                    <span class="badge ${e.status===`running`?`good`:e.status===`paused`?`warning`:(e.status,``)}">
                      <i class="dot" style="${e.status===`running`?`background:#10b981`:e.status===`paused`?`background:#f59e0b`:`display:none`}"></i>
                      ${e.status===`running`?`Em andamento`:e.status===`paused`?`Pausada`:e.status===`completed`?`Concluída`:e.status===`stopped`?`Parada`:`Aguardando`}
                    </span>
                  </div>
                  <div class="dim" style="font-size:12.5px;margin-top:4px">
                    Modelo: <b>${e.template_title||`Padrão`}</b> ·
                    Intervalo: <b>${e.delay_min_seconds}s a ${e.delay_max_seconds}s</b> ·
                    Enviados: <b>${e.sent_count}</b> / <b>${e.total_leads||`Fila`}</b>
                    ${e.filter_category?v`· Filtro: <i>${e.filter_category}</i>`:``}
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                  ${e.status===`running`?v`
                    <button class="btn btn-secondary btn-sm" data-pause-camp="${e.id}">${y(`pause`)}Pausar</button>
                    <button class="btn btn-ghost btn-sm" data-stop-camp="${e.id}">${y(`stop`)}Parar</button>
                  `:e.status===`paused`?v`
                    <button class="btn btn-primary btn-sm" data-resume-camp="${e.id}">${y(`send`)}Retomar</button>
                    <button class="btn btn-ghost btn-sm" data-stop-camp="${e.id}">${y(`stop`)}Parar</button>
                  `:v`
                    <button class="btn btn-primary btn-sm" data-start-camp="${e.id}">${y(`send`)}Iniciar</button>
                    <button class="btn btn-ghost btn-sm" data-delete-camp="${e.id}" title="Excluir">${y(`trash`)}</button>
                  `}
                </div>
              </div>
            `)}
          </div>
        `:v`
          <div class="empty" style="text-align:center;padding:30px 10px">
            <span class="ic">${y(`layers`)}</span>
            <h3>Nenhuma campanha criada</h3>
            <p class="dim" style="font-size:13px;max-width:440px;margin:8px auto">
              Crie uma campanha escolhendo um modelo de e-mail e filtros para começar o envio automático.
            </p>
          </div>
        `}
      </div>

      <!-- Histórico de Envios Recentes -->
      <div class="card">
        <div class="card-head">
          <h3>${y(`clock`)}Últimos E-mails Processados (${i.length})</h3>
        </div>

        ${i.length?v`
          <div class="table-wrap" style="overflow-x:auto">
            <table class="table" style="width:100%;font-size:13px;text-align:left;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:1px solid var(--border);color:var(--ez-tx3)">
                  <th style="padding:8px">Hora</th>
                  <th style="padding:8px">Destinatário</th>
                  <th style="padding:8px">Remetente</th>
                  <th style="padding:8px">Assunto</th>
                  <th style="padding:8px">Status</th>
                </tr>
              </thead>
              <tbody>
                ${i.map(e=>v`
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
                    <td style="padding:8px" class="dim">${e.sent_at.slice(11,19)}</td>
                    <td style="padding:8px"><b>${e.lead_email}</b></td>
                    <td style="padding:8px" class="dim">${e.account_email}</td>
                    <td style="padding:8px">${e.subject}</td>
                    <td style="padding:8px">
                      <span class="badge ${e.status===`sent`?`good`:`warning`}">${e.status===`sent`?`Enviado`:`Falha`}</span>
                      ${e.error_message?v`<small class="dim" style="display:block;color:#ef4444">${e.error_message}</small>`:``}
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        `:v`
          <div class="dim" style="text-align:center;padding:20px;font-size:13px">Nenhum envio registrado ainda.</div>
        `}
      </div>
    `)}function u(){e.addEventListener(`click`,async e=>{if(e.target.closest(`#btn-new-camp`)){d();return}let t=e.target.closest(`[data-start-camp]`);if(t){let e=t.dataset.startCamp;t.disabled=!0;try{N((await x(`/email/campaigns/${e}/start`,{method:`POST`,body:{}})).message,`success`),await c(),l()}catch(e){N(e.message,`error`)}finally{t.disabled=!1}return}let n=e.target.closest(`#btn-pause-camp`)||e.target.closest(`[data-pause-camp]`);if(n){let e=n.dataset&&n.dataset.pauseCamp?n.dataset.pauseCamp:null;n.disabled=!0;try{await x(e?`/email/campaigns/${e}/pause`:`/email/campaigns/pause`,{method:`POST`,body:{}}),N(`Campanha pausada.`,`info`),await c(),l()}catch(e){N(e.message,`error`)}finally{n.disabled=!1}return}let r=e.target.closest(`#btn-resume-camp`)||e.target.closest(`[data-resume-camp]`);if(r){let e=r.dataset&&r.dataset.resumeCamp?r.dataset.resumeCamp:null;r.disabled=!0;try{await x(e?`/email/campaigns/${e}/resume`:`/email/campaigns/resume`,{method:`POST`,body:{}}),N(`Campanha retomada!`,`success`),await c(),l()}catch(e){N(e.message,`error`)}finally{r.disabled=!1}return}let i=e.target.closest(`#btn-stop-camp`)||e.target.closest(`[data-stop-camp]`);if(i){let e=i.dataset&&i.dataset.stopCamp?i.dataset.stopCamp:null;if(!confirm(`Deseja realmente parar o disparo desta campanha?`))return;i.disabled=!0;try{await x(e?`/email/campaigns/${e}/stop`:`/email/campaigns/stop`,{method:`POST`,body:{}}),N(`Campanha cancelada.`,`info`),await c(),l()}catch(e){N(e.message,`error`)}finally{i.disabled=!1}return}let a=e.target.closest(`[data-delete-camp]`);if(a){let e=a.dataset.deleteCamp;if(!confirm(`Deseja excluir esta campanha?`))return;a.disabled=!0;try{await x(`/email/campaigns/${e}`,{method:`DELETE`}),N(`Campanha excluída com sucesso.`,`info`),await c(),l()}catch(e){N(e.message,`error`)}finally{a.disabled=!1}}})}function d(){let e=document.createElement(`div`);b(e,v`
      <div class="form-grid" style="display:flex;flex-direction:column;gap:14px">
        <div class="field full">
          <span>Nome da Campanha</span>
          <input class="input" id="camp-name" placeholder="ex: Prospecção Restaurantes RS" style="width:100%">
        </div>

        <div class="field full">
          <span>Lista de E-mail de Destino</span>
          <select class="input" id="camp-list" style="width:100%">
            <option value="">Todas as Listas</option>
            ${r.map(e=>v`<option value="${e.name}">📂 ${e.name} (${e.novo||0} novos)</option>`)}
          </select>
        </div>

        <div class="field full">
          <span>Modelo de E-mail a Enviar</span>
          <select class="input" id="camp-template" style="width:100%">
            ${n.map(e=>v`<option value="${e.id}">${e.title}</option>`)}
          </select>
        </div>

        <div class="field full">
          <span>Filtro de Categoria (opcional)</span>
          <input class="input" id="camp-category" placeholder="ex: Restaurante, Barbearia…" style="width:100%">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="field">
            <span>Mínimo de Seguidores</span>
            <input class="input" id="camp-min-followers" type="number" value="0" style="width:100%">
          </div>
          <div class="field">
            <span>Máximo de Seguidores</span>
            <input class="input" id="camp-max-followers" type="number" value="0" placeholder="0 = sem limite" style="width:100%">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="field">
            <span>Intervalo Mínimo (segundos)</span>
            <input class="input" id="camp-delay-min" type="number" value="35" min="5" style="width:100%">
          </div>
          <div class="field">
            <span>Intervalo Máximo (segundos)</span>
            <input class="input" id="camp-delay-max" type="number" value="75" min="10" style="width:100%">
          </div>
        </div>
        <small class="dim" style="display:block">
          🛡️ Empresas que já receberam e-mail em qualquer lista anterior serão bloqueadas automaticamente para evitar mensagens repetidas.
        </small>
      </div>
    `),I({title:`Criar Nova Campanha de E-mail`,icon:`send`,body:e,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Criar Campanha`,cls:`btn-primary`,icon:`check`,onClick:async()=>{let t=e.querySelector(`#camp-name`).value.trim(),n=e.querySelector(`#camp-list`).value.trim(),r=parseInt(e.querySelector(`#camp-template`).value,10),i=e.querySelector(`#camp-category`).value.trim(),a=parseInt(e.querySelector(`#camp-min-followers`).value||`0`,10),o=parseInt(e.querySelector(`#camp-max-followers`).value||`0`,10),s=parseInt(e.querySelector(`#camp-delay-min`).value||`35`,10),u=parseInt(e.querySelector(`#camp-delay-max`).value||`75`,10);if(!t)return N(`Digite o nome da campanha.`,`error`),!1;try{return N(`Criando campanha…`,`info`),await x(`/email/campaigns`,{method:`POST`,body:{name:t,target_list:n,template_id:r,filter_category:i,filter_min_followers:a,filter_max_followers:o,delay_min_seconds:s,delay_max_seconds:u}}),N(`Campanha criada com sucesso!`,`success`),await c(),l(),!0}catch(e){return N(e.message,`error`),!1}}}]})}return u(),l(),o=setInterval(async()=>{if(s)try{let e=await x(`/email/campaigns/status`);if(e.status!==a.status||e.sent!==a.sent||e.failed!==a.failed||e.campaign_id!==a.campaign_id){a=e;let[n,r]=await Promise.all([x(`/email/campaigns`),x(`/email/logs`)]);t=n||[],i=r||[],l()}}catch{}},2500),{unmount(){s=!1,o&&clearInterval(o)}}}var Et=/* @__PURE__ */ t({render:()=>Dt});async function Dt(e){let t=[],n=[],r=`all`,i=`all`,a=!1,o=async()=>{a=!0,s();try{if(!n.length)try{n=await x(`/email/inbox/accounts`)}catch{}t=await x(`/email/inbox${r&&r!==`all`?`?account=${encodeURIComponent(r)}`:``}`)}catch(e){N(e.message,`error`)}finally{a=!1,s()}};function s(){let o=t.filter(e=>e.unread).length,s=t.filter(e=>e.lead).length,c=t;i===`unread`&&(c=t.filter(e=>e.unread)),i===`leads`&&(c=t.filter(e=>e.lead)),b(e,v`
      <div class="page-head">
        <div>
          <h1>${y(`chat`)}Respostas</h1>
          <p class="sub">Todas as suas contas de e-mail reunidas em um só lugar. Visualize respostas, DMARC e retornos sem trocar de tela.</p>
        </div>
        <div class="head-actions" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          ${n.length?v`
            <div style="display:flex;align-items:center;gap:6px">
              <span class="dim" style="font-size:12.5px;font-weight:600">Visualizar:</span>
              <select id="sel-inbox-account" class="input" style="padding:6px 12px;font-size:13px;border-radius:8px;font-weight:600">
                <option value="all" ${r===`all`||!r?`selected`:``}>
                  📥 Todas as Caixas (${n.length} contas unificadas)
                </option>
                ${n.map(e=>v`
                  <option value="${e.email}" ${e.email===r?`selected`:``}>
                    ${e.email} (${e.provider===`gmail`?`Gmail`:e.provider})
                  </option>
                `)}
              </select>
            </div>
          `:``}
          <button class="btn btn-primary" id="btn-refresh" style="background:#10b981;border-color:#10b981;display:inline-flex;align-items:center;gap:6px">
            ${y(`refresh`)}Atualizar Caixa
          </button>
          <a href="https://webmail.web-starnet.tech" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px">
            ${y(`external`)}Abrir Webmail Roundcube
          </a>
        </div>
      </div>

      <!-- Métricas rápidas -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:18px">
        <div class="card" style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px">
          <div class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Total Recebidos</div>
          <div style="font-size:26px;font-weight:700;margin-top:4px;color:var(--ez-tx)">${t.length}</div>
        </div>
        <div class="card" style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px">
          <div class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Não Lidas</div>
          <div style="font-size:26px;font-weight:700;margin-top:4px;color:${o?`#10b981`:`var(--ez-tx)`}">
            ${o}
          </div>
        </div>
        <div class="card" style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px">
          <div class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Leads Identificados</div>
          <div style="font-size:26px;font-weight:700;margin-top:4px;color:#38bdf8">${s}</div>
        </div>
        <div class="card" style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px">
          <div class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Contas Monitoradas</div>
          <div style="font-size:26px;font-weight:700;margin-top:4px;color:var(--brand)">${n.length}</div>
        </div>
      </div>

      <!-- Filtros -->
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-sm ${i===`all`?`btn-primary`:`btn-ghost`}" data-filter="all">
          Todas (${t.length})
        </button>
        <button class="btn btn-sm ${i===`unread`?`btn-primary`:`btn-ghost`}" data-filter="unread">
          Não Lidas (${o})
        </button>
        <button class="btn btn-sm ${i===`leads`?`btn-primary`:`btn-ghost`}" data-filter="leads">
          Leads do Instagram (${s})
        </button>
      </div>

      <!-- Lista de Mensagens -->
      <div class="card">
        ${a?v`
          <div style="text-align:center;padding:50px 20px">
            <span class="ic">${y(`loader`)}</span>
            <p class="dim" style="margin-top:10px">Buscando mensagens em todas as contas ativas via IMAP…</p>
          </div>
        `:c.length?v`
          <div class="list" style="display:flex;flex-direction:column;gap:10px">
            ${c.map(e=>{let t=e.lead,n=t&&t.phone?t.phone.replace(/\\D/g,``):``,r=n?n.startsWith(`55`)?`https://wa.me/${n}`:`https://wa.me/55${n}`:``,i=(e.account||``).includes(`gmail.com`);return v`
              <div class="li" style="display:flex;align-items:flex-start;gap:14px;padding:16px;border:1px solid var(--border);border-radius:12px;background:${e.unread?`rgba(16,185,129,0.03)`:`var(--card-bg)`};cursor:pointer" data-msg-id="${e.id}">
                <div style="display:flex;align-items:center;padding-top:2px">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${e.unread?`#10b981`:`transparent`};border:1px solid ${e.unread?`#10b981`:`var(--border)`}"></span>
                </div>

                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <b style="font-size:15px;color:var(--ez-tx);${e.unread?`font-weight:700`:`font-weight:500`}">
                        ${e.from_name||e.from_email}
                      </b>
                      <span class="dim" style="font-size:12.5px">&lt;${e.from_email}&gt;</span>

                      <!-- Selo da Conta que recebeu a mensagem -->
                      <span class="badge" style="font-size:11.5px;font-weight:600;background:${i?`rgba(239,68,68,0.12)`:`rgba(215,156,69,0.12)`};color:${i?`#f87171`:`var(--brand)`};border:1px solid ${i?`rgba(239,68,68,0.3)`:`rgba(215,156,69,0.3)`}">
                        📥 ${e.account}
                      </span>

                      ${t?v`
                        <span style="background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.35);color:#38bdf8;padding:2px 8px;border-radius:6px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px">
                          ${y(`user`)}Lead: ${t.full_name||t.username||`Identificado`}
                        </span>
                        ${t.username?v`
                          <a href="https://instagram.com/${t.username}" target="_blank" rel="noopener noreferrer" style="color:#e1306c;font-size:12px;text-decoration:none;font-weight:600" onclick="event.stopPropagation()">
                            📸 @${t.username}
                          </a>
                        `:``}
                      `:``}
                    </div>

                    <small class="dim" style="font-size:12px">${e.date?e.date.slice(0,22):``}</small>
                  </div>

                  <div style="margin-top:6px;font-size:14px;color:var(--ez-tx);${e.unread?`font-weight:600`:``}">
                    ${e.subject||`(Sem assunto)`}
                  </div>

                  <div class="dim" style="font-size:13px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:850px">
                    ${e.snippet||`(Mensagem sem prévia)`}
                  </div>
                </div>

                <div style="display:flex;gap:8px;align-items:center" onclick="event.stopPropagation()">
                  ${r?v`
                    <a href="${r}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="color:#22c55e;border-color:rgba(34,197,94,0.3);display:inline-flex;align-items:center;gap:4px" title="Chamar no WhatsApp">
                      ${y(`chat`)}WhatsApp
                    </a>
                  `:``}
                  <button class="btn btn-secondary btn-sm" data-reply-btn="${e.id}">${y(`send`)}Responder</button>
                </div>
              </div>
            `})}
          </div>
        `:v`
          <div style="text-align:center;padding:50px 20px">
            <span class="ic">${y(`inbox`)}</span>
            <h3 style="margin-top:10px;font-size:16px;color:var(--ez-tx)">Nenhuma mensagem encontrada</h3>
            <p class="dim" style="margin-top:4px;font-size:13px">
              As respostas dos seus disparos cairão automaticamente nesta caixa centralizada.
            </p>
          </div>
        `}
      </div>
    `)}function c(){e.addEventListener(`change`,e=>{e.target&&e.target.id===`sel-inbox-account`&&(r=e.target.value,o())}),e.addEventListener(`click`,async e=>{if(e.target.closest(`#btn-refresh`)){await o();return}let n=e.target.closest(`[data-filter]`);if(n){i=n.dataset.filter,s();return}let r=e.target.closest(`[data-reply-btn]`);if(r){let e=r.dataset.replyBtn,n=t.find(t=>t.id===e);n&&u(n);return}let a=e.target.closest(`[data-msg-id]`);if(a){let e=a.dataset.msgId,n=t.find(t=>t.id===e);n&&await l(n)}})}async function l(e){N(`Carregando mensagem…`,`info`);let t=null;try{t=await x(`/email/inbox/${encodeURIComponent(e.uid)}?account=${encodeURIComponent(e.account)}`)}catch(e){N(e.message,`error`);return}e.unread=!1,s();let n=document.createElement(`div`),r=t.lead,i=r&&r.phone?r.phone.replace(/\\D/g,``):``,a=i?i.startsWith(`55`)?`https://wa.me/${i}`:`https://wa.me/55${i}`:``;b(n,v`
      <div style="display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow-y:auto">
        <!-- Detalhes do Lead se encontrado -->
        ${r?v`
          <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <div style="font-weight:600;color:#38bdf8;font-size:14px">
                👤 Lead Reconhecido: ${r.full_name||r.username||`Cliente`}
              </div>
              <div style="font-size:12.5px;color:var(--ez-tx2);margin-top:2px">
                Categoria: <b>${r.category||`Geral`}</b> · Cidade: <b>${r.city||`—`}</b>
                ${r.username?v` · Instagram: <a href="https://instagram.com/${r.username}" target="_blank" rel="noopener noreferrer" style="color:#e1306c;font-weight:600">@${r.username}</a>`:``}
              </div>
            </div>
            ${a?v`
              <a href="${a}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="background:#22c55e;border-color:#22c55e;color:#fff;display:inline-flex;align-items:center;gap:4px">
                ${y(`chat`)}Abrir no WhatsApp
              </a>
            `:``}
          </div>
        `:``}

        <!-- Cabeçalho do E-mail -->
        <div style="border-bottom:1px solid var(--border);padding-bottom:12px">
          <h3 style="margin:0 0 8px 0;font-size:17px;color:var(--ez-tx)">${t.subject||`(Sem assunto)`}</h3>
          <div style="font-size:13px;color:var(--ez-tx2);display:flex;flex-direction:column;gap:4px">
            <div><b>De:</b> ${t.from_name} &lt;${t.from_email}&gt;</div>
            <div><b>Para:</b> ${t.to}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <b>Caixa Postal:</b>
              <span class="badge" style="font-size:11.5px;font-weight:600;color:var(--brand);border-color:rgba(215,156,69,0.4)">
                📥 ${t.account}
              </span>
            </div>
            <div><b>Data:</b> ${t.date}</div>
          </div>
        </div>

        <!-- Conteúdo do E-mail -->
        <div style="background:var(--card-bg);padding:14px;border:1px solid var(--border);border-radius:8px;font-size:13.5px;line-height:1.6;color:var(--ez-tx);min-height:140px;overflow-x:auto">
          ${t.body_html?h(t.body_html):v`<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${t.body_text}</pre>`}
        </div>
      </div>
    `),I({title:`Mensagem Recebida`,icon:`chat`,size:`lg`,body:n,actions:[{label:`Fechar`,cls:`btn-ghost`},{label:`Responder`,cls:`btn-primary`,icon:`send`,onClick:()=>(u(t),!0)}]})}function u(e){let t=document.createElement(`div`),i=e.subject&&e.subject.toLowerCase().startsWith(`re:`)?e.subject:`Re: ${e.subject||`Contato`}`,a=e.account||(r===`all`?n[0]?n[0].email:``:r);b(t,v`
      <div class="form-grid" style="display:flex;flex-direction:column;gap:14px">
        <div class="field full">
          <span>Para</span>
          <input class="input" id="reply-to" value="${e.from_email}" readonly style="width:100%;background:rgba(255,255,255,0.05)">
        </div>

        <div class="field full">
          <span>Assunto</span>
          <input class="input" id="reply-subject" value="${i}" style="width:100%">
        </div>

        <div class="field full">
          <span>Enviar resposta usando a conta:</span>
          <select class="input" id="reply-account" style="width:100%;font-weight:600">
            ${n.map(e=>v`
              <option value="${e.email}" ${e.email===a?`selected`:``}>
                ${e.email} (${e.provider===`gmail`?`Gmail`:e.provider})
              </option>
            `)}
          </select>
        </div>

        <div class="field full">
          <span>Sua Resposta</span>
          <textarea class="input" id="reply-body" rows="6" placeholder="Olá! Tudo bem? Segue a proposta..." style="width:100%;resize:vertical"></textarea>
        </div>
      </div>
    `),I({title:`Responder para ${e.from_name||e.from_email}`,icon:`send`,body:t,actions:[{label:`Cancelar`,cls:`btn-ghost`},{label:`Enviar Resposta`,cls:`btn-primary`,icon:`send`,onClick:async()=>{let n=t.querySelector(`#reply-body`).value.trim(),r=t.querySelector(`#reply-subject`).value.trim(),i=t.querySelector(`#reply-account`).value.trim()||a;if(!n)return N(`Escreva sua resposta antes de enviar.`,`error`),!1;try{return N(`Enviando resposta…`,`info`),N((await x(`/email/inbox/${encodeURIComponent(e.uid)}/reply?account=${encodeURIComponent(i)}`,{method:`POST`,body:{to:e.from_email,subject:r,body:n,account:i}})).message,`success`),!0}catch(e){return N(e.message,`error`),!1}}}]})}c(),await o()}const Ot=[[/^\/$/,ie,`/`,`Buscar no Google Maps`,`radar`,`Encontrar`],[/^\/clientes$/,xe,`/clientes`,`Lista de ligações`,`user`,`Encontrar`],[/^\/importar$/,ze,`/importar`,`Importar do Maps`,``,``],[/^\/site$/,Qe,`/site`,`Site de exemplo`,`image`,`Mostrar ao cliente`],[/^\/site-clinica$/,dt,`/site-clinica`,`Site de clínica`,`sparkles`,`Mostrar ao cliente`],[/^\/checkout$/,gt,`/checkout`,`Página de pagamento`,`wallet`,`Mostrar ao cliente`],[/^\/email-leads$/,vt,`/email-leads`,`Contatos do Instagram`,`user`,`E-mail e Instagram`],[/^\/disparo$/,wt,`/disparo`,`Enviar e-mails`,`send`,`E-mail e Instagram`],[/^\/inbox$/,Et,`/inbox`,`Respostas`,`chat`,`E-mail e Instagram`],[/^\/modelos$/,St,`/modelos`,`Modelos de e-mail`,`edit`,`E-mail e Instagram`],[/^\/(contas|email-accounts|inboxes)$/,bt,`/contas`,`Contas de e-mail`,`layers`,`E-mail e Instagram`],[/^\/config$/,Le,`/config`,`Ajustes`,`sliders`,`Sistema`]],kt=Ot.filter(e=>e[4]).map(([,,e,t,n,r])=>({caminho:e,nome:t,ic:n,grupo:r}));let Q=null,$=0,At=null;async function jt(e,t){let n=String(t||`/`).split(`?`)[0].replace(/\/+$/,``)||`/`,r=Ot.find(([e])=>e.test(n))||Ot[0];if(ee(),Q&&Q.unmount)try{Q.unmount()}catch{}Q=null;let i=++$,a=document.createElement(`div`);if(a.className=`page`,e.replaceChildren(a),At||=o().catch(e=>{At=null,console.warn(e)}),await At,i!==$)return r[2];try{let e=await r[1].render(a,{query:new URLSearchParams(String(t||``).split(`?`)[1]||``)});i===$&&(Q=e||{})}catch(n){if(i!==$)return r[2];console.error(n),b(a,v`<div class="card"><div class="empty"><span class="ic">${y(`alert`)}</span><h3>Não consegui abrir esta tela</h3>
      <p>${n.message||String(n)}</p><button class="btn btn-primary" data-retry>${y(`refresh`)}Tentar de novo</button></div></div>`),a.querySelector(`[data-retry]`).addEventListener(`click`,()=>jt(e,t))}return r[2]}function Mt(){if(ee(),Q&&Q.unmount)try{Q.unmount()}catch{}Q=null,$+=1}document.addEventListener(`error`,e=>{let t=e.target;t&&t.tagName===`IMG`&&t.hasAttribute(`data-some-se-falhar`)&&(t.style.display=`none`)},!0),T(e=>{try{window.__snPonte.mudou(`radar`,e)}catch{}});export{kt as MENU,jt as mostra,Mt as sai};