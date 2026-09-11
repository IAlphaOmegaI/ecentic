import { GlobeIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import * as Entry from "@/server/app/entry";
import { Environment } from "@/server/utils/environment";

const PLATFORM = {
  shopify: { name: "Shopify", logo: "/images/shopify.svg" },
  woocommerce: { name: "WooCommerce", logo: "/images/woocommerce.svg" },
} as const;

/**
 * The store the visitor typed into the landing hero, carried over so sign-up
 * reads as the next step of that check rather than a detour. Rendered from the
 * httpOnly entry cookie — never from the URL — so a crafted link cannot put
 * someone else's store (or a false "detected") on this page.
 */
export const EntryChip = async () => {
  const entry = await unwrapResult(Entry.pending(Environment.SERVER));
  if (!entry) return null;

  const translate = await getTranslations("signUp.entry");
  const platform =
    entry.platform === "unknown" ? null : PLATFORM[entry.platform];

  const detail = (() => {
    switch (true) {
      case platform === null:
        return translate("unknown");
      case entry.status === "pending" && entry.products !== null:
        return translate("products", {
          platform: platform.name,
          count: entry.products,
        });
      default:
        return translate("detected", { platform: platform.name });
    }
  })();

  return (
    <div className="flex items-center gap-3 rounded-md border border-accent-foreground bg-background-dimmed px-3 py-2.5">
      {platform ? (
        <Image
          src={platform.logo}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0"
        />
      ) : (
        <GlobeIcon className="size-7 shrink-0 text-foreground-dimmed" />
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground">
          {entry.name ?? entry.host}
        </span>
        <span className="truncate font-light text-foreground-dimmed text-sm">
          {entry.name ? `${entry.host} · ${detail}` : detail}
        </span>
      </div>
    </div>
  );
};
