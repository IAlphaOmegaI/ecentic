import { ArrowRightIcon } from "@zenncore/icons";
import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { absoluteUrl, createMetadata } from "@/lib/seo";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingHero,
  MarketingStatus,
} from "./primitives";

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

export const MarketingShell = async ({ children }: { children: ReactNode }) => {
  const { enterpriseChrome } = await getMessages();
  return (
    <div className="marketing-site">
      <a className="marketing-skip" href="#main-content">
        {enterpriseChrome.skip}
      </a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
};

export const MarketingFaq = ({
  title,
  items,
}: {
  title: string;
  items: readonly { question: string; answer: string }[];
}) => (
  <MarketingBand>
    <JsonLd
      schemas={[
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ]}
    />
    <div className="marketing-faq">
      <div className="marketing-cell">
        <h2>{title}</h2>
      </div>
      <div>
        {items.map((item) => (
          <article key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </div>
  </MarketingBand>
);

export const MarketingSection = ({
  section,
  children,
}: {
  section: MarketingPage.Section;
  children?: ReactNode;
}) => (
  <MarketingBand
    id={section.id}
    className={section.field ? "marketing-field" : undefined}
  >
    <div className="marketing-cell">
      {section.eyebrow && (
        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
      )}
      <h2>{section.title}</h2>
      {section.description && (
        <p className="marketing-lead">{section.description}</p>
      )}
      {section.paragraphs?.map((paragraph) => (
        <p className="mt-6" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </div>
    {section.items && (
      <div
        className="marketing-grid"
        style={{ "--columns": section.columns ?? 3 } as CSSProperties}
      >
        {section.items.map((item, index) => (
          <article key={item.title}>
            {section.ordered && (
              <MarketingEyebrow>
                {String(index + 1).padStart(2, "0")}
              </MarketingEyebrow>
            )}
            {item.status && (
              <MarketingStatus status={item.status}>
                {item.statusLabel}
              </MarketingStatus>
            )}
            <h3>{item.title}</h3>
            <p>{item.body}</p>
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
    {section.rows && (
      <dl className="marketing-rows">
        {section.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.value}
              {row.detail && <p className="marketing-note">{row.detail}</p>}
            </dd>
          </div>
        ))}
      </dl>
    )}
    {children}
    {(section.note || section.links) && (
      <div className="marketing-cell">
        {section.note && <p className="marketing-note">{section.note}</p>}
        {section.links && <MarketingActions actions={section.links} />}
      </div>
    )}
  </MarketingBand>
);

export const MarketingPage = async ({
  content,
  path,
  darkHero = false,
  heroChildren,
  children,
  sectionChildren,
}: MarketingPage.Props) => {
  const locale = await getLocale();
  const { enterpriseChrome } = await getMessages();
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
        dark={darkHero}
      >
        {heroChildren}
      </MarketingHero>
      {content.facts && (
        <MarketingBand className="marketing-field">
          <div
            className="marketing-grid"
            style={{ "--columns": content.facts.length } as CSSProperties}
          >
            {content.facts.map((fact) => (
              <p key={fact}>{fact}</p>
            ))}
          </div>
        </MarketingBand>
      )}
      {content.sections.map((section) => (
        <MarketingSection key={section.id} section={section}>
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
    heroChildren?: ReactNode;
    children?: ReactNode;
    sectionChildren?: Record<string, ReactNode>;
  };
}
