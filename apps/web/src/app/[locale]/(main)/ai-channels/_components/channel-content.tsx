import { ArrowRightIcon } from "@zenncore/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import type { getMessages } from "next-intl/server";
import { MarketingLead } from "@/components/marketing/lead";
import {
  MarketingBand,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { type AiChannel, aiChannels } from "@/content/ai-channels";
import { Link } from "@/i18n/navigation";

type Copy = Awaited<ReturnType<typeof getMessages>>["enterpriseChannels"];
const capabilities = ["simulate", "fix", "checkout", "track"] as const;

export const ChannelInterests = ({
  channel,
  copy,
}: {
  channel: AiChannel;
  copy: Copy;
}) => (
  <div className="flex flex-wrap items-start gap-4">
    {channel.interests.map((topic) => (
      <MarketingLead
        key={topic}
        kind="interest"
        topic={topic}
        title={copy.interests[topic]}
        triggerLabel={copy.interests[topic]}
      />
    ))}
  </div>
);

export const ChannelTiles = ({ copy }: { copy: Copy }) => (
  <MarketingBand>
    <div className="marketing-grid">
      {aiChannels.map((channel) => (
        <article
          key={channel.key}
          className="flex min-w-0 flex-col"
          data-display={channel.display}
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <ProviderLogo
              provider={channel.key}
              decorative
              fallback="none"
              className="h-10 max-w-32"
            />
            <MarketingStatus status={channel.status}>
              {copy.statuses[channel.status]}
            </MarketingStatus>
          </div>
          <h2 className="!text-2xl">
            <Link href={channel.href}>{copy.names[channel.key]}</Link>
          </h2>
          <p className="mb-6">{copy.summaries[channel.key]}</p>
          <div className="mt-auto">
            <ChannelInterests channel={channel} copy={copy} />
            <Link href={channel.href} className="marketing-item-link">
              {copy.open}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  </MarketingBand>
);

export const ChannelCapabilities = ({
  channel,
  copy,
}: {
  channel: AiChannel;
  copy: Copy;
}) => (
  <Table className="table-fixed border-b-0 bg-transparent [&_.marketing-status]:max-w-full [&_.marketing-status]:items-start [&_.marketing-status]:[overflow-wrap:anywhere]">
    <TableHeader>
      <TableRow>
        <TableHead className="w-[24%] whitespace-normal px-4 py-5 text-sm normal-case tracking-normal sm:px-7">
          {copy.feature}
        </TableHead>
        <TableHead className="w-[24%] whitespace-normal px-4 py-5 text-sm normal-case tracking-normal sm:px-7">
          {copy.status}
        </TableHead>
        <TableHead className="whitespace-normal px-4 py-5 text-sm normal-case tracking-normal sm:px-7">
          {copy.detail}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {capabilities.map((capability) => (
        <TableRow key={capability}>
          <TableHead
            scope="row"
            className="whitespace-normal break-words px-4 py-6 align-top text-base text-foreground normal-case tracking-normal sm:px-7"
          >
            {copy.capabilityNames[capability]}
          </TableHead>
          <TableCell className="px-4 py-6 align-top sm:px-7">
            <MarketingStatus status={channel.capabilities[capability]}>
              {copy.statuses[channel.capabilities[capability]]}
            </MarketingStatus>
          </TableCell>
          <TableCell className="break-words px-4 py-6 align-top text-base leading-relaxed sm:px-7">
            {copy.pages[channel.key].capabilities[capability]}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const ChannelSources = ({
  channel,
  copy,
}: {
  channel: AiChannel;
  copy: Copy;
}) => (
  <MarketingBand>
    <div className="marketing-cell">
      <h2>{copy.sourceTitle}</h2>
      <p>{copy.sourceNote}</p>
      <ul className="mt-8 divide-y divide-accent-foreground">
        {channel.sources.map((source) => (
          <li
            key={source.key}
            className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:gap-8"
          >
            <a href={source.url} className="marketing-text-link underline">
              {copy.sources[source.key]}
            </a>
            <span className="shrink-0 text-foreground-dimmed text-sm">
              {copy.checked}:{" "}
              <time dateTime={channel.checkedAt}>{copy.date}</time>
            </span>
          </li>
        ))}
      </ul>
    </div>
  </MarketingBand>
);
