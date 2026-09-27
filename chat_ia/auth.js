// ── Switch tabs ──
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  clearMsg();
}

// ── Afficher/masquer mot de passe ──
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁️';
}

// ── Message feedback ──
function showMsg(text, type = 'error') {
  const el = document.getElementById('auth-msg');
  el.textContent = text;
  el.className = `auth-msg ${type}`;
}

function clearMsg() {
  const el = document.getElementById('auth-msg');
  el.textContent = '';
  el.className = 'auth-msg';
}

// ── Loader bouton ──
function setLoading(btnId, loading) {
  const btn  = document.getElementById(btnId);
  const text = btn.querySelector('.btn-text');
  const spin = btn.querySelector('.btn-loader');
  btn.disabled   = loading;
  text.style.display = loading ? 'none' : 'inline';
  spin.style.display = loading ? 'inline' : 'none';
}

// ── Traduction erreurs Firebase ──
function translateError(code) {
  const map = {
    'auth/user-not-found':       'Aucun compte avec cet email.',
    'auth/wrong-password':       'Mot de passe incorrect.',
    'auth/email-already-in-use': 'Cet email est déjà utilisé.',
    'auth/weak-password':        'Mot de passe trop faible (8 caractères min).',
    'auth/invalid-email':        'Adresse email invalide.',
    'auth/too-many-requests':    'Trop de tentatives. Réessaie plus tard.',
    'auth/network-request-failed': 'Erreur réseau. Vérifie ta connexion.',
    'auth/invalid-credential':   'Email ou mot de passe incorrect.',
    'auth/configuration-not-found': '⚠️ Firebase non configuré. Suis le guide de configuration.',
  };
  return map[code] || `Erreur : ${code}`;
}

// ── Connexion ──
async function handleLogin(e) {
  e.preventDefault();
  clearMsg();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!window._firebaseAuth) {
    showMsg('⚠️ Firebase non configuré. Suis le guide de configuration.', 'error');
    return;
  }

  setLoading('btn-login', true);
  try {
    await window._signIn(window._firebaseAuth, email, password);
    showMsg('Connexion réussie ! Redirection...', 'success');
    setTimeout(() => window.location.href = 'index.html', 800);
  } catch (err) {
    showMsg(translateError(err.code), 'error');
    setLoading('btn-login', false);
  }
}

// ── Inscription ──
async function handleRegister(e) {
  e.preventDefault();
  clearMsg();

  const email   = document.getElementById('reg-email').value.trim();
  const pw1     = document.getElementById('reg-password').value;
  const pw2     = document.getElementById('reg-password2').value;

  if (pw1 !== pw2) {
    showMsg('Les mots de passe ne correspondent pas.', 'error');
    return;
  }

  if (pw1.length < 8) {
    showMsg('Le mot de passe doit faire au moins 8 caractères.', 'error');
    return;
  }

  if (!window._firebaseAuth) {
    showMsg('⚠️ Firebase non configuré. Suis le guide de configuration.', 'error');
    return;
  }

  setLoading('btn-register', true);
  try {
    await window._signUp(window._firebaseAuth, email, pw1);
    showMsg('Compte créé ! Connexion en cours...', 'success');
    setTimeout(() => window.location.href = 'index.html', 800);
  } catch (err) {
    showMsg(translateError(err.code), 'error');
    setLoading('btn-register', false);
  }
}

// ── Mot de passe oublié ──
async function handleForgot(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();

  if (!email) {
    showMsg('Entre ton email d\'abord.', 'error');
    return;
  }

  if (!window._firebaseAuth) {
    showMsg('⚠️ Firebase non configuré.', 'error');
    return;
  }

  try {
    await window._resetPw(window._firebaseAuth, email);
    showMsg('Email de réinitialisation envoyé !', 'success');
  } catch (err) {
    showMsg(translateError(err.code), 'error');
  }
}
