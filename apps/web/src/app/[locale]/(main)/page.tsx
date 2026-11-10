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
import { type CSSProperties, Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
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
import "./_components/enterprise/home.css";

export const generateMetadata = async () => {
  const { enterpriseHome } = await getMessages();
  return marketingMetadata(enterpriseHome.meta, "/");
};

export default async function HomePage() {
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
        <MarketingBand className="enterprise-blue enterprise-journey">
          <AsciiAtmosphere className="enterprise-art" />
          <div className="marketing-cell">
            <div className="enterprise-copy">
              <MarketingEyebrow>{copy.hero.eyebrow}</MarketingEyebrow>
              <h1>{copy.hero.title}</h1>
              <p className="enterprise-description">{copy.hero.description}</p>
              <MarketingActions actions={copy.hero.actions} />
              {copy.hero.facts.map((fact) => (
                <p key={fact} className="enterprise-platforms">
                  {fact}
                </p>
              ))}
            </div>
          </div>
        </MarketingBand>
        <Journey copy={copy.loop} />
        <Programs copy={copy.programs} />
        <SectionGutter />
        <MarketingBand
          className="marketing-field enterprise-businesses"
          id="solutions"
        >
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.businesses.eyebrow}</MarketingEyebrow>
            <h2>{copy.businesses.title}</h2>
            <p className="marketing-lead">{copy.businesses.description}</p>
          </div>
          <div className="enterprise-business-grid">
            {copy.businesses.items.map((item, index) => (
              <article key={item.id}>
                <div className="enterprise-business-heading">
                  <span className="enterprise-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p>{item.eyebrow}</p>
                </div>
                <h3>{item.title}</h3>
                <p className="marketing-note">{item.description}</p>
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
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.loop.eyebrow}</MarketingEyebrow>
            <h2>{copy.loop.title}</h2>
            <p className="marketing-lead">{copy.loop.description}</p>
            <MarketingScreenshot
              src={`/screenshots/enterprise-dashboard-sample${locale === "es" ? "-es" : ""}.png`}
              alt={copy.hero.screenshot.alt}
              caption={copy.hero.screenshot.caption}
            />
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingBand id="film" className="enterprise-film marketing-dark">
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.film.eyebrow}</MarketingEyebrow>
            <h2>{copy.film.title}</h2>
            <p className="marketing-lead">{copy.film.description}</p>
          </div>
          <div className="enterprise-film-player">
            <HeroVideo />
          </div>
        </MarketingBand>
        <MarketingBand id="channels">
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.channels.eyebrow}</MarketingEyebrow>
            <h2>{copy.channels.title}</h2>
            <p className="marketing-lead">{copy.channels.description}</p>
          </div>
          <div className="enterprise-channel-grid">
            {copy.channels.items.map((item) => {
              const channel = aiChannels.find(
                (channel) => channel.key === item.id,
              );
              return (
                <Link key={item.id} href={item.href}>
                  {channel && (
                    <ProviderLogo
                      provider={channel.key}
                      className="enterprise-channel-logo"
                    />
                  )}
                  <span className="enterprise-channel-name">{item.title}</span>
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
          <div className="marketing-cell">
            <p className="marketing-note">{copy.channels.checked}</p>
            <MarketingActions actions={[copy.channels.link]} />
          </div>
        </MarketingBand>
        <MarketingBand id="integrations" className="marketing-field">
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.integration.eyebrow}</MarketingEyebrow>
            <h2>{copy.integration.title}</h2>
            <p className="marketing-lead">{copy.integration.description}</p>
            <p className="enterprise-integration-count">
              {integrationCounts.live} {copy.integration.counter.live}
              <span> / </span>
              {integrationCounts.feed} {copy.integration.counter.feed}
              <span> / </span>
              {integrationCounts.soon} {copy.integration.counter.soon}
            </p>
          </div>
          <IntegrationsPreview copy={enterpriseIntegrations} />
          <div className="marketing-cell">
            <MarketingActions actions={copy.integration.links} />
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingBand id="capabilities">
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.mechanisms.eyebrow}</MarketingEyebrow>
            <h2>{copy.mechanisms.title}</h2>
          </div>
          <div
            className="marketing-grid enterprise-mechanisms"
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
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.proof.eyebrow}</MarketingEyebrow>
            <h2>{copy.proof.title}</h2>
          </div>
          <div className="enterprise-proof-grid">
            {copy.proof.stats.map((stat) => (
              <article key={stat.value}>
                <p className="enterprise-stat">
                  {stat.value}
                  <sup>{stat.footnote}</sup>
                </p>
                <h3>{stat.title}</h3>
                <p>{stat.body}</p>
              </article>
            ))}
          </div>
          <div className="enterprise-finding">
            <h3>{copy.proof.study.title}</h3>
            <div>
              <p>{copy.proof.study.body}</p>
              <p className="marketing-note">{copy.proof.study.note}</p>
            </div>
          </div>
          <div className="marketing-cell enterprise-footnotes">
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
          className="marketing-dark enterprise-procurement"
        >
          <AsciiAtmosphere className="enterprise-procurement-art" />
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.procurement.eyebrow}</MarketingEyebrow>
            <h2>{copy.procurement.title}</h2>
          </div>
          <div
            className="marketing-grid"
            data-columns="4"
            style={{ "--columns": 4 } as CSSProperties}
          >
            {copy.procurement.items.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <div className="marketing-cell">
            <MarketingActions actions={copy.procurement.links} />
          </div>
        </MarketingBand>
        <MarketingBand id="pricing">
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.pricing.eyebrow}</MarketingEyebrow>
            <h2>{copy.pricing.title}</h2>
            <p className="marketing-lead">{copy.pricing.description}</p>
          </div>
          <div className="enterprise-pricing-paths">
            {copy.pricing.items.map((item, index) => (
              <Link key={item.title} href={item.href}>
                <span className="enterprise-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <span className="enterprise-path-action">
                  {item.label}
                  <ArrowRightIcon aria-hidden className="size-5" />
                </span>
              </Link>
            ))}
          </div>
          <div className="marketing-cell">
            <MarketingActions actions={[copy.pricing.action]} />
          </div>
        </MarketingBand>
        <MarketingBand id="resources" className="marketing-field">
          <div className="marketing-cell">
            <MarketingEyebrow>{copy.editorial.eyebrow}</MarketingEyebrow>
            <h2>{copy.editorial.title}</h2>
            <p className="marketing-lead">{copy.editorial.description}</p>
          </div>
          <Suspense
            fallback={
              <EditorialArticlesSkeleton label={copy.editorial.loading} />
            }
          >
            <EditorialArticles />
          </Suspense>
          <div className="marketing-cell">
            <MarketingActions actions={copy.editorial.links} />
          </div>
        </MarketingBand>
        <SectionGutter />
        <MarketingFaq title={copy.faq.title} items={copy.faq.items} />
      </MarketingShell>
    </ClientMessages>
  );
}
