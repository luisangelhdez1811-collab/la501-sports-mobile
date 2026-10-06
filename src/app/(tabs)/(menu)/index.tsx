import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { PageHero } from '@/components/brand/page-hero';
import { CategoryGridScreen } from '@/components/menu/category-grid-screen';
import { GRID_GUTTER } from '@/components/menu/grid';

/** Main screen: menu categories as photo cards; tapping one opens its dishes. */
export default function MenuScreen() {
  return (
    <CategoryGridScreen
      hero={
        <View>
          <PageHero
            tag="La 501 Sports"
            lead="Nuestro"
            accent="menú"
            description="Elige una categoría para ver sus platillos"
          />
          <View style={styles.cta}>
            <BrandButton
              title="Pedir a domicilio"
              variant="action"
              icon={{ ios: 'bicycle', android: 'delivery_dining', web: 'delivery_dining' }}
              onPress={() => router.navigate('/domicilio')}
            />
          </View>
        </View>
      }
      onOpen={(nombre) => router.push({ pathname: '/categoria/[nombre]', params: { nombre } })}
    />
  );
}

const styles = StyleSheet.create({
  cta: {
    paddingHorizontal: GRID_GUTTER,
    paddingTop: 16,
  },
});
