import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Background from "@/public/images/background.webp";
import { HeroVideo } from "./hero-video";
import { InstallCta } from "./install-cta";

export const Hero = async () => {
  const translate = await getTranslations("home");
  const translateGeneral = await getTranslations("general");

  return (
    <section className="relative isolate flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
      {/* `aria-hidden` keeps this out of the accessibility tree — it is a flat
          texture at 20% opacity behind the headline, so a screen reader should
          never announce it. The `alt` is therefore crawler-only copy: audits
          read an empty one as missing, and agents get the motif named for free.
          `object-contain` caps the rendered width well under the viewport, so
          `sizes` says so — left at `100vw` the browser fetched the 3840w
          candidate for an image that never paints above ~900px. */}
      <Image
        src={Background}
        alt={translateGeneral("backdropAlt")}
        aria-hidden
        fill
        sizes="(max-width: 768px) 100vw, 900px"
        className="pointer-events-none -z-20 select-none object-contain object-top opacity-20 invert"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-radial-[at_50%_0%] from-primary/25 via-primary/5 to-transparent"
      />
      <p className="font-body text-foreground-dimmed text-sm uppercase tracking-wide">
        {translate("hero.eyebrow")}
      </p>

      <h1 className="max-w-3xl font-body font-semibold text-4xl text-foreground-rich md:text-6xl">
        {translate("hero.title.primary")}
        <br />
        <span className="text-primary">{translate("hero.title.accent")}</span>
      </h1>

      <p className="max-w-2xl font-body text-foreground-dimmed text-lg">
        {translate("hero.description")}
      </p>

      <InstallCta className="justify-center" />

      <p className="font-body text-foreground-dimmed text-sm">
        {translate("hero.proof")}
      </p>

      <div className="relative mt-6 w-full max-w-4xl">
        <HeroVideo />
      </div>
    </section>
  );
};
