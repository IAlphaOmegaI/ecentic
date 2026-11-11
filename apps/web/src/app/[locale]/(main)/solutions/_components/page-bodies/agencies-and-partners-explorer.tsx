"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";
import { Plus } from "@/components/plus";
import { JourneyFigure } from "../journey-figure";

export const AgenciesChallenges = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Accordion className="border-accent-foreground border-t">
    <AccordionItem value="questions" className="border-b-0">
      <AccordionTrigger
        className="items-center bg-background-dimmed px-4 py-6 hover:bg-background-rich focus-visible:-outline-offset-4 sm:px-8"
        classList={{ trigger: { icon: "size-4 shrink-0" } }}
      >
        {label}
      </AccordionTrigger>
      <AccordionPanel className="[&_.marketing-grid>div:nth-child(2)]:bg-background-dimmed [&_.marketing-grid>div:nth-child(2)]:bg-none">
        {children}
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

export const AgenciesTracks = ({ items, labels }: AgenciesTracks.Props) => (
  <Tabs
    defaultValue={0}
    orientation="vertical"
    className="relative grid border-accent-foreground border-t lg:grid-cols-[3fr_7fr]"
  >
    <Plus className="top-0 left-[30%] -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
    <div className="border-accent-foreground bg-background-dimmed p-4 max-lg:border-b lg:border-r">
      <TabsList
        aria-label={labels.label}
        className="flex w-full flex-col gap-2 rounded-none border-0"
      >
        {items.map((item, index) => (
          <Tab
            key={item.title}
            value={index}
            className="h-auto min-h-16 w-full justify-start gap-4 rounded-md border-0 px-4 py-4 text-left text-base leading-snug before:hidden hover:bg-background-rich focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text lg:min-h-20 lg:py-6"
          >
            <span aria-hidden className="shrink-0 text-sm opacity-70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.title}</span>
          </Tab>
        ))}
      </TabsList>
    </div>
    {items.map((item, index) => (
      <TabsPanel
        key={item.title}
        value={index}
        className="min-w-0 bg-background"
      >
        <div className="relative grid md:min-h-[380px] md:grid-cols-2">
          <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <Plus className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
          <div className="flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8">
            <h3>{item.title}</h3>
            <p className="mt-6 max-w-[38ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {item.body}
            </p>
          </div>
          <div className="relative min-h-60 overflow-hidden border-accent-foreground bg-background-dimmed text-primary-text/80 max-md:border-t md:border-l">
            <JourneyFigure stage={index + 1} large />
          </div>
        </div>
        <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
          <p className="text-foreground-dimmed text-sm">{labels.pathLabel}</p>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {labels.paths[index]?.map((step, position) => (
              <li key={step} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="text-primary-text">
                  {position + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace AgenciesTracks {
  export type Props = {
    items: readonly { title: string; body: string }[];
    labels: {
      label: string;
      pathLabel: string;
      paths: readonly (readonly string[])[];
    };
  };
}

const AccountNode = ({ label }: { label: string }) => (
  <div className="relative z-10 flex min-h-20 items-center justify-center border border-accent-foreground bg-background px-4 py-4 text-center font-medium">
    {label}
  </div>
);

export const AgenciesAccess = ({ labels }: AgenciesAccess.Props) => (
  <Tabs defaultValue="single">
    <div className="border-accent-foreground border-t bg-background-dimmed p-4 sm:px-8 sm:py-6">
      <TabsList
        aria-label={labels.label}
        className="grid w-full grid-cols-1 gap-2 rounded-none border-0 sm:grid-cols-2"
      >
        {[
          { id: "single", label: labels.single },
          { id: "separate", label: labels.separate },
        ].map((option) => (
          <Tab
            key={option.id}
            value={option.id}
            className="h-auto min-h-14 rounded-md border-0 px-4 py-4 text-base before:hidden hover:bg-background-rich focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text"
          >
            {option.label}
          </Tab>
        ))}
      </TabsList>
    </div>
    {["single", "separate"].map((value) => (
      <TabsPanel
        key={value}
        value={value}
        className="relative grid border-accent-foreground border-t md:grid-cols-[2fr_3fr]"
      >
        <Plus className="top-0 left-[40%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <div className="flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8 md:py-12">
          <h3>
            {value === "single" ? labels.singleTitle : labels.separateTitle}
          </h3>
          <p className="mt-6 max-w-[42ch] text-foreground-dimmed text-lg max-sm:text-base">
            {value === "single"
              ? labels.singleDescription
              : labels.separateDescription}
          </p>
        </div>
        <div className="border-accent-foreground bg-background-dimmed px-4 py-8 max-md:border-t sm:px-8 md:border-l md:py-12">
          {value === "single" ? (
            <div className="mx-auto max-w-lg">
              <div className="mx-auto w-2/3">
                <AccountNode label={labels.owner} />
              </div>
              <div
                aria-hidden
                className="mx-auto h-6 w-px bg-accent-foreground"
              />
              <div className="relative grid grid-cols-2 gap-4">
                <span
                  aria-hidden
                  className="absolute top-0 right-[calc(25%-4px)] left-[calc(25%-4px)] border-accent-foreground border-t"
                />
                {[labels.store, labels.anotherStore].map((store) => (
                  <div key={store}>
                    <div
                      aria-hidden
                      className="mx-auto h-6 w-px bg-accent-foreground"
                    />
                    <AccountNode label={store} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto grid max-w-lg grid-cols-2 gap-4">
              {[
                { account: labels.firstClient, store: labels.firstStore },
                { account: labels.secondClient, store: labels.secondStore },
              ].map((client) => (
                <div key={client.account}>
                  <AccountNode label={client.account} />
                  <div
                    aria-hidden
                    className="flex h-12 items-center justify-center text-primary-text"
                  >
                    <ArrowRightIcon className="size-4 rotate-90" />
                  </div>
                  <AccountNode label={client.store} />
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsPanel>
    ))}
    <p className="border-accent-foreground border-t bg-background-dimmed px-4 py-6 text-foreground-dimmed sm:px-8">
      {labels.boundary}
    </p>
  </Tabs>
);

export namespace AgenciesAccess {
  export type Props = {
    labels: {
      label: string;
      single: string;
      separate: string;
      singleTitle: string;
      singleDescription: string;
      separateTitle: string;
      separateDescription: string;
      owner: string;
      store: string;
      anotherStore: string;
      firstClient: string;
      secondClient: string;
      firstStore: string;
      secondStore: string;
      boundary: string;
    };
  };
}
