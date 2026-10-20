import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import {
  absoluteUrl,
  company,
  createBreadcrumbSchema,
  createFounderSchema,
  createMetadata,
  founder,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/handshake.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("about");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/about", locale),
    keywords: ["about ecentic", "ecentic founder", "ECENTIC ShPK"],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("about");
  const messages = await getMessages();
  const description = translate("meta.description");
  const address = [
    company.address.streetAddress,
    `${company.address.postalCode} ${company.address.addressLocality}`,
    translate("details.country"),
  ].join(", ");

  const details = [
    { label: translate("details.labels.legalName"), value: company.legalName },
    { label: translate("details.labels.taxId"), value: company.taxId },
    { label: translate("details.labels.address"), value: address },
    {
      label: translate("details.labels.telephone"),
      value: company.telephone,
      href: `tel:${company.telephone.replaceAll(" ", "")}`,
    },
    {
      label: translate("details.labels.email"),
      value: company.email,
      href: `mailto:${company.email}`,
    },
  ];

  // The founder's anchor and profile come from `founder`, which the blog
  // byline and the Person schema share; the co-founders are listed here.
  const team = [
    {
      id: "xhurian-shaba",
      name: founder.name,
      linkedin: founder.linkedin,
      role: translate("team.founder.role"),
      bio: translate("team.founder.bio"),
    },
    {
      id: "alvi-palloshi",
      name: "Alvi Palloshi",
      linkedin: "https://www.linkedin.com/in/alvipalloshi",
      role: translate("team.members.alvi.role"),
      bio: translate("team.members.alvi.bio"),
    },
    {
      id: "iseld-muca",
      name: "Iseld Muça",
      linkedin: "https://www.linkedin.com/in/iseldmuca",
      role: translate("team.members.iseld.role"),
      bio: translate("team.members.iseld.bio"),
    },
  ];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: translate("breadcrumb.about"),
      description,
      url: absoluteUrl(localizePath("/about", locale)),
      isPartOf: absoluteUrl(localizePath("/", locale)),
      inLanguage: locale,
      mainEntity: {
        "@context": "https://schema.org",
        ...createFounderSchema(translate("team.founder.role")),
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.about"),
        path: localizePath("/about", locale),
      },
    ]),
  ];

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      description={translate("hero.description")}
      assurances={messages.about.hero.assurances}
      art={{ source: Art, alt: translate("hero.art.alt") }}
    >
      <JsonLd schemas={structuredData} />

      <ContentPageSection
        number={translate("mission.number")}
        title={translate("mission.title")}
      >
        <div className="flex max-w-3xl flex-col gap-5">
          {messages.about.mission.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="font-light text-foreground-dimmed text-lg leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("team.number")}
        title={translate("team.title")}
        gutter
      >
        <div className="flex max-w-3xl flex-col gap-10">
          <p className="font-light text-foreground-dimmed text-lg leading-relaxed">
            {translate("team.intro")}
          </p>
          {team.map((member) => (
            <article
              key={member.id}
              id={member.id}
              className="flex scroll-mt-24 flex-col gap-3"
            >
              <h3 className="font-body font-medium text-2xl text-foreground">
                {member.name}
              </h3>
              <p className="text-primary">{member.role}</p>
              <p className="font-light text-foreground-dimmed text-lg leading-relaxed">
                {member.bio}
              </p>
              <Button
                color="accent"
                className="mt-2 w-fit"
                render={
                  <Link
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {translate("team.founder.linkedin")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </article>
          ))}
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("details.number")}
        title={translate("details.title")}
        description={translate("details.description")}
        gutter
      >
        <dl className="grid max-w-3xl grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-[max-content_1fr]">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-foreground-dimmed">{detail.label}</dt>
              <dd className="text-foreground">
                {detail.href ? (
                  <Link
                    href={detail.href}
                    className="underline-offset-4 hover:text-primary hover:underline"
                  >
                    {detail.value}
                  </Link>
                ) : (
                  detail.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </ContentPageSection>

      <ContentPageFooter
        primary={{
          href: "/sign-up",
          label: translate("footer.action.primary"),
        }}
        secondary={{
          href: "/support",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
