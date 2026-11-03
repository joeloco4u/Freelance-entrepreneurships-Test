# 🚀 Marketplace de Emprendimientos - Fullstack

Una plataforma robusta diseñada para que emprendedores puedan gestionar sus catálogos de productos y los clientes puedan descubrir ofertas locales. El sistema incluye gestión de inventario, autenticación por roles y almacenamiento de imágenes en la nube.

---

## 🛠️ Tecnologías Principales

**Frontend:**
- **React + TypeScript**: Interfaz de usuario reactiva y tipado fuerte.
- **Ant Design**: Componentes de UI profesionales y sistema de formularios.
- **Lucide React**: Biblioteca de iconos moderna.
- **Tailwind CSS**: Estilizado moderno, responsivo y basado en utilidades.

**Backend:**
- **Node.js + Express**: Servidor de API REST eficiente.
- **Supabase (PostgreSQL + Auth + Storage)**: Base de datos relacional, manejo de sesiones de usuario y almacenamiento de archivos binarios.
- **Multer**: Middleware para el procesamiento de datos `multipart/form-data` y carga de archivos.

---

## ✨ Funcionalidades Implementadas

### 📦 Gestión de Productos
- **CRUD Completo**: Creación, lectura, actualización y eliminación de productos.
- **Manejo de Imágenes**: Subida de archivos físicos desde el cliente hacia **Supabase Storage** mediante un service especializado, con generación de URLs públicas automáticas.
- **Control de Inventario**: Gestión de stock y validación de tipos de datos en tiempo real.
- **Estados Dinámicos**: Control de visibilidad de productos (Activo/Inactivo) para el catálogo público.

### 🔐 Seguridad y Acceso
- **Autenticación JWT**: Integración con Supabase Auth para la protección de rutas.
- **Control por Roles (RBAC)**: Diferenciación de permisos entre Administradores y Proveedores.
- **Validación de Propiedad**: Los proveedores solo tienen permisos de escritura sobre productos vinculados a su propio `entrepreneurship_id`.

---

## 📂 Estructura del Proyecto

```text
├── backend/
│   ├── controllers/    # Lógica de controladores (Products, Auth, etc.)
│   ├── middlewares/    # Multer (upload), validación de JWT, roles
│   ├── services/       # Comunicación con Supabase Admin y Storage
│   └── routes/         # Definición de endpoints de la API
├── frontend/
│   ├── src/
│   │   ├── components/ # Componentes compartidos (Modales, ImageUpload)
│   │   ├── services/   # Cliente API (Axios configurado con FormData)
│   │   ├── hooks/      # Lógica de estado y llamadas a la API
│   │   └── pages/      # Vistas principales del dashboard y catálogo
```

---

## 🚀 Instalación y Configuración

Sigue estos pasos para levantar el entorno de desarrollo local.

### 1. Requisitos Previos

- Node.js (v18 o superior)
- pnpm
- Una cuenta en [Supabase](https://supabase.com) con un proyecto activo

### 2. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/tu-repositorio.git
cd tu-repositorio
```

### 3. Configuración del Backend

Entra en la carpeta del servidor e instala las dependencias:

```bash
cd backend
pnpm install
```

La referencia única de variables de entorno es **`backend/.env.example`**. Copia ese archivo a `backend/.env` y completa los valores reales. El backend resuelve `backend/.env` desde su propio módulo de configuración (`backend/src/config/env.ts`), así que funciona tanto con `tsx src/index.ts` como con `node dist/index.js`, independientemente del directorio desde el que se ejecute. También se puede apuntar a otro archivo con `DOTENV_CONFIG_PATH`; las variables inyectadas por la plataforma siempre tienen prioridad sobre el archivo.

| Variable | Obligatoria | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `SUPABASE_URL` | Sí | — | URL del proyecto Supabase (debe ser `http` o `https`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | — | Service role key de Supabase (solo backend). |
| `PORT` | No | `3000` | Puerto del backend. Debe coincidir con el `VITE_API_URL` del frontend y con el proxy de Vite en `frontend/vite.config.ts`. |
| `APP_URL` | Solo en producción | Primer origen de `CORS_ORIGIN` | URL pública del frontend; se usa para los enlaces de recuperación de contraseña e invitaciones. En producción es obligatoria. |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Orígenes permitidos por CORS, separados por comas. |
| `ALLOWED_IPS` | No | vacío (sin filtro) | Lista de IPs permitidas, separadas por comas. Vacía desactiva la allowlist; con contenido que no se pueda interpretar, el arranque falla. |
| `RESEND_API_KEY` | No | — | API key de Resend. Sin ella, el envío de correos no está disponible. |
| `EMAIL_FROM` | No | — | Remitente verificado en Resend. |
| `SLACK_WEBHOOK_URL_IT` | No | — | Webhook del canal de IT para notificaciones de solicitudes. |
| `SLACK_TOKEN_SHEET_URL` | No | — | URL de la hoja que contiene el bot token de Slack. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | — | Cuenta de servicio de Google Sheets. |
| `GOOGLE_PRIVATE_KEY` | No | — | Clave privada de la cuenta de servicio (con los `\n` escapados en una sola línea). |

No subas `.env` al repositorio: `.gitignore` ignora `.env*` salvo los dos archivos `.env.example`.

#### Contrato de arranque

- Que falte `backend/.env` **no es fatal**: el proceso continúa con las variables presentes en el entorno (en desarrollo se muestra un aviso con la ruta esperada).
- Si faltan o son inválidas las variables obligatorias de Supabase, el proceso **falla al arrancar** con un error que indica la ruta resuelta de `backend/.env` y todas las claves faltantes o inválidas.
- El mensaje de error nunca imprime valores de secretos, solo nombres de claves.
- `RESEND_API_KEY` y `EMAIL_FROM` son opcionales: el servidor arranca normalmente sin ellas y solo el envío de correos falla (HTTP 503, «El envío de correos no está configurado.») cuando se intenta usar esa función.

### 4. Configuración del Frontend

Entra en la carpeta del cliente e instala las dependencias:

```bash
cd ../frontend
pnpm install
```

Copia **`frontend/.env.example`** a `frontend/.env` y completa los valores reales:

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | **Origen** del backend, sin `/api` (el cliente lo añade solo). Por defecto `http://localhost:3000`; debe apuntar al `PORT` del backend y coincidir con el proxy de Vite. En producción debe ser una URL absoluta (`https://...`). |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase. |

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son obligatorias: si falta alguna, la aplicación falla al arrancar indicando la clave faltante y remitiendo a `frontend/.env.example`.

Todas las rutas del backend viven bajo el prefijo `/api` (ver `backend/src/index.ts`) y el cliente lo añade automáticamente sobre `VITE_API_URL`. Por eso un `/api` ausente o duplicado en esa variable es una causa habitual de que las peticiones devuelvan 404 «Ruta no encontrada» y el catálogo aparezca vacío; escribe solo el origen (`http://localhost:3000`). Si la carga del catálogo falla, la interfaz muestra un estado de error con un botón «Reintentar» en lugar del mensaje de «sin resultados».

### 5. Configuración de Supabase Storage

Para que la subida de imágenes funcione correctamente:

1. Ve al panel de **Storage** en tu dashboard de Supabase.
2. Crea un nuevo bucket llamado `product-images`.
3. Configura el bucket como **Public**.
4. Añade una **Policy (RLS)** para permitir `INSERT` y `UPDATE` a usuarios autenticados.

### 6. Ejecución

Inicia ambos servicios simultáneamente (en terminales separadas):

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

