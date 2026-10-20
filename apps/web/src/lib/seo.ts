import type { Metadata } from "next";
import { localizePath, stripLocalePrefix } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

export const seo = {
  host: "https://ecentic.ai",
  name: "ecentic",
  title: "ecentic",
  description:
    "Get the sale when AI does the shopping. ecentic shows which products ChatGPT, Claude, Gemini and Perplexity skip, fixes the listings, and tracks the AI-agent visits and sales that follow.",
  links: [
    "https://x.com/ecentic_ai",
    "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
    "https://www.instagram.com/ecentic.ai/",
  ],
  /** Where a Shopify merchant installs the app — the verified connect. */
  shopifyAppStore: "https://apps.shopify.com/ecentic-ai",
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
 * The legal entity behind ecentic, exactly as registered. The footer, the
 * About page and the Organization schema all read it from here: tooling that
 * cross-checks a business (NAP consistency) needs the same name, address and
 * phone in the page text and in the structured data.
 */
export const company = {
  legalName: "ECENTIC ShPK",
  // Albanian tax identification number (NIPT).
  taxId: "M61628008M",
  telephone: "+355 68 459 4667",
  email: "support@ecentic.ai",
  address: {
    streetAddress:
      "Pallatet Merkaj, Hyrja 1, Dera 12, Rruga Muhamed Deliu, Qesarakë",
    postalCode: "1030",
    addressLocality: "Tiranë",
    addressCountry: "AL",
  },
} as const;

/**
 * The named author of the blog and the person on the About page. `url` is the
 * profile anchor on /about, so a byline, the Person node and the page agree.
 */
export const founder = {
  name: "Xhurian Shaba",
  url: absoluteUrl("/about#xhurian-shaba"),
  linkedin: "https://www.linkedin.com/in/xhurian-shaba",
} as const;

/** Schema.org `Person` for the founder; `jobTitle` is the page's language. */
export const createFounderSchema = (jobTitle: string) => ({
  "@type": "Person",
  name: founder.name,
  jobTitle,
  url: founder.url,
  sameAs: [founder.linkedin],
  worksFor: { "@type": "Organization", name: seo.name, url: seo.host },
});

/**
 * Organization schema.
 *
 * `contactPoint` and `address` are here because verification tooling reads them
 * to decide whether a business is real, and an Organization node without either
 * scores as an unverifiable claim. Every company field comes from `company`,
 * which the footer and the About page render as visible text.
 */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: seo.name,
  // Searchers and answer engines spell the brand three ways; naming all of
  // them lets each resolve to this one entity.
  alternateName: ["écentic", "ecentic.ai"],
  legalName: company.legalName,
  taxID: company.taxId,
  url: seo.host,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icons/icon-512.png"),
  },
  email: company.email,
  telephone: company.telephone,
  foundingDate: "2026",
  founder: {
    "@type": "Person",
    name: founder.name,
    url: founder.url,
    sameAs: [founder.linkedin],
  },
  parentOrganization: {
    "@type": "Organization",
    name: "zennit",
    url: "https://www.zennit.dev",
  },
  address: {
    "@type": "PostalAddress",
    ...company.address,
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

/**
 * SoftwareApplication schema, priced from the pricing page's own plan list
 * (`pricing.schema.plans`) so no figure is restated here. `lowPrice` and
 * `highPrice` are the cheapest and dearest listed prices — the free Scan and
 * Dominate today — and `offerCount` counts every listed plan, Enterprise's
 * custom price included, though only priced plans become `Offer` nodes.
 */
export const createSoftwareApplicationSchema = ({
  plans,
  description = seo.description,
  url = seo.host,
}: createSoftwareApplicationSchema.Props) => {
  const priced = plans.filter((plan) => Number.isFinite(Number(plan.price)));
  const byPrice = [...priced].sort(
    (left, right) => Number(left.price) - Number(right.price),
  );

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: seo.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: byPrice[0]?.price,
      highPrice: byPrice.at(-1)?.price,
      offerCount: plans.length,
      offers: priced.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.price,
        priceCurrency: "USD",
        description: plan.description,
        url,
      })),
    },
    publisher: {
      "@type": "Organization",
      name: seo.name,
      url: seo.host,
    },
  };
};

export namespace createSoftwareApplicationSchema {
  export type Plan = {
    name: string;
    /** A number as a string ("14.90"), or a word ("Custom") for unpriced. */
    price: string;
    description: string;
  };

  export type Props = {
    plans: readonly Plan[];
    description?: string;
    url?: string;
  };
}

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
  socialTitle = title,
  path,
  keywords = [],
  type = "website",
  image = "/opengraph-image",
}: createMetadata.Props): Metadata => {
  // Hreflang lives in each page's head (and only there): the sitemap stays
  // namespace-free so browsers render it with the plain XML tree view.
  const basePath = stripLocalePrefix(path);
  // Page-level openGraph/twitter objects replace inherited ones. Supply the
  // public brand image unless this page delegates to its own image route.
  const images = image
    ? [
        {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: "ecentic: Get the sale when AI does the shopping",
        },
      ]
    : undefined;

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
      title: `${socialTitle} | ${seo.name}`,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${socialTitle} | ${seo.name}`,
      description,
      ...(images ? { images } : {}),
    },
  };
};

export namespace createMetadata {
  export type Props = {
    title: string;
    description: string;
    /**
     * The headline for link previews (`og:title`, `twitter:title`) when it
     * should differ from the search `<title>`. Defaults to `title`.
     */
    socialTitle?: string;
    path: string;
    keywords?: readonly string[];
    type?: "article" | "website";
    /** false leaves images unset so Next.js can attach a colocated image file. */
    image?: string | false;
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
