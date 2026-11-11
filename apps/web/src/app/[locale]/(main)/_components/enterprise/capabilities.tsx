import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import {
  MarketingFeatureBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { CapabilityIllustration } from "./capability-illustration";

const mechanisms = [
  { Icon: CommerceChartActivity_2Icon, kind: "simulations" },
  { Icon: CommerceFileShieldIcon, kind: "readiness" },
  { Icon: CommerceFilePenIcon, kind: "catalog" },
  { Icon: CommercePlug_3SparkleIcon, kind: "merchant-center" },
  { Icon: CommerceBasketShoppingIcon, kind: "checkout" },
  { Icon: CommerceCode_3Icon, kind: "developers" },
] as const;

/** A connected workbench: one comparison stage, then the tools around it. */
export const Capabilities = ({ copy }: Capabilities.Props) => (
  <MarketingFeatureBand id="capabilities" tone="dark">
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      className="pb-12 [&>.marketing-eyebrow]:text-primary-rich [&>h2]:max-w-[940px]"
    />
    <div
      data-capability-grid
      className="relative grid grid-cols-1 gap-px border-[var(--rail-color)] border-y bg-[var(--rail-color)] sm:grid-cols-2 lg:grid-cols-6"
    >
      <Plus className="top-0 left-0 z-2 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="top-0 right-0 z-2 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      {copy.items.map((item, index) => {
        const mechanism = mechanisms[index];
        if (!mechanism) return null;
        const Icon = mechanism.Icon;
        return (
          <article
            key={item.id}
            data-capability={item.id}
            className={cn(
              "group/capability relative isolate flex min-w-0 flex-col bg-emphasis-dimmed",
              index === 0 &&
                "bg-linear-to-br from-primary-dimmed/75 via-emphasis-dimmed to-emphasis-dimmed sm:col-span-2 lg:col-span-3 lg:row-span-2",
              (index === 1 || index === 2) && "lg:col-span-3",
              index > 2 && "lg:col-span-2",
              index === 5 && "sm:col-span-2",
            )}
          >
            {index > 0 && (
              <Plus className="top-0 left-0 z-3 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
            )}
            {index > 0 && (
              <Plus
                className={cn(
                  "top-0 right-0 z-3 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35",
                  (index === 1 || index === 3) && "sm:hidden",
                  index === 4 && "lg:hidden",
                )}
              />
            )}
            {index === 2 && (
              <Plus className="bottom-0 left-0 z-3 hidden -translate-x-1/2 translate-y-1/2 lg:block [&>span]:bg-background-rich/35" />
            )}
            {(index === 4 || index === 5) && (
              <Plus
                className={cn(
                  "bottom-0 left-0 z-3 hidden -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35",
                  index === 4 ? "sm:block" : "lg:block",
                )}
              />
            )}
            {index === 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-1 bg-radial-[at_60%_60%] from-primary/20 via-transparent to-transparent"
              />
            )}
            <div
              className={cn(
                "relative flex flex-1 flex-col px-7 pt-8 max-sm:px-5",
                index === 0 && "pt-10",
              )}
            >
              <Icon aria-hidden className="mb-6 size-8 text-primary-rich" />
              <h3 className="max-w-[25ch] text-background-rich">
                {item.title}
              </h3>
              <p className="mt-4 max-w-[53ch] text-background-rich/75">
                {item.body}
              </p>
              <div className="mt-6 flex justify-start">
                <Button
                  color={index === 0 ? "primary" : "emphasis"}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
            <CapabilityIllustration kind={mechanism.kind} tags={item.tags} />
          </article>
        );
      })}
      <Plus className="right-0 bottom-0 z-2 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="bottom-0 left-0 z-2 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    </div>
  </MarketingFeatureBand>
);

export namespace Capabilities {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["mechanisms"];
  };
}
