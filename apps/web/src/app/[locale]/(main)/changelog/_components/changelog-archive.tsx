"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { Plus } from "@/components/plus";

export const ChangelogArchive = ({ groups, copy }: ChangelogArchive.Props) => {
  const latest = groups[0]?.key;
  const [open, setOpen] = useState(latest ? [latest] : []);
  const expanded = open.length === groups.length;

  return (
    <div className="min-w-0 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b bg-background-dimmed px-4 py-6 sm:px-8">
        <p className="font-medium text-foreground-rich text-sm">
          {copy.archive}
        </p>
        <Button
          color="neutral"
          aria-controls="changelog-archive"
          onClick={() =>
            setOpen(
              expanded
                ? latest
                  ? [latest]
                  : []
                : groups.map(({ key }) => key),
            )
          }
        >
          {expanded ? copy.action.secondary : copy.action.primary}
        </Button>
      </div>
      <Accordion
        id="changelog-archive"
        multiple
        value={open}
        onValueChange={(value) =>
          setOpen(value.filter((entry) => typeof entry === "string"))
        }
      >
        {groups.map((group) => (
          <AccordionItem
            key={group.key}
            value={group.key}
            className="border-accent-foreground last:border-b-0"
          >
            <AccordionTrigger className="items-center bg-background-dimmed px-4 py-6 text-xl transition-colors hover:bg-background-rich focus-visible:bg-background-rich focus-visible:-outline-offset-4 sm:px-8 sm:text-2xl">
              {group.label}
            </AccordionTrigger>
            <AccordionPanel keepMounted className="transition-none">
              <ol className="border-accent-foreground border-t">
                {group.entries.map((entry) => (
                  <li
                    key={entry.commit}
                    className="relative grid border-accent-foreground border-b last:border-b-0 sm:grid-cols-[144px_minmax(0,1fr)]"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 px-4 pt-6 sm:block sm:border-accent-foreground sm:border-r sm:px-6 sm:py-8">
                      <time
                        dateTime={entry.date}
                        className="block text-foreground-dimmed text-sm leading-relaxed"
                      >
                        {entry.formattedDate}
                      </time>
                      <p className="font-medium text-primary-text text-sm sm:mt-4">
                        {entry.label}
                      </p>
                    </div>
                    <article className="relative min-w-0 px-4 pt-4 pb-6 sm:p-8">
                      <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:block" />
                      <h4 className="max-w-[30ch] text-xl leading-tight sm:text-2xl">
                        {entry.title}
                      </h4>
                      <p className="mt-4 max-w-[60ch] text-foreground-dimmed leading-relaxed">
                        {entry.body}
                      </p>
                    </article>
                  </li>
                ))}
              </ol>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export namespace ChangelogArchive {
  export type Entry =
    AppConfig["Messages"]["enterpriseCompany"]["changelog"]["entries"][number] & {
      formattedDate: string;
    };
  export type Props = {
    groups: { key: string; label: string; entries: Entry[] }[];
    copy: AppConfig["Messages"]["changelogPage"];
  };
}
