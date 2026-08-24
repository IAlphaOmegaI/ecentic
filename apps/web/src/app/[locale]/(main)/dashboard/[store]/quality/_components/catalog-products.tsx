"use client";

import { ChevronRightIcon, ShareIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ListingReport } from "@/server/app/intelligence/listing-quality";
import {
  type Platform,
  type Severity,
  SURFACES,
  type Surface,
  type Verdict,
} from "@/server/app/intelligence/listing-rules";
import { StatusPill } from "../../../_components/grid";
import { ProductThumb } from "./affected-products";

const ROW_GRID =
  "grid grid-cols-1 gap-x-4 gap-y-2 px-4 sm:grid-cols-[minmax(0,1fr)_repeat(3,10rem)] sm:items-center";

const COLUMN_HEADER =
  "flex min-w-0 items-center gap-1.5 font-semibold text-[11px] text-foreground-dimmed uppercase tracking-[0.06em]";

const SURFACE_LOGOS: Partial<Record<Surface, string>> = {
  google: "/images/google.svg",
  chatgpt: "/images/chatgpt.svg",
};

const SurfaceMark = ({
  surface,
  label,
}: {
  surface: Surface;
  label: string;
}) => {
  const logo = SURFACE_LOGOS[surface];

  if (!logo) return label;

  return (
    <>
      <Image
        src={logo}
        alt=""
        width={14}
        height={14}
        className="size-3.5 shrink-0"
      />
      <span className="min-w-0 truncate">{label}</span>
    </>
  );
};

const SEVERITY_TONES = {
  blocker: "error",
  warning: "warning",
  info: "neutral",
} as const;

const STATUS_DOTS = {
  blocker: "bg-error",
  warning: "bg-warning",
  info: "bg-foreground-dimmed",
  ready: "bg-success",
} as const;

const PLATFORM_KEYS = {
  universal: "platform.universal",
  google: "platform.google",
  chatgpt: "platform.chatgpt",
} as const;

const SEVERITY_KEYS = {
  blocker: "severity.blocker",
  warning: "severity.warning",
  info: "severity.info",
} as const;

const StatusCell = ({
  status,
  surface,
  surfaceLabel,
  statusLabel,
}: {
  status: keyof typeof STATUS_DOTS;
  surface: Surface;
  surfaceLabel: string;
  statusLabel: string;
}) => (
  <span className="flex items-center gap-1.5">
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOTS[status])}
    />
    <span className="flex min-w-0 items-center gap-1.5 text-foreground-dimmed text-xs sm:hidden">
      <SurfaceMark surface={surface} label={surfaceLabel} />
    </span>
    <span className="text-foreground text-xs">{statusLabel}</span>
  </span>
);

export const PlatformVerdicts = ({
  universal,
  entries,
}: {
  universal: Severity | null;
  entries: {
    platform: Platform;
    verdict: Verdict;
  }[];
}) => {
  const translate = useTranslations("dashboard.quality");

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {universal && (
        <StatusPill tone={SEVERITY_TONES[universal]}>
          {translate(PLATFORM_KEYS.universal)} ·{" "}
          {translate(SEVERITY_KEYS[universal])}
        </StatusPill>
      )}
      {entries.map((entry) => (
        <span key={entry.platform} className="flex items-center gap-1.5">
          <StatusPill tone={SEVERITY_TONES[entry.verdict.severity]}>
            {translate(PLATFORM_KEYS[entry.platform])} ·{" "}
            {translate(SEVERITY_KEYS[entry.verdict.severity])}
          </StatusPill>
          {entry.verdict.code && (
            <code className="rounded bg-background-dimmed px-1.5 py-0.5 font-mono text-[11px] text-foreground-dimmed">
              {entry.verdict.code}
            </code>
          )}
          <a
            href={entry.verdict.reference}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary-text text-xs underline-offset-2 hover:underline"
          >
            {translate("reference")}
            <ShareIcon aria-hidden className="size-3" />
          </a>
        </span>
      ))}
    </div>
  );
};

const ProductIdentity = ({
  product,
  findings,
  expandable,
}: {
  product: ListingReport;
  findings?: string;
  expandable?: boolean;
}) => (
  <span className="flex min-w-0 items-center gap-2">
    {expandable ? (
      <ChevronRightIcon
        aria-hidden
        className="size-3.5 shrink-0 text-foreground-dimmed transition-transform group-data-panel-open:rotate-90"
      />
    ) : (
      <span aria-hidden className="size-3.5 shrink-0" />
    )}
    <ProductThumb src={product.image} alt={product.title} className="size-9" />
    <span className="min-w-0 truncate font-medium text-foreground text-sm">
      {product.title}
    </span>
    {findings && (
      <span className="shrink-0 text-foreground-dimmed text-xs">
        {findings}
      </span>
    )}
  </span>
);

export const CatalogProducts = ({
  products,
}: {
  products: ListingReport[];
}) => {
  const translate = useTranslations("dashboard.quality");

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          ROW_GRID,
          "hidden border-accent-foreground border-b bg-background-dimmed py-2 sm:grid",
        )}
      >
        <p className={COLUMN_HEADER}>{translate("products.headers.product")}</p>
        {SURFACES.map((surface) => (
          <p key={surface} className={COLUMN_HEADER}>
            <SurfaceMark
              surface={surface}
              label={translate(`platform.${surface}`)}
            />
          </p>
        ))}
      </div>

      <Accordion multiple className="text-foreground">
        {products.map((product) => {
          const statuses = SURFACES.map((surface) => (
            <StatusCell
              key={surface}
              status={product.status[surface]}
              surface={surface}
              surfaceLabel={translate(`platform.${surface}`)}
              statusLabel={translate(`status.${product.status[surface]}`)}
            />
          ));

          if (product.findings.length === 0)
            return (
              <div
                key={product.id}
                className={cn(
                  ROW_GRID,
                  "border-accent-foreground border-b py-3 last:border-b-0",
                )}
              >
                <ProductIdentity product={product} />
                {statuses}
              </div>
            );

          return (
            <AccordionItem
              key={product.id}
              value={product.id}
              className="border-accent-foreground last:border-b-0"
            >
              <AccordionTrigger
                className={cn(
                  ROW_GRID,
                  "items-center py-3 text-sm hover:bg-background",
                )}
                classList={{ trigger: { icon: "hidden" } }}
              >
                <ProductIdentity
                  product={product}
                  expandable
                  findings={translate("products.findings", {
                    count: product.findings.length,
                  })}
                />
                {statuses}
              </AccordionTrigger>
              <AccordionPanel className="text-foreground text-sm">
                <div className="divide-y divide-accent-foreground border-accent-foreground border-t bg-background">
                  {product.findings.map((finding) => (
                    <div
                      key={finding.rule}
                      className="flex flex-col gap-1.5 px-4 py-3 pl-10"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-background-dimmed px-1.5 py-0.5 font-mono text-[11px] text-foreground-dimmed">
                          {finding.attribute}
                        </code>
                        <p className="font-medium text-foreground text-sm">
                          {translate(`rules.${finding.rule}.title`)}
                        </p>
                      </div>
                      <p className="max-w-3xl text-foreground-dimmed text-sm">
                        {translate(`rules.${finding.rule}.detail`)}
                      </p>
                      <PlatformVerdicts
                        universal={finding.universal}
                        entries={finding.platforms}
                      />
                    </div>
                  ))}
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
