"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";

const ContentsLinks = ({ label, items }: PrivacyContents.Props) => (
  <nav aria-label={label}>
    <ol className="flex flex-col">
      {items.map((item) => (
        <li key={item.number}>
          <a
            href={item.href}
            className="flex min-h-12 items-baseline gap-4 border-accent-foreground border-b px-8 py-4 text-foreground-dimmed text-sm leading-5 transition-colors hover:bg-background hover:text-primary-text focus-visible:bg-background focus-visible:text-primary-text focus-visible:outline-offset-[-4px] max-sm:px-4"
          >
            <span className="w-5 shrink-0 text-primary">{item.number}</span>
            <span>{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  </nav>
);

export const PrivacyContents = ({ label, items }: PrivacyContents.Props) => (
  <div className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
    <div className="hidden lg:block">
      <h2 className="border-accent-foreground border-b px-8 py-6 text-xl">
        {label}
      </h2>
      <ContentsLinks label={label} items={items} />
    </div>
    <Accordion className="lg:hidden">
      <AccordionItem value="contents" className="border-b-0">
        <AccordionTrigger
          classList={{
            root: "px-8 max-sm:px-4",
            trigger: {
              root: "py-6 text-lg",
              icon: "size-4 shrink-0",
            },
          }}
        >
          {label}
        </AccordionTrigger>
        <AccordionPanel className="transition-none">
          <ContentsLinks label={label} items={items} />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </div>
);

export namespace PrivacyContents {
  export type Props = {
    label: string;
    items: readonly {
      number: string;
      title: string;
      href: string;
    }[];
  };
}
