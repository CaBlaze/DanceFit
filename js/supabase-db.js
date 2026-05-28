// ── DANCEFIT STUDIO - CAPA DE ADAPTADOR DE BASE DE DATOS (SUPABASE / LOCAL DEMO) ──

let dbClient = null;
let isDemoMode = true;

// Datos por defecto para el Modo Demo Local
const DEFAULT_CLASSES = [
  { id: 1, name: "Reggaetón Energy", level: "ADVANCED", level_color: "#9b5de5", time: "19:30", instructor: "Elena Márquez", role: "Instructora Principal", theme: "Neón Night", style: "Reggaetón", price: 25, duration: "90 min", emoji: "🔥" },
  { id: 2, name: "Salsa Foundation", level: "BEGINNER", level_color: "#00b4d8", time: "18:00", instructor: "Carlos Rivera", role: "Salsa Pro Coach", theme: "Classic Casino", style: "Salsa", price: 25, duration: "60 min", emoji: "💃" },
  { id: 3, name: "D-Fit Funcional", level: "OPEN LEVEL", level_color: "#2dc653", time: "07:00", instructor: "Sofia Chen", role: "Fitness Specialist", theme: "Power Beat", style: "Funcional", price: 25, duration: "60 min", emoji: "⚡" },
  { id: 4, name: "Master Bachata Sensual", level: "SPECIAL WORKSHOP", level_color: "#f4a261", time: "21:00", instructor: "Marco & Estela", role: "International Artists", theme: "Midnight Romance", style: "Bachata", price: 50, duration: "120 min", emoji: "🌹" },
  { id: 5, name: "Urban Core", level: "OPEN LEVEL", level_color: "#2dc653", time: "17:00", instructor: "Leo Cruz", role: "Urban Specialist", theme: "Street Vibe", style: "Urbano", price: 25, duration: "90 min", emoji: "🎤" },
];

const DEFAULT_RESERVATIONS = [
  { id: "df-res-demo-1", profile_id: "client-demo-id", class_id: 1, spot_number: 5, phone_yape: "987654321", code_yape: "123456", status: "confirmed", created_at: new Date().toISOString() },
  { id: "df-res-demo-2", profile_id: "client-demo-id", class_id: 1, spot_number: 12, phone_yape: "912345678", code_yape: "654321", status: "confirmed", created_at: new Date().toISOString() },
  { id: "df-res-demo-3", profile_id: "other-demo-id", class_id: 2, spot_number: 19, phone_yape: "955443322", code_yape: "987123", status: "confirmed", created_at: new Date().toISOString() },
];

// Inicializar base de datos
function initDB() {
  const isDefaultUrl = SUPABASE_URL.includes("tu-proyecto") || !SUPABASE_URL.startsWith("http");
  const isDefaultKey = SUPABASE_ANON_KEY.includes("tu-anon-key");

  if (isDefaultUrl || isDefaultKey || typeof supabase === 'undefined') {
    console.warn("⚠️ DanceFit Studio: Usando Modo Demo Local (Base de datos local en localStorage). Para conectar con Supabase real, configura js/config.js");
    isDemoMode = true;
    
    // Rellenar localStorage si está vacío
    if (!localStorage.getItem("df_classes")) {
      localStorage.setItem("df_classes", JSON.stringify(DEFAULT_CLASSES));
    }
    if (!localStorage.getItem("df_reservations")) {
      localStorage.setItem("df_reservations", JSON.stringify(DEFAULT_RESERVATIONS));
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

// ── APIS DE CLASES ──

async function getClasses() {
  if (isDemoMode) {
    return JSON.parse(localStorage.getItem("df_classes") || "[]");
  }
  
  const { data, error } = await dbClient
    .from('classes')
    .select('*')
    .order('time', { ascending: true });
    
  if (error) {
    console.error("Error al obtener clases de Supabase:", error);
    throw error;
  }
  return data;
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
    
    // Cruzar reservas con clases locales
    return localRes
      .filter(r => r.profile_id === userId)
      .map(r => {
        const cls = localClasses.find(c => Number(c.id) === Number(r.class_id)) || {};
        return { ...r, classes: cls };
      })
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { data, error } = await dbClient
    .from('reservations')
    .select('*, classes:classes(*)')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error al obtener reservas del usuario de Supabase:", error);
    throw error;
  }
  return data;
}

async function getAllReservationsAdmin() {
  if (isDemoMode) {
    const localRes = JSON.parse(localStorage.getItem("df_reservations") || "[]");
    const localClasses = JSON.parse(localStorage.getItem("df_classes") || "[]");
    const localProfiles = JSON.parse(localStorage.getItem("df_profiles_demo") || "[]");
    
    return localRes.map(r => {
      const cls = localClasses.find(c => Number(c.id) === Number(r.class_id)) || {};
      const prof = localProfiles.find(p => p.id === r.profile_id) || { name: "Cliente Demo", dni: "99887766" };
      return { ...r, classes: cls, profiles: prof };
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { data, error } = await dbClient
    .from('reservations')
    .select('*, classes:classes(*), profiles:profiles(*)')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error al obtener todas las reservas en Supabase:", error);
    throw error;
  }
  return data;
}

// Inicializar en el script load
initDB();
