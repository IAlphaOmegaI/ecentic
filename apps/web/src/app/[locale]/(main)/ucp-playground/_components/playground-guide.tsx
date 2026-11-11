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
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Link } from "@/i18n/navigation";

const stages = [
  { value: "discovery", artwork: "console", record: "GET /.well-known/ucp" },
  {
    value: "catalog",
    artwork: "commerce",
    record: "search_catalog · get_product",
  },
  { value: "cart", artwork: "cart", record: "create_cart · update_cart" },
  { value: "checkout", artwork: "bag", record: "continue_url" },
] as const;

export const PlaygroundGuide = ({
  copy,
  capabilities,
}: PlaygroundGuide.Props) => {
  const [open, setOpen] = useState<string[]>(["discovery"]);
  const selected = stages.find((stage) => stage.value === open[0]) ?? stages[0];
  const descriptions = [copy.discovery, ...capabilities];

  return (
    <aside className="flex min-w-0 flex-col bg-background-dimmed">
      <div className="px-8 pt-8 max-sm:px-4 max-sm:pt-6">
        <h3 className="text-foreground-rich text-xl leading-snug">
          {copy.title}
        </h3>
        <p className="mt-2 text-foreground-dimmed text-sm">
          {copy.description}
        </p>
      </div>
      <div className="h-48 min-w-0 px-8 text-primary max-sm:h-36 max-sm:px-4">
        <EvolvingAscii artwork={selected.artwork} />
      </div>
      <Accordion
        value={open}
        onValueChange={(value) =>
          setOpen(value.filter((entry) => typeof entry === "string"))
        }
        className="border-accent-foreground border-t"
      >
        {stages.map((stage, index) => {
          const content = descriptions[index];
          if (!content) return null;

          return (
            <AccordionItem
              key={stage.value}
              value={stage.value}
              className="border-accent-foreground last:border-b-0"
            >
              <AccordionTrigger
                className="items-center gap-4 px-8 py-4 hover:bg-background/60 focus-visible:outline-primary focus-visible:-outline-offset-4 data-panel-open:text-primary-text max-sm:px-4"
                classList={{
                  trigger: {
                    icon: "size-4 shrink-0 motion-reduce:transition-none",
                  },
                }}
              >
                <span className="text-sm tabular-nums" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{content.title}</span>
              </AccordionTrigger>
              <AccordionPanel className="motion-reduce:transition-none">
                <div className="space-y-4 px-8 pb-6 max-sm:px-4">
                  <p className="text-sm leading-relaxed">
                    {content.description}
                  </p>
                  <p className="break-words font-mono text-foreground text-xs leading-relaxed">
                    {stage.record}
                  </p>
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="mt-auto border-accent-foreground border-t px-8 py-6 max-sm:px-4">
        <Button color="neutral" render={<Link href="/ucp-validator" />}>
          {copy.action.secondary}
        </Button>
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
