import { cn } from "@zenncore/utils";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { SellJourney } from "./sell-journey";

type Section = MarketingBodyProps["sections"][number];

const SectionHeading = ({ section }: { section: Section }) => (
  <>
    {section.eyebrow && (
      <p className="mb-4 text-primary-text text-sm">{section.eyebrow}</p>
    )}
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-6 max-w-[54ch] text-foreground-dimmed text-lg max-sm:text-base">
        {section.description}
      </p>
    )}
  </>
);

const CheckoutRequirements = ({
  section,
  children,
}: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid min-[900px]:grid-cols-2">
      <div className="marketing-cell relative flex min-w-0 flex-col px-8 py-12 max-sm:px-4 max-sm:py-8">
        <SectionHeading section={section} />
        <div className="mt-8 h-44 text-primary-text sm:h-52">
          <EvolvingAscii artwork="cart" />
        </div>
      </div>
      <ol className="m-0 flex list-none flex-col justify-center bg-background-dimmed px-8 py-12 max-sm:px-4 max-sm:py-8">
        {section.items?.map((item, index) => (
          <li key={item.title} className="relative flex gap-6 pb-10 last:pb-0">
            <span className="relative flex w-10 shrink-0 justify-center font-heading text-3xl text-primary-text leading-none">
              {String(index + 1).padStart(2, "0")}
              {index < (section.items?.length ?? 0) - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-10 bottom-2 left-1/2 border-accent-foreground border-l after:absolute after:-bottom-1 after:-left-1 after:size-2 after:rotate-45 after:border-accent-foreground after:border-r after:border-b"
                />
              )}
            </span>
            <div className="min-w-0">
              <h3>{item.title}</h3>
              <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
    {children}
  </MarketingBand>
);

const StoreOwnership = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid min-[900px]:grid-cols-[1fr_1.5fr]">
      <div className="marketing-cell relative px-8 py-12 max-sm:px-4 max-sm:py-8">
        <SectionHeading section={section} />
      </div>
      <div className="relative border-accent-foreground min-[900px]:border-l">
        {section.items?.map((item, index) => (
          <article
            key={item.title}
            className="grid grid-cols-[2rem_1fr] gap-6 border-accent-foreground border-t px-8 py-8 first:border-t-0 max-sm:gap-4 max-sm:px-4"
          >
            <span aria-hidden="true" className="pt-1 text-primary-text">
              {index === 0 ? "↳" : index === 1 ? "↔" : "↗"}
            </span>
            <div>
              <h3>{item.title}</h3>
              <p className="mt-4 max-w-[48ch] text-foreground-dimmed">
                {item.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
    {children}
  </MarketingBand>
);

const CheckoutSurface = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
  >
    <div className="grid min-[900px]:grid-cols-[1.5fr_1fr]">
      <div className="relative min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8">
        <h2>{section.title}</h2>
        {section.paragraphs?.map((paragraph) => (
          <p
            key={paragraph}
            className="mt-6 max-w-[56ch] text-foreground-dimmed"
          >
            {paragraph}
          </p>
        ))}
        <MarketingActions actions={section.links ?? []} />
      </div>
      <div className="relative min-h-64 border-accent-foreground text-primary-text min-[900px]:border-l">
        <EvolvingAscii artwork="bag" />
      </div>
    </div>
    {children}
  </MarketingBand>
);

const ToolSection = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
  >
    <div className="grid min-[900px]:grid-cols-[1fr_1.5fr]">
      <div className="relative px-8 py-10 max-sm:px-4 max-sm:py-8">
        <h2>{section.title}</h2>
      </div>
      <div className="relative px-8 py-10 max-sm:px-4 max-sm:pt-0 max-sm:pb-8">
        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph} className="max-w-[58ch] text-foreground-dimmed">
            {paragraph}
          </p>
        ))}
        <MarketingActions actions={section.links ?? []} />
      </div>
    </div>
    {children}
  </MarketingBand>
);

export const SellBody = ({ sections, sectionChildren }: MarketingBodyProps) => (
  <div className="[&_.marketing-band]:border-t-0">
    {sections.map((section) => {
      const children = sectionChildren?.[section.id];
      switch (section.id) {
        case "problem":
          return (
            <CheckoutRequirements key={section.id} section={section}>
              {children}
            </CheckoutRequirements>
          );
        case "how-it-works":
          return (
            <div key={section.id}>
              <SectionGutter />
              <MarketingBand
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
                  <SectionHeading section={section} />
                </div>
                <SellJourney section={section} />
                {children}
              </MarketingBand>
            </div>
          );
        case "why-it-works":
          return (
            <StoreOwnership key={section.id} section={section}>
              {children}
            </StoreOwnership>
          );
        case "checkout":
          return (
            <CheckoutSurface key={section.id} section={section}>
              {children}
            </CheckoutSurface>
          );
        case "playground":
        case "validator":
        case "webmcp":
          return (
            <ToolSection key={section.id} section={section}>
              {children}
            </ToolSection>
          );
        default:
          return (
            <div
              key={section.id}
              className={cn(
                section.id === "example" &&
                  "[&_.marketing-band>.marketing-rail>.marketing-cell]:pb-0 [&_.marketing-rows]:border-b-0",
                section.id === "chatgpt" &&
                  "[&_.marketing-band>.marketing-rail]:bg-background-dimmed [&_.marketing-band]:border-t-0",
              )}
            >
              <MarketingSection section={section}>{children}</MarketingSection>
            </div>
          );
      }
    })}
  </div>
);
