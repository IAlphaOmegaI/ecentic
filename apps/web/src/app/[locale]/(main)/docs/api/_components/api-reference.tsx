"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { useDocument } from "@/hooks/use-document";

export const ApiReference = ({
  entries,
  groups = [],
  copy,
  rail,
}: ApiReference.Props) => {
  const { document, window } = useDocument();
  const [surface, setSurface] = useState("all");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (!window || !document) return;

    const revealAnchor = () => {
      const anchor = window.location.hash.slice(1);
      if (!entries.some((entry) => entry.id === anchor)) return;
      setSurface("all");
      setExpanded((current) =>
        current.includes(anchor) ? current : [...current, anchor],
      );
      setPendingAnchor(anchor);
    };

    revealAnchor();
    window.addEventListener("hashchange", revealAnchor);
    return () => window.removeEventListener("hashchange", revealAnchor);
  }, [entries, document, window]);

  useEffect(() => {
    if (!document || !pendingAnchor || surface !== "all") return;
    if (!expanded.includes(pendingAnchor)) return;
    document.getElementById(pendingAnchor)?.scrollIntoView({ block: "start" });
    setPendingAnchor(null);
  }, [expanded, surface, pendingAnchor, document]);

  const visible = entries.filter(
    (entry) => surface === "all" || entry.groups?.includes(surface),
  );
  const references = (
    <Accordion
      multiple
      value={expanded}
      onValueChange={(value) =>
        setExpanded(value.filter((entry) => typeof entry === "string"))
      }
      className="min-w-0 justify-start"
    >
      {visible.map((entry) => (
        <AccordionItem
          key={entry.id}
          id={entry.id}
          value={entry.id}
          className="min-w-0 scroll-mt-28 border-accent-foreground last:border-b-0"
        >
          <AccordionTrigger
            className="items-center px-6 py-6 hover:bg-background-dimmed focus-visible:outline-primary-text focus-visible:outline-offset-[-2px] max-sm:px-4"
            classList={{
              trigger: { icon: "shrink-0 motion-reduce:transition-none" },
            }}
          >
            <span className="grid min-w-0 gap-2">
              {entry.path ? (
                <span className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] items-baseline gap-4">
                  <code className="text-primary-text text-xs">
                    {entry.method}
                  </code>
                  <code className="wrap-anywhere text-sm">{entry.path}</code>
                </span>
              ) : (
                <code className="wrap-anywhere text-base">{entry.label}</code>
              )}
              {entry.path && (
                <span className="pl-18 font-normal text-foreground-dimmed text-sm max-sm:pl-0">
                  {entry.label}
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionPanel keepMounted className="transition-none">
            <div className="min-w-0 space-y-6 px-6 pb-6 max-sm:px-4">
              {entry.detail}
              <a
                href={`#${entry.id}`}
                className="inline-flex text-primary-text text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary-text"
              >
                {copy.permalink}
              </a>
            </div>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );

  if (!groups.length)
    return (
      <div className="grid min-w-0 grid-cols-1 border-accent-foreground border-t lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 border-accent-foreground border-b bg-background-dimmed p-6 max-sm:p-4 lg:border-r lg:border-b-0">
          {rail}
        </aside>
        {references}
      </div>
    );

  return (
    <Tabs
      value={surface}
      onValueChange={(value) => {
        if (typeof value === "string") setSurface(value);
      }}
      orientation="vertical"
      className="grid min-w-0 grid-cols-1 border-accent-foreground border-t lg:grid-cols-[260px_minmax(0,1fr)]"
    >
      <aside className="min-w-0 border-accent-foreground border-b bg-background-dimmed lg:border-r lg:border-b-0">
        <div className="p-6 max-sm:p-4 lg:sticky lg:top-24">
          <p className="mb-4 text-foreground-dimmed text-sm">{copy.surfaces}</p>
          <TabsList
            aria-label={copy.surfaces}
            className="grid w-full grid-cols-2 gap-px rounded-none border-0 bg-accent-foreground lg:grid-cols-1"
          >
            {groups.map((group) => (
              <Tab
                key={group.id}
                value={group.id}
                className="h-auto min-h-12 justify-between gap-2 border-0 bg-background-dimmed px-4 py-2 text-left text-sm data-[active]:bg-primary data-selected:bg-primary data-[active]:text-background-rich data-selected:text-background-rich"
              >
                <span>{group.label}</span>
                <span className="tabular-nums">
                  {
                    entries.filter(
                      (entry) =>
                        group.id === "all" || entry.groups?.includes(group.id),
                    ).length
                  }
                </span>
              </Tab>
            ))}
          </TabsList>
          <div className="mt-8 hidden lg:block">{rail}</div>
        </div>
      </aside>
      <TabsPanel value={surface} className="min-w-0 outline-none">
        {references}
      </TabsPanel>
    </Tabs>
  );
};

export namespace ApiReference {
  export type Entry = {
    id: string;
    label: string;
    path?: string;
    method?: string;
    groups?: readonly string[];
    detail: ReactNode;
  };
  export type Props = {
    entries: readonly Entry[];
    groups?: readonly { id: string; label: string }[];
    copy: AppConfig["Messages"]["docsApiPage"];
    rail: ReactNode;
  };
}
