import {
  CheckIcon,
  CommerceBasketShoppingIcon,
  CommercePhoneIcon,
  CreditCardIcon,
} from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { CodeDiff } from "@/components/marketing/interactive/code-comparison";
import { MarketingEyebrow } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { checkoutSteps } from "@/content/examples/checkout-run";

/** A visible diagnostic sequence; no checkout or payment request is made. */
export const WooCheckoutJourney = async () => {
  const {
    interactiveCheckout: copy,
    reviewCode,
    round16Woo: review,
  } = await getMessages();
  const code = reviewCode.checkout;
  return (
    <div
      className="relative min-w-0 border-accent-foreground border-t bg-background"
      data-woo-checkout-journey
    >
      <header className="px-8 py-10 max-sm:px-4">
        <MarketingEyebrow>{copy.sampleLabel}</MarketingEyebrow>
        <h3 className="max-w-[22ch] font-heading text-3xl leading-tight sm:text-4xl">
          {review.title}
        </h3>
        <p className="mt-4 max-w-[72ch] text-foreground-dimmed leading-relaxed">
          {copy.description}
        </p>
      </header>
      <div className="relative border-accent-foreground border-t px-8 py-8 max-sm:px-4">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <p className="mb-6 font-medium text-foreground-rich">{review.passed}</p>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {checkoutSteps.slice(0, 4).map((step) => (
            <li key={step.id} className="flex min-w-0 items-start gap-4">
              <CheckIcon
                aria-hidden
                className="mt-1 size-4 shrink-0 text-primary-text"
              />
              <div className="min-w-0">
                <p className="font-medium text-foreground-rich">
                  {copy.steps[step.id].label}
                </p>
                <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                  {copy.steps[step.id].before}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative grid min-w-0 border-accent-foreground border-y lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative min-w-0 bg-linear-to-br from-primary/12 via-primary/4 to-transparent px-8 py-10 max-sm:px-4">
          <div aria-hidden className="mb-8 flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-sm border border-primary/30 bg-background-rich text-primary-text">
              <CommercePhoneIcon className="size-6" />
            </span>
            <span className="font-heading text-3xl text-primary-text">05</span>
          </div>
          <MarketingEyebrow>{review.blocker}</MarketingEyebrow>
          <h4 className="max-w-[22ch] font-heading text-2xl leading-tight sm:text-3xl">
            {copy.steps.contact.before}
          </h4>
          <p className="mt-6 max-w-[46ch] text-foreground-dimmed leading-relaxed">
            {copy.outcomes.before}
          </p>
          <div className="mt-10 border-accent-foreground border-t pt-6">
            <p className="font-medium text-primary-text">{review.change}</p>
            <p className="mt-3 max-w-[46ch] text-foreground-rich leading-relaxed">
              {copy.steps.contact.after}
            </p>
            <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-sm leading-relaxed">
              {code.note}
            </p>
          </div>
        </div>
        <div className="min-w-0 border-accent-foreground bg-emphasis-dimmed max-lg:border-t lg:border-l">
          <CodeDiff
            rows={code.rows}
            filename={code.filename}
            label={code.label}
            before={copy.states.before}
            after={copy.states.after}
          />
        </div>
      </div>
      <ol className="grid min-w-0 md:grid-cols-2" start={6}>
        {(["payment", "order"] as const).map((step, index) => {
          const Icon =
            index === 0 ? CreditCardIcon : CommerceBasketShoppingIcon;
          return (
            <li
              key={step}
              className="relative flex min-w-0 gap-6 px-8 py-10 max-sm:gap-4 max-sm:px-4 max-md:last:border-accent-foreground max-md:last:border-t md:last:border-accent-foreground md:last:border-l"
            >
              <div
                aria-hidden
                className="flex shrink-0 flex-col items-center gap-4"
              >
                <span className="grid size-12 place-items-center rounded-sm border border-accent-foreground bg-background-rich text-primary-text">
                  <Icon className="size-6" />
                </span>
                <span className="font-heading text-2xl text-primary-text">
                  0{index + 6}
                </span>
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-foreground-dimmed text-sm">
                  {review.continues}
                </p>
                <h4 className="font-heading text-2xl leading-tight">
                  {copy.steps[step].label}
                </h4>
                <p className="mt-4 max-w-[46ch] text-foreground-dimmed leading-relaxed">
                  {copy.steps[step].after}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
