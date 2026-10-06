import type { Category, Ingredient, NewsItem, Product, Promotion } from '@/types/product';
import { sizedImageUrl } from '@/utils/image-url';

import { ApiError, request } from './client';
import { asArray, asHttpsUrl, asId, asNumber, asObject, asString, pick, unwrap } from './parse';

function toItem(raw: unknown, index: number, kind: Product['kind']): Product | null {
  const item = asObject(raw);
  if (!item) return null;
  const name = asString(pick(item, 'name', 'title', 'nombre'));
  if (!name) return null;

  const id = asId(item.id);
  const image = asHttpsUrl(pick(item, 'image', 'image_url', 'imagen'));
  const rawCategory = item.category;
  const category = asObject(rawCategory) ? asString(asObject(rawCategory)!.name) : asString(rawCategory);

  return {
    key: id !== null ? `${kind}-${id}` : `${kind}-${name}-${index}`,
    id,
    kind,
    name,
    description: asString(pick(item, 'description', 'descripcion')),
    image: image ? sizedImageUrl(image) : null,
    price: asNumber(pick(item, 'price', 'precio')),
    currency: asString(item.currency, 'MXN') || 'MXN',
    category: category || (kind === 'promotion' ? 'Promociones' : 'Otros'),
    subcategory: asString(pick(item, 'subcategory', 'subcategoria')),
    available: item.available !== false && item.active !== false,
  };
}

/** Parses a products response; also used for the menu bundled in the app. */
export function toProducts(data: unknown, kind: Product['kind'] = 'product') {
  return asArray(data)
    .map((raw, i) => toItem(raw, i, kind))
    .filter((p): p is Product => p !== null);
}

function categoryName(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  return asString(asObject(raw)?.name);
}

// The API has no pagination: /public/products returns at most `limit` (default 50,
// max 100) items, but the menu has more. Fetching per category gets everything.
const CATEGORY_LIMIT = 100;

export async function getProducts(signal?: AbortSignal, category?: string): Promise<Product[]> {
  const query = category
    ? `?category=${encodeURIComponent(category)}&limit=${CATEGORY_LIMIT}`
    : `?limit=${CATEGORY_LIMIT}`;
  return toProducts(await request<unknown>(`/public/products${query}`, { signal }));
}

export async function getCategoryOrder(signal?: AbortSignal): Promise<string[]> {
  const data = await request<unknown>('/public/categories', { signal });
  return asArray(data).map(categoryName).filter(Boolean);
}

// The API allows 60 requests/min per device and returns sporadic 500s under parallel
// load, so categories are fetched a few at a time and server errors are retried once.
// A 429 is never retried right away: that would only extend the block.
const MAX_PARALLEL = 4;
const RETRY_DELAY_MS = 700;

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

async function getCategoryProducts(name: string, signal?: AbortSignal) {
  try {
    return await getProducts(signal, name);
  } catch (err) {
    if (signal?.aborted || (err instanceof ApiError && err.status === 429)) throw err;
    await wait(RETRY_DELAY_MS, signal);
    return getProducts(signal, name);
  }
}

/** Runs `task` over `items` with at most `limit` in flight; keeps input order. */
async function mapLimited<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type MenuResult = {
  categories: Category[];
  /** Categories that couldn't be loaded and had no previous data to fall back on. */
  missing: string[];
  /** Seconds to wait before retrying, when the server rate-limited us. */
  retryAfter: number | null;
};

/**
 * Full menu grouped by category, in the order the categories endpoint returns.
 * `previous` (the last good menu) fills in any category that still fails after the
 * retry; anything still missing is reported instead of silently dropped.
 */
export async function getMenu(signal?: AbortSignal, previous: Category[] = []): Promise<MenuResult> {
  const order = await getCategoryOrder(signal).catch(() => [] as string[]);

  // Without categories, fall back to the (capped) general list grouped client-side.
  if (order.length === 0) {
    const groups = new Map<string, Product[]>();
    for (const product of await getProducts(signal)) {
      const list = groups.get(product.category) ?? [];
      list.push(product);
      groups.set(product.category, list);
    }
    return {
      categories: [...groups.entries()].map(([name, products]) => ({ name, products })),
      missing: [],
      retryAfter: null,
    };
  }

  const results = await mapLimited(order, MAX_PARALLEL, (name) => getCategoryProducts(name, signal));
  if (signal?.aborted) throw signal.reason;

  const missing: string[] = [];
  let retryAfter: number | null = null;
  const categories = order
    .map((name, i) => {
      const result = results[i];
      if (result.status === 'fulfilled') return { name, products: result.value };
      if (result.reason instanceof ApiError && result.reason.retryAfter !== null) {
        retryAfter = Math.max(retryAfter ?? 0, result.reason.retryAfter);
      }
      const cached = previous.find((c) => c.name === name)?.products ?? [];
      if (cached.length === 0) missing.push(name);
      return { name, products: cached };
    })
    // Empty categories (e.g. nothing registered yet) aren't shown.
    .filter((category) => category.products.length > 0);

  // Every request failed (offline, server down): surface the error instead of an empty menu.
  if (categories.length === 0) {
    const failure = results.find((r) => r.status === 'rejected');
    if (failure && failure.status === 'rejected') throw failure.reason;
  }
  return { categories, missing, retryAfter };
}

function toIngredient(raw: unknown): Ingredient | null {
  if (typeof raw === 'string') return raw.trim() ? { id: null, name: raw.trim() } : null;
  const obj = asObject(raw);
  const name = asString(obj && pick(obj, 'name', 'nombre'));
  return obj && name ? { id: asId(obj.id), name } : null;
}

export type ProductDetail = {
  ingredients: Ingredient[];
  /** e.g. "Tequila" inside Destilados; empty when the product has none. */
  subcategory: string;
};

/** Parses a product detail response; also used for the details bundled in the app. */
export function toProductDetail(data: unknown): ProductDetail {
  const body = unwrap(data);
  const product = asObject(body.product) ?? body;
  const list = pick(product, 'ingredients', 'ingredientes') ?? pick(body, 'ingredients', 'ingredientes');
  return {
    ingredients: (Array.isArray(list) ? list : [])
      .map(toIngredient)
      .filter((i): i is Ingredient => i !== null),
    subcategory: asString(pick(product, 'subcategory', 'subcategoria')),
  };
}

/** Extra data only the detail endpoint has: ingredients and subcategory. */
export async function getProductDetail(id: number, signal?: AbortSignal): Promise<ProductDetail> {
  return toProductDetail(await request<unknown>(`/app/products/${id}`, { signal }));
}

/** Ingredients the customer can remove ("Personalizar"). Empty if the product has none. */
export async function getProductIngredients(id: number, signal?: AbortSignal): Promise<Ingredient[]> {
  return (await getProductDetail(id, signal)).ingredients;
}

/** "Popular entre nuestros visitantes", based on what's already in the cart. */
export async function getRecommendations(cartIds: number[], signal?: AbortSignal) {
  const ids = cartIds.filter((id) => Number.isInteger(id)).join(',');
  const body = unwrap(await request<unknown>(`/app/recommendations?cart_ids=${ids}`, { signal }));
  // Response: { data: { strategy, title, products: [...] } }
  return toProducts(body.products ?? body);
}

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

// Current API shape: { title, description, image, active, end_date }. The optional
// fields (badge, price label…) are read if the backend adds them later.
function toPromotion(raw: unknown, index: number): Promotion | null {
  const base = toItem(raw, index, 'promotion');
  const obj = asObject(raw);
  if (!base || !obj) return null;
  const priceLabel = asString(pick(obj, 'price_label', 'price_text', 'promo_price'));
  const endDate = new Date(asString(obj.end_date));
  const availability =
    asString(pick(obj, 'availability', 'available_days')) ||
    (Number.isNaN(endDate.getTime()) ? '' : `Hasta el ${shortDate.format(endDate)}`);
  return {
    ...base,
    badge: asString(pick(obj, 'badge', 'tag')) || null,
    // Never invent a price: without one, the card just shows the description.
    priceLabel: priceLabel || (base.price > 0 ? `$${base.price.toFixed(2)}` : ''),
    availability: availability || null,
    storeOnly: Boolean(pick(obj, 'store_only', 'in_store_only')),
  };
}

export async function getPromotions(signal?: AbortSignal): Promise<Promotion[]> {
  const data = await request<unknown>('/public/promotions', { signal });
  return asArray(data)
    .map(toPromotion)
    .filter((p): p is Promotion => p !== null && p.available);
}

export async function getNews(signal?: AbortSignal): Promise<NewsItem[]> {
  const data = await request<unknown>('/public/news', { signal });
  return asArray(data)
    .map((raw, index): NewsItem | null => {
      const obj = asObject(raw);
      const title = asString(obj && pick(obj, 'title', 'titulo', 'name'));
      if (!obj || !title) return null;
      const date = new Date(asString(pick(obj, 'published_at', 'created_at', 'date')));
      return {
        key: asString(obj.id) || `${title}-${index}`,
        title,
        summary: asString(pick(obj, 'summary', 'excerpt', 'description', 'content')),
        image: asHttpsUrl(pick(obj, 'image', 'image_url', 'imagen')),
        date: Number.isNaN(date.getTime()) ? null : date,
      };
    })
    .filter((n): n is NewsItem => n !== null);
}

export async function subscribeNewsletter(email: string) {
  await request('/app/newsletter/subscribe', {
    method: 'POST',
    auth: true,
    body: { email: email.trim().toLowerCase() },
  });
}
