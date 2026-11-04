import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  addItem,
  cartCount,
  cartTotal,
  changeQuantity,
  quantityOf,
  removeItem,
  removeOneOf,
  type AddOptions,
  type CartItem,
} from '@/domain/cart';
import { completeProduct } from '@/domain/menu-layout';
import type { Product } from '@/types/product';
import { readCache, writeCache } from '@/utils/offline-cache';

export type { CartItem } from '@/domain/cart';

const CART_KEY = 'cart';
// A cart left for days probably has stale prices/availability; start fresh instead.
const CART_TTL_MS = 3 * 24 * 60 * 60 * 1000;

type CartContextValue = {
  items: CartItem[];
  count: number;
  /** Display-only estimate; the server computes the real total at checkout. */
  total: number;
  add: (product: Product, options?: AddOptions) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  remove: (lineId: string) => void;
  /** How many of a dish are in the cart, whatever their choices (menu card counter). */
  quantityOf: (productKey: string) => number;
  /** −1 on the dish's most recent line (the menu card's "−"). */
  removeOneOf: (productKey: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Cart ViewModel (MVVM): holds the cart state for the screens and applies the rules from
 * the domain model (src/domain/cart). The server only receives the items at checkout,
 * where prices are recalculated from the database. It's saved on the device so closing
 * the app or losing signal doesn't empty it.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const restored = useRef(false);

  useEffect(() => {
    readCache<CartItem[]>(CART_KEY).then((saved) => {
      restored.current = true;
      if (!saved || Date.now() - saved.savedAt > CART_TTL_MS || !Array.isArray(saved.data)) return;
      // Anything added before the saved cart loaded wins over it.
      const restoredItems = saved.data.map((item) => ({ ...item, product: completeProduct(item.product) }));
      setItems((current) => (current.length ? current : restoredItems));
    });
  }, []);

  useEffect(() => {
    if (restored.current) writeCache(CART_KEY, items);
  }, [items]);

  const value: CartContextValue = {
    items,
    count: cartCount(items),
    total: cartTotal(items),
    add: (product, options) => setItems((current) => addItem(current, product, options)),
    increment: (lineId) => setItems((current) => changeQuantity(current, lineId, 1)),
    decrement: (lineId) => setItems((current) => changeQuantity(current, lineId, -1)),
    remove: (lineId) => setItems((current) => removeItem(current, lineId)),
    quantityOf: (productKey) => quantityOf(items, productKey),
    removeOneOf: (productKey) => setItems((current) => removeOneOf(current, productKey)),
    clear: () => setItems([]),
  };

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const context = use(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
