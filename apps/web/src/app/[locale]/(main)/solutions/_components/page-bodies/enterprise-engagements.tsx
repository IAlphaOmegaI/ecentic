"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = ["console", "commerce", "cart"] as const;

export const EnterpriseEngagements = ({
  items,
  content,
  action,
}: EnterpriseEngagements.Props) => (
  <Tabs defaultValue={1}>
    <div className="border-accent-foreground border-t bg-background-dimmed px-4 py-4 sm:px-8 sm:py-6">
      <TabsList
        activateOnFocus
        aria-label={content.label}
        className="grid w-full grid-cols-3 gap-1 border-0 bg-background p-1"
      >
        {items.map((item, index) => (
          <Tab
            key={item.title}
            value={index}
            className="h-auto min-h-20 flex-col items-start justify-center gap-2 rounded-md border-0 px-3 py-4 text-left text-base leading-snug before:hidden hover:bg-background-rich focus-visible:outline-2 focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text sm:px-6"
          >
            <span>{item.title}</span>
            <span className="font-normal text-sm opacity-80">
              {content.items[index]?.duration}
            </span>
          </Tab>
        ))}
      </TabsList>
    </div>
    {items.map((item, index) => {
      const engagement = content.items[index];
      if (!engagement) return null;

      return (
        <TabsPanel key={item.title} value={index} keepMounted>
          <div className="relative grid border-accent-foreground border-t lg:grid-cols-2">
            <div className="relative flex min-w-0 flex-col border-accent-foreground bg-background-dimmed max-lg:border-b lg:border-r">
              <div className="relative min-h-64 flex-1 overflow-hidden text-primary-text/80 sm:min-h-80">
                <EvolvingAscii
                  artwork={artwork[index]}
                  className="absolute inset-0"
                />
              </div>
              <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
                <p className="max-w-[32ch] text-foreground-rich text-xl tracking-tight sm:text-2xl">
                  {engagement.question}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col bg-background px-4 py-8 sm:px-8 sm:py-10">
              <h3 className="text-3xl! sm:text-4xl!">{item.title}</h3>
              <p className="mt-6 max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {item.body}
              </p>
              <ol className="my-8 flex-1 border-accent-foreground border-t">
                {engagement.path.map((step, position) => (
                  <li
                    key={step}
                    className="flex items-center gap-4 border-accent-foreground border-b py-4 text-foreground-dimmed"
                  >
                    <span
                      className="text-primary-text text-sm tabular-nums"
                      aria-hidden="true"
                    >
                      {String(position + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-4">
                <Button render={<Link href={action.href} />}>
                  {action.label}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
                {index === 1 && (
                  <Button color="neutral" render={<Link href="#pilot" />}>
                    {content.pilotAction}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
          </div>
        </TabsPanel>
      );
    })}
  </Tabs>
);

export namespace EnterpriseEngagements {
  export type Props = {
    items: readonly { title: string; body: string }[];
    action: { label: string; href: string };
    content: {
      label: string;
      pilotAction: string;
      items: readonly {
        duration: string;
        question: string;
        path: readonly string[];
      }[];
    };
  };
}
