import { ArrowRightIcon, UploadIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import Link from "next/link";

const platforms = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Connect via OAuth",
    badge: "Recommended",
    href: "/onboarding/connect/shopify",
    image: "/images/shopify.svg",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "API key connection",
    badge: null,
    href: "/onboarding/connect/woocommerce",
    image: "/images/woocommerce.svg",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    description: "OAuth — full sync",
    badge: "Coming soon",
    href: null,
    image: "/images/bigcommerce.svg",
  },
  {
    id: "amazon",
    name: "Amazon Seller",
    description: "SP-API OAuth",
    badge: "Coming soon",
    href: null,
    image: "/images/amazon.svg",
  },
  {
    id: "feed",
    name: "Custom Feed",
    description: "XML or JSON feed URL",
    badge: null,
    href: "/onboarding/connect/feed",
    image: "/images/custom.svg",
  },
  {
    id: "csv",
    name: "CSV Upload",
    description: "Drag & drop or browse",
    badge: null,
    href: "/onboarding/connect/csv",
    image: null,
  },
];

export default () => (
  <div className="flex flex-1 flex-col overflow-y-auto">
    <div className="mx-8 flex flex-1 flex-col border-x border-accent-foreground">
      <div className="px-6 py-8">
        <h2 className="font-medium text-4xl text-foreground">
          Connect your store
        </h2>
        <p className="mt-1 font-light text-foreground-dimmed text-2xl">
          Start winning agent carts in 2 minutes.
        </p>
      </div>

      <div className="-mx-8 border-y border-accent-foreground">
        <div className="mx-8 grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-3">
          {platforms.map((platform) => {
            const disabled = !platform.href || platform.badge === "Coming soon";

            const inner = (
              <>
                {platform.image ? (
                  <Image
                    src={platform.image}
                    alt={platform.name}
                    width={40}
                    height={40}
                    className="mb-4 shrink-0"
                  />
                ) : (
                  <div className="mb-4 flex size-10 items-center justify-center">
                    <UploadIcon className="size-6 text-foreground-dimmed transition-colors group-hover:text-primary" />
                  </div>
                )}
                <p className="font-medium text-foreground text-xl">
                  {platform.name}
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm">
                  {platform.description}
                </p>
                <span
                  className={cn(
                    "mt-2 self-start px-1.5 py-0.5 text-xs",
                    !platform.badge && "opacity-0",
                    platform.badge === "Coming soon"
                      ? "bg-foreground-dimmed/10 text-foreground-dimmed"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {platform.badge}
                </span>
              </>
            );

            if (disabled)
              return (
                <div
                  key={platform.id}
                  className="flex min-h-40 cursor-not-allowed flex-col justify-between bg-background-dimmed p-5 opacity-50 h-44"
                >
                  {inner}
                </div>
              );

            return (
              <Link
                key={platform.id}
                href={platform.href}
                className="group flex min-h-40 flex-col justify-between bg-background-dimmed p-5 transition-colors hover:bg-background h-44"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
    <div className="mt-auto flex items-center justify-between border-t border-accent-foreground px-8">
      <div className="w-full flex items-center justify-between border-x border-accent-foreground py-6 px-6 ">
        <Button
          variant="outline"
          color="accent"
          type="button"
          render={<Link href="/onboarding/products" />}
        >
          Skip for now
        </Button>
        <p className="font-light text-foreground-dimmed text-sm">
          You can connect more stores later in Settings.
        </p>
      </div>
    </div>
  </div>
);
