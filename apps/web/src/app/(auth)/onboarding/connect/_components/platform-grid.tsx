import { UploadIcon } from "@zenncore/icons";
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
    badge: "link now",
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
    badge: "Coming soon",
    href: "/onboarding/connect/feed",
    image: "/images/custom.svg",
  },
  {
    id: "csv",
    name: "CSV Upload",
    description: "Drag & drop or browse",
    badge: "Coming soon",
    href: "/onboarding/connect/csv",
    image: null,
  },
];

export const PlatformGrid = () => (
  <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-3">
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
              className="mb-4 size-14 shrink-0"
            />
          ) : (
            <div className="mb-4 flex size-14 items-center justify-center">
              <UploadIcon className="size-14 text-foreground-dimmed transition-colors group-hover:text-primary" />
            </div>
          )}
          <p className="font-medium text-foreground text-xl">{platform.name}</p>
          <p className="font-light text-foreground-dimmed text-sm">
            {platform.description}
          </p>
          <span
            className={cn(
              "mt-2 self-start px-1.5 py-0.5 text-sm capitalize",
              platform.badge === "Coming soon" || platform.badge === "link now"
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
            className="flex aspect-square cursor-not-allowed flex-col justify-between bg-background-dimmed p-5 opacity-50"
          >
            {inner}
          </div>
        );

      return (
        <Link
          key={platform.id}
          href={platform.href}
          className="group flex aspect-square flex-col justify-between bg-background-dimmed p-5 transition-colors hover:bg-background"
        >
          {inner}
        </Link>
      );
    })}
  </div>
);
