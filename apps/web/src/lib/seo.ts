import type { Metadata } from "next";

export const seo = {
  host: "https://ecentic.ai",
  name: "écentic",
  title: "écentic",
  image: "/images/opengraph.png",
  description:
    "Optimize product listings for AI shopping agents. Simulate GPT-4, Claude, Gemini, and Perplexity decisions, diagnose losses, and improve win rate.",
  links: [
    "https://x.com/ecentic_ai",
    "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
    "https://www.instagram.com/ecentic.ai/",
  ],
} as const;

export const absoluteUrl = (path = "/") => new URL(path, seo.host).toString();

export const createOgImageUrl = ({
  title,
  eyebrow,
  description,
}: createOgImageUrl.Props) => {
  const params = new URLSearchParams({ title });
  if (eyebrow) params.set("eyebrow", eyebrow);
  if (description) params.set("description", description);
  return `/api/og?${params.toString()}`;
};

export namespace createOgImageUrl {
  export type Props = {
    title: string;
    eyebrow?: string;
    description?: string;
  };
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: seo.name,
  url: seo.host,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icons/icon-512.png"),
  },
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
  eyebrow,
  ogTitle,
  ogDescription,
}: createMetadata.Props): Metadata => {
  const image = createOgImageUrl({
    title: ogTitle ?? title,
    eyebrow,
    description: ogDescription ?? description,
  });

  return {
    title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      url: absoluteUrl(path),
      siteName: seo.name,
      title: `${title} | ${seo.name}`,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${seo.name}`,
      description,
      images: [image],
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
    eyebrow?: string;
    ogTitle?: string;
    ogDescription?: string;
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

export const createFaqSchema = (items: readonly createFaqSchema.Item[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});

export namespace createFaqSchema {
  export type Item = {
    question: string;
    answer: string;
  };
}
