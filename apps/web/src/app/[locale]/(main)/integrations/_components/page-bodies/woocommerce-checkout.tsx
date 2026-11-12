import { getMessages } from "next-intl/server";
import { ConnectedJourney } from "@/components/marketing/connected-journey";
import { CodeDiff } from "@/components/marketing/interactive/code-comparison";
import { MarketingEyebrow } from "@/components/marketing/primitives";
import { checkoutSteps } from "@/content/examples/checkout-run";

/** The existing sample is inspected step by step; it never runs a checkout. */
export const WooCheckoutJourney = async () => {
  const { interactiveCheckout: copy, reviewCode } = await getMessages();
  const code = reviewCode.checkout;
  return (
    <div
      className="min-w-0 border-accent-foreground border-t bg-background"
      data-woo-checkout-journey
    >
      <div className="px-8 py-8 max-sm:px-4">
        <MarketingEyebrow>{copy.sampleLabel}</MarketingEyebrow>
        <h3>{copy.title}</h3>
        <p className="mt-4 max-w-[76ch] text-foreground-dimmed leading-relaxed">
          {copy.description}
        </p>
      </div>
      <ConnectedJourney
        label={copy.title}
        defaultValue="contact"
        items={checkoutSteps.map((step, index) => ({
          id: step.id,
          title: copy.steps[step.id].label,
          icon: index < 2 ? "catalog" : index === 4 ? "access" : "checkout",
          content: (
            <div>
              <div className="grid min-w-0 gap-8 md:grid-cols-2">
                {(["before", "after"] as const).map((state) => (
                  <div
                    key={state}
                    className="min-w-0 border-accent-foreground border-l pl-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-medium text-foreground-rich">
                        {copy.states[state]}
                      </p>
                      <span
                        className={
                          step[state] === "stopped"
                            ? "text-sm text-warning-foreground"
                            : "text-primary-text text-sm"
                        }
                      >
                        {copy.statuses[step[state]]}
                      </span>
                    </div>
                    <p className="mt-4 max-w-[44ch] text-foreground-dimmed leading-relaxed">
                      {copy.steps[step.id][state]}
                    </p>
                  </div>
                ))}
              </div>
              {step.id === "order" && (
                <div className="mt-6 grid gap-8 md:grid-cols-2">
                  {(["before", "after"] as const).map((state) => (
                    <p
                      key={state}
                      className="max-w-[44ch] text-foreground-dimmed text-sm leading-relaxed"
                    >
                      {copy.outcomes[state]}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ),
        }))}
      />
      <div className="marketing-seam border-accent-foreground border-y">
        <CodeDiff
          rows={code.rows}
          filename={code.filename}
          label={code.label}
          before={copy.states.before}
          after={copy.states.after}
        />
      </div>
      <p className="px-8 py-6 text-foreground-dimmed text-sm leading-relaxed max-sm:px-4">
        {code.note}
      </p>
    </div>
  );
};
