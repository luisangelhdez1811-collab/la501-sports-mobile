import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Ingredient, Product } from '@/types/product';
import { readCache, writeCache } from '@/utils/offline-cache';

const MAX_QUANTITY = 99;
const CART_KEY = 'cart';
// A cart left for days probably has stale prices/availability; start fresh instead.
const CART_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export type CartItem = {
  /** Same product with different customizations becomes separate lines. */
  lineId: string;
  product: Product;
  quantity: number;
  excluded: Ingredient[];
  notes: string;
};

type AddOptions = { excluded?: Ingredient[]; notes?: string };

type CartContextValue = {
  items: CartItem[];
  count: number;
  /** Display-only estimate; the server computes the real total at checkout. */
  total: number;
  add: (product: Product, options?: AddOptions) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineIdFor(product: Product, excluded: Ingredient[], notes: string) {
  const removed = excluded
    .map((i) => i.id ?? i.name)
    .sort()
    .join(',');
  return `${product.key}|${removed}|${notes.trim().toLowerCase()}`;
}

/**
 * Local cart, as the API expects: the server only receives the items at checkout, where
 * prices are recalculated from the database (never trust client-side prices). It's saved
 * on the device so closing the app or losing signal doesn't empty it.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const restored = useRef(false);

  useEffect(() => {
    readCache<CartItem[]>(CART_KEY).then((saved) => {
      restored.current = true;
      if (!saved || Date.now() - saved.savedAt > CART_TTL_MS || !Array.isArray(saved.data)) return;
      // Anything added before the saved cart loaded wins over it.
      setItems((current) => (current.length ? current : saved.data));
    });
  }, []);

  useEffect(() => {
    if (restored.current) writeCache(CART_KEY, items);
  }, [items]);

  const add = (product: Product, { excluded = [], notes = '' }: AddOptions = {}) => {
    const cleanNotes = notes.trim().slice(0, 300);
    const lineId = lineIdFor(product, excluded, cleanNotes);
    setItems((current) => {
      const existing = current.find((item) => item.lineId === lineId);
      if (!existing) return [...current, { lineId, product, quantity: 1, excluded, notes: cleanNotes }];
      return current.map((item) =>
        item === existing ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) } : item,
      );
    });
  };

  const changeQuantity = (lineId: string, delta: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: Math.min(item.quantity + delta, MAX_QUANTITY) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const value: CartContextValue = {
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    total: items.reduce((total, item) => total + item.quantity * item.product.price, 0),
    add,
    increment: (lineId) => changeQuantity(lineId, 1),
    decrement: (lineId) => changeQuantity(lineId, -1),
    remove: (lineId) => setItems((current) => current.filter((item) => item.lineId !== lineId)),
    clear: () => setItems([]),
  };

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const context = use(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
