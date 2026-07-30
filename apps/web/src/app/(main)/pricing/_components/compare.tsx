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
    compete: "$14.90/mo",
    dominate: "$44.90/mo",
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

const compareCtaClassName = "mx-auto w-36";

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
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Compare plans
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
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
                <th className="bg-primary/5 p-4 text-center font-body font-medium text-lg text-primary">
                  Pay-as-you-go
                </th>
                <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                  Compete
                </th>
                <th className="p-4 text-center font-body font-medium text-foreground text-lg">
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
                  <td className="bg-primary/5 p-4">
                    <CompareCell value={row.payg} />
                  </td>
                  <td className="p-4">
                    <CompareCell value={row.compete} />
                  </td>
                  <td className="p-4">
                    <CompareCell value={row.dominate} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-4" />
                <td className="p-4 text-center">
                  <Button
                    color="accent"
                    className={compareCtaClassName}
                    render={<Link href="/sign-up" />}
                  >
                    Scan free
                  </Button>
                </td>
                <td className="bg-primary/5 p-4 text-center">
                  <PricingCTA
                    plan="payg"
                    color="success"
                    className={compareCtaClassName}
                  >
                    Start free
                  </PricingCTA>
                </td>
                <td className="p-4 text-center">
                  <PricingCTA plan="compete" className={compareCtaClassName}>
                    Start
                  </PricingCTA>
                </td>
                <td className="p-4 text-center">
                  <PricingCTA
                    plan="dominate"
                    color="primary"
                    className={compareCtaClassName}
                  >
                    Start
                  </PricingCTA>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-3">
        <div className="col-span-2 flex flex-col justify-center bg-background-dimmed p-6 md:px-12 md:py-8">
          <h3 className="font-body font-medium text-2xl text-foreground">
            Enterprise
          </h3>
          <p className="mt-1 max-w-xl font-body font-light text-foreground-dimmed text-lg">
            Custom limits, enterprise security, UCP signing, multi-brand
            dashboards, and dedicated support.
          </p>
        </div>
        <div className="flex flex-col justify-end border-accent-foreground border-t bg-background-dimmed p-6 md:border-t-0 md:border-l md:p-8">
          <BookCall color="primary" className="w-full">
            Talk to sales
            <ArrowRightIcon className="size-4" />
          </BookCall>
        </div>
      </div>
    </div>
  </section>
);
