import {
  ArrowRightIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "./grid";

const steps = [
  { key: "connect", icon: CommercePlug_3SparkleIcon },
  { key: "products", icon: CommerceFilePenIcon },
  { key: "scan", icon: CommerceChartActivity_2Icon },
] as const;

/** A first-store invitation, followed by the real route to a first comparison. */
export const HubEmptyState = async () => {
  const translate = await getTranslations("dashboard.hub");

  return (
    <div data-hub-empty>
      <section className="relative grid bg-background-rich md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative isolate flex min-w-0 flex-col justify-between bg-linear-to-br from-primary via-primary-text to-emphasis-dimmed px-6 py-5 text-background-rich [clip-path:polygon(0_0,calc(100%_-_24px)_0,100%_24px,100%_100%,0_100%)] md:min-h-97.5 md:px-8 md:py-7">
          <p className="relative z-1 max-w-60 font-heading text-xl leading-snug sm:text-2xl">
            {translate("empty.artCaption")}
          </p>
          <div
            role="img"
            aria-label={translate("empty.figureLabel")}
            className="relative mx-auto h-44 w-full max-w-80 text-background-rich md:h-64 md:max-w-96"
          >
            <EvolvingAscii artwork="catalogCommerce" />
          </div>
          <div aria-hidden className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-background-rich" />
            <span className="h-px flex-1 bg-background-rich/30" />
            <CommercePlug_3SparkleIcon className="size-6" />
          </div>
        </div>

        <div className="order-first flex min-w-0 flex-col justify-center px-5 py-8 sm:px-8 md:order-none md:py-10 lg:px-12">
          <div className="mb-6 flex h-9 items-center gap-6" aria-hidden>
            <ProviderLogo
              provider="shopify"
              decorative
              className="h-9 rounded-none"
            />
            <ProviderLogo
              provider="woocommerce"
              decorative
              className="h-7 w-20 rounded-none"
            />
            <span className="h-6 w-px bg-accent-foreground" />
            <CommerceFilePenIcon className="size-8 text-primary" />
          </div>
          <h2 className="max-w-md font-heading font-medium text-2xl text-foreground-rich leading-tight tracking-tight sm:text-3xl">
            {translate("empty.title")}
          </h2>
          <p className="mt-3 max-w-md text-foreground-dimmed text-sm leading-relaxed sm:text-base">
            {translate("empty.description")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              color="primary"
              render={<Link href="/onboarding/connect" />}
              className="min-h-11 max-w-full"
            >
              {translate("action.primary")}
              <ArrowRightIcon className="size-4 shrink-0" />
            </Button>
            <Button
              color="neutral"
              render={<Link href="/onboarding/connect/csv" />}
              className="min-h-11 max-w-full"
            >
              <CommerceFilePenIcon className="size-4 shrink-0" />
              {translate("action.secondary")}
            </Button>
          </div>
          <p className="mt-5 text-foreground-dimmed text-xs leading-relaxed">
            {translate("empty.methods")}
          </p>
        </div>
      </section>

      <section
        className="relative border-accent-foreground border-y bg-background-rich"
        aria-labelledby="hub-setup-title"
      >
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <h2
          id="hub-setup-title"
          className="border-accent-foreground border-b bg-background-dimmed px-5 py-4 font-medium text-foreground-rich text-sm sm:px-8"
        >
          {translate("setup.title")}
        </h2>
        <ol className="grid sm:grid-cols-3">
          {steps.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-4 px-5 py-5 sm:block sm:px-6 sm:py-6 lg:px-8"
            >
              <div className="relative flex items-start gap-3 sm:items-center">
                <span className="relative z-1 bg-background-rich font-heading text-primary text-xl tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="hidden h-px flex-1 bg-primary/20 sm:block"
                />
                <Icon className="hidden size-6 text-primary sm:block" />
              </div>
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-12 bottom-0 left-[35px] w-px translate-y-3 bg-primary/20 sm:hidden"
                />
              )}
              <div className="min-w-0 sm:mt-4">
                <h3 className="font-heading font-medium text-base text-foreground-rich">
                  {translate(`setup.${key}.title`)}
                </h3>
                <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                  {translate(`setup.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      </section>
    </div>
  );
};
