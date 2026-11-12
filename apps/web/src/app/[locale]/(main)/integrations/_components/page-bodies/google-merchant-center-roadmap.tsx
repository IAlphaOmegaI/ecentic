import {
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { MarketingSection } from "@/components/marketing/page";
import { MarketingStatus } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const icons = [
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
  CommerceFilePenIcon,
  CommerceChartActivity_2Icon,
] as const;

/** All steps stay visible; the section shell owns the final seam and outer crosses. */
export const GoogleMerchantCenterRoadmap = ({
  section,
}: MarketingSection.Props) => (
  <ol
    aria-label={section.title}
    data-merchant-roadmap
    className="relative m-0 grid list-none border-accent-foreground border-t lg:grid-cols-4"
  >
    {section.items?.map((item, index) => {
      const Icon = icons[index] ?? CommerceFilePenIcon;
      return (
        <li
          key={item.title}
          className="relative min-w-0 border-accent-foreground border-b bg-linear-to-b from-primary/5 to-background last-of-type:border-b-0 lg:border-r lg:border-b-0 lg:last-of-type:border-r-0"
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          {index > 0 && (
            <>
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 lg:hidden" />
              <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 lg:block" />
            </>
          )}
          <div className="relative grid h-full grid-cols-[48px_1fr] gap-5 px-8 py-8 max-sm:gap-4 max-sm:px-4 lg:flex lg:flex-col lg:gap-0 lg:px-6">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-0 bottom-0 left-14 w-px bg-primary/20 max-sm:left-10 lg:top-14 lg:bottom-auto lg:left-0 lg:h-px lg:w-full",
                index === 0 && "top-14 lg:left-12 lg:w-[calc(100%-3rem)]",
                index === (section.items?.length ?? 0) - 1 &&
                  "bottom-[calc(100%-3.5rem)] lg:bottom-auto lg:w-12",
              )}
            />
            <div className="relative z-1 grid size-12 place-items-center rounded-lg border border-primary/25 bg-background text-primary-text">
              <Icon aria-hidden className="size-7" />
            </div>
            <div className="min-w-0 lg:mt-7">
              <span className="block font-heading text-3xl text-primary-text tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.status && (
                <MarketingStatus status={item.status}>
                  {item.statusLabel}
                </MarketingStatus>
              )}
              <h3 className="mt-4 max-w-[22ch] text-xl leading-snug lg:min-h-14">
                {item.title}
              </h3>
              <p className="mt-4 max-w-[47ch] text-base text-foreground-dimmed leading-relaxed">
                {item.body}
              </p>
              {item.href && (
                <Link
                  href={item.href}
                  className="mt-5 inline-block text-primary-text underline underline-offset-4"
                >
                  {item.label ?? item.title}
                </Link>
              )}
            </div>
          </div>
        </li>
      );
    })}
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
  </ol>
);
