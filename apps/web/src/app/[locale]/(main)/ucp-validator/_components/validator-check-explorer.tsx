"use client";

import { CheckIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";

export const ValidatorCheckExplorer = ({
  checks,
}: ValidatorCheckExplorer.Props) => (
  <Accordion
    defaultValue={[checks[0]?.title ?? ""]}
    className="min-w-0 justify-start bg-background"
  >
    {checks.map((check, index) => (
      <AccordionItem
        key={check.title}
        value={check.title}
        className="border-accent-foreground last:border-b-0"
      >
        <AccordionTrigger
          className="items-center gap-4 px-7 py-6 hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 max-sm:px-4"
          classList={{ trigger: { icon: "size-4 shrink-0 transition-none" } }}
        >
          <span className="flex items-center gap-4">
            <span aria-hidden="true" className="text-2xl text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-heading text-xl">{check.title}</span>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="transition-none">
          <div className="px-7 pb-6 max-sm:px-4">
            <p className="max-w-xl text-foreground-dimmed leading-relaxed">
              {check.description}
            </p>
            <dl className="mt-6 grid gap-6" data-validator-targets>
              {check.targets.map((target) => (
                <div
                  key={target.code}
                  className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-6"
                >
                  <dt className="flex min-w-0 gap-4 text-foreground text-sm">
                    <CheckIcon
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-primary-text"
                    />
                    <div className="min-w-0">
                      <span className="block font-medium">{target.label}</span>
                      <code className="mt-2 block break-all font-mono text-primary-text text-xs">
                        {target.code}
                      </code>
                    </div>
                  </dt>
                  <dd className="pl-8 text-foreground-dimmed text-sm leading-relaxed sm:pl-0">
                    {target.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace ValidatorCheckExplorer {
  export type Props = {
    checks: {
      title: string;
      description: string;
      targets: { label: string; detail: string; code: string }[];
    }[];
  };
}
