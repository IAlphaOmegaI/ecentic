import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { MarketingQuestions } from "@/components/marketing/faq";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { MarketingFeatureBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { PlaygroundClient } from "@/components/ucp-playground/playground-client";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import { ANONYMOUS_MESSAGE_LIMIT } from "@/server/app/intelligence/ucp/playground-limit";
import { ContentPageLayout } from "../_components/content";
import { PlaygroundGuide } from "./_components/playground-guide";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("ucpPlayground");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/ucp-playground", locale),
    keywords: [
      "UCP playground",
      "Universal Commerce Protocol",
      "AI shopping agent",
      "agentic commerce sandbox",
      "MCP commerce",
      "agentic checkout",
      "free UCP tool",
    ],
  });
};

const PlaygroundSkeleton = () => (
  <div className="flex min-h-[580px] flex-1 items-center justify-center p-8 max-sm:min-h-[520px]">
    <div className="w-full max-w-md space-y-3">
      <div className="mx-auto h-4 w-40 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
    </div>
  </div>
);

const MeteredPlayground = async () => {
  // Same deferral as `readSession` in server/utils/authentication.ts: Better
  // Auth's session check reads the clock, which trips the sync-IO validator
  // when it runs in the runtime-prefetch stage. `connection()` holds this
  // subtree for the dynamic render, where clock reads are allowed.
  await connection();

  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <PlaygroundClient
      appearance="workbench"
      messageLimit={session ? undefined : ANONYMOUS_MESSAGE_LIMIT}
    />
  );
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("ucpPlayground");
  const messages = await getMessages();
  const description = translate("meta.description");
  const limit = String(ANONYMOUS_MESSAGE_LIMIT);
  const faq = messages.ucpPlayground.faq.items.map((item) => ({
    question: item.question,
    answer: item.answer.replaceAll("{limit}", limit),
  }));
  const capabilities = messages.ucpPlayground.capabilities;
  const copy = messages.playgroundPage;
  const pagePath = localizePath("/ucp-playground", locale);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: translate("structuredData.name"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl(pagePath),
      description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      {
        name: translate("breadcrumb.home"),
        path: localizePath("/", locale),
      },
      { name: translate("breadcrumb.page"), path: pagePath },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      compact
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      description={description}
      actions={
        <Button color="primary" render={<Link href="#playground-session" />}>
          {copy.guide.action.primary}
          <ArrowRightIcon className="size-4" />
        </Button>
      }
    >
      <JsonLd schemas={structuredData} />

      <section className="relative w-full border-accent-foreground border-b">
        <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="relative px-8 py-10 max-sm:px-4 max-sm:py-8">
            <h2 className="max-w-2xl text-foreground-rich">
              {translate("demo.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg max-sm:text-base">
              {translate("demo.description", { limit })}
            </p>
          </div>
        </div>
      </section>

      <MarketingFeatureBand
        tone="dark"
        className="[&>.marketing-rail]:border-background-rich/15 [&>.marketing-rail]:border-x"
      >
        <div className="relative grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] border-background-rich/15 border-y max-md:grid-cols-1">
          <MarketingEdgeCrosses />
          <MarketingEdgeCrosses edge="bottom" />
          <div
            id="playground-session"
            className="flex min-h-0 min-w-0 scroll-mt-24 flex-col border-background-rich/15 border-r bg-emphasis-dimmed max-md:border-r-0 max-md:border-b"
          >
            <div className="shrink-0 border-background-rich/15 border-b bg-linear-to-r from-primary/15 to-transparent px-8 py-6 max-sm:px-4">
              <h3 className="text-background-rich text-xl">
                {copy.session.title}
              </h3>
              <p className="mt-2 text-background-rich/65 text-sm">
                {copy.session.description}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <Suspense fallback={<PlaygroundSkeleton />}>
                <MeteredPlayground />
              </Suspense>
            </div>
          </div>
          <PlaygroundGuide copy={copy.guide} capabilities={capabilities} />
        </div>
      </MarketingFeatureBand>

      <section className="relative w-full border-accent-foreground border-b">
        <div className="relative mx-auto grid w-[min(1186px,calc(100%-56px))] grid-cols-[1fr_2fr] border-accent-foreground border-x max-sm:w-[calc(100%-32px)] max-md:grid-cols-1">
          <div className="border-accent-foreground border-r px-8 py-10 max-sm:px-4 max-sm:py-8 max-md:border-r-0 max-md:border-b">
            <h2>{copy.faq.title}</h2>
          </div>
          <MarketingQuestions items={faq} />
        </div>
      </section>
    </ContentPageLayout>
  );
};
