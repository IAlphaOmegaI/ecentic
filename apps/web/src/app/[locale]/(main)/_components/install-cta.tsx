import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/ecentic-ai";

const platforms = [
  {
    name: "Shopify",
    logo: shopify,
    href: SHOPIFY_APP_STORE_URL,
    labelKey: "installShopify" as const,
  },
  {
    name: "WooCommerce",
    logo: woocommerce,
    href: "/sign-up?platform=woocommerce",
    labelKey: "installWooCommerce" as const,
  },
] as const;

export const InstallCta = async ({ locale, className }: InstallCta.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      {platforms.map((platform) => (
        <Button
          key={platform.name}
          color="primary"
          className="w-full px-5 py-2.5 text-base sm:w-auto"
          render={<Link href={platform.href} />}
        >
          <Image src={platform.logo} alt="" className="size-5" />
          {translate(`action.${platform.labelKey}`)}
        </Button>
      ))}
    </div>
  );
};

export namespace InstallCta {
  export type Props = {
    locale: Locale;
    className?: string;
  };
}
