/** Keep every bulk publishing candidate within the requested merchant scope. */
export const scopeOptimizationProducts = <
  Product extends { userId: string; storeId: string },
>(
  products: Product[],
  user: string,
  store?: string,
) =>
  products.filter(
    (product) =>
      product.userId === user && (!store || product.storeId === store),
  );
