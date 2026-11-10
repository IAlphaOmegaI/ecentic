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

const IntegrationTile = ({
  integration,
  copy,
}: {
  integration: Integration;
  copy: Copy;
}) => {
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
            className="marketing-text-link text-sm underline"
          >
            {copy.sourceLink}
          </a>
        )}
      </div>
    </article>
  );
};

export const IntegrationWall = ({ copy }: { copy: Copy }) => (
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
          <div className="marketing-cell grid gap-5 md:grid-cols-[96px_1fr]">
            <span className="text-3xl text-primary" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{copy.groups[group]}</h2>
              <p className="mt-5 max-w-3xl">{copy.groupNotes[group]}</p>
            </div>
          </div>
          {live.length > 0 && (
            <div className="marketing-grid md:!grid-cols-2">
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
            <div className="marketing-grid">
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

export const IntegrationLedger = ({
  rows,
  copy,
}: {
  rows: readonly { field: string; read: string; write: string }[];
  copy: Copy;
}) => (
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

export const FeedExporters = ({ copy }: { copy: Copy }) => (
  <div className="marketing-cell pt-0">
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
              className="marketing-text-link flex flex-wrap items-center gap-4 underline"
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
}: {
  pageKey: keyof typeof integrationPageSources;
  copy: Copy;
}) => {
  const sources = integrationPageSources[pageKey];
  if (sources.length === 0) return null;
  return (
    <MarketingBand>
      <div className="marketing-cell">
        <h2>{copy.sourceTitle}</h2>
        <ul className="mt-8 divide-y divide-accent-foreground">
          {sources.map((source) => (
            <li
              key={source.key}
              className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:gap-8"
            >
              <a href={source.url} className="marketing-text-link underline">
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
