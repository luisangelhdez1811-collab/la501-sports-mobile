import { router, useLocalSearchParams } from 'expo-router';

import { CategoryScreen } from '@/components/menu/category-screen';

/** Dishes of one category, with Personalizar + Agregar al pedido. */
export default function DeliveryCategoryScreen() {
  const { nombre, sub } = useLocalSearchParams<{ nombre: string; sub?: string }>();

  return (
    <CategoryScreen
      nombre={nombre ?? ''}
      sub={sub}
      onOpenSubcategory={(subcategory) =>
        router.push({ pathname: '/categoria/[nombre]', params: { nombre: nombre ?? '', sub: subcategory } })
      }
    />
  );
}
