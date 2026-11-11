import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { EvolvingAscii } from "./evolving-ascii";

export const MarketingBand = ({
  children,
  className,
  ...props
}: MarketingBand.Props) => (
  <section
    className={cn(
      "marketing-band relative border-[var(--rail-color)] border-y",
      className,
    )}
    {...props}
  >
    <div className="marketing-rail relative isolate mx-auto w-[min(1186px,calc(100%-56px))] border-[var(--rail-color)] border-x max-sm:w-[calc(100%-32px)] [.enterprise-journey>&]:w-auto [.enterprise-journey>&]:max-w-[1186px] max-sm:[.enterprise-journey>&]:mx-4 max-[1191px]:[.enterprise-journey>&]:mx-7">
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
  <p className="marketing-eyebrow mb-4 flex items-center gap-2 font-medium text-primary-text text-sm [&>span]:size-2 [&>span]:shrink-0 [&>span]:rounded-full [&>span]:bg-current">
    <span aria-hidden="true" />
    {children}
  </p>
);

export const MarketingActions = ({
  actions,
  tone = "default",
  className,
}: MarketingActions.Props) => (
  <div
    className={cn(
      "marketing-actions mt-6 flex flex-wrap items-center gap-4",
      className,
    )}
  >
    {actions.map((action, index) => (
      <Button
        key={action.href}
        variant="default"
        color={(index === 0) === (tone === "default") ? "primary" : "neutral"}
        render={<Link href={action.href} />}
      >
        {action.label}
        <ArrowRightIcon className="size-4" />
      </Button>
    ))}
  </div>
);

export const MarketingHeading = ({
  eyebrow,
  title,
  description,
  action,
  className,
}: MarketingHeading.Props) => (
  <div
    className={cn(
      "marketing-heading relative min-w-0 px-7 py-16 max-sm:px-4 max-sm:py-10",
      className,
    )}
  >
    {eyebrow && <MarketingEyebrow>{eyebrow}</MarketingEyebrow>}
    <h2>{title}</h2>
    {description && (
      <p className="mt-4 max-w-[65ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {description}
      </p>
    )}
    {action && <MarketingActions actions={[action]} />}
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
  artwork,
  children,
}: MarketingHero.Props) => (
  <MarketingBand
    className={cn(
      "marketing-hero",
      dark &&
        "marketing-dark enterprise-blue enterprise-journey mx-3 -mt-[68px] mb-3 min-h-dvh overflow-hidden rounded-xl border-0 bg-linear-to-r from-primary-text via-primary-text to-primary text-background-rich [--rail-color:color-mix(in_oklab,var(--color-background-rich)_22%,transparent)] [--rail-cross:transparent] max-sm:mx-2 max-sm:-mt-[72px] max-sm:mb-2 max-sm:rounded-lg [&>.marketing-rail]:flex [&>.marketing-rail]:min-h-dvh [&>.marketing-rail]:items-center [&>.marketing-rail]:border-x-background-rich/15 [&>.marketing-rail]:border-y-0 [&>.marketing-rail]:before:hidden [&>.marketing-rail]:after:hidden [&_.marketing-eyebrow]:text-background-rich [&_.marketing-guides_span]:before:hidden [&_.marketing-guides_span]:after:hidden [&_.marketing-screenshot_figcaption]:text-background-rich/85 [&_:is(h1,h2,h3)]:text-background-rich",
    )}
  >
    {(dark || artwork) && (
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 left-[35%] select-none [mask-image:linear-gradient(105deg,transparent_10%,black_85%)] max-sm:inset-x-0",
          dark
            ? "text-background-rich opacity-50 max-sm:opacity-25"
            : "text-primary opacity-20 max-sm:opacity-10",
        )}
      >
        <EvolvingAscii
          artwork={artwork ?? "commerce"}
          cycle={dark ? ["commerce", "console", "cart"] : undefined}
        />
      </div>
    )}
    <div
      className={cn(
        "marketing-cell relative min-w-0 px-7 max-sm:px-4 [&>p]:max-w-[70ch]",
        dark
          ? "w-full pt-36 pb-24 max-sm:pt-32 max-sm:pb-16"
          : "flex min-h-[480px] flex-col justify-center py-16 max-sm:min-h-0 max-sm:py-12",
      )}
    >
      {eyebrow && <MarketingEyebrow>{eyebrow}</MarketingEyebrow>}
      <h1 className="max-w-[920px] text-[clamp(3rem,5.2vw,4.8rem)] leading-[1.025] tracking-[-0.043em] max-sm:text-[43px] max-sm:tracking-[-0.036em]">
        {title}
      </h1>
      <p
        className={cn(
          "marketing-lead mt-6 max-w-[720px] text-lg leading-relaxed max-sm:text-base",
          dark ? "text-background-rich/85" : "text-foreground-dimmed",
        )}
      >
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
    artwork?: EvolvingAscii.Kind;
    children?: ReactNode;
  };
}

export const MarketingClosing = ({
  title,
  description,
  actions,
}: MarketingClosing.Props) => (
  <MarketingBand className="marketing-closing relative m-3 overflow-hidden rounded-xl border-0 bg-linear-to-br from-emphasis-dimmed via-emphasis to-primary-dimmed text-background-rich [--rail-color:color-mix(in_oklab,var(--color-background-rich)_20%,transparent)] [--rail-cross:transparent] max-sm:m-2 max-sm:rounded-lg [&>.marketing-rail]:border-y-0 [&>.marketing-rail]:before:hidden [&>.marketing-rail]:after:hidden [&_.marketing-guides_span]:before:hidden [&_.marketing-guides_span]:after:hidden">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100dvw-24px)] -translate-x-1/2 bg-radial-[at_bottom_left] from-primary/40 via-primary-dimmed/25 to-transparent max-sm:w-[calc(100dvw-16px)]"
    />
    <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100dvw-24px)] -translate-x-1/2 select-none text-background-rich opacity-40 [mask-image:linear-gradient(90deg,transparent,black_45%)] max-sm:w-[calc(100dvw-16px)] max-sm:opacity-15">
      <EvolvingAscii artwork="closing" fit="cover" className="size-full" />
    </div>
    <div className="marketing-cell relative flex min-h-[480px] flex-col justify-center px-7 py-16 max-sm:min-h-[460px] max-sm:px-4 max-sm:py-12">
      <h2 className="relative max-w-[760px] text-background-rich">{title}</h2>
      <p className="relative mt-4 max-w-[55ch] text-background-rich/85 text-lg leading-relaxed">
        {description}
      </p>
      <MarketingActions actions={actions} className="relative" />
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
    tone?: "default" | "inverse";
    className?: string;
  };
}

export namespace MarketingHeading {
  export type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: { label: string; href: string };
    className?: string;
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
