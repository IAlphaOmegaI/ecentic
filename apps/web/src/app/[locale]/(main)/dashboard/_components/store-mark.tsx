"use client";

import { PhotoIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";

const storefrontImage = (domain?: string | null) => {
  if (!domain) return undefined;
  const value = domain.includes("://") ? domain : `https://${domain}`;
  if (!URL.canParse(value)) return undefined;
  const address = new URL(value);
  if (
    !["http:", "https:"].includes(address.protocol) ||
    address.username ||
    address.password ||
    !address.hostname.includes(".")
  )
    return undefined;
  // Store rows do not persist a logo. Use the storefront's own identity asset,
  // never a guessed brand image or a third-party logo lookup.
  return new URL("/favicon.ico", address).href;
};

export const StoreMark = ({
  domain,
  image,
  className,
  tone = "light",
}: {
  domain?: string | null;
  image?: string | null;
  className?: string;
  tone?: "light" | "dark";
}) => (
  <Avatar
    aria-hidden
    className={cn(
      "size-8 shrink-0 rounded-lg",
      tone === "dark"
        ? "bg-background-rich/12 text-background-rich/70"
        : "bg-background-dimmed text-foreground-dimmed",
      className,
    )}
  >
    <AvatarImage
      src={image || storefrontImage(domain)}
      alt=""
      referrerPolicy="no-referrer"
      className="object-contain"
    />
    <AvatarFallback>
      <PhotoIcon aria-hidden className="size-4" />
    </AvatarFallback>
  </Avatar>
);
