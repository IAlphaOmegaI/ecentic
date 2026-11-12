import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import type { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { fonts } from "@/components/marketing/fonts";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { absoluteUrl, createMetadata } from "@/lib/seo";
import { MarketingQuestions } from "./faq";
import { MarketingLightBand } from "./light-band";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingHeading,
  MarketingHero,
  MarketingStatus,
} from "./primitives";
import { TrackingOverview } from "./tracking-overview";

const heroSubjects: Record<string, MarketingHero.Props["figure"]> = {
  "/partners": "hub",
  "/solutions/brands": "catalog",
  "/solutions/retailers-and-marketplaces": "checkout",
  "/solutions/enterprise": "relay",
  "/solutions/agencies-and-partners": "hub",
  "/solutions/sectors/home-and-furniture": "sofa",
  "/solutions/sectors/consumer-electronics": "headphones",
  "/solutions/sectors/beauty-and-personal-care": "lipstick",
  "/solutions/sectors/health-wellness-and-pet": "wellnessBottle",
  "/solutions/sectors/food-and-beverage": "packagedFood",
  "/solutions/sectors/wine-and-spirits": "wineBottle",
  "/solutions/sectors/fashion-and-outdoor": "sneaker",
  "/solutions/sectors/travel-and-experiences": "suitcase",
  "/integrations/shopify": "shopifyBag",
  "/integrations/woocommerce": "wooMark",
  "/integrations/google-merchant-center": "merchantFolio",
  "/integrations/product-feeds": "format",
  "/platform/connect": "documentStack",
  "/platform/simulate": "shoppingBot",
  "/platform/fix": "format",
  "/platform/sell": "checkout",
  "/platform/track": "workflow",
  "/stories": "catalog",
  "/stories/dua-flavours": "catalog",
  "/changelog": "document",
  "/contact": "hub",
  "/support": "document",
  "/demo": "inspection",
};

export const marketingMetadata = async (
  meta: { title: string; description: string },
  path: string,
): Promise<Metadata> => {
  const locale = await getLocale();
  const metadata = createMetadata({
    ...meta,
    path: localizePath(path, locale),
  });
  return { ...metadata, title: { absolute: meta.title } };
};

export const MarketingShell = async ({ children }: MarketingShell.Props) => {
  const { enterpriseChrome } = await getMessages();
  return (
    <div
      className={cn(
        "marketing-grid-pattern marketing-site text-(length:--text-base) bg-background font-body text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] [overflow-anchor:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:is(.marketing-dark,.bg-primary,.bg-primary-text)_:is(a,button,input,select,textarea):focus-visible]:outline-background-rich [&_:is(a,button,input,select,textarea):focus-visible]:outline-solid [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-md [&_:where(input,textarea,select,[role=combobox])]:rounded-md [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]",
        fonts,
      )}
    >
      <a
        className="marketing-skip fixed top-2 left-4 z-100 -translate-y-[200%] bg-background px-4 py-2 text-foreground-rich focus:translate-y-0"
        href="#main-content"
      >
        {enterpriseChrome.skip}
      </a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
};

export const MarketingFaq = ({ title, items }: MarketingFaq.Props) => {
  const visibleItems = items.filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  if (visibleItems.length === 0) return null;

  return (
    <MarketingBand>
      <JsonLd
        schemas={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: visibleItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]}
      />
      <div className="marketing-faq grid grid-cols-[1fr_2fr] max-[801px]:grid-cols-1">
        <div className="relative min-w-0 border-[var(--rail-color)] border-r px-7 py-12 max-sm:px-4 max-[801px]:border-r-0 max-[801px]:border-b max-[801px]:py-8">
          <h2>{title}</h2>
        </div>
        <MarketingQuestions items={visibleItems} />
      </div>
    </MarketingBand>
  );
};

const SectionBand = ({
  tone,
  ...props
}: MarketingBand.Props & { tone?: "light" | "muted" }) =>
  tone ? (
    <MarketingLightBand {...props} tone={tone} />
  ) : (
    <MarketingBand {...props} />
  );

export const MarketingSection = ({
  section,
  children,
  sectionTone,
}: MarketingSection.Props) => {
  if (section.id === "what-to-track" && section.items?.length)
    return (
      <MarketingBand id={section.id} className="[&_.marketing-guides]:hidden">
        <MarketingHeading
          eyebrow={section.eyebrow}
          title={section.title}
          description={section.description}
        />
        <TrackingOverview items={section.items} label={section.title} />
        {children}
        {section.note && (
          <p className="border-accent-foreground border-t px-8 py-6 text-foreground-dimmed text-sm max-sm:px-4">
            {section.note}
          </p>
        )}
      </MarketingBand>
    );
  const paragraphs = section.paragraphs?.filter((paragraph) =>
    paragraph.trim(),
  );
  const items = section.items?.filter(
    (item) => item.title.trim() && (item.body.trim() || item.href?.trim()),
  );
  const rows = section.rows?.filter(
    (row) => row.label.trim() && row.value.trim(),
  );
  const links = section.links?.filter(
    (link) => link.label.trim() && link.href.trim(),
  );
  const blocks = Boolean(items?.length || rows?.length || children);
  const ending = Boolean(section.note || links?.length);
  const hasContent = Boolean(
    section.description?.trim() ||
      paragraphs?.length ||
      items?.length ||
      rows?.length ||
      section.note?.trim(),
  );
  const hadContent = Boolean(
    section.description !== undefined ||
      section.paragraphs?.length ||
      section.items?.length ||
      section.rows?.length ||
      section.note !== undefined,
  );

  // Child-driven sections and deliberate link-only calls to action stay useful.
  // A heading above facts that are all pending must not become an empty promise.
  if (!hasContent && !children && (hadContent || !links?.length)) return null;

  return (
    <SectionBand
      id={section.id}
      tone={sectionTone}
      className={cn(
        blocks && "[&>.marketing-rail>.marketing-guides]:hidden",
        section.field && !sectionTone
          ? "marketing-field bg-background [&>.marketing-rail]:bg-background-dimmed [&_.marketing-note]:text-foreground"
          : undefined,
      )}
    >
      <div
        className={cn(
          "marketing-cell relative min-w-0 px-7 pt-12 max-sm:px-4 max-sm:pt-8 [&>p]:max-w-[70ch]",
          blocks || ending ? "pb-8" : "pb-12 max-sm:pb-8",
        )}
      >
        {section.eyebrow && (
          <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
        )}
        {section.title && <h2>{section.title}</h2>}
        {section.description && (
          <p className="marketing-lead mt-4 max-w-[65ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {section.description}
          </p>
        )}
        {paragraphs?.map((paragraph) => (
          <p className="mt-4 text-foreground-dimmed" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </div>
      {items && items.length > 0 && (
        <div
          className="marketing-section-grid marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4"
          data-columns={Math.min(
            section.columns ?? (items.length === 4 ? 2 : 3),
            items.length,
          )}
          data-ordered={section.ordered || undefined}
        >
          {items.map((item, index) => (
            <article
              key={item.title}
              className={cn(
                section.field && "bg-linear-to-br to-transparent",
                section.field &&
                  (index === 0
                    ? "from-primary/8 [&_h3]:text-primary-text"
                    : index === 1
                      ? "from-info/8 [&_h3]:text-info"
                      : "from-secondary/8 [&_h3]:text-secondary"),
              )}
            >
              {section.ordered && (
                <span className="marketing-step-index mb-6 block font-heading text-[42px] text-primary-text leading-none">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              {item.status && (
                <MarketingStatus status={item.status}>
                  {item.statusLabel}
                </MarketingStatus>
              )}
              <h3>{item.title}</h3>
              {item.body && <p>{item.body}</p>}
              {item.href && (
                <Link className="marketing-item-link" href={item.href}>
                  {item.label ?? item.title}
                  <ArrowRightIcon className="size-4" />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
      {rows && rows.length > 0 && (
        <dl className="marketing-section-grid marketing-rows border-[var(--rail-color)] border-b [&>div]:grid [&>div]:grid-cols-[minmax(140px,1fr)_2fr] [&>div]:gap-7 [&>div]:border-[var(--rail-color)] [&>div]:border-t [&>div]:px-7 [&>div]:py-6 max-sm:[&>div]:grid-cols-1 max-sm:[&>div]:gap-2 max-sm:[&>div]:px-4 [&_dd]:m-0 [&_dt]:font-medium [&_dt]:text-foreground-rich">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.value}
                {row.detail && (
                  <p className="marketing-note text-(length:--text-sm) mt-2 text-foreground-dimmed">
                    {row.detail}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      {ending && (
        <div
          className={cn(
            "marketing-cell relative min-w-0 px-7 py-8 max-sm:px-4 [&>.marketing-actions:first-child]:mt-0 [&>p]:max-w-[70ch]",
          )}
        >
          {section.note && (
            <p className="marketing-note text-(length:--text-sm) text-foreground-dimmed">
              {section.note}
            </p>
          )}
          {links && links.length > 0 && <MarketingActions actions={links} />}
        </div>
      )}
    </SectionBand>
  );
};

export const MarketingPage = async ({
  content,
  path,
  darkHero = true,
  heroArtwork,
  heroArtworkFit,
  heroArtworkClassName,
  heroMeta,
  heroIdentity,
  heroIllustration,
  heroChildren,
  children,
  sectionChildren,
  sectionTones,
}: MarketingPage.Props) => {
  const locale = await getLocale();
  const { enterpriseChrome } = await getMessages();
  const facts = content.facts?.filter((fact) => fact.trim());
  const breadcrumbs = [
    {
      "@type": "ListItem",
      position: 1,
      name: "ecentic",
      item: absoluteUrl(localizePath("/", locale)),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: content.title,
      item: absoluteUrl(localizePath(path, locale)),
    },
  ];
  return (
    <MarketingShell>
      <JsonLd
        schemas={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs,
          },
        ]}
      />
      <MarketingHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        actions={
          content.actions ?? [
            { label: enterpriseChrome.action.primary, href: "/demo" },
            { label: enterpriseChrome.action.secondary, href: "/sign-up" },
          ]
        }
        dark={heroIllustration ? false : darkHero}
        artwork={heroArtwork}
        artworkFit={heroArtworkFit}
        artworkClassName={heroArtworkClassName}
        meta={heroMeta}
        identity={heroIdentity}
        illustration={heroIllustration}
        figure={heroSubjects[path]}
      >
        {heroChildren}
      </MarketingHero>
      {facts && facts.length > 0 && (
        <MarketingBand>
          <div
            className="marketing-section-grid marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4"
            data-columns={facts.length}
          >
            {facts.map((fact) => (
              <p key={fact}>{fact}</p>
            ))}
          </div>
        </MarketingBand>
      )}
      {content.sections.map((section) => (
        <MarketingSection
          key={section.id}
          section={section}
          sectionTone={sectionTones?.[section.id]}
        >
          {sectionChildren?.[section.id]}
        </MarketingSection>
      ))}
      {children}
      {content.faqs && content.faqs.length > 0 && (
        <MarketingFaq
          title={content.faqTitle ?? enterpriseChrome.faq}
          items={content.faqs}
        />
      )}
    </MarketingShell>
  );
};

export namespace MarketingPage {
  export type Action = { label: string; href: string };
  export type Section = {
    id: string;
    eyebrow?: string;
    title: string;
    description?: string;
    paragraphs?: readonly string[];
    items?: readonly {
      title: string;
      body: string;
      href?: string;
      label?: string;
      status?: string;
      statusLabel?: string;
    }[];
    rows?: readonly { label: string; value: string; detail?: string }[];
    columns?: number;
    ordered?: boolean;
    field?: boolean;
    note?: string;
    links?: readonly Action[];
  };
  export type Content = {
    meta: { title: string; description: string };
    eyebrow?: string;
    title: string;
    description: string;
    actions?: readonly Action[];
    facts?: readonly string[];
    sections: readonly Section[];
    faqTitle?: string;
    faqs?: readonly { question: string; answer: string }[];
  };
  export type Props = {
    content: Content;
    path: string;
    darkHero?: boolean;
    heroArtwork?: EvolvingAscii.Kind;
    heroArtworkFit?: "contain" | "cover";
    heroArtworkClassName?: string;
    heroMeta?: ReactNode;
    heroIdentity?: ReactNode;
    heroIllustration?: ReactNode;
    heroChildren?: ReactNode;
    children?: ReactNode;
    sectionChildren?: Record<string, ReactNode>;
    sectionTones?: Record<string, "light" | "muted">;
  };
}

export namespace MarketingShell {
  export type Props = { children: ReactNode };
}

export namespace MarketingFaq {
  export type Props = {
    title: string;
    items: readonly { question: string; answer: string }[];
  };
}

export namespace MarketingSection {
  export type Props = {
    section: MarketingPage.Section;
    children?: ReactNode;
    sectionTone?: "light" | "muted";
  };
}
