/** Resolve retired editorial asset paths without changing stored posts. */
export const blogImage = (source: string) => {
  switch (source) {
    case "/images/blog/ai-economy-commerce.jpg":
      return "/images/blog/ai-economy-commerce.webp";
    case "/images/blog/yc-techstars-deals.jpg":
      return "/images/blog/yc-techstars-deals.webp";
    case "/blog/product-page-optimization-for-ai-search.webp":
      return "/images/blog/ecommerce-seo.jpg";
    case "/images/eu-flag.gif":
      return "/images/eu-flag.webp";
    default:
      return source;
  }
};
