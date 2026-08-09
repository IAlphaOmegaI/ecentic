import { ArrowRightIcon, FileIcon, SquareChartIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Plus } from "@/components/plus";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

type NextStepItem = {
  href: string;
  name: string;
  title: string;
  description: string;
  label: string;
  color: "primary" | "accent";
};

const nextStepMeta = [
  { logo: shopify },
  { logo: woocommerce },
  { icon: SquareChartIcon },
  { icon: FileIcon },
] as const;

export const NextSteps = async () => {
  const translate = await getTranslations("productListings");
  const items = translate.raw("nextSteps.items") as readonly NextStepItem[];
  const nextSteps = items.map((item, index) => ({
    ...item,
    ...nextStepMeta[index],
  }));

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("nextSteps.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("nextSteps.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("nextSteps.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
          {nextSteps.map((nextStep, index) => {
            const meta = nextStepMeta[index] ?? nextStepMeta[0];

            return (
            <article
              key={nextStep.href}
              className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
            >
              {"logo" in meta ? (
                <Image
                  src={meta.logo}
                  alt={nextStep.name}
                  className="size-7"
                />
              ) : (
                <meta.icon
                  aria-label={nextStep.name}
                  className="size-7 text-primary"
                />
              )}
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                  {nextStep.title}
                </h3>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {nextStep.description}
                </p>
              </div>
              <Button
                color={nextStep.color}
                className="w-fit"
                render={<Link href={nextStep.href} />}
              >
                {nextStep.label}
                <ArrowRightIcon className="size-4" />
              </Button>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
