import { router } from 'expo-router';

import { PageHero } from '@/components/brand/page-hero';
import { CategoryGridScreen } from '@/components/menu/category-grid-screen';
import { CART_BAR_HEIGHT, CartBar } from '@/components/order/cart-bar';
import { useCart } from '@/hooks/use-cart';

/** "Arma tu pedido": same category cards as the menu, but dishes can be added to the order. */
export default function DeliveryScreen() {
  const cart = useCart();

  return (
    <CategoryGridScreen
      hero={
        <PageHero
          tag="La 501 Sports · A domicilio"
          lead="Arma tu"
          accent="pedido"
          description="Elige una categoría y agrega tus platillos favoritos"
        />
      }
      onOpen={(categoria) => router.push({ pathname: '/domicilio/[categoria]', params: { categoria } })}
      bottomInset={cart.count > 0 ? CART_BAR_HEIGHT : 0}
      overlay={<CartBar />}
    />
  );
}
