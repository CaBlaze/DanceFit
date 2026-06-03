// ── DANCEFIT STUDIO - CONTROLADOR DEL DASHBOARD DE ADMINISTRACIÓN ──

// Renderizar la vista de administración
async function renderAdminDashboard() {
  const user = getSessionUser();
  // Validar rol
  if (!user || user.role !== 'admin') {
    showToast("⚠️ Acceso denegado: Se requiere rol de Administrador.");
    goTo('home');
    return;
  }

  // Ocultar botón de Mis Reservas para admin
  const navReservas = document.getElementById('nav-reservas');
  if (navReservas) navReservas.classList.remove('visible');

  // Inicializar formularios y tablas
  renderReservasAdminTable();
  calculateAdminMetrics();
}

// ── CALCULAR MÉTRICAS DEL ESTUDIO ──
async function calculateAdminMetrics() {
  const metricsContainer = document.getElementById('adminMetrics');
  if (!metricsContainer) return;

  try {
    const reservations = await getAllReservationsAdmin();
    const classes = await getClasses();

    // 1. Ingresos Totales (Suma de precios de clases reservadas)
    let totalEarnings = 0;
    reservations.forEach(res => {
      const price = res.classes ? Number(res.classes.price) : 25;
      totalEarnings += price;
    });

    // 2. Clase más popular
    const classCount = {};
    reservations.forEach(res => {
      if (res.classes && res.classes.name) {
        classCount[res.classes.name] = (classCount[res.classes.name] || 0) + 1;
      }
    });

    let mostPopularClass = "Ninguna aún";
    let maxReservations = 0;
    for (const [clsName, count] of Object.entries(classCount)) {
      if (count > maxReservations) {
        maxReservations = count;
        mostPopularClass = clsName;
      }
    }

    // 3. Tasa de ocupación promedio
    let avgOccupation = 0;
    if (classes.length > 0) {
      avgOccupation = Math.round((reservations.length / (classes.length * 32)) * 100);
    }

    metricsContainer.innerHTML = `
      <div class="metric-card">
        <div class="metric-icon">💰</div>
        <div class="metric-info">
          <div class="metric-label">Ingresos Recaudados</div>
          <div class="metric-val">S/ ${totalEarnings.toFixed(2)}</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">🏆</div>
        <div class="metric-info">
          <div class="metric-label">Clase más Popular</div>
          <div class="metric-val" style="font-size:0.95rem; line-height:1.2; font-family:'Playfair Display', serif;">
            ${mostPopularClass} ${maxReservations > 0 ? `(${maxReservations} reservaciones)` : ''}
          </div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">⚡</div>
        <div class="metric-info">
          <div class="metric-label">Ocupación Promedio</div>
          <div class="metric-val">${avgOccupation}%</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Error calculando métricas:", err);
    metricsContainer.innerHTML = `<p style="color:#e63946; grid-column:1/-1;">Error al calcular estadísticas: ${err.message}</p>`;
  }
}

// ── TABLA DE AUDITORÍA DE RESERVAS GLOBALES ──
async function renderReservasAdminTable() {
  const container = document.getElementById('adminReservasTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">Obteniendo auditoría global de reservas...</td></tr>';

  try {
    const reservations = await getAllReservationsAdmin();
    container.innerHTML = '';

    if (reservations.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No existen reservas registradas en el sistema.</td></tr>';
      return;
    }

    reservations.forEach(res => {
      const cls = res.classes || {};
      const profile = res.profiles || {};
      const dateFormatted = new Date(res.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--accent); font-size: 0.8rem;">${res.id.slice(0, 13)}</td>
        <td>
          <div style="font-weight: 600;">${profile.name || 'Cliente Demo'}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">DNI: ${profile.dni || '—'}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${cls.name || 'Clase'}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${cls.instructor || 'Profesor'}</div>
        </td>
        <td style="text-align: center;"><span class="price-chip">#${res.spot_number}</span></td>
        <td>
          <div style="font-weight: 600;">Cel: ${res.phone_yape || '—'}</div>
          <div style="font-size: 0.72rem; color: var(--teal); font-weight: 600;">Cód: ${res.code_yape || '—'}</div>
        </td>
        <td style="font-size: 0.72rem; color: var(--text-muted);">${dateFormatted}</td>
      `;
      container.appendChild(tr);
    });
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#e63946;padding:2rem;">Error al cargar auditoría: ${err.message}</td></tr>`;
  }
}

// ── CREAR NUEVA CLASE DE BAILE (FORMULARIO ADMIN) ──
async function handleCreateClassSubmission(event) {
  event.preventDefault();

  const form       = document.getElementById('adminClassForm');
  const name       = document.getElementById('adminClassName').value.trim();
  const style      = document.getElementById('adminClassStyle').value;
  const level      = document.getElementById('adminClassLevel').value;
  const price      = Number(document.getElementById('adminClassPrice').value);
  const classDate  = document.getElementById('adminClassDate').value;    // YYYY-MM-DD
  const time       = document.getElementById('adminClassTime').value;    // HH:MM
  const duration   = document.getElementById('adminClassDuration').value;
  const instructor = document.getElementById('adminClassInstructor').value.trim();
  const theme      = document.getElementById('adminClassTheme').value.trim();

  // ── Limpiar banner previo si existe
  const oldBanner = document.getElementById('adminClassBanner');
  if (oldBanner) oldBanner.remove();

  // ── Validación explícita con mensajes en pantalla
  if (!name || !classDate || !time || !instructor || !theme) {
    showAdminBanner('error', '⚠️ Completa todos los campos antes de publicar la clase.');
    return;
  }

  // ── Color según nivel
  const levelColors = {
    'BEGINNER':         '#00b4d8',
    'OPEN LEVEL':       '#2dc653',
    'ADVANCED':         '#9b5de5',
    'SPECIAL WORKSHOP': '#f4a261'
  };
  const level_color = levelColors[level] || '#2dc653';

  // ── Emoji automático por estilo
  const styleEmojis = {
    'Reggaetón': '🔥',
    'Salsa':     '💃',
    'Bachata':   '🌹',
    'Urbano':    '🎤',
    'Funcional': '⚡'
  };
  const emoji = styleEmojis[style] || '🎵';

  // ── Payload para la BD
  // NOTA: La tabla classes tiene instructor_id (FK) en Supabase.
  // Para mantener compatibilidad con el modo demo y el JOIN de getClasses(),
  // se guarda instructor como texto en demo y como campo extra en Supabase.
  // Si tu esquema NO tiene columna "instructor" en classes, el sistema
  // usará el modo demo correctamente igual.
  const classPayload = {
    name,
    style,
    level,
    level_color,
    price,
    duration,
    time,
    theme,
    emoji,
    class_date: classDate,
    instructor,           // Usado en modo demo; en Supabase real usar instructor_id
    role: instructor      // Fallback para compatibilidad con getClasses()
  };

  const btn = document.getElementById('adminBtnCreateClass');
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
    Publicando clase...
  </span>`;

  try {
    const created = await createClass(classPayload);
    
    // ── Resetear todos los campos del formulario
    form.reset();

    // ── Mostrar banner de confirmación con detalles de la clase
    const levelLabel = {
      'BEGINNER': 'Principiante', 'OPEN LEVEL': 'Nivel Abierto',
      'ADVANCED': 'Avanzado', 'SPECIAL WORKSHOP': 'Masterclass'
    }[level] || level;

    const dateDisplay = new Date(classDate + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    showAdminBanner('success', `
      <div style="font-size:1.4rem;margin-bottom:4px;">${emoji} ¡Clase publicada con éxito!</div>
      <div style="font-size:0.85rem;opacity:0.9;line-height:1.6;">
        <strong>${name}</strong> · ${style} · ${levelLabel}<br>
        📅 ${dateDisplay} a las ${time}h · ⏱ ${duration}<br>
        👤 ${instructor} · 🎨 Temática: ${theme}
      </div>
    `);

    // ── Recargar métricas del dashboard
    calculateAdminMetrics();
    renderReservasAdminTable();

  } catch (err) {
    console.error("❌ Error al crear clase:", err);
    showAdminBanner('error', `❌ No se pudo publicar la clase: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Crear y Publicar Clase →";
  }
}

// ── BANNER DE FEEDBACK DENTRO DEL FORMULARIO ADMIN ──
function showAdminBanner(type, html) {
  const isSuccess = type === 'success';
  const banner = document.createElement('div');
  banner.id = 'adminClassBanner';
  banner.style.cssText = `
    margin-top: 1rem;
    padding: 1rem 1.2rem;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
    line-height: 1.5;
    border-left: 4px solid ${isSuccess ? '#2dc653' : '#e63946'};
    background: ${isSuccess ? 'rgba(45,198,83,0.08)' : 'rgba(230,57,70,0.08)'};
    color: ${isSuccess ? '#2dc653' : '#e63946'};
    animation: fadeInUp 0.3s ease;
  `;
  banner.innerHTML = html;

  // Insertar debajo del botón de submit
  const btn = document.getElementById('adminBtnCreateClass');
  btn.parentNode.insertBefore(banner, btn.nextSibling);

  // Auto-ocultar el banner de éxito tras 8 segundos
  if (isSuccess) {
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.transition = 'opacity 0.5s';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
      }
    }, 8000);
  }
}
