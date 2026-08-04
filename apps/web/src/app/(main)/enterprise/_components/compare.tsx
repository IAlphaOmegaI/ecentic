import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";

type Cell = string | boolean;

type Row = {
  label: string;
  dominate: Cell;
  enterprise: Cell;
};

const rows: readonly Row[] = [
  {
    label: "Price",
    dominate: "$149/mo",
    enterprise: "Custom",
  },
  {
    label: "Products",
    dominate: "Up to 1000",
    enterprise: "Custom limits",
  },
  {
    label: "Agent simulations",
    dominate: "Continuous",
    enterprise: "Continuous + custom cadence",
  },
  {
    label: "Auto-optimization",
    dominate: true,
    enterprise: true,
  },
  {
    label: "UCP generation",
    dominate: true,
    enterprise: true,
  },
  {
    label: "UCP signing service",
    dominate: false,
    enterprise: true,
  },
  {
    label: "Multi-brand rollups",
    dominate: false,
    enterprise: true,
  },
  {
    label: "API access",
    dominate: false,
    enterprise: true,
  },
  {
    label: "SSO",
    dominate: false,
    enterprise: true,
  },
  {
    label: "SOC 2 Type II",
    dominate: false,
    enterprise: "In progress",
  },
  {
    label: "Dedicated CSM",
    dominate: false,
    enterprise: true,
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
      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Dominate vs Enterprise
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Dominate runs the full optimization loop for a single brand.
          Enterprise adds security, scale, and support for multi-brand commerce
          teams.
        </p>
      </div>

      <div className="relative border-accent-foreground border-t">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse">
            <thead>
              <tr className="border-accent-foreground border-b bg-background-dimmed">
                <th className="w-1/3 p-4 text-left font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
                  Feature
                </th>
                <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                  Dominate
                </th>
                <th className="bg-primary/5 p-4 text-center font-body font-medium text-lg text-primary">
                  Enterprise
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
                    <CompareCell value={row.dominate} />
                  </td>
                  <td className="bg-primary/5 p-4">
                    <CompareCell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-3">
        <div className="col-span-2 flex flex-col justify-center bg-background-dimmed p-6 md:px-12 md:py-8">
          <h3 className="font-body font-medium text-2xl text-foreground">
            Ready to scope Enterprise?
          </h3>
          <p className="mt-1 max-w-xl font-body font-light text-foreground-dimmed text-lg">
            We run a short discovery call, share a custom ROI estimate for your
            catalog size, and scope an onboarding timeline.
          </p>
        </div>
        <div className="flex flex-col justify-end border-accent-foreground border-t bg-background-dimmed p-6 md:border-t-0 md:border-l md:p-8">
          <BookCall color="primary" className="w-full">
            Contact enterprise sales
            <ArrowRightIcon className="size-4" />
          </BookCall>
        </div>
      </div>
    </div>
  </section>
);
