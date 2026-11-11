import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import {
  MarketingPage,
  MarketingSection,
  marketingMetadata,
} from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { agentInstructions } from "@/lib/agent-discovery";
import { DocsCode } from "../docs/_components/docs";
import {
  InstructionsJobs,
  InstructionsSource,
} from "./_components/instructions-reference";

const discovery = [
  { href: "https://ecentic.ai/api/v1", path: "/api/v1" },
  { href: "https://ecentic.ai/mcp", path: "/mcp" },
  { href: "https://ecentic.ai/auth.md", path: "/auth.md" },
] as const;

export const generateMetadata = async () => {
  const { enterpriseRecovery } = await getMessages();
  return marketingMetadata(
    enterpriseRecovery.instructions.meta,
    "/ai-instructions",
  );
};

export default async () => {
  const { enterpriseRecovery, instructionsPage } = await getMessages();
  const content = enterpriseRecovery.instructions;
  const sections: readonly MarketingPage.Section[] = content.sections;
  const entry = sections.find((section) => section.id === "entry-points");
  const jobs = sections.find((section) => section.id === "jobs");
  const boundaries = sections.find((section) => section.id === "boundaries");
  const guidance = sections.find(
    (section) => section.id === "machine-guidance",
  );

  return (
    <MarketingPage
      darkHero={false}
      content={{ ...content, sections: [] }}
      path="/ai-instructions"
    >
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <nav
          aria-label={instructionsPage.navigation}
          className="grid grid-cols-4 bg-background-dimmed max-md:grid-cols-2"
        >
          {[entry, jobs, boundaries, guidance].map((section) =>
            section ? (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center justify-between gap-4 border-accent-foreground border-r px-6 py-6 text-sm last:border-r-0 hover:bg-background hover:text-primary-text max-sm:px-4 max-md:nth-2:border-r-0 max-md:border-b max-md:nth-last-[-n+2]:border-b-0"
              >
                <span>{section.title}</span>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              </a>
            ) : null,
          )}
        </nav>
      </MarketingBand>

      {entry && (
        <MarketingBand
          id={entry.id}
          className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="px-8 py-12 max-sm:px-4 max-sm:py-8">
            <h2>{entry.title}</h2>
          </div>
          <div>
            {entry.items?.map((item, index) => (
              <article
                key={item.title}
                className="grid grid-cols-[1fr_2fr] border-accent-foreground border-t max-md:grid-cols-1"
              >
                <div className="flex min-w-0 flex-col justify-between gap-4 border-accent-foreground border-r bg-background-dimmed px-8 py-8 max-sm:px-4 max-md:border-r-0">
                  <h3>{item.title}</h3>
                  {discovery[index] && (
                    <a
                      href={discovery[index].href}
                      className="wrap-anywhere inline-flex w-fit items-center gap-2 font-mono text-primary-text text-sm underline decoration-primary/30 underline-offset-4 hover:decoration-current"
                    >
                      {discovery[index].path}
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </a>
                  )}
                </div>
                <div className="min-w-0 space-y-6 px-8 py-8 max-sm:px-4 max-md:py-6">
                  <p className="max-w-[64ch] text-foreground-dimmed">
                    {item.body}
                  </p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 text-primary-text underline decoration-primary/30 underline-offset-4 hover:decoration-current"
                    >
                      {item.label ?? item.title}
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </MarketingBand>
      )}

      {jobs && (
        <MarketingBand
          id={jobs.id}
          className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
            <div className="flex min-w-0 flex-col border-accent-foreground border-r bg-background-dimmed max-md:border-r-0 max-md:border-b">
              <h2 className="px-8 pt-12 max-sm:px-4 max-sm:pt-8">
                {jobs.title}
              </h2>
              <div className="h-56 px-8 py-4 text-foreground-dimmed max-md:h-40">
                <EvolvingAscii artwork="console" />
              </div>
            </div>
            <InstructionsJobs items={jobs.items ?? []} />
          </div>
        </MarketingBand>
      )}

      {boundaries && (
        <MarketingBand
          id={boundaries.id}
          className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
        >
          <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
            <h2>{boundaries.title}</h2>
          </div>
          <div className="grid grid-cols-2 max-md:grid-cols-1">
            {boundaries.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="border-accent-foreground border-t border-r px-8 py-8 text-foreground last:border-r-0 max-sm:px-4 max-md:border-r-0"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </MarketingBand>
      )}

      {guidance && (
        <MarketingBand
          id={guidance.id}
          className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="space-y-6 px-8 py-12 max-sm:px-4 max-sm:py-8">
            <h2>{guidance.title}</h2>
            <p className="max-w-[70ch] text-foreground-dimmed">
              {guidance.description}
            </p>
            <a
              href="https://ecentic.ai/.well-known/agent-instructions.md"
              className="wrap-anywhere inline-flex items-center gap-2 font-mono text-primary-text text-sm underline decoration-primary/30 underline-offset-4 hover:decoration-current"
            >
              <span>/.well-known/agent-instructions.md</span>
              <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
            </a>
          </div>
          <div className="border-accent-foreground border-t">
            <InstructionsSource label={instructionsPage.source}>
              <DocsCode label="agent-instructions.md">
                {agentInstructions}
              </DocsCode>
            </InstructionsSource>
          </div>
        </MarketingBand>
      )}
      {sections
        .filter(
          (section) =>
            ![
              "entry-points",
              "jobs",
              "boundaries",
              "machine-guidance",
            ].includes(section.id),
        )
        .map((section) => (
          <MarketingSection key={section.id} section={section} />
        ))}
    </MarketingPage>
  );
};
