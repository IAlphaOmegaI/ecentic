"use client";

import { ArrowRightIcon, UploadIcon } from "@zenncore/icons";
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
    <div>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2">
        {platforms
          .filter(
            (platform) =>
              platformMeta[platform.id as keyof typeof platformMeta].href !==
              null,
          )
          .map((platform) => {
            const meta = platformMeta[platform.id as keyof typeof platformMeta];
            if (!meta.href) return null;
            return (
              <Link
                key={platform.id}
                href={meta.href}
                className="group relative flex min-h-52 min-w-0 flex-col gap-3 bg-background-rich px-6 py-6 transition-colors hover:bg-primary/5 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary sm:px-8"
              >
                <div className="flex h-10 items-center justify-between gap-4">
                  {meta.image ? (
                    <Image
                      src={meta.image}
                      alt=""
                      width={100}
                      height={40}
                      className="h-9 w-auto max-w-28 object-contain object-left"
                    />
                  ) : (
                    <UploadIcon className="size-8 text-primary" />
                  )}
                  <ArrowRightIcon className="size-4 shrink-0 text-foreground-dimmed transition-transform group-hover:translate-x-1" />
                </div>
                <h2 className="mt-2 font-heading text-foreground text-xl">
                  {platform.name}
                </h2>
                <p className="text-foreground-dimmed text-sm leading-relaxed">
                  {platform.description}
                </p>
                <span
                  className={cn(
                    "mt-auto pt-2 text-sm",
                    meta.badge === "recommended"
                      ? "text-primary"
                      : "text-foreground-dimmed",
                  )}
                >
                  {translate(`badges.${meta.badge}`)}
                </span>
              </Link>
            );
          })}
      </div>
      <div className="grid gap-4 border-accent-foreground border-t bg-background px-6 py-5 sm:grid-cols-2 sm:px-8">
        {platforms
          .filter(
            (platform) =>
              platformMeta[platform.id as keyof typeof platformMeta].href ===
              null,
          )
          .map((platform) => (
            <p
              key={platform.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
            >
              <span className="text-foreground">{platform.name}</span>
              <span className="text-foreground-dimmed">
                {translate("badges.comingSoon")}
              </span>
            </p>
          ))}
      </div>
    </div>
  );
};
