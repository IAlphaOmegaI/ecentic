import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
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
import {
  type Integration,
  integrationCheckedAt,
  integrationGroups,
  integrationPageSources,
  integrations,
} from "@/content/integrations";
import { providerLogos } from "@/content/provider-logos";
import { Link } from "@/i18n/navigation";

type Copy = Awaited<ReturnType<typeof getMessages>>["enterpriseIntegrations"];
const groupIcons = {
  commerce: CommerceBasketShoppingIcon,
  feeds: CommercePlug_3SparkleIcon,
  channels: CommerceGlobePointerIcon,
  payments: CommerceFileShieldIcon,
  pim: CommerceFilePenIcon,
};

const IntegrationTile = ({ integration, copy }: IntegrationTile.Props) => {
  const Icon = groupIcons[integration.group];
  const content = copy.entries[integration.key];
  return (
    <article
      className="flex min-w-0 flex-col"
      data-display={integration.display}
    >
      <div className="mb-7 flex items-center justify-between gap-4">
        {providerLogos[integration.key].src ? (
          <ProviderLogo
            provider={integration.key}
            decorative
            fallback="none"
            className="h-9 max-w-32"
          />
        ) : (
          <Icon className="size-7 text-primary" aria-hidden="true" />
        )}
        <MarketingStatus status={integration.status}>
          {copy.statuses[integration.status]}
        </MarketingStatus>
      </div>
      <h3>
        <Link href={integration.href}>{content.name}</Link>
      </h3>
      <p className="mb-6">{content.description}</p>
      {integration.status === "feed" && integration.interests.length > 0 && (
        <p className="!mt-0 mb-4 text-foreground-dimmed text-sm">
          {copy.directSoon}
        </p>
      )}
      <div className="mt-auto flex flex-col items-start gap-3">
        {integration.interests.map((topic) => (
          <MarketingLead
            key={topic}
            kind="interest"
            topic={topic}
            title={copy.interests[topic]}
          />
        ))}
        <Link href={integration.href} className="marketing-item-link !mt-3">
          {copy.open}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
        {integration.source && (
          <a
            href={integration.source}
            className="marketing-text-link text-(length:--text-sm) text-primary-text underline decoration-1 underline-offset-4 hover:underline"
          >
            {copy.sourceLink}
          </a>
        )}
      </div>
    </article>
  );
};

export const IntegrationWall = ({ copy }: IntegrationWall.Props) => (
  <>
    {integrationGroups.map((group, index) => {
      const entries = integrations.filter(
        (integration) => integration.group === group,
      );
      const live = entries.filter(
        (integration) => integration.status === "live",
      );
      const other = entries.filter(
        (integration) => integration.status !== "live",
      );
      return (
        <MarketingBand key={group} id={group}>
          <div className="marketing-cell relative grid min-w-0 gap-5 px-7 py-14 max-sm:px-4 max-sm:py-10 md:grid-cols-[96px_1fr] [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <span className="text-3xl text-primary" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{copy.groups[group]}</h2>
              <p className="mt-5 max-w-3xl">{copy.groupNotes[group]}</p>
            </div>
          </div>
          {live.length > 0 && (
            <div className="marketing-grid md:!grid-cols-2 grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
              {live.map((integration) => (
                <IntegrationTile
                  key={integration.key}
                  integration={integration}
                  copy={copy}
                />
              ))}
            </div>
          )}
          {other.length > 0 && (
            <div className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
              {other.map((integration) => (
                <IntegrationTile
                  key={integration.key}
                  integration={integration}
                  copy={copy}
                />
              ))}
            </div>
          )}
        </MarketingBand>
      );
    })}
  </>
);

export const IntegrationLedger = ({ rows, copy }: IntegrationLedger.Props) => (
  <Table className="table-fixed border-b-0 bg-transparent">
    <TableHeader>
      <TableRow>
        <TableHead className="w-[24%] whitespace-normal px-3 py-5 text-sm normal-case tracking-normal sm:px-7">
          {copy.field}
        </TableHead>
        <TableHead className="w-[38%] whitespace-normal px-3 py-5 text-sm normal-case tracking-normal sm:px-7">
          {copy.read}
        </TableHead>
        <TableHead className="whitespace-normal px-3 py-5 text-sm normal-case tracking-normal sm:px-7">
          {copy.write}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.field}>
          <TableHead
            scope="row"
            className="whitespace-normal break-words px-3 py-6 align-top text-foreground text-sm normal-case tracking-normal sm:px-7 sm:text-base"
          >
            {row.field}
          </TableHead>
          <TableCell className="break-words px-3 py-6 align-top leading-relaxed sm:px-7 sm:text-base">
            {row.read}
          </TableCell>
          <TableCell className="break-words px-3 py-6 align-top leading-relaxed sm:px-7 sm:text-base">
            {row.write}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const FeedExporters = ({ copy }: FeedExporters.Props) => (
  <div className="marketing-cell relative min-w-0 px-7 py-14 pt-0 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
    <p>{copy.feedPlatformsNote}</p>
    <ul className="mt-8 divide-y divide-accent-foreground">
      {integrations
        .filter((integration) => integration.status === "feed")
        .map((integration) => (
          <li
            key={integration.key}
            className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:gap-8"
          >
            <a
              href={integration.source}
              className="marketing-text-link flex flex-wrap items-center gap-4 text-primary-text underline decoration-1 underline-offset-4 hover:underline"
            >
              <ProviderLogo
                provider={integration.key}
                decorative
                fallback="none"
                className="h-6 max-w-24"
              />
              {copy.entries[integration.key].name}
            </a>
            <span className="shrink-0 text-foreground-dimmed text-sm">
              {copy.checked}:{" "}
              <time dateTime={integrationCheckedAt}>{copy.date}</time>
            </span>
          </li>
        ))}
    </ul>
  </div>
);

export const IntegrationSources = ({
  pageKey,
  copy,
}: IntegrationSources.Props) => {
  const sources = integrationPageSources[pageKey];
  if (sources.length === 0) return null;
  return (
    <MarketingBand>
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <h2>{copy.sourceTitle}</h2>
        <ul className="mt-8 divide-y divide-accent-foreground">
          {sources.map((source) => (
            <li
              key={source.key}
              className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:gap-8"
            >
              <a
                href={source.url}
                className="marketing-text-link text-primary-text underline decoration-1 underline-offset-4 hover:underline"
              >
                {copy.sources[source.key]}
              </a>
              <span className="shrink-0 text-foreground-dimmed text-sm">
                {copy.checked}:{" "}
                <time dateTime={integrationCheckedAt}>{copy.date}</time>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </MarketingBand>
  );
};

namespace IntegrationTile {
  export type Props = { integration: Integration; copy: Copy };
}

export namespace IntegrationLedger {
  export type Props = {
    rows: readonly { field: string; read: string; write: string }[];
    copy: Copy;
  };
}

export namespace IntegrationSources {
  export type Props = {
    pageKey: keyof typeof integrationPageSources;
    copy: Copy;
  };
}

export namespace IntegrationWall {
  export type Props = { copy: Copy };
}

export namespace FeedExporters {
  export type Props = { copy: Copy };
}
