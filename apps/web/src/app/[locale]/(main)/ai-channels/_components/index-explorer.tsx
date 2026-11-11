"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import type { AiChannel, AiChannelKey } from "@/content/ai-channels";
import { Link } from "@/i18n/navigation";

export const IndexExplorer = ({ channels, labels }: IndexExplorer.Props) => (
  <Tabs
    defaultValue="google"
    orientation="vertical"
    className="grid min-w-0 min-[1000px]:grid-cols-[1fr_2fr]"
  >
    <div className="min-w-0 bg-background-dimmed min-[1000px]:border-accent-foreground min-[1000px]:border-r">
      <TabsList
        aria-label={labels.providersLabel}
        className="grid w-full grid-cols-2 overflow-visible rounded-none border-0 min-[1000px]:grid-cols-1"
      >
        {channels.map((channel) => (
          <Tab
            key={channel.key}
            value={channel.key}
            className="h-auto min-h-24 min-w-0 flex-col items-start justify-center gap-2 whitespace-normal border-accent-foreground border-r border-b px-4 py-4 text-left text-foreground-rich last:border-r-0 even:border-r-0 focus-visible:z-10 focus-visible:outline-offset-[-4px] data-[active]:bg-background data-selected:bg-background data-[active]:text-primary-text data-selected:text-primary-text sm:px-8 min-[1000px]:min-h-28 min-[1000px]:border-r-0 min-[1000px]:last:border-b-0"
          >
            <span className="flex w-full items-center justify-between gap-4 text-base">
              {channel.name}
              <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
            </span>
            <MarketingStatus status={channel.status}>
              {channel.statusLabel}
            </MarketingStatus>
          </Tab>
        ))}
      </TabsList>
    </div>
    <div className="min-w-0 bg-background">
      {channels.map((channel) => (
        <TabsPanel
          key={channel.key}
          value={channel.key}
          keepMounted
          className="min-w-0 data-[hidden]:hidden"
        >
          <div className="grid gap-8 px-4 py-8 sm:px-8 sm:py-12">
            <div className="flex min-h-20 items-center justify-between gap-8">
              <ProviderLogo
                provider={channel.key}
                decorative
                className="h-20 w-auto max-w-56 rounded-none"
              />
              <MarketingStatus status={channel.status}>
                {channel.statusLabel}
              </MarketingStatus>
            </div>
            <div>
              <h3 className="!text-[clamp(1.75rem,3vw,2.75rem)]">
                {channel.name}
              </h3>
              <p className="mt-4 max-w-[52ch] text-foreground-dimmed text-lg leading-relaxed">
                {channel.summary}
              </p>
            </div>
            <div>
              <Button render={<Link href={channel.href} />}>
                {labels.open}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </div>
          <div className="border-accent-foreground border-t bg-background-dimmed px-4 py-8 sm:px-8">
            <p className="mb-4 font-medium text-foreground-rich">
              {labels.capabilitiesLabel}
            </p>
            <Tabs defaultValue="simulate">
              <TabsList
                aria-label={`${channel.name}: ${labels.capabilitiesLabel}`}
                className="grid w-full grid-cols-4 bg-background"
              >
                {channel.capabilities.map((capability) => (
                  <Tab
                    key={capability.key}
                    value={capability.key}
                    className="h-auto min-h-12 min-w-0 whitespace-normal px-2 py-2 text-sm data-[active]:bg-primary data-selected:bg-primary"
                  >
                    {capability.title}
                  </Tab>
                ))}
              </TabsList>
              {channel.capabilities.map((capability) => (
                <TabsPanel
                  key={capability.key}
                  value={capability.key}
                  keepMounted
                  className="min-h-40 pt-6 data-[hidden]:hidden"
                >
                  <MarketingStatus status={capability.status}>
                    {capability.statusLabel}
                  </MarketingStatus>
                  <p className="mt-4 max-w-[58ch] text-foreground-dimmed leading-relaxed">
                    {capability.detail}
                  </p>
                </TabsPanel>
              ))}
            </Tabs>
          </div>
          {channel.interests && (
            <div className="border-accent-foreground border-t px-4 py-8 sm:px-8">
              <p className="mb-4 font-medium text-foreground-rich">
                {labels.interestTitle}
              </p>
              {channel.interests}
            </div>
          )}
          <div className="border-accent-foreground border-t">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8">
              <h4 className="!text-lg">{labels.sourceTitle}</h4>
              <p className="text-foreground-dimmed text-sm">
                {labels.checked}:{" "}
                <time dateTime={channel.checkedAt}>{labels.date}</time>
              </p>
            </div>
            <ul>
              {channel.sources.map((source) => (
                <li
                  key={source.href}
                  className="border-accent-foreground border-t"
                >
                  <a
                    href={source.href}
                    className="flex items-center justify-between gap-6 px-4 py-4 text-primary-text text-sm underline decoration-accent-foreground underline-offset-4 hover:bg-background-dimmed focus-visible:outline-offset-[-4px] sm:px-8"
                  >
                    {source.title}
                    <ArrowRightIcon
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </TabsPanel>
      ))}
    </div>
  </Tabs>
);

export namespace IndexExplorer {
  export type Props = {
    labels: {
      providersLabel: string;
      capabilitiesLabel: string;
      interestTitle: string;
      open: string;
      sourceTitle: string;
      checked: string;
      date: string;
    };
    channels: {
      key: AiChannelKey;
      name: string;
      href: string;
      summary: string;
      status: AiChannel["status"];
      statusLabel: string;
      checkedAt: string;
      interests: ReactNode;
      capabilities: {
        key: keyof AiChannel["capabilities"];
        title: string;
        status: AiChannel["capabilities"][keyof AiChannel["capabilities"]];
        statusLabel: string;
        detail: string;
      }[];
      sources: { title: string; href: string }[];
    }[];
  };
}
