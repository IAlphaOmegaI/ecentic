import {
  ArrowRightIcon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

export const EmptyProducts = async () => {
  const translate = await getTranslations("onboardingRecovery.empty");

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <Motion.Stagger
        stagger={0.04}
        className="flex min-h-full min-w-0 flex-col"
      >
        <Motion.Item className="relative isolate grid min-w-0 flex-1 items-center border-accent-foreground border-b bg-linear-to-br from-primary/10 via-background-rich to-primary/5 md:grid-cols-2">
          <div className="min-w-0 px-6 pt-10 pb-2 sm:px-8 md:py-10">
            <p className="mb-4 font-medium text-primary-text text-sm">
              {translate("status")}
            </p>
            <h1 className="max-w-sm font-heading font-medium text-3xl text-foreground-rich tracking-tight sm:text-4xl">
              {translate("title")}
            </h1>
            <p className="mt-4 max-w-sm text-base text-foreground-dimmed leading-relaxed">
              {translate("description")}
            </p>
          </div>
          <div className="mx-auto w-full min-w-0 max-w-md px-4 md:px-0">
            <CommerceFigure
              kind="documentStack"
              surface="rich"
              className="mx-auto max-w-64 bg-transparent md:max-w-none"
            />
          </div>
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        </Motion.Item>
        <div className="grid min-w-0 md:grid-cols-2">
          <Motion.Item className="flex min-w-0 flex-col items-start border-accent-foreground border-b px-6 py-8 sm:px-8 md:border-r md:border-b-0">
            <div className="mb-6 flex h-10 items-center gap-4">
              <CommercePlug_3SparkleIcon
                className="size-8 text-primary-text"
                aria-hidden
              />
              <span className="h-8 w-px bg-accent-foreground" aria-hidden />
              <ProviderLogo provider="shopify" className="h-8 w-8" />
              <ProviderLogo provider="woocommerce" className="h-8 w-16" />
            </div>
            <h2 className="font-heading font-medium text-foreground-rich text-xl">
              {translate("store.title")}
            </h2>
            <p className="mt-2 mb-6 text-foreground-dimmed text-sm leading-relaxed">
              {translate("store.description")}
            </p>
            <div className="mt-auto">
              <Button
                color="primary"
                render={<Link href="/onboarding/connect" />}
              >
                {translate("action.primary")}{" "}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </Motion.Item>
          <Motion.Item className="flex min-w-0 flex-col items-start px-6 py-8 sm:px-8">
            <CommerceFilePenIcon
              className="mb-6 size-10 text-primary-text"
              aria-hidden
            />
            <h2 className="font-heading font-medium text-foreground-rich text-xl">
              {translate("csv.title")}
            </h2>
            <p className="mt-2 mb-6 text-foreground-dimmed text-sm leading-relaxed">
              {translate("csv.description")}
            </p>
            <div className="mt-auto">
              <Button
                color="accent"
                render={<Link href="/onboarding/connect/csv" />}
              >
                {translate("action.secondary")}{" "}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </Motion.Item>
        </div>
      </Motion.Stagger>
    </div>
  );
};
