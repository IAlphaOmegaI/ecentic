import { cn } from "@zenncore/utils";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { AgentReplay } from "@/components/marketing/interactive/agent-replay";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { SimulateTracking } from "./simulate-tracking";

const models = [
  { provider: "chatgpt", name: "ChatGPT" },
  { provider: "claude", name: "Claude" },
  { provider: "gemini", name: "Gemini" },
] as const;

const references = [
  "simulations",
  "win-rate",
  "battlecards",
  "replay",
  "readiness",
  "listing-quality",
  "brand-visibility",
];

const SectionEnding = ({ section }: { section: MarketingPage.Section }) => (
  <>
    {section.note && (
      <p className="px-8 py-8 text-foreground-dimmed text-sm max-sm:px-4">
        {section.note}
      </p>
    )}
    {section.links && (
      <div className="px-8 pb-8 max-sm:px-4">
        <MarketingActions actions={section.links} />
      </div>
    )}
  </>
);

export const SimulateBody = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => (
  <>
    {sections.map((section) => {
      const children = sectionChildren?.[section.id];
      switch (section.id) {
        case "problem":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <div className="grid grid-cols-[1.1fr_1fr] max-md:grid-cols-1">
                <MarketingHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                />
                <div className="border-[var(--rail-color)] border-l bg-background-dimmed px-8 max-sm:px-4 max-md:border-t max-md:border-l-0">
                  {section.items?.map((item, index) => (
                    <article
                      key={item.title}
                      className="grid grid-cols-[32px_1fr] gap-4 border-[var(--rail-color)] border-b py-8 last:border-b-0"
                    >
                      <span
                        aria-hidden="true"
                        className="font-heading text-3xl text-primary-text"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{item.title}</h3>
                        <p className="mt-2 text-foreground-dimmed">
                          {item.body}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        case "how-it-works":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <MarketingHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
              <ol className="grid grid-cols-[1fr_1.5fr_1fr] border-[var(--rail-color)] border-t max-md:grid-cols-1">
                {section.items?.map((item, index) => (
                  <li
                    key={item.title}
                    className={cn(
                      "relative min-w-0 p-8 max-sm:p-4",
                      index === 0 && "bg-background-dimmed",
                      index === 1 &&
                        "border-[var(--rail-color)] border-x max-md:border-x-0 max-md:border-y",
                      index === 2 && "bg-background-dimmed",
                      index === 3 &&
                        "col-span-full grid grid-cols-[40px_1fr] gap-4 border-accent-foreground border-t bg-background-dimmed text-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mb-4 block font-heading text-3xl",
                        index === 3 ? "text-primary-text" : "text-primary-text",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p
                        className={cn(
                          "mt-4",
                          index === 3
                            ? "max-w-[72ch] text-foreground-dimmed"
                            : "text-foreground-dimmed",
                        )}
                      >
                        {item.body}
                      </p>
                      {index === 1 && (
                        <div className="relative mt-10 grid grid-cols-3 gap-4 border-primary/30 border-t pt-8 before:absolute before:-top-4 before:left-1/2 before:h-4 before:border-primary/30 before:border-l">
                          {models.map((model) => (
                            <div
                              key={model.provider}
                              className="relative flex min-w-0 flex-col items-center gap-4 before:absolute before:-top-8 before:left-1/2 before:h-4 before:border-primary/30 before:border-l"
                            >
                              <ProviderLogo
                                provider={model.provider}
                                decorative
                                className="size-10 rounded-none object-center"
                              />
                              <span className="text-sm">{model.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {index === 2 && (
                        <div className="mt-4 h-28 text-primary-text">
                          <EvolvingAscii artwork="console" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        case "why-it-works":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <MarketingHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
              <div className="grid grid-cols-[1fr_1.5fr] border-[var(--rail-color)] border-t max-md:grid-cols-1">
                <div className="px-8 max-sm:px-4">
                  {section.items?.slice(0, 2).map((item) => (
                    <article
                      key={item.title}
                      className="border-[var(--rail-color)] border-b py-8 last:border-b-0"
                    >
                      <h3>{item.title}</h3>
                      <p className="mt-4 text-foreground-dimmed">{item.body}</p>
                    </article>
                  ))}
                </div>
                {section.items?.slice(2).map((item) => (
                  <article
                    key={item.title}
                    className="border-[var(--rail-color)] border-l bg-background-dimmed p-8 max-sm:p-4 max-md:border-t max-md:border-l-0"
                  >
                    <div className="mb-8 flex items-center gap-8">
                      {models.map((model) => (
                        <ProviderLogo
                          key={model.provider}
                          provider={model.provider}
                          className="size-10 rounded-none"
                        />
                      ))}
                    </div>
                    <h3>{item.title}</h3>
                    <p className="mt-4 text-foreground-dimmed">{item.body}</p>
                  </article>
                ))}
              </div>
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        case "what-to-track":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <MarketingHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
              <SimulateTracking
                items={section.items ?? []}
                label={section.title}
              />
              {children}
              <SectionEnding section={section} />
            </MarketingBand>
          );
        default:
          if (references.includes(section.id))
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="grid grid-cols-[1fr_2fr] gap-8 px-8 py-8 max-sm:px-4 max-md:grid-cols-1 max-md:gap-4">
                  <div>
                    {section.eyebrow && (
                      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    )}
                    <h2 className="text-2xl!">{section.title}</h2>
                  </div>
                  <div className="max-w-[72ch] space-y-4 text-foreground-dimmed">
                    {section.description && <p>{section.description}</p>}
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                {children}
                {section.id === "replay" && <AgentReplay embedded />}
                <SectionEnding section={section} />
              </MarketingBand>
            );
          return (
            <MarketingSection key={section.id} section={section}>
              {children}
            </MarketingSection>
          );
      }
    })}
  </>
);
