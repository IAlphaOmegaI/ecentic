"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { MarketingHeading } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { PublishedFilePreview } from "./preview";

const files = [
  { path: "/llms.txt", icon: CommerceFilePenIcon, format: "TXT" },
  {
    path: "/.well-known/api-catalog",
    icon: CommerceCode_3Icon,
    format: "JSON",
  },
  {
    path: "/ucp/agent-profile",
    icon: CommerceBasketShoppingIcon,
    format: "JSON",
  },
  { path: "/api/mcp", icon: CommercePlug_3SparkleIcon, format: "MCP" },
] as const;

export const PublishedFilesExplorer = ({
  copy,
}: {
  copy: AppConfig["Messages"]["interactiveFiles"];
}) => (
  <div
    data-interactive="published-files"
    className="relative border-accent-foreground border-t"
  >
    <MarketingEdgeCrosses />
    <MarketingHeading title={copy.title} description={copy.description} />
    <Tabs
      defaultValue={files[0].path}
      className="relative grid min-w-0 border-accent-foreground border-t lg:grid-cols-[1fr_2fr]"
    >
      <MarketingEdgeCrosses />
      <div className="relative min-w-0 border-accent-foreground border-b lg:border-r lg:border-b-0">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
        <TabsList
          aria-label={copy.title}
          className="grid h-full w-full grid-cols-2 overflow-visible rounded-none border-0 bg-background-rich"
        >
          {files.map(({ path, icon: Icon, format }, index) => (
            <Tab
              key={path}
              value={path}
              className="group relative h-auto min-h-44 min-w-0 flex-col items-start justify-between gap-5 border-accent-foreground border-r-0 border-b p-6 text-left text-foreground odd:border-r hover:text-primary-text data-[active]:bg-linear-to-br data-[active]:from-primary/12 data-[active]:to-transparent data-[active]:text-primary-text data-selected:text-primary-text max-sm:min-h-36 max-sm:p-4 [&:nth-last-child(-n+2)]:border-b-0"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <Icon className="size-8 text-primary-text" aria-hidden />
                <code className="text-foreground-dimmed text-xs group-data-[active]:text-primary-text">
                  {format}
                </code>
              </span>
              <span className="flex w-full items-end justify-between gap-3">
                <span className="font-heading text-xl leading-tight max-sm:text-lg">
                  {copy.tabs[index]}
                </span>
                <ArrowRightIcon
                  className="size-4 shrink-0 opacity-0 group-data-[active]:opacity-100"
                  aria-hidden
                />
              </span>
              {index === 0 && (
                <>
                  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                  <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
                </>
              )}
              {index < 3 && (
                <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              )}
            </Tab>
          ))}
        </TabsList>
      </div>
      <div className="relative min-w-0 bg-background-rich">
        <MarketingEdgeCrosses className="lg:hidden" />
        {files.map(({ path }) => (
          <TabsPanel
            key={path}
            value={path}
            className="min-w-0 focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:-outline-offset-2"
          >
            <PublishedFilePreview path={path} copy={copy} />
          </TabsPanel>
        ))}
      </div>
    </Tabs>
    <noscript>
      <div className="grid gap-3 border-accent-foreground border-t px-8 py-6 font-mono text-sm max-sm:px-4">
        {files.map(({ path }) => (
          <a
            key={path}
            href={path}
            className="break-all text-primary-text underline underline-offset-4"
          >
            {path}
          </a>
        ))}
      </div>
    </noscript>
  </div>
);
