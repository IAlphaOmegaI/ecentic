import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { AsciiClosingArtwork } from "./ascii-artwork";
import { AsciiAtmosphere } from "./ascii-atmosphere";

export const MarketingBand = ({
  children,
  className,
  ...props
}: MarketingBand.Props) => (
  <section className={cn("marketing-band relative", className)} {...props}>
    <div className="marketing-rail relative isolate mx-auto max-w-[1186px] border border-[var(--rail-color)] max-sm:mx-4 max-[1191px]:mx-7">
      <div aria-hidden="true" className="marketing-guides">
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  </section>
);

export const MarketingEyebrow = ({ children }: MarketingEyebrow.Props) => (
  <p className="marketing-eyebrow text-(length:--text-sm) mb-6 flex items-center gap-2.5 font-medium text-primary-text [&>span]:size-2 [&>span]:shrink-0 [&>span]:rounded-full [&>span]:bg-current">
    <span aria-hidden="true" />
    {children}
  </p>
);

export const MarketingActions = ({ actions }: MarketingActions.Props) => (
  <div className="marketing-actions mt-8 flex flex-wrap gap-3 max-sm:gap-2.5 [&>a+a]:border-accent-foreground [&>a+a]:bg-transparent [&>a+a]:text-primary-text [&>a:first-child]:rounded-md [&>a:first-child]:bg-primary-text [&>a:first-child]:text-background-rich [&>a]:min-h-[46px] [&>a]:rounded-xs [&>a]:px-[18px] [&>a]:py-2.5 [&>a]:text-[15px] max-sm:[&>a]:whitespace-normal max-sm:[&>a]:text-left">
    {actions.map((action, index) => (
      <Button
        key={action.href}
        variant={index === 0 ? "flat" : "outline"}
        color="primary"
        render={<Link href={action.href} />}
      >
        {action.label}
        <ArrowRightIcon className="size-4" />
      </Button>
    ))}
  </div>
);

export const MarketingStatus = ({
  children,
  status,
}: MarketingStatus.Props) => (
  <span
    className="marketing-status inline-flex items-center gap-2 font-medium text-[13px] text-foreground [&>span]:size-2 [&>span]:shrink-0 [&>span]:rounded-full [&>span]:bg-primary-text data-[status=not-yet]:[&>span]:border data-[status=soon]:[&>span]:border data-[status=not-yet]:[&>span]:border-current data-[status=soon]:[&>span]:border-current data-[status=feed]:[&>span]:bg-foreground-dimmed data-[status=not-yet]:[&>span]:bg-transparent data-[status=soon]:[&>span]:bg-transparent"
    data-status={status}
  >
    <span aria-hidden="true" />
    {children}
  </span>
);

export const MarketingHero = ({
  eyebrow,
  title,
  description,
  actions = [],
  dark = false,
  children,
}: MarketingHero.Props) => (
  <MarketingBand
    className={cn(
      "marketing-hero [&_.marketing-cell]:pt-[88px] [&_.marketing-cell]:pb-[72px] max-sm:[&_.marketing-cell]:py-[52px]",
      dark &&
        "marketing-dark text-background-rich/82 [--rail-color:color-mix(in_oklab,var(--color-background-rich)_30%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [&>.marketing-rail]:bg-[linear-gradient(165deg,var(--color-band-start)_25%,var(--color-band-middle)_66%,var(--color-band-end))] [&_.marketing-actions>a+a]:border-background-rich/60 [&_.marketing-actions>a+a]:text-background-rich [&_.marketing-actions>a:first-child]:bg-background-rich [&_.marketing-actions>a:first-child]:text-foreground-rich [&_.marketing-eyebrow]:text-primary-rich [&_.marketing-screenshot_figcaption]:text-background-rich/82 [&_:is(h1,h2,h3)]:text-background-rich",
    )}
  >
    {dark && (
      <AsciiAtmosphere className="marketing-closing-art pointer-events-none absolute inset-0 text-background-rich opacity-20 [mask-image:linear-gradient(100deg,transparent,black)]">
        <AsciiClosingArtwork />
      </AsciiAtmosphere>
    )}
    <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
      {eyebrow && <MarketingEyebrow>{eyebrow}</MarketingEyebrow>}
      <h1>{title}</h1>
      <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
        {description}
      </p>
      <MarketingActions actions={actions} />
      {children}
    </div>
  </MarketingBand>
);

export namespace MarketingHero {
  export type Props = {
    eyebrow?: string;
    title: string;
    description: string;
    actions?: readonly { label: string; href: string }[];
    dark?: boolean;
    children?: ReactNode;
  };
}

export const MarketingClosing = ({
  title,
  description,
  actions,
}: MarketingClosing.Props) => (
  <MarketingBand className="marketing-closing marketing-dark text-background-rich/82 [--rail-color:color-mix(in_oklab,var(--color-background-rich)_30%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [&>.marketing-rail]:bg-[linear-gradient(165deg,var(--color-band-start)_25%,var(--color-band-middle)_66%,var(--color-band-end))] [&_.marketing-actions>a+a]:border-background-rich/60 [&_.marketing-actions>a+a]:text-background-rich [&_.marketing-actions>a:first-child]:bg-background-rich [&_.marketing-actions>a:first-child]:text-foreground-rich [&_.marketing-cell]:flex [&_.marketing-cell]:min-h-[460px] [&_.marketing-cell]:flex-col [&_.marketing-cell]:justify-center max-sm:[&_.marketing-cell]:min-h-[440px] [&_.marketing-eyebrow]:text-primary-rich [&_.marketing-screenshot_figcaption]:text-background-rich/82 [&_:is(h1,h2,h3)]:text-background-rich [&_h2]:max-w-[780px]">
    <AsciiAtmosphere className="marketing-closing-art pointer-events-none absolute inset-0 text-background-rich opacity-20 [mask-image:linear-gradient(100deg,transparent,black)]">
      <AsciiClosingArtwork />
    </AsciiAtmosphere>
    <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
      <h2>{title}</h2>
      <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
        {description}
      </p>
      <MarketingActions actions={actions} />
    </div>
  </MarketingBand>
);

export const MarketingScreenshot = ({
  src,
  alt,
  caption,
  priority = false,
  width = 1280,
  height = 679,
}: MarketingScreenshot.Props) => (
  <figure className="marketing-screenshot mt-10 [&_figcaption]:mt-3 [&_figcaption]:text-[13px] [&_figcaption]:text-foreground-dimmed [&_img]:h-auto [&_img]:w-full [&_img]:object-contain">
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 640px) 100vw, 1184px"
      priority={priority}
    />
    <figcaption>{caption}</figcaption>
  </figure>
);

export namespace MarketingBand {
  export type Props = HTMLAttributes<HTMLElement>;
}

export namespace MarketingEyebrow {
  export type Props = { children: ReactNode };
}

export namespace MarketingActions {
  export type Props = {
    actions: readonly { label: string; href: string }[];
  };
}

export namespace MarketingStatus {
  export type Props = {
    children: ReactNode;
    status: string;
  };
}

export namespace MarketingClosing {
  export type Props = {
    title: string;
    description: string;
    actions: readonly { label: string; href: string }[];
  };
}

export namespace MarketingScreenshot {
  export type Props = {
    src: string;
    alt: string;
    caption: string;
    priority?: boolean;
    width?: number;
    height?: number;
  };
}
