import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { Plus } from "@/components/plus";
import { PlaygroundClient } from "@/components/ucp-playground/playground-client";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/robot.png";
import { ANONYMOUS_MESSAGE_LIMIT } from "@/server/app/intelligence/ucp/playground-limit";
import { ContentPageLayout } from "../_components/content";

type UcpPlaygroundPageProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: UcpPlaygroundPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({
    locale,
    namespace: "ucpPlayground",
  });

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
  <div className="flex flex-1 items-center justify-center p-8">
    <div className="w-full max-w-md space-y-3">
      <div className="mx-auto h-4 w-40 animate-pulse bg-accent-foreground/30" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/20" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/30" />
    </div>
  </div>
);

const MeteredPlayground = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <PlaygroundClient
      messageLimit={session ? undefined : ANONYMOUS_MESSAGE_LIMIT}
    />
  );
};

export default async ({ params }: UcpPlaygroundPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;

  const translate = await getTranslations({
    locale,
    namespace: "ucpPlayground",
  });
  const messages = await getMessages();
  const description = translate("meta.description");
  const limit = String(ANONYMOUS_MESSAGE_LIMIT);
  const faq = messages.ucpPlayground.faq.items.map((item) => ({
    question: item.question,
    answer: item.answer.replaceAll("{limit}", limit),
  }));
  const capabilities = messages.ucpPlayground.capabilities;
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

  const demoTitleParts = translate("demo.titleLineBreak").split("<br />");

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      description={description}
      art={{ source: Art, alt: translate("hero.art.alt") }}
    >
      <JsonLd schemas={structuredData} />

      <section className="relative -left-[calc(50vw-50%)] w-screen">
        <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="relative border-accent-foreground p-6 md:p-12">
            <h2 className="font-body text-3xl text-foreground md:text-5xl">
              {demoTitleParts[0]}
              <br />
              {demoTitleParts[1]}
            </h2>
            <p className="mt-4 max-w-xl font-light text-foreground-dimmed text-lg">
              {translate("demo.description", { limit })}
            </p>
          </div>

          <div className="relative border-accent-foreground border-t">
            <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
            <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-3 md:divide-x md:divide-y-0">
              {capabilities.map((capability) => (
                <div
                  key={capability.title}
                  className="flex flex-col bg-background-rich p-6 md:p-8"
                >
                  <p className="font-medium text-foreground">
                    {capability.title}
                  </p>
                  <p className="mt-2 font-light text-foreground-dimmed text-sm leading-relaxed">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative -left-[calc(50vw-50%)] w-screen">
        <div className="relative mx-auto flex h-[720px] max-w-6xl border-accent-foreground border-x border-b bg-background-rich">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<PlaygroundSkeleton />}>
            <MeteredPlayground />
          </Suspense>
        </div>
      </section>
    </ContentPageLayout>
  );
};
