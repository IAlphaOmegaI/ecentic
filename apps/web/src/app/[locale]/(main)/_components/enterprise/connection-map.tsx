import {
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { aiChannels } from "@/content/ai-channels";
import { Link } from "@/i18n/navigation";
import { CommerceDiagram, DiagramIdentity } from "./commerce-diagram";

const sources = ["commerce", "feeds", "payments", "pim"] as const;

const SourceMark = ({ category }: { category: (typeof sources)[number] }) => {
  switch (category) {
    case "commerce":
      return (
        <span className="flex w-10 shrink-0 items-center gap-1 lg:w-14">
          <ProviderLogo
            provider="shopify"
            decorative
            className="h-6 w-4 rounded-none lg:h-7 lg:w-5"
          />
          <ProviderLogo
            provider="woocommerce"
            decorative
            className="h-6 w-5 rounded-none lg:h-7 lg:w-8"
          />
        </span>
      );
    case "feeds":
      return <CommerceFilePenIcon aria-hidden className="size-6 lg:size-7" />;
    case "payments":
      return (
        <CommercePlug_3SparkleIcon aria-hidden className="size-6 lg:size-7" />
      );
    case "pim":
      return <CommerceCode_3Icon aria-hidden className="size-6 lg:size-7" />;
  }
};

export const ConnectionMap = ({
  copy,
  groups,
  names,
  statuses,
}: ConnectionMap.Props) => (
  <div className="relative isolate min-w-0 border-accent-foreground border-t bg-background px-4 py-4 sm:px-7 lg:py-8">
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
    <CommerceDiagram compact label={copy.diagram}>
      <div className="relative grid min-w-0 gap-4 lg:min-h-74 lg:grid-cols-3 lg:items-center lg:gap-14">
        <ul
          aria-label={copy.stack}
          className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-1 lg:gap-y-4"
        >
          {sources.map((category) => (
            <li
              key={category}
              data-diagram-port="input"
              className="relative flex min-h-10 min-w-0 items-center gap-2 bg-background lg:min-h-12 lg:gap-4"
            >
              <span className="flex w-10 shrink-0 items-center justify-start text-primary-text lg:w-14">
                <SourceMark category={category} />
              </span>
              <span className="wrap-anywhere min-w-0 text-foreground-rich text-xs leading-snug lg:text-sm">
                {groups[category]}
              </span>
            </li>
          ))}
        </ul>
        <div
          data-diagram-hub
          className="relative isolate mx-auto flex w-44 min-w-0 flex-col items-center gap-2 py-2 text-center lg:w-48 lg:py-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-1 rounded-full bg-radial from-primary/15 via-primary/5 to-transparent lg:-inset-12"
          />
          <Image
            src="/images/trademark.svg"
            alt="ecentic"
            width={1022}
            height={257}
            className="h-auto w-32 max-w-full lg:w-40"
          />
          <p className="text-primary-text text-xs leading-snug lg:text-sm">
            {copy.layer}
          </p>
        </div>
        <ul
          aria-label={copy.channels}
          className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-1 lg:gap-y-1"
        >
          {aiChannels.map((channel) => (
            <li
              key={channel.key}
              data-diagram-port="output"
              data-pending={channel.status === "soon"}
              className="relative min-w-0 bg-background"
            >
              <DiagramIdentity>
                <Link
                  href={channel.href}
                  aria-label={`${names[channel.key]}: ${statuses[channel.status]}`}
                  className="group flex min-h-8 min-w-0 items-center gap-2 outline-offset-4 lg:min-h-10 lg:gap-3"
                >
                  <ProviderLogo
                    provider={channel.key}
                    decorative
                    className="size-6 shrink-0 rounded-none object-center lg:size-7"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="wrap-anywhere block text-foreground-rich text-xs leading-snug group-hover:text-primary-text lg:text-sm">
                      {names[channel.key]}
                    </span>
                    <span className="wrap-anywhere text-foreground-dimmed text-xs leading-tight">
                      {statuses[channel.status]}
                    </span>
                  </span>
                </Link>
              </DiagramIdentity>
            </li>
          ))}
        </ul>
      </div>
    </CommerceDiagram>
  </div>
);

export namespace ConnectionMap {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseLayer"];
    groups: AppConfig["Messages"]["enterpriseIntegrations"]["groups"];
    names: AppConfig["Messages"]["enterpriseChannels"]["names"];
    statuses: AppConfig["Messages"]["enterpriseChannels"]["statuses"];
  };
}
