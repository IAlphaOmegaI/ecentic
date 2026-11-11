"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = ["bag", "commerce", "cart", "console"] as const;

export const BrandsJobs = ({
  jobs,
  challenges,
  link,
  children,
}: BrandsJobs.Props) => (
  <>
    <Tabs defaultValue={jobs.items[0]?.id}>
      <div className="border-accent-foreground border-t bg-background-dimmed p-4 sm:p-6">
        <TabsList
          aria-label={jobs.label}
          className="grid w-full grid-cols-2 gap-1 border-0 bg-background p-1 lg:grid-cols-4"
        >
          {jobs.items.map((job) => (
            <Tab
              key={job.id}
              value={job.id}
              className="h-auto min-h-24 flex-col items-start justify-start gap-2 rounded-md border-0 px-4 py-4 text-left text-base leading-snug before:hidden hover:bg-background-rich focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text"
            >
              <span>{job.label}</span>
              <span className="font-normal text-sm leading-snug opacity-80">
                {job.scope}
              </span>
            </Tab>
          ))}
        </TabsList>
      </div>
      {jobs.items.map((job, index) => {
        const challenge = challenges[index];
        if (!challenge) return null;

        return (
          <TabsPanel key={job.id} value={job.id} keepMounted>
            <div className="relative grid border-accent-foreground border-t bg-background md:grid-cols-[5fr_7fr]">
              <Plus className="top-0 left-[41.666%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
              <div
                aria-hidden="true"
                inert
                className="relative min-h-64 overflow-hidden border-accent-foreground bg-background-dimmed text-primary-text/75 max-md:border-b md:min-h-[380px] md:border-r"
              >
                <EvolvingAscii
                  artwork={artwork[index]}
                  className="absolute inset-0"
                />
              </div>
              <div className="flex min-w-0 flex-col px-4 py-8 sm:px-8 md:min-h-[380px] md:py-10">
                <h3 className="max-w-[25ch] text-[clamp(1.6rem,2.6vw,2.4rem)]!">
                  {challenge.before}
                </h3>
                <p className="mt-6 max-w-[52ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                  {challenge.after}
                </p>
                <div className="mt-8 flex-1">
                  <Button render={<Link href={challenge.href} />}>
                    {link}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Button>
                </div>
                <ol className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm">
                  {job.path.map((step, position) => (
                    <li key={step} className="flex items-center gap-4">
                      {position > 0 && (
                        <ArrowRightIcon
                          aria-hidden
                          className="size-4 shrink-0 text-primary-text"
                        />
                      )}
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </TabsPanel>
        );
      })}
    </Tabs>
    {children && (
      <Accordion className="border-accent-foreground border-t">
        <AccordionItem value="all-challenges" className="border-b-0">
          <AccordionTrigger
            className="items-center px-4 py-6 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8"
            classList={{ trigger: { icon: "size-4 shrink-0" } }}
          >
            {jobs.details}
          </AccordionTrigger>
          <AccordionPanel className="[&_.marketing-grid>div:nth-child(2)]:bg-background-dimmed [&_.marketing-grid>div:nth-child(2)]:bg-none">
            {children}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    )}
  </>
);

export namespace BrandsJobs {
  export type Props = {
    jobs: {
      label: string;
      details: string;
      items: readonly {
        id: string;
        label: string;
        scope: string;
        path: readonly string[];
      }[];
    };
    challenges: readonly {
      before: string;
      after: string;
      href: string;
    }[];
    link: string;
    children?: ReactNode;
  };
}
