"use client";

import { CheckIcon, CircleMinusIcon } from "@zenncore/icons";
import type { getMessages } from "next-intl/server";
import { MarketingEyebrow } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import {
  type CheckoutState,
  checkoutSteps,
} from "@/content/examples/checkout-run";
import { CodeDiff } from "./code-comparison";
import { FlowDiagram } from "./flow-diagram";

type Copy = Awaited<ReturnType<typeof getMessages>>["interactiveCheckout"];
type Code = Awaited<ReturnType<typeof getMessages>>["reviewCode"]["checkout"];

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

export const CheckoutRunClient = ({
  copy,
  code,
}: {
  copy: Copy;
  code?: Code;
}) => (
  <div
    data-checkout-run
    data-checkout-comparison="visible"
    className="relative min-w-0 border-accent-foreground border-t bg-background"
  >
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <header className="px-8 py-8 max-sm:px-4">
      <MarketingEyebrow>{copy.sampleLabel}</MarketingEyebrow>
      <h3>{copy.title}</h3>
      <p className="mt-4 max-w-[76ch] text-foreground-dimmed text-sm leading-relaxed">
        {copy.description}
      </p>
    </header>
    {code && (
      <>
        <CodeDiff
          rows={code.rows}
          filename={code.filename}
          label={code.label}
          before={copy.states.before}
          after={copy.states.after}
        />
        <p className="border-accent-foreground border-t px-8 py-6 text-foreground-dimmed text-sm max-sm:px-4">
          {code.note}
        </p>
      </>
    )}
    <div className="grid min-w-0 border-accent-foreground border-t md:grid-cols-2">
      {(["before", "after"] as const).map((state) => {
        const Icon = state === "after" ? CheckIcon : CircleMinusIcon;
        return (
          <section
            key={state}
            aria-label={copy.states[state]}
            className="relative min-w-0 border-accent-foreground last:border-t md:last:border-t-0 md:last:border-l"
          >
            <header className="flex min-h-24 items-center gap-4 border-accent-foreground border-b px-8 py-6 max-sm:px-4">
              <Icon
                aria-hidden
                className={`size-8 shrink-0 ${state === "after" ? "text-primary-text" : "text-warning-foreground"}`}
              />
              <h4 className="font-heading text-2xl">{copy.states[state]}</h4>
            </header>
            <CheckoutTrace state={state} copy={copy} />
          </section>
        );
      })}
    </div>
  </div>
);
