import { router, useLocalSearchParams } from 'expo-router';

import { CategoryScreen } from '@/components/menu/category-screen';

/** Dishes of one menu category (read-only). */
export default function MenuCategoryScreen() {
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
