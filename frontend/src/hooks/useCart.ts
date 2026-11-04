import { useEffect, useState } from "react";
import type { LocationCode } from "../config/locations";
import type { CatalogProduct } from "../types";

type Cart = Record<string, number>;

export function useCart(
  allProducts: CatalogProduct[],
  sede: LocationCode | null,
) {
  const [cart, setCart] = useState<Cart>({});
  const [drawerOpen, setDrawer] = useState(false);

  useEffect(() => {
    // El carrito pertenece a una sede: al cambiarla se descarta por completo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart({});
    setDrawer(false);
  }, [sede]);

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: 1 }));

  const changeQty = (id: string, delta: number) =>
    setCart((c) => {
      const key = id;
      const next = (Object.hasOwn(c, key) ? (c[key] ?? 0) : 0) + delta;
      if (next <= 0) {
        const newCart = { ...c };
        delete newCart[key];
        return newCart;
      }
      const maxStock =
        allProducts.find((p) => p.id === key)?.current_stock ?? 0;
      return { ...c, [key]: Math.min(next, maxStock) };
    });

  const removeFromCart = (id: string) =>
    setCart((c) => {
      const newCart = { ...c };
      delete newCart[id];
      return newCart;
    });

  const clearCart = () => setCart({});

  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => {
      const product = allProducts.find((p) => p.id === id);
      if (!product) return null;
      return { product, qty };
    })
    .filter((e): e is { product: CatalogProduct; qty: number } => e !== null);

  const cartCount = cartEntries.reduce((s, { qty }) => s + qty, 0);
  const cartTotal = cartEntries.reduce(
    (s, { product, qty }) => s + product.price * qty,
    0,
  );

  return {
    cart,
    cartCount,
    cartTotal,
    cartEntries,
    addToCart,
    changeQty,
    removeFromCart,
    clearCart,
    drawerOpen,
    setDrawer,
  };
}
