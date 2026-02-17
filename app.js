const KEY = "wrmec_v1";
const SESSION_KEY = "wrmec_session_v1";
const AUTH_USERS_KEY = "wrmec_auth_users_v1";
const OS_STATUS = ["Orcamento", "Aguardando aprovacao", "Em execucao", "Finalizado", "Cancelado"];
const PAY_STATUS = ["Pendente", "Pago", "Atrasado"];
const ROLES = ["Administrador", "Escritorio", "Mecanico", "Financeiro"];
const DEFAULT_AUTH_USERS = [
  { username: "admin", password: "admin123", role: "Administrador", name: "Admin" },
  { username: "financeiro", password: "finance123", role: "Financeiro", name: "Financeiro" },
  { username: "escritorio", password: "escritorio123", role: "Escritorio", name: "Escritorio" },
  { username: "mecanico", password: "mecanico123", role: "Mecanico", name: "Mecanico" },
];
const ROLE = {
  Administrador: { finance: true, users: true, cancel: true, price: true },
  Escritorio: { finance: false, users: false, cancel: false, price: false },
  Atendente: { finance: false, users: false, cancel: false, price: false },
  Mecanico: { finance: false, users: false, cancel: false, price: false },
  Financeiro: { finance: true, users: false, cancel: false, price: false },
};
const BASE_MENU = [
  ["dashboard", "Dashboard"],
  ["cadastro", "Cadastro Base"],
  ["os", "Ordem de Servico"],
  ["agenda", "Agenda"],
  ["crm", "CRM"],
  ["usuarios", "Usuarios"],
  ["relatorios", "Relatorios"],
];

initAuthUsers();
const session = requireSession();
const s = load();
const isAdminRoute = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
const isFinanceRoute = window.location.pathname === "/financeiro" || window.location.pathname.startsWith("/financeiro/");
let tab = isAdminRoute ? "admin" : (isFinanceRoute ? "financeiro" : "dashboard");
syncSessionUser();

function getMenu() {
  if (isFinanceRoute) return [["financeiro", "Financeiro"], ["relatorios", "Relatorios"]];
  if (!isAdminRoute) return BASE_MENU;
  return [["admin", "Admin Cadastros"], ["estoque", "Estoque"], ["usuarios", "Usuarios"], ["relatorios", "Relatorios"]];
}

function initAuthUsers() {
  const raw = localStorage.getItem(AUTH_USERS_KEY);
  if (!raw) localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_AUTH_USERS));
}

function authUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAuthUsers(list) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(list));
}

function requireSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.username && parsed?.role) return parsed;
  } catch {}
  window.location.replace("/login/");
  throw new Error("Sessao obrigatoria");
}

function syncSessionUser() {
  const found = s.users.find((u) => u.name === (session.name || session.username) && u.role === session.role);
  if (found) {
    s.settings.currentUserId = found.id;
    return;
  }
  const created = { id: uid(), name: session.name || session.username, role: session.role };
  s.users.push(created);
  s.settings.currentUserId = created.id;
  save();
}
function load() {
  const id = uid();
  const base = {
    clients: [], vehicles: [], employees: [], services: [], products: [], orders: [],
    receivables: [], payables: [], agenda: [],
    users: [{ id, name: "Admin", role: "Administrador" }],
    audit: [{ id: uid(), who: "system", when: now(), action: "Sistema iniciado" }],
    settings: { currentUserId: id },
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return base;
  }
}

function save() { localStorage.setItem(KEY, JSON.stringify(s)); }
function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }
function now() { return new Date().toISOString(); }
function brl(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function d(v) { return v ? new Date(v).toLocaleDateString("pt-BR") : "-"; }
function me() { return s.users.find((u) => u.id === s.settings.currentUserId) || s.users[0]; }
function can(p) { return Boolean((ROLE[me()?.role] || {})[p]); }
function log(action) { s.audit.unshift({ id: uid(), who: me()?.name || "-", when: now(), action }); s.audit = s.audit.slice(0, 1000); }
function byId(a, id) { return a.find((x) => x.id === id); }
function val(form) {
  const o = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) o[k] = o[k] ? (Array.isArray(o[k]) ? [...o[k], v] : [o[k], v]) : v;
  return o;
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length : 0; }
function total(order) {
  const labor = Number(order.labor || 0);
  const sv = (order.services || []).reduce((a, id) => a + Number(byId(s.services, id)?.price || 0), 0);
  const pt = (order.parts || []).reduce((a, p) => a + Number(byId(s.products, p.productId)?.sale || 0) * Number(p.qty || 0), 0);
  return labor + sv + pt;
}

function options(arr, label, selected = "") {
  return `<option value="">Selecione</option>${arr.map((x) => `<option value="${x.id}" ${x.id === selected ? "selected" : ""}>${label(x)}</option>`).join("")}`;
}

function render() {
  const menu = getMenu();
  if (!menu.find(([id]) => id === tab)) tab = menu[0][0];
  document.getElementById("menu").innerHTML = menu.map(([id, label]) => `<button data-tab="${id}" class="${id === tab ? "active" : ""}">${label}</button>`).join("");
  document.getElementById("sectionTitle").textContent = menu.find(([id]) => id === tab)?.[1] || "WR Mecanica";
  document.getElementById("menu").onclick = (e) => { const b = e.target.closest("button[data-tab]"); if (!b) return; tab = b.dataset.tab; render(); };
  document.getElementById("currentUser").innerHTML = s.users.map((u) => `<option value="${u.id}" ${u.id === s.settings.currentUserId ? "selected" : ""}>${u.name} (${u.role})</option>`).join("");
  document.getElementById("currentUser").onchange = (e) => { s.settings.currentUserId = e.target.value; save(); render(); };
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.replace("/login/");
    };
  }
  alerts();
  const c = document.getElementById("sectionContent");
  if (tab === "admin") admin(c);
  if (tab === "dashboard") dashboard(c);
  if (tab === "cadastro") cadastro(c);
  if (tab === "os") os(c);
  if (tab === "estoque") estoque(c);
  if (tab === "financeiro") financeiro(c);
  if (tab === "agenda") agenda(c);
  if (tab === "crm") crm(c);
  if (tab === "usuarios") usuarios(c);
  if (tab === "relatorios") relatorios(c);
  save();
}

function alerts() {
  const crit = s.products.filter((p) => Number(p.stock || 0) <= Number(p.min || 0)).length;
  const overdue = s.receivables.filter((r) => r.status !== "Pago" && r.due && new Date(r.due) < new Date()).length;
  const late = s.orders.filter((o) => o.delivery && !["Finalizado", "Cancelado"].includes(o.status) && new Date(o.delivery) < new Date()).length;
  const items = [];
  if (crit) items.push(`Estoque critico: ${crit} item(ns)`);
  if (overdue) items.push(`Recebimentos atrasados: ${overdue}`);
  if (late) items.push(`OS em atraso: ${late}`);
  document.getElementById("alerts").innerHTML = items.map((x) => `<div class="alert warn">${x}</div>`).join("");
}

function dashboard(c) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const abertas = s.orders.filter((o) => !["Finalizado", "Cancelado"].includes(o.status)).length;
  const fechadas = s.orders.filter((o) => o.status === "Finalizado").length;
  const tempo = avg(s.orders.filter((o) => o.closedAt).map((o) => (new Date(o.closedAt) - new Date(o.createdAt)) / 3600000));
  const critico = s.products.filter((p) => Number(p.stock || 0) <= Number(p.min || 0)).length;
  const fluxo = {
    orcamento: s.orders.filter((o) => o.status === "Orcamento").length,
    aguardando: s.orders.filter((o) => o.status === "Aguardando aprovacao").length,
    execucao: s.orders.filter((o) => o.status === "Em execucao").length,
    finalizado: s.orders.filter((o) => o.status === "Finalizado").length,
    cancelado: s.orders.filter((o) => o.status === "Cancelado").length,
  };
  const atrasadasRows = s.orders
    .filter((o) => o.delivery && !["Finalizado", "Cancelado"].includes(o.status) && new Date(o.delivery) < new Date())
    .map((o) => [o.code, byId(s.clients, o.clientId)?.name || "-", d(o.delivery), `<span class="tag ${statusTag(o.status)}">${o.status}</span>`]);
  const agendaHojeRows = s.agenda
    .filter((a) => a.date === todayIso)
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    .map((a) => [a.time, a.service, byId(s.employees, a.employeeId)?.name || "-", `${a.duration}h`, a.blocked ? "Bloqueado" : "Ativo"]);
  const estoqueCriticoRows = s.products
    .filter((p) => Number(p.stock || 0) <= Number(p.min || 0))
    .map((p) => [p.code, p.desc, p.stock || 0, p.min || 0]);
  const receberPendenteRows = s.receivables
    .filter((r) => r.status !== "Pago")
    .slice(0, 8)
    .map((r) => [r.desc, brl(r.amount), d(r.due), r.status]);
  const pagarPendenteRows = s.payables
    .filter((p) => p.status !== "Pago")
    .slice(0, 8)
    .map((p) => [p.desc, p.supplier || "-", brl(p.amount), d(p.due), p.status]);
  const topClientesMap = {};
  s.orders.forEach((o) => {
    const name = byId(s.clients, o.clientId)?.name || "-";
    topClientesMap[name] = (topClientesMap[name] || 0) + total(o);
  });
  const topClientesRows = Object.entries(topClientesMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => [name, brl(value)]);

  const fluxoRows = s.orders.map((o) => [
    o.code,
    byId(s.clients, o.clientId)?.name || "-",
    byId(s.vehicles, o.vehicleId)?.plate || "-",
    `<span class="tag ${statusTag(o.status)}">${o.status}</span>`,
    brl(total(o)),
    `<div class="inline-actions"><button class="secondary" data-a="next" data-id="${o.id}">Avancar</button><button class="secondary" data-a="pdf" data-id="${o.id}">PDF</button><button class="secondary" data-a="wa" data-id="${o.id}">WhatsApp</button><button class="danger" data-a="cancel" data-id="${o.id}" ${can("cancel") ? "" : "disabled"}>Cancelar</button></div>`,
  ]);
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>OS abertas vs fechadas</h3><div class="kpi">${abertas} / ${fechadas}</div></article>
    <article class="card"><h3>Tempo medio de servico</h3><div class="kpi">${tempo.toFixed(1)}h</div></article>
    <article class="card"><h3>Estoque critico</h3><div class="kpi">${critico}</div></article>
  </div>
  <article class="card" style="margin-top:12px;">
    <h3>Fluxo da OS</h3>
    <div class="timeline">
      <span class="step-pill">Orcamento: ${fluxo.orcamento}</span>
      <span class="step-pill">Aguardando aprovacao: ${fluxo.aguardando}</span>
      <span class="step-pill">Em execucao: ${fluxo.execucao}</span>
      <span class="step-pill">Finalizado: ${fluxo.finalizado}</span>
      <span class="step-pill">Cancelado: ${fluxo.cancelado}</span>
    </div>
  </article>
  <article class="card" style="margin-top:12px;">
    <h3>Fluxo da OS - Detalhado</h3>
    <div id="dashboardOsTable">
      ${table(["OS","Cliente","Veiculo","Status","Total","Acoes"], fluxoRows, true)}
    </div>
  </article>
  <div class="dashboard-panels" style="margin-top:12px;">
    <article class="card">
      <h3>Agenda de hoje</h3>
      ${table(["Hora","Servico","Mecanico","Duracao","Status"], agendaHojeRows)}
    </article>
    <article class="card">
      <h3>Estoque critico</h3>
      ${table(["Codigo","Peca","Qtd","Minimo"], estoqueCriticoRows)}
    </article>
    <article class="card">
      <h3>Contas a receber pendentes</h3>
      ${table(["Descricao","Valor","Vencimento","Status"], receberPendenteRows)}
    </article>
    <article class="card">
      <h3>Contas a pagar pendentes</h3>
      ${table(["Descricao","Fornecedor","Valor","Vencimento","Status"], pagarPendenteRows)}
    </article>
    <article class="card">
      <h3>OS com atraso de entrega</h3>
      ${table(["OS","Cliente","Previsao","Status"], atrasadasRows, true)}
    </article>
    <article class="card">
      <h3>Top clientes (faturamento)</h3>
      ${table(["Cliente","Total"], topClientesRows)}
    </article>
  </div>`;

  c.querySelector("#dashboardOsTable table")?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const o = byId(s.orders, b.dataset.id); if (!o) return;
    if (b.dataset.a === "next") { nextOS(o); render(); }
    if (b.dataset.a === "cancel" && can("cancel")) { o.status = "Cancelado"; o.updatedAt = now(); log(`OS cancelada: ${o.code}`); render(); }
    if (b.dataset.a === "pdf") printOS(o);
    if (b.dataset.a === "wa") wa(o);
  });
}
function cadastro(c) {
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>Clientes</h3><form id="fClient" class="form-grid">
      <input name="name" placeholder="Nome" required><input name="doc" placeholder="CPF/CNPJ" required><input name="phone" placeholder="Telefone" required>
      <input name="whats" placeholder="WhatsApp"><input name="email" placeholder="E-mail"><input name="address" placeholder="Endereco"><button>Cadastrar</button>
    </form></article>
    <article class="card"><h3>Veiculos</h3><form id="fVeh" class="form-grid">
      <input name="plate" placeholder="Placa" required><input name="model" placeholder="Modelo" required><input name="brand" placeholder="Marca" required>
      <input name="year" type="number" placeholder="Ano" required><input name="color" placeholder="Cor" required><input name="km" type="number" placeholder="KM atual" required>
      <input name="vin" placeholder="VIN opcional"><select name="clientId" required>${options(s.clients, (x) => x.name)}</select><button>Cadastrar</button>
    </form></article>
  </div>
  <div class="split-2" style="margin-top:12px;">
    <article class="card"><h3>Clientes</h3>${table(["Nome","CPF/CNPJ","Telefone","WhatsApp","Historico"], s.clients.map((x) => [x.name,x.doc,x.phone,x.whats||"-", s.orders.filter((o) => o.clientId===x.id).length]))}</article>
    <article class="card"><h3>Veiculos</h3>${table(["Placa","Modelo","Marca","Ano","Cliente"], s.vehicles.map((x) => [x.plate,x.model,x.brand,x.year,byId(s.clients,x.clientId)?.name||"-"]))}</article>
  </div>`;
  on("#fClient", (v) => { s.clients.push({ id: uid(), ...v, createdAt: now() }); log(`Cliente cadastrado: ${v.name}`); render(); });
  on("#fVeh", (v) => { s.vehicles.push({ id: uid(), ...v, createdAt: now() }); log(`Veiculo cadastrado: ${v.plate}`); render(); });
}

function admin(c) {
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>Funcionarios</h3><form id="fEmp" class="form-grid">
      <input name="name" placeholder="Nome" required><select name="role"><option>Mecanico</option><option>Escritorio</option><option>Gerente</option></select>
      <input name="commission" type="number" step="0.1" placeholder="Comissao %" required><input name="worked" type="number" step="0.1" placeholder="Horas trabalhadas">
      <input name="billed" type="number" step="0.1" placeholder="Horas faturadas"><button>Cadastrar</button>
    </form></article>
    <article class="card"><h3>Servicos</h3><form id="fSvc" class="form-grid">
      <input name="name" placeholder="Servico" required><input name="price" type="number" step="0.01" placeholder="Preco base" required><input name="hours" type="number" step="0.1" placeholder="Tempo medio" required><button>Cadastrar</button>
    </form></article>
    <article class="card"><h3>Pecas/Produtos</h3><form id="fPrd" class="form-grid">
      <input name="code" placeholder="Codigo" required><input name="desc" placeholder="Descricao" required><input name="cost" type="number" step="0.01" placeholder="Custo" required>
      <input name="sale" type="number" step="0.01" placeholder="Preco venda" required><input name="supplier" placeholder="Fornecedor" required><input name="min" type="number" placeholder="Estoque minimo" required><input name="stock" type="number" placeholder="Estoque atual" required><button>Cadastrar</button>
    </form></article>
  </div>
  <div class="grid" style="margin-top:12px;">
    <article class="card"><h3>Funcionarios</h3>${table(["Nome","Funcao","Comissao","H. Faturadas","H. Trabalhadas"], s.employees.map((x) => [x.name,x.role,`${x.commission}%`,x.billed||0,x.worked||0]))}</article>
    <article class="card"><h3>Servicos</h3>${table(["Servico","Preco","Tempo"], s.services.map((x) => [x.name,brl(x.price),`${x.hours}h`]))}</article>
    <article class="card"><h3>Pecas</h3>${table(["Codigo","Descricao","Custo","Venda","Estoque","Minimo"], s.products.map((x) => [x.code,x.desc,brl(x.cost),brl(x.sale),x.stock||0,x.min||0]))}</article>
  </div>`;
  on("#fEmp", (v) => { s.employees.push({ id: uid(), ...v, createdAt: now() }); log(`Funcionario cadastrado: ${v.name}`); render(); });
  on("#fSvc", (v) => { s.services.push({ id: uid(), ...v, createdAt: now() }); log(`Servico cadastrado: ${v.name}`); render(); });
  on("#fPrd", (v) => { s.products.push({ id: uid(), ...v, batches: [], createdAt: now() }); log(`Produto cadastrado: ${v.desc}`); render(); });
}

function os(c) {
  const counts = {
    orc: s.orders.filter((o) => o.status === "Orcamento").length,
    ag: s.orders.filter((o) => o.status === "Aguardando aprovacao").length,
    ex: s.orders.filter((o) => o.status === "Em execucao").length,
    fin: s.orders.filter((o) => o.status === "Finalizado").length,
    can: s.orders.filter((o) => o.status === "Cancelado").length,
  };

  c.innerHTML = `
  <div class="section-stack">
    <article class="card">
      <h3>Abertura de OS</h3>
      <div class="timeline" style="margin-bottom:10px;">
        <span class="step-pill">Orcamento: ${counts.orc}</span>
        <span class="step-pill">Aguardando aprovacao: ${counts.ag}</span>
        <span class="step-pill">Em execucao: ${counts.ex}</span>
        <span class="step-pill">Finalizado: ${counts.fin}</span>
        <span class="step-pill">Cancelado: ${counts.can}</span>
      </div>
      <form id="fOS" class="section-stack">
        <div class="subcard">
          <h4>Dados principais</h4>
          <div class="form-grid">
            <input name="code" value="OS-${String(s.orders.length + 1).padStart(4, "0")}" required>
            <select name="clientId" required>${options(s.clients, (x) => x.name)}</select>
            <select name="vehicleId" required>${options(s.vehicles, (x) => `${x.plate} - ${x.model}`)}</select>
            <input name="delivery" type="datetime-local" required>
            <div class="toggle-field">
              <span>Cliente aprovou o orcamento</span>
              <label class="switch">
                <input id="approvedToggle" name="approved" type="checkbox">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="split-2">
          <div class="subcard">
            <h4>Servicos</h4>
            <div id="serviceToggleList" class="service-toggle-list">
              ${s.services.map((x) => `<button type="button" class="toggle-btn" data-service-id="${x.id}" data-service-price="${Number(x.price || 0)}">${x.name} (${brl(x.price)})</button>`).join("") || "<small>Cadastre servicos.</small>"}
            </div>
            <div class="selected-list" id="selectedServicesBox">
              <small>Nenhum servico selecionado.</small>
            </div>
            <div class="metric-line" style="margin-top:8px;">
              <span>Total de servicos</span>
              <b id="servicesTotalValue">${brl(0)}</b>
            </div>
            <div class="metric-line">
              <span>Previsao total OS (servicos + pecas)</span>
              <b id="orderPreviewValue">${brl(0)}</b>
            </div>
          </div>
          <div class="subcard">
            <h4>Pecas</h4>
            <div id="partToggleList" class="service-toggle-list">
              ${s.products.map((x) => `<button type="button" class="toggle-btn" data-part-id="${x.id}">${x.desc} (${brl(x.sale)} | est. ${x.stock || 0})</button>`).join("") || "<small>Cadastre pecas.</small>"}
            </div>
            <div class="selected-list" id="selectedPartsBox">
              <small>Nenhuma peca selecionada.</small>
            </div>
            <div class="metric-line" style="margin-top:8px;">
              <span>Total de pecas</span>
              <b id="partsTotalValue">${brl(0)}</b>
            </div>
          </div>
        </div>
        <div class="inline-actions">
          <button>Criar OS</button>
        </div>
      </form>
    </article>

    <article class="card">
      <h3>Fluxo da OS</h3>
    ${table(["OS","Cliente","Veiculo","Status","Total","Acoes"], s.orders.map((o) => [
      o.code, byId(s.clients,o.clientId)?.name||"-", byId(s.vehicles,o.vehicleId)?.plate||"-",
      `<span class="tag ${statusTag(o.status)}">${o.status}</span>`, brl(total(o)),
      `<div class="inline-actions"><button class="secondary" data-a="next" data-id="${o.id}">Avancar</button><button class="secondary" data-a="pdf" data-id="${o.id}">PDF</button><button class="secondary" data-a="wa" data-id="${o.id}">WhatsApp</button><button class="danger" data-a="cancel" data-id="${o.id}" ${can("cancel") ? "" : "disabled"}>Cancelar</button></div>`
    ]), true)}
    </article>
  </div>`;

  const selectedServices = new Set();
  const serviceButtons = Array.from(c.querySelectorAll("[data-service-id]"));
  const selectedBox = document.getElementById("selectedServicesBox");
  const selectedPartsBox = document.getElementById("selectedPartsBox");
  const serviceTotalEl = document.getElementById("servicesTotalValue");
  const partsTotalEl = document.getElementById("partsTotalValue");
  const orderPreviewEl = document.getElementById("orderPreviewValue");
  const selectedParts = new Map();
  const partButtons = Array.from(c.querySelectorAll("[data-part-id]"));

  function partTotalValue() {
    let totalParts = 0;
    selectedParts.forEach((qty, partId) => {
      const p = byId(s.products, partId);
      totalParts += Number(p?.sale || 0) * Number(qty || 0);
    });
    return totalParts;
  }

  function refreshServiceSummary() {
    const ids = Array.from(selectedServices);
    const chosen = ids.map((id) => byId(s.services, id)).filter(Boolean);
    const serviceTotal = chosen.reduce((acc, item) => acc + Number(item.price || 0), 0);
    const partsTotal = partTotalValue();
    const preview = serviceTotal + partsTotal;

    selectedBox.innerHTML = chosen.length
      ? chosen.map((item) => `<div>${item.name} - ${brl(item.price)}</div>`).join("")
      : "<small>Nenhum servico selecionado.</small>";
    serviceTotalEl.textContent = brl(serviceTotal);
    partsTotalEl.textContent = brl(partsTotal);
    orderPreviewEl.textContent = brl(preview);
  }

  function refreshPartsSummary() {
    const rows = [];
    selectedParts.forEach((qty, partId) => {
      const p = byId(s.products, partId);
      if (!p) return;
      rows.push(`
        <div class="selected-item-row">
          <span>${p.desc}</span>
          <input class="qty-input" type="number" min="1" value="${Number(qty || 1)}" data-part-qty="${partId}">
          <small>${brl(Number(p.sale || 0) * Number(qty || 0))}</small>
        </div>
      `);
    });
    selectedPartsBox.innerHTML = rows.length ? rows.join("") : "<small>Nenhuma peca selecionada.</small>";
    refreshServiceSummary();
  }

  serviceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.serviceId;
      if (!id) return;
      if (selectedServices.has(id)) {
        selectedServices.delete(id);
        btn.classList.remove("active");
      } else {
        selectedServices.add(id);
        btn.classList.add("active");
      }
      refreshServiceSummary();
    });
  });

  partButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.partId;
      if (!id) return;
      if (selectedParts.has(id)) {
        selectedParts.delete(id);
        btn.classList.remove("active");
      } else {
        selectedParts.set(id, 1);
        btn.classList.add("active");
      }
      refreshPartsSummary();
    });
  });

  selectedPartsBox.addEventListener("input", (e) => {
    const inp = e.target.closest("input[data-part-qty]");
    if (!inp) return;
    const partId = inp.dataset.partQty;
    const qty = Math.max(1, Number(inp.value || 1));
    selectedParts.set(partId, qty);
    inp.value = String(qty);
    refreshPartsSummary();
  });

  refreshPartsSummary();
  refreshServiceSummary();

  document.getElementById("fOS").onsubmit = async (e) => {
    e.preventDefault();
    const v = val(e.target);
    const sv = Array.from(selectedServices);
    const parts = Array.from(selectedParts.entries()).map(([productId, qty]) => ({ productId, qty: Number(qty || 1) })).filter((x) => x.qty > 0);
    s.orders.unshift({
      id: uid(), code: v.code, clientId: v.clientId, vehicleId: v.vehicleId, checkin: "", labor: 0, delivery: v.delivery,
      signature: "", approved: Boolean(v.approved), services: sv, parts, before: [], after: [],
      status: v.approved ? "Aguardando aprovacao" : "Orcamento", createdAt: now(), updatedAt: now(), techHours: []
    });
    log(`OS criada: ${v.code}`); render();
  };

  c.querySelector("table").onclick = (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const o = byId(s.orders, b.dataset.id); if (!o) return;
    if (b.dataset.a === "next") { nextOS(o); render(); }
    if (b.dataset.a === "cancel" && can("cancel")) { o.status = "Cancelado"; o.updatedAt = now(); log(`OS cancelada: ${o.code}`); render(); }
    if (b.dataset.a === "pdf") printOS(o);
    if (b.dataset.a === "wa") wa(o);
  };
}

function nextOS(o) {
  if (o.status === "Orcamento") o.status = "Aguardando aprovacao";
  else if (o.status === "Aguardando aprovacao") o.status = "Em execucao";
  else if (o.status === "Em execucao") {
    o.status = "Finalizado";
    o.closedAt = now();
    o.parts.forEach((p) => { const pr = byId(s.products, p.productId); if (pr) pr.stock = Number(pr.stock || 0) - Number(p.qty || 0); });
    if (!s.receivables.find((r) => r.orderId === o.id)) s.receivables.push({
      id: uid(), orderId: o.id, desc: `Pagamento ${o.code}`, amount: total(o), method: "Pix", installments: 1, status: "Pendente", due: o.delivery, createdAt: now()
    });
  }
  o.updatedAt = now();
  log(`OS atualizada: ${o.code} -> ${o.status}`);
}
function estoque(c) {
  const sold = {};
  s.orders.forEach((o) => (o.parts || []).forEach((p) => { sold[p.productId] = (sold[p.productId] || 0) + Number(p.qty || 0); }));
  const giro = Object.values(sold).reduce((a, b) => a + b, 0);
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, q]) => `${byId(s.products, id)?.desc || id}: ${q}`).join("<br>");
  const paradas = s.products.filter((p) => !sold[p.id]).map((p) => p.desc).join(", ");
  const imob = s.products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.cost || 0), 0);
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>Entrada de estoque</h3><form id="fStock" class="form-grid">
      <select name="productId" required>${options(s.products, (x) => `${x.code} - ${x.desc}`)}</select><input name="qty" type="number" min="1" placeholder="Quantidade" required>
      <input name="lot" placeholder="Lote" required><input name="expiry" type="date" required><input name="cost" type="number" step="0.01" placeholder="Custo unitario" required><button>Registrar</button>
    </form></article>
    <article class="card"><h3>Giro de estoque</h3><div class="kpi">${giro}</div></article>
    <article class="card"><h3>Pecas mais vendidas</h3><div>${top || "Sem dados"}</div></article>
    <article class="card"><h3>Pecas encalhadas</h3><div>${paradas || "Nenhuma"}</div></article>
    <article class="card"><h3>Custo imobilizado</h3><div class="kpi">${brl(imob)}</div></article>
  </div>
  <article class="card" style="margin-top:12px;"><h3>Controle de pecas</h3>
    ${table(["Codigo","Descricao","Qtd","Min","Lote","Validade","Margem"], s.products.map((p) => [p.code,p.desc,p.stock||0,p.min||0,(p.batches||[]).slice(-1)[0]?.lot||"-",(p.batches||[]).slice(-1)[0]?.expiry||"-",brl(Number(p.sale||0)-Number(p.cost||0))]))}
  </article>`;
  on("#fStock", (v) => {
    const p = byId(s.products, v.productId); if (!p) return;
    p.stock = Number(p.stock || 0) + Number(v.qty || 0);
    p.cost = Number(v.cost || p.cost || 0);
    p.batches = p.batches || [];
    p.batches.push({ id: uid(), qty: Number(v.qty), lot: v.lot, expiry: v.expiry, at: now() });
    s.payables.push({ id: uid(), desc: `Compra estoque ${p.desc}`, supplier: p.supplier, amount: Number(v.qty) * Number(v.cost), due: now().slice(0, 10), status: "Pendente", createdAt: now() });
    log(`Entrada de estoque: ${p.desc} +${v.qty}`); render();
  });
}

function financeiro(c) {
  if (!can("finance")) { c.innerHTML = `<article class="card"><h3>Acesso restrito</h3><p>Seu perfil nao pode ver financeiro.</p></article>`; return; }
  const today = new Date().toDateString();
  const faturamentoDia = s.orders
    .filter((o) => o.status === "Finalizado" && new Date(o.closedAt || o.createdAt).toDateString() === today)
    .reduce((a, o) => a + total(o), 0);
  const entradas = s.receivables.filter((x) => x.status === "Pago").reduce((a, x) => a + Number(x.amount || 0), 0);
  const saidas = s.payables.filter((x) => x.status === "Pago").reduce((a, x) => a + Number(x.amount || 0), 0);
  const ticket = avg(s.orders.filter((o) => o.status === "Finalizado").map((o) => total(o)));
  const faturamentoMes = s.orders.filter((o) => o.status === "Finalizado").filter((o) => {
    const dt = new Date(o.closedAt || o.updatedAt || o.createdAt); const n = new Date();
    return dt.getMonth() === n.getMonth() && dt.getFullYear() === n.getFullYear();
  }).reduce((a, o) => a + total(o), 0);
  const margem = faturamentoMes ? ((faturamentoMes - saidas) / faturamentoMes) * 100 : 0;
  const lucrativos = serviceProfit().slice(0, 5).map((x) => `${x.name}: ${brl(x.value)}`).join("<br>");
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>Faturamento do dia</h3><div class="kpi">${brl(faturamentoDia)}</div></article>
  </div>
  <div class="grid" style="margin-top:12px;">
    <article class="card"><h3>Linha: faturamento mensal</h3><canvas id="cv1" width="620" height="220"></canvas></article>
    <article class="card"><h3>Barras: servicos mais vendidos</h3><canvas id="cv2" width="620" height="220"></canvas></article>
    <article class="card"><h3>Pizza: formas de pagamento</h3><canvas id="cv3" width="620" height="220"></canvas></article>
    <article class="card"><h3>Heatmap: horarios</h3><canvas id="cv4" width="620" height="220"></canvas></article>
  </div>
  <div class="grid">
    <article class="card"><h3>Entradas</h3><div class="kpi">${brl(entradas)}</div></article>
    <article class="card"><h3>Saidas</h3><div class="kpi">${brl(saidas)}</div></article>
    <article class="card"><h3>Saldo projetado</h3><div class="kpi">${brl(entradas - saidas)}</div></article>
    <article class="card"><h3>Ticket medio</h3><div class="kpi">${brl(ticket)}</div></article>
    <article class="card"><h3>Faturamento mensal</h3><div class="kpi">${brl(faturamentoMes)}</div></article>
    <article class="card"><h3>Margem liquida</h3><div class="kpi">${margem.toFixed(1)}%</div></article>
    <article class="card"><h3>Servicos lucrativos</h3><div>${lucrativos || "Sem dados"}</div></article>
  </div>
  <article class="card" style="margin-top:12px;"><h3>Conta a pagar</h3><form id="fPay" class="form-grid">
    <input name="desc" placeholder="Descricao" required><input name="supplier" placeholder="Fornecedor"><input name="amount" type="number" step="0.01" placeholder="Valor" required><input name="due" type="date" required><button>Cadastrar</button>
  </form></article>
  <div class="grid" style="margin-top:12px;">
    <article class="card"><h3>Receber</h3>${table(["Descricao","Valor","Forma","Parcelas","Venc","Status","Acao"], s.receivables.map((r) => [r.desc,brl(r.amount),r.method,r.installments||1,d(r.due),r.status,`<button class="secondary" data-r="${r.id}">Marcar pago</button>`]), true)}</article>
    <article class="card"><h3>Pagar</h3>${table(["Descricao","Fornecedor","Valor","Venc","Status"], s.payables.map((p) => [p.desc,p.supplier||"-",brl(p.amount),d(p.due),p.status]))}</article>
  </div>`;
  drawLine("cv1");
  drawBars("cv2");
  drawPie("cv3");
  drawHeat("cv4");
  on("#fPay", (v) => { s.payables.push({ id: uid(), ...v, status: "Pendente", createdAt: now() }); log(`Conta a pagar criada: ${v.desc}`); render(); });
  c.querySelector("table").onclick = (e) => {
    const b = e.target.closest("button[data-r]"); if (!b) return;
    const r = byId(s.receivables, b.dataset.r); if (!r) return;
    r.status = "Pago"; r.paidAt = now(); log(`Recebimento pago: ${r.desc}`); render();
  };
}

function agenda(c) {
  const totalAg = s.agenda.length;
  const bloqueios = s.agenda.filter((a) => a.blocked).length;
  const hoje = new Date().toISOString().slice(0, 10);
  const hojeQtd = s.agenda.filter((a) => a.date === hoje).length;

  c.innerHTML = `
  <div class="section-stack">
    <div class="split-2">
      <article class="card">
        <h3>Agendamento de servicos</h3>
        <form id="fAg" class="section-stack">
          <div class="subcard">
            <h4>Dados do agendamento</h4>
            <div class="form-grid">
              <input name="service" placeholder="Servico" required>
              <select name="employeeId" required>${options(s.employees, (x) => x.name)}</select>
              <input name="date" type="date" required>
              <input name="time" type="time" required>
              <input name="duration" type="number" step="0.5" placeholder="Duracao h" required>
              <input name="delivery" type="datetime-local" placeholder="Previsao entrega">
              <label class="flex-row"><input name="blocked" type="checkbox"> Bloquear horario</label>
            </div>
          </div>
          <div class="inline-actions">
            <button>Salvar agendamento</button>
          </div>
        </form>
      </article>
      <article class="card">
        <h3>Painel operacional</h3>
        <div class="metric-list">
          <div class="metric-line"><span>Agendamentos totais</span><b>${totalAg}</b></div>
          <div class="metric-line"><span>Agendamentos hoje</span><b>${hojeQtd}</b></div>
          <div class="metric-line"><span>Horarios bloqueados</span><b>${bloqueios}</b></div>
        </div>
        <div class="subcard" style="margin-top:10px;">
          <h4>Capacidade por mecanico/dia</h4>
          <div>${capacity()}</div>
        </div>
        <div class="subcard" style="margin-top:10px;">
          <h4>Alertas de atraso</h4>
          <div>${lateOrders()}</div>
        </div>
      </article>
    </div>

    <article class="card">
      <h3>Agenda registrada</h3>
      ${table(["Servico","Mecanico","Data","Hora","Duracao","Status","Previsao"], s.agenda.map((a) => [a.service,byId(s.employees,a.employeeId)?.name||"-",a.date,a.time,`${a.duration}h`,a.blocked?"Bloqueado":"Ativo",a.delivery||"-"]))}
    </article>
  </div>
  `;
  on("#fAg", (v) => { s.agenda.push({ id: uid(), ...v, blocked: Boolean(v.blocked), createdAt: now() }); log(`Agenda criada: ${v.date} ${v.time}`); render(); });
}
function crm(c) {
  const rows = s.clients.map((cl) => {
    const orders = s.orders.filter((o) => o.clientId === cl.id);
    const spent = orders.reduce((a, o) => a + total(o), 0);
    const points = Math.floor(spent / 10);
    const discount = points >= 100 ? "10%" : points >= 50 ? "5%" : "0%";
    return [cl.name, orders.length, brl(spent), points, discount];
  });
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>Lembretes automaticos</h3><div>${reminders()}</div></article>
    <article class="card"><h3>Status automatico</h3><form id="fCrm" class="form-grid">
      <select name="orderId">${options(s.orders, (o) => `${o.code} - ${o.status}`)}</select><button>Enviar WhatsApp</button>
    </form></article>
  </div>
  <article class="card" style="margin-top:12px;"><h3>Historico e fidelidade</h3>${table(["Cliente","OS","Total","Pontos","Desconto"], rows)}</article>`;
  on("#fCrm", (v) => { const o = byId(s.orders, v.orderId); if (o) { wa(o); log(`CRM enviou status: ${o.code}`); } });
}

function usuarios(c) {
  const loginUsers = authUsers();
  c.innerHTML = `
  <div class="grid">
    <article class="card"><h3>Perfis e permissoes</h3><form id="fUser" class="form-grid">
      <input name="name" placeholder="Nome completo" required>
      <input name="username" placeholder="Usuario de login" required>
      <input name="password" type="password" placeholder="Senha" required>
      <select name="role">${ROLES.map((x) => `<option>${x}</option>`).join("")}</select>
      <button ${can("users") ? "" : "disabled"}>Criar</button>
    </form><small id="userMsg">Perfis: Administrador, Escritorio, Mecanico, Financeiro.</small></article>
    <article class="card"><h3>Usuarios</h3>${table(["Nome","Usuario","Perfil","Acao"], loginUsers.map((u) => [u.name || "-", u.username, u.role, `<button class="danger" data-del-user="${esc(u.username)}" ${can("users") ? "" : "disabled"}>Apagar</button>`]), true)}</article>
  </div>
  <article class="card" style="margin-top:12px;"><h3>Log de auditoria</h3>${table(["Quando","Quem","O que"], s.audit.slice(0, 60).map((x) => [d(x.when), x.who, x.action]))}</article>`;

  const userForm = document.querySelector("#fUser");
  userForm.onsubmit = (e) => {
    e.preventDefault();
    if (!can("users")) return;
    const v = val(userForm);
    const username = String(v.username || "").trim().toLowerCase();
    const password = String(v.password || "");
    const msg = document.getElementById("userMsg");

    if (!username || !password || password.length < 4) {
      msg.textContent = "Defina usuario e senha (minimo 4 caracteres).";
      return;
    }

    const logins = authUsers();
    if (logins.some((u) => String(u.username || "").toLowerCase() === username)) {
      msg.textContent = "Esse usuario de login ja existe.";
      return;
    }

    const role = String(v.role || "Escritorio");
    const name = String(v.name || username);
    logins.push({ username, password, role, name });
    saveAuthUsers(logins);

    s.users.push({ id: uid(), name, username, role, createdAt: now() });
    log(`Usuario criado: ${name} (${username})`);
    render();
  };

  c.querySelector("table")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-del-user]");
    if (!btn || !can("users")) return;
    const username = String(btn.dataset.delUser || "").toLowerCase();
    const msg = document.getElementById("userMsg");

    if (!username) return;
    if (username === String(session.username || "").toLowerCase()) {
      msg.textContent = "Nao e permitido apagar o usuario logado na sessao atual.";
      return;
    }

    const logins = authUsers();
    const target = logins.find((u) => String(u.username || "").toLowerCase() === username);
    if (!target) return;

    saveAuthUsers(logins.filter((u) => String(u.username || "").toLowerCase() !== username));
    s.users = s.users.filter((u) => {
      const uName = String(u.username || "").toLowerCase();
      if (uName && uName === username) return false;
      return !(String(u.name || "").toLowerCase() === String(target.name || "").toLowerCase() && String(u.role || "") === String(target.role || ""));
    });
    if (!byId(s.users, s.settings.currentUserId) && s.users.length) {
      s.settings.currentUserId = s.users[0].id;
    }
    log(`Usuario removido: ${target.name || target.username} (${target.username})`);
    render();
  });
}

function relatorios(c) {
  const n = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10);
  c.innerHTML = `<article class="card"><h3>Relatorios profissionais</h3><form id="fRep" class="form-grid"><input type="date" name="from" value="${from}" required><input type="date" name="to" value="${to}" required><button>Gerar</button></form><div id="rep" style="margin-top:12px"></div></article>`;
  on("#fRep", (v) => {
    const fi = new Date(`${v.from}T00:00:00`); const ta = new Date(`${v.to}T23:59:59`);
    const os = s.orders.filter((o) => { const dt = new Date(o.createdAt); return dt >= fi && dt <= ta; });
    const svc = {}; const cl = {}; const mec = {};
    os.forEach((o) => {
      (o.services || []).forEach((id) => { const n1 = byId(s.services, id)?.name || id; svc[n1] = (svc[n1] || 0) + Number(byId(s.services, id)?.price || 0); });
      const c1 = byId(s.clients, o.clientId)?.name || "Sem nome"; cl[c1] = (cl[c1] || 0) + total(o);
      (o.techHours || []).forEach((th) => { const e = byId(s.employees, th.employeeId)?.name || "Sem nome"; mec[e] = (mec[e] || 0) + Number(th.billed || 0) * 100; });
    });
    document.getElementById("rep").innerHTML = `
      <p><b>OS por periodo:</b> ${os.length}</p>
      <p><b>Faturamento por servico:</b><br>${lines(svc, true)}</p>
      <p><b>Ranking de clientes:</b><br>${lines(sortObj(cl), true)}</p>
      <p><b>Lucro por mecanico:</b><br>${lines(mec, true)}</p>
      <p><b>Margem por tipo de servico:</b><br>${serviceProfit().map((x) => `${x.name}: ${brl(x.value)}`).join("<br>") || "Sem dados"}</p>
      <p><b>Relatorio fiscal:</b> estrutura pronta para integracao de nota fiscal.</p>`;
  });
}

function table(head, rows, raw = false) {
  const r = rows.length
    ? rows.map((x) => `<tr>${x.map((v, i) => `<td data-label="${esc(head[i] || "")}">${raw ? v : esc(v)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${head.length}">Sem dados.</td></tr>`;
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${r}</tbody></table></div>`;
}

function esc(v) { return String(v ?? "-").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function statusTag(st) { if (st === "Orcamento") return "status-orcamento"; if (st === "Aguardando aprovacao") return "status-aguardando"; if (st === "Em execucao") return "status-execucao"; if (st === "Finalizado") return "status-finalizado"; return "status-cancelado"; }
function on(sel, fn) { document.querySelector(sel).onsubmit = (e) => { e.preventDefault(); fn(val(e.target)); }; }
function lines(obj, currency = false) { const e = Object.entries(obj); return e.length ? e.map(([k, v]) => `${k}: ${currency ? brl(v) : Number(v).toFixed(2)}`).join("<br>") : "Sem dados"; }
function sortObj(obj, lim = 8) { return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, lim)); }
function serviceProfit() {
  const m = {};
  s.orders.forEach((o) => (o.services || []).forEach((id) => { const name = byId(s.services, id)?.name || id; m[name] = (m[name] || 0) + Number(byId(s.services, id)?.price || 0) + Number(o.labor || 0) / Math.max((o.services || []).length, 1); }));
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function capacity() {
  const m = {};
  s.agenda.forEach((a) => { const k = `${a.employeeId}_${a.date}`; m[k] = (m[k] || 0) + Number(a.duration || 0); });
  const e = Object.entries(m).slice(0, 12);
  return e.length ? e.map(([k, h]) => { const [emp, date] = k.split("_"); return `${date} - ${byId(s.employees, emp)?.name || "-"}: ${h.toFixed(1)}h / 8h`; }).join("<br>") : "Sem dados";
}

function lateOrders() {
  const late = s.orders.filter((o) => o.delivery && !["Finalizado", "Cancelado"].includes(o.status) && new Date(o.delivery) < new Date());
  return late.length ? late.map((o) => `${o.code} atrasada (previsto ${d(o.delivery)})`).join("<br>") : "Sem atrasos";
}

function reminders() {
  const oilIds = s.services.filter((x) => x.name.toLowerCase().includes("oleo")).map((x) => x.id);
  const arr = [];
  s.vehicles.forEach((v) => {
    const fin = s.orders.filter((o) => o.vehicleId === v.id && o.status === "Finalizado").sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0));
    const lastOil = fin.find((o) => (o.services || []).some((id) => oilIds.includes(id)));
    if (!lastOil) return;
    const due = new Date(lastOil.closedAt || lastOil.updatedAt || lastOil.createdAt); due.setMonth(due.getMonth() + 6);
    if (due < new Date()) arr.push(`Troca de oleo pendente: ${v.plate} (${byId(s.clients, v.clientId)?.name || "-"})`);
  });
  return arr.join("<br>") || "Sem lembretes pendentes";
}

function wa(o) {
  const cl = byId(s.clients, o.clientId);
  const phone = (cl?.whats || cl?.phone || "").replace(/\D/g, "");
  const txt = encodeURIComponent(`WR Mecanica - ${o.code}\nStatus: ${o.status}\nTotal: ${brl(total(o))}`);
  const url = phone ? `https://wa.me/55${phone}?text=${txt}` : `https://wa.me/?text=${txt}`;
  window.open(url, "_blank");
}

function printOS(o) {
  const cl = byId(s.clients, o.clientId);
  const vh = byId(s.vehicles, o.vehicleId);
  const sv = (o.services || []).map((id) => byId(s.services, id)?.name || id).join(", ");
  const pt = (o.parts || []).map((p) => `${byId(s.products, p.productId)?.desc || p.productId} x${p.qty}`).join(", ");
  const w = window.open("", "_blank");
  w.document.write(`<html><body style="font-family:sans-serif;padding:24px"><h2>WR Mecanica - ${o.code}</h2><p><b>Cliente:</b> ${cl?.name || "-"}</p><p><b>Veiculo:</b> ${vh?.plate || "-"} ${vh?.brand || ""} ${vh?.model || ""}</p><p><b>Status:</b> ${o.status}</p><p><b>Check-in:</b> ${o.checkin || "-"}</p><p><b>Assinatura digital:</b> ${o.signature || "-"}</p><p><b>Servicos:</b> ${sv || "-"}</p><p><b>Pecas:</b> ${pt || "-"}</p><h3>Total: ${brl(total(o))}</h3><script>window.print()</script></body></html>`);
  w.document.close();
}

async function files(list) {
  const a = Array.from(list || []);
  return Promise.all(a.map((f) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); })));
}

function drawLine(id) {
  const c = document.getElementById(id); if (!c) return; const x = c.getContext("2d");
  const m = {};
  s.orders.filter((o) => o.status === "Finalizado").forEach((o) => { const dt = new Date(o.closedAt || o.createdAt); const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`; m[k] = (m[k] || 0) + total(o); });
  const vals = Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  x.clearRect(0, 0, c.width, c.height); if (!vals.length) return;
  const max = Math.max(...vals, 1); x.strokeStyle = "#f4c300"; x.lineWidth = 2; x.beginPath();
  vals.forEach((v, i) => { const px = 24 + (i * (c.width - 48)) / Math.max(vals.length - 1, 1); const py = c.height - 20 - ((c.height - 40) * v) / max; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
}

function drawBars(id) {
  const c = document.getElementById(id); if (!c) return; const x = c.getContext("2d");
  const m = {};
  s.orders.forEach((o) => (o.services || []).forEach((id2) => { const n = byId(s.services, id2)?.name || id2; m[n] = (m[n] || 0) + 1; }));
  const vals = Object.values(m); x.clearRect(0, 0, c.width, c.height); if (!vals.length) return;
  const max = Math.max(...vals, 1); const bw = (c.width - 40) / vals.length - 8;
  vals.forEach((v, i) => { const h = ((c.height - 30) * v) / max; x.fillStyle = "#f4c300"; x.fillRect(24 + i * (bw + 8), c.height - 18 - h, bw, h); });
}

function drawPie(id) {
  const c = document.getElementById(id); if (!c) return; const x = c.getContext("2d");
  const m = {};
  s.receivables.forEach((r) => { m[r.method] = (m[r.method] || 0) + 1; });
  const e = Object.entries(m); x.clearRect(0, 0, c.width, c.height); if (!e.length) return;
  const t = e.reduce((a, [, v]) => a + v, 0); const col = ["#f4c300", "#2f9bff", "#26c26d", "#ff9300", "#f24b4b"]; let st = 0;
  e.forEach(([k, v], i) => { const an = (v / t) * Math.PI * 2; x.beginPath(); x.moveTo(c.width / 2, c.height / 2); x.fillStyle = col[i % col.length]; x.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35, st, st + an); x.fill(); x.fillStyle = "#ddd"; x.fillText(k, 8, 16 + i * 16); st += an; });
}

function drawHeat(id) {
  const c = document.getElementById(id); if (!c) return; const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
  const h = Array(24).fill(0); s.agenda.forEach((a) => { const hr = Number(String(a.time || "0:00").split(":")[0]); h[hr] += 1; });
  const max = Math.max(...h, 1); const w = c.width / 24;
  h.forEach((v, i) => { x.fillStyle = `rgba(244,195,0,${0.1 + (v / max) * 0.9})`; x.fillRect(i * w, 0, w - 2, c.height - 20); if (i % 2 === 0) { x.fillStyle = "#999"; x.fillText(String(i), i * w + 2, c.height - 6); } });
}

function seed() {
  if (s.clients.length || s.orders.length) return;
  const c1 = { id: uid(), name: "Joao Lima", doc: "123.456.789-00", phone: "11999990000", whats: "11999990000", email: "joao@email.com", address: "Rua A, 120" };
  const c2 = { id: uid(), name: "Transportes Alfa", doc: "12.345.678/0001-90", phone: "1133334444", whats: "11955554444", email: "contato@alfa.com", address: "Av Central, 900" };
  s.clients.push(c1, c2);
  const v1 = { id: uid(), plate: "ABC1D23", model: "Gol", brand: "VW", year: 2018, color: "Prata", km: 89000, vin: "", clientId: c1.id };
  const v2 = { id: uid(), plate: "XYZ9K88", model: "Sprinter", brand: "Mercedes", year: 2021, color: "Branca", km: 120000, vin: "", clientId: c2.id };
  s.vehicles.push(v1, v2);
  const e1 = { id: uid(), name: "Carlos", role: "Mecanico", commission: 8, worked: 180, billed: 156 };
  const e2 = { id: uid(), name: "Marina", role: "Escritorio", commission: 2, worked: 160, billed: 145 };
  s.employees.push(e1, e2);
  const sv1 = { id: uid(), name: "Troca de oleo", price: 180, hours: 1 };
  const sv2 = { id: uid(), name: "Revisao", price: 650, hours: 4 };
  const sv3 = { id: uid(), name: "Freio", price: 420, hours: 3 };
  s.services.push(sv1, sv2, sv3);
  const p1 = { id: uid(), code: "OL10W40", desc: "Oleo 10W40", cost: 28, sale: 45, supplier: "LubriMax", min: 10, stock: 30, batches: [] };
  const p2 = { id: uid(), code: "FLT001", desc: "Filtro de oleo", cost: 18, sale: 35, supplier: "Filtros BR", min: 8, stock: 14, batches: [] };
  s.products.push(p1, p2);
  s.orders.push({ id: uid(), code: "OS-0001", clientId: c1.id, vehicleId: v1.id, checkin: "Barulho no freio", labor: 200, delivery: new Date(Date.now() + 86400000).toISOString().slice(0, 16), signature: "Joao Lima", approved: true, services: [sv1.id, sv3.id], parts: [{ productId: p2.id, qty: 1 }], before: [], after: [], status: "Em execucao", createdAt: now(), updatedAt: now(), techHours: [{ employeeId: e1.id, billed: 3, worked: 3.5 }] });
  s.agenda.push({ id: uid(), service: "Revisao geral", employeeId: e1.id, date: new Date().toISOString().slice(0, 10), time: "09:00", duration: 3, blocked: false, delivery: new Date(Date.now() + 86400000).toISOString().slice(0, 16) });
  log("Dados de exemplo carregados");
  render();
}

document.getElementById("seedBtn").addEventListener("click", seed);
render();


