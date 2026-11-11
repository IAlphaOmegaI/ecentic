import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import {
  ChannelComparison,
  CommerceTimeline,
} from "@/components/marketing/channels";
import {
  MarketingBand,
  MarketingEyebrow,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { providerLogos } from "@/content/provider-logos";
import { Link } from "@/i18n/navigation";

export const CommerceLayer = async () => {
  const { enterpriseLayer: copy, enterpriseChannels: channels } =
    await getMessages();
  return (
    <>
      <MarketingBand id="how-it-fits" className="enterprise-layer">
        <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10">
          <MarketingEyebrow>{copy.eyebrow}</MarketingEyebrow>
          <h2 className="max-w-[940px]">{copy.title}</h2>
          <p className="mt-6 max-w-[720px] text-lg leading-relaxed">
            {copy.description}
          </p>
          <figure className="mt-12">
            <svg
              aria-hidden="true"
              viewBox="0 0 1128 460"
              className="hidden w-full lg:block"
            >
              <text
                x="0"
                y="24"
                className="fill-foreground-rich font-heading text-[22px]"
              >
                {copy.stack}
              </text>
              <text
                x="800"
                y="24"
                className="fill-foreground-rich font-heading text-[22px]"
              >
                {copy.channels}
              </text>
              <path
                d="M 320 236 H 430 M 670 236 H 710"
                className="stroke-primary-text/35"
              />
              {copy.inputs.map((input, index) => (
                <g key={input}>
                  <path
                    d={`M 230 ${96 + index * 62} H 294 Q 320 ${96 + index * 62} 320 236`}
                    fill="none"
                    className="stroke-primary-text/35"
                  />
                  <circle
                    cx="230"
                    cy={96 + index * 62}
                    r="3"
                    className="fill-primary-text"
                  />
                  <text
                    x="0"
                    y={102 + index * 62}
                    className="fill-foreground text-[18px]"
                  >
                    {input}
                  </text>
                </g>
              ))}
              <rect
                x="430"
                y="72"
                width="240"
                height="326"
                className="fill-primary-text"
              />
              <image
                href="/images/marketing/trademark-on-dark.svg"
                x="462"
                y="105"
                width="150"
                height="40"
              />
              <text
                x="462"
                y="177"
                className="fill-background-rich/85 text-[14px]"
              >
                {copy.layer}
              </text>
              {copy.stages.map((stage, index) => (
                <g key={stage}>
                  <path
                    d={`M 430 ${200 + index * 48} H 670`}
                    className="stroke-background-rich/25"
                  />
                  <text
                    x="462"
                    y={232 + index * 48}
                    className="fill-background-rich text-[19px]"
                  >
                    {stage}
                  </text>
                  <text
                    x="620"
                    y={232 + index * 48}
                    className="fill-background-rich/70 text-[14px]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </text>
                </g>
              ))}
              {aiChannels.map((channel, index) => (
                <g key={channel.key}>
                  <path
                    d={`M 710 236 Q 752 236 752 ${84 + index * 62} H 784`}
                    fill="none"
                    strokeDasharray={
                      channel.status === "soon" ? "4 5" : undefined
                    }
                    className="stroke-primary-text/45"
                  />
                  <circle
                    cx="784"
                    cy={84 + index * 62}
                    r="3"
                    className="fill-primary-text"
                  />
                  <image
                    href={providerLogos[channel.key].src}
                    x="800"
                    y={68 + index * 62}
                    width="28"
                    height="28"
                  />
                  <text
                    x="844"
                    y={83 + index * 62}
                    className="fill-foreground-rich text-[17px]"
                  >
                    {channel.key === "google"
                      ? copy.google
                      : channels.names[channel.key]}
                  </text>
                  <text
                    x="844"
                    y={104 + index * 62}
                    className="fill-foreground-dimmed text-[13px]"
                  >
                    {channels.statuses[channel.status]}
                  </text>
                </g>
              ))}
            </svg>
            <div className="grid gap-8 lg:sr-only">
              <div>
                <h3 className="mb-5 text-2xl">{copy.stack}</h3>
                <ul className="grid gap-3 text-base">
                  {copy.inputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              </div>
              <div className="relative border-primary-text border-y bg-primary-text px-6 py-7 text-background-rich before:absolute before:-top-8 before:left-1/2 before:h-8 before:border-primary-text before:border-l after:absolute after:-bottom-8 after:left-1/2 after:h-8 after:border-primary-text after:border-l">
                <p className="font-heading text-3xl">ecentic</p>
                <p className="mt-2 text-sm">{copy.layer}</p>
                <ol className="mt-6 grid grid-cols-2 gap-4 border-background-rich/30 border-t pt-5">
                  {copy.stages.map((stage) => (
                    <li key={stage}>{stage}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="mb-6 text-2xl">{copy.channels}</h3>
                <ul className="grid gap-5">
                  {aiChannels.map((channel) => (
                    <li key={channel.key} className="flex items-center gap-4">
                      <ProviderLogo
                        provider={channel.key}
                        className="size-7"
                        decorative
                      />
                      <div className="flex flex-col gap-1">
                        <span>{channels.names[channel.key]}</span>
                        <MarketingStatus status={channel.status}>
                          {channels.statuses[channel.status]}
                        </MarketingStatus>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <figcaption className="mt-8 max-w-[760px] text-foreground-dimmed text-sm leading-relaxed">
              {copy.legend}
            </figcaption>
          </figure>
          <Link
            href="/ai-channels"
            className="mt-8 inline-flex items-center gap-3 text-primary-text underline underline-offset-4"
          >
            {copy.action}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </div>
      </MarketingBand>
      <MarketingBand>
        <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10">
          <CommerceTimeline />
        </div>
      </MarketingBand>
      <MarketingBand>
        <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10">
          <ChannelComparison />
        </div>
      </MarketingBand>
    </>
  );
};
