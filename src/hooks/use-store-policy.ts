import { DEFAULT_POLICY, getStorePolicy, type StorePolicy } from '@/api/info';
import { preloadResource, useCachedResource } from '@/hooks/use-cached-resource';

const KEY = 'store-policy';

/** Downloads the store's rules while the splash shows (customers only). */
export function preloadStorePolicy() {
  preloadResource(KEY, getStorePolicy, { persist: true });
}

/**
 * The store's rules (/public/info): alcohol legend and sales hours, provider, legal versions,
 * points and invoices. Never empty: until the server answers, the website's wording.
 */
export function useStorePolicy(): StorePolicy {
  const { data } = useCachedResource(KEY, getStorePolicy, { persist: true });
  return data ?? DEFAULT_POLICY;
}
