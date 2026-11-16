import { ArrowRightIcon, CheckIcon, CreditCardIcon } from "@zenncore/icons";
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

const ProductPhoto = ({ className }: { className?: string }) => (
  <Image
    src={heroProduct.image}
    width={640}
    height={640}
    alt=""
    sizes="(min-width: 640px) 192px, 160px"
    className={className}
  />
);

export const OverviewJourneyScene = ({
  index,
  active,
  enhanced,
  copy,
  price,
}: {
  index: number;
  active: boolean;
  enhanced: boolean;
  copy: AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];
  price: string;
}) => {
  switch (index) {
    case 0:
      return (
        <div className="relative flex h-full flex-col rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed p-4 text-foreground shadow-emphasis/10 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 border-accent-foreground border-b pb-3">
            <div className="relative size-7 overflow-hidden rounded-full bg-primary/10">
              <div className="absolute top-1 left-2 size-3 rounded-full bg-primary-text" />
              <div className="absolute inset-x-1 -bottom-1 h-3 rounded-full bg-primary-text" />
            </div>
            <p className="min-w-0 text-left font-medium text-sm leading-tight">
              {copy.stages[0]}
            </p>
          </div>
          <Motion.Item
            initial={false}
            animate={{ y: active ? 0 : 6, opacity: active ? 1 : 0.7 }}
            transition={{ duration: enhanced ? 0.35 : 0 }}
            className="relative mt-4 ml-4 rounded-lg rounded-br-sm bg-primary/10 px-3 py-3 text-left text-sm leading-relaxed"
          >
            {copy.question}
          </Motion.Item>
          <div className="mt-auto flex items-center justify-end gap-2 pt-3">
            <span className="h-0.5 w-1/3 rounded-full bg-primary/20" />
            <span className="grid size-7 place-items-center rounded-full bg-primary text-background-rich">
              <ArrowRightIcon className="size-4 -rotate-90" />
            </span>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="relative h-full rounded-lg border border-foreground/15 bg-background-rich text-foreground shadow-emphasis/10 shadow-sm">
          <div className="absolute -inset-x-1 inset-y-2 -z-1 rotate-3 rounded-lg border border-foreground/15 bg-background-dimmed" />
          <div className="flex items-center justify-between gap-2 border-accent-foreground border-b px-4 py-3">
            <p className="font-medium text-sm">{copy.feed}</p>
            <span className="font-mono text-primary-text text-sm">{"{ }"}</span>
          </div>
          <pre
            data-hero-feed-json
            className="wrap-anywhere m-0 whitespace-pre-wrap px-4 py-2 text-left font-mono text-xs leading-4"
          >
            {"{\n"}
            <span className="text-primary-text">{'  "id"'}</span>
            {`: "${heroProduct.id}",\n`}
            <span className="text-primary-text">{'  "name"'}</span>
            {`: "${copy.product}",\n`}
            <span className="text-primary-text">{'  "price"'}</span>
            {`: ${heroProduct.price},\n`}
            <span className="text-primary-text">{'  "currency"'}</span>
            {`: "${heroProduct.currency}"\n}`}
          </pre>
          <div
            className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2"
            data-source-provider-logos
          >
            {sources.map((provider) => (
              <ProviderLogo
                key={provider}
                provider={provider}
                decorative
                className={
                  provider === "shopify"
                    ? "size-5 object-center"
                    : "h-5 w-8 object-center"
                }
              />
            ))}
          </div>
        </div>
      );
    case 2:
      return (
        <div className="relative h-full pb-4">
          <div className="flex h-full flex-col rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed p-3 text-foreground shadow-emphasis/10 shadow-sm sm:p-4">
            <div
              className="flex items-center justify-between gap-2 border-accent-foreground border-b pb-2"
              data-comparison-provider-logos
            >
              {models.map((provider) => (
                <ProviderLogo
                  key={provider}
                  provider={provider}
                  decorative
                  className={
                    provider === "perplexity"
                      ? "size-5 object-center brightness-0"
                      : "size-5 object-center"
                  }
                />
              ))}
            </div>
            <Motion.Item
              initial={false}
              animate={{ opacity: active ? 1 : 0.65, y: active ? 0 : 5 }}
              transition={{ duration: enhanced ? 0.4 : 0 }}
              className="flex min-h-0 flex-1 flex-col items-center justify-center"
            >
              <div
                data-discovery-offers
                className="my-2 grid min-h-0 w-full flex-1 grid-cols-2 grid-rows-2 gap-2"
              >
                <div className="relative row-span-2 min-h-0 rounded-lg bg-primary/5">
                  <ProductPhoto className="absolute inset-0 size-full object-contain mix-blend-multiply" />
                </div>
                {[
                  "/images/shopping/examples/fashion-and-outdoor-2.webp",
                  "/images/shopping/examples/fashion-and-outdoor-2-alternative.webp",
                ].map((source) => (
                  <div
                    key={source}
                    className="relative min-h-0 rounded-lg bg-background"
                  >
                    <Image
                      src={source}
                      width={384}
                      height={512}
                      alt=""
                      sizes="96px"
                      className="absolute inset-0 size-full object-contain opacity-70 mix-blend-multiply"
                    />
                  </div>
                ))}
              </div>
              <div className="flex w-full items-center justify-between gap-2 border-accent-foreground border-t pt-2 text-left">
                <p className="min-w-0 text-sm leading-tight">{copy.product}</p>
                <ArrowRightIcon className="size-4 shrink-0 text-primary-text" />
              </div>
            </Motion.Item>
          </div>
          <div className="absolute bottom-1 left-1/3 h-3 w-1/3 border-foreground/15 border-x bg-background-dimmed" />
          <div className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-background-rich" />
        </div>
      );
    case 3:
      return (
        <div className="relative flex h-full flex-col rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed p-3 text-foreground shadow-emphasis/10 shadow-sm sm:p-4">
          <Motion.Item
            initial={false}
            animate={{ y: active ? -3 : 0, rotate: active ? -5 : 0 }}
            transition={{ duration: enhanced ? 0.45 : 0 }}
            className="relative min-h-0 flex-1"
          >
            <ProductPhoto className="absolute inset-0 size-full object-contain mix-blend-multiply" />
          </Motion.Item>
          <Motion.Item
            initial={false}
            animate={{ scale: active ? 1 : 0.9, opacity: active ? 1 : 0.5 }}
            transition={{ duration: enhanced ? 0.3 : 0 }}
            className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-primary text-background-rich"
          >
            <CheckIcon className="size-4" />
          </Motion.Item>
          <div className="flex items-end justify-between gap-2 border-accent-foreground border-t pt-3 text-left">
            <p className="min-w-0 font-medium text-sm leading-tight">
              {copy.product}
            </p>
            <p className="shrink-0 font-medium text-primary-text text-sm tabular-nums">
              {price}
            </p>
          </div>
        </div>
      );
    case 4:
      return (
        <div className="relative flex h-full flex-col rounded-lg border border-foreground/15 bg-background-rich p-4 text-foreground shadow-emphasis/10 shadow-sm">
          <div className="flex items-start gap-2 border-accent-foreground border-b pb-3 text-left">
            <CreditCardIcon className="size-5 shrink-0 text-primary-text" />
            <p className="font-medium text-sm leading-tight">{copy.checkout}</p>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 items-center gap-2">
            <ProductPhoto className="size-16 shrink-0 object-contain mix-blend-multiply" />
            <p className="min-w-0 text-left text-sm leading-tight">
              {copy.product}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 border-accent-foreground border-t py-3">
            <CreditCardIcon className="size-6 text-foreground-dimmed" />
            <p className="font-medium text-lg tabular-nums">{price}</p>
          </div>
          <Motion.Item
            initial={false}
            animate={{ opacity: active ? 1 : 0.7, scale: active ? 1 : 0.97 }}
            transition={{ duration: enhanced ? 0.35 : 0 }}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-background-rich"
          >
            <CheckIcon className="size-4" />
            <span className="text-sm">{copy.confirmed}</span>
          </Motion.Item>
        </div>
      );
    default:
      return (
        <div className="relative h-full pt-3">
          <div className="absolute inset-x-0 top-1 h-7 rounded-t-lg border border-foreground/15 bg-linear-to-b from-background-rich to-background-dimmed" />
          <div className="relative h-full rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed pt-10 text-foreground shadow-emphasis/10 shadow-sm">
            <div className="absolute -inset-x-1 top-2 z-1 grid h-6 grid-cols-5">
              {[0, 1, 2, 3, 4].map((stripe) => (
                <div
                  key={stripe}
                  className={
                    stripe % 2 === 0
                      ? "rounded-b-lg border-foreground/10 border-b bg-background-rich"
                      : "rounded-b-lg border-foreground/10 border-b bg-linear-to-b from-primary/10 to-primary/25"
                  }
                />
              ))}
            </div>
            <div className="absolute top-11 right-1/3 bottom-3 left-3 overflow-hidden rounded-lg border border-foreground/15 bg-primary/5">
              <ProductPhoto className="size-full object-contain mix-blend-multiply" />
            </div>
            <div className="absolute top-11 right-3 bottom-0 w-1/4 rounded-t-lg border border-foreground/15 bg-primary/5">
              <div className="absolute top-1/2 right-2 h-5 w-0.5 rounded-full bg-foreground/40" />
            </div>
            <Motion.Item
              initial={false}
              animate={{
                y: active ? 0 : 12,
                x: active ? 0 : 8,
                opacity: active ? 1 : 0.6,
              }}
              transition={{ duration: enhanced ? 0.5 : 0 }}
              className="absolute -right-2 bottom-5 flex items-center gap-2 rounded-lg border border-background-rich/75 bg-background-rich px-3 py-2 shadow-emphasis/10 shadow-sm"
            >
              <span className="grid size-7 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary-text">
                <CheckIcon className="size-4" />
              </span>
              <div className="text-left">
                <p className="text-xs">{copy.confirmed}</p>
                <p className="font-medium text-lg tabular-nums">{price}</p>
              </div>
            </Motion.Item>
            <div className="absolute -inset-x-1 -bottom-1 h-1.5 rounded-full border border-foreground/15 bg-background-rich" />
          </div>
        </div>
      );
  }
};
