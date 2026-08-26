import type { Request, Response } from "express";
import { supabaseAdmin } from "../db.js";
import { respondWithError } from "../utils/errors.js";

export async function getAllCategories(_req: Request, res: Response) {
  const { data, error } = await supabaseAdmin.from("categories").select("*");

  if (error)
    return respondWithError(res, error, "getAllCategories", {
      fallback:
        "No se pudieron cargar las categorías. Intenta de nuevo más tarde.",
    });
  res.status(200).json(data);
}
