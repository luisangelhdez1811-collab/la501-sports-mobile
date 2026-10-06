import { router, useLocalSearchParams } from 'expo-router';

import { CategoryScreen } from '@/components/menu/category-screen';

/** Dishes of one category in the ordering flow (with Personalizar + Agregar al pedido). */
export default function DeliveryCategoryScreen() {
  const { categoria, sub } = useLocalSearchParams<{ categoria: string; sub?: string }>();

  return (
    <CategoryScreen
      ordering
      nombre={categoria ?? ''}
      sub={sub}
      onOpenSubcategory={(subcategory) =>
        router.push({ pathname: '/domicilio/[categoria]', params: { categoria: categoria ?? '', sub: subcategory } })
      }
    />
  );
}
