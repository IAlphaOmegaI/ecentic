import type { Icon } from "@zenncore/icons";
import {
  ArrowRightIcon,
  CheckIcon,
  RadarIcon,
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";

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
  "Turn the whole agent surface on or off",
  "Allow-list which agent platforms may transact",
  "Require signed (RFC 9421) requests, or set a store API key",
  "Rate-limit per agent, and include or exclude out-of-stock products",
] as const;

export const AgentCommerce = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Let AI agents buy, not just browse.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Optimized listings decide whether an agent recommends you. The
          Universal Commerce Protocol decides whether it can actually complete
          the purchase. The free{" "}
          <span className="font-medium text-foreground">
            écentic for WooCommerce
          </span>{" "}
          plugin turns the second one on.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            color="primary"
            render={
              <a href={PLUGIN_URL} target="_blank" rel="noopener noreferrer" />
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
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {capabilities.map((capability) => (
          <div
            key={capability.title}
            className="flex flex-col gap-2 bg-background-dimmed p-6 md:p-8"
          >
            <capability.icon className="size-8 text-primary" />
            <h3 className="mt-2 font-body font-medium text-2xl text-foreground">
              {capability.title}
            </h3>
            <p className="font-body font-light text-foreground-dimmed">
              {capability.description}
            </p>
          </div>
        ))}
      </div>

      <div className="border-accent-foreground border-t p-6 md:p-8">
        <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
          What you still control
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {controls.map((control) => (
            <li key={control} className="flex items-start gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />
              <p className="font-body font-light text-foreground-dimmed">
                {control}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
