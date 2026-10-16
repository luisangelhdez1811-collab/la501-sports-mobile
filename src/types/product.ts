export type Product = {
  /** Stable key; the server id when it sends one, otherwise derived from the name. */
  key: string;
  id: number | null;
  /** Checkout sends promotions as `promotion_id` instead of `product_id`. */
  kind: 'product' | 'promotion';
  name: string;
  description: string;
  /** Only HTTPS image URLs are kept; anything else becomes null. */
  image: string | null;
  price: number;
  /** Offer price text when there's no plain amount, e.g. "2x$150" (promotions). */
  priceLabel?: string;
  currency: string;
  category: string;
  /** e.g. "Tequila" inside Destilados; empty when the product has none. */
  subcategory: string;
  available: boolean;
};

export type Category = {
  name: string;
  products: Product[];
};

export type Ingredient = {
  id: number | null;
  name: string;
};

export type Promotion = Product & {
  /** Corner ribbon, e.g. "¡SOLO JUEVES!". */
  badge: string | null;
  /** Free-form price text when it isn't a plain amount, e.g. "2x$150" or "Gratis". */
  priceLabel: string;
  /** When / where it applies, e.g. "Disponible jueves". */
  availability: string | null;
  /** Redeemed with the waiter in the restaurant; can't be ordered for delivery. */
  storeOnly: boolean;
};

export type NewsItem = {
  key: string;
  title: string;
  summary: string;
  image: string | null;
  date: Date | null;
};
