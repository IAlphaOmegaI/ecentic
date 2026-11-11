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
      className="relative scroll-mt-[5.5rem] bg-background-dimmed"
    >
      <div
        data-columns="2"
        className="marketing-grid grid grid-cols-2 border-[var(--rail-color)] border-b max-sm:grid-cols-1 [&>article]:min-w-0 [&>article]:border-[var(--rail-color)] [&>article]:border-t [&>article]:border-r max-sm:[&>article]:border-r-0"
      >
        <article className="flex flex-col px-7 py-12 max-sm:px-4 max-sm:py-8">
          <div className="flex items-start gap-4">
            <Link
              href={partnerHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={translate("partnershipBundle.partnerAriaLabel")}
              className="flex size-12 shrink-0 items-center justify-center"
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
                {translate("partnershipBundle.title")}
              </h2>
              <p className="mt-3 font-body text-foreground text-lg">
                {translate("partnershipBundle.subtitle")}
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-lg text-foreground text-lg">
            {description ?? translate("partnershipBundle.description")}
          </p>

          <ul className="mt-8 divide-y divide-accent-foreground border-accent-foreground border-y">
            {items.map((item, index) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <CheckIcon className="size-5 shrink-0 text-primary-text" />
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-foreground text-sm">
                      {index === highlightedIndex
                        ? (productDetail ?? item.detail)
                        : item.detail}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-medium text-foreground tabular-nums">
                  ${format(prices[index] ?? 0)}
                  <span className="text-foreground text-sm">
                    {translate("partnershipBundle.pricing.suffix")}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
            {guarantees.map((guarantee) => (
              <li
                key={guarantee}
                className="flex items-center gap-2 text-foreground text-sm"
              >
                <ShieldCheckIcon className="size-4 text-primary-text" />
                {guarantee}
              </li>
            ))}
          </ul>
        </article>

        <article className="relative flex h-full min-h-full flex-col justify-end px-7 py-12 max-sm:px-4 max-sm:py-8">
          <div className="mb-auto pb-10">
            <Image
              src="/images/eu.svg"
              alt={translate("partnershipBundle.flagAlt")}
              width={72}
              height={48}
              className="h-10 w-auto"
            />
          </div>
          <div className="flex w-full flex-col gap-4">
            <p className="font-medium text-foreground text-sm">
              {translate("partnershipBundle.pricing.label")}
            </p>
            <div className="flex items-end gap-2">
              <span className="font-heading font-medium text-6xl text-primary-text leading-none tracking-tight md:text-7xl">
                ${format(discounted)}
              </span>
              <span className="mb-1.5 text-foreground text-xl">
                {translate("partnershipBundle.pricing.suffix")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground line-through">
                ${format(regular)}
                {translate("partnershipBundle.pricing.suffix")}
              </span>
              <span className="font-medium text-primary-text text-sm">
                {translate("partnershipBundle.pricing.save", {
                  amount: `$${format(saved)}`,
                })}
              </span>
            </div>

            <Button
              variant="flat"
              color="primary"
              className="min-h-11 w-full rounded-md"
              render={
                <Link href={href} target="_blank" rel="noopener noreferrer" />
              }
            >
              <Image
                src="/images/eu.svg"
                alt=""
                aria-hidden
                width={24}
                height={24}
                className="size-5"
              />
              {translate("partnershipBundle.action.primary")}
              <ArrowRightIcon className="size-4" />
            </Button>
            <p className="text-foreground text-sm">
              {translate("partnershipBundle.pricing.footnote")}
            </p>
          </div>
        </article>
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
