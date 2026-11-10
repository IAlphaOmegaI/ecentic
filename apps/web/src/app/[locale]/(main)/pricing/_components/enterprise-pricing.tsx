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
import "./enterprise-pricing.css";

const planKeys = ["payg", "compete", "scale", "dominate"] as const;

export const FreeStoreCheck = async () => {
  const { enterprisePricing, pricing } = await getMessages();
  return (
    <div className="pricing-free-check">
      <div className="marketing-cell">
        <p className="pricing-sample-label">{enterprisePricing.sample.label}</p>
        <div className="pricing-sample-score">
          <span>72</span>
          <span>
            / 100
            <br />
            {pricing.scan.sample.scoreLabel}
          </span>
        </div>
        <div className="pricing-score-track" aria-hidden="true">
          <span />
        </div>
      </div>
      <div className="marketing-cell">
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
      <div className="pricing-ledger">
        {planKeys.map((key, index) => {
          const source = pricing.plans[key];
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
            <article key={key} className="pricing-ledger-plan">
              <p className="pricing-plan-index">0{index + 1}</p>
              <h3>{source.name}</h3>
              <p className="pricing-plan-tagline">
                {"tagline" in copy ? copy.tagline : source.tagline}
              </p>
              <div className="pricing-plan-price">
                <strong>{source.figure}</strong>
                <span>{source.suffix}</span>
              </div>
              <p className="pricing-plan-note">
                {"note" in copy ? copy.note : source.note}
              </p>
              <ul>
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <PricingCTA
                plan={key}
                color="primary"
                className="pricing-plan-action"
              >
                {copy.action.primary}
              </PricingCTA>
            </article>
          );
        })}
        <article className="pricing-ledger-plan pricing-enterprise-plan">
          <p className="pricing-plan-index">05</p>
          <h3>{enterprise.name}</h3>
          <p className="pricing-plan-tagline">{enterprise.tagline}</p>
          <div className="pricing-plan-price">
            <strong>{enterprise.figure}</strong>
          </div>
          <p className="pricing-plan-note">{enterprise.note}</p>
          <ul>
            {enterprise.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <MarketingActions
            actions={[{ label: enterprise.action.primary, href: "/demo" }]}
          />
        </article>
      </div>
      <div className="marketing-cell">
        <p className="marketing-note">{enterprisePricing.availability}</p>
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
      <ol className="pricing-fee-steps">
        {fee.steps.map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true">0{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="pricing-worked-example">
        <dl>
          <div>
            <dt>{fee.example.order}</dt>
            <dd>{money.format(120)}</dd>
          </div>
          <div>
            <dt>{fee.example.rate}</dt>
            <dd>3%</dd>
          </div>
          <div>
            <dt>{fee.example.fee}</dt>
            <dd>{money.format(3.6)}</dd>
          </div>
        </dl>
        <p>
          {fee.example.window} · {fee.example.cap}
        </p>
      </div>
      <div className="marketing-cell">
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
  const display = (value: string | boolean) =>
    typeof value === "boolean"
      ? value
        ? comparison.yes
        : comparison.no
      : value;
  return (
    <>
      <ScrollArea
        className="pricing-comparison-scroll"
        aria-label={comparison.title}
      >
        <Table className="pricing-comparison">
          <TableCaption className="sr-only">{comparison.title}</TableCaption>
          <TableHeader>
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
      <div className="marketing-cell">
        <p className="marketing-note">{comparison.enterpriseNote}</p>
      </div>
    </>
  );
};
