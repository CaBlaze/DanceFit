# 💃 DanceFit Studio - Sistema Profesional de Reservas de Baile Urbano

DanceFit Studio es una aplicación web interactiva premium de una sola página (SPA) diseñada para gestionar la reserva de clases de baile urbano en tiempo real. Este proyecto ha sido estructurado de forma modular y profesional a partir de un prototipo monolítico, implementando persistencia de datos relacional y autenticación en la nube mediante **Supabase**.

---

## 🚀 Características Principales

*   **Autenticación Real (Supabase Auth):** Registro de clientes e inicio de sesión seguro con correo y contraseña.
*   **Roles Diferenciados:**
    *   **Cliente:** Explora clases con filtros dinámicos, reserva spots interactivos en la pista, realiza el pago seguro simulado mediante Yape (con código de validación) y visualiza su historial de reservas con códigos QR oficiales autogenerados.
    *   **Administrador:** Acceso exclusivo a un Dashboard de control de negocio. Permite registrar y publicar nuevas clases en tiempo real, auditar las reservas de Yape de todos los clientes y visualizar métricas críticas financieras del estudio (ingresos recaudados, clase más popular, y tasa de ocupación promedio).
*   **Spots 100% Dinámicos:** Los asientos de la sala de baile se bloquean consultando la base de datos en tiempo real para evitar reservas duplicadas del mismo spot.
*   **Modo Demo Local Inteligente:** Si no has configurado tus credenciales de Supabase, la aplicación activa automáticamente un **Modo Demo Local** usando `localStorage`. ¡La aplicación funciona y se puede probar inmediatamente al abrir el `index.html`!
*   **Diseño Premium y Oscuro Adaptativo:** Interfaz estilizada tipo Glassmorphism con transiciones fluidas e interruptor dinámico de Modo Claro/Oscuro.

---

## 📁 Estructura del Repositorio

La organización del proyecto cumple con las mejores prácticas para repositorios de desarrollo web y su publicación directa en hosting estáticos (como GitHub Pages o Vercel):

```text
dancefit-studio/
├── index.html            # Interfaz de usuario unificada (Single Page Application)
├── css/
│   └── styles.css        # Hoja de estilos premium (Glassmorphism, Modo Oscuro y Responsive)
├── js/
│   ├── config.js         # Credenciales activas de Supabase (Incluido en .gitignore)
│   ├── config.example.js # Plantilla guía de credenciales de Supabase
│   ├── supabase-db.js    # Inicializador de base de datos y adaptador de operaciones asíncronas
│   ├── auth.js           # Gestor de sesiones, login, registro y roles de usuario
│   ├── client.js         # Lógica interactiva para la cartelera de clases y reservas del Cliente
│   ├── admin.js          # Control de creación de clases, métricas de negocio y tabla de auditoría
│   └── app.js            # Enrutador principal de vistas y coordinador del estado
├── sql/
│   └── schema.sql        # Script SQL para estructurar la base de datos en Supabase
├── .gitignore            # Archivos excluidos de control de versiones (protege claves secretas)
└── README.md             # Guía del proyecto e instrucciones de instalación (Este archivo)
```

---

## 🛠️ Configuración de la Base de Datos (Supabase)

Si deseas conectar la aplicación a tu propia base de datos en la nube de Supabase, sigue estos sencillos pasos:

### 1. Crear el esquema de base de datos
1.  Ve al panel de control de [Supabase](https://supabase.com) y crea un nuevo proyecto.
2.  Una vez creado tu proyecto, dirígete a la sección de **SQL Editor** en el menú izquierdo.
3.  Crea una nueva consulta haciendo clic en **New Query**.
4.  Abre el archivo [sql/schema.sql](file:///C:/Users/andy2/.gemini/antigravity/scratch/dancefit-studio/sql/schema.sql) de este proyecto, copia todo su contenido y pégalo en el editor SQL de Supabase.
5.  Presiona el botón **Run**. Este script creará automáticamente las tablas `profiles`, `classes`, `reservations`, habilitará las políticas de seguridad RLS e instalará el disparador automático (*trigger*) para que cada usuario registrado cree su perfil de forma automática.

### 2. Configurar las credenciales en la aplicación
1.  En el panel de tu proyecto en Supabase, ve a **Project Settings** -> **API**.
2.  Copia la **Project URL** y la clave **anon (public)**.
3.  Abre el archivo [js/config.js](file:///C:/Users/andy2/.gemini/antigravity/scratch/dancefit-studio/js/config.js) en tu editor y pega tus valores:
    ```javascript
    const SUPABASE_URL = "PEGAR_AQUÍ_TU_PROJECT_URL";
    const SUPABASE_ANON_KEY = "PEGAR_AQUÍ_TU_ANON_KEY";
    ```
4.  Guarda los cambios. ¡La aplicación ahora se conectará automáticamente a tu nube de Supabase en tiempo real!

---

## 🧑‍💻 Credenciales de Prueba Rápida

Si utilizas el **Modo Demo Local** (o si ejecutas el script SQL inicial en Supabase), puedes iniciar sesión de inmediato utilizando estas cuentas de prueba:

*   **Cuenta de Administrador:**
    *   **Correo:** `admin@dancefit.com`
    *   **Contraseña:** `admin123`
*   **Cuenta de Cliente:**
    *   **Correo:** `cliente@dancefit.com`
    *   **Contraseña:** `cliente123`

*(Nota: También puedes registrar tus propios clientes haciendo clic en "Regístrate aquí" en la pantalla de inicio de sesión de la aplicación).*

---

## 🐙 ¿Cómo subir tu proyecto a un repositorio de GitHub?

Dado que hemos estructurado las carpetas perfectamente, puedes crear un repositorio en GitHub y empujar tu código ejecutando estos comandos en la terminal (Git Bash, PowerShell o CMD) dentro del directorio `dancefit-studio`:

1.  **Inicializar el repositorio local:**
    ```bash
    git init
    ```
2.  **Agregar todos los archivos al commit inicial:**
    *(El archivo `.gitignore` excluirá automáticamente `js/config.js` para proteger tus claves).*
    ```bash
    git add .
    ```
3.  **Hacer tu primer commit:**
    ```bash
    git commit -m "commit inicial: DanceFit Studio con Supabase modular y responsivo"
    ```
4.  **Enlazar a tu repositorio remoto de GitHub:**
    *(Crea un repositorio vacío en tu cuenta de GitHub, copia la URL y reemplázala en el siguiente comando):*
    ```bash
    git branch -M main
    git remote add origin https://github.com/tu-usuario/dancefit-studio.git
    ```
5.  **Subir tus cambios:**
    ```bash
    git push -u origin main
    ```

---

## 🌐 ¿Cómo desplegar la aplicación en Producción?

Al ser una aplicación web estática pura (HTML, CSS y JS sin compilación), es extremadamente fácil de alojar de forma gratuita en la nube. Hemos agregado configuraciones avanzadas de producción para que puedas elegir cualquiera de estos tres métodos populares:

### Opción A: Despliegue Express en Vercel (Recomendado ⚡)
Hemos configurado un archivo [vercel.json](file:///C:/Users/andy2/.gemini/antigravity/scratch/dancefit-studio/vercel.json) listo para producción, que configura urls limpias y cabeceras CSP de seguridad robustas para evitar ataques XSS y asegurar que solo cargue recursos desde tu base de datos de Supabase.

1.  Crea una cuenta gratuita en [Vercel](https://vercel.com).
2.  Instala la herramienta de consola de Vercel (opcional) o simplemente conecta tu cuenta de GitHub a Vercel.
3.  Selecciona tu repositorio `dancefit-studio` e impórtalo en Vercel.
4.  ¡Haz clic en **Deploy**! Tu sitio estará en línea en menos de 10 segundos con un dominio gratuito `.vercel.app`.

### Opción B: Despliegue en Netlify 🌐
También hemos creado un archivo de configuración [netlify.toml](file:///C:/Users/andy2/.gemini/antigravity/scratch/dancefit-studio/netlify.toml) para que el despliegue en Netlify configure adecuadamente las directivas de seguridad para el uso del cliente Supabase CDN.

1.  Crea una cuenta gratuita en [Netlify](https://www.netlify.com).
2.  Importa tu repositorio de GitHub directamente desde la UI de Netlify.
3.  Deja los campos de comando de compilación y directorio de salida en **blanco** (ya que es HTML puro).
4.  Haz clic en **Deploy site**.

### Opción C: Despliegue en GitHub Pages (Totalmente Gratis 🐙)
Puedes utilizar el servicio integrado de GitHub para hospedar tu sitio:

1.  Entra a tu repositorio en GitHub.
2.  Ve a la pestaña **Settings** (Configuración) -> **Pages** (Páginas) en el menú de la izquierda.
3.  En la sección *Build and deployment*, bajo **Source**, selecciona *Deploy from a branch*.
4.  Bajo **Branch**, selecciona la rama `main` y la carpeta `/ (root)`.
5.  Haz clic en **Save** (Guardar).
6.  En un par de minutos, GitHub te dará un link público como `https://tu-usuario.github.io/dancefit-studio/`.

---

¡Felicidades! Tu proyecto modular está completamente estructurado, blindado para producción con políticas CSP, persistido en una base de datos relacional y listo para ser compartido y desplegado con el mundo. 🕺🔥

