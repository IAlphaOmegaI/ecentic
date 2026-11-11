"use client";

import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Calculator } from "@/components/marketing/interactive/calculator";
import { InteractiveInput } from "@/components/marketing/interactive/text-input";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { estimateFee, parseFeeInputs } from "./fee-calculation";

const OrdersInput = (props: InteractiveInput.Props) => (
  <InteractiveInput {...props} inputMode="numeric" />
);
const AmountInput = (props: InteractiveInput.Props) => (
  <InteractiveInput {...props} inputMode="decimal" />
);

export const FeeCalculator = ({
  copy,
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
    <Calculator.Root data-interactive="payg-calculator" className="border-t">
      <Calculator.Fields>
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
        <p className="mt-6 text-foreground text-sm">{copy.privacy}</p>
      </Calculator.Fields>
      <Calculator.Result>
        <p>{copy.result}</p>
        <output
          className="mt-4 block font-heading text-5xl text-primary-text tabular-nums leading-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {amount === null ? "—" : format(amount)}
        </output>
        <p className="mt-6 text-foreground text-sm">
          {copy.formula
            .replace("{rate}", String(rateBps / 100))
            .replace("{cap}", format(capCents))}
        </p>
        <p className="mt-6 font-medium">
          {amount === null
            ? copy.invalid
            : cheaper.length
              ? `${copy.cheaper} ${cheaper.map((plan) => `${plan.name} (${format(plan.amountCents)})`).join(", ")}`
              : tied.length
                ? `${copy.tie} ${tied.map((plan) => plan.name).join(", ")}`
                : copy.noCheaper}
        </p>
        <p className="mt-4 text-foreground text-sm">{copy.qualification}</p>
      </Calculator.Result>
    </Calculator.Root>
  );
};
export namespace FeeCalculator {
  export type Props = {
    copy: AppConfig["Messages"]["interactiveFee"];
    locale: string;
    rateBps: number;
    capCents: number;
    plans: readonly { name: string; amountCents: number }[];
  };
}
