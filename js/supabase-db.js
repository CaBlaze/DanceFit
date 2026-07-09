// ── DANCEFIT STUDIO - CAPA DE ADAPTADOR DE BASE DE DATOS (SUPABASE / LOCAL DEMO) ──

let dbClient = null;
let isDemoMode = true;

// Datos por defecto para el Modo Demo Local
const DEFAULT_INSTRUCTORS = [
  { id: 1, name: "Elena Márquez", role: "Instructora Principal" },
  { id: 2, name: "Carlos Rivera", role: "Salsa Pro Coach" },
  { id: 3, name: "Sofia Chen", role: "Fitness Specialist" },
  { id: 4, name: "Marco & Estela", role: "International Artists" },
  { id: 5, name: "Leo Cruz", role: "Urban Specialist" }
];

const DEFAULT_CLASSES = [
  { id: 1, name: "Reggaetón Energy", level: "ADVANCED", level_color: "#9b5de5", time: "19:30", instructor_id: 1, branch_id: 1, theme: "Neón Night", style: "Reggaetón", price: 25, duration: "90 min", emoji: "🔥" },
  { id: 2, name: "Salsa Foundation", level: "BEGINNER", level_color: "#00b4d8", time: "18:00", instructor_id: 2, branch_id: 2, theme: "Classic Casino", style: "Salsa", price: 25, duration: "60 min", emoji: "💃" },
  { id: 3, name: "D-Fit Funcional", level: "OPEN LEVEL", level_color: "#2dc653", time: "07:00", instructor_id: 3, branch_id: 3, theme: "Power Beat", style: "Funcional", price: 25, duration: "60 min", emoji: "⚡" },
  { id: 4, name: "Master Bachata Sensual", level: "SPECIAL WORKSHOP", level_color: "#f4a261", time: "21:00", instructor_id: 4, branch_id: 2, theme: "Midnight Romance", style: "Bachata", price: 50, duration: "120 min", emoji: "🌹" },
  { id: 5, name: "Urban Core", level: "OPEN LEVEL", level_color: "#2dc653", time: "17:00", instructor_id: 5, branch_id: 1, theme: "Street Vibe", style: "Urbano", price: 25, duration: "90 min", emoji: "🎤" },
];

const DEFAULT_RESERVATIONS = [
  { id: "df-res-demo-1", profile_id: "client-demo-id", class_id: 1, spot_number: 5, phone_yape: "987654321", code_yape: "123456", status: "confirmed", created_at: new Date().toISOString() },
  { id: "df-res-demo-2", profile_id: "client-demo-id", class_id: 1, spot_number: 12, phone_yape: "912345678", code_yape: "654321", status: "confirmed", created_at: new Date().toISOString() },
  { id: "df-res-demo-3", profile_id: "other-demo-id", class_id: 2, spot_number: 19, phone_yape: "955443322", code_yape: "987123", status: "confirmed", created_at: new Date().toISOString() },
];

const DEFAULT_BRANCHES = [
  { id: 1, name: "Sede Norte", address: "Av. Alfredo Mendiola 3600, Los Olivos" },
  { id: 2, name: "Sede Sur", address: "Av. Benavides 2100, Miraflores" },
  { id: 3, name: "Sede Centro", address: "Av. Arequipa 1200, Lima" }
];

// Inicializar base de datos
function initDB() {
  console.log("🔍 [DEBUG] SUPABASE_URL leído:", SUPABASE_URL);
  console.log("🔍 [DEBUG] SUPABASE_ANON_KEY leído:", SUPABASE_ANON_KEY);
  console.log("🔍 [DEBUG] Tipo de 'supabase' global:", typeof supabase);

  const isDefaultUrl = SUPABASE_URL.includes("tu-proyecto") || !SUPABASE_URL.startsWith("http");
  const isDefaultKey = SUPABASE_ANON_KEY.includes("tu-anon-key");
  const isSupabaseUndefined = typeof supabase === 'undefined';

  console.log("🔍 [DEBUG] isDefaultUrl:", isDefaultUrl);
  console.log("🔍 [DEBUG] isDefaultKey:", isDefaultKey);
  console.log("🔍 [DEBUG] isSupabaseUndefined:", isSupabaseUndefined);

  if (isDefaultUrl || isDefaultKey || isSupabaseUndefined) {
    console.warn("⚠️ DanceFit Studio: Usando Modo Demo Local (Base de datos local en localStorage). Para conectar con Supabase real, configura js/config.js");
    isDemoMode = true;
    
    // Rellenar localStorage si está vacío
    if (!localStorage.getItem("df_instructors")) {
      localStorage.setItem("df_instructors", JSON.stringify(DEFAULT_INSTRUCTORS));
    }
    if (!localStorage.getItem("df_classes")) {
      localStorage.setItem("df_classes", JSON.stringify(DEFAULT_CLASSES));
    }
    if (!localStorage.getItem("df_reservations")) {
      localStorage.setItem("df_reservations", JSON.stringify(DEFAULT_RESERVATIONS));
    }
    if (!localStorage.getItem("df_branches")) {
      localStorage.setItem("df_branches", JSON.stringify(DEFAULT_BRANCHES));
    }
  } else {
    try {
      dbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isDemoMode = false;
      console.log("✅ DanceFit Studio: Conexión exitosa a Supabase Cloud.");
    } catch (err) {
      console.error("❌ Error inicializando Supabase Client, activando Modo Demo Local:", err);
      isDemoMode = true;
    }
  }
}

// ── APIS DE INSTRUCTORES ──

async function getInstructors() {
  if (isDemoMode) {
    return JSON.parse(localStorage.getItem("df_instructors") || "[]");
  }

  const { data, error } = await dbClient
    .from('instructors')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error al obtener instructores de Supabase:", error);
    throw error;
  }
  return data;
}

async function createInstructor(instructorData) {
  if (isDemoMode) {
    const localInst = JSON.parse(localStorage.getItem("df_instructors") || "[]");
    
    const existe = localInst.some(i => i.name.toLowerCase() === instructorData.name.toLowerCase());
    if (existe) {
      throw new Error("El instructor ya está registrado.");
    }

    const newId = localInst.length > 0 ? Math.max(...localInst.map(i => i.id)) + 1 : 1;
    const newInst = { id: newId, ...instructorData, created_at: new Date().toISOString() };
    localInst.push(newInst);
    localStorage.setItem("df_instructors", JSON.stringify(localInst));
    return newInst;
  }

  const { data, error } = await dbClient
    .from('instructors')
    .insert([instructorData])
    .select();

  if (error) {
    console.error("Error al crear instructor en Supabase:", error);
    throw error;
  }
  return data[0];
}

async function updateInstructor(id, instructorData) {
  if (isDemoMode) {
    const localInst = JSON.parse(localStorage.getItem("df_instructors") || "[]");
    const idx = localInst.findIndex(i => Number(i.id) === Number(id));
    if (idx === -1) throw new Error("Instructor no encontrado.");
    
    const existe = localInst.some(i => Number(i.id) !== Number(id) && i.name.toLowerCase() === instructorData.name.toLowerCase());
    if (existe) throw new Error("Ya existe otro instructor con ese nombre.");

    localInst[idx] = { ...localInst[idx], ...instructorData };
    localStorage.setItem("df_instructors", JSON.stringify(localInst));
    return localInst[idx];
  }

  const { data, error } = await dbClient
    .from('instructors')
    .update(instructorData)
    .eq('id', id)
    .select();

  if (error) {
    console.error("Error al actualizar instructor en Supabase:", error);
    throw error;
  }
  return data[0];
}

async function deleteInstructor(id) {
  if (isDemoMode) {
    let localInst = JSON.parse(localStorage.getItem("df_instructors") || "[]");
    localInst = localInst.filter(i => Number(i.id) !== Number(id));
    localStorage.setItem("df_instructors", JSON.stringify(localInst));
    return true;
  }

  const { error } = await dbClient
    .from('instructors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error al eliminar instructor en Supabase:", error);
    throw error;
  }
  return true;
}

// ── APIS DE SEDES (LOCALES) ──

async function getBranches() {
  if (isDemoMode) {
    return JSON.parse(localStorage.getItem("df_branches") || "[]");
  }

  const { data, error } = await dbClient
    .from('branches')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error al obtener sedes de Supabase:", error);
    throw error;
  }
  return data;
}

async function createBranch(branchData) {
  if (isDemoMode) {
    const localBranches = JSON.parse(localStorage.getItem("df_branches") || "[]");
    const existe = localBranches.some(b => b.name.toLowerCase() === branchData.name.toLowerCase());
    if (existe) {
      throw new Error("La sede ya se encuentra registrada.");
    }

    const newId = localBranches.length > 0 ? Math.max(...localBranches.map(b => b.id)) + 1 : 1;
    const newBranch = { id: newId, ...branchData, created_at: new Date().toISOString() };
    localBranches.push(newBranch);
    localStorage.setItem("df_branches", JSON.stringify(localBranches));
    return newBranch;
  }

  const { data, error } = await dbClient
    .from('branches')
    .insert([branchData])
    .select();

  if (error) {
    console.error("Error al crear sede en Supabase:", error);
    throw error;
  }
  return data[0];
}

async function updateBranch(id, branchData) {
  if (isDemoMode) {
    const localBranches = JSON.parse(localStorage.getItem("df_branches") || "[]");
    const idx = localBranches.findIndex(b => Number(b.id) === Number(id));
    if (idx === -1) throw new Error("Sede no encontrada.");

    const existe = localBranches.some(b => Number(b.id) !== Number(id) && b.name.toLowerCase() === branchData.name.toLowerCase());
    if (existe) throw new Error("Ya existe otra sede con ese nombre.");

    localBranches[idx] = { ...localBranches[idx], ...branchData };
    localStorage.setItem("df_branches", JSON.stringify(localBranches));
    return localBranches[idx];
  }

  const { data, error } = await dbClient
    .from('branches')
    .update(branchData)
    .eq('id', id)
    .select();

  if (error) {
    console.error("Error al actualizar sede en Supabase:", error);
    throw error;
  }
  return data[0];
}

async function deleteBranch(id) {
  if (isDemoMode) {
    let localBranches = JSON.parse(localStorage.getItem("df_branches") || "[]");
    localBranches = localBranches.filter(b => Number(b.id) !== Number(id));
    localStorage.setItem("df_branches", JSON.stringify(localBranches));
    return true;
  }

  const { error } = await dbClient
    .from('branches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error al eliminar sede en Supabase:", error);
    throw error;
  }
  return true;
}

// ── APIS DE CLASES ──

async function getClasses() {
  if (isDemoMode) {
    const classes = JSON.parse(localStorage.getItem("df_classes") || "[]");
    const instructors = JSON.parse(localStorage.getItem("df_instructors") || "[]");
    const branches = JSON.parse(localStorage.getItem("df_branches") || "[]");
    return classes.map(c => {
      const inst = instructors.find(i => Number(i.id) === Number(c.instructor_id)) || {};
      const branch = branches.find(b => Number(b.id) === Number(c.branch_id)) || {};
      return {
        ...c,
        instructor: inst.name || 'Instructor',
        role: inst.role || 'Instructor',
        branch: branch.name || 'Sede Principal',
        branch_address: branch.address || ''
      };
    });
  }
  
  const { data, error } = await dbClient
    .from('classes')
    .select('*, instructors:instructor_id(*), branches:branch_id(*)')
    .order('time', { ascending: true });
    
  if (error) {
    console.error("Error al obtener clases de Supabase:", error);
    throw error;
  }
  
  return data.map(c => ({
    ...c,
    instructor: c.instructors ? c.instructors.name : (c.instructor || 'Instructor'),
    role: c.instructors ? c.instructors.role : (c.role || 'Instructor'),
    branch: c.branches ? c.branches.name : (c.branch || 'Sede Principal'),
    branch_address: c.branches ? c.branches.address : ''
  }));
}

async function createClass(classData) {
  if (isDemoMode) {
    const localClasses = JSON.parse(localStorage.getItem("df_classes") || "[]");
    const newId = localClasses.length > 0 ? Math.max(...localClasses.map(c => c.id)) + 1 : 1;
    const newClass = { id: newId, ...classData, created_at: new Date().toISOString() };
    localClasses.push(newClass);
    localStorage.setItem("df_classes", JSON.stringify(localClasses));
    return newClass;
  }

  const { data, error } = await dbClient
    .from('classes')
    .insert([classData])
    .select();
    
  if (error) {
    console.error("Error al crear clase en Supabase:", error);
    throw error;
  }
  return data[0];
}

// ── APIS DE RESERVAS ──

async function getOccupiedSpots(classId) {
  if (isDemoMode) {
    const localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    return localRes
      .filter(r => Number(r.class_id) === Number(classId))
      .map(r => r.spot_number);
  }

  const { data, error } = await dbClient
    .from('reservations')
    .select('spot_number')
    .eq('class_id', classId);
    
  if (error) {
    console.error("Error al consultar spots ocupados en Supabase:", error);
    throw error;
  }
  return data.map(r => r.spot_number);
}

async function createReservation(resData) {
  if (isDemoMode) {
    const localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    
    // Validar spot único localmente
    const spotOcupado = localRes.some(r => Number(r.class_id) === Number(resData.class_id) && r.spot_number === resData.spot_number);
    if (spotOcupado) {
      throw new Error("El spot ya se encuentra reservado para esta clase.");
    }
    
    const newRes = {
      id: "DF-" + Math.floor(100000 + Math.random() * 900000) + "-TK",
      ...resData,
      status: "confirmed",
      created_at: new Date().toISOString()
    };
    
    localRes.push(newRes);
    localStorage.setItem("df_reservations", JSON.stringify(localRes));
    return newRes;
  }

  const { data, error } = await dbClient
    .from('reservations')
    .insert([resData])
    .select();
    
  if (error) {
    console.error("Error al crear reserva en Supabase:", error);
    throw error;
  }
  return data[0];
}

async function getReservationsForUser(userId) {
  if (isDemoMode) {
    const localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    const localClasses = JSON.parse(localStorage.getItem("df_classes") || "[]");
    const localInstructors = JSON.parse(localStorage.getItem("df_instructors") || "[]");
    const localBranches = JSON.parse(localStorage.getItem("df_branches") || "[]");
    
    return localRes
      .filter(r => r.profile_id === userId)
      .map(r => {
        const rawCls = localClasses.find(c => Number(c.id) === Number(r.class_id)) || {};
        const inst = localInstructors.find(i => Number(i.id) === Number(rawCls.instructor_id)) || {};
        const branch = localBranches.find(b => Number(b.id) === Number(rawCls.branch_id)) || {};
        const cls = {
          ...rawCls,
          instructor: inst.name || 'Instructor',
          role: inst.role || 'Instructor',
          branch: branch.name || 'Sede Principal',
          branch_address: branch.address || ''
        };
        return { ...r, classes: cls };
      })
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { data, error } = await dbClient
    .from('reservations')
    .select('*, classes:classes(*, instructors:instructor_id(*), branches:branch_id(*))')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error al obtener reservas del usuario de Supabase:", error);
    throw error;
  }

  return data.map(r => {
    if (r.classes) {
      r.classes = {
        ...r.classes,
        instructor: r.classes.instructors ? r.classes.instructors.name : (r.classes.instructor || 'Instructor'),
        role: r.classes.instructors ? r.classes.instructors.role : (r.classes.role || 'Instructor'),
        branch: r.classes.branches ? r.classes.branches.name : (r.classes.branch || 'Sede Principal'),
        branch_address: r.classes.branches ? r.classes.branches.address : ''
      };
    }
    return r;
  });
}

async function getAllReservationsAdmin() {
  if (isDemoMode) {
    const localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    const localClasses = JSON.parse(localStorage.getItem("df_classes") || "[]");
    const localProfiles = JSON.parse(localStorage.getItem("df_profiles_demo") || "[]");
    const localInstructors = JSON.parse(localStorage.getItem("df_instructors") || "[]");
    const localBranches = JSON.parse(localStorage.getItem("df_branches") || "[]");
    
    return localRes.map(r => {
      const rawCls = localClasses.find(c => Number(c.id) === Number(r.class_id)) || {};
      const inst = localInstructors.find(i => Number(i.id) === Number(rawCls.instructor_id)) || {};
      const branch = localBranches.find(b => Number(b.id) === Number(rawCls.branch_id)) || {};
      const cls = {
        ...rawCls,
        instructor: inst.name || 'Instructor',
        role: inst.role || 'Instructor',
        branch: branch.name || 'Sede Principal',
        branch_address: branch.address || ''
      };
      const prof = localProfiles.find(p => p.id === r.profile_id) || { name: "Cliente Demo", dni: "99887766" };
      return { ...r, classes: cls, profiles: prof };
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { data, error } = await dbClient
    .from('reservations')
    .select('*, classes:classes(*, instructors:instructor_id(*), branches:branch_id(*)), profiles:profiles(*)')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error al obtener todas las reservas en Supabase:", error);
    throw error;
  }

  return data.map(r => {
    if (r.classes) {
      r.classes = {
        ...r.classes,
        instructor: r.classes.instructors ? r.classes.instructors.name : (r.classes.instructor || 'Instructor'),
        role: r.classes.instructors ? r.classes.instructors.role : (r.classes.role || 'Instructor'),
        branch: r.classes.branches ? r.classes.branches.name : (r.classes.branch || 'Sede Principal'),
        branch_address: r.classes.branches ? r.classes.branches.address : ''
      };
    }
    return r;
  });
}

// ── APIS DE ELIMINACIÓN Y CANCELACIÓN ──

async function cancelReservation(resId) {
  if (isDemoMode) {
    let localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    localRes = localRes.filter(r => r.id !== resId);
    localStorage.setItem("df_reservations", JSON.stringify(localRes));
    return true;
  }

  const { error } = await dbClient
    .from('reservations')
    .delete()
    .eq('id', resId);

  if (error) {
    console.error("Error al cancelar reserva en Supabase:", error);
    throw error;
  }
  return true;
}

async function deleteClass(classId) {
  if (isDemoMode) {
    let localClasses = JSON.parse(localStorage.getItem("df_classes") || "[]");
    localClasses = localClasses.filter(c => Number(c.id) !== Number(classId));
    localStorage.setItem("df_classes", JSON.stringify(localClasses));

    // También eliminamos las reservas asociadas a esta clase
    let localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    localRes = localRes.filter(r => Number(r.class_id) !== Number(classId));
    localStorage.setItem("df_reservations", JSON.stringify(localRes));

    return true;
  }

  const { error } = await dbClient
    .from('classes')
    .delete()
    .eq('id', classId);

  if (error) {
    console.error("Error al eliminar clase en Supabase:", error);
    throw error;
  }
  return true;
}

// ── GESTIÓN DE CRÉDITOS ──────────────────────────────────────

async function getCredits(userId) {
  if (isDemoMode) {
    const user = JSON.parse(localStorage.getItem('df_current_user') || 'null');
    return Number(user?.credits || 0);
  }
  const { data, error } = await dbClient
    .from('profiles').select('credits').eq('id', userId).single();
  if (error) throw error;
  return Number(data.credits || 0);
}

async function addCredits(userId, amount) {
  const amt = Number(amount);
  if (isDemoMode) {
    const user = JSON.parse(localStorage.getItem('df_current_user') || 'null');
    if (!user) throw new Error('Sesión no encontrada.');
    user.credits = Math.round((Number(user.credits || 0) + amt) * 100) / 100;
    localStorage.setItem('df_current_user', JSON.stringify(user));
    return user.credits;
  }
  const current = await getCredits(userId);
  const newBalance = Math.round((current + amt) * 100) / 100;
  const { error } = await dbClient
    .from('profiles').update({ credits: newBalance }).eq('id', userId);
  if (error) throw error;
  return newBalance;
}

async function deductCredits(userId, amount) {
  const amt = Number(amount);
  if (isDemoMode) {
    const user = JSON.parse(localStorage.getItem('df_current_user') || 'null');
    if (!user) throw new Error('Sesión no encontrada.');
    const current = Number(user.credits || 0);
    if (current < amt) throw new Error('Créditos insuficientes.');
    user.credits = Math.round((current - amt) * 100) / 100;
    localStorage.setItem('df_current_user', JSON.stringify(user));
    return user.credits;
  }
  const current = await getCredits(userId);
  if (current < amt) throw new Error('Créditos insuficientes.');
  const newBalance = Math.round((current - amt) * 100) / 100;
  const { error } = await dbClient
    .from('profiles').update({ credits: newBalance }).eq('id', userId);
  if (error) throw error;
  return newBalance;
}


async function updateProfile(userId, updates) {
  // Solo permitir campos no sensibles
  const safeUpdates = {};
  if (updates.name !== undefined) safeUpdates.name = String(updates.name).trim();

  if (isDemoMode) {
    const user = JSON.parse(localStorage.getItem('df_current_user') || 'null');
    if (!user) throw new Error('No se encontró sesión activa.');
    const updated = { ...user, ...safeUpdates };
    localStorage.setItem('df_current_user', JSON.stringify(updated));
    return updated;
  }

  const { data, error } = await dbClient
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar perfil en Supabase:', error);
    throw error;
  }
  return data;
}

// Inicializar en el script load
initDB();

// Al final de js/supabase-db.js para que auth.js y los demás puedan leerlo:
window.dbClient = dbClient;
window.isDemoMode = isDemoMode;
window.getInstructors = getInstructors;
window.createInstructor = createInstructor;
window.updateInstructor = updateInstructor;
window.deleteInstructor = deleteInstructor;
window.getBranches = getBranches;
window.createBranch = createBranch;
window.updateBranch = updateBranch;
window.deleteBranch = deleteBranch;
window.getClasses = getClasses;
window.createClass = createClass;
window.getOccupiedSpots = getOccupiedSpots;
window.createReservation = createReservation;
window.getReservationsForUser = getReservationsForUser;
window.getAllReservationsAdmin = getAllReservationsAdmin;
window.cancelReservation = cancelReservation;
window.deleteClass = deleteClass;
window.getCredits = getCredits;
window.addCredits = addCredits;
window.deductCredits = deductCredits;
window.updateProfile = updateProfile;

