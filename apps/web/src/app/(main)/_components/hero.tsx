import { TrendUpIcon } from "@zenncore/icons";
import Image from "next/image";
import Dashboard from "@/public/screenshots/dashboard.png";
import { InstallCta } from "./install-cta";

export const Hero = () => (
  <section className="flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
    <p className="font-body text-foreground-dimmed text-sm uppercase tracking-wide">
      Built for Shopify &amp; WooCommerce
    </p>

    <h1 className="max-w-3xl font-body font-semibold text-4xl text-foreground-rich md:text-6xl">
      Be the product AI recommends.
    </h1>

    <p className="max-w-2xl font-body text-foreground-dimmed text-lg">
      Shoppers now ask ChatGPT, Gemini, and Perplexity what to buy. Ecentic
      makes sure the answer is your product — and sends those buyers straight to
      your store.
    </p>

    <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
      <TrendUpIcon className="size-4" />
      DUA Flavours grew AI-agent visits +15% and sales +12% — in 30 days.
    </p>

    <InstallCta className="justify-center" />

    <p className="font-body text-foreground-dimmed text-sm">
      2-minute setup · No credit card · See your free score first
    </p>

    <div className="mt-6 w-full max-w-4xl overflow-hidden rounded-2xl border border-accent-foreground">
      <Image
        src={Dashboard}
        alt="Ecentic dashboard showing AI win rate"
        priority
        className="w-full"
      />
    </div>
  </section>
);
