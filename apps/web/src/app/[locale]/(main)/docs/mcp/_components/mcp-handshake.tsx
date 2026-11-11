"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";

const exchanges = [
  { method: "initialize", response: "200" },
  { method: "notifications/initialized", response: "202" },
] as const;

export const McpHandshake = ({
  copy,
  details,
  example,
}: McpHandshake.Props) => (
  <div className="grid gap-px bg-accent-foreground lg:grid-cols-[5fr_6fr]">
    <Tabs defaultValue="initialize" className="min-w-0 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b p-8 max-sm:p-4">
        <p id="mcp-handshake-label" className="font-medium text-foreground">
          {copy.label}
        </p>
        <TabsList aria-labelledby="mcp-handshake-label">
          {exchanges.map((exchange, index) => (
            <Tab
              key={exchange.method}
              value={exchange.method}
              className="h-10 px-4 data-active:bg-primary data-selected:bg-primary"
            >
              {copy.tabs[index]}
            </Tab>
          ))}
        </TabsList>
      </div>
      {exchanges.map((exchange, index) => (
        <TabsPanel
          key={exchange.method}
          value={exchange.method}
          keepMounted
          className="min-w-0 outline-primary"
        >
          <div className="flex flex-col gap-6 p-8 max-sm:p-4">
            <dl className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-accent-foreground border-b pb-6">
              <div className="min-w-0">
                <dt className="text-foreground-dimmed text-sm">
                  {copy.request}
                </dt>
                <dd className="wrap-anywhere mt-2 font-mono text-foreground text-xs leading-relaxed">
                  {exchange.method}
                </dd>
              </div>
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 text-primary"
              />
              <div className="min-w-0">
                <dt className="text-foreground-dimmed text-sm">
                  {copy.response}
                </dt>
                <dd className="mt-2 font-mono text-foreground text-xl">
                  {exchange.response}
                </dd>
              </div>
            </dl>
            <h3 className="text-foreground text-xl">{copy.result[index]}</h3>
            {details[index]}
          </div>
        </TabsPanel>
      ))}
    </Tabs>
    <div className="min-w-0 bg-background-dimmed p-8 max-sm:p-4">{example}</div>
  </div>
);

export namespace McpHandshake {
  export type Props = {
    copy: AppConfig["Messages"]["docsMcpPage"]["handshake"];
    details: readonly ReactNode[];
    example: ReactNode;
  };
}
