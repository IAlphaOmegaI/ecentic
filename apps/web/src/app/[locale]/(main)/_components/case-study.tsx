import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import DuaLogo from "@/public/partners/dua-flavours.png";
import { Counter } from "./counter";

export const CaseStudy = async () => {
  const translate = await getTranslations("home");

  return (
    <section className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="grid md:grid-cols-2">
          <div className="relative flex flex-col gap-4 p-6 md:p-12">
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
            <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
            <Image
              src={DuaLogo}
              alt="DUA Flavours"
              className="h-11 w-auto self-start"
            />
            <p className="font-light text-primary-text text-xl">
              {translate("caseStudy.eyebrow")}
            </p>
            <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
              {translate("caseStudy.title")}
            </h2>
            <p className="max-w-xl font-light text-foreground-dimmed text-lg">
              {translate("caseStudy.description")}
            </p>
            <p className="mt-auto flex items-center gap-2 pt-4 text-foreground-dimmed text-sm">
              <CheckIcon className="size-4 shrink-0 text-primary" />
              {translate("caseStudy.verified")}
            </p>
          </div>

          {/* One figure, because DUA confirmed one: visits from AI assistants
              and direct traffic over April to July 2026. There is no confirmed
              sales figure, so no second cell stands in for one. */}
          <Reveal className="grid border-accent-foreground border-t md:border-t-0 md:border-l">
            <RevealItem className="relative flex flex-col justify-center gap-1 bg-background-dimmed p-6 md:p-12">
              <Counter
                value={translate("caseStudy.metric.value")}
                className="font-body font-bold text-6xl text-primary md:text-7xl"
              />
              <p className="font-body text-foreground text-lg">
                {translate("caseStudy.metric.label")}
              </p>
              <p className="font-light text-foreground-dimmed text-sm">
                {translate("caseStudy.metric.period")}
              </p>
            </RevealItem>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
