"use client";

import {
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { EvidenceDisclosure } from "@/components/marketing/evidence-disclosure";
import { Calculator } from "@/components/marketing/interactive/calculator";
import { InteractiveInput } from "@/components/marketing/interactive/text-input";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Plus } from "@/components/plus";
import { estimateFee, parseFeeInputs } from "./fee-calculation";

const OrdersInput = (props: InteractiveInput.Props) => (
  <InteractiveInput {...props} inputMode="numeric" />
);
const AmountInput = (props: InteractiveInput.Props) => (
  <InteractiveInput {...props} inputMode="decimal" />
);

export const FeeCalculator = ({
  copy,
  presentation,
  locale,
  rateBps,
  capCents,
  plans,
}: FeeCalculator.Props) => {
  const { ready } = useInteractive();
  const [values, setValues] = useState({ orders: "1", amount: "120" });
  const parsed = parseFeeInputs(values.orders, values.amount);
  const amount = parsed ? estimateFee({ ...parsed, rateBps, capCents }) : null;
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  });
  const format = (cents: number) => money.format(cents / 100);
  const cheaper =
    amount === null ? [] : plans.filter((plan) => plan.amountCents < amount);
  const tied =
    amount === null ? [] : plans.filter((plan) => plan.amountCents === amount);
  const comparisons = [
    {
      name: presentation.payg,
      value: amount,
      Icon: CommerceBasketShoppingIcon,
      payg: true,
    },
    ...plans.map((plan, index) => ({
      name: plan.name,
      value: plan.amountCents,
      Icon: [
        CommerceChartActivity_2Icon,
        CommercePlug_3SparkleIcon,
        CommerceFileShieldIcon,
      ][index],
      payg: false,
    })),
  ];
  const maximum = Math.max(1, ...comparisons.map((entry) => entry.value ?? 0));
  const config = {
    orders: field({
      shape: "custom",
      Component: OrdersInput,
      label: copy.orders,
      validator: z.string().regex(/^\d+$/, copy.invalidOrders),
      classList: { field: "min-w-0" },
    }),
    amount: field({
      shape: "custom",
      Component: AmountInput,
      label: copy.amount,
      validator: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, copy.invalidAmount),
      classList: { field: "min-w-0" },
    }),
  };
  return (
    <Calculator.Root
      data-interactive="payg-calculator"
      data-pricing-split="calculator"
      className="bg-background-rich"
    >
      <Calculator.Fields className="flex flex-col justify-center">
        <p className="mb-4 flex items-center gap-2 font-medium text-primary-text text-sm">
          <span aria-hidden className="size-2 rounded-full bg-current" />
          {copy.eyebrow}
        </p>
        <h3>{copy.title}</h3>
        {ready ? (
          <InferredForm
            config={config}
            defaultValues={{ orders: "1", amount: "120" }}
            className="mt-6 grid gap-6"
            onChange={(value) =>
              setValues({
                orders: value.orders ?? "",
                amount: value.amount ?? "",
              })
            }
          >
            {!parsed && (
              <p className="text-error text-sm" role="status">
                {copy.invalid}
              </p>
            )}
          </InferredForm>
        ) : (
          <p className="mt-6">
            {copy.staticExample.replace("{order}", format(12000)).replace(
              "{fee}",
              format(
                estimateFee({
                  orders: 1,
                  amountCents: 12000,
                  rateBps,
                  capCents,
                }),
              ),
            )}
          </p>
        )}
        <p className="mt-6 text-foreground-dimmed text-sm">{copy.privacy}</p>
      </Calculator.Fields>
      <Calculator.Result className="bg-linear-to-br from-primary/7 via-background-rich to-background-rich">
        <div className="flex flex-wrap items-center justify-between gap-3 text-foreground-dimmed text-sm">
          <p>{copy.result}</p>
          <p>
            {presentation.rate}{" "}
            <span className="ml-1 font-medium text-primary-text">
              {rateBps / 100}%
            </span>
          </p>
        </div>
        <output
          className="mt-5 block font-heading text-[clamp(48px,6vw,76px)] text-primary-text tabular-nums leading-none tracking-[-0.055em]"
          aria-live="polite"
          aria-atomic="true"
        >
          {amount === null ? "—" : format(amount)}
        </output>
        <figure className="mt-8 mb-0">
          <figcaption className="mb-5 text-foreground-dimmed text-sm">
            {presentation.comparison}
          </figcaption>
          <dl className="flex flex-col gap-5">
            {comparisons.map(({ name, value, Icon, payg }) => (
              <div
                key={name}
                className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2"
              >
                {Icon && (
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-6",
                      payg ? "text-primary" : "text-foreground-dimmed",
                    )}
                  />
                )}
                <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  {name}
                  {!payg &&
                    amount !== null &&
                    value !== null &&
                    value <= amount && (
                      <span className="text-success-foreground text-xs">
                        {value === amount
                          ? presentation.same
                          : presentation.lower}
                      </span>
                    )}
                </dt>
                <dd
                  className={cn(
                    "text-sm tabular-nums",
                    payg && "font-medium text-primary-text",
                  )}
                >
                  {value === null ? "—" : format(value)}
                </dd>
                <div aria-hidden className="relative col-start-2 col-end-4 h-2">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-md",
                      payg ? "bg-primary" : "bg-foreground-dimmed/40",
                    )}
                    style={{ width: `${((value ?? 0) / maximum) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </figure>
        <div className="mt-8 border-accent-foreground border-t pt-3 [&_button]:font-medium [&_button]:text-sm [&_h3_button]:text-sm">
          <EvidenceDisclosure id="fee-details" title={presentation.details}>
            <div className="space-y-3 text-foreground-dimmed text-sm leading-relaxed">
              <p>
                {copy.formula
                  .replace("{rate}", String(rateBps / 100))
                  .replace("{cap}", format(capCents))}
              </p>
              <p>
                {amount === null
                  ? copy.invalid
                  : cheaper.length
                    ? `${copy.cheaper} ${cheaper.map((plan) => `${plan.name} (${format(plan.amountCents)})`).join(", ")}`
                    : tied.length
                      ? `${copy.tie} ${tied.map((plan) => plan.name).join(", ")}`
                      : copy.noCheaper}
              </p>
              <p>{copy.qualification}</p>
            </div>
          </EvidenceDisclosure>
        </div>
      </Calculator.Result>
      <Plus className="top-0 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
    </Calculator.Root>
  );
};
export namespace FeeCalculator {
  export type Props = {
    copy: AppConfig["Messages"]["interactiveFee"];
    presentation: AppConfig["Messages"]["enterprisePricing"]["calculator"];
    locale: string;
    rateBps: number;
    capCents: number;
    plans: readonly { name: string; amountCents: number }[];
  };
}
