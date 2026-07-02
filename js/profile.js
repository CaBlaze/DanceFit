// ── DANCEFIT STUDIO - PANTALLA DE PERFIL DEL CLIENTE ──

// ── RENDERIZADOR PRINCIPAL ──────────────────────────────────
async function renderProfileScreen() {
  const user = getSessionUser();
  if (!user || user.role === 'admin') { goTo('home'); return; }

  const container = document.getElementById('screen-perfil');
  if (!container) return;

  // Skeleton mientras carga reservas
  container.innerHTML = `
    <main class="page profile-page" aria-busy="true" aria-label="Cargando perfil...">
      <div class="profile-skeleton"></div>
    </main>`;

  let reservationCount = 0;
  let credits = 0;
  try {
    const reservas = await getReservationsForUser(user.id);
    reservationCount = reservas.length;
  } catch (_) { /* si falla, mostramos 0 */ }
  try {
    credits = await getCredits(user.id);
  } catch (_) { /* si falla, mostramos 0 */ }

  // Iniciales del avatar (máx. 2 letras)
  const initials = (user.name || 'DF')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Fecha de membresía formateada
  const since = user.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : 'Recientemente';

  container.innerHTML = `
    <main class="page profile-page" style="max-width:860px;"
          aria-labelledby="profile-heading" role="main">

      <!-- ── HERO DE PERFIL ───────────────────────────── -->
      <div class="profile-hero">
        <div class="profile-avatar" aria-hidden="true">${initials}</div>
        <div class="profile-hero-info">
          <h1 class="profile-name" id="profile-heading">${escapeHtml(user.name || 'Usuario')}</h1>
          <span class="profile-role-badge" aria-label="Rol de cuenta: Cliente">
            <span aria-hidden="true">💃</span> Cliente
          </span>
          <p class="profile-since">Miembro desde ${since}</p>
        </div>
      </div>

      <!-- ── TARJETAS DE INFORMACIÓN (SOLO LECTURA) ───── -->
      <section class="profile-section" aria-labelledby="info-heading">
        <h2 class="profile-section-title" id="info-heading">Información de Cuenta</h2>
        <div class="profile-info-grid" role="list">
          <article class="profile-info-card" role="listitem">
            <span class="profile-info-icon" aria-hidden="true">👤</span>
            <span class="profile-info-label">Nombre completo</span>
            <span class="profile-info-value" id="display-name">${escapeHtml(user.name || '—')}</span>
          </article>
          <article class="profile-info-card" role="listitem">
            <span class="profile-info-icon" aria-hidden="true">🆔</span>
            <span class="profile-info-label">DNI / Documento</span>
            <span class="profile-info-value">${escapeHtml(user.dni || '—')}</span>
          </article>
          <article class="profile-info-card" role="listitem">
            <span class="profile-info-icon" aria-hidden="true">✉️</span>
            <span class="profile-info-label">Correo electrónico</span>
            <span class="profile-info-value profile-email">${escapeHtml(user.email || '—')}</span>
          </article>
        </div>
      </section>

      <!-- ── FORMULARIO DE EDICIÓN ─────────────────────── -->
      <section class="profile-section" aria-labelledby="edit-heading">
        <h2 class="profile-section-title" id="edit-heading">Editar Información</h2>
        <p class="profile-section-sub">
          Puedes actualizar tu nombre de visualización. Para modificar datos de seguridad
          como correo o contraseña, contacta al equipo de soporte.
        </p>

        <form id="profileEditForm"
              onsubmit="handleProfileUpdate(event)"
              novalidate
              aria-label="Formulario de edición de nombre">

          <div class="profile-edit-row">
            <div class="field" style="flex:1; margin-bottom:0;">
              <label class="lbl" for="profileNameInput">Nombre completo</label>
              <input
                class="inp"
                id="profileNameInput"
                type="text"
                value="${escapeHtml(user.name || '')}"
                placeholder="Ej. María García López"
                autocomplete="name"
                maxlength="80"
                aria-required="true"
                aria-describedby="nameHint nameStatus"
                oninput="validateProfileName(this)"
              >
              <span class="profile-name-hint" id="nameHint" style="margin-top:6px;display:flex;align-items:center;gap:5px;font-size:0.78rem;color:var(--text-muted);">Solo letras, espacios y guiones. Sin números ni símbolos.</span>
            </div>
            <button
              type="submit"
              class="btn-primary profile-save-btn"
              id="profileSaveBtn"
              style="align-self:center; margin-top:0;"
              aria-label="Guardar cambios del nombre">
              Guardar Cambios
            </button>
          </div>

          <!-- Área de feedback accesible (aria-live) -->
          <div
            id="nameStatus"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="profile-status-msg"
            style="display:none;"
          ></div>
        </form>

        <div class="profile-readonly-notice" aria-label="Aviso de campos protegidos">
          <span aria-hidden="true">🔒</span>
          <span>DNI y correo son datos de verificación protegidos y no se pueden editar desde la app.</span>
        </div>
      </section>

      <!-- ── ESTADÍSTICAS DE ACTIVIDAD ─────────────────── -->
      <section class="profile-section" aria-labelledby="stats-heading">
        <h2 class="profile-section-title" id="stats-heading">Mi Actividad</h2>
        <div class="profile-stats-grid" role="list">
          <div class="profile-stat-card" role="listitem">
            <div class="profile-stat-val"
                 aria-label="${reservationCount} clases reservadas">${reservationCount}</div>
            <div class="profile-stat-label">Clases Reservadas</div>
          </div>
          <div class="profile-stat-card profile-credits-card" role="listitem"
               style="border-color: rgba(45,198,83,0.3); background: rgba(45,198,83,0.04);">
            <div class="profile-stat-val" style="color:#2dc653; font-size:1.5rem;"
                 aria-label="Saldo de créditos: S/ ${credits.toFixed(2)}">
              S/ ${credits.toFixed(2)}
            </div>
            <div class="profile-stat-label">💰 Créditos DanceFit</div>
          </div>
          <div class="profile-stat-card" role="listitem">
            <div class="profile-stat-val" aria-label="Estado: Activa">✅</div>
            <div class="profile-stat-label">Estado de Cuenta</div>
          </div>
        </div>
      </section>

    </main>
  `;
}

// ── VALIDACIÓN EN TIEMPO REAL DEL NOMBRE ────────────────────
function validateProfileName(input) {
  const raw   = input.value;
  const trimmed = raw.trim();
  const hint  = document.getElementById('nameHint');
  const btn   = document.getElementById('profileSaveBtn');

  // Regla 1: contiene dígitos
  if (/\d/.test(raw)) {
    setNameHint(hint, 'error', '✕ El nombre no puede contener números.');
    input.classList.add('error');
    if (btn) btn.disabled = true;
    return;
  }

  // Regla 2: contiene caracteres no permitidos (solo letras unicode, espacios, guiones, apóstrofes)
  if (/[^a-záéíóúüñÁÉÍÓÚÜÑA-Z\s\-\']/.test(raw)) {
    setNameHint(hint, 'error', '✕ Solo se permiten letras, espacios, guiones y apóstrofes.');
    input.classList.add('error');
    if (btn) btn.disabled = true;
    return;
  }

  // Regla 3: espacios múltiples consecutivos
  if (/\s{2,}/.test(raw)) {
    setNameHint(hint, 'error', '✕ No se permiten espacios múltiples consecutivos.');
    input.classList.add('error');
    if (btn) btn.disabled = true;
    return;
  }

  // Regla 4: longitud mínima (sin contar espacios)
  if (trimmed.length < 3) {
    const remaining = 3 - trimmed.length;
    setNameHint(hint, 'warn', `⚠ Mínimo 3 caracteres (faltan ${remaining}).`);
    input.classList.add('error');
    if (btn) btn.disabled = true;
    return;
  }

  // Regla 5: longitud máxima
  if (trimmed.length > 80) {
    setNameHint(hint, 'error', '✕ El nombre no puede superar 80 caracteres.');
    input.classList.add('error');
    if (btn) btn.disabled = true;
    return;
  }

  // Todo OK
  setNameHint(hint, 'ok', '✓ Nombre válido.');
  input.classList.remove('error');
  if (btn) btn.disabled = false;
}

function setNameHint(el, type, msg) {
  if (!el) return;
  const styles = {
    ok:    { color: '#2dc653', icon: '' },
    warn:  { color: '#f4a522', icon: '' },
    error: { color: '#e63946', icon: '' },
    idle:  { color: 'var(--text-muted)', icon: '' }
  };
  const s = styles[type] || styles.idle;
  el.textContent = msg;
  el.style.color = s.color;
  el.style.fontWeight = type === 'idle' ? '400' : '600';
}

// ── GUARDAR CAMBIOS DE PERFIL ────────────────────────────────
async function handleProfileUpdate(event) {
  event.preventDefault();

  const user       = getSessionUser();
  if (!user) return;

  const nameInput  = document.getElementById('profileNameInput');
  const saveBtn    = document.getElementById('profileSaveBtn');
  const newName    = nameInput.value.trim();

  // Limpiar estado previo
  setProfileStatus('');

  // Re-ejecutar validación antes de guardar
  validateProfileName(nameInput);
  if (nameInput.classList.contains('error')) {
    nameInput.focus();
    return;
  }

  if (newName === user.name) {
    setProfileStatus('info', 'ℹ️ Tu nombre ya está actualizado.');
    return;
  }

  // Estado de carga
  saveBtn.disabled = true;
  saveBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" style="animation:spin 0.8s linear infinite" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
    </svg>
    Guardando...`;
  nameInput.setAttribute('aria-busy', 'true');

  try {
    await updateProfile(user.id, { name: newName });

    // Actualizar sesión en localStorage
    const updated = { ...user, name: newName };
    localStorage.setItem('df_current_user', JSON.stringify(updated));

    // Actualizar elementos en pantalla sin recargar
    const displayName   = document.getElementById('display-name');
    const profileHeading = document.getElementById('profile-heading');
    if (displayName)    displayName.textContent    = newName;
    if (profileHeading) profileHeading.textContent = newName;

    setProfileStatus('success', `✅ Nombre actualizado correctamente a "${newName}".`);
    showToast('✅ Perfil actualizado');

  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    setProfileStatus('error', `❌ No se pudo guardar: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar Cambios';
    nameInput.setAttribute('aria-busy', 'false');
  }
}

// ── HELPER: MENSAJE DE ESTADO CON ESTILOS ───────────────────
function setProfileStatus(type, msg = '') {
  const el = document.getElementById('nameStatus');
  if (!el) return;

  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }

  const themes = {
    success: { bg: 'rgba(45,198,83,0.1)',   color: '#2dc653', border: 'rgba(45,198,83,0.35)' },
    error:   { bg: 'rgba(230,57,70,0.1)',   color: '#e63946', border: 'rgba(230,57,70,0.35)' },
    info:    { bg: 'rgba(255,90,31,0.07)',  color: 'var(--text-muted)', border: 'var(--border)' }
  };
  const t = themes[type] || themes.info;

  el.style.display      = 'block';
  el.style.background   = t.bg;
  el.style.color        = t.color;
  el.style.border       = `1px solid ${t.border}`;
  el.style.padding      = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.marginTop    = '0.75rem';
  el.style.fontSize     = '0.85rem';
  el.style.fontWeight   = '600';
  el.style.transition   = 'opacity 0.4s ease';
  el.style.opacity      = '1';
  el.textContent        = msg;

  // Auto-ocultar mensajes de éxito tras 4 segundos
  if (type === 'success') {
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; el.textContent = ''; }, 420);
    }, 4000);
  }
}

// ── HELPER: ESCAPAR HTML ─────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
