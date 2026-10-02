import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
  seo,
  softwareApplicationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/robot.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../_components/content";
import { renderInline } from "../_components/rich-text";

/**
 * `/ai-instructions` — the brand facts an AI assistant should use when someone
 * asks about ecentic, in plain server-rendered HTML.
 *
 * Not the same document as `/.well-known/agent-instructions.md`. That one tells
 * an agent when to *call* ecentic; this one tells an assistant how to *describe*
 * it, which is what a branded search or an AI Overview actually needs. It is a
 * page rather than a Markdown route because the answer engines that cite these
 * pages find them through the search index, and the index wants HTML with a
 * link from the footer.
 *
 * Everything on it is visible text: no accordion, no tab. A crawler that does
 * not run JavaScript, or that reads only what is expanded, still gets every
 * answer.
 */
const path = "/ai-instructions";

const plans = ["scan", "payg", "compete", "scale", "dominate"] as const;

// Reading order: the instructions first, since they are what the page is named
// for, then the facts they rely on. Pricing sits between the two groups.
const leading = ["instructions", "about", "product", "audience"] as const;
const trailing = ["limits", "glossary", "company"] as const;

const Section = ({
  section,
}: {
  section: {
    number: string;
    title: string;
    description: string;
    content: string;
  };
}) => (
  <ContentPageSection
    number={section.number}
    title={section.title}
    description={section.description}
  >
    <ContentPageRichText content={section.content} />
  </ContentPageSection>
);

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("aiInstructions");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath(path, locale),
    keywords: [
      "ecentic",
      "what is ecentic",
      "ecentic pricing",
      "ecentic AI instructions",
      "ecentic company information",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("aiInstructions");
  const messages = await getMessages();
  const copy = messages.aiInstructions;

  // The price table is read from the pricing page's own comparison rows rather
  // than restated here: a stale price on this page is a stale price in every
  // answer that cites it. Only the rows that state a value for every plan are
  // kept — the yes/no feature rows belong on the pricing page.
  const rows = messages.pricing.compare.rows.filter((row) =>
    plans.every((plan) => typeof row[plan] === "string"),
  );

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: translate("meta.title"),
      description: translate("meta.description"),
      url: absoluteUrl(localizePath(path, locale)),
      inLanguage: locale,
      isPartOf: {
        "@type": "WebSite",
        name: seo.name,
        url: seo.host,
      },
      about: {
        "@type": "Organization",
        name: seo.name,
        url: seo.host,
      },
      dateModified: copy.lastUpdated.iso,
    },
    organizationSchema,
    softwareApplicationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.aiInstructions"),
        path: localizePath(path, locale),
      },
    ]),
    createFaqSchema(copy.faq.items),
  ];

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      meta={translate("lastUpdated.label")}
      description={translate("hero.description")}
      assurances={copy.hero.assurances}
      art={{ source: Art, alt: translate("hero.art.alt") }}
    >
      <JsonLd schemas={structuredData} />

      <ContentPageSection
        number={copy.facts.number}
        title={copy.facts.title}
        description={copy.facts.description}
        classList={{ body: "p-0" }}
      >
        <dl className="flex flex-col gap-px bg-accent-foreground">
          {copy.facts.items.map((fact) => (
            <div
              key={fact.title}
              className="grid grid-cols-1 gap-1 bg-background px-6 py-5 md:grid-cols-[11rem_1fr] md:gap-8 md:px-8"
            >
              <dt className="font-body font-medium text-foreground text-lg">
                {fact.title}
              </dt>
              <dd className="font-light text-foreground-dimmed leading-relaxed">
                {renderInline(fact.description)}
              </dd>
            </div>
          ))}
        </dl>
      </ContentPageSection>

      {leading.map((key) => (
        <Section key={key} section={copy.sections[key]} />
      ))}

      <ContentPageSection
        number={copy.pricing.number}
        title={copy.pricing.title}
        description={copy.pricing.description}
      >
        <ContentPageRichText content={copy.pricing.content} />
        <div className="mt-8 overflow-x-auto border border-accent-foreground">
          <Table className="border-b-0">
            <TableHeader>
              <TableRow>
                <TableHead>{messages.pricing.compare.planHeader}</TableHead>
                {rows.map((row) => (
                  // Headers wrap so the long Spanish labels do not starve the
                  // price column into breaking a figure across lines.
                  <TableHead
                    key={row.label}
                    className="whitespace-normal align-bottom"
                  >
                    {row.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan}>
                  <TableCell className="whitespace-nowrap font-medium text-foreground">
                    {plan === "scan"
                      ? copy.pricing.scan
                      : messages.pricing.plans[plan].name}
                  </TableCell>
                  {rows.map((row) => (
                    <TableCell
                      key={row.label}
                      className="text-foreground-dimmed"
                    >
                      {row[plan]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ContentPageSection>

      {trailing.map((key) => (
        <Section key={key} section={copy.sections[key]} />
      ))}

      <ContentPageSection
        number={copy.faq.number}
        title={copy.faq.title}
        description={copy.faq.description}
        classList={{ body: "p-0" }}
      >
        <div className="flex flex-col gap-px bg-accent-foreground">
          {copy.faq.items.map((item) => (
            <article
              key={item.question}
              className="flex flex-col gap-2 bg-background px-6 py-5 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-lg">
                {item.question}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {renderInline(item.answer)}
              </p>
            </article>
          ))}
        </div>
      </ContentPageSection>

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
