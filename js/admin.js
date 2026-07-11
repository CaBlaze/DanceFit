// ── DANCEFIT STUDIO - CONTROLADOR DEL DASHBOARD DE ADMINISTRACIÓN ──
// VISTA DE DASHBOARD EJECUTIVO Y PANEL DE OPERACIONES (CLASES, PROFESORES, SEDES, AUDITORÍA)

/**
 * Orquestador principal para la inicialización de la pantalla analítica (Dashboard)
 */
export async function inicializarDashboardEjecutivo() {
    await cargarMetricasDashboardEjecutivo();
    await updateRevenueChart();
}

/**
 * Procesa y calcula los KPI relacionales de la base de datos para el Dashboard Ejecutivo
 */
export async function cargarMetricasDashboardEjecutivo() {
    try {
        const reservas = await getAllReservationsAdmin();
        const classes = await getClasses();

        let ingresosTotales = 0;
        const conteoClases = {};

        reservas.forEach((res) => {
            const price = res.classes ? Number(res.classes.price) : 25;
            ingresosTotales += price;
            const nombreClase = res.classes?.name || 'Clase General';
            const profe = res.classes?.instructor || 'Instructor';
            
            if (!conteoClases[nombreClase]) {
                conteoClases[nombreClase] = { total: 0, instructor: profe };
            }
            conteoClases[nombreClase].total += 1;
        });

        // 1. Renderizar Ingresos en el Dashboard
        const elIngresos = document.getElementById('dashMetricIngresos');
        if (elIngresos) elIngresos.textContent = `S/ ${ingresosTotales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

        // 2. Calcular Aforo Mensual y barra de progreso
        const totalCuposDisponibles = 1800; // Capacidad meta del estudio
        const elCupos = document.getElementById('dashMetricCupos');
        const barraCupos = document.getElementById('dashMetricBarraCupos');
        const txtPorcentaje = document.getElementById('dashTxtPorcentajeCupos');

        if (elCupos && barraCupos && txtPorcentaje) {
            const pct = Math.min(100, Math.round((reservas.length / totalCuposDisponibles) * 100));
            elCupos.textContent = `${reservas.length.toLocaleString()} / ${totalCuposDisponibles.toLocaleString()}`;
            barraCupos.style.width = `${pct}%`;
            txtPorcentaje.textContent = `${pct}% de la capacidad total mensual`;
            
            // Vincular con la tasa de ocupación promedio
            const elOcupacion = document.getElementById('dashMetricOcupacion');
            if (elOcupacion) elOcupacion.textContent = `${Math.min(100, Math.round(pct * 1.2))}%`;
        }

        // 3. Renderizar las clases con mayor demanda (Top 3)
        const listaDemanda = document.getElementById('dashListaMayorDemanda');
        if (listaDemanda) {
            const ordenadas = Object.entries(conteoClases)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 3); // Obtener el Top 3

            listaDemanda.innerHTML = '';
            const iconosPorOrden = ['🔥', '👠', '⚡'];

            ordenadas.forEach(([nombre, info], index) => {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;";
                const pctLlenado = 98 - (index * 6);

                itemDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 250px;">
                        <span style="font-size: 1.3rem; background: #2d2d2d; padding: 8px; border-radius: 8px; width: 40px; text-align: center;">
                            ${iconosPorOrden[index] || '💃'}
                        </span>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem;">
                                <strong>${nombre}</strong>
                                <span style="color: var(--primary, #ff5722); font-weight: bold;">${pctLlenado}%</span>
                            </div>
                            <div style="width: 100%; background: #2d2d2d; height: 5px; border-radius: 3px; overflow: hidden;">
                                <div style="background: var(--primary, #ff5722); height: 100%; width: ${pctLlenado}%;"></div>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 100px;">
                        <span style="font-size: 0.75rem; color: #a0a0a0; display: block;">Profesor</span>
                        <span style="font-size: 0.85rem; font-weight: 600;">${info.instructor}</span>
                    </div>
                `;
                listaDemanda.appendChild(itemDiv);
            });
        }

    } catch (err) {
        console.error("Error al procesar la analítica ejecutiva:", err.message);
    }
}

// PDF REPORT DOWNLOAD
window.descargarInformeEjecutivo = function() {
    if (typeof html2pdf === 'undefined') {
        showToast('⚡ Cargando motor de PDF...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
            generarPDF();
        };
        script.onerror = () => {
            showToast('❌ Error al cargar la librería de PDF.');
        };
        document.head.appendChild(script);
    } else {
        generarPDF();
    }
};

function generarPDF() {
    showToast('📄 Generando reporte PDF...');
    const element = document.getElementById('screen-dashboard');
    if (!element) {
        showToast('❌ Error: No se encontró el contenedor del dashboard.');
        return;
    }
    
    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     'Reporte_Ejecutivo_DanceFit.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#111111' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    html2pdf().set(opt).from(element).save();
}

// REVENUE CHART LOGIC
window.updateRevenueChart = async function() {
    const periodSelect = document.getElementById('dashRevenuePeriod');
    const chartContainer = document.getElementById('dashRevenueChart');
    if (!periodSelect || !chartContainer) return;

    const period = periodSelect.value;
    try {
        const reservas = await getAllReservationsAdmin();
        const now = new Date();
        
        let intervals = [];

        if (period === 'semana') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                intervals.push({
                    start: new Date(d.setHours(0,0,0,0)),
                    end: new Date(d.setHours(23,59,59,999)),
                    label: d.toLocaleDateString('es-ES', { weekday: 'short' })
                });
            }
        } else if (period === 'mes') {
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            for (let w = 0; w < 4; w++) {
                const startDay = w * 7 + 1;
                const endDay = Math.min((w + 1) * 7, 31);
                intervals.push({
                    start: new Date(currentYear, currentMonth, startDay, 0, 0, 0),
                    end: new Date(currentYear, currentMonth, endDay, 23, 59, 59),
                    label: `Sem ${w + 1}`
                });
            }
        } else if (period === '3meses') {
            for (let i = 2; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                intervals.push({
                    start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0),
                    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
                    label: d.toLocaleDateString('es-ES', { month: 'short' })
                });
            }
        } else if (period === '6meses') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                intervals.push({
                    start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0),
                    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
                    label: d.toLocaleDateString('es-ES', { month: 'short' })
                });
            }
        } else if (period === 'año') {
            const currentYear = now.getFullYear();
            for (let m = 0; m < 12; m++) {
                intervals.push({
                    start: new Date(currentYear, m, 1, 0, 0, 0),
                    end: new Date(currentYear, m + 1, 0, 23, 59, 59),
                    label: new Date(currentYear, m, 1).toLocaleDateString('es-ES', { month: 'short' })
                });
            }
        }

        const data = intervals.map(interval => {
            let total = 0;
            reservas.forEach(res => {
                const createdTime = new Date(res.created_at).getTime();
                if (createdTime >= interval.start.getTime() && createdTime <= interval.end.getTime()) {
                    total += res.classes ? Number(res.classes.price) : 25;
                }
            });
            return { label: interval.label, value: total };
        });

        const maxVal = Math.max(...data.map(d => d.value), 1);
        chartContainer.innerHTML = '';
        const barWidth = Math.max(10, Math.floor(80 / data.length));

        data.forEach(item => {
            const pctHeight = Math.max(5, Math.round((item.value / maxVal) * 85));
            const bar = document.createElement('div');
            bar.style.cssText = `width: ${barWidth}%; background: #2d2d2d; height: ${pctHeight}%; border-radius: 4px 4px 0 0; text-align: center; position: relative; transition: height 0.3s;`;
            
            const isHighest = item.value === maxVal && maxVal > 0;
            if (isHighest) {
                bar.style.background = 'var(--primary, #ff5722)';
                bar.style.boxShadow = '0 0 10px rgba(255, 87, 34, 0.2)';
            }

            bar.innerHTML = `
                <span style="font-size: 8px; color: ${isHighest ? 'var(--primary, #ff5722)' : '#a0a0a0'}; font-weight: ${isHighest ? 'bold' : 'normal'}; display: block; margin-top: -18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="S/ ${item.value.toFixed(2)}">
                    S/ ${item.value.toFixed(0)}
                </span>
                <span style="font-size: 9px; color: #757575; display: block; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap;">
                    ${item.label}
                </span>
            `;
            chartContainer.appendChild(bar);
        });

    } catch (err) {
        console.error("Error al actualizar gráfico de ingresos:", err);
        chartContainer.innerHTML = `<p style="color:#e63946; font-size:0.8rem; text-align:center; width:100%;">Error al cargar gráfico</p>`;
    }
};

// FULL DEMAND RANKING MODAL
window.mostrarModalDemandaCompleta = async function() {
    try {
        const reservas = await getAllReservationsAdmin();
        const conteoClases = {};

        reservas.forEach((res) => {
            const nombreClase = res.classes?.name || 'Clase General';
            const profe = res.classes?.instructor || 'Instructor';
            if (!conteoClases[nombreClase]) {
                conteoClases[nombreClase] = { total: 0, instructor: profe };
            }
            conteoClases[nombreClase].total += 1;
        });

        const ordenadas = Object.entries(conteoClases)
            .sort((a, b) => b[1].total - a[1].total);

        const modalBody = document.getElementById('demandaModalBody');
        if (!modalBody) return;

        modalBody.innerHTML = '';
        
        if (ordenadas.length === 0) {
            modalBody.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No hay registros de reservas aún.</p>';
        } else {
            ordenadas.forEach(([nombre, info], index) => {
                const row = document.createElement('div');
                row.style.cssText = "display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 10px;";
                row.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-weight:bold; font-size:1.1rem; color:var(--accent); width:25px;">#${index + 1}</span>
                        <div>
                            <strong>${nombre}</strong>
                            <div style="font-size:0.75rem; color:#a0a0a0;">Profesor: ${info.instructor}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span class="price-chip" style="background:rgba(255,90,31,0.1); color:var(--accent);">${info.total} Reservas</span>
                    </div>
                `;
                modalBody.appendChild(row);
            });
        }

        const modal = document.getElementById('demandaModal');
        if (modal) modal.classList.add('open');
    } catch (err) {
        console.error(err);
        showToast('❌ Error al cargar ranking.');
    }
};

window.closeDemandaModal = function() {
    const modal = document.getElementById('demandaModal');
    if (modal) modal.classList.remove('open');
};


/**
 * Orquestador principal para la inicialización del Panel de Operaciones tradicional
 */
export async function inicializarDashboardAdmin() {
    const user = getSessionUser();
    if (!user || user.role !== 'admin') {
        showToast("⚠️ Acceso denegado: Se requiere rol de Administrador.");
        goTo('login');
        return;
    }

    const navReservas = document.getElementById('nav-reservas');
    if (navReservas) navReservas.classList.remove('visible');

    // Inicializar selectores dinámicos del formulario
    await populateClassFormSelects();

    // Seleccionar por defecto la pestaña de clases
    switchAdminTab('clases');
    
    // Cargar métricas operacionales
    await calculateAdminMetrics();
}

// ── SISTEMA DE PESTAÑAS (TABS) DEL PANEL DE ADMINISTRACIÓN ──
window.switchAdminTab = function(tabName) {
    // Ocultar todos los paneles de contenido
    document.querySelectorAll('.admin-panel-content').forEach(panel => {
        panel.style.display = 'none';
    });
    
    // Remover clase activa de los botones de pestañas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar el panel seleccionado
    const targetPanel = document.getElementById(`admin-panel-${tabName}`);
    if (targetPanel) {
        targetPanel.style.display = 'block';
    }
    
    // Activar el botón de pestaña correspondiente
    const targetBtn = document.getElementById(`btn-tab-${tabName}`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // Disparadores dinámicos de renderizado por pestaña
    if (tabName === 'clases') {
        renderClassesAdminList();
    } else if (tabName === 'profesores') {
        renderInstructorsAdmin();
    } else if (tabName === 'sedes') {
        renderBranchesAdmin();
    } else if (tabName === 'economia') {
        renderEconomiaAdmin();
    } else if (tabName === 'reservas') {
        renderReservasAdminTable();
    }
};

// ── POBLAR SELECTORES DINÁMICOS EN EL FORMULARIO DE CLASES ──
async function populateClassFormSelects() {
    try {
        const insts = await getInstructors();
        const branches = await getBranches();
        
        const instSelect = document.getElementById('adminClassInstructorId');
        const branchSelect = document.getElementById('adminClassBranchId');
        
        if (instSelect) {
            instSelect.innerHTML = insts.map(i => `<option value="${i.id}">${i.name} (${i.role})</option>`).join('');
        }
        if (branchSelect) {
            branchSelect.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        }
    } catch (err) {
        console.error("Error cargando selectores del formulario:", err);
    }
}

// ── LISTAR Y ELIMINAR CLASES PROGRAMADAS ──
let adminClassFilterDateVal = '';

window.filterAdminClassesByDate = function() {
    const input = document.getElementById('adminClassFilterDate');
    if (input) {
        adminClassFilterDateVal = input.value;
        renderClassesAdminList();
    }
};

window.clearAdminClassDateFilter = function() {
    const input = document.getElementById('adminClassFilterDate');
    if (input) input.value = '';
    adminClassFilterDateVal = '';
    renderClassesAdminList();
};

async function renderClassesAdminList() {
    const container = document.getElementById('adminClassesTableBody');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#a0a0a0;">Cargando clases programadas...</td></tr>';
    
    try {
        let classes = await getClasses();
        container.innerHTML = '';

        // Aplicar filtro de fecha si está definido
        if (adminClassFilterDateVal) {
            classes = classes.filter(c => c.class_date === adminClassFilterDateVal);
        }
        
        if (classes.length === 0) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#757575;">No hay clases programadas para esta fecha o categoría.</td></tr>';
            return;
        }
        
        classes.forEach(c => {
            const dateStr = new Date(c.class_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;color:#fff;">${c.emoji} ${c.name}</div>
                    <div style="font-size:0.75rem;color:var(--accent);">${c.style} · ${c.level}</div>
                </td>
                <td>
                    <div style="font-weight:600;color:#fff;">${c.instructor}</div>
                    <div style="font-size:0.75rem;color:#a0a0a0;">Sede: ${c.branch}</div>
                </td>
                <td>
                    <div>📅 ${dateStr}</div>
                    <div style="font-size:0.75rem;color:#a0a0a0;">⏰ ${c.time}h (${c.duration})</div>
                </td>
                <td><span class="price-chip">S/ ${formatPrice(c.price)}</span></td>
                <td style="text-align:center;">
                    <button class="btn-small btn-delete" onclick="handleDeleteClass(${c.id})">✕ Eliminar</button>
                </td>
            `;
            container.appendChild(tr);
        });
    } catch (err) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ff5252;padding:1.5rem;">Error al cargar clases: ${err.message}</td></tr>`;
    }
}

window.handleDeleteClass = async function(id) {
    if (confirm("¿Estás seguro que deseas eliminar esta clase? Todas las reservas asociadas también se cancelarán.")) {
        try {
            await deleteClass(id);
            showToast("✅ Clase eliminada correctamente.");
            await renderClassesAdminList();
            await calculateAdminMetrics();
        } catch (err) {
            showToast(`❌ Error al eliminar clase: ${err.message}`);
        }
    }
};

// ── GESTIÓN DE PROFESORES ──
async function renderInstructorsAdmin() {
    const container = document.getElementById('adminInstructorsTableBody');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#a0a0a0;">Cargando profesores...</td></tr>';
    
    try {
        const insts = await getInstructors();
        container.innerHTML = '';
        
        if (insts.length === 0) {
            container.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#757575;">No hay profesores registrados.</td></tr>';
            return;
        }
        
        insts.forEach(i => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700;color:var(--accent);font-size:0.8rem;">#${i.id}</td>
                <td style="font-weight:600;color:#fff;">${i.name}</td>
                <td style="color:#a0a0a0;">${i.role}</td>
                <td style="text-align:center;">
                    <div style="display:inline-flex;gap:6px;">
                        <button class="btn-small btn-edit" onclick="editTeacher(${i.id}, '${escapeQuote(i.name)}', '${escapeQuote(i.role)}')">✏️ Editar</button>
                        <button class="btn-small btn-delete" onclick="handleDeleteTeacher(${i.id})">✕ Borrar</button>
                    </div>
                </td>
            `;
            container.appendChild(tr);
        });
    } catch (err) {
        container.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ff5252;padding:1.5rem;">Error al cargar profesores: ${err.message}</td></tr>`;
    }
}

function escapeQuote(str) {
    return str.replace(/'/g, "\\'");
}

window.editTeacher = function(id, name, role) {
    document.getElementById('adminTeacherId').value = id;
    document.getElementById('adminTeacherName').value = name;
    document.getElementById('adminTeacherRole').value = role;
    
    document.getElementById('teacherFormTitle').textContent = "Editar Profesor";
    document.getElementById('adminBtnCancelTeacher').style.display = "inline-block";
    document.getElementById('adminBtnSaveTeacher').textContent = "Guardar Cambios →";
    document.getElementById('adminTeacherName').focus();
};

window.resetTeacherForm = function() {
    document.getElementById('adminTeacherId').value = '';
    document.getElementById('adminTeacherForm').reset();
    document.getElementById('teacherFormTitle').textContent = "Agregar Profesor";
    document.getElementById('adminBtnCancelTeacher').style.display = "none";
    document.getElementById('adminBtnSaveTeacher').textContent = "Guardar Profesor →";
};

window.handleCreateOrEditInstructor = async function(event) {
    event.preventDefault();
    const id = document.getElementById('adminTeacherId').value;
    const name = document.getElementById('adminTeacherName').value.trim();
    const role = document.getElementById('adminTeacherRole').value.trim();
    
    if (!name || !role) {
        showToast("⚠️ Rellena todos los campos.");
        return;
    }
    
    const payload = { name, role };
    const btn = document.getElementById('adminBtnSaveTeacher');
    btn.disabled = true;
    btn.textContent = id ? "Actualizando..." : "Guardando...";
    
    try {
        if (id) {
            await updateInstructor(id, payload);
            showToast("✅ Profesor actualizado correctamente.");
        } else {
            await createInstructor(payload);
            showToast("✅ Profesor registrado con éxito.");
        }
        resetTeacherForm();
        await renderInstructorsAdmin();
        await populateClassFormSelects();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`);
    } finally {
        btn.disabled = false;
    }
};

window.handleDeleteTeacher = async function(id) {
    if (confirm("¿Estás seguro de eliminar a este profesor?")) {
        try {
            await deleteInstructor(id);
            showToast("✅ Profesor eliminado.");
            await renderInstructorsAdmin();
            await populateClassFormSelects();
        } catch (err) {
            showToast(`❌ Error: ${err.message}`);
        }
    }
};

// ── GESTIÓN DE SEDES ──
async function renderBranchesAdmin() {
    const container = document.getElementById('adminBranchesTableBody');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#a0a0a0;">Cargando sedes...</td></tr>';
    
    try {
        const branches = await getBranches();
        container.innerHTML = '';
        
        if (branches.length === 0) {
            container.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#757575;">No hay sedes registradas.</td></tr>';
            return;
        }
        
        branches.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700;color:var(--accent);font-size:0.8rem;">#${b.id}</td>
                <td style="font-weight:600;color:#fff;">${b.name}</td>
                <td style="color:#a0a0a0;">${b.address}</td>
                <td style="text-align:center;">
                    <div style="display:inline-flex;gap:6px;">
                        <button class="btn-small btn-edit" onclick="editBranch(${b.id}, '${escapeQuote(b.name)}', '${escapeQuote(b.address)}')">✏️ Editar</button>
                        <button class="btn-small btn-delete" onclick="handleDeleteBranch(${b.id})">✕ Borrar</button>
                    </div>
                </td>
            `;
            container.appendChild(tr);
        });
    } catch (err) {
        container.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ff5252;padding:1.5rem;">Error al cargar sedes: ${err.message}</td></tr>`;
    }
}

window.editBranch = function(id, name, address) {
    document.getElementById('adminBranchId').value = id;
    document.getElementById('adminBranchName').value = name;
    document.getElementById('adminBranchAddress').value = address;
    
    document.getElementById('branchFormTitle').textContent = "Editar Sede";
    document.getElementById('adminBtnCancelBranch').style.display = "inline-block";
    document.getElementById('adminBtnSaveBranch').textContent = "Guardar Cambios →";
    document.getElementById('adminBranchName').focus();
};

window.resetBranchForm = function() {
    document.getElementById('adminBranchId').value = '';
    document.getElementById('adminBranchForm').reset();
    document.getElementById('branchFormTitle').textContent = "Agregar Sede";
    document.getElementById('adminBtnCancelBranch').style.display = "none";
    document.getElementById('adminBtnSaveBranch').textContent = "Guardar Sede →";
};

window.handleCreateOrEditBranch = async function(event) {
    event.preventDefault();
    const id = document.getElementById('adminBranchId').value;
    const name = document.getElementById('adminBranchName').value.trim();
    const address = document.getElementById('adminBranchAddress').value.trim();
    
    if (!name || !address) {
        showToast("⚠️ Rellena todos los campos.");
        return;
    }
    
    const payload = { name, address };
    const btn = document.getElementById('adminBtnSaveBranch');
    btn.disabled = true;
    btn.textContent = id ? "Actualizando..." : "Guardando...";
    
    try {
        if (id) {
            await updateBranch(id, payload);
            showToast("✅ Sede actualizada correctamente.");
        } else {
            await createBranch(payload);
            showToast("✅ Sede registrada con éxito.");
        }
        resetBranchForm();
        await renderBranchesAdmin();
        await populateClassFormSelects();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`);
    } finally {
        btn.disabled = false;
    }
};

window.handleDeleteBranch = async function(id) {
    if (confirm("¿Estás seguro de eliminar esta sede?")) {
        try {
            await deleteBranch(id);
            showToast("✅ Sede eliminada.");
            await renderBranchesAdmin();
            await populateClassFormSelects();
        } catch (err) {
            showToast(`❌ Error: ${err.message}`);
        }
    }
};

// ── GESTIÓN ECONÓMICA ──
async function renderEconomiaAdmin() {
    const ecoMetricIngresos = document.getElementById('ecoMetricIngresos');
    const ecoMetricEgresos = document.getElementById('ecoMetricEgresos');
    const ecoMetricUtilidad = document.getElementById('ecoMetricUtilidad');
    const ecoBranchesBody = document.getElementById('ecoBranchesTableBody');
    const ecoClassesBody = document.getElementById('ecoClassesTableBody');
    
    if (!ecoMetricIngresos || !ecoMetricEgresos || !ecoMetricUtilidad || !ecoBranchesBody || !ecoClassesBody) return;
    
    ecoBranchesBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#a0a0a0;padding:1rem;">Cargando balance de sedes...</td></tr>';
    ecoClassesBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#a0a0a0;padding:1rem;">Cargando balance de clases...</td></tr>';

    try {
        const reservations = await getAllReservationsAdmin();
        const classes = await getClasses();
        const branches = await getBranches();

        // 1. Calcular Ingresos Brutos
        let ingresosBrutos = 0;
        reservations.forEach(res => {
            const price = res.classes ? Number(res.classes.price) : 25;
            ingresosBrutos += price;
        });

        // 2. Calcular Egresos: S/50 por clase creada (honorarios de profesor) + S/150 por sede (costo de mantenimiento de locales)
        const pagoProfesores = classes.length * 50;
        const mantenimientoSedes = branches.length * 150;
        const egresosOperativos = pagoProfesores + mantenimientoSedes;

        // 3. Utilidad Neta
        const utilidadNeta = ingresosBrutos - egresosOperativos;

        // Pintar KPIs
        ecoMetricIngresos.textContent = `S/ ${ingresosBrutos.toFixed(2)}`;
        ecoMetricEgresos.textContent = `S/ ${egresosOperativos.toFixed(2)}`;
        ecoMetricUtilidad.textContent = `S/ ${utilidadNeta.toFixed(2)}`;
        if (utilidadNeta < 0) {
            ecoMetricUtilidad.style.color = '#e63946'; // rojo si hay pérdida
        } else {
            ecoMetricUtilidad.style.color = '#00e676'; // verde si hay ganancia
        }

        // 4. Calcular ingresos por sede
        const sedeRecaudacion = {};
        branches.forEach(b => {
            sedeRecaudacion[b.id] = { name: b.name, address: b.address, reservas: 0, ingresos: 0 };
        });

        reservations.forEach(res => {
            if (res.classes && res.classes.branch_id) {
                const bId = res.classes.branch_id;
                const price = Number(res.classes.price || 25);
                if (sedeRecaudacion[bId]) {
                    sedeRecaudacion[bId].reservas += 1;
                    sedeRecaudacion[bId].ingresos += price;
                }
            }
        });

        ecoBranchesBody.innerHTML = '';
        Object.values(sedeRecaudacion).forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;color:#fff;">🏢 ${s.name}</div>
                    <div style="font-size:0.75rem;color:#a0a0a0;">${s.address}</div>
                </td>
                <td style="text-align:center;"><span class="price-chip">${s.reservas} res.</span></td>
                <td style="text-align:right;font-weight:700;color:#2dc653;">S/ ${s.ingresos.toFixed(2)}</td>
            `;
            ecoBranchesBody.appendChild(tr);
        });

        // 5. Calcular desglose por clase
        const claseRecaudacion = {};
        classes.forEach(c => {
            claseRecaudacion[c.id] = { 
                name: c.name, 
                style: c.style, 
                branch: c.branch, 
                instructor: c.instructor,
                price: Number(c.price),
                reservas: 0,
                ingresos: 0
            };
        });

        reservations.forEach(res => {
            const cId = res.class_id;
            const price = res.classes ? Number(res.classes.price) : 25;
            if (claseRecaudacion[cId]) {
                claseRecaudacion[cId].reservas += 1;
                claseRecaudacion[cId].ingresos += price;
            }
        });

        ecoClassesBody.innerHTML = '';
        Object.entries(claseRecaudacion).forEach(([cId, c]) => {
            const egresosClase = 50; // pago al profesor
            const utilidadClase = c.ingresos - egresosClase;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;color:#fff;">${c.name}</div>
                    <div style="font-size:0.75rem;color:var(--accent);">${c.style}</div>
                </td>
                <td><div style="color:#a0a0a0;">${c.branch}</div></td>
                <td><div style="color:#fff;">${c.instructor}</div></td>
                <td style="text-align:center;"><span class="price-chip">${c.reservas}</span></td>
                <td style="text-align:right;color:#2dc653;font-weight:600;">S/ ${c.ingresos.toFixed(2)}</td>
                <td style="text-align:right;color:#e63946;">S/ ${egresosClase.toFixed(2)}</td>
                <td style="text-align:right;font-weight:700;color:${utilidadClase >= 0 ? '#00e676' : '#e63946'}">
                    S/ ${utilidadClase.toFixed(2)}
                </td>
            `;
            ecoClassesBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error al calcular balance económico:", err);
        ecoBranchesBody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#ff5252;">Error: ${err.message}</td></tr>`;
        ecoClassesBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ff5252;">Error: ${err.message}</td></tr>`;
    }
}

// ── CALCULAR MÉTRICAS DEL ESTUDIO EN PANEL OPERATIVO ──
async function calculateAdminMetrics() {
    const metricsContainer = document.getElementById('adminMetrics');
    if (!metricsContainer) return;

    try {
        const reservations = await getAllReservationsAdmin();
        const classes = await getClasses();

        // 1. Ingresos Totales
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

        // 3. Tasa de ocupación promedio basada en el aforo real (32 spots)
        let avgOccupation = 0;
        if (classes.length > 0) {
            avgOccupation = Math.round((reservations.length / (classes.length * 32)) * 100);
        }

        metricsContainer.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon">💰</div>
                <div class="metric-info">
                    <div class="metric-label" style="color:#a0a0a0; font-weight:700; font-size:0.75rem;">Ingresos Recaudados</div>
                    <div class="metric-val" style="font-size:1.6rem; font-weight:800;">S/ ${totalEarnings.toFixed(2)}</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">🏆</div>
                <div class="metric-info">
                    <div class="metric-label" style="color:#a0a0a0; font-weight:700; font-size:0.75rem;">Clase más Popular</div>
                    <div class="metric-val" style="font-size:0.95rem; font-weight:800; line-height:1.2; font-family:'Playfair Display', serif;">
                        ${mostPopularClass} ${maxReservations > 0 ? `(${maxReservations} res.)` : ''}
                    </div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">⚡</div>
                <div class="metric-info">
                    <div class="metric-label" style="color:#a0a0a0; font-weight:700; font-size:0.75rem;">Ocupación Promedio</div>
                    <div class="metric-val" style="font-size:1.6rem; font-weight:800;">${avgOccupation}%</div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Error calculando métricas:", err);
        metricsContainer.innerHTML = `<p style="color:#ff5252; grid-column:1/-1;">Error al calcular estadísticas: ${err.message}</p>`;
    }
}

// ── TABLA DE AUDITORÍA DE RESERVAS GLOBALES ──
async function renderReservasAdminTable() {
    const container = document.getElementById('adminReservasTableBody');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem; color:#a0a0a0;">Obteniendo auditoría global de reservas...</td></tr>';

    try {
        const reservations = await getAllReservationsAdmin();
        container.innerHTML = '';

        if (reservations.length === 0) {
            container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#757575;">No existen reservas registradas en el sistema.</td></tr>';
            return;
        }

        reservations.forEach(res => {
            const cls = res.classes || {};
            const profile = res.profiles || {};
            const dateFormatted = new Date(res.created_at).toLocaleDateString('es-ES', { 
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
            });
            
            const idCorto = res.id.substring(0, 8);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--accent); font-size: 0.8rem; cursor:pointer;" title="ID completo: ${res.id}" onclick="navigator.clipboard.writeText('${res.id}'); alert('ID Copiado');">
                    ${idCorto}...
                </td>
                <td>
                    <div style="font-weight: 600; color:#fff;">${profile.name || 'Cliente Demo'}</div>
                    <div style="font-size: 0.72rem; color: #a0a0a0;">DNI: ${profile.dni || '—'}</div>
                </td>
                <td>
                    <div style="font-weight: 600; color:#fff;">${cls.name || 'Clase'}</div>
                    <div style="font-size: 0.72rem; color: #a0a0a0;">${cls.instructor || 'Profesor'} (Sede: ${cls.branch || 'Principal'})</div>
                </td>
                <td style="text-align: center;"><span class="price-chip" style="background:#2d2d2d; padding:4px 8px; border-radius:4px;">#${res.spot_number}</span></td>
                <td>
                    <div style="font-weight: 600; color:#fff;">Cel: ${res.phone_yape || '—'}</div>
                    <div style="font-size: 0.72rem; color: #00e676; font-weight: 600;">Cód: ${res.code_yape || '—'}</div>
                </td>
                <td style="font-size: 0.72rem; color: #a0a0a0;">${dateFormatted}</td>
            `;
            container.appendChild(tr);
        });
    } catch (err) {
        container.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ff5252;padding:2rem;">Error al cargar auditoría: ${err.message}</td></tr>`;
    }
}

// Exponer la función de envío del formulario al entorno global window
window.handleCreateClassSubmission = async function(event) {
    event.preventDefault();

    const form         = document.getElementById('adminClassForm');
    const name         = document.getElementById('adminClassName').value.trim();
    const style        = document.getElementById('adminClassStyle').value;
    const level        = document.getElementById('adminClassLevel').value;
    const price        = Number(document.getElementById('adminClassPrice').value);
    const classDate    = document.getElementById('adminClassDate').value;    // YYYY-MM-DD
    const time         = document.getElementById('adminClassTime').value;    // HH:MM
    const duration     = document.getElementById('adminClassDuration').value;
    const instructorId = Number(document.getElementById('adminClassInstructorId').value);
    const branchId     = Number(document.getElementById('adminClassBranchId').value);
    const theme        = document.getElementById('adminClassTheme').value.trim();

    const oldBanner = document.getElementById('adminClassBanner');
    if (oldBanner) oldBanner.remove();

    if (!name || !classDate || !time || !instructorId || !branchId || !theme) {
        showAdminBanner('error', '⚠️ Completa todos los campos antes de publicar la clase.');
        return;
    }

    const levelColors = {
        'BEGINNER':         '#00b4d8',
        'OPEN LEVEL':       '#2dc653',
        'ADVANCED':         '#9b5de5',
        'SPECIAL WORKSHOP': '#f4a261'
    };
    const level_color = levelColors[level] || '#2dc653';

    const styleEmojis = {
        'Reggaetón': '🔥',
        'Salsa':     '💃',
        'Bachata':   '🌹',
        'Urbano':    '🎤',
        'Funcional': '⚡'
    };
    const emoji = styleEmojis[style] || '🎵';

    // Recuperar nombres para el banner de feedback instantáneo
    let instructorName = "Elena Márquez";
    let branchName = "Sede Norte";
    try {
        const insts = await getInstructors();
        const targetInst = insts.find(i => Number(i.id) === Number(instructorId));
        if (targetInst) instructorName = targetInst.name;
        
        const brs = await getBranches();
        const targetBr = brs.find(b => Number(b.id) === Number(branchId));
        if (targetBr) branchName = targetBr.name;
    } catch (_) {}

    // Generar estructura de carga útil (Payload)
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
        instructor_id: instructorId,
        branch_id: branchId
    };

    const btn = document.getElementById('adminBtnCreateClass');
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        Publicando clase...
    </span>`;

    try {
        // Llamada remota mediante adapter
        await createClass(classPayload);
        
        form.reset();

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
                👤 ${instructorName} · 🏢 ${branchName} · 🎨 Temática: ${theme}
            </div>
        `);

        // Sincronizar y recargar las tablas y métricas
        await calculateAdminMetrics();
        await renderClassesAdminList();

    } catch (err) {
        console.error("❌ Error al crear clase:", err);
        showAdminBanner('error', `❌ No se pudo publicar la clase: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Crear y Publicar Clase →";
    }
};

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

    const btn = document.getElementById('adminBtnCreateClass');
    btn.parentNode.insertBefore(banner, btn.nextSibling);

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