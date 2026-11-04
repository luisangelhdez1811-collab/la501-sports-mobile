/** Tabs of the menu, as on the website. */
export type MenuSection = 'comidas' | 'bebidas';

/** Who prepares it. "ninguna": handed over as is (soda, beer), straight to the waiter. */
export type Station = 'cocina' | 'barra' | 'ninguna';

/** A size with its own price: Vaso / Litro, Copeo / Botella. */
export type Variant = { id: number; name: string; price: number };

export type MenuOption = {
  id: number;
  name: string;
  /** Small print, e.g. "4 piezas" or "Picor: 3 de 5". */
  detail: string;
  /** Added to the dish; 0 = included. */
  price: number;
};

/** A list of choices for a dish (sauce, type of fries, extras) and how many can be picked. */
export type OptionGroup = {
  id: number;
  name: string;
  /** Title shown above the list, e.g. "Elige tu papa". */
  label: string;
  /** More than 0 = required. */
  min: number;
  /** Most picks in the whole list; 0 = no limit. */
  max: number;
  /** Times the same option can be repeated; more than 1 shows a − n + counter. */
  maxPerOption: number;
  options: MenuOption[];
};

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
  /** With variants, the cheapest one ("Desde $80"). */
  price: number;
  /** Offer price text when there's no plain amount, e.g. "2x$150" (promotions). */
  priceLabel?: string;
  currency: string;
  category: string;
  /** e.g. "Tequila" inside Destilados; empty when the product has none. */
  subcategory: string;
  available: boolean;
  section: MenuSection;
  station: Station;
  /** Portion text under the name, e.g. "3 pzs" or "350 g · 1 salsa"; empty when none. */
  presentation: string;
  variants: Variant[];
  optionGroups: OptionGroup[];
  /** Sent by the server once it marks drinks with alcohol; undefined = decide by category. */
  alcoholic?: boolean;
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
