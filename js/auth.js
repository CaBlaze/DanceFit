// ── DANCEFIT STUDIO - CONTROLADOR DE AUTENTICACIÓN Y SESIÓN (SUPABASE / DEMO) ──

const DEMO_ADMIN = { id: "admin-demo-id", email: "admin@dancefit.com", name: "Administrador DanceFit", dni: "00000000", role: "admin" };
const DEMO_CLIENT = { id: "client-demo-id", email: "cliente@dancefit.com", name: "Martina García", dni: "76543210", role: "client" };

// Asegurar que existan perfiles de demo locales
if (isDemoMode && !localStorage.getItem("df_profiles_demo")) {
  localStorage.setItem("df_profiles_demo", JSON.stringify([DEMO_ADMIN, DEMO_CLIENT]));
}

// Obtener usuario activo
function getSessionUser() {
  const session = localStorage.getItem("df_current_user");
  return session ? JSON.parse(session) : null;
}

// Iniciar sesión
async function loginUser(email, password) {
  if (isDemoMode) {
    const profiles = JSON.parse(localStorage.getItem("df_profiles_demo") || "[]");
    // Simulamos que la contraseña correcta es "123456" o igual al rol + "123"
    const user = profiles.find(p => p.email === email.trim().toLowerCase());
    
    if (!user) {
      throw new Error("El correo no se encuentra registrado en el sistema.");
    }
    
    const expectedPass = user.role === 'admin' ? 'admin123' : 'cliente123';
    if (password !== expectedPass && password !== '123456') {
      throw new Error("Contraseña incorrecta. (Tip: usa 'admin123' para admin y 'cliente123' para cliente)");
    }
    
    localStorage.setItem("df_current_user", JSON.stringify(user));
    return user;
  }

  // Flujo real en Supabase
  const { data, error } = await dbClient.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) throw error;

  // Consultar perfil para obtener el DNI y el Rol
  const { data: profile, error: profError } = await dbClient
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profError) {
    console.error("Error al obtener perfil, asumiendo rol cliente por defecto:", profError);
    const defaultProfile = { id: data.user.id, email: data.user.email, name: "Usuario Registrado", dni: "00000000", role: "client" };
    localStorage.setItem("df_current_user", JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  const sessionUser = {
    id: profile.id,
    email: data.user.email,
    name: profile.name,
    dni: profile.dni,
    role: profile.role
  };
  
  localStorage.setItem("df_current_user", JSON.stringify(sessionUser));
  return sessionUser;
}

// Registrar usuario
async function registerUser(email, password, name, dni) {
  if (isDemoMode) {
    const profiles = JSON.parse(localStorage.getItem("df_profiles_demo") || "[]");
    
    if (profiles.some(p => p.email === email.trim().toLowerCase())) {
      throw new Error("Este correo electrónico ya está registrado.");
    }
    if (profiles.some(p => p.dni === dni.trim())) {
      throw new Error("Este DNI ya está registrado por otro usuario.");
    }

    const newUser = {
      id: "demo-user-" + Math.floor(1000 + Math.random() * 9000),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      dni: dni.trim(),
      role: "client" // Solo se pueden registrar clientes desde la UI pública
    };

    profiles.push(newUser);
    localStorage.setItem("df_profiles_demo", JSON.stringify(profiles));
    localStorage.setItem("df_current_user", JSON.stringify(newUser));
    return newUser;
  }

  // Flujo real en Supabase
  const { data, error } = await dbClient.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        name: name.trim(),
        dni: dni.trim()
      }
    }
  });

  if (error) throw error;

  const newUserProfile = {
    id: data.user.id,
    email: email.trim(),
    name: name.trim(),
    dni: dni.trim(),
    role: "client"
  };

  // Guardamos sesión activa
  localStorage.setItem("df_current_user", JSON.stringify(newUserProfile));
  return newUserProfile;
}

// Cerrar sesión
async function logoutUser() {
  localStorage.removeItem("df_current_user");
  if (!isDemoMode && dbClient) {
    await dbClient.auth.signOut();
  }
}
