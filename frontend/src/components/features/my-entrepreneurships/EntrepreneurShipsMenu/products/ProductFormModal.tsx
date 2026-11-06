import { Select, Spin, Switch } from "antd";
import {
  ChevronDown,
  DollarSign,
  List,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_LOCATION,
  LOCATIONS,
  LOCATION_CODES,
} from "../../../../../config/locations";
import { MAX_STOCK } from "../../../../../constants/stock";
import type {
  Category,
  ComposedProductInput,
  EntrepreneurshipProduct,
  ProductInput,
} from "../../../../../types";
import { getCategories } from "../../../../../services/categoryService";
import { getEntrepreneurshipProducts } from "../../../../../services/productService";
import BaseFormModal from "../../../../shared/BaseFormModal";
import ImageUpload from "../../../../shared/ImageUpload";
import { SedeBadge } from "../../../../shared/SedeBadge";
import { useComposedProductForm } from "./hooks/useComposedProductForm";
import { useProductForm } from "./hooks/useProductForm";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: ProductInput | ComposedProductInput) => Promise<void>;
  product: EntrepreneurshipProduct | null;
  composedData?: ComposedProductInput | null;
  isLoading?: boolean;
  entrepreneurshipId: string;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  product,
  composedData,
  isLoading,
  entrepreneurshipId,
}: ProductFormModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [simpleProducts, setSimpleProducts] = useState<
    { id: string; name: string }[]
  >([]);
  const [userComposedToggle, setUserComposedToggle] = useState(false);

  const isEditing = !!product;
  const isComposed = isEditing
    ? (product?.is_composed ?? false)
    : userComposedToggle;

  const simpleForm = useProductForm(
    isComposed ? null : product,
  );
  const composedForm = useComposedProductForm(
    isComposed ? (composedData ?? null) : null,
  );

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      getCategories(),
      getEntrepreneurshipProducts(entrepreneurshipId),
    ])
      .then(([cats, prods]) => {
        setCategories(cats);
        setSimpleProducts(
          prods
            .filter((p) => !p.is_composed)
            .map((p) => ({ id: p.id, name: p.name })),
        );
      })
      .catch((error: unknown) => {
        console.error("[ProductFormModal] Error al cargar opciones:", error);
        setCategories([]);
        setSimpleProducts([]);
      })
      .finally(() => setLoadingCategories(false));
  }, [isOpen, entrepreneurshipId]);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (isComposed) {
      const dataToSend: ComposedProductInput = {
        ...composedForm.formData,
        entrepreneurship_id: entrepreneurshipId,
        imageFile: composedForm.selectedFile,
      };
      await onSave(dataToSend);
      composedForm.setSelectedFile(null);
    } else {
      const dataToSend: ProductInput = {
        ...simpleForm.formData,
        entrepreneurship_id: entrepreneurshipId,
        imageFile: simpleForm.selectedFile,
      };
      await onSave(dataToSend);
      simpleForm.setSelectedFile(null);
    }
  };

  const loadingComposedData = isComposed && isEditing && !composedData;

  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? "Editar Producto" : "Nuevo Producto"}
      confirmText={isEditing ? "Guardar Cambios" : "Crear Producto"}
      isLoading={isLoading || loadingComposedData}
      maxWidth="xl"
    >
      {loadingComposedData ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
      <div className="space-y-4">
        {/* Toggle: Es un combo? (solo al crear) */}
        {!isEditing && (
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div>
              <p className="text-sm font-bold text-gray-700">¿Es un combo?</p>
              <p className="text-xs text-gray-500">
                Agrupa varios productos en uno con precio especial
              </p>
            </div>
            <Switch
              checked={isComposed}
              onChange={(checked) => setUserComposedToggle(checked)}
              className={isComposed ? "bg-primary" : ""}
            />
          </div>
        )}

        {/* Nombre del Producto */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombre del {isComposed ? "Combo" : "Producto"}
          </label>
          <div className="relative">
            <Package
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              id="name"
              required
              type="text"
              placeholder={isComposed ? "Ej: Combo 5 Chupetas" : "Ej: Café Artesanal 500g"}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              value={
                isComposed
                  ? composedForm.formData.name
                  : simpleForm.formData.name
              }
              onChange={(e) => {
                if (isComposed) {
                  composedForm.updateField("name", e.target.value);
                } else {
                  simpleForm.updateField("name", e.target.value);
                }
              }}
            />
          </div>
        </div>

        <div className={isComposed ? "grid grid-cols-2 gap-4" : "grid gap-4"}>
          {/* Precio */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Precio del {isComposed ? "Combo" : "Producto"}
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                id="price"
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                value={
                  isComposed
                    ? composedForm.formData.price
                    : simpleForm.formData.price
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (isComposed) {
                    composedForm.updateField("price", val);
                  } else {
                    simpleForm.updateField("price", val);
                  }
                }}
              />
            </div>
          </div>

          {/* Stock informativo para combos */}
          {isComposed && (
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                Stock (calculado)
              </label>
              <div className="relative">
                <List
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <div className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500">
                  Se calcula autom&aacute;ticamente del stock de componentes
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stock inicial por sede (solo para productos simples) */}
        {!isComposed && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Stock inicial por sede
              </p>
              <p className="text-xs text-gray-400">
                {isEditing
                  ? "La disponibilidad por sede se edita desde el panel de stock. En este formulario solo puedes ajustar el stock de Valle Frío."
                  : "Define la disponibilidad inicial de cada sede. Stock 0 = agotado, pero visible."}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LOCATION_CODES.map((location) => {
                const cell = simpleForm.formData.stocks[location];
                const isDefaultLocation = location === DEFAULT_LOCATION;

                return (
                  <div
                    key={location}
                    role="group"
                    aria-label={LOCATIONS[location].name}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <SedeBadge codes={[location]} />
                      <span className="text-xs font-semibold text-gray-500">
                        {LOCATIONS[location].name}
                      </span>
                    </div>

                    <label className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        Ofrecer
                      </span>
                      <Switch
                        checked={cell.offered}
                        disabled={isEditing}
                        onChange={(checked) =>
                          simpleForm.updateStock(location, {
                            offered: checked,
                          })
                        }
                        aria-label={`Ofrecer en ${LOCATIONS[location].name}`}
                        style={{
                          backgroundColor: cell.offered
                            ? "var(--color-primary)"
                            : undefined,
                        }}
                      />
                    </label>

                    {cell.offered ? (
                      <div>
                        <label
                          htmlFor={`initial-stock-${location}`}
                          className="block text-xs font-semibold text-gray-500 mb-1"
                        >
                          Stock inicial
                        </label>
                        <input
                          id={`initial-stock-${location}`}
                          type="number"
                          min={0}
                          max={MAX_STOCK}
                          step={1}
                          inputMode="numeric"
                          value={cell.stock}
                          disabled={
                            !cell.offered || (isEditing && !isDefaultLocation)
                          }
                          onChange={(event) => {
                            const value = Number.parseInt(
                              event.target.value,
                              10,
                            );
                            simpleForm.updateStock(location, {
                              stock: Number.isNaN(value) ? 0 : value,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.preventDefault();
                          }}
                          aria-label={`Stock inicial en ${LOCATIONS[location].name}`}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-center"
                        />

                        <div className="mt-1">
                          {cell.stock === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase">
                              Agotado
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400">
                          No ofrecido
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Componentes del Combo */}
        {isComposed && (
          <div className="space-y-3">
            <label htmlFor="components" className="block text-sm font-medium text-gray-700">
              Componentes del Combo
            </label>
            <div className="space-y-2">
              {composedForm.formData.components.map((comp, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <Select
                    showSearch
                    className="flex-1"
                    placeholder="Seleccionar producto..."
                    value={comp.component_product_id || undefined}
                    onChange={(value) =>
                      composedForm.updateComponent(
                        index,
                        "component_product_id",
                        value,
                      )
                    }
                    options={simpleProducts.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    style={{ width: "100%" }}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center"
                    value={comp.quantity}
                    onChange={(e) =>
                      composedForm.updateComponent(
                        index,
                        "quantity",
                        parseInt(e.target.value, 10) || 1,
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => composedForm.removeComponent(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                composedForm.addComponent({
                  component_product_id: "",
                  quantity: 1,
                })
              }
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Agregar componente
            </button>
          </div>
        )}

        {/* Categoría */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Categor&iacute;a
          </label>
          <div className="relative">
            <select
              id="category"
              value={
                isComposed
                  ? composedForm.formData.category_id || ""
                  : simpleForm.formData.category_id || ""
              }
              onChange={(e) => {
                const val = e.target.value
                  ? parseInt(e.target.value, 10)
                  : undefined;
                if (isComposed) {
                  composedForm.updateField("category_id", val);
                } else {
                  simpleForm.updateField("category_id", val);
                }
              }}
              disabled={loadingCategories}
              className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm appearance-none bg-white"
            >
              <option value="">Seleccionar categor&iacute;a</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
            />
          </div>
        </div>

        {/* Carga de Imagen */}
        <ImageUpload
          value={
            isComposed
              ? composedForm.formData.image
              : simpleForm.formData.image
          }
          onChange={(file) => {
            if (isComposed) {
              composedForm.setSelectedFile(file);
            } else {
              simpleForm.setSelectedFile(file);
            }
          }}
        />

        {/* Estado Activo */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-700">
              {isComposed ? "Combo Activo" : "Producto Activo"}
            </p>
            <p className="text-xs text-gray-400">
              &iquest;Estar&aacute; visible en el cat&aacute;logo inmediatamente?
            </p>
          </div>
          <Switch
            checked={
              isComposed
                ? composedForm.formData.is_active
                : simpleForm.formData.is_active
            }
            onChange={(checked) => {
              if (isComposed) {
                composedForm.updateField("is_active", checked);
              } else {
                simpleForm.updateField("is_active", checked);
              }
            }}
            className={
              (isComposed
                ? composedForm.formData.is_active
                : simpleForm.formData.is_active
              )
                ? "bg-primary"
                : ""
            }
          />
        </div>
      </div>
      )}
    </BaseFormModal>
  );
}
