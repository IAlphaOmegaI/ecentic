import {
  CheckIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
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
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingActions } from "@/components/marketing/primitives";
import { PLAN_CATALOG } from "@/lib/agent-api";
import { FeeCalculator } from "./fee-calculator";
import { PricingCTA } from "./pricing-cta";

const planKeys = ["payg", "compete", "scale", "dominate"] as const;
const planIcons = [
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommercePlug_3SparkleIcon,
  CommerceFileShieldIcon,
] as const;

export const FreeStoreCheck = async () => {
  const { enterprisePricing, pricing } = await getMessages();
  return (
    <div className="marketing-section-grid grid grid-cols-1 border-accent-foreground border-t lg:grid-cols-[1.1fr_1fr]">
      <div className="relative min-w-0 border-accent-foreground border-b bg-background-dimmed p-3 max-sm:p-2 lg:border-r lg:border-b-0">
        <div className="bg-background px-7 py-8 max-sm:px-4">
          <p className="text-foreground-dimmed text-sm">
            {enterprisePricing.sample.label}
          </p>
          <div className="mt-8 flex items-end gap-4">
            <span className="text-[clamp(88px,12vw,128px)] text-foreground-rich leading-[0.9] tracking-[-0.08em]">
              72
            </span>
            <span className="mb-2 text-foreground-dimmed text-sm">
              / 100
              <br />
              {pricing.scan.sample.scoreLabel}
            </span>
          </div>
          <div
            className="mt-8 h-2 rounded-md bg-accent-foreground"
            aria-hidden="true"
          >
            <span className="block h-full w-[72%] rounded-md bg-success" />
          </div>
          <div
            aria-hidden="true"
            className="mt-2 flex justify-between text-foreground-dimmed text-sm"
          >
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>
      <div className="relative flex min-w-0 flex-col justify-center px-7 py-8 max-sm:px-4">
        <div className="mb-6 h-28 w-44 text-primary-text">
          <EvolvingAscii artwork="console" />
        </div>
        <p className="max-w-[45ch] text-foreground-dimmed">
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
    </div>
  );
};

export const EnterprisePlanLedger = async () => {
  const { enterprisePricing, pricing } = await getMessages();
  const enterprise = enterprisePricing.plans.enterprise;
  return (
    <>
      <div
        data-columns="2"
        className="marketing-section-grid marketing-grid grid grid-cols-2 border-accent-foreground border-b max-sm:grid-cols-1"
      >
        {planKeys.map((key, index) => {
          const source = pricing.plans[key];
          const Icon = planIcons[index];
          const copy = enterprisePricing.plans[key];
          const features = source.features.flatMap((feature, featureIndex) => {
            if (
              key === "dominate" &&
              (featureIndex === 1 || featureIndex === 2)
            )
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
              className={cn(
                "grid min-w-0 gap-4 border-accent-foreground border-t px-7 py-8 max-sm:px-4 sm:row-span-7 sm:grid-rows-subgrid sm:border-r sm:even:border-r-0",
                key === "payg"
                  ? "bg-linear-to-br from-primary/10 via-primary/3 to-background"
                  : "bg-background",
              )}
            >
              {Icon && (
                <Icon
                  aria-hidden
                  className={cn(
                    "size-8",
                    index === 1
                      ? "text-info"
                      : index === 2
                        ? "text-secondary"
                        : "text-primary-text",
                  )}
                />
              )}
              <h3 className="text-[clamp(20px,2vw,26px)] tracking-[-0.035em]">
                {source.name}
              </h3>
              <p className="text-base text-foreground-dimmed leading-relaxed">
                {"tagline" in copy ? copy.tagline : source.tagline}
              </p>
              <div className="flex min-h-[90px] flex-col gap-2">
                <strong className="font-medium text-[clamp(28px,3vw,40px)] text-foreground-rich leading-[1.1] tracking-[-0.05em]">
                  {source.figure}
                </strong>
                <span className="text-foreground-dimmed text-sm leading-relaxed">
                  {source.suffix}
                </span>
              </div>
              <p className="text-foreground-dimmed text-sm leading-relaxed">
                {"note" in copy ? copy.note : source.note}
              </p>
              <ul className="m-0 flex list-none flex-col gap-4 p-0 text-sm">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="relative pl-3.5 before:absolute before:top-[9px] before:left-0 before:size-1 before:bg-primary before:content-['']"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
              <PricingCTA
                plan={key}
                color="primary"
                className="w-full self-end whitespace-normal"
              >
                {copy.action.primary}
              </PricingCTA>
            </article>
          );
        })}
      </div>
      <article
        data-columns="2"
        className="marketing-section-grid marketing-grid grid grid-cols-2 border-accent-foreground border-b bg-background-dimmed max-sm:grid-cols-1"
      >
        <div className="flex min-w-0 flex-col gap-6 border-accent-foreground border-t px-7 py-8 max-sm:px-4 sm:border-r">
          <CommerceFileShieldIcon
            aria-hidden
            className="size-8 text-primary-text"
          />
          <h3 className="text-[clamp(20px,2vw,26px)] tracking-[-0.035em]">
            {enterprise.name}
          </h3>
          <p className="text-base text-foreground-dimmed leading-relaxed">
            {enterprise.tagline}
          </p>
          <strong className="font-medium text-[clamp(28px,3vw,40px)] text-foreground-rich leading-[1.1] tracking-[-0.05em]">
            {enterprise.figure}
          </strong>
          <div className="mt-auto w-full [&>.marketing-actions]:mt-0 [&_.marketing-actions_a]:w-full [&_.marketing-actions_a]:whitespace-normal">
            <MarketingActions
              actions={[{ label: enterprise.action.primary, href: "/demo" }]}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-6 border-accent-foreground border-t px-7 py-8 max-sm:px-4">
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {enterprise.note}
          </p>
          <ul className="m-0 flex list-none flex-col gap-4 p-0 text-sm">
            {enterprise.features.map((feature) => (
              <li
                key={feature}
                className="relative pl-3.5 before:absolute before:top-[9px] before:left-0 before:size-1 before:bg-primary before:content-['']"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </article>
      <div className="marketing-cell relative min-w-0 px-7 py-10 max-sm:px-4 max-sm:py-8 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <p className="marketing-note text-(length:--text-sm) text-foreground-dimmed">
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
        locale={locale}
        {...payg}
        plans={plans}
      />
      <div className="grid min-w-0 grid-cols-1 border-accent-foreground border-t lg:grid-cols-[1.1fr_1fr]">
        <div className="bg-primary-text px-7 py-8 text-background-rich max-sm:px-4">
          <dl>
            <div className="flex items-center justify-between gap-4 border-background-rich/25 border-b pb-5">
              <dt className="text-background-rich/80 text-sm">
                {fee.example.order}
              </dt>
              <dd className="whitespace-nowrap text-[clamp(28px,4vw,44px)] leading-none tracking-[-0.04em]">
                {money.format(120)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-background-rich/25 border-b py-5">
              <dt className="text-background-rich/80 text-sm">
                {fee.example.rate}
              </dt>
              <dd className="flex items-center gap-4 text-[clamp(28px,4vw,44px)] leading-none tracking-[-0.04em]">
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
              <dd className="mt-4 flex items-baseline gap-4 text-[clamp(52px,7vw,88px)] leading-none tracking-[-0.06em]">
                <span
                  aria-hidden="true"
                  className="text-[0.6em] text-background-rich/60"
                >
                  =
                </span>
                {money.format(3.6)}
              </dd>
            </div>
          </dl>
          <p className="mt-8 border-background-rich/25 border-t pt-5 text-background-rich/80 text-sm">
            {fee.example.window} · {fee.example.cap}
          </p>
        </div>
        <div className="flex flex-col justify-center px-7 py-8 max-sm:px-4">
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
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                >
                  <dt className="text-sm">{pricing.plans[key].name}</dt>
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
        >
          <Table className="m-0 min-w-[1060px] border-b-0 [&_td:last-child]:bg-background [&_td]:px-4 [&_td]:py-4 [&_td]:align-top [&_td]:text-foreground-dimmed [&_td]:text-sm [&_th:first-child]:w-[190px] [&_th:last-child]:bg-background [&_th]:whitespace-normal [&_th]:px-4 [&_th]:py-4 [&_th]:font-medium [&_th]:text-foreground-rich [&_th]:text-sm [&_th]:normal-case [&_th]:leading-normal [&_th]:tracking-normal">
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
