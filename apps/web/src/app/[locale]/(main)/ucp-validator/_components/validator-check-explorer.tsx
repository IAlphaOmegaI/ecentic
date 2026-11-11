"use client";

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
            <dl className="mt-6 divide-y divide-accent-foreground border-accent-foreground border-y bg-background-dimmed">
              {check.targets.map((target) => (
                <div key={target.code} className="px-4 py-4">
                  <dt className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 text-foreground text-sm">
                    <span className="font-medium">{target.label}</span>
                    <code className="break-all font-mono text-primary-text text-xs">
                      {target.code}
                    </code>
                  </dt>
                  <dd className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
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
