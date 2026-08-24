import type { Metadata } from "next";
import { localizePath, stripLocalePrefix } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

export const seo = {
  host: "https://ecentic.ai",
  name: "ecentic",
  title: "ecentic",
  description:
    "Optimize product listings for AI shopping agents. Simulate ChatGPT, Claude, Gemini, and Perplexity decisions, diagnose losses, and improve win rate.",
  links: [
    "https://x.com/ecentic_ai",
    "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
    "https://www.instagram.com/ecentic.ai/",
  ],
} as const;

export const absoluteUrl = (path = "/") => new URL(path, seo.host).toString();

/**
 * The `"%s | ecentic"` template in the locale layout costs 10 characters, which
 * pushes any headline over ~50 past the ~60 Google renders — the suffix is then
 * the first thing clipped, so it buys nothing and costs the tail of the title.
 * Keep the brand only while the whole tag survives the cut.
 */
const TITLE_LIMIT = 60;
const BRAND_SUFFIX = ` | ${seo.name}`;

export const brandedTitle = (title: string) =>
  title.length + BRAND_SUFFIX.length <= TITLE_LIMIT
    ? `${title}${BRAND_SUFFIX}`
    : title;

/**
 * Organization schema.
 *
 * `contactPoint` and `address` are here because verification tooling reads them
 * to decide whether a business is real, and an Organization node without either
 * scores as an unverifiable claim. `address` is the registered business address
 * of zennit, the company behind ecentic, and matches the one published in the
 * terms — tooling that cross-checks structured data against page content needs
 * to find the same address in both places. No postal code is published for it,
 * so none is invented — a fabricated component is worse than an absent one.
 */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: seo.name,
  url: seo.host,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icons/icon-512.png"),
  },
  email: "support@ecentic.ai",
  parentOrganization: {
    "@type": "Organization",
    name: "zennit",
    url: "https://www.zennit.dev",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "Pallatet Merkaj, Hyrja 1, Dera 12, Rruga Muhamed Deliu, Qesarakë",
    addressLocality: "Tiranë",
    addressCountry: "AL",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@ecentic.ai",
      url: absoluteUrl("/support"),
      availableLanguage: ["en", "es"],
      areaServed: "Worldwide",
    },
    {
      "@type": "ContactPoint",
      contactType: "technical support",
      email: "support@ecentic.ai",
      url: absoluteUrl("/docs"),
      availableLanguage: ["en"],
      areaServed: "Worldwide",
    },
    {
      "@type": "ContactPoint",
      contactType: "privacy",
      email: "privacy@ecentic.ai",
      url: absoluteUrl("/privacy-policy"),
      availableLanguage: ["en", "es"],
      areaServed: "Worldwide",
    },
    {
      "@type": "ContactPoint",
      contactType: "legal",
      email: "legal@ecentic.ai",
      url: absoluteUrl("/terms"),
      availableLanguage: ["en", "es"],
      areaServed: "Worldwide",
    },
  ],
  sameAs: [...seo.links],
} as const;

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: seo.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: seo.description,
  url: seo.host,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Scan plan available",
  },
  publisher: {
    "@type": "Organization",
    name: seo.name,
    url: seo.host,
  },
} as const;

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: seo.name,
  url: seo.host,
  description: seo.description,
  publisher: {
    "@type": "Organization",
    name: seo.name,
    url: seo.host,
  },
} as const;

export const createMetadata = ({
  title,
  description,
  path,
  keywords = [],
  type = "website",
}: createMetadata.Props): Metadata => {
  // Hreflang lives in each page's head (and only there): the sitemap stays
  // namespace-free so browsers render it with the plain XML tree view.
  const basePath = stripLocalePrefix(path);

  return {
    title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(
          routing.locales.map((locale) => [
            locale,
            localizePath(basePath, locale),
          ]),
        ),
        "x-default": basePath,
      },
    },
    openGraph: {
      type,
      url: absoluteUrl(path),
      siteName: seo.name,
      title: `${title} | ${seo.name}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${seo.name}`,
      description,
    },
  };
};

export namespace createMetadata {
  export type Props = {
    title: string;
    description: string;
    path: string;
    keywords?: readonly string[];
    type?: "article" | "website";
  };
}

export const createBreadcrumbSchema = (
  items: readonly createBreadcrumbSchema.Item[],
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export namespace createBreadcrumbSchema {
  export type Item = {
    name: string;
    path: string;
  };
}

/**
 * Blog answers are stored in the same lightweight markup the editorial renderer
 * accepts (`**bold**`, `[label](href)`), so the raw string would put syntax
 * characters in front of whatever quotes the answer. Structured data carries the
 * prose alone; the page keeps the links.
 */
const withoutInlineMarkup = (value: string) =>
  value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export const createFaqSchema = (items: readonly createFaqSchema.Item[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: withoutInlineMarkup(item.question),
    acceptedAnswer: {
      "@type": "Answer",
      text: withoutInlineMarkup(item.answer),
    },
  })),
});

export namespace createFaqSchema {
  export type Item = {
    question: string;
    answer: string;
  };
}
