import { ScrollArea } from "@zenncore/web/components/scroll-area";
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
      <MarketingHeading
        title={copy.title}
        description={copy.description}
        className="p-0 max-sm:p-0"
      />
      <ScrollArea
        className="mt-8 min-w-0 max-w-full"
        role="region"
        aria-label={copy.title}
      >
        <Table className="w-full min-w-[880px] table-fixed bg-background text-left text-sm">
          <TableHeader>
            <TableRow className="border-accent-foreground">
              {Object.entries(copy.headers).map(([key, title]) => (
                <TableHead
                  key={key}
                  className={
                    key === "status"
                      ? "w-[130px] whitespace-normal px-4 py-4 font-medium text-foreground-rich text-sm normal-case tracking-normal"
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
                      className="size-8"
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
      </ScrollArea>
      <p className="mt-5 text-foreground-dimmed text-sm">
        {translate("caption", { date: checked })}
      </p>
    </section>
  );
};
