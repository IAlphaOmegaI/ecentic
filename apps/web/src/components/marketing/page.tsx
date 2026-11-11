import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { fonts } from "@/components/marketing/fonts";
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

export const MarketingShell = async ({ children }: MarketingShell.Props) => {
  const { enterpriseChrome } = await getMessages();
  return (
    <div
      className={cn(
        "marketing-grid-pattern marketing-site text-(length:--text-base) bg-background font-body text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-md [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-md [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-xs [&_:where(input,textarea,select,[role=combobox])]:rounded-xs [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]",
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

export const MarketingFaq = ({ title, items }: MarketingFaq.Props) => (
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
    <div className="marketing-faq grid grid-cols-[1fr_2fr] max-[801px]:grid-cols-1 [&>.marketing-cell]:border-[var(--rail-color)] [&>.marketing-cell]:border-r max-[801px]:[&>.marketing-cell]:border-r-0 max-[801px]:[&>.marketing-cell]:border-b [&_article:last-child]:border-b-0 [&_article]:border-[var(--rail-color)] [&_article]:border-b [&_article]:p-7 max-sm:[&_article]:px-4 max-sm:[&_article]:py-6 [&_h3]:text-[22px] [&_h3]:tracking-[-0.02em] [&_p]:mt-3">
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
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
}: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className={
      section.field
        ? "marketing-field bg-background [&>.marketing-rail]:bg-background-dimmed [&_.marketing-note]:text-foreground"
        : undefined
    }
  >
    <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
      {section.eyebrow && (
        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
      )}
      <h2>{section.title}</h2>
      {section.description && (
        <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
          {section.description}
        </p>
      )}
      {section.paragraphs?.map((paragraph) => (
        <p className="mt-6" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </div>
    {section.items && (
      <div
        className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4"
        data-columns={section.columns ?? 3}
        data-ordered={section.ordered || undefined}
      >
        {section.items.map((item, index) => (
          <article key={item.title}>
            {section.ordered && (
              <span className="marketing-step-index mb-[30px] block font-heading text-[42px] text-primary-text leading-none">
                {String(index + 1).padStart(2, "0")}
              </span>
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
      <dl className="marketing-rows border-[var(--rail-color)] border-b [&>div]:grid [&>div]:grid-cols-[minmax(140px,1fr)_2fr] [&>div]:gap-7 [&>div]:border-[var(--rail-color)] [&>div]:border-t [&>div]:px-7 [&>div]:py-6 max-sm:[&>div]:grid-cols-1 max-sm:[&>div]:gap-2 max-sm:[&>div]:px-4 [&_dd]:m-0 [&_dt]:font-medium [&_dt]:text-foreground-rich">
        {section.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.value}
              {row.detail && (
                <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
                  {row.detail}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    )}
    {children}
    {(section.note || section.links) && (
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        {section.note && (
          <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
            {section.note}
          </p>
        )}
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
        <MarketingBand>
          <div
            className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4"
            data-columns={content.facts.length}
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
  };
}
