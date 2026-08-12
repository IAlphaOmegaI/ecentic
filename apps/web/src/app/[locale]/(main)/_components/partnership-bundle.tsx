import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const href = "https://eupresence.com/pricing#bundles";
const partnerHref = "https://eupresence.com/";

const prices = [127, 97, 57, 44.9] as const;
const highlightedIndex = 3;

const format = (amount: number) =>
  Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);

export const PartnershipBundle = async () => {
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
      className="relative -left-[calc(50vw-50%)] w-screen scroll-mt-[5.5rem]"
    >
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />

        <div className="grid grid-cols-1 md:grid-cols-[7fr_5fr] md:items-stretch md:divide-x md:divide-accent-foreground">
          <div className="flex flex-col p-6 md:p-12">
            <div className="flex items-start gap-4">
              <Link
                href={partnerHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={translate("partnershipBundle.partnerAriaLabel")}
                className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-accent-foreground bg-background shadow-sm transition-all hover:-translate-y-0.5"
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
                <p className="mt-2 font-body font-medium text-foreground-dimmed text-lg md:text-xl">
                  {translate("partnershipBundle.subtitle")}
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-lg font-light text-foreground-dimmed text-lg">
              {translate("partnershipBundle.description")}
            </p>

            <ul className="mt-8 divide-y divide-accent-foreground overflow-hidden rounded-xl border border-accent-foreground">
              {items.map((item, index) => (
                <li
                  key={item.name}
                  className={cn(
                    "flex items-center justify-between gap-4 p-4",
                    index === highlightedIndex
                      ? "bg-primary/5"
                      : "bg-background-rich",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full",
                        index === highlightedIndex
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <CheckIcon className="size-3.5" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="font-light text-foreground-dimmed text-sm">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-medium text-foreground tabular-nums">
                    ${format(prices[index] ?? 0)}
                    <span className="font-light text-foreground-dimmed text-sm">
                      {translate("partnershipBundle.pricing.suffix")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <ul className="mt-6 flex flex-wrap gap-2">
              {guarantees.map((guarantee) => (
                <li
                  key={guarantee}
                  className="flex items-center gap-1.5 rounded-full border border-accent-foreground bg-background-rich px-3 py-1 text-foreground text-sm"
                >
                  <ShieldCheckIcon className="size-3.5 text-primary" />
                  {guarantee}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex h-full min-h-full flex-col justify-end overflow-hidden bg-background-dimmed p-6 md:p-12">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-0 h-full w-full overflow-hidden opacity-80 [mask-image:linear-gradient(to_right,black,transparent)]">
              {/* See partnership-banner: `inset-0` pins `right: 0` and beats
                  `w-auto`, distorting the square flag. */}
              <Image
                src="/images/eu-flag.webp"
                alt={translate("partnershipBundle.flagAlt")}
                unoptimized
                width={600}
                height={600}
                className="-top-48 absolute left-[calc(50%+48px)] h-[250%] w-auto rotate-180"
              />
            </div>
            <div className="relative z-10 flex w-full flex-col gap-4 border-accent-foreground border-t border-dashed pt-6">
              <p className="font-medium text-foreground-dimmed text-sm">
                {translate("partnershipBundle.pricing.label")}
              </p>
              <div className="flex items-end gap-2">
                <span className="font-body font-semibold text-6xl text-primary leading-none tracking-tight md:text-7xl">
                  ${format(discounted)}
                </span>
                <span className="mb-1.5 font-light text-foreground-dimmed text-xl">
                  {translate("partnershipBundle.pricing.suffix")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground-dimmed line-through">
                  ${format(regular)}
                  {translate("partnershipBundle.pricing.suffix")}
                </span>
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-medium text-sm text-success">
                  {translate("partnershipBundle.pricing.save", {
                    amount: `$${format(saved)}`,
                  })}
                </span>
              </div>

              <Button
                color="primary"
                className="w-full"
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
              <p className="text-center text-foreground-dimmed text-sm">
                {translate("partnershipBundle.pricing.footnote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
