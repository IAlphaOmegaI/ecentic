"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { getMessages } from "next-intl/server";
import { useState } from "react";
import { MarketingEyebrow } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import {
  type CheckoutState,
  checkoutSteps,
} from "@/content/examples/checkout-run";
import { FlowDiagram } from "./flow-diagram";
import { useInteractive } from "./use-interactive";

type Copy = Awaited<ReturnType<typeof getMessages>>["interactiveCheckout"];

const CheckoutTrace = ({
  state,
  copy,
}: {
  state: CheckoutState;
  copy: Copy;
}) => (
  <div data-checkout-trace={state}>
    <FlowDiagram
      label={copy.states[state]}
      nodes={checkoutSteps.map((step) => ({
        id: step.id,
        label: copy.steps[step.id].label,
        description:
          step.id === "contact" || step.id === "payment"
            ? copy.steps[step.id][state]
            : undefined,
        status: step[state],
      }))}
      statusLabels={copy.statuses}
    />
    <p className="border-accent-foreground border-t px-8 py-6 text-foreground-rich max-sm:px-4">
      {copy.outcomes[state]}
    </p>
  </div>
);

export const CheckoutRunClient = ({ copy }: { copy: Copy }) => {
  const { ready, reduced } = useInteractive();
  const [state, setState] = useState<CheckoutState>("before");
  const states = ["before", "after"] as const;

  return (
    <div
      data-checkout-run
      data-interactive={ready && !reduced}
      className="relative border-accent-foreground border-t bg-background"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div className="px-8 py-6 max-sm:px-4">
        <MarketingEyebrow>{copy.sampleLabel}</MarketingEyebrow>
        <h3>{copy.title}</h3>
        <p className="mt-4 max-w-[76ch] text-foreground-dimmed text-sm leading-relaxed">
          {copy.description}
        </p>
      </div>
      {!ready || reduced ? (
        <div
          data-checkout-static
          className="grid border-accent-foreground border-t lg:grid-cols-2"
        >
          {states.map((outcome) => (
            <section
              key={outcome}
              aria-label={copy.states[outcome]}
              className="min-w-0 border-accent-foreground last:border-t lg:last:border-t-0 lg:last:border-l"
            >
              <h4 className="border-accent-foreground border-b px-8 py-4 font-medium text-foreground-rich text-lg max-sm:px-4">
                {copy.states[outcome]}
              </h4>
              <CheckoutTrace state={outcome} copy={copy} />
            </section>
          ))}
        </div>
      ) : (
        <Tabs
          value={state}
          onValueChange={(value) => {
            if (value === "before" || value === "after") setState(value);
          }}
        >
          <TabsList
            aria-label={copy.controlsLabel}
            className="grid w-full grid-cols-2 overflow-visible rounded-none border-x-0 bg-background"
          >
            {states.map((outcome) => (
              <Tab
                key={outcome}
                value={outcome}
                className="group min-h-14 gap-2 px-8 text-base outline-1 outline-transparent -outline-offset-1 transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 focus-visible:before:outline-0 data-[active]:text-foreground-rich data-selected:text-foreground-rich data-[active]:outline-primary data-selected:outline-primary max-sm:px-4"
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-foreground-dimmed group-data-[active]:bg-primary group-data-selected:bg-primary"
                />
                {copy.states[outcome]}
              </Tab>
            ))}
          </TabsList>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {copy.outcomes[state]}
          </p>
          {states.map((outcome) => (
            <TabsPanel
              key={outcome}
              value={outcome}
              className="focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
            >
              <CheckoutTrace state={outcome} copy={copy} />
            </TabsPanel>
          ))}
        </Tabs>
      )}
    </div>
  );
};
