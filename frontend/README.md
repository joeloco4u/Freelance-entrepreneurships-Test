# Freelance-entrepreneurships
Proyecto de Digitalización de Emprendimientos para Freelance Latin America

## Sede local (onboarding)

La sede no se detecta por IP ni por parámetro de URL: es una preferencia local del navegador.

- En la primera visita la aplicación muestra un modal **no descartable** para elegir entre Valle Frío y Grano de Oro.
- La elección se guarda en `localStorage` bajo la clave `hq_location` con los valores `VF` / `GO`, y se reutiliza en ese equipo.
- Cambiar de sede desde la cabecera del catálogo pide confirmación y **vacía el carrito**.
- Para probar el flujo de primera visita, borra `hq_location` en DevTools (Application -> Local Storage) o usa una ventana de incógnito nueva.

Limitación conocida: el valor es por navegador y gana el último que escribe entre pestañas; solo se vuelve a leer al recargar.

## Desarrollo local con backend y Supabase reales

El modo mock se eliminó en la limpieza de la Fase 2. Los archivos `frontend/src/config/mockMode.ts` y `frontend/src/config/mockData.ts` ya no existen, y no queda ninguna ruta de desarrollo sin backend ni sin Supabase.

Requisitos para ejecutar el frontend:

- **`frontend/.env`** (lo gestiona el desarrollador, nunca se versiona) con estas variables:
  - `VITE_API_URL` (por ejemplo, `http://localhost:3000`)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **`backend/.env`** con su propia configuración y el backend en ejecución.

Desde la raíz del repositorio, `pnpm dev` levanta frontend y backend a la vez. `pnpm dev:front` por sí solo no tendrá datos: la interfaz arranca, pero todas las peticiones necesitan el backend y Supabase reales.

Si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, la aplicación falla de inmediato al arrancar con el error «Faltan las variables de entorno de Supabase en el Frontend». Este comportamiento fail-closed es el esperado y no es un bug: sin esas variables no hay cliente de Supabase ni autenticación.

Todos los hooks leen ahora de la API y los servicios reales. Si una pantalla se ve vacía, significa que el backend no devolvió datos o no está accesible; no hay fixtures que la rellenen.
