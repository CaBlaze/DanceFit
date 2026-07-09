// ── DANCEFIT STUDIO - MOTOR DE ESTADO Y ENRUTADOR PRINCIPAL CORREGIDO ──

// ── HELPER: FORMATEAR PRECIO (sin ceros decimales innecesarios) ──
function formatPrice(price) {
  return parseFloat(Number(price).toFixed(2)).toString();
}

// ── ESTADO GLOBAL DE LA APLICACIÓN ──
let state = {
  dark: localStorage.getItem('dancefit-theme') === 'dark' ||
        (!localStorage.getItem('dancefit-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
  activeFilter: 'Todos',
  selectedClass: null,
  selectedSpot: null,
  studentData: { name: '', dni: '' },
  yapeData: { phone: '', code: '' },
  reservation: null,
  authMode: 'login' // 'login' | 'register'
};
window.state = state;
window.formatPrice = formatPrice;
// Importar los inicializadores analíticos y de gestión del administrador
import { inicializarDashboardAdmin, inicializarDashboardEjecutivo } from './admin.js';

// ── ENRUTADOR DE VISTAS (PANTALLAS MODIFICADO) ──
function goTo(screenId) {
  // Validar sesión antes de acceder a pantallas internas
  const user = getSessionUser();
  if (!user && screenId !== 'login') {
    screenId = 'login';
  }

  // Ocultar todas las pantallas y activar la solicitada
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  
  // Soporte para los nuevos contenedores basados en tus plantillas HTML (id="screen-admin" o id="screen-dashboard")
  const targetScreen = document.getElementById('screen-' + screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    // Para asegurar compatibilidad si usas clases utilitarias de visualización inline/block
    targetScreen.style.display = 'block'; 
  }

  // Ocultar las pantallas no activas explícitamente para evitar solapamientos visuales en layouts oscuros
  document.querySelectorAll('.screen').forEach(s => {
    if(s.id !== 'screen-' + screenId) {
      s.style.display = 'none';
    }
  });

  // Scroll al inicio de la página
  window.scrollTo(0, 0);

  // Actualizar barra de navegación y accesibilidad por roles
  updateNavbarState(user, screenId);

  // Disparadores específicos por pantalla (Se integró el nuevo Dashboard de Analíticas)
  if (screenId === 'home')      renderClientHome();
  if (screenId === 'spot')      renderSpotSelection();
  if (screenId === 'ident')     renderClientIdentification();
  if (screenId === 'payment')   renderClientPayment();
  if (screenId === 'confirm')   renderClientConfirm();
  if (screenId === 'reservas')  renderClientReservations();
  if (screenId === 'perfil')    renderProfileScreen();
  if (screenId === 'sedes-cliente') renderBranchesClient();
  if (screenId === 'login')     renderAuthScreen();
  
  // Rutas exclusivas del Usuario Administrador
  if (screenId === 'dashboard') inicializarDashboardEjecutivo();
  if (screenId === 'admin')     inicializarDashboardAdmin();
}

// Actualizar botones y accesibilidad del navbar de acuerdo al rol del usuario
function updateNavbarState(user, screenId) {
  const btnHome     = document.getElementById('nav-home');
  const btnReservas = document.getElementById('nav-reservas');
  const btnPerfil   = document.getElementById('nav-perfil');
  const btnAdmin     = document.getElementById('nav-admin');
  const btnLogout   = document.getElementById('nav-logout');

  // Si no hay usuario logueado, ocultamos todos los enlaces de navegación
  if (!user) {
    if (btnHome)     btnHome.style.display     = 'none';
    if (btnReservas) btnReservas.style.display = 'none';
    if (btnPerfil)   btnPerfil.style.display   = 'none';
    if (btnAdmin)    btnAdmin.style.display    = 'none';
    if (btnLogout)   btnLogout.style.display   = 'none';
    return;
  }

  // Si hay usuario autenticado, exponemos el botón de salida
  if (btnLogout) btnLogout.style.display = 'inline-block';

  if (user.role === 'admin') {
    // ES ADMINISTRADOR: Se configuran los accesos para Dashboard analítico y Panel Admin relacional
    if (btnHome) { 
      btnHome.style.display = 'inline-block'; 
      btnHome.textContent = 'Dashboard'; 
      btnHome.onclick = () => goTo('dashboard'); // Redirección al Dashboard de Analíticas
      btnHome.classList.toggle('active', screenId === 'dashboard');
    }
    if (btnReservas) btnReservas.style.display = 'none';
    if (btnPerfil)   btnPerfil.style.display   = 'none';
    
    if (btnAdmin) { 
      btnAdmin.style.display = 'inline-block'; 
      btnAdmin.textContent = 'Panel Admin';
      btnAdmin.onclick = () => goTo('admin'); // Redirección al Formulario y Auditoría tradicional
      btnAdmin.classList.toggle('active', screenId === 'admin'); 
    }
  } else {
    // ES CLIENTE/ALUMNO: Muestra el catálogo regular y flujos transaccionales
    if (btnHome) {
      btnHome.style.display = 'inline-block';
      btnHome.textContent   = 'Clases';
      btnHome.onclick       = () => goTo('home');
      btnHome.classList.toggle('active', screenId === 'home');
    }
    if (btnReservas) {
      btnReservas.style.display = 'inline-block';
      btnReservas.classList.toggle('active', screenId === 'reservas');
    }
    if (btnPerfil) {
      btnPerfil.style.display = 'inline-block';
      btnPerfil.classList.toggle('active', screenId === 'perfil');
    }
    if (btnAdmin) btnAdmin.style.display = 'none';
  }
}

// ── TOAST DE NOTIFICACIÓN GLOBAL ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── GESTIÓN DINÁMICA DE TEMAS (CLARO / OSCURO) ──
function applyTheme() {
  document.body.classList.toggle('dark', state.dark);
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.textContent = state.dark ? '☀️ Claro' : '🌙 Oscuro';
  }
  localStorage.setItem('dancefit-theme', state.dark ? 'dark' : 'light');
}

function toggleTheme() {
  state.dark = !state.dark;
  applyTheme();
}

// ── RENDERIZADOR COMPACTO DE CÓDIGO QR ──
function renderQR(svgEl) {
  if (!svgEl) return;
  svgEl.innerHTML = '';
  
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff5a1f';
  
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if ((r + c * 3 + r * c) % 2 === 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', c * 11 + 1);
        rect.setAttribute('y', r * 11 + 1);
        rect.setAttribute('width', 9);
        rect.setAttribute('height', 9);
        rect.setAttribute('rx', 2);
        rect.setAttribute('fill', accent);
        rect.setAttribute('opacity', '0.9');
        svgEl.appendChild(rect);
      }
    }
  }
  
  [[1, 1], [56, 1], [1, 56]].forEach(([x, y]) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', 23);
    rect.setAttribute('height', 23);
    rect.setAttribute('rx', 4);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', accent);
    rect.setAttribute('stroke-width', '2.5');
    svgEl.appendChild(rect);
    
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    dot.setAttribute('x', x + 6);
    dot.setAttribute('y', y + 6);
    dot.setAttribute('width', 11);
    dot.setAttribute('height', 11);
    dot.setAttribute('rx', 2);
    dot.setAttribute('fill', accent);
    svgEl.appendChild(dot);
  });
}

// ── VISTA DE AUTENTICACIÓN (LOGIN / REGISTRO) ──
function renderAuthScreen() {
  const container = document.getElementById('screen-login');
  if (!container) return;

  const isLogin = state.authMode === 'login';

  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-header">
        <span class="logo">DanceFit</span>
        <h2 class="auth-title">${isLogin ? 'Iniciar Sesión' : 'Crear tu Cuenta'}</h2>
        <p class="auth-sub">${isLogin ? 'Ingresa para reservar tu spot en la pista' : 'Regístrate en segundos para empezar a bailar'}</p>
      </div>

      <form id="authForm" onsubmit="handleAuthSubmit(event)">
        ${!isLogin ? `
          <div class="field">
            <label class="lbl" for="authName">Nombre Completo</label>
            <input class="inp" id="authName" type="text" placeholder="Ej. Martina García" required autocomplete="name">
          </div>
          <div class="field">
            <label class="lbl" for="authDni">DNI / Documento Identidad</label>
            <input class="inp" id="authDni" type="text" placeholder="Ej. 76543210" required autocomplete="off" maxlength="12">
          </div>
        ` : ''}
        
        <div class="field">
          <label class="lbl" for="authEmail">Correo Electrónico</label>
          <input class="inp" id="authEmail" type="email" placeholder="correo@dancefit.com" required autocomplete="email">
        </div>
        
        <div class="field">
          <label class="lbl" for="authPassword">Contraseña</label>
          <input class="inp" id="authPassword" type="password" placeholder="••••••••" required autocomplete="current-password" minlength="6">
          ${!isLogin ? `<div class="help-text" style="margin-top: 5px; font-size: 0.74rem;">La contraseña debe tener al menos 6 caracteres.</div>` : ''}
        </div>

        <button class="btn-primary" id="authSubmitBtn" style="width: 100%; padding: 15px; margin-top: 1rem;" type="submit">
          ${isLogin ? 'Entrar a la Academia →' : 'Completar Registro ✓'}
        </button>
      </form>

      <div class="auth-switch">
        ${isLogin ? `
          ¿Aún no tienes cuenta? <span onclick="switchAuthMode('register')">Regístrate aquí</span>
        ` : `
          ¿Ya tienes una cuenta? <span onclick="switchAuthMode('login')">Inicia sesión aquí</span>
        `}
      </div>
      
      ${isLogin ? `
        <div style="margin-top: 1.5rem; padding: 10px; background: var(--bg-card2); border-radius: 8px; font-size: 0.72rem; color: var(--text-muted); line-height: 1.4; text-align: center;">
          💡 <b>Cuentas de demostración rápida:</b><br/>
          • Cliente: <code>cliente@dancefit.com</code> (Contraseña: <code>cliente123</code>)<br/>
          • Admin: <code>admin@dancefit.com</code> (Contraseña: <code>admin123</code>)
        </div>
      ` : ''}
    </div>
  `;
}

function switchAuthMode(mode) {
  state.authMode = mode;
  renderAuthScreen();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authSubmitBtn');

  btn.disabled = true;
  btn.textContent = state.authMode === 'login' ? 'Validando credenciales...' : 'Registrando perfil...';

  try {
    if (state.authMode === 'login') {
      const user = await loginUser(email, password);
      showToast(`👋 ¡Bienvenido de vuelta, ${user.name}!`);
      
      // Modificación del destino de redirección inicial para administradores
      if (user.role === 'admin') {
        goTo('dashboard'); // Ahora el Admin aterriza directamente en el Dashboard Ejecutivo
      } else {
        goTo('home');
      }
    } else {
      const name = document.getElementById('authName').value;
      const dni = document.getElementById('authDni').value;
      const role = 'client';
      const user = await registerUser(email, password, name, dni, role);
      showToast(`🎉 ¡Cuenta creada con éxito! Bienvenido, ${user.name}.`);
      goTo('home');
    }
  } catch (err) {
    showToast(`❌ Error: ${err.message}`);
    btn.disabled = false;
    btn.textContent = state.authMode === 'login' ? 'Entrar a la Academia →' : 'Completar Registro ✓';
  }
}

// Cerrar sesión
async function handleLogout() {
  if (confirm("¿Estás seguro que deseas cerrar tu sesión en DanceFit Studio?")) {
    await logoutUser();
    showToast("🚪 Sesión cerrada correctamente. ¡Regresa pronto!");
    goTo('login');
  }
}

// ── EVENTOS DE INICIALIZACIÓN ──
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  
  // Validar el estado de arranque de la sesión activa
  const user = getSessionUser();
  if (user) {
    if (user.role === 'admin') {
      goTo('dashboard'); // Inicialización en el módulo analítico
    } else {
      goTo('home');
    }
  } else {
    goTo('login');
  }
});
window.goTo = goTo;
window.switchAuthMode = switchAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.toggleTheme = toggleTheme;
window.handleLogout = handleLogout;
