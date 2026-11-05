import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getActiveProducts,
  getAllProducts,
  getProductById,
  getProductsByEntrepreneurship,
  updateProduct,
  updateProductStockMatrix,
} from "../controllers/ProductController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import upload from "../middleware/upload.js";

const productRouter: Router = Router();

// ── Ruta pública (catálogo) ──────────────────────────────────────────
productRouter.get("/public", getActiveProducts);

// ── Rutas protegidas ─────────────────────────────────────────────────
productRouter.use(authenticate);

productRouter.get("/", authorize("ADMIN", "IT"), getAllProducts);
productRouter.get(
  "/entrepreneurship/:entrepreneurship_id",
  getProductsByEntrepreneurship,
);
productRouter.get("/:id", getProductById);
productRouter.post(
  "/",
  authorize("PROVEEDOR", "IT"),
  upload.single("image"),
  createProduct,
);
productRouter.put(
  "/stock/matrix",
  authorize("ADMIN", "IT", "PROVEEDOR"),
  updateProductStockMatrix,
);
productRouter.put(
  "/:id",
  authorize("ADMIN", "IT", "PROVEEDOR"),
  upload.single("image"),
  updateProduct,
);
productRouter.delete("/:id", authorize("PROVEEDOR"), deleteProduct);

export default productRouter;
