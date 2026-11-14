import {
  CheckIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { ScrollArea, ScrollBar } from "@zenncore/web/components/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getLocale, getMessages } from "next-intl/server";
import { MeasurementDial } from "@/components/hairline/measurement-chart";
import { MarketingActions } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { PLAN_CATALOG } from "@/lib/agent-api";
import { FeeCalculator } from "./fee-calculator";
import { PricingCTA } from "./pricing-cta";

const planKeys = ["payg", "compete", "scale", "dominate"] as const;
const planIcons = {
  payg: CommerceBasketShoppingIcon,
  compete: CommerceChartActivity_2Icon,
  scale: CommercePlug_3SparkleIcon,
  dominate: CommerceFileShieldIcon,
} as const;

export const FreeStoreCheck = async () => {
  const { enterprisePricing, pricing, measurementChart } = await getMessages();
  return (
    <div
      data-pricing-split="free-check"
      className="marketing-section-grid relative grid grid-cols-1 border-accent-foreground border-t lg:grid-cols-2"
    >
      <figure className="relative m-0 flex min-w-0 flex-col items-center border-accent-foreground border-b bg-linear-to-b from-primary/8 via-background-rich to-background-rich px-7 py-8 max-sm:px-4 lg:border-r lg:border-b-0">
        <figcaption className="self-start text-primary-text text-sm">
          {enterprisePricing.sample.label}
        </figcaption>
        <MeasurementDial
          value={72}
          label={pricing.scan.sample.scoreLabel}
          remainingLabel={measurementChart.remainingLabel}
        />
        <div className="flex w-full items-center justify-center gap-8 border-accent-foreground border-t pt-6">
          {(["chatgpt", "claude", "gemini"] as const).map((provider) => (
            <ProviderLogo
              key={provider}
              provider={provider}
              className="h-9 max-w-20"
            />
          ))}
        </div>
      </figure>
      <div className="relative flex min-w-0 flex-col justify-center px-7 py-10 max-sm:px-4">
        <h3 className="max-w-[19ch] font-heading text-2xl lg:text-3xl xl:text-4xl leading-tight tracking-tight">
          {enterprisePricing.sample.sampleTitle}
        </h3>
        <ul className="mt-8 flex list-none flex-col gap-5 p-0">
          {enterprisePricing.sample.signals.map((signal, index) => {
            const Icon = [
              CommerceChartActivity_2Icon,
              CommerceBasketShoppingIcon,
              CommercePlug_3SparkleIcon,
            ][index];
            return (
              <li key={signal} className="flex items-center gap-4">
                {Icon && (
                  <Icon aria-hidden className="size-7 shrink-0 text-primary" />
                )}
                <span>{signal}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 max-w-[45ch] text-foreground-dimmed text-sm leading-relaxed">
          {enterprisePricing.sample.caption}
        </p>
        <MarketingActions
          actions={[
            {
              label: enterprisePricing.sample.action.primary,
              href: "/sign-up",
            },
          ]}
        />
      </div>
      <Plus className="top-0 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
      <Plus className="bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 lg:flex" />
    </div>
  );
};

export const EnterprisePlanLedger = async () => {
  const { enterprisePricing, pricing } = await getMessages();
  const enterprise = enterprisePricing.plans.enterprise;
  const renderPlan = (key: (typeof planKeys)[number]) => {
    const source = pricing.plans[key];
    const Icon = planIcons[key];
    const copy = enterprisePricing.plans[key];
    const features = source.features.flatMap((feature, featureIndex) => {
      if (key === "payg" && featureIndex === 3) return [];
      if (key === "dominate" && (featureIndex === 1 || featureIndex === 2))
        return [];
      if ((key === "compete" || key === "scale") && featureIndex === 1)
        return [enterprisePricing.featureCorrections.onDemand];
      if (key === "scale" && featureIndex === 2)
        return [enterprisePricing.featureCorrections.reviewAndApply];
      if (key === "payg" && featureIndex === 2)
        return [enterprisePricing.featureCorrections.paygAttribution];
      return [feature];
    });
    return (
      <article
        key={key}
        data-pricing-plan={key}
        className={cn(
          "relative isolate grid min-w-0 gap-5 border-[var(--rail-color)] border-t bg-clip-padding px-7 py-9 text-background-rich max-sm:px-4",
          key === "payg"
            ? "bg-linear-to-br from-primary-dimmed/75 via-emphasis to-emphasis-dimmed md:row-span-7 md:grid-rows-subgrid md:border-r"
            : "bg-emphasis/45 lg:row-span-7 lg:grid-rows-subgrid lg:border-r lg:last:border-r-0",
        )}
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        {key !== "payg" && key !== "dominate" && (
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 lg:flex" />
        )}
        <Icon aria-hidden className="size-9 text-primary-rich" />
        <h3 className="font-heading text-2xl xl:text-3xl tracking-tight">
          {source.name}
        </h3>
        <p className="text-background-rich/70 text-base leading-relaxed">
          {"tagline" in copy ? copy.tagline : source.tagline}
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <strong className="font-heading font-medium text-4xl xl:text-5xl leading-none tracking-tighter">
              {source.figure}
            </strong>
            <span className="text-background-rich/65 text-sm">
              {source.suffix}
            </span>
          </div>
        </div>
        <p className="text-background-rich/65 text-sm leading-relaxed">
          {"note" in copy ? copy.note : source.note}
        </p>
        <ul className="m-0 flex list-none flex-col gap-4 border-[var(--rail-color)] border-t pt-6 text-sm leading-relaxed">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckIcon
                aria-hidden
                className="mt-1 size-4 shrink-0 text-primary-rich"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <PricingCTA
          plan={key}
          color={key === "payg" ? "primary" : "neutral"}
          className="w-full self-end whitespace-normal"
        >
          {copy.action.primary}
        </PricingCTA>
      </article>
    );
  };
  return (
    <>
      <div
        data-pricing-plan-grid
        data-pricing-row="subscriptions"
        className="marketing-section-grid relative grid grid-cols-1 lg:grid-cols-3"
      >
        {(["compete", "scale", "dominate"] as const).map(renderPlan)}
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      </div>
      <div
        data-pricing-row="flexible"
        className="marketing-section-grid relative grid grid-cols-1 border-[var(--rail-color)] border-b md:grid-cols-2"
      >
        {renderPlan("payg")}
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <article
          data-pricing-plan="enterprise"
          className="relative grid min-w-0 gap-5 border-[var(--rail-color)] border-t bg-emphasis/45 bg-clip-padding px-7 py-9 max-sm:px-4 md:row-span-7 md:grid-rows-subgrid"
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <CommerceFileShieldIcon
            aria-hidden
            className="size-9 text-primary-rich"
          />
          <h3 className="font-heading text-2xl xl:text-3xl tracking-tight">
            {enterprise.name}
          </h3>
          <p className="text-background-rich/70 text-base leading-relaxed">
            {enterprise.tagline}
          </p>
          <strong className="font-heading font-medium text-3xl xl:text-4xl 2xl:text-5xl leading-none tracking-tighter">
            {enterprise.figure}
          </strong>
          <p className="text-background-rich/65 text-sm leading-relaxed">
            {enterprise.note}
          </p>
          <ul className="m-0 flex list-none flex-col gap-4 border-[var(--rail-color)] border-t pt-6 text-sm leading-relaxed">
            {enterprise.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckIcon
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-primary-rich"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="w-full self-end [&>.marketing-actions]:mt-0 [&_.marketing-actions_a]:w-full [&_.marketing-actions_a]:whitespace-normal">
            <MarketingActions
              tone="inverse"
              actions={[{ label: enterprise.action.primary, href: "/demo" }]}
            />
          </div>
        </article>
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
      </div>
      <div className="marketing-cell relative min-w-0 px-7 py-8 max-sm:px-4">
        <p className="max-w-[80ch] text-background-rich/65 text-sm leading-relaxed">
          {enterprisePricing.availability}
        </p>
      </div>
    </>
  );
};

export const PerformanceFeeLedger = async () => {
  const { enterprisePricing, pricing, interactiveFee } = await getMessages();
  const locale = await getLocale();
  const fee = enterprisePricing.fee;
  const payg = PLAN_CATALOG.find((plan) => plan.key === "payg")?.performanceFee;
  if (!payg) return null;
  const plans = PLAN_CATALOG.flatMap((plan) =>
    plan.price
      ? [{ name: plan.name, amountCents: plan.price.amountCents }]
      : [],
  );
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
  return (
    <div className="marketing-section-grid border-accent-foreground border-t">
      <FeeCalculator
        copy={interactiveFee}
        presentation={enterprisePricing.calculator}
        locale={locale}
        {...payg}
        plans={plans}
      />
      <div
        data-pricing-split="worked-example"
        className="relative grid min-w-0 grid-cols-1 border-accent-foreground border-t lg:grid-cols-2"
      >
        <div className="bg-linear-to-br from-primary-dimmed via-primary-text to-primary px-7 py-8 text-background-rich max-sm:px-4">
          <dl>
            <div className="flex items-center justify-between gap-4 border-background-rich/25 border-b pb-5">
              <dt className="text-background-rich/80 text-sm">
                {fee.example.order}
              </dt>
              <dd className="whitespace-nowrap text-3xl lg:text-4xl xl:text-5xl leading-none tracking-tighter">
                {money.format(120)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-background-rich/25 border-b py-5">
              <dt className="text-background-rich/80 text-sm">
                {fee.example.rate}
              </dt>
              <dd className="flex items-center gap-4 text-3xl lg:text-4xl xl:text-5xl leading-none tracking-tighter">
                <span aria-hidden="true" className="text-background-rich/60">
                  ×
                </span>
                3%
              </dd>
            </div>
            <div className="pt-6">
              <dt className="text-background-rich/80 text-sm">
                {fee.example.fee}
              </dt>
              <dd className="mt-4 flex items-baseline gap-4 text-5xl lg:text-7xl xl:text-8xl leading-none tracking-tighter">
                <span
                  aria-hidden="true"
                  className="text-4xl text-background-rich/60"
                >
                  =
                </span>
                {money.format(3.6)}
              </dd>
            </div>
          </dl>
          <p className="mt-8 border-background-rich/25 border-t pt-5 text-background-rich/80 text-sm">
            {fee.example.window}
          </p>
        </div>
        <div className="flex flex-col justify-center border-accent-foreground px-7 py-8 max-sm:px-4 lg:border-l">
          <h3>{fee.billingTitle}</h3>
          <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
            {fee.billingBody}
          </p>
          <dl className="mt-6 flex flex-col gap-3">
            {planKeys
              .filter((key) => key !== "payg")
              .map((key) => (
                <div
                  key={key}
                  className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-4 border-accent-foreground border-b py-4 last:border-b-0"
                >
                  <dt className="col-span-2 flex items-center gap-4 text-base">
                    {(() => {
                      const Icon = planIcons[key];
                      return (
                        <Icon
                          aria-hidden
                          className="size-8 shrink-0 text-primary"
                        />
                      );
                    })()}
                    {pricing.plans[key].name}
                  </dt>
                  <dd className="text-right text-foreground-rich text-sm">
                    <span className="font-medium">
                      {pricing.plans[key].figure}
                    </span>{" "}
                    <span className="text-foreground-dimmed">
                      {pricing.plans[key].suffix}
                    </span>
                  </dd>
                </div>
              ))}
          </dl>
        </div>
        <Plus className="top-0 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
        <Plus className="bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 lg:flex" />
      </div>
    </div>
  );
};

export const EnterprisePlanComparison = async () => {
  const { enterprisePricing, pricing } = await getMessages();
  const comparison = enterprisePricing.comparison;
  const keys = ["scan", ...planKeys] as const;
  const display = (value: string | boolean) => {
    if (typeof value !== "boolean") return value;
    return (
      <span className="inline-flex items-center">
        {value ? (
          <CheckIcon aria-hidden className="size-4 text-success" />
        ) : (
          <span aria-hidden className="text-foreground-dimmed">
            —
          </span>
        )}
        <span className="sr-only">
          {value ? comparison.yes : comparison.no}
        </span>
      </span>
    );
  };
  return (
    <>
      <div className="marketing-section-grid border-accent-foreground border-t">
        <ScrollArea
          className="relative min-w-0 overflow-hidden"
          aria-label={comparison.title}
          classList={{ viewport: "overscroll-y-auto overscroll-x-contain" }}
        >
          <Table className="m-0 min-w-265 border-b-0 bg-background-rich [&_td:last-child]:bg-background [&_td:nth-child(3)]:bg-primary/5 [&_td]:px-4 [&_td]:py-4 [&_td]:align-top [&_td]:text-foreground-dimmed [&_td]:text-sm [&_th:first-child]:w-47.5 [&_th:last-child]:bg-background [&_th:nth-child(3)]:bg-primary/8 [&_th]:whitespace-normal [&_th]:px-4 [&_th]:py-4 [&_th]:font-medium [&_th]:text-foreground-rich [&_th]:text-sm [&_th]:normal-case [&_th]:leading-normal [&_th]:tracking-normal">
            <TableCaption className="sr-only">{comparison.title}</TableCaption>
            <TableHeader className="bg-background-dimmed">
              <TableRow>
                <TableHead scope="col">{comparison.feature}</TableHead>
                {keys.map((key) => (
                  <TableHead key={key} scope="col">
                    {key === "scan"
                      ? pricing.schema.plans[0].name
                      : pricing.plans[key].name}
                  </TableHead>
                ))}
                <TableHead scope="col">
                  {enterprisePricing.plans.enterprise.name}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.compare.rows.slice(0, 8).map((row, rowIndex) => (
                <TableRow key={row.label}>
                  <TableHead scope="row">
                    {rowIndex === 7 ? comparison.publish : row.label}
                  </TableHead>
                  {keys.map((key) => {
                    const value = row[key];
                    const corrected =
                      rowIndex === 3 && key !== "scan"
                        ? comparison.onDemand
                        : rowIndex === 6 && typeof value === "string"
                          ? comparison.suggestions
                          : display(value);
                    return <TableCell key={key}>{corrected}</TableCell>;
                  })}
                  <TableCell>
                    {rowIndex === 0
                      ? enterprisePricing.plans.enterprise.figure
                      : comparison.agreed}
                  </TableCell>
                </TableRow>
              ))}
              {comparison.enterpriseRows.map((row, rowIndex) => (
                <TableRow key={row.label}>
                  <TableHead scope="row">{row.label}</TableHead>
                  {keys.map((key) => (
                    <TableCell key={key}>
                      {display(key === "scan" ? rowIndex === 1 : row.selfServe)}
                    </TableCell>
                  ))}
                  <TableCell>{comparison.yes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar
            orientation="horizontal"
            className="h-2 w-auto justify-start"
          />
        </ScrollArea>
      </div>
      <div className="marketing-cell relative min-w-0 px-7 py-10 max-sm:px-4 max-sm:py-8 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <p className="marketing-note text-(length:--text-sm) text-foreground-dimmed">
          {comparison.enterpriseNote}
        </p>
      </div>
    </>
  );
};
