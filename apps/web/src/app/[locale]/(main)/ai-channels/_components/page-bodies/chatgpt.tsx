import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["chatgptPage"];

const SectionHeading = ({ section }: { section: Section }) => (
  <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
  </div>
);

const ShoppingPath = ({ copy }: { copy: Copy["shopping"] }) => (
  <div className="grid border-accent-foreground border-t bg-background-dimmed lg:grid-cols-[1fr_1fr_1.25fr]">
    <div className="relative flex min-h-36 flex-col justify-center border-accent-foreground px-7 py-8 max-sm:px-4 max-lg:border-b lg:border-r">
      <p className="text-foreground-dimmed text-sm">{copy.feed}</p>
      <pre
        aria-hidden="true"
        className="mt-4 font-mono text-foreground text-sm leading-5"
      >
        {
          "+-----+  +-----+  +-----+\n| {...}  | {...}  | {...}\n+-----+  +-----+  +-----+"
        }
      </pre>
      <span
        aria-hidden="true"
        className="absolute top-1/2 -right-3 z-10 bg-background-dimmed font-mono text-xl max-lg:hidden"
      >
        {"-->"}
      </span>
    </div>
    <div className="relative flex min-h-36 flex-col justify-center border-accent-foreground px-7 py-8 max-sm:px-4 max-lg:border-b lg:border-r">
      <p className="font-heading text-3xl text-foreground-rich">ChatGPT</p>
      <p className="mt-2 text-foreground-dimmed text-sm">{copy.discovery}</p>
      <span
        aria-hidden="true"
        className="absolute top-1/2 -right-3 z-10 bg-background-dimmed font-mono text-xl max-lg:hidden"
      >
        {"-->"}
      </span>
    </div>
    <div className="grid grid-rows-2">
      <div className="border-accent-foreground border-b px-7 py-6 max-sm:px-4">
        <p className="text-foreground-dimmed text-sm">{copy.link}</p>
        <p className="mt-2 font-medium text-foreground-rich">{copy.store}</p>
      </div>
      <div className="px-7 py-6 max-sm:px-4">
        <p className="text-foreground-dimmed text-sm">{copy.approval}</p>
        <p className="mt-2 font-medium text-foreground-rich">{copy.checkout}</p>
      </div>
    </div>
  </div>
);

const ReadingExplorer = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["reading"];
}) => {
  const paragraphs = section.description?.split(/(?<=[.!?])\s+/u) ?? [];

  return (
    <Tabs defaultValue="product" className="min-w-0">
      <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
        <h2>{section.title}</h2>
        <TabsList
          aria-label={copy.label}
          className="mt-6 grid w-fit max-w-full grid-cols-3 max-sm:w-full"
        >
          {copy.records.map((record) => (
            <Tab
              key={record.id}
              value={record.id}
              className="h-auto min-h-12 px-5 py-3 text-base data-active:bg-foreground-rich data-selected:bg-foreground-rich data-active:text-background-rich data-selected:text-background-rich max-sm:px-2 max-sm:text-sm"
            >
              {record.title}
            </Tab>
          ))}
        </TabsList>
      </div>
      {copy.records.map((record, index) => (
        <TabsPanel key={record.id} value={record.id}>
          <div className="grid border-accent-foreground border-t md:grid-cols-[1.2fr_1fr]">
            <div className="relative isolate min-w-0 overflow-hidden border-accent-foreground bg-background-dimmed px-7 py-10 max-sm:px-4 max-md:border-b md:border-r">
              <div className="pointer-events-none absolute -right-8 bottom-0 -z-10 h-52 w-64 text-foreground-dimmed opacity-30 max-sm:-right-16 max-sm:h-44 max-sm:w-56">
                <EvolvingAscii artwork={index === 0 ? "bag" : "console"} />
              </div>
              <pre
                aria-hidden="true"
                className="relative m-0 whitespace-pre font-mono text-[clamp(0.68rem,1.05vw,0.9rem)] text-foreground-rich leading-7 tracking-normal"
              >
                {`+-- ${record.record}\n|\n${record.fields
                  .map((field) => `+-- ${field}\n|`)
                  .join("\n")}\n+--------------------------------`}
              </pre>
              <ul className="sr-only">
                {record.fields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-8 px-7 py-10 max-sm:px-4">
              <div>
                <h3>{record.title}</h3>
                <p className="mt-4 max-w-[44ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                  {paragraphs[index]}
                </p>
              </div>
              <p className="max-w-[44ch] text-foreground-dimmed text-sm">
                {copy.caption}
              </p>
            </div>
          </div>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

const MerchantEntry = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["entry"];
}) => {
  const paragraphs = section.description?.split(/(?<=[.!?])\s+/u) ?? [];

  return (
    <>
      <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
        <h2>{section.title}</h2>
      </div>
      <Accordion
        aria-label={copy.label}
        defaultValue={["entry-0"]}
        className="border-accent-foreground border-t"
      >
        {copy.steps.map((step, index) => (
          <AccordionItem
            key={step}
            value={`entry-${index}`}
            className="border-accent-foreground bg-background last:border-b-0 data-open:bg-background-dimmed"
          >
            <AccordionTrigger
              className="items-center px-7 py-6 text-xl max-sm:px-4 max-sm:text-lg"
              classList={{ trigger: { icon: "size-4 shrink-0" } }}
            >
              <span className="flex items-center gap-6 max-sm:gap-4">
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 font-heading text-3xl text-primary-text leading-none"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </span>
            </AccordionTrigger>
            <AccordionPanel className="transition-none">
              <p className="max-w-[78ch] pr-7 pb-8 pl-[92px] text-foreground-dimmed text-lg leading-relaxed max-sm:pr-4 max-sm:pl-[72px] max-sm:text-base">
                {paragraphs[index]}
              </p>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
};

export const ChatgptBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { chatgptPage: copy } = await getMessages();

  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>
          {section.id !== "shops" && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "shops":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <ShoppingPath copy={copy.shopping} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <ReadingExplorer section={section} copy={copy.reading} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "entry":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <MerchantEntry section={section} copy={copy.entry} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "ecentic":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <div className="border-accent-foreground border-t bg-background-dimmed [&_table]:border-0 max-sm:[&_table]:block max-sm:[&_tbody]:block max-sm:[&_td]:block max-sm:[&_td]:w-full max-sm:[&_td]:px-4 max-sm:[&_td]:pt-0 max-sm:[&_td]:pb-4 max-sm:[&_th]:block max-sm:[&_th]:w-full max-sm:[&_th]:px-4 max-sm:[&_th]:pt-6 max-sm:[&_th]:pb-3 max-sm:[&_th]:text-xl max-sm:[&_thead]:sr-only max-sm:[&_tr:last-child]:border-b-0 max-sm:[&_tr]:block max-sm:[&_tr]:border-accent-foreground max-sm:[&_tr]:border-b">
                      {sectionChildren?.[section.id]}
                    </div>
                  </MarketingBand>
                );
              default:
                return (
                  <MarketingSection section={section}>
                    {sectionChildren?.[section.id]}
                  </MarketingSection>
                );
            }
          })()}
        </Fragment>
      ))}
    </>
  );
};
