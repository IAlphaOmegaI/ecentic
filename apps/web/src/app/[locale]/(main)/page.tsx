import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { AsciiCommerceArtwork } from "@/components/marketing/ascii-artwork";
import { AsciiAtmosphere } from "@/components/marketing/ascii-atmosphere";
import {
  MarketingFaq,
  MarketingShell,
  marketingMetadata,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingScreenshot,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { integrationCounts } from "@/content/integrations";
import { ClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import {
  createSoftwareApplicationSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo";
import { IntegrationsPreview } from "./_components/enterprise/integrations-preview";
import { Journey } from "./_components/enterprise/journey";
import { Programs } from "./_components/enterprise/shared";
import { HeroVideo } from "./_components/hero-video";
import { SectionGutter } from "./dashboard/_components/grid";
import { EditorialArticles } from "./resources/_components/editorial-articles";
import { EditorialArticlesSkeleton } from "./resources/_components/skeletons";

export const generateMetadata = async () => {
  const { enterpriseHome } = await getMessages();
  return marketingMetadata(enterpriseHome.meta, "/");
};

export default async () => {
  const locale = await getLocale();
  const {
    enterpriseHome: copy,
    enterpriseIntegrations,
    pricing,
  } = await getMessages();
  const mechanismIcons = [
    CommerceChartActivity_2Icon,
    CommerceFileShieldIcon,
    CommerceFilePenIcon,
    CommercePlug_3SparkleIcon,
    CommerceBasketShoppingIcon,
    CommerceCode_3Icon,
  ];
  return (
    <ClientMessages scope="home">
      <MarketingShell>
        <JsonLd
          schemas={[
            organizationSchema,
            websiteSchema,
            createSoftwareApplicationSchema(pricing.schema.plans),
          ]}
        />
        <MarketingBand className="enterprise-blue enterprise-journey max-sm:[&_.marketing-eyebrow]:text-(length:--text-xs) m-6 overflow-hidden rounded-xl border-b-0 bg-[linear-gradient(100deg,var(--color-primary-text)_0%,var(--color-primary-text)_65%,var(--color-primary)_100%)] text-background-rich [--rail-color:color-mix(in_oklab,var(--color-background-rich)_28%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_62%,transparent)] max-sm:m-4 max-sm:rounded-lg max-[801px]:bg-none max-[801px]:bg-primary-text [&>.marketing-rail]:border-x-background-rich/15 [&>.marketing-rail]:border-y-0 [&_.marketing-actions>a+a]:border-background-rich/70 [&_.marketing-actions>a+a]:text-background-rich [&_.marketing-actions>a:first-child]:bg-background-rich [&_.marketing-actions>a:first-child]:text-primary-text max-sm:[&_.marketing-actions]:mt-[26px] max-sm:[&_.marketing-actions]:gap-3 max-sm:[&_.marketing-actions_a]:min-h-11 max-sm:[&_.marketing-actions_a]:px-3 max-sm:[&_.marketing-actions_a]:py-2.5 max-sm:[&_.marketing-actions_a]:text-[13px] [&_.marketing-cell]:flex [&_.marketing-cell]:min-h-[600px] [&_.marketing-cell]:items-center [&_.marketing-cell]:pt-[72px] [&_.marketing-cell]:pb-[60px] max-sm:[&_.marketing-cell]:min-h-0 max-sm:[&_.marketing-cell]:px-4 max-sm:[&_.marketing-cell]:pt-[46px] max-sm:[&_.marketing-cell]:pb-[38px] [&_.marketing-eyebrow]:text-background-rich max-sm:[&_.marketing-eyebrow]:mb-7 [&_h1]:max-w-[920px] [&_h1]:text-[clamp(3rem,5.2vw,4.8rem)] [&_h1]:text-background-rich [&_h1]:leading-[1.025] [&_h1]:tracking-[-0.043em] max-sm:[&_h1]:text-[43px] max-sm:[&_h1]:tracking-[-0.036em]">
          <AsciiAtmosphere className="enterprise-art pointer-events-none absolute inset-y-0 -right-[60px] left-[24%] text-background-rich opacity-40 [mask-image:linear-gradient(100deg,transparent_22%,black_90%)] max-sm:top-[150px] max-sm:-right-4 max-sm:left-0 max-sm:opacity-16 max-sm:[mask-image:linear-gradient(180deg,transparent,black)]">
            <AsciiCommerceArtwork />
          </AsciiAtmosphere>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <div className="enterprise-copy relative z-1">
              <MarketingEyebrow>{copy.hero.eyebrow}</MarketingEyebrow>
              <h1>{copy.hero.title}</h1>
              <p className="enterprise-description text-(length:--text-lg) max-sm:text-(length:--text-base) mt-7 max-w-[720px] leading-[1.55] max-sm:mt-6">
                {copy.hero.description}
              </p>
              <MarketingActions actions={copy.hero.actions} />
              {copy.hero.facts.map((fact) => (
                <p
                  key={fact}
                  className="enterprise-platforms max-sm:text-(length:--text-xs) mt-[22px] text-[13px] max-sm:max-w-[32ch]"
                >
                  {fact}
                </p>
              ))}
            </div>
          </div>
        </MarketingBand>
        <Journey copy={copy.loop} />
        <Programs copy={copy.programs} />
        <SectionGutter />
        <MarketingBand className="enterprise-businesses" id="solutions">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.businesses.eyebrow}</MarketingEyebrow>
            <h2>{copy.businesses.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.businesses.description}
            </p>
          </div>
          <div className="enterprise-business-grid [&_.marketing-item-link]:text-(length:--text-sm) grid grid-cols-4 border-[var(--rail-color)] border-t max-sm:grid-cols-1 max-[1001px]:grid-cols-2 max-sm:[&>article+article]:border-t [&>article:last-child]:border-r-0 max-[1001px]:[&>article:nth-child(2)]:border-r-0 max-[1001px]:[&>article:nth-child(n+3)]:border-t [&>article]:relative [&>article]:flex [&>article]:min-w-0 [&>article]:flex-col [&>article]:gap-5 [&>article]:border-[var(--rail-color)] [&>article]:border-r [&>article]:px-7 [&>article]:py-8 max-sm:[&>article]:border-r-0 max-sm:[&>article]:px-4 max-sm:[&>article]:py-7 [&_.marketing-item-link]:mt-3.5 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2.5 [&_.marketing-item-link]:text-primary-text [&_.marketing-note]:mt-0 [&_.marketing-note]:text-[13px] [&_h3]:text-[28px] max-sm:[&_h3]:text-[30px] [&_h4]:mt-auto [&_h4]:font-body [&_h4]:text-[13px] [&_h4]:tracking-normal [&_svg]:shrink-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-4 [&_ul]:text-[15px]">
            {copy.businesses.items.map((item, index) => (
              <article key={item.id}>
                <div className="enterprise-business-heading flex flex-col gap-5 [&>p]:font-medium [&>p]:text-[13px] [&>p]:text-primary-text">
                  <span className="enterprise-index font-heading text-[38px] text-primary-text leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p>{item.eyebrow}</p>
                </div>
                <h3>{item.title}</h3>
                <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
                  {item.description}
                </p>
                <h4>{copy.businesses.painLabel}</h4>
                <ul>
                  {item.pains.map((pain) => (
                    <li key={pain}>{pain}</li>
                  ))}
                </ul>
                <Link href={item.href} className="marketing-item-link">
                  {item.label}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </MarketingBand>
        <MarketingBand id="product" className="enterprise-product">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.loop.eyebrow}</MarketingEyebrow>
            <h2>{copy.loop.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.loop.description}
            </p>
            <MarketingScreenshot
              src={`/screenshots/enterprise-dashboard-sample${locale === "es" ? "-es" : ""}.png`}
              alt={copy.hero.screenshot.alt}
              caption={copy.hero.screenshot.caption}
            />
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingBand
          id="film"
          className="enterprise-film marketing-dark bg-band-start text-background-rich/82 [--rail-color:color-mix(in_oklab,var(--color-background-rich)_30%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [&>.marketing-rail]:bg-[linear-gradient(165deg,var(--color-band-start)_25%,var(--color-band-middle)_66%,var(--color-band-end))] [&_.marketing-actions>a+a]:border-background-rich/60 [&_.marketing-actions>a+a]:text-background-rich [&_.marketing-actions>a:first-child]:bg-background-rich [&_.marketing-actions>a:first-child]:text-foreground-rich [&_.marketing-eyebrow]:text-primary-rich [&_.marketing-screenshot_figcaption]:text-background-rich/82 [&_:is(h1,h2,h3)]:text-background-rich"
        >
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.film.eyebrow}</MarketingEyebrow>
            <h2>{copy.film.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.film.description}
            </p>
          </div>
          <div className="enterprise-film-player px-7 pb-12 max-sm:px-4 max-sm:pb-7 [&>button]:rounded-xs [&>button]:shadow-none">
            <HeroVideo />
          </div>
        </MarketingBand>
        <MarketingBand id="channels">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.channels.eyebrow}</MarketingEyebrow>
            <h2>{copy.channels.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.channels.description}
            </p>
          </div>
          <div className="enterprise-channel-grid grid grid-cols-3 border-[var(--rail-color)] border-b max-sm:grid-cols-1 max-[1001px]:grid-cols-2 max-[1001px]:[&>a:nth-child(2n)]:border-r-0 [&>a:nth-child(3n)]:border-r-0 max-sm:[&>a:nth-child(3n)]:border-r-0 max-[1001px]:[&>a:nth-child(3n)]:border-r [&>a>div]:mt-auto [&>a>div]:flex [&>a>div]:items-center [&>a>div]:justify-between [&>a>div]:gap-4 [&>a]:relative [&>a]:flex [&>a]:min-w-0 [&>a]:flex-col [&>a]:border-[var(--rail-color)] [&>a]:border-t [&>a]:border-r [&>a]:px-7 [&>a]:py-8 max-sm:[&>a]:border-r-0 max-sm:[&>a]:px-4 max-sm:[&>a]:py-7 [&_a:hover_.enterprise-channel-name]:text-primary-text [&_p]:mt-6 [&_p]:mb-8 [&_svg]:text-primary-text">
            {copy.channels.items.map((item) => {
              const channel = aiChannels.find(
                (channel) => channel.key === item.id,
              );
              return (
                <Link key={item.id} href={item.href}>
                  {channel && (
                    <ProviderLogo
                      provider={channel.key}
                      className="enterprise-channel-logo mb-7 size-12"
                    />
                  )}
                  <span className="enterprise-channel-name font-medium text-[28px] text-foreground-rich leading-[1.2]">
                    {item.title}
                  </span>
                  <p>{item.body}</p>
                  <div>
                    <MarketingStatus status={channel?.status ?? "soon"}>
                      {item.statusLabel}
                    </MarketingStatus>
                    <ArrowRightIcon aria-hidden className="size-5" />
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
              {copy.channels.checked}
            </p>
            <MarketingActions actions={[copy.channels.link]} />
          </div>
        </MarketingBand>
        <MarketingBand id="integrations">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.integration.eyebrow}</MarketingEyebrow>
            <h2>{copy.integration.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.integration.description}
            </p>
            <p className="enterprise-integration-count text-(length:--text-xl) max-sm:text-(length:--text-base) mt-7 text-foreground-rich [&>span]:mx-3 [&>span]:text-cross max-sm:[&>span]:mx-1">
              {integrationCounts.live} {copy.integration.counter.live}
              <span> / </span>
              {integrationCounts.feed} {copy.integration.counter.feed}
              <span> / </span>
              {integrationCounts.soon} {copy.integration.counter.soon}
            </p>
          </div>
          <IntegrationsPreview copy={enterpriseIntegrations} />
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingActions actions={copy.integration.links} />
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingBand id="capabilities">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.mechanisms.eyebrow}</MarketingEyebrow>
            <h2>{copy.mechanisms.title}</h2>
          </div>
          <div
            className="marketing-grid enterprise-mechanisms grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:mt-auto [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_.marketing-item-link]:pt-7 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_article]:flex [&_article]:flex-col [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4 [&_ul]:mt-[22px] [&_ul]:mb-6 [&_ul]:flex [&_ul]:flex-wrap [&_ul]:gap-x-6 [&_ul]:gap-y-2 [&_ul]:text-[13px] [&_ul]:text-foreground-dimmed"
            data-columns="3"
          >
            {copy.mechanisms.items.map((item, index) => {
              const Icon = mechanismIcons[index];
              return (
                <article key={item.id}>
                  {Icon && (
                    <Icon aria-hidden className="mb-8 size-10 text-primary" />
                  )}
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <ul>
                    {item.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                  <Link href={item.href} className="marketing-item-link">
                    {item.label}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </MarketingBand>
        <MarketingBand id="proof" className="enterprise-proof">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.proof.eyebrow}</MarketingEyebrow>
            <h2>{copy.proof.title}</h2>
          </div>
          <div className="enterprise-proof-grid [&_h3]:text-(length:--text-2xl) grid grid-cols-3 border-[var(--rail-color)] border-t max-sm:grid-cols-1 max-sm:[&>article+article]:border-t [&>article:last-child]:border-r-0 [&>article]:relative [&>article]:border-[var(--rail-color)] [&>article]:border-r [&>article]:px-7 [&>article]:py-10 max-sm:[&>article]:border-r-0 max-sm:[&>article]:px-4 max-sm:[&>article]:py-7 [&_article>p:last-child]:mt-5">
            {copy.proof.stats.map((stat) => (
              <article key={stat.value}>
                <p className="enterprise-stat [&_sup]:text-(length:--text-sm) mb-[38px] font-heading text-[clamp(3.25rem,5.4vw,5.5rem)] text-primary-text leading-none tracking-[-0.05em] max-sm:mb-7 max-sm:text-[68px] [&_sup]:relative [&_sup]:top-3 [&_sup]:ml-2 [&_sup]:align-top [&_sup]:font-body [&_sup]:tracking-normal">
                  {stat.value}
                  <sup>{stat.footnote}</sup>
                </p>
                <h3>{stat.title}</h3>
                <p>{stat.body}</p>
              </article>
            ))}
          </div>
          <div className="enterprise-finding grid grid-cols-[1fr_2fr] border-[var(--rail-color)] border-y bg-background max-sm:grid-cols-1 [&>div>p:first-child]:text-[22px] [&>div>p:first-child]:leading-normal max-sm:[&>div>p:first-child]:text-[19px] [&>div]:px-7 [&>div]:py-8 max-sm:[&>div]:px-4 max-sm:[&>div]:py-7 [&>h3]:border-[var(--rail-color)] [&>h3]:border-r [&>h3]:px-7 [&>h3]:py-8 [&>h3]:text-[26px] max-sm:[&>h3]:border-r-0 max-sm:[&>h3]:px-4 max-sm:[&>h3]:pt-7 max-sm:[&>h3]:pb-0 [&_.marketing-note]:text-foreground">
            <h3>{copy.proof.study.title}</h3>
            <div>
              <p>{copy.proof.study.body}</p>
              <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
                {copy.proof.study.note}
              </p>
            </div>
          </div>
          <div className="marketing-cell enterprise-footnotes relative min-w-0 px-7 py-14 py-7 text-[13px] max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch] [&_p+p]:mt-3">
            {copy.proof.footnotes.map((note) => (
              <p key={note.marker}>
                <sup>{note.marker}</sup> {note.text}
              </p>
            ))}
            <p>{copy.proof.pipeline}</p>
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingBand
          id="enterprise"
          className="marketing-dark enterprise-procurement text-background-rich/82 [--rail-color:color-mix(in_oklab,var(--color-background-rich)_30%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [&>.marketing-rail]:bg-[linear-gradient(165deg,var(--color-band-start)_25%,var(--color-band-middle)_66%,var(--color-band-end))] [&>.marketing-rail]:bg-band-start [&>.marketing-rail]:bg-none [&_.marketing-actions>a+a]:border-background-rich/60 [&_.marketing-actions>a+a]:text-background-rich [&_.marketing-actions>a:first-child]:bg-background-rich [&_.marketing-actions>a:first-child]:text-foreground-rich [&_.marketing-eyebrow]:text-primary-rich [&_.marketing-grid]:relative [&_.marketing-screenshot_figcaption]:text-background-rich/82 [&_:is(h1,h2,h3)]:text-background-rich"
        >
          <AsciiAtmosphere className="enterprise-procurement-art pointer-events-none absolute inset-0 text-background-rich opacity-8 [mask-image:linear-gradient(100deg,transparent,black)] max-sm:opacity-[0.035]">
            <AsciiCommerceArtwork />
          </AsciiAtmosphere>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.procurement.eyebrow}</MarketingEyebrow>
            <h2>{copy.procurement.title}</h2>
          </div>
          <div
            className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4"
            data-columns="4"
          >
            {copy.procurement.items.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingActions actions={copy.procurement.links} />
          </div>
        </MarketingBand>
        <MarketingBand id="pricing">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.pricing.eyebrow}</MarketingEyebrow>
            <h2>{copy.pricing.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.pricing.description}
            </p>
          </div>
          <div className="enterprise-pricing-paths border-[var(--rail-color)] border-b [&>a]:grid [&>a]:grid-cols-[68px_1fr_auto] [&>a]:items-center [&>a]:gap-7 [&>a]:border-[var(--rail-color)] [&>a]:border-t [&>a]:px-7 [&>a]:py-8 max-sm:[&>a]:grid-cols-[36px_1fr] max-sm:[&>a]:gap-[18px] max-sm:[&>a]:px-4 max-sm:[&>a]:py-7 max-[1001px]:[&>a]:grid-cols-[50px_1fr] [&_a:hover_h3]:text-primary-text [&_h3]:text-[28px] max-sm:[&_h3]:text-[25px] [&_p]:mt-3 [&_p]:max-w-[65ch]">
            {copy.pricing.items.map((item, index) => (
              <Link key={item.title} href={item.href}>
                <span className="enterprise-index font-heading text-[38px] text-primary-text leading-none">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <span className="enterprise-path-action text-(length:--text-sm) flex items-center gap-3.5 text-primary-text max-sm:text-[13px] max-[1001px]:col-start-2">
                  {item.label}
                  <ArrowRightIcon aria-hidden className="size-5" />
                </span>
              </Link>
            ))}
          </div>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingActions actions={[copy.pricing.action]} />
          </div>
        </MarketingBand>
        <MarketingBand id="resources">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingEyebrow>{copy.editorial.eyebrow}</MarketingEyebrow>
            <h2>{copy.editorial.title}</h2>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {copy.editorial.description}
            </p>
          </div>
          <Suspense
            fallback={
              <EditorialArticlesSkeleton label={copy.editorial.loading} />
            }
          >
            <EditorialArticles />
          </Suspense>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <MarketingActions actions={copy.editorial.links} />
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingFaq title={copy.faq.title} items={copy.faq.items} />
      </MarketingShell>
    </ClientMessages>
  );
};
