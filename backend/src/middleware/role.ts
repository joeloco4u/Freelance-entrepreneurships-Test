import type { NextFunction, Request, Response } from "express";

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // Ahora userRole es un array: ej. ['admin', 'editor']
    const userRoles: string[] = user.user_metadata?.roles || [];

    // Verificamos si existe al menos una coincidencia entre los arrays
    const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción.",
      });
    }

    next();
  };
}
