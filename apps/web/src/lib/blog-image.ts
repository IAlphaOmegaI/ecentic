/** Replace the known missing editorial thumbnail without changing stored posts. */
export const blogImage = (source: string) =>
  source === "/blog/product-page-optimization-for-ai-search.webp"
    ? "/images/blog/ecommerce-seo.jpg"
    : source;
