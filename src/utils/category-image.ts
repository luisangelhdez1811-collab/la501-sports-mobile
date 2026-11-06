// Products without their own photo get a generic Unsplash stock image from the backend.
const isStockPhoto = (url: string) => url.includes('images.unsplash.com');

/**
 * Photo for a category card, taken from its own dishes: prefers the restaurant's real
 * photos over generic stock ones, and available dishes over sold-out ones.
 */
export function categoryImage(products: { image: string | null; available: boolean }[]) {
  const withImage = products.filter((p): p is { image: string; available: boolean } => !!p.image);
  const own = withImage.filter((p) => !isStockPhoto(p.image));
  const pick = (list: typeof withImage) => list.find((p) => p.available) ?? list[0];
  return (pick(own) ?? pick(withImage))?.image ?? null;
}
