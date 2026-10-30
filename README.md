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

Crea un archivo `.env` en la raíz de `backend/`:

```env
PORT=3000
SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SLACK_TOKEN_SHEET_URL=url_de_la_hoja_con_bot_token
SLACK_WEBHOOK_URL_IT=webhook_del_canal
GOOGLE_SERVICE_ACCOUNT_EMAIL=CORREO_DEL_SERVICIO_DE_GOOGLE_SHEETS
GOOGLE_PRIVATE_KEY=PRIVATE_KEY
```

### 4. Configuración del Frontend

Entra en la carpeta del cliente e instala las dependencias:

```bash
cd ../frontend
pnpm install
```

Crea un archivo `.env` en la raíz de `frontend/`:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

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

