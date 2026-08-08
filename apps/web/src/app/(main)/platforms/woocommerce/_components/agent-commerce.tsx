import type { Icon } from "@zenncore/icons";
import {
  ArrowRightIcon,
  RadarIcon,
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { ItemCycle } from "@/app/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

const PLUGIN_URL = "https://wordpress.org/plugins/ecentic-for-woocommerce/";

type Capability = {
  icon: Icon;
  title: string;
  description: string;
};

const capabilities: readonly Capability[] = [
  {
    icon: RadarIcon,
    title: "Discovered at your own URL",
    description:
      "The plugin serves /.well-known/ucp on your domain, so agents find your store at your address — not a third party's.",
  },
  {
    icon: ShoppingCartIcon,
    title: "Priced on a real cart",
    description:
      "Quotes run against a live WooCommerce cart, so your tax tables, shipping zones, coupons, and third-party pricing plugins all apply.",
  },
  {
    icon: RobotIcon,
    title: "Orders land in WooCommerce",
    description:
      "Agent checkouts create real orders through native WooCommerce internals, tagged created_via = ucp so you can tell them apart.",
  },
  {
    icon: ShieldCheckIcon,
    title: "You stay Merchant of Record",
    description:
      "Payment is charged by your own gateway, with credentials that never leave your server. ecentic is never party to the sale.",
  },
] as const;

const controls = [
  {
    title: "On or off",
    description: "Turn the whole agent surface on or off from wp-admin.",
  },
  {
    title: "Allow-listed agents",
    description:
      "Allow-list which agent platforms may transact with the store.",
  },
  {
    title: "Signed requests",
    description:
      "Require signed (RFC 9421) requests, or set a store API key instead.",
  },
  {
    title: "Rate limits & stock",
    description:
      "Rate-limit per agent, and include or exclude out-of-stock products.",
  },
] as const;

export const AgentCommerce = () => (
  <section className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">03</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Let AI agents buy, not just browse.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Optimized listings decide whether an agent recommends you. The
            Universal Commerce Protocol decides whether it can actually complete
            the purchase. The free{" "}
            <span className="font-medium text-foreground">
              écentic for WooCommerce
            </span>{" "}
            plugin turns the second one on.
          </p>
        </RevealItem>
        <RevealItem>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              color="primary"
              render={
                <a
                  href={PLUGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Get the WordPress plugin
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button color="accent" render={<Link href="/ucp-validator" />}>
              Check if your store is agent-ready
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {capabilities.map((capability, index) => (
          <RevealItem
            key={capability.title}
            className="flex flex-col gap-4 bg-background-dimmed p-6 md:min-h-72 md:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="font-normal text-lg text-primary tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <capability.icon className="size-8 text-primary" />
            </div>
            <h3 className="font-body font-medium text-2xl text-foreground md:text-3xl">
              {capability.title}
            </h3>
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              {capability.description}
            </p>
          </RevealItem>
        ))}
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              Agent commerce does not hand the store over. You keep the controls
              that decide who can buy, how fast, and under which credentials.
            </p>
          </RevealItem>
          <ItemCycle items={controls} />
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
          <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
            What you still control
          </h3>
          {controls.map((control, index) => (
            <div
              key={control.title}
              className="grid min-h-0 flex-1 grid-cols-[2.5rem_1fr] content-start bg-background-rich px-6 py-5 md:grid-cols-[5rem_1fr] md:px-8"
            >
              <span className="font-normal text-lg text-primary tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <RevealItem className="flex flex-col gap-1">
                <h4 className="font-body font-medium text-foreground text-xl">
                  {control.title}
                </h4>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {control.description}
                </p>
              </RevealItem>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);
