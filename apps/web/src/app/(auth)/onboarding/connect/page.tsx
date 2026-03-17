import { ArrowRightIcon, UploadIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Motion } from "@/components/motion";

const platforms = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Connect via OAuth — import your full catalog",
    badge: "Recommended",
    href: "/onboarding/connect/shopify",
    image: "/images/shopify.svg",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "API key connection — store URL + consumer key",
    badge: null,
    href: "/onboarding/connect/woocommerce",
    image: "/images/woocommerce.svg",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    description: "Connect via OAuth — full product sync",
    badge: "Coming soon",
    href: null,
    image: "/images/bigcommerce.svg",
  },
  {
    id: "amazon",
    name: "Amazon Seller",
    description: "SP-API OAuth — sync Amazon listings",
    badge: "Coming soon",
    href: null,
    image: "/images/amazon.svg",
  },
  {
    id: "feed",
    name: "Custom Feed",
    description: "Paste a URL to your XML or JSON product feed",
    badge: null,
    href: "/onboarding/connect/feed",
    image: "/images/custom.svg",
  },
] as const;

export default () => (
  <div className="flex flex-1 flex-col items-center justify-center overflow-hidden bg-background p-8 md:rounded-l-xl">
    <Motion.Stagger stagger={0.08} delay={0.1}>
      <Motion.Item>
        <h2 className="font-medium text-4xl text-foreground">
          Connect your store
        </h2>
      </Motion.Item>
      <Motion.Item>
        <p className="mt-1 font-light text-foreground-dimmed text-lg">
          Start winning agent carts in 2 minutes.
        </p>
      </Motion.Item>
      <Motion.Item>
        <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {platforms.map((platform) => {
            const disabled = !platform.href;
            const content = (
              <>
                <div className="flex items-center gap-3">
                  <Image
                    src={platform.image}
                    alt={platform.name}
                    width={36}
                    height={36}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {platform.name}
                      </span>
                      {platform.badge && (
                        <span
                          className={
                            platform.badge === "Coming soon"
                              ? "bg-foreground-dimmed/10 px-1.5 py-0.5 text-foreground-dimmed text-sm"
                              : "bg-primary/10 px-1.5 py-0.5 text-primary text-sm"
                          }
                        >
                          {platform.badge}
                        </span>
                      )}
                    </div>
                    <p className="font-light text-foreground-dimmed text-xs">
                      {platform.description}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <ArrowRightIcon className="size-4 text-foreground-dimmed transition-colors group-hover:text-primary" />
                )}
              </>
            );

            if (disabled)
              return (
                <div
                  key={platform.id}
                  className="flex h-20 cursor-not-allowed items-center justify-between border border-accent-foreground bg-background-rich p-4 opacity-50"
                >
                  {content}
                </div>
              );

            return (
              <Link
                key={platform.id}
                href={platform.href}
                className="group flex h-20 items-center justify-between border border-accent-foreground bg-background-rich p-4 transition-colors hover:border-primary"
              >
                {content}
              </Link>
            );
          })}

          <div className="sm:col-span-2">
            <Link
              href="/onboarding/connect/csv"
              className="group flex flex-col items-center justify-center gap-2 border border-accent-foreground border-dashed bg-background-rich p-6 transition-colors hover:border-primary"
            >
              <UploadIcon className="size-6 text-foreground-dimmed transition-colors group-hover:text-primary" />
              <div className="text-center">
                <p className="font-medium text-foreground text-sm">
                  Upload a CSV file
                </p>
                <p className="font-light text-foreground-dimmed text-xs">
                  Drag and drop or click to browse
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-6 flex w-full max-w-2xl items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            render={<Link href="/onboarding/products" />}
          >
            Skip for now
          </Button>
          <p className="font-light text-foreground-dimmed text-sm">
            You can connect more stores later in Settings.
          </p>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  </div>
);
