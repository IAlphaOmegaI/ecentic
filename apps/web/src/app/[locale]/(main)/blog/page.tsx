import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { localizePath } from "@/i18n/locale";
import { createMetadata } from "@/lib/seo";
import { BlogArtwork } from "./_components/blog-artwork";
import {
  BlogIndexContent,
  BlogIndexSkeleton,
} from "./_components/blog-index-content";
import { EditorialFooter, EditorialLayout } from "./_components/editorial-page";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("blog");

  // `blog.title` / `blog.description` stay the visible H1 and standfirst (and
  // the nav/breadcrumb label), so the search-facing copy lives in its own
  // `meta` keys. The string here is unbranded: the locale layout's
  // `"%s | ecentic"` template supplies the suffix, exactly as `brandedTitle`
  // would for a title this short.
  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/blog", locale),
    keywords: [
      "ecommerce SEO 2026",
      "AI shopping agents",
      "merchant listings",
      "structured data ecommerce",
      "ecommerce blog",
    ],
  });
};

export default async () => {
  const [translate, messages] = await Promise.all([
    getTranslations("blog"),
    getMessages(),
  ]);

  return (
    <EditorialLayout
      eyebrow={translate("title")}
      title={translate("title")}
      description={translate("description")}
      illustration={<BlogArtwork />}
    >
      <Suspense
        fallback={<BlogIndexSkeleton label={messages.blogIndexPage.loading} />}
      >
        <BlogIndexContent />
      </Suspense>
      <EditorialFooter
        primary={{ href: "/sign-up", label: translate("action.tertiary") }}
        secondary={{ href: "/", label: translate("action.quaternary") }}
        note={translate("description")}
      />
    </EditorialLayout>
  );
};
