// ── DANCEFIT STUDIO - CONTROLADOR DE VISTAS Y FLUJO DEL CLIENTE ──

const CLIENT_FILTERS = ['Todos', 'Salsa', 'Bachata', 'Reggaetón', 'Funcional', 'Urbano'];

// ── RENDERIZAR VISTA DE CLASES (HOME CLIENTE) ──
async function renderClientHome() {
  const user = getSessionUser();
  if (!user) {
    goTo('login');
    return;
  }

  // Actualizar UI del Header
  const navReservas = document.getElementById('nav-reservas');
  if (navReservas) navReservas.classList.add('visible');

  const filterRow = document.getElementById('filterRow');
  if (!filterRow) return;

  filterRow.innerHTML = '';
  CLIENT_FILTERS.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (state.activeFilter === f ? ' active' : '');
    btn.textContent = f;
    btn.onclick = () => {
      state.activeFilter = f;
      renderClientHome();
    };
    filterRow.appendChild(btn);
  });

  const grid = document.getElementById('classesGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;"><div class="loader">Cargando la pista de baile...</div></div>';

  try {
    const allClasses = await getClasses();
    grid.innerHTML = '';

    // Filtrar clases
    const filtered = state.activeFilter === 'Todos'
      ? allClasses
      : allClasses.filter(c => c.style === state.activeFilter || c.name.toLowerCase().includes(state.activeFilter.toLowerCase()));

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">No hay clases programadas para esta categoría en este momento.</p>';
      return;
    }

    filtered.forEach(cls => {
      const card = document.createElement('div');
      card.className = 'class-card';
      const initials = cls.instructor.split(' ').slice(0, 2).map(w => w[0]).join('');
      card.innerHTML = `
        <div class="card-img">
          <div class="card-emoji">${cls.emoji}</div>
          <span class="card-level" style="background:${cls.level_color || '#ff5a1f'}22;color:${cls.level_color || '#ff5a1f'}">${cls.level}</span>
          <span class="card-time">${cls.time}</span>
        </div>
        <div class="card-body">
          <div class="card-theme">Temática: ${cls.theme}</div>
          <div class="card-title">${cls.name}</div>
          <div class="card-instructor">
            <div class="avatar">${initials}</div>
            <div>
              <div class="inst-name">${cls.instructor}</div>
              <div class="inst-role">${cls.role}</div>
            </div>
          </div>
          <div class="card-footer">
            <span class="price-chip">S/ ${formatPrice(cls.price)}</span>
            <button class="reserve-btn" data-id="${cls.id}">${cls.level === 'SPECIAL WORKSHOP' ? 'Reservar Masterclass ☆' : 'Reservar →'}</button>
          </div>
        </div>`;

      card.querySelector('.reserve-btn').onclick = (e) => {
        e.stopPropagation();
        handleStartReservation(cls);
      };
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:#e63946;grid-column:1/-1;text-align:center;padding:2rem">Error al conectar con la cartelera de clases: ${err.message}</p>`;
  }
}

// Iniciar proceso de reserva
function handleStartReservation(cls) {
  state.selectedClass = cls;
  state.selectedSpot = null;
  goTo('spot');
}

// ── RENDERIZAR MAPA DE SPOTS INTERACTIVO ──
async function renderSpotSelection() {
  const cls = state.selectedClass;
  if (!cls) {
    goTo('home');
    return;
  }

  document.getElementById('sb-style').textContent = cls.style.toUpperCase();
  document.getElementById('sb-name').textContent = cls.name;
  document.getElementById('sb-inst').textContent = 'Con ' + cls.instructor;
  document.getElementById('sb-prof').textContent = cls.instructor;
  document.getElementById('sb-dur').textContent = cls.duration;
  document.getElementById('sb-time').textContent = cls.time + 'h';
  document.getElementById('sb-price').textContent = 'S/ ' + cls.price;
  const elBranch = document.getElementById('sb-branch');
  if (elBranch) elBranch.textContent = cls.branch || 'Sede Principal';

  updateSpotDisplay();

  const grid = document.getElementById('spotGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;"><div class="loader">Analizando spots ocupados...</div></div>';

  try {
    const occupiedSpots = await getOccupiedSpots(cls.id);
    grid.innerHTML = '';

    for (let n = 1; n <= 32; n++) {
      const btn = document.createElement('button');
      const isOccupied = occupiedSpots.includes(n);
      const isSelected = state.selectedSpot === n;

      let classString = 'spot-btn';
      if (isSelected) classString += ' selected';
      if (isOccupied) classString += ' occupied';

      btn.className = classString;
      btn.textContent = n;

      if (isOccupied) {
        btn.setAttribute('data-tooltip', 'Spot ocupado');
        btn.disabled = true;
        btn.setAttribute('aria-label', `Spot ${n} - ocupado`);
      } else {
        btn.setAttribute('aria-label', `Spot ${n}`);
        btn.onclick = () => selectClientSpot(n, occupiedSpots);
      }
      grid.appendChild(btn);
    }
  } catch (err) {
    grid.innerHTML = `<p style="color:#e63946;grid-column:1/-1;text-align:center;padding:1rem">Error al sincronizar spots: ${err.message}</p>`;
  }
}

function selectClientSpot(n, occupiedSpots) {
  if (occupiedSpots.includes(n)) return;
  state.selectedSpot = (state.selectedSpot === n) ? null : n;
  updateSpotDisplay();

  const btns = document.querySelectorAll('.spot-btn');
  btns.forEach((btn, i) => {
    const num = i + 1;
    if (occupiedSpots.includes(num)) return;
    btn.className = 'spot-btn' + (state.selectedSpot === num ? ' selected' : '');
  });
}

function updateSpotDisplay() {
  const disp = document.getElementById('spotDisplay');
  const btn = document.getElementById('btnSpotContinue');
  if (!disp || !btn) return;

  if (state.selectedSpot) {
    disp.textContent = '#' + state.selectedSpot;
    disp.classList.remove('empty');
    btn.disabled = false;
  } else {
    disp.textContent = '— Sin elegir';
    disp.classList.add('empty');
    btn.disabled = true;
  }
}

function handleSpotContinue() {
  if (!state.selectedSpot) {
    showToast('⚠️ Elige un spot en la pista primero');
    return;
  }
  goTo('ident');
}

// ── RENDERIZAR DATOS DE IDENTIFICACIÓN (AUTOLLENADOS) ──
function renderClientIdentification() {
  const cls = state.selectedClass;
  const user = getSessionUser();
  if (!cls || !user) {
    goTo('home');
    return;
  }

  // Autocompletar datos del usuario activo (¡Excelente optimización!)
  const inputName = document.getElementById('inputName');
  const inputDni = document.getElementById('inputDni');

  if (inputName) inputName.value = user.name || '';
  if (inputDni) inputDni.value = user.dni || '';

  document.getElementById('ident-cls-name').textContent = cls.name;
  document.getElementById('ident-cls-inst').textContent = 'Con ' + cls.instructor;
  document.getElementById('ident-time').textContent = cls.time + 'h';
  document.getElementById('ident-spot').textContent = '#' + state.selectedSpot;
  document.getElementById('ident-level').textContent = cls.level;
  document.getElementById('ident-price').textContent = 'S/ ' + cls.price;
  const elBranch = document.getElementById('ident-branch');
  if (elBranch) elBranch.textContent = cls.branch || 'Sede Principal';

  validateClientIdent();
}

function validateClientIdent() {
  const name = document.getElementById('inputName').value.trim();
  const dni = document.getElementById('inputDni').value.trim();

  state.studentData = { name, dni };

  const nameOk = name.length >= 3;
  const dniOk = dni.length >= 6 && dni.length <= 12;

  document.getElementById('errName').classList.toggle('visible', name.length > 0 && !nameOk);
  document.getElementById('errDni').classList.toggle('visible', dni.length > 0 && !dniOk);
  document.getElementById('inputName').classList.toggle('error', name.length > 0 && !nameOk);
  document.getElementById('inputDni').classList.toggle('error', dni.length > 0 && !dniOk);

  document.getElementById('btnIdentContinue').disabled = !(nameOk && dniOk);
}

function handleIdentContinue() {
  validateClientIdent();
  if (document.getElementById('btnIdentContinue').disabled) return;
  goTo('payment');
}

// ── RENDERIZAR PASARELA DE PAGO Y QR YAPE ──
async function renderClientPayment() {
  const cls = state.selectedClass;
  const user = getSessionUser();
  if (!cls || !user) { goTo('home'); return; }

  // Sin cargo de gestión: precio final = precio de la clase
  const price = Number(cls.price);

  document.getElementById('pay-emoji').textContent = cls.emoji;

  const levelEl = document.getElementById('pay-level');
  levelEl.textContent = cls.level;
  levelEl.style.background = (cls.level_color || '#ff5a1f') + '22';
  levelEl.style.color = cls.level_color || '#ff5a1f';

  document.getElementById('pay-name').textContent = cls.name;
  document.getElementById('pay-time').textContent = '📅 Hoy, ' + cls.time + 'h';
  document.getElementById('pay-base').textContent = 'S/ ' + price;
  document.getElementById('pay-total').textContent = 'S/ ' + price;
  document.getElementById('payBtnTotal').textContent = price;

  // Mostrar saldo de créditos
  const banner = document.getElementById('creditsBanner');
  const balanceEl = document.getElementById('creditsBalanceDisplay');
  const hintEl = document.getElementById('creditsHint');
  const btnCredits = document.getElementById('btnPayCredits');

  try {
    const credits = await getCredits(user.id);
    if (credits > 0) {
      banner.style.display = 'block';
      balanceEl.textContent = 'S/ ' + credits.toFixed(2);
      if (credits >= price) {
        hintEl.textContent = '✓ Tienes créditos suficientes para cubrir esta clase.';
        btnCredits.disabled = false;
        btnCredits.style.opacity = '1';
      } else {
        hintEl.textContent = `⚠️ Te faltan S/ ${(price - credits).toFixed(2)} para cubrir esta clase.`;
        btnCredits.disabled = true;
        btnCredits.style.opacity = '0.45';
      }
    } else {
      banner.style.display = 'none';
    }
  } catch (_) {
    banner.style.display = 'none';
  }

  // Mostrar balance de clases de regalo (promoción)
  const promoBanner = document.getElementById('promoBanner');
  const promoCountDisplay = document.getElementById('promoCountDisplay');
  const promoHint = document.getElementById('promoHint');
  const btnPayPromo = document.getElementById('btnPayPromo');

  if (promoBanner && promoCountDisplay && promoHint && btnPayPromo) {
    try {
      const freeClasses = await getFreeClasses(user.id);
      if (freeClasses > 0) {
        promoBanner.style.display = 'block';
        promoCountDisplay.textContent = `${freeClasses} Disponible(s) 🎁`;
        
        if (price <= 40) {
          promoHint.textContent = '✓ Puedes canjear 1 clase de regalo para esta reserva.';
          btnPayPromo.disabled = false;
          btnPayPromo.style.opacity = '1';
        } else {
          promoHint.textContent = `⚠️ Esta clase excede el límite de S/ 40.00 (Precio: S/ ${price.toFixed(2)}).`;
          btnPayPromo.disabled = true;
          btnPayPromo.style.opacity = '0.45';
        }
      } else {
        promoBanner.style.display = 'none';
      }
    } catch (err) {
      console.error("Error al obtener clases gratis:", err);
      promoBanner.style.display = 'none';
    }
  }

  // Limpiar campos de pago
  document.getElementById('inputPhone').value = '';
  document.getElementById('inputCode').value = '';

  validateClientPayment();

  // Renderizar QR de yape
  renderQR(document.getElementById('qrSvg'));
}

function validateClientPayment() {
  const phone = document.getElementById('inputPhone').value.replace(/\s/g, '');
  const code = document.getElementById('inputCode').value.replace(/\s/g, '');

  state.yapeData = { phone, code };

  const phoneOk = phone.length === 9 && /^\d+$/.test(phone);
  const codeOk = code.length === 6 && /^\d+$/.test(code);

  document.getElementById('errPhone').classList.toggle('visible', phone.length > 0 && !phoneOk);
  document.getElementById('errCode').classList.toggle('visible', code.length > 0 && !codeOk);
  document.getElementById('inputPhone').classList.toggle('error', phone.length > 0 && !phoneOk);
  document.getElementById('inputCode').classList.toggle('error', code.length > 0 && !codeOk);

  document.getElementById('btnPay').disabled = !(phoneOk && codeOk);
}

// Ejecutar el yapeo y registrar reserva
async function handlePaymentSubmission() {
  const user = getSessionUser();
  const cls = state.selectedClass;
  if (!user || !cls || !state.selectedSpot) return;

  const btnPay = document.getElementById('btnPay');
  btnPay.disabled = true;
  btnPay.textContent = 'Procesando Yape...';

  const reservationPayload = {
    profile_id: user.id,
    class_id: cls.id,
    spot_number: state.selectedSpot,
    phone_yape: state.yapeData.phone,
    code_yape: state.yapeData.code,
    status: 'confirmed',
    payment_method: 'yape'
  };

  try {
    const reservationResult = await createReservation(reservationPayload);
    state.reservation = { id: reservationResult.id, cls, spot: state.selectedSpot, student: state.studentData, paymentMethod: 'yape' };
    goTo('confirm');
  } catch (err) {
    showToast(`❌ Error al reservar: ${err.message}`);
    btnPay.disabled = false;
    btnPay.innerHTML = `Yapear S/ <span id="payBtnTotal">${formatPrice(cls.price)}</span>`;
  }
}

// Pagar con créditos y registrar reserva
async function handlePayWithCredits() {
  const user = getSessionUser();
  const cls = state.selectedClass;
  if (!user || !cls || !state.selectedSpot) return;

  const price = Number(cls.price);
  const btnCredit = document.getElementById('btnPayCredits');
  btnCredit.disabled = true;
  btnCredit.textContent = 'Procesando...';

  try {
    // 1. Descontar créditos (valida saldo suficiente internamente)
    const newBalance = await deductCredits(user.id, price);

    // 2. Actualizar sesión local
    const updatedUser = { ...user, credits: newBalance };
    localStorage.setItem('df_current_user', JSON.stringify(updatedUser));

    // 3. Registrar reserva con payment_method = 'credits'
    const reservationPayload = {
      profile_id: user.id,
      class_id: cls.id,
      spot_number: state.selectedSpot,
      phone_yape: '',
      code_yape: '',
      status: 'confirmed',
      payment_method: 'credits'
    };
    const reservationResult = await createReservation(reservationPayload);
    state.reservation = { id: reservationResult.id, cls, spot: state.selectedSpot, student: state.studentData, paymentMethod: 'credits' };

    showToast(`💰 Pagado con créditos. Saldo restante: S/ ${newBalance.toFixed(2)}`);
    goTo('confirm');
  } catch (err) {
    showToast(`❌ ${err.message}`);
    btnCredit.disabled = false;
    btnCredit.textContent = 'Pagar con Créditos ✓';
  }
}

// ── RENDERIZAR CONFIRMACIÓN EXITOSA ──
function renderClientConfirm() {
  const r = state.reservation;
  if (!r) {
    goTo('home');
    return;
  }

  document.getElementById('conf-name').textContent = r.cls.name;
  document.getElementById('conf-inst').textContent = r.cls.instructor;
  document.getElementById('conf-time').textContent = 'Hoy, ' + r.cls.time + 'h';

  const row = Math.ceil(r.spot / 8);
  const col = String(r.spot % 8 === 0 ? 8 : r.spot % 8).padStart(2, '0');
  document.getElementById('conf-spot').textContent = `Fila ${row}, Lugar ${col}`;
  document.getElementById('conf-id').textContent = r.id;
  const elBranch = document.getElementById('conf-branch');
  if (elBranch) elBranch.textContent = r.cls.branch || 'Sede Principal';

  renderQR(document.getElementById('qrConfirm'));
  showToast('✅ ¡Reserva confirmada! Tu lugar en la sala está asegurado.');
}

// ── RENDERIZAR HISTORIAL DE RESERVAS (REAL) ──
async function renderClientReservations() {
  const user = getSessionUser();
  if (!user) {
    goTo('login');
    return;
  }

  const upcomingGrid = document.getElementById('upcomingGrid');
  const pastGrid = document.getElementById('pastGrid');
  
  if (!upcomingGrid || !pastGrid) return;

  upcomingGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1.5rem;"><div class="loader">Obteniendo próximas clases...</div></div>';
  pastGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1.5rem;"><div class="loader">Cargando historial de asistencia...</div></div>';

  try {
    const reservations = await getReservationsForUser(user.id);
    upcomingGrid.innerHTML = '';
    pastGrid.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let upcomingCount = 0;
    let pastCount = 0;

    reservations.forEach(res => {
      const cls = res.classes || {};
      const card = document.createElement('div');
      
      const isPast = cls.class_date && cls.class_date < todayStr;
      
      const row = Math.ceil(res.spot_number / 8);
      const col = String(res.spot_number % 8 === 0 ? 8 : res.spot_number % 8).padStart(2, '0');
      const dateFormatted = new Date(res.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const classDateFormatted = cls.class_date ? new Date(cls.class_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      if (isPast) {
        card.className = 'day-card my-reservation past-reservation';
        pastCount++;
        card.innerHTML = `
          <div class="day-card-top">
            <span class="day-card-type" style="background:rgba(255,255,255,0.06);color:var(--text-muted)">${cls.level || 'CLASE'}</span>
            <span class="day-card-time">${cls.time || '18:00'}h</span>
          </div>
          <div class="day-card-name" style="color:var(--text-muted);">${cls.name || 'Clase de Baile'}</div>
          <div class="day-card-prof">Prof. ${cls.instructor || 'Instructor'} (Sede: ${cls.branch || 'Principal'})</div>
          <div class="day-card-theme" style="background:rgba(255,255,255,0.03);color:var(--text-muted);border:1px solid rgba(255,255,255,0.06)">TEMÁTICA: ${cls.theme || 'Beat'}</div>
          
          <div class="my-res-tag" style="margin-top:6px;border-top:1px dashed var(--border);padding-top:8px;">
            🎟️ Spot #${res.spot_number} (Fila ${row}, Spot ${col})
          </div>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;margin-bottom:12px;">
            Clase del ${classDateFormatted} · Reservado el ${dateFormatted}
          </div>
          <div style="width: 100%; border: 1px solid rgba(255,255,255,0.08); padding: 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #2dc653; background: rgba(45,198,83,0.06); text-align:center;">
            ✓ Asistido / Finalizado
          </div>
        `;
        pastGrid.appendChild(card);
      } else {
        card.className = 'day-card my-reservation';
        upcomingCount++;
        card.innerHTML = `
          <div class="day-card-top">
            <span class="day-card-type" style="background:${cls.level_color || '#ff5a1f'}22;color:${cls.level_color || '#ff5a1f'}">${cls.level || 'CLASE'}</span>
            <span class="day-card-time">${cls.time || '18:00'}h</span>
          </div>
          <div class="day-card-name">${cls.name || 'Clase de Baile'}</div>
          <div class="day-card-prof">Prof. ${cls.instructor || 'Instructor'} (Sede: ${cls.branch || 'Principal'})</div>
          <div class="day-card-theme" style="background:${cls.level_color || '#ff5a1f'}22;color:${cls.level_color || '#ff5a1f'}">TEMÁTICA: ${cls.theme || 'Beat'}</div>
          
          <div class="my-res-tag" style="margin-top:6px;border-top:1px dashed var(--border);padding-top:8px;">
            🎟️ Spot #${res.spot_number} (Fila ${row}, Spot ${col})
          </div>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;margin-bottom:12px;">
            Clase del ${classDateFormatted} · Reservado el ${dateFormatted}
          </div>
          <button class="cancel-res-btn" data-id="${res.id}" style="width: 100%; border: 1px solid var(--border); padding: 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #e63946; background: rgba(230,57,70,0.06); transition: all 0.2s; cursor:pointer;">
            Cancelar Reserva ✕
          </button>
        `;
        card.querySelector('.cancel-res-btn').onclick = (e) => {
          e.stopPropagation();
          handleCancelReservation(res.id, cls.name || 'Clase', cls.price || 0);
        };
        upcomingGrid.appendChild(card);
      }
    });

    if (upcomingCount === 0) {
      upcomingGrid.innerHTML = `
        <div class="empty-reservations" style="grid-column: 1 / -1; padding: 2rem 1rem;">
          <div class="emoji">💃🕺</div>
          <h3 style="font-size:1rem; margin-top:8px;">No tienes reservas próximas</h3>
          <p style="font-size:0.8rem; color:var(--text-muted);">La música está sonando. ¡Reserva tu primer spot hoy mismo!</p>
          <button class="btn-primary" style="padding: 8px 18px; font-size:0.82rem; margin-top:8px;" onclick="goTo('home')">Explorar Clases</button>
        </div>`;
    }

    if (pastCount === 0) {
      pastGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 2rem 1rem; color:var(--text-muted); font-size:0.85rem;">
          Aún no tienes asistencias registradas en el historial.
        </div>`;
    }

  } catch (err) {
    upcomingGrid.innerHTML = `<p style="color:#e63946;grid-column:1/-1;text-align:center;">Error al cargar reservas: ${err.message}</p>`;
    pastGrid.innerHTML = '';
  }
}

async function handleCancelReservation(resId, className, classPrice) {
  const price = Number(classPrice) || 0;

  // Rellenar contenido del modal
  document.getElementById('cancelModalClassInfo').textContent = className;
  document.getElementById('cancelModalSub').textContent = `¿Estás seguro de que deseas cancelar tu reserva para esta clase?`;

  const creditsNotice = document.getElementById('cancelModalCreditsNotice');
  const creditsVal = document.getElementById('cancelModalCreditsVal');
  if (price > 0) {
    creditsNotice.style.display = 'flex';
    creditsVal.textContent = `+S/ ${price}.00 en créditos DanceFit`;
  } else {
    creditsNotice.style.display = 'none';
  }

  // Abrir modal
  const overlay = document.getElementById('cancelModal');
  overlay.classList.add('open');

  // Configurar botón de confirmación
  const btnYes = document.getElementById('cancelModalBtnYes');
  // Clonar para eliminar listeners previos
  const btnYesClone = btnYes.cloneNode(true);
  btnYes.parentNode.replaceChild(btnYesClone, btnYes);

  btnYesClone.onclick = async () => {
    btnYesClone.disabled = true;
    btnYesClone.textContent = 'Cancelando...';
    closeCancelModal();

    try {
      showToast('Cancelando reserva...');
      await cancelReservation(resId);

      if (price > 0) {
        const user = getSessionUser();
        const newBalance = await addCredits(user.id, price);
        const updatedUser = { ...user, credits: newBalance };
        localStorage.setItem('df_current_user', JSON.stringify(updatedUser));
        showToast(`💰 +S/ ${price}.00 créditos añadidos. Saldo: S/ ${newBalance.toFixed(2)}`);
      } else {
        showToast('✅ Reserva cancelada correctamente.');
      }

      renderClientReservations();
    } catch (err) {
      showToast(`❌ Error al cancelar: ${err.message}`);
    }
  };
}

function closeCancelModal() {
  const overlay = document.getElementById('cancelModal');
  overlay.classList.remove('open');
}

// Cerrar el modal al hacer click fuera de la tarjeta
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('cancelModal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCancelModal();
    });
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeCancelModal();
      }
    });
  }
});

async function handlePayWithPromo() {
  const user = getSessionUser();
  const cls = state.selectedClass;
  if (!user || !cls || !state.selectedSpot) return;

  const btnPromo = document.getElementById('btnPayPromo');
  btnPromo.disabled = true;
  btnPromo.textContent = 'Procesando Canje...';

  const reservationPayload = {
    profile_id: user.id,
    class_id: cls.id,
    spot_number: state.selectedSpot,
    phone_yape: 'PROMO',
    code_yape: 'GRATIS',
    status: 'confirmed',
    payment_method: 'free_promo'
  };

  try {
    // 1. Deducir la clase de regalo
    const newCount = await deductFreeClass(user.id);
    
    // Actualizar sesión activa
    user.free_classes = newCount;
    localStorage.setItem('df_current_user', JSON.stringify(user));

    // 2. Registrar la reserva
    const res = await createReservation(reservationPayload);
    state.reservation = { ...res, cls: cls };

    showToast(`🎁 ¡Canjeado correctamente! Clases gratis restantes: ${newCount}`);
    goTo('confirm');
  } catch (err) {
    showToast(`❌ ${err.message}`);
    btnPromo.disabled = false;
    btnPromo.textContent = 'Canjear Clase Gratis ✓';
  }
}

async function renderBranchesClient() {
  const grid = document.getElementById('branchesClientGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;"><div class="loader">Ubicando nuestros estudios...</div></div>';
  
  try {
    const branches = await getBranches();
    const classes = await getClasses();
    grid.innerHTML = '';

    if (branches.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">No hay sedes registradas en este momento.</p>';
      return;
    }

    // Fondos degradados premium para cada sede
    const gradients = [
      'linear-gradient(135deg, rgba(255, 90, 31, 0.15), rgba(11, 21, 34, 0.95))',
      'linear-gradient(135deg, rgba(0, 180, 216, 0.15), rgba(11, 21, 34, 0.95))',
      'linear-gradient(135deg, rgba(45, 198, 83, 0.15), rgba(11, 21, 34, 0.95))'
    ];
    const emojis = ['🏢', '🌟', '💃'];

    branches.forEach((b, idx) => {
      // Contar clases programadas en esta sede
      const count = classes.filter(c => c.branch === b.name || Number(c.branch_id) === Number(b.id)).length;
      
      const bg = gradients[idx % gradients.length];
      const emoji = emojis[idx % emojis.length];

      const card = document.createElement('div');
      card.className = 'class-card';
      card.style.cursor = 'default';
      card.innerHTML = `
        <div class="card-img" style="background:${bg}; height:140px; display:flex; align-items:center; justify-content:center; font-size:3.2rem;">
          <span>${emoji}</span>
        </div>
        <div class="card-body" style="padding: 1.5rem;">
          <div class="card-title" style="font-size:1.25rem; font-family:'Playfair Display', serif; margin-bottom:8px; color:#fff;">${b.name}</div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <span>📍</span> ${b.address}
          </div>
          <div style="border-top:1px dashed var(--border); padding-top:12px; margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.78rem; color:#2dc653; font-weight:700;">📡 ESTUDIO OPERATIVO</span>
            <span class="price-chip" style="background:rgba(255,90,31,0.08); color:var(--accent); font-size:0.75rem;">${count} clases prog.</span>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:#e63946;grid-column:1/-1;text-align:center;padding:2rem">Error al cargar estudios: ${err.message}</p>`;
  }
}

// Al final de js/client.js:
window.renderClientHome = renderClientHome;
window.renderSpotSelection = renderSpotSelection;
window.renderClientIdentification = renderClientIdentification;
window.renderClientPayment = renderClientPayment;
window.renderClientConfirm = renderClientConfirm;
window.renderClientReservations = renderClientReservations;
window.renderBranchesClient = renderBranchesClient;

// Exponer controladores de eventos para el flujo de reservas (HTML inline onclick)
window.handleStartReservation = handleStartReservation;
window.handleSpotContinue = handleSpotContinue;
window.handleIdentContinue = handleIdentContinue;
window.handlePaymentSubmission = handlePaymentSubmission;
window.handlePayWithCredits = handlePayWithCredits;
window.handleCancelReservation = handleCancelReservation;
window.handlePayWithPromo = handlePayWithPromo;
window.validateClientIdent = validateClientIdent;
window.validateClientPayment = validateClientPayment;
window.closeCancelModal = closeCancelModal;
