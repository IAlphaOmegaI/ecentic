import Image from "next/image";
import Background from "@/public/images/background.webp";
import { HeroVideo } from "./hero-video";
import { InstallCta } from "./install-cta";

export const Hero = () => (
  <section className="relative isolate flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
    <Image
      src={Background}
      alt=""
      aria-hidden
      fill
      sizes="100vw"
      className="pointer-events-none -z-20 select-none object-contain object-top opacity-20 invert"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-radial-[at_50%_0%] from-primary/25 via-primary/5 to-transparent"
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

    <InstallCta className="justify-center" />

    <p className="font-body text-foreground-dimmed text-sm">
      2-minute setup · No credit card · See your free score first
    </p>

    <div className="relative mt-6 w-full max-w-4xl">
      <HeroVideo />
    </div>
  </section>
);
