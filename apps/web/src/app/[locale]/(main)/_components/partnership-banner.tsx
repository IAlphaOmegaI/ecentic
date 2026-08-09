import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Plus } from "@/components/plus";

const partnerHref = "https://eupresence.com/";
const bundleHref = "/pricing#partnership";

export const PartnershipBanner = async ({ locale }: PartnershipBanner.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <section
      aria-label={translate("partnershipBanner.ariaLabel")}
      className="relative border-accent-foreground border-y bg-gradient-to-br from-primary/[0.07] via-background to-background p-6 md:p-8"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-0 h-full w-auto w-full overflow-hidden rounded-lg opacity-80 [mask-image:linear-gradient(to_right,black,transparent)]">
        <Image
          src="/images/eu-flag.webp"
          alt={translate("partnershipBanner.euFlagAlt")}
          unoptimized
          width={600}
          height={600}
          className="absolute inset-0 -top-48 left-[calc(50%+48px)] h-[250%] w-auto rotate-180"
        />
      </div>
      <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href={partnerHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={translate("partnershipBanner.visitEuPresence")}
            className="flex size-14 shrink-0 translate-y-0 items-center justify-center rounded-xl border border-accent-foreground bg-background shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Image
              src="/partners/eu-presence.svg"
              alt="EU Presence"
              width={32}
              height={32}
              className="size-8"
            />
          </Link>
          <div>
            <h2 className="font-medium text-3xl text-foreground md:text-4xl">
              {translate("partnershipBanner.title")}
            </h2>
            <p className="mt-2 max-w-xl font-light text-foreground-dimmed text-lg md:text-xl">
              {translate("partnershipBanner.description")}
            </p>
          </div>
        </div>
        <Button
          color="primary"
          className="shrink-0 self-start md:self-center"
          render={<Link href={bundleHref} />}
        >
          <Image
            src="/images/eu.svg"
            alt="EU"
            width={32}
            height={32}
            className="size-6"
          />
          {translate("action.seeEuBundle")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </section>
  );
};

export namespace PartnershipBanner {
  export type Props = {
    locale: Locale;
  };
}
