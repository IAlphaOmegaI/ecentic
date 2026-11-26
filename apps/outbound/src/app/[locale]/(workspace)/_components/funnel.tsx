import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Funnel } from "@/server/app/outbound/pipeline-funnel";

const preparation = [
  { key: "contactsIn", href: "/prospects" },
  { key: "researched", href: "/prospects" },
  { key: "copyPassed", href: "/review" },
  { key: "approved", href: "/review" },
] as const;
const research = ["findings", "noGap", "blocked"] as const;
const outcomes = [
  { key: "acceptedSends", href: "/replies?view=sent&channel=email" },
  { key: "humanReplies", href: "/replies" },
  { key: "positiveReplies", href: "/replies?stage=interested" },
  { key: "meetingsHeld", href: "/replies?stage=meetingHeld" },
] as const;
const costs = [
  "searchesPurchased",
  "approvedFirstEmails",
  "unconfirmedSearches",
] as const;

export const FunnelPanel = async ({ funnel }: { funnel: Funnel }) => {
  const [translate, format] = await Promise.all([
    getTranslations("outbound.funnel"),
    getFormatter(),
  ]);
  return (
    <section className="border-accent-foreground border-b">
      <div className="px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("title")}
          </h2>
          <p className="text-foreground-dimmed text-xs">{translate("scope")}</p>
        </div>
        <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
          {translate("scopeHelp")}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-accent-foreground lg:grid-cols-4">
        {preparation.map(({ key, href }) => (
          <div
            key={key}
            className="min-w-0 bg-background-rich px-4 py-5 sm:px-6"
          >
            <dt className="text-foreground-dimmed text-sm">
              <Link
                href={href}
                className="rounded-sm hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                {translate(key)}
              </Link>
            </dt>
            <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
              {format.number(funnel[key])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {research.map((key) => (
            <div key={key} className="flex items-baseline gap-3 text-sm">
              <dt className="text-foreground-dimmed">{translate(key)}</dt>
              <dd className="font-semibold text-foreground-rich tabular-nums">
                {format.number(funnel[key])}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 max-w-4xl text-foreground-dimmed text-xs leading-5">
          {translate("researchHelp")} {translate("currentHelp")}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-4">
        {outcomes.map(({ key, href }) => (
          <div
            key={key}
            className="min-w-0 bg-background-rich px-4 py-5 sm:px-6"
          >
            <dt className="text-foreground-dimmed text-sm">
              <Link
                href={href}
                className="rounded-sm hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                {translate(key)}
              </Link>
            </dt>
            <dd className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums">
              {format.number(funnel[key])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="max-w-4xl px-4 pb-5 text-foreground-dimmed text-xs leading-5 sm:px-6">
        {translate("outcomesHelp")}
      </p>
      <div className="border-accent-foreground border-t px-4 py-5 sm:px-6">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-foreground-dimmed text-sm">
              {translate("searchesPerApproved")}
            </dt>
            <dd className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums">
              {funnel.searchesPerApproved === null
                ? "—"
                : format.number(funnel.searchesPerApproved, {
                    maximumFractionDigits: 2,
                  })}
            </dd>
            {funnel.searchesPerApproved === null && (
              <p className="mt-1 text-foreground-dimmed text-xs">
                {translate("notAvailable")}
              </p>
            )}
          </div>
          {costs.map((key) => (
            <div key={key}>
              <dt className="text-foreground-dimmed text-sm">
                {translate(key)}
              </dt>
              <dd className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums">
                {format.number(funnel[key])}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-4xl text-foreground-dimmed text-xs leading-5">
          {translate("costHelp")}
        </p>
      </div>
    </section>
  );
};
