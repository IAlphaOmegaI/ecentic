import type { Metadata } from "next";
import { djb2Hash } from "next/dist/shared/lib/hash";
import {
  localeFromPathname,
  localizePath,
  stripLocalePrefix,
} from "@/i18n/locale";
import { routing } from "@/i18n/routing";

export const seo = {
  host: "https://ecentic.ai",
  name: "ecentic",
  title: "ecentic",
  description:
    "The AI commerce layer: fix the product data AI assistants read, get checkout ready for AI to buy, and keep up when their rules change.",
  definition:
    "ecentic is one layer between a brand's catalog and the AI assistants that sell it. It optimizes the data they read, gets checkout ready for them to buy, and changes with them when their rules change.",
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
 * The three founders, in the order the About page lists them. `url` is each
 * one's profile anchor on /about, so the page, the Organization schema and the
 * blog byline agree.
 */
export const founders = [
  {
    id: "xhurian-shaba",
    name: "Xhurian Shaba",
    url: absoluteUrl("/about#xhurian-shaba"),
    linkedin: "https://www.linkedin.com/in/xhuri",
  },
  {
    id: "alvi-palloshi",
    name: "Alvi Palloshi",
    url: absoluteUrl("/about#alvi-palloshi"),
    linkedin: "https://www.linkedin.com/in/alvipalloshi",
  },
  {
    id: "iseld-muca",
    name: "Iseld Muça",
    url: absoluteUrl("/about#iseld-muca"),
    linkedin: "https://www.linkedin.com/in/iseld-muca-532786311",
  },
] as const;

/** The CEO, who is the named author of the blog. */
export const founder = founders[0];

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
 * Public brand, confirmed operating entity and team. A registered-agent address
 * is not an operating office, so it is identified explicitly on the legal and
 * company pages rather than emitted as the Organization's general address.
 * The Albanian subsidiary address belongs only to About.
 */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: seo.name,
  legalName: "ecentic Inc",
  description: seo.definition,
  url: seo.host,
  logo: { "@type": "ImageObject", url: absoluteUrl("/images/trademark.svg") },
  founder: [
    {
      "@type": "Person",
      name: "Xhurian Shaba",
      jobTitle: "Chief executive officer",
      sameAs: "https://www.linkedin.com/in/xhurian-shaba",
    },
    {
      "@type": "Person",
      name: "Alvi Palloshi",
      jobTitle: "Chief technology officer",
      sameAs: "https://www.linkedin.com/in/alvipalloshi",
    },
    {
      "@type": "Person",
      name: "Iseld Muça",
      jobTitle: "Head of sales",
      sameAs: "https://www.linkedin.com/in/iseld-muca-532786311",
    },
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: absoluteUrl("/support"),
      availableLanguage: ["en"],
    },
    {
      "@type": "ContactPoint",
      contactType: "sales",
      url: absoluteUrl("/demo"),
      availableLanguage: ["en"],
    },
  ],
  sameAs: [
    "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
    "https://x.com/ecentic_ai",
  ],
} as const;

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: seo.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: seo.definition,
  url: seo.host,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "One-time free store check. No credit card required.",
  },
  publisher: {
    "@type": "Organization",
    name: seo.name,
    url: seo.host,
  },
} as const;

export const createSoftwareApplicationSchema = (
  input:
    | createSoftwareApplicationSchema.Props
    | readonly createSoftwareApplicationSchema.Plan[],
) => {
  const {
    plans,
    description = seo.definition,
    url = seo.host,
  } = "plans" in input ? input : { plans: input };
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
    description?: string;
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
  description: seo.definition,
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
  image,
  path,
  keywords = [],
  type = "website",
}: createMetadata.Props): Metadata => {
  // Hreflang lives in each page's head (and only there): the sitemap stays
  // namespace-free so browsers render it with the plain XML tree view.
  const basePath = stripLocalePrefix(path);
  const imageSection =
    [
      "/platform",
      "/solutions",
      "/ai-channels",
      "/integrations",
      "/pricing",
      "/resources",
      "/security",
      "/about",
      "/stories",
      "/partners",
      "/contact",
      "/tools",
      "/changelog",
      "/docs",
    ].find(
      (section) => basePath === section || basePath.startsWith(`${section}/`),
    ) ?? "";
  // Next metadata image routes inside a route group receive the same stable
  // suffix as the group path. A bare /platform/opengraph-image is not a route.
  const imageSuffix = djb2Hash(`/[locale]/(main)${imageSection}`)
    .toString(36)
    .slice(0, 6);
  // The proxy excludes root metadata image paths. Use the actual global EN
  // image there; its locale-prefixed group URL would normalize to a missing URL.
  const imageLocale = localeFromPathname(path);
  const imagePath =
    imageSection === "" && imageLocale === "en"
      ? "/opengraph-image"
      : `/${imageLocale}${imageSection}/opengraph-image-${imageSuffix}`;
  const socialImage = {
    url: absoluteUrl(typeof image === "string" ? image : imagePath),
    width: 1200,
    height: 630,
    alt: title,
  };

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
      ...(image === false ? {} : { images: [socialImage] }),
      url: absoluteUrl(path),
      siteName: seo.name,
      title: `${socialTitle} | ${seo.name}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      ...(image === false ? {} : { images: [socialImage] }),
      title: `${socialTitle} | ${seo.name}`,
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
    socialTitle?: string;
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
