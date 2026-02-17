const SESSION_KEY = "wrmec_session_v1";
const AUTH_USERS_KEY = "wrmec_auth_users_v1";
const DEFAULT_AUTH_USERS = [
  { username: "admin", password: "admin123", role: "Administrador", name: "Admin" },
  { username: "financeiro", password: "finance123", role: "Financeiro", name: "Financeiro" },
  { username: "atendente", password: "atendente123", role: "Atendente", name: "Atendente" },
  { username: "mecanico", password: "mecanico123", role: "Mecanico", name: "Mecanico" },
];

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

function existingSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

initAuthUsers();
if (existingSession()?.username) {
  window.location.replace("/");
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const user = authUsers().find((u) => u.username.toLowerCase() === username && u.password === password);

  const msg = document.getElementById("loginMsg");
  if (!user) {
    msg.textContent = "Usuario ou senha invalidos.";
    msg.className = "err";
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role, name: user.name }));

  if (user.role === "Financeiro") {
    window.location.replace("/financeiro/");
    return;
  }
  if (user.role === "Administrador") {
    window.location.replace("/admin/");
    return;
  }
  window.location.replace("/");
});
