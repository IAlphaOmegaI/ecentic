"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";
import { Plus } from "@/components/plus";
import { SolutionRoadmap } from "../solution-roadmap";

export const AgenciesChallenges = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => <section aria-label={label}>{children}</section>;

export const AgenciesTracks = ({ items, labels }: AgenciesTracks.Props) => (
  <SolutionRoadmap
    tone="dark"
    label={labels.label}
    items={items.map((item, index) => ({
      title: item.title,
      body: item.body,
      path: labels.paths[index],
      figure: index === 0 ? "hub" : index === 1 ? "workflow" : "relay",
    }))}
  />
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
