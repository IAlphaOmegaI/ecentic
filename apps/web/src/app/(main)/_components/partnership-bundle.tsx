import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";

const href = "https://eupresence.com/pricing#bundles";

const items = [
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
  {
    name: "ecentic Dominate",
    detail: "Continuous agent simulations, auto-optimization, and UCP",
    price: 449,
    highlighted: true,
  },
] as const;

const regular = items.reduce((sum, item) => sum + item.price, 0);
const discounted = regular * 0.8;
const saved = regular - discounted;

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
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b bg-gradient-to-br from-primary/[0.06] via-background to-background">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-[7fr_5fr] md:divide-x md:divide-y-0">
        {/* Pitch */}
        <div className="flex flex-col p-6 md:p-12">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-accent-foreground bg-background">
              <Image
                src="/partners/eu-presence.svg"
                alt="EU Presence"
                width={22}
                height={22}
                className="size-[22px]"
              />
            </span>
            <p className="font-medium text-primary text-sm uppercase tracking-[0.18em]">
              ecentic × EU Presence · Bundle
            </p>
          </div>

          <h2 className="mt-6 font-body text-3xl text-foreground md:text-5xl">
            Compliance + AI Visibility
          </h2>
          <p className="mt-4 max-w-lg font-light text-foreground-dimmed text-lg">
            Go live in the European market and stay picked by AI agents in one
            engagement. EU Presence handles representation and compliance across
            all 27 member states; ecentic keeps your listings winning the agent
            comparison.
          </p>

          <ul className="mt-8 flex flex-col divide-y divide-accent-foreground border-accent-foreground border-y">
            {items.map((item) => (
              <li
                key={item.name}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />
                  <div>
                    <p
                      className={
                        item.highlighted
                          ? "font-medium text-foreground"
                          : "text-foreground"
                      }
                    >
                      {item.name}
                    </p>
                    <p className="font-light text-foreground-dimmed text-sm">
                      {item.detail}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-light text-foreground-dimmed">
                  ${item.price}
                  <span className="text-sm">/mo</span>
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-6 flex flex-wrap gap-2">
            {guarantees.map((guarantee) => (
              <li
                key={guarantee}
                className="flex items-center gap-1.5 rounded-full border border-accent-foreground bg-background px-3 py-1 text-foreground-dimmed text-sm"
              >
                <ShieldCheckIcon className="size-3.5 text-primary" />
                {guarantee}
              </li>
            ))}
          </ul>
        </div>

        {/* Price + CTA */}
        <div className="relative flex flex-col justify-center p-6 md:p-12">
          <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-primary/10 blur-3xl" />
          <p className="relative font-medium text-foreground-dimmed text-sm uppercase tracking-tight">
            Bundle price
          </p>
          <div className="relative mt-2 flex items-end gap-3">
            <span className="font-body font-medium text-6xl text-primary leading-none tracking-tight">
              ${discounted.toFixed(2)}
            </span>
            <span className="mb-1 font-light text-foreground-dimmed text-xl">
              /mo
            </span>
          </div>
          <p className="relative mt-3 text-foreground-dimmed">
            <span className="line-through">${regular}/mo</span>{" "}
            <span className="font-medium text-foreground">
              Save ${saved.toFixed(2)}/mo
            </span>{" "}
            with the 20% bundle discount.
          </p>

          <Button
            color="primary"
            className="relative mt-8 w-full"
            render={
              <Link href={href} target="_blank" rel="noopener noreferrer" />
            }
          >
            Book a bundle call
            <ArrowRightIcon className="size-4" />
          </Button>
          <p className="relative mt-3 text-center text-foreground-dimmed text-sm">
            20% bundle discount applies automatically at 4+ items.
          </p>
        </div>
      </div>
    </div>
  </section>
);
