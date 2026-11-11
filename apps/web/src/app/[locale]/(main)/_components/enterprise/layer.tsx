import {
  ArrowRightIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import {
  ChannelComparison,
  CommerceTimeline,
} from "@/components/marketing/channels";
import {
  MarketingBand,
  MarketingHeading,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { Link } from "@/i18n/navigation";
import { CommerceDiagram } from "./commerce-diagram";

const StackMark = ({ index }: { index: number }) => {
  switch (index) {
    case 0:
      return (
        <ProviderLogo provider="shopify" className="h-8 w-10" decorative />
      );
    case 1:
      return (
        <ProviderLogo provider="woocommerce" className="h-8 w-16" decorative />
      );
    case 2:
      return (
        <CommerceFilePenIcon aria-hidden className="size-8 text-primary" />
      );
    case 3:
      return <CommerceCode_3Icon aria-hidden className="size-8 text-primary" />;
    default:
      return (
        <ProviderLogo provider="googleMerchant" className="size-8" decorative />
      );
  }
};

export const CommerceLayer = async () => {
  const { enterpriseLayer: copy, enterpriseChannels: channels } =
    await getMessages();
  return (
    <>
      <MarketingBand id="how-it-fits" className="enterprise-layer">
        <div className="marketing-cell relative min-w-0 px-7 py-16 max-sm:px-4 max-sm:py-12">
          <MarketingHeading
            className="p-0 max-sm:p-0"
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
          />
          <CommerceDiagram label={copy.diagram}>
            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem_minmax(0,1fr)] lg:items-center lg:gap-12">
              <div className="min-w-0 lg:flex lg:w-fit lg:max-w-full lg:flex-col lg:self-stretch lg:justify-self-center">
                <h3 className="mb-6 font-heading text-2xl">{copy.stack}</h3>
                <ul className="grid gap-6 lg:flex-1 lg:content-center">
                  {copy.inputs.map((input, index) => (
                    <li
                      key={input}
                      data-diagram-port="input"
                      className="flex min-h-10 items-center gap-4"
                    >
                      <span className="flex h-10 w-16 shrink-0 items-center">
                        <StackMark index={index} />
                      </span>
                      <span className="text-base text-foreground">{input}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                data-diagram-hub
                className="relative flex min-h-96 flex-col items-center justify-center px-8 py-10 text-center before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-0 before:bg-linear-to-r before:from-transparent before:via-primary/20 before:to-transparent lg:min-h-[440px] lg:before:-inset-x-12 before:[mask-image:linear-gradient(180deg,transparent,black_18%,black_82%,transparent)]"
              >
                <Image
                  src="/images/trademark.svg"
                  alt="ecentic"
                  width={180}
                  height={46}
                  className="relative h-auto w-44"
                />
                <p className="relative mt-4 text-primary-text text-sm">
                  {copy.layer}
                </p>
                <ol className="relative mt-8 w-full max-w-48 divide-y divide-primary/15">
                  {copy.stages.map((stage) => (
                    <li
                      key={stage}
                      className="py-4 font-heading text-2xl text-foreground-rich"
                    >
                      {stage}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="min-w-0 lg:flex lg:w-fit lg:max-w-full lg:flex-col lg:self-stretch lg:justify-self-center">
                <h3 className="mb-6 font-heading text-2xl">{copy.channels}</h3>
                <ul className="grid gap-4 lg:flex-1 lg:content-center">
                  {aiChannels.map((channel) => (
                    <li
                      key={channel.key}
                      data-diagram-port="output"
                      data-pending={channel.status === "soon"}
                      className="flex min-h-12 items-center gap-4"
                    >
                      <span className="flex h-10 w-16 shrink-0 items-center">
                        <ProviderLogo
                          provider={channel.key}
                          className="size-8"
                          decorative
                        />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-base text-foreground-rich">
                          {channel.key === "google"
                            ? copy.google
                            : channels.names[channel.key]}
                        </p>
                        <MarketingStatus status={channel.status}>
                          {channels.statuses[channel.status]}
                        </MarketingStatus>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CommerceDiagram>
          <div className="mt-10">
            <Button render={<Link href="/ai-channels" />}>
              {copy.action}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </MarketingBand>
      <MarketingBand className="enterprise-timeline [&>.marketing-rail>.marketing-guides]:[mask-image:linear-gradient(180deg,black,transparent_96px)]">
        <div className="marketing-cell relative min-w-0 px-7 py-16 max-sm:px-4 max-sm:py-12">
          <CommerceTimeline />
        </div>
      </MarketingBand>
      <MarketingBand className="enterprise-comparison [&>.marketing-rail>.marketing-guides]:hidden">
        <div className="marketing-cell relative min-w-0 px-7 py-16 max-sm:px-4 max-sm:py-12">
          <ChannelComparison />
        </div>
      </MarketingBand>
    </>
  );
};
