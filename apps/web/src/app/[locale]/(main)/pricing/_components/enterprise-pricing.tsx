import {
  CheckIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
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
import { MarketingActions } from "@/components/marketing/primitives";
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
    <div className="grid grid-cols-1 border-accent-foreground border-t bg-background sm:grid-cols-2">
      <div className="marketing-cell relative min-w-0 border-accent-foreground border-b px-7 py-14 max-sm:px-4 max-sm:py-10 sm:border-r sm:border-b-0 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <p className="text-primary-text text-sm">
          {enterprisePricing.sample.label}
        </p>
        <div className="mt-7 flex items-end gap-5">
          <span className="text-[clamp(88px,12vw,144px)] text-primary leading-[0.9] tracking-[-0.08em]">
            72
          </span>
          <span className="mb-2 text-[15px]">
            / 100
            <br />
            {pricing.scan.sample.scoreLabel}
          </span>
        </div>
        <div className="mt-8 h-1 bg-accent-foreground" aria-hidden="true">
          <span className="block h-full w-[72%] bg-primary" />
        </div>
      </div>
      <div className="marketing-cell relative flex min-w-0 flex-col justify-center px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <p>{enterprisePricing.sample.caption}</p>
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
        className="marketing-grid grid grid-cols-2 border-accent-foreground border-b max-sm:grid-cols-1"
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
              className="grid min-w-0 gap-4 border-accent-foreground border-t px-7 py-8 max-sm:px-4 sm:row-span-7 sm:grid-rows-subgrid sm:border-r sm:even:border-r-0"
            >
              {Icon && (
                <Icon aria-hidden className="size-8 text-primary-text" />
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
        className="marketing-grid grid grid-cols-2 border-accent-foreground border-b bg-background max-sm:grid-cols-1"
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
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
          {enterprisePricing.availability}
        </p>
      </div>
    </>
  );
};

export const PerformanceFeeLedger = async () => {
  const { enterprisePricing } = await getMessages();
  const locale = await getLocale();
  const fee = enterprisePricing.fee;
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
  return (
    <>
      <ol className="m-0 list-none p-0">
        {fee.steps.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[42px_minmax(0,1fr)] gap-4 border-accent-foreground border-t px-5 py-8 sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-6 sm:px-7"
          >
            <span aria-hidden="true" className="text-[32px] text-primary">
              0{index + 1}
            </span>
            <div>
              <h3>{step.title}</h3>
              <p className="mt-4 max-w-[70ch]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="border-accent-foreground border-y bg-background px-7 py-10">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-7">
          <div className="flex items-baseline justify-between gap-5 sm:block">
            <dt>{fee.example.order}</dt>
            <dd className="text-[clamp(32px,5vw,64px)] text-primary tracking-[-0.05em] sm:mt-4">
              {money.format(120)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-5 sm:block">
            <dt>{fee.example.rate}</dt>
            <dd className="text-[clamp(32px,5vw,64px)] text-primary tracking-[-0.05em] sm:mt-4">
              3%
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-5 sm:block">
            <dt>{fee.example.fee}</dt>
            <dd className="text-[clamp(32px,5vw,64px)] text-primary tracking-[-0.05em] sm:mt-4">
              {money.format(3.6)}
            </dd>
          </div>
        </dl>
        <p className="mt-7 text-sm">
          {fee.example.window} · {fee.example.cap}
        </p>
      </div>
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <h3>{fee.billingTitle}</h3>
        <p>{fee.billingBody}</p>
      </div>
    </>
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
      <ScrollArea
        className="overflow-x-auto border-accent-foreground border-t"
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
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
          {comparison.enterpriseNote}
        </p>
      </div>
    </>
  );
};
