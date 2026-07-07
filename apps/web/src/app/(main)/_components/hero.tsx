import { TrendUpIcon } from "@zenncore/icons";
import Image from "next/image";
import Background from "@/public/images/background.webp";
import Dashboard from "@/public/screenshots/dashboard.png";
import { InstallCta } from "./install-cta";

export const Hero = () => (
  <section className="relative isolate flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
    <Image
      src={Background}
      alt=""
      aria-hidden
      fill
      sizes="100vw"
      className="-z-20 pointer-events-none select-none object-contain object-top opacity-20 invert"
    />
    <div
      aria-hidden
      className="-z-10 pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-radial-[at_50%_0%] from-primary/25 via-primary/5 to-transparent"
    />
    <p className="font-body text-foreground-dimmed text-sm uppercase tracking-wide">
      Built for Shopify &amp; WooCommerce
    </p>

    <h1 className="max-w-3xl font-body font-semibold text-4xl text-foreground-rich md:text-6xl">
      Be the product
      <br />
      <span className="text-primary">AI recommends.</span>
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

    <div className="relative mt-6 w-full max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-accent-foreground bg-background shadow-2xl shadow-primary/10">
        <div className="relative flex items-center border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <div className="absolute left-4 flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-400/70" />
            <span className="size-3 rounded-full bg-yellow-400/70" />
            <span className="size-3 rounded-full bg-green-400/70" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md border border-accent-foreground bg-background px-3 py-1 font-body text-foreground-dimmed text-xs">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            app.ecentic.ai/dashboard
          </div>
        </div>
        <Image
          src={Dashboard}
          alt="Ecentic dashboard showing AI win rate"
          priority
          className="w-full"
        />
      </div>
    </div>
  </section>
);
