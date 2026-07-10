import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import { PricingCTA } from "./pricing-cta";

type Cell = string | boolean;

type Row = {
  label: string;
  scan: Cell;
  payg: Cell;
  compete: Cell;
  dominate: Cell;
};

const rows: readonly Row[] = [
  {
    label: "Price",
    scan: "Free · one-time",
    payg: "3% of AI-attributed orders",
    compete: "$149/mo",
    dominate: "$449/mo",
  },
  {
    label: "Performance fee",
    scan: "None",
    payg: "3% · capped at $500/mo",
    compete: "None",
    dominate: "None",
  },
  {
    label: "Products",
    scan: "Top 10",
    payg: "Up to 1000",
    compete: "Up to 100",
    dominate: "Up to 1000",
  },
  {
    label: "Agent simulations",
    scan: "One-time",
    payg: "Continuous",
    compete: "Daily",
    dominate: "Continuous",
  },
  {
    label: "Win Rate Report",
    scan: true,
    payg: true,
    compete: true,
    dominate: true,
  },
  {
    label: "Competitor battlecards",
    scan: false,
    payg: true,
    compete: true,
    dominate: true,
  },
  {
    label: "Optimization suggestions",
    scan: false,
    payg: "Automatic",
    compete: "Manual",
    dominate: "Automatic",
  },
  {
    label: "One-click publish",
    scan: false,
    payg: true,
    compete: false,
    dominate: true,
  },
  {
    label: "Model drift alerts",
    scan: false,
    payg: true,
    compete: false,
    dominate: true,
  },
  {
    label: "UCP generation",
    scan: false,
    payg: true,
    compete: false,
    dominate: true,
  },
] as const;

const CompareCell = ({ value }: { value: Cell }) => {
  switch (true) {
    case value === true:
      return <CheckIcon className="mx-auto size-4 text-primary" />;
    case value === false:
      return (
        <span className="block text-center text-foreground-dimmed">—</span>
      );
    default:
      return (
        <span className="block text-center font-light text-foreground-dimmed">
          {value}
        </span>
      );
  }
};

export const Compare = () => (
  <section className="border-accent-foreground border-b">
    <div className="mx-auto max-w-6xl border-accent-foreground border-x">
      {/* Top corners are owned by the fee explainer's bottom pluses; bottom
          corners by the partnership bundle's top pluses. */}
      <div className="p-6 md:p-12">
        <span className="font-normal text-2xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-3xl text-foreground md:text-5xl">
          Compare plans
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-lg">
          The core loop is identical everywhere — paid tiers add scale,
          automation, and protocol features. Let the size of your catalog
          decide.
        </p>
      </div>

      <div className="relative border-accent-foreground border-t">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse">
            <thead>
              <tr className="border-accent-foreground border-b bg-background-dimmed">
                <th className="w-1/3 p-4 text-left font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
                  Plan
                </th>
                <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                  Scan
                </th>
                <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                  Pay-as-you-go
                </th>
                <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                  Compete
                </th>
                <th className="bg-primary/5 p-4 text-center font-body font-medium text-lg text-primary">
                  Dominate
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-accent-foreground border-b"
                >
                  <td className="p-4 font-body font-light text-foreground">
                    {row.label}
                  </td>
                  <td className="p-4">
                    <CompareCell value={row.scan} />
                  </td>
                  <td className="p-4">
                    <CompareCell value={row.payg} />
                  </td>
                  <td className="p-4">
                    <CompareCell value={row.compete} />
                  </td>
                  <td className="bg-primary/5 p-4">
                    <CompareCell value={row.dominate} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-4" />
                <td className="p-4 text-center">
                  <Button color="accent" render={<Link href="/sign-up" />}>
                    Scan free
                  </Button>
                </td>
                <td className="p-4 text-center">
                  <PricingCTA plan="payg">Start free</PricingCTA>
                </td>
                <td className="p-4 text-center">
                  <PricingCTA plan="compete">Start</PricingCTA>
                </td>
                <td className="bg-primary/5 p-4 text-center">
                  <PricingCTA plan="dominate" color="primary">
                    Start
                  </PricingCTA>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-accent-foreground border-t bg-background-dimmed p-4 md:flex-row md:items-center md:justify-between md:px-12">
        <p className="font-light text-foreground-dimmed text-sm">
          Running hundreds of SKUs across multiple stores, or need UCP signing
          and SSO? Enterprise adds custom limits and dedicated support.
        </p>
        <BookCall color="accent" className="w-full shrink-0 md:w-auto">
          Talk to sales
          <ArrowRightIcon className="size-4" />
        </BookCall>
      </div>
    </div>
  </section>
);
