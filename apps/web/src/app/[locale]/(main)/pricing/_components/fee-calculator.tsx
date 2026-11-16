"use client";

import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { MeasurementBars } from "@/components/hairline/measurement-chart";
import { EvidenceDisclosure } from "@/components/marketing/evidence-disclosure";
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
  const chartMoney = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
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
      payg: true,
    },
    ...plans.map((plan) => ({
      name: plan.name,
      value: plan.amountCents,
      payg: false,
    })),
  ];
  const maximum =
    Math.ceil(
      Math.max(100, ...comparisons.map((entry) => entry.value ?? 0)) / 5000,
    ) * 5000;
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
    <div
      data-interactive="payg-calculator"
      data-pricing-split="calculator"
      className="relative min-w-0 bg-background-rich"
    >
      <div className="relative px-8 py-8 max-sm:px-4">
        <p className="mb-4 flex items-center gap-2 font-medium text-primary-text text-sm">
          <span aria-hidden className="size-2 rounded-full bg-current" />
          {copy.eyebrow}
        </p>
        <h3 className="max-w-[25ch] font-heading text-3xl leading-tight tracking-tight">
          {copy.title}
        </h3>
        {ready ? (
          <InferredForm
            config={config}
            defaultValues={{ orders: "1", amount: "120" }}
            className="mt-8 grid gap-6 sm:grid-cols-2"
            onChange={(value) =>
              setValues({
                orders: value.orders ?? "",
                amount: value.amount ?? "",
              })
            }
          >
            {!parsed && (
              <p className="text-error text-sm sm:col-span-2" role="status">
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
        <p className="mt-4 text-foreground-dimmed text-sm">{copy.privacy}</p>
      </div>
      <div className="relative grid border-accent-foreground border-t min-[900px]:grid-cols-[2fr_3fr]">
        <div className="relative isolate flex min-w-0 flex-col justify-center border-accent-foreground border-b bg-emphasis-dimmed px-8 py-10 text-background-rich max-sm:px-4 min-[900px]:border-r min-[900px]:border-b-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-1 bg-radial-[at_0%_100%] from-primary/35 via-primary/5 to-transparent"
          />
          <p className="text-background-rich/70 text-sm">{copy.result}</p>
          <output
            className="mt-6 block font-heading text-6xl lg:text-7xl xl:text-8xl text-background-rich tabular-nums leading-none tracking-tighter"
            aria-live="polite"
            aria-atomic="true"
          >
            {amount === null ? "—" : format(amount)}
          </output>
          <div className="mt-10 flex items-end justify-between gap-4 border-background-rich/20 border-t pt-6">
            <p className="text-background-rich/70 text-sm">
              {presentation.rate}
            </p>
            <p className="font-heading text-5xl tabular-nums tracking-tight">
              {rateBps / 100}
              <span className="ml-1 text-2xl text-background-rich/60">%</span>
            </p>
          </div>
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 min-[900px]:hidden" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 min-[900px]:hidden" />
        </div>
        <div className="min-w-0 bg-linear-to-br from-background-rich via-background-rich to-primary/5 px-8 py-8 max-sm:px-4">
          <MeasurementBars
            label={presentation.comparison}
            maximum={maximum}
            ticks={[0, 0.5, 1].map((fraction) =>
              chartMoney.format((maximum * fraction) / 100),
            )}
            entries={comparisons.map((entry) => ({
              key: entry.name,
              label: entry.name,
              value: entry.value,
              formatted:
                entry.value === null
                  ? "—"
                  : chartMoney.format(entry.value / 100),
              primary: entry.payg,
            }))}
          />
        </div>
        <Plus className="top-0 left-[40%] hidden -translate-x-1/2 -translate-y-1/2 min-[900px]:flex" />
        <Plus className="bottom-0 left-[40%] hidden -translate-x-1/2 translate-y-1/2 min-[900px]:flex" />
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="border-accent-foreground border-t px-8 max-sm:px-4">
        <EvidenceDisclosure
          id="fee-details"
          title={presentation.details}
          compact
        >
          <div className="max-w-[72ch] space-y-4 text-base leading-relaxed">
            <p className="text-foreground-rich">
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
            <p className="text-foreground-dimmed text-sm">
              {copy.qualification}
            </p>
          </div>
        </EvidenceDisclosure>
      </div>
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    </div>
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
