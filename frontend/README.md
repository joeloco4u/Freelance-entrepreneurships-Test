# Freelance-entrepreneurships
Proyecto de Digitalización de Emprendimientos para Freelance Latin America

## Sede local (onboarding)

La sede no se detecta por IP ni por parámetro de URL: es una preferencia local del navegador.

- En la primera visita la aplicación muestra un modal **no descartable** para elegir entre Valle Frío y Grano de Oro.
- La elección se guarda en `localStorage` bajo la clave `hq_location` con los valores `VF` / `GO`, y se reutiliza en ese equipo.
- Cambiar de sede desde la cabecera del catálogo pide confirmación y **vacía el carrito**.
- Para probar el flujo de primera visita, borra `hq_location` en DevTools (Application -> Local Storage) o usa una ventana de incógnito nueva.

Limitación conocida: el valor es por navegador y gana el último que escribe entre pestañas; solo se vuelve a leer al recargar.

## Desarrollo local sin backend (modo mock)

El frontend incluye un modo mock para desarrollar y revisar la interfaz **sin un proyecto de Supabase y sin el backend**. Se activa solo en desarrollo, viene encendido por defecto y no requiere ningún archivo `.env`.

La bandera se define en `frontend/src/config/mockMode.ts`:

```ts
export const MOCK_MODE =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== "false";
```

En resumen:

| Situación | `MOCK_MODE` |
|---|---|
| `pnpm dev:front` sin variables | Activado |
| `VITE_MOCK_MODE=true` | Activado |
| `VITE_MOCK_MODE=false` | Desactivado (usa API y Supabase reales) |
| Build de producción (`vite build`) | Siempre desactivado, porque `import.meta.env.DEV` es `false` |

### Cómo ejecutarlo

Desde la raíz del repositorio:

```bash
pnpm dev:front
```

`pnpm dev` también funciona, pero el backend no es necesario en modo mock. No hace falta crear `frontend/.env`: cuando `MOCK_MODE` está activo, `frontend/src/config/supabaseClient.ts` usa la URL `https://mock.invalid` y una clave de relleno no secreta. El error `Faltan las variables de entorno de Supabase en el Frontend` solo se lanza cuando el modo mock está desactivado.

### Cómo desactivarlo

Define la variable en `frontend/.env` (la gestiona el desarrollador, no se versiona):

```env
VITE_MOCK_MODE=false
```

Con ese valor el frontend vuelve a usar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL` como en el flujo normal, por lo que necesitarás el backend y un proyecto de Supabase reales.

### Qué se simula

| Módulo | Archivo | Comportamiento en modo mock |
|---|---|---|
| `useAuth` | `frontend/src/components/features/login/hooks/useAuth.ts` | Usuario fijo con roles `["ADMIN", "IT"]`; el logout es local y redirige a `/login`. |
| `useDashboard` | `frontend/src/hooks/useDashboard.ts` | Usuario del sidebar predefinido (`Mock Admin`) y roles ADMIN + IT. |
| `useCatalog` | `frontend/src/hooks/useCatalog.ts` | Productos y categorías desde los fixtures, sin llamadas HTTP. |
| `useProducts` | `frontend/src/hooks/useProducts.ts` | Productos de ejemplo y alta/edición/borrado en memoria, con los mismos toasts que el flujo real. |
| `useAdminData` | `frontend/src/hooks/useAdminData.ts` | Lista de ventas vacía; `processPayroll` responde con «Nómina simulada (mock mode)». |
| `useITData` | `frontend/src/hooks/useITData.ts` | Métricas en cero (`totalUsers`, `pendingRequests`, `activeSessions`). |
| `useSoftwareUpdates` | `frontend/src/hooks/useSoftwareUpdates.ts` | Tres novedades de ejemplo. |
| `CatalogHeader` | `frontend/src/components/features/catalog/CatalogHeader.tsx` | El encabezado arranca en estado «sesión iniciada». |
| `ProductFormModal` | `.../my-entrepreneurships/EntrepreneurShipsMenu/products/ProductFormModal.tsx` | Los desplegables de categorías y productos simples se llenan con los fixtures. |

### Datos de ejemplo

Todos los fixtures viven en `frontend/src/config/mockData.ts`:

- **6 productos** de catálogo y de emprendimiento, incluidos `"4 Torontos"` y `"Bolitas de coco"`.
- **3 categorías**: Comida, Bebidas y Postres.
- **3 novedades de software** (`MOCK_SOFTWARE_UPDATES`).
- **1 usuario mock** (`mock.admin@example.com`) con roles `["ADMIN", "IT"]`.

### Qué NO se simula

Estas acciones siguen llamando a la API real. Sin backend verás toasts de error (o listas vacías) y no habrá persistencia:

- **Solicitudes de registro** (`frontend/src/hooks/useSignupRequests.ts`).
- **Usuarios del sistema** (`frontend/src/hooks/useSystemUsers.ts`).
- **Acciones de detalle de emprendedores y consumidores** en el panel admin. `useAdminData` devuelve una lista vacía, así que normalmente no hay filas sobre las que actuar; si existieran, el botón de reembolso llama al endpoint real (`refundSale`) y fallará sin backend. `processPayroll`, en cambio, sí está simulado.
- **Configuración**: configuración general/hojas (`frontend/src/components/features/settings/hooks/useSettings.ts`), datos de pago (`frontend/src/hooks/usePaymentDataSettings.ts`) y cambio de contraseña (`PasswordChangeForm.tsx`).
- **Mis emprendimientos** (`frontend/src/hooks/useEntrepreneurship.ts`).
- **Detalle del emprendimiento y sus ventas** (`frontend/src/hooks/useEntrepreneurshipDetail.ts`, `frontend/src/hooks/useSales.ts`).
- **Mis compras** (`frontend/src/hooks/useCustomerSales.ts`).
- **Checkout**: `getConsumersList` y `createSale` en `frontend/src/hooks/useCheckout.ts`.
- **Envíos de login, registro y recuperación de contraseña** (`useLogin.ts`, `useRegister.ts`, `useForgotPassword.ts`).

### Rutas sin backend

Con el usuario mock (ADMIN + IT) estas rutas no emiten peticiones HTTP:

- `/` (catálogo).
- `/dashboard` (índice, `GeneralDashboard`).

Las demás secciones del dashboard (`/dashboard/requests`, `/dashboard/users`, `/dashboard/entrepreneurships`, `/dashboard/entrepreneurs`, `/dashboard/consumers`, `/dashboard/settings`, compras, detalle de emprendimiento, etc.) siguen usando la API y fallarán sin backend.

### Cómo agregar fixtures

1. Añade los datos a `frontend/src/config/mockData.ts` y expórtalos con el tipo correspondiente.
2. Siembra el estado inicial con un inicializador de `useState`, por ejemplo:
   ```ts
   const [items, setItems] = useState(() =>
     MOCK_MODE ? MOCK_ITEMS : [],
   );
   ```
3. Dentro de `useEffect` y de las acciones asíncronas, corta temprano con `if (MOCK_MODE) return;` y aplica los cambios de forma local (estado + toasts).
4. Nunca coloques un `return` condicional antes de una llamada a un hook: las reglas de los hooks siguen aplicando. El patrón correcto es declarar todos los hooks y hacer el corte dentro de efectos/callbacks.

### Limitaciones

- Las escrituras mock son **solo en memoria**: se pierden al desmontar el componente o recargar la página.
- Los productos y emprendimientos creados en modo mock **no se persisten**.
- Las imágenes elegidas en el formulario usan `URL.createObjectURL` local (solo desarrollo); no se suben a Supabase Storage.
- Tras un logout mock, recargar la página vuelve a sembrar el usuario de ejemplo.
- El modo mock no sustituye pruebas de integración: valida la UI, no el contrato real con backend/Supabase.

### Seguridad

- El modo mock está condicionado a `import.meta.env.DEV`, por lo que **no puede activarse en un build de producción**.
- **Nunca definas `VITE_MOCK_MODE` en un entorno de despliegue.**
- Mantén `NODE_ENV=production` en el job de build de producción para que `import.meta.env.DEV` sea `false`.
