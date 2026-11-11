import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
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
import { Button } from "@zenncore/web/components/button";
import type { getMessages } from "next-intl/server";
import { MarketingLead } from "@/components/marketing/lead";
import {
  MarketingBand,
  MarketingEyebrow,
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
type DirectoryCopy = Awaited<
  ReturnType<typeof getMessages>
>["browserIntegrations"];

const groupIcons = {
  commerce: CommerceBasketShoppingIcon,
  feeds: CommercePlug_3SparkleIcon,
  channels: CommerceGlobePointerIcon,
  payments: CommerceFileShieldIcon,
  pim: CommerceFilePenIcon,
};

const DirectoryEntry = ({
  integration,
  copy,
  directory,
}: DirectoryEntry.Props) => {
  const content = copy.entries[integration.key];
  const Icon = groupIcons[integration.group];

  return (
    <article
      className="grid min-w-0 gap-6 border-accent-foreground border-t px-7 py-10 max-sm:px-4 md:grid-cols-[192px_minmax(0,1fr)] md:items-start md:gap-10"
      data-integration={integration.key}
      data-status={integration.status}
    >
      <div className="flex h-20 items-center md:mt-2">
        {providerLogos[integration.key].src ? (
          <ProviderLogo
            provider={integration.key}
            decorative
            fallback="none"
            className="h-20 w-44 max-w-full rounded-none"
          />
        ) : (
          <Icon className="size-16 text-primary" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="mb-3">
          <MarketingStatus status={integration.status}>
            {copy.statuses[integration.status]}
          </MarketingStatus>
        </p>
        <h4 className="text-3xl leading-tight">
          <Link
            href={integration.href}
            className="decoration-1 underline-offset-4 hover:text-primary-text hover:underline"
          >
            {content.name}
          </Link>
        </h4>
        <p className="mt-4 max-w-[70ch] text-foreground-dimmed leading-relaxed">
          {directory.entries[integration.key]}
        </p>
        {integration.status === "feed" && integration.interests.length > 0 && (
          <p className="mt-2 text-foreground-dimmed text-sm">
            {copy.directSoon}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button
            variant="default"
            color="primary"
            render={<Link href={integration.href} />}
          >
            {copy.open}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Button>
          {integration.source && (
            <Button
              variant="outline"
              color="neutral"
              render={<a href={integration.source} />}
            >
              {copy.sourceLink}
            </Button>
          )}
        </div>
        {integration.interests.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {integration.interests.map((topic) => (
              <MarketingLead
                key={topic}
                kind="interest"
                topic={topic}
                title={copy.interests[topic]}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export const IntegrationDirectory = ({
  copy,
  directory,
}: IntegrationDirectory.Props) => (
  <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
    <h2 className="sr-only">{copy.index.title}</h2>
    <IntegrationGroups>
      {integrationGroups.map((group, index) => {
        const entries = integrations.filter((entry) => entry.group === group);
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
              <span className="grid min-w-0 flex-1 grid-cols-[64px_minmax(0,1fr)] items-start gap-6 md:grid-cols-[112px_minmax(0,1fr)] md:items-center md:gap-10">
                <span
                  className="font-heading text-5xl text-primary leading-none tracking-tight md:text-7xl"
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
                  directory={directory}
                />
              ))}
            </AccordionPanel>
          </AccordionItem>
        );
      })}
    </IntegrationGroups>
  </MarketingBand>
);

const ImportConnector = ({ branch }: ImportConnector.Props) => (
  <div
    aria-hidden="true"
    className="relative h-16 md:h-auto"
    data-import-connector={branch}
  >
    <span className="absolute inset-y-0 left-1/2 border-primary/40 border-l md:hidden" />
    <ArrowRightIcon className="absolute bottom-0 left-1/2 size-4 -translate-x-1/2 rotate-90 text-primary md:hidden" />
    <span
      className={
        branch === "inputs"
          ? "absolute top-1/2 right-0 left-1/2 border-primary/40 border-t max-md:hidden"
          : "absolute top-1/2 right-1/2 left-0 border-primary/40 border-t max-md:hidden"
      }
    />
    <span
      className={
        branch === "inputs"
          ? "absolute top-1/6 bottom-1/6 left-1/2 border-primary/40 border-l max-md:hidden"
          : "absolute top-1/4 bottom-1/4 left-1/2 border-primary/40 border-l max-md:hidden"
      }
    />
    {branch === "inputs" ? (
      <ArrowRightIcon className="absolute top-1/2 right-0 size-4 -translate-y-1/2 text-primary max-md:hidden" />
    ) : (
      <>
        <ArrowRightIcon className="absolute top-1/4 right-0 size-4 -translate-y-1/2 text-primary max-md:hidden" />
        <ArrowRightIcon className="absolute top-3/4 right-0 size-4 -translate-y-1/2 text-primary max-md:hidden" />
      </>
    )}
  </div>
);

const importSources = [
  { key: "productFeeds", icon: CommerceCode_3Icon },
  { key: "csv", icon: CommerceFilePenIcon },
  { key: "storeAddress", icon: CommerceGlobePointerIcon },
] as const;

const importOutputs = [
  { key: "simulate", icon: CommerceBasketShoppingIcon },
  { key: "audit", icon: CommerceFileShieldIcon },
] as const;

export const IntegrationImportFlow = ({
  copy,
  directory,
}: IntegrationImportFlow.Props) => (
  <MarketingBand
    id="import-flow"
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="px-7 pt-14 pb-10 max-sm:px-4 max-sm:pt-10">
      <MarketingEyebrow>{directory.flow.eyebrow}</MarketingEyebrow>
      <h2>{directory.flow.title}</h2>
      <p className="mt-4 max-w-[65ch] text-foreground-dimmed text-lg max-sm:text-base">
        {directory.flow.description}
      </p>
    </div>
    <figure
      className="px-7 pb-10 max-sm:px-4"
      aria-labelledby="import-flow-caption"
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)_48px_minmax(0,1fr)]">
        <div className="grid md:grid-rows-3" data-import-node="sources">
          {importSources.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="relative flex min-h-32 items-center gap-4 py-6 md:after:absolute md:after:top-1/2 md:after:-right-6 md:after:w-6 md:after:border-primary/40 md:after:border-t"
            >
              <Icon
                className="size-8 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h3 className="text-xl leading-tight">
                  {copy.entries[key].name}
                </h3>
                <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                  {directory.flow.sources[key]}
                </p>
              </div>
            </div>
          ))}
        </div>
        <ImportConnector branch="inputs" />
        <div
          className="self-center border border-accent-foreground bg-background px-6 py-8"
          data-import-node="catalog"
        >
          <CommerceBasketShoppingIcon
            className="size-12 text-primary"
            aria-hidden="true"
          />
          <h3 className="mt-6 text-2xl">{directory.flow.catalog.title}</h3>
          <p className="mt-3 text-foreground-dimmed text-sm leading-relaxed">
            {directory.flow.catalog.description}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-accent-foreground border-t pt-4 text-foreground text-sm">
            {directory.flow.catalog.fields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
        <ImportConnector branch="outputs" />
        <div className="grid md:grid-rows-2" data-import-node="outputs">
          {importOutputs.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="relative flex min-h-40 items-center gap-4 py-6 md:before:absolute md:before:top-1/2 md:before:-left-6 md:before:w-6 md:before:border-primary/40 md:before:border-t"
            >
              <Icon
                className="size-8 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h3 className="text-xl">{directory.flow.outputs[key].title}</h3>
                <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                  {directory.flow.outputs[key].description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption
        id="import-flow-caption"
        className="mt-8 max-w-[85ch] text-foreground-dimmed text-sm leading-relaxed"
      >
        {directory.flow.note}
      </figcaption>
    </figure>
    <div className="border-accent-foreground border-t px-7 py-6 max-sm:px-4">
      <Button
        variant="default"
        color="primary"
        render={<Link href="/integrations/product-feeds" />}
      >
        {directory.flow.action.primary}
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  </MarketingBand>
);

namespace DirectoryEntry {
  export type Props = {
    integration: Integration;
    copy: Copy;
    directory: DirectoryCopy;
  };
}

namespace ImportConnector {
  export type Props = { branch: "inputs" | "outputs" };
}

export namespace IntegrationDirectory {
  export type Props = { copy: Copy; directory: DirectoryCopy };
}

export namespace IntegrationImportFlow {
  export type Props = { copy: Copy; directory: DirectoryCopy };
}
