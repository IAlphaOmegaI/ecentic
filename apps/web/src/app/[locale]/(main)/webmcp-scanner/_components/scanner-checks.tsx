"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { AppConfig } from "next-intl";

const checks = [
  "discovery",
  "metadata",
  "parameters",
  "implementation",
  "forms",
  "coverage",
  "runtime",
] as const;

export const ScannerChecks = ({ copy, labels }: ScannerChecks.Props) => (
  <Accordion defaultValue={["discovery"]} className="min-w-0 justify-start">
    {checks.map((check, index) => (
      <AccordionItem
        key={check}
        value={check}
        className="border-accent-foreground last:border-b-0 data-open:bg-background-dimmed"
      >
        <AccordionTrigger
          className="min-h-20 items-center px-7 py-6 font-heading text-xl leading-tight hover:bg-background-dimmed focus-visible:outline-offset-[-4px] max-sm:px-4"
          classList={{ trigger: { icon: "mr-0 size-4 shrink-0" } }}
        >
          <span className="flex items-baseline gap-4 text-left">
            <span className="text-primary-text text-sm tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{labels[check].title}</span>
          </span>
        </AccordionTrigger>
        <AccordionPanel>
          <p className="max-w-[64ch] px-7 pb-8 text-foreground-dimmed leading-relaxed max-sm:px-4">
            {copy.items[check]}
          </p>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace ScannerChecks {
  export type Props = {
    copy: AppConfig["Messages"]["webmcpPage"]["checks"];
    labels: AppConfig["Messages"]["webmcpScanner"]["report"]["audit"]["checks"];
  };
}
