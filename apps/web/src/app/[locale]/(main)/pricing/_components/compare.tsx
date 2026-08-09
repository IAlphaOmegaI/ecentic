import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import { PricingCTA } from "./pricing-cta";

type Cell = string | boolean;

type CompareRow = {
  label: string;
  scan: Cell;
  payg: Cell;
  compete: Cell;
  scale: Cell;
  dominate: Cell;
};

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

export const Compare = async () => {
  const translate = await getTranslations("pricing");
  const rows = translate.raw("compare.rows") as readonly CompareRow[];
  const enterprise = translate.raw("plans.enterprise") as {
    title: string;
    description: string;
  };

  return (
    <section className="border-accent-foreground border-b">
      <div className="mx-auto max-w-6xl border-accent-foreground border-x">
        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("compare.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("compare.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("compare.description")}
          </p>
        </div>

        <div className="relative border-accent-foreground border-t">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse">
              <thead>
                <tr className="border-accent-foreground border-b bg-background-dimmed">
                  <th className="w-1/3 p-4 text-left font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
                    {translate("compare.planHeader")}
                  </th>
                  <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                    Scan
                  </th>
                  <th className="bg-primary/5 p-4 text-center font-body font-medium text-lg text-primary">
                    {translate("plans.payg.name")}
                  </th>
                  <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                    Compete
                  </th>
                  <th className="p-4 text-center font-body font-medium text-foreground text-lg">
                    Scale
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
                      <CompareCell value={row.scale} />
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
                      {translate("compare.action.scanFree")}
                    </Button>
                  </td>
                  <td className="bg-primary/5 p-4 text-center">
                    <PricingCTA
                      plan="payg"
                      color="success"
                      className={compareCtaClassName}
                    >
                      {translate("compare.action.startFree")}
                    </PricingCTA>
                  </td>
                  <td className="p-4 text-center">
                    <PricingCTA plan="compete" className={compareCtaClassName}>
                      {translate("compare.action.start")}
                    </PricingCTA>
                  </td>
                  <td className="p-4 text-center">
                    <PricingCTA plan="scale" className={compareCtaClassName}>
                      {translate("compare.action.start")}
                    </PricingCTA>
                  </td>
                  <td className="p-4 text-center">
                    <PricingCTA
                      plan="dominate"
                      color="primary"
                      className={compareCtaClassName}
                    >
                      {translate("compare.action.start")}
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
              {enterprise.title}
            </h3>
            <p className="mt-1 max-w-xl font-body font-light text-foreground-dimmed text-lg">
              {enterprise.description}
            </p>
          </div>
          <div className="flex flex-col justify-end border-accent-foreground border-t bg-background-dimmed p-6 md:border-t-0 md:border-l md:p-8">
            <BookCall color="primary" className="w-full">
              {translate("compare.enterprise.action.primary")}
              <ArrowRightIcon className="size-4" />
            </BookCall>
          </div>
        </div>
      </div>
    </section>
  );
};
