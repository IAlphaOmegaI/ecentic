import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import type { Locale } from "@/i18n/routing";

const milestoneKeys = ["visa", "google", "mastercard", "openai"] as const;

const milestoneLogos: Record<
  (typeof milestoneKeys)[number],
  { brand: string; logo?: string }
> = {
  visa: { brand: "Visa", logo: "/images/visa.png" },
  google: { brand: "Google", logo: "/images/google.svg" },
  mastercard: { brand: "Mastercard", logo: "/images/mastercard.png" },
  openai: { brand: "OpenAI", logo: "/images/chatgpt.svg" },
};

export const WhyNow = async ({ locale }: WhyNow.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <section className="relative border-accent-foreground border-y bg-background-dimmed">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="p-4 md:p-8">
        <div className="mb-3 flex items-center gap-2 md:mb-5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute size-full animate-ping rounded-full bg-primary opacity-40" />
            <span className="relative size-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-light text-primary text-xl">
            {translate("whyNow.eyebrow")}
          </span>
        </div>
        <h2 className="mb-3 max-w-4xl font-body text-3xl text-foreground leading-none tracking-tight md:mb-5 md:text-6xl">
          {translate("whyNow.title")}
        </h2>
        <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
          {translate("whyNow.description")}
        </p>
      </div>

      <div className="relative grid border-accent-foreground border-t md:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {milestoneKeys.map((key, index) => {
          const { brand, logo } = milestoneLogos[key];

          return (
            <article
              key={key}
              className={`relative flex flex-col gap-3 border-accent-foreground border-b p-4 md:border-b-0 md:p-6 ${index < milestoneKeys.length - 1 ? "md:border-r" : ""}`}
            >
              {index < milestoneKeys.length - 1 && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
              )}
              {index < milestoneKeys.length - 1 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
              )}
              <div className="flex items-center justify-between">
                {logo ? (
                  <Image
                    src={logo}
                    alt={brand}
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                  />
                ) : (
                  <span className="font-semibold text-foreground text-xl">
                    {brand}
                  </span>
                )}
                <span className="border border-accent-foreground px-3 py-1 font-light text-foreground-dimmed text-xs">
                  {translate(`whyNow.milestones.${key}.date`)}
                </span>
              </div>
              <h3 className="font-medium text-foreground text-xl md:text-2xl">
                {translate(`whyNow.milestones.${key}.title`)}
              </h3>
              <p className="font-light text-base text-foreground-dimmed">
                {translate(`whyNow.milestones.${key}.description`)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export namespace WhyNow {
  export type Props = {
    locale: Locale;
  };
}
