// ── Config modèles ──
const MODEL_INFO = {
  "openai/gpt-oss-20b":    { label: "GPT OSS 20B",      ctx: "131k tokens", speed: "Ultra rapide ⚡" },
  "openai/gpt-oss-120b":   { label: "GPT OSS 120B",     ctx: "131k tokens", speed: "Très rapide" },
  "llama-3.1-8b-instant":  { label: "Llama 3.1 8B",     ctx: "131k tokens", speed: "Ultra rapide ⚡" },
  "llama-3.3-70b-versatile":{ label: "Llama 3.3 70B",   ctx: "131k tokens", speed: "Rapide" },
  "qwen/qwen3.8-27b":      { label: "Qwen 3.8 27B",     ctx: "131k tokens", speed: "Rapide" },
};

// ── État global ──
let conversations = JSON.parse(localStorage.getItem("chat_conversations") || "[]");
let currentId     = null;
let isLoading     = false;

// ── Éléments DOM ──
const $messages      = document.getElementById("messages");
const $messagesWrap  = document.getElementById("messages-wrap");
const $welcome       = document.getElementById("welcome");
const $userInput     = document.getElementById("user-input");
const $btnSend       = document.getElementById("btn-send");
const $modelSelect   = document.getElementById("model-select");
const $modelInfo     = document.getElementById("model-info");
const $currentModel  = document.getElementById("current-model-label");
const $historyList   = document.getElementById("history-list");
const $apiKey        = document.getElementById("api-key");
const $btnSaveKey    = document.getElementById("btn-save-key");
const $btnNewChat    = document.getElementById("btn-new-chat");
const $btnClearChat  = document.getElementById("btn-clear-chat");
const $btnClearAll   = document.getElementById("btn-clear-all");
const $sidebar       = document.getElementById("sidebar");
const $btnToggle     = document.getElementById("btn-toggle-sidebar");

// ── Init ──
function init() {
  // Charger la clé API sauvegardée
  const savedKey = localStorage.getItem("groq_api_key");
  if (savedKey) $apiKey.value = savedKey;

  // Charger le modèle sauvegardé
  const savedModel = localStorage.getItem("selected_model");
  if (savedModel && MODEL_INFO[savedModel]) $modelSelect.value = savedModel;

  updateModelInfo();
  renderHistory();

  // Charger la dernière conversation
  if (conversations.length > 0) {
    loadConversation(conversations[conversations.length - 1].id);
  }
}

// ── Gestion clé API ──
$btnSaveKey.addEventListener("click", () => {
  const key = $apiKey.value.trim();
  if (!key.startsWith("gsk_")) {
    showToast("Clé invalide — doit commencer par gsk_", "error");
    return;
  }
  localStorage.setItem("groq_api_key", key);
  showToast("Clé API sauvegardée ✓", "success");
});

// ── Gestion modèle ──
$modelSelect.addEventListener("change", () => {
  localStorage.setItem("selected_model", $modelSelect.value);
  updateModelInfo();
});

function updateModelInfo() {
  const m = MODEL_INFO[$modelSelect.value];
  if (m) {
    $modelInfo.textContent = `Contexte : ${m.ctx} • ${m.speed} • Gratuit`;
    $currentModel.textContent = m.label;
  }
}

// ── Conversations ──
function newConversation() {
  const id = "conv_" + Date.now();
  const conv = { id, title: "Nouvelle conversation", messages: [], model: $modelSelect.value, date: Date.now() };
  conversations.push(conv);
  saveConversations();
  loadConversation(id);
  return id;
}

function loadConversation(id) {
  currentId = id;
  const conv = getConv(id);
  if (!conv) return;

  $messages.innerHTML = "";
  $welcome.style.display = "none";

  conv.messages.forEach(msg => renderMessage(msg.role, msg.content, false));
  renderHistory();
  scrollBottom();
}

function getConv(id) {
  return conversations.find(c => c.id === id);
}

function saveConversations() {
  localStorage.setItem("chat_conversations", JSON.stringify(conversations));
}

function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();

  if (currentId === id) {
    currentId = null;
    $messages.innerHTML = "";
    $welcome.style.display = "flex";
    if (conversations.length > 0) {
      loadConversation(conversations[conversations.length - 1].id);
    }
  }
  renderHistory();
}

// ── Historique UI ──
function renderHistory() {
  $historyList.innerHTML = "";

  if (conversations.length === 0) {
    $historyList.innerHTML = '<div class="history-empty">Aucune conversation</div>';
    return;
  }

  // Afficher du plus récent au plus ancien
  [...conversations].reverse().forEach(conv => {
    const item = document.createElement("div");
    item.className = "history-item" + (conv.id === currentId ? " active" : "");

    const title = document.createElement("span");
    title.textContent = conv.title;

    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Supprimer";
    delBtn.addEventListener("click", e => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.appendChild(title);
    item.appendChild(delBtn);
    item.addEventListener("click", () => loadConversation(conv.id));
    $historyList.appendChild(item);
  });
}

// ── Rendu des messages ──
function renderMessage(role, content, scroll = true) {
  const isUser = role === "user";

  const msg = document.createElement("div");
  msg.className = `message ${isUser ? "user" : "ai"}`;

  // Avatar
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = isUser ? "Toi" : "⚡";

  // Bulle
  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const name = document.createElement("div");
  name.className = "bubble-name";
  name.textContent = isUser ? "Vous" : (MODEL_INFO[$modelSelect.value]?.label || "IA");

  const contentDiv = document.createElement("div");
  contentDiv.className = "bubble-content";

  if (isUser) {
    contentDiv.textContent = content;
  } else {
    contentDiv.innerHTML = renderMarkdown(content);
    addCopyButtons(contentDiv);
  }

  const meta = document.createElement("div");
  meta.className = "bubble-meta";
  meta.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  bubble.appendChild(name);
  bubble.appendChild(contentDiv);
  bubble.appendChild(meta);

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  $messages.appendChild(msg);

  if (scroll) scrollBottom();
  return contentDiv;
}

function renderTyping() {
  const msg = document.createElement("div");
  msg.className = "message ai";
  msg.id = "typing-msg";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "⚡";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  bubble.appendChild(dots);
  msg.appendChild(avatar);
  msg.appendChild(bubble);
  $messages.appendChild(msg);
  scrollBottom();
  return msg;
}

// ── Markdown ──
function renderMarkdown(text) {
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
  });
  return marked.parse(text);
}

function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach(pre => {
    const btn = document.createElement("button");
    btn.className = "copy-code-btn";
    btn.textContent = "Copier";
    btn.addEventListener("click", () => {
      const code = pre.querySelector("code")?.textContent || "";
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "Copié ✓";
        setTimeout(() => btn.textContent = "Copier", 2000);
      });
    });
    pre.style.position = "relative";
    pre.appendChild(btn);
  });
}

// ── Envoi message ──
async function sendMessage() {
  const text = $userInput.value.trim();
  if (!text || isLoading) return;

  const apiKey = localStorage.getItem("groq_api_key") || $apiKey.value.trim();
  if (!apiKey) {
    showToast("Entre ta clé API Groq d'abord !", "error");
    return;
  }

  // Créer une conversation si nécessaire
  if (!currentId) newConversation();

  const conv = getConv(currentId);

  // Ajouter message utilisateur
  conv.messages.push({ role: "user", content: text });

  // Titre automatique
  if (conv.messages.length === 1) {
    conv.title = text.length > 40 ? text.substring(0, 40) + "..." : text;
    renderHistory();
  }

  saveConversations();
  renderMessage("user", text);
  $userInput.value = "";
  autoResize();

  $welcome.style.display = "none";
  isLoading = true;
  $btnSend.disabled = true;

  const typingEl = renderTyping();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: $modelSelect.value,
        messages: conv.messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false,
      }),
    });

    typingEl.remove();

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Erreur ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    conv.messages.push({ role: "assistant", content: aiText });
    saveConversations();
    renderMessage("assistant", aiText);

  } catch (err) {
    typingEl.remove();
    const errMsg = `❌ Erreur : ${err.message}`;
    renderMessage("assistant", errMsg);
    showToast(err.message, "error");
  } finally {
    isLoading = false;
    $btnSend.disabled = false;
    $userInput.focus();
  }
}

// ── Événements ──
$btnSend.addEventListener("click", sendMessage);

$userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

$userInput.addEventListener("input", autoResize);

function autoResize() {
  $userInput.style.height = "auto";
  $userInput.style.height = Math.min($userInput.scrollHeight, 160) + "px";
}

$btnNewChat.addEventListener("click", () => {
  newConversation();
  $userInput.focus();
});

$btnClearChat.addEventListener("click", () => {
  if (!currentId) return;
  const conv = getConv(currentId);
  if (!conv) return;
  conv.messages = [];
  conv.title = "Nouvelle conversation";
  saveConversations();
  $messages.innerHTML = "";
  $welcome.style.display = "flex";
  renderHistory();
});

$btnClearAll.addEventListener("click", () => {
  if (!confirm("Supprimer toutes les conversations ?")) return;
  conversations = [];
  currentId = null;
  saveConversations();
  $messages.innerHTML = "";
  $welcome.style.display = "flex";
  renderHistory();
});

$btnToggle.addEventListener("click", () => {
  $sidebar.classList.toggle("hidden");
});

// ── Utilitaires ──
function scrollBottom() {
  requestAnimationFrame(() => {
    $messagesWrap.scrollTop = $messagesWrap.scrollHeight;
  });
}

let toastTimer = null;
function showToast(msg, type = "") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;

  requestAnimationFrame(() => toast.classList.add("show"));

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── Lancement ──
function initApp() {
  init();
}

// Si pas de Firebase (test local sans auth), lancer quand même
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window._firebaseAuth === 'undefined') initApp();
  });
} else {
  if (typeof window._firebaseAuth === 'undefined') initApp();
}
