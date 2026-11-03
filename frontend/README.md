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

- **`frontend/.env`** (lo gestiona el desarrollador, nunca se versiona). Copia `frontend/.env.example` y completa los valores:
  - `VITE_API_URL`: **origen** del backend, sin `/api` (el cliente añade el prefijo automáticamente). Debe apuntar al puerto del backend (**`3000`** por defecto) y coincidir con su `PORT`. En producción debe ser una URL absoluta (`https://...`).
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **`backend/.env`** con su propia configuración (ver `backend/.env.example`) y el backend en ejecución.

Desde la raíz del repositorio, `pnpm dev` levanta frontend y backend a la vez. `pnpm dev:front` por sí solo no tendrá datos: la interfaz arranca, pero todas las peticiones necesitan el backend y Supabase reales.

Si falta `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, la aplicación falla de inmediato al arrancar con un mensaje que nombra la clave `VITE_` faltante y remite a `frontend/.env.example`. Este comportamiento fail-closed es el esperado y no es un bug: sin esas variables no hay cliente de Supabase ni autenticación.

Todos los hooks leen ahora de la API y los servicios reales. Si una pantalla se ve vacía, significa que el backend no devolvió datos o no está accesible; no hay fixtures que la rellenen.

### Si el catálogo sale vacío

Si la consola del navegador muestra `GET .../products/public 404`, la URL base está mal: falta `/api` o está duplicado. El cliente añade `/api` por su cuenta sobre `VITE_API_URL`, así que la variable debe contener solo el origen del backend (por ejemplo, `http://localhost:3001`). Con la base correcta la petición sale como `http://localhost:3001/api/products/public` y el catálogo carga; si la carga falla, la interfaz muestra un estado de error con un botón «Reintentar» en lugar de un mensaje de «sin resultados».
