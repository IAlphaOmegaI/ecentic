import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { AsciiClosingArtwork } from "./ascii-artwork";
import { AsciiAtmosphere } from "./ascii-atmosphere";
import "./marketing.css";
import "./grid-guides.css";

export const MarketingBand = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) => (
  <section className={cn("marketing-band", className)} {...props}>
    <div className="marketing-rail">
      <div aria-hidden="true" className="marketing-guides">
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  </section>
);

export const MarketingEyebrow = ({ children }: { children: ReactNode }) => (
  <p className="marketing-eyebrow">
    <span aria-hidden="true" />
    {children}
  </p>
);

export const MarketingActions = ({
  actions,
}: {
  actions: readonly { label: string; href: string }[];
}) => (
  <div className="marketing-actions">
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
}: {
  children: ReactNode;
  status: string;
}) => (
  <span className="marketing-status" data-status={status}>
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
  <MarketingBand className={cn("marketing-hero", dark && "marketing-dark")}>
    {dark && (
      <AsciiAtmosphere className="marketing-closing-art">
        <AsciiClosingArtwork />
      </AsciiAtmosphere>
    )}
    <div className="marketing-cell">
      {eyebrow && <MarketingEyebrow>{eyebrow}</MarketingEyebrow>}
      <h1>{title}</h1>
      <p className="marketing-lead">{description}</p>
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
}: {
  title: string;
  description: string;
  actions: readonly { label: string; href: string }[];
}) => (
  <MarketingBand className="marketing-closing marketing-dark">
    <AsciiAtmosphere className="marketing-closing-art">
      <AsciiClosingArtwork />
    </AsciiAtmosphere>
    <div className="marketing-cell">
      <h2>{title}</h2>
      <p className="marketing-lead">{description}</p>
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
}: {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) => (
  <figure className="marketing-screenshot">
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
