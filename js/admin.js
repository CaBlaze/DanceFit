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

  const name = document.getElementById('adminClassName').value.trim();
  const style = document.getElementById('adminClassStyle').value;
  const level = document.getElementById('adminClassLevel').value;
  const price = Number(document.getElementById('adminClassPrice').value);
  const duration = document.getElementById('adminClassDuration').value.trim();
  const time = document.getElementById('adminClassTime').value;
  const instructor = document.getElementById('adminClassInstructor').value.trim();
  const role = document.getElementById('adminClassInstructorRole').value.trim();
  const theme = document.getElementById('adminClassTheme').value.trim();
  const emoji = document.getElementById('adminClassEmoji').value.trim();

  // Validaciones
  if (!name || !duration || !time || !instructor || !role || !theme || !emoji) {
    showToast("⚠️ Completa todos los campos obligatorios del formulario");
    return;
  }

  // Determinar color de nivel
  let level_color = "#2dc653"; // default open level
  if (level === 'BEGINNER') level_color = "#00b4d8";
  if (level === 'ADVANCED') level_color = "#9b5de5";
  if (level === 'SPECIAL WORKSHOP') level_color = "#f4a261";

  const classPayload = {
    name,
    style,
    level,
    level_color,
    price,
    duration,
    time,
    instructor,
    role,
    theme,
    emoji,
    class_date: new Date().toISOString().split('T')[0] // hoy
  };

  const btn = document.getElementById('adminBtnCreateClass');
  btn.disabled = true;
  btn.textContent = "Guardando Clase...";

  try {
    await createClass(classPayload);
    showToast("🎉 ¡Clase creada y publicada con éxito!");
    
    // Resetear formulario
    document.getElementById('adminClassForm').reset();
    
    // Recargar métricas y listados locales si corresponde
    calculateAdminMetrics();
    renderReservasAdminTable();
    
    // Desplazarse arriba suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showToast(`❌ Error al crear la clase: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Crear y Publicar Clase →";
  }
}
