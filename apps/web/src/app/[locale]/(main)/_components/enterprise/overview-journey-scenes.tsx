import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";

const sources = ["shopify", "woocommerce", "adobe", "wix"] as const;
const models = ["chatgpt", "claude", "gemini", "perplexity"] as const;

export const heroProduct = {
  id: "SKU-01",
  price: 89,
  currency: "USD",
  image: "/images/marketing/hero-sneaker.webp",
} as const;

type Copy = AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];

const ProductPhoto = ({ className }: { className?: string }) => (
  <Image
    src={heroProduct.image}
    width={640}
    height={640}
    alt=""
    loading="eager"
    sizes="(min-width: 768px) 160px, 128px"
    className={cn("object-contain mix-blend-multiply", className)}
  />
);

/** Source and destination remain present while the central record changes. */
export const OverviewSource = ({ compact = false }: { compact?: boolean }) => (
  <div
    data-hero-store
    className={cn(
      "relative rounded-lg border border-foreground/15 bg-background-rich text-foreground shadow-emphasis/10 shadow-sm",
      compact ? "px-2 pt-4 pb-2" : "px-4 pt-10 pb-4",
    )}
  >
    <div
      className={cn(
        "absolute -inset-x-1 -top-2 grid grid-cols-5 overflow-hidden rounded-lg border border-foreground/15 bg-background-rich",
        compact ? "h-4" : "h-8",
      )}
    >
      {[0, 1, 2, 3, 4].map((stripe) => (
        <div
          key={stripe}
          className={
            stripe % 2 === 0
              ? "rounded-b-lg border-foreground/15 border-b bg-background-rich"
              : "rounded-b-lg border-foreground/15 border-b bg-linear-to-b from-primary/10 to-primary/30"
          }
        />
      ))}
    </div>
    {!compact && (
      <div className="relative mb-4 flex h-24 items-center overflow-hidden rounded-sm border border-foreground/15 bg-primary/5">
        <ProductPhoto className="h-full w-3/4" />
        <div className="absolute inset-y-0 right-0 w-1/4 border-foreground/15 border-l bg-background-rich/50">
          <span className="absolute top-1/2 right-2 h-4 w-px bg-foreground/50" />
        </div>
      </div>
    )}
    <div
      data-source-provider-logos
      className={cn(
        "items-center gap-2",
        compact
          ? "grid grid-cols-2 justify-items-center gap-y-1"
          : "flex justify-between",
      )}
    >
      {sources.map((provider) => (
        <ProviderLogo
          key={provider}
          provider={provider}
          decorative
          className={
            provider === "shopify"
              ? "size-6 shrink-0 object-center"
              : "h-6 w-8 min-w-0 object-center"
          }
        />
      ))}
    </div>
  </div>
);

export const OverviewChannels = ({
  active,
  enhanced,
  copy,
  compact = false,
}: {
  active: number;
  enhanced: boolean;
  copy: Copy;
  compact?: boolean;
}) => (
  <div data-hero-channels className="relative pb-4">
    <div
      className={cn(
        "relative z-1 overflow-hidden rounded-lg border border-foreground/15 bg-background-rich text-foreground shadow-emphasis/10 shadow-sm",
        compact ? "p-2" : "px-4 pt-4",
      )}
    >
      <div
        data-comparison-provider-logos
        className={cn(
          "items-center gap-2",
          compact
            ? "grid grid-cols-2 justify-items-center gap-y-1"
            : "flex justify-between",
        )}
      >
        {models.map((provider) => (
          <ProviderLogo
            key={provider}
            provider={provider}
            decorative
            className={
              provider === "perplexity"
                ? "size-6 min-w-0 object-center brightness-0"
                : "size-6 min-w-0 object-center"
            }
          />
        ))}
      </div>
      {!compact && (
        <div className="relative mt-4 h-32 border-accent-foreground border-t">
          <Motion.Item
            initial={false}
            animate={{
              opacity: active === 1 || active === 4 ? 1 : 0.45,
              y: active === 1 || active === 4 ? 0 : 4,
            }}
            transition={{ duration: enhanced ? 0.5 : 0 }}
            className="absolute inset-0 flex items-center"
          >
            <ProductPhoto className="size-full" />
            <span className="absolute top-2 right-0 grid size-6 place-items-center rounded-full bg-primary/10 text-primary-text">
              <ArrowRightIcon className="size-4" />
            </span>
          </Motion.Item>
        </div>
      )}
    </div>
    {!compact && (
      <>
        <div className="absolute inset-x-1/3 bottom-1 h-4 border-foreground/15 border-x bg-background-dimmed" />
        <div className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-background-rich" />
        <p className="absolute inset-x-0 -bottom-8 text-center text-background-rich/80 text-xs">
          {copy.labels.simulation}
        </p>
      </>
    )}
  </div>
);

const ProductObject = ({ className }: { className?: string }) => (
  <div className={cn("relative min-h-0", className)}>
    <span className="absolute inset-x-1/4 bottom-3 h-3 rounded-full bg-primary/20 blur-md" />
    <ProductPhoto className="relative size-full -rotate-6" />
  </div>
);

const CatalogSheet = ({
  copy,
  animated,
}: {
  copy: Copy;
  animated: boolean;
}) => (
  <div className="relative z-1 border-accent-foreground border-b bg-background-rich">
    <div className="grid grid-cols-12 border-accent-foreground border-b bg-background text-center font-mono text-foreground-dimmed text-xs">
      <span className="col-span-1 border-accent-foreground border-r py-1" />
      <span className="col-span-4 border-accent-foreground border-r py-1">
        A
      </span>
      <span className="col-span-7 py-1">B</span>
    </div>
    {[
      ["SKU", heroProduct.id],
      [copy.labels.title, copy.product],
      [copy.labels.material, copy.material],
      [copy.labels.closure, copy.closure],
    ].map(([label, value], index) => (
      <div
        key={label}
        className={cn(
          "relative isolate grid grid-cols-12 border-accent-foreground border-b text-xs last:border-b-0",
          index === 1 && "text-primary-text",
        )}
      >
        {index === 1 && (
          <Motion.Item
            key={`highlight-${animated}`}
            initial={animated ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={{
              duration: animated ? 0.65 : 0,
              delay: animated ? 0.3 : 0,
            }}
            className="pointer-events-none absolute inset-0 -z-1 origin-left bg-primary/10"
          />
        )}
        <span className="col-span-1 border-accent-foreground border-r bg-background py-1.5 text-center font-mono text-foreground-dimmed">
          {index + 1}
        </span>
        <span className="col-span-4 border-accent-foreground border-r px-2 py-1.5">
          {label}
        </span>
        <span className="col-span-7 px-2 py-1.5 font-medium">{value}</span>
      </div>
    ))}
  </div>
);

const Stage = ({
  index,
  copy,
  detailed,
  animated,
}: {
  index: number;
  copy: Copy;
  detailed: boolean;
  animated: boolean;
}) => {
  switch (index) {
    case 0:
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-primary/5 text-left">
          <CatalogSheet copy={copy} animated={animated} />
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <span className="absolute inset-x-8 bottom-2 h-6 rotate-3 rounded-sm border border-primary/10 bg-background-rich" />
            <Motion.Item
              key={`extract-${animated}`}
              initial={false}
              animate={
                animated
                  ? { y: [0, -10, -4], rotate: [0, -3, 0] }
                  : { y: 0, rotate: 0 }
              }
              transition={{
                duration: animated ? 1 : 0,
                delay: animated ? 1.1 : 0,
                ease: "easeOut",
              }}
              className="h-full w-3/4"
            >
              <ProductObject className="size-full" />
            </Motion.Item>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-primary/5 text-left">
          <div className="flex items-center gap-3 border-accent-foreground border-b bg-background-rich px-4 py-3">
            <ProviderLogo
              provider="chatgpt"
              decorative
              className="size-6 shrink-0"
            />
            <p className="text-sm leading-snug">{copy.question}</p>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center gap-2 px-3 py-4">
            <div className="relative w-2/5 shrink-0 -rotate-6 self-stretch rounded-sm border border-foreground/10 bg-background-rich p-1 shadow-emphasis/10 shadow-sm">
              <ProductObject className="size-full" />
              <span className="absolute inset-x-2 bottom-2 h-px bg-primary/20" />
            </div>
            <div className="relative min-w-0 flex-1 rotate-2 rounded-sm border border-foreground/10 bg-background-rich px-3 py-4 shadow-emphasis/10 shadow-sm">
              <span className="absolute top-0 right-0 size-0 border-t-8 border-t-primary/10 border-l-8 border-l-transparent" />
              <p className="font-medium text-primary-text text-sm leading-snug">
                {copy.labels.finding}
              </p>
              <p className="mt-3 text-foreground-dimmed text-xs leading-relaxed">
                {copy.description}
              </p>
            </div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="relative flex min-h-0 flex-1 flex-col bg-primary/5 px-4 py-3 text-left">
          <div className="relative mr-4 flex min-h-0 -rotate-2 items-center gap-3 rounded-sm border border-foreground/10 bg-background-rich px-3 py-2 shadow-emphasis/10 shadow-sm">
            <ProductObject
              className={cn("size-24 shrink-0", detailed && "sm:size-28")}
            />
            <div className="min-w-0">
              <p className="text-foreground-dimmed text-xs">
                {copy.labels.title}
              </p>
              <p className="mt-2 text-foreground-dimmed text-sm line-through decoration-foreground/40">
                {copy.product}
              </p>
            </div>
          </div>
          <Motion.Item
            key={`rewrite-${animated}`}
            initial={animated ? { y: 16, rotate: -2, opacity: 0 } : false}
            animate={{ y: 0, rotate: 2, opacity: 1 }}
            transition={{
              duration: animated ? 0.65 : 0,
              delay: animated ? 0.45 : 0,
              ease: "easeOut",
            }}
            className="relative z-1 ml-3 flex min-h-0 flex-1 items-center gap-3 rounded-sm border border-primary/25 bg-background-rich px-4 py-3 shadow-emphasis/10 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-foreground-dimmed text-xs">
                {copy.labels.updatedTitle}
              </p>
              <Motion.Item
                key={`title-${animated}`}
                initial={animated ? { clipPath: "inset(0 100% 0 0)" } : false}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{
                  duration: animated ? 0.6 : 0,
                  delay: animated ? 0.9 : 0,
                  ease: "easeOut",
                }}
                className="mt-2 font-medium text-base text-primary-text leading-snug"
              >
                {copy.updatedProduct}
              </Motion.Item>
              <p className="mt-3 text-foreground-dimmed text-xs leading-relaxed">
                {copy.description}
              </p>
            </div>
            <CheckIcon className="size-5 shrink-0 text-primary-text" />
            <span className="absolute -right-2 -bottom-1 h-20 w-2 -rotate-12 rounded-full border border-primary/30 bg-linear-to-r from-primary-rich to-primary shadow-emphasis/10 shadow-sm" />
          </Motion.Item>
        </div>
      );
    case 3:
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-primary/5 text-left">
          <div className="relative flex min-h-0 flex-1 items-center gap-3 px-4 py-4">
            <div className="relative flex h-full w-2/5 shrink-0 -rotate-3 flex-col items-center rounded-sm border border-foreground/10 bg-background-rich shadow-emphasis/10 shadow-sm">
              <ProductObject className="min-h-0 w-full flex-1" />
              <span className="mb-3 h-1 w-1/2 rounded-full bg-primary/25" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative mb-3 ml-1 grid h-12 w-12 rotate-6 place-items-center rounded-sm border border-primary/20 bg-background-rich">
                <span className="absolute -top-2 left-3 h-4 w-6 rounded-t-full border-2 border-primary/50" />
                <ProviderLogo
                  provider="woocommerce"
                  decorative
                  className="relative h-5 w-9"
                />
              </div>
              <p className="text-foreground-dimmed text-xs">
                {copy.labels.published}
              </p>
              <p className="mt-2 font-medium text-primary-text text-sm leading-snug">
                {copy.updatedProduct}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-accent-foreground border-t bg-background-rich px-4 py-3">
            <p className="text-sm leading-snug">{copy.checkout}</p>
            <ArrowRightIcon className="size-4 shrink-0 text-primary-text" />
          </div>
        </div>
      );
    default:
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-primary/5 px-4 py-4 text-left">
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <div className="relative flex min-w-0 -rotate-3 flex-col rounded-sm border border-foreground/10 bg-background-rich px-3 py-3 shadow-emphasis/10 shadow-sm">
              <ProviderLogo
                provider="chatgpt"
                decorative
                className="size-6 shrink-0"
              />
              <p className="mt-3 font-medium text-sm leading-snug">
                {copy.labels.comparison}
              </p>
              <ProductObject className="min-h-0 w-full flex-1" />
            </div>
            <div className="relative flex min-w-0 rotate-3 flex-col rounded-sm border border-foreground/10 bg-background-rich px-3 py-3 shadow-emphasis/10 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <ProviderLogo
                  provider="chatgpt"
                  decorative
                  className="size-5 shrink-0"
                />
                <ArrowRightIcon className="size-3 shrink-0 text-primary-text" />
                <ProviderLogo
                  provider="woocommerce"
                  decorative
                  className="h-5 w-8 min-w-0"
                />
              </div>
              <p className="mt-3 font-medium text-sm leading-snug">
                {copy.labels.referrals}
              </p>
              <div className="relative mt-4 flex-1 border-primary/15 border-l pl-3">
                <span className="absolute top-0 -left-1 size-2 rounded-full border border-background-rich bg-primary/50" />
                <span className="absolute bottom-0 -left-1 size-2 rounded-full border border-background-rich bg-primary" />
                <span className="block h-px w-3/4 bg-primary/20" />
                <span className="mt-2 block h-px w-1/2 bg-primary/20" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-foreground-dimmed text-xs">
            {copy.labels.notMeasured}
          </p>
        </div>
      );
  }
};

export const OverviewWorkbench = ({
  active,
  enhanced,
  copy,
  detailed = false,
}: {
  active: number;
  enhanced: boolean;
  copy: Copy;
  detailed?: boolean;
}) => (
  <div
    data-hero-workbench
    className="relative flex h-full flex-col overflow-hidden rounded-lg border border-foreground/15 bg-background-rich text-foreground shadow-emphasis/10 shadow-sm"
  >
    <header className="flex min-h-10 items-center gap-4 border-accent-foreground border-b px-4 py-2">
      <p className="min-w-0 text-left font-medium text-sm leading-snug">
        {copy.stages[active]}
      </p>
    </header>
    <div className="relative min-h-0 flex-1">
      {copy.stages.map((stage, index) => (
        <Motion.Item
          key={stage}
          data-workbench-stage={index}
          initial={false}
          animate={{
            opacity: active === index ? 1 : 0,
            y: active === index ? 0 : 8,
          }}
          transition={{ duration: enhanced ? 0.4 : 0 }}
          className={cn(
            "absolute inset-0 flex flex-col",
            active !== index && "pointer-events-none",
          )}
        >
          <Stage
            index={index}
            copy={copy}
            detailed={detailed}
            animated={enhanced && active === index}
          />
        </Motion.Item>
      ))}
    </div>
    <div className="flex h-8 shrink-0 items-center gap-2 border-accent-foreground border-t bg-background px-4">
      <span className="size-1.5 rounded-full bg-primary" />
      <span className="font-mono text-foreground-dimmed text-xs">
        {heroProduct.id}
      </span>
      <span className="ml-auto text-foreground-dimmed text-xs">
        {copy.labels.example}
      </span>
      <span className="ml-2 hidden gap-1 sm:flex">
        {copy.stages.map((stage, index) => (
          <span
            key={stage}
            className={cn(
              "h-0.5 w-4 rounded-full",
              index <= active ? "bg-primary" : "bg-foreground/15",
            )}
          />
        ))}
      </span>
    </div>
  </div>
);
