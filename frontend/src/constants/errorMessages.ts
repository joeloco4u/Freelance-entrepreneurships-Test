/**
 * Centralized user-facing error copy.
 *
 * Voice to match across the app: `<qué falló>. <qué hacer>.`, informal
 * imperative ("Verifica", "Intenta"), openers "No se pudo…" / "Error al…".
 */

export const GENERIC_ERROR =
  "Ocurrió un error inesperado. Intenta de nuevo más tarde.";

export const NETWORK_ERROR =
  "No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.";

/** Fallbacks used when a response carries no message we can safely show. */
export const STATUS_MESSAGES: Record<number, string> = {
  400: "Los datos enviados no son válidos. Verifícalos e intenta de nuevo.",
  401: "Tu sesión expiró. Inicia sesión de nuevo.",
  403: "No tienes permisos para realizar esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "No se puede completar la operación porque hay información asociada.",
  429: "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
  500: GENERIC_ERROR,
  502: GENERIC_ERROR,
  503: "El servicio no está disponible en este momento. Intenta más tarde.",
};

export const ERROR_MESSAGES = {
  products: {
    load: "No se pudieron cargar los productos. Verifica tu conexión e intenta de nuevo.",
    save: "Error al guardar el producto. Verifica los datos e intenta de nuevo.",
    delete: "No se pudo eliminar el producto. Intenta de nuevo más tarde.",
    loadCombo: "No se pudo cargar el combo. Intenta de nuevo más tarde.",
    stockMatrix:
      "No se pudo actualizar el stock. Verifica los datos e intenta de nuevo.",
    stockMatrixLimit:
      "Solo puedes guardar hasta 200 productos a la vez. Guarda los cambios en partes.",
    refreshAfterStock:
      "El stock se actualizó, pero no se pudo refrescar la lista. Recarga la página.",
  },
  entrepreneurships: {
    load: "No se pudieron cargar los emprendimientos. Verifica tu conexión e intenta de nuevo.",
    save: "Error al guardar el emprendimiento. Verifica los datos e intenta de nuevo.",
    delete:
      "No se pudo eliminar el emprendimiento. Verifica que no tenga productos asociados.",
  },
  users: {
    load: "No se pudieron cargar los usuarios. Verifica tu conexión e intenta de nuevo.",
    save: "Error al guardar el usuario. Verifica los datos e intenta de nuevo.",
    delete:
      "No se pudo eliminar el usuario. Verifica que no tenga datos asociados.",
    request: "Error al procesar la solicitud. Intenta de nuevo más tarde.",
  },
  sales: {
    load: "Error al cargar las ventas. Intenta de nuevo más tarde.",
    loadOwn: "No se pudieron cargar tus compras. Intenta de nuevo más tarde.",
    refund: "Error al procesar el reembolso. Intenta de nuevo más tarde.",
    refundBatch:
      "Error al procesar los reembolsos. Intenta de nuevo más tarde.",
    payroll: "Error al procesar la nómina. Intenta de nuevo más tarde.",
    payment: "Error al procesar el pago. Intenta de nuevo más tarde.",
    checkout:
      "No se pudo registrar la compra. Verifica el stock disponible e intenta de nuevo.",
  },
  auth: {
    login: "No se pudo iniciar sesión. Intenta de nuevo más tarde.",
    invalidCredentials: "Correo o contraseña incorrectos",
    register:
      "No se pudo enviar la solicitud. Verifica los datos e intenta de nuevo.",
    recovery:
      "No se pudo enviar el correo de recuperación. Intenta de nuevo más tarde.",
    resetPassword:
      "No se pudo actualizar la contraseña. Intenta de nuevo más tarde.",
    changePassword:
      "No se pudo cambiar la contraseña. Verifica los datos e intenta de nuevo.",
    approveRequest: "No se pudo aprobar la solicitud. Intenta de nuevo más tarde.",
    rejectRequest: "No se pudo rechazar la solicitud. Intenta de nuevo más tarde.",
    loadRequests:
      "No se pudieron cargar las solicitudes. Intenta de nuevo más tarde.",
  },
  paymentData: {
    load: "Error al cargar datos de pago. Intenta de nuevo más tarde.",
    save: "Error al guardar datos de pago. Verifica los datos e intenta de nuevo.",
  },
  admin: {
    dashboard:
      "Error al cargar los datos del panel. Intenta de nuevo más tarde.",
  },
  settings: {
    save: "No se pudo guardar la configuración. Intenta de nuevo más tarde.",
    sheets:
      "No se pudieron obtener las hojas. Verifica el ID e intenta de nuevo.",
  },
} as const;
