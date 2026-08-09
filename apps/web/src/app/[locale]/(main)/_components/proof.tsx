import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import type { Locale } from "@/i18n/routing";
import { Counter } from "./counter";

const statKeys = ["cyberWeek", "conversion", "growth", "visibility"] as const;

export const Proof = async ({ locale }: Proof.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });
  const stats = statKeys.map((key) => ({
    key,
    value: translate(`proof.stats.${key}.value`),
    label: translate(`proof.stats.${key}.label`),
    source: translate(`proof.stats.${key}.source`),
  }));

  return (
    <section className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="relative p-6 md:p-12">
          <h2 className="max-w-5xl text-balance font-body font-medium text-3xl text-foreground md:text-5xl">
            {translate("proof.title")}
          </h2>
        </div>
        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {stats.map((stat, index) => (
            <RevealItem
              key={stat.key}
              className="relative flex flex-col justify-end gap-2 bg-background-dimmed p-6 md:h-64 md:p-8"
            >
              {index === 0 && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
              )}
              {index === 0 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
              )}
              {index === 2 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
              )}
              <Counter
                value={stat.value}
                delay={index * 0.1}
                className="font-body font-bold text-5xl text-primary md:text-6xl"
              />
              <span className="text-foreground">{stat.label}</span>
              <span className="text-foreground-rich text-xs">
                {stat.source}
              </span>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

export namespace Proof {
  export type Props = {
    locale: Locale;
  };
}
