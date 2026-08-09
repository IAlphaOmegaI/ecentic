import { RobotIcon, ShieldCheckIcon, ShoppingCartIcon } from "@zenncore/icons";
import { getMessages, getTranslations } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { Plus } from "@/components/plus";

export const FeeExplainer = async () => {
  const translate = await getTranslations("pricing");
  const messages = await getMessages();
  const steps = messages.pricing.feeExplainer.steps;
  const labels = ["01", "02", "03", "04"] as const;

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <SectionGutter />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("feeExplainer.number")}
          </span>
          <h2 className="mt-2 max-w-2xl font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("feeExplainer.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("feeExplainer.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2 lg:grid-cols-4">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {steps.map((step, index) => {
            const label = labels[index] ?? String(index + 1);
            const visual = (() => {
              switch (index) {
                case 0:
                  return <RobotIcon className="size-8 text-primary" />;
                case 1:
                  return <ShoppingCartIcon className="size-8 text-primary" />;
                case 2:
                  return (
                    <span className="font-body font-medium text-3xl text-primary tracking-tight">
                      $3.60
                    </span>
                  );
                case 3:
                  return <ShieldCheckIcon className="size-8 text-primary" />;
                default:
                  return null;
              }
            })();

            return (
              <div
                key={label}
                className="flex flex-col gap-4 bg-background-rich p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 items-center">{visual}</div>
                  <span
                    aria-hidden
                    className="font-normal text-3xl text-primary leading-none"
                  >
                    {label}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-body font-medium text-foreground text-xl">
                    {step.title}
                  </h3>
                  <p className="font-body font-light text-foreground-dimmed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-accent-foreground border-t bg-background-dimmed p-6 md:px-12 md:py-8">
          <h3 className="font-body font-medium text-2xl text-foreground">
            {translate("feeExplainer.billing.title")}
          </h3>
          <p className="mt-1 max-w-3xl font-body font-light text-foreground-dimmed text-lg">
            {translate("feeExplainer.billing.description")}
          </p>
        </div>
      </div>
    </section>
  );
};
