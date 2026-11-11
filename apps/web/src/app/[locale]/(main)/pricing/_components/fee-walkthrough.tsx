"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { useState } from "react";

export const FeeWalkthrough = ({ fee, amounts }: FeeWalkthrough.Props) => {
  const [active, setActive] = useState(0);
  const diagrams = [
    [
      "  +---------+                 /\\",
      "  |  >_     |                /  \\",
      "  |         | ------------> /____\\",
      "  +----+----+               | [] |",
      "       |                    |____|",
      "     -----                     |",
      "                               v",
      "       [1]--[2]--[3]--[4]--[5]--[6]--[7]",
    ].join("\n"),
    [
      "       .----.",
      "      /      \\",
      "  +--+--------+--+",
      "  |              |      +--------------+",
      `  | ${amounts.order.padEnd(12)} | ---> | ${amounts.order.padEnd(12)} |`,
      "  |              |      +--------------+",
      "  +--------------+             |",
      "                               v",
    ].join("\n"),
    [
      "  +--------------+     +--------------+",
      `  | ${amounts.order.padEnd(12)} |  x  | 3%           |`,
      "  +--------------+     +------+-------+",
      "                              |",
      "                              v",
      "                       +--------------+",
      `                  =    | ${amounts.fee.padEnd(12)} |`,
      "                       +--------------+",
    ].join("\n"),
    [
      "      +        +        +",
      "      |        |        |",
      "      +--------+--------+",
      "               |",
      "               v",
      "       +--------------+",
      `       | ${amounts.cap.padEnd(12)} |`,
      "       +--------------+",
      "       ================",
    ].join("\n"),
  ];

  return (
    <Tabs
      orientation="vertical"
      value={active}
      onValueChange={(value) => {
        if (typeof value === "number") setActive(value);
      }}
      className="grid min-w-0 grid-cols-1 lg:grid-cols-[1.1fr_1fr]"
    >
      <TabsList
        activateOnFocus
        aria-label={fee.example.fee}
        className="w-full flex-col justify-center rounded-none border-0 border-accent-foreground lg:border-r"
      >
        {fee.steps.map((step, index) => (
          <Tab
            key={step.title}
            value={index}
            className="h-auto min-h-24 w-full justify-start gap-4 border-accent-foreground border-r-0 border-b px-7 py-6 text-left text-foreground-dimmed last:border-b-0 focus-visible:before:outline-0 data-[active]:bg-background-dimmed data-[active]:text-primary-text max-sm:px-4"
          >
            <span aria-hidden="true" className="text-3xl leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="max-w-[26ch] text-balance font-heading text-xl leading-snug">
              {step.title}
            </span>
          </Tab>
        ))}
      </TabsList>
      {fee.steps.map((step, index) => (
        <TabsPanel
          key={step.title}
          value={index}
          className="min-w-0 border-accent-foreground border-t bg-background-dimmed lg:border-t-0"
        >
          <div className="flex h-full flex-col justify-center px-7 py-8 max-sm:px-4">
            <div className="flex h-48 items-center text-primary-text [container-type:inline-size]">
              <pre
                aria-hidden="true"
                data-fee-diagram={index}
                className="m-0 whitespace-pre bg-transparent p-0 font-mono text-[min(16px,calc(100cqw/25))] leading-[1.45] tracking-normal"
              >
                {diagrams[index]}
              </pre>
            </div>
            <p className="mt-6 max-w-[45ch] text-base text-foreground-dimmed leading-relaxed">
              {step.body}
            </p>
          </div>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

export namespace FeeWalkthrough {
  export type Props = {
    fee: AppConfig["Messages"]["enterprisePricing"]["fee"];
    amounts: { order: string; fee: string; cap: string };
  };
}
