import { useEffect, useState } from 'react';

import { getProductDetail, type ProductDetail } from '@/api/catalog';
import { getCachedDetail, loadDetails, saveDetail, useDetailsVersion } from '@/data/product-details';
import type { Category, Product } from '@/types/product';
import { groupBySubcategory } from '@/utils/subcategories';

type DetailState = { id: number | null; detail: ProductDetail | null; failed: boolean };

/**
 * A dish's details (ingredients, subcategory) for its card: the saved copy shows instantly
 * (and is all there is offline); otherwise they're downloaded once and saved. Promotions have
 * no details.
 */
export function useProductDetail(product: Product | null) {
  const productId = product?.kind === 'product' ? product.id : null;
  const [state, setState] = useState<DetailState>({ id: null, detail: null, failed: false });

  useEffect(() => {
    if (productId === null) return;
    const controller = new AbortController();
    (async () => {
      await loadDetails();
      if (controller.signal.aborted) return;
      const cached = getCachedDetail(productId);
      if (cached) return setState({ id: productId, detail: cached, failed: false });
      try {
        const data = await getProductDetail(productId, controller.signal);
        saveDetail(productId, data);
        setState({ id: productId, detail: data, failed: false });
      } catch {
        if (!controller.signal.aborted) setState({ id: productId, detail: null, failed: true });
      }
    })();
    return () => controller.abort();
  }, [productId]);

  // Another dish was opened: what was loaded belongs to the previous one.
  const current = state.id === productId ? state : { detail: null, failed: false };
  return { detail: current.detail, loading: productId !== null && !current.detail && !current.failed };
}

/**
 * A menu category with each dish's subcategory (Destilados → Ron, Mezcal, Tequila…). They come
 * from the saved dish details until the menu endpoint sends them; `groups` stays null until
 * every one is known, so a half-synced category never shows a misleading partial grouping.
 */
export function useCategorySubgroups(found: Category | undefined) {
  const subcategoriesKnown = !!found?.products.every((p) => p.subcategory || getCachedDetail(p.id));
  // Only listen while some are missing: the background sync saves one every few seconds and
  // would redraw the whole screen each time.
  useDetailsVersion(!subcategoriesKnown);
  useEffect(() => {
    loadDetails();
  }, []);

  const category = found && {
    ...found,
    products: found.products.map((p) => (p.subcategory ? p : { ...p, subcategory: getCachedDetail(p.id)?.subcategory ?? '' })),
  };
  return { category, groups: category && subcategoriesKnown ? groupBySubcategory(category.products) : null };
}
