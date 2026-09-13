import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";
import { PlanCards, PlanEnterprise } from "./plan-grid";

export const Plans = async () => {
  const translate = await getTranslations("pricing");

  return (
    <section id="pricing" className="scroll-mt-[5.5rem]">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="relative border-accent-foreground border-b">
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
          <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-[8fr_5fr] md:items-stretch md:divide-x md:divide-y-0">
            <div className="flex h-full flex-col justify-between gap-8 bg-primary p-6 text-white md:p-10">
              <div className="flex flex-col gap-4">
                <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
                  {translate("scan.badge")}
                </span>
                <h2 className="max-w-lg font-body font-medium text-3xl leading-tight md:text-4xl">
                  {translate("scan.title")}
                </h2>
                <p className="max-w-lg font-light text-lg text-white">
                  {translate("scan.description")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  color="accent"
                  className="w-full sm:w-auto"
                  render={<Link href="/sign-up" />}
                >
                  {translate("scan.action.primary")}
                  <ArrowRightIcon className="size-4" />
                </Button>
                <p className="text-sm text-white">{translate("scan.proof")}</p>
              </div>
            </div>
            <div className="relative flex h-full min-h-full flex-col justify-end overflow-hidden bg-background-rich p-6 md:p-10">
              <div className="flex items-center gap-3">
                <Image
                  src={shopify}
                  alt="Shopify"
                  className="h-6 w-auto opacity-80"
                />
                <Image
                  src={woocommerce}
                  alt="WooCommerce"
                  className="h-6 w-auto opacity-80"
                />
              </div>
              <div className="relative mt-4 flex items-end gap-3">
                <span className="font-bold text-7xl text-primary leading-none tracking-tight">
                  72
                </span>
                <div className="mb-1">
                  <p className="font-medium text-foreground-dimmed uppercase tracking-tight">
                    / 100
                  </p>
                  <p className="font-light text-foreground-dimmed">
                    {translate("scan.sample.scoreLabel")}
                  </p>
                </div>
              </div>
              <div className="relative mt-3 h-1 w-full bg-accent-foreground">
                <div className="h-full w-[72%] bg-primary" />
              </div>
              <p className="relative mt-4 font-light text-foreground-dimmed text-sm">
                {translate("scan.sample.caption")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("choosePayment.number")}
          </span>
          <h2 className="mt-2 max-w-2xl font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("choosePayment.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("choosePayment.description")}
          </p>
        </div>

        <PlanCards />

        <PlanEnterprise />
      </div>
    </section>
  );
};
