"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import type { getMessages } from "next-intl/server";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

const stages = [
  { value: "discovery", record: "GET /.well-known/ucp" },
  {
    value: "catalog",
    record: "search_catalog · get_product",
  },
  { value: "cart", record: "create_cart · update_cart" },
  { value: "checkout", record: "continue_url" },
] as const;

export const PlaygroundGuide = ({
  copy,
  capabilities,
}: PlaygroundGuide.Props) => {
  const [open, setOpen] = useState<string[]>(["discovery"]);
  const descriptions = [copy.discovery, ...capabilities];

  return (
    <aside className="flex min-w-0 flex-col bg-linear-to-br from-primary/15 via-transparent to-transparent md:row-span-2 md:grid md:grid-rows-subgrid">
      <div className="border-background-rich/15 border-b px-8 py-6 max-sm:px-4">
        <h3 className="text-background-rich text-xl leading-snug">
          {copy.title}
        </h3>
        <p className="mt-2 text-background-rich/65 text-sm">
          {copy.description}
        </p>
      </div>
      <div className="flex min-h-0 flex-col">
        <Accordion
          value={open}
          onValueChange={(value) =>
            setOpen(value.filter((entry) => typeof entry === "string"))
          }
          className="border-background-rich/15"
        >
          {stages.map((stage, index) => {
            const content = descriptions[index];
            if (!content) return null;

            return (
              <AccordionItem
                key={stage.value}
                value={stage.value}
                className="border-background-rich/15 last:border-b-0"
              >
                <AccordionTrigger
                  className="items-center gap-4 px-8 py-5 text-background-rich hover:bg-background-rich/5 focus-visible:outline-primary-rich focus-visible:-outline-offset-4 data-panel-open:text-primary-rich max-sm:px-4"
                  classList={{
                    trigger: {
                      icon: "size-4 shrink-0 motion-reduce:transition-none",
                    },
                  }}
                >
                  <span
                    className="font-heading text-2xl text-primary-rich tabular-nums"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{content.title}</span>
                </AccordionTrigger>
                <AccordionPanel className="motion-reduce:transition-none">
                  <div className="space-y-4 px-8 pb-6 max-sm:px-4">
                    <p className="text-background-rich/75 text-sm leading-relaxed">
                      {content.description}
                    </p>
                    <p className="break-words font-mono text-primary-rich text-xs leading-relaxed">
                      {stage.record}
                    </p>
                  </div>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
        <div className="mt-auto border-background-rich/15 border-t px-8 py-6 max-sm:px-4">
          <Button color="neutral" render={<Link href="/ucp-validator" />}>
            {copy.action.secondary}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export namespace PlaygroundGuide {
  export type Props = {
    copy: Awaited<ReturnType<typeof getMessages>>["playgroundPage"]["guide"];
    capabilities: Awaited<
      ReturnType<typeof getMessages>
    >["ucpPlayground"]["capabilities"];
  };
}
