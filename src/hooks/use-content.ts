import { useEffect, useState } from 'react';

import { getNews, getPromotions, getRecommendations, subscribeNewsletter } from '@/api/catalog';
import { errorMessage } from '@/api/client';
import { isAlcoholicProduct } from '@/domain/checkout-rules';
import { isPromotionActive } from '@/domain/promotions';
import { useAuth } from '@/hooks/use-auth';
import { preloadResource, useCachedResource } from '@/hooks/use-cached-resource';
import type { NewsItem, Product, Promotion } from '@/types/product';
import { isEmail } from '@/utils/validation';

/** ViewModels of the restaurant's content: promotions, news, suggestions and the newsletter. */

const PROMOTIONS_KEY = 'promotions';

export function preloadPromotions() {
  preloadResource(PROMOTIONS_KEY, getPromotions);
}

/** Active offers. A copy loaded earlier may hold offers that ended since: those never show. */
export function usePromotions() {
  const resource = useCachedResource<Promotion[]>(PROMOTIONS_KEY, getPromotions);
  return { ...resource, data: resource.data?.filter((promo) => isPromotionActive(promo)) ?? null };
}

export function useNews() {
  return useCachedResource<NewsItem[]>('news', getNews);
}

const MAX_SUGGESTIONS = 8;

/**
 * Suggestions in the cart (popular, or from the customer's past orders), never drinks with
 * alcohol: suggesting them would encourage drinking (LGS art. 308).
 */
export function useRecommendations(cartProductIds: number[]) {
  const [items, setItems] = useState<Product[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const idsKey = cartProductIds.join(',');

  useEffect(() => {
    const controller = new AbortController();
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    getRecommendations(ids, controller.signal)
      .then((data) => {
        setItems(data.products.filter((p) => p.available && !isAlcoholicProduct(p)).slice(0, MAX_SUGGESTIONS));
        setPersonalized(data.personalized);
      })
      .catch(() => setItems([]));
    return () => controller.abort();
  }, [idsKey]);

  return { items, personalized };
}

type Message = { type: 'error' | 'success'; text: string } | null;

/** "¿No quieres perderte ninguna oferta?": promotions by email, only if the person signs up. */
export function useNewsletter() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const submit = async () => {
    if (!isEmail(email)) return setMessage({ type: 'error', text: 'Escribe un correo electrónico válido.' });
    setSubmitting(true);
    setMessage(null);
    try {
      await subscribeNewsletter(email);
      setMessage({ type: 'success', text: '¡Listo! Te avisaremos de nuestras ofertas.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return { email, setEmail, submitting, message, submit };
}
