/** Resolve retired editorial asset paths without changing stored posts. */
export const blogImage = (source: string) => {
  switch (source) {
    case "/blog/product-page-optimization-for-ai-search.webp":
      return "/images/blog/ecommerce-seo.jpg";
    case "/images/eu-flag.gif":
      return "/images/eu-flag.webp";
    default:
      return source;
  }
};
