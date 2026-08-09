import {
  ArrowRightIcon,
  BarChartIcon,
  BellIcon,
  CheckIcon,
  CircleBoltIcon,
  FaceSearchIcon,
  PhoneIcon,
  RobotIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { BookCall } from "@/components/cal";
import { JsonLd } from "@/components/json-ld";
import { Plus } from "@/components/plus";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/headset.png";
import { ContentPageFooter, ContentPageLayout } from "../_components/content";

type SupportPageProps = {
  params: Promise<{ locale: string }>;
};

const channelIcons = {
  email: BellIcon,
  walkthrough: PhoneIcon,
  enterprise: CircleBoltIcon,
} as const;

const selfServeIcons = {
  "/how-it-works": RobotIcon,
  "/features": BarChartIcon,
  "/pricing": FaceSearchIcon,
  "/privacy-policy": CheckIcon,
} as const;

export const generateMetadata = async ({
  params,
}: SupportPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "support" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/support", locale),
    keywords: [
      "ecentic support",
      "ecentic help",
      "contact ecentic",
      "AI ecommerce support",
    ],
  });
};

export default async ({ params }: SupportPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "support" });
  const description = translate("meta.description");
  const assurances = translate.raw("hero.assurances") as readonly string[];
  const channels = translate.raw("channels.items") as readonly {
    id: keyof typeof channelIcons;
    title: string;
    description: string;
    highlighted: boolean;
    action: { primary: string };
  }[];
  const selfServe = translate.raw("selfServe.items") as readonly {
    href: keyof typeof selfServeIcons;
    name: string;
    title: string;
    description: string;
    label: string;
  }[];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: translate("breadcrumb.support"),
      description,
      url: absoluteUrl(localizePath("/support", locale)),
      isPartOf: absoluteUrl(localizePath("/", locale)),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.support"),
        path: localizePath("/support", locale),
      },
    ]),
  ];

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      description={translate("hero.description")}
      assurances={assurances}
      art={{ source: Art, alt: translate("hero.art.alt") }}
    >
      <JsonLd schemas={structuredData} />

      <section className="border-accent-foreground border-b">
        <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="p-6 md:p-12">
            <span className="font-normal text-3xl text-primary">
              {translate("channels.number")}
            </span>
            <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("channels.title")}
            </h2>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("channels.description")}
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
            <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
            {channels.map((channel) => {
              const IconComponent = channelIcons[channel.id];

              return (
                <div
                  key={channel.id}
                  className={
                    channel.highlighted
                      ? "flex flex-col gap-2 bg-primary p-6 text-white md:p-8"
                      : "flex flex-col gap-2 bg-background-rich p-6 md:p-8"
                  }
                >
                  <IconComponent
                    className={
                      channel.highlighted
                        ? "size-8 text-white"
                        : "size-8 text-primary"
                    }
                  />
                  <h3 className="mt-2 font-body font-medium text-2xl">
                    {channel.title}
                  </h3>
                  <p
                    className={
                      channel.highlighted
                        ? "font-body font-light text-white"
                        : "font-body font-light text-foreground-dimmed"
                    }
                  >
                    {channel.description}
                  </p>
                  <div className="mt-6 md:mt-auto">
                    {channel.id === "email" && (
                      <Button
                        color="accent"
                        className="w-fit"
                        render={<Link href="mailto:support@ecentic.ai" />}
                      >
                        {channel.action.primary}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    )}
                    {channel.id === "walkthrough" && (
                      <BookCall color="primary" className="w-fit">
                        {channel.action.primary}
                        <ArrowRightIcon className="size-4" />
                      </BookCall>
                    )}
                    {channel.id === "enterprise" && (
                      <Button
                        color="primary"
                        className="w-fit"
                        render={<Link href="/enterprise" />}
                      >
                        {channel.action.primary}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-accent-foreground border-b">
        <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="p-6 md:p-12">
            <span className="font-normal text-3xl text-primary">
              {translate("selfServe.number")}
            </span>
            <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("selfServe.title")}
            </h2>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("selfServe.description")}
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
            <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
            {selfServe.map((entry) => {
              const IconComponent = selfServeIcons[entry.href];

              return (
                <article
                  key={entry.href}
                  className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
                >
                  <IconComponent
                    aria-label={entry.name}
                    className="size-7 text-primary"
                  />
                  <div className="flex flex-1 flex-col gap-3">
                    <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                      {entry.title}
                    </h3>
                    <p className="font-light text-foreground-dimmed leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                  <Button
                    color="accent"
                    className="w-fit"
                    render={<Link href={entry.href} />}
                  >
                    {entry.label}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <ContentPageFooter
        primary={{
          href: "/sign-up",
          label: translate("footer.action.primary"),
        }}
        secondary={{
          href: "/",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
