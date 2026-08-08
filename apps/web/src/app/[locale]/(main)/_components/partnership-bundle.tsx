import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Plus } from "@/components/plus";

const href = "https://eupresence.com/pricing#bundles";
const partnerHref = "https://eupresence.com/";

type BundleItem = {
  name: string;
  detail: string;
  price: number;
  highlighted?: boolean;
};

const items: BundleItem[] = [
  {
    name: "GDPR Representative",
    detail: "Article 27 representative across all 27 member states",
    price: 127,
  },
  {
    name: "GPSR Representative — Growth",
    detail: "Responsible person for your consumer products",
    price: 97,
  },
  {
    name: "Privacy Center Plus",
    detail: "Hosted trust hub, DSR intake, and policy library",
    price: 57,
  },
  // Carries Scale, not Dominate: Scale is the tier that kept this $44.90 price
  // point when Dominate moved to $149. The bundle total is published on EU
  // Presence's own pricing page, so the joint price cannot move without them.
  {
    name: "ecentic Scale",
    detail: "Continuous agent simulations and auto-optimization",
    price: 44.9,
    highlighted: true,
  },
];

const regular = items.reduce((sum, item) => sum + item.price, 0);
const discounted = regular * 0.8;
const saved = regular - discounted;

/**
 * Bundle line items are no longer whole dollars, so a bare `${amount}` would
 * render "$44.9" and a `toFixed(0)` on the totals would quote a price we do not
 * actually charge. Show cents only when there are cents.
 */
const format = (amount: number) =>
  Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);

const guarantees = [
  "No minimums",
  "Month-to-month · cancel anytime",
  "No setup fees",
  "One invoice, one team",
] as const;

export const PartnershipBundle = () => (
  <section
    id="partnership"
    aria-label="ecentic × EU Presence bundle"
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
              aria-label="Visit EU Presence"
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
                ecentic × EU Presence
              </h2>
              <p className="mt-2 font-body font-medium text-foreground-dimmed text-lg md:text-xl">
                Compliance + AI Visibility
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-lg font-light text-foreground-dimmed text-lg">
            Go live in the European market and stay picked by AI agents in one
            engagement. EU Presence handles representation and compliance across
            all 27 member states; ecentic keeps your listings winning the agent
            comparison.
          </p>

          <ul className="mt-8 divide-y divide-accent-foreground overflow-hidden rounded-xl border border-accent-foreground">
            {items.map((item) => (
              <li
                key={item.name}
                className={cn(
                  "flex items-center justify-between gap-4 p-4",
                  item.highlighted ? "bg-primary/5" : "bg-background-rich",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      item.highlighted
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
                  ${format(item.price)}
                  <span className="font-light text-foreground-dimmed text-sm">
                    /mo
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
            {/* See `partnership-banner`: animated WebP, not the 3.7MB GIF. */}
            <Image
              src="/images/eu-flag.webp"
              alt="Animated flag of the European Union"
              unoptimized
              width={600}
              height={600}
              className="absolute inset-0 -top-48 left-[calc(50%+48px)] h-[250%] w-auto rotate-180"
            />
          </div>
          <div className="relative z-10 flex w-full flex-col gap-4 border-accent-foreground border-t border-dashed pt-6">
            <p className="font-medium text-foreground-dimmed text-sm">
              Bundle price
            </p>
            <div className="flex items-end gap-2">
              <span className="font-body font-semibold text-6xl text-primary leading-none tracking-tight md:text-7xl">
                ${format(discounted)}
              </span>
              <span className="mb-1.5 font-light text-foreground-dimmed text-xl">
                /mo
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground-dimmed line-through">
                ${format(regular)}/mo
              </span>
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-medium text-sm text-success">
                Save ${format(saved)}/mo · 20% off
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
              Book a bundle call
              <ArrowRightIcon className="size-4" />
            </Button>
            <p className="text-center text-foreground-dimmed text-sm">
              20% bundle discount applies automatically at 4+ items.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);
