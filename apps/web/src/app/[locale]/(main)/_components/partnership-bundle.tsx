import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const href = "https://eupresence.com/pricing#bundles";
const partnerHref = "https://eupresence.com/";

// Order matches `pricing.partnershipBundle.items`: GDPR representative, GPSR
// responsible person, Privacy Center Plus, then ecentic's top tier — the bundle
// carries Dominate, not a mid plan. Keep this in step with the blog post that
// quotes the same math (`ecentic-eu-presence-partnership-…` in `seed.ts`).
const prices = [127, 97, 57, 149] as const;
const highlightedIndex = 3;

const format = (amount: number) =>
  Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);

export const PartnershipBundle = async ({
  description,
  productDetail,
}: PartnershipBundle.Props = {}) => {
  const translate = await getTranslations("pricing");
  const messages = await getMessages();
  const items = messages.pricing.partnershipBundle.items;
  const guarantees = messages.pricing.partnershipBundle.guarantees;

  const regular = prices.reduce((sum, price) => sum + price, 0);
  const discounted = regular * 0.8;
  const saved = regular - discounted;

  return (
    <section
      id="partnership"
      aria-label={translate("partnershipBundle.ariaLabel")}
      className="relative scroll-mt-[5.5rem] bg-background-rich"
    >
      <header className="grid items-start gap-8 px-7 py-10 max-sm:px-4 max-sm:py-8 lg:grid-cols-2">
        <div className="flex items-start gap-4">
          <Link
            href={partnerHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={translate("partnershipBundle.partnerAriaLabel")}
            className="flex size-16 shrink-0 items-center justify-center"
          >
            <Image
              src="/partners/eu-presence.svg"
              alt="EU Presence"
              width={64}
              height={64}
              className="size-16"
            />
          </Link>
          <div className="min-w-0">
            <h2 className="font-medium text-3xl text-foreground md:text-4xl">
              {translate("partnershipBundle.title")}
            </h2>
            <p className="mt-3 text-foreground-dimmed text-lg">
              {translate("partnershipBundle.subtitle")}
            </p>
          </div>
        </div>
        <p className="max-w-2xl text-foreground-dimmed text-lg">
          {description ?? translate("partnershipBundle.description")}
        </p>
      </header>

      <ul
        data-columns="2"
        className="marketing-grid grid grid-cols-2 max-sm:grid-cols-1"
      >
        {items.map((item, index) => (
          <li
            key={item.name}
            className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-6 border-[var(--rail-color)] border-t border-r bg-background-dimmed/60 px-7 py-8 max-sm:border-r-0 max-sm:px-4"
          >
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-1 size-4 shrink-0 text-primary-text" />
                <h3 className="font-medium text-foreground text-lg">
                  {item.name}
                </h3>
              </div>
              <p className="mt-3 text-foreground-dimmed text-sm">
                {index === highlightedIndex
                  ? (productDetail ?? item.detail)
                  : item.detail}
              </p>
            </div>
            <p className="font-heading text-3xl text-primary-text tabular-nums">
              ${format(prices[index] ?? 0)}
              <span className="mt-1 block text-right font-body text-foreground-dimmed text-sm">
                {translate("partnershipBundle.pricing.suffix")}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <div className="relative border-[var(--rail-color)] border-t bg-linear-to-r from-primary/8 via-background-rich to-background-rich px-7 py-8 max-sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-6">
            <Image
              src="/images/eu.svg"
              alt={translate("partnershipBundle.flagAlt")}
              width={192}
              height={128}
              className="h-auto w-40 shrink-0 max-sm:w-28"
            />
            <div className="min-w-0">
              <p className="mb-3 font-medium text-foreground text-sm">
                {translate("partnershipBundle.pricing.label")}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-heading font-medium text-6xl text-primary-text tabular-nums leading-none tracking-tight md:text-7xl">
                  ${format(discounted)}
                </span>
                <span className="text-foreground-dimmed text-xl">
                  {translate("partnershipBundle.pricing.suffix")}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-foreground-dimmed line-through">
                  ${format(regular)}
                  {translate("partnershipBundle.pricing.suffix")}
                </span>
                <span className="font-medium text-primary-text text-sm">
                  {translate("partnershipBundle.pricing.save", {
                    amount: `$${format(saved)}`,
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="grid w-full gap-4 lg:max-w-72">
            <Button
              variant="default"
              color="primary"
              render={
                <Link href={href} target="_blank" rel="noopener noreferrer" />
              }
            >
              {translate("partnershipBundle.action.primary")}
              <ArrowRightIcon className="size-4" />
            </Button>
            <p className="text-foreground-dimmed text-sm">
              {translate("partnershipBundle.pricing.footnote")}
            </p>
          </div>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          {guarantees.map((guarantee) => (
            <li
              key={guarantee}
              className="flex items-center gap-2 text-foreground-dimmed text-sm"
            >
              <ShieldCheckIcon className="size-4 shrink-0 text-primary-text" />
              {guarantee}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export namespace PartnershipBundle {
  export type Props = {
    description?: string;
    productDetail?: string;
  };
}
