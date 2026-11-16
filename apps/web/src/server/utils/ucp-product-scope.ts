/** Bulk structured-data generation follows the merchant and optional store scope. */
export const selectUcpGenerationProducts = <
  Product extends { userId: string; storeId: string },
>(
  products: Product[],
  user: string,
  store?: string,
) =>
  products.filter(
    (product) =>
      product.userId === user &&
      (store === undefined || product.storeId === store),
  );
