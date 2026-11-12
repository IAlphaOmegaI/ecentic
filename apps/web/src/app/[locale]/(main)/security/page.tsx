import {
  CommerceFileShieldIcon,
  DownloadIcon,
  GlobeIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import {
  MarketingEdgeCrosses,
  MarketingLightBand,
} from "@/components/marketing/light-band";
import {
  MarketingPage,
  MarketingSection,
  marketingMetadata,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { SecurityDetails } from "./_components/security-details";
import { SecurityFlow } from "./_components/security-flow";
import { StoreAccess } from "./_components/store-access";
import { VaultFigure } from "./_components/vault-figure";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.security.meta, "/security");
};

const SecurityRows = ({ section }: { section: MarketingPage.Section }) => (
  <dl className="divide-y divide-accent-foreground">
    {section.rows
      ?.filter((row) => row.label.trim() && row.value.trim())
      .map((row) => (
        <div
          key={row.label}
          className="grid gap-2 px-4 py-6 md:grid-cols-[minmax(140px,1fr)_2fr] md:gap-8 md:px-8"
        >
          <dt className="font-medium text-foreground-rich">{row.label}</dt>
          <dd className="m-0 text-foreground-dimmed">{row.value}</dd>
        </div>
      ))}
  </dl>
);

const SecurityNote = ({ section }: { section: MarketingPage.Section }) => (
  <>
    {section.note?.trim() && (
      <p className="mt-4 text-foreground-dimmed text-sm">{section.note}</p>
    )}
    {section.links && <MarketingActions actions={section.links} />}
  </>
);

export default async () => {
  const {
    hairlineSecurity,
    enterpriseCompany,
    enterpriseSecurityDesign: labels,
  } = await getMessages();
  const content = enterpriseCompany.security;
  const { subprocessors } = content;
  const findSection = (id: string): MarketingPage.Section | undefined =>
    content.sections.find((section) => section.id === id);
  const reviewed = findSection("reviewed");
  const access = findSection("store-access");
  const infrastructure = findSection("infrastructure");
  const models = findSection("ai-data");
  const privacy = findSection("privacy");
  const agreement = findSection("dpa");
  const providers = findSection("sub-processors");
  const compliance = findSection("compliance");
  const report = findSection("report");
  const hasLocations = subprocessors.rows.some((processor) =>
    processor.location.trim(),
  );

  return (
    <MarketingPage
      content={{ ...content, facts: [], sections: [] }}
      path="/security"
      heroIllustration={<VaultFigure label={hairlineSecurity.label} />}
    >
      <MarketingBand className="[&_.marketing-guides]:hidden">
        <ul className="grid sm:grid-cols-2 md:grid-cols-4">
          {content.facts.map((fact, index) => {
            const Icon =
              [
                DownloadIcon,
                GlobeIcon,
                ShieldCheckIcon,
                CommerceFileShieldIcon,
              ][index] ?? ShieldCheckIcon;
            return (
              <li
                key={fact}
                className="flex min-w-0 items-center gap-4 border-accent-foreground px-4 py-6 max-sm:border-b max-sm:last:border-b-0 sm:border-r sm:even:border-r-0 md:px-8 md:even:border-r md:last:border-r-0"
              >
                <Icon
                  className="size-6 shrink-0 text-primary-text"
                  aria-hidden
                />
                <span className="text-sm leading-snug">{fact}</span>
              </li>
            );
          })}
        </ul>
      </MarketingBand>
      {reviewed && (
        <MarketingBand
          id={reviewed.id}
          className="[&>.marketing-rail]:bg-background-dimmed [&_.marketing-guides]:hidden"
        >
          <div className="grid gap-4 px-4 py-8 md:grid-cols-[1fr_2fr] md:gap-8 md:px-8">
            <h2 className="text-lg! leading-snug! tracking-normal!">
              {reviewed.title}
            </h2>
            <p className="max-w-[70ch] text-foreground">
              {reviewed.description}
            </p>
          </div>
        </MarketingBand>
      )}

      {access && (
        <MarketingBand id={access.id} className="[&_.marketing-guides]:hidden">
          <div className="px-4 py-8 md:px-8 md:py-12">
            <h2>{access.title}</h2>
          </div>
          <StoreAccess section={access} labels={labels} />
          <div className="marketing-section-grid relative grid gap-6 border-accent-foreground border-t bg-linear-to-r from-primary/12 to-transparent px-4 py-8 md:grid-cols-[auto_1fr] md:items-center md:px-8 md:py-10">
            <MarketingEdgeCrosses />
            <GlobeIcon className="size-8 text-primary-text" aria-hidden />
            <p className="max-w-[68ch] font-heading text-foreground-rich text-xl leading-snug md:text-2xl">
              {access.paragraphs?.[6]}
            </p>
          </div>
        </MarketingBand>
      )}

      <SecurityFlow />
      <SectionGutter />
      {infrastructure && (
        <MarketingBand
          id={infrastructure.id}
          className="[&_.marketing-guides]:hidden"
        >
          <div className="grid md:grid-cols-[2fr_3fr]">
            <div className="flex flex-col border-accent-foreground border-b bg-background-dimmed px-4 py-8 md:border-r md:border-b-0 md:px-8 md:py-12">
              <h2>{infrastructure.title}</h2>
              <CommerceFigure
                kind="relay"
                surface="field"
                className="mx-auto my-auto max-w-96"
              />
            </div>
            <SecurityRows section={infrastructure} />
          </div>
        </MarketingBand>
      )}

      {models && (
        <MarketingLightBand id={models.id}>
          <div className="grid md:grid-cols-[2fr_3fr]">
            <div className="border-accent-foreground border-b bg-linear-to-b from-primary/14 via-background-rich to-background-rich px-4 py-8 md:border-r md:border-b-0 md:px-8 md:py-12">
              <h2>{models.title}</h2>
              <CommerceFigure
                kind="hub"
                surface="rich"
                className="mx-auto my-4 max-w-80 bg-transparent"
              />
              <ol className="relative ml-2 border-accent-foreground border-l">
                {[
                  labels.catalogLabel,
                  labels.modelLabel,
                  labels.outputLabel,
                ].map((label) => (
                  <li key={label} className="relative py-4 pl-6 font-medium">
                    <span
                      aria-hidden="true"
                      className="absolute top-6 -left-1 h-2 w-2 bg-primary-text"
                    />
                    {label}
                  </li>
                ))}
              </ol>
            </div>
            <div className="min-w-0">
              <div className="space-y-6 px-4 py-8 md:px-8 md:py-12">
                {[models.paragraphs?.[0], models.paragraphs?.[2]]
                  .filter((paragraph) => paragraph?.trim())
                  .map((paragraph) => (
                    <p
                      key={paragraph}
                      className="max-w-[65ch] text-foreground-dimmed"
                    >
                      {paragraph}
                    </p>
                  ))}
              </div>
              <SecurityDetails
                items={[
                  {
                    id: "routing",
                    title: labels.routingTitle,
                    paragraphs: [models.paragraphs?.[1] ?? ""],
                  },
                ]}
              />
              {models.paragraphs
                ?.slice(3)
                .filter((paragraph) => paragraph.trim())
                .map((paragraph) => (
                  <p
                    key={paragraph}
                    className="px-4 py-6 text-foreground-dimmed text-sm md:px-8"
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>
        </MarketingLightBand>
      )}

      {privacy && (
        <MarketingBand id={privacy.id} className="[&_.marketing-guides]:hidden">
          <div className="grid md:grid-cols-[2fr_3fr]">
            <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-8 md:border-r md:border-b-0 md:px-8 md:py-12">
              <h2>{privacy.title}</h2>
              <SecurityNote section={privacy} />
            </div>
            <SecurityRows section={privacy} />
          </div>
        </MarketingBand>
      )}

      <SectionGutter />
      {providers && (
        <MarketingBand
          id={providers.id}
          className="[&_.marketing-guides]:hidden"
        >
          <div className="grid gap-6 bg-background-dimmed px-4 py-8 md:grid-cols-[2fr_3fr] md:gap-8 md:px-8 md:py-12">
            <h2>{providers.title}</h2>
            <div>
              <p className="max-w-[65ch] text-foreground-dimmed">
                {providers.description}
              </p>
              <SecurityNote section={providers} />
            </div>
          </div>
          <Table className="table-fixed border-b-0 bg-background text-left text-base">
            <TableCaption className="border-accent-foreground border-t px-4 py-6 text-left md:px-8">
              {subprocessors.caption}
            </TableCaption>
            <TableHeader className="max-sm:sr-only">
              <TableRow className="border-t">
                {subprocessors.headers.map(
                  (heading, index) =>
                    (index !== 2 || hasLocations) && (
                      <TableHead
                        key={heading}
                        className={
                          index === 0
                            ? "w-[38%] whitespace-normal px-4 py-4 font-medium text-base normal-case tracking-normal md:w-1/3 md:px-8"
                            : "whitespace-normal px-4 py-4 font-medium text-base normal-case tracking-normal md:px-8"
                        }
                      >
                        {heading}
                      </TableHead>
                    ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="max-sm:block">
              {subprocessors.rows.map((processor) => (
                <TableRow key={processor.name} className="max-sm:grid">
                  <TableHead
                    scope="row"
                    className="whitespace-normal break-words px-4 py-6 align-top font-medium text-base text-foreground-rich normal-case tracking-normal max-sm:pb-2 md:px-8"
                  >
                    {processor.name}
                  </TableHead>
                  <TableCell className="whitespace-normal break-words px-4 py-6 align-top font-normal text-base text-foreground-dimmed max-sm:pt-0 md:px-8">
                    {processor.purpose}
                  </TableCell>
                  {hasLocations && (
                    <TableCell className="whitespace-normal break-words px-4 py-6 align-top font-normal text-base text-foreground-dimmed max-sm:pt-0 md:px-8">
                      <span
                        aria-hidden="true"
                        className="mb-2 block font-medium text-foreground-rich text-sm sm:hidden"
                      >
                        {subprocessors.headers[2]}
                      </span>
                      {processor.location}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </MarketingBand>
      )}

      <SectionGutter />
      <MarketingBand className="[&>.marketing-rail]:bg-background-dimmed [&_.marketing-guides]:hidden">
        <div className="grid md:grid-cols-2">
          {[agreement, compliance]
            .filter((section) => section !== undefined)
            .map((section) => (
              <section
                id={section.id}
                key={section.id}
                className="min-w-0 px-4 py-8 first:border-accent-foreground first:border-b md:px-8 md:py-12 md:first:border-r md:first:border-b-0"
              >
                <h2>{section.title}</h2>
                {section.description?.trim() && (
                  <p className="mt-6 text-foreground-dimmed">
                    {section.description}
                  </p>
                )}
                {section.paragraphs
                  ?.filter((paragraph) => paragraph.trim())
                  .map((paragraph) => (
                    <p key={paragraph} className="mt-6 text-foreground-dimmed">
                      {paragraph}
                    </p>
                  ))}
                <SecurityNote section={section} />
              </section>
            ))}
        </div>
      </MarketingBand>
      {report && <MarketingSection section={report} />}
    </MarketingPage>
  );
};
