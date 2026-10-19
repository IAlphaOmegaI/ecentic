import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { seo } from "@/lib/seo";
import Background from "@/public/images/background.webp";
import { HeroVideo } from "./hero-video";
import { StoreEntry } from "./store-entry";

export const Hero = async () => {
  const translate = await getTranslations("home");
  const translateGeneral = await getTranslations("general");

  return (
    <section className="relative isolate flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
      {/* `aria-hidden` keeps this out of the accessibility tree — it is a flat
          texture behind the headline, so a screen reader should never
          announce it. The `alt` is therefore crawler-only copy: audits read an
          empty one as missing, and agents get the motif named for free.

          This texture is the page's LCP element — it is the largest contentful
          thing in the hero, and a CSS background would not change that, since
          `url()` backgrounds are LCP candidates too. So it has to be *fast*
          rather than hidden: `next/image` defaults to `loading="lazy"`, which
          held its request until layout proved it on-screen, ~5.4s in. Eager and
          high priority start it with the document instead.

          The frame is sized to the headline-and-entry block rather than the
          whole section, so the two hands meet around the store field — the
          handoff the artwork is about — instead of drifting behind the film.
          `sizes` stays deliberately under-declared: the texture sits at low
          opacity behind an inversion, where half-resolution is invisible and
          the bytes are not. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-20 -z-20 h-[34rem] md:top-6 md:h-[44rem]"
      >
        <Image
          src={Background}
          alt={translateGeneral("backdropAlt")}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 768px) 60vw, 1000px"
          className="select-none object-contain object-center opacity-50 invert"
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-radial-[at_50%_0%] from-primary/25 via-primary/5 to-transparent"
      />
      {/* The category line is the `h1` and the slogan below is display copy:
          search reads the `h1` as the page's topic, and "Be the product AI
          recommends" shares no words with what merchants search for. */}
      <h1 className="font-body font-medium text-base text-foreground-dimmed md:text-lg">
        {translate("hero.eyebrow")}
      </h1>

      <p className="max-w-3xl font-body font-semibold text-4xl text-foreground-rich md:text-6xl">
        {translate("hero.title.primary")}
        <br />
        <span className="text-primary">{translate("hero.title.accent")}</span>
      </p>

      <p className="max-w-2xl font-body text-foreground-dimmed text-lg">
        {translate("hero.description")}
      </p>

      <StoreEntry className="mt-2" />

      <div className="flex flex-col items-center gap-1 font-body text-foreground-dimmed text-sm">
        <p>{translate("hero.proof")}</p>
        {/* The App Store stays one click away: an install is the verified
            connect (write-back, tracking), and App Store attribution counts. */}
        <p>
          {translate("hero.entry.appStore.lead")}{" "}
          <Link
            href={seo.shopifyAppStore}
            className="text-primary underline-offset-4 hover:underline"
          >
            {translate("hero.entry.action.secondary")}
          </Link>
        </p>
      </div>

      <div className="relative mt-6 w-full max-w-4xl">
        <HeroVideo />
      </div>
    </section>
  );
};
