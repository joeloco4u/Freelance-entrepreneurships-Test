import type { Request, Response } from "express";
import { supabaseAdmin } from "../db.js";
import { respondWithError } from "../utils/errors.js";
import { logError } from "../utils/logger.js";

export async function createSystemUser(req: Request, res: Response) {
  const { email, name, roles, departamento } = req.body;

  // 1. Crear el usuario en la Autenticación de Supabase
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: "PasswordTemporal123!", // O generar una aleatoria
      email_confirm: true,
      user_metadata: { name, roles, departamento }, // Metadatos útiles
    });

  if (authError) {
    console.error("[UserController] Error creando usuario:", authError.message);
    return res.status(400).json({ error: "Error al crear el usuario" });
  }

  res
    .status(201)
    .json({ message: "Usuario creado con éxito", user: authData.user });
}

// Obtener todos los usuarios
export async function getAllUsers(_req: Request, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("[UserController] Error al obtener usuarios:", error.message);
    return res.status(400).json({ error: "Error al obtener usuarios" });
  }
  res.status(200).json(data);
}

export async function getPublicConsumers(_req: Request, res: Response) {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, name, departamento")
      .contains("roles", ["CONSUMIDOR"])
      .order("name", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    logError("getPublicConsumers", error);
    return res.status(500).json({
      error: "Error al obtener la lista de consumidores",
    });
  }
}

// Obtener un usuario por ID
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*, entrepreneurships(*)") // Incluimos su emprendimiento si existe
    .eq("id", id)
    .single();

  if (error) {
    console.error("[UserController] Error al obtener usuario:", error.message);
    return res.status(404).json({ error: "Usuario no encontrado" });
  }
  res.status(200).json(data);
}

// Ejemplo en el Controller del Backend
export const getActiveSessionsCount = async (_req: Request, res: Response) => {
  try {
    // Llamamos a la función RPC que creamos en el SQL Editor
    // Pasamos 24 como el parámetro 'hours_threshold'
    const { data, error } = await supabaseAdmin.rpc(
      "get_active_session_count",
      { hours_threshold: 24 },
    );

    if (error) {
      console.error("Error RPC Supabase:", error.message);
      throw error;
    }

    // data contiene directamente el número retornado por la función
    return res.json({ count: data || 0 });
  } catch (error: unknown) {
    logError("getActiveSessionsCount", error);

    return res.status(500).json({
      error: "Error al obtener el conteo de sesiones activas",
    });
  }
};

// Modificar un usuario
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID de usuario inválido o ausente" });
  }

  // Verificamos que el usuario existe antes de actualizar
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", id)
    .single();

  if (!existing) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  // Whitelist de campos permitidos para actualización
  const allowedFields = ["name", "email", "departamento"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Solo IT/ADMIN puede modificar roles
  const userRoles: string[] = req.user?.user_metadata?.roles || [];
  const isPrivileged = userRoles.includes("IT") || userRoles.includes("ADMIN");
  if (isPrivileged && req.body.roles !== undefined) {
    updates.roles = req.body.roles;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No hay campos válidos para actualizar" });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[UserController] Error al actualizar usuario:", error.message);
    return res.status(400).json({ error: "Error al actualizar usuario" });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    id,
    {
      user_metadata: updates,
    },
  );

  if (authError) {
    return res.status(500).json({
      error:
        "Usuario actualizado en la base de datos pero falló la sincronización con Auth",
    });
  }

  res.status(200).json({ message: "Usuario actualizado correctamente", data });
}

// Borrar un usuario
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  // Si id es undefined o un array, esto nos protege
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID de usuario inválido o ausente" });
  }

  try {
    // Ahora TypeScript sabe que id es un string porque validamos antes
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return respondWithError(res, error, "deleteUser", {
        status: 400,
        fallback: "No se pudo eliminar el usuario. Intenta de nuevo más tarde.",
      });
    }

    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    logError("deleteUser", error);
    return res.status(500).json({
      error: "No se pudo eliminar el usuario del sistema",
    });
  }
}
