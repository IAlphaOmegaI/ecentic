import { unwrapResult } from "@zenncore/utils";
import { getFormatter, getTranslations } from "next-intl/server";
import * as Recharge from "@/server/app/integration/recharge/actions";
import * as Checks from "@/server/app/recharge-offer-check";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { RechargeCheckControl } from "./recharge-check-control";

export const RechargeSummarySkeleton = () => (
  <div
    aria-hidden
    className="grid gap-4 border-accent-foreground border-b p-6 sm:grid-cols-3"
  >
    {["offers", "orders", "subscribers"].map((key) => (
      <div
        key={key}
        className="h-24 animate-pulse rounded bg-foreground/5 motion-reduce:animate-none"
      />
    ))}
  </div>
);

export const RechargeSummary = async ({
  params,
}: {
  params: Promise<{ store: string }>;
}) => {
  const { store } = await params;
  const status = await unwrapResult(
    Recharge.getStatus(Environment.SERVER, { store }),
  );
  if (!status.supported || !status.connected) return null;
  const [metrics, checks, translate, formatter] = await Promise.all([
    unwrapResult(Recharge.getMetrics(Environment.SERVER, { store })),
    Checks.getSummary(Environment.SERVER, { store }).then(unwrapEntitled),
    getTranslations("dashboard.recharge"),
    getFormatter(),
  ]);
  if (!checks) return null;
  return (
    <section className="border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-xl">{translate("title")}</h2>
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>
        <RechargeCheckControl
          store={store}
          configured={checks.configured}
          pending={checks.pending > 0}
        />
      </div>
      <dl className="mt-6 grid gap-6 sm:grid-cols-3">
        {[
          { label: "offers", value: status.offerCount },
          { label: "firstOrders", value: metrics.aiFirstOrders },
          { label: "converted", value: metrics.convertedSubscriptions },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-foreground-dimmed text-sm">
              {translate(item.label as "offers" | "firstOrders" | "converted")}
            </dt>
            <dd className="mt-2 font-semibold text-2xl tabular-nums">
              {formatter.number(item.value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-foreground-dimmed text-sm">
        {translate("active", {
          count: formatter.number(metrics.activeSubscriptions),
        })}
      </p>
      <div className="mt-6 border-accent-foreground border-t pt-4">
        <h3 className="font-medium text-sm">{translate("answers")}</h3>
        <p className="mt-2 text-foreground-dimmed text-sm">
          {checks.checkedOffers === 0
            ? translate("notChecked")
            : translate("coverage", {
                checked: formatter.number(checks.checkedOffers),
                total: formatter.number(checks.totalOffers),
              })}
        </p>
        {checks.checkedOffers > 0 && (
          <p className="mt-2 text-sm">
            {translate("findings", {
              wrong: formatter.number(checks.wrongOffers),
              missing: formatter.number(checks.missingOffers),
            })}
          </p>
        )}
        {checks.inconclusiveOffers > 0 && (
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate("inconclusive", {
              count: formatter.number(checks.inconclusiveOffers),
            })}
          </p>
        )}
        {checks.lastCheckedAt && (
          <p className="mt-2 text-foreground-dimmed text-xs">
            {translate("checkedAt", {
              date: formatter.dateTime(checks.lastCheckedAt, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
          </p>
        )}
        <p className="mt-2 text-foreground-dimmed text-xs">
          {translate("scope")}
        </p>
      </div>
    </section>
  );
};
