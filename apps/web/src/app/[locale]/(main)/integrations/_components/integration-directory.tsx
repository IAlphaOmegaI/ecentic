import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import {
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { getMessages } from "next-intl/server";
import { MarketingLead } from "@/components/marketing/lead";
import {
  MarketingBand,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import {
  type Integration,
  integrationGroups,
  integrations,
} from "@/content/integrations";
import { providerLogos } from "@/content/provider-logos";
import { Link } from "@/i18n/navigation";
import { IntegrationGroups } from "./integration-groups";

type Copy = Awaited<ReturnType<typeof getMessages>>["enterpriseIntegrations"];

const groupIcons = {
  commerce: CommerceBasketShoppingIcon,
  feeds: CommercePlug_3SparkleIcon,
  channels: CommerceGlobePointerIcon,
  payments: CommerceFileShieldIcon,
  pim: CommerceFilePenIcon,
};

const DirectoryEntry = ({ integration, copy }: DirectoryEntry.Props) => {
  const content = copy.entries[integration.key];
  const Icon = groupIcons[integration.group];

  return (
    <article
      className="grid min-w-0 gap-6 border-accent-foreground border-t px-7 py-8 max-sm:px-4 md:grid-cols-[136px_minmax(0,1fr)_220px] md:items-start"
      data-integration={integration.key}
      data-status={integration.status}
    >
      <div className="flex min-h-10 items-center justify-between gap-4 md:pt-2">
        {providerLogos[integration.key].src ? (
          <ProviderLogo
            provider={integration.key}
            decorative
            fallback="none"
            className="h-9 max-w-32 rounded-none"
          />
        ) : (
          <Icon className="size-8 text-primary" aria-hidden="true" />
        )}
        <span className="md:hidden">
          <MarketingStatus status={integration.status}>
            {copy.statuses[integration.status]}
          </MarketingStatus>
        </span>
      </div>
      <div className="min-w-0">
        <h4 className="text-2xl leading-tight">
          <Link
            href={integration.href}
            className="decoration-1 underline-offset-4 hover:text-primary-text hover:underline"
          >
            {content.name}
          </Link>
        </h4>
        <p className="mt-2 max-w-[52ch] text-foreground-dimmed">
          {content.description}
        </p>
        {integration.status === "feed" && integration.interests.length > 0 && (
          <p className="mt-2 text-foreground-dimmed text-sm">
            {copy.directSoon}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href={integration.href}
            className="inline-flex min-h-10 items-center gap-2 font-medium text-primary-text text-sm decoration-1 underline-offset-4 hover:underline"
          >
            {copy.open}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
          {integration.source && (
            <a
              href={integration.source}
              className="inline-flex min-h-10 items-center text-foreground-dimmed text-sm underline decoration-1 underline-offset-4 hover:text-primary-text"
            >
              {copy.sourceLink}
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-col items-start gap-6 md:pt-2">
        <span className="max-md:hidden">
          <MarketingStatus status={integration.status}>
            {copy.statuses[integration.status]}
          </MarketingStatus>
        </span>
        {integration.interests.map((topic) => (
          <MarketingLead
            key={topic}
            kind="interest"
            topic={topic}
            title={copy.interests[topic]}
          />
        ))}
      </div>
    </article>
  );
};

export const IntegrationDirectory = ({ copy }: IntegrationDirectory.Props) => (
  <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
    <h2 className="sr-only">{copy.index.title}</h2>
    <IntegrationGroups>
      {integrationGroups.map((group, index) => {
        const entries = integrations.filter((entry) => entry.group === group);
        const previews = entries
          .filter((entry) => providerLogos[entry.key].src)
          .slice(0, 3);

        return (
          <AccordionItem
            key={group}
            id={group}
            value={group}
            className="scroll-mt-24 border-accent-foreground last:border-b-0"
          >
            <AccordionTrigger
              className="items-center gap-6 px-7 py-10 hover:bg-primary/4 max-sm:px-4 max-sm:py-8"
              classList={{
                root: "text-foreground-rich",
                trigger: {
                  icon: "mr-0 size-6 shrink-0 text-primary transition-transform duration-200 motion-reduce:transition-none",
                },
              }}
            >
              <span className="grid min-w-0 flex-1 gap-4 md:grid-cols-[64px_minmax(0,1fr)_208px] md:items-center md:gap-6">
                <span
                  className="font-heading text-3xl text-primary"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-heading text-[clamp(1.5rem,2.5vw,2.3rem)] leading-tight tracking-[-0.035em]">
                    {copy.groups[group]}
                  </span>
                  <span className="mt-4 block max-w-[66ch] font-normal text-base text-foreground-dimmed leading-relaxed">
                    {copy.groupNotes[group]}
                  </span>
                </span>
                <span
                  className="flex items-center justify-end gap-6 max-md:hidden"
                  aria-hidden="true"
                >
                  {previews.map((entry) => (
                    <ProviderLogo
                      key={entry.key}
                      provider={entry.key}
                      decorative
                      fallback="none"
                      className="h-7 max-w-12 rounded-none"
                    />
                  ))}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionPanel
              keepMounted
              className="duration-200 motion-reduce:transition-none"
            >
              {entries.map((integration) => (
                <DirectoryEntry
                  key={integration.key}
                  integration={integration}
                  copy={copy}
                />
              ))}
            </AccordionPanel>
          </AccordionItem>
        );
      })}
    </IntegrationGroups>
  </MarketingBand>
);

export const IntegrationImportFlow = ({
  copy,
}: IntegrationImportFlow.Props) => {
  const workflow = copy.pages.productFeeds.sections[0];
  if (!workflow) return null;

  return (
    <MarketingBand
      id="import-flow"
      className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-primary/5"
    >
      <div className="px-7 pt-14 pb-10 max-sm:px-4 max-sm:pt-10">
        <h2>{workflow.title}</h2>
        <p className="mt-4 max-w-[65ch] text-foreground-dimmed text-lg max-sm:text-base">
          {copy.pages.productFeeds.description}
        </p>
      </div>
      <div className="grid items-center gap-8 px-7 pb-14 max-sm:px-4 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] md:gap-0">
        <div className="relative border-primary/25 border-l pl-6 md:border-r md:border-l-0 md:pr-6 md:pl-0">
          {(["productFeeds", "csv", "storeAddress"] as const).map((key) => (
            <div
              key={key}
              className="relative py-4 before:absolute before:top-1/2 before:-left-6 before:w-4 before:border-primary/25 before:border-t md:before:right-0 md:before:left-auto md:before:translate-x-full"
            >
              <p className="font-medium text-foreground-rich">
                {copy.entries[key].name}
              </p>
              <p className="mt-2 max-w-[38ch] text-foreground-dimmed text-sm">
                {copy.entries[key].description}
              </p>
            </div>
          ))}
        </div>
        <div className="relative flex flex-col items-center justify-center gap-4 py-2 md:flex-row md:gap-0">
          <span
            className="h-8 border-primary/40 border-l md:hidden"
            aria-hidden="true"
          />
          <span
            className="absolute top-1/2 right-0 w-4 border-primary/40 border-t max-md:hidden"
            aria-hidden="true"
          />
          <span
            className="absolute top-1/2 left-0 w-4 border-primary/40 border-t max-md:hidden"
            aria-hidden="true"
          />
          <span className="relative px-2 font-heading text-primary-text text-xl tracking-tight">
            ecentic
          </span>
          <ArrowRightIcon
            className="size-6 rotate-90 text-primary md:absolute md:right-0 md:rotate-0"
            aria-hidden="true"
          />
        </div>
        <div className="grid gap-8 md:pl-8">
          {workflow.items?.slice(0, 2).map((item) => (
            <div key={item.title}>
              <h3 className="text-2xl text-primary-text">{item.title}</h3>
              <p className="mt-3 max-w-[42ch] text-foreground-dimmed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-primary/20 border-t px-7 py-6 max-sm:px-4">
        <Link
          href="/integrations/product-feeds"
          className="inline-flex min-h-10 items-center gap-2 font-medium text-primary-text decoration-1 underline-offset-4 hover:underline"
        >
          {copy.pages.productFeeds.title}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </MarketingBand>
  );
};

namespace DirectoryEntry {
  export type Props = { integration: Integration; copy: Copy };
}

export namespace IntegrationDirectory {
  export type Props = { copy: Copy };
}

export namespace IntegrationImportFlow {
  export type Props = { copy: Copy };
}
