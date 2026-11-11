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
import { EvidenceFrame } from "./evidence";
import { MarketingStatus } from "./primitives";
import { ProviderLogo } from "./provider-logo";

export const CommerceTimeline = async () => {
  const [locale, messages, translate] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("enterpriseEvidence.timeline"),
  ]);
  const copy = messages.enterpriseEvidence.timeline;
  // biome-ignore lint/complexity/useLiteralKeys: Environment keys have an index signature.
  const review = process.env["NEXT_PUBLIC_REVIEW"] === "1";
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
    <EvidenceFrame
      id="commerce-timeline"
      title={copy.title}
      pending={review ? copy.pending : undefined}
      description={translate("caption", {
        date: date.format(new Date(`${checked}T12:00:00Z`)),
      })}
      columns={Object.values(copy.headers)}
      rows={commerceTimeline.map((event) => [
        date.format(new Date(`${event.date}T12:00:00Z`)),
        copy.events[event.id].title,
        copy.events[event.id].detail,
        event.source.url,
      ])}
    >
      <ChannelTimeline copy={copy} locale={locale} />
      <p className="mt-6 max-w-[760px] text-base leading-relaxed">
        {copy.takeaway}
      </p>
    </EvidenceFrame>
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
    <section aria-labelledby="channel-comparison-title">
      <h3 id="channel-comparison-title" className="font-heading text-3xl">
        {copy.title}
      </h3>
      <p className="mt-4 max-w-[760px] text-base leading-relaxed">
        {copy.description}
      </p>
      <div className="mt-8 overflow-x-auto">
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
                      className="size-6"
                    />
                    {channels.names[channel.key]}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal leading-relaxed">
                  {copy.rows[channel.key].reads}
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal leading-relaxed">
                  {copy.rows[channel.key].buying}
                </TableCell>
                <TableCell className="whitespace-normal px-4 py-6 align-top font-normal leading-relaxed">
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
      </div>
      <p className="mt-5 text-foreground-dimmed text-sm">
        {translate("caption", { date: checked })}
      </p>
    </section>
  );
};
