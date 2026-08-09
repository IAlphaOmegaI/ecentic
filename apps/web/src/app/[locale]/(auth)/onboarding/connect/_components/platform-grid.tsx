"use client";

import { UploadIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const platformMeta = {
  shopify: {
    badge: "recommended" as const,
    href: "/onboarding/connect/shopify",
    image: "/images/shopify.svg",
  },
  woocommerce: {
    badge: "linkNow" as const,
    href: "/onboarding/connect/woocommerce",
    image: "/images/woocommerce.svg",
  },
  bigcommerce: {
    badge: "comingSoon" as const,
    href: null,
    image: "/images/bigcommerce.svg",
  },
  amazon: {
    badge: "comingSoon" as const,
    href: null,
    image: "/images/amazon.svg",
  },
  feed: {
    badge: "linkNow" as const,
    href: "/onboarding/connect/feed",
    image: "/images/custom.svg",
  },
  csv: {
    badge: "linkNow" as const,
    href: "/onboarding/connect/csv",
    image: null,
  },
} as const;

export const PlatformGrid = () => {
  const translate = useTranslations("onboarding.connect");
  const messages = useMessages();
  const platforms = messages.onboarding.connect.platforms;

  return (
    <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-3">
      {platforms.map((platform) => {
        const meta = platformMeta[platform.id as keyof typeof platformMeta];
        const badge = translate(`badges.${meta.badge}`);
        const disabled = meta.href === null;

        const inner = (
          <>
            {meta.image ? (
              <Image
                src={meta.image}
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
                meta.badge === "comingSoon" || meta.badge === "linkNow"
                  ? "bg-foreground-dimmed/10 text-foreground-dimmed"
                  : "bg-primary/10 text-primary",
              )}
            >
              {badge}
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
            href={meta.href}
            className="group flex aspect-square flex-col justify-between bg-background-dimmed p-5 transition-colors hover:bg-background"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
};
