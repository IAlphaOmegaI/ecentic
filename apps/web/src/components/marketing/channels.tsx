import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import {
  channelComparisons,
  commerceTimeline,
  comparisonCheckedAt,
} from "@/content/marketing-evidence";
import { Link } from "@/i18n/navigation";
import { ChannelTimeline } from "./channel-timeline";
import { MarketingHeading, MarketingStatus } from "./primitives";
import { ProviderLogo } from "./provider-logo";

export const CommerceTimeline = async () => {
  const [locale, messages, translate] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("enterpriseEvidence.timeline"),
  ]);
  const copy = messages.enterpriseEvidence.timeline;
  const checked = commerceTimeline.reduce<string>(
    (earliest, event) =>
      event.checkedAt < earliest ? event.checkedAt : earliest,
    commerceTimeline[0].checkedAt,
  );
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  return (
    <section id="commerce-timeline">
      <MarketingHeading
        className="p-0 max-sm:p-0"
        title={copy.title}
        description={translate("caption", {
          date: date.format(new Date(`${checked}T12:00:00Z`)),
        })}
      />
      <ChannelTimeline events={copy.events} locale={locale} />
    </section>
  );
};

export const ChannelComparison = async () => {
  const [locale, messages, translate] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("enterpriseEvidence.channels"),
  ]);
  const copy = messages.enterpriseEvidence.channels;
  const channels = messages.enterpriseChannels;
  const checked = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${comparisonCheckedAt}T12:00:00Z`));
  return (
    <section id="channel-comparison">
      <div className="relative isolate">
        <div
          aria-hidden
          className="marketing-guide-fade pointer-events-none absolute -inset-x-7 inset-y-0 -z-1 opacity-55 [mask-image:linear-gradient(180deg,transparent,black_32px,black_calc(100%-80px),transparent)] max-sm:-inset-x-4 [&>span]:absolute [&>span]:inset-y-0 [&>span]:w-px [&>span]:bg-accent-foreground"
        >
          <span className="left-1/4 max-sm:hidden" />
          <span className="left-1/2" />
          <span className="left-3/4 max-sm:hidden" />
        </div>
        <MarketingHeading
          title={copy.title}
          description={copy.description}
          className="p-0 max-sm:p-0"
        />
      </div>
      <div className="mt-8 min-w-0">
        <Table className="hidden w-full table-fixed overflow-visible bg-background text-left text-sm min-[1000px]:table">
          <TableHeader>
            <TableRow className="border-accent-foreground">
              {Object.entries(copy.headers).map(([key, title]) => (
                <TableHead
                  key={key}
                  className={
                    key === "status"
                      ? "w-32.5 whitespace-normal px-4 py-4 font-medium text-foreground-rich text-sm normal-case tracking-normal"
                      : "whitespace-normal px-4 py-4 font-medium text-foreground-rich text-sm normal-case tracking-normal"
                  }
                >
                  {title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {channelComparisons.map((channel) => (
              <TableRow
                key={channel.key}
                className="border-accent-foreground hover:bg-transparent"
              >
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal">
                  <Link
                    href={channel.href}
                    className="flex flex-col items-start gap-3 text-foreground-rich underline decoration-accent-foreground underline-offset-4"
                  >
                    <ProviderLogo
                      provider={channel.key}
                      decorative
                      className="h-8 w-auto max-w-28 rounded-none"
                    />
                    {channels.names[channel.key]}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal text-foreground-dimmed leading-relaxed">
                  {copy.rows[channel.key].reads}
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal text-foreground-dimmed leading-relaxed">
                  {copy.rows[channel.key].buying}
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal text-foreground-dimmed leading-relaxed">
                  {copy.rows[channel.key].where}
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal">
                  <MarketingStatus status={channel.status}>
                    {channels.statuses[channel.status]}
                  </MarketingStatus>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-accent-foreground border-t min-[1000px]:hidden">
          {channelComparisons.map((channel) => (
            <article
              key={channel.key}
              className="border-accent-foreground border-b py-6"
            >
              <h3 className="font-heading text-foreground-rich text-xl">
                <Link
                  href={channel.href}
                  className="flex flex-wrap items-center gap-4 underline decoration-accent-foreground underline-offset-4"
                >
                  <ProviderLogo
                    provider={channel.key}
                    decorative
                    className="h-8 w-auto max-w-28 rounded-none"
                  />
                  {channels.names[channel.key]}
                </Link>
              </h3>
              <dl className="mt-6 grid gap-4 text-sm">
                {(["reads", "buying", "where"] as const).map((field) => (
                  <div key={field}>
                    <dt className="font-medium text-foreground">
                      {copy.headers[field]}
                    </dt>
                    <dd className="mt-2 text-foreground-dimmed leading-relaxed">
                      {copy.rows[channel.key][field]}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="font-medium text-foreground">
                    {copy.headers.status}
                  </dt>
                  <dd className="mt-2">
                    <MarketingStatus status={channel.status}>
                      {channels.statuses[channel.status]}
                    </MarketingStatus>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
      <p className="mt-5 text-foreground-dimmed text-sm">
        {translate("caption", { date: checked })}
      </p>
    </section>
  );
};
