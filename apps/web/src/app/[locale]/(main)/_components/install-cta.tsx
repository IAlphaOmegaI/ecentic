import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

// Both buttons start at sign-up. The App Store listing still shows retired
// plans and prices, so it stays a secondary "Prefer the app?" link in the
// hero until the listing is fixed. Sign-up does not read `platform` today; it
// keeps the two buttons apart in analytics.
const platforms = [
  {
    name: "Shopify",
    logo: shopify,
    href: "/sign-up?platform=shopify",
    labelKey: "installShopify" as const,
  },
  {
    name: "WooCommerce",
    logo: woocommerce,
    href: "/sign-up?platform=woocommerce",
    labelKey: "installWooCommerce" as const,
  },
] as const;

export const InstallCta = async ({ className }: InstallCta.Props) => {
  const translate = await getTranslations("home");

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
    className?: string;
  };
}
