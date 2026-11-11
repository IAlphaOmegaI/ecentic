import {
  ArrowRightIcon,
  AwardIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import Microsoft from "@/public/partners/microsoft-for-startups.png";
import PlugAndPlay from "@/public/partners/plug-and-play.webp";
import RedBull from "@/public/partners/red-bull-basement.svg";
import FounderGames from "@/public/partners/the-founder-games.png";

type AboutContent = AppConfig["Messages"]["enterpriseCompany"]["about"];
type SectionsProps = { sections: readonly MarketingPage.Section[] };

const programImages = [PlugAndPlay, Microsoft, RedBull, FounderGames] as const;

export const AboutBody = {
  Origin: ({ sections }: SectionsProps) => (
    <div className="relative grid overflow-hidden bg-primary-text text-background-rich min-[801px]:grid-cols-[1.2fr_1fr]">
      <div className="relative z-10 flex items-center px-8 py-10 max-sm:px-4 max-sm:py-8">
        <div className="space-y-4">
          {sections
            .find((section) => section.id === "why")
            ?.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="max-w-[52ch] text-lg leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
        </div>
      </div>
      <div className="relative min-h-72 text-background-rich/65 max-sm:min-h-52 min-[801px]:border-background-rich/20 min-[801px]:border-l">
        <EvolvingAscii artwork="console" className="absolute inset-0" />
      </div>
    </div>
  ),

  Principles: ({ sections }: SectionsProps) => (
    <div className="border-accent-foreground border-t">
      {sections
        .find((section) => section.id === "how")
        ?.items?.map((item, index) => (
          <article
            key={item.title}
            className="grid border-accent-foreground border-b last:border-b-0 min-[801px]:grid-cols-[1fr_2fr]"
          >
            <div className="relative flex min-h-40 items-center justify-center overflow-hidden border-accent-foreground border-b px-8 py-8 max-sm:px-4 min-[801px]:border-r min-[801px]:border-b-0">
              {index === 0 && (
                <div className="w-full max-w-64 space-y-2 font-mono text-primary-text text-sm">
                  {["llms.txt", "API", "MCP"].map((endpoint) => (
                    <div
                      key={endpoint}
                      className="flex items-center gap-4 border-accent-foreground border-b py-2 last:border-b-0"
                    >
                      <span
                        aria-hidden="true"
                        className="text-foreground-dimmed"
                      >
                        ↳
                      </span>
                      {endpoint}
                    </div>
                  ))}
                </div>
              )}
              {index === 1 && (
                <div className="grid w-full max-w-64 grid-cols-4 items-center justify-items-center gap-8">
                  {(["chatgpt", "claude", "gemini", "perplexity"] as const).map(
                    (provider) => (
                      <ProviderLogo
                        key={provider}
                        provider={provider}
                        className="size-10"
                      />
                    ),
                  )}
                </div>
              )}
              {index === 2 && (
                <div
                  aria-hidden="true"
                  className="flex items-center gap-4 text-primary-text"
                >
                  <CommerceGlobePointerIcon className="size-12" />
                  <span className="h-px w-12 bg-accent-foreground" />
                  <span className="font-mono text-3xl">{"{ }"}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-start px-8 py-8 max-sm:px-4">
              <h3 className="max-w-[32ch]">{item.title}</h3>
              <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
                {item.body}
              </p>
              {item.href && (
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center gap-2 text-primary-text decoration-1 underline-offset-4 hover:underline"
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
  ),

  Team: ({ people }: { people: AboutContent["people"] }) => (
    <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground min-[801px]:grid-cols-3">
      {people.map((person) => (
        <article
          key={person.name}
          className="flex flex-col bg-background-dimmed px-8 py-8 max-sm:px-4"
        >
          <div className="border-accent-foreground border-b pb-6">
            <h3 className="max-w-[10ch] text-3xl">{person.name}</h3>
            <p className="mt-4 font-medium text-primary-text">{person.role}</p>
          </div>
          <p className="mt-6 flex-1 text-foreground-dimmed">{person.body}</p>
          <Link
            className="mt-8 inline-flex w-fit items-center gap-2 text-primary-text decoration-1 underline-offset-4 hover:underline"
            href={person.href}
          >
            {person.linkLabel}
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </article>
      ))}
    </div>
  ),

  Background: ({ sections }: SectionsProps) => (
    <div className="grid px-8 pb-10 max-sm:px-4 max-sm:pb-8 min-[801px]:grid-cols-3">
      {sections
        .find((section) => section.id === "before")
        ?.items?.map((item) => (
          <article
            key={item.title}
            className="relative border-accent-foreground border-l py-6 pr-8 pl-8 last:pr-0 max-[800px]:py-4 min-[801px]:border-t min-[801px]:border-l-0 min-[801px]:pt-8 min-[801px]:pl-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-6 left-0 size-2 -translate-x-1/2 bg-primary-text min-[801px]:top-0 min-[801px]:translate-x-0 min-[801px]:-translate-y-1/2"
            />
            <h3>{item.title}</h3>
            <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
              {item.body}
            </p>
          </article>
        ))}
    </div>
  ),

  Programs: ({ programs }: { programs: AboutContent["programs"] }) => (
    <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground min-[801px]:grid-cols-2">
      {programs.map((program, index) => {
        const image = programImages[index];
        return (
          <article
            key={program.name}
            className="grid min-h-48 grid-cols-[1fr_1.2fr] items-center gap-8 bg-background px-8 py-8 max-sm:grid-cols-1 max-sm:gap-6 max-sm:px-4 min-[801px]:last:odd:col-span-2 min-[801px]:last:odd:min-h-0 min-[801px]:last:odd:grid-cols-[1fr_3fr]"
          >
            {image ? (
              <Image
                src={image}
                alt={program.name}
                className={cn(
                  "h-auto max-h-16 w-auto max-w-48 object-contain object-left",
                  index === 0 && "opacity-80 brightness-0",
                  index === 3 && "max-h-24",
                )}
                unoptimized
              />
            ) : (
              <h3>{program.name}</h3>
            )}
            <div>
              {image && <h3 className="text-lg">{program.name}</h3>}
              {program.description && (
                <p className="mt-2 text-foreground-dimmed">
                  {program.description}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  ),

  Recognition: ({ sections }: SectionsProps) => (
    <div className="grid border-accent-foreground border-t min-[801px]:grid-cols-[1fr_2fr]">
      <div
        aria-hidden="true"
        className="flex items-center justify-center px-8 py-8 text-primary-text max-[800px]:hidden"
      >
        <AwardIcon className="size-24" />
      </div>
      <div className="border-accent-foreground min-[801px]:border-l">
        {sections
          .find((section) => section.id === "recognition")
          ?.items?.map((item) => (
            <article
              key={item.title}
              className="grid gap-2 border-accent-foreground border-b px-8 py-6 last:border-b-0 max-sm:px-4 min-[801px]:grid-cols-[1.2fr_1fr] min-[801px]:items-center min-[801px]:gap-8"
            >
              <h3 className="text-xl">{item.title}</h3>
              <p className="text-foreground-dimmed">{item.body}</p>
            </article>
          ))}
      </div>
    </div>
  ),
};
